// explain-question.test.mjs — "explain question" (16 September 2026)
//
// The one exception to the never-answer guard, by Prayas's instruction. These tests pin three things:
// the explanation is shaped as he specified (three parts, at most 250 words, a ten-year-old's reading
// level with one regeneration), the exception is scoped (no guard runs on it, no turn is counted, spend is
// metered, and the explanation never reaches a history the stone reads), and the chip is WIRED on every
// surface — a helper nobody calls is the inert-mechanism fault this project has met four times.
//
// 🔴 Every question and reply here is INVENTED. `verification/` is published wholesale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  readExplanation, capWords, readingGrade, explainQuestion, buildExplainPrompt, explainInputs,
  EXPLAIN_MAX_WORDS, EXPLAIN_PARTS,
} from '../lib/explain.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');
const words = (s) => s.split(/\s+/).filter(Boolean).length;

const EASY = `ABOUT: This question asks where the bike lock should go. You said people forget their locks.
HELPS: If you think about it, you can see what the lock is really for. That makes the idea clearer.
CHANGES: If you say on the bike, the lock gets heavier. If you say at the stand, the stand needs to change.`;

const HARD = `ABOUT: This interrogation foregrounds the infrastructural positioning of the securing mechanism, operationalising considerations of situated accountability within municipal cycling ecosystems.
HELPS: Deliberating systematically upon this consideration facilitates the articulation of underlying organisational presuppositions characterising the proposition.
CHANGES: Alternative formulations necessitate fundamentally differentiated institutional responsibilities, consequently reconfiguring the implementation trajectory considerably.`;

test('three parts are read in his order, with the labels the learner sees', () => {
  const r = readExplanation(EASY);
  assert.ok(r);
  assert.deepEqual(r.parts.map((p) => p.key), ['context', 'benefit', 'repercussions']);
  assert.deepEqual(r.parts.map((p) => p.label), EXPLAIN_PARTS.map((p) => p.label));
  assert.ok(r.parts.every((p) => p.text.length > 10));
});

test('a text missing a part is refused rather than delivered as a whole', () => {
  assert.equal(readExplanation('ABOUT: something.\nHELPS: something else.'), null);
  assert.equal(readExplanation('Just a paragraph with no markers at all.'), null);
  assert.equal(readExplanation('ABOUT:\nHELPS: x y.\nCHANGES: z.'), null);
});

test('markdown dressing on the markers is tolerated', () => {
  const r = readExplanation('**ABOUT:** one thing.\n\n## HELPS: another.\n\nchanges: a third.');
  assert.ok(r);
  assert.equal(r.parts[2].text, 'a third.');
});

test('the 250-word cap is hard, trims whole sentences, and never empties a part', () => {
  const long = (n) => Array.from({ length: n }, (_, i) => `Sentence number ${i} has exactly seven words.`).join(' ');
  const r = capWords([
    { key: 'context', label: 'a', text: long(30) },
    { key: 'benefit', label: 'b', text: long(20) },
    { key: 'repercussions', label: 'c', text: long(10) },
  ]);
  assert.ok(r.words <= EXPLAIN_MAX_WORDS, `got ${r.words}`);
  assert.ok(r.parts.every((p) => p.text.trim().length > 0));
  assert.ok(r.parts.every((p) => /\.$/.test(p.text)), 'every part still ends on a full stop');
  // three single run-on sentences over the cap are still brought under it
  const runOn = capWords(EXPLAIN_PARTS.map((p) => ({ key: p.key, label: p.label, text: 'word '.repeat(120).trim() + '.' })));
  assert.ok(runOn.words <= EXPLAIN_MAX_WORDS, `got ${runOn.words}`);
});

test('the reading-level measure separates a child’s paragraph from an academic one', () => {
  assert.ok(readingGrade(EASY) < 6, `easy read as ${readingGrade(EASY)}`);
  assert.ok(readingGrade(HARD) > 12, `hard read as ${readingGrade(HARD)}`);
});

test('too hard → exactly one regeneration, and the easier draft is delivered', async () => {
  const calls = [];
  const out = await explainQuestion({ generate: async (c) => { calls.push(c); return c ? EASY : HARD; } });
  assert.equal(calls.length, 2);
  assert.match(calls[1].instruction, /ten-year-old/);
  assert.equal(out.attempts, 2);
  assert.match(out.parts[0].text, /bike lock/);
});

