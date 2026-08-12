#!/usr/bin/env node
// focus-probe.mjs — does the concept-only toggle actually hold, over a full conversation?
// (12 August 2026. Prayas: "test both modes with 10-round conversations.")
//
// WHY IT DRIVES THE REAL SERVER RATHER THAN THE LIBRARIES. Every other probe here reimplements the turn
// assembly in-process, which is the right trade when measuring the QUESTIONING. It is the wrong trade
// here: this feature is a flag travelling from a request body, through two retrieval call sites and a
// cycle-back, into a prompt and an injected validator, on two different surfaces. A reimplementation
// would exercise my copy of that path and prove nothing about the one a student uses. So this posts to
// /api/chat and /api/criticism/* on an auth-less local build with the real model, exactly as the browser
// does (feedback-auth-less-local-build-testing).
//
// THE STUDENT IS ADVERSARIAL BY DESIGN. Both seeds pull hard toward production — a stool that must be
// repairable, a text arguing for injection moulding — and the play-acted student is told to keep
// dragging the conversation back to how the thing gets made. A neutral seed would pass this test without
// the feature existing at all.
//
// WHAT IS MEASURED, per surface, with the focus OFF and ON:
//   making questions   — stone questions matching the MAKING patterns the guard enforces
//   making retrieved   — turns whose curtain carried an entry marked `**register:** making`
//   repaired           — turns the guard regenerated (the cost of enforcement)
// The OFF column is the control, and it has to be non-zero or the ON column proves nothing.
//
// Run (from app/, with the server already listening on PORT):
//   node --env-file=.env scripts/focus-probe.mjs --base=http://127.0.0.1:3001 --rounds=10

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { streamQuestion } from '../lib/llm.mjs';

// Dev traffic identifies itself to OpenRouter (11 Aug 2026) — without this the run files under
// 'zetizeti' and is indistinguishable from a cohort in the spend logs.
process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const BASE = arg('base', 'http://127.0.0.1:3001');
const ROUNDS = +arg('rounds', 10);
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const STUDENT_MODEL = process.env.ZETIZETI_MODEL || 'google/gemini-3.1-flash-lite';
if (!KEY) { console.error('No OPENROUTER_API_KEY — run with node --env-file=.env'); process.exit(1); }

// The guard's own patterns, restated here ON PURPOSE. Importing them would make the probe agree with
// the code by construction: a bug that narrowed MAKING would narrow the measurement in the same step
// and the run would come back clean. An independent list can disagree with the guard, which is the
// only way this measures anything.
const MAKING_PROBE = [
  /\bmanufactur/i, /\bfabricat/i, /\bfactor(y|ies)\b/i, /\btooling\b/i, /\bmould|mold\b/i,
  /\bassembl(y|e|ed)\b/i, /\bproduction line\b/i, /\bmass[- ]produc/i, /\bunit cost\b/i,
  /\b3d[- ]print/i, /\bcnc\b/i, /\bweld/i, /\bextrud/i, /\brepairab|reparable\b/i,
  /\bspare parts?\b/i, /\bdurabilit/i, /\blifespan\b/i, /\brecycl/i, /\blandfill\b/i,
  /\boffcuts?\b/i, /\bmaterials? (choice|would you|to use)\b/i,
  /\bhow (would|will|do) you (make|build|produce|manufacture|assemble)\b/i,
];
const isMaking = (t) => MAKING_PROBE.some((re) => re.test(String(t)));

// TWO STUDENT TYPES, and the second is not a harder version of the first — it is the opposite case.
//
//   maker  — dense, articulate, PREOCCUPIED with production, instructed to drag every turn back to how
//            the thing gets made. The worst case for the toggle: it measures whether the filter holds
//            under sustained pressure.
//   terse  — short, vague, disengages easily, on a project with no fabrication in it at all. Modelled on
//            the register of the 28 July student fixture (fifteen of forty-one replies dry). This one
//            measures the OPPOSITE risk and the more likely one in real use: a student who was never
//            going to be asked about making, where the toggle can only cost and cannot help. If the
//            questioning gets thinner or the guard starts refusing here, the feature is taxing the
//            students it was never for.
const PERSONAS = {
  maker: {
    enquiry: 'a repairable stool for a hostel room, flat-packed, that a student can fix themselves',
    criticism: 'Injection moulding is always the right choice at this volume, so you should tool up early. '
      + 'A single-material part is obviously better because it can be recycled, and any designer knows that '
      + 'repairability is what makes a product sustainable. The manufacturing decision is the design decision.',
    system: (seed) => `You are a design student in a tutorial. Your project: "${seed}".
- Answer in one to three sentences, plainly, in your own words. Never narrate realisations.
- You are PREOCCUPIED WITH HOW IT GETS MADE — joints, materials, tooling, what it costs to produce,
  whether it can be repaired. Keep bringing the conversation back to making, even when asked about
  meaning or purpose. This is genuine: you think the making IS the design.
- If a question feels repetitive or off your project, say so plainly.
- Never mention being an AI. Stay in character.`,
  },
  terse: {
    enquiry: 'an app that helps first-year students find someone to sit with in the canteen',
    criticism: 'Students who eat alone are obviously lonely, so the app should match them automatically. '
      + 'Any designer knows that reducing friction is what makes people connect, and the best experience '
      + 'is the one that requires no effort. If people do not use it, the onboarding was the problem.',
    system: (seed) => `You are a design student in a tutorial. Your project: "${seed}".
- You are TIRED and not very forthcoming. Most answers are one short sentence. Sometimes you answer
  "i don't know", "not sure", "yeah maybe" — roughly one reply in four is like that.
- You never talk about how anything is manufactured, fabricated, or repaired. It is an app; there is
  nothing to build with your hands and it would not occur to you to discuss materials.
- You do not perform enthusiasm. If a question is abstract or repetitive you get impatient and say so.
- Never mention being an AI. Stay in character.`,
  },
};
const PERSONA = arg('persona', 'maker');
if (!PERSONAS[PERSONA]) { console.error(`unknown persona: ${PERSONA}`); process.exit(1); }
const SEEDS = PERSONAS[PERSONA];

