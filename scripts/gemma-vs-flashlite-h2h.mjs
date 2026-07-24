// gemma-vs-flashlite-h2h.mjs — LOCAL. Head-to-head: Gemma-3-27B vs gemini-3.1-flash-lite as the zetizeti
// stone, over FULL 10-round conversations (the thing that matters — quality + whether the inquiry goes
// somewhere), through the real pipeline. For each seed, run a full Gemma conversation and a full flash-lite
// conversation, then strong NON-GOOGLE judges (claude-haiku-4.5, gpt-5.4-mini, deepseek-chat) pick the
// better whole dialogue, blind. Personal OpenRouter key, nothing persisted/deployed.
//
// Run:  OPENROUTER_API_KEY=<personal> node scripts/gemma-vs-flashlite-h2h.mjs

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

const GEMMA = 'google/gemma-3-27b-it';
const FLASH = 'google/gemini-3.1-flash-lite';
const STUDENT = 'google/gemini-3.1-flash-lite';
const JUDGES = ['anthropic/claude-haiku-4.5', 'openai/gpt-5.4-mini', 'deepseek/deepseek-chat-v3.1'];   // non-Google
const ROUNDS = process.env.ROUNDS ? +process.env.ROUNDS : 10;
const SEEDS = (process.env.SEEDS || [
  'making onboarding feel calmer for a meditation app, without losing sign-ups',
  'a campus wayfinding app students actually trust over Google Maps',
  'redesigning a hospital discharge letter so patients understand it',
  'a museum label system for objects with contested histories',
  'a board game that teaches monsoon water-harvesting to school kids',
  'getting people to actually read the terms before they tick the box',
  'making a government form for a widow’s pension humane',
  'a critical-design piece about how much data a loyalty card really takes',
].join('||')).split('||');

const oneLine = s => (s || '').replace(/\s+/g, ' ').trim();
const stripThink = s => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
const rand = n => Math.floor(Math.random() * n);
function wilson(w, n, z = 1.96) { if (!n) return [0, 0]; const p = w / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; }
async function pool(items, worker, conc = 6) { const out = new Array(items.length); let i = 0; const run = async () => { while (i < items.length) { const k = i++; out[k] = await worker(items[k], k); } }; await Promise.all(Array.from({ length: Math.min(conc, items.length) }, run)); return out; }

const corpus = new Database(':memory:');
buildIndex(corpus, join(__dirname, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, '..', 'corpus', 'method'));

async function ask(model, system, messages, { maxTokens, temperature }) {
  for (let a = 0; a < 3; a++) { try { const t = stripThink(await streamQuestion({ system, messages, model, apiKey: KEY, temperature, maxTokens, reasoning: { enabled: false }, onToken: () => {} })); if (t) return t; } catch { } }
  return '';
}
async function studentReply(seed, transcript, question) {
  const system = buildStudentSystemPrompt({ discipline: 'all' });
  const messages = transcript.length
    ? [...transcript.map(m => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })), { role: 'user', content: question }]
    : [{ role: 'user', content: `(Tutorial begins. Your project: "${seed}". Introduce it in your own words in a sentence or two — what you're trying to do, a bit unresolved — as your opening. Do not ask anything.)` }];
  return oneLine(await ask(STUDENT, system, messages, { maxTokens: 240, temperature: 0.9 })) || '(quiet)';
}
function stoneTurn(goal, history, message, exchanges, tsn) {
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
  const nudge = decideNudge(sig, { exchanges, reDrewThisTurn: false, turnsSinceNudge: tsn });
  const system = buildSystemPrompt(methodCore, goal);
  const turnContent = buildTurnContext({ retrieved, posture: nudge.posture || '', message });
  const messages = [...history.map(h => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })), { role: 'user', content: turnContent }];
  return { nudge, system, messages };
}
async function runConversation(seed, model) {
  const history = []; const questions = []; let message = await studentReply(seed, [], null); let tsn = 99, guard = 0;
  for (let r = 0; r < ROUNDS; r++) {
    const { nudge, system, messages } = stoneTurn(seed, history, message, r, tsn);
    let q = ''; for (let a = 0; a < 3 && !q; a++) q = await ask(model, system, messages, { maxTokens: 150, temperature: 0.3 });
    if (validateOutput(q).ok) guard++;
    questions.push(q);
    if (nudge.posture || nudge.surface) tsn = 0; else tsn++;
    history.push({ role: 'student', content: message }, { role: 'stone', content: q });
    if (r < ROUNDS - 1) message = await studentReply(seed, history, q);
  }
  return { seed, model, history, questions, guard };
}
const fmt = conv => conv.history.map((m, i) => `${m.role === 'student' ? 'STUDENT' : 'TUTOR'}: ${oneLine(m.content)}`).join('\n');