test('easy on the first draft → one call only', async () => {
  let n = 0;
  const out = await explainQuestion({ generate: async () => { n++; return EASY; } });
  assert.equal(n, 1);
  assert.equal(out.attempts, 1);
});

test('a malformed draft is asked for once more, then given up on', async () => {
  let n = 0;
  const out = await explainQuestion({ generate: async () => { n++; return 'no markers here'; } });
  assert.equal(n, 2);
  assert.equal(out, null);
});

test('the prompt carries his scope: three parts, 250 words, a ten-year-old, and leaves the answering to them', () => {
  const p = buildExplainPrompt(explainInputs({ surface: 'enquiry', question: 'Where does the lock live when the bike is moving?', goal: 'a bike lock people do not forget' }));
  for (const m of ['ABOUT:', 'HELPS:', 'CHANGES:']) assert.ok(p.includes(m), m);
  assert.match(p, /between 200 and 250 words/i);
  assert.match(p, /Never say "we"/);
  assert.match(p, /ten-year-old/);
  assert.match(p, /Do not answer the question for them/);
  assert.match(p, /Do not say what the person feels/);
});

test('inputs are bounded and an unknown surface falls back to enquiry', () => {
  const i = explainInputs({ surface: 'nonsense', question: 'q'.repeat(5000), material: 'm'.repeat(50000),
    context: Array.from({ length: 30 }, (_, k) => ({ role: k % 2 ? 'stone' : 'you', content: 'x'.repeat(2000) })) });
  assert.equal(i.surface, 'enquiry');
  assert.ok(i.question.length <= 700);
  assert.ok(i.material.length <= 3000);
  assert.equal(i.context.length, 6);
  assert.ok(i.context.every((c) => c.text.length <= 700));
  assert.equal(i.context[0].who, 'the person', "criticism's `you` role is read as the person");
});

// ── the exception is SCOPED — read the route, not a description of it ──────────────────────────────
const route = (() => {
  const a = server.indexOf("app.post('/api/explain'");
  assert.ok(a > 0, 'the route exists');
  return server.slice(a, server.indexOf('\n});', a));
})();

test('the explain route runs no question guard and counts no turn', () => {
  for (const g of ['generateGuarded', 'validateOutput', 'validateCriticismOutput', 'validateSpecOutput', 'noteTurnDepth', 'noteGuard']) {
    assert.ok(!route.includes(g), `/api/explain must not call ${g}`);
  }
});

test('the explain route pays through the shared resolver, meters spend, and keeps the stream alive', () => {
  assert.match(route, /resolveKeyForCriticism\(/);
  assert.match(route, /addPoolSpend\(/);
  assert.match(route, /sseHeaders\(res\)/);
  assert.ok(!/console\.\w+\([^)]*req\.body/.test(route), 'invariant #8: the body is never logged');
});

test('explain.mjs is not in the cinematic read’s questioning set — it does not change the questioning', () => {
  const cr = readFileSync(join(APP, 'scripts', 'cinematic-read.mjs'), 'utf8');
  const set = cr.slice(cr.indexOf('const QUESTIONING'), cr.indexOf('];', cr.indexOf('const QUESTIONING')));
  assert.ok(!set.includes('explain'));
});

// ── the chip is WIRED on every surface, and the explanation never enters a history ───────────────────
const fnBody = (name) => {
  const a = page.search(new RegExp(`(async )?function ${name}\\(`));
  assert.ok(a >= 0, `${name} exists`);
  const b = page.indexOf('\n}\n', a);
  return page.slice(a, b);
};

test('attachExplain is called from the enquiry, critique and spec streams and from a resumed transcript', () => {
  assert.match(fnBody('streamStone'), /attachExplain\(node, full, \{ surface:'enquiry'/);
  assert.match(fnBody('critStream'), /attachExplain\(node, full, \{ surface:'criticism'/);
  assert.match(fnBody('specStream'), /attachExplain\(node, full, \{ surface:'spec'/);
  assert.match(fnBody('resumeFromTranscript'), /attachExplain\(lastNode, t\.content/);
});

test('the explanation is shown and never pushed into a transcript', () => {
  const both = fnBody('attachExplain') + fnBody('streamExplain');
  assert.ok(!/History\.push|history\.push/.test(both));
  assert.match(fnBody('streamExplain'), /fetch\('\/api\/explain'/);
});

test('the canned demos call no model, so they carry no chip', () => {
  assert.ok(!fnBody('runDemo').includes('attachExplain'));
  assert.ok(!fnBody('runCritDemo').includes('attachExplain'));
});
