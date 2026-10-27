// conversation-remarks.test.mjs — what the stone does with a message about the conversation, with a question of
// the learner's own, and with the clause before its question (26 October 2026).
//
// Origin: fifty real AI Club dialogues (9 September – 21 October 2026), read for faults on Prayas's word. They held
// "reframe the question please" answered with a question containing "reframe"; "I'm not getting what you want to say"
// answered with a new subject; "forget what I said earlier" taken as something that happens to trust; "what?" answered
// with an error, because asking the same thing again in plainer words shares a frame with the question being asked
// again; approving sentences with one verb changed ("is sharpening the role", "is opening the way"); a statement joined
// to its question by a semicolon, which no check on the clause before a question could see; and questions with a
// quotation mark round every other word. (A learner's own question stated back as a fact was also built and measured,
// and removed: see docs/ops/aiclub-cohort-faults/README.md.)
//
// 🔴 SYNTHETIC THROUGHOUT. `verification/` publishes wholesale; the dialogues are private and nothing from them is
// quoted here. A repair kiosk for bicycles, as in the other tests. Every assertion here fails on the code before
// this change (checked against `git show f3faa4f:` of each file).
//
// The route tests start the real server against a fake OpenAI-compatible model (ZETIZETI_LLM_BASE) that returns
// what the test tells it to, so what is asserted is what the person would have been sent, and what the model was told.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readRemark, isAskingBack } from '../lib/arc.mjs';
import { validateOutput, preambleOf, buildTurnContext } from '../lib/dialogue.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));

// ── readings ─────────────────────────────────────────────────────────────────────────────────────
const RECENT = ['Where does the rider wait while the tyre is checked?'];
test('a request to say it another way is asking back, with or without a question mark, and the request word is returned', () => {
  for (const r of ['reframe the question please', 're frame this question', 'can you rephrase that?', 'could you simplify this', 'say it in simpler words']) {
    assert.equal(isAskingBack(r, RECENT), true, r);
    assert.ok(readRemark(r).words.length >= 1, r);
  }
  assert.deepEqual(readRemark('reframe the question please').words, ['reframe']);
});
test('"I\'m not getting what you want to say" is asking back, not an answer', () => {
  for (const r of ["I'm not getting what you want to say", 'im not getting your question?', 'i dont get what you are asking']) {
    assert.equal(isAskingBack(r, RECENT), true, r);
    assert.equal(readRemark(r).kind, 'lost', r);
  }
});
test('a reply that quotes a prompt of their own app, or merely contains the verb, is an answer, and a word they used for their idea stays theirs', () => {
  assert.equal(readRemark('“After reflecting, what do you want to do?”'), null, 'what do you want to do is a line of their app, not a message to the stone');
  assert.equal(readRemark('riders behave differently when it rains and the queue gets long near the gate and the stall'), null);
  assert.equal(readRemark('the kiosk should simplify the whole queue for riders who arrive in the evening rush every day'), null);
  assert.deepEqual(readRemark('reframe this question', ['I want to reframe how riders see repair']).words, [], 'their own earlier word is theirs');
});
test('"forget what I said earlier" withdraws, at any length, and returns its own verb', () => {
  const r = readRemark('forget what i said earlier this is my new idea, a spare-parts shelf by the gate where riders can swap a tube');
  assert.equal(r.kind, 'withdraw');
  assert.deepEqual(r.words, ['forget', 'earlier']);
  assert.equal(isAskingBack('forget what i said earlier this is my new idea', RECENT), false, 'a withdrawal is a correction, not asking back');
});
// ── the guard ────────────────────────────────────────────────────────────────────────────────────
test('the words of a request about the conversation are kept out of the question, and only then', () => {
  const q = 'What would a reframe of the wait look like for the rider?';
  assert.equal(validateOutput(q, { noWords: new Set(['reframe']) }).ok, false);
  assert.ok(validateOutput(q, { noWords: new Set(['reframe']) }).reasons.some((r) => /from their message about the conversation/.test(r)));
  assert.equal(validateOutput(q, {}).ok, true, 'with no request in the message the word is not policed');
  assert.equal(validateOutput('Where does the rider stand while the tyre is checked?', { noWords: new Set(['reframe']) }).ok, true);
});
test('a semicolon ends the clause before a question, so every check on that clause reads it', () => {
  assert.equal(preambleOf('So the stall is shut; where does the rider wait?'), 'So the stall is shut;');
  assert.equal(preambleOf('Where does the rider wait?'), '');
  const own = new Set(['stall', 'rider', 'repair', 'final', 'wait', 'might']);
  const v = validateOutput('That "might" suggests the repair is not final; where does the rider wait?', { ownWords: own });
  assert.equal(v.ok, false, 'a named tell, joined by a semicolon, used to pass');
  assert.ok(v.reasons.some((r) => /interprets what they said/.test(r)));
});
test('a sentence about their material is made of their words, so one verb changed is no way round the appraisal list', () => {
  const own = new Set(['queue', 'rider', 'focus', 'role', 'wait', 'path', 'gate']);
  for (const pre of [
    'That focus on the queue is sharpening the role of the rider.',
    'That path to the gate is opening the wait.',
    'The queue brings the rider into a concrete space.',
  ]) {
    const v = validateOutput(`${pre} Where does the rider wait?`, { ownWords: own });
    assert.equal(v.ok, false, pre);
    assert.ok(v.reasons.some((r) => /says what their words are doing, in words they did not use/.test(r)), `${pre} → ${JSON.stringify(v.reasons)}`);
  }
  assert.equal(validateOutput('That queue at the gate is where the rider wait. Where does the rider wait?', { ownWords: own }).ok, true, 'all theirs: left alone');
  assert.equal(validateOutput('You said the queue is at the gate. Where does the rider wait?', { ownWords: own }).ok, true);
});
test('more than two single words in quotation marks is not a question', () => {
  const bad = 'How does the "waiting" of the queue change the "rider\'s" ability to "wait" for the "tyre"?';
  assert.ok(validateOutput(bad, {}).reasons.some((r) => /quotation marks round several single words/.test(r)));
  assert.equal(validateOutput('How does the "queue" change what the rider does at the "gate"?', {}).ok, true);
});
test('"instead of" is the same two boxes as "rather than"', () => {
  assert.equal(validateOutput('What does the rider do at the gate instead of waiting?', { noBinary: true }).ok, false);
  assert.equal(validateOutput('What does the rider do at the gate while waiting?', { noBinary: true }).ok, true);
  assert.equal(validateOutput('What does the rider do at the gate instead of waiting?', { noBinary: true, ownWords: new Set(['instead', 'gate']) }).ok, true, 'their own "instead" is theirs');
});

