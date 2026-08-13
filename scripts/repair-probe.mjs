#!/usr/bin/env node
// repair-probe.mjs — why does the closed-question repair fail?
//
// THE QUESTION (buffer.md B4). Two questions in a real student session (12 Aug 2026) are refused by
// `validateOutput` on `noClosed` and were delivered anyway, which means the repair ran and failed twice.
// The 12 Aug concept-only probe put the same flagged-delivery rate near one in ten. The refusal text
// ALREADY tells the model how to open a closed question, so the guidance exists and fails regardless.
//
// This project's own lesson is not to patch a guard blind — "measure each guard rule ALONE" was learned
// by attributing pre-existing FORBIDDEN hits to a new rule. So this measures the REPAIR STEP in
// isolation: given a question the guard has refused, and the correction the guard produces, how often
// does the retry actually come back open?
//
// THE HYPOTHESIS UNDER TEST. `repairInstruction` puts the specific fix in a PARENTHETICAL and then ends
// on an imperative about something else entirely — one short question, own words, do not explain. If a
// model weights the closing imperative over a bracketed aside, the fix never lands. Arm B moves the fix
// into the imperative and changes nothing else.
//
// Run: node --env-file=.env scripts/repair-probe.mjs [--trials=12]
import { writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { streamQuestion } from '../lib/llm.mjs';
import { validateOutput, questionOpener, loadMethodCore, buildSystemPrompt, buildTurnContext } from '../lib/dialogue.mjs';
import Database from 'better-sqlite3';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { repairInstruction } from '../lib/guard.mjs';

process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';
const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const MODEL = process.env.ZETIZETI_MODEL || 'google/gemini-3.1-flash-lite';
if (!KEY) { console.error('No OPENROUTER_API_KEY — run with node --env-file=.env'); process.exit(1); }
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const TRIALS = +arg('trials', 12);

// THE CASES COME FROM A FILE, and the file is not in this repository.
//
// Two of the four refused questions this probe measures are verbatim from a real student's session of
// 12 August 2026, together with that student's project goal and the words their session turned on.
// Their material is theirs, and it lives in `docs/ops/fixtures/`, which is excluded from the public
// export — the same arrangement `flow-probe.mjs` already uses for `--replay=<fixture>`: the code is
// public, the student is not.
//
// So the private file is the DEFAULT and its absence is not an error. Run it in a clone and you get
// the SYNTHETIC set below: the same four shapes, invented, and the probe works. What you do not get is
// the run that produced the finding, because two of those cases were chosen precisely for being the
// real failures — and this project's own rule is that a play-acted student is not evidence. The
// synthetic set reproduces the METHOD. It does not reproduce the RESULT, and it says so when it runs.
const CASES_FILE = arg('cases', join(HERE, '../../docs/ops/fixtures/repair-probe-cases-20260812.json'));

const SYNTHETIC = {
  goal: 'a tool that helps someone notice when a habit has stopped serving them',
  query: 'habit attention noticing routine change threshold',
  cases: [
    { ctx: 'the habit stops being a choice and becomes something that just happens',
      q: 'Does that shift mean the person has lost the ability to choose, or only stopped exercising it?' },
    { ctx: 'it fades into the background of the day',
      q: 'Is the fading because the habit is predictable, or because the person is no longer resisting it?' },
    { ctx: 'i want people to feel less alone when they use it',
      q: 'Is that feeling of being less alone something the product creates, or something it reveals?' },
    { ctx: 'the interface should get out of the way',
      q: 'Can the interface get out of the way without the person losing track of what it is doing?' },
  ],
};

let SESSION = SYNTHETIC, REAL = false;
try { SESSION = JSON.parse(readFileSync(CASES_FILE, 'utf8')); REAL = true; }
catch { console.log(`(no cases file at ${CASES_FILE} — running the SYNTHETIC set. Same method, not the run that produced the finding.)\n`); }
const CASES = SESSION.cases;

// Arm B — the ONLY change is where the corrective sits. Same content, promoted from a bracketed aside
// into the closing imperative, because that is the sentence a model is most likely to act on.
function repairInstructionLed(reasons = []) {
  const why = reasons.length ? reasons.join('; ') : 'it broke the questioning rule of this mode';
  return `That reply broke this mode's rule (${why}). `
    + `Reply again with ONE short question only — a single sentence ending in one question mark, in the learner's own words. `
    + `START THE QUESTION WITH what, how, where, when, or which — never with is/are/do/does/did/can/could/will/would/should/may/might/must, because a question opening that way can be answered yes or no. `
    + `Do not explain, advise, reassure, conclude, or answer.`;
}

// ARM C uses the turn as PRODUCTION builds it: the retrieved domain material, a posture, a shape, and
// the real history — then the correction last. If the repair works bare and fails here, the correction
// is not wrong, it is outnumbered.
async function retry(sys, ctx, prev, instruction, heavy = null) {
  const messages = heavy
    ? [...heavy.history, { role: 'user', content: heavy.turnContent },
       { role: 'assistant', content: prev },
       { role: 'user', content: `Your previous reply "${prev}" broke the rule. ${instruction}` }]
    : [
    { role: 'user', content: ctx },
    { role: 'assistant', content: prev },
    { role: 'user', content: `Your previous reply "${prev}" broke the rule. ${instruction}` },
  ];
  try {
    return (await streamQuestion({ system: sys, messages, model: MODEL, apiKey: KEY,
      maxTokens: 200, temperature: 0.3, reasoning: { enabled: false }, onToken: () => {} }) || '').trim();
  } catch { return ''; }
}

(async () => {
  const methodCore = loadMethodCore(join(HERE, '../corpus/method'));
  const sys = buildSystemPrompt(methodCore, SESSION.goal);
  const opts = { noClosed: true, noBinary: true };
  const rows = [];

  console.log(`repair-probe · ${CASES.length} refused questions (${REAL ? 'REAL session' : 'SYNTHETIC'}) × ${TRIALS} trials × 2 arms · ${MODEL}\n`);
  // production-shaped context, built once
  const db = new Database(':memory:');
  buildIndex(db, join(HERE, '../corpus/domain'));
  const retrieved = retrieve(db, SESSION.query, { limit: 3 });
  // Arm C needs a real conversation behind it — the question is whether the correction is OUTNUMBERED
  // by production context, and invented history would not weigh the same. The replay fixture is the
  // student's own transcript and stays in docs/ops/. Without it, arm C runs on the case alone and the
  // header says so, rather than quietly measuring something else under the same name.
  let history = [];
  if (SESSION.replay) {
    try {
      const f = JSON.parse(readFileSync(join(HERE, '../../docs/ops/fixtures/', SESSION.replay), 'utf8'));
      history = f.turns.slice(0, 12).map((t, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: t }));
    } catch { console.log('(replay fixture not present — arm C runs without conversation history.)\n'); }
  }
  const turnContent = buildTurnContext({
    retrieved, posture: 'ask a commitment-testing question', shape: 'keep it plain and short',
    message: CASES[1].ctx,
    banOpeners: ['what', 'how'], precision: true, vantage: true,
  });
  console.log(`  (arm C context: ${turnContent.length} chars of turn material + ${history.length} history turns)\n`);

  for (const arm of ['A: as shipped', 'B: fix in the imperative', 'C: as shipped, PRODUCTION context']) {
    let fixed = 0, total = 0; const openers = {};
    for (const c of CASES) {
      const check = validateOutput(c.q, opts);
      if (check.ok) { console.log(`  ⚠ case not refused by the guard, skipped: ${c.q.slice(0, 50)}`); continue; }
      const instr = arm.startsWith('B') ? repairInstructionLed(check.reasons)
                                        : repairInstruction(check.reasons, { mode: 'enquiry' });
      const heavy = arm.startsWith('C') ? { history, turnContent } : null;
      for (let i = 0; i < TRIALS; i++) {
        const out = await retry(sys, c.ctx, c.q, instr, heavy);
        const v = validateOutput(out, opts);
        const op = questionOpener(out) || '(none)';
        openers[op] = (openers[op] || 0) + 1;
        total += 1; if (v.ok) fixed += 1;
        rows.push({ arm, q: c.q, out, ok: v.ok, opener: op, reasons: v.reasons });
      }
    }
    const pct = total ? Math.round((fixed / total) * 100) : 0;
    console.log(`  ${arm.padEnd(26)} repaired ${fixed}/${total}  (${pct}%)`);
    const top = Object.entries(openers).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([k, v]) => `${k}:${v}`).join('  ');
    console.log(`  ${' '.repeat(26)} openers → ${top}\n`);
  }

  // Log every run, append-only, with full outputs (28 Jul 2026 rule).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(HERE, '../../docs/ops/flow-probe-runs'); mkdirSync(dir, { recursive: true });
  const file = join(dir, `repair-probe-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ model: MODEL, trials: TRIALS, cases: CASES, rows }, null, 2));
  const byArm = {};
  for (const r of rows) { byArm[r.arm] ??= { n: 0, ok: 0 }; byArm[r.arm].n++; if (r.ok) byArm[r.arm].ok++; }
  appendFileSync(join(HERE, '../../docs/ops/flow-probe-log.md'),
    `\n- **${new Date().toISOString()}** repair-probe (why the closed-question repair fails) — `
    + Object.entries(byArm).map(([k, v]) => `${k}: ${v.ok}/${v.n}`).join(' · ')
    + `. Full outputs: \`docs/ops/flow-probe-runs/repair-probe-${stamp}.json\`\n`);
  console.log(`full outputs → ${file}`);
})();
