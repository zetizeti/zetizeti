# learning-mode.md — the stone as the one who does not know

*Spec. 2 August 2026, from my own note: a mode that can be switched on permanently, in which the
roles reverse — the stone is not questioning a student but conversing with a peer, trying to respond to
things it might not know enough about.*

*Read `position.md` first. This document depends entirely on the argument there and is not
comprehensible without it. Sibling to `spec.md` (enquiry) and the criticism surface.*

**Status: SPEC — except §4, which is BUILT and has no caller.** `app/lib/coverage.mjs` +
`app/test/coverage.test.mjs` (11 tests; full suite 136 pass) exist on branch `learning-coverage`
as of 2 August 2026, 22:07:11. Nothing imports them, `retrieval.mjs` is untouched, the enquiry path is
byte-identical, and nothing is deployed. Everything else in this document is still unbuilt.

---

## 1. The position, because a second mode with no reason is a feature

`position.md` refuses to put a sentence into an **understanding gap** — a gap in how somebody sees,
which closes only when their seeing changes, and which a delivered answer destroys without filling.
Every mechanic follows from that: the corpus is tensions rather than answers, the guard is code
rather than a request, the loop makes the question the thing that progresses.

**Learning mode does not weaken that refusal. It reverses whose gap is in the room.**

In enquiry, the learner has the gap and the tool must not fill it. In learning mode **the stone has
the gap** and the peer is the one who holds the material. The commitment is identical — do not
deposit a conclusion into somebody else's understanding — and it now binds in the other direction:
the stone must not perform an understanding it does not have, because a fluent account of something
half-grasped is exactly the category error `position.md` names, aimed at itself.

The whetstone metaphor survives and inverts. The stone still adds nothing. It is now the thing being
sharpened, and the peer is the surface.

⚠️ **This paragraph belongs in `position.md` itself before any code is written.** A mode whose
reason lives only in its own spec is decoration, by that document's own test.

## 2. What changes, and what does not

**Unchanged, and this is most of the system.** FTS5 retrieval on the peer's literal words
(`lib/retrieval.mjs`). The turn-readers in `lib/arc.mjs` — dwell, decline, correction. The
posture-not-diagnosis nudge policy (`lib/nudge.mjs`). Associative joins (`lib/assoc.mjs`). The SSE
contract, the pool, cohorts, metering, ephemerality. Part B, entirely.

**Part B is the strongest reason this is cheap.** The domain corpus is 265 *tensions* — the
disciplines' live contradictions. In enquiry they are grit to question against. In learning mode
they are precisely what one brings to a colleague: *here is a contradiction I cannot resolve, how do
you hold it?* Same material, reversed relation, no new corpus.

**New:**

| | |
|---|---|
| `corpus/learning/` | Part A for this mode — how to converse without concluding, and how to say where understanding runs out. Small, resident in the prompt, like `corpus/method/`. |
| a system prompt | Built by a sibling of `buildSystemPrompt`. Never a flag inside the existing one. |
| `lib/learning-guard.mjs` | §3. A sibling to `validateOutput`, not an edit of it. |
| a provenance filter in retrieval | §5. New behaviour, and the first thing in the project to need it. |
| routes | `POST /api/learning/open` + `/turn`, following the criticism precedent. |

🔴 **Do not modify `validateOutput` or `lib/dialogue.mjs`'s FORBIDDEN list.** Invariant #3 says
changing that function changes what the product *is*. The enquiry path must be byte-identical after
this ships. Criticism mode set the pattern: a sibling guard, not an extension.

## 3. The guard

Enquiry's guard flags output with no `?` or a forbidden pattern. A responding stone fails it every
turn, which is why learning mode needs its own rather than an exemption from that one.

🔴 **The rule, 2 August 2026, in my own words:**

> **Every turn must contain either a question or an explicit statement of where its understanding
> runs out — and it must never claim to hold something it does not.**

**What it forbids** is the model *performing competence at a peer who would notice*. Concretely, and
these are the deterministic checks:

- **No turn that is neither a question nor a stated limit.** A turn that only agrees, only
  paraphrases, or only appreciates is empty and is refused.
- **No claim carried on fluency.** Assertions that neither cite a retrieved tension nor mark
  themselves as uncertain. The tell is confident generality with nothing under it.
- **No conclusion on the peer's behalf.** The enquiry FORBIDDEN list's verdict shapes carry over —
  *you should*, *the answer is*, *to summarise*. The stone may say what it does not understand; it
  may not settle what the peer is working out.
