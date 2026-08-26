// heartbeat.test.mjs — the keepalive on a deliberately silent SSE stream (26 August 2026).
//
// 🔴 THE HALF THAT MATTERS IS THE CONSUMER TEST AT THE BOTTOM. This project has shipped the same defect
// twice: BINARY_DEMAND was written, widened, measured and tested while unreachable from the criticism
// route, and the whole shared-guard set was inert on that surface for its entire life. Both times a unit
// test passed on a mechanism nobody called. So this file asserts the mechanism AND reads server.mjs for
// whether every SSE route actually opens through the one opener that starts it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { startHeartbeat, HEARTBEAT_MS } from '../lib/heartbeat.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A response stand-in: records what was written, and can be closed the way a socket closes.
function fakeRes() {
  const res = {
    writes: [], handlers: {}, writableEnded: false, destroyed: false,
    write(chunk) { res.writes.push(chunk); return true; },
    on(ev, fn) { (res.handlers[ev] ||= []).push(fn); },
    emit(ev) { (res.handlers[ev] || []).forEach((fn) => fn()); },
  };
  return res;
}

test('it writes keepalive frames while the stream is open and silent', async () => {
  const res = fakeRes();
  const stop = startHeartbeat(res, { intervalMs: 10 });
  await sleep(55);
  stop();
  assert.ok(res.writes.length >= 3, `expected several frames, got ${res.writes.length}`);
  assert.ok(res.writes.every((w) => w.startsWith(':')), 'every frame must be an SSE comment');
});

test('stop() ends it, and a second stop() is harmless', async () => {
  const res = fakeRes();
  const stop = startHeartbeat(res, { intervalMs: 10 });
  await sleep(35);
  stop(); stop();
  const after = res.writes.length;
  await sleep(40);
  assert.equal(res.writes.length, after, 'nothing may be written after stop()');
});

// 🔴 The route returns early on nine separate refusal paths. If stopping were the caller's job, one of
// them would eventually forget — which is the shape of every guard here that enforced nothing.
test('it stops on close and on finish without the caller doing anything', async () => {
  for (const ev of ['close', 'finish']) {
    const res = fakeRes();
    startHeartbeat(res, { intervalMs: 10 });
    await sleep(35);
    res.emit(ev);
    const after = res.writes.length;
    await sleep(40);
    assert.equal(res.writes.length, after, `must stop on '${ev}'`);
  }
});

test('a socket that ended or died stops it rather than being written to', async () => {
  const res = fakeRes();
  startHeartbeat(res, { intervalMs: 10 });
  await sleep(25);
  res.writableEnded = true;
  const after = res.writes.length;
  await sleep(40);
  assert.equal(res.writes.length, after, 'no write to an ended response');
});

test('a throwing write kills the heartbeat instead of the turn', async () => {
  const res = fakeRes();
  res.write = () => { throw new Error('EPIPE'); };
  assert.doesNotThrow(() => startHeartbeat(res, { intervalMs: 10 }));
  await sleep(40);   // if the throw escaped the interval callback this would be an unhandled crash
});

test('the default interval is short enough to survive an idle-stream cut', () => {
  assert.ok(HEARTBEAT_MS > 0 && HEARTBEAT_MS <= 30000, 'must be well under a proxy idle timeout');
});

// ── the client half — read the REAL parser, never a copy of it ──────────────────────────────────────
// A keepalive frame reaching the browser must be skipped, not mistaken for a turn. flow-probe reassembled
// a route by hand once and went blind to everything the real route did; so this pulls the actual regex
// literal out of public/index.html and runs a frame through it.
test('the SPA parser skips a keepalive frame — checked against the regex in index.html', () => {
  const spa = readFileSync(join(APP, 'public', 'index.html'), 'utf8');
  // Non-greedy to the closing paren of the call: the pattern itself contains ')' in its capture groups,
  // so a [^)] scan stops inside the regex and finds nothing — which it silently did on the first draft.
  const literals = [...spa.matchAll(/ev\.match\((\/\^event:.*?)\)\s*;/g)].map((m) => m[1]);
  assert.ok(literals.length >= 2, `expected the SSE match on both surfaces, found ${literals.length}`);

  for (const lit of literals) {
    const body = lit.slice(1, lit.lastIndexOf('/'));
    const flags = lit.slice(lit.lastIndexOf('/') + 1);
    const re = new RegExp(body, flags);
    assert.equal(re.test(': keepalive'), false, `a keepalive frame must not match ${lit}`);
    assert.ok(re.test('event: token\ndata: {"t":"x"}'), `a real event must still match ${lit}`);
  }
});

// ── the consumer — the half that catches an inert mechanism ─────────────────────────────────────────
test('every SSE route opens through sseHeaders, and sseHeaders starts the heartbeat', () => {
  const server = readFileSync(join(APP, 'server.mjs'), 'utf8');

  assert.match(server, /import \{ startHeartbeat \}/, 'server.mjs must import it');

  // One opener, and it starts the heartbeat inside itself.
  const opener = server.match(/const sseHeaders = \(res\) => \{[\s\S]*?\n\};/);
  assert.ok(opener, 'sseHeaders must be the single stream opener');
  assert.match(opener[0], /startHeartbeat\(res\)/, 'sseHeaders must start the heartbeat');

  // 🔴 No route may set the SSE content-type by hand again. That is precisely how /api/chat came to be
  // the one surface a stream-wide fix would have missed — the same one-copy-away shape as guard parity.
  const inline = [...server.matchAll(/setHeader\(\s*'Content-Type'\s*,\s*'text\/event-stream'/g)];
  assert.equal(inline.length, 1, 'text/event-stream may be set in exactly one place — sseHeaders');
  assert.ok(opener[0].includes("'text/event-stream'"), 'and that place must be sseHeaders');

  // Every SSE route is reached: the enquiry turn and both criticism endpoints.
  const calls = [...server.matchAll(/sseHeaders\(res\)/g)].length;
  assert.ok(calls >= 3, `expected all three SSE routes to open through it, found ${calls}`);
});

// ── the engine calls are bounded ────────────────────────────────────────────────────────────────────
// A hung engine held the student's open, silent stream for undici's five-minute default. Both calls, not
// one: the fix that reaches half the call sites is this project's most repeated fault.
test('every credit-engine fetch carries an abort signal', () => {
  const src = readFileSync(join(APP, 'lib', 'credit-engine.mjs'), 'utf8');
  const fetches = [...src.matchAll(/await fetch\(([\s\S]*?)\n\s*\}\);/g)];
  assert.ok(fetches.length >= 2, `expected the resolve and roster calls, found ${fetches.length}`);
  for (const [block] of fetches) {
    assert.match(block, /signal:\s*AbortSignal\.timeout\(/, 'every engine fetch must be bounded');
  }
});
