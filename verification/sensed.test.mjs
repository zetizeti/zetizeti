// Parity test for lib/sensed.mjs — the pure-JS port of the split-ratio MCP's arithmetic.
// Run:  node --test   (from app/)   — zero dependencies, Node 20's built-in test runner.
//
// The MCP (koher/tools-release/split-ratio-mcp/src/rules.py) is the CANONICAL standard; this
// port references it. Three layers of parity:
//   1. GOLDEN — the MCP's own committed worked examples (transcribed from its test_rules.py)
//      asserted against the port. Pure JS, always runs.
//   2. BANKER'S ROUNDING — the cases where Python round() (half-to-even) diverges from JS
//      Math.round (half-up). These are the subtle drift a naive port introduces.
//   3. LIVE CROSS-CHECK — runs the real Python MCP over a battery of records and asserts the
//      port's output is identical. Skipped when python3 / the MCP source is unavailable, so the
//      default suite is pure-JS; when present it is a true cross-runtime parity guard. Point it
//      at the MCP with SPLIT_RATIO_MCP_SRC=/path/to/split-ratio-mcp/src (defaults to the known
//      koher checkout).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

import { readSplitRecord, readSensed, describeArithmetic } from '../lib/sensed.mjs';

const rec = (segments) => ({
  split_record: { version: '1.0', piece: { author: 'x', ai_assisted: true }, segments },
});

// ───────────────────────── 1. GOLDEN: the MCP's worked examples ─────────────────────────
// Transcribed verbatim from tools-release/split-ratio-mcp/tests/test_rules.py.

