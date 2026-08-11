// featherless-arena.mjs — CONCLUSIVE re-test (23 Jul 2026, on Mac). The Likert re-judge reshuffled
// because these models cluster within ~1 point (noise > signal). This run is built to settle it:
//
//   • BLIND PAIRWISE — each open model vs the deployed flash-lite, head-to-head (robust where 0–10 isn't).
//   • JUDGE-INVARIANCE — a panel spanning MID judges (Featherless: phi-4, Qwen2.5-72B, Mistral-24B, free)
//     and STRONG authoritative judges (OpenRouter: claude-haiku-4.5, gpt-5.4-mini — both non-overlapping
//     with every candidate). If mid and strong AGREE, "the judges are too weak" is answered.
//   • STATISTICS — win-rate with a Wilson 95% CI (does it exclude 50%?), per-tier win-rates, tie-rate,
//     and an input-level read. A conclusion is only "conclusive" if the CI is decisive AND both tiers agree.
//   • OBJECTIVE GATE — the deterministic guard (validateOutput), judge-free, reported alongside.
//
// Honest note baked into the verdict logic: if the truth is parity, this concludes PARITY ("as good as
// flash-lite"), which IS the thesis that open models can do the task — not a failure to find a winner.
//
// Run:  OPENROUTER_API_KEY=… FEATHERLESS_API_KEY=… node scripts/featherless-arena.mjs
//   ARENA_N=3 → smoke run on the first 3 inputs.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { loadMethodCore, buildSystemPrompt, buildTurnContext, validateOutput } from '../lib/dialogue.mjs';
import { streamQuestion } from '../lib/llm.mjs';


// Dev traffic identifies itself to OpenRouter (11 Aug 2026). Without this every probe call
// filed under 'zetizeti' and was indistinguishable from a cohort in the spend logs.
// `||=` so an explicit ZETIZETI_APP_TITLE in the environment still wins.
process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OR_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const F_KEY = (process.env.FEATHERLESS_API_KEY || '').trim();
if (!OR_KEY) { console.error('No OPENROUTER_API_KEY (flash-lite baseline + strong judges).'); process.exit(1); }
if (!F_KEY) { console.error('No FEATHERLESS_API_KEY (candidates + mid judges).'); process.exit(1); }

const BASELINE = { key: 'flash-lite', prov: 'or', model: 'google/gemini-3.1-flash-lite' };
const CANDIDATES = [
  { key: 'qwen3-30b',   prov: 'f', model: 'Qwen/Qwen3-30B-A3B-Instruct-2507' },
  { key: 'mistral-24b', prov: 'f', model: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506' },
  { key: 'deepseek31',  prov: 'f', model: 'deepseek-ai/DeepSeek-V3.1' },
  { key: 'gemma-27b',   prov: 'f', model: 'google/gemma-3-27b-it' },
  { key: 'llama-70b',   prov: 'f', model: 'meta-llama/Llama-3.3-70B-Instruct' },
];
const GENMODELS = [BASELINE, ...CANDIDATES];
const JUDGES = [
  { m: 'microsoft/phi-4', prov: 'f', tier: 'mid' },
  { m: 'Qwen/Qwen2.5-72B-Instruct', prov: 'f', tier: 'mid' },
  { m: 'mistralai/Mistral-Small-24B-Instruct-2501', prov: 'f', tier: 'mid' },
  { m: 'anthropic/claude-haiku-4.5', prov: 'or', tier: 'strong' },
  { m: 'openai/gpt-5.4-mini', prov: 'or', tier: 'strong' },
];
const NO_REASON = { enabled: false };
const oneLine = s => (s || '').replace(/\s+/g, ' ').trim();
const stripThink = s => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, m => /<\/think>/i.test(m) ? '' : m).trim();
const short = m => m.split('/')[1] || m;
const rand = n => Math.floor(Math.random() * n);
function wilson(w, n, z = 1.96) { if (!n) return [0, 0]; const p = w / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; }
async function pool(items, worker, conc = 6) { const out = new Array(items.length); let i = 0; const run = async () => { while (i < items.length) { const k = i++; out[k] = await worker(items[k], k); } }; await Promise.all(Array.from({ length: Math.min(conc, items.length) }, run)); return out; }

