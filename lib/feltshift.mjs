// feltshift.mjs — the felt-shift EVENT detector: closed-form information gain over the learner's own
// words, re-pointed at the edge (measuring-the-inquiry.md — the position's central measure).
//
// ── The research record, honestly (24 Jul 2026 — two failed cuts are part of this file's meaning) ──
// v1 scored a turn's novelty as distance-from-the-nearest-prior-turn (1 − max cosine). Inverted: a
// sharpening learner STAYS ON TOPIC, so real sharpening turns were crushed as "redundant" while both
// scenarios' openings (no prior) scored highest. Semantic-similarity-to-prior ≠ redundancy.
// v2 replaced pairwise distance with SPAN geometry — He et al.'s (2026) Gaussian log-det, the marginal
// gain log(1 + uᵀΣ⁻¹u) of adding a turn to a goal-seeded covariance Σ = λI + Σuuᵀ (Sherman–Morrison
// incremental). The mathematics is right and is kept below (EdgeSpan — it still supplies the smooth
// additive gain trajectory). But at WHOLE-UTTERANCE granularity it does not separate: MiniLM puts
// casual paraphrases ~50° apart, so a circling turn still reads as ~0.8 "new direction" — the span
// cannot cover what the embedding space refuses to collapse.
// v3 (this one) moves the EVENT channel to the granularity where the embedding geometry is
// trustworthy and where zetizeti's own method points: the learner's CONTENT WORDS. A repeated word is
// exactly covered (identical string → identical embedding); a synonym is near-covered (neural catches
// what string-match cannot); a genuinely new causal word ("scares", "commitment") is not covered. The
// per-turn semantic gain is a facility-location-style coverage gain — Σ over the turn's items of
// novelty × edge-relevance — the same submodular diminishing-returns structure as the log-det, now
// over items. Clean Language alignment is the point, not a side-effect: the learner's exact words are
// the units of measure, and every event can NAME the words that carried it (inspectable, per
// progress-signals.md §3).
//
// ── The two channels (Gendlin's shift has two faces) ─────────────────────────────────────────────
//   SEM — new, edge-relevant material entering the articulation: the turn's coverage gain jumps above
//         the recent texture. The exploratory shift ("actually the sign-up form scares people…").
//   LEX — the words settling: an insight marker not outweighed by hedges, on a real sentence, with at
//         least one genuinely new content word (anti-spoof) and some edge-relevant content. The
//         crystallising shift ("yeah, the real issue is…").
// Both describe the ARTICULATION — the made thing — never the person (invariants #5/#7). Watch-side;
// drives nothing until promoted. PURE compute: the caller supplies all embeddings (no model here, the
// sensed.mjs discipline); `content` + the lexicons come from signals.mjs so the instruments never fork.

import { cosine } from './embed.mjs';
import { HEDGE, INSIGHT, countPhrases, content } from './signals.mjs';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ── EdgeSpan — the He et al. utterance-level formulation, kept for the additive gain trajectory ──
// Σ = λI + Σ uuᵀ over utterance embeddings, seeded with the edge; marginal gain of a turn is
// log(1 + uᵀΣ⁻¹u) (matrix determinant lemma), Σ⁻¹ updated in place by Sherman–Morrison. Deterministic,
// closed-form, additive (total = log det Σ_final − log det Σ_0 — asserted by test/feltshift.test.mjs).
export const LAMBDA = 0.1;
export class EdgeSpan {
  constructor(dim, lambda = LAMBDA) {
    this.d = dim;
    this.lambda = lambda;
    this.inv = new Float64Array(dim * dim);
    for (let i = 0; i < dim; i++) this.inv[i * dim + i] = 1 / lambda;
  }
  _quad(u) {
    const d = this.d, inv = this.inv, w = new Float64Array(d);
    if (u.length !== d) throw new Error(`EdgeSpan: embedding dim ${u.length} ≠ span dim ${d} (mixed backends?)`);
    for (let i = 0; i < d; i++) {
      let s = 0; const row = i * d;
      for (let j = 0; j < d; j++) s += inv[row + j] * u[j];
      w[i] = s;
    }
    let q = 0;
    for (let i = 0; i < d; i++) q += u[i] * w[i];
    return { q, w };
  }
  noveltyOf(u) { return clamp01(this.lambda * this._quad(u).q); }   // ∈(0,1]: 1 = new direction, →0 covered
  add(u) {                                                          // → the closed-form log-det gain
    const { q, w } = this._quad(u);
    const d = this.d, inv = this.inv, c = 1 / (1 + q);
    for (let i = 0; i < d; i++) {
      const wi = w[i] * c, row = i * d;
      for (let j = 0; j < d; j++) inv[row + j] -= wi * w[j];
    }
    return Math.log(1 + q);
  }
}

// ── the item-coverage event channel ──────────────────────────────────────────────────────────────
// The division of labour, settled by calibration (24 Jul — each level does what its geometry can):
//   novelty — per WORD. A repeated word is exactly covered (identical string → identical embedding);
//     a synonym is near-covered (neural catches what string-match cannot); a genuinely new word is
//     not. This is where circling collapses and sharpening stands out.
//   tether  — per TURN, utterance-embedding cosine to the goal utterance, as a BINARY gate. Sentence
//     level is where MiniLM is in-distribution; it separates drift (≈0.00–0.09) from on-topic (≥0.15)
//     cleanly. It is a gate, never a multiplier: a circling learner echoes the goal's own wording and
//     scores HIGHER rel than a developing one, so multiplying would invert the reading.
//   (Per-word edge-relevance was tried and is DEAD: single isolated words are out-of-distribution for
//    a sentence-transformer — anisotropy compresses word-word cosines onto a ~0.2 floor, and the
//    measured related-vs-unrelated gap was ~0.03. Recorded here so it is not re-tried innocently.)
//
//   novelty(w)    = 0 if the exact string was said before, else 1 − max cos(w, P)
//   semGain(turn) = tetherPass × Σ novelty(w)  over the turn's items (submodular: items enter P after
//                                              scoring, so repetition decays across the dialogue)
//
// sequence: temporal order, [{ score, text, embed, items: [{ w, embed }] }] — score:true only for the
// learner's own turns; a score:false turn (the stone's) contributes its items to P but is never read.

