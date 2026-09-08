// The admission on the public surfaces, and the figures inside it (16 August 2026).
//
// 🔴 WHY THIS IS A TEST AND NOT A NOTE. Prayas, 16 August 2026: "not good enough yet - admit on all public surfaces that we do not do what we claim to do yet." Two things then need holding, and neither holds itself. The admission has to still BE there — a later session reading self-deprecating copy will tidy it away in good faith, because nothing on the page says it is deliberate. And the figures inside it have to still be TRUE: `201 of 274` is generated once and then sits static in prose, which is the shape this project has already been bitten by. Nothing rebuilds a number written into a sentence, no test fails when the corpus grows, and the page keeps asserting last month's figure for as long as nobody looks. On a surface whose whole argument is that the numbers are checkable, a stale number is the worst available failure.
//
// So the count is read from the corpus itself and compared against what each surface claims. Sign one entry off and this suite fails until the copy is corrected, which is the only arrangement that makes the admission survive being true.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (...p) => readFileSync(join(APP, ...p), 'utf8');

// 🔴 THE PUBLISHED TREE HAS A DIFFERENT SHAPE AND THIS FILE ASSUMED THE WORKING ONE (8 Sept 2026).
// `publish-public.sh` flattens `app/` to the export root, so README.md sits BESIDE `public/` there
// and one level ABOVE it here. This suite resolved it only the working way, so it threw ENOENT at
// import time on any clone of the public repo — the whole file failing before a single assertion
// ran. Found by running the staged export rather than by reading the manifest, which is the same
// discipline as reading the staged tree instead of trusting the guard verdict. ⚠️ A test suite that
// cannot start in the repo people actually clone is worse than one that is absent: it says the code
// is broken and names the wrong thing.
const existing = (...candidates) => candidates.find((f) => { try { statSync(f); return true; } catch { return false; } });
const README = existing(join(dirname(APP), 'README.md'), join(APP, 'README.md'));

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
  { name: 'README.md', text: readFileSync(README, 'utf8') },
];

// 🔴 THE ADMISSION RULE WAS RETIRED BY PRAYAS ON 7 SEPTEMBER 2026 — *"not good enough yet goes - art is
// never good enough and always good enough both."* The 16 August rule specified exactly this removal
// condition in its own text (*"it comes down by Prayas saying so"*), so this is the rule ending as
// written rather than being tidied away, which is what its assertion existed to prevent.
//
// **Why it goes, and it is not a softening.** *Not good enough yet* presupposes a bar and a target state,
// which is a product claim. It was the last surviving piece of the service framing, one layer under the
// maturity ladder retired the same day. A made thing has no state it is falling short of.
//
// **What survives, and is asserted below.** The concrete facts stay on the page as DESCRIPTION rather than
// as confession — the method core is one note, the second voice asked two-box questions for months, and it
// was found because somebody said it felt off. Those are checkable and a reader can use them. And the
// corpus figure must still be TRUE wherever it appears, which is the half of this file that was never
// about the admission: a number written into prose is generated once and then sits static, and nothing
// rebuilds it when the corpus grows.
test('the public surfaces still say plainly where the tool stands', () => {
  for (const s of SURFACES) {
    assert.match(s.text, /Where it stands/i,
      `${s.name} dropped the section stating where the tool stands. The 16 Aug ADMISSION was retired on 7 Sep 2026 — the bar language went and the concrete facts did not.`);
    // ⚠️ The wording moved on 7 Sep 2026 after a NON-CLAUDE read (Gemini Pro) caught that removing the
    // bar language had INVERTED the sentence. `It holds people who stay patient with it and loses the
    // others` was self-criticism only while `that is the bar it has not cleared` held it in place; alone,
    // the same words read as the tool being selectively demanding — "a badge of elite, uncompromising
    // depth". The demand now sits on the tool rather than the failure on the reader, which is the whole
    // point of the sentence and was nearly lost in the retirement pass.
    assert.match(s.text, /a great deal of patience/,
      `${s.name} dropped the sentence describing what the tool asks of a person. It is a fact about the tool, not a grade against a bar — and not a boast about who it keeps.`);
  }
});

