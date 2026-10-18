// brainstorm.test.mjs — the brainstorm surface (18 October 2026)
//
// Prayas: "add a copy of the enquiry mode for brainstorm partnering for all creative works including writing film scripts. add special brainstorming corpora with exa and consensus". The copy is the same route, guards and rhythm as enquiry; what differs is the corpus it retrieves from and the one sentence framing that material. These tests hold the two corpora apart, keep the switch real, and keep a saved brainstorm a brainstorm.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Database from 'better-sqlite3';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { buildSystemPrompt } from '../lib/dialogue.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');
const CREATIVE = join(APP, 'corpus', 'creative');

const index = (dir) => { const db = new Database(':memory:'); buildIndex(db, dir); return db; };
const creative = index(CREATIVE);
const domain = index(join(APP, 'corpus', 'domain'));
const creativeIds = new Set(creative.prepare('SELECT id FROM entries').all().map((r) => r.id));

test('the chat route reads the switch and the mode, and retrieves only from the pool it chose', () => {
  assert.match(server, /const brainstorm = SURFACES\.has\('brainstorm'\) && req\.body\?\.mode === 'brainstorm';/);
  assert.match(server, /const pool = brainstorm \? creative : corpus;/);
  const route = server.slice(server.indexOf("app.post('/api/chat'"), server.indexOf("app.post('/api/prep/readiness'"));
  assert.doesNotMatch(route, /retrieve\(corpus,/, 'every retrieval on the chat route goes through `pool`');
  assert.match(route, /buildSystemPrompt\(methodCore, goal, brainstorm\)/);
});

test('a film-script reply reaches the creative corpus, and the design corpus never serves its entries', () => {
  const text = 'my film script has no ending and the second act sags';
  const hits = retrieve(creative, text, { limit: 3 }).map((r) => r.id);
  assert.ok(hits.includes('closed-or-open-ending') || hits.includes('structure-first-or-found'), hits.join(', '));
  assert.ok(retrieve(domain, text, { limit: 3 }).every((r) => !creativeIds.has(r.id)));
});

test('the negative case: words the creative corpus does not hold retrieve nothing', () => {
  assert.deepEqual(retrieve(creative, 'zxqv plywood dowels', { limit: 3 }), []);
});

test('the creative-process lens joins a turn when the words reach it', () => {
  const ids = retrieve(creative, 'i am stuck on this song and keep staring at the chorus, maybe i should take a break', { limit: 3 }).map((r) => r.id);
  assert.ok(ids.includes('setting-it-aside'), ids.join(', '));
});

test('the creative corpus holds the 30 entries he asked for (18 Oct 2026: "make corpus 30 entries")', () => {
  assert.equal(creativeIds.size, 30);
});

test('every creative entry is pending and carries sources', () => {
  for (const f of readdirSync(CREATIVE).filter((x) => x.endsWith('.md'))) {
    for (const block of readFileSync(join(CREATIVE, f), 'utf8').split(/\n## entry:/).slice(1)) {
      const id = block.split('\n')[0].trim();
      assert.match(block, /^\*\*provenance:\*\* pending$/m, `${f}: ${id}`);
      assert.match(block, /^\*\*sources:\*\* .+/m, `${f}: ${id}`);
    }
  }
});

test('the brainstorm prompt frames creative work and forbids ideas of its own; the enquiry prompt is unchanged', () => {
  const b = buildSystemPrompt('METHOD', '', true);
  const e = buildSystemPrompt('METHOD', '');
  assert.match(b, /Never offer an idea of your own/);
  assert.doesNotMatch(b, /design discipline/);
  assert.match(e, /tensions in their design discipline/);
  assert.doesNotMatch(e, /Never offer an idea of your own/);
});

test('the page offers brainstorm only when the server says it is on, sends the mode, and a saved brainstorm resumes as one', () => {
  assert.match(page, /<a id="navBrain" hidden>new brainstorm<\/a>/);
  assert.match(page, /\$\('navBrain'\)\.hidden = !cfg\.surfaces\.includes\('brainstorm'\)/);
  assert.match(page, /case '\/brainstorm': showStart\(cfg\.surfaces\.includes\('brainstorm'\) \? 'brainstorm' : 'enquiry'\)/);
  assert.match(page, /focus, mode, prep:prepText/);
  assert.match(page, /\(mode==='brainstorm'\?'\\nmode: brainstorm':''\)/);
  assert.match(page, /mode: \/\^mode:\\s\*brainstorm\\s\*\$\/m\.test\(fm\[1\]\) \? 'brainstorm' : 'enquiry'/);
  assert.match(page, /mode = parsed\.mode==='brainstorm' && cfg\.surfaces\.includes\('brainstorm'\) \? 'brainstorm' : 'enquiry';/);
});

test('the site says what brainstorm is for, and only while it is on', () => {
  assert.match(page, /<p class="lede" id="brainLede" hidden>/);
  assert.match(page, /<div class="about-mode" id="aboutBrain" hidden>/);
  assert.match(page, /\$\('brainLede'\)\.hidden = \$\('aboutBrain'\)\.hidden = \$\('startModeRow'\)\.hidden = !cfg\.surfaces\.includes\('brainstorm'\)/);
  assert.match(page, /<p class="lede" id="critLede" hidden>/, 'the landing offers the critique only while it is on');
  assert.match(page, /\$\('critLede'\)\.hidden = !cfg\.surfaces\.includes\('criticism'\)/);
});

test('new art forms retrieve from their own files', () => {
  const hit = (text, id) => assert.ok(retrieve(creative, text, { limit: 3 }).some((r) => r.id === id), `${id} for "${text}"`);
  hit('i cannot decide what to title this painting, maybe untitled', 'what-the-title-does');
  hit('we want to devise the play through improvisation in rehearsal', 'yes-and-or-the-plan');
  hit('i am adapting a novel and fans of the book want it faithful', 'faithful-to-what');
});

test('enquiry or brainstorm is chosen on the start screen, only while brainstorm is on', () => {
  assert.match(page, /<button class="focus-toggle mode-toggle" id="startModeToggle"/);
  assert.match(page, /\$\('startModeToggle'\)\.addEventListener\('click', \(\)=>go\(mode==='brainstorm' \? '\/' : '\/brainstorm'\)\)/);
});

test('the nav link for the mode you are in stays lit through its conversation, for both modes', () => {
  assert.match(page, /\$\('navQuests'\)\.classList\.toggle\('on', \(name==='quests' \|\| name==='conversation'\) && mode!=='brainstorm'\)/);
  assert.match(page, /\$\('navBrain'\)\.classList\.toggle\('on', \(name==='quests' \|\| name==='conversation'\) && mode==='brainstorm'\)/);
});

test('the admin link is dimmed unless it is the page you are on', () => {
  assert.match(page, /\.nav-admin\{color:var\(--gold\) !important; opacity:\.5\}/);
  assert.match(page, /\$\('navAdmin'\)\.classList\.toggle\('on', name==='admin'\)/);
});

// 18 Oct 2026, Prayas on a live brainstorm: "nonsense, dumb", then "I said flying is the dramatic event. then it is asking again". After "its the drama of the event" the stone asked "Where is the drama of the event?", on the live site and on every local replay. Two things built it: TAKE THIS UP asked what one of the new words means, and a quiet turn could use only the words of that reply plus "where". In a brainstorm neither may hand the reply back, and (v1.20.5, his "fix it") a quiet turn may not stitch their words together and the verbs of making are never an anchor.
import { buildTurnContext, validateOutput } from '../lib/dialogue.mjs';

test('in a brainstorm the new words are taken as given, never asked about; enquiry keeps its own instruction', () => {
  const brain = buildTurnContext({ newMaterial: ['drama', 'event'], brainstorm: true });
  assert.match(brain, /take it as given/);
  assert.doesNotMatch(brain, /what they mean by it/);
  assert.match(buildTurnContext({ newMaterial: ['drama', 'event'] }), /what they mean by it/);
  assert.match(server, /^\s+brainstorm,\s+\/\/ its new words are taken as given/m, 'the chat route passes the mode to the turn context');
});

test('a brainstorm quiet turn may not stitch their words together, and asks with an opener still allowed', () => {
  const quietWords = new Set(['story', 'flying', 'freedom', 'central', 'draw', 'drama', 'event']);
  const quietOpening = new Set(['want', 'write', 'story', 'flying']);
  for (const q of ['Where is the drama of the event?', 'Where is the freedom in the drama of the event?']) {
    const r = validateOutput(q, { quietWords, quietOpening });
    assert.ok(r.reasons.some((x) => /stitches their words/.test(x)), `${q} → ${r.reasons.join(' | ')}`);
  }
  for (const q of ['Who sees the event first?', 'Who is in the story?', 'What happens first in the flying?'])
    assert.ok(validateOutput(q, { quietWords, quietOpening }).ok, q);
  // enquiry: no quietOpening, so its quiet turn is unchanged
  assert.ok(validateOutput('Where is the drama of the event?', { quietWords }).ok);
  assert.match(server, /quietOpening: light && brainstorm \?/, 'quietOpening is only ever set in a brainstorm');
  const block = buildTurnContext({ light: ['story', 'flying'], newMaterial: ['drama', 'event'], brainstorm: true, banOpeners: ['what'] });
  assert.match(block, /Begin it with "who" or "when" or "which" or "where"\./, 'a banned opener is never offered');
  assert.doesNotMatch(block, /TAKE THIS UP/, 'a brainstorm quiet turn carries the turn alone');
  assert.match(buildTurnContext({ light: ['drama'], newMaterial: ['drama'] }), /TAKE THIS UP/, 'enquiry keeps both');
});

test('in a brainstorm the verbs of making are never an anchor; in an enquiry they still can be', async () => {
  const { readDwell } = await import('../lib/arc.mjs');
  const studentTurns = ['I want to write a story about flying', 'freedom'];
  const stoneTurns = ['What quality of flying are you trying to capture?'];   // touches "flying", never "write"
  const brain = readDwell({ studentTurns, stoneTurns, goal: studentTurns[0], making: true });
  const enq = readDwell({ studentTurns, stoneTurns, goal: studentTurns[0] });
  assert.equal(enq && enq.anchor, 'write', 'enquiry tethers to the first untouched goal word, as before');
  assert.notEqual(brain && brain.anchor, 'write');
  assert.match(server, /readDwell\(\{ studentTurns, stoneTurns, goal, repeated, notAsked, making: brainstorm \}\)/);
});

test('a choice left unchosen is saved as a choice not taken, never as a blank, and reads back as one', () => {
  assert.match(page, /const entry=\{role:'interlocutor', content:'', choice:true\}/);
  assert.match(page, /h\.choice \? '\*\*—\*\* \[choice not taken\]\\n\\n' : '\*\*—\*\* \[blank\]\\n\\n'/);
  assert.match(page, /h\.choice \? '—  \[choice not taken\]' : '—  \[blank\]'/, 'the PDF says the same');
  assert.match(page, /t==='\[choice not taken\]' \? \{role:'interlocutor', content:'', choice:true\}/);
});
