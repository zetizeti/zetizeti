// assoc.mjs — WIDENING BY ASSOCIATIVE VALUE (Prayas, 28 July 2026: "the widening / navigating of the
// dialogue can be by associative value"), grounded in two instructions given the same evening:
//
//   "keep internal association in the ball-park of Jung's word association test's forensic
//    diagnostic / detective quality"  — the SELECTOR: which two things to join.
//   "gather associative pattern from cummings poetry"  — the MANNER: how the join is spoken.
//
// ── THE JUNG HALF (which pair) ──────────────────────────────────────────────────────────────────────
// The first selector here was Galton's, not Jung's: distance × recurrence, every remembered word equal
// material. It joined a fluent scene-detail from fourteen turns back and drew "the two things aren't
// related like that." What made Jung's association experiment FORENSIC — the Burghölzli studies with
// Riklin (1904–06), and the evidence-diagnosis work that identified a culprit from reaction patterns —
// was that the associations worth following are the DISTURBED ones: the delayed reaction, the failure
// to respond, the perseverating word, the stumble on reproduction. The complex announces itself where
// the saying breaks down. The detective follows the charge, not the distance.
//
// Transcript analogues of his indicators (readCharges):
//   failure to respond        → the next reply is a refusal (isDecline)            +2
//   the named blockage        → "unable to put that into words" (ARTFAIL)          +2
//   delayed/disturbed reaction→ sudden contraction vs the session's own median     +1
//   disturbed reproduction    → the learner corrects a reading (isCorrection)      +1
//   perseveration             → words that keep returning across turns             +1
//   movement marker           → the learner's own insight phrases (INSIGHT)        +1
// A pair joins only when the early side carries charge ≥ 2. A join once made is DISCHARGED — Jung's
// complex worked through loses its indicators — so an anchor is spent after one use, replayed
// statelessly over prefixes (no stored state, same as the arc).
//
// THE INVERSION, and it is mandatory (invariant #7): Jung read disturbance to diagnose the PERSON —
// his instrument's lineage runs to the lie detector. Here the indicators may only ever select
// MATERIAL — which two of the learner's own sentences to hold together — computed in code, never
// stored, never transmitted, never phrased as a reading of anyone. The prompt payload remains two
// quotes. The detective's method, never the detective's object.
//
// ── THE CUMMINGS HALF (how spoken) ──────────────────────────────────────────────────────────────────
// Gathered from the actual Kennedy Selected Poems (analysis with quotes: docs/ops/
// cummings-associative-patterns.md — private; invariant #2: no in-copyright line ships). The spine of
// his associative precision: two ordinary things · large distance · MINIMAL CONNECTIVE · both meanings
// kept intact · at least one side concrete · the reader completes the join. Nothing is explained — the
// parenthesis holds two things and asserts nothing, and in zetizeti the question mark does the
// parenthesis's job. For material the learner has said they cannot word, his move is the negated
// near-neighbour: approach the unsayable sideways, by what it is not quite. What is deliberately NOT
// taken: the coinages and grammatical transplants themselves — a shape that dictates a construction
// manufactures a tic (measured, round 3).
//
// ── EXTERNAL flavour (model proposes, code picks) ───────────────────────────────────────────────────
// Measured 28 Jul and REJECTED (confusion 25%, trend 0.73 with it on; the probe keeps it runnable for
// comparison). Kept below unchanged: pickAssociate / associatesPrompt / widenBlock.
//
// Position check: an association introduces no conclusion. It names a place to stand, not a claim, and
// the learner does all the work of deciding whether the two belong together. Invariant #1 (exact-word
// FTS retrieval) is untouched — no embeddings, no semantic search anywhere here.

import { content, countPhrases, INSIGHT } from './signals.mjs';
import { isDecline, isCorrection, NONMATERIAL } from './arc.mjs';

const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// NONMATERIAL lives in arc.mjs (shared with the dwell anchor — round-4 traces caught dwell anchoring
// on "don't"); here it gates carried words and material sufficiency for joins.
const material = (t) => content(t).filter((w) => !NONMATERIAL.has(w));

