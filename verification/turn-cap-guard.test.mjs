// turn-cap-guard.test.mjs — the per-user turn cap is DISABLED at 0, never "zero turns allowed".
//
// ORIGIN, 11 August 2026. `ZETIZETI_POOL_USER_TURNS` went to 0 in production on 29 July, when the
// adaptive ₹ allowance replaced the fixed turn count as the day control. The ENQUIRY path was updated
// to `POOL_USER_TURNS > 0 && ut >= POOL_USER_TURNS`. The CRITICISM path was not, so `ut >= 0` was true
// on a student's first turn and the whole students cohort was refused with
// "You've used today's 0 messages — please come back tomorrow." It ran that way for thirteen days.
//
// It was invisible for a structural reason worth naming: the operator is on POOL_PERSONAL, which
// returns from the resolver ABOVE the cap checks. The one person who would have noticed is on the one
// tier that never reaches the code.
//
// This is a SOURCE-SHAPE test rather than a behavioural one, deliberately. The two checks live inside
// two long request handlers in server.mjs with no seam to call them through, and the failure was never
// that either check was wrong on its own — it was that ONE OF TWO COPIES drifted. A test that reads
// both copies is the thing that would have caught it. If the caps are ever extracted behind a single
// function, delete this file and test that function instead; one copy cannot diverge from itself.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SERVER = join(dirname(fileURLToPath(import.meta.url)), '..', 'server.mjs');
const src = readFileSync(SERVER, 'utf8');

// Every line that compares a turn count against the cap, ignoring the declaration and any that only
// SUBTRACT from it (the display paths at /api/pool and /api/usage, which are allowed to read 0).
const comparisons = src
  .split('\n')
  .map((line, i) => ({ n: i + 1, line: line.trim() }))
  .filter(({ line }) => />=\s*POOL_USER_TURNS/.test(line));

test('the turn cap is compared in at least the two known places', () => {
  assert.ok(
    comparisons.length >= 2,
    `expected the enquiry and criticism cap checks; found ${comparisons.length}. ` +
    'If a surface was removed, update this test deliberately rather than letting coverage shrink silently.'
  );
});

test('EVERY turn-cap comparison is guarded by POOL_USER_TURNS > 0', () => {
  const unguarded = comparisons.filter(({ line }) => !/POOL_USER_TURNS\s*>\s*0/.test(line));
  assert.deepEqual(
    unguarded.map(({ n, line }) => `server.mjs:${n}  ${line}`),
    [],
    'An unguarded `ut >= POOL_USER_TURNS` refuses EVERY user on their first turn whenever the cap is 0 ' +
    '(0 means disabled). This is the 11 Aug 2026 criticism-surface outage. Add `POOL_USER_TURNS > 0 &&`.'
  );
});

test('the cap message would read absurdly at 0, which is why the guard matters', () => {
  // Not a behaviour assertion — a note kept executable so nobody "fixes" the message instead of the guard.
  const msg = src.match(/const USER_TURNS_MSG\s*=\s*`([^`]+)`/);
  assert.ok(msg, 'USER_TURNS_MSG should still be a template literal carrying the cap');
  assert.match(
    msg[1], /\$\{POOL_USER_TURNS\}/,
    'The message interpolates the cap, so at 0 it reads "You\'ve used today\'s 0 messages". ' +
    'The message is fine; it must simply never be reachable at 0.'
  );
});
