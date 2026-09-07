// retrieval.mjs — Part B domain corpus: FTS5 build + query.
// Exact-token / phrase matching (architecture.md §5.2). NO stemming, NO embeddings:
// Clean Language reuses the learner's literal words, so retrieval is literal too.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Parse a domain markdown file into entries delimited by "## entry: <id>".
function parseEntries(md, sourceFile) {
  const blocks = md.split(/\n## entry:/).slice(1); // first chunk is the file header
  return blocks.map((block) => {
    const lines = block.split('\n');
    const id = lines[0].trim();
    const field = (name) => {
      const m = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
      return m ? m[1].trim() : '';
    };
    // body = everything after the bold fields, used for display + indexing
    return {
      id,
      sourceFile,
      discipline: field('discipline'),
      // 'making' marks an entry whose tension cannot be taken up without deciding how the thing gets
      // PRODUCED — fabrication, tooling, material afterlife, repair, durability. Absent on everything
      // else, which is the concept side. It exists because the learner can ask to be questioned about
      // the idea and not the execution, and a vocabulary heuristic cannot draw that line: `truth-to-
      // materials-or-the-surface` is dense with material words and is a question about honesty and
      // expression, not about production. The mark is a judgement, so it is written in the corpus where
      // it can be read and corrected, never inferred at query time.
      register: field('register'),
      vocabulary: field('vocabulary'),
      feltAs: field('felt as'),     // the colloquial / felt / oblique register — intent, not the precise term
      provenance: field('provenance') || 'verified', // 'verified' (three-pass + Consensus) | 'pending' (synthetic seed, citations unconfirmed). The legacy 34 omit this → verified; every NEW entry must declare 'pending'.
      tension: field('the_tension'),
      questions: field('questions_it_invites'),
      sources: field('sources'),
      body: block.trim(),
    };
  });
}

export function buildIndex(db, corpusDomainDir) {
  db.exec(`
    DROP TABLE IF EXISTS entries;
    DROP TABLE IF EXISTS entries_fts;
    CREATE TABLE entries (
      rowid INTEGER PRIMARY KEY,
      id TEXT, discipline TEXT, register TEXT, vocabulary TEXT, tension TEXT,
      questions TEXT, sources TEXT, provenance TEXT, body TEXT, source_file TEXT
    );
    -- Standalone FTS5 table. unicode61 tokeniser, conservative (no stemming).
    CREATE VIRTUAL TABLE entries_fts USING fts5(
      indexed, entry_rowid UNINDEXED, tokenize = 'unicode61'
    );
  `);

  const files = readdirSync(corpusDomainDir).filter((f) => f.endsWith('.md'));
  const insEntry = db.prepare(
    `INSERT INTO entries (rowid,id,discipline,register,vocabulary,tension,questions,sources,provenance,body,source_file)
     VALUES (@rowid,@id,@discipline,@register,@vocabulary,@tension,@questions,@sources,@provenance,@body,@source_file)`
  );
  const insFts = db.prepare(`INSERT INTO entries_fts (indexed, entry_rowid) VALUES (?, ?)`);

  let rowid = 0;
  for (const f of files) {
    const entries = parseEntries(readFileSync(join(corpusDomainDir, f), 'utf8'), f);
    for (const e of entries) {
      rowid += 1;
      insEntry.run({ rowid, source_file: f, ...e });
      // Index the parts that should match a learner's words. Intent-first: the colloquial/felt
      // "felt as" register and the vocabulary are listed here (and also live in body), so they are
      // weighted — a student's plain, groping words retrieve the tension WITHOUT needing its precise
      // term. Still pure exact-token FTS5; no embeddings, no semantic search (architecture.md §5.1/§5.2).
      insFts.run([e.vocabulary, e.feltAs, e.tension, e.body, e.questions].join('\n'), rowid);
    }
  }
  return rowid; // number of entries indexed
}

// Build a safe FTS5 MATCH expression from free text: literal tokens OR'd together.
// Quoting each token avoids FTS5 syntax errors from punctuation and reserved words.
// ONE stop list, hoisted to module scope on 7 September 2026 so the lens relevance test below measures
// coverage against EXACTLY the terms that built the MATCH. A second copy would drift, which is the
// defect class this project keeps meeting — one derivation feeding both, never two.
const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','i','im',
  'my','me','this','that','for','with','about','how','what','when','why','do','dont','cant']);

