// model-loop-compare.mjs — LOCAL. "Figure a model that works": run several candidate stones through the
// SAME multi-turn zetizeti pipeline and measure which one holds a clean guard WITHOUT collapsing into a
// fixed question-frame (the loop Qwen3-30B fell into). Each model gets its own 4 conversations × 8 rounds
// with the play-acted student; models run concurrently (OpenRouter has no concurrency wall). Personal key.
//
// The metric that matters: dup-openers (same opening frame reused) + consec-sim + the pipeline's own
// selfEcho — low = varied, high = looping. Guard must stay ~100% (clean single Clean-Language question).
//
// Run:  OPENROUTER_API_KEY=<personal> node scripts/model-loop-compare.mjs

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

const STUDENT = 'google/gemini-3.1-flash-lite';
const MODELS = (process.env.MODELS || [
  'google/gemini-3.1-flash-lite',            // incumbent baseline
  'qwen/qwen3-30b-a3b-instruct-2507',        // known to loop (control)
  'mistralai/mistral-small-3.2-24b-instruct',
  'deepseek/deepseek-chat-v3.1',
  'google/gemma-3-27b-it',
  'meta-llama/llama-3.3-70b-instruct',
].join(',')).split(',');
const CONVOS = process.env.CONVOS ? +process.env.CONVOS : 4;
const ROUNDS = process.env.ROUNDS ? +process.env.ROUNDS : 8;
const oneLine = s => (s || '').replace(/\s+/g, ' ').trim();
const stripThink = s => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
const SEEDS = [
  'making onboarding feel calmer for a meditation app, without losing sign-ups',
  'a campus wayfinding app students actually trust over Google Maps',
  'redesigning a hospital discharge letter so patients understand it',
  'a museum label system for objects with contested histories',
  'a board game that teaches monsoon water-harvesting to school kids',
  'getting people to actually read the terms before they tick the box',
];

const corpus = new Database(':memory:');
buildIndex(corpus, join(__dirname, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, '..', 'corpus', 'method'));

async function ask(model, system, messages, { maxTokens, temperature }) {
  for (let a = 0; a < 3; a++) {
    try { const t = stripThink(await streamQuestion({ system, messages, model, apiKey: KEY, temperature, maxTokens, reasoning: { enabled: false }, onToken: () => {} })); if (t) return t; }
    catch { /* retry */ }
  }
  return '';
}
async function studentReply(seed, transcript, question) {
  const system = buildStudentSystemPrompt({ discipline: 'all' });
  const messages = transcript.length
    ? [...transcript.map(m => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: question }]
    : [{ role: 'user', content: `(Tutorial begins. Your project: "${seed}". Introduce it in your own words in a sentence or two — what you're trying to do, a bit unresolved — as your opening. Do not ask anything.)` }];
  return oneLine(await ask(STUDENT, system, messages, { maxTokens: 240, temperature: 0.9 })) || '(quiet)';
}
function stoneTurn(goal, history, message, exchanges, turnsSinceNudge) {
  const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2);
  const studentTurns = [...history.filter(h => h.role === 'student').map(h => h.content), message];
  const stoneTurns = history.filter(h => h.role !== 'student').map(h => h.content);
  const sig = computeSignals({ goal, lineage: [goal], studentTurns, stoneTurns, exchanges });
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
const words = q => new Set((oneLine(q).toLowerCase().match(/[a-z]{4,}/g) || []));
const jaccard = (a, b) => { const A = words(a), B = words(b); const i = [...A].filter(x => B.has(x)).length; const u = new Set([...A, ...B]).size; return u ? i / u : 0; };
const opener = q => oneLine(q).toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).slice(0, 4).join(' ');