// The named blockage — the learner pointing at the exact spot where language failed them. The
// strongest indicator: the student's "unable to put that into words" (turn 2) and "i don't know how to
// explain that silence" (turn 22) are the same spot named twice, twenty turns apart.
const ARTFAIL = [
  /\b(can ?not|can'?t|unable to|don'?t know how to|dont know how to|not able to) (put|explain|describe|say|word|express)\b/i,
  /\bput (that|it|this) into words\b/i,
  /\bno words for\b/i,
  /\bhard to (explain|describe|put)\b/i,
];

// Per-turn charge, computed on exactly the prefix given (so the discharge replay sees at turn k what
// the live system saw at turn k — same statelessness discipline as readArc). Nothing about the person:
// every component is a fact about the transcript.
export function readCharges(studentTurns = []) {
  const words = studentTurns.map((t) => content(t));
  const lens = words.map((w) => w.length);
  const turnsWith = new Map();
  words.forEach((ws) => { for (const w of new Set(ws)) turnsWith.set(w, (turnsWith.get(w) || 0) + 1); });
  return studentTurns.map((t, i) => {
    const uniq = [...new Set(words[i])];
    let charge = 0; const why = [];
    if (ARTFAIL.some((re) => re.test(t))) { charge += 2; why.push('named articulation failure'); }
    const next = studentTurns[i + 1];
    if (next !== undefined) {
      if (isDecline(next)) { charge += 2; why.push('drew a refusal'); }
      else if (i + 1 >= 2) {
        // contraction vs the median AT THAT TIME (per-subject baseline — Jung's differential method)
        const priorLens = lens.slice(0, i + 1).filter((l) => l >= 3);
        const median = priorLens.length ? [...priorLens].sort((a, b) => a - b)[Math.floor(priorLens.length / 2)] : 0;
        if (median > 0 && lens[i + 1] > 0 && lens[i + 1] <= 0.4 * median) { charge += 1; why.push('drew a contraction'); }
      }
    }
    if (countPhrases(t, INSIGHT) > 0) { charge += 1; why.push('movement marker'); }
    if (isCorrection(t)) { charge += 1; why.push('defended correction'); }
    if (uniq.some((w) => (turnsWith.get(w) || 0) >= 3)) { charge += 1; why.push('perseverating'); }
    const carried = uniq.filter((w) => (turnsWith.get(w) || 0) > 1 && !NONMATERIAL.has(w))
      .sort((a, b) => (turnsWith.get(b) || 0) - (turnsWith.get(a) || 0)).slice(0, 2);
    return { charge, why, carried, artfail: why.includes('named articulation failure') };
  });
}

// Shared gates: a pair must be genuinely apart (proportional overlap — an absolute count silently
// disabled the whole mechanism for fluent students, round 3) and genuinely unjoined (two substantive
// words from EACH side in one past question — a one-word test marked nearly every pair as joined).
function passesGates({ earlyWords, liveWords, stoneTurns }) {
  const joined = stoneTurns.some((q) => {
    const qw = new Set(content(q));
    return earlyWords.filter((w) => qw.has(w)).length >= 2
        && [...liveWords].filter((w) => qw.has(w)).length >= 2;
  });
  if (joined) return false;
  const overlap = earlyWords.filter((w) => liveWords.has(w)).length;
  if (overlap / Math.min(earlyWords.length, liveWords.size) > 0.4) return false;
  return true;
}

