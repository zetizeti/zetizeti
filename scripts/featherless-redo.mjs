// featherless-redo.mjs — a FAIR re-test of whether cheaper OPEN models can do zetizeti's actual task
// (retrieve design tensions → compose ONE Clean-Language Socratic question, never answer).
//
// WHY THIS EXISTS (Prayas, 23 Jul 2026): the 22-Jun "open models lose" verdict
// (scripts/eval-results-small-20260622.md) was flawed. Read its own raw-output grounding: the open
// models did not fail at RETRIEVAL — they failed at FORMAT DISCIPLINE, and several of those failures
// were harness artifacts, not capability limits:
//   • phi-4 / mistral-24b / qwen3-14b — emitted MULTIPLE questions (a rubric that rewards exactly one
//     then scored them down); the CURRENT production prompt hard-constrains output to ONE question.
//   • qwen3-30b-a3b — EMPTIES + truncation, because a THINKING model was forced with reasoning:off.
//   • qwen3-30b — literal bracket-marker leaks. All prompt/format issues, not "can't do RAG".
//
// FAIRNESS FIXES vs confirm-finalists.mjs / small-eval.mjs:
//   1. Candidates run on FEATHERLESS (native serving), NOT forced through OpenRouter with reasoning:off.
//   2. Non-thinking INSTRUCT variants chosen — nothing to disable, so the empties artifact cannot recur.
//   3. The CURRENT production prompt (buildSystemPrompt/buildTurnContext) — the one-question constraint
//      that neutralises the multi-question penalty that sank the open models in June.
//   4. <think>…</think> stripped defensively before scoring.
//   5. The deterministic GUARD (validateOutput) is reported per model — the REAL production gate, judge-
//      free: "can it do the task" = "does it emit a clean single Clean-Language question", which the guard
//      measures with zero judge bias.
//   6. Blind shuffled labels; 2 gens/model noise floor; two judge panels that share NO vendor with any
//      candidate.
//
// Candidates (Featherless) — all cheaper than the deployed google/gemini-3.1-flash-lite ($0.25 in / $1.50
// out on OpenRouter), verified 23 Jul 2026:
//   Qwen/Qwen3-30B-A3B-Instruct-2507            $0.048 / $0.19   (30B MoE, 3.3B active) — the June 2.10 model, rerun fairly
//   mistralai/Mistral-Small-3.2-24B-Instruct-2506 $0.075 / $0.20 (24B dense) — the June 5.77 model, rerun fairly
//   deepseek-ai/DeepSeek-V3.1                    $0.25 / $0.95   (671B/37B MoE) — frontier-open anchor (input parity, output 1.6× cheaper → ~5% cheaper/exchange)
// Baseline (OpenRouter): google/gemini-3.1-flash-lite — the DEPLOYED model, the bar to clear.
//
// Gated on Featherless (need a HuggingFace OAuth link first): google/gemma-3-27b-it, meta-llama/Llama-3.3-70B-Instruct.
//   Connect HF, then just add them to CANDIDATES with prov:'featherless'.
//
// Run:  FEATHERLESS_API_KEY=rc_... node --env-file=.env scripts/featherless-redo.mjs
//   (OPENROUTER_API_KEY comes from .env for the baseline + judges; FEATHERLESS_API_KEY passed inline so
//    it never touches disk.)

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
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
const GENS_IN = (process.env.REJUDGE_FROM || '').trim();          // load saved generations, skip generation
const GENS_OUT = (process.env.GENS_OUT || '').trim() || join(__dirname, 'featherless-redo-gens.json');
if (!F_KEY) { console.error('No FEATHERLESS_API_KEY (judges + candidates run on Featherless).'); process.exit(1); }
if (!GENS_IN && !OR_KEY) { console.error('No OPENROUTER_API_KEY (needed for the flash-lite baseline; not needed with REJUDGE_FROM).'); process.exit(1); }

