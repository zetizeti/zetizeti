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
let _loading = null;                                  // the ONE load promise — all callers share it
export let neuralReady = false;

// Promise-cached: concurrent callers during the (multi-second) model load all await the SAME promise.
// (The earlier flag-based guard had a race: a second caller arriving mid-load got null → silently fell
// back to the 256-dim deterministic vector → which the memo then CACHED, poisoning later reads with
// mixed dimensions. The felt-shift span throws on dim mismatch, so the poison would have surfaced as
// sporadic felt failures — found by inspection before it shipped, 24 Jul 2026.)
function loadExtractor() {
  if (!_loading) {
    _loading = (async () => {
      try {
        const tf = await import('@huggingface/transformers');
        // glibc runs native onnx; on any platform without it this setting keeps WASM un-proxied.
        if (tf.env?.backends?.onnx?.wasm) tf.env.backends.onnx.wasm.proxy = false;
        const ex = await tf.pipeline('feature-extraction', MODEL_ID, { quantized: true });
        neuralReady = true;
        return ex;
      } catch {
        neuralReady = false;
        return null;
      }
    })();
  }
  return _loading;
}
// Boot warm-up (listen-first-warm-async): fire at server start so no learner meets the cold load.
// Resolves true when the neural path is live; false if the model cannot load (felt stays off, app fine).
export async function warmEmbeddings() {
  return !!(await loadExtractor());
}

// Async neural embedding → an L2-normalised plain Float32-like array, or the deterministic vector on any
// failure. Mean-pooled + normalised (the standard sentence-embedding recipe for MiniLM).
// Memoised by exact string (the felt-shift item channel embeds content WORDS, which recur constantly —
// "annoying" costs one inference ever, not one per turn). Callers treat returned vectors as read-only.
const _memo = new Map();
const MEMO_CAP = 4000;
export async function embedNeural(text) {
  const key = String(text || '');
  const hit = _memo.get(key);
  if (hit) return hit;
  const ex = await loadExtractor();
  if (!ex) return embedDet(key);                 // det fallback is cheap — NEVER memoised (mixed-dim guard)
  let v;
  try {
    const out = await ex(key, { pooling: 'mean', normalize: true });
    v = Array.from(out.data);
  } catch {
    return embedDet(key);                        // transient failure → fresh det, nothing cached
  }
  if (_memo.size >= MEMO_CAP) for (const k of [..._memo.keys()].slice(0, MEMO_CAP / 2)) _memo.delete(k);
  _memo.set(key, v);                             // only genuine neural vectors enter the memo
  return v;
}