function pickJoin({ studentTurns, stoneTurns, minGap, used, selector }) {
  const n = studentTurns.length;
  if (n < minGap + 1) return null;
  const live = studentTurns[n - 1];
  const liveWords = new Set(content(live));
  // The live side must hold real material once hedges are set aside (charge path) — a join to a "maybe"
  // produces 'what kind of "maybe" is this?' (measured miss).
  if (liveWords.size < 2) return null;
  if (selector !== 'recurrence' && new Set(material(live)).size < 2) return null;

  const charges = selector === 'charge' ? readCharges(studentTurns) : null;
  // legacy recurrence map (selector 'recurrence' — the round-3 selector, kept for measurement)
  const turnsWith = new Map();
  if (!charges) studentTurns.forEach((t) => { for (const w of new Set(content(t))) turnsWith.set(w, (turnsWith.get(w) || 0) + 1); });

  let best = null;
  for (let i = 0; i <= n - 1 - minGap; i++) {
    if (used.has(i)) continue;
    const early = studentTurns[i];
    const earlyContent = content(early);
    if (earlyContent.length < 3) continue;
    const earlyWords = [...new Set(earlyContent)];
    if (!passesGates({ earlyWords, liveWords, stoneTurns })) continue;

    // 'open' (the shipping synthesis, measured 28 Jul): A1's generous recurrence value — its join-miss
    // rate ran ~7% against the charge selector's ~30% across three live runs — behind the SAME hygiene
    // the charge path earned: corrections never quoted, refusals quotable only when they name the
    // blockage, hedge/meta words never counted as material. Jung's forensics survive here as TACT (what
    // not to press), not as targeting.
    if (selector === 'open') {
      if (isCorrection(early)) continue;
      if (isDecline(early) && !ARTFAIL.some((re) => re.test(early))) continue;
      if ([...new Set(material(early))].length < 3) continue;
    }

    let value, extra;
    if (charges) {
      const c = charges[i];
      if (c.charge < 2) continue;                       // only charged material joins
      // QUOTABILITY (J2): the early side's text goes into the prompt verbatim, so it must be MATERIAL,
      // not the disturbance itself. A correction is defended boundary — charged, but quoting it back
      // produces questions built of refusal language ("…the sound to be something you haven't said?",
      // measured). A refusal is quotable only when it NAMES the blockage (artfail: "i don't know how to
      // explain that silence" carries an object; bare "idk" carries none). And a turn must keep ≥3
      // material words once hedge/meta vocabulary is set aside — Jung's stimulus was always a WORD with
      // content, never the stumble around it.
      if (isCorrection(early)) continue;
      if (isDecline(early) && !c.artfail) continue;
      if ([...new Set(material(early))].length < 3) continue;
      value = c.charge * 1000 + (n - 1 - i);            // strongest charge; among equals, the wider join
      extra = { charge: c.charge, why: c.why, carried: c.carried, artfail: c.artfail };
    } else {
      const salience = earlyWords.reduce((a, w) => a + ((turnsWith.get(w) || 0) > 1 ? 1 : 0), 0);
      if (!salience) continue;
      value = salience * Math.log(1 + (n - 1 - i));
      const pool = selector === 'open'
        ? earlyWords.filter((w) => (turnsWith.get(w) || 0) > 1 && !NONMATERIAL.has(w))
        : earlyWords.filter((w) => (turnsWith.get(w) || 0) > 1);
      extra = { salience, artfail: selector === 'open' && ARTFAIL.some((re) => re.test(early)), carried: pool.slice(0, 3) };
    }
    if (!best || value > best.value) {
      best = { value, distance: n - 1 - i, earlyIndex: i,
               earlyText: oneLine(early), liveText: oneLine(live), ...extra };
    }
  }
  return best;
}

// selector: 'charge' (Jung — default) | 'recurrence' (the round-3 selector, kept for comparison).
// Discharge (charge selector only): replay which join fired at every earlier prefix and retire those
// anchors — a join once made is spent. skipCorrected mirrors the caller's own gating so the replayed
// history matches what actually ran.
// `spacing` (29 Jul 2026) — RHYTHM, measured. A join is a demanding turn: it asks the learner to hold
// two things at once. At a mechanism density of ~50% of turns, mechanism turns draw replies as long as
// plain ones (31.7 vs 29.8 content-words); at ~67% they draw markedly shorter ones (26.3 vs 34.4) while
// the same build's PLAIN turns stay as strong as the baseline's (34.4 vs 34.2). The cost is not the
// mechanisms, it is their relentlessness — nothing in the design ever let the conversation breathe. So
// a join may not follow a join: the turn after one is left plain, which is where the learner writes
// most. Detected from the transcript (did the previous question hold two of their sentences?), so it
// stays stateless like everything else here.

function readAssociationCore({ studentTurns = [], stoneTurns = [], minGap = 3,
                               selector = 'charge', skipCorrected = false, used = null } = {}) {
  const n = studentTurns.length;
  if (selector !== 'charge') {   // 'recurrence' (the preserved A1 comparator) and 'open' (shipping)
    return pickJoin({ studentTurns, stoneTurns, minGap, used: used || new Set(), selector });
  }
  const spentCharge = new Set();          // the charge selector's own discharge ledger
  let result = null;
  for (let m = minGap + 1; m <= n; m++) {
    const live = studentTurns[m - 1];
    const gated = isDecline(live) || (skipCorrected && isCorrection(live));
    const hit = gated ? null : pickJoin({
      studentTurns: studentTurns.slice(0, m),
      stoneTurns: stoneTurns.slice(0, Math.max(0, m - 1)),
      minGap, used: spentCharge, selector,
    });
    if (m === n) { result = hit; break; }
    if (hit) spentCharge.add(hit.earlyIndex);
  }
  return result;
}

