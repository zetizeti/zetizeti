// asking-back-and-rut.test.mjs — the two readings of 9 September 2026, the guard's final-attempt hand-back,
// and the end of appraisal in the warmth clause.
//
// Origin: twenty real dialogues from one AI Club session, read against the artifact criteria. A learner
// wrote "what", then "positive or negative?", then "idk what is diff in ending and goodbye", and each time
// got a further question resting on a distinction she did not have. Another was asked twenty questions on
// four of her own nouns with every opener different — v0.28.0's head ban working perfectly one level up.
// 62 of 458 delivered questions had breached after all four generations, 33 for repeating a frame. And
// eight preambles valued the learner's material in the prompt's own example sentences.
//
// 🔴 SYNTHETIC THROUGHOUT. `verification/` publishes wholesale; the twenty dialogues live in docs/ops/
// (publish-excluded) and nothing from them is quoted here. A repaired bicycle kiosk again.
// Every assertion here fails without the change it guards, and the consumer is read from the route's
// source, because a reading the route never calls is a reading that does not exist (this file's rule).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isAskingBack, readRut, RUT_TURNS, isDecline, NONMATERIAL } from '../lib/arc.mjs';
import { buildTurnContext, validateOutput } from '../lib/dialogue.mjs';
import { generateGuarded } from '../lib/guard.mjs';
const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const src = (f) => readFileSync(join(APP, f), 'utf8');

const Q1 = 'How do the loose spokes fit into the repair?';
const Q2 = 'Where does the rider wait while the tyre is checked?';
const Q3 = 'Which part of the queue lets the mechanic see the wheel?';
const RECENT = [Q1, Q2, Q3];

// ── asking back ──────────────────────────────────────────────────────────────────────────────────
test('a one-word interrogative with no material of its own is asking back', () => {
  assert.equal(isAskingBack('what', RECENT), true);
  assert.equal(isAskingBack('how', RECENT), true);
});
test('"what do you mean by X?" where X is the tool\'s own word is asking back', () => {
  assert.equal(isAskingBack('what do you mean by queue?', RECENT), true);
  assert.equal(isAskingBack('which wheel are you talking about', RECENT), true);
});
test('a request to explain, with or without a question mark, is asking back', () => {
  assert.equal(isAskingBack('pls explain', RECENT), true);
  assert.equal(isAskingBack('i cant understand you pls explain', RECENT), true);
});
test('the tool\'s question retyped back to it is asking back', () => {
  assert.equal(isAskingBack('which part of the queue lets the mechanic see the wheel', RECENT), true);
});
test('a decline that also asks what two of the tool\'s words differ in is asking back, and it outranks the decline', () => {
  const r = 'idk what is diff in spokes and wheel';
  assert.equal(isAskingBack(r, RECENT), true);
  assert.equal(isDecline(r), true, 'it is also a decline by the older reading — the route must read asking-back first');
});
test('a reply that adds a word of its own is an answer, however it is punctuated', () => {
  assert.equal(isAskingBack('names?', RECENT), false);
  assert.equal(isAskingBack('positive or negative?', RECENT), false);
  assert.equal(isAskingBack('I guess the brake?', RECENT), false);
  assert.equal(isAskingBack('the mechanic checks the tyre first, then asks where it hurts?', RECENT), false);
});
test('a bare decline is not asking back — it stays a decline', () => {
  assert.equal(isAskingBack('idk', RECENT), false);
  assert.equal(isAskingBack('i dont know', RECENT), false);
  assert.equal(isAskingBack('', RECENT), false);
});
test('the licence is the last THREE questions, not only the last one', () => {
  assert.equal(isAskingBack('what do you mean by spokes?', RECENT), true, 'spokes was in Q1');
  assert.equal(isAskingBack('what do you mean by spokes?', [Q2, Q3]), false, 'not in the last three any more');
});

