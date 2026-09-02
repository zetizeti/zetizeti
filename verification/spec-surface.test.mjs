// spec-surface.test.mjs — the speccing surface's joints, its rotation, and the refusals its guard makes.
//
// 🔴 EVERY REFUSAL BELOW IS PLANTED AND WATCHED TO FIRE. This repository's standing rule is that a guard
// which has never refused anything has not been shown to work, and on this surface the point bites
// harder than usual: the questions this guard refuses are all things a competent reviewer would say, and
// they are all TRUE. "You have not said what happens at the edges" is accurate and is an answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOINTS, JOINT_KEYS, readJoints, nextJoint, specTerms } from '../lib/spec.mjs';
import { buildSpecSystemPrompt, validateSpecOutput } from '../lib/dialogue.mjs';

const BOUNCING = `A red ball moves inside the window. Each frame it moves by its speed.
When the ball reaches the wall it bounces back the other way.`;

// ---- the joints ------------------------------------------------------------------------------------

test('there are exactly six joints and they are the ones the deck teaches', () => {
  assert.equal(JOINTS.length, 6);
  assert.deepEqual(JOINT_KEYS, ['state', 'change', 'decision', 'edges', 'fixed', 'enough']);
});

test('readJoints reports what a specification TOUCHES, and a thin spec touches few', () => {
  const r = readJoints(BOUNCING);
  assert.equal(r.touched.change.touched, true, '"each frame" should register as change');
  assert.equal(r.touched.decision.touched, true, '"when … reaches" should register as decision');
  assert.equal(r.touched.fixed.touched, false, 'nothing here says what could be changed');
  assert.equal(r.touched.enough.touched, false, 'nothing here says how anybody would know it works');
  assert.ok(r.untouched.length >= 2);
});

test('an empty specification touches nothing and reports no verdict about it', () => {
  const r = readJoints('');
  assert.equal(r.n, 0);
  assert.deepEqual(r.untouched, JOINT_KEYS);
  // The shape of the return matters as much as the values: there is no score, no percentage and no
  // "complete" flag anywhere in it, because a number about somebody's unfinished work is a mark.
  assert.deepEqual(Object.keys(r).sort(), ['n', 'touched', 'untouched']);
});

test('the rotation goes to an UNTOUCHED joint first, and never repeats one already asked', () => {
  const first = nextJoint({ text: BOUNCING, asked: [] });
  assert.ok(readJoints(BOUNCING).untouched.includes(first.key), 'first question should go somewhere unwritten');
  const second = nextJoint({ text: BOUNCING, asked: [first.key] });
  assert.notEqual(second.key, first.key);
  const third = nextJoint({ text: BOUNCING, asked: [first.key, second.key] });
  assert.ok(![first.key, second.key].includes(third.key));
});

test('when every joint has been asked it starts again rather than stopping', () => {
  const j = nextJoint({ text: BOUNCING, asked: [...JOINT_KEYS] });
  assert.ok(j && JOINT_KEYS.includes(j.key));
});

// 🔴 THE ROTATION MUST KEEP MOVING PAST THE SIXTH QUESTION, and it did not. The fallback returned
// `asked[0]` — the first joint ever asked — so from question seven onward every question came from the
// same joint. A ten-round probe against the real endpoint showed four in a row on `state`; every unit
// test here passed, because each one proves a single call and none ran a conversation long enough.
test('🔴 a long conversation keeps moving — no joint twice running past the sixth question', () => {
  const asked = [];
  for (let i = 0; i < 18; i++) {
    const j = nextJoint({ text: BOUNCING, asked });
    assert.ok(j, `no joint at question ${i + 1}`);
    if (asked.length) {
      assert.notEqual(j.key, asked[asked.length - 1],
        `question ${i + 1} repeats the previous joint (${j.key}) — the rotation has stalled`);
    }
    asked.push(j.key);
  }
  // and over eighteen questions it should have used all six rather than ping-ponging between two
  assert.equal(new Set(asked).size, 6, `only visited ${new Set(asked).size} of 6 joints in eighteen turns`);
});

// ---- the prompt ------------------------------------------------------------------------------------

