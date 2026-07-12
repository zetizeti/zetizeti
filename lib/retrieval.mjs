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
      id TEXT, discipline TEXT, vocabulary TEXT, tension TEXT,
      questions TEXT, sources TEXT, provenance TEXT, body TEXT, source_file TEXT
    );
    -- Standalone FTS5 table. unicode61 tokeniser, conservative (no stemming).
    CREATE VIRTUAL TABLE entries_fts USING fts5(
      indexed, entry_rowid UNINDEXED, tokenize = 'unicode61'
    );
  `);

  const files = readdirSync(corpusDomainDir).filter((f) => f.endsWith('.md'));
  const insEntry = db.prepare(
    `INSERT INTO entries (rowid,id,discipline,vocabulary,tension,questions,sources,provenance,body,source_file)
     VALUES (@rowid,@id,@discipline,@vocabulary,@tension,@questions,@sources,@provenance,@body,@source_file)`
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
function toMatchQuery(text, extraTerms = []) {
  const stop = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','i','im',
    'my','me','this','that','for','with','about','how','what','when','why','do','dont','cant']);
  const tokens = (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((t) => t.length > 2 && !stop.has(t));
  const all = [...new Set([...tokens, ...extraTerms.map((t) => t.toLowerCase())])];
  if (all.length === 0) return null;
  return all.map((t) => `"${t}"`).join(' OR ');
}

// retrieve: returns up to `limit` entries ranked by FTS5 bm25, with a snippet.
// extraTerms lets the method layer add concept keys (e.g. "definition","contradiction").
// Cross-cutting lenses are ALWAYS available, whatever discipline is selected (they question the
// conventional assumptions a student of any discipline brings).
const LENS_DISCIPLINES = ['memorability', 'slow-design', 'critical-design', 'counterculture', 'attention-economy', 'entrepreneurship', 'manufacturing', 'money-career'];

export function retrieve(db, text, { limit = 3, extraTerms = [], discipline = null } = {}) {
  const match = toMatchQuery(text, extraTerms);
  if (!match) return [];
  // Optional discipline focus: the selected discipline's entries + the always-on lenses.
  let clause = '';
  const params = [match];
  if (discipline && discipline !== 'all') {
    clause = `AND (e.discipline = ? OR e.discipline IN (${LENS_DISCIPLINES.map(() => '?').join(',')}))`;
    params.push(discipline, ...LENS_DISCIPLINES);
  }
  params.push(limit);
  const rows = db.prepare(`
    SELECT e.id, e.discipline, e.tension, e.questions, e.sources, e.provenance, e.body,
           snippet(entries_fts, 0, '«', '»', ' … ', 12) AS snippet
    FROM entries_fts f
    JOIN entries e ON e.rowid = f.entry_rowid
    WHERE entries_fts MATCH ?
    ${clause}
    ORDER BY bm25(entries_fts)
    LIMIT ?
  `).all(...params);
  return rows;
}
