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

## [0.12.0] — 2026-08-10

### The AI Club studio strip moves to the header, and stops waiting for a wallet

**The strip is now in the top nav**, beside `about`, where the other three studio apps carry theirs.
A student crossing between four tools should not hunt for the way out in a different place on each.
Turquoise at full chroma, marking the group as OUTBOUND — these links leave zetizeti — using the same
mono grammar and the same shared hover as `.nav-author` (vermilion) and `.nav-admin` (gold).

**The gate was split, and this is the substantive fix.** `loadStudioFooter` gated everything on
`/api/usage`, which returns ok only when the credit engine **vends a key** and that key reports a
numeric cap. So a student who had signed in but not yet registered an OpenRouter key saw nothing at
all — no siblings, no way across. That is the state every member of the cohort is in on their first
day, which is exactly when the strip matters most, because it is how they learn the other tools
exist. Identity and wallet are different questions:

- **identity** — `/api/pool` → `{ tier:'ai-club', aiClub:true }`, a membership fact needing no key.
  Gates the strip.
- **wallet** — `/api/usage`, needing a resolved key with a cap. Gates the credit meter, and nothing else.

A student is a student before they have a wallet.

**The footer is now the wallet and nothing else** — the sibling strip and its `fs-cap` styling are
removed rather than left dormant. With no wallet the footer does not render at all; an empty bordered
band reads as something failing to load.

### Corpus

Three game-design entries signed off at Gate-4 on 9 August and carried in this release —
`fun-as-learning`, `extrinsic-rewards-and-gamification`, `player-types`. **265 entries, 192 pending.**

### Configuration repaired on the deployed instance

- 🔴 **`ZETIZETI_CREDIT_ENGINE_URL` pointed at `credit-engine.anant.prayasabhinav.net`**, dead since the
  AI Club domain move of 4 August. Any AI Club student would have resolved to the tier and then failed
  to get a key, with the failure reading as a credit problem rather than a dead hostname. Repointed to
  `credit-engine.aiclub.anu.edu.in`, and zetizeti's existing tool token verified against it.
- **`ZETIZETI_AICLUB_ALLOWLIST` set** — 26 emails: the enrolled Monsoon 2026 cohort plus two operator
  accounts. It had been unset since the cohort was designed, so `emailIsAiClub()` returned false for
  everybody and the AI Club tier could never be reached.
- **`STUDIO_URL_ZETIZETI` / `_MINDMAPS` / `_VISUALGEN` / `_DASHBOARD` set** — all four were empty, so
  the strip would have rendered labels with no links even had it been visible.

## [0.11.6] — 2026-08-09

Twenty more corpus entries carry a human sign-off. **70 of 265 verified, 195 pending.**

