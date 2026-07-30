# dialogue.md — how a question gets made

*The questioning engine of the Socratic voice, as it stands at **v0.11.1** (29 July 2026). Read after
[`position.md`](position.md) (why the tool refuses to answer) and beside
[`architecture.md`](architecture.md) (the corpus and retrieval) and
[`progress-signals.md`](progress-signals.md) (the signal layer this steers with). Where those two
describe the design as conceived, this describes the loop as built — including the parts that were
built, measured, and removed.*

---

## The one principle

**Code owns the direction of the question. The model owns its language. The guard owns delivery.**

Every mechanism below is deterministic: it reads the transcript, decides something about *what kind of
question this turn should be*, and passes that to the model as a bracketed instruction. The model never
receives a signal vector, a score, or a characterisation of the learner — it receives a mode of asking
(invariant #7). Nothing about the learner is stored: the service is ephemeral, so every mechanism is
**replayed from the transcript the client sends each turn**. Same transcript, same decision, always;
there is no hidden state that can drift.

### The lesson that shaped everything here

> **A steering block the model may ignore is not steering** — the same shape as *a guard that only
> reports is not a guard*.

This was learned three times before it was believed.

- The **aim block** (v0.10.1) rotated ten lines of questioning on a counter. Replayed over a real
  student's 41 replies it traversed every aim correctly — and ten of forty questions still demanded the
  one particular sound. An aim arrives as a *direction* and a shape as a *grammar*, and neither
  displaces the move the model just made. Removed in v0.11.0.
- **Association joins** fired on 13 of 17 turns of a real session and were visible in **none**. The
  model read the block and wrote its usual question.
- **Opener rotation** was requested in prose for two releases. A real session opened *"When …"* on **22
  of 24 questions**.

So the mechanisms that matter are now **enforced at the guard**, which is the only place in the system
where an unacceptable question can actually be withheld and regenerated. Everything else is advisory,
and is documented as such.

---

## The turn, in order

The learner's message arrives with the whole transcript. `server.mjs` assembles one prompt:

```text
[DOMAIN MATERIAL]      3 retrieved tensions (exact-word FTS5; rolling window, 3-turn exclusion)
[CONNECT]              association join — two things they said, far apart, never joined
[STAY ON "x"]          dwell — the anchor, and this turn's approach to it
[TAKE THIS UP]         succession — words they have just introduced for the first time
[THEY SAID I DON'T KNOW]  decline footing        ─┐ each of these SUPPRESSES the blocks above,
[THEY CORRECTED YOU]      corrected footing      ─┤ because building on a refusal or defending
[EVERYTHING IS COVERED]   the invite             ─┘ a rejected reading is the failure itself
[POSTURE]              felt-shift event, or a cadence nudge (warmth, widen, hedging, …)
[PRECISION]            conditional — pointed asks, only when the learner can give particulars
[SHAPE]                the sentence's form for this turn (plainness constraints)
[DO NOT OPEN WITH …]   the opener ban
<the learner's message>
[Reply with ONE short Socratic question only.]
```

Then `lib/guard.mjs`: **buffer → validate → repair once with the guard's own reasons → deliver.** The
question is not streamed token by token, deliberately — a question cannot be withheld after it has been
read. That cost was paid consciously in v0.9.1.

---

## The mechanisms

### Succession — the question comes from what they just said

The next question is built from a word the learner introduced for the first time in the reply it
answers. Advisory (a prompt block), and it works: questions taking up the learner's newest material
went **41% → 90%** on the transcript that prompted it.

*Why it exists:* the student laid a trail of new material on nearly every turn — vacuum → no air →
background sounds → anxiety — and the aim-driven engine followed none of it, because the aim was chosen
by a counter rather than by his reply.

### Dwell — persistence is heat, not exhaustion

`lib/arc.mjs → readDwell`. The learner's most-returned-to concrete word becomes the **anchor**; it does
not move. What moves is the **approach** to it.

The inversion matters. The engine's `spent` reading treats a reply with few new content words as a line
that has stopped yielding — so a learner circling one thing is read as exhausted and rotated away from.
Persistence and exhaustion produce an identical measurement, and this resolves the ambiguity the other
way, deliberately: *the cost of pressing a live thread one turn too long is far smaller than the cost of
walking away from the thing the learner came for.*

Bounded, because dwell without a bound is the loop wearing the opposite argument:

- **`ANCHOR_MAX = 3`** — one anchor holds at most three consecutive turns.
- **The theme ledger** — an anchor that has served its full budget is *spent for the session*, not
  merely rotated away from, unless the learner's latest reply takes it up again. (Requested in exactly
  those terms by Siddhi Bhavya, testing the build: *"keeping an invisible list of themes already asked
  about, and don't re-enter one unless there's a genuinely new perspective."*)
- **`NONMATERIAL`** — hedges, light verbs, comparatives and interrogatives can never become an anchor.
  Real sessions anchored on *"don't"*, *"more"*, *"gets"* and *"where"* before this list existed, and
  that is what produced drift into the learner's personal life rather than their project.

### Traversal — walk the parts of the idea, don't orbit one

Among the learner's live concrete things, the anchor prefers the **least-asked-about**, with coverage
counted from the stone's own past questions and replayed per prefix.

The request was Siddhi Bhavya's: *"take a feature and probe on it further, then after 2 questions ask
for another feature that may help the users, so there is less chance of circling back."* **"Feature" here
means a concrete thing in the learner's own account** — the storefront, the flyers, the chat — never a
product-taxonomy object. That reading is what makes this simple: the learner's concrete things are their
material words once hedges are filtered, so no feature model is required. What was
missing was never a taxonomy; it was coverage.

Two edges:

- **The goal tether** — early on, with nothing recurring yet, anchor an untouched concrete word from the
  learner's stated goal. This is also the anti-drift fix from the other side.
- **The invite** — when every named part has had its questions, the stone does not re-enter one. It asks
  the learner to *name another part that would help the people it is for*. Only the learner adds to the
  idea's parts (topic authority, invariant #5).

### Association joins — widening by associative value

`lib/assoc.mjs`. One question holding **two things the learner said far apart which no question has yet
held together**. This is the only mechanism here that *widens*; the others hold or narrow.

- **Selection** is generous (recurrence-valued) behind protective gates: corrections are never quoted
  back, a refusal is quotable only when it *names* the blockage, and hedge words never count as
  material.
- **Enforced**: the delivered question must reuse at least one of the learner's content words from
  **each** side (`mustHold`). Before this, joins fired 13 times and were visible in none.
- **The manner** — set the two side by side and let the question mark do the joining; no *"which is
  like"*, no explaining the connection; if one side is touchable and the other abstract, ask through the
  touchable one; nothing is animated that the learner did not animate.

*Measured and rejected: the charge selector.* Jung's word-association indicators (a refusal drawn, a
named articulation failure, a contraction against the session's own baseline, a defended correction,
perseveration) were built as a *targeting* system — join the charged pair. Across three runs it produced
the highest meaning-arc measured **and bounced ~30% of its joins**. Charged material is resistant
material: a question aimed straight at it rebounds, and in a twenty-turn session a rebound reads as not
listening. The indicators ship as **tact** — what not to press — not as aim. `readCharges` remains
selectable for measurement.

