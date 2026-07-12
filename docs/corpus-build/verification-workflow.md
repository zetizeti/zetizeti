# verification-workflow.md — how a corpus entry earns its place

> **This is a tool for students. A fabricated or misattributed source leads them astray.** No
> entry is presented to a learner as settled grounding until it has passed every gate below.
> This is the operating discipline behind `CLAUDE.md` invariant #0 and architecture.md §3a.

## The rule

**Never cite from memory or "confidence." Every citation is verified against a real source.** A
plausible-sounding reference is exactly the failure mode — the more canonical it feels, the more it
must still be checked.

## The gates (each candidate entry passes ALL before `verified`)

1. **Citation authenticity** — `citation-verifier` agent. Does the work exist? Are author, title,
   year, venue correct and correctly attributed? Flag fabricated / misattributed / wrong-year.
   **MANDATORY, and run live against Crossref / publisher records — never from memory or from a
   Perplexity answer.** Perplexity itself fabricates plausible citations: on 24 May 2026 it returned
   a real paper under entirely invented authorship (Moroni & Cavalieri for what is actually Mears &
   Summers), a non-existent subtitle with the wrong co-author, and wrong page ranges — all caught
   only here. The more canonical a reference feels, the more it must still be checked. *Output recorded.*
2. **Framing check** — Perplexity (≥1 confirmation per non-obvious claim); Consensus MCP for any
   empirical claim. **This is the gate the citation check does NOT cover:** that what the entry
   *says the source argues* is true to it — not a popular misreading, not a conflation, not a
   paraphrase passed off as a quote. *This is where most remaining fabrication risk lives.*
3. **Three-pass** (architecture.md §3a) — three *independent*, adversarial, temp-0 passes:
   factual/citation grounding · logical parsing · philosophical parsing (descriptive-vs-evaluative
   collapse, hidden verdicts, position drift) + the copyright-safety gate.
4. **Human sign-off — Prayas.** The final gate. He knows these fields; he confirms the framing.

Until all four pass: **`provenance: pending`** in the entry. The retrieval surfaces it; the
behind-the-curtain marks each tension `✓ verified` or `◔ synthetic seed · citation verified,
framing pending`. **Pending entries are indexed but must NOT be read by a learner as settled
grounding** — the marker is the honesty.

## The `framing_confidence` field = the human verification queue

Every entry declares `framing_confidence: high | medium | low` with a one-line *why*. This is what
Prayas scans: **high** = the well-known central thesis, confirm quickly; **medium** = synthesises
across the work, read closely against the cited chapters; **low** = don't ship, or rewrite. If an
entry can't honestly claim at least medium, it is dropped, not shipped.

## Quotes vs ideas

Attribute *ideas* to works; do not present paraphrases as verbatim quotations. Flagged by the
verifier (24 May 2026): Drucker's "the purpose of a business is to create a customer" and Berger's
"the image is never neutral" are paraphrased *ideas*, not quotes — frame as ideas, no quotation marks.

## Recorded corrections (apply before citing)

- **Nigel Cross, *Designerly Ways of Knowing* (book, 2006)** — publisher is **Springer-Verlag
  London**, NOT Birkhäuser (citation-verifier, 24 May 2026; Springer DOI 10.1007/1-84628-301-9). The
  1982 *Design Studies* article (vol. 3, no. 4, pp. 221–227) is correct. Apply when the
  transdisciplinary entry that cites Cross is written.

- **Manufacturing lens — Pass 4 catches & corrections (citation-verifier, 24 May 2026).** Perplexity
  supplied five candidate citations; only two were clean. Corrections, all confirmed against Crossref/publisher:
  - *"Manufacturing for Design: A sustaining approach to drive manufacturing process evolution, then
    innovation"* — authors are **Laine Mears & Joshua Summers**, *Procedia Manufacturing* 48 (2020)
    1136–1142, doi:10.1016/j.promfg.2020.05.155. Perplexity had **fabricated** the authorship as
    "Moroni & Cavalieri" (real researchers, uninvolved) — do NOT use that attribution.
  - Rangaswamy's ICTD-2013 jugaad paper — co-author is **Melissa Densmore, NOT Nithya Sambasivan**;
    real subtitle *"ICTD and the tensions of appropriation, innovation and utility"* (the
    "...Innovation in India" subtitle does not exist); doi:10.1145/2517899.2517938. *(Not used in the
    live entries; recorded so the conflation is not repeated.)*
  - Ananthram & Chan, *Asia Pacific Journal of Management* 38(3), 2021 — pages **1031–1060** (not 879–910).
  - **Confirmed safe to cite as corrected:** Gupta, *Grassroots Innovation: Minds on the Margin Are
    Not Marginal Minds* (Random House India, 2016; Portfolio reissue 2019). Smith, Fressoli, Abrol,
    Arond & Ely, *Grassroots Innovation Movements* (Routledge, 2017). Smith, Fressoli & Thomas,
    "Grassroots innovation movements: challenges and contributions," *J. Cleaner Production* 63 (2014)
    114–124, doi:10.1016/j.jclepro.2012.12.025. Kudva & Kamath, **"Against Jugaad: Making a Case for
    Design as Innovation,"** *Ekistics and The New Habitat* 80(2) (2021) 47–57,
    doi:10.53910/26531313-E2020802560 (engages the Eames *India Report*, 1958). Ananthram & Chan,
    "The paradox of responsible Jugaad innovation," *J. Open Innovation* 11(4) (2025) art. 100672,
    doi:10.1016/j.joitmc.2025.100672. Radjou, Prabhu & Ahuja, *Jugaad Innovation* (Jossey-Bass/Wiley,
    2012) and Boothroyd, Dewhurst & Knight, *Product Design for Manufacture and Assembly* (CRC Press,
    3rd ed., 2010) — both clean.

