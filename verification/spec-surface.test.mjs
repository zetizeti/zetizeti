// spec-surface.test.mjs — the speccing surface's joints, its rotation, and the refusals its guard makes.
//
// 🔴 EVERY REFUSAL BELOW IS PLANTED AND WATCHED TO FIRE. This repository's standing rule is that a guard
// which has never refused anything has not been shown to work, and on this surface the point bites
// harder than usual: the questions this guard refuses are all things a competent reviewer would say, and
// they are all TRUE. "You have not said what happens at the edges" is accurate and is an answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOINTS, JOINT_KEYS, readJoints, nextJoint, specTerms, refusalQuestion } from '../lib/spec.mjs';
import { buildSpecSystemPrompt, validateSpecOutput, buildBuilderPrompt, validateBuildReport } from '../lib/dialogue.mjs';

const BOUNCING = `A red ball moves inside the window. Each frame it moves by its speed.
When the ball reaches the wall it bounces back the other way.`;

// ---- the joints ------------------------------------------------------------------------------------

// 🔴 THE SURFACE AND THE TAUGHT FORMAT ARE ONE LIST, AND THIS IS WHERE THAT IS HELD. The format handed to
// students is eight lines — a name, six joints, a refusal — and until 2 September 2026 this surface asked
// about the middle six only, so the two lines a student is most likely to get wrong were the two nothing
// here ever asked about. If the taught format changes, this assertion is what fails.
test('there are exactly eight lines and they are the ones the format teaches', () => {
  assert.equal(JOINTS.length, 8);
  assert.deepEqual(JOINT_KEYS,
    ['thing', 'state', 'change', 'decision', 'edges', 'fixed', 'enough', 'refusal']);
  assert.deepEqual(JOINTS.map((j) => j.line),
    ['THE THING', 'STATE', 'CHANGE', 'DECISION', 'EDGES', 'FIXED OR FREE', 'ENOUGH', 'NOT THIS']);
});

// The client files an answer under `line` and the prompt names the joint with `label`. Both come off this
// one table; a second copy anywhere is the defect this repository meets most often.
test('every line carries both labels, and nothing else has to derive them', () => {
  for (const j of JOINTS) {
    assert.ok(j.line && j.line === j.line.toUpperCase(), `${j.key} has no format label`);
    assert.ok(j.label && j.label !== j.line, `${j.key}'s conversational label is missing or is the format one`);
  }
});

// 🔴 `thing` IS NEVER REPORTED TOUCHED AND THAT IS THE DESIGN. Every specification names something, so a
// mark list would report it touched on all of them and the reading would be a formality. Whether a naming
// sentence is really there is a judgement, and a vocabulary rule has failed to draw a judgement line in
// this repository three times.
test('the naming line is never read as touched, however well it is written', () => {
  const named = 'A lamp that goes amber when the sensor stops reporting. It is a lamp. The thing is a lamp.';
  assert.equal(readJoints(named).touched.thing.touched, false);
  assert.ok(readJoints(named).untouched.includes('thing'));
});

// The refusal line CAN be read, and the asymmetry with `thing` is the point: a refusal has to be written
// to exist at all, which is the finding that line carries.
test('the refusal line reads as touched only when a refusal is actually written', () => {
  assert.equal(readJoints('It keeps no history and never stores what it read.').touched.refusal.touched, true);
  assert.equal(readJoints(BOUNCING).touched.refusal.touched, false);
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
  // and over eighteen questions it should have used all eight rather than ping-ponging between two
  assert.equal(new Set(asked).size, 8, `only visited ${new Set(asked).size} of 8 lines in eighteen turns`);
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

// ---- the refusal line is composed in code, not generated -------------------------------------------
//
// 🔴 FOUR MEASURED RUNS COULD NOT GET THE MODEL TO ASK IT. Pushed toward the negative it invented a
// refusal she never wrote; pushed away from inventing it stopped asking. The record is at the foot of
// `lib/spec.mjs`. These assert the properties the model kept losing.

test('the refusal question presupposes nothing about how her thing works', () => {
  const B = 'A red ball moves inside the window. Each frame the ball moves by its speed.';
  for (let n = 0; n < 3; n++) {
    const q = refusalQuestion(B, n);
    assert.ok(q.endsWith('?'), 'not a question');
    assert.ok(!/\brefuses\b|\brefuse\b|\bwhy does\b/i.test(q),
      `frame ${n} asserts or asks about a refusal she never wrote: ${q}`);
  }
});

test('it points with a noun of HERS, and the same spec always gives the same question', () => {
  const B = 'A red ball moves inside the window. Each frame the ball moves by its speed.';
  assert.equal(refusalQuestion(B, 0), refusalQuestion(B, 0));
  assert.ok(refusalQuestion(B, 0).includes('ball'), 'it is not pointing with her most-used noun');
  const S = 'A shelf of tools. A person writes a name on a card and leaves the card on the shelf.';
  assert.ok(/\b(shelf|card)\b/.test(refusalQuestion(S, 0)));
});

test('three frames, so a second asking in one conversation is not the first sentence again', () => {
  const B = 'A red ball moves inside the window.';
  assert.notEqual(refusalQuestion(B, 0), refusalQuestion(B, 1));
  assert.notEqual(refusalQuestion(B, 1), refusalQuestion(B, 2));
  assert.equal(refusalQuestion(B, 0), refusalQuestion(B, 3), 'the frames should cycle');
});

// ---- would this build? ------------------------------------------------------------------------------
//
// 🔴 THE POLARITY OF THE SENTENCE IS THE WHOLE DESIGN. This act names gaps, which every other line on
// this surface refuses to do. What keeps it the right side of the position is that each one is written
// as a decision the BUILDER takes rather than as something she failed to write — and that is enforced
// here rather than asked for in a prompt.

test('the builder prompt tells the model every refusal the guard will make', () => {
  const p = buildBuilderPrompt({ spec: 'A red ball.' });
  for (const phrase of ['you have not said', 'the spec is missing', 'you should specify', 'decision you are taking']) {
    assert.ok(p.toLowerCase().includes(phrase.toLowerCase()),
      `the composing layer is not told about "${phrase}" — that makes the guard a repair loop`);
  }
});

test('🔴 a line written as HER omission is dropped and the rest of the report survives', () => {
  const r = validateBuildReport([
    '- I would have to decide how often it checks, and I would probably pick once a second.',
    '- You have not said what happens at the edges.',
    '- The spec is missing a colour.',
    '- I would have to choose what happens the first time it runs.',
  ].join('\n'));
  assert.equal(r.items.length, 2, 'review-language lines were not dropped');
  assert.equal(r.dropped, 2);
  for (const i of r.items) assert.ok(/^I would have to/.test(i), `not written as the builder's own decision: ${i}`);
});

test('the report carries decisions and nothing countable', () => {
  const r = validateBuildReport('- I would have to decide the interval.');
  assert.deepEqual(Object.keys(r).sort(), ['dropped', 'items'],
    'the report has grown a field — a total, a score or a ready flag would be a mark on unfinished work');
});
