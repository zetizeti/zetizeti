// lens-registration.test.mjs — 20 September 2026
//
// WHY THIS EXISTS. A lens file does nothing until its `discipline` is named in LENS_DISCIPLINES
// (lib/retrieval.mjs). Miss that line and the entries still index, still retrieve and still rank —
// they simply never behave as a lens. No error, no failing test, nothing visible on any surface.
// The comment above LENS_DISCIPLINES already records that class of fault happening four times; it
// happened a fifth time here, while withholding.md was being written.
//
// 🔴 GENERALISED 20 September 2026, after the same fault nearly landed a sixth time while
// own-purpose.md was being written. The first cut of this file pinned `withholding` by name, which
// is an instance and not the class — and this project's own guard-parity rule says fixing an
// instance does not fix the class. A lens file declares itself in its header with the phrase
// "cross-cutting lens", which every lens file written to the template carries, so that phrase is
// now the marker of intent this test reads. Add a lens file from the template and forget the
// registration, and this fails by name.
//
// ⚠️ WHAT IT STILL CANNOT CATCH. Three registered lenses — memorability, counterculture,
// attention-economy — live in files that do not carry the header phrase, either because they
// predate the template or because they share a file with another discipline. So the check covers
// every lens written to the template and not the three that were not. A guard that does not say
// where it stops invites belief it has not earned.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isLensEntry, LENS_DISCIPLINES } from '../lib/retrieval.mjs';

const DOMAIN = join(dirname(dirname(fileURLToPath(import.meta.url))), 'corpus', 'domain');

const files = readdirSync(DOMAIN)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ name: f, text: readFileSync(join(DOMAIN, f), 'utf8') }));

const disciplinesIn = (text) =>
  [...text.matchAll(/^\*\*discipline:\*\* (.+)$/gm)].map((m) => m[1].trim());

const disciplines = new Set(files.flatMap((f) => disciplinesIn(f.text)));

// A lens file says so in its own header. That phrase is the declaration of intent.
const declaredLenses = files
  .filter((f) => f.text.slice(0, 400).includes('cross-cutting lens'))
  .flatMap((f) => [...new Set(disciplinesIn(f.text))].map((d) => ({ file: f.name, discipline: d })));

test('every registered lens name matches at least one entry in the corpus', () => {
  const dead = LENS_DISCIPLINES.filter((d) => !disciplines.has(d));
  assert.deepEqual(
    dead,
    [],
    `these names are in LENS_DISCIPLINES and match no entry, so they lens nothing: ${dead.join(', ')}`
  );
});

test('every file declaring itself a cross-cutting lens has its disciplines registered', () => {
  assert.ok(declaredLenses.length > 0, 'no file declares itself a lens — the header phrase changed');
  const unregistered = declaredLenses.filter((d) => !isLensEntry({ discipline: d.discipline }));
  assert.deepEqual(
    unregistered,
    [],
    `these files declare themselves lenses and are absent from LENS_DISCIPLINES, so their entries ` +
      `would index, retrieve and rank as ordinary field material and never behave as a lens: ` +
      unregistered.map((d) => `${d.file} (${d.discipline})`).join(', ')
  );
});
