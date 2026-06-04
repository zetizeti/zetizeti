// qualify.mjs — the DETERMINISTIC, no-LLM qualification pass for the criticism surface.
//
// WHAT THIS IS. It segments a found text and tags each segment with its two SDC fields
// (sdc_stage + judgement_held_by) so the deterministic locator (lib/sensed.mjs, the ported
// split-ratio arithmetic) can find the blurs. It is the audit-survivable replacement for the
// LLM qualification pass (buildQualificationPrompt in lib/dialogue.mjs): same Split Record
// output shape, but produced by stated rules instead of a model — so the located blurs are
//   • reliable     — it cannot fail to parse or return malformed output; worst case a segment
//                    falls back to 'qualification' (a non-blur). No retries, no crash.
//   • reproducible — the same text yields the same tags every time.
//   • inspectable  — every tag carries a `why` naming the exact rule and trigger word(s), so a
//                    flagged spot can be explained by hand ("attributive evaluative 'clean' →
//                    mixed"), which is what an academic audit asks for.
//
// THE ONE EXTERNAL INPUT is part-of-speech tags from `compromise` (a pure-JS, offline,
// deterministic POS tagger — no model inference, no network). compromise tells us only what is
// a noun / adjective / copula / modal / imperative-verb. EVERY judgement that maps those parts
// of speech to an SDC stage is OUR OWN code below — the lexicons and the scan in tagSegment().
// Nothing here calls an LLM. (Lexicon seed: corpus/criticism/verdict-language-lexicon.md.)
//
// SUBTLETY without an LLM comes from reading GRAMMAR, not keywords: an evaluative adjective is
// a describe-and-decide blur ('mixed') when worn ATTRIBUTIVELY ("the clean interface") but an
// open evaluation ('judgement') when PREDICATIVE ("the interface is clean"); a modal directive
// ("you should…") or an imperative ("remove every field") is a 'judgement'; a consensus marker
// ("obviously", "best practice") relays a call as already-settled ('narration'). Hedges and
// explicit hand-backs to the reader move judgement_held_by off 'text' (→ 'shared' / 'human').

import nlp from 'compromise';

// ─────────────────────────────── the lexicons (editable, visible) ───────────────────────────────
// Evaluative adjectives/adverbs that smuggle approval-as-description. Kept deliberately curated:
// context-neutral words (minimal, modern, new, first, optional, fast, large) are EXCLUDED to hold
// down false positives — the cost of a miss is low (the human still judges), the cost of crying
// wolf is trust. Comparatives/superlatives of evaluation (better/best/worse/worst) are included.
const EVALUATIVE = new Set([
  'best', 'worst', 'better', 'worse', 'good', 'bad', 'great', 'poor', 'clean', 'intuitive',
  'elegant', 'seamless', 'frictionless', 'powerful', 'robust', 'beautiful', 'ugly', 'optimal',
  'ideal', 'perfect', 'superior', 'inferior', 'effective', 'efficient', 'innovative',
  'user-friendly', 'delightful', 'sleek', 'polished', 'cluttered', 'confusing', 'clunky',
  'messy', 'clever', 'compelling', 'engaging', 'flawless', 'pristine', 'cohesive', 'graceful',
  // moral / quality verdicts — clearly evaluative, low false-positive risk
  'ethical', 'unethical', 'moral', 'immoral', 'fair', 'unfair', 'honest', 'dishonest',
  'responsible', 'irresponsible', 'appropriate', 'inappropriate', 'proper', 'improper',
  'dignified', 'respectful', 'disrespectful', 'trustworthy', 'deceptive', 'manipulative',
  'thoughtful', 'careless', 'sloppy', 'professional', 'amateurish', 'correct', 'wrong',
  'biased', 'unbiased',   // a fairness verdict (cf. fair/unfair, honest/dishonest) — low false-positive risk
]);

// Deontic / directive markers — the text making a call FOR the reader. (Word-boundary regex.)
const DEONTIC_RE = /\b(should|shouldn't|must|mustn't|ought to|need to|needs to|have to|has to|had better|shall)\b/i;

// Consensus / factive framing — a call relayed as already-settled, no alternative in view.
const CONSENSUS = [
  'obviously', 'clearly', 'of course', 'naturally', 'evidently', 'undeniably', 'best practice',
  'best practices', 'standard practice', 'the standard approach', 'the standard way',
  'everyone knows', 'it is well known', 'as we know', 'needless to say', 'common sense',
  'self-evident', 'without question', 'goes without saying', 'as everyone knows',
];

// Hedges — the call softened / left tentative → judgement_held_by becomes 'shared'.
const HEDGE = [
  'might', 'may ', 'maybe', 'could', 'perhaps', 'possibly', 'arguably', 'tends to', 'tend to',
  'can be', 'in some cases', 'in many cases', 'sometimes', 'one option', 'some would say',
  'it seems', 'seemingly', 'more or less',
];

