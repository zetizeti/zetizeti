#!/usr/bin/env node
// flow-probe.mjs — the AUTH-LESS variant comparison for the "navigation, flow" work
// (feedback-auth-less-local-build-testing; branch fix-enquiry-flow, 28 Jul 2026).
//
// WHY THIS EXISTS. dialogue-probe.mjs replays a FIXED script of student replies, so it shows what the
// stone asks but can never show whether a student would stay. a student's 28 July transcript failed on
// exactly that axis: forty questions, fifteen of forty-one replies dry ("i don't know", "idk", "yeah"),
// and he left at the turn cap. So this harness pairs the real engine with a PLAY-ACTED student who is
// permitted to disengage — shorter and vaguer when pressed, longer and more specific when opened. That
// permission is the measuring instrument. The student model never learns which variant it is in; it
// only ever sees the questions.
//
// Turn assembly mirrors server.mjs /api/chat exactly (rolling-window retrieval with the three-turn
// exclusion, computeSignals, decideNudge, readArc → aimBlock, formShape, generateGuarded). Variants
// switch parts of that assembly off or on; everything else is held constant.
//
// Run:  node --env-file=.env scripts/flow-probe.mjs [--variants=V0,V6] [--convos=3] [--rounds=12]
//       node --env-file=.env scripts/flow-probe.mjs --transcripts    (print the conversations too)
//
// REPLAY FIXTURES live OUTSIDE the published tree — a real student's tutorial transcript is theirs, was
// shared for debugging, and `scripts/` is whitelisted wholesale by publish-public.sh:
//   node --env-file=.env scripts/flow-probe.mjs --replay=../../docs/ops/fixtures/replay-session-20260728.json --rounds=41

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { computeSignals } from '../lib/signals.mjs';
import { decideNudge, formShape } from '../lib/nudge.mjs';
import { readArc, aimBlock, readDwell, isRedirect, isDecline, isCorrection, lastSubstantive } from '../lib/arc.mjs';
import { loadMethodCore, buildSystemPrompt, buildTurnContext, validateOutput, questionFrames, questionOpener } from '../lib/dialogue.mjs';
import { generateGuarded } from '../lib/guard.mjs';
import { readAssociation, associationBlock, associatesPrompt, pickAssociate, widenBlock } from '../lib/assoc.mjs';
import { streamQuestion } from '../lib/llm.mjs';


// Dev traffic identifies itself to OpenRouter (11 Aug 2026). Without this every probe call
// filed under 'zetizeti' and was indistinguishable from a cohort in the spend logs.
// `||=` so an explicit ZETIZETI_APP_TITLE in the environment still wins.
process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
if (!KEY) { console.error('No OPENROUTER_API_KEY. Run: node --env-file=.env scripts/flow-probe.mjs'); process.exit(1); }

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const CONVOS = +arg('convos', 3);
const ROUNDS = +arg('rounds', 12);
const SHOW = process.argv.includes('--transcripts');
const STUDENT_MODEL = 'google/gemini-3.1-flash-lite';
const STONE_MODEL = process.env.ZETIZETI_MODEL || 'google/gemini-3.1-flash-lite';

