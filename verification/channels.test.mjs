// channels.test.mjs — the three-channel prompt for a model on the person's own machine (4 Oct 2026). Off unless
// ZETIZETI_CHANNELS=3; these test the module and the local path, which the live site never takes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compactRetrieved, earlierMessages, fitContext, RAG_ENTRIES } from '../lib/channels.mjs';

const app = new URL('..', import.meta.url).pathname;

test('the RAG channel keeps two entries, each cut short, with no sources in the prompt', () => {
  const long = Array.from({ length: 120 }, (_, i) => `w${i}`).join(' ');
  const r = compactRetrieved([1, 2, 3, 4].map((i) => ({ id: `e${i}`, tension: long, questions: 'first seed · second seed', sources: 'A book' })));
  assert.equal(r.length, RAG_ENTRIES);
  assert.ok(r[0].tension.split(' ').length < 50);
  assert.equal(r[0].questions, 'first seed');
  assert.equal(r[0].sources, '');
});

test('earlier replies are sent as the model saw them when the browser holds them, plainly when it does not', () => {
  const history = [{ role: 'student', content: 'edge' }, { role: 'interlocutor', content: 'q1?' }, { role: 'student', content: 'r1' }, { role: 'interlocutor', content: 'q2?' }];
  const m = earlierMessages(history, ['[context] edge', null]);
  assert.deepEqual(m.map((x) => x.content), ['[context] edge', 'q1?', 'r1', 'q2?']);
  assert.deepEqual(m.map((x) => x.role), ['user', 'assistant', 'user', 'assistant']);
});

test('a prompt too long for the context loses its oldest exchanges first, never the opening or this turn', () => {
  const big = 'x'.repeat(7000);
  const msgs = [{ role: 'user', content: 'opening' }, { role: 'assistant', content: big }, { role: 'user', content: big }, { role: 'assistant', content: 'q?' }, { role: 'user', content: 'this turn' }];
  const out = fitContext('system', msgs, 1000);
  assert.equal(out[0].content, 'opening'); assert.equal(out.at(-1).content, 'this turn');
  assert.deepEqual(out.map((x) => x.role), ['user', 'assistant', 'user']);
});

test('every call on the route starts from one conversation, and the page holds and posts back what was sent', () => {
  const s = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8'), page = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(s.includes('const earlier = CHANNELS ? earlierMessages(history, tails) :'));
  const route = s.slice(s.indexOf("app.post('/api/chat'"), s.indexOf('\napp.', s.indexOf("app.post('/api/chat'") + 10));
  assert.equal((route.match(/history\.map\(\(h\) => \(\{ role: h\.role === 'student'/g) || []).length, 1, 'built once, in `earlier`');
  assert.ok(s.includes("if (CHANNELS) send('tail', { t: turnContent });"));
  assert.ok(page.includes("else if(type==='tail'){ tail=data.t; }") && page.includes('history:history.slice(0,-1), tails,'));
});

test('a local model that is not running ends the turn with a plain reason', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', "const { streamQuestion } = await import('./lib/llm.mjs'); try { await streamQuestion({ system: 's', messages: [], onToken: () => {} }); } catch (e) { console.log(e.message); }"],
    { cwd: app, env: { ...process.env, ZETIZETI_LLM_BASE: 'http://127.0.0.1:9', ZETIZETI_MODEL: 'any-local' }, encoding: 'utf8' });
  assert.match(r.stdout, /not reachable at http:\/\/127\.0\.0\.1:9: is Ollama running\?/);
});
