// version-consistency.test.mjs — package.json and package-lock.json state the same version.
//
// 🔴 WHY THIS IS A TEST AND NOT A NOTE. On 26 August 2026 `package-lock.json` read **0.14.3** while
// `package.json` read **0.17.0**. Three minor releases had shipped without it — v0.15.0, v0.16.0,
// v0.17.0 — and each one deployed, tagged, and published to the public repo carrying a lockfile that
// disagreed with the package beside it.
//
// **Nothing caught it because nothing reads it.** The running app takes its version from `git describe`
// (lib/version.mjs), so the lockfile's field feeds no code path, no display, no boot log, and no
// endpoint. It is a field that is only ever *written* — and a value nobody reads is a value nobody
// checks. It was found by accident, because `npm install` happened to rewrite it while the deps were
// being installed for an unrelated reason, and the publish guard then refused the uncommitted change.
//
// That is the shape worth naming: the failure was not that the number was wrong. The failure was that
// there was no way to find out. The parent CLAUDE.md states it as *a version number is a claim about a
// document set, not about a file*, and warns specifically about the half that is **generated once and
// then static** — badges, screenshots, cached values, a figure written into prose. Those go stale in
// silence, because nothing rebuilds them, nothing checks them, and no test fails.
//
// This is the test that fails. It is the whole remedy: not a reminder to look, but the thing that makes
// not-looking impossible.
//
// ⚠️ Note what this deliberately does NOT do. It does not check the git tag, and it must not start to.
// `git describe` is the running version and is correct by construction; a test asserting the tag would
// fail on every commit between releases, which is most commits, and a test that cries wolf gets muted.
// What is checkable here is that two files in the tree agree with each other, which is exactly the
// thing that silently stopped being true.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name) => JSON.parse(readFileSync(join(APP, name), 'utf8'));

const pkg = read('package.json');
const lock = read('package-lock.json');

test('package.json declares a semver version', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/, `package.json version looks wrong: ${pkg.version}`);
});

test('🔴 package-lock.json top-level version matches package.json', () => {
  assert.equal(
    lock.version, pkg.version,
    `package-lock.json says ${lock.version}, package.json says ${pkg.version}. ` +
    'Run `npm install` (which rewrites the lockfile) or edit both fields, then commit. ' +
    'This drifted by three releases once because nothing read the field.',
  );
});

test('🔴 the lockfile\'s own root package entry matches too — the second copy of the same number', () => {
  // package-lock v2/v3 stores the version TWICE: once at the root, and again in packages[""].
  // Both were 0.14.3 in the 26 August drift, so checking only the first would have caught it — but a
  // future half-edit could easily fix one and not the other, which is the same fault in miniature.
  const root = lock.packages && lock.packages[''];
  assert.ok(root, 'package-lock.json has no packages[""] entry — unexpected lockfile shape');
  assert.equal(
    root.version, pkg.version,
    `package-lock.json packages[""] says ${root.version}, package.json says ${pkg.version}.`,
  );
});

test('the lockfile names this package, so the two files are actually about each other', () => {
  assert.equal(lock.name, pkg.name);
});