const corpus = new Database(':memory:');
buildIndex(corpus, join(__dirname, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, '..', 'corpus', 'method'));
const ret = (msg, goal) => retrieve(corpus, msg, { limit: 3, extraTerms: (goal || '').split(/\s+/).filter(Boolean) });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fchat(model, messages, { maxTokens = 220, temperature = 0.3, tries = 10 } = {}) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${F_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
      });
      if (res.ok) { const c = (await res.json())?.choices?.[0]?.message?.content || ''; if (c) return c; }
      else { await res.text().catch(() => ''); }
    } catch { /* retry */ }
    await sleep(2000 + t * 2000); // 2s,4s,6s… — gives a cold 70B / at-capacity model time to warm before giving up
  }
  return '';
}
async function orText(model, system, messages, maxTokens) {
  try { return await streamQuestion({ system, messages, model, apiKey: OR_KEY, reasoning: NO_REASON, temperature: model === BASELINE.model ? 0.3 : 0, maxTokens, onToken: () => {} }); }
  catch { return ''; }
}
async function genOne(meta, system, messages) {
  if (meta.prov === 'f') return stripThink(await fchat(meta.model, [{ role: 'system', content: system }, ...messages], { maxTokens: 220 }));
  return stripThink(await orText(meta.model, system, messages, 200));
}

// ── judging (pairwise) ──────────────────────────────────────────────────────────────────────────────
const JSYS = `You compare two Socratic questions for a design-tutoring tool. A BETTER question ONLY asks (never answers/advises/reassures), reuses the STUDENT'S OWN words (Clean Language), opens a genuine NEW angle (not restating), is NOT formulaic/templated, stays tethered to the student's goal, and pushes the student to sharpen their OWN thinking. Judge ONLY on these; ignore length and politeness. If genuinely equal, say TIE.`;
const juser = (goal, msg, qA, qB) => `Student goal: "${goal}"\nStudent said: "${msg}"\n\nQuestion A: "${oneLine(qA) || '(empty)'}"\nQuestion B: "${oneLine(qB) || '(empty)'}"\n\nWhich is the better Socratic question? Reply ONLY JSON: {"winner":"A"} or {"winner":"B"} or {"winner":"TIE"}.`;
const parseWinner = t => { const m = stripThink(t).match(/"winner"\s*:\s*"(A|B|TIE)"/i); return m ? m[1].toUpperCase() : null; };
async function judge(j, goal, msg, qA, qB) {
  const u = juser(goal, msg, qA, qB);
  if (j.prov === 'f') return parseWinner(await fchat(j.m, [{ role: 'system', content: JSYS }, { role: 'user', content: u }], { maxTokens: 200, temperature: 0 }));
  return parseWinner(await orText(j.m, JSYS, [{ role: 'user', content: u }], 120));
}