### Changed
- **Gate-4 sign-off, batch of twenty** — `critical-counterculture-design.md` (10),
  `entrepreneurship-lens.md` (7), `game-design.md` (3), each flipped through
  `scripts/signoff-web.mjs` and logged with a second-precision timestamp in
  `docs/corpus-build/signoff-log.md`. What changes for a learner is the curtain: those twenty now read
  *framing verified* rather than *framing pending verification*. Retrieval is untouched — it has never
  filtered on provenance, and pending entries ground questions exactly as verified ones do
  (invariant #0).
- **The counts, everywhere they were asserted.** `CLAUDE.md` (twice), `docs/concept/learning-mode.md`,
  and the tracker's resume point all stated 50 verified / 215 pending. `learning-mode.md` also carried
  the figure in prose — a learning mode would converse from "a fifth of the corpus", now about a
  quarter — which is the kind of number that goes stale in silence because nothing rebuilds it.

### Fixed
- **A comment in `lib/dialogue.mjs` claiming "265 verified design tensions".** The curtain has never
  said that. All 265 have verified *citations*; 70 have a signed-off *framing*. The comment asserted
  the stronger of the two.
- **Two version numbers that had drifted from the tags.** `app/package.json` read `0.11.4` with
  `v0.11.5` already tagged, and `app/package-lock.json` had read `0.9.3` since that release. Both now
  say `0.11.6`. Neither is load-bearing — the build string comes from `git describe` — which is
  precisely why they went stale unnoticed: nothing consumes them, so nothing failed.
- **The local test suite was running on a damaged dependency tree.** Seven tests failed on a
  `better_sqlite3.node` that was not a valid mach-o file, and one on a source file simply absent from
  `compromise`. Dropbox had been syncing `app/node_modules` and had left a 488 MB `node_modules 2`
  duplicate beside it. No code was involved and production was never affected — the image builds its
  own native modules and the tar excludes `node_modules` — but "all tests pass" was unavailable until
  it was repaired. Both trees are now marked `com.dropbox.ignored`, which is per-machine and does not
  sync, so the Linux box needs the same treatment.

### Also in this release
The four commits that landed after v0.11.5 and were never tagged: first person in the two files
heading for the public repo, the deploy runbook repointed from `blevn` to `myplaceholder` with the
publish guard hardened against a rename, machine paths swept out of the published tree, and two stale
assertions fixed alongside the `verification/` suite that `npm test` had never run.

## [0.11.5] — 2026-08-02

*Written retrospectively on 9 August 2026: v0.11.5 was tagged with no changelog entry, and
`app/package.json` was left reading `0.11.4`. Reconstructed from the tag's own history.*

### Added
- **`scripts/signoff-web.mjs`** — the Gate-4 sign-off bench in a browser, local-only on 127.0.0.1,
  with whole-corpus view, bulk selection, bookmarks and revert. Built because walking 231 pending
  entries one at a time in a terminal is hopeless. It changes nothing by itself; every flip is an
  explicit action, written into `corpus/domain/*.md` and appended to the sign-off log.
- **`lib/coverage.mjs`** — retrieval that can report a thin ground, with its own test.
- **`docs/concept/learning-mode.md`**, the residency terms, the not-knowing text, and three method
  drafts.

### Fixed
- **The provenance correction.** 18 entries carried no `provenance` line at all, and `retrieval.mjs`
  parsed a missing line as verified — so the curtain told students *framing verified* for entries
  nobody had read. Prayas: *"no legacy is pending."* All 18 now declare `pending` and every entry
  states its state explicitly. A default that silently upgrades is worse than a missing field, because
  nothing fails and nobody looks. *(The sign-off count for that day is stated inconsistently across the
  commit message, the tracker banner and memory — 34 in one place, 16 in another. Not reconciled here;
  the 2 August figure of 50 `verified` lines is what the files themselves said.)*

## [0.11.4] — 2026-07-30

The tool can now see the one outcome it was never able to observe: **whether a learner stayed.**

### Added
- **The survival curve (`turn_depth`).** Production records how deep each conversation got — one row per
  `(day, surface, version, depth)` with a count, surfaced at `/api/admin/usage` as a curve plus per-version
  summaries. **The drop between depth *N* and *N+1* is exactly the number of conversations that ended on
  the *N*th question**, which makes it a conversation-length distribution that never records a
  conversation.
  - **No session identifier exists, and none is needed.** The service is stateless, so the transcript the
    browser posts each turn already carries its own depth.
  - **No user column, no text.** Five columns, and a unit test asserts none of them can name a person or
    hold content — strictly more private than the spend ledger beside it, which does hold a user id. It is
    therefore operational rather than content, and is **not** boot-purged; purging it would destroy the
    only cross-release comparison the project has.
  - **Written on a delivered turn only.** A refused turn — no access, cap reached, empty generation — would
    otherwise inflate precisely the depth where people leave, and blame the questioning for what the budget
    did.
  - Keyed by build version, so **a release that loses people one turn earlier is visible here and nowhere
    else.**

  *Why this was the thing to build:* both probe axes read a *completed* transcript and a play-acted student
  never closes a tab, so offline scoring cannot see abandonment at all; and `pool_spend` is keyed
  `(day, user_id)`, so one ten-turn conversation and five two-turn conversations were the same row. The two
  clearest signals this tool has ever received — a student stopping at a manufactured association bridge,
  another at a two-box menu a fortnight later — both arrived as messages from people who happened to
  mention it, and were invisible to every instrument here.

  **What it does not do:** it says *where* people stop, never *why*, and it needs weeks of real use before a
  curve means anything. On day one it is four rows.

### Fixed
- **`noteTurnDepth` no longer defaults a missing depth to 1.** A destructuring default of `1` would turn a
  caller passing `depth: undefined` — a renamed field, a refactor — into a silently recorded depth-1 turn,
  inflating the first bucket and making retention look *worse* than it is. A missing depth is a programming
  error and now records nothing. Caught by the unit test, not by reading; every other nonsense value
  already failed the range check.

### Measured
- **Actor/party traversal — not built, and the question is recorded as OPEN rather than settled.** After
  v0.11.3 one thing stayed unresolved: two students had stopped on a question whose *shape* the tool chose,
  and the suspicion was that both were symptoms of the tool having no notion of the **parties** in a
  proposal. Rotating the party was measured over **178 probe conversations** and came back
  null-to-**inverted**: sessions holding one party for four straight turns produced *longer* replies (+2.7%
  vs −3.0%) and *fewer* refusals (11.3% vs 12.9%), and 24.7% of sessions do it anyway.
  **The load-bearing caveat: those conversations are a play-acted student, not people** — and the 55
  real-transcript *replays* had to be excluded outright, because a replayed reply is fixed and cannot react
  to what was asked, so including it drags any effect toward zero by construction. A model does not close
  the tab. So this is not a null that settles the question; it is a demonstration that **the probe harness
  cannot answer it**, which is what sent us to build the survival curve above. *(An earlier draft of these
  notes reported +0.8%/13.4% over all 233 conversations and called it settled. Both figures were diluted by
  the fixed-reply replays; correcting the sample inverted the direction rather than rescuing the
  hypothesis.)*

### Documented
- **`dialogue.md`** — the three shapes a question may not take (the menu, the closed question, the
  interpreting preamble), each with the evidence and, for the menu, the upstream cause in the approach
  that offered the model an alternation. Actor traversal added to the removed-mechanisms table.
- **`evaluation.md`** — a fourth expensive rule: *a rule measured through a composite verdict reports
  someone else's number*. Plus a new section, **"What this apparatus cannot see, and it is the important
  part"**.
- **`CLAUDE.md`, `status.md`** — current state, and the ship rule that the CHANGELOG is not
  documentation.

### Documented
- **`dialogue.md`** — the three shapes a question may not take (the menu, the closed question, the
  interpreting preamble), each with its evidence and, for the menu, the upstream cause in the approach that
  offered the model an alternation. Actor traversal added to the removed-mechanisms table.
- **`evaluation.md`** — a fifth expensive rule (*a rule measured through a composite verdict reports
  someone else's number*), and a new closing section on the limit of a simulated student and the instrument
  that answers it.
- **`CLAUDE.md`, `status.md`** — current state, and the rule that a ship is not finished until the docs
  that describe the behaviour are updated: the CHANGELOG is not documentation.

## [0.11.3] — 2026-07-30

A student finished a ten-turn enquiry on v0.11.2, saved the transcript, and asked for one thing:
*"if I wanted to continue this conversation.. there should be an option to upload the downloaded
transcript so that the previous conversation can be continued"*. Reading her session for that request
turned up three question shapes worth refusing, none of them steered by any aim or form — the stone
falls into them on its own.

### Added
- **Continue from a saved transcript.** Pick up the `.md` you saved and the conversation carries on
  from where it stopped. **The ephemeral promise is untouched, and this is why:** the service never
  held the thread in the first place — the browser holds it and posts `history[]` on every turn — so
  restoring one is just filling that array from a file the student themselves kept. The file is read
  with `FileReader` in the tab, reaches no endpoint, and is stored nowhere. The student becomes the
  custodian of their own record, which is arguably a firmer version of the promise than before.
  The parse is the exact inverse of the download, so the round trip closes on itself; a file that is
  not a zetizeti transcript is refused in a sentence rather than half-loaded.

### Fixed
- **The either/or guard now catches a polar pair.** *"…bluffing **before or after** the transaction is
  recorded?"* is a two-box menu exactly as much as *"is it X or Y"*, and the v0.11.2 regex — which
  wanted a comma or an auxiliary on the second limb — let it through. **It was the last question of her
  session and where she stopped.** Both limbs naming opposite ends of one axis is what makes a menu;
  *"readers or creators"* is two different things and still passes. The **root cause was upstream**: the
  approach itself read *"ask what happens JUST BEFORE it, or just after"*, offering the model an
  alternation that it duly passed on to the learner. Both ends fixed, because a steering line that can
  be misread will be.
- **A question answerable "yes" is refused and re-asked open.** Three of her ten opened with an
  auxiliary, and both of the session's thin replies followed one (*"yes, by identifying behavioural
  cues"*). Its longest, sharpest replies followed the open moves the 1,938-pair measurement already
  favoured. Nothing in the steering asks for the closed shape, so the guard is not fighting the aim
  layer — it is catching a default.
- **The warmth clause may only say back words the learner used.** One question was prefaced with *"that
  focus on behavioural cues is shifting the log from a record of the past to a tool for the next
  interaction"* — the stone's reading of her idea, handed over as settled before she was asked anything.
  Same failure as v0.11.2's invent-no-premise rule, one clause earlier. Warmth is not banned; it is the
  largest measured lever there is. What is refused is a clause whose content words are mostly not hers.
- **Restoring a transcript lands on the last turn.** Twenty appends started twenty smooth scrolls toward
  `document.body.scrollHeight`, which overshoots badly here because the fixed painterly layers make the
  document far taller than its content — the reader ended up parked in empty ground with the final
  question hidden behind the composer.
- **`.env.example` now says guest needs the personal allowlist too.** The guest signs in as
  `guest@localhost` and the pool tiers are closed by default, so without both lines every turn on the
  auth-less local build is refused `NO_ACCESS` before reaching the model — which defeats the one thing
  that build exists for.

### Measured
Firing rates over **5,256 questions from 42 logged probe runs**, per rule, before any of them was
judged (full table in `docs/ops/flow-probe-log.md`): widened binary **3.7%** (+4 questions, all true
positives), closed question **4.2%**, preamble rule **1.3%**. The preamble rule's first cut fired at
3.7% and was **rejected on the evidence** — it was catching the *"that distinction … is doing real
work"* warmth motif, a clause made of the learner's own material. Neutralising appraisal vocabulary
retargeted it onto the tool narrating what an idea is becoming.

The first audit was itself wrong: it read `validateOutput`'s whole verdict rather than each rule alone,
so pre-existing `FORBIDDEN` hits were counted as the widening's. Corrected before any rule was judged.

**Not changed, reported instead** (invariant #3 — the FORBIDDEN list is not a silent edit): that list
fires 4 times in 5,256 questions and all four are false positives — `\byou need to\b` catching the open
question *"What would you need to know…"*, and quoted UI labels tripping patterns `stripQuoted` is never
applied to.

## [0.11.2] — 2026-07-29

The first feedback on v0.11.1, from a cohort student: *"cross questioning wrong items… connecting one
thing with another which is unnecessary or totally unrelated."* Replaying the mechanisms over her seven
turns found a join that would not let go.

### Fixed
- **A join anchor is now spent once used.** Turns 5, 6 and 7 of her session all joined FROM the same
  first reply, welding it to whatever she had just said, until the model manufactured a bridge between
  them — *"the exact moment when a creator's responsibility shifts from the older volumes to the one
  locked under an ad wall"* — a shift she never described. She stopped there. The cause: **discharge
  existed only in the Jung `charge` selector**, which had been measured and rejected; the shipped `open`
  selector had none, and the already-joined gate blocks only a repeat of the exact *pair*, so an early
  turn stayed reusable for ever against a fresh partner. Every selector now discharges, with revival
  requiring a genuine return — **half** the anchor's material words back in the learner's newest reply.
  (Written first as "two shared words", which is trivial in coherent speech and brought the retired
  anchor straight back; the unit test caught it, reading did not — the same count-where-a-proportion-was-
  needed failure as the join-overlap gate.)
- **Precision may no longer invent a premise.** The particular asked for must belong to something the
  learner actually said — never the exact moment of a change, shift or trade-off they never described. A
  pointed question about an event that never happened is worse than a vague one, because its precision
  makes the invention sound established.
- **The either/or demand is refused at the guard.** *"Is it X, or is it Y?"* hands the learner a menu
  instead of asking what is so; it ran at 2 of 7 turns in the same session, and at 61% the moment the
  form rotation was ever removed. Deliberately narrow — an offered *choice*, not the ordinary conjunction
  (*"what would have to be true for readers or creators to stay"* still passes), verified both ways.

### Measured
Three real-student fixtures now, per the standing rule (one terse, one dense, one abandoned early).

**Against the build she actually ran (v0.11.1):** the gains are in JOIN QUALITY, which is what she
complained about — comics fixture "When…" 14% → 0%, joins 4 → 3 with all visible; dense fixture uptake
89% → 94%. **Her real session already had 0 consecutive opener repeats and one "When…" in seven** — the
opener ban shipped in v0.11.1 and worked. An earlier draft of these notes compared against the v0.11.0
config and so re-counted a gain production had already made; corrected here, and the probe's baseline
variant renamed to the version it actually is.

Against the v0.11.0 config, for the record: "When…" openers 78/94/71% → 15/11/14%; consecutive opener
repeats 60/88/33% → 0%; interrogation-shaped questions 15% → 2% on the terse fixture; joins visible
10/13 → 13/13 on the dense one. Live, no regression on either persona: the analytical student's replies grow slightly and
trend up, the expressive student's confusion falls to zero and visible joins rise from 1.3/4.0 to
3.3/3.3. 97/97 tests, two new.

### Known, and deliberately not built
The same transcript is **lopsided in a way the tool cannot see**: the student places responsibility on
the creator, twice, while the platform she also defined takes a share of the revenue. The questioning
circled that nerve twice and asked the wrong party each time — it has no notion of the *parties* in a
proposal, only of words. Actor-level reading is the standing open question; it changes what the tool
anchors on, which is the class of decision that cost a week in v0.10.1, so it waits for a conversation.

## [0.11.1] — 2026-07-29

The first real test of v0.11.0 (a tester's two sessions, sent with written notes at 2 AM) found the
frame the metrics could not see, and three structural gaps. This release closes all of them.

### Fixed
- **The opener anaphora.** 22 of 24 questions in her sessions opened "When …" while both sameness
  metrics read clean — one compares four-word prefixes, the other drops stopwords; a one-word frame was
  invisible to each. The question now may not open with the word either of the two previous questions
  opened with: named proactively in the turn context, enforced in the guard (`questionOpener`,
  `banOpeners`). Measured on her real replies: **When 94→6–17%, consecutive opener repeats 88→0%.**
- **Join visibility.** Joins fired on 13 of 17 turns of her session and were visible in none — a
  steering block the model may ignore is not steering (the aim-block lesson, relearned). A join now
  must reuse at least one of the learner's content words from EACH quoted side (`mustHold`), enforced at
  the guard: **13–15 of 15 visible** on replay.
- **The dead hedging branch.** `conviction` was computed on the GOAL STRING — constant for an entire
  session, so answering "i think so / i feel like" changed nothing, which was precisely the experiment
  she had planned. It now reads sustained hedging across the last three replies and recovers when the
  hedging stops. Her epistemics are honoured in the lexicons: *"i think / i feel like"* are hedges;
  *"i noticed / i have noticed"* are INSIGHT — first-person evidence routes to acknowledgement, not to
  a commitment test.

### Added
- **Feature traversal** — her most substantial suggestion, with "feature" meaning a concrete thing in
  the learner's own account (the storefront, the flyers, the chat), never a product-taxonomy object.
  Among the learner's recurring concrete things the dwell anchor now prefers the LEAST-asked-about
  (coverage read from the stone's own past questions, replayed statelessly); early conversations tether
  to an untouched concrete word from the GOAL rather than drifting into the person's life; and when
  every named thing has had its questions, the stone does not re-enter one — it invites the learner to
  NAME another part that would help the people it is for. Only the learner adds to the idea's parts.
- **Warmth for the analytical student.** The `movement` gate is a lexicon of self-narrated insight
  ("realise", "actually", "oh") — a student who never narrates read 0.00 for 24 straight turns and the
  release's headline lever fired zero times. A second route now fires on sustained development
  (advancement ≥ 0.5 carried by a reply of ≥ 10 content words), with wording that must name the
  specific thing just added. Her replay: 0 → ~5 firings per session; the expressive route unchanged.
- **Conditional precision.** The pointed asks she requested ("which one?", "what exactly?", "the exact
  moment") return — gated on the session's own evidence (median ≥ 10 content words across the last
  three replies, no recent refusal), so a learner at a wordless moment never meets them. On the terse
  fixture: fired 0 of 41 turns; decline footing untouched.
- **The adaptive allowance** (`no turn cap — adaptive`). The fixed 40-turn day cap is retired: it
  bounded something that costs almost nothing (28 users, ₹37 of ₹12,000) and cut off exactly the long
  engaged sessions the pilot wants. The day control is now a ₹ share that BREATHES with the pool —
  2% of the remaining budget per user per day, clamped to ₹2–₹50 (`adaptiveUserDailyInr`): effectively
  unlimited while the pool is healthy, shrinking proportionally only if it depletes, with the lifetime
  ₹ ceiling absolute above it. The client turn counter hides in adaptive mode (the budget chip carries
  the day share); a self-hoster who wants a hard count sets `ZETIZETI_POOL_USER_TURNS` explicitly.

## [0.11.0] — 2026-07-29

A student's session of 28 July — *"i worked with my idea but it was not much helpful / it was just
circling back the question and something some bs / i guess it didnt get the project idea"* — ran on
v0.10.2, the build shipped the previous day to fix exactly that complaint. Replaying `readArc` over his
41 replies shows the arc did everything it was designed to do: all ten aims reached, both movements
traversed in order, the lap rising to 2 at turn 35. Across those forty questions, twenty-four asked
about *sound* and ten asked him to name the one particular sound at a threshold. The rotation and the
sameness were running on different axes.

The cause is that the aim arrives as a DIRECTION and the shape as a GRAMMAR, and neither displaces the
move just made — while every aim closes by binding the question to the learner's own words (#1). His
words were *sound, vacuum, trapped, silence, air*. Each aim, executed faithfully in his vocabulary,
produced another question about a sound at a threshold. Two aims prove it: at turns 31–32 the arc was on
`next` ("what would have to be made or tried FIRST") and produced *"What makes the person stop trying to
escape?"*; at 33–34 it was on `redraw` ("say in one sentence what you are now trying to do") and produced
*"what is the sound that finally makes them stay?"* Both were reached. Neither was executed.

The method core was never the browbeater. `corpus/method/clean-questioning.md` already contains a section
headed **"Never require the precise word"**, the question *"when you try to say it and the words don't
quite fit — what's there, that the words are missing?"*, and a section **"Open, don't only sharpen"**.
None were asked. `FORM_SHAPES[3]` — *"Ask for a particular: a thing, a moment, a person, a number"* —
contradicts that method note directly, and a bracketed imperative next to the question beats ninety-four
lines of resident prose on a cheap model.

### Changed
- **The aim block is no longer injected** (`server.mjs`). `readArc`/`aimBlock` stay exported and tested —
  the honest record of the 27 July attempt, and the material the dwell reader is built from — but they no
  longer steer the question.
- **The form rotation stays, and runs on `FLOW_SHAPES`** (`lib/nudge.mjs`) — `FORM_SHAPES` with its
  fourth shape replaced by one in the register Prayas set: *"not like talking to a judge but to a
  friend"*. Removing the rotation altogether was measured and rejected: it did not make the stone
  friendlier, it made it ask *"are you X, or are you Y?"* on 61% of turns and let questions grow to 38
  words. One tic was replacing another.

### Added
- **Succession** (`buildTurnContext` → `newMaterial`) — the question is built from a word the learner has
  just brought in for the first time. The student laid a trail of new material on nearly every turn (vacuum →
  no air → background sounds → anxiety) and the stone followed none of it.
- **Dwell** (`lib/arc.mjs` → `readDwell`, `APPROACHES`) — persistence is heat, not exhaustion. `arc.mjs`'s
  `spent` reads a reply with few new content words as a line that has stopped yielding, so a learner
  circling one thing is read as spent and rotated away from. Prayas, 28 July: *"the learner persisting
  with the same thing multiple times should be a signal — I think the student was searching for a way out, a
  breakthrough, not a browbeating."* What holds is the learner's most-returned-to word; what moves is the
  approach, and the approaches are the moves already written in `corpus/method/` that the July steering
  layer had no way to reach.
- **`validateOutput(text, { maxWords })`** — brevity as a condition of delivery. Built, measured, and NOT
  enabled: see below.
- **`isRedirect()`** (`lib/arc.mjs`) — reads a learner's in-chat redirect. Built, measured as unproven,
  NOT wired: see below.
- **`app/scripts/flow-probe.mjs`** — variant comparison against a play-acted student who is permitted to
  disengage, and a `--replay` mode that runs a variant against a real student's real replies. Every run
  appends to `docs/ops/flow-probe-log.md` and writes full transcripts to `docs/ops/flow-probe-runs/`.

### Measured, and rejected
- **Vantage from the corpus** — promoting a retrieved tension to the dimension the question opens. It
  removed particular-demands entirely (0%) but dropped uptake to 44%, below the control's 56%, and
  produced non-sequiturs: told *"i don't know - unable to put that into words"* it asked whether the time
  spent felt *"like a cost to be measured"*. The corpus-as-map idea is not dead, but standing in a tension
  pulls away from the learner's own material, which is the opposite of what was being built.
- **Brevity enforced in the guard** — at ≤20 words the guard passed 54% of turns, at ≤28 words 93%. It was
  also unnecessary: the flow build already produces shorter questions (16–18 words, two-thirds under
  twenty) than the baseline, for free.
- **Learner redirect heard in-chat** — the reader fires correctly, but treating a redirect as a re-draw
  re-anchors the enquiry to `locate`, and inside the winning combination it sat within run-to-run noise.
  that transcript contains exactly one redirect in 41 turns, so this fixture cannot measure it. Kept
  as an unwired function pending a fixture with several redirects.

### Added later the same day (evening — the association rounds)
- **Widening by associative value** (`lib/assoc.mjs`): the join — one question holding two things the
  learner said far apart and never together. Selector `open` ships: generous recurrence-valued joining
  behind protective gates. The Jung charge selector (`readCharges` — refusal, named articulation
  failure, contraction, correction, perseveration, insight) is kept selectable as an instrument; as
  targeting it was measured three times and bounced ~30% of its joins — charged material is resistant
  material — so Jung ships as TACT (corrected footing, quotability, repeat gate), not as aim. The
  spoken manner is gathered from Cummings (minimal connective, concrete handle, de-animation, oblique
  entry; analysis private in docs/ops/, nothing in-copyright ships — invariant #2).
- **Corrected footing** (`isCorrection`): a learner's "that's not what i meant" suppresses the steering
  and the next question takes up their re-assertion. **Repeat gate** in the guard: a question sharing a
  five-word frame with an earlier one is withheld and repaired (`validateOutput { avoid }`).
- **Two-axis scoring** (`scripts/flow-score.mjs`): ENGROSSING and MEANING-ARC, with per-third arcs.
  Full record: `docs/ops/flow-probe-log.md` rounds 1–4.

### Warmth first (29 Jul — the both-axes pass)
Analysing **1,938 question→reply pairs** across nine logged 20-round runs, rather than guessing another
variant, found one element that moves engagement and meaning the same way: a turn opening with a brief
line naming what is working draws a reply **15% above that conversation's own baseline** (plain turns:
−5%) and is refused **10%** of the time against **23%**. It is a lever, not a selection effect — the
reply *before* such a turn sits at +1%, and matched on turns where the learner was already warm it still
gives +19% / 7%. `acknowledge` had been sitting sixth in `decideNudge`, **behind** the three-turn
refractory, so any other nudge silenced the best element in the layer. Promoted above the refractory,
thresholds 0.3→0.15/0.2, with a one-turn gap of its own. Three testers had asked for warmth
independently; the measurement now agrees with them.

Two further findings from the same analysis, both shipped:
- **Brevity was the wrong instinct — there is a floor, not a ceiling.** Questions of ≤12 words are
  refused **26%** of the time against **16%** at 20–24 words, and the gap survives excluding the decline
  path (where short questions are correct) and excluding the warm preamble. A very short question is
  usually an under-specified one. `FLOW_SHAPES[0]` had demanded "twelve words or fewer".
- **Three of the six dwell approaches fail, in a pattern worth naming.** *What kind of* 43% refused,
  *makes possible* 34%, *anything else about* 27% (and the lowest insight measured), against *what would
  have to be true* at 15% with the best reply-lift and *what would you want* at 16% with the highest
  insight. The losers are the classic Clean Language felt-sense moves; the winners treat the material as
  a **design proposition**. Asked of a technical object, "what kind of X is that X?" produces *'what kind
  of "avoid" is that?'* — measured, refused half the time. This is a finding about
  `corpus/method/clean-questioning.md`, not only about that list.

Held, implemented and runnable but NOT shipped: **join spacing** (a join may not follow a join). It buys
a further 7 engrossment points for a further 8 arc points — a much worse rate than warmth's 9-for-7 —
and the simulated engagement axis cannot adjudicate it, since the deployed v0.10.2 tops that axis while
being precisely the build that student abandoned. `--variants=R` runs it.

### Result
On that student's own 41 replies, against the v0.10.2 baseline: interrogation-shaped questions (precision
demands + either/or demands) **32% → 7–17%**; questions that take up what the learner just said
**41% → 82–90%**; mean question length **21.0 → 17.9 words**; guard **100%**. With a play-acted student
free to disengage, dry replies **15% → 5%**. Every run is logged in `docs/ops/flow-probe-log.md`.

## [0.10.2] — 2026-07-27

Three purpose-built 20-round conversations — a fluent restater, a genuine developer, and a developer
whose vocabulary circles — run against the real model on the auth-less build. They were meant to verify
a semantic freshness channel. They killed it, and found three further faults underneath. The lesson the
version turns on: **structure beats detection wherever the detector is weaker than the pattern it is
chasing.**

### Added
- **A deterministic FORM rotation** (`lib/nudge.mjs` `formShape`, rendered as its own SHAPE block in
  `buildTurnContext`). Four question shapes cycle by turn, each forbidding the construction the last one
  invites, so no opener can survive two turns running. This is the arc's logic applied to the sentence:
  the repetition is *prevented*, not detected. Measured across 60 questions after the change —
  "If you were to" **0**, "the specific" **2** (was 11–13), 49 distinct three-word openers out of 60,
  mean length 15.6 words.
- **`lib/novelty.mjs` — the semantic freshness channel, SHADOW ONLY.** Computed and logged beside what it
  *would* have done, so the comparison `docs/ops/todo-inquiry-maths.md` asks for can be made on real
  transcripts. It does not steer, and the reason is in the module header at length.

### Fixed
- **The refractory was dead for every silent posture, and had been.** `turnsSinceNudge` only reset when a
  nudge carried a `surface` line to display; most postures carry none, so whichever silent branch matched
  fired every single turn. The old self-echo branch had been masking this by returning first. The server
  now emits the nudge event whenever a posture fires, `surface` null when there is nothing to show, and
  the client starts the refractory on it. `acknowledge` went from **15 turns of 20 to 6, properly spaced**;
  the layer is quiet by default again, as designed.

### Removed
- **The self-echo branch** (`lib/nudge.mjs` §0). Measured across the three runs, `selfEcho` ran 0.44–0.76
  with a mean of **0.58 in every one of them**, so it fired on 16 turns of 19 and its "escalation" on 17.
  It was not detecting that the stone had repeated itself; it was detecting that two English questions
  resemble each other in a hashed embedding space. Worse, standing above the refractory it pre-empted the
  rest of the policy — `acknowledge` reached a learner 3 times in 60 turns, `widen` once. The signal stays
  computed and watch-side.

### Measured — and this is why the semantic channel does not steer
Five candidate measures were built and tested against the fixtures. **None separates "the same idea in
new words" from "a new idea."**

| measure | restater | developer | verdict |
|---|---|---|---|
| whole-utterance nearest cosine | 0.430 | 0.394 | inverted |
| per-item EdgeSpan novelty | 0.444 | 0.353 | inverted |
| utterance-level EdgeSpan novelty | 0.713 | 0.751 | no separation |
| similarity-to-goal | 0.133 | 0.236 | inverted |
| goal-drift slope | −0.0055 | −0.0100 | too small, confounded by register |

Every one tracks vocabulary and register; the restater simply paraphrases with fresh vocabulary. The
per-item measure had looked right on the first fixture pair only because that student reused her *literal*
words, which the exact-string shortcut caught — semantics never entered it. MiniLM-class embeddings do not
carry propositional content, and word-level cosines sit on a ~0.2 anisotropy floor that `feltshift.mjs`
had already documented. **What protects a learner from the fault is therefore structural, not a detector:
no line of questioning may be held beyond four turns, so a restater still receives five different lines
across twenty turns.** The reported fault — seven turns on one axis — cannot recur whether or not anything
notices the restatement.

### Process note
`docs/ops/todo-inquiry-maths.md` already carried the rule this violated: *"Start as a shadow signal…
Do not wire it to steering until it has been watched."* It was wired to steering on one pair of fixtures.
The three runs that caught it are what the rule was asking for, done in the wrong order.

## [0.10.1] — 2026-07-27

A fix for the single-axis loop on the **enquiry** surface — the fault criticism mode had fixed on
16 July and enquiry never did. Siddhi's 26 July session (13 turns, seven of them restating one
question) is the fixture. The loop detector was not asleep: it fired on eleven of those turns and
each time issued *"keep the thread, vary the FORM"*, because the branch that decides between varying
the form and dropping the line reads **word novelty**, and a fluent student restating one idea in
eight vocabularies scores high on it every time. Verified on the auth-less local build against the
real model before commit, per the working rule.

### Added
- **`lib/arc.mjs` — the enquiry surface's dynamic arc.** Ten aims across three movements
  (*locate* → *press* → *land*), replayed statelessly from the transcript each turn (nothing stored;
  the ephemeral guarantee is untouched). The counterpart of `CRITICISM_POINTERS`, which enquiry never
  had: until now its only rotation was prose in the system prompt asking the model to move the angle,
  which is not a rotation but a request addressed to the party doing the circling.
  **Dynamic, not scheduled** — the session's length is unknowable in advance, so aims are held while
  they yield and released when they stop (2–4 turns), and movements advance on readiness in the
  learner's own replies. The same eight turns land in different places depending on what the learner
  is giving. **It does not end:** when *land* is spent the lap rises and the arc re-enters *locate*,
  where an aim must take up material introduced since its last visit.
- **`thinning`** (`lib/signals.mjs`) — the learner's replies contracting against the session's own
  median. The earliest legible sign a line is spent: a bored student stops writing before they start
  repeating. Releases the current aim; never surfaced, never scored.
- **`sustainedEcho`** (`lib/signals.mjs`) — `selfEcho` across a six-turn window, which answers what
  the three-turn reading cannot: whether the correction was already issued and refused.

### Changed
- **The arc owns the LINE; the nudge owns the FORM** (`lib/nudge.mjs` §0). Until the arc existed, the
  echo branch had to move the line of questioning as well, and decided by `advancement` — new words,
  which a fluent student produces while restating one idea. It now corrects wording only, and escalates:
  `sustainedEcho` (the same echo across six turns rather than three) says the mild correction was already
  sent and ignored, so the strong version names the actual tells and forbids them. Three 20-round runs
  showed what `selfEcho` really tracks — the stock opener ("When you say…", "If you were to…", "what is
  the specific…") recurring while the content moves — which is a fact about wording, not about whether a
  line is spent. After the change, "If you were to" appears once across 60 questions; mean question
  length 16.8 words. The old *"we've circled the same question — is this still the live thread?"* surface
  is removed: with the arc moving the line it would no longer be true.
- **A re-draw returns the arc to locating the new edge.** Only the learner changes the topic; carrying on
  pressing the previous line after someone has just said what they are actually trying to do is the tool
  not listening. Found in the 27 July run C, where a re-drawn edge was answered with a question about the
  sentence before it.
- **Retrieval exclusion widened from one turn to three** (`server.mjs`). With a discipline selected a
  student draws on a few dozen entries at three per turn; a one-turn exclusion let the same tensions
  return every other turn, so the aims rotated while the grounding beneath them repeated.
- **`buildTurnContext` takes an `aim`** alongside the posture — the line of questioning and the mode of
  asking are different things, and a felt event now holds the aim rather than competing with it.
- **Invariant #0's framing corrected in `CLAUDE.md`.** It claimed pending entries stay out of the live
  corpus and must not ground a learner's question. No code has ever performed that exclusion: all 265
  domain entries are indexed and retrieved, 231 of them `pending`. What `pending` marks is the
  **framing** awaiting sign-off; the citations under it are verified, which is what the curtain has
  always told the learner. A doc asserting an enforcement nothing carries out is the failure shape the
  corrections ledger names, so it is corrected rather than left standing.

### Tests
- `test/arc.test.mjs` — the first **sequence** tests in the suite. Every turn of the 26 July session
  decided correctly by its own rule and the session still failed, so these assert what a whole
  transcript produces: that the arc leaves its opening line, that no steer is reissued unchanged, that
  a sustained echo escalates, that a long enquiry raises its lap, and — after the 20-round runs caught it
  — that **the arc never runs backwards**. Two fixtures pull opposite ways: the loop that must be moved
  off its line, and Prayas's 24 July probe, a sharpening thread that must be left alone. 86 tests pass.

### Verified
- **Three 20-round conversations on the auth-less local build against the real model** (60 turns, guard
  clean throughout): a disengaging student, an elaborating one, and a mixed session with a re-draw at
  turn 11. The pacing is visibly driven rather than timed — the disengaging session traverses the whole
  arc and rolls into a second lap by turn 20; the elaborating one holds each line to its ceiling and is
  only reaching the landing at turn 20; the mixed one re-draws and starts locating again.
- **A non-monotone arc, found and fixed in that run.** `sustainedEcho` had been applied as a current-turn
  override on top of a stateless replay, so an aim advanced on the turn it fired and reverted on the
  next (press → locate → press). An override that is not part of the replayed history cannot survive a
  replay. Nothing is overridden now; the one current-turn input, a felt-shift event, may only *hold*.

### Known, not fixed here
- `advancement` still counts new WORDS. The escalation catches its failure deterministically, but the
  semantic measure that would fix it belongs with the Stalling Index work — **booked for 0.10.2**
  (`docs/ops/todo-inquiry-maths.md`).
- "the specific" survives as a wording tic: 11 occurrences across 60 questions, down from a heavier
  pattern but not gone.

## [0.10.0] — 2026-07-24

The felt-shift detector joins the live dialogue — the first working shard of Position 2 (*measure the
inquiry, never the inquirer*) in the shipped tool. Every behaviour was signed off on real-route
auth-less transcripts before shipping, per the working rule.

### Added
- **The felt-shift detector runs on every enquiry turn** (`server.mjs` ← `lib/feltshift.mjs`):
  watch-side, over the learner's own words, stone turns entering coverage unscored. Two event channels —
  SEM (a tethered cluster of new, edge-relevant material) and LEX (the words settling: an insight named
  without hedging) — each driving a short, signed-off **felt posture** that outranks the cadence nudges
  at the event moment (`lib/nudge.mjs feltPosture`, the single home; the probe imports it). Between
  events, the ordinary nudge layer breathes unchanged.
- **`feltEvent` / `feltWhy`** — additive fields on the `signals` SSE event: an observation about the
  articulation, never a score (invariants #5/#6 hold; the SSE contract's shape is extended, not changed).
- **Felt telemetry** on `/api/admin/usage` — counts + last-compute latency + backend liveness; no content.
- **Listen-first, warm-async boot:** the app serves immediately; the embedding model warms in the
  background (190 ms warm locally, ~4 s on a fresh container). Until warm — or if the model cannot load —
  felt turns are simply skipped and the dialogue is untouched.
- **`scripts/server-probe.mjs`** — the real-route auth-less driver (guest session → `/api/chat` SSE):
  the sign-off artefact for server-side changes.

### Fixed
- **A loader race that could poison the embed memo:** concurrent first calls during the model load
  previously fell back to 256-dim deterministic vectors and cached them beside 384-dim neural ones. The
  loader is now promise-cached and only genuine neural vectors are memoised.

### Measured
- Felt compute 25–45 ms per turn on the real route — inside the guard's existing buffering beat.

## [0.9.4] — 2026-07-24

The migration build: same behaviour as 0.9.3, new ground under it. Deployed to the `myplaceholder`
server (4 GB / 2 vCPU) ahead of the domain cut-over; blevn (2 GB / 1 vCPU, five apps, already swapping)
was measured and found too thin for the neural stack's resident footprint and per-deploy build cost.

### Changed
- **Base image `node:20-alpine` → `node:20-slim` (glibc).** Required: `onnxruntime-node` ships no musl
  binary and DLOPEN-crashes the process at runtime on alpine — the build succeeds, the breakage only
  appears live (caught in a local Docker gate, not in production). Never revert while these deps exist.

### Added
- **The felt-shift event detector** (`lib/feltshift.mjs` + 10 model-free tests incl. a log-det parity
  proof; calibration harness `scripts/feltshift-test.mjs`) — the measure behind Position 2, cracked in
  three formulations (the failures documented in-file): per-word coverage novelty (neural MiniLM,
  synonym-aware) × per-turn tether gate × SEM/LEX event channels. **Shipped UNWIRED** — nothing in the
  server calls it yet; it joins the dialogue as v0.10.0 after its own auth-less sign-off.
- `@huggingface/transformers` (pinned MiniLM, WASM-safe loader with deterministic fallback, memoised) —
  installed, inert until the wiring.

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

First formally versioned build. The post-pilot revision, from Siddhi's and Sourav's feedback.

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
