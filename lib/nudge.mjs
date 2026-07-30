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

// ── the FORM rotation (v0.10.2) ───────────────────────────────────────────────────────────────────
// The question's SHAPE, cycled deterministically by turn — the counterpart of the arc's line rotation,
// and for the same reason: repetition is prevented structurally rather than detected. The three tells
// are the ones measured across 60 real turns ("When you say…", "If you were to…", "what is the
// specific…"); each shape below forbids the construction the previous one invites, so no opener can
// survive two turns running. Shapes are about the SENTENCE, never about the learner (#7), and they
// rotate every turn because form can turn faster than a line of questioning can.
export const FORM_SHAPES = [
  'Make this question SHORT — twelve words or fewer, one clause, no preamble. Do not open with "When you say" or "If you were to".',
  'Open this question with one of the learner\'s OWN nouns as the very first word, then ask straight through. No subordinate clause in front of it.',
  'Ask this one with "how", "who", "where" or "when" — not "what". Keep it plain and unhedged.',
  'Ask for a particular: a thing, a moment, a person, a number. Do not use the word "specific" — name the particular you want instead.',
];
// FLOW_SHAPES (28 Jul 2026) — the same rotation with its fourth shape replaced. FORM_SHAPES[3] asks for
// "a particular: a thing, a moment, a person, a number", which is a DIRECT contradiction of the method
// core's own section "Never require the precise word", and it is the measurable source of the browbeating
// the student reported: ten of forty questions in his real session demanded the one particular sound, and he
// answered "i don't know how to explain that silence". The replacement asks in the register Prayas set —
// *"not like talking to a judge but to a friend"* — which is the one thing no shape here previously did.
// The other three are unchanged: measured across the 28 July replay they carry the length discipline and
// suppress the either/or tic that appears the moment the rotation is removed.
// REVISED FOR MEANING (28 Jul 2026, second pass). The first version kept FORM_SHAPES[1], which fronts one
// of the learner's own nouns as the first word. On a four-turn cycle that fires ten times in forty-one
// and manufactures a mannerism: "Silence—", "Released—", "Ambience—", "Headphones—". It reads as studied
// and it is what makes the register sound, in Prayas's words, "randomly poetic". A shape that dictates a
// CONSTRUCTION will always produce a tic, because it fires whether or not the sentence wants it.
//
// So every shape here now constrains only toward PLAINNESS — length, directness, ordinary word order —
// and none of them imposes a form. Rotation is retained: removing it entirely was measured and rejected
// (either/or interrogation on 61% of turns, questions at 38 words), so the rotation is doing real work.
// It just must not be a rotation of postures-of-style.
// LENGTH FLOOR, not a ceiling (29 Jul 2026, measured across 1,938 question→reply pairs in nine live
// 20-round runs). Questions of twelve words or fewer are REJECTED BY THE STUDENT 26% of the time
// against 16% for questions of twenty to twenty-four words — and the gap survives excluding the
// decline/corrected paths (where short questions are correct) and excluding the warm preamble (so it is
// not length standing in for warmth). Reply lift moves the same way. Brevity was the wrong instinct:
// a very short question is usually an under-specified one, and the student has to guess what was meant.
// The floor is a floor — nothing here rewards length past about twenty-four words either.
export const FLOW_SHAPES = [
  'Ask it directly — one clause, no preamble, no throat-clearing. Do not open with "When you say" or "If you were to". Aim for about fifteen words: enough to be unambiguous, never under twelve and never over twenty-two.',
  'Ask it in ordinary word order, the way you would say it out loud: subject, verb, the thing. No fronted noun, no dash, no inversion, no clause before the question.',
  'Ask about what HAPPENS, or what they would WANT — something with an ordinary answer. Keep it plain and unhedged.',
  // The permitted warmth clause is ACKNOWLEDGEMENT, never INTERPRETATION (30 Jul 2026). A real session
  // had it prefaced with "that focus on behavioural cues is shifting the log from a record of the past
  // to a tool for the next interaction" — the stone's reading of her idea, handed to her as settled
  // before she was asked anything. Enforced at the guard by where the clause's words come from.
  'Ask this one the way a friend would — plain and curious, no framing clause, no demand for precision. If something in what they said struck you, you may say so in one short clause first, then ask — but that clause may only say back WORDS THEY USED. Never tell them what their idea is doing, becoming or shifting into; that reading is theirs to make, not yours to hand them.',
];
// The first-pass FLOW_SHAPES, kept ONLY as the comparator for the meaning fix (flow-probe M0). Its
// second entry is the noun-fronting shape that manufactured "Silence—", "Released—". Not shipped.
export const POETIC_SHAPES = [FORM_SHAPES[0], FORM_SHAPES[1], FORM_SHAPES[2], FLOW_SHAPES[3]];
export function formShape(exchanges = 0, { flow = false, poetic = false } = {}) {
  const shapes = poetic ? POETIC_SHAPES : flow ? FLOW_SHAPES : FORM_SHAPES;
  return shapes[Math.max(0, exchanges) % shapes.length];
}

