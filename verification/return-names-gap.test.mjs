// return-names-gap.test.mjs — a question that goes back to the last one says what the answer left out.
//
// Prayas, 17 September 2026: "when a question is repeated (seemingly) because the student's answer was
// neither complete or detailed enough - specify what was left out, what detail is still needed."
//
// The dwell reader holds an anchor for up to three turns, and the critique plan holds a station for up to
// three; from the learner's side both read as the same question asked again with no reason given. Code now
// decides three things — that the coming question returns, what kind of detail the last question asked for,
// and which of its own words the reply did not reach — and the guard refuses a returning question that does
// not open by naming the gap, or that grades the answer while naming it.
//
// 🔴 Every question and reply below is INVENTED. `verification/` is published whole.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readReturn, askedFor } from '../lib/arc.mjs';
import { validateOutput, validateCriticismOutput, buildTurnContext, returnBlock } from '../lib/dialogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(HERE, '..', f), 'utf8');

const GOAL = 'a repair kiosk for bicycles at the market gate';
const turns = (...r) => [GOAL, ...r];

// ── the reader ────────────────────────────────────────────────────────────────────────────────────
test('the kind of detail is read off the main clause, not a leading "when …,"', () => {
  assert.equal(askedFor('When the rider leaves the bicycle, where does the key go?').kind, 'where');
  assert.equal(askedFor('At what point does the kiosk close?').kind, 'when');
  assert.equal(askedFor('Who pays for the spare tube?').kind, 'who');
  assert.equal(askedFor('How many riders arrive before noon?').kind, 'number');
  assert.equal(askedFor('Is the awning enough in the rain?').kind, 'yesno');
});

test('a return whose reply did not reach the question\'s own words is read, and names them', () => {
  const r = readReturn({
    anchor: 'kiosk',
    lastQuestion: 'How does the kiosk keep the tools dry during the monsoon?',
    studentTurns: turns('the kiosk is small', 'it has a roof'),
    goal: GOAL,
  });
  assert.ok(r, 'fires');
  assert.equal(r.kind, 'how');
  assert.deepEqual(r.missing.sort(), ['dry', 'monsoon', 'tools']);
  assert.ok(r.words.includes('monsoon') && r.words.includes('how'));
  assert.ok(!r.words.includes('kiosk'), 'the subject itself is never what is missing');
});

test('the learner\'s own earlier words are never counted as left out', () => {
  const r = readReturn({
    anchor: 'kiosk',
    lastQuestion: 'How does the kiosk keep the tube patches for the riders?',
    studentTurns: turns('riders need tube patches at the kiosk', 'in a tin box'),
    goal: GOAL,
  });
  // "tube", "patches" and "riders" were theirs; the question only said them back
  assert.ok(!r || !r.missing.some((w) => ['tube', 'patches', 'riders'].includes(w)), JSON.stringify(r));
});

test('silent when the reply supplied the kind of detail asked for, whatever words it used', () => {
  assert.equal(readReturn({
    anchor: 'kiosk', lastQuestion: 'At what point does the kiosk become visible to a rider on the bridge?',
    studentTurns: turns('the kiosk is by the gate', 'after the second lamp post'), goal: GOAL,
  }), null);
  assert.equal(readReturn({
    anchor: 'awning', lastQuestion: 'Is the awning over the kiosk wide enough for two riders?',
    studentTurns: turns('the awning is blue', 'no'), goal: GOAL,
  }), null);
  assert.equal(readReturn({
    anchor: 'kiosk', lastQuestion: 'What does the kiosk sell besides repairs?',
    studentTurns: turns('the kiosk fixes punctures', 'bells and lights'), goal: GOAL,
  }), null, 'a what-question answered by naming something has been answered');
});

test('silent when the next question is not about what the last one asked', () => {
  assert.equal(readReturn({
    anchor: 'lamp', lastQuestion: 'How does the kiosk keep the tools dry?',
    studentTurns: turns('the lamp is broken', 'a roof'), goal: GOAL,
  }), null);
});

