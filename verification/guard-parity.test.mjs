// guard-parity.test.mjs — the two surfaces must refuse the same shapes.
//
// 🔴 WHY THIS EXISTS. On 16 August `BINARY_DEMAND` turned out to have been unreachable from the criticism
// path for that surface's entire life: `validateOutput` took `noBinary`, `validateCriticismOutput` did not,
// and `server.mjs` passed none — so a real student got six two-box menus in seven questions, every one
// delivered, guard clean. It was fixed. On 17 August a ten-round critique opened "When you say…" on NINE of
// ten questions, because the opener ban enforced on enquiry since 29 July had never reached this surface
// either, and neither had the frame-repeat gate, the closed-question refusal or the length cap.
//
// Same defect, one parameter list away from the first, one day later. Fixing instances is not the answer:
// **nothing in the code makes the omission visible**, because each function reads perfectly well alone. So
// this file asserts BEHAVIOURAL parity — give both validators the same bad question and both must refuse
// it. A shared helper is not enough on its own, since a surface can still fail to *pass* the option; the
// route-level assertions at the bottom catch that half.
//
// ⚠️ Parity is not sameness. Verdict-drift and the artefact anchor belong to criticism because only it has
// a text under question; `mustHold` belongs to enquiry because only it makes association joins. Those are
// differences somebody chose, and they are listed here so the distinction stays deliberate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateOutput, validateCriticismOutput } from '../lib/dialogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const refused = (v, re) => !v.ok && v.reasons.some((r) => re.test(r));

// Each case: one question, the options both surfaces get, and the reason both must give.
const SHARED = [
  { name: 'the two-box menu',
    q: 'Is the queue a signal to the rider, or is it a problem for the mechanic?',
    opts: { noBinary: true }, re: /two options|two boxes/ },
  { name: 'the comparison, which is the same menu in a different coat',
    q: 'What is the difference between a standard the rider expects and a right the rider is owed?',
    opts: { noBinary: true }, re: /two options|two boxes/ },
  // and it must reach the indirect form, which is how two of the three real ones were phrased
  { name: 'the comparison asked indirectly',
    q: 'What does that suggest about the difference between a wholesale price and the actual cost?',
    opts: { noBinary: true }, re: /two options|two boxes/ },
  { name: 'the closed question',
    q: 'Does the rider need to hold the paper receipt to trust the repair?',
    opts: { noClosed: true }, re: /yes or no/ },
  { name: 'the repeated opener',
    q: 'When you say the queue builds, what happens to the rider who arrives last?',
    opts: { banOpeners: ['when'] }, re: /opens with "when" again/ },
  { name: 'the repeated frame',
    q: 'What would have to be true for the awning to hold in the monsoon?',
    opts: { avoid: ['What would have to be true for the queue to hold at noon?'] }, re: /repeats the frame/ },
  { name: 'the question that will not end',
    q: 'When the rider leaves the bicycle at the kiosk and walks into the market and comes back an hour '
     + 'later to collect it again, what exactly is the thing that they are hoping somebody has already '
     + 'quietly done for them while they were gone from the place?',
    opts: { maxWords: 34 }, re: /too long/ },
  { name: 'the compound question, which was the frame the opener ban could not reach',
    q: 'What is the receipt doing for the rider, and what would it take to make that visible from the road?',
    opts: { noCompound: true }, re: /joins a second question/ },
  { name: 'two question marks',
    q: 'Where does the rider wait? What does the awning do?',
    opts: { noCompound: true }, re: /more than one question/ },
  { name: 'the interpretive preamble',
    q: 'The queue building while riders wait suggests a shift in how the kiosk values time. Where does the waiting start?',
    opts: { ownWords: new Set(['queue', 'building', 'riders', 'wait', 'kiosk', 'waiting', 'time', 'start']) },
    re: /interprets what they said/ },
];

for (const c of SHARED) {
  test(`BOTH surfaces refuse ${c.name}`, () => {
    const enq = validateOutput(c.q, c.opts);
    const crit = validateCriticismOutput(c.q, c.opts);
    assert.ok(refused(enq, c.re), `enquiry must refuse it — got ${JSON.stringify(enq.reasons)}`);
    assert.ok(refused(crit, c.re), `criticism must refuse it — got ${JSON.stringify(crit.reasons)}`);
  });
}

test('and both accept a question that breaks none of them', () => {
  const q = 'Where does the rider stand while the wheel is off?';
  const opts = { noBinary: true, noClosed: true, maxWords: 34, banOpeners: ['what'], avoid: [] };
  assert.equal(validateOutput(q, opts).ok, true, JSON.stringify(validateOutput(q, opts).reasons));
  assert.equal(validateCriticismOutput(q, opts).ok, true, JSON.stringify(validateCriticismOutput(q, opts).reasons));
});

