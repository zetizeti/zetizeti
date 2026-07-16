// version.mjs — the single source of the build version, aligned to git commits (SemVer 2.0.0).
//
// SCHEME. Annotated git tags `vMAJOR.MINOR.PATCH` are the source of truth; `git describe` turns the
// tag + commits-since into a traceable build string:
//   • exactly on a clean tag        → "0.9.0"
//   • N commits after the tag       → "0.9.0+N.g<sha>"      (SemVer build metadata)
//   • uncommitted working tree      → "…+….g<sha>.dirty"
//   • no tag yet                    → "<pkg-version>+g<sha>"
// package.json's `version` is kept in sync with the latest tag and is the fallback base.
//
// PRODUCTION has no .git (the deploy tar ships only app files), so the build STAMPS `app/version.json`
// at tar time (scripts/stamp-version.mjs, called by make-caprover-tar.sh) and the runtime reads that
// first. The stamp is never written into the working tree (git-ignored), so DEV always resolves live
// from git, and only the image carries a stamp.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..');   // lib/ → app/

const readJSON = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const pkgVersion = () => readJSON(join(APP_DIR, 'package.json'))?.version || '0.0.0';

// The build stamp written at image-build time — the ONLY source in production (no .git in the container).
const fromStamp = () => readJSON(join(APP_DIR, 'version.json'));

// Live from git — the source in dev, and the source the stamp itself is computed from at build time.
function fromGit() {
  try {
    const d = execSync('git describe --tags --long --dirty --always', { cwd: APP_DIR, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    // tagged form: v0.9.0-3-g2627d00 [ -dirty ]
    const m = d.match(/^v?(\d+\.\d+\.\d+)-(\d+)-g([0-9a-f]+)(-dirty)?$/);
    if (m) {
      const [, version, n, sha, dirty] = m;
      const clean = Number(n) === 0 && !dirty;
      const build = clean ? version : `${version}+${n}.g${sha}${dirty ? '.dirty' : ''}`;
      return { version, build, commit: sha, commits: Number(n), dirty: !!dirty, describe: d, source: 'git' };
    }
    // no tag yet: `d` is a bare short sha (optionally -dirty)
    const dirty = d.endsWith('-dirty');
    const sha = d.replace('-dirty', '');
    const version = pkgVersion();
    return { version, build: `${version}+g${sha}${dirty ? '.dirty' : ''}`, commit: sha, commits: null, dirty, describe: d, source: 'git-untagged' };
  } catch { return null; }
}

let _cached = null;
// resolveVersion() → { version, build, commit, dirty, describe, source }.
// Precedence: build stamp (production) → live git (dev) → package.json only (last resort).
export function resolveVersion() {
  if (_cached) return _cached;
  _cached = fromStamp() || fromGit() || { version: pkgVersion(), build: pkgVersion(), commit: null, commits: null, dirty: false, describe: null, source: 'pkg' };
  return _cached;
}
