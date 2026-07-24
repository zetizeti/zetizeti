#!/usr/bin/env node
// dialogue-probe.mjs — the AUTH-LESS local dialogue test (feedback-auth-less-local-build-testing).
//
// Runs the REAL dialogue engine end to end — retrieval → deterministic signals → nudge → system prompt →
// never-answer guard → the live model (OPENROUTER_API_KEY from .env; gemini-3.1-flash-lite) — with NO
// OAuth, NO cohort tier, NO HTTP shell. It mirrors the /api/chat turn assembly (server.mjs) exactly, so
// the questions it prints are the questions the stone would really ask. This is how a branch change is
// shown to produce dialogue nuance BEFORE it is called "working" or signed off — unit tests gate
// correctness; this gates nuance.
//
// Usage:  node --env-file=.env scripts/dialogue-probe.mjs [scenario.json]
//   scenario.json = { "goal": "...", "discipline": "all", "turns": ["student msg", ...] }
//   default scenario = a CIRCLING learner (says the same thing five ways) — the stress case for the
//   Stalling Index / loop-break. The student's turns are scripted; the stone's questions come from the model.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { computeSignals } from '../lib/signals.mjs';
import { decideNudge } from '../lib/nudge.mjs';
import { loadMethodCore, buildSystemPrompt, buildTurnContext, validateOutput } from '../lib/dialogue.mjs';
import { generateGuarded } from '../lib/guard.mjs';
import { streamQuestion } from '../lib/llm.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APIKEY = (process.env.OPENROUTER_API_KEY || '').trim();
if (!APIKEY) { console.error('No OPENROUTER_API_KEY. Run:  node --env-file=.env scripts/dialogue-probe.mjs'); process.exit(1); }

const db = new Database(':memory:');
const nEntries = buildIndex(db, join(HERE, '..', 'corpus', 'domain'));
const methodCore = loadMethodCore(join(HERE, '..', 'corpus', 'method'));

const scenario = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : {
      goal: 'make my app onboarding less annoying',
      discipline: 'all',
      turns: [
        'i want to make onboarding less annoying',
        'like it just feels annoying and too long',
        'yeah its annoying, too many steps i guess',
        'i dunno, its just annoying and people drop off',
        'annoying, the steps are annoying, thats it',
      ],
    };

const goal = scenario.goal;
const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);
const discipline = scenario.discipline || 'all';

const history = [];
let exchanges = 0, turnsSinceNudge = 99;
const lineage = [goal];

console.log(`\n=== auth-less dialogue probe · model ${process.env.ZETIZETI_MODEL || '(default)'} · ${nEntries} tensions indexed ===`);
console.log(`GOAL: "${goal}"   (scenario: ${process.argv[2] || 'default — a circling learner'})\n`);

for (const message of scenario.turns) {
  const studentTurns = [...history.filter((h) => h.role === 'student').map((h) => h.content), message];
  const stoneTurns = history.filter((h) => h.role !== 'student').map((h) => h.content);
  const sig = computeSignals({ goal, lineage, studentTurns, stoneTurns, exchanges });

  // retrieval — mirrors server.mjs (rolling window + rotate-by-default, cycle-back if starved)
  const prev = studentTurns[studentTurns.length - 2] || '';
  const windowText = [prev, message, message].join(' ').trim() || message;
  const prevWindow = [studentTurns[studentTurns.length - 3] || '', prev, prev].join(' ').trim() || prev;
  const excludeIds = (studentTurns.length >= 2 && prevWindow)
    ? retrieve(db, prevWindow, { limit: 3, extraTerms: goalTerms, discipline }).map((r) => r.id) : [];
  let retrieved = retrieve(db, windowText, { limit: 3, extraTerms: goalTerms, discipline, excludeIds });
  if (!retrieved.length && excludeIds.length) retrieved = retrieve(db, windowText, { limit: 3, extraTerms: goalTerms, discipline });

  const nudge = decideNudge(sig, { exchanges, reDrewThisTurn: false, turnsSinceNudge });
  const system = buildSystemPrompt(methodCore, goal);
  const turnContent = buildTurnContext({ retrieved, posture: nudge.posture || '', message });
  const baseMessages = [
    ...history.map((h) => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: turnContent },
  ];

  const result = await generateGuarded({
    validate: validateOutput,
    generate: (correction) => {
      const msgs = correction
        ? [...baseMessages, { role: 'user', content: `Your previous reply "${correction.previous}" broke the rule (${correction.reasons.join('; ')}). ${correction.instruction}` }]
        : baseMessages;
      return streamQuestion({ system, messages: msgs, apiKey: APIKEY, maxTokens: 400, temperature: 0.3, reasoning: { enabled: false }, onToken: () => {} });
    },
  });

  const fired = nudge.fired ? `\x1b[35mposture[${nudge.fired}]\x1b[0m` : '\x1b[2m(no posture)\x1b[0m';
  const flags = `${result.regenerated ? ' \x1b[31m⟳guard-repaired\x1b[0m' : ''}${result.check?.ok ? '' : ' \x1b[31m⚑flagged\x1b[0m'}`;
  console.log(`\x1b[2m─────────────────────────────────────────────────────────────\x1b[0m`);
  console.log(`\x1b[33mstudent:\x1b[0m ${message}`);
  console.log(`  \x1b[2msignals\x1b[0m selfEcho ${sig.selfEcho.toFixed(2)} · cycling ${sig.cycling.toFixed(2)} · advancement ${sig.advancement.toFixed(2)} · specificity ${sig.specificity.toFixed(2)}  ${fired}${flags}`);
  if (nudge.surface) console.log(`  \x1b[2msurface\x1b[0m ${nudge.surface}`);
  console.log(`\x1b[36mstone:\x1b[0m ${result.text.trim()}`);

  history.push({ role: 'student', content: message });
  history.push({ role: 'stone', content: result.text.trim() });
  exchanges++;
  turnsSinceNudge = nudge.fired ? 0 : turnsSinceNudge + 1;
}
console.log('');
