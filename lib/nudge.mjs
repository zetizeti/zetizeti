// nudge.mjs — the deterministic steering policy (progress-signals.md §5).
//
// Maps the signal vector (+ light state) to a QUESTIONING POSTURE — a *mode* instruction for the
// next question — NEVER a diagnosis of the learner. The posture is injected into the system prompt;
// the model is told *how to ask*, never *what is wrong with the person*.
//
// Guardrails, all from §5:
//   • quiet by default — most turns return no posture; the method core questions on its own.
//   • refractory period — no nudge within REFRACTORY turns of the last (no whisper every stroke).
//   • joint-firing — "shift the angle" never fires on cycling alone (cycling ≡ productive dwelling
//     from outside); it requires cycling AND flat insight AND flat specificity, and prefers to
//     hand the read back to the learner as a question (surface) rather than steer.
//   • topic authority — a drift nudge is suppressed if the learner just re-drew the edge (that IS
//     them declaring a new anchor; only the learner changes the topic).
//
// There is NO scoring here and nothing about the person — only a posture, or silence.

export const REFRACTORY = 3;

// state: { exchanges, turnsSinceNudge, reDrewThisTurn }
export function decideNudge(sig = {}, state = {}) {
  const { exchanges = 0, turnsSinceNudge = 99, reDrewThisTurn = false } = state;
  const QUIET = { posture: null, surface: null, fired: null };

  if (exchanges < 1) return QUIET;                 // need a little history before steering at all
  if (turnsSinceNudge < REFRACTORY) return QUIET;  // refractory — stay quiet

  // 1. Cycling — joint only (stuck and productive dwelling look identical alone). Prefer handing
  //    the read back to the learner over steering.
  if ((sig.cycling ?? 0) >= 0.5 && (sig.movement ?? 0) <= 0.2 && (sig.specificity ?? 1) <= 0.45) {
    return {
      posture: 'Offer a question from a genuinely different angle than the last one.',
      surface: 'the question hasn’t moved in a few turns — are you sitting with it, or stuck?',
      fired: 'cycling',
    };
  }
  // 2. Drift from the enquiry — only if the learner has NOT just re-drawn the edge.
  if ((sig.drift ?? 0) >= 0.75 && !reDrewThisTurn) {
    return {
      posture: 'Ask a question that connects the present thread back to what they first set out to explore.',
      surface: null, fired: 'drift',
    };
  }
  // 3. Hedging on the goal — test the commitment (posture, never "the learner is hedging").
  if ((sig.conviction ?? 1) <= 0.4) {
    return {
      posture: 'Ask one question that tests whether the current goal, as stated, is the real edge.',
      surface: null, fired: 'hedging',
    };
  }
  // 4. Low specificity sustained — ground it in the concrete.
  if ((sig.specificity ?? 1) <= 0.3) {
    return {
      posture: 'Ask for the one concrete instance — a real case where this actually shows up.',
      surface: null, fired: 'grounding',
    };
  }
  // 5. Converging + sharpening + the learner moving — stay close, let it land.
  if ((sig.condensation ?? 0) >= 0.6 && (sig.movement ?? 0) >= 0.4) {
    return {
      posture: 'Stay close. Ask at most one quiet question; do not interrupt the landing.',
      surface: null, fired: 'landing',
    };
  }
  return QUIET;
}
