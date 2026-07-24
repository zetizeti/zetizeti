# Changelog

Versioning follows [Semantic Versioning](https://semver.org), **aligned to git**: annotated tags
`vMAJOR.MINOR.PATCH` are the source of truth, and `git describe` yields the traceable build string —
`0.9.0` on a clean tag, `0.9.0+3.g<sha>` three commits later, `.dirty` for an uncommitted tree. The
running build reports its version at `GET /api/version`, in `GET /api/config`, in the boot log, and in
the page footer. (See `app/lib/version.mjs`.)

**What the numbers mean here.** zetizeti is a live, public pilot still being tuned by student feedback,
so it sits in `0.x` — minor bumps carry new behaviour, patch bumps carry fixes. The major versions mark
states of the tool's maturity, not feature milestones:

- **`1.0` — stable.** It holds; the core behaviour has stopped churning.
- **`2.0` — unique.** It does something no other tool does.
- **`3.0` — proven.** Its worth is demonstrated — the bar that earns campus-wide deployment.

Today's `0.9.x` is the pilot approaching stable.

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