test('golden: all judgement held by human → 9:1 across all three readings', () => {
  const r = readSplitRecord(rec([
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  assert.equal(r.strict.ratio, '9:1');
  assert.equal(r.generous.ratio, '9:1');
  assert.equal(r.balanced.ratio, '9:1');
});

test('golden: all AI-held judgement → 1:9 (strict & generous)', () => {
  const r = readSplitRecord(rec([
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
  ]));
  assert.equal(r.strict.ratio, '1:9');
  assert.equal(r.generous.ratio, '1:9');
});

test('golden: generous forgives AI phrasing over a human-held call → 9:1', () => {
  const r = readSplitRecord(rec([
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  assert.equal(r.generous.ratio, '9:1');
  assert.equal(r.strict.ratio, '9:1');
});

test('golden: strict catches shared, generous forgives it', () => {
  const r = readSplitRecord(rec([
    { origin: 'ai_then_human', sdc_stage: 'judgement', judgement_held_by: 'shared' },
    { origin: 'ai_then_human', sdc_stage: 'judgement', judgement_held_by: 'shared' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  assert.equal(r.strict.ratio, '5:5');
  assert.equal(r.generous.ratio, '9:1');
});

test('golden: balanced weights the load-bearing thesis (aside conflation forgiven)', () => {
  const r = readSplitRecord(rec([
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human', weight: 3.0, note: 'thesis' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai', weight: 0.2, note: 'aside' },
  ]));
  assert.equal(r.strict.ratio, '5:5');
  assert.equal(r.balanced.ratio, '9:1');
});

test('golden: balanced punishes a thesis conflation', () => {
  const r = readSplitRecord(rec([
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai', weight: 3.0, note: 'thesis' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human', weight: 0.2, note: 'aside' },
  ]));
  assert.equal(r.strict.ratio, '5:5');
  assert.equal(r.balanced.ratio, '1:9');
});

test('golden: mixed counts against strict, not generous', () => {
  const r = readSplitRecord(rec([
    { origin: 'human_then_ai', sdc_stage: 'mixed', judgement_held_by: 'shared' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
    { origin: 'human', sdc_stage: 'narration', judgement_held_by: 'n/a' },
  ]));
  assert.equal(r.generous.ratio, '9:1');
  // 1 conflation of 4 → share 0.75 → 10*0.75 = 7.5 → round-half-even → 8 → "8:2".
  assert.equal(r.strict.ratio, '8:2');
});

test('golden (sensed): locates the conflation segment ids per reading', () => {
  const r = readSensed(rec([
    { id: 'a', origin: 'ai', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
    { id: 'b', origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { id: 'c', origin: 'ai', sdc_stage: 'narration', judgement_held_by: 'ai' },
  ]));
  assert.equal(r.label, 'sensed_reading');
  assert.equal(r.register, 'sensed');
  assert.deepEqual(r.strict.conflation_segment_ids, ['b', 'c']);
  assert.deepEqual(r.generous.conflation_segment_ids, ['b']);
  assert.deepEqual(r.balanced.conflation_segment_ids, ['b', 'c']); // balanced uses the strict set
});

test('golden (sensed): falls back to index when a segment has no id', () => {
  const r = readSensed(rec([
    { origin: 'ai', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
  ]));
  assert.deepEqual(r.strict.conflation_segment_ids, [1]);
});

test('golden (sensed): note never calls itself "the split ratio" (§153)', () => {
  const r = readSensed(rec([{ origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' }]));
  assert.match(r.note, /never 'the split ratio'/);
});

test('empty record throws (both entry points)', () => {
  assert.throws(() => readSplitRecord(rec([])), /no segments/);
  assert.throws(() => readSensed(rec([])), /no segments/);
});

// ───────────────────────── 2. BANKER'S ROUNDING ─────────────────────────
// Python round() is round-half-to-EVEN; JS Math.round is round-half-UP. The port must follow
// Python or it diverges on exact .5 shares.

test("banker's: 3 conflations of 4 → share 0.25 → 2.5 → round-to-even → 2 (NOT Math.round's 3)", () => {
  const r = readSplitRecord(rec([
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  // 10 * 0.25 = 2.5. Python round(2.5) == 2 → "2:8". Math.round(2.5) == 3 would give "3:7".
  assert.equal(r.strict.ratio, '2:8');
  assert.notEqual(r.strict.ratio, '3:7');
});

test("banker's: 1 conflation of 4 → share 0.75 → 7.5 → round-to-even → 8 → '8:2'", () => {
  const r = readSplitRecord(rec([
    { origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  assert.equal(r.strict.ratio, '8:2'); // floor 7 is odd → ties up to 8 (agrees with Math.round here)
});

test("clamp: a near-clean record never reports a 10:0 or 0:10 endpoint (§149)", () => {
  const allHeld = readSplitRecord(rec([{ origin: 'human', sdc_stage: 'qualification', judgement_held_by: 'n/a' }]));
  assert.equal(allHeld.strict.ratio, '9:1'); // share 1.0 → 10 → clamped to 9
  const allConflated = readSplitRecord(rec([{ origin: 'ai', sdc_stage: 'mixed', judgement_held_by: 'ai' }]));
  assert.equal(allConflated.strict.ratio, '1:9'); // share 0.0 → 0 → clamped to 1
});

test('describeArithmetic exposes the four canonical rule strings', () => {
  const d = describeArithmetic();
  assert.ok(d.strict && d.balanced && d.generous && d.clamp_rule);
  assert.match(d.clamp_rule, /1-9 only/);
});

// ───────────────────────── 3. LIVE CROSS-CHECK against the Python MCP ─────────────────────────

// Resolve via $HOME so the same default works on both Prayas's machines (Mac
// /Users/prayasabhinav, Linux /home/prayas) without an env var. An explicit
// SPLIT_RATIO_MCP_SRC still overrides. Previously hardcoded to the Linux path, which made
// the live cross-check silently SKIP on the Mac — defeating the very guard it exists to be.
const MCP_SRC =
  process.env.SPLIT_RATIO_MCP_SRC ||
  join(homedir(), 'Dropbox/personal_projects/koher/tools-release/split-ratio-mcp/src');

function pythonAvailable() {
  const v = spawnSync('python3', ['--version']);
  return v.status === 0 && existsSync(join(MCP_SRC, 'rules.py'));
}

// A combinatorial battery: every (stage × held) pair as a standalone segment, plus weighted and
// multi-segment shapes that exercise the clamp, the banker's tie, and the id/index fallback.
function buildBattery() {
  const stages = ['qualification', 'judgement', 'narration', 'mixed'];
  const helds = ['human', 'ai', 'shared', 'n/a'];
  const records = [];
  // each pair, doubled (so shares are clean fractions)
  for (const s of stages) {
    for (const h of helds) {
      records.push(rec([
        { id: 1, origin: 'ai', sdc_stage: s, judgement_held_by: h },
        { id: 2, origin: 'ai', sdc_stage: s, judgement_held_by: h },
      ]));
    }
  }
  // mixed-bag 4-seg shapes (banker's 0.25 / 0.75 ties, index fallback, string ids)
  records.push(rec([
    { id: 'a', origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { id: 'b', origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { id: 'c', origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai' },
    { id: 'd', origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
  ]));
  records.push(rec([
    { origin: 'ai', sdc_stage: 'mixed', judgement_held_by: 'shared' },
    { origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human' },
    { origin: 'human', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
    { origin: 'human', sdc_stage: 'narration', judgement_held_by: 'n/a' },
  ]));
  // weighting: thesis-vs-aside both directions, and weight edge values (0, negative, non-numeric)
  records.push(rec([
    { id: 1, origin: 'human', sdc_stage: 'judgement', judgement_held_by: 'human', weight: 3.0 },
    { id: 2, origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai', weight: 0.2 },
  ]));
  records.push(rec([
    { id: 1, origin: 'ai', sdc_stage: 'judgement', judgement_held_by: 'ai', weight: 0 },
    { id: 2, origin: 'ai', sdc_stage: 'narration', judgement_held_by: 'ai', weight: -5 },
    { id: 3, origin: 'human', sdc_stage: 'qualification', judgement_held_by: 'n/a' },
  ]));
  return records;
}

function pythonReadings(records) {
  const dir = mkdtempSync(join(tmpdir(), 'sensed-parity-'));
  const inFile = join(dir, 'records.json');
  writeFileSync(inFile, JSON.stringify(records));
  const py = [
    'import sys, json',
    `sys.path.insert(0, ${JSON.stringify(MCP_SRC)})`,
    'from rules import read_split_record, read_sensed',
    'recs = json.load(open(sys.argv[1]))',
    'out = [{"split": read_split_record(r), "sensed": read_sensed(r)} for r in recs]',
    'print(json.dumps(out))',
  ].join('\n');
  const res = spawnSync('python3', ['-c', py, inFile], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`python MCP failed: ${res.stderr}`);
  return JSON.parse(res.stdout);
}

test('LIVE parity: JS port matches the Python MCP byte-for-byte over a battery', { skip: !pythonAvailable() ? 'python3 / split-ratio MCP source not available' : false }, () => {
  const records = buildBattery();
  const fromPy = pythonReadings(records);
  records.forEach((r, i) => {
    assert.deepEqual(readSplitRecord(r), fromPy[i].split, `read_split_record mismatch on record ${i}`);
    assert.deepEqual(readSensed(r), fromPy[i].sensed, `read_sensed mismatch on record ${i}`);
  });
});