test('the critique surface\'s return needs no anchor, and the text\'s own words are never missing', () => {
  const text = 'The kiosk should open at dawn because riders commute early.';
  const r = readReturn({
    lastQuestion: 'How does "open at dawn" decide who the kiosk serves in the monsoon?',
    studentTurns: ['it is for commuters'], sameSubject: true, alsoGiven: text,
  });
  assert.ok(r, 'fires');
  assert.ok(!r.missing.includes('dawn') && !r.missing.includes('open'), JSON.stringify(r.missing));
  assert.ok(r.missing.includes('monsoon'));
});

// ── the guard, on both surfaces ───────────────────────────────────────────────────────────────────
const NOTE = { subject: '"kiosk"', need: 'how it happens', missing: ['monsoon', 'tools'], words: ['monsoon', 'tools', 'dry', 'how'] };
const refused = (v, re) => !v.ok && v.reasons.some((r) => re.test(r));
const both = (q, opts) => [validateOutput(q, opts), validateCriticismOutput(q, opts)];

test('BOTH surfaces refuse a returning question that gives no reason for returning', () => {
  for (const v of both('Where do the spanners sit when the rain comes in?', { returnNote: NOTE })) {
    assert.ok(refused(v, /same question again/), JSON.stringify(v.reasons));
  }
});

test('BOTH surfaces refuse a lead-in that names nothing the answer left out', () => {
  for (const v of both('You said it has a roof. Where do the spanners sit when the rain comes in?', { returnNote: NOTE })) {
    assert.ok(refused(v, /must name what their last answer left out/), JSON.stringify(v.reasons));
  }
});

test('BOTH surfaces refuse a lead-in that grades the answer', () => {
  for (const q of [
    'Your answer about the monsoon was incomplete. Where do the spanners sit when the rain comes in?',
    'That was not detailed enough on the tools. Where do the spanners sit when the rain comes in?',
    'Good answer, but the monsoon is still open. Where do the spanners sit when the rain comes in?',
    // measured live: "not yet clear" grades the answer's clarity; "not yet said" names the gap
    'The roof is mentioned, but how the tools stay dry is not yet clear. Where do the tools go when the rain comes in?',
  ]) {
    for (const v of both(q, { returnNote: NOTE })) assert.ok(refused(v, /grades their answer/), `${q} — ${JSON.stringify(v.reasons)}`);
  }
});

test('BOTH surfaces accept a lead-in that names the gap plainly', () => {
  const q = 'You said it has a roof, but not what happens to the tools in the monsoon. Where do the tools sit when the rain comes in?';
  for (const v of both(q, { returnNote: NOTE })) assert.equal(v.ok, true, JSON.stringify(v.reasons));
});

// Found on the first live run with the lead-in working: the right words, and the answer filled in.
test('BOTH surfaces refuse a lead-in that fills the gap in instead of saying it is missing', () => {
  const q = 'The roof keeps the tools dry in the monsoon. Where do the tools sit when more riders arrive?';
  for (const v of both(q, { returnNote: NOTE })) assert.ok(refused(v, /fill the gap in/), JSON.stringify(v.reasons));
});

test('BOTH surfaces refuse a return whose question then moves on to something else', () => {
  const q = 'You said it has a roof, but not what happens to the tools in the monsoon. Who else stands under the awning?';
  for (const v of both(q, { returnNote: NOTE })) assert.ok(refused(v, /moves on instead of asking/), JSON.stringify(v.reasons));
});

test('both routes license the plain words a lead-in needs to talk about an answer', () => {
  const s = src('server.mjs');
  assert.equal((s.match(/\.\.\.RETURN_LEAD_WORDS/g) || []).length, 2, 'enquiry and critique both');
});

test('with no return, nothing about a lead-in is asked for', () => {
  for (const v of both('Where do the spanners sit when the rain comes in?', {})) assert.equal(v.ok, true, JSON.stringify(v.reasons));
});