test('the prompt tells the model every refusal the guard will make', () => {
  const p = buildSpecSystemPrompt({ spec: BOUNCING, joint: JOINTS[3] });
  for (const phrase of ['you have not said', 'have you considered', 'you should', 'ONE question']) {
    assert.ok(p.includes(phrase), `the composing layer is not told about "${phrase}" — that makes the guard a repair loop`);
  }
});

test('an assignment is context and the prompt says it is never a rubric', () => {
  const p = buildSpecSystemPrompt({ spec: BOUNCING, assignment: 'Spec a bouncing ball.', joint: JOINTS[0] });
  assert.match(p, /NOT a rubric/);
  assert.match(p, /never say whether they have met it/i);
});

test('with no assignment the block is absent rather than empty', () => {
  const p = buildSpecSystemPrompt({ spec: BOUNCING, joint: JOINTS[0] });
  assert.ok(!p.includes('WHAT WAS ASKED FOR'));
});

// ---- the guard: each refusal planted --------------------------------------------------------------

const own = specTerms(BOUNCING);
const check = (q) => validateSpecOutput(q, { ownWords: own, maxWords: 0 });

test('it refuses NAMING AN ABSENCE, which is the refusal this surface exists for', () => {
  for (const q of [
    'You have not said what the ball does when it reaches the wall — what does it do?',
    'Your spec does not mention the speed — where does the speed come from?',
    'There is no mention of the window size — what is it?',
    'The starting position is missing — what is it?',
  ]) {
    const v = check(q);
    assert.equal(v.ok, false, `not refused: ${q}`);
    assert.ok(v.reasons.some((r) => /completes the spec/.test(r)), `wrong reason for: ${q} → ${v.reasons}`);
  }
});

test('it refuses INSTRUCTION wearing a question mark', () => {
  for (const q of [
    'Have you considered what happens when the ball reaches the corner?',
    'You should say what the speed is — what is it?',
    'Consider adding what the window does — what does it do?',
  ]) {
    assert.equal(check(q).ok, false, `not refused: ${q}`);
  }
});

test('it refuses GRADING the specification', () => {
  const v = check('Your specification is vague about the ball — what does it hold?');
  assert.equal(v.ok, false);
});

test('it refuses a question that INVENTS a noun she never wrote', () => {
  // "gravity" appears nowhere in her spec. Naming it is the answer, delivered as a question.
  const v = check('What does your gravity do to the ball?');
  assert.equal(v.ok, false, 'an invented noun was allowed through — that is how a question becomes a suggestion');
});

test('it refuses a yes/no question and a two-box menu', () => {
  assert.equal(check('Does the ball bounce when it reaches the wall?').ok, false);
  assert.equal(check('Is the speed a constant or a variable?').ok, false);
});

test('it refuses two questions joined with "and"', () => {
  assert.equal(check('What does the ball hold, and how does it move?').ok, false);
});

test('it PASSES a question that points with her own words and asks what hers does', () => {
  const good = 'When the ball reaches the wall, what does your specification say the speed becomes?';
  const v = check(good);
  assert.equal(v.ok, true, `a correct question was refused: ${v.reasons}`);
});

test('it passes a question quoting her text even where the quote contains a refused word', () => {
  // Her own sentence, quoted back, must not trip the pattern scan — the same reason the criticism
  // validator strips quoted spans before checking.
  const v = check('You wrote "it bounces back the other way" — what decides the other way?');
  assert.equal(v.ok, true, `quoting her words was refused: ${v.reasons}`);
});

// ---- what this surface must NOT have inherited ----------------------------------------------------

test('🔴 it does NOT carry criticism\'s self-defence refusal, which would refuse its own purpose', async () => {
  const { validateCriticismOutput } = await import('../lib/dialogue.mjs');
  const q = 'What does your own specification say happens at the wall?';
  // Criticism refuses questions of this shape by design: there the student's project is context.
  // Here it is the object, so the same sentence must pass.
  assert.equal(check(q).ok, true, 'the spec guard refused a question about her own document — the surface has no purpose left');
  assert.equal(typeof validateCriticismOutput, 'function');
});
