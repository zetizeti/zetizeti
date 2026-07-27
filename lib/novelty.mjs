// novelty.mjs — the SEMANTIC freshness channel. **SHADOW ONLY. IT DOES NOT STEER.**
//
// 🔴 READ THIS BEFORE WIRING IT TO ANYTHING. This channel was built to replace the word-novelty
// discriminator, wired into `advancement` and the arc's line release, and then UNWIRED THE SAME DAY on
// measurement, because it inverts on the exact case it exists for. It is kept, computed, and logged so
// the next attempt has a baseline and the dead ends are on record — not because it works.
//
// THE FAULT IT WAS BUILT FOR. Everywhere the code asks "is this learner covering fresh ground?" it
// counts CONTENT WORDS the reply has not used before (`advancement` in signals.mjs, `fresh` in arc.mjs).
// A student who writes fluently and rarely reuses vocabulary scores high while restating one idea eight
// different ways — how Siddhie's 26 July session read as advancing for eleven turns while going nowhere.
//
// DEAD END 1 — whole-utterance similarity (measured 27 Jul 2026, both fixtures, live backend). Cosine
// between the latest reply and its nearest earlier reply DOES NOT separate restating from developing:
// 0.28–0.56 across the looping session, 0.32–0.61 across the sharpening one, overlapping, with the
// sharpening session's highest reading above every reading in the loop. Two replies from one conversation
// are adjacent in sentence-embedding space either way. The shortest, most disengaged replies ("it stays")
// scored as MAXIMALLY novel, being unlike everything. Self-normalising against the session's own texture
// does not rescue it: a uniformly repetitive session normalises its repetition away.
//
// DEAD END 2 — per-item novelty over the EdgeSpan, which is what this file computes. It looked right on
// the first pair of fixtures (the looping session decayed to 0.16–0.28 per item; the sharpening probe
// never fell below 0.39) and that result DID NOT GENERALISE. Three purpose-built 20-round conversations,
// 27 Jul 2026, live backend:
//
//     D · fluent restater — new vocabulary every turn, one single idea .... mean 0.444  ← the HIGHEST
//     E · genuine developer — a new claim every turn ......................  mean 0.353
//     F · developer whose vocabulary circles .............................. mean 0.194  ← the LOWEST
//
// The ordering is inverted for the case that matters: the restater reads FRESHER than the developer, and
// the developer whose words happen to circle is read as the most spent of all. Two mechanisms, both
// visible in this file's own dependencies. (a) The synonym-catching this channel was supposed to give is
// not there: feltshift.mjs records that word-level MiniLM cosines are compressed onto a ~0.2 anisotropy
// floor, so "apprehend" is not near "understand" — a thesaurus-restater produces a new item string every
// turn and scores as new material. What actually drove the good result on Siddhie's transcript was the
// EXACT-STRING shortcut: she reused her literal words. This measures literal reuse with a weak semantic
// tint, not conceptual novelty. (b) 10 of D's 20 turns were gated to "no claim" — elaborate abstract
// prose drifts from the goal utterance, so the tether gate exempts precisely the register that restates
// most fluently.
//
// AND IT DOMINATED RATHER THAN REFINED. The composition rule below takes a minimum, which was supposed to
// make this a refinement over the deterministic backstop. In the runs, `sem == advancement` on 15–20 of
// every 20 turns: per-item novelty decays for everyone as the span fills, so it sat below the word count
// almost always and effectively replaced it. A "refinement" that decides every turn is a replacement.
//
// PROCESS NOTE, and the reason this is a shadow now. `docs/ops/todo-inquiry-maths.md` had already written
// the rule this violated: "Start as a shadow signal: compute and store it behind the curtain, compare it
// against the crude signals on real transcripts before it drives anything. Do not wire it to steering
// until it has been watched." It was wired to steering on one pair of fixtures. The three runs that
// caught it are what the rule was asking for, done in the wrong order.
//
// THE COMPOSITION RULE (`refineFresh`) is kept and tested, because it is the contract any future wiring
// must satisfy: the semantic reading may only ever LOWER a claim of freshness, never raise one, so that a
// cold neural backend — which falls back to a deterministic hashed vector, i.e. lexical, i.e. the same
// fault under another name — behaves exactly as the deterministic build does. It is applied to produce
// the SHADOW value that gets logged, so it stays live code rather than an unread assertion.

// Below this many items a turn makes NO claim. A one- or two-word reply carries no coverage evidence
// either way, and it is `thinning` (signals.mjs) that reads those correctly and deterministically —
// which is also why the dead sentence-level design's worst misreadings were exactly these turns.
const ITEMS_MIN = 3;

// The tether gate in feltshift zeroes `semGain` for a turn that has drifted off the edge entirely.
// That is a statement about WHERE the turn went, not about whether it covered new ground, so an
// untethered turn makes no freshness claim either — drift has its own nudge.
const TETHER_FLOOR = 0.12;

// Per-turn semantic freshness, derived from the felt-shift reading. `feltTurns` is `readFeltShifts(...).turns`
// (one entry per SCORED turn, i.e. per learner turn, in order), or null/undefined when the neural
// backend is not live. Returns one value in [0,1] per learner turn, or null to make no claim at all.
export function semanticFreshness(feltTurns) {
  if (!Array.isArray(feltTurns) || !feltTurns.length) return null;
  return feltTurns.map((t, i) => {
    // The opening articulation cannot restate anything, and scores 0 by construction: the goal's own
    // items are seeded into the covered set before scoring begins, so the turn that IS the goal covers
    // nothing new. feltshift.mjs makes the same exemption for its own event channel ("the baseline
    // forming, not a shift against one").
    if (i === 0) return 1;
    if (!t || !t.items || t.items < ITEMS_MIN) return 1;        // too little material to read
    if ((t.rel ?? 1) < TETHER_FLOOR) return 1;                  // off the edge — a different question
    return Math.max(0, Math.min(1, t.semGain / t.items));
  });
}

// The composition rule, in ONE place so no caller can get it wrong: the semantic channel may only lower
// a freshness claim. `sem` may be null (backend cold), shorter than expected, or hold a neutral 1.
export function refineFresh(lexical, sem, i) {
  if (!sem || i >= sem.length || sem[i] == null) return lexical;
  return Math.min(lexical, sem[i]);
}
