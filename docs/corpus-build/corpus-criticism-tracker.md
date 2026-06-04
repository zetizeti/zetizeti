# Corpus Build Tracker — the critical register (criticism)

> **Purpose.** The resumable map of the corpus-building effort for the **critical register** — the
> pervasive critical stance zetizeti already enacts, now being named and made coherent across the
> corpus, with the **AI-text surface** (`POST /api/criticise`) as its most explicit outward instance.
> Where each asset is in the pipeline, what is done, the exact next action. Read this first to resume.
> Reasoning behind each asset: `corpus-criticism-build.md` (the spec). Feature: `ai-criticism-mode-start.md`.
> The Socratic-mode Part A/Part B build is tracked separately in `corpus-build-tracker.md`.
>
> **Last updated:** 2 June 2026, 21:00 (evening stock-take). **Re-framed to the pervasive-register
> model** (criticism is the grain of the whole tool, not a toggle — Prayas, 2 June). Morning progress:
> **(a)** `lib/sensed.mjs` ported + parity-tested + `scripts/sync-mcp.mjs` and baseline recorded —
> **DONE**; **(b)** all **5 critical-register notes DRAFTED with live-verified citations**, passes 1–4
> run, `provenance: pending`. The engine/feature code (the 7-item checklist in `ai-criticism-mode-start.md`)
> is **all 7 items BUILT (2 June 2026): backend (2–5,7) + UI (6)** — see "The feature checklist" below.
> **DEPLOYED FOR TESTING to zetizeti.com on 3 June 2026** ("deploy for testing, no users") — live
> behind Google sign-in; dev guest confirmed OFF in prod (`guestAllowed:false`, `/auth/guest`→404).
> **Live LLM flow still UNVERIFIED — needs a real sign-in + OpenRouter key (test via BYOK, not the
> $1/day pool).** Resume = Prayas's
> Gate-4 sign-off on the 5 notes, then the code build (qualification pass → criticism prompt → guard →
> `/api/criticise`).
>
> **Evening reconciliation (2 June 21:00) — two corrections to the morning record:**
> 1. **The live parity cross-check was SILENTLY SKIPPING on this Mac.** `test/sensed.test.mjs`'s default
>    MCP path was hardcoded to the Linux box (`/home/prayas/...`), so on the Mac (`/Users/prayasabhinav/...`)
>    `existsSync` failed and the live JS-vs-Python check skipped (15/16, 1 skip) — the morning's "16/16
>    incl. live cross-check" held only where `SPLIT_RATIO_MCP_SRC` was set. **Fixed:** the default now
>    resolves via `homedir()`, so the guard runs by default on both machines. Re-verified: **16/16, 0
>    skipped**, JS port matches the Python MCP byte-for-byte. The port itself never drifted — only its
>    guard wasn't running here.
> 2. **The 5 notes + `sensed.mjs` are now physically DEPLOYED but INERT.** The 2 June evening corpus
>    deploy to `zetizeti.com` shipped `corpus/criticism/` and `sensed.mjs` inside the tar, but nothing
>    loads them: `corpus/criticism/` is globbed by neither `loadMethodCore` (only `corpus/method/`) nor
>    `buildIndex` (only `corpus/domain/`), and `sensed.mjs` is imported by nothing. No criticism surface
>    is reachable. (`make-caprover-tar.sh` now excludes `*.mcp-baseline.py` / `*.mcp-sync.json` — dev
>    artefacts that should not ship.)

---

## The goal, and what "done" means

Make the critical register explicit and coherent: a Part A method note naming the stance; the bridge
that turns a located SDC conflation into a question in criticism's language; the behind-the-curtain
Clean note for questioning a text; the verdict-language guard; and (v2) discipline-localised
exemplars. Done = criticism can be questioned in its own idiom toward its own objective, with the
engine (Socratic/Clean/SDC) withholding the verdict, all behind the same verification floor as Part B.

