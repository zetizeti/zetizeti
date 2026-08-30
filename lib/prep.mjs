// prep.mjs — the PREP ARC: a bounded, ordered walk through an area the learner does not yet work in.
//
// WHAT IT IS FOR. Prayas, 28 August 2026: "add a feature to enquiry mode - to upload a glossary-context/quiz/prepping file for a new area and then if uploaded proceed to prep the student to work in the context by asking questions about the glossary - background - pre-requisite know-how / long-shots and low-hanging fruits of the field, what is worth doing and what is hype". The six stations below are that sentence, in that order, and the order is the whole design.
//
// 🔴 IT PREPS BY ASKING, AND IT NEVER TEACHES. This is the constraint everything here is shaped by, and it is the one a later session will be tempted to relax, because "prep the student in a new area" reads like a brief for explaining things. It is not. The system prompt has forbidden explaining since the beginning, invariant #3 refuses output carrying the marks of an answer, and none of that is suspended because a glossary is on the table. What a prep turn does is point at a passage the learner brought and ask what they already hear in it. The document does the telling; the student does the thinking; the stone only asks. `noDefine` in dialogue.mjs is what makes that checkable rather than hoped for — it refuses a question that supplies a term's meaning in the tool's own voice, while leaving a QUOTE from the learner's own document alone, because quoting a text the learner brought is the criticism surface's method and is not the tool asserting anything.
//
// 🔴 THE ORDER IS PEDAGOGICAL, NOT DOCUMENT ORDER, AND THAT IS THE DELIBERATE DIFFERENCE FROM `plan.mjs`. The criticism plan walks a text in the order the text is written, because it is reading that text. This walks a dependency: you cannot weigh what is worth doing in a field before you know what its words mean. So `glossary → background → prerequisites → long-shots → low-hanging → worth-hype` is fixed, and affordance decides only WHERE in the document each station points, never whether it exists.
//
// 🔴 WHICH IS THE SECOND DIFFERENCE: EVERY STATION ALWAYS EXISTS. In `plan.mjs` a station with no triggered region is dropped, and rightly — asking three questions about what people DO in a document making no behavioural claim is asking about nothing. Here the six stations are a COVERAGE REQUIREMENT the learner's own instruction stated, not a property of the document. A glossary that never mentions hype does not excuse skipping the question of what is hype; the learner has a view on that and the prep is for drawing it out. So an unanchored station keeps its place and points at the document's framing passages instead (`briefDigest`, reused from plan.mjs), which keeps the question grounded in something they actually brought rather than in whatever the model would otherwise invent.
//
// ⚠️ AND IT IS UNMEASURED. `plan.mjs` was measured against the clock on 15 August 2026 and came back NULL on question quality — it changes the route, not the questions — and `readArc` was measured null on the enquiry surface before it. This arc has been measured against nothing at all. What can honestly be claimed for it is coverage and an ending, which are the two things the criticism plan's null did not touch either. Do not write, in a doc or a commit or to a funder, that the prep arc asks better questions. Nobody has looked.
//
// 🔴 IT ENDS, AND ENDING IS THE POINT. The criticism plan LAPS on completion, because a student who keeps talking after the reading is traversed still has to be met with something. This one does not lap: when the six stations are walked, prep is over and the conversation becomes an ordinary enquiry with the document standing behind it as context. A prep phase with no exit is a mode the learner cannot leave, and `complete` is what the route reads to leave it.
//
// ─────────────────────────── THREE PARTS, ACROSS THREE SITTINGS (Prayas, 28 August 2026) ───────────────────────────
// "the prep should have incremental sessions - part 1, 2 and 3 -- each part is after some suggested tasks are performed. the part 2 mentions the tasks that were performed after part 1 and so does part 3 for after part 2".
//
// Two stations a part, in the order he gave them, so the split adds a rhythm and changes nothing about what is asked or in what sequence. Each part ends with a CLOSING turn that asks what they will go and do; each later part opens with a RESUMING turn that asks what actually happened. Between them the learner leaves, does something, and comes back.
//
// 🔴 NOTHING IS STORED TO MAKE THIS WORK, AND NOTHING MAY BE. Three sittings across days sounds like it needs an account, a saved plan, a resume token — and every one of those is the ephemeral pivot undone for a convenience. It is not needed: the learner saves their transcript and brings it back, which is machinery this tool has had since 30 July 2026 and which exists for precisely this. The walk is recomputed from the returned transcript, so `part 2` is not a state anybody kept; it is what the arithmetic says when six questions have already been asked. State lives with the person, which is the only place this project has ever put it.
//
// 🔴 THE STONE DOES NOT SET THE TASK, AND THIS IS NOT A TECHNICALITY. "Suggested tasks" reads like an instruction to have the tool suggest one, and a tool that says "go and try X" has started answering — the FORBIDDEN list catches the blunt phrasing and the position underneath it is invariant #5's. What resolves it is the same thing that resolves every other version of this problem here: THE DOCUMENT IS THE THING ALLOWED TO TELL. A prep sheet carries a "things you could try" section, the closing turn points at it, and the learner picks. Where the sheet has no such section the closing turn asks them to name something small themselves, which is weaker material and a better commitment. Either way the stone asks and never assigns.
//
// ⚠️ THE PART SPLIT IS 2-2-2 AND THE STATION ORDER IS UNCHANGED, which is worth saying because the alternative was tempting and would have been a scope change nobody asked for. Pairing the two ACTIONABLE stations — prerequisites and low-hanging — would make the task after part two more concrete, and it would mean reordering the six he named. His order stands; only the pauses are new.
//
// 🔵 THE FILE FORMAT THIS EXPECTS IS WRITTEN DOWN FOR THE PERSON MAKING ONE, at `docs/concept/prep-file.md`, and `readiness()` below is the same six rules pointed at the whole document so the uploader can be told which lines their sheet does not reach BEFORE the conversation rather than by its thinness afterwards. The format is ADVISORY: an unanchored station falls back to the framing digest and the arc still runs. Keep the doc and the rules in step — the doc is a claim about this file's behaviour, and a claim about behaviour goes stale in silence.

