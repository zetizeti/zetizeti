// qwen-multiturn-test.mjs — LOCAL only. Does Qwen3-30B-A3B actually WORK as the zetizeti stone across a
// real MULTI-TURN dialogue (not just single-turn like the arena)? Ten 10-round conversations a design
// student might have, driven through the EXACT production pipeline: rolling-window retrieval + rotation,
// computeSignals, decideNudge posture, buildTurnContext, the never-answer guard — the whole loop from
// server.mjs /api/chat, with model = qwen3-30b-a3b-instruct-2507. The "student" is the repo's own
// play-acted learner (author.mjs) on gemini-flash-lite. Everything on the operator's PERSONAL OpenRouter
// key. Nothing persisted, nothing deployed.
//
// It watches the two things that decide "does it work": (1) the deterministic GUARD every turn (clean
// single Clean-Language question, never an answer), and (2) LOOPINESS over 10 turns — the pipeline's own
// selfEcho/cycling signals, how often the anti-loop nudge had to fire, and repeated question openers.
//
// Run:  OPENROUTER_API_KEY=<personal> node scripts/qwen-multiturn-test.mjs
//   CONVOS=1 ROUNDS=3 → smoke.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { loadMethodCore, buildSystemPrompt, buildTurnContext, validateOutput } from '../lib/dialogue.mjs';
import { computeSignals } from '../lib/signals.mjs';
import { decideNudge } from '../lib/nudge.mjs';
import { buildStudentSystemPrompt } from '../lib/author.mjs';
import { streamQuestion } from '../lib/llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
if (!KEY) { console.error('No OPENROUTER_API_KEY (personal key).'); process.exit(1); }

const STONE = process.env.STONE_MODEL || 'qwen/qwen3-30b-a3b-instruct-2507';   // the model under test
const STONE_PROVIDER = process.env.STONE_PROVIDER || 'openrouter';             // 'featherless' to test a Featherless-only model (e.g. the QAT build)
const F_KEY = (process.env.FEATHERLESS_API_KEY || '').trim();
if (STONE_PROVIDER === 'featherless' && !F_KEY) { console.error('STONE_PROVIDER=featherless needs FEATHERLESS_API_KEY.'); process.exit(1); }
const STUDENT = process.env.STUDENT_MODEL || 'google/gemini-3.1-flash-lite';   // play-acted learner (different family)
const CONVOS = process.env.CONVOS ? +process.env.CONVOS : 10;
const ROUNDS = process.env.ROUNDS ? +process.env.ROUNDS : 10;
const oneLine = s => (s || '').replace(/\s+/g, ' ').trim();
const stripThink = s => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// Ten edges a design student might bring (spread across disciplines).
const SEEDS = [
  'making onboarding feel calmer for a meditation app, without losing sign-ups',
  'a campus wayfinding app students actually trust over Google Maps',
  'redesigning a hospital discharge letter so patients understand it',
  'a critical-design piece about how much data a loyalty card really takes',
  'a museum label system for objects with contested histories',
  'a board game that teaches monsoon water-harvesting to school kids',
  'getting people to actually read the terms before they tick the box',
  'a slow, once-a-day journalling app that resists the urge to notify',
  'making a government form for a widow’s pension humane',
  'a public transport app for a city where the buses have no timetable',
];

const corpus = new Database(':memory:');
buildIndex(corpus, join(__dirname, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, '..', 'corpus', 'method'));

