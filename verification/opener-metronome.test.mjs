// opener-metronome.test.mjs — THE HEAD BAN, and why the opener ban alone could not stop a loop.
//
// A real enquiry ran eighteen questions whose opening words cycled through three words, six times over,
// without a single guard firing. Each guard did exactly what it was written to do:
//
//   · the OPENER BAN was two questions wide, so it forbids every cycle of length 1 or 2 and PERMITS one
//     of length 3. It does not bound repetition — it puts a FLOOR under the period, and the model sat on
//     the floor. A guard whose satisfying set has a cheapest member will be met by that member.
//   · the FRAME GATE compares FIVE-word shingles, and the template repeating was three words long, the
//     noun after it changing every time. The comment above `avoid` in dialogue.mjs records the identical
//     blindness one size up, at four-word prefixes, from 29 July: the resolution was raised and the blind
//     spot moved rather than closing.
//
// 🔴 EVERY QUESTION IN THIS FILE IS INVENTED. The session that prompted it is a real student's and stays
// out of app/ entirely — `verification/` is copied WHOLESALE into the public export, and a content guard
// refuses only what it recognises, so a project subject is not a name and would ship. The material lives
// in docs/ops/, which is publish-excluded, exactly as `flow-probe.mjs --replay=<fixture>` has always done.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  questionHead, questionOpener, openerBans, headBans,
  OPENER_BAN_TURNS, HEAD_BAN_TURNS, HEAD_WORDS,
  validateOutput, validateCriticismOutput, validateSpecOutput,
} from '../lib/dialogue.mjs';

test('questionHead reads the first three words of the QUESTION, not of the turn', () => {
  assert.equal(questionHead('Where does the timer pause when the break begins?'), 'where does the');
  // a warmth preamble must not mask the question's own head — the same reason questionOpener skips it
  assert.equal(questionHead('That distinction is doing work. Where does the timer pause?'), 'where does the');
  // shorter than HEAD_WORDS: there is no template to repeat
  assert.equal(questionHead('What happened?'), '');
  assert.equal(questionHead('no question here'), '');
  assert.equal(HEAD_WORDS, 3);
});

test('the two windows are different widths, and that is the point', () => {
  // The head is banned twice as far back as the opener: an opener has few legal values and must come
  // free again quickly, while a three-word template has no such shortage.
  assert.equal(OPENER_BAN_TURNS, 3);
  assert.equal(HEAD_BAN_TURNS, 6);
  assert.ok(HEAD_BAN_TURNS > OPENER_BAN_TURNS);
});

test('openerBans is three questions wide — a three-beat cycle is no longer legal', () => {
  const stone = [
    'What holds the queue open?',
    'How does the queue drain?',
    'Where does the queue sit when nobody is waiting?',
  ];
  const bans = openerBans(stone);
  assert.deepEqual(bans.sort(), ['how', 'what', 'where']);
  // the fourth beat of a three-beat cycle would be 'what' again, and it is now refused
  const v = validateOutput('What holds the queue open at night?', { banOpeners: bans });
  assert.equal(v.ok, false);
  assert.ok(v.reasons.some((r) => /opens with "what" again/.test(r)));
});

test('the head ban catches the template the five-word frame gate cannot see', () => {
  const stone = [
    'Where does the queue sit when nobody is waiting?',
    'How does the queue drain?',
    'What happens to the queue when the shift ends?',
    'Where does the counter sit when the shop is shut?',
    'How does the counter clear?',
    'What happens to the counter when the till is empty?',
  ];
  const candidate = 'Where does the receipt sit when the drawer is closed?';

  // The frame gate does NOT see it: no five-word run is shared, because the nouns all differ.
  const frameOnly = validateOutput(candidate, { avoid: stone });
  assert.equal(frameOnly.ok, true, 'the five-word shingle gate is blind to a three-word template');

  // The head ban does.
  const withHead = validateOutput(candidate, { avoid: stone, banHeads: headBans(stone) });
  assert.equal(withHead.ok, false);
  assert.ok(withHead.reasons.some((r) => /begins "where does the …" again/.test(r)));

  // And it refuses the CONSTRUCTION, not the subject: the same noun in a different construction passes.
  const recast = validateOutput('Which shelf holds the receipt once the drawer is closed?',
    { avoid: stone, banHeads: headBans(stone) });
  assert.equal(recast.ok, true, 'changing the construction is the way out, and must stay open');
});