// ── felt-shift postures (v0.10.0) — the event-driven layer ABOVE the cadence-driven nudges ──────
// When the felt-shift detector (lib/feltshift.mjs) marks an event on the learner's turn, the mode of
// asking follows the EVENT, not the cadence: these outrank decideNudge's posture and ignore the
// refractory (an event is exactly when to respond, as the selfEcho break already does). Wording is the
// version Prayas signed off on transcript evidence (24 Jul 2026): short, no restatement, no preamble,
// reuse one or two of the learner's exact words — the first draft's "you have identified…" restatement
// pincers were rejected as too long and complex. Still POSTURES: a mode of asking about the
// ARTICULATION, never a verdict about the person (invariant #7).
export function feltPosture(fs) {
  if (!fs) return null;
  if (fs.lexEvent) {
    return {
      fired: 'felt-lex',
      posture: 'The learner has just named what matters, in their own words. Stay with that naming — do not change direction. Ask ONE SHORT, quiet question that tests the thing they named, reusing one or two of their exact words. Do NOT restate their sentence back to them, no preamble, no semicolon, no second question. The whole turn: one plain sentence, under 20 words.',
    };
  }
  if (fs.semEvent) {
    const ws = (fs.newWords || []).slice(0, 3).map((n) => `"${n.w}"`).join(', ');
    return {
      fired: 'felt-sem',
      posture: `New material just entered the articulation — the learner's own new words: ${ws}. Ask ONE SHORT question that takes up exactly one of those words and opens it. One plain sentence, under 20 words, no preamble, no list of directions.`,
    };
  }
  return null;
}