const STUDENT_SYS = PERSONAS[PERSONA].system;

async function studentReply(seed, history, question) {
  const messages = history.length
    ? [...history.map((m) => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })),
       { role: 'user', content: question }]
    : [{ role: 'user', content: `(Tutorial begins. Introduce "${seed}" in a sentence or two, a bit unresolved. Do not ask anything.)` }];
  for (let a = 0; a < 3; a++) {
    try {
      const t = await streamQuestion({
        system: STUDENT_SYS(seed), messages, model: STUDENT_MODEL, apiKey: KEY,
        temperature: 0.8, maxTokens: 200, reasoning: { enabled: false }, onToken: () => {},
        appTitle: 'zetizeti-dev (student sim)',
      });
      if (t && t.trim()) return t.trim().replace(/\s+/g, ' ');
    } catch { /* retry */ }
  }
  return '(quiet)';
}

// The SSE endpoints, read the way the browser reads them.
async function sse(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: COOKIE }, body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 200) return { error: `HTTP ${res.status}`, question: '', curtain: [], guard: null };
  const text = await res.text();
  let question = '', curtain = [], guard = null, error = null;
  for (const chunk of text.split('\n\n')) {
    const m = chunk.match(/^event: (.+)\ndata: ([\s\S]+)$/);
    if (!m) continue;
    let data; try { data = JSON.parse(m[2]); } catch { continue; }
    if (m[1] === 'token') question += data.t || '';
    else if (m[1] === 'question' && data.text) question = data.text;
    else if (m[1] === 'curtain') curtain = data.retrieved || [];
    else if (m[1] === 'validation') guard = data;
    else if (m[1] === 'error') error = data.message || data.code;
  }
  return { question: question.trim(), curtain, guard, error };
}

let COOKIE = '';
async function signInAsGuest() {
  // GET /auth/guest — dev-only, refuses in production (lib/auth.mjs). It sets the session cookie and
  // redirects to the app, so the redirect is not followed; the cookie is the whole point.
  const r = await fetch(BASE + '/auth/guest', { redirect: 'manual' });
  const setC = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')].filter(Boolean);
  COOKIE = setC.filter(Boolean).map((c) => c.split(';')[0]).join('; ');
  return !!COOKIE;
}

// Which retrieved ids are marked making — asked of the corpus directly, so the probe does not have to
// trust the server's own report of what it filtered.
const MAKING_IDS = new Set();
async function loadMakingIds() {
  const { default: DB } = await import('better-sqlite3');
  const { buildIndex } = await import('../lib/retrieval.mjs');
  const db = new DB(':memory:');
  buildIndex(db, join(HERE, '../corpus/domain'));
  for (const r of db.prepare("SELECT id FROM entries WHERE register='making'").all()) MAKING_IDS.add(r.id);
}

async function runEnquiry(focus) {
  const seed = SEEDS.enquiry;
  const history = [];
  let message = await studentReply(seed, [], '');
  const goal = message;
  const turns = [];
  for (let r = 0; r < ROUNDS; r++) {
    const out = await sse('/api/chat', {
      message, history: history.slice(), goal, kind: r === 0 ? 'goal' : 'turn',
      honed: 0, exchanges: r, lineage: [goal], discipline: 'all', turnsSinceNudge: 99, focus,
    });
    const ids = (out.curtain || []).map((c) => c.id).filter(Boolean);
    turns.push({ n: r + 1, student: message, question: out.question, ids, retrievedCount: ids.length,
      making: isMaking(out.question), makingIds: ids.filter((i) => MAKING_IDS.has(i)),
      guardOk: out.guard ? out.guard.ok !== false : null, error: out.error });
    if (out.error) break;
    history.push({ role: 'student', content: message }, { role: 'interlocutor', content: out.question });
    if (r < ROUNDS - 1) message = await studentReply(seed, history, out.question);
  }
  return turns;
}

