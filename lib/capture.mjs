// capture.mjs — LOCAL, OPERATOR-ONLY capture of Prayas's OWN test chats, to build 2.0 (distil the
// method core, Part A, from how the tool questions in real situations he approves of; and hold a
// "sounds-like-Prayas" test harness). See memory: project-zetizeti-sounds-like-prayas.
//
// 🔴 THIS NEVER RUNS IN PRODUCTION. The ephemeral guarantee for students is absolute — the live service
// stores no conversation (see server.mjs header, invariant #8). Capture is a BUILD TOOL: it activates
// ONLY on a local dev instance the operator runs themselves, and is HARD-GUARDED off whenever
// NODE_ENV === 'production'. So the code can ship in the (AGPL, public) image and stay permanently inert
// there — captureEnabled is false unless BOTH a capture dir is set AND it is not production.
//
// The captured DATA is local and git-ignored (never committed, never in the deploy tar, never published)
// — the operator alone reads it while building. A capturing instance is dev/local only, so no student
// ever reaches one; the pasted-text/never-log rule (invariant #8) is about the PRODUCTION service, which
// this cannot run in.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Pure predicate (testable): capture is on only with a dir set AND outside production.
export function isCaptureEnabled(env = process.env) {
  return !!(env.ZETIZETI_CAPTURE_DIR || '').trim() && env.NODE_ENV !== 'production';
}

const DIR = (process.env.ZETIZETI_CAPTURE_DIR || '').trim();
export const captureEnabled = isCaptureEnabled();

let _ready = false;
function ensureDir() {
  if (_ready) return;
  try { mkdirSync(DIR, { recursive: true }); _ready = true; } catch { /* leave disabled if the dir can't be made */ }
}
const FILE = () => join(DIR, 'zetizeti-testchats.jsonl');
let _n = 0;
const newId = () => `${Date.now().toString(36)}-${(_n++).toString(36)}`;   // unique across a run and appends

// Append one turn as a JSON line: the whole situation → the question the tool asked, so a chat can be
// grouped (by chatKey), reconstructed, and replayed by the harness later. Returns the record's `id` (so
// the client can later attach an on-voice/off-voice LABEL to it), or null when capture is off. No-op
// unless enabled, and it NEVER throws — capture must not be able to break a turn.
export function capture(rec) {
  if (!captureEnabled) return null;
  ensureDir();
  if (!_ready) return null;
  const id = newId();
  try {
    appendFileSync(FILE(), JSON.stringify({ at: new Date().toISOString(), id, ...rec }) + '\n');
    return id;
  } catch { return null; }   // swallow — a capture failure must never surface to the turn
}

// The operator's verdict on a captured question — "does this sound like me?" — appended as its own line
// keyed by the turn's id, so the harness can sort the hundred into on-voice / off-voice. rating is
// 'me' | 'not' (anything else is ignored). No-op unless capture is on.
export function labelCapture(id, rating) {
  if (!captureEnabled || !id || !['me', 'not'].includes(rating)) return false;
  ensureDir();
  if (!_ready) return false;
  try {
    appendFileSync(FILE(), JSON.stringify({ at: new Date().toISOString(), type: 'label', id, rating }) + '\n');
    return true;
  } catch { return false; }
}
