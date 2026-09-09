// cinematic-read-required.test.mjs — 9 September 2026
//
// 🔴 THIS ASSERTS THE CONSUMER, NOT THE PRODUCER. A gate that exists and is never called is the exact
// shape this repository has now paid for four times: validateOutput computing a verdict nobody read, the
// opener ban never reaching the criticism route, BINARY_DEMAND unreachable from a validator that accepted
// no such option, and the identity scan that extracted zero names and reported "guards passed". So this
// does not test that --check works. It reads publish-public.sh and fails if the release path stops
// calling it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLISH = readFileSync(join(APP, '..', 'publish-public.sh'), 'utf8');
const TARBUILD = readFileSync(join(APP, 'make-caprover-tar.sh'), 'utf8');
const READER = join(APP, 'scripts', 'cinematic-read.mjs');

test('the release path CALLS the cinematic read, and aborts when it refuses', () => {
  assert.ok(existsSync(READER), 'app/scripts/cinematic-read.mjs must exist');
  assert.match(PUBLISH, /cinematic-read\.mjs --check/, 'publish-public.sh must run the cinematic read');
  // The call must be inside a failure path — running it and ignoring the exit code is a guard that reports.
  const block = PUBLISH.slice(PUBLISH.indexOf('CINEMATIC READ REQUIRED'), PUBLISH.indexOf('STUDENT-IDENTITY scan'));
  assert.match(block, /if ! \(.*--check.*\)/s, 'the exit code must be acted on, not merely produced');
  assert.match(block, /\bfail\b/, 'a refusal must abort the publish');
});

test('the gate sets no threshold — it asks whether a reading was taken, not whether it was good', () => {
  const src = readFileSync(READER, 'utf8');
  const check = src.slice(src.indexOf("if (process.argv.includes('--check'))"), src.indexOf('const files = process.argv'));
  // 🔴 If a future session adds a pass mark here, this fails. What rate is too low is Prayas's scope.
  assert.doesNotMatch(check, /uptakes?\s*[<>]|mean\(|inert\s*[<>]|THRESHOLD/,
    'the --check path must not compare any figure against a threshold; that number is not this file\'s to set');
  assert.match(check, /recordedHashes\(\)\.has/, 'it must gate on a recorded reading for the current questioning');
});

test('the watched set is the questioning, and server.mjs is deliberately outside it', () => {
  const src = readFileSync(READER, 'utf8');
  const list = src.slice(src.indexOf('const QUESTIONING'), src.indexOf('const LEDGER'));
  for (const f of ['lib/dialogue.mjs', 'lib/arc.mjs', 'lib/nudge.mjs', 'lib/guard.mjs', 'corpus/method']) {
    assert.ok(list.includes(f), `${f} must be watched`);
  }
  assert.ok(!list.includes('server.mjs'),
    'server.mjs is deliberately excluded — a gate firing on every route change gets bypassed, and the reason is written beside the list');
});

test('the DEPLOY path calls it too — the tar builder is the chokepoint, not the runbook', () => {
  // `caprover deploy` ships a tarball and only make-caprover-tar.sh builds one, so gating here covers
  // every route to myplaceholder regardless of how the deploy is invoked. A line in
  // deploy-myplaceholder.txt would have been an instruction to whoever read it.
  assert.match(TARBUILD, /cinematic-read\.mjs --check/, 'make-caprover-tar.sh must run the cinematic read');
  const block = TARBUILD.slice(TARBUILD.indexOf('CINEMATIC READ REQUIRED'), TARBUILD.indexOf('APP_NAME='));
  assert.match(block, /if ! \(.*--check.*\)/s, 'the exit code must be acted on, not merely produced');
  assert.match(block, /exit 1/, 'a refusal must stop the build');
  // 🔴 No override. One would become the path everybody takes.
  assert.doesNotMatch(block, /SKIP_|FORCE|--no-check|CI=1/, 'no escape hatch — the watched set is narrow so that none is needed');
});

test('🔴 the reading is VERSIONED, and its code cannot move without the version moving', async () => {
  // Prayas, 9 Sep 2026: "version the new tests.. I want to grow them and finetune them gradually."
  // A figure is comparable only to a figure taken under the same definition, so tuning an axis without
  // bumping the version would silently turn every earlier row in the ledger into a different measurement
  // under the same column heading. That is this project's staleness fault landing inside the instrument
  // built to detect staleness. Growth costs one deliberate line; drift is refused.
  const src = readFileSync(READER, 'utf8');
  const version = src.match(/const READ_VERSION = '([^']+)'/)?.[1];
  assert.ok(version, 'the reading must declare a READ_VERSION');
  const pinned = src.match(new RegExp(`'${version.replace(/\./g, '\\.')}':\\s*'([0-9a-f]{16})'`))?.[1];
  assert.ok(pinned, `READ_HASHES must pin a hash for ${version} — run: node scripts/cinematic-read.mjs --seal`);

  const { execFileSync } = await import('node:child_process');
  const live = execFileSync('node', ['scripts/cinematic-read.mjs', '--seal'], { cwd: APP, encoding: 'utf8' })
    .match(/hash ([0-9a-f]{16})/)?.[1];
  assert.equal(live, pinned,
    `the measurement code has changed but READ_VERSION is still ${version}. Bump it, add a dated line to the HISTORY block saying what changed and why, and re-pin with --seal. Old ledger rows stay readable only because they name the version that produced them.`);

  assert.match(src, new RegExp(`^//\\s+${version.replace(/\./g, '\\.')}\\s+\\d`, 'm'),
    `the HISTORY block must carry a dated entry for ${version}`);
});

test('every recorded reading names the version that produced it', () => {
  const ledger = join(APP, '..', 'docs', 'ops', 'cinematic-reads.md');
  if (!existsSync(ledger)) return;                       // nothing recorded yet is not a failure
  const entries = readFileSync(ledger, 'utf8').split(/^## /m).slice(1);
  for (const e of entries) {
    const head = e.split('\n').slice(0, 4).join(' ');
    assert.match(head, /reading: v\d+\.\d+\.\d+/,
      `a ledger entry has no reading version, so its figures cannot be compared with anything: ${e.split('\n')[0]}`);
  }
});