import { briefDigest } from './plan.mjs';
import { PREP_POINTERS } from './dialogue.mjs';
import { regionContact } from './reading.mjs';

// TWO questions a station, not three. The criticism surface's DWELL is 3 across seven stations, which is a reading of one text and can afford to linger. Six stations at three questions each is eighteen turns before the learner reaches their own enquiry, which is longer than most conversations this tool has ever had — the survival curve's whole finding is that people leave. Two is twelve at the outside and usually fewer, because a station the learner's own words have already reached advances early.
export const PREP_DWELL = 2;
export const SERVED_TOUCHES = 2;              // engaging a line is touching a couple of its spots, never exhausting the region (plan.mjs learned this the expensive way: `served` required every segment and was therefore unreachable).

// The three sittings, as indices into the six stations. Two each, in the order Prayas gave them: part one is the words and where they came from, part two is what has to be in place and what is hard, part three is what is already to hand and what is worth anything. Four question turns a part at the outside, plus the closing or resuming turn around it — about five turns a sitting, which is the length of a conversation somebody will actually finish.
export const PARTS = [[0, 1], [2, 3], [4, 5]];

// 🔴 ONE SITTING IS A REAL SHAPE, NOT A DEGRADED THREE (30 August 2026). Prayas, walking the arc himself
// with no tasks document: *"why the part logic at all in mentor prep?"* The answer is that the parts hold
// the gaps and the gaps hold the tasks — so with no tasks the boundary turns cost a QUARTER of the sitting
// (four of at most sixteen) and neither of them can say anything true: the closing turn asks what he will
// go and do, which he has declined to decide in advance, and the resuming turn asks what happened in a gap
// that did not occur.
//
// ⚠️ THREE STAYS THE DEFAULT AND THAT IS NOT TIMIDITY. dsl-status collects three transcripts and refuses a
// part until its pack has been placed, so a global removal would break a student flow deployed the same
// morning — in another repository, silently, with nothing here failing. The shape is chosen per
// conversation instead, and a caller that says nothing gets exactly what it got before.
export const SITTING_SHAPES = { 1: [[0, 1, 2, 3, 4, 5]], 3: PARTS };
export const partsFor = (sittings) => SITTING_SHAPES[sittings] || PARTS;