// SPACING — a join may not follow a join (29 Jul 2026). Measured: at a mechanism density of ~50% of
// turns, mechanism turns draw replies as long as plain ones (31.7 vs 29.8 content-words); at ~67% they
// draw markedly shorter ones (26.3 vs 34.4) while the SAME build's plain turns stay as strong as the
// baseline's (34.4 vs 34.2). The cost is not the mechanisms, it is their relentlessness — a join asks
// the learner to hold two things at once, and nothing in the design ever let the conversation breathe.
//
// Decided by a CUMULATIVE forward replay, which is the only correct way to do this statelessly: asking
// only "did a join fire on the previous prefix?" is wrong, because that previous join might itself have
// been suppressed by spacing. Two earlier attempts got this wrong and cut joins from 14/17 turns to
// 0.5–2 — mechanisms whose firing rate went unchecked, for the third time today. Walk the prefixes,
// carry which turns actually fired, alternate. O(n²) on a ≤40-turn transcript with no model calls.
// DISCHARGE, for every selector (29 Jul 2026). The charge selector retired an anchor after one use;
// the shipped `open` selector had no such rule, and the already-joined gate only blocks a repeat of the
// exact PAIR — so an early turn could be joined again and again against a fresh partner. Measured on a
// real session: turns 5, 6 and 7 all joined FROM the learner's first reply, dragging it forward and
// stapling it to whatever she had just said, until the model manufactured a transition to bridge them
// ("the exact moment when responsibility SHIFTS from the older volumes to the ad-walled one" — a shift
// she never described). Her verdict: it "connects one thing with another which is unnecessary or
// totally unrelated". An anchor is now spent once joined from, and revives only if her LATEST reply
// takes it up again — the same rule the dwell theme ledger already used, replayed the same way.
function dischargedAnchors({ studentTurns, stoneTurns, minGap, selector, skipCorrected }) {
  const spent = new Set();
  const lastWords = new Set(content(studentTurns[studentTurns.length - 1] || ''));
  for (let m = minGap + 1; m < studentTurns.length; m++) {
    const live = studentTurns[m - 1];
    if (isDecline(live) || (skipCorrected && isCorrection(live))) continue;
    const hit = readAssociationCore({
      studentTurns: studentTurns.slice(0, m),
      stoneTurns: stoneTurns.slice(0, Math.max(0, m - 1)),
      minGap, selector, skipCorrected, used: spent,
    });
    if (hit) spent.add(hit.earlyIndex);
  }
  // A spent anchor revives only on a GENUINE return — half of its material words back in the learner's
  // newest reply. Proportional, not a count: two shared words is trivial in any coherent conversation,
  // and a count-based revival brought the very anchor back that discharge exists to retire (caught by
  // the unit test, not by reading). Same lesson as the join-overlap gate, which failed the same way.
  for (const i of [...spent]) {
    const w = [...new Set(content(studentTurns[i] || '').filter((x) => !NONMATERIAL.has(x)))];
    if (!w.length) continue;
    const shared = w.filter((x) => lastWords.has(x)).length;
    if (shared / w.length >= 0.5) spent.delete(i);
  }
  return spent;
}

export function readAssociation(opts = {}) {
  const { studentTurns = [], stoneTurns = [], minGap = 3, spacing = false,
          selector = 'charge', skipCorrected = false } = opts;
  const n = studentTurns.length;
  if (!spacing) {
    if (selector === 'charge') return readAssociationCore(opts);   // already discharges internally
    const spent = dischargedAnchors({ studentTurns, stoneTurns, minGap, selector, skipCorrected });
    return readAssociationCore({ ...opts, used: spent });
  }
  let lastFired = -99;
  for (let m = minGap + 1; m <= n; m++) {
    if (m - 1 === lastFired) { if (m === n) return null; continue; }   // the turn after a join stays plain
    const hit = readAssociationCore({
      ...opts, spacing: false,
      studentTurns: studentTurns.slice(0, m),
      stoneTurns: stoneTurns.slice(0, Math.max(0, m - 1)),
    });
    if (m === n) return hit;
    if (hit) lastFired = m;
  }
  return null;
}

