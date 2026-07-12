#!/usr/bin/env node
// sync-mcp.mjs — keep lib/sensed.mjs in sync with the canonical split-ratio MCP.
//
// WHAT THIS IS. lib/sensed.mjs is a hand-written JS port of the MCP's arithmetic
// (koher/tools-release/split-ratio-mcp/src/rules.py). The MCP is the canonical standard; the
// port must not drift from it. This script TRACKS the MCP's development (the MCP is in Dropbox
// with no git, so tracking is by content hash + a stored baseline snapshot) and helps APPLY
// updates to stay in sync.
//
// WHAT IT CANNOT DO, BY DESIGN. It will not auto-translate a Python arithmetic change into JS.
// That would put a machine inside the compute boundary the whole tool is built to keep
// LLM-free (CLAUDE.md invariant #1/#5), and would silently rewrite load-bearing code. So a
// change to the LOGIC of rules.py is DETECTED and shown, never auto-ported — a human ports it,
// then runs `--accept`. The live parity test (verification/sensed.test.mjs, layer 3) is the proof that
// the port matches the Python MCP; this script runs it and refuses to record a baseline unless
// it passes.
//
// USAGE (from app/):
//   node scripts/sync-mcp.mjs            check drift + run parity, report, exit 1 if out of sync
//   node scripts/sync-mcp.mjs --diff     show what changed in rules.py since the last baseline
//   node scripts/sync-mcp.mjs --apply-strings   auto-sync ONLY the verbatim rule-doc strings
//   node scripts/sync-mcp.mjs --accept   record the current MCP state as the synced baseline
//                                        (allowed only when parity passes)
//   SPLIT_RATIO_MCP_SRC=/path/to/split-ratio-mcp/src  override the MCP source location

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..'); // app/
const LIB = join(APP, 'lib');

const MCP_SRC =
  process.env.SPLIT_RATIO_MCP_SRC ||
  '/home/prayas/Dropbox/personal_projects/koher/tools-release/split-ratio-mcp/src';
const RULES_PY = join(MCP_SRC, 'rules.py');

const MANIFEST = join(LIB, 'sensed.mcp-sync.json'); // recorded synced state
const BASELINE = join(LIB, 'sensed.mcp-baseline.py'); // rules.py as of last sync (for --diff)
const PORT = join(LIB, 'sensed.mjs');