- **No flattery as filler.** Agreement is not a turn.

**What it requires:** at least one of a question, or a sentence naming the edge of what the stone
holds. *I do not know how X survives contact with Y* is a legitimate whole turn. *That is
interesting, tell me more* is not.

**Enforcement follows `lib/guard.mjs` exactly** — buffer, check, repair once with the guard's own
reasons fed back, deliver, and flag visibly if a breach survives both attempts. **The turn is not
streamed token by token**, for the same reason enquiry's is not: a claim cannot be withheld after it
has been read. Do not restore streaming here either.

## 4. Retrieval cannot say *thin*, and §3 depends on it

🔴 **Measured 2 August 2026. This is a hole in §3 rather than a refinement of it.**

§3 requires every turn to carry a question **or a statement of where understanding runs out**, and
forbids claims carried on fluency. Nothing in the system can source that limit. `retrieve()` returns
up to `limit` rows whenever the query has any content token at all: `toMatchQuery` ORs the tokens,
bm25 ranks what comes back, and **the score is never read**. One common word shared with a
4,032-character entry returns a hit indistinguishable from a hit on the precise term.

**What the measurement showed, over the live index:**

| query | top hit | bm25 |
|---|---|---|
| *friction and the checkout flow* | `adversarial-design-and-agonism` | −11.27 |
| *mitochondrial membrane potential assay* | `emptiness-as-content` | −5.96 |
| *i guess probably sort of maybe* | `mapping-and-feedback` | −8.03 |

A query with no relation to design scores inside the same band as a real one, and pure hedging
scores better than the on-topic query's second and third hits. Against the corpus's own thirteen
named gap areas (§6's criterion — service design, healthcare, craft, sound, accessibility, labour,
care, repair, regulation) retrieval returned **nothing zero times out of thirteen**.

⚠️ **An earlier claim of mine credited exact-word retrieval with failing visibly where a semantic
one could not. That is wrong and is corrected here.** Both always return something. The difference
is that an exact-word hit can be explained afterwards, not that it can be refused.

**Why this is sharper for a residency than for a student.** §6 selects residents from *the areas the
corpus does not reach*, so the person most likely to trigger the failure is the person being
invited. And their deliverable is *locate the turn where the questioning failed* — so if the stone
asserts confidently from an incidental hit, what they will mark is a wrong claim, while the real
fault is that nothing said **no material here**. Their judgement gets spent on the symptom.

### The proposal — a coverage verdict, deterministic and literal

🔴 **A pure sibling function. `lib/retrieval.mjs` is NOT touched**, so invariant #1 stays exactly as
written and the enquiry path stays byte-identical. It takes the query text and the returned rows —
both already at the call site — and returns one of three states.

**Every step of the decision returns WORDS rather than a score.** Count the query's tokens that
appear in the top entry and are **informative**: below a corpus document-frequency threshold
(matching *design* proves nothing; matching *rafugar* proves a great deal), and **not in
`arc.mjs`'s `NONMATERIAL` list**, which this project already maintains for exactly this reason.

⚠️ That last exclusion is not housekeeping. **A hedge is rare in a declarative corpus and therefore
reads as informative, which is precisely backwards.** Measured without it, *"i think so maybe, the
matching could work on grades"* scored as well-grounded — on **think** and **maybe**.

| verdict | measured on | what the stone may do |
|---|---|---|
| `grounded` | 2+ informative matches | ask **and** assert |
| `oblique` | exactly 1 | **ask only** |
| `none` | 0 | ask only, and §3's stated-limit becomes REQUIRED |

**`oblique` is treated as `none` for assertion**, deliberately. §5's own logic is that a question
makes no claim and so may run on weaker ground, while an assertion may not. In a mode whose named
failure is performing understanding it does not have, the conservative side is the right one.

🔴 **The guard WITHHOLDS; it does not annotate.** `learning-guard.mjs` refuses a turn that asserts
on anything but `grounded`, and repairs once with the reason fed back, exactly as `lib/guard.mjs`
already does. A coverage verdict computed and displayed but never acted on is the
assigned-and-never-read shape the corrections ledger names, and this project has shipped that exact
fault once already.

### What this does NOT do, said here so it is not assumed later

- **Coverage is necessary, never sufficient.** A `grounded` hit can still be the wrong material to
  assert from. This detects a *thin* ground, not a *wrong* one.
