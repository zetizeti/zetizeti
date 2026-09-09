// stamp-test-badge.mjs — 9 September 2026
//
// WHY. The README's tests badge read "285 passing" while the suite was 510 — 225 tests out of date, on
// the public front page, for an unknown number of releases. Nothing rebuilt it, no test failed, and it
// kept asserting the old number for as long as nobody looked. That is this project's own named failure
// shape: what is generated once and then static goes stale in SILENCE — badges, screenshots, cached
// values, a figure written into prose.
//
// So the number is no longer typed by anybody. This runs the suite, reads the count the runner itself
// reports, and writes it into the badge. Run it as part of a release, before the publish.
//
//   node scripts/stamp-test-badge.mjs           stamp it
//   node scripts/stamp-test-badge.mjs --check   exit 1 if the badge disagrees; write nothing

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const README = join(APP, '..', 'README.md');
const CHECK = process.argv.includes('--check');

let out = '';
try {
  out = execFileSync('node', ['--test', 'test/', 'verification/'], { cwd: APP, encoding: 'utf8' });
} catch (e) {
  // node --test exits non-zero on any failure; the summary is still on stdout and is what we need.
  out = (e.stdout || '') + (e.stderr || '');
}

const total = (out.match(/^# tests (\d+)$/m) || [])[1];
const failed = (out.match(/^# fail (\d+)$/m) || [])[1];
if (!total) { console.error('could not read "# tests N" from the runner — badge untouched'); process.exit(2); }
if (failed !== '0') {
  // 🔴 A BADGE IS A CLAIM THAT THEY PASS. Stamping a count taken from a failing run would put a true
  //    number under a false word, which is worse than the stale number it replaces.
  console.error(`suite is not green (${failed} failing) — refusing to stamp "passing"`); process.exit(1);
}

const text = readFileSync(README, 'utf8');
const re = /tests-(\d+)%20passing/;
const found = (text.match(re) || [])[1];
if (!found) { console.error('no tests badge found in README.md'); process.exit(2); }

if (found === total) { console.log(`badge already correct: ${total} passing`); process.exit(0); }
if (CHECK) { console.error(`badge says ${found}, suite reports ${total}`); process.exit(1); }

writeFileSync(README, text
  .replace(re, `tests-${total}%20passing`)
  .replace(/alt="\d+ tests passing"/, `alt="${total} tests passing"`));
console.log(`badge stamped: ${found} -> ${total} passing`);