async function ask(model, system, messages, { maxTokens, temperature }) {
  try { return stripThink(await streamQuestion({ system, messages, model, apiKey: KEY, temperature, maxTokens, reasoning: { enabled: false }, onToken: () => {} })); }
  catch (e) { return ''; }
}
// Featherless stone path (for models OpenRouter doesn't carry, e.g. the QAT build). Backoff lets a cold 27B
// warm up. Sequential use only (one call in flight) keeps a 27B (=2 units) under the 4-unit Premium cap.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fstone(system, messages) {
  for (let t = 0; t < 8; t++) {
    try {
      const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${F_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: STONE, messages: [{ role: 'system', content: system }, ...messages], temperature: 0.3, max_tokens: 150, stream: false }),
      });
      if (res.ok) { const c = stripThink((await res.json())?.choices?.[0]?.message?.content || ''); if (c) return c; }
      else await res.text().catch(() => '');
    } catch { /* retry */ }
    await sleep(2000 + t * 2000);
  }
  return '';
}
const stoneGen = (system, messages) => STONE_PROVIDER === 'featherless' ? fstone(system, messages) : ask(STONE, system, messages, { maxTokens: 150, temperature: 0.3 });
// The play-acted student replies to the stone's latest question (its view is role-flipped).
async function studentReply(seed, transcript, question) {
  const system = buildStudentSystemPrompt({ discipline: 'all' });
  const messages = transcript.length
    ? [...transcript.map(m => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: question }]
    : [{ role: 'user', content: `(Tutorial begins. Your project: "${seed}". Introduce it in your own words in a sentence or two — what you're trying to do, a bit unresolved — as your opening. Do not ask anything.)` }];
  return oneLine(await ask(STUDENT, system, messages, { maxTokens: 240, temperature: 0.9 })) || '(the student went quiet)';
}

// ── one turn of the STONE, faithful to server.mjs /api/chat ─────────────────────────────────────────
function stoneTurn(goal, history, message, exchanges, turnsSinceNudge) {
  const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2);
  const studentTurns = [...history.filter(h => h.role === 'student').map(h => h.content), message];
  const stoneTurns = history.filter(h => h.role !== 'student').map(h => h.content);
  const sig = computeSignals({ goal, lineage: [goal], studentTurns, stoneTurns, exchanges });
  // rolling window + rotate-by-default (drop last turn's tensions), with graceful cycle-back
  const prev = studentTurns[studentTurns.length - 2] || '';
  const windowText = [prev, message, message].join(' ').trim() || message;
  const prevWindow = [studentTurns[studentTurns.length - 3] || '', prev, prev].join(' ').trim() || prev;
  const excludeIds = (studentTurns.length >= 2 && prevWindow) ? retrieve(corpus, prevWindow, { limit: 3, extraTerms: goalTerms }).map(r => r.id) : [];
  let retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms, excludeIds });
  if (!retrieved.length && excludeIds.length) retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms });
  const nudge = decideNudge(sig, { exchanges, reDrewThisTurn: false, turnsSinceNudge });
  const system = buildSystemPrompt(methodCore, goal);
  const turnContent = buildTurnContext({ retrieved, posture: nudge.posture || '', message });
  const messages = [...history.map(h => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })), { role: 'user', content: turnContent }];
  return { sig, nudge, system, messages };
}

// loop metrics
const words = q => new Set((oneLine(q).toLowerCase().match(/[a-z]{4,}/g) || []));
const jaccard = (a, b) => { const A = words(a), B = words(b); const inter = [...A].filter(x => B.has(x)).length; const uni = new Set([...A, ...B]).size; return uni ? inter / uni : 0; };
const opener = q => oneLine(q).toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).slice(0, 4).join(' ');