// state: { exchanges, turnsSinceNudge, reDrewThisTurn }
export function decideNudge(sig = {}, state = {}, { warmth = false } = {}) {
  const { exchanges = 0, turnsSinceNudge = 99, reDrewThisTurn = false } = state;
  const QUIET = { posture: null, surface: null, fired: null };

  if (exchanges < 1) return QUIET;                 // need a little history before steering at all

  // ── WARMTH FIRST (29 Jul 2026) — the only element measured that moves BOTH axes the same way ──────
  // Across 1,938 pairs: a turn opening with a brief line naming what is working draws a reply 15% above
  // that conversation's own baseline (plain turns: −5%) and is refused 10% of the time against 23%. It
  // is not a selection effect — the reply BEFORE such a turn sits at +1%, i.e. the student was not
  // already warm — and matched on turns where they WERE already warm it still gives +19% and 7%
  // refusal against plain's −1% and 22%. Three testers asked for it independently (Siddhi's "revisit
  // the banter", Sourav's "positive reinforcement", and Prayas's "not a judge but a friend"), and the
  // measurement now says the same thing.
  //
  // So it is promoted ABOVE the refractory, which had been suppressing the best lever in the policy for
  // three turns after any other nudge fired, and its thresholds are lowered (0.6 → 0.3 on 24 July for
  // an ordinary student; 0.3 → 0.15 now). It keeps a one-turn gap of its own so it can never run on
  // consecutive turns, and it still requires REAL movement plus fresh ground — it must never fire on
  // new tokens alone, or it becomes the hollow praise a discerning student distrusts.
  // TWO ROUTES IN (29 Jul 2026). The original gate — `movement`, which is insight-PHRASES per turn
  // ("realise", "actually", "i see", "oh") — is a lexicon of self-narrated insight, and an analytical
  // student never narrates: across a real 24-turn session (two ideas, dense substantive replies every
  // turn) movement read 0.00 THROUGHOUT and the release's headline lever fired zero times. It was only
  // ever measurable on the probe's expressive persona. So a second, material route: the learner is
  // DEVELOPING — sustained new ground (advancement) carried by a substantively rich reply — even if
  // they never say so. The 24-Jul hollow-praise risk ("that distinction is doing real work" when no
  // distinction was drawn) is answered by wording, not by the gate: the line must name the SPECIFIC
  // thing they just added, in their words — with succession's newMaterial in the turn context there is
  // always a nameable thing on a route-two turn.
  const insightRoute = (sig.movement ?? 0) >= 0.15 && (sig.advancement ?? 0) >= 0.2;
  const developmentRoute = (sig.advancement ?? 0) >= 0.5 && (state.lastMaterial ?? 0) >= 10;
  if (warmth && (insightRoute || developmentRoute) && turnsSinceNudge >= 1) {
    return {
      posture: 'Open with ONE short line naming the SPECIFIC thing they have just added or sharpened — in their words, never a generic compliment ("so the storefront is doing X", "that distinction between A and B is doing real work", "this line is opening something"). It is about the INQUIRY they are developing, never about them as a person: never "you\'re doing well", never a grade. Then your single question.',
      surface: null, fired: 'acknowledge',
    };
  }

  // 0. WHERE THE SELF-ECHO BRANCH USED TO BE — removed 27 Jul 2026, and the reason matters.
  //
  //    It fired on `selfEcho >= 0.5`. Measured across three 20-round conversations, `selfEcho` ran
  //    0.44–0.76 with a mean of 0.58 in EVERY one of them, so the branch fired on 16 of 19 turns and its
  //    "escalation" on 17. It was not detecting that the stone had repeated itself; it was detecting that
  //    two English questions resemble each other in a hashed embedding space. A correction that fires
  //    every turn is not a correction, and this one did active harm: standing at the top of the policy,
  //    ahead of the refractory, it PRE-EMPTED the rest of the layer — `acknowledge` reached a learner 3
  //    times in 60 turns and `widen` once.
  //
  //    The form problem it was aimed at is real: the model does fall into a stock opener. It is now
  //    solved the way the arc solves line-repetition — STRUCTURALLY, by rotating the question's shape on
  //    a fixed cycle (`formShape` below), rather than by detecting a sameness we cannot measure. Same
  //    lesson twice in one day: structure beats detection wherever the detector is weaker than the
  //    pattern it is chasing. `selfEcho` and `sustainedEcho` are still computed, watch-side, and steer
  //    nothing.

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
  // 3. Sustained hedging in the recent replies — test the claim, never the person (#7). Reply-based
  //    since 29 Jul 2026 (conviction was goal-only before, so this branch was dead all session).
  if ((sig.conviction ?? 1) <= 0.4) {
    return {
      posture: 'The last answers lean on "i think / i feel / maybe" rather than on something seen. Ask for the thing itself — ONE instance, observation, or number that would make the claim solid — in their words. Not "are you sure": the concrete thing.',
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
  //    Sourav + Siddhi: "feels too strict", "a little positive reinforcement", "revisit the banter").
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
