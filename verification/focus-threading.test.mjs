// focus-threading.test.mjs — a SOURCE-LEVEL guard on the concept-only flag's path through server.mjs.
//
// ORIGIN, 12 August 2026. The flag is read off the request body in the three handlers, but the criticism
// surface does its retrieval, prompt assembly and validation inside `askCriticismQuestion`, which is a
// different scope. `focus` resolved to nothing there and every criticism turn died with
// `focus is not defined`. Nothing caught it: `node --check` cannot, because a free identifier is valid
// syntax and the failure is a runtime ReferenceError; and the fifteen unit tests all passed, because
// they call the libraries directly and never traverse the server. It took a ten-round conversation
// against the real endpoints to surface it, and it surfaced as the surface being wholly broken.
//
// So the shape of the bug is: a per-request value that must reach several call sites, where missing it
// at ANY of them is either a crash or — worse — a silent leak of exactly the material the flag exists
// to withhold. A missed `retrieve` call would not crash at all; it would quietly serve making tensions
// to a student who asked for none, and nothing anywhere would say so.
//
// These assertions read the source rather than the behaviour, which is the right instrument here: the
// question is not "does it work today" but "did every site get it", and that is a property of the text.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SERVER = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

// Pull the argument text of every call to `name(` — brace/paren balanced, so nested objects survive.
function callArgs(src, name) {
  const out = [];
  let i = 0;
  while ((i = src.indexOf(`${name}(`, i)) !== -1) {
    const start = i + name.length + 1;
    let depth = 1, j = start;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (c === '(') depth++; else if (c === ')') depth--;
      j++;
    }
    out.push(src.slice(start, j - 1));
    i = j;
  }
  return out;
}

test('every retrieve() call in server.mjs passes the focus', () => {
  const calls = callArgs(SERVER, 'retrieve').filter((a) => a.includes('corpus'));
  assert.ok(calls.length >= 4, `expected the known retrieval sites, found ${calls.length}`);
  const missing = calls.filter((a) => !/\bfocus\b/.test(a));
  assert.deepEqual(missing, [],
    `a retrieve() without focus serves making tensions to a student who asked for none, silently:\n${missing.join('\n---\n')}`);
});

test('every askCriticismQuestion() call passes the focus', () => {
  const calls = callArgs(SERVER, 'askCriticismQuestion').filter((a) => a.includes('artefact'));
  assert.ok(calls.length >= 2, `expected both criticism call sites, found ${calls.length}`);
  const missing = calls.filter((a) => !/\bfocus\b/.test(a));
  assert.deepEqual(missing, [], `askCriticismQuestion without focus: ${missing.join(' | ')}`);
});

// The helper must DECLARE it, or the callers pass a value into a scope that ignores it — which reads as
// working (no crash, no error) while the criticism surface quietly loses the filter entirely.
test('askCriticismQuestion declares focus in its own parameter list', () => {
  const decl = SERVER.match(/async function askCriticismQuestion\(\{([^}]*)\}/);
  assert.ok(decl, 'askCriticismQuestion not found');
  assert.match(decl[1], /\bfocus\b/,
    'the helper must take focus as a parameter — it is outside the handler scope that reads the body');
});

// Whitelisted, not passed through: an unknown value must be NO focus rather than an unspecified one.
test('the focus is whitelisted to the exact string at every entry point', () => {
  const reads = SERVER.match(/focus\s*=\s*[^;\n]*'concept'[^;\n]*/g) || [];
  assert.equal(reads.length, 4,
    `expected four body reads (chat, criticism open, criticism turn, retrieve), found ${reads.length}`);
  for (const r of reads) {
    assert.match(r, /===\s*'concept'/, `must compare for equality, not coerce: ${r}`);
  }
});

// Both guards must actually receive it, or enforcement silently degrades to the prompt alone — which
// this project has twice measured to be no enforcement at all.
// ⚠️ The criticism assertion used to pin the EXACT argument list — `validateCriticismOutput(t, { focus })`
// — and broke on 15 August 2026 the moment the concept guard added two more arguments to a call that was
// still passing focus correctly. A test that pins a shape fails on every addition and says nothing about
// the property it exists to protect. It now reads like the enquiry half beside it, which had the loose
// form all along: focus must reach the guard, and what else travels with it is not this test's business.
test('both validators are called with the focus', () => {
  assert.match(SERVER, /validateOutput\(t,\s*\{[^}]*\bfocus\b/s, 'the enquiry guard must receive focus');
  assert.match(SERVER, /validateCriticismOutput\(t,\s*\{[^}]*\bfocus\b/s, 'the criticism guard must receive focus');
});
