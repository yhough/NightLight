// ── In-memory session store ───────────────────────────────────────────────────
//
// Each session has the shape:
// {
//   id:             string,           // uuid
//   homeByTime:     Date,             // when user should be home
//   contacts:       Contact[],        // [{ name, phone }]
//   userName:       string,           // display name for SMS
//   status:         'active' | 'safe' | 'extended' | 'escalated' | 'ended',
//   checkInAttempts:number,           // 0-3
//   timers:         NodeJS.Timeout[], // setTimeout handles — cleared on end
//   createdAt:      Date,
// }
//
// TO SWAP TO FIREBASE: replace the Map with Firestore reads/writes.
// TO SWAP TO SUPABASE: replace with supabase.from('sessions').insert/update/select.
// The service layer (escalation.js) calls only db.get / db.set / db.delete.

/** @type {Map<string, Object>} */
const sessions = new Map();

const db = {
  /** @param {string} id */
  get: (id) => sessions.get(id) ?? null,

  /** @param {string} id @param {Object} session */
  set: (id, session) => sessions.set(id, session),

  /** @param {string} id */
  delete: (id) => sessions.delete(id),

  /** @returns {Object[]} */
  all: () => Array.from(sessions.values()),
};

module.exports = db;
