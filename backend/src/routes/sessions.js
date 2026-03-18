const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { scheduleEscalation, clearTimers } = require('../escalation');

const router = Router();

// ── POST /sessions ────────────────────────────────────────────────────────────
// Create a new Night Mode session and start escalation timers.
//
// Body: {
//   homeByTime: string,   // ISO 8601 datetime
//   contacts:  [{ name: string, phone: string }],
//   userName?: string,
// }
router.post('/', (req, res) => {
  const { homeByTime, contacts, userName } = req.body;

  if (!homeByTime || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'homeByTime and at least one contact are required' });
  }

  // Safe Circle is capped at 3 — enforce this server-side so SMS can never
  // fire to anyone outside the contacts the user explicitly selected.
  if (contacts.length > 3) {
    return res.status(400).json({ error: 'Safe Circle is limited to 3 contacts' });
  }

  // Validate each contact has a name and phone; strip any extra fields.
  const safeCircle = contacts.map(c => ({ name: String(c.name || '').trim(), phone: String(c.phone || '').trim() }));
  if (safeCircle.some(c => !c.name || !c.phone)) {
    return res.status(400).json({ error: 'Each contact must have a name and phone number' });
  }

  const homeByDate = new Date(homeByTime);
  if (isNaN(homeByDate.getTime())) {
    return res.status(400).json({ error: 'homeByTime must be a valid ISO date string' });
  }

  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    homeByTime: homeByDate,
    contacts: safeCircle,
    userName: userName || 'Your friend',
    status: 'active',
    checkInAttempts: 0,
    timers: [],
    createdAt: new Date(),
  };

  db.set(sessionId, session);
  scheduleEscalation(sessionId);

  console.log(`[Sessions] Created session ${sessionId} — homeByTime: ${homeByDate.toISOString()}`);
  res.status(201).json({ sessionId });
});

// ── GET /sessions/:id ─────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const session = db.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Don't leak timer handles to the client
  const { timers: _timers, ...safe } = session;
  res.json(safe);
});

// ── POST /sessions/:id/checkin ────────────────────────────────────────────────
// Record a check-in response from the user.
//
// Body: { response: 'safe' | 'extend' }
//   'safe'   → cancel timers, end session
//   'extend' → cancel timers, re-schedule from now +30 min
router.post('/:id/checkin', (req, res) => {
  const session = db.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { response } = req.body;

  if (response === 'safe') {
    clearTimers(req.params.id);
    session.status = 'safe';
    db.set(req.params.id, session);
    console.log(`[Sessions] ${req.params.id} marked safe`);
    return res.json({ status: 'safe' });
  }

  if (response === 'extend') {
    clearTimers(req.params.id);
    const newHomeByTime = new Date(Date.now() + 30 * 60_000);
    session.homeByTime = newHomeByTime;
    session.status = 'active';
    session.checkInAttempts = 0;
    db.set(req.params.id, session);
    scheduleEscalation(req.params.id);
    console.log(`[Sessions] ${req.params.id} extended to ${newHomeByTime.toISOString()}`);
    return res.json({ status: 'extended', newHomeByTime: newHomeByTime.toISOString() });
  }

  res.status(400).json({ error: 'response must be "safe" or "extend"' });
});

// ── POST /sessions/:id/end ────────────────────────────────────────────────────
// End session early (user deactivated Night Mode manually, or opened emergency modal).
router.post('/:id/end', (req, res) => {
  const session = db.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  clearTimers(req.params.id);
  session.status = 'ended';
  db.set(req.params.id, session);
  console.log(`[Sessions] ${req.params.id} ended`);
  res.json({ status: 'ended' });
});

module.exports = router;
