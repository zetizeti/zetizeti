// sensed.mjs — the deterministic split-ratio arithmetic, ported to pure JS.
//
// This is a faithful, hand-verifiable port of the split-ratio MCP's compute layer
// (koher/tools-release/split-ratio-mcp/src/rules.py — the §145 compute layer of the
// Split-Domain Cognition canon, https://splitdomaincognition.org/split-ratio/). The MCP
// stays the CANONICAL standard; this file references it and is held to it by
// test/sensed.test.mjs, which asserts the same inputs yield the same ratios and
// conflation-ids. If this port ever drifts from the MCP, that parity test fails — that is
// the guard (ai-criticism-mode-start.md, "How zetizeti gets the locating from the MCP").
//
// Why a port and not a call: the MCP is a Python stdio process and never runs in the
// deployed web app. Re-implementing the arithmetic in JS keeps "no LLM in compute" as a
// pure-JS code boundary with no cross-runtime dependency and no per-request process spawn —
// identical in spirit to keeping retrieval pure-JS FTS5 (CLAUDE.md invariant #1).
//
// NO LLM may participate in any function here. Every reading is reconstructible by hand from
// the segments and the rules below. The tool LOCATES where description and judgement blur;
// whether a located blur is a smuggled verdict is the human's call, never the tool's.

// ── the conflation rules (rules.py STRICT_RULE / GENEROUS_RULE / BALANCED_RULE / CLAMP_RULE) ──

export const STRICT_RULE =
  "A segment is a conflation if: (a) sdc_stage is 'judgement' and judgement_held_by is 'ai' or 'shared'; OR (b) sdc_stage is 'narration' and judgement_held_by is 'ai'; OR (c) sdc_stage is 'mixed'.";
export const GENEROUS_RULE =
  "A segment is a conflation only if sdc_stage is 'judgement' AND judgement_held_by is 'ai'. AI phrasing over a human-held judgement is counted as held.";
export const BALANCED_RULE =
  "Same conflation rule as strict, but each segment contributes its 'weight' (default 1.0) so a thesis or conclusion conflation moves the needle more than an aside.";
export const CLAMP_RULE =
  "Ratios use 1-9 only. N = clamp(round(10 * share_held), 1, 9); M = 10 - N. Canon §149 excludes 10:0 and 0:10 endpoints by design.";
// ── conflation predicates (rules.py _is_strict_conflation / _is_generous_conflation) ──

function isStrictConflation(seg) {
  const stage = seg.sdc_stage;
  const held = seg.judgement_held_by;
  if (stage === 'judgement' && (held === 'ai' || held === 'shared')) return true;
  if (stage === 'narration' && held === 'ai') return true;
  if (stage === 'mixed') return true;
  return false;
}

function isGenerousConflation(seg) {
  return seg.sdc_stage === 'judgement' && seg.judgement_held_by === 'ai';
}

// rules.py _segment_weight: missing → 1.0; non-numeric → 1.0; <= 0 → 1.0.
function segmentWeight(seg) {
  let w = seg.weight;
  if (w === undefined || w === null) w = 1.0;
  const n = Number(w);
  if (!Number.isFinite(n)) return 1.0;
  return n > 0 ? n : 1.0;
}

// ── the clamp (rules.py _ratio_from_share) ──
//
// CRITICAL parity detail: Python 3's round() is round-half-to-EVEN (banker's rounding), not
// the round-half-up of JS Math.round. A 4-segment / 3-conflation record gives share=0.25,
// 10*share=2.5 exactly — Python round(2.5) === 2 (→ "2:8"), but Math.round(2.5) === 3
// (→ "3:7"). roundHalfToEven replicates Python so the port matches. Inputs here are
// 10 * share with share in [0,1], so x is always in [0,10] and x - floor(x) is exact.

