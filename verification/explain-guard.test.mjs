// explain-guard.test.mjs — the explanation's own guard (30 September 2026)
//
// Prayas: "make robust guards for both the sets of explanations". Each rule is tested alone, by changing one thing in a draft that passes. The measurements behind the rules are in docs/ops/explain-guard-20260930/.
//
// 🔴 Every question and reply here is INVENTED. `verification/` is published wholesale.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateExplanation, readExplanation, explainInputs, explainQuestion, explainRepair, buildExplainPrompt, EXPLAIN_WORDS, EXPLAIN_ATTEMPTS, TURN_PARTS } from '../lib/explain.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');
const source = readFileSync(join(APP, 'lib', 'explain.mjs'), 'utf8');

const INPUT = explainInputs({ question: 'Where does the lock go when the bike is moving?', goal: 'a bike lock people do not forget', context: [{ role: 'student', content: 'people forget their locks at the stand' }] });
const A = 'This question asks where the lock goes when the bike is moving. You said people forget their locks at the stand.';
const H = 'Thinking about it lets you look at the lock and the bike together. You can see what the lock does for people.';
const C = 'If you say the lock stays on the bike, the talk moves to the bike. If you say it stays at the stand, the talk moves to the stand.';
const check = (a = A, h = H, c = C, input = INPUT) => validateExplanation({ parts: [{ text: a }, { text: h }, { text: c }] }, input);
const refused = (v, re) => { assert.equal(v.ok, false); assert.ok(v.reasons.some((r) => re.test(r)), `expected ${re} in: ${v.reasons.join(' | ')}`); };

test('a draft built from the conversation and plain words passes', () => {
  assert.deepEqual(check().reasons, []);
});

test('an explanation asks nothing: a question mark is refused, since that is how possible answers get offered', () => {
  refused(check(A, H + ' Does the lock stay on the bike?'), /asks a question/);
  assert.equal(check(A.replace('This question asks where the lock goes when the bike is moving.', 'This question is “Where does the lock go when the bike is moving?”'), H, C).ok, true, 'the question itself may be quoted');
});

test('advice is refused', () => {
  refused(check(A, H + ' You should look at the stand.'), /should or need to|forbidden pattern/);
  refused(check(A, H + ' You need to think about the stand.'), /should or need to|forbidden pattern/);
});

test('a word about what the person is like is refused, and a plain verb is not', () => {
  refused(check(A, H + ' You seem to know the stand.'), /what the person is like/);
  refused(check(A, H + ' You might be stuck at the stand.'), /what the person is like/);
  assert.equal(check(A, H + ' You look at the stand.').ok, true, '"you look at" is a plain verb');
});

test('the explanation speaks only to "you": no "we", no narrator; people in their idea may be named', () => {
  refused(check(A, H + ' We can look at the stand.'), /speaks as/);
  refused(check(A + ' The question-asker asked about the bike.'), /speaks as/);
  const input = explainInputs({ question: 'What does the student do at the stand?', goal: 'a stand for the student' });
  assert.equal(check('This question asks what the student does at the stand.', 'Thinking about it lets you look at the stand.', 'If you say more about the student, the talk stays with the student.', input).ok, true);
});

test('a value word is refused even where the person used it, and "right now" is not a value', () => {
  refused(check(A, H + ' That part is important.'), /values what was said/);
  const theirs = explainInputs({ question: 'Where does the lock go?', goal: 'a good lock', context: [{ role: 'student', content: 'a good lock stays on the bike' }] });
  refused(check('This question asks where the lock goes.', 'It lets you look at the good lock.', 'If you say more about the bike, the talk stays with the bike.', theirs), /values what was said/);
  assert.equal(check(A, H + ' You do not have to say more right now.').ok, true);
});

test('a word that is neither theirs nor a plain word about a conversation is refused by name', () => {
  const v = check(A, H, C + ' The talk may move to a chain or a helmet.');
  refused(v, /neither theirs nor plain words/);
  assert.match(v.reasons.join(' '), /chain, helmet/);
});

