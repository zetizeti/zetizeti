// jargon.test.mjs — no design jargon in a question or an explanation (v1.10.0, 16 September 2026).
// Prayas: "make sure neither the questions, nor the explanations use design jargon". Every sentence here is
// invented.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jargonIn, JARGON_TERMS, JARGON_PROMPT_LINE } from '../lib/jargon.mjs';
import { validateOutput, validateCriticismOutput, validateSpecOutput, buildSystemPrompt, buildCriticismSystemPrompt, buildSpecSystemPrompt } from '../lib/dialogue.mjs';

test('jargon is found, in the plural and across a hyphen or space', () => {
  assert.deepEqual(jargonIn('What affordances does it offer?'), ['affordance']);
  assert.deepEqual(jargonIn('Who are the stakeholders here?'), ['stakeholder']);
  assert.deepEqual(jargonIn('Where does the user journey start?'), ['user journey']);
  assert.ok(jargonIn('Is it human centred?').includes('human-centred'));
  assert.ok(jargonIn('What would you iterate on?').includes('iterate'));
});

test('everyday words are not jargon', () => {
  for (const q of ['Who will use the toy first?', 'What would you sketch before you build it?',
    'Where does the prototype break?', 'What does the brief leave open?', 'What pulls against what here?']) {
    assert.deepEqual(jargonIn(q), [], q);
  }
});

test('a word the person used is theirs', () => {
  const own = new Set(['stakeholders', 'toy']);
  assert.deepEqual(jargonIn('Which stakeholders will play with the toy?', own), []);
  assert.deepEqual(jargonIn('Which stakeholder plays first?', own), [], 'singular of their plural still passes');
  assert.deepEqual(jargonIn('What affordance does the toy have?', own), ['affordance']);
  // a phrase passes only when every word in it is theirs
  assert.deepEqual(jargonIn('Where does the user journey start?', new Set(['user'])), ['user journey']);
});

test('all three question checks refuse it, and a quoted span is exempt', () => {
  const q = 'What affordances does the toy offer a child?';
  assert.match(validateOutput(q, { noJargon: true }).reasons.join(' '), /design jargon/);
  assert.match(validateCriticismOutput(q, { noJargon: true }).reasons.join(' '), /design jargon/);
  assert.match(validateSpecOutput(q, {}).reasons.join(' '), /design jargon/, 'on by default on the spec surface, like noCompound');
  const quoted = 'When the text says "clear affordances", who is it talking about?';
  assert.ok(!/design jargon/.test(validateCriticismOutput(quoted, { noJargon: true }).reasons.join(' ')));
});

test('all three routes send it, and all three prompts tell the model', () => {
  const SERVER = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.ok((SERVER.match(/noJargon: true/g) || []).length >= 3, 'enquiry, critique and spec each pass noJargon');
  assert.match(SERVER, /validateSpecOutput\(t, \{[^}]*noJargon: true/);
  for (const p of [buildSystemPrompt('method'), buildCriticismSystemPrompt('method', {}), buildSpecSystemPrompt({ spec: 'THE THING: a lamp' })]) {
    assert.ok(p.includes(JARGON_PROMPT_LINE), 'a prompt is missing the jargon line');
  }
});

test('the list is not empty and has no everyday words on it', () => {
  assert.ok(JARGON_TERMS.length > 40);
  for (const w of ['prototype', 'sketch', 'brief', 'user', 'tension', 'framework', 'design']) assert.ok(!JARGON_TERMS.includes(w), w);
});