An authored entry is **DONE only when it reads `verified`** — the `**provenance:** pending` line
deleted by **Prayas's Gate-4 sign-off**, never Claude's call (invariant #0; architecture.md §3a).
Two register-specific edges: a method note that makes *claims about how text/persuasion behave* needs
live citation verification like any Part B entry (done for the draft); and the **two-sidedness** check
matters acutely here — the register must carry its own limit (Felski) or it is a one-sided "critique
good" verdict. The ported `lib/sensed.mjs` is DONE by **parity test**, not sign-off.

## The pipeline (per authored entry — same gate as Part B)

```
  draft (original prose; two-sided; expressed as how-to-question, never as verdicts)
    → Pass 1  factual/citation grounding + copyright gate
    → Pass 2  logical parsing (de-gotcha, flip-test, redundancy)
    → Pass 3  philosophical / SDC parsing (no smuggled verdict; the two-sided limit present)
    → Pass 4  LIVE external citation verification (Exa/Perplexity/Consensus + citation-verifier)
    → GATE 4: Prayas's human sign-off  ← the only step that flips pending → verified
```

## The assets — state

| # | Asset | Lands in | State | Next action |
|---|-------|----------|-------|-------------|
| — | **`read_sensed` port + sync** | `lib/sensed.mjs`, `scripts/sync-mcp.mjs`, baseline | **DONE** | parity 16/16 incl. live MCP cross-check; baseline recorded |
| 1 | **Critical register (method note)** | `corpus/criticism/critical-register.md` | **DRAFTED · `pending`** | Prayas Gate-4 sign-off (then delete the `provenance: pending` line) |
| 2 | **Conflation → critical-question bridge** | `corpus/criticism/conflation-to-question-bridge.md` | **DRAFTED · `pending`** | Gate-4; maps each conflation type → a clean critical question, grounded on Martin & White + framing + fact/value |
| 3 | **"Questioning a text" Clean note** | `corpus/criticism/questioning-a-text.md` | **DRAFTED · `pending`** | Gate-4; **confirm David Grove origin attribution against a primary source** (carried from existing project credit) |
| 4 | **Verdict-language lexicon (guard content)** | `corpus/criticism/verdict-language-lexicon.md` | **DRAFTED · `pending`** | Gate-4; the `validateOutput` code change it feeds is raised separately (invariant #3), NOT done |
| 5 | **Discipline-localised critical exemplars** | `corpus/criticism/discipline-localised-exemplars.md` | **DRAFTED · `pending`** | Gate-4; standalone form (per-entry `conflation_examples:` mechanism still an open decision) |

Counts: **5 drafted / 0 verified.** Port + sync: **DONE.** All five drafts live in `corpus/criticism/`
— inert (not globbed into the resident prompt, not FTS5-indexed) until a criticism path loads them.

## The feature checklist — engine/code side (`ai-criticism-mode-start.md` §"Build checklist")

The corpus assets above are the *content* criticism questions with; this is the *code* that wires them
into a working surface. The mode-start doc lists seven items. Current state (2 June 2026, 21:00):

| # | Checklist item | State | Notes |
|---|----------------|-------|-------|
| 1 | `lib/sensed.mjs` — JS port of `read_sensed` + parity test | **DONE** | parity 16/16, 0 skipped (after the homedir() fix); `scripts/sync-mcp.mjs` + baseline track MCP drift |
| 2 | Qualification — segment + tag pasted text → source-neutral Split Record (tags only, never judges) | **DONE** | **Superseded 3 Jun by DETERMINISTIC `lib/qualify.mjs`** (no LLM; the old `buildQualificationPrompt`/`parseQualification` in dialogue.mjs are now dead). origin + `judgement_held_by` declared **`text`** (source-neutral — never `ai`; the tool questions an idea from anywhere, must not conflate "text decided" with "AI-generated"), mapped to the canon's `ai` only at the compute boundary (`qualify.toCanonSegments`) so `sensed.mjs` stays a faithful v1.0 port |
| 3 | Criticism system prompt in `dialogue.mjs` — "question this text"; posture = a located conflation point | **DONE** | `buildCriticismSystemPrompt`; loads `loadCriticismCore` (base Clean + the 5 notes) resident on the criticism surface only; retrieval localises |
| 4 | `POST /api/criticise` — stateless: qualify → locate (`sensed.mjs`) → question | **DONE** | server.mjs; `requireUser` + pool metered ONCE (summed both calls); NO quests/messages, stores neither text nor reading; `req.body` never logged. Two shapes (initial paste / follow-up segment) |
| 5 | `validateOutput` verdict-drift extension — forbid verdict/grade/"is-this-AI" language about the text | **DONE** | `validateCriticismOutput` EXTENDS the base guard (still `?`-required + Socratic FORBIDDEN) + the verdict/grade/is-this-AI lexicon; 7 guard tests green |
| 6 | Client toggle — Socratic ↔ criticism; criticism talks only to the stateless endpoint | **DONE** | `#view-criticism` + `streamCriticism` + `attachReading` (public/index.html); entry via topbar 'criticism' + About; built under `frontend-design-prayas` (specimen sheet, vermilion-mass blurs) |
| 7 | Spend metering — criticism turns count against the same OpenRouter pool/BYOK accounting | **DONE** | one `addPoolSpend` per interaction with the summed cost of both LLM calls |

**Backend (2–5,7) + UI (6) BUILT 2 June 2026.** Deterministic core unit-tested (12 tests in
`app/test/criticism.test.mjs`: guard + parser + parse→locate); landing tagline revised + an About page
explaining both voices added. The two live LLM calls (qualify → question) need a real OpenRouter key —
**unverified locally, never deployed.** **Remaining before criticism mode is real for a learner:**
(a) a live end-to-end run with a key; (b) Gate-4 sign-off on the 5 corpus notes (Assets 1–5 above);
(c) extend the discipline-localised exemplars (corpus further); (d) deploy.

## Update — 3 June 2026, 16:05

Three things landed today, all on the deterministic locator (no LLM, no key); the live LLM
question-phrasing run is still the one open verification.

1. **Locating made deterministic + audit-survivable (committed earlier 3 Jun).** The LLM qualification
   pass was replaced by `lib/qualify.mjs` (compromise POS + hand-written SDC rules, each tag carrying a
   `why`). New harness `scripts/audit-criticism.mjs` runs the full chain end-to-end.
2. **1000-case stress test → 3 real bugs fixed.** `scripts/stress-locator.mjs` (1019 generated,
   labelled sentences) lifted locator accuracy **89.3% → 97.2%**: (a) sentence-initial noun-verbs
   ("Process teams iterate…") no longer false-flag as imperatives; (b) hedged modal-be verdicts
   ("might be clean") no longer missed (bare "be" counts as predicative copula with a subject before
   it); (c) an evaluative adj across a comma ("To be fair, users…") no longer binds attributively. +7
   regression tests. Residual misses are `compromise` mis-tags (the cheap error) + the documented
   lexicon tradeoff ("a biased estimator" fires) — Prayas's knob, not silently changed.
3. **`judgement_held_by`/`origin` value renamed `ai` → `text` (source-neutral).** The criticism surface
   questions an idea *from anywhere*, so labelling the held value `ai` both misnamed it and conflated
   with AI-detection (which the verdict-drift guard forbids). The **sdc-canon keeper agent adjudicated:
   rename in zetizeti, leave the canon and splitdomaincognition.org untouched.** Implemented as a
   **boundary map**: `qualify.mjs` emits `text` everywhere zetizeti produces/stores/shows/documents;
   `qualify.toCanonSegments` maps `text → ai` ONLY when feeding `lib/sensed.mjs`, so the canon port + its
   Python baseline + the live parity test stay **untouched (16/16 green)**. zetizeti's record is now a
   *source-neutral variant* of Split Record v1.0 (arithmetic-faithful, not byte-identical). Docs updated:
   this tracker, `conflation-to-question-bridge.md` (the dishonest gloss removed), `ai-criticism-mode-start.md`,
   `corpus-criticism-build.md`. **Full suite 61 green** (was 54; +7 regressions).

## 4-pass re-verification + Consensus pass — 3 June 2026, 16:26

Full re-run of all four gates on the five criticism notes (after the `ai`→`text` rename), via three
independent adversarial agents + a live Consensus/Perplexity framing pass. **Result: corpus holds; one
BLOCKER and several question-form/framing fixes APPLIED; copyright + two doctrinal calls escalated to
Prayas's Gate-4.** Entries remain `pending` (invariant #0 — only Prayas's sign-off verifies).

- **Gate 1/4 — citations (citation-verifier, live Crossref/publisher):** 21 sources, **20 clean, ZERO
  fabricated/misattributed** (independently re-verified, not trusting the 2 Jun pass — Ricoeur "school"
  not "masters", Sullivan "ever", Martin & White "evoked/invoked", Tractinsky 1997≠2000 all correct).
  Copyright of the five notes: clean (idea re-expression; short attributed phrases only).
- **Gate 2 — framing fidelity (Consensus + Perplexity, this session):** three empirical clusters checked.
  (a) **Aesthetic-usability — CORRECTED.** The gloss understated a *contested reversal*: Tuch et al.
  2012 + Hamborg 2014 find usability→perceived-beauty (aesthetics does NOT raise perceived usability),
  vs Tractinsky 2000/Sonderegger the other way, with fluency/visual-clarity as a third variable
  (Preßler 2023; Schrepp 2021). Rewrote `discipline-localised-exemplars.md` to "contested and may run
  the other way." (b) **Framing effects — CONFIRMED + enriched** with a magnitude anchor (McDonald et al.
  2021 meta-analysis, d≈0.5→0.22 under pub-bias correction) added to the bridge. (c) **Critical-thinking
  explicit+dialogic — CONFIRMED** (Abrami 2015, Kuhn, Marín & Halpern); dissolves the "explicit=telling"
  tension (dialogic is what zetizeti is).
