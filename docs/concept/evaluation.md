# evaluation.md — how a change to the questioning is judged

*The measurement apparatus, and the rules it was built out of. Read beside
[`dialogue.md`](dialogue.md), which documents what these instruments measure. This is a methods note,
not a position — for the argument about what a good inquiry **is**, see
[`measuring-the-inquiry.md`](measuring-the-inquiry.md).*

---

## Why an apparatus at all

Unit tests establish that a function returns what it should. They cannot establish that a question is
worth asking. Between v0.10.1 and v0.11.1 every substantive change to the questioning was proposed on
intuition, measured against real transcripts, and roughly half were **rejected on the evidence** —
including several that felt obviously right when written.

The instruments are in the repository and are meant to be run:

| | |
|---|---|
| `scripts/flow-probe.mjs` | runs variants of the engine against a simulated student, or replays a real transcript |
| `scripts/flow-score.mjs` | scores a run on two axes, with per-third trajectories |
| `docs/ops/flow-probe-log.md` | *(private)* the append-only ledger — every run, every verdict |

---

## Two modes

**Replay** (`--replay=<fixture>`) feeds a **real student's actual replies** to a variant and records what
it asks. Deterministic, directly comparable across variants, and it uses the material that actually
failed. This is the honest instrument for the question side.

**Live** runs a play-acted student against the engine, so the conversation can respond. This is the only
way to see whether a student *stays*.

### The simulated student must be able to leave

The first persona was told to be "a good, honest thinking-partner". That floors the engagement metric at
*engaged* and rigs every comparison. The personas now:

- **expressive** — may disengage: shorter and vaguer when pressed, longer when opened. Crucially it
  **needs meaning**: told to refuse a question that does not parse rather than answer it agreeably. An
  agreeable student makes nonsense invisible, which is exactly how a showcase question that meant
  nothing once passed every metric.
- **analytical** — modelled on Siddhi Bhavya's transcripts: dense material, **never narrates its own
  insight**, notices frame repetition, pulls drift back to the project. It exists because the expressive persona
  trips insight-lexicon gates that a real analytical student never trips — a gap that hid a shipped
  feature firing zero times for a full release.

The second persona immediately exposed a harness bug present since the probe was first written: the
student model had been receiving every question **twice**. Nine runs of the expressive persona had
shrugged at it.

---

## The two axes

`flow-score.mjs`. Both are engineered composites for comparing variants **within a run** — not truths
about students. The formulas live in the script's header, deliberately, so a reader can dispute them.

- **ENGROSSING** — does the learner stay and give more? Reply-length trend, dryness, confusion, and how
  much fresh material still arrives in the final third.
- **MEANING-ARC** — does one thing lead to another and arrive? Uptake of what was just said,
  interrogation-shaped questions, repeated frames, join outcomes, and the learner's own movement markers
  late in the conversation.

They trade against each other, and the dial is real: across one five-conversation run, the deployed
baseline scored 64/64, the full meaning machinery 51/86, and the same build with warmth 60/79. Warmth
buys nine engagement points for seven arc points — by a distance the cheapest trade available, which is
why it shipped and the others did not.

**The caveat is load-bearing.** The engagement axis, measured on a simulated student, rewards
*conversational comfort* — and the baseline tops it while being precisely the build a real student
abandoned as boring. A student who is comfortable and a student who is thinking are not the same
measurement. Simulated axes narrow the field; real sessions decide.

---

## Five rules, each learned expensively

### 1. Log every run, append-only, with full transcripts

Nothing is overwritten. Each run appends a row to the ledger and writes its own timestamped JSON with
every question and reply.

The analysis that matters usually happens *after* the run, and often needs a metric nobody thought to
compute at the time. Twice the archive caught a false result that would otherwise have shipped: an
"either/or" interrogation tic hiding behind a falling particular-demand count, and a control variant's
apparent win that was one tic replacing another.

### 2. No mechanism may be judged before its firing rate is logged

Print how often the mechanism actually fired, beside the metrics, and read it first.

