// lens-registration.test.mjs — 20 September 2026
//
// WHY THIS EXISTS. A lens file does nothing until its `discipline` is named in LENS_DISCIPLINES
// (lib/retrieval.mjs). Miss that line and the entries still index, still retrieve and still rank —
// they simply never behave as a lens. No error, no failing test, nothing visible on any surface.
// The comment above LENS_DISCIPLINES already records that class of fault happening four times; it
// happened a fifth time here, while withholding.md was being written.
//
// 🔴 WHAT THIS TEST DOES NOT CATCH, stated so nobody believes otherwise. It cannot see a NEW lens
// file added without registration, because nothing in an entry distinguishes a lens from a field:
// both carry a `**discipline:**` line and that is all. Catching that direction would need a marker
// declaring intent, which does not exist and is not worth inventing for one case a year. What this
// catches is the opposite direction — a registered name that matches nothing, which is what a
// rename or a deleted file leaves behind, and which is equally silent.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLensEntry, LENS_DISCIPLINES } from '../lib/retrieval.mjs';

const DOMAIN = join(dirname(dirname(fileURLToPath(import.meta.url))), 'corpus', 'domain');

const disciplines = new Set(
  readdirSync(DOMAIN)
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => [...readFileSync(join(DOMAIN, f), 'utf8').matchAll(/^\*\*discipline:\*\* (.+)$/gm)])
    .map((m) => m[1].trim())
);

test('every registered lens name matches at least one entry in the corpus', () => {
  const dead = LENS_DISCIPLINES.filter((d) => !disciplines.has(d));
  assert.deepEqual(
    dead,
    [],
    `these names are in LENS_DISCIPLINES and match no entry, so they lens nothing: ${dead.join(', ')}`
  );
});

test('the withholding lens is registered, so its entries behave as a lens', () => {
  assert.ok(disciplines.has('withholding'), 'no entry carries discipline: withholding');
  assert.ok(
    isLensEntry({ discipline: 'withholding' }),
    'withholding.md exists but is absent from LENS_DISCIPLINES, so its entries would rank as ordinary field material'
  );
});
