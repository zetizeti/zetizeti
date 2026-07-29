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

## Four rules, each learned expensively

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

### 4. Metrics go blind in ways you must actively hunt

Both sameness metrics read a real session as clean while **22 of 24 questions opened with the same
word** — one compares four-word prefixes, the other drops stopwords. When a human sees a pattern
instantly and the numbers do not, the numbers are wrong, and the fix is a new column plus a persona that
reacts to it.

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
