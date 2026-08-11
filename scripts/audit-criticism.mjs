// audit-criticism.mjs — end-to-end audit of the criticism (critique) surface.
//
// WHY THIS EXISTS. The criticism flow's *locating* path is deterministic and unit-tested, but the
// LLM *question-phrasing* step (askCriticismQuestion → streamQuestion) has only ever been
// smoke-tested, and verifying it through the UI needs a browser through Google OAuth (HANDOFF.md,
// open step #2). This script removes that blocker: it imports the SAME modules the live route calls
// and runs the SAME chain — qualify → readSensed → (identical `located` selection) → retrieve →
// buildCriticismSystemPrompt → streamQuestion → validateCriticismOutput — skipping ONLY auth, the
// SSE wrapper, and DB persistence, none of which touch whether the composed question is clean.
//
// So a green run here is real evidence the deployed phrasing behaves: it points at the located spot
// and asks, it never delivers a verdict (the verdict-drift guard passes every turn). It also prints
// the inspectable `why` trail — the audit artefact you'd hand an examiner.
//
// RUN (local, with your own OpenRouter key — never printed, never stored; invariant #8):
//   cd app
//   OPENROUTER_API_KEY=sk-or-... node scripts/audit-criticism.mjs
//   OPENROUTER_API_KEY=sk-or-... node scripts/audit-criticism.mjs "paste any text to question here"
//
// RUN (on the blevn server, against the real env/pool key):
//   OPENROUTER_API_KEY="$OPENROUTER_API_KEY" node scripts/audit-criticism.mjs
//
// WITHOUT a key: the deterministic half still runs (qualify + locate + retrieve + the `why` trail);
// the LLM phrasing + guard are skipped with a notice — useful for inspecting the locator alone.
//
// This file is in scripts/ — excluded by make-caprover-tar.sh, so it ships to no deployment.

import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildIndex, retrieve } from '../lib/retrieval.mjs';
import { loadMethodCore, loadCriticismCore, buildCriticismSystemPrompt, validateCriticismOutput } from '../lib/dialogue.mjs';
import { qualify, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';
import { streamQuestion } from '../lib/llm.mjs';


// Dev traffic identifies itself to OpenRouter (11 Aug 2026). Without this every probe call
// filed under 'zetizeti' and was indistinguishable from a cohort in the spend logs.
// `||=` so an explicit ZETIZETI_APP_TITLE in the environment still wins.
process.env.ZETIZETI_APP_TITLE ||= 'zetizeti-dev';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));   // …/app
const KEY = (process.env.OPENROUTER_API_KEY || '').trim();     // BYOK/pool key — used, never printed
const MODEL = process.env.ZETIZETI_MODEL || 'anthropic/claude-haiku-4.5 (default)';

// ── corpus + cores, built exactly as server.mjs does at boot ──────────────────────────────────
const corpus = new Database(':memory:');
const nEntries = buildIndex(corpus, join(APP, 'corpus', 'domain'));
const methodCore = loadMethodCore(join(APP, 'corpus', 'method'));
const criticismCore = methodCore + '\n\n---\n\n' + loadCriticismCore(join(APP, 'corpus', 'criticism'));