### Refusal and correction — two footings

Neither is a signal about the person; both describe what the last message *was*.

**Decline** (`isDecline`) — the learner said they do not know. The question must not be built on those
words, must not quote them, must not ask the same thing in different clothes. It changes footing to
something they described earlier, and must be **easier** than the question just refused: under twelve
words, no demand for "the first/one/specific/exact" anything, no either/or.

*Why the explicit bans:* told merely to "ask something easier", the model reads that as *ask for a
particular*, and the browbeat returns through the back door — measured at 41%.

**Correction** (`isCorrection`) — *"that's not what I meant"*, *"you asked that twice"*. The learner's
correction is authoritative. The steering that would press on is suppressed; the next question takes up
what they re-stated, plainly, under fifteen words. Nothing clever.

### Warmth — the only element that moves both axes together

A turn that opens by naming what is *working* in the learner's line of thought draws a reply **15% above
that conversation's own baseline** (plain turns: −5%) and is refused **10%** of the time against **23%**.
It survives matching — on turns where the learner was already warm it still gives +19% / 7% — so it is a
lever, not a selection effect. Measured across 1,938 question→reply pairs.

It sits **above the refractory**, because it had been sixth in the policy and any other nudge silenced it
for three turns.

**Two routes in**, because the first gate was blind:

- *insight route* — the learner's own realisation markers (`movement`).
- *development route* — sustained new ground carried by a substantively rich reply.

The insight lexicon (*"realise"*, *"actually"*, *"oh"*) is a lexicon of **self-narrated** insight, and an
analytical student never narrates: across a real 24-turn session `movement` read **0.00 throughout** and
warmth fired **zero times**. The development route reaches the student who is developing without saying
so. The wording must name the *specific* thing just added — generic praise is the hollow flattery a
discerning student distrusts.

The line it must never cross is **inquiry, not inquirer**: encouragement aimed at the thread is allowed;
a grade of the person is not.