- **Gate 3 — three independent passes (factual/logical/philosophical-SDC):** convergent BLOCKER found by
  TWO agents → FIXED: `questioning-a-text.md` offered the opener *"What is this sentence doing —"* that
  `critical-register.md` explicitly **bans**, misattributed to the bridge → replaced with the bridge's
  clean form *"Is this describing, or deciding for you?"*. Also FIXED: four leading/foreclosing/
  manufactured-opposition example questions (bridge ×3, register ×1) rewritten to keep the null answer
  open; one unconfirmable Whiteley verbatim de-quoted to an attributed idea.
- **APPLIED this pass:** BLOCKER opener; 4 question-form de-leadings; Tuch reversal correction; framing
  magnitude anchor; Whiteley de-quote.
- **RESOLVED (was an escalation; corrected 3 Jun 16:3x by a live fetch).** **CC BY 4.0 status of the
  "Clean Language Principles" — CONFIRMED CC BY 4.0.** The citation pass conflated two notices on
  https://cleanlanguage.com/clean-language-principles/ : the *content* reads "Clean Language Principles
  © 2025 by Leaders in Clean — Licensed under CC BY 4.0"; the separate *site footer* reads "© The
  Developing Company 2026, All rights reserved" (site chrome, not the document licence). The agent read
  the footer. So the project's CC-BY attribution claim is **substantiated** and a CC-BY attribution
  surface MAY ship — crediting **Leaders in Clean (2025), CC BY 4.0** (contributors incl. Lawley; with
  acknowledgement to David Grove), not "The Developing Company."
