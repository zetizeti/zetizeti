// The admission on the public surfaces, and the figures inside it (16 August 2026).
//
// 🔴 WHY THIS IS A TEST AND NOT A NOTE. Prayas, 16 August 2026: "not good enough yet - admit on all public surfaces that we do not do what we claim to do yet." Two things then need holding, and neither holds itself. The admission has to still BE there — a later session reading self-deprecating copy will tidy it away in good faith, because nothing on the page says it is deliberate. And the figures inside it have to still be TRUE: `201 of 274` is generated once and then sits static in prose, which is the shape this project has already been bitten by. Nothing rebuilds a number written into a sentence, no test fails when the corpus grows, and the page keeps asserting last month's figure for as long as nobody looks. On a surface whose whole argument is that the numbers are checkable, a stale number is the worst available failure.
//
// So the count is read from the corpus itself and compared against what each surface claims. Sign one entry off and this suite fails until the copy is corrected, which is the only arrangement that makes the admission survive being true.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...p) => readFileSync(join(APP, ...p), 'utf8');

// The corpus is the source of truth for both figures. An entry is a `## ` heading; a pending entry
// carries the provenance line that only Prayas's sign-off removes (invariant #0).
function countCorpus() {
  const dir = join(APP, 'corpus', 'domain');
  let entries = 0, pending = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const text = readFileSync(join(dir, f), 'utf8');
    entries += (text.match(/^## /gm) || []).length;
    pending += (text.match(/^\*\*provenance:\*\* pending/gm) || []).length;
  }
  return { entries, pending };
}

const SURFACES = [
  { name: 'landing + about page (public/index.html)', text: read('public', 'index.html') },
  { name: 'README.md', text: readFileSync(join(dirname(APP), 'README.md'), 'utf8') },
];

test('every public surface still carries the admission', () => {
  for (const s of SURFACES) {
    assert.match(s.text, /does not do (this )?well enough yet|What it does not do yet|not yet good enough/i,
      `${s.name} no longer admits what the tool does not do. This is a standing rule (Prayas, 16 Aug 2026) and it comes down only when he says the 1.0 bar is cleared — not because the copy reads self-deprecating.`);
    assert.match(s.text, /stay patient with it and loses the others/,
      `${s.name} dropped the 1.0 bar sentence. It is quoted identically wherever the bar is named, deliberately — it is a standard, not prose.`);
  }
});

test('the corpus figures in the copy match the corpus', () => {
  const { entries, pending } = countCorpus();
  assert.ok(entries > 0 && pending > 0, 'corpus count came back empty — the counter is broken, not the copy');
  for (const s of SURFACES) {
    const claims = [...s.text.matchAll(/(\d+)\s+of\s+the\s+(\d+)\s+(?:entries|corpus entries)/g)];
    assert.ok(claims.length > 0, `${s.name} states no corpus figure; the admission must stay checkable`);
    for (const [whole, claimedPending, claimedTotal] of claims) {
      assert.equal(Number(claimedPending), pending,
        `${s.name} says "${whole}" but ${pending} entries are pending. The corpus moved and the copy did not — correct the copy, do not relax this test.`);
      assert.equal(Number(claimedTotal), entries,
        `${s.name} says "${whole}" but the corpus holds ${entries} entries.`);
    }
  }
});

// The admission's whole defence is that a reader can go and check it, so a figure that cannot be
// checked against anything is worse than no figure. This asserts the counter itself still finds a
// corpus — if corpus/domain/ ever moves, the test above would pass vacuously on a zero it never saw.
test('the counter reads a real corpus, so the comparison cannot pass vacuously', () => {
  const { entries, pending } = countCorpus();
  assert.ok(entries >= 200, `expected a corpus of a few hundred entries, found ${entries}`);
  assert.ok(pending <= entries, `pending (${pending}) cannot exceed entries (${entries})`);
});