### Precision — conditional, never global

Pointed asks — *"which one?"*, *"what exactly?"*, *"what is the exact moment?"* — fire only when the
session's own evidence shows the learner has particulars ready: median ≥ 10 content words across the last
three replies, and no refusal in the last two.

This exists because two real students needed **opposite things**. One could not put his felt sense into
words, and ten demands for a particular pushed him out of the conversation. The other — Siddhi Bhavya — is articulate, has the
material ready, and finds soft *"what makes"* framings evasive; she asked for the pointed forms by name:
*"prefer 'what specifically' / 'which one' / 'what's the exact moment' over 'what makes'."* Removing the demand globally (v0.11.0) was overfitting to the first student; restoring it globally
would overfit to the second.

**The register follows the evidence of the current turn, so nobody is modelled.** The same person meets
pointed asks in a rich stretch and the gentle footing at a wordless moment.

### Form and opener — sameness prevented structurally

**`FLOW_SHAPES`** rotates the sentence's form each turn. Every shape constrains only toward *plainness* —
length, directness, ordinary word order. A shape that dictates a **construction** manufactures a tic: an
earlier shape fronting one of the learner's nouns produced *"Silence—"*, *"Released—"*, *"Ambience—"* on
a fixed cycle, which is what made the register read as randomly poetic.

There is a **length floor, not a ceiling**: questions of ≤12 words are refused **26%** of the time against
**16%** at 20–24 words, and the gap survives excluding the decline path and excluding warmth. A very short
question is usually an under-specified one.

**The opener ban** is enforced: the question may not open with the word either of the two previous
questions opened with, named in the prompt and rejected at the guard. Measured on real replies: **When-
openers 94% → 6–17%, consecutive opener repeats 88% → 0%.**

*Why enforcement was necessary:* both sameness metrics read those sessions as clean. `dupOpen` compares
four-word prefixes (*"When the students are"* ≠ *"When you move from"*); `consec` compares content words
and "when" is a stopword. **A one-word frame was invisible to both.**

### The repeat gate

A question sharing any five-word run with an earlier question — quoted learner text stripped first — is
withheld and repaired. Rotation prevents *scheduled* repeats; this catches *composed* ones.

### The shapes a question may not take

Three forms are refused outright, whatever they are asking about. All three came from reading one real
ten-turn session; none of them is steered by any aim, approach or form — **the model falls into them on
its own**, which is precisely why prose asking it not to would not have held.

**The menu.** *"Is it X, or is it Y?"* hands the learner two boxes instead of asking what is so. The
first version of this rule wanted a comma or an auxiliary on the second limb, and so missed the form
that ended a real session: *"…bluffing **before or after** the transaction is recorded?"* Both limbs
naming opposite ends of **one axis** is what makes a menu — *"readers or creators"* is two different
things and still passes.

That widening treated a symptom. The **cause** was one line up: the approach itself read *"ask what
happens JUST BEFORE it, or just after"*, offering the model an alternation, which it passed straight on
to the learner. It now says to pick one side. *A steering line that can be misread will be, so the
guard holds the far end regardless.*

**The closed question.** A question opening with an auxiliary or modal — *"Does…", "Can…", "Is…"* — can
be answered "yes". Three of that session's ten opened this way, and **both of its thin replies followed
one** (*"yes, by identifying behavioural cues"*). Its longest, sharpest answers followed the open moves
the 1,938-pair measurement already favoured.

**The preamble that interprets.** The warmth clause may **acknowledge**, never **interpret**. One
question was prefaced with *"that focus on behavioural cues is shifting the log from a record of the
past to a tool for the next interaction"* — a reading the learner never made, delivered as settled fact
before she was asked anything. Warmth is not banned; it is the largest lever measured. What is refused
is a clause whose content words are mostly **not hers**. The test is where the words came from.

*This is the same failure as the invent-no-premise rule, one clause earlier: the tool supplying material
and then treating it as given.*

---

## What the method evidence says

Measured across 1,938 question→reply pairs, the approaches available to dwell separate sharply:

| approach | refused | reply lift | insight |
|---|---|---|---|
| *what KIND of it this is* | **43%** | −20% | 22% |
| *what it makes POSSIBLE* | 34% | −10% | 40% |
| *anything ELSE about it* | 27% | −9% | **14%** |
| *what happens BEFORE/after* | 23% | −3% | 28% |
| *what they would WANT* | 16% | +5% | **48%** |
| *what would have to be TRUE* | **15%** | **+12%** | 44% |

