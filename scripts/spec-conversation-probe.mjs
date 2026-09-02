// spec-conversation-probe.mjs — a whole SPECCING conversation, end to end, against the REAL endpoint.
//
// WHY THIS EXISTS. This project's own record says a planner measured only by unit tests has not been
// measured: "a unit test cannot tell you the plan moves", after a plan sat on one station for fourteen
// rounds with every test green. The speccing surface has a planner — the rotation over six joints — and
// seventeen unit tests that prove each piece alone. None of them can tell whether a real ten-round
// conversation moves, or whether the guard's refusals fire against a live model rather than against
// strings I wrote to trip them.
//
// 🔴 IT POSTS TO `/api/spec/open` AND `/api/spec/turn` EXACTLY AS THE BROWSER DOES, and never reassembles
// the route by hand. `flow-probe.mjs` mirrors the turn assembly instead of calling it, and this repository
// has paid twice for a hand-copied route — the duplicated describeLocated, the turn-cap guard written on
// one path of two. Whatever the route does, this measures.
//
// WHAT IT READS, and all of it is about the CONVERSATION rather than the turn:
//   joint movement    how many of the six the run actually visited, and the longest run on one
//   subject movement  content words shared between consecutive questions — a rut is high overlap
//   invention         nouns in a question that appear nowhere in the specification or her answers
//   completion        questions that name an absence or instruct — the failure this surface exists to avoid
//   guard             breaches that survived repair and were delivered anyway
//
// 🔴 THE SPECIFICATIONS ARE INVENTED AND DELIBERATELY UNLIKE ANY STUDENT'S. `scripts/` is the public
// shelf: putting a real specification here would publish somebody's unfinished work. They are written
// THIN on purpose — a complete specification would not exercise the rotation, which goes to untouched
// joints first, and thin is what a first attempt actually looks like.
//
// ⚠️ A MODEL DOES NOT GET STUCK. None of this shows whether a real person would have found the questions
// useful; that needs real sessions, and this project's standing finding is that the clearest signals it
// has ever received came from people volunteering them rather than from any instrument.
//
// RUN:
//   cd app
//   NODE_ENV=development ZETIZETI_ALLOW_GUEST=1 node --env-file=.env server.mjs &
//   node --env-file=.env scripts/spec-conversation-probe.mjs --rounds=10

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

import { streamQuestion } from '../lib/llm.mjs';
import { preambleOf } from '../lib/dialogue.mjs';
import { JOINT_KEYS, specTerms } from '../lib/spec.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d = null) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const BASE = arg('base', 'http://localhost:3999');
const ROUNDS = Number(arg('rounds', '10'));
const ONLY = arg('only', '');

// Three thin specifications, invented. Deliberately different KINDS of thing, because the surface's whole
// claim is that the six joints are the same for a sketch, a machine and a service — if that is false, it
// will show up as one of these running much worse than the others.
const SPECS = [
  { key: 'sketch', title: 'a bouncing ball',
    text: 'A red ball moves inside a window. Each frame it moves by its speed. When the ball reaches the '
        + 'wall it bounces back the other way.' },
  { key: 'machine', title: 'a doorway counter',
    text: 'A small box near a doorway notices when somebody walks past and adds one to a number. The '
        + 'number is shown on a little screen on the front. It runs on a Raspberry Pi.' },
  { key: 'service', title: 'a lending shelf',
    text: 'A shelf in the studio where people leave tools other people can borrow. You take what you need '
        + 'and write your name on a card. The idea is that it works without anybody running it.' },
];

const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','its','that','this',
  'for','with','about','how','what','when','why','do','does','so','not','are','was','be','been','has',
  'have','had','at','by','from','as','if','then','there','their','they','them','you','your','into','can',
  'could','would','should','will','may','might','must','who','whom','whose','which','while','during',
  'say','says','said','make','makes','made','one','two','put','get','gets','something','anything']);
const words = (s) => [...new Set((String(s).toLowerCase().match(/[a-z]{4,}/g) || []))].filter((w) => !STOP.has(w));