// ── the join, spoken (the Cummings manner, re-expressed) ────────────────────────────────────────────
export function associationBlock(assoc) {
  if (!assoc) return '';
  const held = (assoc.carried && assoc.carried.length)
    ? `\nTheir own word${assoc.carried.length > 1 ? 's' : ''} to reuse: ${assoc.carried.map((w) => `"${w}"`).join(', ')}.`
    : '';
  const sideways = assoc.artfail
    ? `\nThey said words failed them there — so do not ask them to define it. Ask what it is NOT quite, or what sits just beside it, and let them come at it sideways.`
    : '';
  return `\n[CONNECT — two things THEY said, which this conversation has never put together.
Earlier: "${assoc.earlyText.slice(0, 200)}"
Just now: "${assoc.liveText.slice(0, 200)}"${held}
One short question that holds both at once. The manner matters: no "which is like", no "just as", no explaining what connects them — set the two side by side and let the question mark do the joining. Keep each word meaning exactly what they meant by it. If one of the two is a touchable thing and the other an abstraction, ask through the touchable one. Do NOT make a thing act or know — nothing "does", "tells", "wants" or "makes possible" unless they said it does; possibility and knowing belong to the PERSON in their account. Lead from the NEW thing they just said toward the older one, never the reverse — the older material has resisted questioning once already, so come at it sideways, through the fresh material, not head-on.${sideways}
If they turn out to be unrelated, that is theirs to say.]\n`;
}

// ── EXTERNAL: candidates from the model, the CHOICE made in code ────────────────────────────────────
// Generic words make worthless associations ("thing", "space", "system"), and a candidate the learner
// has already used is not a widening at all — it is a restatement. Both are filtered here rather than
// asked of the model, because a rule the model is merely requested to follow is not a rule.
const TOO_GENERIC = new Set([
  'thing', 'things', 'space', 'system', 'process', 'experience', 'design', 'object', 'idea', 'concept',
  'feeling', 'moment', 'person', 'people', 'user', 'users', 'world', 'life', 'work', 'place', 'time',
  'sound', 'silence', 'noise', 'light', 'dark', 'water', 'air',
]);

export function pickAssociate(candidates = [], { studentTurns = [], anchor = '' } = {}) {
  const said = new Set(studentTurns.flatMap((t) => content(t)));
  const seen = new Set();
  for (const raw of candidates) {
    const c = oneLine(raw).toLowerCase().replace(/^[-*\d.\s]+/, '').replace(/[.,;:!?"']+$/g, '');
    if (!c || c.length < 3 || c.length > 40) continue;
    const words = c.split(/\s+/);
    if (words.length > 3) continue;                            // a phrase, not an association
    if (seen.has(c)) continue;
    seen.add(c);
    const heads = content(c);
    if (!heads.length) continue;
    if (heads.every((w) => TOO_GENERIC.has(w))) continue;      // says nothing
    if (heads.some((w) => said.has(w))) continue;              // they already said it — not a widening
    if (c.includes(String(anchor).toLowerCase())) continue;    // a restatement of the anchor
    return c;
  }
  return null;
}

// The prompt that asks for candidates. Deliberately asks for THINGS, not ideas or claims: a thing can be
// stood next to without asserting anything, which is what keeps this on the right side of the position.
export function associatesPrompt(anchor, liveText) {
  return `A design student is working on something and keeps returning to the word "${anchor}". They have just written: "${oneLine(liveText).slice(0, 300)}"

Name eight CONCRETE THINGS from anywhere in the world — objects, places, practices, situations, phenomena — that "${anchor}" is adjacent to. Not synonyms, not definitions, not abstractions, not design theory: things a person could point at, which sit near "${anchor}" and might open it from a new side.

Reply with the eight, comma-separated, nothing else. No numbering, no explanation.`;
}

export function widenBlock(anchor, associate) {
  if (!anchor || !associate) return '';
  return `\n[WIDEN — their "${anchor}" sits near "${associate}", which they have not mentioned.
Ask ONE question about THEIR project that opens "${anchor}" by way of "${associate}". Do not explain "${associate}", do not teach anything about it, do not claim the two are alike — put it beside their own material and ask. Keep it short and plain. If the pairing is wrong, they will say so, and that is useful too.]\n`;
}
