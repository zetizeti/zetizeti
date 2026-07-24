# measuring-the-inquiry.md — the second position

*Read after `position.md`. The first position says what we refuse, and why: we will not hand over a
conclusion, because the gap that matters is not the kind a sentence closes. This is a different
pronouncement. Not the worth of the refusal — its solitude. Why the thing we are building is a thing
no one else can build. It is the claim the version ladder calls **2.0**. Read it beside
`progress-signals.md`, which is the measurement this argument would have to earn, and the SDC canon on
the split ratio (splitdomaincognition.org), which the criticism face draws on.*

> **We say the hard part first, because the position rests on it. This is a direction. We do not
> hold it yet.** The mathematics named below is not built. `lib/signals.mjs` today is token-overlap and
> a lexicon, and its own header admits as much. We are declaring where the value lies and binding
> ourselves to reach it. We are not claiming to hold it. A note that dressed an unbuilt thing as a
> finished one would be doing the very thing this tool exists to refuse: smuggling a verdict in under
> the cover of description. So the honesty is the spine here.
>
> *One thing we are no longer blind about. As of a search on 24 July 2026, the machine we need is known
> to exist. Someone has built a deterministic, cheap, closed-form measure of information gain over a
> dialogue, in embedding space, reproducible, with no model sitting in judgement (He et al., 2026). It
> measures progress toward an answer. The unbuilt part was never the mathematics. It is the aim —
> turning that mathematics away from the answer and onto the fog in a learner's own account of their own
> edge. A smaller thing to describe. A harder thing to do. Grounding and the path are in
> `docs/ops/todo-inquiry-maths.md`.*

## The field walked somewhere, and we did not follow

A year ago the easy reading of this tool was: a language model that asks instead of answers. By that
reading we are behind, because the field left "asking" long ago. But look where it walked. It walked
toward the student. The serious systems now build a model of the learner and tune the learner against
it — graphs that diagnose what has been misunderstood, estimators of mastery that plan the next question
to squeeze the most learning out, trackers that follow misconceptions turn by turn, scorers that grade
the questions a student asks. Every instrument is pointed at the person.

*(The search that prompted this note named specific systems. Their identifiers sit in the todo, with a
note to verify each before any of this is published. The pattern does not hang on one paper; it is the
direction of a whole field.)*

We do not follow, and it is not for want of skill. Two of our own rules forbid the road. Invariant #5:
the model never scores the learner. Invariant #7: every signal describes the inquiry and never the
inquirer, and no reading of the person is let into the prompt by any path. We are not behind. We
stand on the far side of a line the frontier cannot cross and stay itself.
`position.md` keeps one edge of that line. This note keeps the other — what becomes buildable once you
have given up the person as a thing to measure.

## The white space

There are three formal accounts of what a question is worth. Each is real, each is published, each
computes. None points where we would point it.

Information gain. Expected Information Gain, Value of Information, Bayesian surprise: the uncertainty a
question is expected to burn off once it is answered. Fully worked out. But the quantity whose
uncertainty falls is always the answer to a puzzle, or the contents of a student's head. The maths
lifts our doubt about the world, or about them.

Epistemic Network Analysis. A mathematics of how ideas move and knot across a conversation, the
descriptive giving way to the mechanistic. Close, and real. Aimed, again, at what the student has
assembled.

The felt shift, in code. Live work on the passage from a vague sense to the words that finally meet it —
Gendlin's ground, which is also ours: the felt-as register, the move from murk to an edge. Someone is
trying to measure it.

Here is the gap, and we will say it flat. No one measures the sharpening of a learner's own account of
their own edge — deterministically, as the object of the tool, without scoring the person. The parts are
on the table. No one has put them together, and the reason is not an oversight. The field is paid to
score the student. This is a different object, and you reach it only if you have already refused the
student as a target. We refused first, on principle, before we knew the maths was there to be had.

## The position

Our durable strangeness is not the corpus and it is not the guard. A corpus can be grown by anyone with
the patience to verify one. A guard is a good idea, and good ideas travel. The thing that will not copy
is a deterministic mathematics of the inquiry's own state and motion — of the question sharpening, never
the questioner — wearing two faces, one for each surface we already have.

On the enquiry side, a measure of edge-condensation. Take information gain and make its latent quantity
the learner's own edge; let "gain" be the fog lifting off their own words for it. A felt shift is then a
large, learner-driven drop in how murky their statement of the edge has become — read off the thing they
make, never off them. The signals we ship now (`specificity`, `convergence`, `condensation`,
`advancement`) are a rough first cut of that quantity. The work is to make the cut hold.

On the criticism side, the split ratio. The locating step already carries the SDC `read_sensed`
computation, deterministic, in `lib/qualify.mjs` and `lib/sensed.mjs`: it finds where a text stops
describing and starts deciding for you. That maths is yours, out of your own canon. No other tool has
it, and no one rebuilds it without the framework it came from. This is the deeper of the two faces,
because a theory is far harder to steal than a dataset.

Both faces measure the inquiry and refuse the person — not by manners but by construction, by what the
latent quantity is allowed to be. Said once, and flat:

> **We are the only questioning tool whose mathematics is forbidden, by its own construction, from
> modelling you.**

## The knife-edge

There is one move that turns all of this into its opposite, and it is easy to make without meaning to.
The moment any of these measures is shown to the learner as a score — a number, a level, a rank, an
"arrived" — it breaks invariants #5 and #6 and falls back into the gamified learner-modelling the whole
position stood against. Our signals live watch-side. They surface, if at all, as an observation about
the inquiry, never as a mark. That restraint does not loosen once the maths gets good. It is the tool.
The better the measure, the sweeter the temptation to show it, and the harder we hold.

So the mathematics has to be excellent and, at once, invisible as judgement. Let it drive how the
edge-canvas thickens. Let it write one plain line behind the curtain about what moved this turn. Let it
steer the posture of the next question. It may not tell the person how they are doing. On the day it
does, we have become the thing we were built to stand apart from.

## The same act as the corpus

"Corpus plus a mathematics of our own" comes apart cleanly once you see the two as material and form.
The corpus is the material: verified tensions, the *what* the questioning bites on. The inquiry-state
mathematics is the form: the measured *how* of the sharpening, felt-shift on one face and split-ratio on
the other. Both are about the inquiry. Neither is about the student.

And it is the same act, again, as the decision to grow this tool by its positions, stance first. "We
measure the inquiry, never the inquirer": a claim we can make true in mathematics and then publish —
the invariant made into a method, the refusal made into something another person could check. The gem, if it turns out to be one, is a position that learned to
compute.

## Whether it holds

We can say plainly that it holds, because we drew it out of the invariants rather than around them.
Against the first position: this one measures the movement of the gap without ever calling the gap
closed — the tool measures motion, the learner alone says "arrived," and nothing here is delivered.
Against the SDC split (#5): the maths is code's work, deterministic and open to inspection, never the
model passing sentence on a human; the learner still names the edge and reads the motion. Against
invariant #7: the measure speaks of the inquiry, a neutral posture is all that reaches the model, no
reading of the person is routed into the prompt. Against the ban on gamification (#6) and the ban on a
verdict surface: nothing is rendered as a score, a level, a ranking — only an observation about a made
thing, kept private to the one who made it. Against the gravest rule, no aggregation: a felt-shift
reading and a split reading are per-inquiry, never averaged into a profile, never a benchmark.

The position survives its own invariants because it was drawn out of them. That is the whole of why it
is ours, and not the field's that we invert.