test('a metronome cannot survive both bans together', () => {
  // Eighteen turns of a strict three-beat cycle over three invented templates. Under the shipped pair of
  // bans, every question from the fourth onward is refused — which is the whole claim of this release.
  const cycle = [
    (i) => `What happens to the queue when shift ${i} ends?`,
    (i) => `How does the queue drain on day ${i}?`,
    (i) => `Where does the queue sit at hour ${i}?`,
  ];
  const stone = [];
  let refused = 0;
  for (let i = 0; i < 18; i++) {
    const q = cycle[i % 3](i);
    const v = validateOutput(q, { banOpeners: openerBans(stone), banHeads: headBans(stone) });
    if (!v.ok) refused++;
    stone.push(q);        // the metronome carries on regardless, so the count is the measure
  }
  assert.equal(refused, 15, 'the first three are new; every beat after them is refused');
  // the openers really were a strict three-cycle — the fixture is what it claims to be
  const ops = stone.map(questionOpener);
  assert.ok(ops.every((o, i) => o === ops[i % 3]));
});

test('GUARD PARITY — all three validators act on banHeads, not merely accept it', () => {
  // 🔴 The 17 August lesson, twice relearned: a validator that ACCEPTS an option is inert if the route
  // never sends one, and a rule written on one surface does not arrive on the other. So this asserts the
  // BEHAVIOUR on each of the three, and the SEND on each of the three, below.
  const stone = ['Where does the queue sit when nobody is waiting?'];
  const bans = headBans(stone);
  const q = 'Where does the counter sit when the shop is shut?';
  for (const [name, fn] of [
    ['validateOutput', validateOutput],
    ['validateCriticismOutput', validateCriticismOutput],
    ['validateSpecOutput', validateSpecOutput],
  ]) {
    const v = fn(q, { banHeads: bans });
    assert.equal(v.ok, false, `${name} ignored banHeads`);
    assert.ok(v.reasons.some((r) => /begins "where does the …" again/.test(r)), `${name} gave no reason`);
  }
});

test('GUARD PARITY — every route in server.mjs SENDS banHeads, and derives it in one place', () => {
  const src = fs.readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  // three routes: enquiry, criticism, spec. Each must both build a head list and pass one.
  assert.equal((src.match(/headBans\(/g) || []).length, 3, 'one head list per surface');
  assert.ok((src.match(/banHeads[,:]/g) || []).length >= 6, 'each surface passes it to prompt AND guard');
  // 🔴 and nobody may re-derive a ban inline — that is how the prompt and the guard came to disagree.
  assert.ok(!/slice\(-\d\)\.map\(\(q\) => questionOpener/.test(src),
    'a second derivation of the opener list has appeared; one list feeds prompt and guard');
});

test('the model is TOLD what will be refused — the ban is not a repair loop', async () => {
  const { buildTurnContext } = await import('../lib/dialogue.mjs');
  const ctx = buildTurnContext({
    retrieved: [], banOpeners: ['where'], banHeads: ['where does the'], message: 'the queue is long',
  });
  assert.ok(/Do NOT begin this question with "where"/.test(ctx));
  assert.ok(/"where does the …"/.test(ctx), 'the head is named to the composing layer, quoted');
  assert.ok(/Change the CONSTRUCTION/.test(ctx), 'and it is told what changing it means');
});

test('the stalled invite hands the topic back, and says nothing about the learner', async () => {
  const { buildTurnContext } = await import('../lib/dialogue.mjs');
  const on = buildTurnContext({ retrieved: [], stalledInvite: true, message: 'it stays the same' });
  assert.ok(/added nothing they had not already said/.test(on));
  assert.ok(/do NOT ask about that material again/i.test(on));
  assert.ok(/no candidates from you/.test(on), 'the next subject must be theirs to name');
  // invariant #7: a posture or an instruction about the SENTENCE, never a characterisation of the person
  assert.ok(!/the learner is (stuck|exhausted|bored|drifting)/i.test(on));
  const off = buildTurnContext({ retrieved: [], stalledInvite: false, message: 'it stays the same' });
  assert.ok(!/added nothing they had not already said/.test(off), 'inert unless it fires');
});
