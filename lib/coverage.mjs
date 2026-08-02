// coverage.mjs — can retrieval say THIN?
//
// 🔴 THE PROBLEM THIS EXISTS FOR (measured 2 August 2026, docs/concept/learning-mode.md §4).
// `retrieve()` returns up to `limit` rows whenever the query holds any content token at all:
// toMatchQuery ORs the tokens, bm25 ranks the result, and the score is never read. So one common
// word shared with a 4,000-character entry comes back indistinguishable from a hit on the precise
// term. Measured on the live index, "mitochondrial membrane potential assay" scored -5.96 while
// "friction and the checkout flow" scored -11.27 — a biology query inside the same band as a real
// one — and against the corpus's own thirteen named gap areas retrieval returned nothing 0/13 times.
//
// In ENQUIRY that only weakens a question. In LEARNING MODE the stone ASSERTS from retrieved
// material and is required to say where its understanding runs out — a limit nothing could source.
//
// 🔴 THIS FILE IS A SIBLING AND TOUCHES NOTHING. `retrieval.mjs` is not modified, so invariant #1
// stands exactly as written and the enquiry path is byte-identical. Everything here is pure: it
// takes the query text and the rows already at the call site, and returns a verdict made of WORDS.

import { NONMATERIAL } from './arc.mjs';

// Not the corpus's vocabulary, just the grammar of a sentence.
const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','i','im','my',
  'me','this','that','for','with','about','how','what','when','why','do','so','not','are','was',
  'be','been','has','have','had','at','by','from','as','if','then','than','there','their','they']);

export const DF_CEILING = 0.15;   // a token in >15% of entries proves nothing — "design" matches all
export const GROUNDED_MIN = 2;    // 2+ informative matches → may assert. Measured, see §4.

const tokens = (s) => (String(s || '').toLowerCase().match(/[a-z0-9]+/g) || []);

/** Document frequency over the corpus, built once. Rows are whatever `entries` holds. */
export function buildDocFreq(rows) {
  const df = new Map();
  for (const r of rows) {
    const seen = new Set(tokens([r.vocabulary, r.tension, r.body, r.questions].join(' ')));
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  return { df, n: rows.length };
}

/**
 * A token counts as INFORMATIVE when matching it says something.
 *
 * 🔴 The NONMATERIAL exclusion is load-bearing and is not housekeeping. A hedge is RARE in a
 * declarative corpus and therefore reads as informative — precisely backwards. Measured without
 * it, "i think so maybe, the matching could work on grades" scored as well-grounded, on the words
 * `think` and `maybe`. arc.mjs already maintains this list for the same reason one layer up.
 */
export function isInformative(t, { df, n }, ceiling = DF_CEILING) {
  if (t.length <= 2) return false;
  if (STOP.has(t) || NONMATERIAL.has(t)) return false;
  const d = df.get(t) || 0;
  return d > 0 && d / n < ceiling;      // absent from the corpus proves nothing either
}

/**
 * The verdict, from the query and the rows retrieval actually returned.
 *
 * grounded — 2+ informative matches in the top row   → the stone may ask AND assert
 * oblique  — exactly 1                               → ask only
 * none     — 0                                       → ask only, and §3's stated limit is REQUIRED
 *
 * 🔴 `oblique` is treated as `none` for assertion, deliberately: a question makes no claim and may
 * run on weaker ground; an assertion may not. In a mode whose named failure is performing
 * understanding it does not have, the conservative side is the correct one. `mayAssert` is the
 * single field a caller should read — the count is for the curtain and for arguing with.
 */
export function coverageOf(text, rows, freq, { ceiling = DF_CEILING, groundedMin = GROUNDED_MIN } = {}) {
  const top = rows && rows[0];
  if (!top) return { verdict: 'none', matched: [], mayAssert: false, entry: null };
  const inEntry = new Set(tokens([top.vocabulary, top.tension, top.body, top.questions].join(' ')));
  const q = [...new Set(tokens(text))];
  const matched = q.filter((t) => inEntry.has(t) && isInformative(t, freq, ceiling));
  const verdict = matched.length >= groundedMin ? 'grounded' : matched.length === 1 ? 'oblique' : 'none';
  return { verdict, matched, mayAssert: verdict === 'grounded', entry: top.id || null };
}
