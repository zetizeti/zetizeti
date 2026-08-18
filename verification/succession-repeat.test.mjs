// succession-repeat.test.mjs — the learner repeating themselves, and the tell in the preamble.
//
// Origin: a real student's session, 17 August 2026. Nineteen questions, the last seven inside one narrow
// patch of the idea, two replies byte-identical to the one before them, and the student left on the
// nineteenth without answering. Nothing saw any of it — every detector this project had requires a student
// willing to SAY something is wrong, and every fixture it owns is a student who said so.
//
// 🔴 THIS FILE IS SYNTHETIC THROUGHOUT AND SAYS SO DELIBERATELY. `verification/` publishes wholesale, so
// somebody else's material may not live here — their words go to docs/ops/ (publish-excluded) and are
// asserted from `test/`, which is stripped from the export. The material moves; the code stays public.
// That is the 13 August rule, and the v0.14.2 leak it was written against was exactly this shape: a probe
// carrying a student's own sentences past two guards that had nothing to recognise.
// ⚠️ So these assertions prove the GUARDS and cannot prove the guards fire on her case. That pair lives in
// `test/succession-real.test.mjs`, runs only where the private fixture is present, and says which set it
// ran on. A file that silently substitutes invented material for a real session is measuring something else
// under the same name.
//
// Every assertion here is written to FAIL without the change it guards — the only form of proof this
// project accepts. Verified by reverting each edit in turn and watching the matching test go red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isRepeatOf, readRepeat, readDwell, ANCHOR_MAX, NONMATERIAL } from '../lib/arc.mjs';
import { validateOutput, preambleOf } from '../lib/dialogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', 'docs', 'ops', 'fixtures');

// A kiosk that repairs bicycles. Invented here, and unrelated to any student's project on purpose: a
// project SUBJECT is not a name, and it identifies a person just as well as one (the v0.14.2 finding).
const KIOSK_A = 'The queue builds because every rider waits for the tyre to be checked before anything else.';
const KIOSK_B = 'The mechanic looks at the wheel first, then back at the rider, and says what it needs.';

// ── the detector ───────────────────────────────────────────────────────────────────────────────────
test('a reply identical to the previous one is read as a repeat', () => {
  assert.equal(isRepeatOf(KIOSK_A, KIOSK_A), true);
  // Normalisation survives punctuation and case, since a student may retype rather than paste.
  assert.equal(isRepeatOf('The queue builds every morning.', 'the queue builds every morning'), true);
  assert.equal(isRepeatOf('The  queue   builds every morning', 'The queue builds every morning'), true);
  assert.equal(readRepeat(['a first answer about tyres', KIOSK_A, KIOSK_A]), true);
  // A reordered restatement is the same reply too — same tokens, no new material.
  assert.equal(isRepeatOf('waits for the tyre every rider', 'every rider waits for the tyre'), true);
});

test('a REPEAT is not a similarity measure — near misses and short replies are left alone', () => {
  // One added clause is not a repeat. The terse student's replies are new-word-poor constantly and must
  // never be rotated away from on that basis (the 28 July finding: pressing one turn too long costs less
  // than walking away from the thing they came for).
  assert.equal(isRepeatOf(KIOSK_A + ' And the pump is missing.', KIOSK_A), false);
  assert.equal(isRepeatOf(KIOSK_B, KIOSK_A), false);
  // Below four distinct tokens a restatement cannot be told from an idiom, so it never counts.
  assert.equal(isRepeatOf('i think so', 'so i think'), false);
  assert.equal(readRepeat(['only one turn']), false);
  assert.equal(readRepeat([]), false);
});

// ── it fires nowhere in any session anybody has ────────────────────────────────────────────────────
// The two-student rule discharged by construction rather than by argument: the change cannot overcorrect
// for one student at the others' expense, because on their transcripts it does not fire at all. This reads
// the replay fixtures where they exist and asserts nothing about their contents.
test('ZERO consecutive repeats across every replay fixture present', () => {
  let files = [];
  try { files = readdirSync(FIXTURES).filter((f) => f.startsWith('replay-session') && f.endsWith('.json')); }
  catch { return; }                                  // publish-excluded; a clone has none, and that is fine
  if (!files.length) return;
  let replies = 0, repeats = 0;
  for (const f of files) {
    const j = JSON.parse(readFileSync(join(FIXTURES, f), 'utf8'));
    const arr = Array.isArray(j) ? j : (j.replies || j.turns || j.studentTurns || []);
    const reps = arr.map((x) => (typeof x === 'string' ? x : (x.student || x.text || x.reply || ''))).filter(Boolean);
    replies += reps.length;
    for (let i = 1; i < reps.length; i++) if (isRepeatOf(reps[i], reps[i - 1])) repeats++;
  }
  assert.equal(repeats, 0, `a real student repeating verbatim would change what this fix may claim (${replies} replies read)`);
});

