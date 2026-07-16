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

  // 0. Break the loop — the STONE has circled its OWN question (selfEcho). This fires EVEN within the
  //    refractory window: a loop is exactly the moment to interrupt, not to stay quiet. Unlike the
  //    learner-side `cycling` case below (which can be productive dwelling), an interlocutor repeating
  //    itself is never productive, so it acts on this signal alone. Still a POSTURE (how to ask, never a
  //    verdict about the person), and it hands the observation back to the learner as a question
  //    (surface) — "are we still on the live thread?" — rather than declaring them stuck (§7).
  if ((sig.selfEcho ?? 0) >= 0.5) {
    return {
      posture: 'You have circled the same question. Drop that line entirely and ask a different KIND of question — a consequence, an adjacent idea or domain this has not touched, or what it makes possible — not a sharper version of the last one.',
      surface: 'we’ve circled the same question a couple of times — is this still the live thread, or shall we move?',
      fired: 'selfEcho',
    };
  }

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
  // 5. Widen — the enquiry is covering no NEW ground (advancement low) and the learner is not moving on
  //    their own. Open the idea outward instead of pressing on its weak point: the generative move that
  //    balances the reductive default ("where is it weak") the register otherwise skews to. A posture, not
  //    a verdict — "ask what else makes it interesting", never "you are stuck / not progressing".
  if ((sig.advancement ?? 1) <= 0.25 && (sig.movement ?? 0) <= 0.3) {
    return {
      posture: 'Open the idea outward rather than pressing on its weak point: ask what else makes it interesting, what it makes possible, or an adjacent question it raises — a generative question, not a critical one.',
      surface: null, fired: 'widen',
    };
  }
  // 6. Acknowledge movement — the warmth dial (Sourav + Siddhie, Jul: "feels too strict", "a little
  //    positive reinforcement", "revisit the banter"). Turned exactly as far as the philosophy already
  //    permits and NO further: a "brief observation of movement toward clarity" (invariant #3 allows
  //    this; it is NOT praise, NOT reward, NOT a score). Fires only when the learner has genuinely
  //    sharpened their OWN thinking (movement high AND fresh ground covered) — so it can never read as
  //    hollow encouragement. Still a POSTURE (how to ask), and the model MAY decline it; the turn still
  //    ends on the single question. No gamification (invariant #6): this acknowledges the inquiry moving,
  //    never awards the inquirer.
  if ((sig.movement ?? 0) >= 0.6 && (sig.advancement ?? 0) >= 0.4) {
    return {
      posture: 'The learner has just sharpened their own thinking. You MAY open with ONE brief, plain observation of that movement in their own words ("you got more specific just now", "that named the real tension") — never praise, never evaluation, never a score — before your single question.',
      surface: null, fired: 'acknowledge',
    };
  }
  // 7. Converging + sharpening + the learner moving — stay close, let it land.
  if ((sig.condensation ?? 0) >= 0.6 && (sig.movement ?? 0) >= 0.4) {
    return {
      posture: 'Stay close. Ask at most one quiet question; do not interrupt the landing.',
      surface: null, fired: 'landing',
    };
  }
  return QUIET;
}