// ── the rut ──────────────────────────────────────────────────────────────────────────────────────
const VERBS = ['happens to', 'slows', 'lengthens', 'empties', 'blocks', 'splits', 'clears', 'reaches'];
const NOUNS = ['rider', 'mechanic', 'tyre', 'wheel', 'brake', 'stand', 'pump', 'bell'];
// only "queue" is shared across these; the verb and the other noun change every time
const onQueue = (n) => Array.from({ length: n }, (_, i) => `What ${VERBS[i % 8]} the queue when the ${NOUNS[i % 8]} moves?`);
test('RUT_TURNS is six — the cohort median, and one above the 29 July session\'s longest run', () => {
  assert.equal(RUT_TURNS, 6);
});
test('six consecutive questions carrying one word read as a rut on that word', () => {
  assert.deepEqual(readRut(onQueue(6)), { word: 'queue', run: 6 });
});
test('five do not', () => {
  assert.equal(readRut(onQueue(5)), null);
});
test('it fires once per six — seven is silent, twelve fires again (the invitation kept the noun and re-fired every turn on a real replay)', () => {
  assert.equal(readRut(onQueue(7)), null);
  assert.equal(readRut(onQueue(11)), null);
  assert.deepEqual(readRut(onQueue(12)), { word: 'queue', run: 12 });
});
test('the run must end at the LATEST question — a rut that was broken is not a rut', () => {
  const qs = [...onQueue(6), 'Where does the rider stand?'];
  assert.equal(readRut(qs), null);
});
test('a hedge or light verb never carries a run', () => {
  // built from the list itself, so the only words shared across the seven are NONMATERIAL by definition
  const hedges = [...NONMATERIAL].filter((w) => /^[a-z]+$/.test(w)).slice(0, 3).join(' ');
  const qs = NOUNS.slice(0, 7).map((n, i) => `${hedges} ${n} ${VERBS[i]}?`);
  assert.equal(readRut(qs), null, `${hedges} must not carry a run`);
});

// ── the steering blocks ───────────────────────────────────────────────────────────────────────────
test('asking back outranks the aim, the anchor and the invites, and asks for the same thing plainer', () => {
  const out = buildTurnContext({
    message: 'what', askingBack: { words: ['queue', 'tyre'] },
    aim: 'AIM-MARKER-XYZ', dwell: { anchor: 'queue', returns: 2 }, stalledInvite: true, featureInvite: true,
    posture: 'POSTURE-MARKER', precision: true,
  });
  assert.match(out, /COULD NOT FOLLOW YOUR LAST QUESTION/);
  assert.match(out, /Ask the SAME thing again in plainer words/);
  assert.doesNotMatch(out, /AIM-MARKER-XYZ/);
  assert.doesNotMatch(out, /POSTURE-MARKER/);
  assert.doesNotMatch(out, /Their last reply added nothing/, 'the stalled invite must not fire beside it');
  assert.doesNotMatch(out, /Every concrete part of their idea/, 'nor the feature invite');
  assert.match(out, /"queue", "tyre"/, 'their own words are offered back as the material');
});
test('the rut invite hands the subject back and never names the word', () => {
  const out = buildTurnContext({ message: 'the queue', rutInvite: { word: 'queue', run: 6, exhausted: false } });
  assert.match(out, /The last 6 questions have all turned on the same thing/);
  assert.match(out, /Invite them to name ANOTHER part/);
  assert.doesNotMatch(out, /same thing.*"queue"|avoid.*queue/i, 'a word named is a word the model reaches for');
});
test('the exhausted form says why — every attempt repeated a frame', () => {
  const out = buildTurnContext({ message: 'the queue', rutInvite: { word: null, run: 0, exhausted: true } });
  assert.match(out, /Every attempt to ask about the material of the last question repeated the frame/);
});
test('on a prep turn, asking back suppresses the station\'s line', () => {
  const out = buildTurnContext({
    message: 'pls explain', askingBack: { words: [] },
    prep: { aim: 'STATION-LINE-MARKER', body: 'A passage.', phase: 'station', part: 1, parts: 3 },
  });
  assert.match(out, /COULD NOT FOLLOW/);
  assert.doesNotMatch(out, /STATION-LINE-MARKER/);
});