// ── models ────────────────────────────────────────────────────────────────────────────────────────
const BASELINE  = { key: 'gemini31lite', prov: 'openrouter', model: 'google/gemini-3.1-flash-lite' };
const CANDIDATES = [
  { key: 'qwen3-30b',   prov: 'featherless', model: 'Qwen/Qwen3-30B-A3B-Instruct-2507' },
  { key: 'mistral-24b', prov: 'featherless', model: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506' },
  { key: 'deepseek31',  prov: 'featherless', model: 'deepseek-ai/DeepSeek-V3.1' },
  { key: 'gemma-27b',   prov: 'featherless', model: 'google/gemma-3-27b-it' },   // $0.08/$0.16 — ungated once HF connected
  { key: 'llama-70b',   prov: 'featherless', model: 'meta-llama/Llama-3.3-70B-Instruct' }, // $0.10/$0.32 — ungated once HF connected
];
const MODELS_META = [BASELINE, ...CANDIDATES];          // baseline first = the bar
const MODEL_KEYS  = MODELS_META.map(m => m.key);
// two gens per model (a,b) → noise floor. 4 models × 2 = 8 variants → letters A–H (judges score 8).
const VARIANTS = MODELS_META.flatMap(m => [{ ...m, vkey: `${m.key}-a` }, { ...m, vkey: `${m.key}-b` }]);
const MODEL_OF = Object.fromEntries(VARIANTS.map(v => [v.vkey, v.key]));

// Judges are ALL on FEATHERLESS (no OpenRouter judge spend — Prayas, 23 Jul). Labels are blind-shuffled,
// so a judge cannot preferentially boost its own vendor's letter. Two panels for a robustness read.
// RELIABILITY-FIRST panel (23 Jul re-judge): the first run's Nemotron cold-load-timed-out (7/10) and
// Kimi-K2 was at capacity (0/10). These four all emit clean parseable JSON reliably on Featherless.
// Vendors: microsoft, alibaba×2, mistral. Soft, blind overlaps (alibaba↔qwen3, mistral↔mistral-24b) are
// second-order and diluted; phi-4 is fully non-overlapping. Judges score BLIND so self-preference is weak.
const PANEL_A = ['microsoft/phi-4', 'Qwen/Qwen2.5-72B-Instruct'];
const PANEL_B = ['Qwen/Qwen2.5-32B-Instruct', 'mistralai/Mistral-Small-24B-Instruct-2501'];
const ALL_JUDGES = [...PANEL_A, ...PANEL_B];

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────
const NO_REASON = { enabled: false };
const short = m => m.split('/')[1] || m;
const oneLine = s => (s || '').replace(/\s+/g, ' ').trim();
const rand = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
// Strip reasoning blocks so a stray <think>…</think> is never scored as the answer.
const stripThink = s => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, m => /<\/think>/i.test(m) ? '' : m).trim();

// ── corpus + prompt (the live production pipeline) ──────────────────────────────────────────────────
const corpus = new Database(':memory:');
buildIndex(corpus, join(__dirname, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, '..', 'corpus', 'method'));
const ret = (msg, goal) => retrieve(corpus, msg, { limit: 3, extraTerms: (goal || '').split(/\s+/).filter(Boolean) });

// ── generation: dispatch by provider ────────────────────────────────────────────────────────────────
async function genOpenRouter(model, system, messages) {
  try {
    return stripThink(await streamQuestion({
      system, messages, model, apiKey: OR_KEY,
      reasoning: NO_REASON, temperature: 0.3, maxTokens: 200, onToken: () => {},
    }));
  } catch (e) { return ''; }
}
// One Featherless (OpenAI-compatible) chat call, with retries for cold-load / capacity / rate blips.
async function fchat(model, messages, { maxTokens = 220, temperature = 0.3, tries = 4 } = {}) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${F_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens, stream: false }),
      });
      if (!res.ok) { await res.text().catch(() => ''); continue; }   // cold-load / capacity / rate → retry
      const j = await res.json();
      const c = j?.choices?.[0]?.message?.content || '';
      if (c) return c;
    } catch (e) { /* retry */ }
  }
  return '';
}
async function genFeatherless(model, system, messages) {
  return stripThink(await fchat(model, [{ role: 'system', content: system }, ...messages], { maxTokens: 220, temperature: 0.3 }));
}
const genOne = (meta, system, messages) =>
  meta.prov === 'featherless' ? genFeatherless(meta.model, system, messages) : genOpenRouter(meta.model, system, messages);

// ── inputs (the same 10 design tensions used by confirm-finalists / the June evals) ──────────────────
const inputs = [
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
];

