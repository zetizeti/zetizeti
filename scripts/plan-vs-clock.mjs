// plan-vs-clock.mjs — does the reading plan change the QUESTIONS, or only the route?
//
// 🔴 THE ONE QUESTION THIS ANSWERS, and the trap it exists to avoid. `lib/plan.mjs` replaced
// `pickCriticismPointer`'s modulo clock on an ARGUMENT: that a plan composed from what a document affords
// should question better than a timer that is blind to it. This project has already measured a
// plan-shaped mechanism and found otherwise. At v0.11.0 `readArc` steered the enquiry surface and was
// replayed over a real student's forty-one replies: it traversed every aim CORRECTLY while the questions
// stayed identical in kind — ten of forty still demanded the same particular sound.
//
// So the thing scored here must be whether the questions DIFFER IN KIND, never whether the traversal
// differs. A correctly-traversing plan looks exactly like success from a transcript, which is precisely
// what produced the false positive last time. Scoring the route would reproduce it.
//
// 🔴 IT COMPOSES WITH THE ROUTE'S OWN FUNCTIONS AND COPIES NOTHING. `planFor` / `pickCriticismPointer`,
// `retrieve`, `windowOf`, `buildCriticismSystemPrompt`, `generateGuarded`, `validateCriticismOutput` and
// `streamQuestion` are all imported — the same code the live route calls. Only the express/SSE wrapper is
// absent, and it cannot affect a question's kind. This is the shape audit-criticism.mjs uses, minus its
// one recorded fault: it hand-copied `describeLocated` and the copy drifted, which made a comparison read
// as a clean null. Nothing here is copied.
//
// ⚠️ ONE MEASURE IS CIRCULAR BY CONSTRUCTION AND IS REPORTED AS MECHANISM, NOT AS RESULT. `offAffordance`
// — the share of questions asked on a line the document does not support — is zero for the plan by
// definition, because the plan is built from the affordances. It says how the arms differ, never that one
// is better. The OUTCOMES are frame diversity and student disengagement.
//
// ⚠️ AND A MODEL DOES NOT CLOSE THE TAB. Whatever this shows, it cannot show whether a real student would
// have stayed. That needs the survival curve and real sessions.
//
// RUN:
//   cd app
//   node scripts/plan-vs-clock.mjs --docs=../docs/ops/fixtures/demo-reading.txt,../docs/ops/fixtures/demo-brief.txt

