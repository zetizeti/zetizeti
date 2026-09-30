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
import { validateExplanation, pruneExplanation, readExplanation, explainInputs, explainQuestion, explainRepair, buildExplainPrompt, EXPLAIN_WORDS, EXPLAIN_ATTEMPTS, TURN_PARTS } from '../lib/explain.mjs';

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

// 🔴 WITHHOLD THE SENTENCE, NOT THE EXPLANATION (30 Sep 2026, Prayas on one explanation in five being withheld: "isn't this a problem in experience?").
test('a part that never passes is cut sentence by sentence, and the rest is delivered', async () => {
  let n = 0;
  const bad = `ABOUT: ${A}\nHELPS: ${H} You should buy a chain.\nCHANGES: ${C} Is the stand the place?`;
  const out = await explainQuestion({ input: INPUT, generate: async () => { n++; return bad; } });
  assert.equal(n, 2 + 2 * (EXPLAIN_ATTEMPTS - 2), 'two whole drafts, then two tries for each of the two parts that failed; the part that passed is not written again');
  assert.equal(out.pruned, true);
  const text = out.parts.map((p) => p.text).join(' ');
  assert.doesNotMatch(text, /chain|should|\?/, 'nothing that was refused is shown');
  assert.match(text, /You can see what the lock does for people\./, 'the sentences that passed are kept');
  assert.equal(validateExplanation(out, INPUT).ok, true, 'what is delivered passes the whole guard');
});

// 🔴 ALTERNATIVES STAND TOGETHER (30 Sep 2026, Prayas on the cut explanations: "does it still make sense"). Four of thirteen had kept one alternative of a pair, which reads as a nudge towards it.
test('when one alternative is cut, the others in that part go with it and the framing stays', () => {
  const next = 'Your reply changes what comes next. If you say the lock stays on the bike, the talk moves to the bike. If you say it goes in a helmet, the talk moves there. Each reply takes the talk to a different place.';
  const p = pruneExplanation({ parts: [{ text: A }, { text: H }, { text: next }] }, INPUT);
  assert.equal(p.parts[2].text, 'Your reply changes what comes next. Each reply takes the talk to a different place.');
  const both = 'Your reply changes what comes next. If you say the lock stays on the bike, the talk moves to the bike. If you say it stays at the stand, the talk moves to the stand. That part is important.';
  assert.match(pruneExplanation({ parts: [{ text: A }, { text: H }, { text: both }] }, INPUT).parts[2].text, /on the bike.*at the stand/, 'a pair that both pass is kept whole when some other sentence is cut');
});

// 🔴 WHOLE TWICE, THEN PART BY PART (30 Sep 2026, Prayas on the cut explanations that said too little: "fix").
test('after two whole drafts only the part that failed is written again, shown its own refused text', async () => {
  const calls = [];
  const bad = `ABOUT: ${A}\nHELPS: ${H} You should buy a chain.\nCHANGES: ${C}`;
  const out = await explainQuestion({ input: INPUT, generate: async (c) => { calls.push(c); return calls.length <= 2 ? bad : `HELPS: ${H}`; } });
  assert.equal(calls.length, 3, 'one part failed, so one part is asked for');
  assert.match(calls[2].instruction, /^The HELPS part was refused: /);
  assert.match(calls[2].instruction, /The refused part read: """.*You should buy a chain\./s, 'a repair that is not shown what it is repairing does not converge');
  assert.equal(out.pruned, false, 'nothing was cut: the part was repaired');
  assert.deepEqual(out.parts.map((p) => p.text), [A, H, C]);
});

test('a part is taken from whichever whole draft it passed in', async () => {
  let n = 0;
  const one = `ABOUT: ${A}\nHELPS: ${H} You should buy a chain.\nCHANGES: ${C}`;
  const two = `ABOUT: ${A}\nHELPS: ${H}\nCHANGES: ${C} Is the stand the place?`;
  const out = await explainQuestion({ input: INPUT, generate: async () => (++n === 1 ? one : two) });
  assert.equal(n, 2, 'both drafts failed whole, and every part passed in one of them, so nothing more is asked for');
  assert.deepEqual(out.parts.map((p) => p.text), [A, H, C]);
  assert.equal(out.pruned, false);
});

test('the reading grade refuses a whole draft and does not withhold an explanation whose parts all pass', async () => {
  const long = 'This question asks where the lock goes when the bike is moving and where the lock goes when the bike is at the stand and where people forget their locks.';
  const hard = `ABOUT: ${long}\nHELPS: Thinking about it lets you look at the lock and the bike together and lets you see what the lock does for people when they forget their locks at the stand.\nCHANGES: If you say the lock stays on the bike the talk moves to the bike and if you say it stays at the stand the talk moves to the stand and to the people.`;
  assert.equal(validateExplanation(readExplanation(hard), INPUT).ok, false, 'as a whole draft it is refused for its grade');
  let n = 0;
  const out = await explainQuestion({ input: INPUT, generate: async () => { n++; return hard; } });
  assert.equal(n, 2, 'it was asked for again whole, and no part needed repair');
  assert.equal(out.withheld, undefined);
  assert.ok(out.grade > 6, 'delivered, and known to read a little hard');
});

test('the no-cause rule is cut from the first part of a turn explanation only', () => {
  const input = explainInputs({ question: '“Locks at the stand,” you say.', notAsked: true, goal: 'a bike lock', context: [{ role: 'student', content: 'people forget their locks at the stand' }] });
  const p = pruneExplanation({ parts: [{ text: 'The turns before this one asked questions. It stops because you said locks. This turn asks nothing.' }, { text: 'It lets you look at your own words again.' }, { text: 'The next move is yours because this turn asked nothing.' }] }, input);
  assert.equal(p.parts[0].text, 'The turns before this one asked questions. This turn asks nothing.');
  assert.match(p.parts[2].text, /because/, 'a "because" outside the first part is not a cause for the turn');
});

test('the repair names what was refused, and a draft with a part that cannot be saved is withheld, never delivered', async () => {
  assert.match(explainRepair(['it asks a question']), /refused: it asks a question/);
  let n = 0;
  const bad = `ABOUT: ${A}\nHELPS: ${H}\nCHANGES: You should buy a chain.`;
  assert.equal(pruneExplanation(readExplanation(bad), INPUT), null, 'a part with no sentence left cannot be delivered');
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