const JSYS = `You compare two Socratic design-tutoring CONVERSATIONS (a tutor questioning a student across ~10 turns). The BETTER conversation: asks genuinely good questions (ONLY questions — never answers/advises; reuses the STUDENT'S OWN words; opens NEW angles rather than restating; not formulaic or templated), AND takes the student's thinking somewhere — the student gets sharper and reaches real insight, the inquiry DEEPENS rather than circling or plateauing. Judge the whole arc, not single lines.`;
async function judge(model, tA, tB) {
  const u = `Conversation A:\n${tA}\n\nConversation B:\n${tB}\n\nWhich is the better Socratic tutoring conversation overall? Reply ONLY JSON: {"winner":"A"} or {"winner":"B"} or {"winner":"TIE"}.`;
  const raw = stripThink(await ask(model, JSYS, [{ role: 'user', content: u }], { maxTokens: 400, temperature: 0 }));
  const m = raw.match(/"winner"\s*:\s*"(A|B|TIE)"/i); return m ? m[1].toUpperCase() : null;
}

(async () => {
  console.log(`\nHEAD-TO-HEAD — Gemma-3-27B vs flash-lite as the stone · ${SEEDS.length} seeds × ${ROUNDS} rounds · whole-dialogue judging (3 non-Google judges)\n`);
  // generate both models' full conversations for every seed
  const jobs = []; for (const seed of SEEDS) for (const model of [GEMMA, FLASH]) jobs.push({ seed, model });
  const done = await pool(jobs, j => runConversation(j.seed, j.model), 6);
  const bySeed = {}; for (const c of done) { (bySeed[c.seed] ||= {})[c.model] = c; }

  // blind pairwise whole-conversation judging, gemma-is-A randomized per seed
  const T = { w: 0, t: 0, l: 0 };                     // w = Gemma wins
  const perJudge = Object.fromEntries(JUDGES.map(j => [j, { w: 0, t: 0, l: 0 }]));
  const gAisA = SEEDS.map(() => rand(2) === 1);
  const jtasks = []; SEEDS.forEach((seed, si) => JUDGES.forEach(jm => jtasks.push({ seed, si, jm })));
  const jres = await pool(jtasks, async ({ seed, si, jm }) => {
    const g = bySeed[seed][GEMMA], f = bySeed[seed][FLASH];
    const gIsA = gAisA[si];
    const win = await judge(jm, fmt(gIsA ? g : f), fmt(gIsA ? f : g));
    return { seed, jm, win, gIsA };
  }, 6);
  for (const { jm, win, gIsA } of jres) {
    if (!win) continue;
    if (win === 'TIE') { T.t++; perJudge[jm].t++; }
    else { const gemmaWon = (win === 'A') === gIsA; if (gemmaWon) { T.w++; perJudge[jm].w++; } else { T.l++; perJudge[jm].l++; } }
  }

  const n = T.w + T.l, wr = n ? T.w / n : 0, [lo, hi] = wilson(T.w, n);
  console.log(`══════════ WHOLE-DIALOGUE WIN-RATE — Gemma vs flash-lite ══════════`);
  console.log(`  Gemma wins ${T.w} · ties ${T.t} · flash-lite wins ${T.l}   →  Gemma win-rate ${(wr * 100).toFixed(0)}%  (95% CI [${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%])`);
  const verdict = lo > 0.5 ? 'Gemma BETTER' : hi < 0.5 ? 'flash-lite BETTER' : (hi - lo < 0.35 ? 'AT PARITY (as good as)' : 'inconclusive (need more seeds)');
  console.log(`  verdict: ${verdict}`);
  console.log(`  per-judge (Gemma W-T-L): ${JUDGES.map(j => `${j.split('/')[1]}: ${perJudge[j].w}-${perJudge[j].t}-${perJudge[j].l}`).join('  ·  ')}`);
  console.log(`\n  guard (both should be perfect): ` + [GEMMA, FLASH].map(m => `${m.split('/')[1]} ${done.filter(c => c.model === m).reduce((a, c) => a + c.guard, 0)}/${SEEDS.length * ROUNDS}`).join('  ·  '));

  // dump one seed's BOTH conversations for the human read
  const s0 = SEEDS[0];
  console.log(`\n══════════ SAMPLE (seed: ${s0}) — GEMMA questions vs FLASH-LITE questions ══════════`);
  for (let r = 0; r < ROUNDS; r++) {
    console.log(`  [${r + 1}] GEMMA : ${oneLine(bySeed[s0][GEMMA].questions[r])}`);
    console.log(`      FLASH : ${oneLine(bySeed[s0][FLASH].questions[r])}`);
  }
  writeFileSync(join(__dirname, 'gemma-vs-flashlite-h2h.json'), JSON.stringify({ total: T, perJudge, winRate: wr, ci: [lo, hi], seeds: SEEDS.map(s => ({ seed: s, gemma: bySeed[s][GEMMA].questions, flash: bySeed[s][FLASH].questions })) }, null, 2));
  console.log('\ndone.');
})();