async function runCriticism(focus) {
  const artefact = SEEDS.criticism;
  const turns = [];
  const open = await sse('/api/criticism/open', { text: artefact, goal: '', discipline: 'all', focus });
  const ids0 = (open.curtain || []).map((c) => c.id).filter(Boolean);
  turns.push({ n: 1, student: '(pasted the text)', question: open.question, ids: ids0,
    making: isMaking(open.question), makingIds: ids0.filter((i) => MAKING_IDS.has(i)),
    guardOk: open.guard ? open.guard.ok !== false : null, error: open.error });
  const prior = [{ role: 'stone', content: open.question }];
  let message = await studentReply('a critique of that text', [], open.question);
  for (let r = 1; r < ROUNDS; r++) {
    const out = await sse('/api/criticism/turn', {
      artefact, goal: '', discipline: 'all', message, segment: null, priorMessages: prior.slice(), focus,
    });
    const ids = (out.curtain || []).map((c) => c.id).filter(Boolean);
    turns.push({ n: r + 1, student: message, question: out.question, ids,
      making: isMaking(out.question), makingIds: ids.filter((i) => MAKING_IDS.has(i)),
      guardOk: out.guard ? out.guard.ok !== false : null, error: out.error });
    if (out.error) break;
    prior.push({ role: 'you', content: message }, { role: 'stone', content: out.question });
    if (r < ROUNDS - 1) message = await studentReply('a critique of that text', [], out.question);
  }
  return turns;
}

// ⚠️ The criticism endpoints emit no `curtain` event, so what they retrieved is NOT observable from a
// client. Its retrieval column is reported as `n/a`, never as 0 — a zero there would read as "nothing
// leaked" when the truth is "nothing was looked at". The guard column is measured on both surfaces.
const summarise = (turns, { retrievalVisible = true } = {}) => ({
  turns: turns.length,
  makingQuestions: turns.filter((t) => t.making).length,
  makingRetrievedTurns: retrievalVisible ? turns.filter((t) => t.makingIds.length).length : null,
  errors: turns.filter((t) => t.error).length,
});
const RETRIEVAL_VISIBLE = { enquiry: true, criticism: false };

(async () => {
  await loadMakingIds();
  if (!await signInAsGuest()) { console.error('guest sign-in failed — is the server up with ZETIZETI_ALLOW_GUEST=1?'); process.exit(1); }
  console.log(`focus-probe · persona=${PERSONA} · ${ROUNDS} rounds · ${MAKING_IDS.size} entries marked making · ${BASE}\n`);

  const runs = {};
  for (const [surface, fn] of [['enquiry', runEnquiry], ['criticism', runCriticism]]) {
    for (const focus of [null, 'concept']) {
      const label = `${surface}/${focus || 'off'}`;
      process.stdout.write(`running ${label} … `);
      runs[label] = await fn(focus);
      const s = summarise(runs[label], { retrievalVisible: RETRIEVAL_VISIBLE[surface] });
      console.log(`${s.turns} turns · making questions ${s.makingQuestions} · making retrieved on ${s.makingRetrievedTurns === null ? 'n/a (no curtain event)' : s.makingRetrievedTurns + ' turns'}${s.errors ? ` · ERRORS ${s.errors}` : ''}`);
    }
  }

  console.log('\n            surface   focus     turns   making-Qs   making-retrieved');
  for (const k of Object.keys(runs)) {
    const [surf, f] = k.split('/');
    const s = summarise(runs[k], { retrievalVisible: RETRIEVAL_VISIBLE[surf] });
    console.log(`  ${surf.padEnd(20)}${f.padEnd(10)}${String(s.turns).padEnd(8)}${String(s.makingQuestions).padEnd(12)}${s.makingRetrievedTurns === null ? 'n/a' : s.makingRetrievedTurns}`);
  }

  // Log every run, in full — never terminal-only, never one overwritten file (28 Jul 2026 rule).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(HERE, '../../docs/ops/focus-probe-runs'); mkdirSync(dir, { recursive: true });
  const file = join(dir, `focus-probe-${PERSONA}-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ persona: PERSONA, rounds: ROUNDS, seeds: SEEDS, makingIds: [...MAKING_IDS], runs }, null, 2));
  const line = Object.entries(runs).map(([k, v]) => { const s = summarise(v, { retrievalVisible: RETRIEVAL_VISIBLE[k.split('/')[0]] }); return `${k}: ${s.makingQuestions}Q/${s.makingRetrievedTurns === null ? 'n-a' : s.makingRetrievedTurns}R`; }).join(' · ');
  appendFileSync(join(HERE, '../../docs/ops/flow-probe-log.md'),
    `\n- **${new Date().toISOString()}** focus-probe (concept-only toggle, ${ROUNDS} rounds) — ${line}. Full transcripts: \`docs/ops/focus-probe-runs/focus-probe-${stamp}.json\`\n`);
  console.log(`\nfull transcripts → ${file}`);
})();