// Explicit hand-backs — the call openly returned to the reader → judgement_held_by becomes 'human'.
const HANDBACK = [
  'depending on', 'it is up to you', "it's up to you", 'up to you', 'you decide', 'your call',
  'you might decide', 'you may want', 'you could choose', 'your choice', 'for you to decide',
  'depends on your', 'whichever you', 'as you see fit', 'your judgement', 'your judgment',
];

const hasAny = (lower, list) => list.find((p) => lower.includes(p)) || null;

// ─────────────────────────────── deterministic segmentation ───────────────────────────────
// Split into segments WITHOUT a model, preserving each segment's text verbatim (only the
// whitespace at a split point is dropped). Sentence terminators first; then split a sentence at
// a semicolon, and before a contrastive/result connective (", but …", ", so …"), where the text
// typically turns from describing to deciding. Conservative on purpose: over-splitting invents
// boundaries, so we stop at these reliable hinges rather than parse full clause structure.
export function segmentText(text) {
  const src = String(text || '');
  const sentences = src.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || (src.trim() ? [src] : []);
  const out = [];
  for (const sentence of sentences) {
    // keep the connective WITH the following clause: split after ';' or after ',' that precedes
    // a contrastive/result conjunction. Lookbehind keeps the delimiter on the left piece.
    const parts = sentence.split(/(?<=;)\s+|(?<=,)\s+(?=(?:but|so|yet|and)\b)/i);
    for (const p of parts) {
      const t = p.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

// per-term POS view from compromise: [{text, tags:[…]}] flattened across any sentence boundaries.
function terms(segment) {
  const json = nlp(segment).json({ terms: { tags: true, post: true } });
  return json.flatMap((s) => s.terms || []).map((t) => ({
    raw: t.text || '',
    word: (t.text || '').toLowerCase().replace(/[^a-z'-]/g, ''),
    post: t.post || '',
    tags: t.tags || [],
  }));
}
const is = (t, tag) => t.tags.includes(tag);
const isEvalAdj = (t) =>
  is(t, 'Adjective') && (EVALUATIVE.has(t.word) || ((is(t, 'Comparative') || is(t, 'Superlative')) && EVALUATIVE.has(t.word)));

// ─────────────────────────────── the SDC rules (all ours) ───────────────────────────────
// Tag ONE segment. Returns { sdc_stage, judgement_held_by, why }. Precedence, high → low:
//   directive (deontic / imperative) → judgement · consensus marker → narration ·
//   predicative evaluation → judgement · attributive evaluation → mixed · else qualification.
export function tagSegment(segment) {
  const lower = segment.toLowerCase();
  const ts = terms(segment);

  // grammar signals — scan the term sequence ourselves; compromise only supplied the tags.
  let attributive = null; // evaluative adj worn as a property of a following noun
  let predicative = null; // copula + (adverb|determiner)* + evaluative adj — an open evaluation
  for (let i = 0; i < ts.length; i++) {
    if (!isEvalAdj(ts[i])) continue;
    let j = i + 1;
    while (j < ts.length && is(ts[j], 'Adjective')) j++;
    // bind the evaluative adj to a following noun as ATTRIBUTIVE — unless a comma sits directly
    // between them ("To be fair, users…"): a comma before the noun is a clause/appositive boundary,
    // not modification. A comma inside an adjective list ("the clean, simple interface") is fine —
    // the noun is then reached past an intervening adjective (j > i+1), not directly.
    if (j < ts.length && is(ts[j], 'Noun')) {
      const commaBoundary = j === i + 1 && /,/.test(ts[i].post || '');
      if (!commaBoundary) attributive = attributive || { adj: ts[i].word, noun: ts[j].word };
    }
    // back-scan from the adjective to the copula, stepping over intensifying adverbs AND
    // quantifier determiners ("is BOTH hugely biased…", "is SO clean") — they modify the
    // predicate, they don't break it. Stop at anything else.
    let k = i - 1;
    while (k >= 0 && (is(ts[k], 'Adverb') || is(ts[k], 'Determiner'))) k--;
    // a real copula (is/are/was/were) fires directly. Bare "be"/"been"/"being" — which compromise
    // tags Verb.Infinitive, NOT Copula ("might be clean", "tends to be intuitive") — fires ONLY when
    // a subject noun/pronoun precedes it, so there is something the predicate evaluates. That catches
    // hedged modal-be verdicts while leaving subjectless discourse openers ("To be honest, …") alone.
    if (k >= 0) {
      const bareBe = ['be', 'been', 'being'].includes(ts[k].word);
      const subjectBefore = ts.slice(0, k).some((t) => is(t, 'Noun') || is(t, 'Pronoun'));
      if (is(ts[k], 'Copula') || (bareBe && subjectBefore)) predicative = predicative || { adj: ts[i].word, cop: ts[k].word };
    }
  }
  // imperative: the segment opens on a base-form verb HEADING the clause — followed by an object
  // marker (determiner/pronoun/preposition: "Remove THE field", "Hide IT") or with no later finite
  // verb to be the real predicate ("Flatten navigation entirely"). This guards against a sentence-
  // initial noun-verb whose own subject+predicate follow ("Process teams ITERATE…", "Order processing
  // TAKES time") being misread as a command — compromise's own Imperative tag is unreliable here, so
  // we judge by structure. (Conscious trade: an imperative with a bare object AND a later finite verb,
  // "Remove fields that CONFUSE users", reads as non-imperative. A miss is cheap; a false command is not.)
  const firstIdx = ts.findIndex((t) => t.word);
  const first = firstIdx > -1 ? ts[firstIdx] : null;
  let imperative = false;
  if (first && is(first, 'Verb') && is(first, 'Infinitive') && !is(first, 'Copula') && !is(first, 'Modal')) {
    const next = ts[firstIdx + 1];
    const objectMarker = !!next && (is(next, 'Determiner') || is(next, 'Pronoun') || is(next, 'Preposition'));
    const laterFinite = ts.slice(firstIdx + 1).some((t) => is(t, 'Verb') && (is(t, 'PresentTense') || is(t, 'PastTense')) && !is(t, 'Gerund'));
    imperative = objectMarker || !laterFinite;
  }

  const deonticM = lower.match(DEONTIC_RE);
  const consensus = hasAny(lower, CONSENSUS);

  // judgement_held_by — resolved once, used by every non-qualification stage.
  const handback = hasAny(lower, HANDBACK);
  const hedge = hasAny(lower, HEDGE);
  const heldBy = handback ? 'human' : hedge ? 'shared' : 'text';
  const heldWhy = handback
    ? `held by reader — handed back ("${handback}")`
    : hedge
      ? `held shared — hedged ("${hedge.trim()}")`
      : 'held by the text (no hedge or hand-back)';

  if (deonticM || imperative) {
    const trig = deonticM ? `directive "${deonticM[0]}"` : `imperative "${first.raw}…"`;
    return { sdc_stage: 'judgement', judgement_held_by: heldBy, why: `${trig} — a call the text makes; ${heldWhy}.` };
  }
  if (consensus) {
    return { sdc_stage: 'narration', judgement_held_by: heldBy, why: `"${consensus}" relays a call as already-settled; ${heldWhy}.` };
  }
  if (predicative) {
    return { sdc_stage: 'judgement', judgement_held_by: heldBy, why: `predicative evaluation "${predicative.cop} ${predicative.adj}" — openly judges; ${heldWhy}.` };
  }
  if (attributive) {
    return { sdc_stage: 'mixed', judgement_held_by: heldBy, why: `evaluative "${attributive.adj}" worn as a property of "${attributive.noun}" (attributive) — describing and deciding in one breath; ${heldWhy}.` };
  }
  return { sdc_stage: 'qualification', judgement_held_by: 'n/a', why: 'neutral description — no evaluative, directive, or consensus marker.' };
}

// ─────────────────────────────── the pass ───────────────────────────────
// qualify(text) → { segments:[{id,text,origin:'text',sdc_stage,judgement_held_by,why}] }. zetizeti's
// criticism record is SOURCE-NEUTRAL: judgement_held_by is 'text' (the found TEXT held the call), not
// 'ai' — the tool questions an idea from anywhere, not necessarily a machine, and must not conflate
// "the text decided" with "this is AI-generated" (the verdict-drift guard forbids the latter). The
// split-ratio canon's v1.0 schema uses 'ai' for this slot because the canon's instance is AI-assisted
// authorship; zetizeti applies the canon ARITHMETIC to a source-agnostic object, so it speaks 'text'
// everywhere it produces, stores, and shows, and maps 'text'→'ai' ONLY at the compute boundary
// (toCanonSegments, below) so lib/sensed.mjs stays a faithful, parity-locked port of the canon MCP.
export function qualify(text) {
  let pieces = segmentText(text);
  if (pieces.length === 0) {
    const t = String(text || '').trim();
    pieces = t ? [t] : [];
  }
  const segments = pieces.map((piece, i) => {
    const tag = tagSegment(piece);
    return { id: i + 1, text: piece, origin: 'text', sdc_stage: tag.sdc_stage, judgement_held_by: tag.judgement_held_by, why: tag.why };
  });
  return { segments };
}

// The ONE place zetizeti's source-neutral vocabulary meets the split-ratio canon's. lib/sensed.mjs is
// a faithful, parity-locked port of the canon MCP (test/sensed.test.mjs cross-checks it against the
// live MCP, which speaks 'ai'); it must NOT be taught zetizeti's words. So before feeding qualify()'s
// segments to readSensed(), map zetizeti's 'text' → the canon's 'ai'. Arithmetic stays identical; the
// canon port stays untouched; only zetizeti's data model is renamed. Pass the result to readSensed().
export function toCanonSegments(segments) {
  return segments.map((s) => ({
    ...s,
    origin: s.origin === 'text' ? 'ai' : s.origin,
    judgement_held_by: s.judgement_held_by === 'text' ? 'ai' : s.judgement_held_by,
  }));
}
