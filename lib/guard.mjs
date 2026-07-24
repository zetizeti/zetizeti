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

// How bad is a candidate? Empty is always worst (a blank turn is the one thing never to deliver); after
// that, more broken rules is worse. Used only to pick which of two failed attempts the student sees.
const rank = (c) => (c.text.trim() ? 0 : 1000) + c.check.reasons.length;

// The correction handed back on the retry. It names what broke WITHOUT restating the forbidden phrasing
// as an example (which would invite the model to echo it), and it re-states the one rule of the mode.
// The student never sees this — it is a prompt turn.
export function repairInstruction(reasons = [], { mode = 'enquiry' } = {}) {
  const why = reasons.length ? reasons.join('; ') : 'it broke the questioning rule of this mode';
  const tail = mode === 'criticism'
    ? 'Reply again with ONE clear question ABOUT THE TEXT. Point in the text\'s own words. Do not judge, grade, correct, or declare the text right or wrong — hand the judging back to the student.'
    : 'Reply again with ONE short question only — a single sentence ending in one question mark, in the learner\'s own words. Do not explain, advise, reassure, conclude, or answer.';
  return `That reply broke this mode's rule (${why}). ${tail}`;
}

// Generate → validate → (repair once) → deliver.
//   generate(correction)  → the model call. `correction` is null on the first attempt; on a retry it is
//                           { previous, reasons, instruction } so the caller can shape its own messages
//                           (the two surfaces build them differently).
//   validate(text)        → { ok, reasons } — validateOutput or validateCriticismOutput.
// Returns { text, check, attempts, regenerated, rejected } — `rejected` is the discarded first attempt
// when a retry succeeded (kept for LOCAL capture only; it is never sent to a client and never logged).
export async function generateGuarded({ generate, validate, attempts = 2, mode = 'enquiry' }) {
  let best = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const correction = attempt === 0 ? null : {
      previous: best?.text || '',
      reasons: best?.check?.reasons || [],
      instruction: repairInstruction(best?.check?.reasons || [], { mode }),
    };
    const text = String((await generate(correction)) ?? '');
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