const ALLINPUTS = [
  { goal: 'redesign a hospital discharge form so patients actually read it', msg: "My discharge form is complete but nobody reads it. I'm told to make it 'clearer', but I think it's written for the hospital's liability, not the patient's understanding." },
  { goal: 'make a protest poster that still has bite', msg: "My protest poster keeps getting called 'striking' and 'beautiful', and that praise makes me feel like it's failed — it's become decorative, something to admire instead of act on." },
  { goal: 'design a tutorial that respects the player', msg: "My game tutorial holds the player's hand through everything. It works — nobody gets stuck — but nobody discovers anything, and the game feels solved before it starts." },
  { goal: 'design a memorial people actually stop at', msg: "I designed a memorial and watched people walk straight past it. It's dignified and tasteful, and I think that's exactly the problem — it's so respectful it's invisible." },
  { goal: 'design a consent flow that is honest', msg: "My cookie consent flow is technically compliant, but I built it so people click 'accept all', and I know that's the point, and I feel like a fraud." },
  { goal: 'edit a documentary fairly', msg: "In the edit, my subject keeps coming across as guilty. I'm not adding anything false — just the order of the cuts — but the truth of the footage and the feeling of the sequence are pulling apart." },
  { goal: 'design honest sustainability labelling', msg: "The fabric is recycled, that part's real, but the big 'sustainable' label makes a whole-garment claim the garment can't back, and I'm the one designing the tag." },
  { goal: 'design a smart speaker that does not feel like surveillance', msg: "Our smart speaker's always-on mic is genuinely useful, but in a home it feels like surveillance, and the little 'listening' light somehow makes it worse, not better." },
  { goal: 'design a dashboard that surfaces what matters', msg: "My dashboard shows everything and the user sees nothing — I keep adding charts to look thorough, but it just buries the one number that actually matters." },
  { goal: 'make a rebrand that is actually distinct', msg: "The rebrand brief says 'clean and modern', and that's killing me — every competitor says the same, and I can't tell if mine is actually different or just another sans-serif on white." },
  { goal: 'design an onboarding that does not overwhelm', msg: "My fintech onboarding has twelve steps 'to be safe', and users drop off halfway — but every step is there because a stakeholder was scared of something." },
  { goal: 'make a data visualisation that is honest', msg: "My chart is technically accurate, but the axis I chose makes a tiny change look enormous, and that dramatic version is exactly the story the team wants to tell." },
  { goal: 'design a clinic queue that feels fair', msg: "My clinic token system is efficient, but people feel cheated when someone walks in and is seen first for a 'quick' thing, and the efficiency is somehow making the unfairness louder." },
  { goal: 'design a notification that respects attention', msg: "My streak notifications boost retention, they really work — but I've built something that punishes people for having a life outside the app." },
  { goal: 'make a form that does not misgender people', msg: "There's a required gender dropdown with two options because the database wants it that way, and I'm the one who has to design the thing that erases people." },
  { goal: 'design a feed that does not trap people', msg: "The recommendation feed works — engagement is up — but I've built something that keeps people scrolling long past the point they actually wanted to stop." },
  { goal: 'design packaging that is not wasteful theatre', msg: "The unboxing needs layers and tissue to feel premium, and it does feel premium — for about thirty seconds, and then it's all landfill." },
  { goal: 'write an error message that does not blame the user', msg: "My error copy just says 'invalid input', and I keep writing it that way, as if it's the user's fault that the system decided to be strict." },
  { goal: 'design a museum route that does not exhaust people', msg: "The layout forces everyone through every gallery for 'completeness', and by room eight nobody is looking at anything — they're just walking to the exit." },
  { goal: 'make a pricing page that is not manipulative', msg: "The 'most popular' badge and the struck-through price work — conversions are up — but I designed them to steer people, not to inform them, and I know the difference." },
  { goal: 'design a returns process that is not hostile', msg: "My returns flow is deliberately annoying to cut return rates, and it works — but I'm the one adding friction to punish honest customers for a policy decision." },
  { goal: 'choose type that people can actually read', msg: "My low-contrast grey type looks elegant and the client loves it, but I know people with low vision can't read it, and I keep choosing the elegant version anyway." },
  { goal: 'design an assistant that does not fake empathy', msg: "My chatbot says 'I understand how you feel' when it understands nothing, and users thank it warmly, and that gratitude is the part that unsettles me." },
  { goal: 'design station signage for a multilingual city', msg: "My wayfinding assumes everyone reads English, in a city where half the people at the station don't, and 'clean' design is my excuse for not adding the other scripts." },
  { goal: 'design a quiz app that rewards thinking not speed', msg: "My quiz app scores on speed, so students learn to answer fast instead of think, and the leaderboard is the thing they're actually playing, not the subject." },
  { goal: 'photograph a community without reducing them', msg: "I shot the campaign for the NGO, and the images that raise the most money are the ones that show the community as most helpless, and those are the ones getting picked." },
  { goal: 'design a trial that does not rely on forgetting', msg: "The free trial needs a card and auto-renews, and it converts because people forget to cancel, and I keep realising that forgetting IS the business model." },
  { goal: 'design a shelf logo I am not embarrassed by', msg: "The logo has to shout to compete on a crowded shelf, and I've made something loud and aggressive that does the job and that I can't actually stand to look at." },
  { goal: 'design a game economy that is not built on frustration', msg: "My mobile game's timers manufacture the urge to pay to skip the wait, and the 'fun' is really just friction I engineered so I can sell people relief from it." },
  { goal: 'design a grievance form people can finish', msg: "The civic complaint form is so long that most people give up, and then the low number of complaints gets reported upward as 'high satisfaction'." },
];
const N = process.env.ARENA_N ? Math.min(+process.env.ARENA_N, ALLINPUTS.length) : ALLINPUTS.length;
const inputs = ALLINPUTS.slice(0, N);