// ─────────────────────────────── the affordance lexicons ───────────────────────────────
// Curated narrow, in qualify.mjs's and plan.mjs's style and for their reason: a missed region costs one station its anchor and it falls back to the digest, while a false one points a question at a passage that says nothing of the kind. Nothing here calls a model, and every station carries a `why` naming the rule and the trigger, so a question can always be traced to the words that produced it.

const ORIGIN = ['originally', 'historically', 'traditionally', 'emerged', 'developed', 'began', 'grew out of', 'came out of', 'roots', 'origin', 'origins', 'early', 'earliest', 'first', 'legacy', 'inherited', 'descended', 'evolved', 'since the', 'for decades', 'era', 'lineage', 'predecessor'];
const DEPENDS = ['requires', 'required', 'require', 'assumes', 'assumed', 'prerequisite', 'prerequisites', 'depends on', 'depend on', 'builds on', 'built on', 'based on', 'familiar with', 'familiarity', 'you need', 'need to know', 'needs to know', 'foundation', 'groundwork', 'before you can', 'presupposes', 'grounding in', 'working knowledge', 'without a'];
const FAR = ['unsolved', 'open problem', 'open question', 'unresolved', 'difficult', 'hard', 'challenge', 'challenges', 'challenging', 'ambitious', 'long-term', 'eventually', 'someday', 'years away', 'remains', 'no one has', 'not yet', 'frontier', 'speculative', 'research question', 'unclear', 'intractable', 'expensive', 'costly'];
const NEAR = ['simple', 'straightforward', 'readily', 'off-the-shelf', 'existing', 'already', 'common', 'commonly', 'standard', 'widely', 'well established', 'established', 'quick', 'cheap', 'accessible', 'available', 'mature', 'well-understood', 'routine', 'basic', 'trivial', 'freely'];
// 🔴 THIS ONE DETECTS PROMOTIONAL LANGUAGE IN THE DOCUMENT, NOT HYPE ITSELF. The distinction is the station's entire safety. The tool has no view on what is hype and may never acquire one — invariant #5 puts judgement on the human's side of the line, and a question built on "this is overhyped" has already decided the thing it purports to ask. What the lexicon finds is a sentence making a large claim; what the stone does is point at it and ask the learner what they make of it. That is the criticism surface's split, arriving here: the tool locates, the student judges.
const CLAIMY = ['revolutionary', 'transform', 'transforms', 'transformative', 'disrupt', 'disrupts', 'disruptive', 'breakthrough', 'unprecedented', 'game-changing', 'game changer', 'paradigm', 'the future of', 'everyone is', 'buzz', 'hype', 'trend', 'trending', 'emerging', 'next big', 'cutting-edge', 'cutting edge', 'state-of-the-art', 'promises to', 'promising', 'poised to', 'set to', 'rapidly', 'explosive', 'booming', 'must-have'];

const lower = (s) => String(s || '').toLowerCase();
const hits = (text, list) => list.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(text));

// A DEFINITIONAL SHAPE, which is what a glossary is made of. Not a lexicon but a grammar: a short lead followed by a colon or a dash, or a subject followed by a naming verb. Kept deliberately tight — a long sentence containing "is" is a sentence, not an entry, so the lead is bounded at roughly the length a term can be.
const DEFINITIONAL = [
  /^[^.:—–-]{1,48}\s*[:—–]\s*\S/,                                     // "Affordance — what a surface offers"
  /^\s*\W?\s*[A-Z][^.]{0,44}?\s+(?:is|are|means|refers to|denotes|describes)\s+(?:a|an|the|any|when|what|how)\b/,
  /\b(?:known as|called|stands for|short for|also termed)\b/i,
  /\([A-Z]{2,6}\)/,                                                   // an acronym gloss: "large language model (LLM)"
];

