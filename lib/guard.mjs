// guard.mjs — the never-answer guard's ENFORCEMENT layer (invariant #3: "the guard must hold").
//
// The guard RULES live in dialogue.mjs (validateOutput / validateCriticismOutput). What lives here is what
// HAPPENS when a rule fails — which, until 24 July 2026, was nothing. The question was streamed to the
// student token by token, validated after the fact, and the verdict rendered as one line inside a
// collapsed curtain panel; on the criticism surface the client assigned the verdict to a variable it never
// read. The guard computed a judgement and no code acted on it. That made it an instrument (it is the
// objective metric behind every eval in docs/ops/) but not a guard.
//
// The rule enforced here is deliberately blunt: A QUESTION CANNOT BE WITHHELD AFTER THE STUDENT HAS READ
// IT. So the turn is generated in FULL and buffered, checked, and only an accepted question is sent. A
// rejected one is regenerated ONCE, with the guard's own reasons handed back as a correction. If the
// second attempt also fails, the better of the two is delivered and marked flagged — the student always
// gets a question, never a blank turn, and never a silent breach.
//
// This subsumes the empty-response case at no extra cost: an empty generation fails `no question present`
// like any other breach, so the same retry covers a provider blip (a cold local model, an evicted vLLM
// worker) with no second code path. That matters ahead of the self-host move — see
// docs/ops/local-model-readiness-fixes-20260724.md, item 4.
//
// Deterministic and model-free: `generate` and `validate` are INJECTED, so the policy is unit-testable
// with no network and no key. AI does language; CODE does judgement (the SDC split, invariant #5).

import { plainQuestion } from './dialogue.mjs';

// How bad is a candidate? Empty is always worst (a blank turn is the one thing never to deliver); after
// that, more broken rules is worse. Used only to pick which of two failed attempts the student sees.
const rank = (c) => (c.text.trim() ? 0 : 1000) + c.check.reasons.length;

// The correction handed back on the retry. It names what broke WITHOUT restating the forbidden phrasing
// as an example (which would invite the model to echo it), and it re-states the one rule of the mode.
// The student never sees this — it is a prompt turn.
export function repairInstruction(reasons = [], { mode = 'enquiry', attempt = 1 } = {}) {
  const why = reasons.length ? reasons.join('; ') : 'it broke the questioning rule of this mode';
  const tail = mode === 'criticism'
    ? 'Reply again with ONE clear question ABOUT THE TEXT. Point in the text\'s own words. Do not judge, grade, correct, or declare the text right or wrong — hand the judging back to the student.'
    : 'Reply again with ONE short question only — a single sentence ending in one question mark, in the learner\'s own words. Do not explain, advise, reassure, conclude, or answer.';
  // 🔴 THE SECOND CORRECTION ESCALATES, and repeating the first one verbatim is what made a second attempt
  // pointless (17 August 2026). A ten-round critique had the model drop the "When you say…" opener the ban
  // had just refused and invent a replacement construction immediately — «quote» — what is this X doing,
  // and what would it take to…? — on three consecutive breaching turns. The frame gate caught all three and
  // all three shipped, because one repair carrying the same words could not reach what was actually wrong.
  // What is wrong in that case is the SHAPE, and the shape has a carrier: the compound question. Every one
  // of those three joined two questions with "and". So the escalation constrains structure rather than
  // subject — one clause, a different opening word — which breaks the frame without dictating a
  // construction, and a shape that dictates a construction manufactures the next tic (nudge.mjs's own
  // finding about FLOW_SHAPES).
  const escalation = attempt >= 2
    ? ' This is the second correction and your last two attempts shared a construction. Change the SHAPE:'
      + ' ask ONE thing in ONE clause — no second question joined with "and" — and open with a different'
      + ' word from the one you have just used twice. Keep the subject; change the form.'
    : '';
  return `That reply broke this mode's rule (${why}).${escalation} ${tail}`;
}

// Generate → validate → (repair once) → deliver.
//   generate(correction)  → the model call. `correction` is null on the first attempt; on a retry it is
//                           { previous, reasons, instruction } so the caller can shape its own messages
//                           (the two surfaces build them differently).
//   validate(text)        → { ok, reasons } — validateOutput or validateCriticismOutput.
// Returns { text, check, attempts, regenerated, rejected } — `rejected` is the discarded first attempt
// when a retry succeeded (kept for LOCAL capture only; it is never sent to a client and never logged).
// `attempts` counts GENERATIONS, so 4 is three corrections. Raised 2 → 3 → 4 across 17 August as the form
// guards reached the criticism surface: each extra generation is spent ONLY on a turn that has already
// breached every time before it, so the cost lands exactly where the breaches are and is near zero on a
// surface that rarely breaches. Both surfaces get the same budget — retry policy is not one of the
// per-surface differences, and making it one would be a new asymmetry of precisely the kind
// guard-parity.test.mjs exists to prevent.
// 🔴 THE BUDGET IS THE RIGHT LEVER AND THE GATES ARE NOT. Reaching zero breaches by loosening the frame
// gate or the opener ban would buy the number by giving up the thing being measured. A breach that
// survives three corrections is the guard working and is delivered visible, which is the design.
export async function generateGuarded({ generate, validate, attempts = 4, mode = 'enquiry' }) {
  let best = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const correction = attempt === 0 ? null : {
      previous: best?.text || '',
      reasons: best?.check?.reasons || [],
      instruction: repairInstruction(best?.check?.reasons || [], { mode, attempt }),
    };
    // plainQuestion first, so the validated text and the delivered text are the same string. Stripping after
    // the check would let a rule fire on a marker the student never sees, and stripping at the client would
    // leave the download — which the student keeps and sends on — carrying the raw markers.
    const text = plainQuestion((await generate(correction)) ?? '');
    const check = validate(text);
    const candidate = { text, check };
    if (check.ok && text.trim()) {
      return { ...candidate, attempts: attempt + 1, regenerated: attempt > 0, rejected: best?.text || null };
    }
    if (!best || rank(candidate) < rank(best)) best = candidate;
  }
  // Every attempt breached. Deliver the least-bad one, flagged — a flagged question the student can still
  // work with beats a blank turn, and the flag is now surfaced rather than buried.
  return { ...best, attempts, regenerated: attempts > 1, rejected: null };
}
