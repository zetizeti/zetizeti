# Corpus needs — the critical register (and its outward AI-text surface)

> **Created:** 2 June 2026. **Revised 2 June 2026** to the *pervasive-register* model (see "What
> changed"). Companion to `ai-criticism-mode-start.md` (the feature) and `corpus-criticism-tracker.md`
> (the build state — read that first to resume). This file is the reasoning behind the tracker.
>
> Read alongside: `position.md` (the critical stance the tool already enacts — this spec only names
> it), `architecture.md §3a` (the verification gate every entry clears), the existing Part A
> (`corpus/method/clean-questioning.md`) and Part B (`corpus/domain/*.md`).

---

## What changed (and why this is a re-frame, not an addition)

The first version of this spec treated criticism as a *mode* — a toggle, a front layer bolted onto
the Socratic engine, with SDC vocabulary as its visible framing. That was wrong twice over. The
settled understanding (Prayas, 2 June 2026) is:

> **Criticism is not a mode. It is the grain of the whole tool — it pierces into everything.**

zetizeti was *already* a critical instrument before "criticism mode" was conceived. `position.md`
says so in its own words: the corpus of *tensions* exists so the student can "test what they have
assumed"; neti-neti "clears away the borrowed assumption, the premature solution, the inherited
convention of the discipline"; the curtain holds the informational layer up to scrutiny without
letting it conclude; the tool is even reflexively critical of its own kind ("zetizeti is not against
answer-machines. It is one"). Those are the moves of critique — denaturalising the given, refusing
the inherited as natural. The critical stance was present everywhere and simply unnamed.

So the layering is:

- **The engine — "the what" — stays behind the curtain.** Socratic discipline, SDC conflation-locating
  (`lib/sensed.mjs`), and Clean Language are the machinery: they decide *which* spots surface, *how*
  to question, and — crucially — the *restraint* (never conclude). The student never sees this
  vocabulary, exactly as Socratic mode never shows them "FTS5" or "felt sense."
- **The critical register — "the language and the objective" — is what is named and made coherent
  across the corpus.** It is the stance the tool already enacts, now articulated so it holds whether
  the attention is on the student's own thinking, the discipline's conventions, the curtain, or a
  found AI text.
- **The AI-text surface (`POST /api/criticise`) is the most *explicit, outward* instance** of that
  register — the moment the critical attention is pointed at the machine's fluency rather than the
  student's edge. It is one object the register points at, not a separate framework.

## The verdict reconciliation (why a verdict-refusing tool can host criticism)

Criticism *as a discipline* is constitutively evaluative — the critic's defining act is to render
judgement. That collides head-on with zetizeti's refusal to deposit a conclusion (`position.md`;
invariant #3, #5). The layering dissolves the collision: the **critical register supplies the
objective and the idiom** (critique this; in criticism's language), while the **Socratic/Clean/SDC
engine withholds the verdict** (it only questions; the student renders the judgement). Stated as one
line:

> **Criticism mode teaches critique by refusing to critique on your behalf.**

The student does criticism, in criticism's language, toward criticism's objective — and the tool
still never hands them the conclusion. This is `position.md`'s "understanding is not deliverable"
applied to the act of critique itself.

## The borrow boundary (unchanged): the split-ratio MCP never runs on web

The locating arithmetic is owned by the split-ratio MCP and is a Python stdio process that never runs
in the deployed app. It is **ported once** to `lib/sensed.mjs` (pure JS, no LLM, parity-tested against
the MCP — DONE, 2 June 2026) and the taxonomy is **lifted as static text** at authoring time. At
runtime the app calls only SQLite, FTS5, and Claude. The MCP is a development-time canonical source;
`scripts/sync-mcp.mjs` tracks drift and `lib/sensed.mcp-sync.json` records the synced baseline.

## The conceptual flag that governs the AI-text surface

The MCP's behavioural constraint forbids inferring a Split Record from finished prose. Criticism's
qualification pass does exactly inference-from-finished-prose, so the framing must hold: `origin` is
**declared** (the student brings a found AI text → `origin: ai`, nothing guessed); only `sdc_stage`
is inferred, and only as **candidate blurs to question, never an authoritative record shown back**.
The moment the tags are presented to the student as a verdict about the text, the tool reproduces the
deposited-conclusion harm on the meta level. (Canon §125 permits text-artefact reading in the
*sensed* register; §153 forbids calling it "the split ratio"; §155 forbids aggregating — all three
align with zetizeti's anti-scoring stance, invariant #6.)

---

## The assets, re-sorted by the pervasive-register model

### 1. The critical register — a Part A method note (the heart; DRAFTED 2 June 2026, `pending`)

`corpus/criticism/critical-register.md`. Names the critical stance the tool already enacts, so it
holds across every object the questioning points at. It is *method* in kind, but it is **deliberately
NOT in `corpus/method/`** — `loadMethodCore` (dialogue.mjs) globs every `.md` there into the resident
Socratic prompt every turn, and whether the critical register should load in *all* modes ("pierces
into everything") or *only* on the criticism surface is a product decision for Prayas, not a silent
default (invariant-adjacent). It lives in its own `corpus/criticism/` dir — inert until a criticism
path explicitly loads it — so it does not change Socratic mode today. Not a domain entry. It is grounded in the actual traditions of critique so it
is a real framework, not a posture — and expressed throughout as *how to question critically*, never
as verdicts to deliver. It is **two-sided by construction**: critique that becomes habitual suspicion
is its own failure mode (Felski), so the discipline is critique that *goes somewhere* — toward the
student's own judgement — bounded by direction and the never-answer guard. Verified citations:
Barthes (1957/1972), Berger (1972), Horkheimer (1937), Ricoeur (1965/1970), Freire (1968/1970),
Martin & White (2005), Hume (1739–40), Putnam (2002), Felski (2015). *Status: drafted, citations
live-verified via Perplexity/Exa, `provenance: pending` — awaiting Gate-4 sign-off.*

### 2. The conflation → critical-question bridge (the engine meets the register)

The translation layer: a located SDC conflation (`judgement_held_by: text` — source-neutral, mapped to the canon's `ai` only at the compute boundary — blurred into description)
becomes a question in criticism's language. The linguistic substrate is exact and citable — Martin &
White's **evoked/invoked attitude**, where evaluation hides inside apparently factual ("ideational")
meaning, *is* the smuggled verdict; the fact/value entanglement (Hume, Putnam) is why it cannot be
dissolved by "just describe neutrally." This asset maps each conflation *type* to a critical question
form ("what is this text settling for you that you haven't settled?"). *Status: not started.*

### 3. The "questioning a text" Clean note (engine, behind the curtain)

`clean-questioning.md` is written toward a learner narrating their own felt sense; it cannot be
reused verbatim for an artefact. A sibling note re-points the Clean-Language *forms* at a text
("what is this sentence *doing* — describing, or deciding for you?"), demoted now to *hidden how*,
not framing. *Status: not started.*

### 4. The verdict-language negative lexicon (the guard's content)

The `validateOutput` extension's content: the verdict/grade/"is-this-AI" phrasings to reject when
aimed at the text, each with a clean reframe. More important under this model, not less — the front
now speaks critical language and could slip into a critic's verdict. Build it from the appraisal
vocabulary (inscribed attitude is the thing to forbid), not by guessing. *Status: not started.*

### 5. Discipline-localised critical exemplars + design-criticism sources (v2)

How the smuggled verdict bites differently per discipline, tied to the existing 14 Part B files; plus
design-criticism-specific grounding. **Verification debt:** Twemlow's design-criticism essay and
Dunne & Raby, *Speculative Everything* (2013) were flagged by Perplexity as synthesised beyond its
returned sources — they are **not** cited anywhere until independently verified (invariant #0).
*Status: deferred; sources pending verification.*

### Done

`lib/sensed.mjs` (the locator) — ported, parity-tested 16/16 incl. a live cross-check against the
Python MCP; `scripts/sync-mcp.mjs` + baseline recorded.

---

## Sequencing and the verification floor

Asset 1 is the spine and is drafted; it now needs Gate-4 sign-off, which is the only step that flips
it from `pending` to `verified` (architecture.md §3a) — clearing the analytical passes and live
citation checks is necessary, not sufficient. Asset 2 follows (it depends on 1's register being
settled). Assets 3 and 4 are short and ship with the first `/api/criticise` cut. Asset 5 is deferred,
and its two design-criticism sources stay out of the live corpus until verified. As everywhere,
verification sets the pace, not breadth (invariant #0). The corpus here is small, but it makes
*claims about how text and persuasion behave* and about the *traditions of critique* — every such
claim is backed against a real, live-verified source the same as any Part B entry, via
Exa/Perplexity/Consensus + citation-verifier, and signed off by Prayas before it is live.