const RULES = [
  {
    key: 'glossary',
    test: (seg) => (DEFINITIONAL.some((re) => re.test(seg.text))
      ? 'reads as a glossary entry — a term and what it is being taken to mean'
      : null),
  },
  {
    key: 'background',
    test: (seg) => {
      const t = lower(seg.text);
      const o = hits(t, ORIGIN);
      if (o.length) return `says where this came from — "${o[0]}"`;
      return /\b(19|20)\d{2}\b/.test(t) ? 'dates something, so the field has a before and an after here' : null;
    },
  },
  {
    key: 'prerequisites',
    test: (seg) => {
      const d = hits(lower(seg.text), DEPENDS);
      return d.length ? `rests on something already being in place — "${d[0]}"` : null;
    },
  },
  {
    key: 'long-shots',
    test: (seg) => {
      const f = hits(lower(seg.text), FAR);
      return f.length ? `marks something as far off or unsettled — "${f[0]}"` : null;
    },
  },
  {
    key: 'low-hanging',
    test: (seg) => {
      const n = hits(lower(seg.text), NEAR);
      return n.length ? `marks something as already to hand — "${n[0]}"` : null;
    },
  },
  {
    key: 'worth-hype',
    test: (seg) => {
      const c = hits(lower(seg.text), CLAIMY);
      return c.length ? `makes a large claim — "${c[0]}" — a claim to be weighed, not a verdict already reached` : null;
    },
  },
];

// The aim wording lives in dialogue.mjs with the rest of the prompt, exactly as CRITICISM_POINTERS does, and the two lists are checked against each other at module load so they cannot drift silently. This project has paid twice for a rule written on one path of two.
const POINTER_KEYS = new Set(PREP_POINTERS.map((p) => p.key));
for (const r of RULES) {
  if (!POINTER_KEYS.has(r.key)) throw new Error(`prep.mjs: station "${r.key}" has no PREP_POINTERS entry in dialogue.mjs`);
}
if (PREP_POINTERS.length !== RULES.length) throw new Error('prep.mjs: PREP_POINTERS and the station rules have different lengths — one has gained a station the other has not');

// ─────────────────────────────── the tasks between parts ───────────────────────────────
// 🔴 THE TASKS ARE PRE-SET BY A DOCUMENT AND THE STONE NEVER WRITES ONE (Prayas, 28 August 2026: "the tasks are pre-set by another doc - the stone does not have to do it"). This is the same division that governs everything else on this surface, arriving at the one place the tool would otherwise have to give an instruction: whoever prepared the material decides what is worth going away and doing, the document says it, and the stone's whole part is to point at what the document already said and ask about it. A tool that composed the task would be answering — and it would be answering the largest question in the whole prep, which is what this person should spend their week on.
//
// Tasks arrive EITHER as a separate file attached beside the prep sheet, which is the shape a teacher will
// want because the two documents have different authors and different lifespans, OR as a section of the
// sheet itself for somebody who would rather keep it in one file. A separate file wins where both exist.
//
// ⚠️ ONE TASK PER PART BOUNDARY, IN ORDER, AND THERE ARE ONLY TWO BOUNDARIES. Part three ends the prep and
// hands into the learner's own enquiry, so a third task would be an instruction issued on the way out of a
// conversation that is no longer about the document at all. A tasks file with three entries simply has its
// third ignored, which is worth knowing before wondering where it went.
const TRY = ['try', 'tries', 'make', 'build', 'attempt', 'practise', 'practice', 'exercise', 'exercises', 'task', 'tasks', 'have a go', 'start by', 'start with', 'first project', 'sketch', 'prototype', 'experiment', 'experiments', 'go and', 'spend an hour', 'before you come back'];
function tryPassages(segments = []) {
  return segments.filter((s) => hits(lower(s.text), TRY).length).map((s) => s.id);
}

/**
 * Split a tasks document into ordered tasks.
 *
 * Accepts what people actually write: numbered lines, bulleted lines, markdown headings with text under them, or plain paragraphs separated by blank lines. Headings that only label a part ("Part 1", "After session one") are dropped rather than returned as tasks, because a heading is not a task and returning one would quote a title at the learner as though it were work.
 *
 * ⚠️ It is a SPLIT, not a parse. Nothing here checks that a task is sensible, achievable or even a task — the document's author decided that, and this file has no standing to second-guess them.
 */
