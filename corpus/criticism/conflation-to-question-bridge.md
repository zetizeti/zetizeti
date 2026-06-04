# Bridge: from a located conflation to a question in criticism's language

> **Origin:** original prose, written for zetizeti. Re-expresses publicly-known ideas from the
> linguistics of evaluation and the philosophy of value; ideas re-expressed, never an author's
> expression. Citations verified against the originals (not from memory).
> **Part of the critical register.** Loaded only on the criticism surface, NOT resident in the
> Socratic prompt (it lives in `corpus/criticism/`, which `loadMethodCore` does not glob).
> **provenance:** pending — awaiting Prayas's Gate-4 sign-off (architecture.md §3a).

## What this bridge does

The engine locates; this bridge turns the located spot into a question. `lib/sensed.mjs` (behind the
curtain) reads a tagged text and returns `conflation_segment_ids` — the spots where description and
judgement blur. Those ids are deterministic and silent; they carry no language a learner should see.
This note is how a located spot becomes a Clean question in criticism's idiom — and, just as firmly,
how it does **not** become a verdict. The tool says *we sensed a blur here — what do you see?*, never
*the text got this wrong*. The locating is the tool's; the judgement is the student's.

## Why the blur is worth questioning at all (the grounding)

A "conflation" in the split-domain sense — a consequential call (judgement) held by the text (the
source decided it, not the reader) and carried as if it were plain description — is, in the linguistics of evaluation, an **evoked**
attitude: evaluation carried inside apparently factual, ideational meaning, so the reader absorbs the
verdict as information (Martin & White). It is worth questioning because such wording is not inert:
framing and evaluatively-loaded wording can shift how readers judge (Capraro & Vanzo; Levin et al. on
*attribute* framing) — a real but moderate and variable effect across studies (McDonald et al. 2021,
a meta-analysis of valence framing on moral judgement: d≈0.5, attenuating to d≈0.22 but surviving a
correction for publication bias) — and framing is argued to be a pervasive feature of language
(Flusberg et al.). And it cannot simply be dissolved by "just describe neutrally," because fact and
value can be entangled — words like "clean," "robust," "intuitive" can do evaluative work while
reading as properties (Hume's is/ought; Putnam's fact/value entanglement). (This grounding is stated
more fully in `critical-register.md`.) So the blur is a
real place where a decision was made for the reader without being marked as a decision — exactly the
deposited conclusion zetizeti exists to keep open.

## The mapping (located type → clean critical question)

Each row pairs what the engine located with a question the stone may ask. Plain and real — short, the
words a person says out loud, no framing devices, no preamble. Reuse the text's own word, point at the
spot, hand back the judging.

- **A text-held judgement** (`sdc_stage: judgement`, `held_by: text` — the found text is the holder,
  not the reader) — the text decided *this is good / this is the reason*. → *"Whose call is
  'best' — yours, or the text's?"* · *"Has it decided something for you here, or described?"*
- **Narration of a settled call** (`narration`, `held_by: text`) — a decision relayed as though it
  were already closed. → *"Is this settled — and if so, by whom? What would reopen it?"*
- **A fused description-and-judgement** (`mixed`) — describing and deciding in the same breath. →
  *"Is this describing, or deciding for you? Does the describing stop somewhere?"*
- **An evaluative word worn as description** (the evoked-attitude case) — "clean", "elegant",
  "seamless", "robust" presented as a property. → *"'[its word]' — names what's there, or approves of it?"*
- **A bare assertion of a contested claim** (the monoglossic case in appraisal's *engagement* — a
  claim stated flat, with no alternative in view: "best practice is…", "obviously…"). → *"Is this the only
  view — and should it be, here?"* · *"Who wouldn't call this obvious?"*

These are openings, not a script. The discipline of `clean-questioning.md` still governs the form
(use their words, advance the thought, one or two questions); this note only supplies the *aim* — to
point the question at the blur.

## The limit that keeps the bridge honest

Not every located spot is a smuggled verdict, and the tool must never imply that it is. A conflation
id marks where description and judgement *blur*, not where the text *erred* — the canon is explicit
that whether a located blur is a problem is the human's judgement, not the tool's. And the broader
guard holds: a critical question must still go somewhere (direction) and stay tethered to what the
student is trying to do (continuity), or it tips into reflexive suspicion — critique as a pose rather
than inquiry (Felski). The register affirms as readily as it suspects: the stone may as well ask what
a passage *does well* — where it commits honestly, or names a real property — as where it blurs;
pointing at a spot is not condemning it. And if a located spot does not earn a question that moves the
student's own reading forward, it is left alone.

---

**Sources** (verified against the originals): J. R. Martin & P. R. R. White, *The Language of
Evaluation: Appraisal in English* (Palgrave Macmillan, 2005) — inscribed vs evoked/invoked attitude;
monoglossic bare assertion under *engagement*. Stephen J. Flusberg et al., "The Psychology of
Framing: How Everyday Language Shapes the Way We Think, Feel, and Act" (*Psychological Science in the
Public Interest*, 2024) — framing as an unavoidable feature
of language that shapes thought. Valerio Capraro & Andrea Vanzo, "The power of moral words: Loaded language
generates framing effects…" (*Judgment and Decision Making*, 2019). Irwin P. Levin et al., "All
Frames Are Not Created Equal" (*Organizational Behavior and Human Decision Processes*, 1998) —
attribute framing shifts evaluation. David Hume, *A Treatise of Human Nature* (1739–40), Bk III Pt I
§I — is/ought. Hilary Putnam, *The Collapse of the Fact/Value Dichotomy and Other Essays* (Harvard
UP, 2002). Rita Felski, *The Limits of Critique* (2015) — the over-reach of suspicious reading.