// ── the half a shared helper cannot cover ─────────────────────────────────────────────────────────
// A validator that ACCEPTS an option is still inert if the route never sends it. That is the precise shape
// of both failures this file is named after, so the routes are read directly. Source-reading is a blunt
// instrument and is used here deliberately: it is the only thing that fails when somebody adds a seventh
// shared check to one call site and not the other.
test('BOTH routes actually SEND every shared guard — an accepted option nobody passes is inert', () => {
  const src = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');
  // Read to the END of the options object by matching braces, not a fixed window: these call sites carry
  // long comments, and a window that happens to be too short reports a missing guard that is actually there
  // — a false alarm in a test about false clean bills is the last thing this file should produce.
  const call = (name) => {
    const i = src.indexOf(name);
    assert.notEqual(i, -1, `${name} must be called in server.mjs`);
    let depth = 0;
    for (let k = src.indexOf('{', i); k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
    }
    throw new Error(`could not read the options passed to ${name}`);
  };
  for (const opt of ['maxWords', 'avoid', 'banOpeners', 'noClosed', 'ownWords']) {
    assert.match(call('validateOutput(t, {'), new RegExp(`\\b${opt}\\b`),
      `the enquiry route must pass ${opt}`);
    assert.match(call('validateCriticismOutput(t, {'), new RegExp(`\\b${opt}\\b`),
      `the criticism route must pass ${opt} — this is the defect that shipped twice`);
  }
});

test('what is deliberately NOT shared is listed, so the difference stays a decision', () => {
  const src = readFileSync(join(HERE, '..', 'lib', 'dialogue.mjs'), 'utf8');
  // criticism-only: there is a text under question, so a verdict about it can drift and a question can
  // stop pointing at it. Enquiry has no artefact and neither check has a meaning there.
  assert.match(src, /CRITICISM_FORBIDDEN/);
  assert.match(src, /artefactTerms/);
  // enquiry-only: only this surface makes association joins, so only it can fail to hold both sides.
  assert.match(src, /mustHold/);
  // and the reason is written down rather than inferable
  assert.match(src, /What stays per-surface is what is genuinely per-surface/);
});

// ── invention, refused on BOTH surfaces (17 August 2026) ───────────────────────────────────────────
// The invent-no-premise rule has been in the system prompt since v0.11.2 — an instruction to the model
// that is doing the inventing, which is the same shape as a guard that only reports. A probe asked for
// "the specific moment when the repair has shifted … to an artisanal one" about a student who had
// described no shift. Every existing rule passed it: not a menu, not closed, not long, preamble clean.
const THEIRS = new Set(['queue', 'rider', 'tyre', 'kiosk', 'mechanic', 'receipt', 'stool', 'awning',
  'bicycle', 'bicycles', 'market', 'repair', 'wait', 'waits', 'waiting', 'visual', 'guess', 'builds']);

test('BOTH surfaces refuse the exact moment of a change nobody described', () => {
  const q = 'What is the specific moment when the rider realises the repair has shifted from a fast service to a slow one?';
  for (const [name, v] of [['enquiry', validateOutput(q, { ownWords: THEIRS })],
                           ['criticism', validateCriticismOutput(q, { ownWords: THEIRS })]]) {
    assert.ok(refused(v, /moment of a change they never described/), `${name}: ${JSON.stringify(v.reasons)}`);
  }
});

test('a pinpoint alone is fine, and so is a change they DID name', () => {
  // Asking for a moment is good questioning; the fault is only the pair.
  assert.equal(validateOutput('What is the exact moment the rider leaves the kiosk?', { ownWords: THEIRS }).ok, true);
  const said = new Set([...THEIRS, 'shifted', 'shift']);
  const q = 'What is the specific moment when the queue shifted?';
  assert.equal(validateOutput(q, { ownWords: said }).ok, true, 'their own word for it must pass');
});

test('BOTH surfaces refuse a deictic naming a thing nobody named', () => {
  const q = 'What does this pharmacy of components make possible for the rider?';
  for (const [name, v] of [['enquiry', validateOutput(q, { ownWords: THEIRS })],
                           ['criticism', validateCriticismOutput(q, { ownWords: THEIRS })]]) {
    assert.ok(refused(v, /treats a thing nobody named as already agreed/), `${name}: ${JSON.stringify(v.reasons)}`);
  }
  // and it finds the invented word even when the one before it IS theirs
  const q2 = 'What does this visual synchronisation tell the rider?';
  assert.ok(refused(validateOutput(q2, { ownWords: THEIRS }), /already agreed/), 'the second word is the invented one');
});