// ── what the model is told ───────────────────────────────────────────────────────────────────────
test('the model is told which words to leave out, and that a withdrawal is an instruction', () => {
  const back = buildTurnContext({ message: 'reframe the question please', askingBack: { words: ['queue'] }, remark: { kind: 'redo', words: ['reframe'] } });
  assert.match(back, /do not use "reframe" in your question/);
  const gone = buildTurnContext({ message: 'forget what i said earlier', corrected: true, remark: { kind: 'withdraw', words: ['forget', 'earlier'] } });
  assert.match(gone, /WITHDRAWN WHAT THEY SAID BEFORE/);
  assert.match(gone, /do not use "forget", "earlier"/);
  assert.doesNotMatch(gone, /CORRECTED A READING/);
  assert.doesNotMatch(buildTurnContext({ message: 'the queue' }), /WITHDRAWN|do not use/);
});

// ── the consumers, read from the route ───────────────────────────────────────────────────────────
// A reading the route never calls does not exist (this project's rule, five times broken): grep the consumer.
test('the route reads the remark, tells the prompt, and passes the guard its options', () => {
  const s = readFileSync(join(APP, 'server.mjs'), 'utf8');
  assert.match(s, /const remark = readRemark\(message, studentTurns\.slice\(0, -1\)\);/);
  assert.match(s, /\(isCorrection\(message\) \|\| !!\(remark && remark\.kind === 'withdraw'\)\)/, 'a withdrawal takes the corrected footing');
  assert.match(s, /\n      remark,\n      avoidFrames/, 'it reaches buildTurnContext on the enquiry turn');
  assert.match(s, /noWords: remark && remark\.words\.length \? new Set\(remark\.words\) : null,/);
  // asking back asks the same thing again: the loop detectors that would refuse that are off for it, and only for it
  assert.match(s, /avoid: askingBack \? \[\] : stoneTurns,/);
  assert.match(s, /banHeads: askingBack \? \[\] : banHeads,/);
  assert.match(s, /lastTwo: askingBack \? null : /);
  // and a request about the conversation is never said back, nor stood in for by a said-back
  assert.match(s, /lastStoneAsked: lastStoneAsked && !askingBack/);
  assert.match(s, /let saidBackTried = !!askingBack;/);
});

