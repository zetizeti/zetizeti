// withheld.test.mjs — a refused question is never sent (18 October 2026)
//
// Prayas: "flagged responses should never go public". Until then, when every attempt at a question broke a rule, the least-bad one was delivered with a flag only behind the curtain, which nobody acted on, so the person read the very question the guard exists to stop. Now the route withholds it: the enquiry says back a phrase of theirs where the rhythm allows a turn that does not ask, and otherwise sends WITHHELD; the page takes the reply back into the box.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');

test('the enquiry route never sends a question the guard refused', () => {
  const at = server.indexOf('if (!guarded.check.ok) {\n      const sayBackInstead');
  assert.ok(at > 0, 'the withhold sits after the guarded question');
  assert.ok(at < server.indexOf("send('token', { t: full });                  // the ACCEPTED question"), 'and before the question is sent');
  assert.match(server, /if \(sayBackInstead && await sayBackTurn\(\)\) return res\.end\(\);/);
  assert.match(server, /send\('error', \{ code: 'WITHHELD', message: WITHHELD_MSG \}\);\n      return res\.end\(\);/);
});

test('the critique and spec surfaces withhold the same way', () => {
  const lines = server.match(/if \(!guarded\.check\.ok\) \{ send\('error', \{ code: 'WITHHELD', message: WITHHELD_MSG \}\); return \{ qCost, empty: true \}; \}/g) || [];
  assert.equal(lines.length, 2);
});

test('a said-back stands in only where one may: not twice in a turn, not on a decline, never after a turn that did not ask', () => {
  assert.match(server, /const sayBackInstead = !saidBackTried && !prepping && !declined && studentTurns\.length > 1 && lastStoneAsked;/);
});

test('the page takes a withheld reply back into the box, out of the history and the stream', () => {
  assert.match(page, /if\(data\.code==='WITHHELD'\) withheld=true;/);
  assert.match(page, /if\(withheld && kind==='turn' && history\.length && history\[history\.length-1\]\.role==='student'\)\{\n    history\.pop\(\); exchanges--; updateEdge\(\);/);
  assert.match(page, /input\.value=message;/);
});
