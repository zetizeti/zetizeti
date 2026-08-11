// located-mode.test.mjs — there is ONE rendering of the located spot, and no flag selecting between them.
//
// HISTORY. From 9 August 2026 this file tested two renderings behind `ZETIZETI_LOCATED_MODE`:
// `gloss` (the interpretive phrase from describeLocated) and `enum` (the two tokens plus the span, no
// interpretation). The flag was merged and deployed on 10 August as inert code, never switched on.
//
// SETTLED 11 August 2026. Measured twice — once without the route's posture, once with it. Enum repeats
// the "whose call" frame about 20 points more often in both runs, and under faithful composition its
// advantages evaporate: brevity falls from 5.3 words to 1.9 and the multi-question win disappears
// entirely. Gloss won, the flag was removed rather than left switched off, and this file now guards the
// removal instead of the experiment. Tables: `docs/ops/flow-probe-log.md`, 9 and 11 August.
//
// ⚠️ What these tests do NOT assert is that the gloss is *right*. It interprets — a closed set of four
// strings, but composed in the layer that writes sentences — and whether that is acceptable is a
// position, not a measurement. If it is ever ruled unacceptable, the answer is the third mode the log
// names (enum tokens plus a non-interpretive varying element), built deliberately. **Not this flag,
// resurrected.** These tests exist so that resurrection has to be a decision rather than a diff.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCriticismSystemPrompt, describeLocated } from '../lib/dialogue.mjs';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'dialogue.mjs');
const SPAN = 'The onboarding flow is the best part of the product';
const SEG = { text: SPAN, sdc_stage: 'mixed', judgement_held_by: 'text' };
const build = (env) => {
  const prev = process.env.ZETIZETI_LOCATED_MODE;
  if (env === undefined) delete process.env.ZETIZETI_LOCATED_MODE;
  else process.env.ZETIZETI_LOCATED_MODE = env;
  try {
    return buildCriticismSystemPrompt('CORE', {
      artefact: SPAN, located: { text: SPAN, why: describeLocated(SEG), stage: SEG.sdc_stage, heldBy: SEG.judgement_held_by },
      posture: '', retrieved: [], goal: '',
    });
  } finally {
    if (prev === undefined) delete process.env.ZETIZETI_LOCATED_MODE; else process.env.ZETIZETI_LOCATED_MODE = prev;
  }
};

test('the located spot is rendered with the gloss', () => {
  const p = build(undefined);
  assert.match(p, /THE SPOT TO QUESTION/);
  assert.ok(p.includes(SPAN), 'the span itself must reach the prompt');
  assert.match(p, /The locator marks this as: describing and deciding in the same breath/);
});

test('ZETIZETI_LOCATED_MODE no longer selects anything — setting it changes NOTHING', () => {
  // The load-bearing assertion. A flag left half-removed — read somewhere, ignored elsewhere — is worse
  // than either keeping or removing it, because it looks like a control and is not one.
  assert.equal(build('enum'), build(undefined), 'setting the retired flag must not alter the prompt');
  assert.equal(build('anything-else'), build(undefined));
});

test('no enum rendering survives anywhere in the prompt path', () => {
  const p = build('enum');
  assert.doesNotMatch(p, /The locator reports only which case fired/, 'the enum block must be gone');
  assert.doesNotMatch(p, /the call sits with:/, 'the enum token lines must be gone');
});

test('the flag is not read by lib/dialogue.mjs at all', () => {
  // Source-shape, deliberately: the behavioural test above passes just as well if the flag is read and
  // its result discarded. This one fails if the read comes back.
  const src = readFileSync(LIB, 'utf8');
  const reads = src.split('\n').filter((l) => /process\.env\.ZETIZETI_LOCATED_MODE/.test(l));
  assert.deepEqual(reads, [], 'ZETIZETI_LOCATED_MODE must not be read; the flag is retired, not disabled');
});
