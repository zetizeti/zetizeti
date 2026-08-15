// scripts-are-public.test.mjs — `app/scripts/` IS the public shelf. Putting a file here publishes it.
//
// Prayas, 13 August 2026: "make sure nothing is put in the scripts folder anymore" — and then, when a
// private folder was built to hold the overflow: "nothing to be withheld … what is ok with going
// public can go there."
//
// Those two together are not a ban. They are a definition. `publish-public.sh` copies five directories
// wholesale — lib, corpus, public, scripts, verification — so a file dropped into `scripts/` is
// published whether or not anybody decided to publish it. The fix is NOT to hide the folder's contents,
// because there is no hiding place in this project; it is to make the folder MEAN something. Work that
// is fine to be public goes here, and putting it here is the act of saying so.
//
// This list is that act, written down. Adding a file to `scripts/` without adding it here fails, and
// the failure is the question: is this fine to publish? Nearly always yes, and then the answer is one
// line. When the answer is no, the material — never the code — belongs in `docs/ops/`, which is
// publish-excluded, and the code takes it as an argument. `flow-probe.mjs` has always worked that way
// with `--replay=<fixture>`.
//
// WHAT MADE THE RULE NECESSARY, twice, and neither was catchable by content:
//   · 29 July 2026 — a real student's 41-reply tutorial transcript sat here as a probe fixture and was
//     staged for publication. After it was moved, their first name still shipped in a usage comment for
//     about four minutes, because the grep run by hand was case-sensitive.
//   · 13 August 2026 — `repair-probe.mjs` reached the v0.14.2 manifest with two of a student's
//     sentences verbatim, their project goal in their own words, and a retrieval query naming their
//     subject. **Every guard passed it**: 153 roster names checked, no hit, no forbidden filename.
//     Nothing was wrong by the rules as written. It has since been refactored to take all of that from
//     `docs/ops/fixtures/repair-probe-cases-20260812.json`, and the script itself is now public.
//
// A content guard refuses only what it recognises, and a project subject is not a name. Where a file
// sits is checkable; what it means is not. So the check moved to the shelf.
//
// A REMOVAL fails too. If a script is deleted that is a decision worth recording, and a list that
// silently re-fits itself to whatever is on disk has stopped being a declaration.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '../scripts');

/** Declared fine to publish. Recorded 13 August 2026. */
const PUBLIC_SCRIPTS = [
  'audit-criticism.mjs',
  // Drives the real /api/criticism endpoints over many rounds with a play-acted student. Carries no
  // material of its own — the document and the concept arrive as --doc= and --concept=, pointed at
  // docs/ops/fixtures/, which is publish-excluded. Added 15 August 2026.
  'critique-conversation-probe.mjs',
  'dialogue-probe.mjs',
  'featherless-arena-gens.json',
  'featherless-arena-result.json',
  'featherless-arena.mjs',
  'featherless-redo-gens.json',
  'featherless-redo.mjs',
  'feltshift-test.mjs',
  'flow-probe-result.json',
  'flow-probe.mjs',
  'flow-score.mjs',
  'focus-probe.mjs',
  'gemma-vs-flashlite-h2h.json',
  'gemma-vs-flashlite-h2h.mjs',
  'kimi-code-quality-test.mjs',
  'model-loop-compare-result.json',
  'model-loop-compare.mjs',
  // Measures the reading plan against the modulo clock it replaced, scoring whether the QUESTIONS differ
  // in kind rather than whether the route does. Carries no material: documents arrive as --docs=.
  'plan-vs-clock.mjs',
  'qwen-multiturn-result.json',
  'qwen-multiturn-test.mjs',
  'repair-probe.mjs',
  'server-probe.mjs',
  'signoff-run.txt',
  'signoff-web.mjs',
  'signoff.mjs',
  'stamp-version.mjs',
  'stress-locator.mjs',
  'sync-mcp.mjs',
];

test('every file in app/scripts/ has been declared fine to publish', () => {
  // .DS_Store is macOS, not somebody putting work here. It should still never be published, which is
  // publish-public.sh's forbidden-file guard's job rather than this one's.
  const actual = readdirSync(SCRIPTS).filter(n => n !== '.DS_Store').sort();
  const undeclared = actual.filter(n => !PUBLIC_SCRIPTS.includes(n));

  assert.deepEqual(
    undeclared, [],
    'app/scripts/ is published WHOLESALE, so anything here goes public. These have not been declared:\n  ' +
    undeclared.join('\n  ') +
    '\nIf they are fine to publish — nearly always the answer — add them to PUBLIC_SCRIPTS in this file. ' +
    'If they carry somebody else\'s material, put THAT in docs/ops/ (publish-excluded) and have the ' +
    'script take it as an argument, the way flow-probe.mjs takes --replay=<fixture>.'
  );
});

test('the declaration stays honest — a deletion must be recorded, not absorbed', () => {
  const actual = readdirSync(SCRIPTS).filter(n => n !== '.DS_Store');
  const gone = PUBLIC_SCRIPTS.filter(n => !actual.includes(n));

  assert.deepEqual(
    gone, [],
    'Declared here and no longer on disk. If the deletion was deliberate, remove them from ' +
    'PUBLIC_SCRIPTS and say why in the commit — this list is a record of decisions, and one that ' +
    'quietly re-fits itself to the directory has stopped being a declaration:\n  ' + gone.join('\n  ')
  );
});
