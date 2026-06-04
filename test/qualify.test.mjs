// qualify.test.mjs — the deterministic qualifier's behaviour, locked as an audit regression.
// Asserts the SDC stage each rule assigns, that the canned demo still reads 2:8 through the
// ported split-ratio locator, and the two properties the LLM pass could not give: reliability
// (never throws on ordinary input) and reproducibility (same text → identical tags).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualify, tagSegment, segmentText, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';

// zetizeti's record is source-neutral ('text'); the canon port (sensed.mjs) speaks 'ai'. Map at the
// boundary exactly as the route does, so the demo exercises the real compute path.
const senseQualified = (text) => readSensed({ segments: toCanonSegments(qualify(text).segments) });

test('directive (deontic modal) → judgement, held by the text', () => {
  const t = tagSegment('You should remove every optional field.');
  assert.equal(t.sdc_stage, 'judgement');
  assert.equal(t.judgement_held_by, 'text');  // source-neutral: the found TEXT held the call (never 'ai')
  assert.match(t.why, /directive "should"/);
});

test('imperative → judgement', () => {
  const t = tagSegment('Remove every optional field.');
  assert.equal(t.sdc_stage, 'judgement');
  assert.match(t.why, /imperative/);
});

test('predicative evaluation ("is clean") → judgement', () => {
  const t = tagSegment('The interface is clean.');
  assert.equal(t.sdc_stage, 'judgement');
  assert.match(t.why, /predicative/);
});

test('attributive evaluation ("clean interface") → mixed', () => {
  const t = tagSegment('The clean interface guides the user.');
  assert.equal(t.sdc_stage, 'mixed');
  assert.match(t.why, /attributive/);
});

test('consensus marker ("obviously") → narration', () => {
  const t = tagSegment('Users obviously prefer a minimal interface.');
  assert.equal(t.sdc_stage, 'narration');
  assert.match(t.why, /relays a call as already-settled/);
});

test('neutral description → qualification, held n/a', () => {
  const t = tagSegment('Onboarding is the first sequence a new user moves through.');
  assert.equal(t.sdc_stage, 'qualification');
  assert.equal(t.judgement_held_by, 'n/a');
});

test('hedge moves the holder to shared; hand-back to the reader → human', () => {
  const hedged = tagSegment('This may be a clean approach.');
  assert.equal(hedged.judgement_held_by, 'shared');
  const handed = tagSegment('A better option, depending on your users.');
  assert.equal(handed.judgement_held_by, 'human');
});

// The canned demo text (mirrors public/index.html CRIT_DEMO_TEXT) — the audit anchor.
const DEMO =
  'Onboarding is the first sequence a new user moves through. The best approach is to make your onboarding as clean and intuitive as possible. A frictionless sign-up is always better, so you should remove every optional field. Users obviously prefer a minimal interface, and this is considered best practice in modern design.';

test('demo text: deterministic segment stages are locked', () => {
  const segs = qualify(DEMO).segments;
  const stages = segs.map((s) => s.sdc_stage);
  assert.deepEqual(stages, [
    'qualification', // Onboarding is the first sequence…
    'mixed',         // The best approach … (attributive "best approach")
    'judgement',     // A frictionless sign-up is always better,
    'judgement',     // so you should remove every optional field.
    'narration',     // Users obviously prefer a minimal interface,
    'narration',     // and this is considered best practice…
  ]);
  // exactly one non-blur segment
  assert.equal(stages.filter((s) => s === 'qualification').length, 1);
});

test('demo text reads 2:8 through the ported split-ratio locator', () => {
  const reading = senseQualified(DEMO);
  assert.equal(reading.strict.ratio, '2:8');
  // the located blurs are every segment but the first
  assert.deepEqual(reading.strict.conflation_segment_ids, [2, 3, 4, 5, 6]);
});

test('every segment carries a hand-checkable rationale (inspectability)', () => {
  for (const s of qualify(DEMO).segments) {
    assert.ok(typeof s.why === 'string' && s.why.length > 0, `segment ${s.id} has no why`);
    assert.equal(s.origin, 'text');
  }
});

test('reliability: never throws on empty / punctuation-only / odd input', () => {
  assert.doesNotThrow(() => qualify(''));
  assert.equal(qualify('').segments.length, 0);
  assert.doesNotThrow(() => qualify('!!! ??? ...'));
  assert.doesNotThrow(() => qualify('a'));
  assert.doesNotThrow(() => qualify('No terminal punctuation here'));
  assert.equal(qualify('No terminal punctuation here').segments.length, 1);
});

test('reproducibility: same text yields identical segments twice', () => {
  assert.deepEqual(qualify(DEMO), qualify(DEMO));
});

test('segmentText keeps connectives with the following clause and preserves text', () => {
  const parts = segmentText('It is fine, but you should change it.');
  assert.deepEqual(parts, ['It is fine,', 'but you should change it.']);
});

// ── regressions locked from the 1000+ case stress test (scripts/stress-locator.mjs) ────────────

test('regression: sentence-initial noun-verb is NOT a false imperative', () => {
  // "Process"/"Order" etc. are tagged Verb.Infinitive sentence-initially; a real subject+predicate
  // follows, so these must read as qualification, not a command. (Was a 37% false-positive class.)
  assert.equal(tagSegment('Process teams iterate constantly.').sdc_stage, 'qualification');
  assert.equal(tagSegment('Order processing takes time.').sdc_stage, 'qualification');
});

test('regression: real imperatives still fire (object marker or no later finite verb)', () => {
  assert.equal(tagSegment('Remove the interface from the menu.').sdc_stage, 'judgement');
  assert.equal(tagSegment('Flatten navigation entirely.').sdc_stage, 'judgement');
});

test('regression: hedged modal-be ("might be clean") → judgement, held shared', () => {
  // bare "be" is tagged Verb.Infinitive (never Copula); with a subject before it, it is a predicate.
  const t = tagSegment('The interface might be clean.');
  assert.equal(t.sdc_stage, 'judgement');
  assert.equal(t.judgement_held_by, 'shared');
});

test('regression: subject + "tends to be" + eval → judgement', () => {
  assert.equal(tagSegment('The grid tends to be intuitive.').sdc_stage, 'judgement');
});

test('regression: subjectless discourse opener "To be fair," does NOT flag the eval word', () => {
  // no subject before bare "be" → not predicative; comma after the adj → not attributive to "users".
  assert.equal(tagSegment('To be fair, users open the menu first.').sdc_stage, 'qualification');
  assert.equal(tagSegment('To be honest, the layout has six fields.').sdc_stage, 'qualification');
});

test('regression: comma is a boundary, but an adjective list still binds attributively', () => {
  // "fair, users" = clause boundary (not modification); "clean, simple interface" = coordination.
  assert.equal(tagSegment('The clean, simple interface guides the user.').sdc_stage, 'mixed');
});

test('regression: predicative scan steps over a quantifier determiner ("is both biased…")', () => {
  const t = tagSegment('The data is both hugely biased and incomplete.');
  assert.equal(t.sdc_stage, 'judgement');
  assert.match(t.why, /predicative/);
});
