// deploy-target.test.mjs — every runnable deploy command in this project names `myplaceholder`.
//
// 🔴 WHY THIS IS A TEST AND NOT A NOTE. zetizeti moved off `blevn` on 24 July 2026, and on 15 August
// three runnable `caprover deploy -n blevn` lines were still sitting in the runbook and in CLAUDE.md's
// commit ritual — four weeks later, in the two places somebody actually copies a command from.
//
// **blevn is not gone.** It is a live CapRover machine carrying `sdc-site` (splitdomaincognition.org)
// and `zariia` (zariia.org). So the stale flag does not error, does not 404, and does not warn: it
// authenticates against a real machine, uploads, deploys zetizeti over somebody else's droplet, and
// prints "success". That is the parent CLAUDE.md's §73 failure exactly — *a runbook naming the
// wrong-but-existing server does not fail, it succeeds somewhere else* — and it is unrecoverable by
// reading the output, because the output is indistinguishable from a correct deploy.
//
// `make-caprover-tar.sh` had also been printing "blevn is gone" after every build since the migration,
// which is worse than saying nothing: it retires the question. Anyone who wondered whether a `-n blevn`
// line was dangerous read that sentence and concluded it could only fail.
//
// The name propagates by COPYING, so it is never in one file and a one-off repair does not hold. This
// test is the thing that holds it.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));   // …/app
const ROOT = dirname(APP);                                      // …/zetizeti.com

export const DEPLOY_TARGET = 'myplaceholder';

// `caprover deploy -n <name>` — the runnable form. Prose mentioning blevn is fine and often correct
// (the runbook explains WHY the flag matters by naming what lives there), so this deliberately matches
// the command rather than the word.
const DEPLOY_CMD = /caprover\s+deploy\s+(?:[^\n]*?\s)?-n\s+([A-Za-z0-9_<>-]+)/g;

// A documentation placeholder is not a target. self-hosting.md tells a self-hoster to use their own
// machine, which is right and must not be rewritten to ours.
const PLACEHOLDERS = new Set(['<machine>', '<server>', '<name>', '<your-machine>']);

const SKIP_DIRS = new Set(['node_modules', '.git', 'db', 'vendor', 'flow-probe-runs']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (/\.(md|txt|sh|mjs|js|json|html)$/.test(name)) out.push(full);
  }
  return out;
}

// 🔴 The working repo has CLAUDE.md, docs/ and funding/ at ROOT; the PUBLISHED export's root is the
// contents of app/, so none of those exist there. Scan whatever is present and never fail on absence —
// otherwise this test, published wholesale with verification/, would break the public repo's suite for
// a file that is private by design.
function targets() {
  const files = walk(APP);
  for (const extra of ['CLAUDE.md', 'docs', 'README.md']) {
    const p = join(ROOT, extra);
    if (!existsSync(p)) continue;
    if (statSync(p).isDirectory()) walk(p, files); else files.push(p);
  }
  return files;
}

test(`every runnable deploy command names ${DEPLOY_TARGET}`, () => {
  const wrong = [];
  for (const file of targets()) {
    // The test's own explanatory prose quotes the bad command on purpose.
    if (file.endsWith('deploy-target.test.mjs')) continue;
    let text; try { text = readFileSync(file, 'utf8'); } catch { continue; }
    if (!text.includes('caprover')) continue;
    for (const m of text.matchAll(DEPLOY_CMD)) {
      const machine = m[1];
      if (machine === DEPLOY_TARGET || PLACEHOLDERS.has(machine)) continue;
      const line = text.slice(0, m.index).split('\n').length;
      wrong.push(`${relative(ROOT, file)}:${line} → -n ${machine}`);
    }
  }
  assert.deepEqual(wrong, [],
    `deploy commands naming a machine other than ${DEPLOY_TARGET}:\n  ${wrong.join('\n  ')}\n\n` +
    `blevn is a LIVE machine carrying sdc-site and zariia. A wrong -n here does not fail — it deploys ` +
    `zetizeti onto somebody else's droplet and prints success.`);
});

test('nothing claims blevn is gone', () => {
  // The specific false sentence that made the stale commands look harmless. It was printed by the build
  // script after every single tarball for three weeks.
  for (const file of targets()) {
    if (file.endsWith('deploy-target.test.mjs')) continue;
    let text; try { text = readFileSync(file, 'utf8'); } catch { continue; }
    assert.ok(!/blevn\s+(is|was)\s+gone/i.test(text),
      `${relative(ROOT, file)} claims blevn is gone. It is not — it carries sdc-site and zariia, which is ` +
      `precisely why a stale deploy flag is dangerous rather than harmless.`);
  }
});

test('the build script tells the operator the right machine', () => {
  const sh = readFileSync(join(APP, 'make-caprover-tar.sh'), 'utf8');
  assert.match(sh, new RegExp(`caprover deploy -n ${DEPLOY_TARGET}`),
    'make-caprover-tar.sh must print the correct deploy command — it is the last thing seen before deploying');
});
