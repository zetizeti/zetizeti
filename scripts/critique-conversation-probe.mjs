// critique-conversation-probe.mjs — a whole critique, end to end, against the REAL endpoints.
//
// WHAT IT IS FOR. `audit-criticism.mjs` runs one question per specimen and answers "is the composed
// question clean?". Nothing until now could answer the question the reading plan actually raises, which
// is about a CONVERSATION rather than a turn: does the questioning move through the document, does it
// stop asking a line the text cannot support, does it advance when the student engages, and does it
// ever finish. Those are only visible over many rounds.
//
// 🔴 IT DRIVES THE HTTP ENDPOINTS, NOT A COPY OF THE ROUTE. `audit-criticism.mjs` reassembles the
// composition by hand, and this project has already paid twice for a hand-copied route — a duplicated
// `describeLocated` that silently dropped its tokens and made a comparison read as a clean null, and a
// turn-cap guard written on one of two paths that refused a whole cohort for thirteen days. So this
// signs in as a guest against a local dev server and POSTs to `/api/criticism/open` and `/turn` exactly
// as the browser does. Whatever the route does, this measures. There is nothing here to diverge.
//
// 🔴 THE MATERIAL IS AN ARGUMENT, NOT A CONSTANT. `scripts/` is the public shelf: a file lands here by
// being declared, and anything that would carry somebody else's words goes to `docs/ops/` and is passed
// in. Hence `--doc=` and `--concept=`. This script ships with none of anybody's text inside it.
//
// THE STUDENT IS PLAY-ACTED AND IS PERMITTED TO DISENGAGE. Following flow-probe.mjs: an agreeable
// simulated student makes nonsense invisible, so this one may answer briefly, push back, or refuse a
// question that does not parse. It is billed separately at OpenRouter as 'zetizeti-dev (student sim)'
// because it is the measuring instrument, not the tool.
//
// ⚠️ A MODEL DOES NOT CLOSE THE TAB. Whatever this shows about depth, it cannot show whether a real
// person would have stayed — that is the survival curve's job and it needs real sessions.
//
// RUN:
//   cd app
//   node --env-file=.env server.mjs &      # with NODE_ENV=development ZETIZETI_ALLOW_GUEST=1
//   node scripts/critique-conversation-probe.mjs \
//     --doc=../docs/ops/fixtures/demo-found-running-a-website.txt \
//     --concept=../docs/ops/fixtures/demo-concept-still-running.txt

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

// Dev traffic identifies itself (11 Aug 2026). The stone's turns go out under the server's own title;
// the play-acted student is billed apart, so the spend logs can tell instrument from tool.
process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

import { streamQuestion } from '../lib/llm.mjs';
import { qualify, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';
import { planFor, afford } from '../lib/plan.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d = null) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };

const BASE = arg('base', 'http://localhost:3999');
const DOC = arg('doc');
const CONCEPT = arg('concept');
const MAX_ROUNDS = Number(arg('rounds', '40'));
const DISCIPLINE = arg('discipline', 'all');
if (!DOC) { console.error('need --doc=<file>'); process.exit(1); }

const docText = readFileSync(DOC, 'utf8').trim();
const conceptText = CONCEPT ? readFileSync(CONCEPT, 'utf8').trim() : '';

// ── guest session ────────────────────────────────────────────────────────────────────────────────
let COOKIE = '';
async function signInAsGuest() {
  const r = await fetch(`${BASE}/auth/guest`, { redirect: 'manual' });
  const set = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
  COOKIE = set.map((c) => c.split(';')[0]).join('; ');
  if (!COOKIE) throw new Error(`no session cookie — is the server running with ZETIZETI_ALLOW_GUEST=1? (status ${r.status})`);
}

// ── SSE ──────────────────────────────────────────────────────────────────────────────────────────
// The endpoints stream `event: <name>` / `data: <json>` pairs. Collect them all; the caller reads what
// it needs. A non-2xx is surfaced rather than swallowed — a silent empty result here would look exactly
// like a conversation that ended.
async function sse(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: COOKIE },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const raw = await r.text();
  const events = [];
  for (const block of raw.split('\n\n')) {
    const ev = /^event: (.+)$/m.exec(block), da = /^data: (.+)$/m.exec(block);
    if (ev && da) { try { events.push({ event: ev[1], data: JSON.parse(da[1]) }); } catch { /* skip */ } }
  }
  const err = events.find((e) => e.event === 'error');
  if (err) throw new Error(`${path} → ${err.data.code}: ${err.data.message}`);
  return events;
}

// ── the play-acted student ───────────────────────────────────────────────────────────────────────
const STUDENT_SYSTEM = `You are a design student in a one-to-one tutorial. You brought a text you found and the tutor is asking you questions about it. You are NOT the tutor and you never ask questions back except to say you did not understand.

How you answer:
- Short. One to three sentences. Sometimes four words. You are typing on a laptop, not writing an essay.
- In your own words. You do not quote the text back at length.
- You are thinking aloud, so you contradict yourself sometimes and change your mind.
- 🔴 You are ALLOWED TO DISENGAGE. If a question is vague, circular, or repeats one you have already answered, say so plainly — "you already asked me that", "I don't understand the question", "that doesn't make sense to me". Do not manufacture an insight to be helpful. An agreeable student makes bad questioning invisible, and that is the one thing you must not do.
- If a question genuinely opens something, follow it and say what you now see.
Never break character and never mention that you are a model.`;

