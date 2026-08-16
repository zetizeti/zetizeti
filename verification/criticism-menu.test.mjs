// The MENU rule on the criticism surface, and the markdown strip that ships with it (16 August 2026).
//
// 🔴 WHY THIS SUITE EXISTS AT ALL. `validateOutput` has refused the two-box menu since v0.11.3 and `validateCriticismOutput` never could: it takes no `noBinary` option and `server.mjs` passes none, so the rule was written, measured, tested, and unreachable from the criticism path. A real student's session ran six two-box questions out of seven and every one was delivered. Nothing errored and no test failed, because the rule that would have caught it was being exercised only against the surface that already had it — the same shape as the guard that computed a verdict nobody read.
//
// 🔴 THE SENTENCES BELOW ARE SYNTHETIC AND MUST STAY SYNTHETIC. `verification/` is published wholesale by publish-public.sh (`for d in lib corpus public scripts verification`), and the session that found this was a student's own capstone document. A fixture built from her words would have gone to GitHub. The rule under test is a FORM, so a form is what it is tested on — which is the better test anyway, and the reason no exception is needed here.

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCriticismOutput, plainQuestion } from '../lib/dialogue.mjs';
import { generateGuarded } from '../lib/guard.mjs';

// The five menu shapes the criticism register actually produces. Each one hands the reader two boxes.
const MENUS = [
  'Is this word describing a state of the system, or is it deciding that state for the reader?',
  'When the text calls the result "clear", is that a property the result has, or is it a verdict the text is asking you to reach?',
  'Does that detail help someone find their way, or does it steer them toward the feeling the text wants?',
  'Does this move serve the main thing the design is for, or does it risk becoming a distraction from it?',
  'Does the reader need that framing to follow the argument, or do they want it because the text is guiding them there?',
];

// The same lines of questioning, asked open. None of these may be refused, or the rule has eaten the mode.
const OPEN = [
  'What does the word "clear" settle for the reader before they have settled it?',
  'What has the text done to tell a need apart from a want here?',
  'What is the main thing this design is for, and what does this move cost it?',
  'Whose call is "best" in that sentence?',
  'What would have to be true for that claim to hold?',
];

test('the menu is refused on the criticism surface', () => {
  for (const q of MENUS) {
    const { ok, reasons } = validateCriticismOutput(q, {});
    assert.equal(ok, false, `should refuse: ${q}`);
    assert.ok(reasons.some((r) => r.includes('two options')), `should refuse AS A MENU: ${q}`);
  }
});

test('the open forms of the same lines still pass', () => {
  for (const q of OPEN) {
    const { ok, reasons } = validateCriticismOutput(q, {});
    assert.equal(ok, true, `should pass: ${q} — ${reasons.join('; ')}`);
  }
});

// The reason the check runs against `framing` and not the raw text: the object under question may itself
// offer a choice, and quoting it back is the method doing its job, not the stone handing over a menu.
test('a menu QUOTED FROM THE TEXT is not the stone offering one', () => {
  const q = 'The text asks "is the interface honest, or is it merely legible?" — what is that question assuming about the reader?';
  const { ok, reasons } = validateCriticismOutput(q, {});
  assert.equal(ok, true, `quoted menu should pass: ${reasons.join('; ')}`);
});

test('markdown emphasis is stripped, and only where it is emphasis', () => {
  assert.equal(plainQuestion('does the reader *need* that, or *want* it?'), 'does the reader need that, or want it?');
  assert.equal(plainQuestion('what does **this** settle?'), 'what does this settle?');
  assert.equal(plainQuestion('what does _this_ settle?'), 'what does this settle?');
  // Not emphasis: a lone asterisk, and one with space inside the run.
  assert.equal(plainQuestion('what does the * mark in that line stand for?'), 'what does the * mark in that line stand for?');
  assert.equal(plainQuestion('why 3 * 4 and not 3 * 5?'), 'why 3 * 4 and not 3 * 5?');
});

// The strip runs INSIDE generateGuarded, so the validated string and the delivered string are one string.
test('the guard validates and delivers the stripped text, not the raw text', async () => {
  const seen = [];
  const out = await generateGuarded({
    mode: 'criticism',
    generate: async () => 'what does *this* word settle for the reader?',
    validate: (t) => { seen.push(t); return validateCriticismOutput(t, {}); },
  });
  assert.equal(out.text, 'what does this word settle for the reader?');
  assert.deepEqual(seen, ['what does this word settle for the reader?']);
});

// A menu is repaired once, exactly as any other breach — the student never reads the first attempt.
test('a menu is regenerated once before delivery', async () => {
  let n = 0;
  const out = await generateGuarded({
    mode: 'criticism',
    generate: async () => (++n === 1
      ? 'Is that a property of the system, or is it a verdict the text reached?'
      : 'What is that word settling for the reader?'),
    validate: (t) => validateCriticismOutput(t, {}),
  });
  assert.equal(out.check.ok, true);
  assert.equal(out.regenerated, true);
  assert.equal(out.text, 'What is that word settling for the reader?');
});
