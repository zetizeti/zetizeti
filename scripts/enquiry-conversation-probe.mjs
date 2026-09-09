// enquiry-conversation-probe.mjs — a whole ENQUIRY, end to end, against the REAL endpoint.
//
// WHY THIS EXISTS, AND IT IS AN ADMISSION. On 17 August 2026 a real student's session showed three faults
// at once — a seven-question rut inside one detail of her idea, two replies she gave verbatim twice, and
// preambles asserting readings she never made — and the entire test suite passed throughout. It could not
// have failed. Every instrument this project had was blind to that session for a reason of its own:
//
//   1. UNIT TESTS ASSERT A TURN. `readDwell` returning a well-formed anchor was asserted; that the anchor
//      MOVES across a conversation was not. The criticism surface learned this on 15 August — "a unit test
//      cannot tell you the plan moves", after a plan sat on one station for fourteen rounds with every unit
//      test green — and the lesson was written down for `lib/plan.mjs` and never carried to enquiry.
//   2. `flow-probe.mjs` REASSEMBLES THE ROUTE BY HAND. It mirrors server.mjs's turn assembly rather than
//      calling it, so anything wired in the route is invisible to it. This project has paid for a
//      hand-copied route twice already (the duplicated describeLocated, the turn-cap guard on one path of
//      two). This probe POSTs to `/api/chat` exactly as the browser does; whatever the route does, this
//      measures.
//   3. 🔴 THE PLAY-ACTED STUDENT COMPLAINED. flow-probe's student is permitted — instructed — to say "you
//      already asked me that". So the harness could only ever discover failures that MAKE A STUDENT
//      COMPLAIN, which is the same assumption `isCorrection`, `isDecline` and `isRedirect` are built on.
//      A fluent, agreeable student says nothing and restates herself instead. That student did not exist
//      anywhere in this project until now, and she is the one the tool actually loses.
//
// So: two personas, and the second is the point.
//   --persona=candid     the existing student, permitted to disengage and to refuse a question that does
//                        not parse. Keeps flow-probe's instrument intact.
//   --persona=agreeable  never complains, never says a question repeats, and when a question re-treads
//                        ground she has nothing new for, she RESTATES HER PREVIOUS ANSWER. That is the
//                        behaviour that produced a real stall and left no complaint behind.
//
// WHAT IT ASSERTS, and all of it is about the CONVERSATION rather than the turn:
//   subject movement   content words shared between consecutive questions — the rut is high overlap
//   anchor movement    how many distinct anchors dwell chose across the run
//   goal coverage      how many things the learner named in their own opening were ever asked about
//   student repeats    replies identical to the one before (the silent signal)
//   tells / menus      interpretive preambles and two-box questions actually delivered
//
// ⚠️ A MODEL DOES NOT CLOSE THE TAB. None of this shows whether a real person would have stayed; that is
// the survival curve's job and it needs real sessions.
// 🔴 THE MATERIAL IS AN ARGUMENT. `scripts/` is the public shelf, so no student's words live in this file:
// pass an edge with --edge= or --edge-file=, and the default is invented.
//
// RUN:
//   cd app
//   NODE_ENV=development ZETIZETI_ALLOW_GUEST=1 node --env-file=.env server.mjs &
//   node --env-file=.env scripts/enquiry-conversation-probe.mjs --rounds=10 --persona=agreeable
//
//   node scripts/enquiry-conversation-probe.mjs --transcript=path/to/dialogue.md
//     Reads a REAL saved dialogue instead of running one. No server, no key, no model call.
//     This is the reading that makes dialogue quality checkable rather than asserted.

import { writeFileSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

import { streamQuestion } from '../lib/llm.mjs';
import { readDwell, isRepeatOf, NONMATERIAL } from '../lib/arc.mjs';
import { preambleOf, validateOutput } from '../lib/dialogue.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d = null) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const BASE = arg('base', 'http://localhost:3999');
const ROUNDS = Number(arg('rounds', '10'));
const PERSONA = arg('persona', 'agreeable');
const DISCIPLINE = arg('discipline', 'all');
const EDGE_FILE = arg('edge-file');
// 🔴 --force-repeat-at=N makes the student hand back their previous reply, unchanged, at round N.
// This exists because a unit test on `readDwell` proves the FUNCTION responds to a repeat and proves
// nothing about whether the route ever passes one. That wiring — server.mjs computing `repeated` and
// handing it to readDwell — is exactly the kind of link this project has twice found broken while every
// test passed (BINARY_DEMAND unreachable from the criticism path for that surface's whole life; the
// turn-cap guard written on one path of two). The only proof is a repeat travelling the real endpoint.
// It is also honest about the play-acting: an instructed persona may simply decline to repeat, as it did
// on the first ten-round run, and a probe that cannot produce the condition cannot report on it.
const FORCE_REPEAT_AT = Number(arg('force-repeat-at', '0'));

// ── READING A REAL DIALOGUE (7 September 2026) ────────────────────────────────────────────────────
// 🔴 `--transcript=<file.md>` runs every reading below over a REAL saved dialogue instead of a
// play-acted one. This is the whole reason the file exists twice over: since the dialogue became the
// artifact, its quality is the only thing worth judging, and the apparatus for judging it was already
// written here and pointed at a simulation.
//
// 🔴 IT SHARES THE READINGS RATHER THAN COPYING THEM. One derivation, two inputs — a second
// implementation would drift, which is the defect class this project keeps meeting.
//
// What changes in this mode, and each is a gain rather than a compromise:
//   · No server, no key, no cost, no model call. A dialogue is read offline.
//   · The EDGE is not supplied; it is the learner's first turn, which is what an edge actually is.
//   · Breaches are RE-COMPUTED against today's guard rather than read from a `validation` event the
//     file never carried. So the reading answers a better question than the live probe can: would
//     these questions pass the rules as they stand NOW? A dialogue from July can be read against
//     September's guard, and that is how a released fix is checked against real past conversations.
// ⚠️ What it cannot see: the anchor readings are recomputed from the turns and match what the route
// computed only if the corpus and `lib/arc.mjs` have not changed since. Where they have, this reads
// the dialogue as today's code would have steered it, not as it was steered. Say which you mean.
// 🔴 TWO CHECKS REFUSE AN INTERPRETIVE PREAMBLE AND THIS READING COUNTED ONLY ONE (9 September 2026).
// `dialogue.mjs` refuses the clause before a question twice over, and the two say different things:
// PREAMBLE_TELLS matches a named tell and reports "interprets what they said"; the ownWords ratio check
// reports "states a reading they did not give". This probe tested for the first alone, so its summary
// line printed `interpretive tells 0` across twenty real dialogues in which four questions had been
// refused by the second — a reading that names a class and counts half of it. Both, now, from one
// pattern feeding both branches.
const INTERPRETIVE = /interprets what they said|states a reading they did not give/;

const TRANSCRIPT = arg('transcript');

// The inverse of buildTranscriptMd, kept deliberately in the same SHAPE as parseTranscriptMd in
// public/index.html: front matter, then paragraphs, `**Q.**` marking the stone and everything else the
// learner. Headings and the italic note are skipped by form, not by their wording — the wording changed
// on 7 September and a parser keyed to it would have silently started reading boilerplate as a turn.
function readTranscript(path) {
  const src = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm || !/^source:\s*zetizeti\s*$/m.test(fm[1])) throw new Error(`${path} is not a zetizeti transcript`);
  const kind = (fm[1].match(/^type:\s*(\S+)\s*$/m) || [])[1];
  if (kind !== 'idea-transcript') throw new Error(`${path} is a ${kind || 'unknown'}, not an enquiry dialogue`);
  const turns = [];
  for (let para of src.slice(fm[0].length).split(/\n{2,}/)) {
    para = para.trim();
    if (!para || /^#/.test(para) || /^_[\s\S]*_$/.test(para)) continue;
    const q = para.match(/^\*\*Q\.\*\*\s*([\s\S]+)$/);
    turns.push(q ? { role: 'stone', content: q[1].trim() } : { role: 'student', content: para });
  }
  while (turns.length && turns[0].role === 'stone') turns.shift();   // a dialogue opens on the learner
  if (!turns.length) throw new Error(`${path} holds no turns`);
  return turns;
}
// Invented, and deliberately nothing like any student's project: a subject identifies a person as well
// as a name does (the v0.14.2 finding).
const EDGE = TRANSCRIPT ? '' : EDGE_FILE ? readFileSync(EDGE_FILE, 'utf8').trim() : (arg('edge')
  || 'A repair kiosk for bicycles at the edge of a market. A rider leaves the bike, walks off, and comes '
   + 'back to find it done. I want a paper receipt, a queue that is visible from the road, an awning for '
   + 'the monsoon, and a stool where somebody can wait if they would rather not leave.');

// ⚠️ NONMATERIAL is a HEDGE list, not a stopword list — it exists to stop "more"/"gets"/"where" becoming
// an ANCHOR, and it has never had to carry grammar. Reading questions with it alone made the first run of
// this probe report its longest rut on the word "the". So the probe adds ordinary English grammar on top
// for its own reading, and changes nothing about what the engine does.
const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','its','that','this',
  'for','with','about','how','what','when','why','do','does','so','not','are','was','be','been','has',
  'have','had','at','by','from','as','if','then','there','their','they','them','you','your','into','can',
  'could','would','should','will','may','might','must','who','whom','whose','which','while','during']);