// ── judge ─────────────────────────────────────────────────────────────────────────────────────────
async function judgeScores(judge, goal, msg, labelled) {
  const sys = `You evaluate Socratic questions for a design-tutoring tool. A GOOD question ONLY asks (never answers/advises/reassures), reuses the STUDENT'S OWN words (Clean Language), opens a genuine NEW angle (not restating), is NOT formulaic/templated, stays tethered to the student's goal, and pushes the student to sharpen their OWN thinking. Be a discerning, harsh grader — reserve 9-10 for excellent; mark down formulaic, advising, or scattershot multi-question answers. Empty/non-question = 0.`;
  const qBlock = labelled.map(([L, q]) => `${L}: "${oneLine(q) || '(empty)'}"`).join('\n');
  const user = `Student goal: "${goal}"\nStudent said: "${msg}"\n\nQuestions:\n${qBlock}\n\nScore EACH letter 0-10. Return ONLY JSON like {"A":7,"B":4,...}.`;
  // Judges run on FEATHERLESS. Strip any <think> block, then take the FIRST flat {...} object (so a
  // trailing rationale with braces can't corrupt the parse).
  const raw = stripThink(await fchat(judge, [{ role: 'system', content: sys }, { role: 'user', content: user }], { maxTokens: 700, temperature: 0, tries: 8 }));
  const m = raw.match(/\{[^{}]*\}/); if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// ── run ─────────────────────────────────────────────────────────────────────────────────────────
const gens = {};                 // vkey -> [text per input]
for (const v of VARIANTS) gens[v.vkey] = [];
const S = {};                    // vkey -> judge -> [scores]
for (const v of VARIANTS) { S[v.vkey] = {}; for (const j of ALL_JUDGES) S[v.vkey][j] = []; }

(async () => {
  // Phase 1 — GENERATION (model-by-model; Featherless caps model-switching at 4/min, so all 10 inputs × 2
  // gens for one model run before the next loads), OR load saved generations for a pure re-judge.
  if (GENS_IN) {
    const saved = JSON.parse(readFileSync(GENS_IN, 'utf8'));
    for (const v of VARIANTS) gens[v.vkey] = saved.gens[v.vkey] || [];
    console.log(`\nLOADED generations from ${GENS_IN} — skipping generation, re-judging only\n`);
  } else {
    console.log(`\nGENERATION (model-by-model; ${inputs.length} inputs × 2 gens each)\n`);
    const sysFor = inputs.map(({ goal }) => buildSystemPrompt(methodCore, goal));
    const msgsFor = inputs.map(({ goal, msg }) => [{ role: 'user', content: buildTurnContext({ retrieved: ret(msg, goal), posture: '', message: msg }) }]);
    for (const m of MODELS_META) {
      process.stdout.write(`  ${m.key.padEnd(14)} (${m.prov}) `);
      for (const suffix of ['a', 'b']) {
        const vkey = `${m.key}-${suffix}`;
        for (let i = 0; i < inputs.length; i++) {
          const out = await genOne(m, sysFor[i], msgsFor[i]);
          gens[vkey].push(out);
          process.stdout.write(out ? '.' : 'x');
        }
        process.stdout.write(' ');
      }
      console.log('');
    }
    writeFileSync(GENS_OUT, JSON.stringify({ models: MODEL_KEYS, inputs, gens }, null, 2));
    console.log(`  saved generations → ${GENS_OUT}  (re-judge with REJUDGE_FROM=${GENS_OUT})`);
  }

  // Phase 2 — GUARD pass-rate (deterministic, judge-free). The real production gate.
  console.log(`\nGUARD (validateOutput) — deterministic production gate, no judge involved`);
  const guard = {};
  for (const key of MODEL_KEYS) {
    const all = [`${key}-a`, `${key}-b`].flatMap(v => gens[v]);
    const passes = all.filter(t => validateOutput(t).ok).length;
    const empties = all.filter(t => !oneLine(t)).length;
    guard[key] = { passes, n: all.length, empties };
  }

  // Phase 3 — JUDGING (all on FEATHERLESS). Blind labels are fixed ONCE per input (every judge sees the
  // same arrangement); then we go JUDGE-BY-JUDGE (each judge scores all 10 inputs before the next model
  // loads) so Featherless's 4-switch/min limit is never hit.
  const blinds = inputs.map((_, i) => {
    const order = shuffle(VARIANTS);
    return {
      labelled: order.map((v, k) => [letters[k], gens[v.vkey][i]]),
      l2v: Object.fromEntries(order.map((v, k) => [letters[k], v.vkey])),
    };
  });
  console.log(`\nJUDGING on Featherless (${ALL_JUDGES.length} judges × ${inputs.length} inputs, blind, judge-by-judge)\n`);
  for (const judge of ALL_JUDGES) {
    process.stdout.write(`  ${short(judge).padEnd(30)} `);
    for (let i = 0; i < inputs.length; i++) {
      const { goal, msg } = inputs[i];
      const js = await judgeScores(judge, goal, msg, blinds[i].labelled);
      if (!js) { process.stdout.write('x'); continue; }
      for (const [L, vkey] of Object.entries(blinds[i].l2v)) if (typeof js[L] === 'number') S[vkey][judge].push(js[L]);
      process.stdout.write('.');
    }
    console.log('');
  }

  // ── report ────────────────────────────────────────────────────────────────────────────────────
  const variantJ = (vkey, judges) => judges.flatMap(j => S[vkey][j]);
  const modelAll = (m, judges) => [`${m}-a`, `${m}-b`].flatMap(v => variantJ(v, judges));
  const modelMean = (m, judges) => mean(modelAll(m, judges));

  function reportPanel(name, judges) {
    const base = modelMean(BASELINE.key, judges);
    console.log(`\n══════════ ${name}  (judges: ${judges.map(short).join(' · ')}) ══════════`);
    const within = mean(MODEL_KEYS.map(m => Math.abs(mean(variantJ(`${m}-a`, judges)) - mean(variantJ(`${m}-b`, judges)))));
    for (const m of [...MODEL_KEYS].sort((a, b) => modelMean(b, judges) - modelMean(a, judges))) {
      const o = modelMean(m, judges), degr = (base - o) / base * 100;
      const vs = m === BASELINE.key ? '(baseline: flash-lite)'
        : (degr > 10 ? `-${degr.toFixed(1)}%  OUT (>10% below flash-lite)`
          : degr > 0 ? `-${degr.toFixed(1)}%  within 10% of flash-lite`
            : `+${(-degr).toFixed(1)}%  BEATS flash-lite`);
      console.log(`  ${m.padEnd(14)} ${o.toFixed(2)}   ${vs}`);
    }
    const mm = MODEL_KEYS.map(m => modelMean(m, judges));
    console.log(`  within-model noise (avg |a-b|): ${within.toFixed(2)}   between-model spread: ${(Math.max(...mm) - Math.min(...mm)).toFixed(2)}`);
    const jm = (j, m) => mean([`${m}-a`, `${m}-b`].flatMap(v => S[v][j]));
    const tally = {};
    for (const j of judges) { const w = MODEL_KEYS[MODEL_KEYS.map(m => jm(j, m)).indexOf(Math.max(...MODEL_KEYS.map(m => jm(j, m))))]; tally[w] = (tally[w] || 0) + 1; }
    console.log(`  per-judge winner tally: ${Object.entries(tally).map(([m, n]) => `${m}:${n}`).join(' · ')}`);
  }
  reportPanel('PANEL A', PANEL_A);
  reportPanel('PANEL B', PANEL_B);
  reportPanel('BOTH PANELS COMBINED', ALL_JUDGES);

  console.log(`\n══════════ GUARD PASS-RATE (deterministic — the real gate) ══════════`);
  for (const m of MODEL_KEYS) {
    const g = guard[m];
    console.log(`  ${m.padEnd(14)} ${g.passes}/${g.n} clean single Clean-Language questions  (empties: ${g.empties})`);
  }

  console.log(`\n\n══════════ RAW QUESTIONS — side by side (the SDC human read) ══════════`);
  for (let i = 0; i < inputs.length; i++) {
    console.log(`\n[${i + 1}] goal: ${inputs[i].goal}`);
    console.log(`    student: ${oneLine(inputs[i].msg)}`);
    for (const m of MODELS_META) console.log(`    ${m.key.padEnd(14)}: ${oneLine(gens[`${m.key}-a`][i]) || '(empty)'}`);
  }
  console.log('\ndone.');
})();