An inert mechanism produces noise, and noise reads exactly like a result — often like a *negative* one,
which is worse, because a good idea gets discarded on evidence that was never about it. Three times in a
single session a mechanism was measured while effectively switched off: internal association at 0.3
firings per 20 turns (nearly rejecting the idea outright), then join spacing at 0.5, then at 2. Every one
looked entirely reasonable in the results table.

### 3. A metric set blind to meaning will ship gibberish

Read the output cold, as a hostile reader would, separately from what the metrics say — and never quote
your own output as evidence of success until it has passed that read.

A question can be short, non-interrogative, take up the learner's newest words, and be perfect nonsense.
All three of those were columns. *"Where in your body do you notice the sound of that plastic bag?"*
scored perfectly on every one.

### 4. A rule measured through a composite verdict reports someone else's number

Measure each rule **alone**, never by asking the guard whether the whole question passed.

The three shape rules added in v0.11.3 were first audited by reading `validateOutput`'s verdict with one
option switched on — which also carries every other rule that fires unconditionally. Four pre-existing
`FORBIDDEN` hits were duly attributed to the new one, and two of them were false positives that had
nothing to do with it. The number was real; it belonged to something else. Isolating each rule changed
the widened binary guard's apparent catch from eight questions to four.

### 5. Metrics go blind in ways you must actively hunt

Both sameness metrics read a real session as clean while **22 of 24 questions opened with the same
word** — one compares four-word prefixes, the other drops stopwords. When a human sees a pattern
instantly and the numbers do not, the numbers are wrong, and the fix is a new column plus a persona that
reacts to it.

---

## The limit of a simulated student, and the instrument that answers it

Everything above measures a **play-acted student** — a model prompted to behave like a design student and
permitted to disengage. That buys a great deal: it will refuse a question that does not parse, which is
how nonsense became visible. But it cannot do the one thing that matters most.

