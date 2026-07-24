// embed.mjs — the embedding layer for the signal maths (progress-signals.md v2; measuring-the-inquiry.md).
//
// TWO backends behind ONE interface, and the interface ALWAYS works:
//
//   • deterministic (default, SYNCHRONOUS, no model, no network) — feature-hashed character 3-grams +
//     word tokens → a fixed-dimension, L2-normalised vector. Cosine over these captures lexical AND
//     morphological overlap far better than the Jaccard token-overlap it replaces (near-duplicate
//     phrasings, shared stems, reordered words), and it is fully reproducible and auditable: every
//     feature deterministically hashes to a known bucket, nothing is learned, the same text always
//     yields the same vector. This is the fallback that guarantees the tool runs everywhere — including
//     the alpine deploy image — with zero dependencies.
//
//   • neural (OPTIONAL, async, lazy) — a MiniLM sentence embedding via @huggingface/transformers on the
//     WASM backend (no native onnxruntime — musl-safe), pinned for reproducibility. Semantic, not merely
//     lexical. Loaded only if the library + model are present; ANY failure (missing dep, download error,
//     runtime fault) falls back to the deterministic vector, so a neural miss can NEVER break a turn.
//     (measuring-the-inquiry.md: reproducible-if-pinned, but not token-level interpretable — which is
//     exactly why the deterministic layer stays the auditable default and the neural one is an optional
//     sharpening, never the sole source of a signal.)
//
// The signal code (signals.mjs) uses the SYNCHRONOUS deterministic path so it stays sync and cheap; the
// neural path is available to a higher async layer that pre-computes vectors when it is enabled.

const DIM = 256;

// FNV-1a 32-bit — a fast, deterministic string hash. Two derived hashes give a bucket and a sign, so
// feature hashing is signed (collisions cancel in expectation rather than always adding — the standard
// hashing-trick refinement).
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const bucketOf = (feat) => fnv1a(feat) % DIM;
const signOf = (feat) => (fnv1a('' + feat) & 1) ? 1 : -1;

const WORD = /[a-z0-9']+/g;
const wordsOf = (s) => (String(s || '').toLowerCase().match(WORD) || []);

// Deterministic embedding: whole-word features + character 3-grams (with word-boundary markers so
// prefixes/suffixes count). Returns an L2-normalised Float64Array (a zero vector for empty text).
export function embedDet(text) {
  const v = new Float64Array(DIM);
  const add = (feat, w) => { v[bucketOf(feat)] += signOf(feat) * w; };
  for (const word of wordsOf(text)) {
    add('w:' + word, 1);                         // the word itself
    const s = '^' + word + '$';                  // boundary-marked, so ^ma / ke$ etc. carry
    for (let i = 0; i + 3 <= s.length; i++) add('c:' + s.slice(i, i + 3), 1);
  }
  let norm = 0;
  for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

// Cosine of two (already-normalised) vectors = their dot product. 0 if either is empty/zero.
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // clamp tiny FP excursions outside [-1, 1]
  return dot < -1 ? -1 : dot > 1 ? 1 : dot;
}

// Convenience: deterministic textual similarity in [0, 1] (negative cosines clamped to 0 — two texts are
// never "less than unrelated" for the stalling/convergence use). This is the drop-in successor to the old
// jaccard() in signals.mjs.
export function simText(a, b) {
  const s = cosine(embedDet(a), embedDet(b));
  return s < 0 ? 0 : s;
}

// ───────────────────────────── neural backend (optional, lazy) ─────────────────────────────
// Pinned for reproducibility. Not active unless @huggingface/transformers is installed AND the model is
// fetchable; every failure path returns the deterministic vector instead, and sets neuralReady=false so
// callers can see which backend answered. Nothing here is imported at module load — the dynamic import
// only fires on the first embedNeural() call, so requiring embed.mjs never pulls the heavy dependency.
export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';   // pinned model
let _extractor = null;
let _tried = false;
export let neuralReady = false;

async function loadExtractor() {
  if (_tried) return _extractor;
  _tried = true;
  try {
    const tf = await import('@huggingface/transformers');
    // Force the WASM backend: no native onnxruntime-node (which has no musl build for alpine).
    if (tf.env?.backends?.onnx?.wasm) tf.env.backends.onnx.wasm.proxy = false;
    _extractor = await tf.pipeline('feature-extraction', MODEL_ID, { quantized: true });
    neuralReady = true;
  } catch {
    _extractor = null;
    neuralReady = false;
  }
  return _extractor;
}

// Async neural embedding → an L2-normalised plain Float32-like array, or the deterministic vector on any
// failure. Mean-pooled + normalised (the standard sentence-embedding recipe for MiniLM).
export async function embedNeural(text) {
  const ex = await loadExtractor();
  if (!ex) return embedDet(text);
  try {
    const out = await ex(String(text || ''), { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  } catch {
    return embedDet(text);
  }
}