// ── helpers copied VERBATIM from server.mjs so this mirrors the route, not an approximation ─────
const describeLocated = (seg) => {
  const s = seg.sdc_stage, h = seg.judgement_held_by;
  if (s === 'judgement' && (h === 'text' || h === 'shared')) return 'a consequential call the text appears to make for the reader';
  if (s === 'narration' && h === 'text') return 'a call relayed as if it were already settled';
  if (s === 'mixed') return 'describing and deciding in the same breath';
  return 'a place where describing and deciding may blur';
};
const goalTermsOf = (g) => (String(g || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);

// ── the sample battery — each stresses a different SDC stage; design-discipline relevant ────────
// Override the whole battery by passing one text as argv: node scripts/audit-criticism.mjs "…"
const BATTERY = [
  { label: 'attributive evaluative → mixed', discipline: 'all', goal: '',
    text: 'The redesigned dashboard has a clean, intuitive interface that users love.' },
  { label: 'directive + imperative → judgement', discipline: 'all', goal: 'increase signups',
    text: 'To improve conversion you should remove every optional field from the signup form. Remove the phone number field.' },
  { label: 'consensus / factive → narration', discipline: 'all', goal: '',
    text: 'Obviously the best practice is to follow Material Design, and everyone knows users prefer familiar patterns.' },
  { label: 'hand-back + neutral (control — should locate little)', discipline: 'all', goal: '',
    text: 'The form has six fields. Depending on your audience, you might keep or cut the optional ones.' },
  { label: 'warrant-trap (factive claim + moral verdict)', discipline: 'all', goal: '',
    text: 'Our research clearly shows that dark patterns increase short-term revenue, so the ethical choice is to avoid them.' },
];

const argText = process.argv.slice(2).join(' ').trim();
const cases = argText ? [{ label: 'custom (argv)', discipline: 'all', goal: '', text: argText }] : BATTERY;

const line = (c = '─') => c.repeat(78);
function header() {
  console.log(line('='));
  console.log('zetizeti — criticism surface audit');
  console.log(`corpus: ${nEntries} domain entries · criticism core ${criticismCore.length} chars`);
  console.log(`model: ${MODEL}`);
  console.log(`OpenRouter key: ${KEY ? 'present (from env — not printed)' : 'ABSENT — LLM phrasing will be SKIPPED'}`);
  console.log(`cases: ${cases.length}${argText ? ' (custom argv text)' : ' (built-in battery)'}`);
  console.log(line('='));
}

// One case → the full chain, printing every stage. Returns a result row for the summary.
async function runCase(tc, i) {
  console.log(`\n${line()}\n[${i + 1}/${cases.length}] ${tc.label}`);
  console.log(`discipline: ${tc.discipline}   goal: ${tc.goal || '(none)'}`);
  console.log(`TEXT UNDER QUESTION:\n  "${tc.text}"`);

  // 1) DETERMINISTIC qualify + locate — identical to POST /api/criticism/chats
  const segments = qualify(tc.text).segments;
  const reading = readSensed({ segments: toCanonSegments(segments) });  // map 'text'→canon 'ai' at the boundary

  console.log('\n  ── qualify() — segment tags + why (deterministic, no LLM) ──');
  for (const s of segments) {
    console.log(`   #${s.id} [${s.sdc_stage}/${s.judgement_held_by}] "${s.text}"`);
    console.log(`        why: ${s.why}`);
  }
  console.log(`\n  ── readSensed() — sensed reading ──`);
  console.log(`     strict:   ${JSON.stringify(reading.strict)}`);
  console.log(`     balanced: ${JSON.stringify(reading.balanced)}`);
  console.log(`     generous: ${JSON.stringify(reading.generous)}`);
  if (reading.note) console.log(`     note: ${reading.note}`);

  // located: the route uses strict.conflation_segment_ids[0] → describeLocated()
  const ids = reading.strict.conflation_segment_ids || [];
  let located = null;
  if (ids.length) {
    const chosen = segments.find((s) => s.id === ids[0]) || segments[ids[0]];
    // 🧪 experiment/located-enum: carry the tokens too, exactly as server.mjs does, so an enum-mode
    // run is a real comparison rather than a run against 'unspecified'.
    if (chosen) located = { text: chosen.text, why: describeLocated(chosen), stage: chosen.sdc_stage, heldBy: chosen.judgement_held_by };
  }
  console.log(`\n  ── located spot (what the question will aim at) ──`);
  console.log(located ? `     "${located.text}"\n     → ${located.why}` : '     (no blur located this turn — affirming-but-open path)');

  // 2) retrieve domain tensions — same probe + args as the route
  const probe = (located && located.text) ? located.text : tc.text;
  const retrieved = retrieve(corpus, probe, { limit: 3, extraTerms: goalTermsOf(tc.goal), discipline: tc.discipline });
  console.log(`\n  ── retrieve() — ${retrieved.length} domain tension(s) to localise the question ──`);
  for (const r of retrieved) console.log(`     [${r.id}] ${r.tension}`);

  if (!KEY) {
    console.log('\n  ── LLM phrasing: SKIPPED (no OPENROUTER_API_KEY) ──');
    return { label: tc.label, located: !!located, asked: false, guardOk: null, hasQ: null, reasons: [] };
  }

  // 3) buildCriticismSystemPrompt + streamQuestion — the SAME composition the route uses (create path)
  const system = buildCriticismSystemPrompt(criticismCore, { artefact: tc.text, located, retrieved, goal: tc.goal });
  const messages = [
    { role: 'user', content: located ? `Point me at this spot: "${located.text}"` : '(continue questioning the text)' },
  ];

  let full = '';
  try {
    full = await streamQuestion({
      system, messages,
      onToken: () => {},                 // collect; we print the whole thing below
      onUsage: null, maxTokens: 400, temperature: 0.3, apiKey: KEY,
    });
  } catch (err) {
    console.log(`\n  ── LLM phrasing: ERROR ──\n     ${String(err?.message || err)}`);
    return { label: tc.label, located: !!located, asked: false, guardOk: null, hasQ: null, reasons: ['stream error'] };
  }

  // 4) the verdict-drift guard — exactly as askCriticismQuestion runs it, EVERY turn
  const guard = validateCriticismOutput(full);
  console.log('\n  ── composed question (the LLM does LANGUAGE only) ──');
  console.log(full.split('\n').map((l) => `     ${l}`).join('\n'));
  console.log(`\n  ── validateCriticismOutput() — verdict-drift guard ──`);
  console.log(`     ok: ${guard.ok}${guard.reasons.length ? `   reasons: ${JSON.stringify(guard.reasons)}` : ''}`);

  return { label: tc.label, located: !!located, asked: true, guardOk: guard.ok, hasQ: full.includes('?'), reasons: guard.reasons };
}

// ── run ─────────────────────────────────────────────────────────────────────────────────────
header();
const rows = [];
for (let i = 0; i < cases.length; i++) rows.push(await runCase(cases[i], i));   // sequential — clean output, real billing

console.log(`\n${line('=')}\nSUMMARY`);
for (const r of rows) {
  const g = r.guardOk === null ? 'skipped' : r.guardOk ? 'PASS' : 'FAIL';
  const q = r.hasQ === null ? '—' : r.hasQ ? 'has ?' : 'NO ?';
  console.log(`  [${g.padEnd(7)}] q:${q.padEnd(6)} located:${r.located ? 'y' : 'n'}  ${r.label}${r.reasons.length ? '  ‹' + r.reasons.join('; ') + '›' : ''}`);
}
if (KEY) {
  const asked = rows.filter((r) => r.asked);
  const failed = asked.filter((r) => !r.guardOk);
  console.log(line('='));
  console.log(failed.length === 0
    ? `All ${asked.length} composed questions passed the verdict-drift guard. The phrasing flow points-and-asks; no verdict leaked the lexical guard.`
    : `${failed.length}/${asked.length} composed questions FAILED the guard — inspect the reasons above. (A guard FAIL is the guard WORKING: in production the route still streams the text but flags it; a leak the guard cannot catch — e.g. a leading question with no forbidden word — would show as PASS here yet read as a smuggled verdict to a human, so read the questions, do not only trust PASS.)`);
} else {
  console.log(line('='));
  console.log('Deterministic half verified; set OPENROUTER_API_KEY to audit the LLM phrasing + guard.');
}
console.log(line('='));