const words = (s) => [...new Set((String(s).toLowerCase().match(/[a-z]{3,}/g) || []))]
  .filter((w) => !NONMATERIAL.has(w) && !STOP.has(w));

// 🔴 AN ANCHOR THAT IS A HEDGE OR A LIGHT VERB IS A FAILED ANCHOR, and this reading is why the probe was
// worth building. `NONMATERIAL` is hand-written and has INFLECTION GAPS — "make" is on it and "makes" is
// not; "come"/"comes" are both on it — plus no entry at all for "like", "probably", "feel" or "see". Two
// ten-round runs anchored on `like`, `probably`, `makes`, `see` and `lined`. Nothing could have caught
// that, because no test has ever asserted what the anchor IS across a conversation. Reported rather than
// enforced: what to add to NONMATERIAL is a register change, and register changes are replayed against
// both real fixtures first (feedback-two-student-rule).
const WEAK = new Set([...STOP, 'like','likes','liked','probably','maybe','feel','feels','felt','see','sees',
  'seen','look','looks','looking','makes','made','making','gets','getting','thing','things','something',
  'really','actually','lot','kind','sort','bit','way','ways','one','two','put','puts','say','says','said',
  'know','knows','think','thinks','need','needs','use','uses','used','lined','stuff','part','parts']);

// ── guest session ────────────────────────────────────────────────────────────────────────────────
let COOKIE = '';
async function signInAsGuest() {
  const r = await fetch(`${BASE}/auth/guest`, { redirect: 'manual' });
  const set = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
  COOKIE = set.map((c) => c.split(';')[0]).join('; ');
  if (!COOKIE) throw new Error(`no session cookie — server running with ZETIZETI_ALLOW_GUEST=1? (status ${r.status})`);
}

async function sse(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: COOKIE }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const events = [];
  for (const block of (await r.text()).split('\n\n')) {
    const ev = /^event: (.+)$/m.exec(block), da = /^data: (.+)$/m.exec(block);
    if (ev && da) { try { events.push({ event: ev[1], data: JSON.parse(da[1]) }); } catch { /* skip */ } }
  }
  const err = events.find((e) => e.event === 'error');
  if (err) throw new Error(`${path} → ${err.data.code}: ${err.data.message}`);
  return events;
}

// ── the two students ─────────────────────────────────────────────────────────────────────────────
const COMMON = `You are a design student in a one-to-one tutorial about your own project. The tutor only asks questions; you do the thinking. You never ask questions back.

How you answer:
- Short. One to three sentences. You are typing on a laptop, not writing an essay.
- In your own words, thinking aloud. You contradict yourself sometimes.
- If a question genuinely opens something, follow it and say what you now see.
Never break character and never mention that you are a model.`;

const PERSONAS = {
  candid: `${COMMON}
- 🔴 You are ALLOWED TO DISENGAGE. If a question is vague, circular, or repeats one you have already
  answered, say so plainly — "you already asked me that", "I don't understand the question", "that
  doesn't make sense to me". Do not manufacture an insight to be helpful.`,

  // The student every instrument here was blind to. Nothing about her is unusual except that she is polite.
  agreeable: `${COMMON}
- 🔴 YOU ARE UNFAILINGLY POLITE AND YOU NEVER COMPLAIN. You do not say "you already asked that", you do
  not say a question is confusing, you do not push back, and you never refuse to answer. You want to be
  helpful and you assume the tutor knows what they are doing.
- 🔴 WHEN A QUESTION ASKS ABOUT SOMETHING YOU HAVE ALREADY ANSWERED, AND YOU HAVE NOTHING NEW TO ADD,
  REPEAT YOUR PREVIOUS ANSWER — reply with the same sentences you gave before, as closely as you can,
  rather than inventing something to fill the space. This is what a real person does when they have run
  out and do not want to be rude.
- Only give genuinely new material when a question actually reaches a part of your project you have not
  talked about yet.`,
};
if (!PERSONAS[PERSONA]) { console.error(`unknown persona "${PERSONA}" — candid | agreeable`); process.exit(1); }