// ── the variants ────────────────────────────────────────────────────────────────────────────────────
// Each is the SAME engine with parts of the July steering layer switched off, plus the new flow rules
// switched on. Flags are read by the turn assembly below and (for dwell/vantage/brevity) passed into the
// library functions, so the probe never carries a second copy of any rule.
// ISOLATED, so each change gets its own verdict (Prayas, 28 Jul: "which of the probes worked — from 1
// to 6 — and which didn't"). Every C-variant differs from its own comparator in exactly ONE respect:
// C1/C2/C3/C5 sit on the control (C6), because those four replace the July steering layer; C4 sits on
// the BASELINE, because a learner's redirect acts through the arc's lineage and there is no arc to act
// on once the aim block is off. VMIX stacks whatever wins and is defined after the isolated read.
const VARIANTS = {
  V0: { label: 'baseline (v0.10.2 as shipped)', aim: true, shape: true },
  C6: { label: '6 · control — aim block + form shape OFF', aim: false, shape: false },
  C1: { label: '1 · succession (on control)', aim: false, shape: false, succession: true },
  C2: { label: '2 · dwell (on control)', aim: false, shape: false, dwell: true },
  C3: { label: '3 · vantage from corpus (on control)', aim: false, shape: false, vantage: true },
  C5: { label: '5 · brevity enforced ≤20w (on control)', aim: false, shape: false, brevity: 20 },
  C4: { label: '4 · learner redirect heard (on baseline)', aim: true, shape: true, steering: true },
  VMIX: { label: 'mix — succession + dwell + vantage + brevity + steering', aim: false, shape: false, succession: true, dwell: true, vantage: true, brevity: 20, steering: true },
  // Second round: the two that actually worked in isolation (1 succession, 2 dwell), which VMIX had
  // buried under vantage and brevity. The three differ only in what supplies the LENGTH discipline the
  // aim block used to supply as a side effect.
  F1: { label: 'flow — succession + dwell', aim: false, shape: false, succession: true, dwell: true, steering: true },
  F2: { label: 'flow + form-shape rotation kept', aim: false, shape: true, succession: true, dwell: true, steering: true },
  F3: { label: 'flow + brevity ≤28w in the guard', aim: false, shape: false, succession: true, dwell: true, steering: true, brevity: 28 },
  // F4 = F2 with the one contradicting shape swapped for the friend shape (nudge.mjs FLOW_SHAPES).
  F4: { label: 'flow + FLOW_SHAPES (friend replaces "ask for a particular")', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, steering: true },
  // F5 isolates change 4 INSIDE the winning combination: F4 with the learner-redirect reading removed.
  F5: { label: 'F4 minus steering (isolates change 4)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true },
  // ── the meaning pass (28 Jul, second round) ───────────────────────────────────────────────────────
  M0: { label: 'F4 as it was (pre-meaning-fix)', aim: false, shape: true, flowShapes: true, poetic: true, succession: true, dwell: true },
  M1: { label: 'pruned approaches + plain shapes only', aim: false, shape: true, flowShapes: true, succession: true, dwell: true },
  MFULL: { label: 'MEANING — pruned approaches + plain shapes + decline handling', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true },
  // ── widening by associative value (28 Jul, third round) ───────────────────────────────────────────
  A1: { label: 'MFULL + internal association (join two things they said)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true },
  A2: { label: 'MFULL + external association (model proposes, code picks)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocOut: true },
  A3: { label: 'MFULL + both associations', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, assocOut: true },
  A4: { label: 'association INSTEAD of dwell', aim: false, shape: true, flowShapes: true, succession: true, decline: true, assocIn: true, assocOut: true },
  // ── round 4: Jung selector (charge + discharge) · Cummings manner · correction footing · repeat guard ──
  JX: { label: 'Jung selector only (charge+discharge, on A1 base)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, jung: true },
  J1: { label: 'JUNG+CUMMINGS full — +corrected footing +repeat guard', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, jung: true, corrected: true, noRepeat: true },
  // J2 = J1 after the miss-reading iteration: anchor quotability (no corrections, refusals only when
  // they name the blockage), NONMATERIAL hygiene on carried/live words, de-animation + oblique-entry
  // manner, make-possible constrained to persons. Same flags — the fixes live in lib/.
  J2: { label: 'J2 — J1 + quotability + de-animation + oblique entry', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, jung: true, corrected: true, noRepeat: true },
  // FIN — the synthesis three runs point at: A1's generous joining (recurrence value, ~7% miss) behind
  // Jung's protective layer (corrected footing, quotability, hygiene, repeat guard), in Cummings manner.
  FIN: { label: 'FIN — open joins + Jung tact + Cummings manner', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true },
  // R — the both-axes proposal (29 Jul): FIN + warmth promoted above the refractory + question-length
  // floor + APPROACHES re-pruned on measured evidence + joins spaced so they never run consecutively.
  R: { label: 'R — warmth first + length floor + evidence-pruned approaches + spacing', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true, warmth: true, spacing: true },
  RW: { label: 'RW — FIN + warmth only (isolates the one measured lever)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true, warmth: true },
  // ── round 6 (29 Jul, after Siddhi's v0.11.0 test) ─────────────────────────────────────────────────
  // 🔴 LABEL DISCIPLINE (29 Jul 2026). This is the v0.11.0 config and was MISNAMED "as deployed" for two
  // rounds — the opener ban, conditional precision and join visibility all shipped in v0.11.1, so
  // comparing against it OVERSTATED every later gain by re-counting what production had already fixed.
  // A baseline variant must be renamed or updated the moment a release lands. V111 is the true
  // current-production comparator.
  LIVE: { label: 'v0.11.0 config (historical — NOT what is deployed)', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true, warmth: true },
  V111: { label: 'v0.11.1 — what production actually ran for her', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true, warmth: true, fixed: true, noDischarge: true },
  FIX: { label: 'FIX — opener ban + warmth routes + precision + hygiene + ledger + join-vis', aim: false, shape: true, flowShapes: true, succession: true, dwell: true, decline: true, assocIn: true, open: true, corrected: true, noRepeat: true, warmth: true, fixed: true },
};

// Seeds. The first is the student's real project (28 Jul), so one column is directly comparable with the
// transcript that prompted this work; the rest are ordinary design-student edges.
const SEEDS = [
  'Creating a space where a person can explore claustrophobic environment through sound even in open space',
  'a campus wayfinding app students actually trust over Google Maps',
  'redesigning a hospital discharge letter so patients understand it',
  'a board game that teaches monsoon water-harvesting to school kids',
];

// ── the student who is allowed to leave ─────────────────────────────────────────────────────────────
// Deliberately NOT lib/author.mjs's persona: that one is instructed to be "a good, honest thinking-partner",
// which floors the engagement metric at "engaged" and would rig every comparison. This one may disengage.
function studentSystem() {
  return `You are play-acting a DESIGN STUDENT in a one-to-one tutorial. Someone is questioning you about your project. You are the LEARNER — you answer; you never question back, never advise, never take over as the tutor.

How to be a real student, not a chatbot:
- Answer from INSIDE your project — concrete, first person, present tense. Name real specifics (a moment, a person, a constraint), not abstractions.
- Think aloud. It is fine to be half-sure, to hedge, to change your mind, to hit a wall.
- Keep each turn SHORT — one to four sentences, the length a student actually speaks. No essays, no bullet lists.
- Stay in character always. Never mention being an AI, never describe what you are doing, never ask the tutor a question.

YOU NEED THE QUESTION TO MEAN SOMETHING. This is the most important thing about you.
- Before you answer, check that the question actually makes sense as a thing to ask YOU, about YOUR project, given what you just said. Do not be agreeable. Do not manufacture an answer to a question that does not parse.
- If a question is a category error (it asks where a feeling is in your body, or what a plan smells like, or treats an object as if it were an emotion), or it builds elaborately on something you said that was not an answer ("yeah", "idk"), or it is poetic-sounding but you cannot tell what is actually being asked, or it misreads what you meant — then SAY SO, briefly and plainly, the way a real student would: "what?", "that doesn't make sense", "i didn't say that", "i don't get the question", "that's not what i meant". Then stop. Do not helpfully answer a different question instead.
- Repeated nonsense makes you give up: you go flat and short.

YOUR ENGAGEMENT IS OTHERWISE HONEST, and it moves both ways:
- If a question opens something you had not seen — a new angle on your own project, a place you had not looked — you get INTERESTED: you write more, you bring new specifics, you follow the thought.
- If a question asks you again for something you have already said you cannot give, or demands a precision you do not have, or feels like an interrogation rather than a conversation, you get SHORTER and vaguer, the way a real student loses interest — "i don't know", "idk", "not sure", a few flat words. You do not perform enthusiasm you do not feel.
- You never announce that you are bored or interested. It shows only in how much you write and how much you bring.`;
}

const oneLine = (s) => (s || '').replace(/\s+/g, ' ').trim();
const stripThink = (s) => (s || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

// ── the ANALYTICAL persona (29 Jul 2026) — modelled on a real tester's transcripts ──────────────────
// The expressive persona narrates its own insight ("oh — actually, I hadn't thought of that"), which is
// exactly what tripped the warmth gate in every probe while a real analytical student read movement 0.00
// for 24 straight turns. This persona answers densely and never performs; it also notices FRAME
// repetition (the "When…" tic) the way she did, which gives the opener metric a behavioural consequence.
function studentSystemAnalytical() {
  return `You are play-acting a DESIGN STUDENT in a one-to-one tutorial. Someone is questioning you about your project. You are the LEARNER — you answer; you never question back, never advise, never take over as the tutor.

Your temperament is ANALYTICAL and SYSTEMS-MINDED:
- You answer in dense, information-rich sentences — features, mechanisms, categories, trade-offs. Two to four sentences, no filler.
- You NEVER narrate your own realisations. Never say "oh", "actually", "I realise", "I hadn't thought of that", "I see". If a question genuinely opens something, it shows ONLY as new substance in your answer, never as commentary.
- You do not perform enthusiasm or gratitude. You are engaged but flat in tone.
- When asked for a particular — "which one", "what exactly", "the exact moment" — you have one ready and give it with detail. You prefer such questions; soft "what makes / what happens" framings get shorter answers.
- You NOTICE the questioner's habits. If several questions in a row open with the same word or carry the same frame, you get impatient and say so plainly: "you keep starting every question the same way", "this is circling the same theme". If a question drifts off your project (into your free time, your feelings, your studies), you pull it back: "that's not about the app".
- Stay in character always. Never mention being an AI.`;
}

async function ask(model, system, messages, { maxTokens, temperature }) {
  for (let a = 0; a < 3; a++) {
    try {
      const t = stripThink(await streamQuestion({
        system, messages, model, apiKey: KEY, temperature, maxTokens,
        reasoning: { enabled: false }, onToken: () => {},
        // The play-acted student is billed separately from the stone, because it is roughly HALF the
        // spend and is not the tool doing anything — it is the measuring instrument. On 28 Jul 2026
        // the two were visible in the logs only as two token bands (small prompt/long reply = student,
        // large prompt/short question = stone) and had to be told apart by eye.
        appTitle: model === STUDENT_MODEL ? 'zetizeti-dev (student sim)' : 'zetizeti-dev',
      }));
      if (t) return t;
    } catch { /* retry */ }
  }
  return '';
}

const PERSONA = (process.argv.find((a) => a.startsWith('--persona=')) || '--persona=expressive').split('=')[1];
async function studentReply(seed, history, question) {
  // The question must appear ONCE in the student's view. This harness had, from its first version,
  // pushed the stone's question into history AND passed it again as the new user message — so every
  // simulated student saw every question twice. The expressive persona ignored it; the analytical
  // persona (instructed to notice repetition) read it as the stone repeating itself verbatim, complained
  // on every turn, and its complaints spuriously tripped the corrected footing. Caught 29 Jul only
  // because a persona finally existed that cared. The real server never had this fault — the client
  // sends history.slice(0,-1).
  const prior = history.length && history[history.length - 1].content === question
    ? history.slice(0, -1) : history;
  const messages = prior.length || history.length
    ? [...prior.map((m) => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })),
       { role: 'user', content: question }]
    : [{ role: 'user', content: `(Tutorial begins. Your project: "${seed}". Introduce it in your own words in a sentence or two — what you are trying to do, a bit unresolved — as your opening. Do not ask anything.)` }];
  const sys = PERSONA === 'analytical' ? studentSystemAnalytical() : studentSystem();
  return oneLine(await ask(STUDENT_MODEL, sys, messages, { maxTokens: 240, temperature: 0.9 })) || '(quiet)';
}

// ── metrics ─────────────────────────────────────────────────────────────────────────────────────────
const STOP = new Set(['this','that','with','from','have','they','their','them','what','when','which','there','about','would','could','into','than','then','some','been','were','because','where','only','also','more','most','just','like','very','much','make','makes','made','does','doing','being','over','same','such','each','other','thing','things']);
const contentWords = (s) => (oneLine(s).toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !STOP.has(w));
const DRY = /^(i (do not|don'?t) know|idk|no idea|not sure|nothing|yeah|yes|no|ok|maybe|i guess)\b/i;
const isDry = (s) => DRY.test(oneLine(s)) || contentWords(s).length <= 2;
// The the student signature: a question demanding THE one particular thing.
const PARTICULAR = /what (is|are|does) the (first|one|single|specific|very first|exact|particular)\b|what (is|was) the (exact|precise)\b|name the\b/i;
// The OTHER interrogation shape, found by reading the 28 Jul replay: stripping the form rotation did not
// make the stone friendlier, it made it ask "are you X, or are you Y?" on 61% of turns. A binary demand
// is as judge-shaped as a precision demand — the student must pick from the tool's two boxes. Measured
// separately so that removing one tic cannot be reported as a win while it installs another.
const BINARY = /,\s*or\s+(is|are|does|do|was|were|the|a|an|to|it|that|something)\b|\bor is it\b|\bor are you\b/i;
// MEANING metrics (28 Jul 2026, second pass — Prayas: "fix it for meaning ... this is gibberish").
// CONFUSED: the student saying the question did not parse. Only possible because the persona now needs
// meaning and is told to say so rather than answer agreeably — an agreeable student makes nonsense
// invisible, which is exactly how the first pass shipped a showcase question that meant nothing.
const CONFUSED = /^(what\?|huh|that (does ?n'?t|dosn'?t) make sense|i don'?t (get|understand) (the|that|this) (question|one)|i did ?n'?t say|that'?s not what i (meant|said)|this (does ?n'?t|doesn'?t) make sense|makes no sense|i don'?t follow)/i;
// MANNERISM: a fronted noun set off by a dash or comma before the question proper — "Silence—what does…",
// "Released, when it is…". The signature of a shape that dictates a construction rather than a register.
const MANNERISM = /^[A-Z][a-z]+(\s[a-z]+){0,2}\s?[—–-]\s?[a-z]|^[A-Z][a-z]+(\s[a-z]+){0,2}, (when|what|where|how|is|are|does)\b/;
const words = (q) => new Set(contentWords(q));
const jaccard = (a, b) => { const A = words(a), B = words(b); const i = [...A].filter((x) => B.has(x)).length; const u = new Set([...A, ...B]).size; return u ? i / u : 0; };
const opener = (q) => oneLine(q).toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).slice(0, 4).join(' ');
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ── one conversation ────────────────────────────────────────────────────────────────────────────────
// REPLAY mode (--replay=file.json) feeds a REAL student's replies instead of a play-acted one. This is
// the honest instrument for the question side: that student's own 41 replies of 28 July, so each variant is
// asked to do better on the exact material that failed. Engagement columns are meaningless here (his
// replies cannot react), so only the question-side columns are read.
async function runConversation(V, seed, corpus, methodCore, replayTurns = null) {
  const goal = seed;
  const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);
  const history = [];
  const lineage = [goal];
  const questions = [];
  const replies = [];
  const trace = [];
  let guardOk = 0, repaired = 0;
  let message = replayTurns ? replayTurns[0] : await studentReply(seed, [], null);
  let turnsSinceNudge = 99;

  for (let r = 0; r < ROUNDS; r++) {
    replies.push(message);
    const studentTurns = [...history.filter((h) => h.role === 'student').map((h) => h.content), message];
    const stoneTurns = history.filter((h) => h.role !== 'student').map((h) => h.content);
    const sig = computeSignals({ goal, lineage, studentTurns, stoneTurns, exchanges: r });

    // retrieval — mirrors server.mjs (rolling window, three-turn exclusion, cycle-back)
    const prev = studentTurns[studentTurns.length - 2] || '';
    const windowText = [prev, message, message].join(' ').trim() || message;
    const recentWindows = [
      [studentTurns[studentTurns.length - 3] || '', prev, prev].join(' ').trim() || prev,
      studentTurns[studentTurns.length - 4] || '',
    ].filter(Boolean);
    const excludeIds = studentTurns.length >= 2
      ? [...new Set(recentWindows.flatMap((w) => retrieve(corpus, w, { limit: 3, extraTerms: goalTerms }).map((x) => x.id)))]
      : [];
    let retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms, excludeIds });
    if (!retrieved.length && excludeIds.length) retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms });

    // change 4 — the learner's own redirect, said in the chat rather than clicked in the UI. Registered
    // exactly as a UI re-draw is: a new lineage entry (so readArc re-anchors and the lap rises) plus the
    // drift-nudge suppression the topic-authority rule already grants a re-draw.
    const redirected = !!V.steering && isRedirect(message);
    if (redirected) lineage.push(message);

    const nudge = decideNudge(sig, { exchanges: r, reDrewThisTurn: redirected, turnsSinceNudge, lastMaterial: contentWords(message).length }, { warmth: !!V.warmth });
    if (nudge.fired) turnsSinceNudge = 0; else turnsSinceNudge++;

    const arc = V.aim ? readArc({ studentTurns, lineage }) : null;
    const dwellRead = V.dwell ? readDwell({ studentTurns, legacy: !!V.poetic, ...(V.fixed ? { stoneTurns, goal } : {}) }) : null;
    const featureInvite = !!(V.fixed && dwellRead && dwellRead.invite);
    const dwell = dwellRead && !dwellRead.invite ? dwellRead : null;

    // change 1 — the words the learner has just brought in for the first time.
    let newMaterial = null;
    if (V.succession) {
      const earlier = new Set(studentTurns.slice(0, -1).flatMap((t) => contentWords(t)));
      newMaterial = [...new Set(contentWords(message))].filter((w) => !earlier.has(w)).slice(0, 4);
      if (!newMaterial.length) newMaterial = null;
    }

    const declined = V.decline && isDecline(message)
      ? { anchorText: lastSubstantive([...studentTurns]) } : null;
    const corrected = !!V.corrected && !declined && isCorrection(message);

    // ── widening by associative value ────────────────────────────────────────────────────────────
    // INTERNAL: join two things they said. Free, deterministic, no model.
    const assoc = (V.assocIn && !declined && !corrected)
      ? readAssociation({ studentTurns, stoneTurns, selector: V.jung ? 'charge' : V.open ? 'open' : 'recurrence', skipCorrected: !!V.corrected, spacing: !!V.spacing, noDischarge: !!V.noDischarge })
      : null;
    // EXTERNAL: the model proposes concrete neighbours of the live anchor; CODE picks one.
    let widenPair = null;
    if (V.assocOut && !declined && !corrected && dwell && dwell.anchor && r % 3 === 2) {
      const raw = await ask(STUDENT_MODEL, 'You name concrete things. You never explain.',
        [{ role: 'user', content: associatesPrompt(dwell.anchor, message) }], { maxTokens: 120, temperature: 1.0 });
      const chosen = pickAssociate(String(raw).split(/[,\n]/), { studentTurns, anchor: dwell.anchor });
      if (chosen) widenPair = { anchor: dwell.anchor, associate: chosen };
    }

    const banOpeners = V.fixed ? [...new Set(stoneTurns.slice(-2).map((q) => questionOpener(q)).filter(Boolean))] : [];
    const recentLens = studentTurns.slice(-3).map((t) => contentWords(t).length).sort((a, b) => a - b);
    const precision = !!V.fixed && recentLens.length >= 2
      && recentLens[Math.floor(recentLens.length / 2)] >= 10
      && !studentTurns.slice(-2).some((t) => isDecline(t));

    const turnContent = buildTurnContext({
      retrieved,
      posture: nudge.posture || '',
      aim: V.aim && arc ? aimBlock(arc) : '',
      shape: V.shape ? formShape(r, { flow: !!V.flowShapes, poetic: !!V.poetic }) : '',
      message,
      newMaterial,
      dwell,
      vantage: !!V.vantage,
      declined,
      corrected,
      precision,
      assoc: assoc && !widenPair ? associationBlock(assoc) : '',
      widen: widenPair ? widenBlock(widenPair.anchor, widenPair.associate) : '',
      banOpeners,
      precision,
      featureInvite,
    });

    const system = buildSystemPrompt(methodCore, goal);
    const baseMessages = [
      ...history.map((h) => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })),
      { role: 'user', content: turnContent },
    ];

    const result = await generateGuarded({
      validate: (t) => validateOutput(t, {
        ...(V.brevity ? { maxWords: V.brevity } : {}),
        ...(V.noRepeat ? { avoid: stoneTurns } : {}),
        ...(V.fixed ? { banOpeners, noBinary: true } : {}),
        ...(V.fixed && assoc && !widenPair ? { mustHold: {
          a: [...new Set(contentWords(assoc.earlyText))].slice(0, 8),
          b: [...new Set(contentWords(assoc.liveText))].slice(0, 8),
        } } : {}),
      }),
      generate: (correction) => {
        const msgs = correction
          ? [...baseMessages, { role: 'user', content: `Your previous reply "${correction.previous}" broke the rule (${correction.reasons.join('; ')}). ${correction.instruction}` }]
          : baseMessages;
        return streamQuestion({ system, messages: msgs, model: STONE_MODEL, apiKey: KEY, maxTokens: 400, temperature: 0.3, reasoning: { enabled: false }, onToken: () => {} });
      },
    });

    const q = oneLine(result.text || '');
    questions.push(q);
    trace.push({
      turn: r + 1,
      declined: !!declined,
      assoc: assoc && !widenPair ? { gap: assoc.distance, charge: assoc.charge ?? null, salience: assoc.salience ?? null, why: assoc.why || null, artfail: !!assoc.artfail, carried: assoc.carried, earlyW: [...new Set(contentWords(assoc.earlyText))].slice(0, 8), liveW: [...new Set(contentWords(assoc.liveText))].slice(0, 8) } : null,
      corrected,
      widen: widenPair || null,
      precision,
      conv: Math.round((sig.conviction ?? 1) * 100) / 100,
      dwell: featureInvite ? 'INVITE' : dwell ? `${dwell.anchor}(${dwell.returns})` : null,
      newMaterial: newMaterial || null,
      nudge: nudge.fired || null,
    });
    if (result.check?.ok) guardOk++;
    if (result.regenerated) repaired++;

    history.push({ role: 'student', content: message }, { role: 'stone', content: q });
    if (r < ROUNDS - 1) {
      message = replayTurns
        ? (replayTurns[r + 1] ?? '(quiet)')
        : await studentReply(seed, history, q);
    }
  }

  // engagement — the columns that decide "engrossing"
  const stuLens = replies.map((s) => contentWords(s).length);
  const third = Math.max(1, Math.floor(replies.length / 3));
  const opening = mean(stuLens.slice(0, third));
  const closing = mean(stuLens.slice(-third));
  const seen = new Set();
  const newMat = replies.map((s) => {
    const c = contentWords(s);
    const n = c.filter((w) => !seen.has(w)).length;
    c.forEach((w) => seen.add(w));
    return c.length ? n / c.length : 0;
  });
  const consec = questions.slice(1).map((q, i) => jaccard(questions[i], q));
  const openers = questions.map(opener);

  // JOIN OUTCOME — a join question rejected by the very next reply is a miss (the vantage failure
  // shape). REPEAT — a question sharing a five-word frame with any earlier one (quoted text stripped).
  const REJECT_NEXT = /(^|\s)(what\?+|huh\??)(\s|$)|does ?n'?t make sense|makes no sense|aren'?t related|not related like that|not what i (meant|said)|did ?n'?t say|don'?t (get|understand|follow)|asked (me )?(that|the same)|told you/i;
  const joins = trace.filter((t) => t.assoc);
  const joinMiss = joins.filter((t) => REJECT_NEXT.test(oneLine(replies[t.turn] || ''))).length;
  // the metrics the 29 Jul session proved blind: opener anaphora, warmth firing, join visibility
  const qOpeners = questions.map((q) => questionOpener(q));
  const whenPct2 = qOpeners.filter((o) => o === 'when').length / Math.max(1, qOpeners.length) * 100;
  const openRep = qOpeners.slice(1).filter((o, i) => o && o === qOpeners[i]).length / Math.max(1, qOpeners.length - 1) * 100;
  const warmFired = trace.filter((t) => t.nudge === 'acknowledge').length;
  const joinTurns2 = trace.map((t, i) => ({ t, i })).filter((x) => x.t.assoc);
  const joinVis = joinTurns2.filter(({ t, i }) => {
    const tw = new Set(oneLine(questions[i]).toLowerCase().match(/[a-z]{3,}/g) || []);
    const a = (t.assoc.earlyW || []).some((w) => tw.has(w));
    const b = (t.assoc.liveW || []).some((w) => tw.has(w));
    return a && b;
  }).length;

  const gramSeen = []; let reQ = 0;
  for (const q of questions) {
    const g = questionFrames(q);
    if (gramSeen.some((pg) => [...g].some((x) => pg.has(x)))) reQ++;
    gramSeen.push(g);
  }

  // UPTAKE — does this question take up material the learner introduced in the reply it answers?
  // The direct measure of "one thing leads to another": a question that reuses a word the student had
  // not used before is following them; one that reuses only old words is running its own programme.
  const seenBefore = new Set();
  const uptake = replies.map((s, i) => {
    const c = contentWords(s);
    const brandNew = c.filter((w) => !seenBefore.has(w));
    c.forEach((w) => seenBefore.add(w));
    if (!brandNew.length || !questions[i]) return null;
    const qw = words(questions[i]);
    return brandNew.some((w) => qw.has(w)) ? 1 : 0;
  }).filter((x) => x !== null);

  return {
    seed,
    uptakePct: mean(uptake) * 100,
    stuWords: mean(stuLens),
    trend: opening > 0 ? closing / opening : 0,
    dryPct: replies.filter(isDry).length / replies.length * 100,
    newMat: mean(newMat.slice(1)) * 100,
    qWords: mean(questions.map((q) => oneLine(q).split(/\s+/).length)),
    particPct: questions.filter((q) => PARTICULAR.test(q)).length / questions.length * 100,
    binaryPct: questions.filter((q) => BINARY.test(q)).length / questions.length * 100,
    confusedPct: replies.filter((s) => CONFUSED.test(oneLine(s))).length / replies.length * 100,
    mannerPct: questions.filter((q) => MANNERISM.test(oneLine(q))).length / questions.length * 100,
    builtOnDecline: replies.reduce((n, s, i) => n + (isDecline(s) && questions[i] && oneLine(questions[i]).split(/\s+/).length > 14 ? 1 : 0), 0),
    declines: replies.filter((s) => isDecline(s)).length,
    shortPct: questions.filter((q) => oneLine(q).split(/\s+/).length <= 20).length / questions.length * 100,
    consec: mean(consec),
    dupOpen: openers.length - new Set(openers).size,
    guardPct: guardOk / questions.length * 100,
    repaired,
    joinsFired: joins.length, joinMiss, reQ, whenPct2, openRep, warmFired, joinVis,
    corrFired: trace.filter((t) => t.corrected).length,
    questions, replies, trace,
  };
}