- **The middle is genuinely ambiguous, and three states admit it.** At the extremes the
  discriminator is clean — hedging alone reads 0, on-topic design language reads 2 or more. At
  exactly 1 it holds both real hits (*regulation*, *service*, the corpus's own gap areas) and
  spurious ones (*potential* from a biology query, *second* from a baseball one). A two-state
  verdict would have to guess; three report the uncertainty instead of resolving it.
- **The thresholds were measured, not chosen.** `DF_CEILING` 0.15 and `GROUNDED_MIN` 2, against
  fifteen hand-labelled cases — six that should ground, nine that should not, the nine including
  four of the corpus's own gap areas, a biology query, a baseball one and three real hedging turns.
  **15/15.** Over the 73 real fixture utterances the split is **34 grounded · 30 oblique · 9 none**,
  so 39 of 73 would be blocked from assertion — a gate that bites without closing.
  ⚠️ Re-measure when the corpus grows: every threshold here is relative to 265 entries.

## 5. The provenance filter — new, and now unavoidable

Retrieval currently does not filter on provenance at all, deliberately: a `pending` entry grounds a
*question* perfectly well, because a question makes no claim, and the curtain discloses the state
per entry.

**Assertion is a different act.** If the stone says *the literature holds that…* from a pending
entry, it states framing I have not read as its own understanding. That is the one thing
invariant #0 exists to prevent, arriving by a route the invariant did not anticipate.

🔴 **So in learning mode, retrieval filters to `verified` for anything the stone ASSERTS from.** A
pending entry may still be used to *ask* — the mixed turn is allowed and is probably the common one.
The split is by speech act, not by turn.

⚠️ **This has a cost that is a design constraint, not a bug.** As of 9 August 2026 there are **70
verified entries and 195 pending**, so a learning mode shipped today would converse from about a
quarter of the corpus. That is an argument for sequencing — Gate-4 first — not for weakening the
filter.

## 6. Turning it on

**Per-user and persistent.** The service is stateless, so the only thing that survives a session is
cohort membership: `tierForUser` in `lib/cohorts.mjs` is described as the ONLY classifier and every
path asks it. **A learning-mode flag belongs there**, not in a new mechanism.

🔴 **Not user-selectable.** A mode that treats the user as a peer is a claim about that user. Left
open, a first-year flips it and the tool starts conversing instead of questioning — the one change
that would erode the product outright. So it is allowlist-gated.

**And the allowlisted population already exists: residents.** Learning mode may simply *be* what a
resident's surface is. That also makes the residency's deliverable easier to give, since a peer who
is being asked is already in the posture of saying what the instrument does not understand.

## 7. What it must never become

- **A chatbot with a humble voice.** The stated-limit requirement is not a hedging style; it is a
  refusal to assert past what is held. If the guard starts passing turns whose uncertainty is
  decorative, the guard is wrong.
- **An answering mode with extra steps.** If a peer can reliably extract conclusions by asking
  directly, this has become the thing the tool was built against.
- **A second product.** One tool, one position, two relations to it.

## 8. Open, and not to be guessed at

**The peer asks the stone a direct question.** *So what do you think?* The stone must either answer,
violating the position, or deflect, which to a peer is evasive rather than disciplined. This is the
sharpest unresolved case and it will arrive in the first session. Neither horn is obviously right,
and it is a decision rather than a design detail.

**Whether the corpus is enough.** Part B holds tensions, not the stone's own material. What the
stone brings to a peer is somebody else's contradiction, which may read as ventriloquism rather than
as a colleague thinking.

**Whether "learning" is honest.** Nothing is retained — the service is ephemeral by invariant. The
stone does not learn across sessions and must never imply it does. The name may need to change.

## 9. Build order

1. The `position.md` paragraph. Nothing else starts until the reason is written down.
2. `corpus/learning/` — Part A for this mode, prose, and mine to judge.
3. `lib/learning-guard.mjs` + its tests, measured on real turns before it is trusted, per the way
   every guard rule here has been measured before being judged.
4. **The coverage verdict (§4) and the guard's use of it.** Ahead of the provenance filter, because
   that filter refines *which* entries may ground an assertion while this decides *whether any may*
   — a filter over a set that should not be asserted from at all is the wrong order. Thresholds
   measured on the fixtures, not chosen.
5. The provenance filter in retrieval, behind the mode flag only.
6. `tierForUser` flag, allowlisted.
7. Routes and surface. `frontend-design-prayas` for any UI, both fixtures replayed if the enquiry
   register is touched at all.
8. Docs updated in the same pass — `architecture.md`, `docs/ops/status.md`, this file's status line.