async function probeModel(model) {
  let guardPass = 0, turns = 0, empties = 0;
  const perConvo = [];
  for (let c = 0; c < CONVOS; c++) {
    const seed = SEEDS[c % SEEDS.length];
    const history = []; const questions = []; const selfE = [];
    let message = await studentReply(seed, [], null);
    let tsn = 99, nudges = 0;
    for (let r = 0; r < ROUNDS; r++) {
      const { sig, nudge, system, messages } = stoneTurn(seed, history, message, r, tsn);
      let q = ''; for (let a = 0; a < 3 && !q; a++) { q = await ask(model, system, messages, { maxTokens: 150, temperature: 0.3 }); if (!q) empties++; }
      const ok = validateOutput(q).ok; guardPass += ok ? 1 : 0; turns++;
      questions.push(q); selfE.push(sig.selfEcho ?? 0);
      if (nudge.posture || nudge.surface) { tsn = 0; nudges++; } else tsn++;
      history.push({ role: 'student', content: message }, { role: 'stone', content: q });
      if (r < ROUNDS - 1) message = await studentReply(seed, history, q);
    }
    const consec = questions.slice(1).map((q, i) => jaccard(questions[i], q));
    const avgConsec = consec.reduce((a, b) => a + b, 0) / (consec.length || 1);
    const openers = questions.map(opener); const dupOpen = openers.length - new Set(openers).size;
    perConvo.push({ seed, avgConsec, dupOpen, maxSelfEcho: Math.max(...selfE, 0), nudges, questions });
  }
  const avg = k => perConvo.reduce((a, c) => a + c[k], 0) / perConvo.length;
  const loopy = perConvo.filter(c => c.avgConsec > 0.5 || c.dupOpen >= 3 || c.maxSelfEcho > 0.6).length;
  return { model, guardPct: guardPass / turns * 100, empties, dupOpen: avg('dupOpen'), consec: avg('avgConsec'), selfEcho: avg('maxSelfEcho'), nudges: avg('nudges'), loopy, perConvo };
}

(async () => {
  console.log(`\n"A model that works" — multi-turn loop comparison · ${MODELS.length} models · ${CONVOS}×${ROUNDS} · local personal key\n`);
  const results = await Promise.all(MODELS.map(m => probeModel(m).then(r => { console.log(`  done: ${m}`); return r; }).catch(e => ({ model: m, error: String(e).slice(0, 80) }))));

  console.log(`\n══════════ RESULTS — lower dup-openers / consec-sim / selfEcho = LESS looping ══════════`);
  console.log(`  ${'model'.padEnd(42)} guard%  dupOpen/${ROUNDS}  consec  selfEcho  nudges  loopy/${CONVOS}`);
  const ok = results.filter(r => !r.error);
  for (const r of ok.sort((a, b) => (a.dupOpen + a.consec * 8 + a.selfEcho * 8) - (b.dupOpen + b.consec * 8 + b.selfEcho * 8))) {
    console.log(`  ${r.model.padEnd(42)} ${r.guardPct.toFixed(0).padStart(4)}%   ${r.dupOpen.toFixed(1).padStart(4)}    ${r.consec.toFixed(2)}    ${r.selfEcho.toFixed(2)}     ${r.nudges.toFixed(1)}     ${r.loopy}`);
  }
  for (const r of results.filter(r => r.error)) console.log(`  ${r.model.padEnd(42)} ERROR ${r.error}`);
  console.log(`\n  (ranked best→worst by a simple looping score: dupOpen + 8·consec + 8·selfEcho. Guard should be ~100 for all.)`);

  // sample questions from the best-ranked model (for the human read)
  const best = ok.sort((a, b) => (a.dupOpen + a.consec * 8 + a.selfEcho * 8) - (b.dupOpen + b.consec * 8 + b.selfEcho * 8))[0];
  if (best) {
    console.log(`\n══════════ BEST-RANKED (${best.model}) — one conversation's questions (human read) ══════════`);
    best.perConvo[0].questions.forEach((q, i) => console.log(`  Q${i + 1}: ${oneLine(q)}`));
  }
  writeFileSync(join(__dirname, 'model-loop-compare-result.json'), JSON.stringify(results.map(r => ({ ...r, perConvo: undefined })), null, 2));
  console.log('\ndone.');
})();
