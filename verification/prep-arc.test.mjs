// prep-arc.test.mjs — the prep arc (28 August 2026).
//
// 🔴 WHAT THESE CAN AND CANNOT ESTABLISH. A unit test cannot tell you the plan MOVES — this project wrote
// that down on 15 August after a reading plan sat on one station for fourteen rounds with every unit test
// green, because they asserted the plan returns a well-formed station and it always did. So the traversal
// tests below replay whole conversations rather than single turns, and they assert the SHAPE of the walk:
// that it advances, that the parts break where they should, that it ends. What they still cannot say is
// whether the questions are any good. Nothing has measured that, and `scripts/prep-conversation-probe.mjs`
// against the real endpoint is the only thing that could.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { affordPrep, prepPlan, parseTasks, readiness, PARTS, PREP_DWELL, SERVED_TOUCHES, DEEP_MIN, DEEP_MAX, deepDwellFor, depthFor } from '../lib/prep.mjs';
import { validateOutput, PREP_POINTERS } from '../lib/dialogue.mjs';
import { windowOf } from '../lib/plan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');

const segsOf = (t) => (String(t).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map((x, i) => ({ id: i + 1, text: x.trim() })).filter((s) => s.text);

const SHEET = `Affordance — what a surface offers before you think about it.
Latency: the delay between an action and its visible result.
The field grew out of numerically controlled machining developed in the 1950s.
This assumes a working knowledge of 3D modelling and of how materials behave.
Tolerance stacking remains an open problem and is expensive to test.
Laser cutting flat sheet is standard and widely available in shared workshops.
It is often called a breakthrough poised to transform how objects are made.`;

// A document with sentences and nothing any lexicon recognises.
const BLANK = 'The room was quiet that morning. Someone had left a window open. Outside a dog crossed the yard. The kettle had boiled some time ago. Nobody came in until eleven. The chair by the door stayed empty.';

// ───────────────────────────── 1. affordance ─────────────────────────────

test('all six stations always exist, in the order they were asked for', () => {
  const { stations } = affordPrep(segsOf(SHEET));
  assert.deepEqual(stations.map((s) => s.key), PREP_POINTERS.map((p) => p.key));
  assert.equal(stations.length, 6);
});

test('a document that triggers nothing still returns six stations, pointing at its framing', () => {
  // 🔴 THE DIFFERENCE FROM plan.mjs, asserted rather than left as a comment. There a station with no region
  // is dropped, because asking about what a text never claimed is asking about nothing. Here the six are a
  // coverage requirement, so an unanchored one keeps its place with the digest as its region — and a region
  // is never empty, because windowOf handed an empty one falls to its show-everything floor.
  const { stations, anchoredCount } = affordPrep(segsOf(BLANK));
  assert.equal(stations.length, 6);
  assert.equal(anchoredCount, 0);
  for (const s of stations) {
    assert.equal(s.anchored, false);
    assert.ok(s.segmentIds.length > 0, `station ${s.key} must still have somewhere to point`);
  }
});

test('readiness names the lines a thin sheet does not reach', () => {
  const r = readiness(segsOf(BLANK));
  assert.equal(r.anchored.length, 0);
  assert.equal(r.missing.length, 6);
  const full = readiness(segsOf(SHEET));
  assert.equal(full.missing.length, 0, 'the worked skeleton in docs/concept/prep-file.md must anchor all six — it is the example people copy');
});

// ───────────────────────────── 2. the walk ─────────────────────────────

const walk = (sheet, tasks = [], turns = 40, sittings = 3) => {
  const segments = segsOf(sheet);
  const stone = [], student = [];
  const out = [];
  for (let i = 0; i < turns; i++) {
    const p = prepPlan({ segments, studentTurns: student, stoneTurns: stone, tasks, sittings });
    out.push(p);
    if (p.complete) break;
    stone.push(`q${i}`); student.push(`an answer that reuses nothing ${i}`);
  }
  return out;
};

test('the walk advances through every station and ends', () => {
  const path = walk(SHEET);
  const last = path[path.length - 1];
  assert.ok(last.complete, 'the prep must END — a phase with no exit is a mode the learner cannot leave');
  const stations = path.filter((p) => p.phase === 'station').map((p) => p.station.key);
  for (const p of PREP_POINTERS) assert.ok(stations.includes(p.key), `station ${p.key} was never reached`);
});

test('it breaks into three parts, closing each but the last, and resuming each but the first', () => {
  const path = walk(SHEET).filter((p) => !p.complete);
  const closings = path.filter((p) => p.phase === 'closing').map((p) => p.part);
  const resumings = path.filter((p) => p.phase === 'resuming').map((p) => p.part);
  assert.deepEqual(closings, [1, 2], 'part three ends the prep — a task on the way out is an instruction issued into an enquiry');
  assert.deepEqual(resumings, [2, 3]);
  assert.deepEqual([...new Set(path.map((p) => p.part))], [1, 2, 3]);
});

test('a station never holds longer than the dwell budget', () => {
  const path = walk(SHEET).filter((p) => p.phase === 'station');
  const runs = [];
  for (const p of path) {
    const last = runs[runs.length - 1];
    if (last && last.key === p.station.key) last.n++;
    else runs.push({ key: p.station.key, n: 1 });
  }
  for (const r of runs) assert.ok(r.n <= PREP_DWELL, `${r.key} held for ${r.n} turns against a budget of ${PREP_DWELL}`);
});

test('the whole prep is short enough that somebody finishes it', () => {
  // Six stations at the full budget, plus two closings and two resumings. If this number climbs, the arc has
  // acquired turns nobody chose — and the survival curve's own finding is that people leave.
  const path = walk(SHEET);
  assert.ok(path.length <= 6 * PREP_DWELL + PARTS.length * 2, `the arc runs ${path.length} turns`);
});

// ───────────────────────────── 3. the tasks document ─────────────────────────────

test('tasks are split from a list, and part headings are not read out as work', () => {
  const t = parseTasks('# Between sessions\n\nPart 1\n\n1. Cut three test pieces and measure the kerf.\n2. Find one person who does this and ask what they wasted a week on.\n');
  assert.deepEqual(t, ['Cut three test pieces and measure the kerf.', 'Find one person who does this and ask what they wasted a week on.']);
});

test('tasks split from plain paragraphs too', () => {
  const t = parseTasks('Cut three test pieces.\n\nFind somebody who already does this.');
  assert.equal(t.length, 2);
  assert.equal(t[0], 'Cut three test pieces.');
});

test('each closing turn carries the set task verbatim, and a third task is ignored', () => {
  const tasks = ['FIRST TASK', 'SECOND TASK', 'THIRD TASK'];
  const closings = walk(SHEET, tasks).filter((p) => p.phase === 'closing');
  assert.deepEqual(closings.map((p) => p.task), ['FIRST TASK', 'SECOND TASK']);
});

test('with no tasks document the closing turn carries no task', () => {
  const closings = walk(SHEET).filter((p) => p.phase === 'closing');
  assert.ok(closings.length);
  for (const c of closings) assert.equal(c.task, '');
});

// ───────────────────────────── 4. the three prep guards ─────────────────────────────
// Planted, in both directions. A guard that has never refused anything has not been shown to work, and one
// that refuses the questions the aims ask for is worse than none — it would repair every turn.

const OWN = new Set(['affordance', 'surface', 'latency', 'delay', 'kerf', 'hype', 'claim']);
const PREP_OPTS = { noDefine: true, mustAddress: true, noHypeVerdict: true, ownWords: OWN, maxWords: 40 };

test('a question that defines a term for them is withheld', () => {
  for (const bad of [
    'Affordance refers to what a surface offers, so what would you do with that?',
    'Latency is a delay that sits between an action and its result — where have you met it?',
    'Kerf, in other words the width removed, matters to you how?',
  ]) {
    assert.equal(validateOutput(bad, PREP_OPTS).ok, false, `should have been withheld: ${bad}`);
  }
});

test('a question about the field rather than about them is withheld', () => {
  // 🔴 THIS IS THE ANSWER TO "they will just ask another model". Not a detector pointed at the learner — a
  // property of the question. Anything answerable without knowing who is being asked has an answer sitting
  // in every model on earth, and this tool was never for asking it.
  for (const bad of [
    'What does latency mean in embedded systems?',
    'Which of these techniques is most widely used in industry?',
  ]) {
    assert.equal(validateOutput(bad, PREP_OPTS).ok, false, `should have been withheld: ${bad}`);
  }
});

test('a question that has already decided whether a claim is hype is withheld', () => {
  for (const bad of [
    'What makes this overhyped claim about transformation appealing to you?',
    'Given that the claim is just marketing, what would you do instead?',
  ]) {
    assert.equal(validateOutput(bad, PREP_OPTS).ok, false, `should have been withheld: ${bad}`);
  }
});

test('the questions the aims actually ask for all pass', () => {
  // If any of these fails, every turn of that station costs a repair — which is what happened on the first
  // draft, where the aim recommended "what would you need to see" and tripped FORBIDDEN's `you need to`.
  for (const good of [
    'What did you already take "affordance" to mean before you read that line?',
    'Their sheet says "latency refers to the delay" — what did you expect it to mean?',
    'What would you want to see in a year before believing that claim?',
    'Which of these could you have working by Friday with what is around you?',
    'What could you already do of that, and what would you have to go and learn?',
    'You called it hype yourself — what would change your mind?',
  ]) {
    const r = validateOutput(good, PREP_OPTS);
    assert.equal(r.ok, true, `should have passed: ${good} — ${r.reasons.join('; ')}`);
  }
});

test('no prep aim recommends a phrasing the guard refuses', () => {
  const FORBIDDEN_IN_AIMS = [/\byou need to\b/i, /\byou should\b/i, /\bthe answer is\b/i];
  for (const p of PREP_POINTERS) {
    for (const re of FORBIDDEN_IN_AIMS) {
      assert.ok(!re.test(p.aim), `the "${p.key}" aim recommends a phrase the guard refuses (${re}) — every turn would be repaired`);
    }
  }
});

// ───────────────────────────── 5. cost, and the leak ─────────────────────────────

test('a long prep sheet is windowed, not sent whole', () => {
  // The sheet enters the prompt on EVERY prep turn, across sixteen of them. Unwindowed at the ceiling that
  // is roughly what a whole enquiry costs today, against a lifetime ₹ cap set when nothing like it existed.
  let long = ''; while (long.length < 25000) long += SHEET + '\n';
  long = long.slice(0, 25000);
  const segments = segsOf(long);
  const p = prepPlan({ segments, studentTurns: [], stoneTurns: [] });
  const w = windowOf(long, segments, p.region);
  assert.equal(w.windowed, true);
  assert.ok(w.body.length < long.length, 'the windowed body must be smaller than the source — the first version of this arithmetic INFLATED');
});

test('the prep event carries no station, region or index', () => {
  // The same rule reading-plan.test.mjs holds for the criticism planner: what keeps this the right side of
  // invariants #5 and #6 is that nothing leaves the planner, not that it is carefully named.
  const m = SERVER.match(/send\('prep',\s*\{[\s\S]*?\}\);/);
  assert.ok(m, "expected a send('prep', …) in server.mjs");
  for (const leak of ['station', 'region', 'index', 'touched', 'anchored', 'readEngagement']) {
    assert.ok(!m[0].includes(leak), `the prep event is sending "${leak}" to the client`);
  }
});

// ───────────────────────────── 6. non-regression ─────────────────────────────

test('every prep computation in the chat route is gated, so a conversation without a sheet is untouched', () => {
  // 🔴 THE WHOLE NON-REGRESSION CLAIM FOR THIS RELEASE. The two student fixtures the two-student rule
  // requires carry no prep sheet, so replaying them proves nothing unless the prep path is genuinely
  // unreachable without one. That is a property of the SOURCE, so it is read from the source.
  const chat = SERVER.slice(SERVER.indexOf("app.post('/api/chat'"), SERVER.indexOf("app.post('/api/criticism/open'"));
  assert.ok(chat.includes('const prepping = !!(prepWalk && !prepWalk.complete);'), 'the prep gate must be computed in the chat route');
  // Each steering element the arc suppresses must be visibly conditional on it.
  for (const gate of [
    'prepping ? null : await feltForTurn',
    'prepping ? { posture:',
    'prepping ? null : feltPosture',
    'prepping ? null : readDwell',
    // ⚠️ v1.4.0 WIDENED this gate rather than removing it — `askingBack` and `rutInvite` joined the
    // same condition, so the association is suppressed in more states than before, not fewer. Pinned
    // to the leading term so the next footing added here does not fail a test it strengthens.
    '(prepping || declined || corrected',
    ') ? null : readAssociation',
    'const precision = !prepping',
  ]) {
    assert.ok(chat.includes(gate), `expected the prep gate on: ${gate}`);
  }
  // And the guards must be off unless a sheet is present.
  assert.ok(chat.includes('noDefine: prepping &&'), 'noDefine must be gated');
  assert.ok(chat.includes('mustAddress: prepping,'), 'mustAddress must be gated');
  assert.ok(chat.includes('noHypeVerdict: prepping &&'), 'noHypeVerdict must be gated');
});

test('prep turns are counted apart from enquiry turns in the survival curve', () => {
  // Sixteen prep turns in front of an enquiry would make every prepped conversation look deep, and every
  // comparison against a day before this release would be wrong, with nothing failing and nobody looking.
  const chat = SERVER.slice(SERVER.indexOf("app.post('/api/chat'"), SERVER.indexOf("app.post('/api/criticism/open'"));
  assert.match(chat, /surface:\s*prepping\s*\?\s*'prep'\s*:\s*'enquiry'/, 'prep needs its own curve');
  assert.match(chat, /depth:\s*prepping\s*\?\s*studentTurns\.length\s*:\s*studentTurns\.length\s*-\s*prepTurns/, 'an enquiry turn after the arc must record the ENQUIRY depth, not the pair');
});

// ── ONE SITTING (30 August 2026) ────────────────────────────────────────────────────────────────────
// The three parts hold the gaps and the gaps hold the tasks. Walking the whole arc at one desk there are
// no gaps, so the boundary turns cost a quarter of the sitting and neither can say anything true: the
// closing turn asks what you will go and do, and the resuming turn asks what happened while you were away.
// 🔴 THE DEFAULT MUST NOT MOVE. dsl-status collects three transcripts and gates each part on its pack, so
// a global change would break a student flow in another repository with nothing here failing.

test('one sitting walks all six stations with no closing and no resuming turn', () => {
  // ⚠️ Replayed with `walk`, never read off one plan's `path`: that array is the walk SO FAR and stops at
  // the turn being composed, so a single call returns one step and would pass or fail for the wrong reason.
  const steps = walk(SHEET, [], 40, 1);
  assert.equal(steps[0].parts, 1);
  assert.equal(steps.filter((p) => p.phase === 'closing').length, 0, 'a closing turn asks about a gap that does not happen');
  assert.equal(steps.filter((p) => p.phase === 'resuming').length, 0, 'a resuming turn asks what happened while you were away');
  const stationKeys = [...new Set(steps.filter((p) => p.station).map((p) => p.station.key))];
  assert.equal(stationKeys.length, 6, 'one sitting must still cover all six lines of questioning');
  assert.ok(steps.some((p) => p.complete), 'the one-sitting walk must still end');
});

test('🔴 the default is unchanged — saying nothing about sittings still gives three parts', () => {
  const a = walk(SHEET);
  const b = walk(SHEET, [], 40, 3);
  assert.equal(a[0].parts, 3);
  assert.deepEqual(a.map((p) => p.phase), b.map((p) => p.phase), 'the default shape drifted from an explicit three');
});

test('an unknown sittings value falls to the default rather than to an unspecified shape', () => {
  for (const bad of [0, 2, 7, null, 'one', undefined]) {
    assert.equal(prepPlan({ segments: segsOf(SHEET), studentTurns: [], stoneTurns: [], sittings: bad }).parts, 3, `sittings=${bad}`);
  }
});

// ── DEPTH (30 August 2026) ──────────────────────────────────────────────────────────────────────────
// Prayas, handed the whole field in six questions: "I canno be prepared for 28 projects in such a short
// chat!" PREP_DWELL = 2 is bounded by the survival curve — people leave — and somebody who has chosen one
// long sitting has already answered that. 🔴 The larger half is EARLY ADVANCE: a station is served once the
// learner's words touch its region, and somebody fluent in the material satisfies that on the first
// question, so the six-station walk finished in six turns. Fluency and exhaustion are indistinguishable to
// regionContact — the same discriminator problem arc.mjs records at ANCHOR_MAX.

const walkFluent = (sittings, turns = 90) => {
  const segments = segsOf(SHEET);
  const stone = [], student = [];
  let n = 0;
  for (let i = 0; i < turns; i++) {
    const p = prepPlan({ segments, studentTurns: student, stoneTurns: stone, sittings });
    if (p.complete) break;
    n++;
    stone.push(`q${i}`);
    // answers built FROM the live region — the fluent learner who collapsed the real arc
    student.push((p.region || []).slice(0, 3).map((id) => (segments.find((s) => s.id === id) || {}).text || '').join(' ') || `x${i}`);
  }
  return n;
};

test('🔴 a one-sitting walk does not collapse under a fluent learner', () => {
  const deep = walkFluent(1);
  assert.ok(deep >= 24, `a one-sitting walk gave only ${deep} turns to a fluent learner — early advance is back`);
});

test('🔴 the three-sitting student path is UNCHANGED by the deep walk', () => {
  const before = walk(SHEET).length;          // the ordinary replay, default sittings
  const after = walk(SHEET, [], 40, 3).length;
  assert.equal(before, after);
  const { dwell, earlyAdvance } = depthFor(3);
  assert.equal(dwell, PREP_DWELL, 'the student dwell moved — dsl-status is built on this shape');
  assert.equal(earlyAdvance, true, 'early advance was disabled for students too');
});

test('a deep walk gives every line the budget its own region affords', () => {
  const segments = segsOf(SHEET);
  const { stations } = affordPrep(segments);
  const expected = Object.fromEntries(stations.map((st) => [st.key, deepDwellFor(st.segmentIds)]));
  const stone = [], student = [];
  const keys = [];
  for (let i = 0; i < 400; i++) {
    const p = prepPlan({ segments, studentTurns: student, stoneTurns: stone, sittings: 1 });
    if (p.complete) break;
    if (p.station) keys.push(p.station.key);
    stone.push(`q${i}`); student.push(`fresh material ${i}`);
  }
  assert.equal(new Set(keys).size, 6, 'a deep walk must still reach all six lines');
  for (const k of new Set(keys)) {
    assert.equal(keys.filter((x) => x === k).length, expected[k], `${k} did not get the budget its region affords`);
  }
});

test('🔴 depth is read off the region, and is floored and capped', () => {
  assert.equal(deepDwellFor([]), DEEP_MIN, 'a line with nothing to point at must still get a real go');
  assert.equal(deepDwellFor(new Array(6).fill(0)), DEEP_MIN, 'a thin line floors rather than grinding');
  assert.equal(deepDwellFor(new Array(42).fill(0)), 21, 'roughly one question per two passages');
  assert.equal(deepDwellFor(new Array(500).fill(0)), DEEP_MAX, 'a fat line must not run away');
  assert.ok(DEEP_MIN > PREP_DWELL, 'the deep floor must be deeper than the three-sitting budget');
});
