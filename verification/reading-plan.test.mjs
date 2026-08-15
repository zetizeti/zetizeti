// reading-plan.test.mjs — the reading plan (lib/plan.mjs) and the engagement sensors (lib/reading.mjs).
//
// The three tests that matter here are not the arithmetic ones. They are the CONSUMER test, which holds
// the sensors invisible; the CONCEPT-AS-OBJECT test, which holds the critique pointed at the text the
// student brought rather than at their own project; and the WINDOW BOUNDS test, which holds a cost that
// nothing else in this codebase would notice going wrong. Each of those three protects a decision, and
// each is written so that it fails when the decision is quietly reversed rather than when the code moves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { qualify, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';
import { afford, planFor, windowOf, conceptDigest, DWELL, WINDOW_BUDGET, WINDOW_WHOLE_BELOW } from '../lib/plan.mjs';
import { readEngagement, regionContact, ceilingFor } from '../lib/reading.mjs';
import { validateCriticismOutput, CRITICISM_POINTERS } from '../lib/dialogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');
const CLIENT = readFileSync(join(HERE, '..', 'public', 'index.html'), 'utf8');
const READING = readFileSync(join(HERE, '..', 'lib', 'reading.mjs'), 'utf8');

const SPECIMEN = 'The onboarding flow is cluttered and confusing for new users. You should remove every optional field from the first screen. Obviously the best practice is progressive disclosure. Users abandon the form at step three. The main purpose is to get people signed up, but we also want to collect marketing preferences. Losing a user here costs us the whole funnel.';
const segsOf = (t) => qualify(t).segments;
const blursOf = (segs) => readSensed({ segments: toCanonSegments(segs) }).strict.conflation_segment_ids || [];
const longDoc = (unit, n = 25000) => { let s = ''; while (s.length < n) s += unit; return s.slice(0, n); };

// ───────────────────────────── 1. the consumer test ─────────────────────────────
// 🔴 THIS IS THE ONE THAT HOLDS THE DECISION. Prayas chose "planner only, invisible" on 15 August 2026:
// the engagement sensors steer which region the next question points at, and do nothing else. Invariant #5
// holds that the model never scores the learner and invariant #6 forbids %-complete and comparison, and a
// figure describing how well somebody read is a grade whatever it is called. What keeps this the right side
// of both is not the vocabulary in reading.mjs — it is that nothing renders, stores, or transmits what it
// computes. So this test asserts the CONSUMER, which is the discipline the corrections ledger names: a
// guard that watches the producer sees nothing when a display grows somewhere else.

test('the engagement reading reaches the planner and nothing else', () => {
  assert.ok(!/from '\.\/lib\/reading\.mjs'[\s\S]{0,200}readEngagement/.test(SERVER),
    'server.mjs must not import readEngagement — the routing reading belongs to lib/plan.mjs alone');
  assert.ok(!CLIENT.includes('reading.mjs'), 'the client must never import the sensors');
  assert.ok(!CLIENT.includes('readEngagement'), 'the client must never call readEngagement');
});

test('no engagement value is ever sent to the browser', () => {
  // Every SSE emission on the criticism path. If a future turn starts shipping the reading out, one of
  // these names appears inside a send(...) payload and this fails.
  const sends = SERVER.match(/send\('[a-z]+',[^;]*\);/g) || [];
  assert.ok(sends.length, 'expected to find SSE sends in server.mjs');
  for (const s of sends) {
    for (const leak of ['ownMaterial', 'quoting', 'touched', 'untouched', 'readEngagement', 'engagement']) {
      assert.ok(!s.includes(leak), `an engagement value is being sent to the client: ${s.slice(0, 90)}`);
    }
  }
});

test('the transcript download carries no engagement reading', () => {
  const i = CLIENT.indexOf('function buildCritTranscriptMd');
  assert.ok(i > 0, 'buildCritTranscriptMd must exist');
  const body = CLIENT.slice(i, i + 3000);
  for (const leak of ['ownMaterial', 'quoting', 'touched', 'untouched', 'station', 'critConcept']) {
    assert.ok(!body.includes(leak), `the download must not carry "${leak}" — a portable figure about a student is a grade, and their concept is not theirs-under-question`);
  }
});

