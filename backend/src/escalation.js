const db = require('./db');
const { sendSafeCircleAlerts } = require('./twilio');

// Delays after homeByTime before each escalation step
const DELAYS_MS = {
  attempt1: 0,           // at homeByTime
  attempt2: 5 * 60_000,  // +5 min
  attempt3: 10 * 60_000, // +10 min
  sms: 15 * 60_000,      // +15 min → send SMS if still no response
};

/**
 * Schedule all check-in attempts and final SMS escalation for a session.
 * Timers are attached to the session so they can be cleared on end/safe.
 * @param {string} sessionId
 */
function scheduleEscalation(sessionId) {
  const session = db.get(sessionId);
  if (!session) return;

  const now = Date.now();
  const base = session.homeByTime.getTime();
  const timers = [];

  // Helper: fire a function after a delay (skip if already past)
  const schedule = (delayMs, fn) => {
    const fireAt = base + delayMs;
    const wait = fireAt - now;
    if (wait <= 0) {
      fn();
    } else {
      timers.push(setTimeout(fn, wait));
    }
  };

  schedule(DELAYS_MS.attempt1, () => bumpAttempt(sessionId, 1));
  schedule(DELAYS_MS.attempt2, () => bumpAttempt(sessionId, 2));
  schedule(DELAYS_MS.attempt3, () => bumpAttempt(sessionId, 3));
  schedule(DELAYS_MS.sms, () => escalate(sessionId));

  // Store timers so we can clear them
  session.timers = timers;
  db.set(sessionId, session);
}

/**
 * Increment the attempt counter (for observability).
 */
function bumpAttempt(sessionId, attempt) {
  const session = db.get(sessionId);
  if (!session || session.status !== 'active') return;
  session.checkInAttempts = attempt;
  db.set(sessionId, session);
  console.log(`[Escalation] Session ${sessionId} — check-in attempt ${attempt}`);
}

/**
 * Fire the SMS alerts if the session is still active.
 */
async function escalate(sessionId) {
  const session = db.get(sessionId);
  if (!session || session.status !== 'active') return;

  console.log(`[Escalation] Session ${sessionId} — no response after 3 attempts, sending SMS`);

  session.status = 'escalated';
  db.set(sessionId, session);

  try {
    const result = await sendSafeCircleAlerts(
      session.contacts,
      session.userName,
      session.homeByTime
    );
    console.log(`[Escalation] SMS result: ${result.sent} sent, ${result.failed} failed`);
  } catch (err) {
    console.error(`[Escalation] SMS send error: ${err.message}`);
  }
}

/**
 * Cancel all pending timers for a session (call on safe/extend/end).
 */
function clearTimers(sessionId) {
  const session = db.get(sessionId);
  if (!session) return;
  (session.timers || []).forEach(t => clearTimeout(t));
  session.timers = [];
  db.set(sessionId, session);
}

module.exports = { scheduleEscalation, clearTimers };
