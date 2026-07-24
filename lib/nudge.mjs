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
    // The stone has repeated its OWN question-shape. But WHY matters. If the learner is bringing fresh
    // ground (advancement high), the INQUIRY is not looping — only the model's FORM has gone stale, so
    // vary the form and KEEP the thread, and NEVER tell an advancing learner they are "circling". Only
    // when the learner is ALSO not moving is it a genuine loop to break and hand back. (Calibration from
    // the 24 Jul auth-less probe: selfEcho fired on a sharpening student because the model held the same
    // "if you were to…" shape — the false "we circled" surface would have derailed a productive thread.)
    // Both branches stay verdict-free: the WHY (advancement) is decided in code and never told to the
    // model — the posture carries only a mode of asking (invariant #7).
    if ((sig.advancement ?? 1) >= 0.5) {
      return {
        posture: 'Your recent questions have taken the same shape. Keep the current thread, but change the FORM of your next question sharply — make it short and blunt, or concrete and specific; do NOT open with another "if you were to…" reframe.',
        surface: null,
        fired: 'selfEcho-form',
      };
    }
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
  // 6. Encourage movement — the warmth dial, set to "light encouragement" (Prayas, 24 Jul 2026, after
  //    Sourav + Siddhie: "feels too strict", "a little positive reinforcement", "revisit the banter").
  //    The dial names what is WORKING in the learner's line of thought ("this line is opening something")
  //    — warmer than the old bare "you got more specific". The invariant it must not cross is
  //    inquiry-not-inquirer (#5/#7), NOT warm-vs-cool: encouragement aimed at the THREAD they are
  //    developing is allowed; a grade of the PERSON ("you're doing well", a score) is not. Threshold
  //    LOWERED (movement >= 0.3, from 0.6) so an ordinary student feels it early — but it STILL requires
  //    genuine insight (a real movement marker) AND fresh ground; it must NEVER fire on new tokens alone.
  //    (The 24 Jul auth-less probe fabricated "that distinction is doing real work" from advancement
  //    alone, when NO distinction had been drawn — hollow praise a discerning student would distrust.)
  //    Still a POSTURE the model MAY decline; the turn still ends on the single question. No gamification
  //    (#6): it encourages the inquiry moving, never awards the inquirer.
  if ((sig.movement ?? 0) >= 0.3 && (sig.advancement ?? 0) >= 0.4) {
    return {
      posture: 'The learner has just moved their own thinking forward. Open with ONE brief, warm line that names what is WORKING in their line of thought — "this line is opening something", "that distinction is doing real work", "now the real tension is in view" — encouragement aimed at the INQUIRY they are developing, never at them as a person (never "you\'re doing well", never a grade or score) — then your single question.',
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