test('the deictic rule does not eat ordinary English, which two drafts of it did', () => {
  for (const q of [
    // Draft 2 took the PREPOSITION as the head noun and refused this: "that … about".
    'That guess about the rider\'s budget. What does the mechanic do with it next?',
    // Draft 1 skipped the head noun entirely and refused this on the word "instead", three tokens later.
    'You said the queue builds while the rider waits. What would the awning hold instead?',
    'What happens to that queue when the awning leaks?',                                // their own word
    'What is this moment doing for the rider?',                                         // an abstract noun
  ]) {
    const v = validateOutput(q, { ownWords: THEIRS });
    assert.ok(v.reasons.every((r) => !/already agreed/.test(r)), `must pass: ${q} — ${JSON.stringify(v.reasons)}`);
  }
});

// ── the second correction escalates ───────────────────────────────────────────────────────────────
test('the second repair changes its instruction — repeating the first is what made it pointless', async () => {
  const { repairInstruction, generateGuarded } = await import('../lib/guard.mjs');
  const first = repairInstruction(['repeats the frame of an earlier question'], { mode: 'criticism', attempt: 1 });
  const second = repairInstruction(['repeats the frame of an earlier question'], { mode: 'criticism', attempt: 2 });
  assert.notEqual(first, second, 'a second correction identical to the first cannot reach what was wrong');
  assert.match(second, /second correction/);
  assert.match(second, /ONE clause/);
  assert.equal(/second correction/.test(first), false);

  // and the budget is two corrections, not one — asserted through the real loop
  let seen = 0;
  const out = await generateGuarded({
    generate: async () => { seen++; return 'Is it this or that?'; },
    validate: (t) => ({ ok: false, reasons: ['always fails'] }),
    mode: 'criticism',
  });
  assert.equal(seen, 4, 'four generations = three corrections');
  assert.equal(out.attempts, 4);
  assert.equal(out.check.ok, false, 'and a persistent breach is still delivered flagged, never blank');
});

test('a question that passes still costs exactly one generation', async () => {
  const { generateGuarded } = await import('../lib/guard.mjs');
  let seen = 0;
  const out = await generateGuarded({
    generate: async () => { seen++; return 'Where does the rider stand?'; },
    validate: () => ({ ok: true, reasons: [] }),
  });
  assert.equal(seen, 1, 'the raised budget must cost nothing on a clean turn');
  assert.equal(out.regenerated, false);
});

test('the deictic rule survived four drafts, each of which refused a correct question', () => {
  // Both from the 17 August critique run, and both were the rule refusing correct questions:
  const own = new Set([...THEIRS, 'accountable', 'word', 'dashboard']);
  //  (a) the same thing in its noun form — the text said "accountable", the question said "accountability"
  const a = 'What does this word decide for you, and what would it mean if this accountability were the default?';
  assert.ok(validateOutput(a, { ownWords: own }).reasons.every((r) => !/already agreed/.test(r)),
    'their own word in another form is still their word');
  //  (b) a benign head noun must END the phrase, not be skipped past into the verb after it
  const b = 'What is this word deciding for you about the dashboard?';
  assert.ok(validateOutput(b, { ownWords: own }).reasons.every((r) => !/already agreed/.test(r)),
    '"word" is the noun; "deciding" is not a thing anybody named');
  //  (c) a short head noun that is simply not on the benign list — the list cannot be complete, so the
  //      FIRST plausible noun after the deictic decides and the scan stops there rather than hunting on
  const c = 'Which action marks the transition of this rag back into a functional tool?';
  //  (e) and `that` is not a deictic here at all — it introduces a clause far more often than a noun
  const e = 'Where does the rider look for the information that tells them the repair is done?';
  assert.ok(validateOutput(e, { ownWords: own }).reasons.every((r) => !/already agreed/.test(r)),
    'a relative pronoun is not a presupposition');
  assert.ok(validateOutput(c, { ownWords: own }).reasons.every((r) => !/already agreed/.test(r)),
    'a four-letter noun ends the phrase; it is not a licence to flag the next word');
  //  (d) and ORDER: with `theirs` tested before the phrase-ending checks, the learner's own noun let the
  //      scan walk through to the VERB after it
  const d = 'What does this word decide for you about the dashboard?';
  assert.ok(validateOutput(d, { ownWords: new Set([...own, 'word']) }).reasons.every((r) => !/already agreed/.test(r)),
    'a word being theirs is a reason not to object to it, never a reason to keep hunting');
  //  and the rule still catches what it was built for
  assert.ok(refused(validateOutput('What does this pharmacy of components offer the rider?', { ownWords: own }),
    /already agreed/), 'a genuinely invented thing must still be refused');
  assert.ok(refused(validateOutput('What does this visual synchronisation tell the rider?', { ownWords: own }),
    /already agreed/), 'including when the invented word is the second one');
});