The three that fail are the classic **Clean Language felt-sense moves**; the two that win treat the
learner's material as a **design proposition** — something that could be true, something they intend.
The repertoire in `corpus/method/clean-questioning.md` was developed for therapeutic material, where
*"what kind of X is that X?"* opens a felt sense. Asked of a technical object it produces *'what kind of
"avoid" is that?'* — refused half the time.

`APPROACHES` now carries only the measured-good moves, plus two added at Siddhi Bhavya's request:
**provenance** (*"how do you know it — what you noticed, what you gathered from others, what you read —
and which does this part rest on?"*) and the one-sentence **gather**. Provenance encodes a distinction she
drew herself: *"'I have noticed' is way different than 'gathered insight' — one gets from asking around,
because we put people in the same waters and have preconceived opinions and biases."* The lexicons follow —
*"i think / i feel like"* are hedges and draw a question asking for the measurable thing; *"i noticed / i
have noticed"* is first-person evidence and routes to acknowledgement.

---

## Built, measured, removed

Kept in the repository, documented rather than deleted, because the negative results are the expensive
part:

| what | why it went |
|---|---|
| **The aim block** (10 aims × locate/press/land) | traversed correctly while the questions stayed identical in kind; `readArc` stays exported and tested but steers nothing |
| **Corpus vantages** (a retrieved tension as the dimension) | removed particular-demands entirely, but dropped uptake below the control and produced non-sequiturs — told *"i don't know how to put it into words"* it asked whether the time spent felt *"like a cost to be measured"* |
| **Brevity enforced in the guard** | at ≤20 words the guard passed 54% of turns; also unnecessary, since the shipped shapes give 16–18-word questions for free |
| **The Jung charge selector as targeting** | highest meaning-arc measured, ~30% of joins rebounded |
| **External association** (model proposes neighbours, code picks) | confusion 25% with it on, against 8–20% for internal joins alone |
| **Join spacing** (a join may not follow a join) | buys +7 engagement for −8 arc — a worse rate than warmth's +9/−7; implemented, runnable, not shipped |
| **The semantic novelty channel** | read a fluent restater as fresher than a genuine developer — inverted on the case it was built for; shadow-only |
| **Actor-level traversal** (rotate the *party* a question is about) | proposed from two sessions where the tool asked the wrong party. Measured over 178 probe conversations and **null — where it moves at all it inverts**: sessions holding one party for four straight questions give *longer* replies and *fewer* refusals. But the deciding objection is that **the measure cannot answer this**: a play-acted student does not close the tab. Not built, and the question is recorded as open rather than as settled |

---

## The rule this engine is maintained under

> **One student's feedback proposes; two students' transcripts dispose.**

No change to the questioning register signs off without replaying **both** real-student fixtures — one
terse and often wordless, one dense and analytical. They want opposite things, and a change that helps
one while harming the other is not a fix. The fixtures themselves are private (a student's tutorial
transcript is theirs); the harness that runs them is public, in `scripts/flow-probe.mjs`.

## Known limits

- Association joins still misfire on roughly 15–20% of firings — a pairing the learner rejects as
  unrelated. Distance and salience are not sufficient to make a pair worth joining, and the missing term
  is not yet known.
- The model can still compose a *"what kind of X"* question even though that approach is gone from the
  rotation.
- **The invite has never been observed live** — it needs a session that exhausts its named parts. It is
  unit-tested only.
- `conviction` and `movement` remain lexicon-driven, and lexicons are brittle across registers of
  English. This is the same class of weakness that hid warmth's zero firing for a full release.
- **The tool has no notion of the *parties* in a proposal** — who bears a burden, who holds the power,
  who takes the benefit. It asks about whichever actor the learner's last sentence made its subject. In
  one session that meant pressing the creator's responsibility twice while the platform the learner had
  also defined took a share. Traversal by party was measured and found null (above), so *that* mechanism
  is not the answer — but the measure was a play-acted student, which cannot leave, so the question is
  **open rather than closed**. The gap is real and its fix is not yet known.
- **The probe still cannot see a learner STOP — production now can.** Both probe axes read a completed
  transcript, and a play-acted student never closes the tab, so a change that loses a real person one turn
  earlier scores identically offline. That was the sharpest limit on this list until v0.11.4 added the
  **survival curve** (`turn_depth`): production records how deep each conversation got, as counts keyed by
  build version, with no user, no session id and no text. The drop between depth *N* and *N+1* is the
  number of conversations that ended on the *N*th question. See `evaluation.md`.
  **What remains open** is that the curve says *where*, never *why* — a drop at depth three is a question
  to go and read — and it needs weeks of real use before it means anything. Until then, the two clearest
  signals this tool has received are still the two students who happened to mention it.
