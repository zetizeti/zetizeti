// The turn that says nothing, and the pace that shapes a turn's length.
//
// 🔴 HALF OF THIS FILE READS SOURCE, and that is deliberate. Four mechanisms in this codebase have shipped
//    written, tested and UNREACHABLE — BINARY_DEMAND on the criticism surface, the shared guard set, the
//    prep arc behind resetConversation, the lens disciplines. A unit test on `blankTurn` proves the
//    function works; only reading the route proves anything ever calls it. Grep for the CONSUMER.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStatement, statementBrief, isTheirWord } from '../lib/dialogue.mjs';
import { blankTurn, ackTurn, beatMs, BLANK_MS, WORD_MS, BLANK_FROM_REPLY } from '../lib/pace.mjs';

const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const page = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// 🔴 THE BLANK IS FOR DRAMATIC EFFECT (Prayas, 28 Sep 2026): only where the learner has just named what
//    matters. A short real answer ("A melancholy song") is not a moment, and must get a question.
test('a blank comes only after a naming, never for a short answer', () => {
  assert.equal(blankTurn({ named: true, replies: 4, lastStoneAsked: true }), true);
  assert.equal(blankTurn({ named: false, replies: 4, lastStoneAsked: true }), false);
});

test('never in the first replies, and never two running', () => {
  assert.equal(blankTurn({ named: true, replies: BLANK_FROM_REPLY - 1, lastStoneAsked: true }), false);
  assert.equal(blankTurn({ named: true, replies: 4, lastStoneAsked: false }), false);
  assert.equal(BLANK_FROM_REPLY, 3, 'the floor is pinned so it cannot drift silently');
});

test('the route reads the naming from the felt LEX event, not from reply length', () => {
  assert.match(server, /blankTurn\(\{ named: !!\(fs && fs\.lexEvent\), replies: studentTurns\.length - 1, lastStoneAsked \}\)/,
    'without the felt read the blank is inert — written, tested and never reached');
});

// 🔴 THE TURNS THAT DO NOT ASK come from need (29 Sep 2026): new material, tiring, or the same answer again.
const said = (n) => Array(n).fill('word').join(' ');
test('a turn does not ask when new material has entered, when they repeat, or when they are tiring', () => {
  assert.equal(ackTurn({ replies: ['a', 'the silence between the lines'], lastStoneAsked: true, newMaterial: true }).kind, 'new');
  assert.equal(ackTurn({ replies: ['yes it is', 'yes it is'], lastStoneAsked: true }).kind, 'repeat');
  const early = [14, 20, 12, 16, 18, 11, 15, 13].map(said);
  assert.equal(ackTurn({ replies: [...early, said(5), said(4)], lastStoneAsked: true }).kind, 'tiring');
});

test('an ordinary reply gets a question: short ones already heard, long ones without new material', () => {
  const earlier = ['I want to sing', 'What would make it seem poetic?'];
  assert.equal(ackTurn({ replies: ['a melancholy song', 'it should seem poetic'], lastStoneAsked: true, earlier, questionsSince: 3 }), null);
  assert.equal(ackTurn({ replies: ['a melancholy song', 'the silence between lines carries grief my grandmother sang to me every night'], lastStoneAsked: true, earlier, questionsSince: 3 }), null);
});

test('never on the first reply, never after a turn that did not ask', () => {
  assert.equal(ackTurn({ replies: ['one'], lastStoneAsked: true, newMaterial: true }), null);
  assert.equal(ackTurn({ replies: ['a', 'b c d'], lastStoneAsked: false, newMaterial: true }), null);
});

test('the sentence may use their words for what they named, with free grammar, and nothing else', () => {
  const own = new Set('the silence between lines carries grief my grandmother sang temp makeshift'.split(' '));
  assert.equal(validateStatement('The silence between the lines.', { ownWords: own }).ok, true);
  assert.equal(validateStatement('Temp, so it can be makeshift.', { ownWords: own }).ok, true);
  for (const bad of ['What carries the grief?', 'That is a powerful image of grief.', 'It sounds like you miss her.', 'You should write about your grandmother.'])
    assert.equal(validateStatement(bad, { ownWords: own }).ok, false, bad);
});