// The learner's distinct content words — the single derivation used by both the MATCH and the lens test.
export function queryTerms(text, extraTerms = []) {
  const tokens = (String(text).toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((t) => t.length > 2 && !STOP.has(t));
  return [...new Set([...tokens, ...extraTerms.map((t) => String(t).toLowerCase())])];
}

function toMatchQuery(text, extraTerms = []) {
  const all = queryTerms(text, extraTerms);
  if (all.length === 0) return null;
  return all.map((t) => `"${t}"`).join(' OR ');
}

// retrieve: returns the `limit` best-matching entries, PLUS every relevant lens (see below), each
// ranked by FTS5 bm25 with a snippet. extraTerms lets the method layer add concept keys.
//
// LENSES — cross-cutting registers that ask for no discipline. A discipline is a category a person
// belongs to; a lens is a way of looking that anyone may pick up. That is why these are the half of the
// corpus that never requires the learner to be anything in particular, and why they are not made to
// compete for the same slots as the material of a field.
//
// 🔴 REPAIRED 7 September 2026 (Prayas: "repair the lens system - they should be available but loaded
// only if relevant", then "as many as relevant"). Two faults, and the second was mine.
//
// THE FIRST: the mechanism had never run. LENS_DISCIPLINES was read only inside
// `if (discipline && discipline !== 'all')`, and `discipline` was never anything but 'all' —
// `public/index.html` initialised it and nothing reassigned it, and the criticism surface said so in
// its own comment ("Discipline picker removed (Foundation is common)"). So the branch was unreachable
// for the whole life of the feature. CLAUDE.md's note that `diy-hacking-lens.md` "must be in
// LENS_DISCIPLINES or it never fires" was true and incomplete: it never fired AS A LENS either way.
//
// THE SECOND: the old design injected every lens entry unconditionally whenever a discipline was
// selected — available ALWAYS, relevant or not. A lens firing regardless of what the learner said is a
// theme being imposed, which is the same fault as a nudge that characterises the learner.
//
// 🔴 SO: A LENS IS ADDED WHEN THE LEARNER'S OWN WORDS RANK IT, AND THERE IS NO CAP ON HOW MANY.
// Lenses do not displace the field material and are not displaced by it — the `limit` governs the
// discipline entries, and every lens the same query ranked inside the band comes with them. A turn
// where four lenses are genuinely relevant gets four. A turn where none matches gets none, and is
// composed exactly as it was before this change. ⚠️ THIS MEANS retrieve() CAN RETURN MORE THAN `limit`,
// which it could not before; the caller sizes the prompt from what it is handed, so nothing needs to
// know the number in advance.
const LENS_DISCIPLINES = ['memorability', 'slow-design', 'critical-design', 'counterculture', 'attention-economy', 'entrepreneurship', 'manufacturing', 'money-career', 'diy-hacking'];
const LENS_SET = new Set(LENS_DISCIPLINES);
export const isLensEntry = (row) => LENS_SET.has(row && row.discipline);

// How far past `limit` the ranking is examined for relevant lenses. This is a FETCH DEPTH, not the
// relevance test — the test is below and uses the scores. Kept modest because a lens that has fallen
// twelve places below the material actually being used is not relevant to this turn by any reading.
const LENS_FETCH_DEPTH = 12;

// excludeIds: tension ids served in recent turns, dropped from this turn's results so a circling
// enquiry is forced onto fresh ground. Still exact-word FTS (invariant #1) — a recency filter on the
// results, never a semantic swap. We over-fetch by excludeIds.length and backfill, so a de-correlated
// turn still returns `limit` tensions.
export function retrieve(db, text, { limit = 3, extraTerms = [], excludeIds = [], focus = null } = {}) {
  const match = toMatchQuery(text, extraTerms);
  if (!match) return [];
  // 🔴 THE DISCIPLINE FILTER IS GONE (Prayas, 7 September 2026: "remove the discipline logic fully").
  // It had been unreachable since the picker was removed, and it was carrying a latent fault: CLAUDE.md
  // named eight disciplines while the corpus holds six values — every entry in `game-design.md` declares
  // `interaction-design` and every entry in `photography.md` declares `communication-design`, so
  // selecting either would have matched nothing. Dead code with a wrong claim inside it is worse than
  // no code. ⚠️ The `discipline` FIELD on an entry stays and is now purely the LENS MARKER, read by
  // isLensEntry and by nothing else.
  let clause = '';
  const params = [match];
  // CONCEPT-ONLY (12 Aug 2026): the learner has asked to be questioned about the idea and not about
  // how it gets produced, so entries marked `**register:** making` leave the pool entirely. This is the
  // deterministic half of that request — the pool is what the question is composed FROM, so removing
  // the material is stronger than asking the model to avoid it. The guard is the other half; neither
  // alone would hold. Note this REDUCES the pool, so it can return fewer than `limit` on a making-heavy
  // enquiry, and that is correct: better a thinner question than a production question that was refused.
  if (focus === 'concept') clause += ` AND (e.register IS NULL OR e.register <> 'making')`;
  params.push(limit + excludeIds.length + LENS_FETCH_DEPTH);   // over-fetch for exclusions AND the lens scan
  const rows = db.prepare(`
    SELECT e.id, e.discipline, e.register, e.tension, e.questions, e.sources, e.provenance, e.body,
           bm25(entries_fts) AS score,
           snippet(entries_fts, 0, '«', '»', ' … ', 12) AS snippet
    FROM entries_fts f
    JOIN entries e ON e.rowid = f.entry_rowid
    WHERE entries_fts MATCH ?
    ${clause}
    ORDER BY bm25(entries_fts)
    LIMIT ?
  `).all(...params);
  const ex = new Set(excludeIds);
  const ranked = excludeIds.length ? rows.filter((r) => !ex.has(r.id)) : rows;
  return withLenses(ranked, limit, queryTerms(text, extraTerms));
}

// withLenses: the `limit` best entries, PLUS every lens that reaches the learner's words at least as
// well as the weakest of them. No cap — "as many as relevant" (Prayas, 7 September 2026).
//
// 🔴 RELEVANCE IS THE TURN'S OWN STANDARD, AND IT INVOLVES NO CHOSEN NUMBER. The turn is already
// willing to ground a question in its weakest entry; a lens reaching the learner's words at least that
// well is relevant by the standard this turn has already accepted. The asymmetry is the point of a
// lens — it asks for no discipline, so it should not have to BEAT the field material to be heard, only
// to match what is already being relied on.
//
// ⚠️ IT IS MEASURED ON DISTINCT-TERM COVERAGE AND NOT ON bm25, and that is not a preference. Two
// earlier drafts failed here and both are worth recording. A positional band of twelve returned 7.5
// entries a turn against a limit of 3 and once pulled in fourteen lenses — "inside the top fifteen" is
// not a definition of relevant when lenses are a third of the corpus. Then a bm25 floor admitted
// NOTHING, in twenty queries out of twenty: everything ranked below position `limit` scores strictly
// worse than position `limit` by construction, so "at least as good as the floor" catches only exact
// ties. A test that can never fire is worse than no test. Term coverage is the measure on which an
// entry the ranking placed lower can genuinely equal the head — bm25 also weights frequency and
// length, so a lens naming the learner's word once, in a short entry, is outranked while reaching the
// same word.
//
// 🔴 AND "AS MANY AS RELEVANT" COUNTS LENSES, NOT ENTRIES — which is what bounds this without a cap.
// A lens is a WAY OF LOOKING, so six memorability entries are one lens six times, not six relevances.
// Measured before this was added: floor-on-coverage alone returned 6.35 entries a turn against a limit
// of 3, and once fourteen, almost all of them the same lens answering the same single word. Taking the
// best-scoring entry per qualifying lens leaves the number of lenses free — every one that reaches the
// learner's words gets in, up to the nine that exist — while refusing to let one lens spend the turn.
// ⚠️ retrieve() CAN THEREFORE RETURN MORE THAN `limit`; the caller sizes the prompt from what it is
// handed, so nothing needs the number in advance.
export function withLenses(ranked, limit, terms) {
  const head = ranked.slice(0, limit);
  if (head.length < limit || !terms.length) return head;
  const covers = (row) => {
    const words = new Set(String(row.body || '').toLowerCase().match(/[a-z0-9]+/g) || []);
    return terms.reduce((n, t) => n + (words.has(t) ? 1 : 0), 0);
  };
  const floor = Math.min(...head.map(covers));      // the weakest reach this turn already accepts
  const seen = new Set(head.filter(isLensEntry).map((r) => r.discipline));
  const inHead = new Set(head.map((r) => r.id));
  const add = [];
  for (const r of ranked.slice(limit)) {
    if (!isLensEntry(r) || inHead.has(r.id)) continue;
    if (seen.has(r.discipline)) continue;           // 🔴 ONE ENTRY PER LENS — see below
    if (covers(r) < floor) continue;
    seen.add(r.discipline);
    add.push(r);
  }
  if (!add.length) return head;
  const keep = new Set([...inHead, ...add.map((r) => r.id)]);
  return ranked.filter((r) => keep.has(r.id));      // bm25 order preserved
}