// ── the prompt, and the routes ────────────────────────────────────────────────────────────────────
test('the enquiry turn says why it returns, and the dwell\'s "different way" gives way to it', () => {
  const ctx = buildTurnContext({ dwell: { anchor: 'kiosk', approach: 'ask what would have to be true' }, returnNote: NOTE });
  assert.match(ctx, /GOES BACK TO "kiosk"/);
  assert.match(ctx, /"monsoon", "tools"/);
  assert.ok(!/STAY ON "kiosk"/.test(ctx), 'two instructions for one question is the fault this file keeps measuring');
  const plain = buildTurnContext({ dwell: { anchor: 'kiosk', approach: 'ask what would have to be true' } });
  assert.match(plain, /STAY ON "kiosk"/);
  assert.equal(returnBlock(null), '');
});

test('BOTH routes send the return to the guard and to the prompt, and the hand-back drops it', () => {
  const s = src('server.mjs');
  assert.match(s, /readReturn\(\{ anchor: dwell\.anchor/, 'enquiry reads the return off the dwell anchor');
  assert.match(s, /\n\s+returnNote,\n\s+message,\n\s+\}\);/, 'enquiry turn context carries it');
  assert.match(s, /\/\/ The return must say what the last answer left out[^\n]*\n\s+returnNote,/, 'enquiry guard options carry it');
  assert.match(s, /mustHold: null, returnNote: null \}/, 'the hand-back changes the subject, so the demand goes');
  assert.match(s, /sameSubject: true, alsoGiven: artefact/, 'critique reads the return off the plan');
  assert.match(s, /noJargon: true, returnNote: critReturnNote \}/, 'critique guard carries it');
  assert.match(s, /returnNote: critReturnNote,\n\s+\}\);/, 'critique prompt carries it');
  // the return is computed BEFORE the critique prompt is built, or the prompt could never say it
  assert.ok(s.indexOf('const critReturnNote') < s.indexOf('const system = buildCriticismSystemPrompt('));
  assert.match(src('lib/dialogue.mjs'), /\$\{aimBlock\}\$\{returnBlock\(returnNote\)\}/);
});

test('a return turn carries no association join, and the footing is reported', () => {
  const s = src('server.mjs');
  assert.match(s, /rutInvite \|\| returnNote\) \? null : readAssociation/);
  assert.match(s, /returnNote \? 'return' : null \}\);/);
});

// Measured live: with the ordinary repair wording ("ONE short question only — a single sentence", "ONE
// clause") every retry ordered the lead-in away, and the model wrote none in four attempts of four.
test('the repair asks for the lead-in on a return, and the hand-back attempt never does', async () => {
  const { repairInstruction, generateGuarded } = await import('../lib/guard.mjs');
  const lead = repairInstruction(['x'], { attempt: 1, lead: true });
  assert.match(lead, /ONE short sentence, under 22 words/);
  assert.match(lead, /open question/);
  assert.ok(!/a single sentence ending in one question mark/.test(lead));
  assert.ok(!/under 22 words/.test(repairInstruction(['x'], { attempt: 1 })));
  const seen = [];
  await generateGuarded({
    lead: true,
    generate: async (c) => { if (c) seen.push(['ordinary', c.instruction]); return 'no question'; },
    validate: () => ({ ok: false, reasons: ['no question present'] }),
    fallback: {
      generate: async (c) => { seen.push(['fallback', c.instruction]); return 'Where does it go?'; },
      validate: () => ({ ok: true, reasons: [] }),
    },
  });
  assert.ok(seen.filter(([k]) => k === 'ordinary').every(([, i]) => /under 22 words/.test(i)));
  assert.ok(seen.filter(([k]) => k === 'fallback').every(([, i]) => !/under 22 words/.test(i)));
});

test('on a return the enquiry prompt drops the "no preamble" shape and the posture, and its last line asks for the lead-in', () => {
  const withReturn = buildTurnContext({ shape: 'Ask it directly — one clause, no preamble.', posture: 'no preamble here', returnNote: NOTE });
  assert.ok(!/SHAPE of this question/.test(withReturn));
  assert.ok(!/no preamble here/.test(withReturn));
  assert.match(withReturn, /\[Reply with ONE short plain sentence that says what their last answer did not yet say/);
  const without = buildTurnContext({ shape: 'Ask it directly — one clause, no preamble.' });
  assert.match(without, /SHAPE of this question/);
  assert.match(without, /\[Reply with ONE short Socratic question only/);
});