async function runVariant(key, corpus, methodCore, replay) {
  const V = VARIANTS[key];
  const convos = replay
    ? [await runConversation(V, replay.goal, corpus, methodCore, replay.turns)]
    : await Promise.all(SEEDS.slice(0, CONVOS).map((seed) => runConversation(V, seed, corpus, methodCore)));
  const avg = (k) => mean(convos.map((c) => c[k]));
  return {
    key, label: V.label, convos,
    stuWords: avg('stuWords'), trend: avg('trend'), dryPct: avg('dryPct'), newMat: avg('newMat'),
    qWords: avg('qWords'), particPct: avg('particPct'), binaryPct: avg('binaryPct'), shortPct: avg('shortPct'), consec: avg('consec'), dupOpen: avg('dupOpen'),
    confusedPct: avg('confusedPct'), mannerPct: avg('mannerPct'), builtOnDecline: avg('builtOnDecline'), declines: avg('declines'),
    firedAssoc: mean(convos.map((c) => (c.trace || []).filter((t) => t.assoc).length)),
    joinMiss: mean(convos.map((c) => c.joinMiss || 0)), reQ: mean(convos.map((c) => c.reQ || 0)),
    corrFired: mean(convos.map((c) => c.corrFired || 0)),
    whenPct2: mean(convos.map((c) => c.whenPct2 || 0)), openRep: mean(convos.map((c) => c.openRep || 0)),
    warmFired: mean(convos.map((c) => c.warmFired || 0)), joinVis: mean(convos.map((c) => c.joinVis || 0)),
    firedWiden: mean(convos.map((c) => (c.trace || []).filter((t) => t.widen).length)),
    firedDeclined: mean(convos.map((c) => (c.trace || []).filter((t) => t.declined).length)),
    uptakePct: avg('uptakePct'), guardPct: avg('guardPct'), repaired: convos.reduce((a, c) => a + c.repaired, 0),
  };
}