- **Pass-4 re-sweep of the 34 "verified" entries (24 May 2026) — corrections to APPLY to the live
  entries** (most of ~54 citations passed live Crossref/publisher checks; these are the exceptions):
  - interaction-design `modes-and-modelessness` — Tesler title clause is "…and **cut/copy-paste**"
    (not "Cut, Copy, Paste"); year/venue confirmed *interactions* 19(4), 2012 → clear the standing self-flag.
  - interaction-design `ironies-of-automation` — Bainbridge confirmed *Automatica* 19(6), 1983,
    **pp. 775–779** → clear the standing self-flag.
  - critical-counterculture `affirmative-vs-critical-design` — Pierce, "Working by Not Quite Working…"
    is a **2015 PhD dissertation, Carnegie Mellon University** (DOI 10.1184/R1/6724283.v1), NOT a 2018
    paper. Fix year + label (or substitute a peer-reviewed Pierce piece).
  - critical-counterculture `whose-values-feminist-hci` — Croon, "Thinking with care in HCI" is
    **single-authored by Anna Croon** (*Feminist Theory* 23(2), 232–246, 2022) → remove "et al."
  - slow-design `restraint-is-not-neutral` — Warde: real title has **no "Why"** —
    "The Crystal Goblet, or Printing Should Be Invisible"; the "Crystal Goblet" title attaches to the
    1932 pamphlet / 1955 collection, not the 1930 lecture (lecture title: "Printing Should Be Invisible").
    Align title + year.
  - slow-design `who-slowness-excludes` & `slow-on-the-phone` — Honoré subtitle is a **hybrid matching
    no edition**; use a real edition verbatim — US: *In Praise of Slowness: Challenging the Cult of
    Speed* (2004). Fix both entries.
  - Disclosures (maintainer's call, not errors): Bhargava & Velasquez (cited 2020 online-first; print
    31(3), 2021); Valasek (cited 2021 online-first; print 10(2), 2022).

- **Two pending-item closures (citation-verifier, 24 May 2026):**
  - Kudva & Kamath, "Against Jugaad" — the quoted phrase "neither quality design nor frugal
    innovation" is **verbatim-confirmed** in the article's abstract (DOI
    10.53910/26531313-E2020802560). Quotation marks stand.
  - Bierut, "Ten Footnotes to a Manifesto," in *Seventy-nine Short Essays on Design* (Princeton
    Architectural Press, **2007, 1st ed.** — not the 2012 reprint; title is "*to* a Manifesto",
    Pentagram's "on a Manifesto" is a typo) — **verified real** and confirmed as a critical pushback
    on First Things First that defends commercial-design legitimacy. Added to `first-things-first` as
    the commercial-pole counter-source, closing its source asymmetry.

## Status (24 May 2026)

- **Verified (live grounding): 34** — the Interaction Design (16) + slow-design (8) +
  critical-counterculture (10) corpus; three-pass + Consensus-backed (`verification-consensus-backing.md`,
  `verification-slowdesign-critical.md`).
- **Pending (this batch): 10** — the entrepreneurship/business-of-design lens (4) + one seed each for
  Communication, Product, Space, Moving Image, Sustainable Fashion, Transdisciplinary. **Citations
  verified** (citation-verifier + Perplexity); **framings confirmed/flagged**; awaiting the three-pass
  + Prayas's sign-off. Marked `pending`; curtain-flagged.
- **The goal — ~34 entries per discipline** — is a research *programme*: each new entry runs the four
  gates. Verification sets the pace, not breadth. The pending entries must not silently become "the
  corpus" through familiarity; this debt is tracked here.

## Confirmed source pool (safe to cite, as-is unless noted)

Entrepreneurship/business-of-design: Christensen *Innovator's Dilemma* (1997) · Drucker *Practice of
Management* (1954, idea) · Ries *Lean Startup* (2011) · Blank *Four Steps to the Epiphany* (2005) ·
Sarasvathy AMR (2001) · Knight *Risk, Uncertainty and Profit* (1921) · Schumpeter *Capitalism,
Socialism and Democracy* (1942) · Thiel & Masters *Zero to One* (2014) · Schumacher *Small Is
Beautiful* (1973) · Yunus *Banker to the Poor* (1999) · Moore *Crossing the Chasm* (1991) ·
Osterwalder & Pigneur *Business Model Generation* (2010) · Monteiro *Design Is a Job* (2012) · Enns
*The Win Without Pitching Manifesto* (2010) & *Pricing Creativity* (2018) · Martin *The Design of
Business* (2009) · Brown *Change by Design* (2009) · Shaughnessy *How to Be a Graphic Designer,
Without Losing Your Soul* (2005).
Disciplines: Bringhurst (1992) · Lupton (2004) · Berger (1972, idea) · Tufte (1983) · Papanek (1971)
· Norman *Emotional Design* (2004) · Sullivan (1896, "form *ever* follows function") · Zumthor (2006)
· Pallasmaa (1996) · Lynch (1960) · Eisenstein (1949, ed. Leyda) · Mulvey *Screen* 16(3) (1975) ·
Chion (1994) · Fletcher (2008) · McDonough & Braungart (2002) · Frayling (1993) · Cross (1982 article;
2006 book — Springer, see correction above).
