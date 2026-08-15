// plan.mjs — the reading plan: an arc composed from the document, not a clock run against it.
//
// WHAT IT REPLACES. `pickCriticismPointer` is `(floor(stoneCount / 3) + bump) % 7` — seven lines of questioning, three questions each, advancing on a timer. It is blind to the text in front of it. It will spend three turns asking what people actually DO in a document that makes no behavioural claim at all, and it never returns to anything, never finishes, and never knows where in the text it is. That is what "one-off" means here: every turn is chosen without reference to the document or to anything that has already happened.
//
// WHAT THIS DOES INSTEAD. Two computations, both in CODE — invariant #5 puts judgement and tracking on this side of the line, and the model only ever composes the sentence.
//
//   1. AFFORDANCE. Which lines of questioning does THIS document actually support? A station exists only if some region of the text triggers its rule, and the region it triggered on becomes the station's territory. A text with no evidential claim gets no `verified` station, so the stone never spends three questions asking for evidence of nothing.
//   2. TRAVERSAL. Which station is live this turn? Recomputed from scratch every turn by replaying the transcript the client posts back — so it holds no state, exactly as the modulo did, and the same inputs always produce the same plan. The walk advances EARLY when the student's own words have reached the station's region, and is capped by a dwell budget when they have not. Routing is toward what has not been touched.
//
// 🔴 THE PLAN ENDS, and the surface has never had that. When the last station is served the plan reports `complete`. This matters past tidiness: this project's own note is that a conversation which died at turn seven and one that finished at turn seven are the same row in `turn_depth`. A plan with a known number of stations makes arrival at the last one a fact about the PLAN — no user, no session, no text — and therefore the first thing here that can tell finishing from leaving.
//
// ⚠️ THIS IS UNMEASURED AND THE PROJECT HAS A NULL ON ITS NEIGHBOUR. `readArc` was removed from the enquiry steering path at v0.11.0 because it traversed every aim correctly while the questions stayed identical in kind — an aim arrives as a direction, and on that surface the learner's own words decide the subject. The argument for why it need not transfer is that the object differs: here it is a FIXED EXTERNAL TEXT with enumerable spots, so a plan is a reading order rather than a direction imposed on somebody's thinking. That is an argument, not a measurement. Measure it against the clock with flow-probe before believing it, and if it comes back null, say so here rather than quietly keeping it.

import { CRITICISM_POINTERS } from './dialogue.mjs';
import { regionContact } from './reading.mjs';

export const DWELL = 3;                       // ~3–4 questions on a line, then move on (Siddhi, 16 Jul) — the cadence the clock already used, kept because it was the one part of it that was right.
export const PIN_MAX = DWELL * 2;             // the ABSOLUTE ceiling on one station, pinned or not. See below.
export const RETURN_WINDOW = 4;               // a "return" counts as heat only if it is recent.
export const SERVED_TOUCHES = 3;              // how many spots in a region count as having engaged the line.

// ─────────────────────────────── the affordance lexicons ───────────────────────────────
// Editable and visible, in qualify.mjs's style and for its reason: an academic audit asks why a spot was flagged, and every station below carries a `why` naming the rule and the trigger word. Nothing here calls a model. Curated narrow rather than wide — a missed affordance costs one station on one document, a false one costs three questions about something the text never said.

const BENEFICIARY = ['user', 'users', 'customer', 'customers', 'audience', 'people', 'person', 'student', 'students', 'client', 'clients', 'reader', 'readers', 'visitor', 'visitors', 'community', 'resident', 'residents', 'patient', 'patients', 'worker', 'workers', 'buyer', 'buyers', 'player', 'players'];
const ABSOLUTE = ['all', 'every', 'always', 'never', 'none', 'no one', 'nobody', 'everyone', 'everybody', 'any', 'entirely', 'completely', 'universally'];
const EVIDENCE = ['study', 'studies', 'research', 'survey', 'data', 'measured', 'observed', 'tested', 'interview', 'interviews', 'evidence', 'according to', 'found that', 'reported'];
const DOING = ['abandon', 'click', 'clicks', 'scroll', 'scrolls', 'browse', 'search', 'searches', 'skip', 'skips', 'leave', 'leaves', 'return', 'returns', 'buy', 'buys', 'share', 'shares', 'ignore', 'ignores', 'wait', 'waits', 'type', 'types', 'tap', 'taps', 'swipe', 'read', 'reads', 'use', 'uses', 'choose', 'chooses', 'prefer', 'avoid', 'avoids'];
const STAKE = ['risk', 'risks', 'cost', 'costs', 'fail', 'fails', 'failure', 'lose', 'loses', 'lost', 'harm', 'harms', 'damage', 'benefit', 'benefits', 'save', 'saves', 'gain', 'gains', 'impact', 'safety', 'unsafe', 'revenue', 'profit', 'loss', 'danger', 'consequence', 'consequences', 'at stake'];
const WANTNEED = ['want', 'wants', 'wanted', 'need', 'needs', 'needed', 'desire', 'desires', 'prefer', 'prefers', 'preference', 'expect', 'expects', 'demand', 'demands', 'wish', 'require', 'requires'];
const CORE = ['main', 'core', 'primary', 'purpose', 'central', 'essential', 'key', 'chief', 'principal', 'the point of', 'meant to', 'designed to', 'exists to'];
const ADDITION = ['also', 'in addition', 'as well as', 'additionally', 'plus', 'furthermore', 'moreover', 'on top of', 'besides', 'alongside'];

