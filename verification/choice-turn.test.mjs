// choice-turn.test.mjs — the choice turn in enquiry (1 October 2026)
//
// Prayas: "put the multiple choice thing in enquiry", and "but multiple choice is not answering". Code decides when; the stone offers three questions built only from the learner's words; the learner picks the one it asks, or replies and none is asked. These tests hold the decision, the guard on the set, and the two places it is wired.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { choiceTurn } from '../lib/pace.mjs';
import { validateChoices, choiceLines, keepChoices, CHOICES, CHOICE_BRIEFS } from '../lib/dialogue.mjs';
import { content as contentWords } from '../lib/signals.mjs';
import { NONMATERIAL } from '../lib/arc.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');

const said = ['I want the bus shelter to feel like it belongs to the street, not dropped onto it.', 'the people waiting, they wait there every day', 'dunno'];
const opts = { noClosed: true, noBinary: true, theirs: new Set(said.flatMap((t) => contentWords(t)).filter((w) => !NONMATERIAL.has(w))) };

test('code offers a choice only on need, and only after a turn that asked', () => {
  assert.equal(choiceTurn({ declined: true, stalled: false, replies: 2, lastStoneSpoke: true }), true);
  assert.equal(choiceTurn({ declined: false, stalled: true, replies: 2, lastStoneSpoke: true }), true);
  assert.equal(choiceTurn({ declined: false, stalled: false, replies: 2, lastStoneSpoke: true }), false, 'no need, no choice');
  assert.equal(choiceTurn({ declined: true, stalled: false, replies: 0, lastStoneSpoke: true }), false, 'never on the opening edge');
  assert.equal(choiceTurn({ declined: true, stalled: false, replies: 3, lastStoneSpoke: false }), false, 'a choice not taken is stored empty, so none follows it');
});

test('three open questions, each about a different thing they said, pass', () => {
  const set = 'What does the street give the people waiting?\nWhere, while they wait, does the shelter belong?\nWhat is it like to be dropped onto a street?';
  const check = validateChoices(set, opts);
  assert.deepEqual(check.reasons, []);
  assert.equal(check.qs.length, CHOICES);
});

test('the set is refused whole: a subject of the tool’s own, two on one thing, a missing question, a shared opening', () => {
  assert.ok(validateChoices('What does the street give the people waiting?\nWhere does the shelter belong?\nWhat colour might a canopy be?', opts).reasons.some((r) => /question 3: names nothing they said/.test(r)), 'a subject of the tool’s own is refused');
  assert.ok(validateChoices('Where does the shelter belong?\nWho made the shelter belong?\nWhat does the street give the people waiting?', opts).reasons.some((r) => /about the same thing/.test(r)));
  assert.ok(validateChoices('What does the street give the people waiting?\nWhere does the shelter belong?', opts).reasons.some((r) => /exactly 3/.test(r)));
  assert.ok(validateChoices('What does the street give?\nWhat does the shelter belong to?\nWho notices the shelter every day?', opts).reasons.some((r) => /opens like another/.test(r)));
  assert.ok(validateChoices('The street gives the people waiting.\nWhere does the shelter belong?\nWho notices the shelter every day?', opts).reasons.some((r) => /question 1: no question present/.test(r)));
});

test('numbering and bullets are stripped, not counted as the question', () => {
  assert.deepEqual(choiceLines('1. Where?\n- Who?\n\n• What?'), ['Where?', 'Who?', 'What?']);
});

test('the route offers the choice before the ordinary question, and only a set that passed', () => {
  const at = server.indexOf('choiceTurn({ declined: !!declined, stalled: stalledInvite');
  assert.ok(at > 0 && at < server.indexOf('const guarded = await generateGuarded({'), 'decided before the ordinary question is generated');
  assert.match(server, /check: \{ ok: kept\.length >= CHOICES \}/);
  assert.match(server, /if \(offered\.check\.ok\) \{[\s\S]{0,400}send\('choices', \{ qs: kept \}\)/);
});

test('the page holds the choice as an empty turn until one is chosen, and replying closes it', () => {
  assert.match(page, /else if\(type==='choices'\)\{ choices=data\.qs;/);
  assert.match(page, /const entry=\{role:'interlocutor', content:''\}; history\.push\(entry\);/);
  assert.match(page, /entry\.content=qs\[i\];/);
  assert.match(page, /async function turn\(text\)\{\n  busy=true; send\.disabled=true;\n  closeChoices\(\);/);
});

test('good candidates are kept across tries until there are three, and a bad one does not sink the rest', () => {
  let kept = keepChoices('What does the street give the people waiting?\nWhat colour might a canopy be?\nWhat does the street give the people waiting?', [], opts);
  assert.deepEqual(kept, ['What does the street give the people waiting?'], 'the tool’s own subject and a repeat are dropped, the good one kept');
  kept = keepChoices('Where, while they wait, does the shelter belong?\nWhat is it like to be dropped onto a street?\nWho else waits there every day?', kept, opts);
  assert.equal(kept.length, CHOICES, 'stops at three');
});

test('three tries, each in a different wording', () => {
  assert.ok(CHOICE_BRIEFS.length >= 3);
  assert.equal(new Set(CHOICE_BRIEFS.map((b) => b(5))).size, CHOICE_BRIEFS.length);
  assert.match(server, /for \(const brief of CHOICE_BRIEFS\)/);
});

test('a choice may follow a said-back turn, never a blank or a choice left unchosen (4 Oct 2026)', () => {
  assert.match(server, /return stone\.length > 0 && !!String\(stone\[stone\.length - 1\]\.content \|\| ''\)\.trim\(\);/);
  assert.ok(server.includes('replies: studentTurns.length - 1, lastStoneSpoke })'), 'the route passes what the last stone turn said, not whether it asked');
});

test('while they have named fewer than three things, the choices may share one (4 Oct 2026)', () => {
  const one = { theirs: new Set(['surprise']) };
  const qs = 'Where did you last notice surprise happening?\nWhat does surprise feel like when it arrives?\nWhen were you last surprised by something small?';
  assert.equal(keepChoices(qs, [], one).length, CHOICES, 'one thing said, three questions about it');
  assert.equal(keepChoices('Where is the street?\nWhat is the street like?\nWho uses the street?', [], { theirs: new Set(['street', 'shelter', 'waiting']) }).length, 1, 'with three things said, each question still takes a different one');
});