test('reading.mjs states plainly that it cannot see reading', () => {
  // The honest name is load-bearing here, so it is asserted rather than trusted to survive an edit.
  assert.match(READING, /WHAT THIS CANNOT DO/, 'the caveat header must stay');
  assert.match(READING, /see TYPING, not reading/i, 'the sensors must keep saying what they actually observe');
});

// ───────────────────────────── 2. the concept guard ─────────────────────────────
// The student brought a found text to be tested. A surface that turns round and asks them to defend their
// own project is a different tool and one nobody agreed to. The prompt says so; this is what enforces it.

test('a question that makes the concept the thing being judged is refused', () => {
  const bad = [
    'What does your project assume about who is actually asking?',
    'How would you justify your concept here?',
    'Where does your brief fall short of what this text describes?',
    'Is your concept really solving the problem you named?',
  ];
  for (const q of bad) {
    const r = validateCriticismOutput(q, { concept: true });
    assert.equal(r.ok, false, `should have been refused: ${q}`);
    assert.ok(r.reasons.some((x) => /own project the thing being judged/.test(x)), `wrong reason for: ${q}`);
  }
});

test('using the concept as CONTEXT for a question about the text still passes', () => {
  // The intended shape, and the one a clumsy guard would break. These name the project and keep the text
  // as the object — if this test ever fails, the guard has become the thing that kills the feature.
  const good = [
    'What does this text decide about "users" that your project has not decided yet?',
    'The text says "frictionless" — what does that word do to the onboarding you are building?',
    'Which claim in this text would your project have to accept for "best practice" to hold?',
  ];
  const terms = ['users', 'frictionless', 'onboarding', 'text', 'practice', 'claim'];
  for (const q of good) {
    const r = validateCriticismOutput(q, { concept: true, artefactTerms: terms });
    assert.equal(r.ok, true, `should have passed: ${q} — ${r.reasons.join('; ')}`);
  }
});

test('a question that anchors in nothing from the text is refused when a concept is present', () => {
  const r = validateCriticismOutput('What would make this stand up?', { concept: true, artefactTerms: ['onboarding', 'checkout', 'postcode'] });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /does not point at the text under question/.test(x)));
  // ...and one shared term is enough, deliberately: a false refusal costs a regeneration, a miss costs the object of the critique.
  const ok = validateCriticismOutput('What does "onboarding" decide here?', { concept: true, artefactTerms: ['onboarding', 'checkout'] });
  assert.equal(ok.ok, true, ok.reasons.join('; '));
});

test('without a concept the guard is byte-identical to before', () => {
  // The blast radius is bounded to exactly the situation the guard exists for.
  const q = 'What does your project assume about who is asking?';
  assert.equal(validateCriticismOutput(q, {}).ok, true, 'no concept in play → the concept rules must not fire');
  assert.equal(validateCriticismOutput(q, { concept: false }).ok, true);
});