- **ESCALATED to Prayas's Gate-4 (NOT silently changed):** (2) **Whiteley quote wording** — spot-check against *Sifting
  the Trash* if the verbatim is wanted (de-quoted for now). (3) **Bluntness doctrine** — "softening only
  protects the smuggled verdict" overclaims ("only"); register-voice call. (4) **Puncture-as-question /
  Flusberg contrast-class / two-sidedness of 3 leaning exemplars** — quality refinements proposed, held
  for Prayas. (5) The foreclosure standard for example questions (whether a question may presuppose a
  located category) — applied the stricter null-preserving line per 2-Jun precedent; Prayas may overrule.

## Passes 1–4 run (2 June 2026) — independent adversarial agents

Three independent agents, fresh context, "find what's wrong" (architecture.md §3a): **citation-verifier**
(Pass 4 + Pass 1 citation/copyright, live web-verified), **academic-realist** (Pass 1 factual + Pass 3
SDC/smuggled-verdict), **dialectical-partner** (Pass 2 logical/de-gotcha + Pass 3 two-sidedness).

- **Pass 4 headline: ZERO fabricated or misattributed citations** across all 5 files — every source
  exists with correct author/title/year/venue and the attributed claims are faithful. Copyright clean
  (ideas re-expressed; only short attributed phrases quoted). The flagged-uncertain **David Grove**
  attribution came back **confirmed** (Grove originated Clean Language; Tompkins & Lawley codified).
- **Fixes APPLIED this session** (passes 1–3 findings): corrected the Tuch et al. 2012 claim (was
  internally contradictory + overstated as "reversing the maxim" → now "weak and conditional"); fixed
  several **leading questions** that asserted the diagnosis before asking (bridge ×2, exemplars ×3) to
  open forms — they had violated the corpus's own "we sensed a blur — what do you see?" rule; softened
  overclaims (framing "measurably shift" → "can shift"; Abrami; Putnam/"are entangled" → "can be");
  "masters of suspicion" → Ricoeur's actual "school of suspicion"; Capraro "et al." → "Capraro & Vanzo"
  (2 authors); added a real affirming move to the Felski limit (ask what a passage does *well*, not just
  where it blurs) in bridge + lexicon; gave the Papanek row a genuine second pole; strengthened the
  "not a banned-word list" framing; resolved the Grove caveat; verified Whiteley quote to its fuller form.
- **Left for Gate-4 / Prayas (not silently changed):** light redundancy between register & bridge
  groundings (both softened + cross-referenced, not merged — merge is a structural call); a watch that
  the exemplars' "What is naturalised:" glosses never leak verbatim into learner-facing question text;
  confirm the CC BY 4.0 status of the Lawley/Tompkins "Clean Language Principles"; the per-entry
  `conflation_examples:` mechanism decision for Asset 5.