**A model does not close the tab.** It does not get bored, and it never simply stops replying. So every
engagement reading here — refusal rate, reply length, both axes — is a *proxy* for a thing the harness
could not observe. Worse, a **replay** run (a real student's recorded replies, re-run against a variant)
cannot react at all: those replies are fixed, so including replays in an engagement measure does not add
noise, it drags any real effect toward zero by construction. They must be excluded from such measures,
which leaves only the simulated student behind them.

This is not a small caveat. The two clearest signals this tool has ever received — a student stopping at
a manufactured association bridge, another stopping at a two-box menu a fortnight later — reached it as
**messages from people who happened to mention it**. Both produced a release. Neither was visible to any
instrument here, and neither would have been noticed had those students closed the tab in silence, which
is what everyone else does.

### The survival curve (`turn_depth`, v0.11.4)

So the tool now records, in production, **how deep each conversation got** — and nothing else:

| | |
|---|---|
| **what is stored** | one row per `(day, surface, version, depth)`, with a count |
| **what is not** | no user id, no session id, no text. The table has five columns, and a unit test asserts that none of them can name a person or hold content |
| **why no session id is needed** | the service is stateless — the browser posts the whole transcript every turn, so each request already carries its own depth |
| **when it is written** | on a **delivered** turn only. A refused turn (no access, cap reached, empty generation) would otherwise inflate precisely the depth where people leave, and blame the questioning for what the budget did |

The **drop** between depth *N* and *N+1* is exactly the number of conversations that ended on the *N*th
question. That makes the curve a conversation-length distribution without ever recording a conversation,
and keying it by build version makes it a *measurement*: **a release that loses people one turn earlier is
visible here and nowhere else.**

It is strictly more private than the spend ledger beside it, which does hold a user id. It is therefore
operational rather than content, and survives the boot purge — purging it would destroy the only
cross-release comparison the project has.

**What it does not do.** It says *where* people stop, never *why*. A drop at depth three is a question to
go and read, not a verdict. And it needs weeks of real use before a curve means anything; on day one it is
four rows. It also cannot see someone who never returns — a learner who has one good session and never
comes back looks identical to one who is still going.

---

## Fixtures

Real student transcripts live **outside the publishable tree** and are not distributed: a student's
tutorial session is theirs, shared for debugging, not for publication. The publish pipeline hard-fails on
`replay-*.json`, on `*-transcript*`, and on any first name from the student roster appearing anywhere in
a staged export.

The standing rule that uses them:

> **One student's feedback proposes; two students' transcripts dispose.**

No change to the questioning register signs off without replaying both — one terse and often wordless,
one dense and analytical. They want opposite things. A change that helps one while harming the other is
not a fix, and the register conditionals in `dialogue.md` are the design answer: the register follows the
evidence of the current turn rather than a model of who the student is.

---

## Running it

```bash
cd app

# compare variants against a simulated student who may disengage
node --env-file=.env scripts/flow-probe.mjs --variants=LIVE,FIX --convos=3 --rounds=20

# the analytical persona (dense, never narrates insight, notices repetition)
node --env-file=.env scripts/flow-probe.mjs --variants=FIX --convos=3 --rounds=20 --persona=analytical

# replay a transcript fixture
node --env-file=.env scripts/flow-probe.mjs --variants=FIX --replay=<path>.json --rounds=41

# score a run on both axes; --misses prints every rejected join with the reply that refused it
node scripts/flow-score.mjs <run>.json --misses
```

A fixture is `{ "goal": "...", "turns": ["reply", "reply", ...] }`. Variants are declared at the top of
`flow-probe.mjs`; every rejected mechanism remains runnable there, so a negative result can be
re-examined rather than taken on trust.

---

## The cinematic read — a dialogue as a made thing, and as a thing that was lived (9 September 2026)

*Working vocabulary throughout. None of the words in this section go near the site's own copy, which describes the tool and never names the reader's condition.*

### The gap this closes, and it was found by the counters contradicting themselves

On 9 September a replay scored well on every counter the project had — longest rut 4, five breaches, no interpretive tells, eleven distinct anchors, goal coverage 8 of 13 — while the probe's own prose notes said of the same run: *takes nothing the last answer added*, *this question could have been asked at any point*, *nothing new entered here at all*. Open, varied, unbreached and inert. **Every number was blind to it, because every number measures whether the questioning misbehaves and none measures whether the dialogue was worth being in.**

### Two frames, and they are different questions

**As an artifact** — the transcript as a made thing, read after the fact the way a scene is read on the page. **As an experience** — what it was to be the person answering: whether there was room, and whether it was taken.

The frame is the project's own, from the Museum of Vestigial Desire's *Conversation* (19 September 2014): *"A contribution is not valuable by default. That is where the script comes in. If conversations were to be scripted dialogue and not mere speech with an unspecified intensity, then they could actually matter more."* And, for the second frame, that text's closing question — *"who spoke? The writer or the actor?"* — with its answer that if an actor feels close to an experience someone else scripted, that closeness can be neither dismissed nor questioned. Here the tool writes and the learner acts.

### What is measured, and where each axis comes from

`scripts/cinematic-read.mjs` reads any probe run and reports six axes. **There is no total and there will not be one** — the source above cuts against summing them, and the probe already refuses it in its own words: notes do not average.

| axis | what it reads | where it comes from |
|---|---|---|
| **uptake / inert** | how much of what the learner just added the next question picks up | Nystrand, Wu, Gamoran, Zeiser & Long 2003, *Discourse Processes*, [10.1207/s15326950dp3502_3](https://doi.org/10.1207/s15326950dp3502_3) — authentic questions and uptake as dialogic bids, over 33,000 coded questions. Demszky et al. 2021, ACL, [10.18653/v1/2021.acl-long.130](https://doi.org/10.18653/v1/2021.acl-long.130) formalise uptake computationally and find repetition-based baselines weaker than they appear |
| **on the nose** | the question names the thinking it wants instead of asking for the thing | screenwriting craft: Robert Towne on Nicholson — *"he would not improvise on the nose… most scenes are rarely about what the subject matter is"*; McKee, *on the nose dialogue is dialogue without a subtext*; Sol Stein's four questions of dialogue |
| **early-completing** | the line completes its meaning before it ends | McKee on the periodic sentence — withhold the key word so the listener cannot know the meaning until the last word |
| **own material / agenda** | how much of the answer is the learner's own, and whether it left the question's terms entirely | Stivers & Hayashi 2010, *Language in Society* 39(1):1–25, [10.1017/s0047404509990637](https://doi.org/10.1017/s0047404509990637) — *transformative answers*: term transformations resist a question's design, agenda transformations resist its agenda and resist more strongly |
| **scope, wide end** | 🔴 **measured and failed — see below** | Yarmel 2026, *Educational Theory*, [10.1111/edth.70102](https://doi.org/10.1111/edth.70102) — grammatical scope, and questions failing at **both** ends |
| **deposited** | a reading was deposited before the question | ⚠️ not new — this counts what `PREAMBLE_TELLS` already refuses at delivery, so it is an existing enforcement re-read |

⚠️ **Every axis is a lexical or structural proxy for a judgement a person makes by reading, and none is the judgement.** They are built to be more discerning than counting breaches, not to be right.

### What earned its place, measured over 58 runs

**Uptake earned it and nothing else clearly did.** Spearman against the existing counters: inert correlates **−0.05** with longest-rut and **0.07** with breaches — it is measuring something no existing counter touches — and it has the widest spread of any axis here, 5–63%, sd 17.8. Across pairs of runs the old counters call equivalent (same rut, breaches within one), **45% are separated by thirty points or more** on the new reading.

🔴 **And on the controlled pairs — the same fixture replayed on two builds, so the learner's half is identical — it found a trade the old counters cannot see.** v1.4.0 took fixture `d` from rut 10 to 4 and breaches 11 to 7 **while uptake fell from 42% to 37%**; the periodic rut-invite took fixture `s` from rut 14 to 7 **while the inert rate rose from 13% to 29%**. **The rut-invite trades uptake for rut.** It breaks a rut by handing the subject back, and a question that hands the subject back is by construction one that takes less of what the learner just said. Every old counter sees the benefit; none sees the cost. That is not an argument against the mechanism — it is the cost of it, made visible for the first time.

🔵 **On the nose** (0–20%, sd 5.1) and **early-completing** (0–20%, sd 5.5) are near-orthogonal to the old counters and worth reading; neither is validated against anything yet. **Own material** sits in a narrow band (47–82%, sd 7.1) and **agenda** correlates 0.62 with breaches, so both are readings rather than instruments.

🔴 **The wide end of scope was measured and FAILED, and is kept as a negative result so it is not proposed again as new.** Yarmel's point — that an inquiry question fails when its grammatical scope is too wide as well as too narrow, where every guard here catches only the narrow end — is the right point. This operationalisation of it is not: *no purchase on the learner's own material* fired on 0–4% of turns across 58 runs, sd 0.7, saying the same thing about every dialogue. **That is not a finding that the questions are never too wide.** It is a lexical proxy that cannot see width, and rebuilding it needs a real measure of the space of answers a question admits.

⚠️ **One comparison looks like validation and is not, so it is stated rather than used.** The older probe runs read mean uptake 9% against 41% for the real dialogues, which resembles the axis independently detecting the period when the probe was feeding the route its own reply twice. It cannot be read that way: those runs differ on two things at once, a play-acted student as well as the broken probe, and nothing separates them. The pre-fix 9 September runs that would have made it clean were never written to disk, because the probe crashed before its write step. The controlled same-fixture pairs are the evidence; that split is not.

### What is required, and what is not

**`cinematic-read.mjs` is run and its uptake figures recorded on any release that changes the questioning.** That is what the measurement earned: it is orthogonal to everything already measured, and it has already caught a cost that was otherwise invisible.

🔴 **No threshold is set, and none may be invented.** What uptake rate is too low is a question about what this tool is for, and that is not a number to be derived from a spread of runs. Until it is set, the figure is recorded and read, and it fails nothing.
