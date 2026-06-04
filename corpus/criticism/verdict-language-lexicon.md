# Reference: the verdict-language lexicon (what the criticism guard must forbid)

> **Origin:** original prose, written for zetizeti. Re-expresses the linguistics of evaluation
> (inscribed attitude) and a point from design-criticism scholarship; ideas re-expressed, verified
> against the originals.
> **Feeds the guard, is not itself code.** This note is the *content* the criticism-surface
> extension of `validateOutput` (`lib/dialogue.mjs`) should draw on. It does NOT change the guard —
> editing the FORBIDDEN list changes what the product *is* (invariant #3), so the code change is
> raised separately, never made silently from this note.
> **provenance:** pending — awaiting Prayas's Gate-4 sign-off (architecture.md §3a).

## The line the guard holds

In the critical register the front speaks criticism's language, which makes one drift more likely,
not less: slipping from *locating* a blur to *delivering the verdict* on it. The whole exercise turns
on the tool never rendering the judgement. There is a precedent for exactly this discipline inside
design criticism itself: a strand that turned from *evaluation* toward *interpretation* — where the
critic seeks to deconstruct a work's meanings and values rather than to judge it (Whiteley's account,
discussed in Twemlow — plenty of design criticism remains evaluative; this is one strand, not the
whole field). zetizeti's
criticism surface takes that turn all the way: it interprets *where* a text decides, and refuses to
say whether the decision is right. The guard enforces the refusal in code, not in a request.

## What to forbid (and why these specifically)

The thing to catch is **inscribed attitude** — explicit evaluative lexis with a fixed attitudinal
value (Martin & White: words like "skilfully", "lazily", and the appreciation lexis "good", "poor")
— when it is aimed *at the text*. The model may surface evoked/located blurs as questions; it may not
pronounce on them. Three families:

1. **Verdicts on the text's correctness** — "wrong", "incorrect", "mistaken", "false", "the text
   fails / gets this wrong", "this is a hallucination", "error". (These decide for the student the
   very thing the located blur is meant to open.)
2. **Grades / appreciation verdicts** — "good answer", "bad answer", "this is poor / strong /
   excellent / weak", "well done", any scoring of the text. (A grade is a deposited conclusion and a
   gamification — invariant #6.)
3. **Provenance verdicts** — "this is AI-generated", "clearly written by a machine", "obviously
   ChatGPT", "this is just AI". (The text the student brings may be from anywhere — their own
   conclusion, a machine, a claim found elsewhere — and the tool must not speculate on or pronounce
   where it came from. Where the idea originated is the student's to know and weigh; it is never the
   tool's to declare, and it has no bearing on whether a located spot blurs description into judgement.)

## The clean reframe (forbidden → questioned)

The reframe is always to move from a pronouncement to a located question that hands back the judging:

- "This claim is wrong." → *"Where does this claim rest?"*
- "This is a good explanation." → *"What is this explanation doing for you here?"*
- "The text smuggled a verdict in line 3." → *"In this line — is it describing, or deciding for you?"*
- "This is just filler." → *"What in this is doing work for you, and what isn't?"*

Each keeps the locating (the spot is still pointed at) and drops the verdict (the call is left to the
student). The reframes also keep the Felski limit in view: pointing at a spot is not the same as
condemning it, and the tool must be as ready to ask what a passage does *well* as where it blurs —
affirming by *questioning what the passage commits to or makes visible* (e.g. *"this part — what does
it let you see?"*), never by awarding it a grade, which families 1–2 forbid.

## Build note (not done here)

The literal FORBIDDEN patterns and their matcher are a deliberate change to `validateOutput`, gated
on Prayas (invariant #3). When wired, the extension should run only on the criticism surface's output
(so Socratic-mode validation is unchanged), and — like the existing guard — be deterministic code,
not model self-assessment. This note is the vocabulary that change should encode; it is not the
change.

---

**Sources** (verified against the originals): J. R. Martin & P. R. R. White, *The Language of
Evaluation: Appraisal in English* (Palgrave Macmillan, 2005) — inscribed attitude; explicit
evaluative lexis with stable attitudinal value. Alice Twemlow, *Sifting the Trash: A History of
Design Criticism* (MIT Press, 2017) and her PhD thesis *Purposes, Poetics, and Publics: The Shifting
Dynamics of Design Criticism in the US and UK, 1955–2007* (Royal College of Art, 2013) — design
criticism as interpreting "the aesthetic, moral, environmental, or social repercussions" of design,
and a strand's evaluation→interpretation turn (quoting Nigel Whiteley, *Design Issues* 13(2), 1997). Rita
Felski, *The Limits of Critique* (2015) — critique must not collapse into condemnation alone.
