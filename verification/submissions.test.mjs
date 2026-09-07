// The submission surface — an UPLOAD, not telemetry (7 September 2026).
//
// 🔴 WHY THESE ARE TESTS AND NOT A NOTE. The surface exists because the dialogue is the artifact, and it
// is the only route by which one reaches anybody but the person who was in it. Every property below is
// load-bearing and every one of them fails SILENTLY if it regresses: an allowlist that admits everybody
// on an unset variable, a withdrawal that keeps a tombstone, a purge that quietly eats somebody's
// deposited work, a publish guard that has never refused anything.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...p) => readFileSync(join(APP, ...p), 'utf8');

// ── EMPTY = CLOSED ────────────────────────────────────────────────────────────────────────────────
// A config mistake must fail SHUT. An unset variable that admitted everybody would open an upload
// endpoint on a service whose whole position is that it stores nothing — and it would do it with no
// error, no log line, and nothing failing.
test('the resident allowlist is closed when unset, and closed is the default', async () => {
  const auth = read('lib', 'auth.mjs');
  assert.match(auth, /RESIDENT_ALLOWLIST/, 'the resident list is gone');
  assert.match(auth, /empty set = closed/, 'the empty-is-closed intent is no longer stated at the check');
  // the check itself: a bare `.has()` on a Set built from a possibly-empty env var
  assert.match(auth, /export function emailIsResident[\s\S]{0,220}RESIDENT_ALLOWLIST\.has\(e\)/,
    'emailIsResident no longer resolves against the allowlist');
});

// ── 404, NEVER 403 ────────────────────────────────────────────────────────────────────────────────
// The route does not admit it exists. Same discipline as beginGuest and the maintenance door: a 403
// tells somebody there is a surface here worth getting onto.
test('the submission routes are gated and answer 404 rather than 403', () => {
  const server = read('server.mjs');
  assert.match(server, /function requireResident/, 'the gate is gone');
  assert.match(server, /requireResident[\s\S]{0,400}res\.status\(404\)/,
    'requireResident no longer answers 404 — a 403 admits the route exists');
  for (const route of [
    /app\.post\('\/api\/submissions', requireUser, requireResident/,
    /app\.get\('\/api\/submissions', requireUser, requireResident/,
    /app\.delete\('\/api\/submissions\/:id', requireUser, requireResident/,
  ]) assert.match(server, route, 'a submission route lost requireUser or requireResident');
});

// ── INVARIANT #8 IS LIVE HERE ─────────────────────────────────────────────────────────────────────
// #8 forbids the request body being LOGGED. A submission endpoint receives its body, which is the
// request's purpose; the risk is the body reaching an ERROR log on a failed upload, which is the exact
// shape #8 names. So no handler here may pass req.body to console on any path.
test('no submission handler logs the request body', () => {
  const server = read('server.mjs');
  const i = server.indexOf("app.post('/api/submissions'");
  const block = server.slice(i, server.indexOf('// LOCAL "author mode"', i));
  assert.ok(!/console\.(log|error|warn)\([^)]*\b(body|req\.body)\b/.test(block),
    'a submission handler logs the request body — invariant #8');
});

// ── THE LISTING NEVER RETURNS THE DIALOGUE ────────────────────────────────────────────────────────
// A listing lets the depositor see what they have sent and withdraw it. Reading a dialogue is a
// separate act, done from the machine — not something an endpoint hands back over the wire.
test('listSubmissions returns metadata and never the body', () => {
  const db = read('lib', 'db.mjs');
  assert.match(db, /SELECT id, filename, bytes, created_at FROM submissions/,
    'the listing statement now selects the body');
});

// ── OUTSIDE THE BOOT PURGE ────────────────────────────────────────────────────────────────────────
// 🔴 A purged submission is a person's work destroyed. The ephemeral pivot is about what the service
// keeps OF ITS OWN ACCORD; a deposit is not that.
test('submissions is not in the boot purge', () => {
  const db = read('lib', 'db.mjs');
  const purge = db.slice(db.indexOf('db.exec(`DELETE FROM messages'), db.indexOf('const now = () =>'));
  assert.ok(!/submissions/.test(purge), 'submissions was added to the boot purge — it destroys deposited work');
  assert.match(db, /`submissions` — deposited on purpose/, 'the purge comment no longer says why it is excluded');
});

// ── WITHDRAWAL IS A DELETE, AND ONLY BY THE OWNER ─────────────────────────────────────────────────
// 🔴 "Withdrawable on request, and that is not a negotiation" (CLAUDE.md). A soft-delete that keeps the
// text is not a withdrawal, and ownership is checked in the statement rather than trusted from the URL.
test('withdrawal deletes, and the owner is checked in the statement', () => {
  const db = read('lib', 'db.mjs');
  assert.match(db, /DELETE FROM submissions WHERE id = \? AND user_id = \?/,
    'withdrawal no longer scopes the delete to the owner');
  assert.ok(!/UPDATE submissions[\s\S]{0,120}(withdrawn|deleted_at|archived)/.test(db),
    'withdrawal became a soft-delete — a tombstone that keeps the text is not a withdrawal');
});

// ── THE PUBLISH GUARD IS BY SHAPE, NOT BY NAME OR DIRECTORY ───────────────────────────────────────
// 🔴 This project has been bitten twice by directory whitelists, and both times every content guard
// passed, because a project subject is not a name. A guard that refuses what it RECOGNISES cannot be
// trusted with somebody else's dialogue. This one refuses the file SHAPE.
// 🟢 PROVED on 7 September 2026 by planting a dialogue in docs/concept/ and watching publish-public.sh
// abort, then removing it and watching the publish proceed. A guard that has never refused anything has
// not been shown to work.
test('publish-public.sh refuses any staged file carrying dialogue front matter', () => {
  const sh = readFileSync(join(APP, '..', 'publish-public.sh'), 'utf8');
  assert.match(sh, /type: idea-transcript/, 'the publish guard no longer recognises an enquiry dialogue');
  assert.match(sh, /type: critique-transcript/, 'the publish guard no longer recognises a critique dialogue');
  assert.match(sh, /a saved zetizeti DIALOGUE is in the staged tree/, 'the guard no longer aborts by name');
  assert.match(sh, /find \. -name '\*\.db'/, 'the database-file guard is gone');
});