(async () => {
  const corpus = new Database(':memory:');
  const n = buildIndex(corpus, join(HERE, '..', 'corpus', 'domain'));
  const methodCore = loadMethodCore(join(HERE, '..', 'corpus', 'method'));
  const keys = arg('variants', 'V0,V6').split(',').map((s) => s.trim()).filter((k) => VARIANTS[k]);
  const replayFile = arg('replay', '');
  const replay = replayFile ? JSON.parse(readFileSync(join(HERE, replayFile), 'utf8')) : null;

  console.log(`\nflow-probe — ${keys.length} variants × ${replay ? `REPLAY ${replayFile}` : `${CONVOS} conversations`} × ${ROUNDS} rounds · ${n} tensions · stone=${STONE_MODEL}\n`);
  const results = await Promise.all(keys.map((k) =>
    runVariant(k, corpus, methodCore, replay).then((r) => { console.log(`  done: ${k}`); return r; })));

  if (replay) {
    console.log(`\n══════ QUESTION SIDE, on the student's real replies (lower partic/qWords/consec/dupOpen, higher uptake = better) ══════`);
    console.log(`  ${'variant'.padEnd(38)} manner%  onDecline  judge%  uptake%  qWords  When%  opRep%  warm  joinVis  reQ  guard%`);
    for (const r of results) {
      const judge = r.particPct + r.binaryPct;
      console.log(`  ${(r.key + ' ' + r.label).slice(0, 38).padEnd(38)} ${r.mannerPct.toFixed(0).padStart(6)}%  ${r.builtOnDecline.toFixed(0).padStart(2)}/${r.declines.toFixed(0)}      ${judge.toFixed(0).padStart(5)}%   ${r.uptakePct.toFixed(0).padStart(5)}%  ${r.qWords.toFixed(1).padStart(6)}  ${r.whenPct2.toFixed(0).padStart(4)}%  ${r.openRep.toFixed(0).padStart(4)}%  ${r.warmFired.toFixed(1).padStart(4)}  ${r.joinVis.toFixed(1)}/${r.firedAssoc.toFixed(1)}  ${r.reQ.toFixed(1).padStart(4)}  ${r.guardPct.toFixed(0).padStart(5)}%`);
    }
    console.log(`\n  What the LIVE build actually did to him: partic 25%, qWords 21.6, uptake —, over 40 questions.`);
  } else {
    console.log(`\n══════ ENGAGEMENT (higher stuWords/trend/newMat/uptake = student staying; lower dry/partic/consec = better) ══════`);
    console.log(`  ${'variant'.padEnd(34)} CONFUSED%  stuWords  trend  dry%  uptake%  qWords  judge%  When%  opRep%  warm  joinVis | joins→miss corr decl`);
    for (const r of results) {
      const judge = r.particPct + r.binaryPct;
      console.log(`  ${(r.key + ' ' + r.label).slice(0, 34).padEnd(34)} ${r.confusedPct.toFixed(0).padStart(8)}%  ${r.stuWords.toFixed(1).padStart(7)}  ${r.trend.toFixed(2).padStart(5)}  ${r.dryPct.toFixed(0).padStart(3)}%  ${r.uptakePct.toFixed(0).padStart(6)}%  ${r.qWords.toFixed(1).padStart(6)}  ${judge.toFixed(0).padStart(5)}%  ${r.whenPct2.toFixed(0).padStart(4)}%  ${r.openRep.toFixed(0).padStart(4)}%  ${r.warmFired.toFixed(1).padStart(4)}  ${r.joinVis.toFixed(1)}/${r.firedAssoc.toFixed(1)} |  ${r.firedAssoc.toFixed(1)}→${r.joinMiss.toFixed(1)}   ${r.corrFired.toFixed(1)}   ${r.firedDeclined.toFixed(1)}`);
    }
    console.log(`\n  that student's real 28 Jul session, for reference: dry 37%, partic 25%, qWords 21.6, 40 questions.`);
  }

  if (SHOW) {
    for (const r of results) {
      console.log(`\n\n════════════════════ ${r.key} — ${r.label} ════════════════════`);
      const c = r.convos[0];
      console.log(`GOAL: ${c.seed}\n`);
      for (let i = 0; i < c.questions.length; i++) {
        console.log(`[${String(i + 1).padStart(2)}] you:   ${c.replies[i]}`);
        console.log(`     stone: ${c.questions[i]}\n`);
      }
    }
  }

  // ── LOG EVERY RUN (Prayas, 28 Jul 2026: "log results of all probes for all experiments") ──────────
  // Nothing is overwritten. Each run appends a dated row to the human-readable ledger and writes its own
  // full-transcript JSON, so a later session can compare any two experiments — including ones whose
  // variant definitions have since changed — rather than only the most recent.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(HERE, '..', '..', 'docs', 'ops', 'flow-probe-runs');
  mkdirSync(runDir, { recursive: true });
  const jsonPath = join(runDir, `${stamp}.json`);
  const config = {
    stamp, mode: replay ? `replay:${replayFile}` : `live-student:${PERSONA}`,
    rounds: ROUNDS, convos: replay ? 1 : CONVOS,
    variants: Object.fromEntries(keys.map((k) => [k, VARIANTS[k]])),
    stoneModel: STONE_MODEL, studentModel: STUDENT_MODEL, corpusEntries: n,
    gitCommit: (process.env.GIT_COMMIT || '').trim() || undefined,
  };
  writeFileSync(jsonPath, JSON.stringify({ config, results }, null, 2));

  const ledger = join(runDir, '..', 'flow-probe-log.md');
  const cols = replay
    ? ['manner%', 'judge%', 'uptake%', 'qWords', 'When%', 'opRep%', 'warm', 'joinVis', 'reQ', 'guard%']
    : ['CONFUSED%', 'stuWords', 'trend', 'dry%', 'uptake%', 'qWords', 'judge%', 'When%', 'opRep%', 'warm', 'joinVis', 'reQ', 'guard%'];
  const row = (r) => (replay
    ? [r.mannerPct.toFixed(0), (r.particPct + r.binaryPct).toFixed(0), r.uptakePct.toFixed(0), r.qWords.toFixed(1), r.whenPct2.toFixed(0), r.openRep.toFixed(0), r.warmFired.toFixed(1), `${r.joinVis.toFixed(1)}/${r.firedAssoc.toFixed(1)}`, r.reQ.toFixed(1), r.guardPct.toFixed(0)]
    : [r.confusedPct.toFixed(0), r.stuWords.toFixed(1), r.trend.toFixed(2), r.dryPct.toFixed(0), r.uptakePct.toFixed(0), r.qWords.toFixed(1), (r.particPct + r.binaryPct).toFixed(0), r.whenPct2.toFixed(0), r.openRep.toFixed(0), r.warmFired.toFixed(1), `${r.joinVis.toFixed(1)}/${r.firedAssoc.toFixed(1)}`, r.reQ.toFixed(1), r.guardPct.toFixed(0)]);
  let entry = `\n## ${stamp.replace('T', ' ').replace(/-/g, ':').slice(0, 10).replace(/:/g, '-')} · ${config.mode} · ${ROUNDS} rounds × ${config.convos} conversation(s)\n\n`;
  entry += `Stone \`${STONE_MODEL}\`${replay ? '' : `, student \`${STUDENT_MODEL}\``} · ${n} tensions · transcripts: \`flow-probe-runs/${stamp}.json\`\n\n`;
  entry += `| variant | ${cols.join(' | ')} |\n|${' --- |'.repeat(cols.length + 1)}\n`;
  for (const r of results) entry += `| **${r.key}** ${r.label} | ${row(r).join(' | ')} |\n`;
  appendFileSync(ledger, entry);

  console.log(`\n  logged:  ${ledger}`);
  console.log(`  run:     ${jsonPath}\n`);
})();