const C = { red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// ── extract the four canonical rule-doc strings from a rules.py source ──
// They are written as `NAME = ( "..." "..." )` — parenthesised, implicitly-concatenated
// double-quoted literals. We join the literals to recover the full string.
function extractRuleStrings(pySource) {
  const names = ['STRICT_RULE', 'GENEROUS_RULE', 'BALANCED_RULE', 'CLAMP_RULE'];
  const out = {};
  for (const name of names) {
    // Close on a `)` that sits on its own line — the assignment's closing paren — NOT the first
    // inner paren (the rule texts contain (a)/(b)/(c) and clamp(round(...))).
    const block = pySource.match(new RegExp(`^${name}\\s*=\\s*\\(([\\s\\S]*?)^\\s*\\)\\s*$`, 'm'));
    if (!block) { out[name] = null; continue; }
    const parts = [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    out[name] = parts.join('');
  }
  return out;
}

// the same four constants, as the port currently holds them
async function portRuleStrings() {
  const m = await import(`${PORT}?t=${sha(readFileSync(PORT)).slice(0, 8)}`); // bust cache on change
  return { STRICT_RULE: m.STRICT_RULE, GENEROUS_RULE: m.GENEROUS_RULE, BALANCED_RULE: m.BALANCED_RULE, CLAMP_RULE: m.CLAMP_RULE };
}

function readManifest() {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;
}

function runParity() {
  const res = spawnSync('node', ['--test', 'verification/sensed.test.mjs'], { cwd: APP, encoding: 'utf8' });
  const out = res.stdout || '';
  const fail = Number((out.match(/^# fail (\d+)/m) || [])[1] ?? 'NaN');
  const skipped = Number((out.match(/^# skipped (\d+)/m) || [])[1] ?? '0');
  const liveRan = /LIVE parity/.test(out) && skipped === 0;
  return { passed: res.status === 0 && fail === 0, fail, liveRan, raw: out };
}

// ── modes ──
const mode = process.argv[2] || '--check';

function requireMcp() {
  if (!existsSync(RULES_PY)) {
    console.error(`${C.red}MCP source not found:${C.off} ${RULES_PY}`);
    console.error(`Set SPLIT_RATIO_MCP_SRC to the split-ratio-mcp/src directory.`);
    process.exit(2);
  }
}

function showDiff() {
  requireMcp();
  if (!existsSync(BASELINE)) {
    console.error(`${C.yellow}No baseline snapshot yet.${C.off} Run --accept once to record one.`);
    process.exit(2);
  }
  const res = spawnSync('diff', ['-u', BASELINE, RULES_PY], { encoding: 'utf8' });
  if (res.status === 0) { console.log(`${C.green}rules.py is identical to the recorded baseline.${C.off}`); return; }
  console.log(`${C.bold}Changes in rules.py since the last synced baseline:${C.off}\n`);
  console.log(res.stdout);
  console.log(`${C.yellow}Review whether this is a doc-string change (run --apply-strings) or a LOGIC change`);
  console.log(`(port it by hand into lib/sensed.mjs, then run --accept).${C.off}`);
}

async function applyStrings() {
  requireMcp();
  const canonical = extractRuleStrings(readFileSync(RULES_PY, 'utf8'));
  let src = readFileSync(PORT, 'utf8');
  let changed = 0;
  for (const [name, value] of Object.entries(canonical)) {
    if (value == null) { console.error(`${C.red}could not extract ${name} from rules.py${C.off}`); continue; }
    const js = JSON.stringify(value); // safe JS string literal
    // Anchor the terminating `;` to end-of-line: the rule texts contain inner semicolons
    // (e.g. "'shared'; OR …"), so a bare `;` would truncate the match mid-string.
    const re = new RegExp(`(export const ${name} =)[\\s\\S]*?;\\s*$`, 'm');
    if (!re.test(src)) { console.error(`${C.red}could not find ${name} in sensed.mjs${C.off}`); continue; }
    const next = src.replace(re, `$1\n  ${js};`);
    if (next !== src) { src = next; changed++; }
  }
  if (changed) {
    writeFileSync(PORT, src);
    console.log(`${C.green}Synced ${changed} rule-doc string(s) verbatim into lib/sensed.mjs.${C.off}`);
    console.log(`Now run the suite and ${C.bold}--accept${C.off} to record the baseline.`);
  } else {
    console.log(`${C.green}Rule-doc strings already match the MCP.${C.off}`);
  }
}

async function accept() {
  requireMcp();
  const parity = runParity();
  if (!parity.passed) {
    console.error(`${C.red}Parity test failing — refusing to record a baseline.${C.off} (${parity.fail} failing)`);
    console.error(parity.raw.split('\n').filter((l) => /not ok|mismatch/.test(l)).join('\n'));
    process.exit(1);
  }
  if (!parity.liveRan) {
    console.error(`${C.yellow}Live cross-check did not run (python3 / MCP source unavailable).${C.off}`);
    console.error(`Refusing to record a baseline without a true cross-runtime check. Install python3 / set SPLIT_RATIO_MCP_SRC.`);
    process.exit(1);
  }
  const rulesBuf = readFileSync(RULES_PY);
  writeFileSync(BASELINE, rulesBuf); // snapshot for future --diff
  const now = new Date().toISOString();
  const manifest = {
    mcp_src: MCP_SRC,
    rules_py_sha256: sha(rulesBuf),
    rules_py_mtime: statSync(RULES_PY).mtime.toISOString(),
    synced_at: now,
    parity_passed_at: now,
    note: 'lib/sensed.mjs verified against this rules.py by the live cross-check in verification/sensed.test.mjs. The MCP is canonical; the port references it.',
  };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${C.green}${C.bold}Baseline recorded.${C.off} lib/sensed.mjs is in sync with the MCP.`);
  console.log(`  rules.py sha256: ${manifest.rules_py_sha256.slice(0, 16)}…`);
  console.log(`  synced_at:       ${now}`);
}

async function check() {
  requireMcp();
  const manifest = readManifest();
  const currentSha = sha(readFileSync(RULES_PY));
  console.log(`${C.bold}split-ratio MCP sync check${C.off}`);
  console.log(`  MCP source: ${C.dim}${MCP_SRC}${C.off}`);

  // 1. content drift vs recorded baseline
  let drifted = false;
  if (!manifest) {
    console.log(`  baseline:   ${C.yellow}none recorded — run --accept to establish one${C.off}`);
    drifted = true;
  } else if (manifest.rules_py_sha256 !== currentSha) {
    console.log(`  baseline:   ${C.red}DRIFTED${C.off} — rules.py changed since ${manifest.synced_at}`);
    console.log(`              recorded ${manifest.rules_py_sha256.slice(0, 16)}…  now ${currentSha.slice(0, 16)}…`);
    drifted = true;
  } else {
    console.log(`  baseline:   ${C.green}in sync${C.off} (rules.py unchanged since ${manifest.synced_at})`);
  }

  // 2. verbatim rule-doc strings
  const canonical = extractRuleStrings(readFileSync(RULES_PY, 'utf8'));
  const port = await portRuleStrings();
  const stringMismatch = Object.keys(canonical).filter((k) => canonical[k] !== port[k]);
  if (stringMismatch.length) {
    console.log(`  rule text:  ${C.red}${stringMismatch.length} string(s) differ${C.off} (${stringMismatch.join(', ')}) — fix with --apply-strings`);
  } else {
    console.log(`  rule text:  ${C.green}verbatim match${C.off}`);
  }

  // 3. behavioural parity (the real proof)
  const parity = runParity();
  if (parity.passed && parity.liveRan) {
    console.log(`  parity:     ${C.green}PASS (live cross-check ran against the Python MCP)${C.off}`);
  } else if (parity.passed && !parity.liveRan) {
    console.log(`  parity:     ${C.yellow}pure-JS layers pass; live cross-check skipped (no python3/MCP)${C.off}`);
  } else {
    console.log(`  parity:     ${C.red}FAIL (${parity.fail} failing)${C.off} — the port no longer matches the MCP`);
  }

  const outOfSync = drifted || stringMismatch.length || !parity.passed;
  console.log('');
  if (outOfSync) {
    console.log(`${C.red}${C.bold}OUT OF SYNC.${C.off} Next: ${C.bold}--diff${C.off} to see what changed; --apply-strings for doc-string drift; port any logic change by hand; then --accept.`);
    process.exit(1);
  }
  console.log(`${C.green}${C.bold}IN SYNC.${C.off} The port matches the canonical MCP.`);
}

const run = { '--check': check, '--diff': async () => showDiff(), '--apply-strings': applyStrings, '--accept': accept }[mode];
if (!run) {
  console.error(`Unknown mode: ${mode}. Use --check | --diff | --apply-strings | --accept.`);
  process.exit(2);
}
await run();