(async () => {
  console.log(`\n${STONE} as the zetizeti stone (${STONE_PROVIDER}) — ${CONVOS} conversations × ${ROUNDS} rounds\n`);
  const convos = [];
  let totalGuardPass = 0, totalTurns = 0, emptyRetries = 0;
  for (let c = 0; c < CONVOS; c++) {
    const seed = SEEDS[c % SEEDS.length];
    process.stdout.write(`  convo ${c + 1}/${CONVOS} [${seed.slice(0, 40)}…] `);
    const history = [];
    const questions = [], guards = [], postures = [], selfEchoes = [];
    let message = await studentReply(seed, [], null);   // student opening
    let turnsSinceNudge = 99, nudgesFired = 0;
    for (let r = 0; r < ROUNDS; r++) {
      const { sig, nudge, system, messages } = stoneTurn(seed, history, message, r, turnsSinceNudge);
      // Generate, retrying on an EMPTY response (an OpenRouter provider-routing blip — the model itself was
      // guard-perfect on Featherless). Count the retries so delivery flakiness is measured, not hidden.
      let q = '';
      for (let a = 0; a < 3 && !q; a++) { q = await stoneGen(system, messages); if (!q) emptyRetries++; }
      const check = validateOutput(q);
      questions.push(q); guards.push(check); postures.push(nudge.posture ? 'fired' : ''); selfEchoes.push(sig.selfEcho ?? 0);
      if (nudge.posture || nudge.surface) { turnsSinceNudge = 0; nudgesFired++; } else turnsSinceNudge++;
      totalGuardPass += check.ok ? 1 : 0; totalTurns++;
      process.stdout.write(check.ok ? '.' : '!');
      history.push({ role: 'student', content: message }, { role: 'stone', content: q });
      if (r < ROUNDS - 1) message = await studentReply(seed, history, q);
    }
    // metrics
    const guardPass = guards.filter(g => g.ok).length;
    const consec = questions.slice(1).map((q, i) => jaccard(questions[i], q));
    const avgConsec = consec.reduce((a, b) => a + b, 0) / (consec.length || 1);
    let maxPair = 0; for (let i = 0; i < questions.length; i++) for (let j = i + 1; j < questions.length; j++) maxPair = Math.max(maxPair, jaccard(questions[i], questions[j]));
    const openers = questions.map(opener); const dupOpen = openers.length - new Set(openers).size;
    const maxSelfEcho = Math.max(...selfEchoes, 0);
    convos.push({ seed, questions, guards, guardPass, avgConsec, maxPair, dupOpen, nudgesFired, maxSelfEcho, history });
    console.log(`  guard ${guardPass}/${ROUNDS} · consec-sim ${avgConsec.toFixed(2)} · dup-openers ${dupOpen} · nudges ${nudgesFired} · maxSelfEcho ${maxSelfEcho.toFixed(2)}`);
  }

  console.log(`\n══════════ SUMMARY ══════════`);
  console.log(`  GUARD (clean single Clean-Language question, never an answer): ${totalGuardPass}/${totalTurns} = ${(totalGuardPass / totalTurns * 100).toFixed(1)}%`);
  console.log(`  OpenRouter empty-response retries (delivery blips, model was guard-perfect on Featherless): ${emptyRetries}`);
  const loopy = convos.filter(c => c.avgConsec > 0.5 || c.dupOpen >= 3 || c.maxSelfEcho > 0.6);
  console.log(`  LOOPINESS: ${loopy.length}/${CONVOS} conversations flagged (consec-sim>0.5 OR dup-openers≥3 OR selfEcho>0.6)`);
  console.log(`  per-convo: ` );
  for (let i = 0; i < convos.length; i++) { const c = convos[i]; console.log(`    ${(i + 1 + '.').padEnd(3)} guard ${c.guardPass}/${ROUNDS}  consec-sim ${c.avgConsec.toFixed(2)}  max-pair ${c.maxPair.toFixed(2)}  dup-openers ${c.dupOpen}  nudges ${c.nudgesFired}`); }

  console.log(`\n══════════ TRANSCRIPTS (human read) ══════════`);
  for (let i = 0; i < convos.length; i++) {
    const c = convos[i];
    console.log(`\n──── Conversation ${i + 1}: ${c.seed} ────`);
    for (let r = 0; r < c.questions.length; r++) {
      const sMsg = c.history[r * 2]?.content || '';
      console.log(`  S${r + 1}: ${oneLine(sMsg)}`);
      console.log(`  Q${r + 1}${c.guards[r].ok ? '' : ' [GUARD FAIL: ' + c.guards[r].reasons.join('; ') + ']'}: ${oneLine(c.questions[r])}`);
    }
  }
  writeFileSync(join(__dirname, 'qwen-multiturn-result.json'), JSON.stringify({ stone: STONE, convos: convos.map(c => ({ seed: c.seed, guardPass: c.guardPass, avgConsec: c.avgConsec, maxPair: c.maxPair, dupOpen: c.dupOpen, nudgesFired: c.nudgesFired, questions: c.questions })) }, null, 2));
  console.log('\ndone.');
})();