test('the model is never handed a mechanical account of the exchange', () => {
  assert.doesNotMatch(statementBrief(), /took a long time|was much longer|was one word/);
});

test('the route reads need from the felt reading, and says back only the latest reply', () => {
  const at = server.indexOf('const ack = prepping || declined ? null : ackTurn(');   // a decline goes to the choice turn, never said back
  assert.ok(at > 0 && at < server.indexOf('const guarded = await generateGuarded'));
  assert.match(server.slice(at, at + 300), /newMaterial: !!\(fs && fs\.semEvent\)/);
  assert.match(server, /const ownWords = new Set\(String\(message\)/, 'only their latest reply may be said back');
  assert.match(server.slice(at, at + 2600), /if \(said\.check\.ok\) \{[\s\S]*send\('ack'/, 'only a passing sentence is delivered');
  assert.match(page, /type==='ack'\)\{ acked=true;/);
});

// 🔴 ONE TIMING FROM THE SIX SCALES: mostly nothing, air after a worked reply, a rare long hold at new material.
test('most turns add no pause: speech follows speech', () => {
  assert.equal(beatMs({ replyWords: 5 }), 0);
  assert.equal(beatMs({ replyWords: 11 }), 0);
});

test('a worked reply earns air, and new material earns a longer hold', () => {
  assert.equal(beatMs({ replyWords: 40 }), 1500);
  assert.ok(beatMs({ replyWords: 5, moment: 'new' }) >= 1800);
  assert.ok(beatMs({ replyWords: 40, moment: 'new' }) > beatMs({ replyWords: 40 }));
  assert.ok(beatMs({ replyWords: 9999, moment: 'new' }) <= 6000, 'capped');
});

test('the conversion and the blank hold are pinned so they cannot drift silently', () => {
  assert.equal(WORD_MS, 300);
  assert.equal(BLANK_MS, 1500);
});

// ---- the consumers. Each of these fails on the version before this feature. ----

test('the route decides the blank, and decides it before the only model call', () => {
  assert.match(server, /import \{[^}]*blankTurn[^}]*\} from '\.\/lib\/pace\.mjs'/);
  const at = server.indexOf('blankTurn({');
  assert.ok(at > 0, 'nothing calls blankTurn — the mechanism would be inert');
  const gen = server.indexOf('const guarded = await generateGuarded');
  assert.ok(at < gen, 'the blank must be decided BEFORE generation, or it costs a model call for nothing');
  assert.match(server.slice(at, at + 600), /send\('blank'/, 'the turn must be MARKED — an unmarked blank reads as a broken tool');
});

test('the beat is held after generation and before the question, and the page is told', () => {
  const beat = server.indexOf('const beat = beatMs(');
  const token = server.indexOf("send('token', { t: full })");
  assert.ok(beat > 0 && token > 0 && beat < token, 'a pause after delivery paces nothing');
  assert.match(server.slice(beat, token), /moment: fs && fs\.semEvent \? 'new' : null/, 'the long hold must read new material');
  assert.match(server.slice(beat, token), /send\('hold'/);
  assert.match(page, /type==='hold'\)\{ body\.innerHTML=''; \}/, 'during a hold the indicator goes quiet');
});

test('the question unfolds word by word, and the chips wait for it', () => {
  assert.match(page, /revealing=revealWords\(body, full\)/);
  assert.match(page, /if\(revealing\) await revealing;/);
});

// 🔴 A blank is a turn in the posted history, so it must never reach the model as an empty assistant
//    message, and must never enter the opener ban or the rut reading as a question with no words.
test('blank stone turns are stripped from history once, before anything consumes it', () => {
  assert.match(server, /history: rawHistory = \[\]/, 'the raw array must be kept separate');
  assert.match(server, /const history = rawHistory\.filter\(\(h\) => h\.role === 'student' \|\| String\(h\.content \|\| ''\)\.trim\(\)\)/);
  assert.ok(!/\brawHistory\.map\(/.test(server), 'nothing may map the unstripped history into model messages');
});

test('the page renders the blank, and keeps it in the thread', () => {
  assert.match(page, /type==='blank'/, 'the client must receive the event');
  assert.match(page, /body\.classList\.add\('blank'\)/);
  assert.match(page, /history\.push\(\{role:'interlocutor', content:''\}\)/,
    'without this the service cannot tell it just blanked, and would blank twice');
  assert.match(page, /\.turn\.stone \.body\.blank\{/, 'the marker needs its own style, not an error style');
});

// 🔴 The parser requires at least one character after "**Q.**", so writing a bare marker would come back
//    as a STUDENT turn whose text is "**Q.**" — a corrupted dialogue, silently, on resume.
test('a blank and a said-back turn survive being saved and resumed, and neither is marked a question', () => {
  // scoped to the ENQUIRY writer: the criticism surface has its own, on role 'stone', and cannot blank
  const enquiryWriter = page.slice(page.indexOf('function buildTranscriptMd'), page.indexOf('function downloadFile'));
  assert.match(enquiryWriter, /'\*\*—\*\* \[blank\]/, 'a blank has its own marker');
  assert.match(enquiryWriter, /q\.includes\('\?'\) \? '\*\*Q\.\*\* '\+q/, 'only a question is marked Q.');
  assert.match(enquiryWriter, /: '\*\*—\*\* '\+q/, 'a said-back turn is marked with the dash');
  assert.ok(!/body\+='\*\*Q\.\*\* '\+String\(h\.content\)/.test(enquiryWriter), 'the unconditional write must be gone');
  // the reader, run for real: pull parseTranscriptMd out of the page and round-trip three kinds of turn
  const src = page.slice(page.indexOf('function parseTranscriptMd'), page.indexOf('\n}\n', page.indexOf('function parseTranscriptMd')) + 3);
  const parse = new Function(src + '; return parseTranscriptMd;')();
  const md = '---\nsource: zetizeti\ntype: idea-transcript\n---\n\n# A dialogue\n\nmy edge\n\n**Q.** A question?\n\nreply one\n\n**—** “Reply one,” you say.\n\nreply two\n\n**—** [blank]\n\nreply three\n';
  const turns = (parse(md).turns || parse(md)).filter((x) => x.role === 'interlocutor').map((x) => x.content);
  assert.deepEqual(turns, ['A question?', '“Reply one,” you say.', '']);
});

// 🔴 THEIR WORD, SPELT RIGHT (28 Sep 2026): the prompt asks for a typo to be corrected, so the guards that
//    check for the learner's own word must accept the correction, or prompt and guard fight.
test('a corrected spelling still counts as their word, and a different word does not', () => {
  const theirs = new Set(['surronding', 'badg', 'plastic']);
  for (const w of ['surrounding', 'bag', 'plastic']) assert.equal(isTheirWord(w, theirs), true, w);
  assert.equal(isTheirWord('building', theirs), false);
  assert.equal(validateStatement('The plastic bag and the surrounding.', { ownWords: theirs }).ok, true);
});

// 🔴 THE OPENING TURN IS ASKED ABOUT AN AIM (29 Sep 2026): never "how do you know it" (it is not yet a
//    claim) and never "say in one sentence what you are trying to do" (they just did).
//    Nor "just before" (4 Oct 2026, "And what happens just before you like dolls?": it presumes an event).
test('the opening turn never takes the provenance, one-sentence or just-before form, whatever the edge', async () => {
  const { readDwell, APPROACHES } = await import('../lib/arc.mjs');
  const barred = new Set([APPROACHES[2], APPROACHES[3], APPROACHES[4]]);
  for (const goal of ['I am trying to look at "an office" as a performance', 'I want to sing', 'a bridge across eternity', 'x', 'yy', 'zzz', 'sound scape of a barber shop', 'I like dolls', 'I want to talk about poetic ideas']) {
    const d = readDwell({ studentTurns: [goal], stoneTurns: [], goal });
    assert.ok(!d || !barred.has(d.approach), goal);
  }
});

// 🔴 THE ROTATION COUNTS QUESTIONS, NOT REPLIES (29 Sep 2026): a turn that does not ask is answered too, and
//    the extra reply moved the rotation on, so a real dialogue was asked "just before" on questions 3 and 7.
test('a turn that does not ask does not move the approach rotation', async () => {
  const { approachFor, APPROACHES } = await import('../lib/arc.mjs');
  const goal = 'I am trying to organise a programme for the leadership';
  const replies = (n) => Array.from({ length: n }, (_, i) => `reply ${i}`);
  for (let n = 2; n <= 12; n++) {
    assert.equal(approachFor(APPROACHES, replies(n + 1), goal, 1), approachFor(APPROACHES, replies(n), goal, 0), `after ${n} replies`);
  }
  const seen = [];
  for (let q = 1; q <= APPROACHES.length; q++) seen.push(approachFor(APPROACHES, replies(q + 1 + (q > 3 ? 1 : 0)), goal, q > 3 ? 1 : 0));
  assert.equal(new Set(seen).size, APPROACHES.length, 'five questions with a said-back in the middle still use five approaches');
});

test('a said-back phrase is theirs, quoted and attributed by code, never left bare', async () => {
  const { sayBack } = await import('../lib/dialogue.mjs');
  const own = new Set('what do i actually feel like what i do'.split(' '));
  assert.equal(validateStatement('Do I like what I do', { ownWords: own }).ok, true, 'their I stays: it is quoted');
  assert.equal(sayBack('swinging starts from loose ideas.', 0), '“Swinging starts from loose ideas,” you say.');
  assert.match(server, /send\('ack', \{ t: sayBack\(said\.text, stoneTurns\.filter\(/, 'the route must quote and attribute every said-back phrase, and count the earlier ones');
});

// 🔴 ONE FORM EVERY TIME READ AS MECHANICAL (Prayas, 30 Sep 2026: "quote and you say feels mechanical").
test('the words around a said-back phrase change each time, and every form still quotes it as theirs', async () => {
  const { sayBack, SAY_BACK } = await import('../lib/dialogue.mjs');
  const forms = SAY_BACK.map((_, n) => sayBack('do I like what I do', n));
  assert.equal(new Set(forms).size, SAY_BACK.length, 'no form repeats until all are used');
  assert.equal(sayBack('do I like what I do', SAY_BACK.length), forms[0], 'then the order starts again');
  forms.forEach((f, n) => {
    assert.match(f, /“Do I like what I do[,.]?”/, `their phrase, whole and in quotation marks: ${f}`);
    assert.match(f, /\byou(r)?\b/i, `says whose words they are: ${f}`);
    const short = sayBack('utter silence', n);   // short enough for the ten-word cap, so only the form is under test
    assert.equal(validateStatement(short, { ownWords: new Set(short.toLowerCase().match(/[a-z']+/g)) }).ok, true, `asks nothing and carries no forbidden pattern: ${short}`);
  });
});

test('a quoted phrase must be one unbroken run of their words: nothing added, nothing rearranged', () => {
  const r = 'break structures and demarcations. swinging starts from loose ideas';
  const own = new Set(r.split(/\W+/));
  assert.equal(validateStatement('Loose ideas', { ownWords: own, reply: r }).ok, true);
  assert.equal(validateStatement('My loose ideas', { ownWords: own, reply: r }).ok, false);
  assert.equal(validateStatement('Swinging from loose ideas', { ownWords: own, reply: r }).ok, false);
  assert.equal(validateStatement('Utter silence', { ownWords: new Set(['vaccum', 'utter', 'silence']), reply: 'it feels like vaccum - utter silence' }).ok, true);
});

test('a charged short reply is said back, but not straight after another turn that did not ask', () => {
  const earlier = ['New things start with mirages', 'And what is there just before a mirage becomes a thing?', 'A strong will', 'Where did that belief come from?'];
  const replies = ['A strong will', 'Mirages', 'Romance'];
  // From 4 Oct 2026 every turn that does not ask needs SAY_BACK_GAP (4) questions since the last ("it is too much").
  assert.equal(ackTurn({ replies, lastStoneAsked: true, earlier, questionsSince: 4 }).kind, 'charged');
  assert.equal(ackTurn({ replies, lastStoneAsked: true, earlier, questionsSince: 3 }), null, 'too soon after the last one');
  assert.equal(ackTurn({ replies, lastStoneAsked: true, earlier, questionsSince: 3, newMaterial: true }), null, 'the gap holds for new material too');
  assert.equal(ackTurn({ replies: ['A strong will', 'Mirages'], lastStoneAsked: true, earlier, questionsSince: 4 }), null, 'mirages is not new');
  assert.equal(ackTurn({ replies: ['a', 'a long reply with many words that all happen to be new'], lastStoneAsked: true, earlier, questionsSince: 4 }), null, 'long replies belong to the felt reading');
  assert.match(server, /questionsSince: \(\(\) => \{/, 'the route must count, or the gap is inert');
});

// 🔴 PLAY (29 Sep 2026): a joke named as a joke changes footing, and the route must pass it.
test('a reply that says it is play is read as play, and the route and the prompt carry it', async () => {
  const { isPlay } = await import('../lib/arc.mjs');
  const { buildTurnContext } = await import('../lib/dialogue.mjs');
  for (const s of ['Something absurd', 'I am laughing at myself', 'haha no', 'just kidding']) assert.equal(isPlay(s), true, s);
  for (const s of ['One cant', 'a strong will', 'the laughter track in the film is fake']) assert.equal(isPlay(s), false, s);
  assert.match(server, /const playing = !declined && !askingBack && \(isPlay\(message\)/);
  assert.match(server, /declined, corrected, playing,/);
  const ctx = buildTurnContext({ retrieved: [], message: 'I am laughing at myself', playing: { edge: 'When I called myself, my phone was busy' } });
  assert.match(ctx, /THEY ARE PLAYING/);
});

test('under play, the guard withholds a question that tests the joke literally', async () => {
  const { validateOutput } = await import('../lib/dialogue.mjs');
  assert.equal(validateOutput('How can one call oneself when the phone is busy?', { noLiteral: true }).ok, false);
  assert.equal(validateOutput('What are you too busy for, when you are laughing at it?', { noLiteral: true }).ok, true);
  assert.equal(validateOutput('How can one call oneself when the phone is busy?').ok, true, 'only under play');
  assert.match(server, /noLiteral: !!playing,/);
});

// 4 October 2026, Prayas: "I don't like it. Make fresh, unique openings". The opening takes no frame and the
// guard refuses the frames' heads on it; the frames start with the first reply.
test('the opening question takes no frame, and the stock frames are refused on it', async () => {
  const { approachFor, APPROACHES, OPENING_FRESH } = await import('../lib/arc.mjs');
  const { OPENING_HEADS, validateOutput } = await import('../lib/dialogue.mjs');
  assert.equal(approachFor(APPROACHES, ['I like dolls'], 'I like dolls'), OPENING_FRESH);
  assert.ok(APPROACHES.includes(approachFor(APPROACHES, ['I like dolls', 'they wait'], 'I like dolls')), 'frames return with the first reply');
  assert.equal(validateOutput('What would have to be true for you to like dolls?', { banHeads: OPENING_HEADS }).ok, false);
  assert.ok(server.includes('const banHeads = stoneTurns.length ? headBans(stoneTurns) : OPENING_HEADS;'));
});
