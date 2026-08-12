// register-lint.test.mjs — stops the concept-only filter rotting as the corpus grows.
//
// THE FAILURE THIS EXISTS TO PREVENT, and it has happened here before in a different field. An entry
// with no `**register:**` line defaults to the CONCEPT side — askable. So the next production tension
// anybody writes leaks straight through the filter: no error, no failing test, no log line, and a
// student who asked not to be questioned about making is questioned about making.
//
// That is the exact shape of the legacy-provenance bug. Eighteen entries carried no `provenance` line,
// `retrieval.mjs` parsed them as VERIFIED, and the curtain told students "framing verified" for entries
// nobody had read — live until 2 August 2026. Prayas settled it with "no legacy is pending": a default
// that silently upgrades is worse than a missing field, because nothing fails and nobody looks.
//
// The same answer, adapted. Requiring every one of 274 entries to declare a register would be the
// stricter fix and is not proportionate — most of the corpus is obviously concept-side. So this lint
// catches the dangerous direction only: an entry whose OWN vocabulary is dense with production terms
// and which carries no register mark. That is a judgement call left unmade, and it should fail loudly
// rather than default quietly to askable.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CORPUS = join(dirname(fileURLToPath(import.meta.url)), '../corpus/domain');

// Deliberately narrower than the guard's MAKING list: this reads an entry's declared VOCABULARY, not a
// question, so it can afford to be specific. Two or more distinct hits is the threshold — one stray
// "material" in a conceptual tension is not a production entry, and `truth-to-materials-or-the-surface`
// is the standing proof that a single material word means nothing.
const PRODUCTION_VOCAB = /\b(manufactur\w*|factory|factories|tooling|mould\w*|fabricat\w*|production|mass-produc\w*|batch|repair\w*|durab\w*|lifespan|disposal|recycl\w*|offcuts?|prototyp\w*|assembl\w*|weld\w*|dye\w*|fibre|loom|tenons?|dowels?|fasteners?|joinery|plywood|laminate|adhesives?)\b/gi;

function entries() {
  const out = [];
  for (const f of readdirSync(CORPUS).filter((x) => x.endsWith('.md'))) {
    const md = readFileSync(join(CORPUS, f), 'utf8');
    // Split exactly the way retrieval.mjs does, so the lint reads the same entries the index does.
    // (A `[\s\S]*?` body with a `$` terminator under the /m flag stops at the first newline — it
    // parsed every entry as one line and reported the corpus had no marks at all.)
    for (const block of md.split(/\n## entry:/).slice(1)) {
      const id = block.split('\n')[0].trim();
      const body = block;
      out.push({
        file: f,
        id,
        register: (body.match(/^\*\*register:\*\*\s*(\S+)/m) || [])[1] || null,
        vocabulary: (body.match(/^\*\*vocabulary:\*\*\s*(.*)$/m) || [, ''])[1],
      });
    }
  }
  return out;
}

const ALL = entries();

test('the corpus parses and the lint has something to read', () => {
  assert.ok(ALL.length > 250, `expected the whole corpus, parsed ${ALL.length}`);
  assert.ok(ALL.some((e) => e.register === 'making'), 'no entry marked making — the filter is a no-op');
});

test('register, where declared, is only ever `making`', () => {
  const odd = ALL.filter((e) => e.register && e.register !== 'making');
  assert.deepEqual(odd.map((e) => `${e.id}=${e.register}`), [],
    'an unrecognised register value is silently treated as concept-side by retrieval.mjs');
});

// The lint proper. Anything it catches is a JUDGEMENT NOT YET MADE, not necessarily a making entry —
// the fix is either to add `**register:** making` or, if the tension is really about meaning rather
// than production, to add the id to KNOWN_CONCEPT below with the reason. Both are one line; what is
// not allowed is leaving it undecided, because undecided resolves to askable.
const KNOWN_CONCEPT = new Map([
  ['truth-to-materials-or-the-surface', 'about honesty and expression, not about how it is produced'],
  ['truth-to-materials-or-the-dressed-surface', 'the space-design twin of the above'],
  ['grassroots-innovation-not-jugaad', 'about attribution and whose innovation counts — politics, not production'],
  ['standardise-or-fit-the-place', 'appropriate technology; a political question about local fit'],
  ['slow-fashion-or-the-livelihood', 'about labour and whose livelihood, not about how garments are made'],
  ['transparency-or-the-audit', 'supply-chain governance and disclosure, not fabrication'],
  ['the-second-hand-and-its-afterlife', 'about ownership and value in circulation'],
  ['the-atmosphere-or-the-concept', 'explicitly about atmosphere versus concept'],
  ['the-method-or-the-judgement', 'about design method versus judgement'],
  ['is-photography-art', 'a question about the status of the medium'],
  ['the-print-as-object', 'about the image as object, not about printing as production'],
  ['knowing-by-making', 'making as a way of knowing — epistemology, and marking it would be the wrong irony'],
  ['sketching-and-fidelity', 'prototyping as thinking, not as production'],
  ['conserve-as-found-or-restore-to-an-ideal', 'conservation ethics'],
  ['solutionism-or-staying-with-the-trouble', 'about whether to intervene at all'],
  ['design-thinking-and-its-critics', 'about a method and its critics'],
  ['real-need-vs-manufactured-desire', 'manufactured desire is a figure of speech here'],
  ['the-mod-and-the-unpaid-hour', 'about labour and ownership of contribution'],
  ['broken-world-or-the-new-thing', 'about where design happens, not about how to repair'],
  ['the-tool-you-can-open', 'about power over tools; Illich, not DFMA'],
  ['half-a-good-thing', 'about who finishes the work and who is answerable'],
  ['the-user-who-already-solved-it', 'about whose knowledge counts'],
  ['the-maker-and-the-carer', 'about what counts as valuable work'],
  ['many-eyes-or-few-hands', 'about review and who is actually looking'],
  ['the-hands-on-imperative', 'about permission and access'],
  ['open-and-who-maintains-it', 'about obligation and where it lands'],
  ['automate-or-by-hand', 'marked making; listed here only if that mark is ever removed'],
  ['ornament-crime-and-its-shadow', 'about ornament as moral argument'],
  ['meaning-in-the-cut', 'editing; "assemble" is the cut, not fabrication'],
  ['the-index-or-the-synthetic', 'about the photographic index versus the synthesised image'],
  ['the-canonical-defended', 'about canon and memorability'],
  ['the-aesthetic-halo', 'about perceived quality'],
  ['type-as-image-vs-text', 'about legibility versus image'],
  ['the-eye-vs-the-whole-body', 'about embodied experience of space'],
  ['the-passive-envelope-or-the-active-machine', 'marked making; listed only if that mark is removed'],
]);

test('no entry carries production vocabulary while leaving its register undecided', () => {
  const undecided = ALL.filter((e) => {
    if (e.register === 'making') return false;
    if (KNOWN_CONCEPT.has(e.id)) return false;
    const hits = new Set((e.vocabulary.match(PRODUCTION_VOCAB) || []).map((x) => x.toLowerCase()));
    return hits.size >= 2;
  });
  assert.deepEqual(undecided.map((e) => `${e.file}:${e.id}`), [],
    'These entries read as production but declare no register, so the concept-only filter will serve them '
    + 'to a student who asked not to be questioned about making. Add `**register:** making`, or add the id '
    + 'to KNOWN_CONCEPT with the reason. Do not leave it undecided — undecided resolves to askable.');
});