// 🔴 THE FIGURE IS NOT ON EVERY SURFACE, AND THAT IS DELIBERATE (Prayas, 16 August 2026, within hours of
// it shipping: *"dont say this. students will not use it then."*). It was on the landing page and the
// about page and it is now only in the README. Two reasons, and the second is the one that matters more.
// The audience differs — a prospective student reading "201 of 274 entries have not been read by a
// person" hears *nothing here has been checked* and closes the tab, which costs the tool the very
// students the admission was written to be honest with. And the sentence was WRONG in what it implied:
// every citation in those entries is verified before the entry ships (invariant #0, an absolute gate),
// and what is pending is Prayas's sign-off on the FRAMING. The curtain already states which of the two
// states each entry is in, per entry, in the learner's own view. So the figure survives where a reader
// wants that resolution and is stated with the distinction intact.
//
// ⚠️ What this test therefore checks is NOT "every surface carries a number". It is: wherever a figure
// appears it must be true, and at least one surface must still carry one, or the admission has quietly
// become unfalsifiable — which is the failure mode the whole thing was written against.
test('every corpus figure in the copy matches the corpus, and at least one surface carries it', () => {
  const { entries, pending } = countCorpus();
  assert.ok(entries > 0 && pending > 0, 'corpus count came back empty — the counter is broken, not the copy');
  let found = 0;
  for (const s of SURFACES) {
    const claims = [...s.text.matchAll(/(\d+)\s+of\s+the\s+(\d+)\s+(?:entries|corpus entries)/g)];
    found += claims.length;
    for (const [whole, claimedPending, claimedTotal] of claims) {
      assert.equal(Number(claimedPending), pending,
        `${s.name} says "${whole}" but ${pending} entries are pending. The corpus moved and the copy did not — correct the copy, do not relax this test.`);
      assert.equal(Number(claimedTotal), entries,
        `${s.name} says "${whole}" but the corpus holds ${entries} entries.`);
    }
  }
  assert.ok(found > 0, 'no public surface states a corpus figure any more — the admission has lost the one part of it a reader could check, and an unfalsifiable admission is the performance it was written against');
});

// The admission's whole defence is that a reader can go and check it, so a figure that cannot be
// checked against anything is worse than no figure. This asserts the counter itself still finds a
// corpus — if corpus/domain/ ever moves, the test above would pass vacuously on a zero it never saw.
test('the counter reads a real corpus, so the comparison cannot pass vacuously', () => {
  const { entries, pending } = countCorpus();
  assert.ok(entries >= 200, `expected a corpus of a few hundred entries, found ${entries}`);
  assert.ok(pending <= entries, `pending (${pending}) cannot exceed entries (${entries})`);
});


// ── THE SOCIAL CARD IS GENERATED ONCE AND THEN SITS STATIC (7 September 2026) ──────────────────────
// 🔴 `og-image.png` is a screenshot of `og-card.html`, and NOTHING REBUILDS IT. On 7 September the card
// was corrected and every meta tag with it, and the image still said *A questioning partner for design
// students* — three months old, and the most-seen surface the project has, because a link preview is
// what people meet before the page. Prayas caught it: *"the og still uses the design student
// framing..."*.
//
// This is the project's own recorded failure shape — *the dangerous half is what is generated once and
// then static: badges, screenshots, cached values. Nothing rebuilds them, nothing checks them, no test
// fails.* So this is the test that fails.
//
// Regenerate with:
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
//     --hide-scrollbars --window-size=1200,630 --screenshot=public/og-image.png og-card.html
test('the social card image is not older than the card it is a picture of', (t) => {
  // ⚠️ The card SOURCE is not published (og-card.html is off the whitelist) while the image it
  // generates is. Absent card = published clone = nothing this test can check. Present card =
  // the working tree, where it must always run.
  if (!existing(join(APP, 'og-card.html'))) return t.skip('og-card.html is not in the published export');
  const card = statSync(join(APP, 'og-card.html'));
  const img = statSync(join(APP, 'public', 'og-image.png'));
  assert.ok(img.mtimeMs >= card.mtimeMs,
    `og-image.png (${new Date(img.mtimeMs).toISOString().slice(0, 10)}) is older than og-card.html `
    + `(${new Date(card.mtimeMs).toISOString().slice(0, 10)}) — the link preview is showing text the card no longer says. `
    + 'Re-screenshot it; the command is in the comment above this test.');
});