export function parseTasks(text) {
  const src = String(text || '').replace(/\r\n?/g, '\n').trim();
  if (!src) return [];
  const lines = src.split('\n');
  const marked = lines.map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^#{1,6}\s|^(part|session|week|stage)\s*\d+\s*[:.—–-]?\s*$/i.test(l))
    .filter((l) => /^(\d+[.)]\s+|[-*•]\s+)/.test(l))
    .map((l) => l.replace(/^(\d+[.)]\s+|[-*•]\s+)/, '').trim());
  if (marked.length) return marked;
  // No list markers — fall back to blank-line paragraphs, minus any heading-only ones.
  return src.split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => !/^#{1,6}\s/.test(l.trim())).join(' ').trim())
    .filter((b) => b && !/^(part|session|week|stage)\s*\d+\s*[:.—–-]?\s*$/i.test(b));
}

/** What each station is called on the page and in the readiness note. Plain words, no house vocabulary — the person making a prep sheet is a teacher or a student, not a reader of this file. */
export const STATION_LABELS = {
  glossary: 'what the field calls things',
  background: 'where it came from',
  prerequisites: 'what you need first',
  'long-shots': 'what is hard here',
  'low-hanging': 'what is already to hand',
  'worth-hype': 'what the field says about itself',
};

/**
 * Which region of THIS document does each station point at?
 *
 * Returns all six, always, in the fixed pedagogical order. `anchored` says whether the document itself triggered the station or whether it is pointing at the framing digest instead — which a probe needs, because a run where nothing anchored is a run against a document that afforded nothing, and reading that as evidence the arc works would be reading the floor as the building.
 */
export function affordPrep(segments = []) {
  const digest = briefDigest(segments).segmentIds;
  const fallback = digest.length ? digest : segments.slice(0, 3).map((s) => s.id);
  const stations = PREP_POINTERS.map((p) => {
    const rule = RULES.find((r) => r.key === p.key);
    const region = [], whys = [];
    for (const seg of segments) {
      const why = rule.test(seg);
      if (why) { region.push(seg.id); whys.push(why); }
    }
    return region.length
      ? { key: p.key, aim: p.aim, segmentIds: region, why: whys[0], anchored: true }
      : { key: p.key, aim: p.aim, segmentIds: fallback, why: 'the document says nothing directly on this line, so the question is asked against its framing passages and the learner\'s own words', anchored: false };
  });
  return { stations, anchoredCount: stations.filter((s) => s.anchored).length };
}

/**
 * READINESS — the same six rules, reported to whoever is uploading, before the conversation starts.
 *
 * 🔴 IT WARNS AND NEVER REFUSES. A thin sheet still runs: unanchored stations fall back to the framing digest, so the arc degrades rather than failing, and refusing a document because it lacks a section would put a format rule in front of a student who just wants to begin. What it does do is SAY which lines it could not find, because the alternative is a conversation that quietly asks six vague questions and gives the uploader no way to know why.
 *
 * ⚠️ `segments` is the honest floor and is reported separately. A slide deck exported to PDF arrives as bullet fragments with no sentence punctuation, so `segmentText` returns one or two segments for the whole file and EVERY station then points at the same place — which looks, from the questions, exactly like a document with nothing in it. The count is the only thing that tells those two apart.
 */
export function readiness(segments = []) {
  const { stations, anchoredCount } = affordPrep(segments);
  return {
    segments: segments.length,
    anchored: stations.filter((s) => s.anchored).map((s) => s.key),
    missing: stations.filter((s) => !s.anchored).map((s) => s.key),
    anchoredCount,
    // Two segments for a whole file means the sentence punctuation is missing, not that the field is empty.
    thin: segments.length < 12,
  };
}