- **Note:** passes are a filter, NOT sign-off. All 5 remain `pending`; only Prayas's Gate-4 verifies
  (invariant #0; architecture.md §3a).

## Citation ledger (live-verified 2 June 2026 via Perplexity academic / Exa)

VERIFIED and used in the critical-register draft: Barthes *Mythologies* (Fr 1957 / En 1972) · Berger
*Ways of Seeing* (1972) · Horkheimer "Traditional and Critical Theory" (1937) · Ricoeur *Freud and
Philosophy* (Fr 1965 / En 1970) · Freire *Pedagogy of the Oppressed* (Pt 1968 / En 1970) · Martin &
White *The Language of Evaluation: Appraisal in English* (Palgrave, 2005) · Hume *A Treatise of Human
Nature* (1739–40, Bk III Pt I §I) · Putnam *The Collapse of the Fact/Value Dichotomy and Other Essays*
(Harvard UP, 2002) · Felski *The Limits of Critique* (2015). Empirical backing (Consensus): Abrami et
al. 2015 (*Review of Educational Research*, g+=0.30 over 341 effects) and Abrami et al. 2008 — explicit
+ dialogic critical-thinking instruction works; implicit does not.

Added 2 June (2nd batch) — framing/loaded-language empirical backing (Consensus): Flusberg et al. 2024
(*Psych. Science in the Public Interest*) · Capraro et al. 2019 (*Judgment and Decision Making* — moral
loaded words generate framing effects) · Levin et al. 1998 (*OBHDP* — attribute framing shifts
evaluation). Used in Asset 2.

Added 2 June (Asset 5 batch) — design-criticism + HCI, all live-verified: Tractinsky 1997 (*Proc. ACM
SIGCHI* — aesthetic-usability correlation) · Tuch et al. 2012 (*Computers in Human Behavior* — effect
weak/conditional) · Preßler et al. 2023 (*CHI EA* — processing fluency) · Louis Sullivan, "The Tall
Office Building Artistically Considered" (1896 — "form ever follows function") · Papanek, *Design for
the Real World* (1971) · Twemlow, "Victor Papanek's Design Criticism for the Real World" (Vitra, 2018)
+ *Sifting the Trash* (MIT Press, 2017) + PhD thesis (RCA, 2013) · Nigel Whiteley, *Design Issues* 13(2)
(1997 — evaluation→interpretation, quote verified verbatim).

**VERIFICATION DEBT — CLEARED 2 June 2026.** Dunne & Raby, *Speculative Everything* (MIT Press, 2013,
ISBN 978-0-262-01984-2) — verified (available for Asset 5 if wanted; not currently cited). Twemlow — the
earlier "What is graphic design criticism for?" was a **hallucinated title** (never cited); real works
verified and used. **David Grove** as Clean Language's originator — **CONFIRMED** by the citation-verifier
pass; the Asset 3 caveat is resolved. **Remaining sliver:** confirm the CC BY 4.0 status of the
Lawley/Tompkins "Clean Language Principles" at Gate-4.

## RESUME POINT (2 June 2026, 3rd batch — Asset 5 + passes)

All **5 assets drafted, citation-grounded, and run through adversarial passes 1–4** (fixes applied).
The live work is now **Prayas's Gate-4 sign-off** — the only step that flips any of them `pending →
verified`.

1. **Gate-4 on Assets 1–5 [Prayas].** Read the five `corpus/criticism/*.md` files; for each that holds,
   delete its `**provenance:** pending` line. Grove is confirmed; the only sliver left is the CC BY 4.0
   status of the "Clean Language Principles."
2. **Decide where the register loads** (open question below) — blocks wiring, not authoring.
3. **The `/api/criticise` surface + `validateOutput` extension** — code, raised separately
   (invariant #3); not part of this corpus build.

## Open decisions to confirm with Prayas

- File home for Asset 2 (the bridge) — a method note vs a structured mapping file.
- Whether the AI-text surface keeps a literal toggle/endpoint as the *explicit outward instance*
  (pragmatic, `lib/sensed.mjs` already supports it), or the mode/toggle framing dissolves entirely
  into "the register points at different objects." The spec currently keeps the surface; confirm.
- **Where the critical register loads.** It is in `corpus/criticism/`, NOT `corpus/method/`, because
  the latter is globbed into the resident Socratic prompt every turn. Decision: should the register be
  resident in *all* modes (truest to "pierces into everything", but it changes every Socratic session +
  adds resident tokens), or load *only* when the criticism surface is active (a second
  `buildSystemPrompt` branch)? Until decided, it is inert — loaded by nothing.
- Asset 5's mechanism (`conflation_examples:` on existing entries vs a separate mapping).