async function studentReply(history, question) {
  const messages = [
    { role: 'user', content: `This is your project: ${EDGE}` },
    ...history.map((h) => ({ role: h.role === 'stone' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: question },
  ];
  const out = await streamQuestion({
    system: PERSONAS[PERSONA], messages, maxTokens: 160, temperature: 0.9,
    reasoning: { enabled: false }, onToken: () => {},
    appTitle: 'zetizeti-dev (student sim)',
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return String(out).trim();
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────

// 🔴 VERIFY WHICH BUILD IS ANSWERING BEFORE MEASURING IT (17 Aug 2026). A probe run reported on a server
// that had crashed on a port collision, leaving an OLDER process still bound and still answering — so the
// numbers described a build that no longer existed, and two of them were "fixed" faults that had simply
// not been restarted. This is the project's own deploy rule arriving locally: a green log is not evidence
// that anything shipped, so ask the destination what it is running and compare it with the tree you edited.
async function assertLiveBuild() {
  const r = await fetch(`${BASE}/api/version`).catch(() => null);
  const live = r && r.ok ? await r.json() : null;
  if (!live) throw new Error('no /api/version — is the server up?');
  // The build string cannot separate a fresh server from a stale one: the failure that prompted this had
  // the SAME commit and older code in memory. Only the start time can, compared with the source mtimes.
  const { statSync, readdirSync } = await import('node:fs');
  const roots = ['server.mjs', 'lib'];
  let newest = 0, newestFile = '';
  const walk = (rel) => {
    const abs = join(APP, rel);
    const st = statSync(abs);
    if (st.isDirectory()) { for (const f of readdirSync(abs)) walk(join(rel, f)); return; }
    if (st.mtimeMs > newest) { newest = st.mtimeMs; newestFile = rel; }
  };
  for (const rel of roots) walk(rel);
  const started = Date.parse(live.startedAt || 0);
  console.log(`server   : ${live.build || live.version}  started ${live.startedAt || '(unknown)'}`);
  if (!started) throw new Error('the server does not report startedAt — it predates this check; restart it');
  if (newest > started) {
    throw new Error(`${newestFile} changed after the server started (${new Date(newest).toISOString()} > `
      + `${live.startedAt}) — RESTART IT. Measuring a server that is not running the code you edited is how `
      + 'two "fixed" faults were reported as still failing.');
  }
}

(async () => {
  // Reading a saved dialogue needs no server and no key; only the live probe does.
  const savedTurns = TRANSCRIPT ? readTranscript(TRANSCRIPT) : null;
  if (!savedTurns) { await assertLiveBuild(); await signInAsGuest(); }
  // 🔴 THE EDGE IS THE LEARNER'S FIRST TURN when reading a dialogue. Goal coverage asks how many of the
  // things a person named at the start were ever asked about, and in a saved file that opening is
  // simply there — it does not have to be supplied, and supplying one would measure against something
  // the conversation never had.
  const edgeText = savedTurns ? savedTurns[0].content : EDGE;
  const goalWords = words(edgeText);
  console.log('='.repeat(78));
  if (savedTurns) {
    console.log(`reading  : ${TRANSCRIPT}`);
    console.log(`source   : a real saved dialogue — no server, no model call, nothing generated here`);
    console.log(`rounds   : ${savedTurns.filter((t) => t.role === 'stone').length} questions asked`);
  } else {
    console.log(`persona  : ${PERSONA}${PERSONA === 'agreeable' ? '  (never complains; restates when out of material)' : '  (permitted to disengage)'}`);
    console.log(`rounds   : ${ROUNDS}`);
  }
  console.log(`edge     : ${edgeText.slice(0, 96)}${edgeText.length > 96 ? '…' : ''}`);
  console.log(`named    : ${goalWords.length} concrete things in their own opening`);
  console.log('='.repeat(78));

  const history = [];                       // {role:'stone'|'student', content}
  const rows = [];
  let question = null;

  // ── READING A SAVED DIALOGUE ────────────────────────────────────────────────────────────────────
  // The same readings as the live path below, over turns that already happened. Breaches are
  // RE-COMPUTED against today's guard, because the file carries no validation event — which makes this
  // the only way to ask whether questions that shipped would still pass.
  if (savedTurns) {
    for (let i = 0; i < savedTurns.length; i++) {
      if (savedTurns[i].role !== 'stone') continue;
      const q = savedTurns[i].content;
      const before = savedTurns.slice(0, i);
      const stoneTurns = before.filter((t) => t.role === 'stone').map((t) => t.content);
      const allStudent = before.filter((t) => t.role !== 'stone').map((t) => t.content);
      const reply = savedTurns[i + 1] && savedTurns[i + 1].role !== 'stone' ? savedTurns[i + 1].content : '';
      const withReply = reply ? [...allStudent, reply] : allStudent;
      const prev = withReply[withReply.length - 2];
      const repeated = reply && prev ? isRepeatOf(reply, prev) : false;
      const dwell = readDwell({ studentTurns: withReply, stoneTurns: [...stoneTurns, q], goal: edgeText, repeated });
      const ownWords = new Set(withReply.flatMap((t) => words(t)));
      // 🔴 THE ROUTE'S OWN OPTION SET, NOT A BARE CALL — and the first version of this reader got it
      // wrong, which is worth recording because of the DIRECTION of the error. `validateOutput` with no
      // options is nearly inert: `noBinary`, `noClosed`, `noCompound`, `avoid`, `banOpeners`, `banHeads`
      // and `maxWords` are all off by default, so a bare call reported a real dialogue as clean and would
      // have told anyone reading it that the questions were better than they were. **A reading apparatus
      // that flatters the thing it reads is worse than none.** Caught by checking one known-bad question
      // — a `before or after` menu the guard was widened to refuse — coming back with no reasons.
      // ⚠️ These are read off `server.mjs` and will drift from it. That is a real cost of recomputing
      // rather than reading a stored verdict, and it is accepted because a saved dialogue carries no
      // verdict at all; the gain is that a July dialogue can be read against September's rules.
      const check = validateOutput(q, {
        ownWords, avoid: stoneTurns, noBinary: true, noClosed: true, noCompound: true, maxWords: 34,
      });
      const tell = !check.reasons.every((r) => !INTERPRETIVE.test(r));
      const overlapPrev = stoneTurns.length
        ? [...new Set(words(q))].filter((w) => words(stoneTurns[stoneTurns.length - 1]).includes(w)).length : 0;
      const round = rows.length + 1;
      rows.push({ round, question: q, reply, repeated, anchor: dwell?.anchor || (dwell?.invite ? 'INVITE' : null),
        tell, pre: preambleOf(q), overlapPrev, breach: !check.ok, reasons: check.reasons || [] });
      console.log(`\n── question ${round} ${'─'.repeat(48)}`);
      console.log(`Q  ${q}`);
      console.log(`A  ${reply.replace(/\n+/g, ' ').slice(0, 150)}${reply.length > 150 ? '…' : ''}${reply ? '' : '(no reply — the dialogue ended here)'}`);
      console.log(`   anchor=${rows[rows.length - 1].anchor || '—'}  repeat=${repeated ? 'YES' : 'no'}`
        + `  overlap-with-last-Q=${overlapPrev}${tell ? '  TELL' : ''}${!check.ok ? '  WOULD BREACH TODAY' : ''}`);
    }
    history.push(...savedTurns);
  }

  for (let round = 1; !savedTurns && round <= ROUNDS; round++) {
    const stoneTurns = history.filter((h) => h.role === 'stone').map((h) => h.content);
    const studentTurns = history.filter((h) => h.role !== 'stone').map((h) => h.content);

    const ev = await sse('/api/chat', {
      message: round === 1 ? EDGE : studentTurns[studentTurns.length - 1],
      history: history.map((h) => ({ role: h.role === 'stone' ? 'interlocutor' : 'student', content: h.content })),
      goal: EDGE, kind: round === 1 ? 'open' : 'turn', exchanges: round - 1, discipline: DISCIPLINE,
      turnsSinceNudge: 99,
    });
    question = ev.filter((e) => e.event === 'token').map((e) => e.data.t).join('').trim();
    const validation = ev.find((e) => e.event === 'validation')?.data || {};
    if (!question) throw new Error(`round ${round}: no question came back`);
    history.push({ role: 'stone', content: question });

    const prevReply = studentTurns[studentTurns.length - 1];
    const forced = FORCE_REPEAT_AT && round === FORCE_REPEAT_AT && prevReply;
    const reply = forced ? prevReply : await studentReply(history.slice(0, -1), question);
    if (forced) console.log(`   [forced repeat: the student hands back their round-${round - 1} reply verbatim]`);
    history.push({ role: 'student', content: reply });

    // ── readings, for OBSERVATION ONLY. All pure, so they reproduce what the route computed.
    const allStudent = history.filter((h) => h.role !== 'stone').map((h) => h.content);
    const prev = allStudent[allStudent.length - 2];
    const repeated = prev ? isRepeatOf(reply, prev) : false;
    const dwell = readDwell({ studentTurns: allStudent, stoneTurns: [...stoneTurns, question], goal: EDGE, repeated });
    const pre = preambleOf(question);
    const tell = !validateOutput(question, { ownWords: new Set(allStudent.flatMap((t) => words(t))) })
      .reasons.every((r) => !INTERPRETIVE.test(r));
    const qw = new Set(words(question));
    const overlapPrev = stoneTurns.length
      ? [...qw].filter((w) => words(stoneTurns[stoneTurns.length - 1]).includes(w)).length : 0;

    rows.push({ round, question, reply, repeated, anchor: dwell?.anchor || (dwell?.invite ? 'INVITE' : null),
      tell, pre, overlapPrev, breach: !validation.ok, reasons: validation.reasons || [] });

    console.log(`\n── round ${round} ${'─'.repeat(50)}`);
    console.log(`Q  ${question}`);
    console.log(`A  ${reply.replace(/\n+/g, ' ').slice(0, 150)}${reply.length > 150 ? '…' : ''}`);
    console.log(`   anchor=${rows[rows.length - 1].anchor || '—'}  repeat=${repeated ? 'YES' : 'no'}`
      + `  overlap-with-last-Q=${overlapPrev}${tell ? '  TELL' : ''}${!validation.ok ? '  BREACH' : ''}`);
  }

  // ── the conversation-level verdict ─────────────────────────────────────────────────────────────
  const anchors = rows.map((r) => r.anchor).filter(Boolean);
  const distinct = new Set(anchors).size;
  const repeats = rows.filter((r) => r.repeated).length;
  const tells = rows.filter((r) => r.tell).length;
  const breaches = rows.filter((r) => r.breach).length;
  const asked = new Set(rows.flatMap((r) => words(r.question)));
  const covered = goalWords.filter((w) => asked.has(w)).length;
  const meanOverlap = (rows.slice(1).reduce((a, r) => a + r.overlapPrev, 0) / Math.max(1, rows.length - 1));
  // THE RUT, and the first version of this metric was useless: "consecutive questions sharing ANY content
  // word" saturated at the full run length, because a project's own nouns recur by definition. What
  // discriminates is ONE word held across consecutive questions — which is exactly what a rut is, and what
  // anchor rotation is supposed to prevent. Named, so the number can be argued with.
  let longestRut = 0, rutWord = null;
  for (const w of new Set(rows.flatMap((r) => words(r.question)))) {
    let cur = 0;
    for (const r of rows) {
      cur = words(r.question).includes(w) ? cur + 1 : 0;
      if (cur > longestRut) { longestRut = cur; rutWord = w; }
    }
  }

  // ══ NOTES ON A DIALOGUE — read the way a script editor reads a scene ═══════════════════════════
  //
  // 🔴 REVISED 7 September 2026 (Prayas: *"engagement needs to be assessed if at all like cinema
  // dialogue"*). The first version of this section produced sensor VALUES — reciprocity, trajectory,
  // uptake, accumulation. That was the wrong instrument twice over. **Cinema dialogue has been assessed
  // seriously for a century and has never once been measured.** A script editor computes nothing; they
  // read the scene and write notes: *this is on the nose · nothing happens between four and nine · you
  // could cut this and lose nothing*. No score, no comparison across films, no target to optimise
  // toward — which is exactly the apparatus this practice refuses everywhere else, and I had begun
  // rebuilding it under the word "engagement", a word whose industry meaning is time-on-site.
  //
  // 🔴 SO THESE ARE NOTES, AND EVERY ONE OF THEM POINTS AT A TURN. The output is not a verdict on the
  // dialogue; it is a list of places to go and read, with the reason it is worth reading. **The value of
  // a note is entirely in what it makes somebody open the transcript to.** Where a number appears it is
  // there to locate a turn, never to rank a dialogue.
  //
  // 🔴 NO AGGREGATE IS AVAILABLE, and that is now structural rather than a promise. There is nothing
  // here to sum: a note is a turn index and a sentence. Two dialogues produce two lists of notes, and
  // lists of notes do not average. The previous version emitted numbers that invited comparison and I
  // compared two of them within minutes of writing it, which is the whole argument for this change.
  //
  // ⚠️ Notes are made by a reader with craft, and this makes only the ones a machine can make honestly.
  // It cannot see subtext, cannot tell whether anybody wanted anything, and cannot hear a line that
  // nobody would say. It reads the transcript for FOUR shapes the craft has names for.
  const turnsWithReply = rows.filter((r) => r.reply && r.reply.trim());
  const notes = [];
  const wordsOf = (t) => new Set(words(t));

  // ── 1 · COULD IT BE CUT? ─────────────────────────────────────────────────────────────────────────
  // The strongest test in the craft, and the reason it is first. Remove the turn: does anything after
  // it still depend on it? A turn is DEAD if no later question or reply uses material that entered the
  // dialogue at that turn. Not "a weak turn" — a turn that could be deleted with nothing downstream
  // noticing, which is the script editor's actual test and is nothing like a low score.
  for (let i = 0; i < turnsWithReply.length - 1; i++) {
    const r = turnsWithReply[i];
    const before = new Set(turnsWithReply.slice(0, i).flatMap((x) => [...words(x.question), ...words(x.reply)]));
    const introduced = [...new Set([...words(r.question), ...words(r.reply)])].filter((w) => !before.has(w));
    if (!introduced.length) { notes.push([r.round, 'nothing new entered here at all — the turn could be cut and nothing before or after would change']); continue; }
    const after = new Set(turnsWithReply.slice(i + 1).flatMap((x) => [...words(x.question), ...words(x.reply)]));
    const survived = introduced.filter((w) => after.has(w));
    if (!survived.length) notes.push([r.round, `what entered here (${introduced.slice(0, 4).join(', ')}) is never touched again — cuttable`]);
  }

  // ── 2 · DOES THE LINE DO SOMETHING? ──────────────────────────────────────────────────────────────
  // A question that could have been asked at any point in the conversation is doing nothing. The test
  // is whether it is ANCHORED to the moment: does it reach into the reply immediately before it?
  // This catches the rut, the generic question and the metronome in one category, and it catches them
  // as a craft fault rather than as a threshold crossing.
  // ⚠️ CALIBRATED ONCE AND WRONG. The first version asked whether the question shared ANY word with the
  // previous reply, and it passed a dialogue the conformance read found sitting on one word for five
  // consecutive questions — because a question recycling the topic noun still "touches" the last reply.
  // **The furniture of a conversation is not uptake.** What the craft actually asks is whether the line
  // takes something the previous answer ADDED; recycling the subject is the definition of a line that
  // could have been said at any point.
  for (let i = 1; i < turnsWithReply.length; i++) {
    const priorAll = new Set(turnsWithReply.slice(0, i - 1).flatMap((x) => [...words(x.question), ...words(x.reply)]));
    const addedByLastReply = words(turnsWithReply[i - 1].reply).filter((w) => !priorAll.has(w));
    const q = words(turnsWithReply[i].question);
    if (!addedByLastReply.length) continue;                    // they added nothing; that is their turn, not the question's fault
    if (!q.some((w) => addedByLastReply.includes(w))) {
      notes.push([turnsWithReply[i].round,
        `takes nothing the last answer added (they brought ${addedByLastReply.slice(0, 3).join(', ')}) — this question could have been asked at any point`]);
    }
  }

  // ── 3 · ON THE NOSE ──────────────────────────────────────────────────────────────────────────────
  // A line that says exactly what it means, with no gap between surface and intent. In a questioning
  // tool this is the question that ANNOUNCES ITS OWN FUNCTION — *what would help you clarify…*,
  // *how might you explore…*. The craft's oldest complaint, and the tool has been groping at it under
  // the name PREAMBLE_TELLS without the vocabulary.
  const ON_THE_NOSE = /\b(clarify|explore|unpack|reflect on|think about|consider|examine|articulate|define)\b/i;
  for (const r of turnsWithReply) {
    if (ON_THE_NOSE.test(r.question)) {
      notes.push([r.round, `on the nose — the question names the thinking it wants instead of asking for the thing (${(r.question.match(ON_THE_NOSE) || [])[0]})`]);
    }
  }

  // ── 4 · HAS THE THING MOVED? ─────────────────────────────────────────────────────────────────────
  // Not *did they learn*, which is the aid frame and unmeasurable. Whether the ACCOUNT OF THE PROBLEM
  // at the end differs from the account at the start — a property of the text, not a claim about
  // anybody. One note either way, and it is the only note about the dialogue as a whole.
  // ⚠️ AND THIS ONE WAS NOISE ON A SHORT ENDING. Comparing the LAST REPLY against the first gave 100%
  // on a fifteen-word closing line, which says nothing — a short answer shares few words with anything.
  // It now reads the closing THIRD against the opening third, and refuses to say anything at all when
  // there is too little text on either side to mean it. A reading that produces a figure where there is
  // nothing to read is worse than one that declines.
  if (turnsWithReply.length >= 6) {
    const third = Math.max(2, Math.floor(turnsWithReply.length / 3));
    const open = new Set(turnsWithReply.slice(0, third).flatMap((x) => words(x.reply)));
    const close = new Set(turnsWithReply.slice(-third).flatMap((x) => words(x.reply)));
    if (open.size >= 12 && close.size >= 12) {
      const shared = [...close].filter((w) => open.has(w)).length;
      const moved = 1 - shared / close.size;
      notes.push([turnsWithReply[turnsWithReply.length - 1].round, moved > 0.7
        ? `by the close they are describing it in largely different terms — ${Math.round(moved * 100)}% of what they say late is not in what they said early. Read the first and last thirds together and see whether the thing moved or the subject changed.`
        : `they are describing it in much the same terms at the close as at the start (${Math.round(moved * 100)}% new late). Read the first and last thirds together.`]);
    }
  }

  console.log(`\n${'='.repeat(78)}`);
  console.log('NOTES ON THE DIALOGUE  — read the way a scene is read, not scored');
  if (!savedTurns) console.log('🔴 ON A PROBE RUN THESE ARE WORTH LITTLE — the student is play-acted. See the note in the source.');
  console.log('-'.repeat(78));
  if (!notes.length) {
    console.log('  no notes. That is not praise — it means nothing this reads for was present.');
  } else {
    notes.sort((a, b) => a[0] - b[0]);
    for (const [turn, text] of notes) console.log(`  turn ${String(turn).padStart(2)}   ${text}`);
  }
  console.log('-'.repeat(78));
  console.log(`  ${notes.length} note(s) on ${turnsWithReply.length} turns. Every one names a turn; go and read those turns.`);
  console.log('  There is no score here and nothing to sum — notes do not average.');

  // 🔴 THE SENSOR-VALUE SECTION PRINTED HERE UNTIL 9 SEPTEMBER 2026 AND ITS COMPUTATION WAS ALREADY GONE.
  // The 7 September notes rewrite replaced the engagement reading — reciprocity, trajectory, uptake,
  // accumulation — with the notes above, on the argument recorded in CLAUDE.md: two sensor values were
  // compared against each other within minutes of being written, which is the apparatus this practice
  // refuses. The computation was deleted in that pass and the PRINT BLOCK was left standing, so every
  // run of this probe — transcript mode and probe mode alike — threw `reciprocity is not defined` here,
  // AFTER the notes had printed and BEFORE the conformance summary below and the run JSON at the end.
  // It therefore looked like a working probe with a short tail, and no run has been written to
  // docs/ops/flow-probe-runs/ since. Removed rather than restored: the values were superseded on
  // purpose, and a half-deletion that still prints is how a retired mechanism comes back.

  console.log(`\n${'='.repeat(78)}`);
  // An apostrophe in an anchor is a contraction, and a contraction is never material — counted here
  // rather than in WEAK because the list cannot enumerate them and this reading must not flatter itself.
  const weakAnchors = anchors.filter((a) => WEAK.has(a) || a.includes("'"));
  console.log(`distinct anchors          ${distinct} of ${anchors.length} turns`);
  console.log(`WEAK anchors              ${weakAnchors.length} of ${anchors.length}`
    + `${weakAnchors.length ? `  — ${[...new Set(weakAnchors)].join(', ')}  (a hedge or light verb is a failed anchor)` : ''}`);
  console.log(`student verbatim repeats  ${repeats}`);
  console.log(`goal coverage             ${covered}/${goalWords.length} things they named were asked about`);
  console.log(`mean overlap w/ prev Q    ${meanOverlap.toFixed(2)} content words`);
  console.log(`longest rut               ${longestRut} consecutive questions on "${rutWord}"`);
  console.log(`interpretive preambles    ${tells}   (both checks: a named tell, and a reading they did not give)`);
  console.log(`guard breaches delivered  ${breaches}`);
  console.log('='.repeat(78));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirSync(join(APP, '..', 'docs', 'ops', 'flow-probe-runs'), { recursive: true });
  const out = join(APP, '..', 'docs', 'ops', 'flow-probe-runs', `enquiry-conversation-${stamp}.json`);
  writeFileSync(out, JSON.stringify({
    source: savedTurns ? 'saved-dialogue' : 'probe',
    transcript: savedTurns ? TRANSCRIPT : undefined,
    persona: savedTurns ? undefined : PERSONA, rounds: savedTurns ? rows.length : ROUNDS, edge: edgeText,
    summary: { distinct, weak: weakAnchors.length, weakWords: [...new Set(weakAnchors)], turns: anchors.length, repeats, covered, named: goalWords.length, meanOverlap, longestRut, rutWord, tells, breaches },
    rows }, null, 2));
  appendFileSync(join(APP, '..', 'docs', 'ops', 'flow-probe-log.md'),
    `\n- **enquiry-conversation-probe** ${stamp} · ${savedTurns ? `READ \`${TRANSCRIPT.split('/').slice(-1)[0]}\` (a real dialogue)` : `persona \`${PERSONA}\``} · ${savedTurns ? rows.length : ROUNDS} rounds — `
    + `${distinct} distinct anchors (${weakAnchors.length} weak), ${repeats} student repeats, coverage ${covered}/${goalWords.length}, `
    + `longest rut ${longestRut} on \`${rutWord}\`, ${tells} tells, ${breaches} breaches. \`${out.split('/').slice(-1)[0]}\`\n`);
  console.log(`\nwritten: ${out}`);
})().catch((e) => { console.error(`\nPROBE FAILED: ${e.message}`); process.exit(1); });