/**
 * Where in the prep this turn sits.
 *
 * STATELESS BY REPLAY, exactly as the criticism plan is: the client posts the transcript back every turn and the walk is reconstructed from the beginning, so no session identifier exists and none is needed. Same transcript, same station.
 *
 * ADVANCE EARLY, CAP LATE. A station is served once the learner's own words have reached a couple of spots in its region — they have engaged that line and asking again would grind. Where they have not, PREP_DWELL caps the stay. Nothing here reads how WELL they answered, and nothing could: `regionContact` sees which passages their words have touched and that is all it has ever seen. It stays planner-only here as it is on the criticism surface — never rendered, never persisted, never in the prompt, never in the download.
 *
 * 🔴 WHEN THE WALK RUNS OFF THE END, `station` IS NULL AND `complete` IS TRUE. The caller must read `complete` BEFORE reaching for a region, because `windowOf` handed an empty region falls to its show-the-opening floor and the criticism surface has already paid once for a planner that returned nothing on completion. Here the route leaves the prep path entirely at that point, which is the intended exit rather than a degradation.
 */
export function prepPlan({ segments = [], studentTurns = [], stoneTurns = [], tasks = [], sittings = 3 } = {}) {
  const parts = partsFor(sittings);
  const { stations, anchoredCount } = affordPrep(segments);
  const tryRegion = tryPassages(segments);
  const contact = regionContact({ segments, studentTurns, stoneTurns });
  const touchedBy = (segId, upto) => { const r = contact.get(segId); return !!r && r.turns.some((t) => t <= upto); };

  // THE WALK, replayed from the beginning every turn. `step` is what THIS turn is: a station question, the closing turn that ends a part, or the resuming turn that opens the next one. Simulated forward rather than solved, because the dwell budget makes a station's length depend on what the learner said inside it — and a replay that reproduces the whole path is also what makes the same transcript always yield the same turn.
  let turn = 0;                                     // stone turns consumed so far by the simulation
  const at = stoneTurns.length;                     // the turn we are composing now
  const path = [];
  let cursor = null;

  const take = (step) => {
    if (turn === at && !cursor) cursor = step;
    path.push(step);
    turn++;
  };

  outer:
  for (let p = 0; p < parts.length; p++) {
    if (p > 0) {
      take({ phase: 'resuming', part: p + 1, station: null });
      if (turn > at) break outer;
    }
    for (const si of parts[p]) {
      const st = stations[si];
      let spent = 0;
      while (spent < PREP_DWELL) {
        take({ phase: 'station', part: p + 1, station: st });
        if (turn > at) break outer;
        spent++;
        const i = turn - 1;
        const need = Math.min(SERVED_TOUCHES, st.segmentIds.length);
        const touched = st.segmentIds.filter((id) => touchedBy(id, i)).length;
        // An UNANCHORED station cannot be served early: its region is the framing digest, which the learner's words will touch for reasons that have nothing to do with this line of questioning. Letting the digest satisfy `served` would skip precisely the stations the document is thinnest on, which are the ones the prep is most needed for.
        if (st.anchored && st.segmentIds.length > 0 && touched >= need) break;
      }
    }
    // The last part has no closing turn: prep simply ends and their own enquiry begins, which is the better ending than one more question about what they will go and do.
    if (p < parts.length - 1) {
      take({ phase: 'closing', part: p + 1, station: null });
      if (turn > at) break outer;
    }
  }

  const complete = !cursor;
  const step = cursor || { phase: 'complete', part: parts.length, station: null };
  const region = step.station ? step.station.segmentIds
    : step.phase === 'closing' ? (tryRegion.length ? tryRegion : briefDigest(segments).segmentIds)
      : [];
  // The task set for THIS boundary, verbatim from whoever wrote the tasks document. `part` is 1-based and
  // there is one task per boundary, so part one closes on tasks[0]. Absent, the closing turn asks the
  // learner to name something themselves — which is what happens whenever nobody supplied a tasks file.
  const task = step.phase === 'closing' ? (tasks[step.part - 1] || '') : '';
  return {
    stations, anchoredCount, path, complete,
    phase: step.phase,                              // 'station' | 'closing' | 'resuming' | 'complete'
    part: step.part,
    parts: parts.length,
    station: step.station,
    index: step.station ? stations.indexOf(step.station) : -1,
    region,
    task,
    hasTasks: tryRegion.length > 0 || tasks.length > 0,
  };
}
