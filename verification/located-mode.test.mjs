// located-mode.test.mjs — 🧪 EXPERIMENT (branch experiment/located-enum, 9 August 2026).
//
// Covers the two renderings of the located spot in buildCriticismSystemPrompt:
//
//   'gloss' (default)  — passes describeLocated()'s interpretive phrase.
//   'enum' (experiment) — passes the two tokens the phrase was derived from, and no interpretation.
//
// What is actually asserted, and why it is worth asserting: that the enum rendering carries NO
// interpretive language across into the layer that writes sentences. A test that only checked the
// tokens were present would pass on a prompt that also still glossed them, which is the failure
// this experiment exists to avoid — so the negative assertions are the load-bearing ones.
//
// The default path is asserted UNCHANGED, because an experiment that quietly alters the shipped
// behaviour is not an experiment.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCriticismSystemPrompt } from '../lib/dialogue.mjs';

const SPAN = 'The onboarding flow is the best part of the product';
const LOCATED = { text: SPAN, why: 'a consequential call the text appears to make for the reader', stage: 'judgement', heldBy: 'text' };
const CORE = '(method core stub)';

// The interpretive phrases describeLocated() can emit — the exact strings that must not cross in
// enum mode. Kept as a list rather than a regex so a new phrase added to describeLocated() and not
// added here shows up as an untested case rather than as a silent pass.
const GLOSSES = [
  'a consequential call the text appears to make for the reader',
  'a call relayed as if it were already settled',
  'describing and deciding in the same breath',
  'a place where describing and deciding may blur',
];

const withMode = (mode, fn) => {
  const prev = process.env.ZETIZETI_LOCATED_MODE;
  if (mode === null) delete process.env.ZETIZETI_LOCATED_MODE;
  else process.env.ZETIZETI_LOCATED_MODE = mode;
  try { return fn(); } finally {
    if (prev === undefined) delete process.env.ZETIZETI_LOCATED_MODE;
    else process.env.ZETIZETI_LOCATED_MODE = prev;
  }
};

test('default (no env var) is the gloss rendering — shipped behaviour is untouched', () => {
  const p = withMode(null, () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
  assert.ok(p.includes('The locator marks this as: a consequential call'), 'gloss phrase missing from the default prompt');
  assert.ok(p.includes(SPAN), 'the span must be present in both modes');
});

test("explicit 'gloss' matches the default exactly", () => {
  const a = withMode(null, () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
  const b = withMode('gloss', () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
  assert.equal(a, b);
});

test("'enum' carries the case tokens and the span", () => {
  const p = withMode('enum', () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
  assert.match(p, /case: judgement/);
  assert.match(p, /the call sits with: text/);
  assert.ok(p.includes(SPAN), 'the span must survive — Clean Language needs the text\'s own words');
});

test("'enum' carries NO interpretive gloss — the load-bearing assertion", () => {
  const p = withMode('enum', () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
  for (const g of GLOSSES) assert.ok(!p.includes(g), `enum mode leaked a describeLocated gloss: "${g}"`);
  assert.ok(!p.includes('The locator marks this as'), 'enum mode still frames the locator as having made a reading');
});

test("'enum' does not crash when the tokens are absent, and says so rather than inventing", () => {
  const p = withMode('enum', () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: { text: SPAN } }));
  assert.match(p, /case: unspecified/);
  assert.match(p, /the call sits with: unspecified/);
});

test('no located spot → no spot block, in either mode', () => {
  for (const m of [null, 'gloss', 'enum']) {
    const p = withMode(m, () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: null }));
    assert.ok(!p.includes('THE SPOT TO QUESTION'), `mode ${m} emitted a spot block with no located spot`);
  }
});

test('the never-judge instruction survives in both modes — it is not part of the experiment', () => {
  for (const m of ['gloss', 'enum']) {
    const p = withMode(m, () => buildCriticismSystemPrompt(CORE, { artefact: SPAN, located: LOCATED }));
    assert.ok(p.includes('never tell them which it is'), `mode ${m} dropped the hand-back instruction`);
  }
});