const lower = (s) => String(s || '').toLowerCase();
const hits = (text, list) => list.filter((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(text));

// ─────────────────────────────── affordance ───────────────────────────────
// Each rule answers one question: does some region of THIS text give the stone something real to ask about on this line? It returns the segment ids that triggered it — affordance and territory are the same computation, which is what stops a station existing with nowhere to point.

const RULES = [
  {
    key: 'blur',
    // Criticism mode's identity, and the one station that is not lexical: it comes from the deterministic locator that has already run. Dropping it dissolves the tool, so it is always first when present.
    test: (seg, { blurIds }) => (blurIds.includes(seg.id) ? 'the locator marked this spot as a blur of describing and deciding' : null),
  },
  {
    key: 'verified',
    test: (seg) => {
      const t = lower(seg.text);
      if (hits(t, EVIDENCE).length) return null;                       // the text already shows its working here — nothing to press
      const abs = hits(t, ABSOLUTE);
      if (abs.length) return `absolute claim "${abs[0]}" with no evidence marker`;
      if (/\b\d+(\.\d+)?\s*(%|percent|per cent)\b/.test(t)) return 'a figure stated with no source';
      return null;
    },
  },
  {
    key: 'behaviours',
    test: (seg) => {
      const t = lower(seg.text);
      const who = hits(t, BENEFICIARY), does = hits(t, DOING);
      return who.length && does.length ? `asserts what "${who[0]}" do — "${does[0]}"` : null;
    },
  },
  {
    key: 'problem',
    test: (seg) => {
      const t = lower(seg.text);
      const who = hits(t, BENEFICIARY);
      return who.length ? `names who this is for — "${who[0]}"` : null;
    },
  },
  {
    key: 'need-want',
    test: (seg) => {
      const t = lower(seg.text);
      const w = hits(t, WANTNEED);
      return w.length ? `rests on "${w[0]}" without separating a need from a want` : null;
    },
  },
  {
    key: 'stakes',
    test: (seg) => {
      const t = lower(seg.text);
      const s = hits(t, STAKE);
      return s.length ? `names a consequence — "${s[0]}"` : null;
    },
  },
  {
    key: 'hero-hindrance',
    test: (seg) => {
      const t = lower(seg.text);
      const c = hits(t, CORE), a = hits(t, ADDITION);
      if (c.length && a.length) return `sets "${c[0]}" against an addition — "${a[0]}"`;
      if (c.length) return `states what the thing is mainly for — "${c[0]}"`;
      return null;
    },
  },
];

// Every station key must have a pointer with its aim wording, and the wording lives in dialogue.mjs where the rest of the prompt lives. Checked at module load so the two lists cannot drift silently — the defect class this project has already paid for twice (the duplicated describeLocated, the turn-cap guard written on one path of two).
const POINTER_KEYS = new Set(CRITICISM_POINTERS.map((p) => p.key));
for (const r of RULES) {
  if (!POINTER_KEYS.has(r.key)) throw new Error(`plan.mjs: station "${r.key}" has no CRITICISM_POINTERS entry in dialogue.mjs`);
}

/**
 * Which stations does this document afford, and over which regions?
 *
 * Returned in DOCUMENT ORDER — by where each station's territory begins — so the arc moves through the text rather than jumping about it. `blur` is the exception and leads when present, because it is the mode's identity and because the locator has already earned it.
 *
 * 🔴 THE FLOOR. If the lexicons find nothing at all the plan must not come back empty, or the surface has no question to ask. A text with a located blur falls back to `blur`; a text with neither blurs nor a single lexical trigger falls back to the full pointer rotation — the old clock, which is the correct thing to degrade to because it is what the surface did before this file existed. `fellBack` says which floor was used, so a probe can tell a real plan from a degraded one instead of reading the degraded case as evidence the plan works.
 */
export function afford(segments = [], { blurIds = [] } = {}) {
  const stations = [];
  for (const rule of RULES) {
    const region = [], whys = [];
    for (const seg of segments) {
      const why = rule.test(seg, { blurIds });
      if (why) { region.push(seg.id); whys.push(why); }
    }
    if (region.length) stations.push({ key: rule.key, segmentIds: region, why: whys[0], first: region[0] });
  }
  if (!stations.length) {
    const fallback = blurIds.length
      ? [{ key: 'blur', segmentIds: [...blurIds], why: 'the locator marked this spot as a blur of describing and deciding', first: blurIds[0] }]
      : CRITICISM_POINTERS.map((p, i) => ({ key: p.key, segmentIds: [], why: 'no region triggered — the document afforded no station', first: i }));
    return { stations: fallback, fellBack: blurIds.length ? 'blur-only' : 'rotation' };
  }
  const blur = stations.filter((s) => s.key === 'blur');
  const rest = stations.filter((s) => s.key !== 'blur').sort((a, b) => a.first - b.first);
  return { stations: [...blur, ...rest], fellBack: null };
}

/**
 * The traversal — where in the plan this turn sits.
 *
 * STATELESS BY REPLAY. The client posts the transcript back every turn, so the walk below reconstructs the whole path from the beginning rather than remembering it. Same transcript, same plan; no session identifier exists here and none is needed. This is the same property `pickCriticismPointer` had, kept deliberately, because it is what lets the ephemeral pivot stand.
 *
 * ADVANCE EARLY, CAP LATE. A station is served when the student's own words have reached every segment of its territory — that is the routing rule the sensors exist for, and it is why a student who engages a region deeply moves on rather than being asked three questions about a spot they have already worked out. Where they have not reached it, DWELL caps the stay so the stone cannot grind. `selfEcho` advances one early when the stone is circling its own question, which is the backstop the clock already had.
 *
 * ⚠️ A RETURNED REGION PINS. If the student came back to a region after leaving it, the plan holds there rather than routing away on the grounds that it is technically touched. Persistence is heat — readDwell already makes this reading on the enquiry surface — and routing away from the one place somebody is actually working is the worst move available to a planner whose whole justification is following them.
 */
export function planFor({ segments = [], blurIds = [], studentTurns = [], stoneTurns = [], selfEcho = 0 } = {}) {
  const { stations, fellBack } = afford(segments, { blurIds });
  const contact = regionContact({ segments, studentTurns, stoneTurns });
  const touchedBy = (segId, upto) => { const r = contact.get(segId); return !!r && r.turns.some((t) => t <= upto); };
  const returned = new Set();
  for (const [id, r] of contact) {
    if (r.turns.length >= 2 && r.turns.some((t, k) => k > 0 && t - r.turns[k - 1] > 1)) returned.add(id);
  }

  let idx = 0, spent = 0;
  const path = [];
  for (let i = 0; i < stoneTurns.length; i++) {
    path.push(idx);
    spent++;
    const st = stations[idx];
    if (!st) break;

    // 🔴 THE PIN MUST DECAY AND MUST BE CAPPED. Both halves were wrong on 15 August and a real
    // fourteen-round conversation caught it: `returned` accumulated over the WHOLE transcript and never
    // expired, so one non-adjacent return anywhere in a 32-segment region pinned that station for the rest
    // of the conversation. The probe ran fourteen rounds at `idx 0/6`, never leaving `blur`, and the
    // play-acted student disengaged twice — "you already asked me that". The plan was behaving worse than
    // the modulo clock it replaced, because the clock at least rotated. NOTHING ERRORED; the traversal
    // simply never fired, which is why this needed a conversation to find rather than a unit test.
    // So a return is heat only while it is RECENT, and no station may hold past PIN_MAX whatever happens.
    const pinned = st.segmentIds.some((id) => {
      const r = contact.get(id);
      return !!r && r.turns.some((t) => t <= i && i - t < RETURN_WINDOW) && returned.has(id);
    });

    // 🔴 AND `served` WAS UNREACHABLE. It required EVERY segment of the region to be touched; on a
    // 32-segment region that cannot happen, so early-advance — the entire purpose of the sensors — could
    // never fire either. Engaging a line is touching a few of its spots, not exhausting it.
    const need = Math.min(SERVED_TOUCHES, st.segmentIds.length);
    const touchedCount = st.segmentIds.filter((id) => touchedBy(id, i)).length;
    const served = st.segmentIds.length > 0 && touchedCount >= need;

    const cap = pinned ? PIN_MAX : DWELL + ((selfEcho ?? 0) >= 0.5 ? -1 : 0);
    if (served || spent >= cap) { idx++; spent = 0; }
  }

  // 🔴 COMPLETION WRAPS; IT DOES NOT EMPTY. The first version returned `station: null` once the last
  // station was served, and that was wrong twice over. The surface still has to ask something — a student
  // who keeps talking after the plan is traversed cannot be met with nothing — and, worse, an empty region
  // fed windowOf() a region of length zero, which sent it down its "no region, show everything" path and
  // put the WHOLE 25,000-character document back into the prompt. The cost blowout that windowing exists to
  // prevent arrived precisely when the plan succeeded. So the walk laps: `complete` still flips exactly
  // once, at the depth where the plan was first traversed, which is what makes finishing observable; the
  // station keeps rotating after it, and the region is never empty.
  const complete = idx >= stations.length;
  const laps = stations.length ? Math.floor(idx / stations.length) : 0;
  const live = stations.length ? stations[idx % stations.length] : null;
  return {
    stations, station: live, index: idx, spent, complete, laps, path, fellBack,
    region: live ? live.segmentIds : [],
    returned: [...returned],
  };
}

// ─────────────────────────────── windowing ───────────────────────────────

export const WINDOW_WHOLE_BELOW = 8000;   // the old /open ceiling, kept exactly — see below.
export const WINDOW_BUDGET = 6000;        // hard ceiling on what a windowed artefact contributes to the prompt.
export const SKELETON_WORDS = 9;

/**
 * The artefact as it enters the prompt: the live region verbatim, the rest as a skeleton.
 *
 * 🔴 WHY THIS IS NOT AN OPTIMISATION. Until now the WHOLE artefact was embedded on EVERY turn, which was affordable only because the paste was capped at 8,000 characters — roughly two thousand tokens. At 25,000 that is about six times the per-turn prompt, forty turns a day, eighty-seven students, against a ₹12,000 lifetime ceiling that was sized for the smaller number. Windowing is what makes a document-length text possible at all; without it the cap could not have moved.
 *
 * 🔴 SHORT TEXTS ARE BYTE-IDENTICAL TO BEFORE. Below WINDOW_WHOLE_BELOW the whole text goes in exactly as it always did, so every existing paste behaves precisely as it does today and this change cannot regress the surface it was measured on. The window only ever appears on material that could not have been submitted before this release.
 *
 * ⚠️ THE SKELETON IS THERE SO THE MODEL KNOWS IT IS LOOKING THROUGH A WINDOW. Handed a bare extract, a model will happily ask what the document "never addresses" when the document addresses it two pages later — an assertion about the whole from a view of a part, and on this surface that is a verdict about the text. The opening words of the surrounding passages are cheap and they are what make the question honest.
 *
 * 🔴 IT IS BUDGETED IN CHARACTERS, NOT PER SEGMENT, AND THE FIRST VERSION WAS NOT. Skeletonising every passage to its first nine words looks like compression and is only compression when passages are long. On a document of 589 one-sentence segments, nine words is most of the sentence, and the per-line marker and newline are pure addition: the "windowed" artefact measured 28,095 characters against a 25,000-character source. It inflated, on exactly the input the feature was built for, and nothing failed — the prompt was simply bigger and the bill quietly larger. So the region goes in verbatim and the surrounding skeleton fills whatever budget is left, outward from the region because nearby context is worth more than distant. Whatever the shape of the document, the result is bounded. verification asserts both bounds, since the failure mode here is arithmetic nobody looks at.
 */
export function windowOf(text, segments = [], region = [], { wholeBelow = WINDOW_WHOLE_BELOW, budget = WINDOW_BUDGET, pad = 1 } = {}) {
  const src = String(text || '');
  if (src.length <= wholeBelow || !segments.length) {
    return { windowed: false, body: src.trim(), shown: segments.map((s) => s.id), skeleton: '' };
  }
  // 🔴 A LONG TEXT WITH NO REGION STILL GETS A WINDOW. The obvious guard — "no region, so show everything"
  // — is the one that put 25,000 characters back in the prompt when planFor briefly returned an empty
  // region on completion. That caller bug is fixed above, but the failure was silent, cost money and
  // showed up in no test, so the floor stays here as well: past the ceiling, something is always windowed.
  // Two independent things now have to go wrong for a whole long document to reach the model.
  const live = region.length ? region : segments.slice(0, 3).map((s) => s.id);
  const keep = new Set();
  for (const id of live) {
    for (let d = -pad; d <= pad; d++) keep.add(id + d);
  }

  const byId = new Map(segments.map((s) => [s.id, s]));
  const shown = [], parts = new Map();
  let used = 0;
  for (const seg of segments) {
    if (!keep.has(seg.id)) continue;
    if (used + seg.text.length + 1 > budget && shown.length) break;  // +1 for the newline the join adds — omit it and the body lands just over budget
    shown.push(seg.id); parts.set(seg.id, seg.text); used += seg.text.length + 1;
  }

  // Fill what is left with opening words, walking OUTWARD from the region — nearest context first.
  const anchor = shown.length ? shown[Math.floor(shown.length / 2)] : live[0];
  const order = segments.map((s) => s.id).filter((id) => !parts.has(id)).sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
  let sketched = 0;
  for (const id of order) {
    const words = String(byId.get(id).text).split(/\s+/).filter(Boolean);
    const line = `  […] ${words.slice(0, SKELETON_WORDS).join(' ')}${words.length > SKELETON_WORDS ? ' …' : ''}`;
    if (used + line.length + 1 > budget) break;
    parts.set(id, line); used += line.length + 1; sketched++;
  }

  const body = segments.filter((s) => parts.has(s.id)).map((s) => parts.get(s.id)).join('\n');
  const hidden = segments.length - parts.size;
  const note = [
    `${segments.length - shown.length} of ${segments.length} passages are not shown in full`,
    sketched ? `${sketched} appear as opening words only` : null,
    hidden ? `${hidden} are not shown at all` : null,
  ].filter(Boolean).join('; ');
  return { windowed: true, body, shown, sketched, hidden, skeleton: note };
}

/**
 * The concept document, reduced to the part that frames anything.
 *
 * A project concept is mostly scene-setting; what makes it usable as CONTEXT is the handful of sentences establishing who it is for, what it is mainly trying to do, and what it commits to. Those are the same three lexicons the affordance rules already use, so the digest is a reuse rather than a new judgement — and taking the framing sentences beats taking the opening N characters, which is whatever the author happened to put first.
 *
 * ⚠️ IT IS AN EXTRACT AND THE PROMPT SAYS SO. A model handed a digest labelled as the whole concept will answer as though it has read the project. The block that carries this states that it is a extract, for the same reason the skeleton exists above.
 */
export function conceptDigest(segments = [], { maxChars = 3000 } = {}) {
  const scored = [];
  for (const seg of segments) {
    const t = lower(seg.text);
    let score = 0;
    if (hits(t, CORE).length) score += 3;
    if (hits(t, BENEFICIARY).length) score += 2;
    if (hits(t, WANTNEED).length) score += 2;
    if (hits(t, STAKE).length) score += 1;
    if (score) scored.push({ id: seg.id, text: seg.text, score });
  }
  // 🔴 THE OPENING IS SEEDED, NOT COMPETED FOR. Scoring alone dropped "This project is a wayfinding system for the campus library" — the sentence that says what the thing IS — because it trips no lexicon: it names no beneficiary, no purpose word, no stake. The digest that survived described who it was for and what was at risk while never saying what it was, which is the one thing context is for. A concept note almost always opens by naming itself, so the first two passages go in first and the scored ones fill what is left.
  const picked = [];
  const seeded = new Set();
  let used = 0;
  // ⚠️ THE SEPARATOR COUNTS, and forgetting it is the second instance of one mistake in this file — windowOf
  // measured its budget without the newline the join adds, and this measured its cap without the space. Both
  // landed a hair over and neither threw. When a budget is spent on pieces that are later joined, the joiner
  // is part of the cost.
  for (const s of segments.slice(0, 2)) {
    if (used + s.text.length + 1 > maxChars) break;
    picked.push({ id: s.id, text: s.text, score: 0 }); seeded.add(s.id); used += s.text.length + 1;
  }
  for (const s of [...scored].sort((a, b) => b.score - a.score || a.id - b.id)) {
    if (seeded.has(s.id)) continue;
    if (used + s.text.length + 1 > maxChars) continue;
    picked.push(s); used += s.text.length + 1;
  }
  if (!picked.length) {
    const opening = segments.slice(0, 6).map((s) => s.text).join(' ').slice(0, maxChars);
    return { text: opening, segmentIds: segments.slice(0, 6).map((s) => s.id), fellBack: true };
  }
  picked.sort((a, b) => a.id - b.id);
  return { text: picked.map((s) => s.text).join(' '), segmentIds: picked.map((s) => s.id), fellBack: false };
}