// Function-word skip for ITEMS ONLY (signals.mjs's content() stays untouched — its thin STOP list is
// tuned for specificity, not for novelty mass). Without this, "quite/been/also/thats" carry ~0.2
// novelty each and drown the real words.
const ITEM_SKIP = new Set(('would could should been being having quite very really rather thing things stuff also like just yeah yep nah dunno thats gonna wanna want guess many much more most some other another still even ever never always maybe there here what when where which while these those them they were was will cant dont wont didnt doesnt isnt arent im ive its lets let else only well say said says see seem seems feel feels felt look looks looked make makes made too lot lots bit way').split(' '));
export const itemWords = (text) => [...new Set(content(text))].filter((w) => !ITEM_SKIP.has(w.replace(/'/g, '')));

export function readFeltShifts({
  goalEmbed = null, goalItems = [], sequence = [],
  semFloor = 2.0, jumpFactor = 1.3, tetherFloor = 0.12, lexNoveltyFloor = 0.3,
} = {}) {
  // semFloor 2.0 encodes "a shift brings a CLUSTER of new material" — one or two incidental new words
  // (~0.6–1.4 in calibration) are conversation, not a shift; a real shift measured 3.3–6.8. Gendlin-
  // faithful: the felt shift arrives as a rush of new articulation, not a stray word.
  const priorEmbeds = [];                 // P — embeddings of every item said so far
  const priorWords = new Set();           // exact-string shortcut (identical word = covered, free)
  const seedItem = (it) => { if (it && it.embed) { priorEmbeds.push(it.embed); priorWords.add(it.w); } };
  goalItems.forEach(seedItem);            // restating the goal's own words is never novel

  const span = goalEmbed ? new EdgeSpan(goalEmbed.length) : null;
  if (span) span.add(goalEmbed);

  const noveltyOf = (it) => {
    if (priorWords.has(it.w)) return 0;
    let m = 0;
    for (const p of priorEmbeds) { const c = cosine(it.embed, p); if (c > m) m = c; }
    return clamp01(1 - m);
  };

  const turns = [];
  const semHist = [];                     // semGain history of SCORED turns (the event baseline)
  let totalGain = 0;

  for (const item of sequence) {
    if (!item) continue;
    const items = item.items || [];
    if (!item.score) { items.forEach(seedItem); if (span && item.embed) span.add(item.embed); continue; }

    // score BEFORE the turn's items enter P (a turn cannot cover itself)
    const scored = items.map((it) => ({ w: it.w, novelty: noveltyOf(it) }));
    const rawGain = scored.reduce((a, s) => a + s.novelty, 0);
    // the tether gate: on the edge (or near it), per the turn's UTTERANCE embedding. Fail = the turn
    // is somewhere else entirely (drift); its words still enter P (they were said) but score nothing.
    const rel = goalEmbed && item.embed ? Math.max(0, cosine(item.embed, goalEmbed)) : 1;
    const tethered = rel >= tetherFloor;
    const semGain = tethered ? rawGain : 0;
    const fresh = scored.filter((s) => s.novelty > 0.1).sort((a, b) => b.novelty - a.novelty);

    // SEM — the coverage gain clears the floor AND jumps above the recent texture. Warm-up: never on
    // the first scored turn (the opening articulation is the baseline forming, not a shift against one).
    const recent = semHist.slice(-3);
    const recentMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    const semEvent =
      semHist.length >= 1 && semGain >= semFloor && semGain >= jumpFactor * recentMean ? semGain : 0;

    // LEX — insight not outweighed by hedging, on a real sentence, tethered to the edge, with at
    // least one genuinely new word (anti-spoof: a bare "actually" pasted on a paraphrase has no new
    // item to carry it).
    const text = String(item.text || '');
    const ins = countPhrases(text, INSIGHT);
    const hed = countPhrases(text, HEDGE);
    const hasNewWord = scored.some((s) => s.novelty >= lexNoveltyFloor);
    const lexEvent = ins >= 1 && hed <= ins && content(text).length >= 4 && hasNewWord && tethered ? 1 : 0;

    const gain = span && item.embed ? span.add(item.embed) : 0;   // the smooth log-det trajectory
    totalGain += gain;
    items.forEach(seedItem);
    semHist.push(semGain);

    turns.push({
      semGain: +semGain.toFixed(4), rel: +rel.toFixed(4), gain: +gain.toFixed(4),
      semEvent: +semEvent.toFixed(4), lexEvent,
      newWords: fresh.slice(0, 4).map((s) => ({ w: s.w, novelty: +s.novelty.toFixed(2) })),   // inspectable
      // invariant-#7-safe descriptors: the ARTICULATION, never the person
      why: semEvent ? 'new, edge-relevant material entered the articulation'
         : lexEvent ? 'the words settled — an insight named without hedging'
         : null,
    });
  }
  return { turns, totalGain: +totalGain.toFixed(4) };
}
