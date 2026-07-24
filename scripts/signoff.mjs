#!/usr/bin/env node
// signoff.mjs — the quick Gate-4 sign-off tool (Prayas's instrument, 24 July 2026).
//
// WHY THIS EXISTS. The corpus is ~93% `pending`: the citations are already verified, but each entry's
// FRAMING still needs Prayas's human sign-off (invariant #0 — the ONLY step that flips pending →
// verified is his, never Claude's). Doing 231 by hand is the one-person-pilot bottleneck. This tool
// removes the FRICTION, not the judgement: it walks the pending entries, shows each as a compact card
// (the tension to judge + the sources + the framing-confidence), and on YOUR keystroke flips
// `**provenance:** pending` → `**provenance:** verified` on that entry and logs it. It NEVER
// auto-approves anything — every flip is a key you press.
//
// It operates only on local files on this branch (git-tracked, fully revertable), touches only the
// per-entry `**provenance:**` line inside a `## entry:` block (never the prose in a file header), and
// is resumable — re-run and only the still-pending entries appear.
//
// USAGE (run in your own terminal so it can read your keystrokes):
//   node scripts/signoff.mjs                 # interactive sign-off, all domain files
//   node scripts/signoff.mjs --file game-design.md      # one file only
//   node scripts/signoff.mjs --only-high     # show ONLY framing_confidence: high (fastest burn-down)
//   node scripts/signoff.mjs --list          # print every pending card, NO prompts (a quiet scan)
//   node scripts/signoff.mjs --count         # just the pending tally per file, nothing else
// Keys per entry:  y = sign off ·  n = skip ·  a = sign off ALL remaining in this file ·
//                  s = skip rest of this file ·  q = save & quit
//
// Scope: corpus/domain/*.md (the 231-entry bulk, cleanly structured). The 5 criticism notes have a
// different, per-file shape — do those separately; this tool deliberately does not touch them, so it
// can never mis-edit them.

import { readFileSync, writeFileSync, readdirSync, appendFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOMAIN = join(HERE, '..', 'corpus', 'domain');
const LOG = join(HERE, '..', '..', 'docs', 'corpus-build', 'signoff-log.md');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const ONLY_FILE = val('--file');
const ONLY_HIGH = has('--only-high');
const LIST = has('--list');
const COUNT = has('--count');

const PENDING = '**provenance:** pending';
const VERIFIED = '**provenance:** verified';

function stamp() {
  // second-precision, matching Prayas's log convention ("24 July 2026, 16:14:07")
  const d = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function field(block, name) {
  const m = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, 'i'));
  return m ? m[1].trim() : '';
}
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }

