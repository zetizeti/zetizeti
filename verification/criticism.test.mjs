// criticism.test.mjs — the deterministic core of the criticism surface (no LLM, no key needed):
// the verdict-drift guard (extends the never-answer guard) and the qualification-output parser.
// The two LLM calls (qualification + question) are NOT covered here — they need a live key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCriticismOutput, parseQualification } from '../lib/dialogue.mjs';
import { readSensed } from '../lib/sensed.mjs';

// ───────────────────── verdict-drift guard ─────────────────────

test('criticism guard: a clean question about the text passes', () => {
  const ok = validateCriticismOutput('This word — "seamless" — is it describing what the interface does, or approving of it?');
  assert.equal(ok.ok, true, ok.reasons.join('; '));
});

test('criticism guard: still questions-only — no "?" fails (base guard holds)', () => {
  assert.equal(validateCriticismOutput('Consider where this claim rests.').ok, false);
});

test('criticism guard: inherits the Socratic FORBIDDEN list (e.g. "you should")', () => {
  assert.equal(validateCriticismOutput('You should ask where this rests?').ok, false);
});

test('criticism guard: forbids correctness verdicts about the text', () => {
  for (const bad of [
    'Is this part wrong, and where?',
    'The text gets this wrong — what do you think?',
    'Is this a hallucination?',
    'This is an error, isn\'t it?',
  ]) assert.equal(validateCriticismOutput(bad).ok, false, `should reject: ${bad}`);
});

test('criticism guard: forbids grades on the text', () => {
  for (const bad of [
    'This is a good answer — why?',
    'Is this a poor explanation?',
    'Well done — but what is it deciding?',
  ]) assert.equal(validateCriticismOutput(bad).ok, false, `should reject: ${bad}`);
});

test('criticism guard: forbids "is-this-AI" verdicts about the writing', () => {
  for (const bad of [
    'This is clearly AI — what gives it away?',
    'This is AI-generated, isn\'t it?',
    'Was this written by a machine?',
  ]) assert.equal(validateCriticismOutput(bad).ok, false, `should reject: ${bad}`);
});

test('criticism guard: an affirming question (Felski limit) passes', () => {
  assert.equal(validateCriticismOutput('This part — what does it let you see?').ok, true);
});

// ───────────────────── qualification parser ─────────────────────

const goodJson = JSON.stringify({
  segments: [
    { id: 1, text: 'The checkout flow has five steps.', origin: 'text', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
    { id: 2, text: 'The clean, intuitive design is clearly the best choice.', origin: 'text', sdc_stage: 'mixed', judgement_held_by: 'text' },
  ],
});

test('parseQualification: parses valid JSON into normalised segments', () => {
  const segs = parseQualification(goodJson);
  assert.equal(segs.length, 2);
  assert.equal(segs[1].sdc_stage, 'mixed');
  assert.equal(segs[1].origin, 'text');               // source-neutral: always declared 'text', never 'ai'
});

test('parseQualification: tolerates a code fence and surrounding prose', () => {
  const segs = parseQualification('Here is the result:\n```json\n' + goodJson + '\n```\nDone.');
  assert.equal(segs.length, 2);
});

test('parseQualification: bad tags normalise to safe defaults', () => {
  const segs = parseQualification(JSON.stringify({ segments: [{ id: 1, text: 'x', sdc_stage: 'bogus', judgement_held_by: 'nonsense' }] }));
  assert.equal(segs[0].sdc_stage, 'qualification');
  assert.equal(segs[0].judgement_held_by, 'n/a');
});

test('parseQualification: throws cleanly on non-JSON and on empty segments', () => {
  assert.throws(() => parseQualification('not json at all'));
  assert.throws(() => parseQualification(JSON.stringify({ segments: [] })));
});

// ───────────────────── parse → locate flow (deterministic) ─────────────────────

test('qualified text → readSensed locates the mixed/judgement segment as a conflation', () => {
  const segments = parseQualification(goodJson);
  const reading = readSensed({ segments });
  assert.equal(reading.register, 'sensed');
  // segment 2 (mixed) is a strict conflation; segment 1 (qualification) is not.
  assert.deepEqual(reading.strict.conflation_segment_ids, [2]);
});