// ── the response: retire the anchor at once, and reach for the goal ────────────────────────────────
const GOAL = 'kiosk queue tyre pump receipt awning stool';
const STUCK = [
  'the mechanic checks the tyre while the rider waits at the kiosk',
  'the mechanic looks at the tyre before the rider says anything',
  'the mechanic turns the tyre and the rider waits again',
];
const ASKED = [
  'What does the mechanic do with the tyre first?',
  'How does the rider know the tyre was checked?',
  'What makes the tyre worth checking before the rest?',
];

test('without a repeat, dwell holds the anchor — the 28 July decision is untouched', () => {
  const d = readDwell({ studentTurns: STUCK, stoneTurns: ASKED, goal: GOAL });
  assert.ok(d && d.anchor, 'an anchor should still be picked');
  assert.equal(d.invite, undefined);
  assert.equal(ANCHOR_MAX, 3, 'the dwell budget itself is unchanged');
});

test('a repeat retires the held anchor and hands the turn to an untouched thing in their OWN goal', () => {
  const held = readDwell({ studentTurns: STUCK, stoneTurns: ASKED, goal: GOAL });
  const after = readDwell({ studentTurns: [...STUCK, STUCK[2]], stoneTurns: ASKED, goal: GOAL, repeated: true });
  assert.ok(after && after.anchor, 'the turn must still have somewhere to stand');
  assert.notEqual(after.anchor, held.anchor, 'the exhausted anchor must not survive the repeat');
  // And what it reaches is theirs, not the second-hottest word in the rut.
  assert.ok(GOAL.split(' ').includes(after.anchor), `expected a word from their goal, got "${after.anchor}"`);
  assert.equal(ASKED.join(' ').toLowerCase().includes(after.anchor), false, 'and one no question has touched');
});

test('with nothing left in the goal to reach for, a repeat still does not re-press the same word', () => {
  const spent = 'mechanic tyre rider';                       // every goal word already asked about
  const held = readDwell({ studentTurns: STUCK, stoneTurns: ASKED, goal: spent });
  const after = readDwell({ studentTurns: [...STUCK, STUCK[2]], stoneTurns: ASKED, goal: spent, repeated: true });
  if (held && held.anchor && after && after.anchor) assert.notEqual(after.anchor, held.anchor);
  else assert.ok(after === null || after.invite || (after && after.anchor));
});

// ── the tell in the preamble ───────────────────────────────────────────────────────────────────────
const THEIR_WORDS = new Set(
  [KIOSK_A, KIOSK_B, ...STUCK].join(' ').toLowerCase().match(/[a-z]{3,}/g) || [],
);

test('an interpretive preamble is refused even when built from the learner’s own vocabulary', () => {
  // Every noun here is theirs; only the claim is the tool's. This is the arithmetic that beat the ratio:
  // enough of their words to clear the threshold, with a reading they never made riding on top.
  const smuggled = [
    'The queue building while every rider waits suggests a shift in how the kiosk values time. Where does the waiting start?',
    'The mechanic looking at the wheel and then the rider is a significant shift in how the repair unfolds. What happens next at the kiosk?',
    'The tyre being checked first means that the queue is really about trust. What does the rider see?',
  ];
  for (const q of smuggled) {
    assert.ok(preambleOf(q), 'the case must actually carry a preamble');
    const v = validateOutput(q, { ownWords: THEIR_WORDS });
    assert.equal(v.ok, false, `must be refused: ${q.slice(0, 50)}…`);
    assert.ok(v.reasons.some((r) => /interprets what they said/.test(r)), `expected the tell reason, got ${JSON.stringify(v.reasons)}`);
  }
});