async function studentReply(history, question) {
  const messages = [
    ...history.map((h) => ({ role: h.role === 'stone' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: question },
  ];
  const out = await streamQuestion({
    system: STUDENT_SYSTEM, messages, maxTokens: 160, temperature: 0.9,
    reasoning: { enabled: false }, onToken: () => {},
    appTitle: 'zetizeti-dev (student sim)',      // billed apart — this is the instrument
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return String(out).trim();
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────
const DECLINE = /(you already asked|already answered|don'?t understand|doesn'?t make sense|not sure what you|same question|no idea|confus)/i;

(async () => {
  await signInAsGuest();

  // The probe recomputes the plan independently, for OBSERVATION ONLY. planFor is pure and stateless, so
  // the same transcript yields the same station the server chose. It steers nothing here.
  const segments = qualify(docText).segments;
  const blurIds = readSensed({ segments: toCanonSegments(segments) }).strict.conflation_segment_ids || [];
  const stations = afford(segments, { blurIds });

  console.log('='.repeat(78));
  console.log(`document : ${basename(DOC)}  ${docText.length} chars, ${segments.length} segments, ${blurIds.length} located blurs`);
  console.log(`concept  : ${CONCEPT ? `${basename(CONCEPT)}  ${conceptText.length} chars` : '(none)'}`);
  console.log(`plan     : ${stations.stations.length} stations${stations.fellBack ? ` (FELL BACK: ${stations.fellBack})` : ''} — ${stations.stations.map((s) => s.key).join(' → ')}`);
  for (const s of stations.stations) console.log(`             ${s.key.padEnd(15)} region ${JSON.stringify(s.segmentIds).slice(0, 46)}  ${s.why}`);
  console.log('='.repeat(78));

  const history = [];               // {role:'stone'|'you', content}
  const rows = [];
  let completeAt = null;

  const open = await sse('/api/criticism/open', { text: docText, goal: '', discipline: DISCIPLINE, focus: null, concept: conceptText });
  let question = open.filter((e) => e.event === 'token').map((e) => e.data.t).join('');
  let validation = open.find((e) => e.event === 'validation')?.data || {};

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const stone = history.filter((h) => h.role === 'stone').map((h) => h.content);
    const stu = history.filter((h) => h.role !== 'stone').map((h) => h.content);
    const plan = planFor({ segments, blurIds, studentTurns: stu, stoneTurns: stone });
    if (plan.complete && completeAt === null) completeAt = round;

    console.log(`\n── round ${round} ${'─'.repeat(48)}`);
    console.log(`   [plan: ${plan.station ? plan.station.key : '—'}  idx ${plan.index}/${stations.stations.length}  region ${JSON.stringify(plan.region).slice(0, 34)}${plan.complete ? '  COMPLETE' : ''}]`);
    console.log(`   STONE: ${question}`);
    if (!validation.ok) console.log(`   ⚠️ guard: ${JSON.stringify(validation.reasons)} (attempts ${validation.attempts}, regenerated ${validation.regenerated})`);

    history.push({ role: 'stone', content: question });
    const reply = await studentReply(history.slice(0, -1), question);
    const declined = DECLINE.test(reply);
    console.log(`   YOU  : ${reply}${declined ? '   ← DISENGAGED' : ''}`);
    history.push({ role: 'you', content: reply });

    rows.push({ round, station: plan.station?.key || null, index: plan.index, complete: plan.complete,
                guardOk: !!validation.ok, reasons: validation.reasons || [], declined,
                question, reply });

    if (round === MAX_ROUNDS) break;
    const turn = await sse('/api/criticism/turn', {
      artefact: docText, goal: '', discipline: DISCIPLINE, message: reply,
      segment: null, priorMessages: history.slice(0, -1), focus: null, concept: conceptText,
    });
    question = turn.filter((e) => e.event === 'token').map((e) => e.data.t).join('');
    validation = turn.find((e) => e.event === 'validation')?.data || {};
  }

  // ── summary ───────────────────────────────────────────────────────────────────────────────────
  const visited = [...new Set(rows.map((r) => r.station).filter(Boolean))];
  const breaches = rows.filter((r) => !r.guardOk);
  const declines = rows.filter((r) => r.declined);
  console.log(`\n${'='.repeat(78)}`);
  console.log(`rounds           : ${rows.length}`);
  console.log(`stations visited : ${visited.length}/${stations.stations.length} — ${visited.join(' → ')}`);
  console.log(`plan complete at : ${completeAt ?? 'not reached'}`);
  console.log(`guard breaches   : ${breaches.length}${breaches.length ? ' — ' + JSON.stringify(breaches.map((b) => b.round)) : ''}`);
  console.log(`student declined : ${declines.length}${declines.length ? ' at rounds ' + JSON.stringify(declines.map((d) => d.round)) : ''}`);
  console.log('='.repeat(78));

  // Full transcript to docs/ops/ — publish-excluded, and nothing is overwritten.
  const outDir = join(APP, '..', 'docs', 'ops', 'flow-probe-runs');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(outDir, `critique-conversation-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ doc: basename(DOC), concept: CONCEPT ? basename(CONCEPT) : null,
    docChars: docText.length, segments: segments.length, blurIds, plan: stations, completeAt, rows }, null, 2));
  appendFileSync(join(APP, '..', 'docs', 'ops', 'flow-probe-log.md'),
    `\n- **${stamp}** — critique conversation, \`${basename(DOC)}\`${CONCEPT ? ` + concept \`${basename(CONCEPT)}\`` : ''}: ${rows.length} rounds, ${visited.length}/${stations.stations.length} stations, complete at ${completeAt ?? '—'}, ${breaches.length} guard breaches, ${declines.length} declines. \`${basename(file)}\`\n`);
  console.log(`transcript → ${file}`);
})().catch((e) => { console.error('PROBE FAILED:', e.message); process.exit(1); });
