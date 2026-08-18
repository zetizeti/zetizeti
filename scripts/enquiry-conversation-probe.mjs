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
// Invented, and deliberately nothing like any student's project: a subject identifies a person as well
// as a name does (the v0.14.2 finding).
const EDGE = EDGE_FILE ? readFileSync(EDGE_FILE, 'utf8').trim() : (arg('edge')
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
  await assertLiveBuild();
  await signInAsGuest();
  const goalWords = words(EDGE);
  console.log('='.repeat(78));
  console.log(`persona  : ${PERSONA}${PERSONA === 'agreeable' ? '  (never complains; restates when out of material)' : '  (permitted to disengage)'}`);
  console.log(`rounds   : ${ROUNDS}`);
  console.log(`edge     : ${EDGE.slice(0, 96)}…`);
  console.log(`named    : ${goalWords.length} concrete things in their own opening`);
  console.log('='.repeat(78));

  const history = [];                       // {role:'stone'|'student', content}
  const rows = [];
  let question = null;

  for (let round = 1; round <= ROUNDS; round++) {
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
  writeFileSync(out, JSON.stringify({ persona: PERSONA, rounds: ROUNDS, edge: EDGE,
    summary: { distinct, weak: weakAnchors.length, weakWords: [...new Set(weakAnchors)], turns: anchors.length, repeats, covered, named: goalWords.length, meanOverlap, longestRut, rutWord, tells, breaches },
    rows }, null, 2));
  appendFileSync(join(APP, '..', 'docs', 'ops', 'flow-probe-log.md'),
    `\n- **enquiry-conversation-probe** ${stamp} · persona \`${PERSONA}\` · ${ROUNDS} rounds — `
    + `${distinct} distinct anchors (${weakAnchors.length} weak), ${repeats} student repeats, coverage ${covered}/${goalWords.length}, `
    + `longest rut ${longestRut} on \`${rutWord}\`, ${tells} tells, ${breaches} breaches. \`${out.split('/').slice(-1)[0]}\`\n`);
  console.log(`\nwritten: ${out}`);
})().catch((e) => { console.error(`\nPROBE FAILED: ${e.message}`); process.exit(1); });