// The two failures this surface exists to avoid, read off what was actually DELIVERED. These mirror
// SPEC_FORBIDDEN rather than importing it, on purpose: a probe that reuses the guard's own patterns can
// only ever report that the guard agrees with itself.
const NAMES_ABSENCE = /\b(you (have not|haven'?t|did not|didn'?t)|does not (say|mention|specify)|is missing|no mention|not specified|unspecified)\b/i;
const INSTRUCTS = /\b(you (should|need to|ought to|must)|consider (adding|specifying)|have you (considered|thought about)|don'?t forget)\b/i;

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

// 🔴 THE STUDENT NEVER COMPLAINS AND NEVER ASKS BACK. The agreeable persona is this project's own finding:
// the student who is actually lost says nothing and restates herself, and every detector built from a
// phrase can only find the one who says so. She also does NOT rewrite the specification — a probe whose
// student improves her document as she goes would measure the model's effect on her, which no probe can.
const STUDENT_SYSTEM = `You are a first-year design student. You wrote a short specification for something you want to make, and a tutor is asking you questions about it, one at a time. You only answer; you never ask questions back.

How you answer:
- Short. One or two sentences. You are typing.
- In your own words, thinking aloud, often unsure. "I hadn't thought about that" is a real answer and so is "I don't know yet".
- You do NOT go and rewrite your specification. You answer what is asked.
- You never complain that a question repeats, and you never say a question is unclear. If you have nothing new, you say roughly what you said before.
Never break character and never mention that you are a model.`;

// ⚠️ THE PLAY-ACTED STUDENT RETURNS NOTHING SOMETIMES, and the first run of this probe recorded five
// empty replies in ten rounds without saying so — which silently turned a ten-round conversation into a
// five-round one and made every reading downstream measure a different thing from the one it named.
// It retries once and then falls back, and the count is REPORTED rather than hidden: a probe that
// quietly substitutes its own text is worse than one that fails, because the numbers still look fine.
let emptyReplies = 0;   // reset per run — see runOne
async function studentReply({ spec, transcript }) {
  // 🔴 THE LIST MUST END ON A `user` TURN OR THE MODEL RETURNS AN EMPTY STRING. The transcript ends with
  // the tutor's question, which maps to `assistant`, so the first version handed the model a conversation
  // it had just finished speaking in and asked it for nothing. It returned "" — nine times out of ten —
  // and the probe filled the gap with its own fallback and reported ten rounds. **A harness that
  // substitutes its own text still prints a full run**, which is why the empty count is now reported.
  const messages = [
    { role: 'user', content: `This is the specification you wrote:\n\n${spec}` },
    ...transcript.map((m) => ({ role: m.role === 'stone' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: 'Answer the question above, briefly, in your own words.' },
  ];
  const ask = async (temp) => (await streamQuestion({
    system: STUDENT_SYSTEM, messages, maxTokens: 160, temperature: temp,
    reasoning: { enabled: false }, onToken: () => {}, apiKey: process.env.OPENROUTER_API_KEY,
  })).trim();
  let out = await ask(0.9);
  if (!out) out = await ask(0.6);
  if (!out) { emptyReplies++; out = "I'm not sure yet."; }
  return out;
}

async function runOne(spec) {
  emptyReplies = 0;                 // per run, or the second spec inherits the first's count
  const transcript = [];              // {role, content, joint}
  const questions = [];
  const joints = [];
  const breaches = [];
  let openJoints = null;

  const open = await sse('/api/spec/open', { spec: spec.text });
  const first = open.find((e) => e.event === 'token');
  openJoints = (open.find((e) => e.event === 'joints') || {}).data || null;
  const firstJoint = (open.find((e) => e.event === 'joint') || {}).data || null;
  const firstGuard = (open.find((e) => e.event === 'validation') || {}).data || null;
  if (!first) throw new Error('no question on open');
  questions.push(first.data.t);
  if (firstJoint) joints.push(firstJoint.key);
  if (firstGuard && !firstGuard.ok) breaches.push({ round: 1, reasons: firstGuard.reasons });
  transcript.push({ role: 'stone', content: first.data.t, joint: firstJoint ? firstJoint.key : null });

  for (let round = 2; round <= ROUNDS; round++) {
    const reply = await studentReply({ spec: spec.text, transcript });
    transcript.push({ role: 'student', content: reply });
    const ev = await sse('/api/spec/turn', {
      spec: spec.text, message: reply,
      priorMessages: transcript.filter((m) => m.role === 'stone' || m.role === 'student'),
    });
    const tok = ev.find((e) => e.event === 'token');
    const j = (ev.find((e) => e.event === 'joint') || {}).data || null;
    const g = (ev.find((e) => e.event === 'validation') || {}).data || null;
    if (!tok) throw new Error(`no question at round ${round}`);
    questions.push(tok.data.t);
    if (j) joints.push(j.key);
    if (g && !g.ok) breaches.push({ round, reasons: g.reasons });
    transcript.push({ role: 'stone', content: tok.data.t, joint: j ? j.key : null });
  }

  // ── readings ──────────────────────────────────────────────────────────────────────────────────
  const distinctJoints = new Set(joints).size;
  let longestRun = 1, run = 1;
  for (let i = 1; i < joints.length; i++) { if (joints[i] === joints[i - 1]) { run++; longestRun = Math.max(longestRun, run); } else run = 1; }

  const overlaps = [];
  for (let i = 1; i < questions.length; i++) {
    const a = new Set(words(questions[i - 1])), b = words(questions[i]);
    overlaps.push(b.length ? b.filter((w) => a.has(w)).length / b.length : 0);
  }
  const meanOverlap = overlaps.length ? overlaps.reduce((x, y) => x + y, 0) / overlaps.length : 0;

  // ⚠️ NOT-IN-HER-WORDS, WHICH IS NOT THE SAME AS INVENTED, and the first run's figure of 20 was mostly
  // ordinary English — "observable", "condition", "determine", "instant". A question has to be written in
  // some language, and only a CONCRETE NOUN she never wrote is the failure this surface cares about.
  // Reported under its true name rather than narrowed with a noun list that could not be complete: the
  // number is a pointer to read the transcript by, never a verdict on the run.
  const said = new Set([...specTerms(spec.text),
    ...transcript.filter((m) => m.role === 'student').flatMap((m) => [...specTerms(m.content)])]);
  const invented = [];
  for (const q of questions) {
    const bare = String(q).replace(/["“”][^"“”]*["“”]/g, ' ');
    for (const w of words(bare)) {
      if (said.has(w) || said.has(`${w}s`) || (w.endsWith('s') && said.has(w.slice(0, -1)))) continue;
      if ([...said].some((k) => k.length >= 6 && w.length >= 6 && k.slice(0, 6) === w.slice(0, 6))) continue;
      invented.push(w);
    }
  }

  const completing = questions.filter((q) => NAMES_ABSENCE.test(q) || INSTRUCTS.test(q));
  const multi = questions.filter((q) => (q.match(/\?/g) || []).length > 1);
  const preambles = questions.map((q) => preambleOf(q)).filter((p) => p && p.trim());
  const lengths = questions.map((q) => q.trim().split(/\s+/).length);

  return {
    spec: spec.key, title: spec.title, rounds: questions.length, emptyReplies,
    joints, distinctJoints, longestRun,
    touchedAtOpen: openJoints ? openJoints.n : null,
    meanOverlap: Number(meanOverlap.toFixed(3)),
    inventedWords: [...new Set(invented)],
    completing, multi, breaches,
    meanWords: Number((lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)),
    preambleCount: preambles.length,
    transcript,
  };
}

// ── run ───────────────────────────────────────────────────────────────────────────────────────────
await signInAsGuest();
const chosen = ONLY ? SPECS.filter((s) => s.key === ONLY) : SPECS;
const results = [];
for (const s of chosen) {
  process.stdout.write(`\n── ${s.key}: ${s.title} — ${ROUNDS} rounds ──\n`);
  try {
    const r = await runOne(s);
    results.push(r);
    for (let i = 0; i < r.transcript.length; i++) {
      const m = r.transcript[i];
      process.stdout.write(m.role === 'stone'
        ? `\n  Q${Math.floor(i / 2) + 1} [${m.joint || '—'}] ${m.content}\n`
        : `     → ${m.content}\n`);
    }
    process.stdout.write(`\n  joints visited ${r.distinctJoints}/6 · longest run on one ${r.longestRun}`
      + ` · mean overlap ${r.meanOverlap} · mean words ${r.meanWords}\n`
      + `  not-in-her-words ${r.inventedWords.length} · completing ${r.completing.length}`
      + ` · multi-question ${r.multi.length} · guard breaches ${r.breaches.length}`
      + ` · empty student replies ${r.emptyReplies}\n`);
  } catch (e) {
    process.stdout.write(`  FAILED: ${e.message}\n`);
    results.push({ spec: s.key, error: e.message });
  }
}

// 🔴 EVERY RUN IS LOGGED, never terminal-only. This repository's standing rule, from the day a false
// "control wins" reading was caught by having the earlier transcripts to go back to.
const dir = join(APP, '..', 'docs', 'ops', 'spec-probe-runs');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(join(dir, `${stamp}.json`), JSON.stringify({ base: BASE, rounds: ROUNDS, results }, null, 2));
const line = results.map((r) => r.error
  ? `${r.spec}=FAILED`
  : `${r.spec}: joints ${r.distinctJoints}/6, run ${r.longestRun}, overlap ${r.meanOverlap}, invented ${r.inventedWords.length}, completing ${r.completing.length}, breaches ${r.breaches.length}`).join(' | ');
appendFileSync(join(APP, '..', 'docs', 'ops', 'spec-probe-log.md'),
  `\n- **${new Date().toISOString()}** · ${ROUNDS} rounds · ${line}\n`);
process.stdout.write(`\nlogged to docs/ops/spec-probe-runs/${stamp}.json\n`);
