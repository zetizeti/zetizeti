// cadence.test.mjs — no machine cadence in a question, a choice or an explanation (v1.21.0, 23 October 2026).
// Prayas: "add rules from de-ai-coldread sub-agen to zetizeti". Every sentence here is invented.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cadenceIn, CADENCE_PROMPT_LINE, CADENCE_PHRASES } from '../lib/cadence.mjs';
import { validateOutput, validateCriticismOutput, validateSpecOutput, validateChoices, buildSystemPrompt, buildCriticismSystemPrompt, buildSpecSystemPrompt } from '../lib/dialogue.mjs';
import { validateExplanation, buildExplainPrompt } from '../lib/explain.mjs';

test('the tells are found, in their other forms too', () => {
  assert.deepEqual(cadenceIn('How do you delve into the box?'), ['delve']);
  assert.deepEqual(cadenceIn('Where is the toy navigating to?'), ['navigate']);
  assert.deepEqual(cadenceIn('What makes the ending truly quiet?'), ['truly']);
  assert.deepEqual(cadenceIn('Moreover, who opens the box?'), ['moreover']);
  assert.deepEqual(cadenceIn('What is it — the lid — that you keep — and why?'), ['dashes']);
});

test('a word the person used is theirs; a stock phrase never is', () => {
  assert.deepEqual(cadenceIn('Where does the toy navigate first?', new Set(['navigating'])), []);
  assert.deepEqual(cadenceIn('Moreover, who opens the box?', new Set(['moreover'])), ['moreover']);
});

test('ordinary questions pass, including the ones a phrase list would catch by mistake', () => {
  for (const q of ['Who speaks to the child first?', 'What happens as a result?', 'Where would you stand to be sure of it?',
    'What, exactly, is in the box?', 'Which one must go?', 'What is the photo a reminder of?', 'What is it — the lid — that you keep?']) {
    assert.deepEqual(cadenceIn(q), [], q);
  }
});

test('every question check refuses it, and a quoted span is exempt', () => {
  const q = 'What makes the ending truly quiet for you?';
  for (const v of [validateOutput(q, {}), validateCriticismOutput(q, {}), validateSpecOutput(q, {})]) assert.match(v.reasons.join(' '), /machine-written/);
  assert.match(validateChoices(`${q}\nWho opens the box?\nWhere does the lid go?`, { theirs: new Set(['ending', 'box', 'lid']) }).reasons.join(' '), /machine-written/);
  assert.ok(!/machine-written/.test(validateOutput('When you say "truly quiet", who hears it?', {}).reasons.join(' ')));
});

test('the explanation guard refuses it', () => {
  const v = validateExplanation({ parts: [{ text: 'Moreover, this question asks about your box.' }] }, { own: new Set(['box']) }, { grade: false });
  assert.match(v.reasons.join(' '), /machine-written/);
});

test('every prompt tells the model', () => {
  for (const p of [buildSystemPrompt('method'), buildCriticismSystemPrompt('method', {}), buildSpecSystemPrompt({ spec: 'THE THING: a lamp' }), buildExplainPrompt({ question: 'Who opens the box?' })]) {
    assert.ok(String(typeof p === 'string' ? p : JSON.stringify(p)).includes(CADENCE_PROMPT_LINE), 'a prompt is missing the cadence line');
  }
});

test('no phrase on the list can begin an ordinary question', () => {
  for (const p of ['as a result', 'speaks to', 'one must', 'to be sure', 'of course', 'a reminder of']) assert.ok(!CADENCE_PHRASES.includes(p), p);
});