test('a tell the learner used THEMSELVES is theirs, and passes', () => {
  // Clean Language positively requires saying their word back (invariant #1), so the check is provenance.
  const own = new Set([...THEIR_WORDS, 'shift', 'shifts']);
  const q = 'The shift you described at the kiosk. What happens to the queue during it?';
  const v = validateOutput(q, { ownWords: own });
  assert.ok(v.reasons.every((r) => !/interprets what they said/.test(r)), JSON.stringify(v.reasons));
});

test('a warmth clause made of their words still passes — the largest measured lever is not touched', () => {
  const q = 'That tyre and the queue. What happens at the kiosk when nobody is waiting?';
  const v = validateOutput(q, { ownWords: THEIR_WORDS });
  assert.ok(v.reasons.every((r) => !/interprets what they said/.test(r)), JSON.stringify(v.reasons));
});

test('the tell rule reaches BOTH surfaces, and the reversal is recorded rather than quietly made', () => {
  // It was withheld from the criticism surface for half a day on the argument that there is no ownWords to
  // acquit a word against. There is: the student's words union the artefact's. A ten-round critique then
  // showed that surface has the worse form problem, so the argument was backwards. Parity is asserted in
  // verification/guard-parity.test.mjs; what is asserted here is that the reversal stayed legible.
  const src = readFileSync(join(HERE, '..', 'lib', 'dialogue.mjs'), 'utf8');
  assert.match(src, /REVERSED THE SAME DAY IT WAS WRITTEN, ON EVIDENCE/);
  assert.equal(/NOT wired into `validateCriticismOutput`, and that is a decision/.test(src), false,
    'the superseded version must not stand alongside the new one');
});

// ── what an anchor may never be (17 August 2026) ───────────────────────────────────────────────────
// The list's own reason, from the file: real sessions anchored on "don't", "more", "gets" and "where"
// before it existed, and that is what produced drift into the learner's life rather than their project.
// It is hand-written, so it had inflection gaps — `make` on it, `makes` not — and no entry for the
// commonest spoken hedges. Three ten-round conversation probes anchored on `like`, `probably` and
// `makes` on half their turns. No unit test could have found it: they assert an anchor is well-formed,
// never what it IS across a conversation.
test('a light verb or a hedge can never become the anchor', () => {
  const hedges = ['makes', 'made', 'making', 'getting', 'like', 'probably', 'maybe', 'really', 'actually',
    // A student describing a design speaks in modals almost exclusively, so they are the emptiest words
    // in a reply and the most likely to recur. `will`, `can` and `may` stay out: each is also a noun.
    'would', 'could', 'should', 'might', 'must', 'shall'];
  for (const w of hedges) assert.ok(NONMATERIAL.has(w), `"${w}" must never be able to anchor a session`);
  // And the inflections stay consistent with their stems, which is how the gap arose.
  for (const [stem, infl] of [['make', 'makes'], ['get', 'getting'], ['take', 'taking'], ['give', 'giving']]) {
    assert.equal(NONMATERIAL.has(stem), NONMATERIAL.has(infl), `${stem}/${infl} must be treated alike`);
  }
});

test('a CONTRACTION cannot anchor either — the list was written for a tokeniser that strips them', () => {
  // It carried `dont`/`arent`/`isnt` and not `don't`/`aren't`, so it encoded an assumption about
  // tokenisation that `content()` does not honour, and every contraction a student actually types walked
  // past it. A probe anchored a question on "aren't". Both spellings must be refused.
  for (const w of ['dont', "don't", 'arent', "aren't", 'cant', "can't", "i'm", "it's"]) {
    assert.ok(NONMATERIAL.has(w), `"${w}" must never be able to anchor a session`);
  }
});

test('words that can be design MATERIAL are deliberately left out', () => {
  // A tutorial about how a thing looks, or what it feels like, must still be able to anchor there. The
  // probe reports these as weak so the judgement stays visible instead of being encoded silently.
  // `think` is NOT among them and never was: "i think" is the canonical hedge and the list has always
  // held it. Asserting otherwise was this test's own error, caught by running it.
  for (const w of ['see', 'look', 'feel', 'need', 'use', 'space', 'sound', 'weight']) {
    assert.equal(NONMATERIAL.has(w), false, `"${w}" can be the learner's own material and must stay anchorable`);
  }
});
