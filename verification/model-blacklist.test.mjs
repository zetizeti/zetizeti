// model-blacklist.test.mjs — 4 October 2026, Prayas: "put mimo on blacklist". The blacklist is code: a banned
// model stops the server at start and is refused on any call. MiMo failed his live test three times; OpenAI is
// his standing rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { isBannedModel, streamQuestion } from '../lib/llm.mjs';

test('MiMo and OpenAI models are on the blacklist; the live model is not', () => {
  for (const m of ['xiaomi/mimo-v2.6-flash', 'xiaomi/mimo-v2.6-pro', 'openai/gpt-oss-120b']) assert.equal(isBannedModel(m), true, m);
  assert.equal(isBannedModel('google/gemini-3.1-flash-lite'), false);
});

test('a call naming a banned model is refused before anything is sent', async () => {
  await assert.rejects(streamQuestion({ system: 's', messages: [], onToken: () => {}, model: 'xiaomi/mimo-v2.6-flash' }), /blacklist/);
});

test('a banned ZETIZETI_MODEL stops the module from loading', () => {
  const r = spawnSync(process.execPath, ['-e', "import('./lib/llm.mjs').then(() => process.exit(0), (e) => { console.error(e.message); process.exit(3); })"],
    { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, ZETIZETI_MODEL: 'xiaomi/mimo-v2.6-flash' }, encoding: 'utf8' });
  assert.equal(r.status, 3); assert.match(r.stderr, /blacklist/);
});