// Split a file into [header, ...entryBlocks] keeping each `## entry:` heading with its block.
function splitEntries(content) {
  return content.split(/(?=^## entry: )/m);
}

// Gather every pending entry across the selected files.
const files = readdirSync(DOMAIN)
  .filter((f) => f.endsWith('.md'))
  .filter((f) => !ONLY_FILE || f === ONLY_FILE || f === ONLY_FILE.replace(/\.md$/, '') + '.md')
  .sort();

const items = []; // { file, idx (block index), slug, discipline, tension, sources, confidence }
const fileState = {}; // file -> { parts: [...], dirty: false }

for (const f of files) {
  const content = readFileSync(join(DOMAIN, f), 'utf8');
  const parts = splitEntries(content);
  fileState[f] = { parts, dirty: false };
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    if (!block.includes(PENDING)) continue;
    const confidence = field(block, 'framing_confidence');
    if (ONLY_HIGH && !/^high\b/i.test(confidence)) continue;
    items.push({
      file: f, idx: i,
      slug: (block.match(/^## entry: (.+)$/m) || [, '(unknown)'])[1].trim(),
      discipline: field(block, 'discipline'),
      tension: field(block, 'the_tension'),
      sources: field(block, 'sources'),
      confidence,
    });
  }
}

// Tally (always shown).
const byFile = {};
for (const it of items) byFile[it.file] = (byFile[it.file] || 0) + 1;
const total = items.length;

console.log(`\n\x1b[1mzetizeti — Gate-4 sign-off\x1b[0m   ${total} pending${ONLY_HIGH ? ' (high-confidence only)' : ''}${ONLY_FILE ? ` in ${ONLY_FILE}` : ' across ' + Object.keys(byFile).length + ' files'}`);
for (const f of files) if (byFile[f]) console.log(`  ${String(byFile[f]).padStart(3)}  ${f}`);
console.log('');

if (COUNT) process.exit(0);
if (total === 0) { console.log('Nothing pending. \x1b[32m✓\x1b[0m\n'); process.exit(0); }

function card(it, n) {
  const conf = it.confidence.replace(/\s*—.*/, ''); // just "high" / "medium", drop the long note
  console.log(`\x1b[2m────────────────────────────────────────────────────────────\x1b[0m`);
  console.log(`\x1b[1m${it.slug}\x1b[0m  \x1b[2m·\x1b[0m ${it.file}   \x1b[2m[${n}/${total}]\x1b[0m`);
  console.log(`\x1b[36mconfidence:\x1b[0m ${conf || '(none)'}`);
  console.log(`\x1b[36mtension:\x1b[0m ${truncate(it.tension, 620)}`);
  console.log(`\x1b[36msources:\x1b[0m ${truncate(it.sources, 300)}`);
}

function signOff(it) {
  const st = fileState[it.file];
  // flip only the FIRST pending marker inside this specific entry block
  st.parts[it.idx] = st.parts[it.idx].replace(PENDING, `${VERIFIED}   <!-- signed off ${stamp()} -->`);
  st.dirty = true;
}
let flushed = false;
function flush() {
  if (flushed) return; flushed = true;
  for (const f of Object.keys(fileState)) {
    if (fileState[f].dirty) writeFileSync(join(DOMAIN, f), fileState[f].parts.join(''), 'utf8');
  }
}
// Guarantee signed-off edits persist even if stdin closes abruptly (piped input, Ctrl-D) before the
// loop ends normally. In a real terminal you press `q` and the explicit flush below runs first; this
// is the belt-and-braces for every other exit path.
process.on('exit', flush);

// LIST mode — print all cards, no prompts, then exit (a quiet scan; changes nothing).
if (LIST) { items.forEach((it, i) => card(it, i + 1)); console.log(''); process.exit(0); }

// Interactive.
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

let signed = 0, skipRestOfFile = null, approveRestOfFile = null;
const logLines = [];

for (let i = 0; i < items.length; i++) {
  const it = items[i];
  if (skipRestOfFile === it.file) continue;
  if (approveRestOfFile === it.file) { signOff(it); signed++; logLines.push(`- ${stamp()} — \`${it.slug}\` (${it.file}) — signed off (batch)`); continue; }

  card(it, i + 1);
  const a = (await ask(`\n  \x1b[1my\x1b[0m sign off · \x1b[1mn\x1b[0m skip · \x1b[1ma\x1b[0m all-in-file · \x1b[1ms\x1b[0m skip-file · \x1b[1mq\x1b[0m quit  › `)).trim().toLowerCase();
  if (a === 'q') break;
  else if (a === 's') { skipRestOfFile = it.file; }
  else if (a === 'a') { signOff(it); signed++; approveRestOfFile = it.file; logLines.push(`- ${stamp()} — \`${it.slug}\` (${it.file}) — signed off (started batch)`); }
  else if (a === 'y') { signOff(it); signed++; logLines.push(`- ${stamp()} — \`${it.slug}\` (${it.file}) — signed off`); }
  // anything else (incl. 'n' or empty) = skip
}

rl.close();
flush();

if (logLines.length) {
  const header = existsSync(LOG) ? '' : `# Gate-4 sign-off log\n\n> Each line: one entry Prayas signed off (\`pending\` → \`verified\`) via \`scripts/signoff.mjs\`. Invariant #0 — the sign-off is his.\n`;
  appendFileSync(LOG, `${header}\n### session ${stamp()}\n${logLines.join('\n')}\n`, 'utf8');
}
console.log(`\n\x1b[32m✓\x1b[0m signed off \x1b[1m${signed}\x1b[0m this session · ${total - signed} still pending${logLines.length ? `\n  logged to docs/corpus-build/signoff-log.md` : ''}\n  review the diff with:  git diff -- app/corpus/domain\n`);