// ── run ─────────────────────────────────────────────────────────────────────────────────────────────
const Q = {}; for (const m of GENMODELS) Q[m.key] = [];
// blind A/B: pos[i][ci] === 1 → candidate is "A"; 0 → baseline is "A"
const pos = inputs.map(() => CANDIDATES.map(() => rand(2)));
// tally[cand.key][judge.m] = {w,t,l}  (w = open candidate beats flash-lite)
const T = {}; for (const c of CANDIDATES) { T[c.key] = {}; for (const j of JUDGES) T[c.key][j.m] = { w: 0, t: 0, l: 0 }; }

(async () => {
  console.log(`\nARENA — ${CANDIDATES.length} open models vs flash-lite · ${inputs.length} inputs · ${JUDGES.length} judges (3 mid + 2 strong) · blind pairwise\n`);

  // GENERATION (one question per model per input; model-by-model for the Featherless switch limit)
  console.log(`GENERATION`);
  const sysFor = inputs.map(({ goal }) => buildSystemPrompt(methodCore, goal));
  const msgsFor = inputs.map(({ goal, msg }) => [{ role: 'user', content: buildTurnContext({ retrieved: ret(msg, goal), posture: '', message: msg }) }]);
  for (const m of GENMODELS) {
    process.stdout.write(`  ${m.key.padEnd(12)} `);
    for (let i = 0; i < inputs.length; i++) { const o = await genOne(m, sysFor[i], msgsFor[i]); Q[m.key].push(o); process.stdout.write(o ? '.' : 'x'); }
    console.log('');
  }
  writeFileSync(join(__dirname, 'featherless-arena-gens.json'), JSON.stringify({ inputs, Q }, null, 2));

  // GUARD (objective)
  const guard = {}; for (const m of GENMODELS) { const a = Q[m.key]; guard[m.key] = { pass: a.filter(t => validateOutput(t).ok).length, n: a.length, empty: a.filter(t => !oneLine(t)).length }; }

  // JUDGING — Featherless judges judge-by-judge (switch limit); OpenRouter judges via a concurrency pool.
  console.log(`\nJUDGING (mid = Featherless, judge-by-judge; strong = OpenRouter, pooled)`);
  const record = (ck, jm, win, candIsA) => { const r = T[ck][jm]; if (win === 'TIE') r.t++; else { (((win === 'A') === candIsA) ? r.w++ : r.l++); } };
  for (const j of JUDGES.filter(j => j.prov === 'f')) {
    process.stdout.write(`  ${short(j.m).padEnd(28)} `);
    for (let ci = 0; ci < CANDIDATES.length; ci++) for (let i = 0; i < inputs.length; i++) {
      const candIsA = pos[i][ci] === 1, cq = Q[CANDIDATES[ci].key][i], bq = Q[BASELINE.key][i];
      const w = await judge(j, inputs[i].goal, inputs[i].msg, candIsA ? cq : bq, candIsA ? bq : cq);
      if (w) { record(CANDIDATES[ci].key, j.m, w, candIsA); process.stdout.write('.'); } else process.stdout.write('x');
    }
    console.log('');
  }
  for (const j of JUDGES.filter(j => j.prov === 'or')) {
    const tasks = []; for (let ci = 0; ci < CANDIDATES.length; ci++) for (let i = 0; i < inputs.length; i++) tasks.push({ ci, i });
    process.stdout.write(`  ${short(j.m).padEnd(28)} `);
    let done = 0;
    await pool(tasks, async ({ ci, i }) => {
      const candIsA = pos[i][ci] === 1, cq = Q[CANDIDATES[ci].key][i], bq = Q[BASELINE.key][i];
      const w = await judge(j, inputs[i].goal, inputs[i].msg, candIsA ? cq : bq, candIsA ? bq : cq);
      if (w) record(CANDIDATES[ci].key, j.m, w, candIsA);
      if (++done % 10 === 0) process.stdout.write('.');
    }, 6);
    console.log(` (${done})`);
  }

  // ── report ────────────────────────────────────────────────────────────────────────────────────────
  const tierWL = (ck, tier) => JUDGES.filter(j => j.tier === tier).reduce((a, j) => ({ w: a.w + T[ck][j.m].w, l: a.l + T[ck][j.m].l, t: a.t + T[ck][j.m].t }), { w: 0, l: 0, t: 0 });
  console.log(`\n══════════ PAIRWISE vs flash-lite — win-rate with Wilson 95% CI (W = open model wins) ══════════`);
  console.log(`  ${'model'.padEnd(12)}  W  T  L   win%  95% CI          mid%  strong%  verdict`);
  const summary = [];
  for (const c of CANDIDATES) {
    let W = 0, Tt = 0, L = 0; for (const j of JUDGES) { W += T[c.key][j.m].w; Tt += T[c.key][j.m].t; L += T[c.key][j.m].l; }
    const n = W + L, wr = n ? W / n : 0, [lo, hi] = wilson(W, n);
    const mid = tierWL(c.key, 'mid'), str = tierWL(c.key, 'strong');
    const midWr = (mid.w + mid.l) ? mid.w / (mid.w + mid.l) : 0, strWr = (str.w + str.l) ? str.w / (str.w + str.l) : 0;
    const agree = (midWr >= 0.5) === (strWr >= 0.5);
    const verdict = !agree ? 'MIXED (tiers disagree)' : lo > 0.5 ? 'BEATS flash-lite' : hi < 0.5 ? 'loses to flash-lite'
      : (hi - lo < 0.22 && lo > 0.40) ? 'AT PARITY (as good as)' : 'inconclusive (need more n)';
    console.log(`  ${c.key.padEnd(12)} ${String(W).padStart(2)} ${String(Tt).padStart(2)} ${String(L).padStart(2)}  ${(wr * 100).toFixed(0).padStart(3)}%  [${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%]${(hi - lo < 0.22 ? '   ' : '  ')}  ${(midWr * 100).toFixed(0).padStart(3)}%   ${(strWr * 100).toFixed(0).padStart(4)}%   ${verdict}`);
    summary.push({ model: c.key, W, T: Tt, L, winRate: wr, ci: [lo, hi], midWr, strWr, verdict });
  }
  console.log(`\n  (win% = wins/(wins+losses), ties excluded. mid = 3 Featherless judges, strong = claude-haiku-4.5 + gpt-5.4-mini.`);
  console.log(`   "AT PARITY" = CI spans 50% and is tight → statistically indistinguishable from flash-lite = as good.)`);

  console.log(`\n══════════ GUARD PASS-RATE (deterministic, judge-free) ══════════`);
  for (const m of GENMODELS) console.log(`  ${m.key.padEnd(12)} ${guard[m.key].pass}/${guard[m.key].n} clean single questions (empties: ${guard[m.key].empty})`);

  console.log(`\n══════════ RAW PAIRS (human read) ══════════`);
  for (let i = 0; i < inputs.length; i++) { console.log(`\n[${i + 1}] ${inputs[i].goal}`); for (const m of GENMODELS) console.log(`    ${m.key.padEnd(12)}: ${oneLine(Q[m.key][i]) || '(empty)'}`); }
  writeFileSync(join(__dirname, 'featherless-arena-result.json'), JSON.stringify({ n: inputs.length, judges: JUDGES, summary, guard }, null, 2));
  console.log('\ndone.');
})();
