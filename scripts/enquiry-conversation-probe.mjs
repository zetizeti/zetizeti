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
      const tell = !check.reasons.every((r) => !/interprets what they said/.test(r));
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
      .reasons.every((r) => !/interprets what they said/.test(r));
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

  // ══ THE ENGAGEMENT READING (7 September 2026) ═══════════════════════════════════════════════════
  //
  // 🔴 A DIFFERENT PARADIGM FROM EVERYTHING ABOVE, AND THE OLD ONE IS NOT REPLACED — it is demoted.
  // Every measure above answers *did the tool follow its rules*: anchors rotated, no rut, no breach, no
  // tell. That is CONFORMANCE, and it was the right question while the tool was the thing being built.
  // Since the dialogue became the artifact it reads the wrong object, because **a dialogue can be
  // perfectly conformant and completely dead** — ten well-formed questions, ten thinning replies, and
  // every conformance number green.
  //
  // 🔴 THE LINE THIS MUST NOT CROSS, and it is invariant #7's line exactly. *This person disengaged* is
  // a characterisation of an inquirer and is forbidden. *Replies fell from 40 words to 6 across four
  // turns while the questions held at 20* is a property of the dialogue, and is not. **Everything below
  // describes the exchange and nothing describes either party.** Where a number is unflattering it is
  // unflattering about the artifact, which is the only thing here that can be judged.
  //
  // 🔴 NO SCORE, NO GRADE, NO AGGREGATE. One dialogue at a time, read by a person. There is deliberately
  // 🔴 THESE READINGS ARE FOR A REAL DIALOGUE AND ARE NEARLY MEANINGLESS ON A PROBE RUN — measured
  // 7 September 2026, the first time they were used. The play-acted student wrote 603 words against 154
  // asked (reciprocity 3.92) and produced a PERFECTLY FLAT reply profile across ten turns, ▆▆▆▅▅▅▅▅▅▅.
  // A real dialogue from 29 July read 1.38 and ▃▄▅▂▄▅▂▅▃. **A person's investment fluctuates — four
  // words when a question does not land, forty when it does — and an instructed persona is generous on
  // every turn by construction.** So it cannot thin, cannot trail off, and cannot end; the three things
  // engagement is mostly made of are the three it cannot produce. This is the project's own standing
  // finding — *a model doesn't close the tab* — arriving at a new instrument, now with numbers on it.
  // ⚠️ The conformance measures above are NOT affected: they read the tool's behaviour, and a play-acted
  // student is a fair enough subject for that. Engagement reads the exchange, and half of the exchange
  // is then a fiction.
  // no composite: five readings that disagree are more useful than one number that hides the
  // disagreement, and a mean across dialogues would be a metric about reception, which not-knowing
  // refuses. ⚠️ These are DESCRIPTIONS and none of them is validated against anything. No study says a
  // reciprocity of 2.1 is better than 1.4. They are here to be read beside the transcript, not instead
  // of it.
  const turnsWithReply = rows.filter((r) => r.reply && r.reply.trim());
  const qLen = (r) => String(r.question).trim().split(/\s+/).length;
  const aLen = (r) => String(r.reply).trim().split(/\s+/).length;

  // 1 · RECIPROCITY — whose words the dialogue is made of. A dialogue where one side does all the
  // talking is a questionnaire or a lecture, whichever way it leans. Reported as a ratio, not a target.
  const qWords = turnsWithReply.reduce((a, r) => a + qLen(r), 0);
  const aWords = turnsWithReply.reduce((a, r) => a + aLen(r), 0);
  const reciprocity = qWords ? aWords / qWords : 0;

  // 2 · THINNING — the trajectory, first third against last third. A dialogue that is still going has
  // replies that hold their length; one that has run out has replies that shrink while the questions do
  // not. Both halves are reported, because a fall in BOTH is a conversation ending together and a fall
  // in one is a conversation ending on one side.
  const third = Math.max(1, Math.floor(turnsWithReply.length / 3));
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const aEarly = mean(turnsWithReply.slice(0, third).map(aLen));
  const aLate  = mean(turnsWithReply.slice(-third).map(aLen));
  const qEarly = mean(turnsWithReply.slice(0, third).map(qLen));
  const qLate  = mean(turnsWithReply.slice(-third).map(qLen));

  // 3 · UPTAKE, BOTH WAYS — and this is the measure the conformance set has no version of. `overlapPrev`
  // above reads question-to-QUESTION overlap, which detects a rut. Uptake reads ACROSS the exchange:
  // how much of each question comes out of the reply before it, and how much of each reply engages the
  // question it answers. Two turns that share nothing are two monologues taking it in turns.
  const uptakeQ = [], uptakeA = [];
  for (let i = 0; i < turnsWithReply.length; i++) {
    const prevReply = i > 0 ? words(turnsWithReply[i - 1].reply) : null;
    const qw = words(turnsWithReply[i].question), aw = words(turnsWithReply[i].reply);
    if (prevReply && prevReply.length) uptakeQ.push(qw.filter((w) => prevReply.includes(w)).length);
    if (qw.length) uptakeA.push(aw.filter((w) => qw.includes(w)).length);
  }

  // 4 · ACCUMULATION — does the dialogue BUILD, or reset every turn? Material the person introduces
  // early and that is still live late is what distinguishes a conversation from a series of unrelated
  // exchanges. Counted as: content words first said by the person in the first half that reappear in
  // the second half, on either side. 🔴 It is deliberately blind to WHO said it later — a question
  // carrying somebody's earlier word forward is the dialogue building, not the tool echoing.
  const half = Math.ceil(turnsWithReply.length / 2);
  const earlyOwn = new Set(turnsWithReply.slice(0, half).flatMap((r) => words(r.reply)));
  const lateAll = new Set(turnsWithReply.slice(half).flatMap((r) => [...words(r.reply), ...words(r.question)]));
  const carried = [...earlyOwn].filter((w) => lateAll.has(w));

  // 5 · ENDED, OR STOPPED — the question `turn_depth` structurally cannot answer, because a conversation
  // that died at turn seven and one that finished at turn seven are the same row. A last reply carrying
  // new material was still going when it stopped; a thin last reply had run out. ⚠️ This is the weakest
  // reading here and is offered as a question rather than a verdict: somebody can end a good conversation
  // with three words because they are satisfied, and nothing in the text distinguishes that.
  const last = turnsWithReply[turnsWithReply.length - 1];
  const priorWords = new Set(turnsWithReply.slice(0, -1).flatMap((r) => words(r.reply)));
  const lastNew = last ? words(last.reply).filter((w) => !priorWords.has(w)).length : 0;

  const spark = turnsWithReply.map((r) => {
    const n = aLen(r);
    return n === 0 ? '·' : '▁▂▃▄▅▆▇█'[Math.min(7, Math.floor(Math.log2(Math.max(1, n)) - 1))] || '▁';
  }).join('');

  console.log(`\n${'='.repeat(78)}`);
  console.log('THE DIALOGUE  — properties of the exchange, not of anybody in it');
  if (!savedTurns) console.log('🔴 ON A PROBE RUN THESE MEAN LITTLE — the student is play-acted. See the note below.');
  console.log('-'.repeat(78));
  console.log(`reciprocity          ${reciprocity.toFixed(2)}  (${aWords} words answered to ${qWords} asked)`);
  console.log(`reply trajectory     ${aEarly.toFixed(0)} → ${aLate.toFixed(0)} words   `
    + `${aLate < aEarly * 0.6 ? 'THINNING' : aLate > aEarly * 1.4 ? 'opening out' : 'holding'}`);
  console.log(`question trajectory  ${qEarly.toFixed(0)} → ${qLate.toFixed(0)} words   `
    + `${qLate < qEarly * 0.6 ? '(the questions thinned too — it ended together)' : '(the questions held)'}`);
  console.log(`uptake  Q←last A     ${mean(uptakeQ).toFixed(1)} words   `
    + `${mean(uptakeQ) < 1 ? '— the questions barely reach into what was just said' : ''}`);
  console.log(`uptake  A←this Q     ${mean(uptakeA).toFixed(1)} words   `
    + `${mean(uptakeA) < 1 ? '— the replies barely engage the question asked' : ''}`);
  console.log(`accumulation         ${carried.length} of their early words still live late`
    + `${carried.length ? `  — ${carried.slice(0, 6).join(', ')}` : '  — the dialogue reset every turn'}`);
  console.log(`last reply           ${last ? aLen(last) : 0} words, ${lastNew} of them new`
    + `  ${lastNew >= 3 ? '(still going when it stopped)' : '(had run out, or was done)'}`);
  console.log(`shape                ${spark}   (reply lengths, first to last)`);
  console.log('-'.repeat(78));
  console.log('⚠️  none of these is validated against anything, and there is no composite on purpose.');
  console.log('   Read them beside the transcript, never instead of it.');

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
  console.log(`interpretive tells        ${tells}`);
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
