# Contributing to zetizeti

Thank you for considering it. zetizeti grows by **density, not mass** — named people owning bounded
things — so contributions here are deliberately scoped into two lanes. Read
[`docs/concept/position.md`](docs/concept/position.md) first: it is the commitment everything else
enforces, and a contribution that weakens it will be declined however well it is built.

## The invariants are not up for improvement

These are the product. PRs that "improve" them away are changing what zetizeti *is*, and need a
conversation before code (open an issue):

1. **Retrieval is exact-word FTS5** — never embeddings, never stemming. Clean Language reuses the
   learner's literal words, so retrieval must be literal too.
2. **The never-answer guard (`validateOutput`) and the verdict-drift guard
   (`validateCriticismOutput`) are deterministic code** — never model self-assessment.
3. **No fabricated citations, ever.** Nothing enters the live corpus until it passes all four
   verification gates (below). This overrides any wish to grow the corpus quickly.
4. **No in-copyright text in the corpus** — ideas re-expressed, never expression reproduced (the one
   licensed exception: the CC BY 4.0 Clean Language Principles, attributed).
5. **No scores, grades, verdicts, aggregation, leaderboards, or user-modelling** — anywhere, for
   anything. Per-instance readings only.
6. **The nudge layer sends a posture, never a diagnosis** — no learner-state ever routes into the
   prompt, by any path.
7. **Keys are never logged or persisted.** Any new code touching `req.headers`, request bodies, or a
   key variable is touching a security invariant — flag it in your PR description.
8. **Claude models only**, via OpenRouter.

What is *out of scope by design* (not backlog): gamification, AI-detection, semantic retrieval, a
scoring/feedback engine, growth machinery. See the negative-space section of
the README's "What zetizeti refuses" section.

## Lane 1 — corpus entries (the most valuable lane)

The corpus is the substance; the model only phrases. A good entry is a real, two-sided tension of a
design discipline, in original prose, grounded in verifiable scholarship.

1. Read [`docs/corpus-build/verification-workflow.md`](docs/corpus-build/verification-workflow.md) —
   the four gates — and [`docs/concept/architecture.md`](docs/concept/architecture.md) §3a.
2. Match the entry shape used in [`corpus/domain/`](corpus/domain/): the tension (genuinely
   two-sided — steelman both poles), question seeds, sources, and a `felt as:` register (how a student
   says it before they know the term).
3. Verify your citations **live** (Crossref / publisher pages — every author, title, year, venue).
   Plausible-from-memory is the failure mode this protocol exists to catch.
4. Submit the entry with `provenance: pending` and a filled sign-off sheet (format:
   [`docs/corpus-build/review-sheets/`](docs/corpus-build/review-sheets/)).
5. **Only the maintainer's Gate-4 sign-off flips an entry to `verified`.** Pending entries are
   indexed but marked honestly in the interface. This is invariant #3 working as intended, not a slight.

**The lightest, highest-value contribution:** find a sentence the deterministic locator misreads —
a smuggled verdict it walks past, or neutral description it flags — and open an issue quoting it.
Every confirmed miss becomes a line in [`lib/qualify.mjs`](lib/qualify.mjs)'s readable lexicon,
with a regression test. That is the whole point of locating with rules instead of weights: you can
correct it.

## Lane 2 — code

- `npm install && npm run dev`; the suite is `node --test` and **must stay green** —
  including the guard tests and the split-ratio parity tests (16/16 against the canon arithmetic).
- Add a regression test for any behaviour you fix; the locator's stress harness is
  `scripts/stress-locator.mjs`, the end-to-end audit is `scripts/audit-criticism.mjs`.
- **UI changes**: zetizeti's interface is a deliberate, personal visual register (high-chroma
  cobalt-and-fire on blue-black, hard edges, colour as mass — spec in [`brand.md`](brand.md)).
  Match the existing grammar; "modernising" the look toward generic SaaS will be declined.
- British English in prose and comments.

## Decision rights, in one paragraph

The maintainer (Prayas Abhinav) owns the invariants, the doctrine, and Gate-4 sign-off. Named stewards
may own bounded domains (a discipline's corpus, a subsystem) — by explicit, refusable agreement, not
accretion. There is no steering committee, no voting, no titles. The licence is the pressure valve:
zetizeti is AGPL-3.0, and a fork that disagrees is a legitimate outcome, not a failure of process.
