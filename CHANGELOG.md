# Changelog

Versioning follows [Semantic Versioning](https://semver.org), **aligned to git**: annotated tags
`vMAJOR.MINOR.PATCH` are the source of truth, and `git describe` yields the traceable build string —
`0.9.0` on a clean tag, `0.9.0+3.g<sha>` three commits later, `.dirty` for an uncommitted tree. The
running build reports its version at `GET /api/version`, in `GET /api/config`, in the boot log, and in
the page footer. (See `app/lib/version.mjs`.)

**What the numbers mean here.** zetizeti is a live, public pilot still being tuned by student feedback,
so it sits in `0.x` — minor bumps carry new behaviour, patch bumps carry fixes. The major versions mark
states of the tool's maturity, not feature milestones:

- **`1.0` — stable.** It works satisfactorily for an *ordinary* student, not only a tolerant one.
  Stable does not mean "the churn stopped"; it means the questioning is sharp enough that a normal,
  impatient learner has a worthwhile session. The pilot does not yet clear this bar — it works for
  tolerant students and loses the rest.
- **`2.0` — unique.** It does something no other tool does.
- **`3.0` — proven.** Its worth is demonstrated — the bar that earns campus-wide deployment.

Today's `0.9.x` works for tolerant students; reaching `1.0` means it works for the rest. So the
sharpening work — the loopiness fix, warmth, the `2.0` "unique" measurement maths — is the road *to*
stable, not a departure from it.

## [0.9.3] — 2026-07-24

### Added
- **The criticism sensed reading surfaces all three readings** — strict · balanced · generous — as a
  range, not just strict (`public/index.html`). The split-ratio canon's discipline: never a single
  authoritative number; the reader adjudicates the range. The three readings were already computed and
  sent; the curtain now shows them, framed still as "a sensed reading — not a score."
- **`feltShift` — a watch-side shadow signal** (`lib/signals.mjs`): a v1 composite indicator of
  enquiry-side edge-condensation (the vague-to-precise move, read off the learner's own words), in the
  signals payload but **driving nothing**. The first approximation of the felt-shift measure the position
  centres on; the rigorous version (re-pointing He et al.'s closed-form info-gain at edge-vagueness) is the
  next phase. Auth-less transcripts show it rising on a sharpening learner (0.41→0.72), falling to 0 on a
  stalled one — directionally sound, not yet a crisp per-turn event detector, and honest about it.

### Changed
- The `de-ai-cold-read` agent now renders **position notes in the MoVD voice** (Prayas's Museum of
  Vestigial Desire register), calibrated from the actual corpus.

## [0.9.2] — 2026-07-24

The signals move to embedding-space geometry, and the dialogue gains felt nuance — the "verified
foundation" increment. Every behaviour here was tuned against real auth-less transcripts (a live model,
no OAuth), not unit tests alone.

### Added
- **`lib/embed.mjs`** — an embedding layer with a deterministic, always-works backend (feature-hashed
  character-3-gram + word cosine; no model, no network, fully reproducible + auditable) and an optional,
  lazy neural MiniLM backend (WASM) behind the same interface. The deterministic layer ships active;
  neural is scaffolded but not installed, so the build stays light.
- **`scripts/dialogue-probe.mjs`** — the auth-less local dialogue test: the real engine (retrieval →
  signals → nudge → guard → live model) with no OAuth/tier shell, to show dialogue nuance before sign-off.
- **`scripts/signoff.mjs`** — the quick Gate-4 corpus sign-off tool (removes friction, never the human call).

### Changed
- **The Stalling Index is embedding-based.** `selfEcho` / `cycling` / `convergence` / `drift` compute over
  feature-hashed cosine, not Jaccard token-overlap — catching near-duplicate phrasing the old measure blurred
  (near-identical 0.84 vs varied 0.23).
- **The loop-break no longer derails an advancing learner.** When the learner brings fresh ground, a stone
  form-rut triggers *vary-the-form* (thread kept, no false "we've circled — shall we move?"); the genuine
  loop-break with its surface fires only when the learner has also stalled.
- **The warmth dial → "light encouragement."** It names what is *working in the inquiry* ("that distinction
  is doing real work"), aimed at the thread and never the person (invariants #5/#7 hold), and fires earlier —
  but still requires genuine insight, never hollow praise on fresh tokens alone.
- **Anti-blandness:** the system prompt pushes form variation — not every question a hypothetical reframe.

## [0.9.1] — 2026-07-24

The never-answer guard now **holds** rather than merely reporting — invariant #3 made true.

### Fixed
- **The guard enforces (`lib/guard.mjs`).** `validateOutput` / `validateCriticismOutput` had computed a
  verdict that no code acted on: the question streamed to the student first and was validated after, so a
  breach was reported in a collapsed panel and never prevented — and on the criticism surface the client
  assigned the verdict to a variable it never read. Now a turn is generated in full, **buffered**, checked,
  and **regenerated once** with the guard's own reasons fed back; only an accepted question is sent, and a
  breach surviving both attempts is delivered flagged, never silently.

### Changed
- **The question no longer streams token by token.** A question cannot be withheld after it has been read,
  so it is delivered whole after a beat — the deliberate price of the guard actually holding.

### Added
- **Empty-response backstop** — an empty generation is a breach like any other, so the same retry covers a
  provider blip or a cold local model; two empties end in a clear refusal, never a blank turn.
- **Guard telemetry** at `/api/admin/usage` — turns / repaired / flagged per surface (counts only, no
  content; invariant #8).
- 12 deterministic tests (`test/guard.test.mjs`).

## [0.9.0] — 2026-07-16

First formally versioned build. The post-pilot revision, from Siddhie's and Sourav's feedback.

### Changed
- **Question sameness fixed across both surfaces.** The anti-sameness machinery (self-echo watch,
  retrieval rotation) that the enquiry path gained in July now runs on the criticism surface too — it
  previously had none, and collapsed to one axis ("is this a verdict or a property?") every turn.
- **Criticism rotates its line of questioning** on a pointer budget (~3 questions per line, then
  advance): the verdict/blur move is now one aim among several, alongside design-reasoning lines
  (problem · verified-vs-observed · stakes · behaviours · need-vs-want · hero-hindrance).
- **Enquiry retrieval de-staleness** for the "bland tail" — rolling-window query + rotate-by-default
  with graceful cycle-back; each question pushed to be more concrete than the last.
- **Modes named by purpose**, in prompts and public copy: one to **develop** an idea, one to
  **stress-test** whether it holds. Criticism register softened from adversarial to alongside.

### Added
- A warmth dial: a movement-observation posture ("you got more specific just now") — never praise
  (invariants #3/#6 held).
- SemVer versioning aligned to git (`lib/version.mjs`, `/api/version`, build stamp in the deploy image).
- 15 deterministic regression tests (`test/revision.test.mjs`).

### Fixed
- Composer starts taller (a tester found the initial text box too small).

_Prior builds (first production deploy 10 Jul; ephemeral pivot + two-tier keys 11 Jul; criticism
surface live + first loopiness fix 13 Jul) predate formal versioning and are not tagged._