// ── the route, against a fake model ──────────────────────────────────────────────────────────────
let model, app, base, cookie, dir, prompts, script;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
before(async () => {
  prompts = []; script = [];
  model = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const messages = JSON.parse(body).messages;
      prompts.push(messages[messages.length - 1].content);
      const text = script.length > 1 ? script.shift() : script[0] || 'Where does the rider wait?';
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
      res.end('data: [DONE]\n\n');
    });
  });
  await new Promise((r) => model.listen(0, '127.0.0.1', r));
  dir = mkdtempSync(join(tmpdir(), 'zz-remarks-'));
  const port = 20000 + Math.floor(Math.random() * 20000);
  base = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ['server.mjs'], { cwd: APP, stdio: 'ignore', env: {
    ...process.env, PORT: String(port), NODE_ENV: 'development', ZETIZETI_ALLOW_GUEST: '1', ZETIZETI_POOL_ALLOWLIST_PERSONAL: 'guest@localhost',
    ZETIZETI_LLM_BASE: `http://127.0.0.1:${model.address().port}`, ZETIZETI_MODEL: 'fake-local', OPENROUTER_API_KEY: 'unused',
    ZETIZETI_DB: join(dir, 'z.sqlite'), ZETIZETI_APP_TITLE: 'zetizeti-test' } });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/api/version`)).ok) break; } catch { /* not up yet */ } await sleep(200); }
  const g = await fetch(`${base}/auth/guest`, { redirect: 'manual' });
  cookie = g.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
});
after(() => { if (app) app.kill(); if (model) model.close(); if (dir) rmSync(dir, { recursive: true, force: true }); });

const EDGE = 'A repair kiosk for bicycles at the edge of a market. A rider leaves the bike and comes back to find it done.';
async function turn(message, stone = ['Where does the rider wait while the tyre is checked?'], replies = [], canned = []) {
  prompts = []; script = canned.length ? [...canned] : [];
  const history = [{ role: 'student', content: EDGE }];
  stone.forEach((q, i) => { history.push({ role: 'interlocutor', content: q }); if (replies[i]) history.push({ role: 'student', content: replies[i] }); });
  const r = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ message, history, goal: EDGE, kind: 'turn', exchanges: stone.length, turnsSinceNudge: 99, lineage: [EDGE] }) });
  const events = [];
  for (const b of (await r.text()).split('\n\n')) { const e = /^event: (.+)$/m.exec(b), d = /^data: (.+)$/m.exec(b); if (e && d) events.push({ event: e[1], data: JSON.parse(d[1]) }); }
  const token = events.find((e) => e.event === 'token'), err = events.find((e) => e.event === 'error');
  return { text: token ? token.data.t : null, code: err ? err.data.code : null, footing: (events.find((e) => e.event === 'validation') || { data: {} }).data.footing, events };
}

// 27 Oct 2026, Prayas: "acknowledge and repeat previous question if not understood". The first time, code gives the question
// back with an acknowledgement and no model is called; if they still do not follow, the plainer re-ask below.
test('route: "what?" is acknowledged and the last question comes back as it was', async () => {
  const r = await turn('what?');
  assert.equal(r.code, null);
  assert.equal(r.text, 'Sorry, that was not clear. Here it is again: Where does the rider wait while the tyre is checked?');
  assert.equal(r.footing, 'ask-again');
  assert.equal(prompts.length, 0, 'no model call');
});
test('route: "what?" after the question came back once gets the same question in plainer words, not an error', async () => {
  // Shares the five-word run "while the tyre is checked" with the question being asked again, which is what plainer words do.
  const r = await turn('what?', ['Where does the rider wait while the tyre is checked?', 'Sorry, that was not clear. Here it is again: Where does the rider wait while the tyre is checked?'], ['what?'], ['Which spot does the rider wait in while the tyre is checked?']);
  assert.equal(r.code, null, 'withheld: asking back was refused by the repeat gate on every attempt');
  assert.equal(r.text, 'Which spot does the rider wait in while the tyre is checked?');
  assert.equal(r.footing, 'asking-back');
});
test('route: "reframe the question please" is not answered with a question about a reframe', async () => {
  const r = await turn('reframe the question please', undefined, [], ['What would a reframe of the wait look like for the rider?', 'Which side of the stall does the rider stand on?']);
  assert.equal(r.code, null);
  assert.doesNotMatch(r.text, /reframe/i);
  assert.equal(r.footing, 'asking-back');
  assert.match(prompts[0], /do not use "reframe" in your question/);
});
test('route: "I\'m not getting what you want to say" is acknowledged, the question comes back, and nothing is said back', async () => {
  const r = await turn("I'm not getting what you want to say");
  assert.equal(r.text, 'Sorry, that was not clear. Here it is again: Where does the rider wait while the tyre is checked?');
  assert.equal(r.footing, 'ask-again');
  assert.equal(r.events.some((e) => e.event === 'ack'), false);
});
test('route: "forget what I said earlier" is an instruction, and the question is about the new idea', async () => {
  const r = await turn('forget what i said earlier, this is my new idea: a spare-parts shelf by the gate where riders swap a tube', undefined, [], ['What happens to trust when riders forget what they said earlier?', 'Which tube on the shelf does a rider take first?']);
  assert.equal(r.code, null);
  assert.doesNotMatch(r.text, /forget|earlier/i);
  assert.equal(r.footing, 'corrected');
  assert.match(prompts[0], /WITHDRAWN WHAT THEY SAID BEFORE/);
});
test('route: a named tell joined to the question by a semicolon is not delivered', async () => {
  const r = await turn('the rider waits at the stall while the repair is done', undefined, [], ['That wait suggests the repair is not final; where does the rider stand?', 'Which side of the stall does the rider stand on?']);
  assert.equal(r.code, null);
  assert.doesNotMatch(r.text, /suggests/);
});