// ── the join's requirement must be material (17 August 2026) ───────────────────────────────────────
// `mustHold` demands the question reuse one of the learner's own words from each side of an association
// join. The route built those two lists with unfiltered content words, so the demand could be "reuse
// maybe" or "reuse hadn't" — unsatisfiable in any question worth asking, and against invariant #1, which
// reuses their MATERIAL. Two of ten probe questions were refused for exactly that. assoc.mjs filters
// NONMATERIAL in four places; the route threw the discipline away at the last step.
test('the route filters hedges out of the join requirement, as assoc.mjs already does', async () => {
  const { NONMATERIAL } = await import('../lib/arc.mjs');
  const src = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');
  const i = src.indexOf('mustHold: assoc ?');
  assert.notEqual(i, -1, 'the join requirement must still be built here');
  const block = src.slice(i, i + 400);
  assert.match(block, /NONMATERIAL\.has/, 'the join words must be filtered to material');
  // and the words that caused it are the ones the list holds
  for (const w of ['maybe', 'probably', 'would', "hadn't"]) {
    assert.ok(NONMATERIAL.has(w), `"${w}" must not be demandable as a carried word`);
  }
  // the mirror must not drift from the route — a harness measuring a different build measures nothing
  const probe = readFileSync(join(HERE, '..', 'scripts', 'flow-probe.mjs'), 'utf8');
  const j = probe.indexOf('mustHold: {');
  assert.notEqual(j, -1);
  assert.match(probe.slice(j, j + 400), /NONMATERIAL\.has/, 'flow-probe must filter identically');
});

test('a GAP is not a menu — the widened rule swept in an ordinary noun and it came back out', () => {
  // "the gap between what is promised and what is delivered" asks ABOUT a gap; it does not hand the
  // student two boxes to sort. It was refused for one run, on the criticism surface, where a gap is
  // ordinary vocabulary. A rule against menus that eats the register it polices has inverted itself.
  const q = 'When the text says "wait", what does that waiting reveal about the gap between what is promised and what is delivered?';
  for (const [name, v] of [['enquiry', validateOutput(q, { noBinary: true })],
                           ['criticism', validateCriticismOutput(q, { noBinary: true })]]) {
    assert.ok(v.reasons.every((r) => !/two options|two boxes/.test(r)), `${name}: ${JSON.stringify(v.reasons)}`);
  }
});

// ── the composing layer is told what the guard will refuse ─────────────────────────────────────────
// 🔴 A rule the model has not been GIVEN is a repair loop, not a guard — the same lesson as 16 August,
// arriving as silence rather than as contradiction. The opener ban reached the criticism surface and was
// enforced with the prompt never informed, so the model was refused for opening with a word it had no way
// to know was spent. Enquiry has told its model since 29 July.
test('BOTH prompts warn about the spent openers, not just the guards that refuse them', async () => {
  const { buildCriticismSystemPrompt, buildTurnContext } = await import('../lib/dialogue.mjs');
  const crit = buildCriticismSystemPrompt('CORE', { artefact: 'a text', banOpeners: ['when', 'what'] });
  assert.match(crit, /Do NOT begin this question with "when" or "what"/,
    'the criticism prompt must carry the ban it will be judged by');
  const enq = buildTurnContext({ message: 'x', banOpeners: ['when', 'what'] });
  assert.match(enq, /Do NOT begin this question with "when" or "what"/);
  // and the criticism prompt names the shapes already used, since "do not repeat a frame" is unactionable
  const framed = buildCriticismSystemPrompt('CORE', { artefact: 'a text', avoidFrames: ['When you say the queue'] });
  assert.match(framed, /already asked, in these shapes/);
});

test('the route builds ONE opener list, so the prompt and the guard cannot disagree', () => {
  const src = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');
  assert.match(src, /const critBanOpeners = critBans;/,
    'the guard must reuse the list the prompt was given — two derivations would drift');
  const i = src.indexOf('buildCriticismSystemPrompt(criticismCore, {');
  assert.notEqual(i, -1);
  assert.match(src.slice(i, i + 600), /banOpeners: critBans/);
});

test('one-question does not eat a quoted question, which is the criticism method working', () => {
  // The text under question may itself contain a question, and pointing at it in its own words is the
  // method. `framing` strips quoted spans, so only the model's OWN construction is counted.
  const q = 'Where does the text answer its own question, "who is this for?"';
  assert.ok(validateCriticismOutput(q, { noCompound: true }).reasons.every((r) => !/one question/.test(r)),
    JSON.stringify(validateCriticismOutput(q, { noCompound: true }).reasons));
});

test('and a list inside one question is still one question', () => {
  const q = 'What does the rider notice about the queue, the awning and the stool?';
  assert.equal(validateOutput(q, { noCompound: true }).ok, true,
    JSON.stringify(validateOutput(q, { noCompound: true }).reasons));
});