function roundHalfToEven(x) {
  const floor = Math.floor(x);
  const frac = x - floor;
  if (frac < 0.5) return floor;
  if (frac > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1; // exact .5 → ties to even
}

function ratioFromShare(shareHeld) {
  let n = roundHalfToEven(10 * shareHeld);
  if (n < 1) n = 1;
  if (n > 9) n = 9;
  const m = 10 - n;
  return `${n}:${m}`;
}

// ── the "why" one-liners (rules.py _why_strict / _why_generous / _why_balanced) ──

function whyStrict(total, conflated) {
  if (conflated === 0) {
    return 'no segments meet the strict conflation rule (judgement→ai/shared, narration→ai, or mixed).';
  }
  return (
    `${conflated} of ${total} segments meet the strict conflation rule ` +
    '(judgement→ai/shared, narration→ai, or mixed).'
  );
}

function whyGenerous(total, conflated) {
  if (conflated === 0) {
    return 'no segments where AI actually held the judgement; AI phrasing over a human-held call counts as held.';
  }
  return (
    `only ${conflated} of ${total} segments are judgement-stage with ` +
    "judgement_held_by='ai'; AI phrasing elsewhere is forgiven."
  );
}

// Python f"{x:.2f}" — two decimal places. Used only in the narration string, never in a
// ratio or a located id (the parity oracle covers those). toFixed matches for the
// non-ambiguous weight sums these records carry.
const fmt2 = (x) => x.toFixed(2);

function whyBalanced(total, weightedConflation, totalWeight) {
  if (weightedConflation === 0) {
    return 'no weighted conflations; balanced reading matches strict on this record.';
  }
  return (
    `weighted conflations ${fmt2(weightedConflation)} of total weight ` +
    `${fmt2(totalWeight)} across ${total} segments — load-bearing conflations ` +
    'weigh more than asides.'
  );
}

// rules.py: `inner = record.get("split_record") or record`. Python treats an empty dict as
// falsy, so an empty split_record falls back to the record itself; a populated one is used.
function resolveInner(record) {
  const sr = record.split_record;
  const isEmptyObj =
    sr && typeof sr === 'object' && !Array.isArray(sr) && Object.keys(sr).length === 0;
  return sr && !isEmptyObj ? sr : record;
}

/**
 * Compute the three readings from a (validated) Split Record. Mirrors
 * rules.py read_split_record. Each reading is {ratio:"N:M", why:"one line"} with N+M==10,
 * both clamped to [1,9] (canon §149). Throws on a record with no segments.
 */
export function readSplitRecord(record) {
  const inner = resolveInner(record);
  const segs = Array.from(inner.segments || []);
  const total = segs.length;
  if (total === 0) {
    throw new Error('Split Record has no segments; cannot compute readings.');
  }

  const strictConflated = segs.filter(isStrictConflation).length;
  const strictShare = (total - strictConflated) / total;

  const generousConflated = segs.filter(isGenerousConflation).length;
  const generousShare = (total - generousConflated) / total;

  const totalWeight = segs.reduce((acc, s) => acc + segmentWeight(s), 0);
  const balancedConflationWeight = segs
    .filter(isStrictConflation)
    .reduce((acc, s) => acc + segmentWeight(s), 0);
  const balancedShare =
    totalWeight > 0 ? (totalWeight - balancedConflationWeight) / totalWeight : 1.0;

  return {
    strict: { ratio: ratioFromShare(strictShare), why: whyStrict(total, strictConflated) },
    balanced: {
      ratio: ratioFromShare(balancedShare),
      why: whyBalanced(total, balancedConflationWeight, totalWeight),
    },
    generous: { ratio: ratioFromShare(generousShare), why: whyGenerous(total, generousConflated) },
  };
}

// rules.py _segment_id: declared id if not None, else the index.
function segmentId(seg, index) {
  return seg.id !== undefined && seg.id !== null ? seg.id : index;
}

/**
 * Sensed-register reading of an artefact (canon "Two registers", §121-187). Mirrors
 * rules.py read_sensed. Same arithmetic as readSplitRecord, plus the ids of the segments
 * that count as conflations per reading — the located points where description and judgement
 * blur. It does NOT judge whether a located conflation is a mistake; that is the human's call.
 *
 * Labelled 'sensed_reading', never "the split ratio" (§153, reserved for a maker's
 * self-declaration). Per-instance; never aggregated (§155).
 */
export function readSensed(record) {
  const inner = resolveInner(record);
  const segs = Array.from(inner.segments || []);
  const total = segs.length;
  if (total === 0) {
    throw new Error('Split Record has no segments; cannot compute a sensed reading.');
  }

  const readings = readSplitRecord(record);

  const strictIds = segs.map((s, i) => [s, i]).filter(([s]) => isStrictConflation(s)).map(([s, i]) => segmentId(s, i));
  const generousIds = segs.map((s, i) => [s, i]).filter(([s]) => isGenerousConflation(s)).map(([s, i]) => segmentId(s, i));
  // Balanced uses the strict conflation SET; weight changes the ratio, not which segments
  // conflate — so the located points are the same as strict's.
  const balancedIds = [...strictIds];

  return {
    register: 'sensed',
    label: 'sensed_reading',
    strict: { ...readings.strict, conflation_segment_ids: strictIds },
    balanced: { ...readings.balanced, conflation_segment_ids: balancedIds },
    generous: { ...readings.generous, conflation_segment_ids: generousIds },
    note:
      "Sensed reading — never 'the split ratio' (canon §153, reserved for a " +
      "maker's self-declaration). Per-instance; never aggregated (§155). The " +
      'conflation_segment_ids LOCATE where description and judgement blur; ' +
      'whether each is a smuggled verdict is the human\'s judgement, not the ' +
      "tool's.",
  };
}

export function describeArithmetic() {
  return { strict: STRICT_RULE, balanced: BALANCED_RULE, generous: GENEROUS_RULE, clamp_rule: CLAMP_RULE };
}