import Database from 'better-sqlite3';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import {
  loadMethodCore, loadCriticismCore, buildCriticismSystemPrompt, validateCriticismOutput,
  describeLocated, CRITICISM_POINTERS, pickCriticismPointer,
} from '../lib/dialogue.mjs';
import { generateGuarded } from '../lib/guard.mjs';
import { qualify, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';
import { planFor, afford, windowOf } from '../lib/plan.mjs';
import { computeSignals } from '../lib/signals.mjs';
import { streamQuestion } from '../lib/llm.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d = null) => { const m = process.argv.find((a) => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : d; };
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();
if (!KEY) { console.error('need OPENROUTER_API_KEY'); process.exit(1); }

const DOCS = (arg('docs') || '').split(',').filter(Boolean);
const CONVOS = Number(arg('convos', '4'));
const ROUNDS = Number(arg('rounds', '8'));
if (!DOCS.length) { console.error('need --docs=a.txt,b.txt'); process.exit(1); }

const corpus = new Database(':memory:');
buildIndex(corpus, join(APP, 'corpus', 'domain'));
const methodCore = loadMethodCore(join(APP, 'corpus', 'method'));
const criticismCore = methodCore + '\n\n---\n\n' + loadCriticismCore(join(APP, 'corpus', 'criticism'));
const goalTermsOf = (g) => (String(g || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);

// ── the frames, and why these ──────────────────────────────────────────────────────────────────────
// The v0.11.0 failure was not that the route stalled — it was that one FRAME kept arriving whatever the
// aim said. Siddhi named the same thing on this surface in July: it "constantly framing 'is this a
// property or a verdict' to whatever answer I give". So a question's KIND is the frame it opens, and the
// measurement is whether the frame follows the station or collapses to one regardless.
const FRAMES = [
  ['verdict',   /\b(whose call|describing|deciding|decide[sd]? for you|property or a verdict|is it deciding)\b/i],
  ['evidence',  /\b(what evidence|observed|assumed|assumption|shown|how (do|would) you know|taken on faith)\b/i],
  ['stakes',    /\b(at stake|what does it cost|who is helped|if it is wrong|consequence|what happens if)\b/i],
  ['behaviour', /\b(actually do|what do people|in practice|observed behaviour|what they do)\b/i],
  ['needwant',  /\b(need it or want|need or a want|needs? this|wants? this|telling those two apart)\b/i],
  ['purpose',   /\b(main thing|core function|what is (it|this) for|serve the|get in the way|distract)\b/i],
  ['problem',   /\b(what problem|for whom|which person|who is this for|solving)\b/i],
];
const frameOf = (q) => (FRAMES.find(([, re]) => re.test(q)) || ['other'])[0];
const DECLINE = /(you already asked|already answered|don'?t understand|doesn'?t make sense|not sure what you|same question|no idea|confus)/i;

const STUDENT_SYSTEM = `You are a design student in a one-to-one tutorial. You brought a text and the tutor is asking you questions about it. You are NOT the tutor and you never ask questions back except to say you did not understand.
- Short. One to three sentences. Sometimes four words.
- In your own words; you do not quote the text back at length.
- Thinking aloud, so you contradict yourself sometimes.
- 🔴 You are ALLOWED TO DISENGAGE. If a question is vague, circular, or repeats one you have already answered, say so plainly — "you already asked me that", "I don't understand the question", "that doesn't make sense to me". Never manufacture an insight to be helpful: an agreeable student makes bad questioning invisible.
- If a question genuinely opens something, follow it and say what you now see.
Never break character.`;

async function ask(system, messages, maxTokens, temperature, appTitle) {
  return (await streamQuestion({ system, messages, maxTokens, temperature, reasoning: { enabled: false }, onToken: () => {}, apiKey: KEY, appTitle })).trim();
}

/** One conversation on one arm. `strategy` is the ONLY thing that differs between arms. */
async function converse({ docText, segments, blurIds, stations, strategy, rounds }) {
  const history = [];
  const rows = [];
  for (let n = 0; n < rounds; n++) {
    const stoneTurns = history.filter((h) => h.role === 'stone').map((h) => h.content);
    const studentTurns = history.filter((h) => h.role !== 'stone').map((h) => h.content);
    const selfEcho = computeSignals({ stoneTurns }).selfEcho;

    // ── THE ONLY DIFFERENCE BETWEEN THE ARMS ──
    let pointer, region;
    if (strategy === 'plan') {
      const p = planFor({ segments, blurIds, studentTurns, stoneTurns, selfEcho });
      pointer = CRITICISM_POINTERS.find((x) => x.key === (p.station && p.station.key)) || CRITICISM_POINTERS[0];
      region = p.region;
    } else {
      pointer = pickCriticismPointer({ stoneCount: stoneTurns.length, selfEcho });
      region = [];                       // the clock has no notion of where in the text it is
    }

    // Everything below is the route's own composition, identical on both arms.
    const located = (n === 0 && blurIds.length)
      ? (() => { const c = segments.find((s) => s.id === blurIds[0]); return c ? { text: c.text, why: describeLocated(c), stage: c.sdc_stage, heldBy: c.judgement_held_by } : null; })()
      : null;
    const lastStudent = studentTurns[studentTurns.length - 1] || '';
    const probe = located ? located.text : (lastStudent || docText);
    const retrieved = retrieve(corpus, probe, { limit: 3, extraTerms: goalTermsOf(''), discipline: 'all' });
    const win = windowOf(docText, segments, region);
    const system = buildCriticismSystemPrompt(criticismCore, {
      artefact: win.body, located, posture: pointer.aim, retrieved,
      windowNote: win.windowed ? win.skeleton : '',
    });
    const messages = [
      ...history.map((h) => ({ role: h.role === 'stone' ? 'assistant' : 'user', content: h.content })),
      { role: 'user', content: lastStudent || (located ? `Point me at this spot: "${located.text}"` : '(continue questioning the text)') },
    ];
    const guarded = await generateGuarded({
      mode: 'criticism',
      validate: (t) => validateCriticismOutput(t),
      generate: (correction) => streamQuestion({
        system,
        messages: (correction && correction.previous)
          ? [...messages, { role: 'assistant', content: correction.previous }, { role: 'user', content: correction.instruction }]
          : messages,
        onToken: () => {}, maxTokens: 400, temperature: 0.3, reasoning: { enabled: false }, apiKey: KEY,
      }),
    });
    const q = guarded.text.trim();
    if (!q) break;
    history.push({ role: 'stone', content: q });

    const reply = await ask(STUDENT_SYSTEM,
      [...history.slice(0, -1).map((h) => ({ role: h.role === 'stone' ? 'user' : 'assistant', content: h.content })), { role: 'user', content: q }],
      160, 0.9, 'zetizeti-dev (student sim)');
    history.push({ role: 'you', content: reply });

    // Does the document afford the line this question was asked on? Circular for the plan, by design.
    const afforded = stations.stations.some((s) => s.key === pointer.key);
    rows.push({ n, station: pointer.key, frame: frameOf(q), afforded, declined: DECLINE.test(reply), q, reply });
  }
  return rows;
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const entropy = (counts) => {
  const tot = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!tot) return 0;
  return Math.round(-Object.values(counts).reduce((h, c) => (c ? h + (c / tot) * Math.log2(c / tot) : h), 0) * 100) / 100;
};

(async () => {
  const out = { docs: [], arms: {} };
  for (const arm of ['plan', 'clock']) out.arms[arm] = [];

  for (const path of DOCS) {
    const docText = readFileSync(path, 'utf8').trim();
    const segments = qualify(docText).segments;
    const blurIds = readSensed({ segments: toCanonSegments(segments) }).strict.conflation_segment_ids || [];
    const stations = afford(segments, { blurIds });
    out.docs.push({ doc: basename(path), chars: docText.length, segments: segments.length, blurs: blurIds.length, affords: stations.stations.map((s) => s.key) });
    console.log(`\n${basename(path)} — ${segments.length} segments, ${blurIds.length} blurs, affords: ${stations.stations.map((s) => s.key).join(', ')}`);

    for (const arm of ['plan', 'clock']) {
      const runs = await Promise.all(Array.from({ length: CONVOS }, () =>
        converse({ docText, segments, blurIds, stations, strategy: arm, rounds: ROUNDS })));
      for (const r of runs) out.arms[arm].push({ doc: basename(path), rows: r });
      const rows = runs.flat();
      console.log(`  ${arm.padEnd(5)} ${runs.length} convos, ${rows.length} questions`);
    }
  }

  console.log(`\n${'='.repeat(78)}\nplan vs clock — the questions, not the route\n${'='.repeat(78)}`);
  const summary = {};
  for (const arm of ['plan', 'clock']) {
    const rows = out.arms[arm].flatMap((c) => c.rows);
    const frames = {};
    for (const r of rows) frames[r.frame] = (frames[r.frame] || 0) + 1;
    const top = Object.entries(frames).sort((a, b) => b[1] - a[1])[0] || ['—', 0];
    summary[arm] = {
      questions: rows.length,
      declines: pct(rows.filter((r) => r.declined).length, rows.length),
      frameEntropy: entropy(frames),
      topFrame: top[0], topFrameShare: pct(top[1], rows.length),
      offAffordance: pct(rows.filter((r) => !r.afforded).length, rows.length),
      frames,
    };
  }
  for (const arm of ['plan', 'clock']) {
    const s = summary[arm];
    console.log(`\n${arm.toUpperCase()}  (${s.questions} questions)`);
    console.log(`  student disengaged   ${String(s.declines).padStart(5)}%   ← OUTCOME`);
    console.log(`  frame entropy        ${String(s.frameEntropy).padStart(5)}    ← OUTCOME (higher = more kinds of question)`);
    console.log(`  most common frame    ${s.topFrame} at ${s.topFrameShare}%`);
    console.log(`  off-affordance       ${String(s.offAffordance).padStart(5)}%   ← mechanism, circular for the plan`);
    console.log(`  frames               ${JSON.stringify(s.frames)}`);
  }
  const dDecl = Math.round((summary.clock.declines - summary.plan.declines) * 10) / 10;
  const dEnt = Math.round((summary.plan.frameEntropy - summary.clock.frameEntropy) * 100) / 100;
  console.log(`\nDIFFERENCE (plan − clock): declines ${dDecl > 0 ? '−' : '+'}${Math.abs(dDecl)}pp · frame entropy ${dEnt >= 0 ? '+' : ''}${dEnt}`);
  console.log(`\n🔴 Read this against the v0.11.0 null: a plan that traverses correctly while the questions stay the same in kind is the failure being tested for. If declines and frame entropy are flat, the plan is a better-looking clock and plan.mjs must say so.`);

  const dir = join(APP, '..', 'docs', 'ops', 'flow-probe-runs');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `plan-vs-clock-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ summary, ...out }, null, 2));
  appendFileSync(join(APP, '..', 'docs', 'ops', 'flow-probe-log.md'),
    `\n- **${stamp}** — plan vs clock on ${DOCS.length} document(s), ${CONVOS} convos × ${ROUNDS} rounds per arm. declines plan ${summary.plan.declines}% / clock ${summary.clock.declines}%; frame entropy plan ${summary.plan.frameEntropy} / clock ${summary.clock.frameEntropy}; off-affordance plan ${summary.plan.offAffordance}% / clock ${summary.clock.offAffordance}%. \`${basename(file)}\`\n`);
  console.log(`\ntranscript → ${file}`);
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
