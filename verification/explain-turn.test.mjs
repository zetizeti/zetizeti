// explain-turn.test.mjs — the chip under a turn that did not ask (30 September 2026)
//
// Prayas: "there should be a explain-like chip under non-questions explaining the narrative logic in the conversation (so also enquiry logic)", and then, shown a first build that repeated what the code had detected: "I do not want technical, code-based reasons. I want narrative/dialogue flow". These tests pin that the explanation is given his account of how a conversation moves and nothing about why the code chose the turn, that it is read under its own three labels, and that the chip is wired on the live turn, the blank and a resumed file. The route's containment is pinned in explain-question.test.mjs and its guard in explain-guard.test.mjs; there is one route for both chips.
//
// 🔴 Every question and reply here is INVENTED. `verification/` is published wholesale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as X from '../lib/explain.mjs';

const { buildExplainPrompt, explainInputs, readExplanation, TURN_PARTS, EXPLAIN_PARTS } = X;
const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');
const fnBody = (name) => { const a = page.search(new RegExp(`(async )?function ${name}\\(`)); assert.ok(a >= 0, `${name} exists`); return page.slice(a, page.indexOf('\n}\n', a)); };

const turn = (question) => buildExplainPrompt(explainInputs({ question, notAsked: true, goal: 'a quieter reading room', context: [{ role: 'stone', content: 'What happens just before somebody leaves?' }, { role: 'student', content: 'the chairs scrape and then it is utter silence' }] }));

test('the prompt carries his account of how a conversation moves, and asks for the movement to be described', () => {
  for (const p of [turn('“Utter silence,” you say.'), turn('')]) {
    assert.match(p, /A conversation is not hammering\. It has ebb and flow\./);
    assert.match(p, /how the conversation has been moving/);
    assert.match(p, /Give no cause for it/);
    for (const m of ['ABOUT:', 'HELPS:', 'CHANGES:']) assert.ok(p.includes(m), m);
    assert.match(p, /Do not tell them what to say next/);
    assert.doesNotMatch(p, /Do not answer the question for them/, 'there is no question to answer');
    assert.doesNotMatch(p, /say what it means in simple words/, 'their own phrase is never explained to them');
  }
});

test('the prompt is told nothing about what the code read in the exchange', () => {
  // The first build carried a table of reasons (new material, a short reply, replies getting shorter). It is gone, from the module and from the wire.
  assert.equal(X.NOT_ASKED, undefined);
  for (const p of [turn('“Utter silence,” you say.'), turn('')]) assert.doesNotMatch(p, /WHY NO QUESTION|brought in things|much shorter than|was short, and everything/);
  assert.doesNotMatch(server, /kind: ack\.kind/, 'the said-back event carries its text and nothing about why');
  assert.doesNotMatch(fnBody('streamStone'), /ackKind/);
  assert.equal(explainInputs({ question: 'x', notAsked: 'tiring' }).notAsked, true, 'whatever a client sends, the input is a yes or a no');
});

test('a blank is explained as a turn where nothing was said, and a said-back as their own phrase given back', () => {
  assert.match(turn(''), /Nothing at all was said on it/);
  assert.match(turn('“Utter silence,” you say.'), /gives one phrase from the person's last reply back/);
});

test('a question is still explained as a question', () => {
  const p = buildExplainPrompt(explainInputs({ question: 'Where does the quiet end?', goal: 'a quieter reading room' }));
  assert.match(p, /Do not answer the question for them/);
  assert.doesNotMatch(p, /HOW THIS KIND OF CONVERSATION MOVES/);
});

test('the turn is read under its own three labels', () => {
  const draft = 'ABOUT: The turns before this one asked questions. This turn asks nothing.\nHELPS: It lets you look at your own words again.\nCHANGES: Whatever you say next, the conversation picks up from there.';
  assert.deepEqual(readExplanation(draft, TURN_PARTS).parts.map((x) => x.label), ['how the conversation has been moving', 'what holding still does for your idea', 'where it can go from here']);
  assert.notDeepEqual(TURN_PARTS.map((x) => x.label), EXPLAIN_PARTS.map((x) => x.label));
});

test('the route accepts a blank and reads the turn labels', () => {
  const a = server.indexOf("app.post('/api/explain'"), route = server.slice(a, server.indexOf('\n});', a));
  assert.match(route, /!input\.question && !input\.notAsked/);
  assert.match(route, /parts: input\.notAsked \? TURN_PARTS : undefined/);
});

test('the page puts the chip under a said-back, a blank and a resumed turn', () => {
  const s = fnBody('streamStone');
  assert.match(s, /attachExplain\(node, '', \{[^\n]*notAsked:true \}\)/);
  assert.match(s, /notAsked: acked \|\| undefined/);
  assert.ok(s.indexOf('notAsked:true') < s.indexOf("history.push({role:'interlocutor', content:''})"), 'the context is taken before the blank itself joins the history');
  assert.match(fnBody('resumeFromTranscript'), /notAsked: !t\.content\.includes\('\?'\) \|\| undefined/);
  const chip = fnBody('attachExplain');
  assert.match(chip, /\(!question && !ctx\.notAsked\)/);
  assert.match(chip, /ctx\.notAsked \? 'explain this turn' : 'explain question'/);
});
