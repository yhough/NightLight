// ── NightLight Backend API Client ─────────────────────────────────────────────
//
// Set EXPO_PUBLIC_API_URL in your .env to point at your backend.
// For local dev: EXPO_PUBLIC_API_URL=http://localhost:3000
// For production: EXPO_PUBLIC_API_URL=https://api.nightlight.app

import type { Contact } from '@/context/night-mode';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

export interface CreateSessionResult {
  sessionId: string;
}

/**
 * Create a Night Mode session on the backend.
 * The backend will independently schedule SMS escalation.
 */
export async function createSession(opts: {
  homeByTime: Date;
  contacts: Pick<Contact, 'name' | 'phone'>[];
  userName?: string;
}): Promise<CreateSessionResult> {
  return post<CreateSessionResult>('/sessions', {
    homeByTime: opts.homeByTime.toISOString(),
    contacts: opts.contacts,
    userName: opts.userName,
  });
}

/**
 * Tell the backend the user checked in as safe.
 * Cancels all escalation timers on the server.
 */
export async function recordSafe(sessionId: string): Promise<void> {
  await post(`/sessions/${sessionId}/checkin`, { response: 'safe' });
}

/**
 * Tell the backend the user extended their session by 30 minutes.
 */
export async function recordExtend(sessionId: string): Promise<void> {
  await post(`/sessions/${sessionId}/checkin`, { response: 'extend' });
}

/**
 * End the session (night mode deactivated or emergency sent).
 */
export async function endSession(sessionId: string): Promise<void> {
  await post(`/sessions/${sessionId}/end`, {});
}