test('the server passes the concept flag and the anchor terms to the guard', () => {
  // A guard that is never called with its inputs enforces nothing — the failure shape this project has
  // already paid for twice. Grep the call site, not the definition.
  assert.match(SERVER, /validateCriticismOutput\(t,\s*\{[^}]*\bconcept:\s*!!concept/, 'the guard must be told whether a concept is in play');
  assert.match(SERVER, /validateCriticismOutput\(t,\s*\{[^}]*\bartefactTerms\b/, 'the guard must receive the artefact terms');
});

// ───────────────────────────── 3. window bounds ─────────────────────────────
// 🔴 The first version of windowOf INFLATED: skeletonising every passage to nine words is only compression
// when passages are long, and on a document of 589 one-sentence segments the "window" measured 28,095
// characters against a 25,000-character source. Nothing failed. The prompt was simply bigger and the bill
// quietly larger, on exactly the input the feature was built for. Arithmetic nobody looks at needs a test.

test('a windowed artefact never exceeds its budget, whatever the shape of the document', () => {
  const shapes = {
    'short segments': 'The onboarding flow is cluttered for new users. You should remove every optional field. Users abandon at step three. The main purpose is signup, but we also want marketing preferences. ',
    'long segments': 'The onboarding experience as currently constituted presents to the newly arrived user an interface which is at once cluttered and confusing, and which by virtue of its density of demand upon attention produces a hesitancy that the analytics record as abandonment at the third step, a figure which every stakeholder has agreed is unacceptable and which the redesign must address as its primary purpose. ',
  };
  for (const [name, unit] of Object.entries(shapes)) {
    const text = longDoc(unit);
    const segs = segsOf(text);
    const p = planFor({ segments: segs, blurIds: blursOf(segs), studentTurns: [], stoneTurns: [] });
    const w = windowOf(text, segs, p.region);
    assert.equal(w.windowed, true, `${name}: past the ceiling it must window`);
    assert.ok(w.body.length <= WINDOW_BUDGET, `${name}: window ${w.body.length} exceeds budget ${WINDOW_BUDGET}`);
    assert.ok(w.body.length < text.length, `${name}: the window must be smaller than the source, not larger`);
  }
});

test('a long document with NO live region is still windowed', () => {
  // The floor. "No region, so show everything" is the guard that put 25,000 characters back in the prompt
  // when planFor briefly returned an empty region on completion — silent, and it cost money.
  const text = longDoc('The onboarding flow is cluttered for new users. Users abandon at step three. ');
  const segs = segsOf(text);
  const w = windowOf(text, segs, []);
  assert.equal(w.windowed, true);
  assert.ok(w.body.length <= WINDOW_BUDGET);
});

test('anything that could have been pasted before is byte-identical to before', () => {
  const segs = segsOf(SPECIMEN);
  const w = windowOf(SPECIMEN, segs, [1]);
  assert.equal(w.windowed, false, 'under the old ceiling nothing is windowed');
  assert.equal(w.body, SPECIMEN.trim(), 'the whole text, exactly as it always was');
  assert.ok(SPECIMEN.length < WINDOW_WHOLE_BELOW);
});

test('the server puts the WINDOW into the prompt, not the whole artefact', () => {
  assert.match(SERVER, /const win = windowOf\(artefact, segments, plan\.region\)/, 'the window must be computed from the live region');
  assert.match(SERVER, /buildCriticismSystemPrompt\(criticismCore,\s*\{[\s\S]{0,120}artefact:\s*win\.body/, 'the prompt must receive win.body — passing `artefact` here silently restores the old cost');
});

// ───────────────────────────── 4. the plan itself ─────────────────────────────

test('a station never exists without a region to point at', () => {
  const segs = segsOf(SPECIMEN);
  const { stations, fellBack } = afford(segs, { blurIds: blursOf(segs) });
  assert.equal(fellBack, null, 'this specimen affords real stations');
  for (const s of stations) {
    assert.ok(s.segmentIds.length > 0, `station ${s.key} has no territory`);
    assert.ok(s.why && s.why.length, `station ${s.key} must say why it fired`);
  }
});

test('a document that affords nothing degrades to the old rotation rather than to silence', () => {
  const bare = segsOf('It rained. The door was blue.');
  const none = afford(bare, { blurIds: [] });
  assert.equal(none.fellBack, 'rotation');
  assert.equal(none.stations.length, CRITICISM_POINTERS.length, 'the floor is the clock this replaced');
  const withBlur = afford(bare, { blurIds: [1] });
  assert.deepEqual(withBlur.stations.map((s) => s.key), ['blur'], 'a located blur is a real station, not a fallback');
});

test('every station key has its aim wording in dialogue.mjs', () => {
  // plan.mjs throws at module load if this drifts; asserting it here makes the reason legible rather than
  // surfacing as an import error at boot.
  const segs = segsOf(SPECIMEN);
  for (const s of afford(segs, { blurIds: blursOf(segs) }).stations) {
    assert.ok(CRITICISM_POINTERS.some((p) => p.key === s.key), `station ${s.key} has no pointer`);
  }
});

test('the plan is deterministic — same document and transcript, same station', () => {
  const segs = segsOf(SPECIMEN), blurIds = blursOf(segs);
  const args = { segments: segs, blurIds, studentTurns: ['ok', 'i see'], stoneTurns: ['q1', 'q2'] };
  const a = planFor(args), b = planFor(args);
  assert.equal(a.station.key, b.station.key);
  assert.deepEqual(a.region, b.region);
  assert.deepEqual(a.path, b.path);
});

test('the plan dwells, then advances', () => {
  const segs = segsOf(SPECIMEN), blurIds = blursOf(segs);
  const at = (n) => planFor({ segments: segs, blurIds, studentTurns: Array(n).fill('ok'), stoneTurns: Array(n).fill('q') });
  const first = at(0).station.key;
  for (let n = 1; n < DWELL; n++) assert.equal(at(n).station.key, first, `should still be on ${first} at turn ${n}`);
  assert.notEqual(at(DWELL).station.key, first, 'after the dwell budget it must move on');
});

test('the plan advances EARLY when the student has reached the region', () => {
  const text = 'The onboarding flow is cluttered and confusing for new users. You should remove every optional field from the first screen. Obviously the best practice is progressive disclosure.';
  const segs = segsOf(text), blurIds = blursOf(segs);
  const lazy = planFor({ segments: segs, blurIds, studentTurns: ['ok'], stoneTurns: ['q'] });
  const engaged = planFor({
    segments: segs, blurIds,
    studentTurns: ['the onboarding flow and the optional field and progressive disclosure are all my own assumptions'],
    stoneTurns: ['q'],
  });
  assert.equal(lazy.index, 0, 'a bare reply does not advance the plan');
  assert.ok(engaged.index > lazy.index, 'reaching the whole region advances it early — this is what the sensors are for');
});

test('the plan reports completion exactly once, and keeps a region after it', () => {
  const segs = segsOf(SPECIMEN), blurIds = blursOf(segs);
  const at = (n) => planFor({ segments: segs, blurIds, studentTurns: Array(n).fill('ok'), stoneTurns: Array(n).fill('q') });
  const nStations = afford(segs, { blurIds }).stations.length;
  assert.equal(at(nStations * DWELL - 1).complete, false);
  const done = at(nStations * DWELL);
  assert.equal(done.complete, true, 'the plan must be able to finish — otherwise leaving and finishing stay indistinguishable');
  // 🔴 and it must NOT go empty: an empty region fed windowOf its "show everything" path and put the whole document back in the prompt.
  assert.ok(done.station, 'completion wraps rather than emptying');
  assert.ok(done.region.length > 0, 'a completed plan must still have a region, or the window collapses to the whole document');
});

test('a long conversation does not get stuck on one station', () => {
  // 🔴 THE REGRESSION THAT A UNIT TEST COULD NOT HAVE FOUND. On 15 August a real fourteen-round probe
  // against the live endpoints sat at `idx 0/6` the entire time and never left `blur`, while the
  // play-acted student disengaged twice — "you already asked me that". Two faults compounded, and both
  // were silent: `returned` accumulated over the whole transcript and never expired, so a single
  // non-adjacent return anywhere in a 32-segment region pinned that station permanently; and `served`
  // demanded EVERY segment of a region be touched, which on a large region cannot happen, so early
  // advance could never fire either. The plan behaved worse than the clock it replaced.
  //
  // The shape is what matters: a plan that cannot advance still returns a valid station every turn and
  // looks entirely healthy from the outside. Assert MOVEMENT, not wellformedness.
  const doc = [
    'The onboarding flow is cluttered and confusing for new users.',
    'You should remove every optional field from the first screen.',
    'Obviously the best practice is progressive disclosure.',
    'Users abandon the form at step three.',
    'The main purpose is signup, but we also want marketing preferences.',
    'Losing a user here costs us the whole funnel.',
  ].join(' ');
  const segs = segsOf(doc), blurIds = blursOf(segs);
  // A student who keeps returning to the same material — the exact condition that used to pin forever.
  const student = Array.from({ length: 18 }, (_, i) => i % 2
    ? 'the onboarding flow is cluttered and that is my own judgement'
    : 'users abandon the form because of the optional field');
  const stone = Array.from({ length: 18 }, (_, i) => `question ${i}`);
  const visited = new Set();
  for (let n = 1; n <= stone.length; n++) {
    const p = planFor({ segments: segs, blurIds, studentTurns: student.slice(0, n), stoneTurns: stone.slice(0, n) });
    if (p.station) visited.add(p.station.key);
  }
  assert.ok(visited.size >= 3, `the plan must move through the document — it visited only ${[...visited].join(', ')}`);
});

test('no station can hold past the absolute cap, pinned or not', () => {
  const segs = segsOf(SPECIMEN), blurIds = blursOf(segs);
  // Every turn returns to the same region, so the pin is continuously re-earned. PIN_MAX is the backstop.
  const student = Array(30).fill('the onboarding flow is cluttered and confusing for the new users');
  const stone = Array(30).fill('q');
  const seen = new Set();
  for (let n = 1; n <= 30; n++) {
    const p = planFor({ segments: segs, blurIds, studentTurns: student.slice(0, n), stoneTurns: stone.slice(0, n) });
    if (p.station) seen.add(p.station.key);
  }
  assert.ok(seen.size > 1, 'a permanently-returned region must still eventually yield — the pin is a delay, not a lock');
});

test('a clicked spot outranks the plan', () => {
  assert.match(SERVER, /if \(forcedLocated && forcedLocated\.text\)/, 'a student choosing a spot must still take precedence over the computed station');
});

// ───────────────────────────── 5. the sensors ─────────────────────────────

test('a region is touched by the student\'s OWN words, not by echoing the question', () => {
  const segs = segsOf('The checkout is confusing. Users abandon at step three. The page loads in two seconds.');
  const echo = readEngagement({ segments: segs, stoneTurns: ['what is "confusing" deciding for you?'], studentTurns: ['confusing'] });
  assert.ok(!echo.touched.includes(1), 'repeating the question\'s own word must not count as reaching the region');
  const own = readEngagement({ segments: segs, stoneTurns: ['what is "confusing" deciding for you?'], studentTurns: ['the checkout is my own judgement'] });
  assert.ok(own.touched.includes(1), 'the student\'s own words do count');
});

test('a refusal is not material', () => {
  const segs = segsOf('The checkout is confusing. Users abandon at step three.');
  const e = readEngagement({ segments: segs, stoneTurns: ['q'], studentTurns: ["i don't know"] });
  assert.equal(e.touched.length, 0, 'a decline must reach no region');
  assert.equal(e.declined, true);
});

test('a one-segment document does not read as entirely untouched', () => {
  // 🔴 A fixed document-frequency ceiling empties short documents completely: at n=1 every token sits in
  // 100% of segments, so nothing is informative, nothing is ever touched, and the plan routes at random
  // forever without throwing. ceilingFor exists for this and the boundary is asserted rather than trusted.
  assert.equal(ceilingFor(1), 1.01);
  assert.equal(ceilingFor(3), 1.01);
  assert.ok(ceilingFor(4) < 1);
  const segs = segsOf('The onboarding flow is cluttered and confusing for new users.');
  const e = readEngagement({ segments: segs, stoneTurns: ['q'], studentTurns: ['the onboarding is cluttered because of the fields'] });
  assert.ok(e.touched.length > 0, 'a single-segment document must still be reachable');
});

test('regionContact pairs each reply with the question that preceded it', () => {
  const segs = segsOf('The checkout is confusing. Users abandon at step three.');
  const c = regionContact({ segments: segs, stoneTurns: ['about checkout', 'about abandon'], studentTurns: ['abandon happens early', 'checkout is fine'] });
  // Reply 0 was preceded by the "checkout" question, so its use of "abandon" is its own; reply 1 the reverse.
  assert.ok(c.get(2).turns.includes(0), 'reply 0 reached segment 2 with a word its question did not supply');
  assert.ok(c.get(1).turns.includes(1), 'reply 1 reached segment 1 with a word its question did not supply');
});

// ───────────────────────────── 6. the concept digest ─────────────────────────────

test('the digest keeps the sentence that says what the project IS', () => {
  // 🔴 Scoring alone dropped it: "This project is a wayfinding system for the campus library" trips no
  // lexicon at all, so the digest described who it was for and what was at risk while never saying what
  // it was — the one thing context is for.
  const d = conceptDigest(segsOf('This project is a wayfinding system for the campus library. It is mainly for first-year students. They need to find a shelf without asking. The building was completed in 1974.'));
  assert.match(d.text, /wayfinding system/, 'the identity sentence must survive');
  assert.ok(!/1974/.test(d.text), 'and the irrelevant one must not');
});

test('the digest is bounded', () => {
  const long = longDoc('The project is mainly for students who need to find things and want a faster route. The risk is they give up. ', 40000);
  const d = conceptDigest(segsOf(long));
  assert.ok(d.text.length <= 3000, `digest ${d.text.length} exceeds its cap`);
});

test('an empty concept produces an empty digest, so every downstream check reads false', () => {
  assert.match(SERVER, /function digestConcept\(text\) \{\s*if \(!text\) return '';/, 'no concept must mean the empty string, not an empty-ish object');
});
