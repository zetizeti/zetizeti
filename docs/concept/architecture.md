# zetizeti — working architecture (two-part corpus)

**Created:** 23 May 2026, 17:05:39 · **Revised:** 23 May 2026, 17:10:05, 17:16:23
**Status:** scratch — architecture spec, no build yet
**Companion:** `spec.md` (feasibility). Prayas un-parked this 23 May 2026, then reframed the corpus into two parts with synthetic-verified content permitted.

**One line:** A web-deployable Socratic questioning engine whose corpus is split in two — a *pedagogy* part that governs HOW to question, and a *design-domain* part (synthetic, verified) that gives the engine substance to question INTO — so the tool is both legally clean and actually fluent in a design student's vocabulary.

---

## 1. The reframe that fixes everything at once

The first draft tried to ground questioning in public-domain books. Two problems surfaced: (a) the only PD method-texts are old (Plato, Dewey 1910) and (b) their 19th-century vocabulary doesn't match a modern student saying "I'm blocked on my game's economy loop" — literal retrieval would return nothing and the engine would run blind.

**Prayas's two-part corpus dissolves both.** The corpus is no longer "books." It is two purpose-built layers:

- **Part A — Pedagogy / questioning.** *How* to ask. Small, stable. Governs the engine's behaviour.
- **Part B — Design-domain knowledge.** *What* the questioning engages. **Synthetic, verified.** Covers many design disciplines in their own current language.

Because Part B is synthetic-and-verified, it is **copyright-clean by construction** (original generated text, not copied prose) AND it **speaks the student's vocabulary** (it is written about contemporary design, in contemporary terms). The retrieval that was going to fail against Jowett now hits, because the corpus and the student share a language.

---

## 2. Part A — Pedagogy / questioning corpus

*How the engine questions. Small, stable, eligible to sit context-resident.*

| Component | Licence / origin | Role |
|-----------|-----------------|------|
| Plato — *Meno, Theaetetus, Gorgias* (Jowett) | Public domain (global — Jowett d. 1893) | Elenchus *exemplars* — Socratic refutation in action |
| Aristotle — *Topics* | Public domain | Structure of dialectic — kinds of question, valid vs. fallacious moves |
| Dewey — *How We Think* (1910 ed. only) | Public domain (global — Dewey d. 1952) | Reflective-inquiry stages; problem-posing pedagogy |
| Clean Language Principles | **CC BY 4.0** (attribution required) | Exact-word questioning syntax |
| **Method notes + question-form library** | **Synthetic, verified** (Claude-generated, Prayas-checked) → AGPL | The usable distillation: canonical question forms, when to use each, clarity/confusion cues. **Replaces the in-copyright method books (Gendlin, Lawley-Tompkins archive, Palmer) by re-expressing method as original prose.** |

**Part A is "mixed" (decision 1, 23 May 2026): public-domain primary anchors + synthetic re-expression.**

### 2.1 Can Gendlin / Gadamer / Palmer / Lawley-Tompkins be synthetically rewritten to escape copyright? — the rule