// ── the guard's final attempt ─────────────────────────────────────────────────────────────────────
const validateBad = (t) => (/BAD/.test(t) ? { ok: false, reasons: ['repeats the frame'] } : { ok: true, reasons: [] });
test('the fallback is used on the last attempt only, and only after every ordinary attempt breached', async () => {
  let ordinary = 0, fallback = 0;
  const out = await generateGuarded({
    generate: async () => { ordinary++; return 'BAD question?'; },
    validate: validateBad,
    fallback: { generate: async () => { fallback++; return 'What else is there?'; }, validate: validateBad },
  });
  assert.equal(ordinary, 3); assert.equal(fallback, 1);
  assert.equal(out.attempts, 4); assert.equal(out.fallback, true); assert.equal(out.check.ok, true);
  assert.equal(out.text, 'What else is there?');
});
test('a route that succeeds ordinarily never reaches the fallback', async () => {
  let fallback = 0;
  const out = await generateGuarded({
    generate: async (c) => (c ? 'Where does it start?' : 'BAD question?'),
    validate: validateBad,
    fallback: { generate: async () => { fallback++; return 'What else?'; }, validate: validateBad },
  });
  assert.equal(fallback, 0); assert.equal(out.fallback, false); assert.equal(out.attempts, 2);
});
test('a fallback that also breaches does not ship merely for being last', async () => {
  const out = await generateGuarded({
    generate: async () => 'BAD question?',
    validate: validateBad,
    fallback: { generate: async () => 'BAD hand-back?', validate: validateBad },
  });
  assert.equal(out.check.ok, false); assert.equal(out.attempts, 4);
  assert.equal(out.fallback, false, 'ties go to the earlier candidate; the fallback earned nothing');
});
test('without a fallback the loop is exactly what it was', async () => {
  let n = 0;
  const out = await generateGuarded({ generate: async () => { n++; return 'BAD?'; }, validate: validateBad });
  assert.equal(n, 4); assert.equal(out.fallback, false);
});

// ── no appraisal in the warmth clause ─────────────────────────────────────────────────────────────
const OWN = new Set(['queue', 'wait', 'distinction', 'work', 'real', 'doing', 'opening', 'line', 'clearer', 'tyre']);
test('a verdict on what their material is doing is refused even when every word in it is theirs', () => {
  for (const pre of [
    'That distinction between the queue and the wait is doing real work.',
    'This line about the tyre is opening something.',
    'That link between the queue and the wait is becoming clearer.',
    'That is a sharp distinction.',
  ]) {
    const v = validateOutput(`${pre} Where does the queue start?`, { ownWords: OWN });
    assert.equal(v.ok, false, pre);
    assert.ok(v.reasons.some((r) => /interprets what they said/.test(r)), `${pre} → ${JSON.stringify(v.reasons)}`);
  }
});
test('an acknowledgement made of their words passes', () => {
  const v = validateOutput('You said the queue builds while people wait for the tyre. Where does the queue start?', { ownWords: OWN });
  assert.equal(v.ok, true, JSON.stringify(v.reasons));
});
test('the prompt and both warmth postures no longer instruct praise', () => {
  const dialogue = src('lib/dialogue.mjs'), nudge = src('lib/nudge.mjs');
  assert.doesNotMatch(dialogue, /you MAY open with a brief, warm line naming what is working/);
  const postures = [...nudge.matchAll(/posture: '([^']*)'/g)].map((m) => m[1]);
  assert.ok(postures.length >= 2, 'the postures are still string literals this test can read');
  for (const p of postures) assert.doesNotMatch(p, /doing real work|opening something|tension is in view/, p.slice(0, 80));
});

// ── the consumer, read from the route ─────────────────────────────────────────────────────────────
test('the route reads both new readings and passes both blocks and the fallback', () => {
  const s = src('server.mjs');
  assert.match(s, /isAskingBack\(message, stoneTurns\)/);
  assert.match(s, /readRut\(stoneTurns\)/);
  assert.match(s, /const declined = !askingBack && isDecline\(message\)/, 'asking back is read BEFORE the decline');
  assert.match(s, /rutInvite,\n\s+askingBack,\n\s+message,/, 'both reach buildTurnContext on the enquiry turn');
  assert.match(s, /askingBack,\n\s+banOpeners,\n\s+banHeads,\n\s+message,\n\s+\}\)\n\s+: buildTurnContext/, 'and asking back reaches the prep turn');
  assert.match(s, /fallback: prepping \? null : \{/, 'the guard is given a hand-back on the enquiry surface');
  assert.match(s, /validateOutput\(t, \{ \.\.\.guardOptions, mustHold: null \}\)/, 'the fallback drops the join and nothing else');
  assert.match(s, /fallback: !!guarded\.fallback/, 'and the client is told which shipped');
});