test('every word of the conversation is licensed, not only the six turns the prompt is shown, and so are plain endings', () => {
  const long = explainInputs({ question: 'Where does the lock go?', goal: 'a bike lock',
    context: [{ role: 'student', content: 'my grandmother kept a padlock' }, ...Array.from({ length: 12 }, (_, k) => ({ role: k % 2 ? 'student' : 'stone', content: 'the lock and the bike' }))] });
  assert.equal(long.context.length, 6, 'the prompt still sees six turns');
  assert.equal(check('This question asks where the lock goes. You mentioned a padlock your grandmother kept.', 'It lets you look at the lock again.', 'If you say more about the padlocks, the talk stays with them.', long).ok, true);
  assert.ok(EXPLAIN_WORDS.has('question') && EXPLAIN_WORDS.has('reply') && !EXPLAIN_WORDS.has('feel') && !EXPLAIN_WORDS.has('important'), 'the licence holds words about a conversation, no feeling and no verdict');
});

test('a draft too hard for a ten-year-old is refused', () => {
  refused(check('This interrogation foregrounds the infrastructural positioning of the securing mechanism, operationalising considerations of situated accountability.'), /too hard to read/);
});

test('the first part of a turn explanation describes the movement and gives no cause', () => {
  const input = explainInputs({ question: '“Locks at the stand,” you say.', notAsked: true, goal: 'a bike lock', context: [{ role: 'stone', content: 'Where does the lock go?' }, { role: 'student', content: 'people forget their locks at the stand' }] });
  const about = 'The turns before this one asked questions. This turn asks nothing. It gives your words back.';
  const helps = 'It lets you look at your own words again.', next = 'Whatever you say next, the conversation picks up from there.';
  assert.deepEqual(check(about, helps, next, input).reasons, []);
  refused(check(about + ' It stops because your reply was short.', helps, next, input), /gives a cause/);
});

test('the repair names what was refused, and a draft that never passes is withheld, never delivered', async () => {
  assert.match(explainRepair(['it asks a question']), /refused: it asks a question/);
  let n = 0;
  const bad = `ABOUT: ${A}\nHELPS: ${H} You should buy a chain.\nCHANGES: ${C}`;
  const out = await explainQuestion({ input: INPUT, generate: async () => { n++; return bad; } });
  assert.equal(n, EXPLAIN_ATTEMPTS);
  assert.equal(out.withheld, true);
  assert.equal(out.parts, undefined);
  const a = server.indexOf("app.post('/api/explain'"), route = server.slice(a, server.indexOf('\n});', a));
  assert.match(route, /if \(out\.withheld\) send\('error', \{ code: 'EXPLANATION_WITHHELD'/);
  assert.match(route, /else send\('explanation'/, 'an explanation is sent only when one passed');
});

test('it is the explanation’s own guard: the shared loop, and none of the question validators', () => {
  assert.match(source, /import \{ generateGuarded \} from '\.\/guard\.mjs'/);
  for (const v of ['validateOutput', 'validateCriticismOutput', 'validateSpecOutput', 'validateStatement']) assert.ok(!new RegExp(`\\b${v}\\(`).test(source), `${v} must not run on an explanation`);
});

test('the prompt states what the guard refuses, and the page sends the whole conversation for the licence', () => {
  for (const p of [buildExplainPrompt(INPUT), buildExplainPrompt(explainInputs({ question: '“Locks,” you say.', notAsked: true }))]) {
    assert.match(p, /Ask nothing: no question marks/);
    assert.match(p, /Use two kinds of words only/);
    assert.match(p, /call nothing good, clear, important, right or better/);
  }
  assert.match(page, /const explainContext = \(arr\)=> arr\.map\(/, 'no six-turn cut on the page: the server cuts for the prompt and licenses the rest');
});