Operative principle: the **idea–expression dichotomy** (US 17 USC §102(b); India's Copyright Act treats ideas/methods the same).

- ✅ **Ideas, methods, concepts, techniques are NOT copyrightable** — *felt sense*, *carrying forward*, *tacit knowing*, *banking vs. problem-posing*, the Clean Language question forms. Free to teach and build on.
- ❌ **The author's expression IS protected** — their actual sentences, structure, distinctive phrasing, chosen examples.
- ⚠️ **A close summary/rewrite is a derivative work** and can infringe even without verbatim copying. Generating text *from* the book's prose ("summarise Focusing") is the trap.

**Therefore the binding construction for Part A synthetic method notes: RE-EXPRESS THE METHOD, do not SUMMARISE THE TEXT.** Original notes that teach the technique, organised our own way, our own examples, grounded in the concept — not generated from the source's sentences. Cite authors as source-of-idea (intellectual honesty). Direct quotation near-zero; a systematic extraction of a book's "heart" defeats fair-dealing. (Well-settled principle, not formal legal advice; zero-quotation + genuine re-expression is the posture that needs no lawyer.)

This is enforced mechanically by a **copyright-safety gate** inside the verification system (§3a): a pass that asks "idea re-expressed, or protected expression paraphrased?"

---

## 3. Part B — Design-domain knowledge corpus (synthetic, verified)

*What the questioning engages. Larger, retrieved per turn. Fully synthetic.*

- **Disciplines (decision 2, 23 May 2026 — Anant School of Design structure):** Foundation Year · Communication Design · Sustainable Fashion & Textile Design · Interaction Design · Product Design · Space Design · Moving Image · Transdisciplinary Design. **Internal grounding** is organised around this real curriculum (uses the platform's actual affordance); **public framing** describes them as design disciplines, never "Anant's programme" (Anant-as-platform stance — no implied stakeholder status). Foundation Year is a *stage* not a discipline (cross-cutting); Transdisciplinary is a *meta* category — both modelled as such. **Pilot: Interaction Design** (Prayas's own department → easiest to verify).
- **Per discipline, structured entries:** core concepts and their tensions; common methods; recurring failure modes; the live debates; the discipline's own vocabulary; the questions practitioners ask themselves. Written so retrieval on a student's actual words lands.
- **Generation → verification pipeline (load-bearing):**
  1. Claude generates structured domain entries, **each carrying citations to verifiable public sources** (decision 3).
  2. **Three-pass verification system** — see §3a. The step that makes synthetic trustworthy.
  3. Entries that clear all passes (plus human sign-off) enter the corpus with a provenance tag (`synthetic-verified`, passes-cleared, verifier, date).
- **Honesty surface:** Behind the Curtain must say a cited domain passage is *synthetic-verified*, not primary literature. Transparency replaces the authority a real book would carry. (Consistent with the tool's transparency-over-grounding stance.)

**Why synthetic beats scraped-or-licensed here:** no copyright exposure, no licence to track, full control of register and coverage, and — uniquely — it can be written to *match how students actually talk*, which no fixed book corpus can.

---

## 3a. The verification system (three-pass + copyright gate) — decision 3, 23 May 2026

Verification = **citations + a three-pass Claude system doing logical and philosophical parsing of every synthetic part.** Each pass is an *independent* Claude invocation (fresh context, adversarial framing — "find what's wrong", temperature 0) so errors don't compound. The three passes check *different* things, so they aren't redundant.

| Pass | Question it asks | Applies to | Fails when |
|------|-----------------|-----------|-----------|
| **1 — Factual / citation grounding** | Does each claim hold against its cited public source? Is the citation real and supporting? | Part B (domain), Part A factual claims | Claim unsupported, citation absent/misrepresented |
| **2 — Logical parsing** | Internal consistency — contradictions, non-sequiturs, overclaims, circular reasoning, within and across entries? | All synthetic parts | Invalid inference, self-contradiction, overclaim |
| **3 — Philosophical parsing** | Soundness beyond fact and logic — does it conflate domains that should stay apart (SDC sensitivity: descriptive vs. evaluative collapse), smuggle in verdicts, or drift from the tool's own positions? | All synthetic parts | Domain-collapse, hidden verdict, position drift |
| **4 — External citation verification** *(MANDATORY; added 24 May 2026)* | Does the work exist and is it correctly attributed — checked **live against Crossref / publisher records** by the `citation-verifier` agent, never from model memory or a Perplexity answer? | Every citation in every entry | Fabricated, misattributed, wrong author / title / venue / year / pages |
| **Gate — Copyright safety** | "Idea re-expressed, or protected expression paraphrased?" (§2.1) | Part A method notes derived from copyrighted authors | Tracks source structure/phrasing; non-trivial quotation |

- **Why Pass 4 is mandatory and distinct from Pass 1.** Pass 1 grounds a claim against the *content* of a source from in-context knowledge; it cannot perform a live lookup, so a fabricated-but-plausible citation sails through it. On 24 May 2026 a single Perplexity research call returned, among five manufacturing-lens citations, one paper with **entirely invented authorship** (a real article misattributed to two real but uninvolved researchers — Moroni & Cavalieri for what is actually Mears & Summers), one with a **non-existent subtitle and the wrong co-author**, and one with **wrong page ranges** — every one caught only by the live `citation-verifier` pass against Crossref. In-context plausibility is not a floor. **Pass 4 runs on every entry, re-runs on any regeneration, and no entry reaches Prayas's sign-off without it.** It maps to Gate 1 in `verification-workflow.md`.
- **Output:** each pass returns pass / flag-with-reasons. Any flag → **human review (Prayas)** before the entry is tagged `synthetic-verified`. Passes cleared are recorded in the provenance tag.
- **Honest limit (the known weakness):** Claude verifying Claude-generated text can miss its own hallucination. The three passes *reduce* this but do not eliminate it. What actually anchors trust to ground truth is **(a) Pass 1's citations to external sources** and **(b) human sign-off on flagged items + a spot-check sample of cleared items.** The three passes are a filter, not a guarantee — treat the citation layer and the human spot-check as the real floor.
- **Re-verification trigger:** any regeneration of a synthetic entry voids its tag and re-runs the passes.

## 4. The net-input question — answered (and the two parts make it cleaner)

**Is a `net-input`-like system needed? Adopt its configurability and negotiation stance; reject its load-everything-into-context mechanism — and the two-part split maps onto the two halves of that answer exactly.**

| net-input trait | Needed? | Maps to |
|-----------------|---------|---------|
| Configurable corpus folder | ✅ Yes | The release model — bring-your-own corpus (a teacher supplies their own Part B) |
| Generates as proposals, never verdicts | ✅ Yes | The engine's spine — questions only, never answers |
| Whole corpus held in context | ⚠️ Split | **Part A: yes** (small enough to sit resident, net-input style). **Part B: no** (retrieved per turn — too large for context) |

So the architecture is a clean hybrid the original agent never had: **Part A behaves like net-input (resident method core); Part B behaves like retrieval (FTS over synthetic domain knowledge).**

---

## 5. Architecture

```
        ┌──────────────────────────────────────────────┐
        │  PART A — METHOD CORE  (context-resident)      │
        │  • Clean Language Principles (CC BY 4.0)        │
        │  • synthetic-verified method notes + Q-forms   │
        │  • Dewey inquiry-stage digest                  │
        │  • Plato/Aristotle elenchus exemplars (digest) │
        └──────────────────────────────────────────────┘
                              │ always in system prompt
 student turn ─▶ ┌──────────────┐    ▼    ┌──────────────────────────┐
                 │ RETRIEVE      │────────▶│ COMPOSE (Claude)         │
                 │ SQLite FTS5   │ passages│ • question(s) only       │
                 │ over PART B   │  + cites│ • ECHOES student's words │
                 │ (domain corpus)│        │ • grounded in retrieved  │
                 └──────────────┘         │   domain passages        │
                       ▲                  └──────────────────────────┘
        student's actual words + discipline tag         │
        (Part B speaks the student's language, so               ▼
         literal retrieval now WORKS)        ┌──────────────────────────┐
                                             │ VALIDATE (deterministic) │
                                             │ • reject answers/advice  │
                                             │ • must contain a question│
                                             │ • graceful degradation   │
                                             └──────────────────────────┘
                                                 pass→emit · fail→regen
                                                        ▼
                                             ┌──────────────────────────┐
                                             │ SESSION STORE (SQLite)   │
                                             │ new / branch / resume    │
                                             └──────────────────────────┘
```

### 5.1 Two "exact words" — do not conflate
- **Output literalism (Clean Language):** the *question emitted* echoes the student's own words. **Must hold** — enforced at COMPOSE.
- **Retrieval keying:** because **Part B is synthetic and modern**, the student's actual words now retrieve usefully against it (the failure mode that killed PD-book retrieval is gone). Part A method-selection can additionally key on concept terms (elenchus / definition / aporia / problem-framing). Both paths preserve output literalism.
- **Intent over precise vocabulary (`felt as:`):** each Part B entry carries a `felt as:` register — the colloquial/oblique/felt phrasings a student uses *before* they have the term — weighted in the FTS index beside `vocabulary`. So "the sign-up feels pushy" retrieves the *dark-patterns* tension without the words "dark pattern" (verified, 24 May 2026). This widens *retrieval keying* toward intent; it does **not** touch output literalism, and it stays pure exact-token FTS5 — the §5.2 no-embeddings invariant holds. Where retrieval still returns nothing, Part A's felt-sense move questions to help the learner surface their words, which then retrieve. **Status:** populated across **all 34 entries** — Interaction Design (16), the slow-design lens (8), and the critical-counterculture lens (10); verified by retrieval test (plain intent phrasings retrieve the right tension/lens without the precise term).

### 5.2 Retrieval — SQLite FTS5
- FTS5 over Part B as an external-content table; markdown stays source of truth, index sits beside it. One `.db`, no search daemon.
- `unicode61` tokeniser; conservative — exact tokens and quoted-phrase `MATCH`; `snippet()` for cited excerpts. Avoid stemming/synonyms so the index mirrors student vocabulary.
- WAL mode: many readers, occasional batch re-index when the synthetic corpus is regenerated. Comfortable on a small VPS.
- Embeddings are the documented fallback only if recall proves thin; not v1. ripgrep is dev/debug only, never the request path.
- **A second filter dimension, added v0.14.0 (12 August 2026): `register`.** Alongside the optional
  discipline filter, `retrieve()` takes `focus`; with `focus:'concept'` it excludes entries whose
  `**register:**` field is `making`. This is still exact-word FTS5 — the filter is a predicate on a
  column, never a semantic judgement at query time, and invariant #1 is untouched. ⚠️ The field is
  **absent** on most entries and absent means concept-side, i.e. the permissive default, so
  `verification/register-lint.test.mjs` fails when an entry's vocabulary reads as production and its
  register is left undecided.

### 5.3 Dialogue engine
> **🔵 SUPERSEDED IN PART (29 July 2026, v0.11.1).** Two claims below are historical: the engine runs on
> **OpenRouter → `google/gemini-3.1-flash-lite`** by default, not the Anthropic SDK (the "Claude only"
> convention was retired on cost, 22 June 2026); and "direction-recalibration every 3–4 exchanges" was
> built as a counter-driven rotation, measured, and **removed** — an aim arrives as a direction and does
> not displace the move the model just made. **The turn assembly as actually built is documented in
> [`dialogue.md`](dialogue.md)**, including the mechanisms that replaced it and the ones that were
> rejected. The paragraph is kept because the *shape* of the claim — a resident method core plus a
> never-answer constraint — still holds.

- Anthropic SDK, Claude only, temperature 0 on composition (matches diagnostics' narration step).
- System prompt = Part A method core + never-answer constraint + clarity/confusion tracking + direction-recalibration (every 3–4 exchanges) — original work, carried from the existing agent, ships freely.

### 5.3a The criticism surface takes a document, and plans over it (v0.15.0, 15 August 2026)

The enquiry surface's object is the learner's own edge, and the note above records why an imposed aim was measured and removed there: the learner's words decide the subject, so a direction does not displace the move just made. The criticism surface's object is different in kind — a **fixed external text with enumerable spots** — and that difference is the entire argument for planning here. It is an argument and not yet a measurement; `lib/plan.mjs` says so in its own header, and the way to settle it is `flow-probe.mjs` against the clock it replaced.

Either slot accepts up to **25,000 characters**, and a PDF is read in the browser tab rather than uploaded: hidden input, `FileReader`, vendored pdf.js, only extracted text travelling in the turn body exactly as a paste always has. The service never receives the file, so §5.5's privacy claims need no amendment at all.

Three computations sit between the located blurs and the question, all deterministic and all on the code side of the split in §1:

- **Affordance** — which lines of questioning this document supports, and over which regions. A station exists only where some passage triggers its rule, and the passages that triggered it become its territory, so a station cannot exist with nowhere to point. A text making no evidential claim gets no `verified` station.
- **Traversal** — which station is live, recomputed each turn by replaying the transcript the client posts back. It holds no state, which is what keeps it compatible with the ephemeral pivot. It advances early where the student's own words have reached the region and is capped by a dwell budget where they have not. It **ends** — the first thing on this surface able to distinguish a conversation that finished from one that was abandoned, which §5.5's `turn_depth` could never do alone.
- **Windowing** — only the live region enters the prompt verbatim; the rest arrives as opening words, bounded in characters. The artefact is anchored on every single turn, so this is not an optimisation but the precondition for the raised ceiling: without it the per-turn cost would scale with the document against a fixed lifetime ₹ cap.

The **engagement sensors** (`lib/reading.mjs`) decide only which region the traversal moves toward. They are never rendered, never persisted, never sent to the model as a characterisation, and never carried in the transcript download. Invariant #5 holds that the model never scores the learner and #6 forbids comparison and %-complete; what keeps a reading of *how far into the text a conversation has gone* on the right side of both is its consumer rather than its wording, so the verification suite asserts the consumer. The sensors also state their own limit: they observe typing, not reading, and cannot tell a close reader who answers briefly from a skimmer who quotes well.

A student's **project concept** may be brought alongside as context. It is never the object: the prompt says so and `validateCriticismOutput` enforces it, refusing a question that asks the student to justify their own concept and refusing one that anchors in no term of the text under question.

### 5.4 Output validation + graceful degradation
- Forbidden-pattern check every turn: no declarative answers, no advice ("you should"), no diagnosis, no summary-conclusion. Same discipline as the diagnostics' forbidden-string lists.
- **Enforced, not merely reported (24 July 2026 — `lib/guard.mjs`).** The RULES are `validateOutput` / `validateCriticismOutput` in `dialogue.mjs`; the CONSEQUENCE is here. The turn is generated in full and **buffered**, checked, and **regenerated once** with the guard's own reasons fed back as a correction the learner never sees; only an accepted question is sent. If both attempts breach, the least-bad is delivered **and marked flagged** — never a blank turn, never a silent breach. Both surfaces, each keeping its own rules (the critical register still permits a second question that opens a different door). *Until that date the question streamed to the learner first and was validated after, so a breach was reported and never prevented — the guard computed a judgement no code acted on.* Consequence: **the question is no longer streamed token by token** (a question cannot be withheld once read); it arrives whole after a beat. An empty generation fails `no question present` like any other breach, so the same retry is also the empty-response backstop. Guard counts per surface (counts only, no content) at `/api/admin/usage`.
- Must contain ≥1 question. Citations preferred but **not forced** — if Part B retrieval returns nothing relevant, the engine falls back to Part A method-core questioning and Behind the Curtain says *"no domain passage matched — questioning from method only."* It never loops, never fabricates a citation. (Advisor flag, resolved.)
- **Citations live in Behind the Curtain, never inside the question.** "Plato, Theaetetus 152a" stuffed into a question reads badly; the question stays clean.

### 5.5 Sessions + privacy
> **🔵 SUPERSEDED (11 July 2026 — the ephemeral pivot).** The open question below was settled far more
> strictly than the default it proposed. **No conversation is stored at all** — not expiring, not
> user-deletable, never written. Both surfaces are stateless: the client holds the transcript and sends
> it each turn, which is also why every mechanism in [`dialogue.md`](dialogue.md) is *replayed* rather
> than remembered. Quests, messages, signals and saved critiques were removed along with `/api/quests*`,
> and the database boot-purges. What remains is operational only: accounts, sessions, and the per-user
> spend ledger (turn counts + billed cost). Sign-in is Google OAuth only; the anonymous-cookie path is
> dev-only and returns 404 in production. Operator config: [`self-hosting.md`](self-hosting.md).

- SQLite + anonymous cookie (matches the three live demos' Turnstile + anonymous-cookie pattern). New / branch / resume preserved.
- **Privacy:** Socratic sessions can be intimate. One-line policy needed — default: sessions expire after N days and are user-deletable; no account, no linkage. (Decide at build.)

### 5.6 Frontend & deploy
- zetizeti's own painterly identity (`app/brand.md`); Behind the Curtain shows retrieved Part B passages + provenance (incl. `synthetic-verified` tag).
- **CC BY 4.0 attribution on a live surface** — an "About / Credits" link discoverable from the chat, not repo-only (CC BY requires attribution wherever the work appears).
- CapRover, `zetizeti.com`.

---

## 6. Release shape

- **Engine** (retrieval, dialogue loop, validation, sessions, UI) → original → **AGPL-3.0**.
- **Part A** → PD texts (with status notices) + CC BY 4.0 Principles (attributed) + synthetic-verified method notes (AGPL).
- **Part B** → **entirely zetizeti's own** (synthetic-verified) → AGPL or CC — **no third-party licence to track at all.** This is the cleanest part of the whole release.
- Bring-your-own-corpus: a teacher can supply their own Part B folder; the engine indexes it.

---

## 7. What synthetic-verified buys, and its one real risk

- **Buys:** copyright immunity, vocabulary match, full coverage control, register control.
- **Risk:** synthetic domain knowledge can be confidently wrong. **Verification is the load-bearing wall, not a formality.** A `synthetic-verified` tag is only worth what the verification behind it is worth. Under-verify and the engine grounds sharp questions in quiet errors. This is the single thing that decides whether Part B is an asset or a liability.

---

## 8. Open decisions (Prayas) + build steps

**Decisions:**
- ✅ **Part A composition (decision 1, 23 May)** — mixed: PD primary anchors + synthetic re-expression (§2, §2.1).
- ✅ **Verification (decision 3, 23 May)** — citations + three-pass Claude system (logical + philosophical parsing) + copyright-safety gate (§3a).
- ⬜ **Part B discipline scope** — which disciplines, in what order? (IxD first, given Anant?) — STILL OPEN.

**Build steps (when greenlit):**
- [ ] Fix Part B discipline list + entry schema
- [ ] Draft generation + verification pipeline; produce one discipline as a pilot
- [ ] Write Part A synthetic method notes + question-form library; pull PD anchors; record CC BY attribution string
- [ ] FTS5 schema + ingestion (markdown → external-content index)
- [ ] Port system prompt; SQLite sessions; Behind-the-Curtain with provenance tags
- [ ] Deploy clean to `zetizeti.com`
