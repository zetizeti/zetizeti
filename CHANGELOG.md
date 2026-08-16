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

## [0.16.2] — 2026-08-16

### The corpus figure comes off the student-facing surfaces, and is corrected where it stays

Shipped in 0.16.1, off again within the hour. Prayas: *"201 of the 274 entries in its corpus have not been read by a person. -- dont say this. students will not use it then."* Two faults, and the second is the more serious.

**It would have cost the tool the students the admission was written for.** A prospective user reading that line hears *nothing here has been checked* and closes the tab. An admission made to be honest with students must not be the reason those students never arrive — a tool nobody opens has not been honest with anybody. The qualitative admission stays on every surface. The one figure that only frightens now sits in the README alone, where a reader has come looking for that resolution. ⚠️ That is a real limit on *all public surfaces* and not a loophole to widen later.

🔴 **And the sentence was wrong.** *Have not been read by a person* implies the entries are unvetted. They are not: **every citation is verified before an entry ships — invariant #0, an absolute gate — and what is pending is the sign-off on the FRAMING**, which the curtain already states per entry in the learner's own view. The README now says that with the distinction intact. **A self-critical sentence gets the least scrutiny of anything on a page, because nobody suspects it of flattering.** Overstating a fault is not the safe direction to be wrong in; it is still a false statement about the tool, and this one would have been paid for in users.

`verification/admission-figures.test.mjs` no longer requires a figure on every surface. It now checks that wherever a figure appears it is true, and that at least one surface still carries one — an admission with nothing checkable left in it has become the performance it was written against. Re-proved by planting a wrong figure.

## [0.16.1] — 2026-08-16

### Every public surface says what the tool does not yet do

Prayas, 16 August 2026: *"not good enough yet - admit on all public surfaces that we do not do what we claim to do yet."* The landing page, the about page and the README each now carry it, and no public surface may claim more than the tool has earned. It is a standing rule. It comes down when the 1.0 bar is cleared, and it comes down because he says so.

**What it says, on all three:** it works for students who stay patient with it and loses the others — which is the versioning ladder's own definition of the 1.0 bar, unmet. Then the specifics. 201 of the 274 corpus entries have not been read by a person, and the curtain already says which on each entry. The method core is one note where it should be many. The reading plan measured null on question quality against the clock it replaced. And the criticism surface asked two-box menu questions until v0.16.0.

🔴 **No counts of use, here or anywhere.** What prompted this was a number, and the number stays in the private record. A usage figure on a public page becomes a benchmark, which is the precise thing the not-knowing position exists to prevent. The qualitative claim is the stronger one in any case: *it loses the students who are not patient with it* cannot be argued down by a better quarter.

🔴 **The failure mode the copy was written against is PERFORMED HUMILITY.** An admission made to look trustworthy converts a confession into a credibility play, and a reader sharp enough to value it is sharp enough to smell it. The cold-read on the first draft found the fault in three of four paragraph endings, all of them telling the reader how to feel rather than handing over a fact, and the clearest case was a sentence declaring the section was not humility furniture — a denial of the performance being the performance. Four such sentences were cut. The test applied to every remaining one: does it give the reader something checkable they could use *against* the tool? Both closing paragraphs that drew the moral were removed on the same principle. State the fault; do not draw the lesson from it in the same breath.

**`verification/admission-figures.test.mjs` makes it self-enforcing.** Two things needed holding and neither holds itself. The admission has to still be there — a later session reading self-deprecating copy will tidy it away in good faith, because nothing on a page says it is deliberate. And `201 of 274` is a figure written into prose, generated once and then static, which nothing rebuilds and no test would catch drifting. So the count is read from `corpus/domain/` and compared against what each surface claims: sign one entry off and the suite fails until the copy is corrected. Proved by planting a wrong figure and watching it refuse. It caught a real fault on its first run — the README's copy of the 1.0-bar sentence carried a comma the other two did not, and that sentence is quoted identically wherever the bar is named because it is a standard rather than prose.

⚠️ **The README badge had been claiming 61 passing tests.** It is 282. Generated once, static ever after, asserting the wrong number on the public repo for weeks — the exact shape the docs-are-half-the-ship rule names, found only because this release went looking at the public surfaces.

**Renders checked at 1024×768, 1440×900, 1512×982 and 1920×1200.** The landing's one-screen rule is scoped by `@media (min-width:768px)` and holds at all of them with the admission in place.

## [0.16.0] — 2026-08-16

### The criticism surface stops handing the student a menu

**A real session, seven questions, six of them two-box menus.** *Is this word describing a state, or is it deciding it for the player? · Is that a quality the space possesses, or a verdict? · Does that help them navigate, or does it steer them? · Does it serve the core objective, or become a distraction? · Do they need that feeling, or want it?* The student's report was that it *"got fixated on one word"* and *"feels very off"*, and then — accurately — *"idk in what way more to explain it"*, which is what a form to fill produces in somebody who has already said what they think.

**`validateOutput` has refused the menu since v0.11.3 and `validateCriticismOutput` could not.** It takes no `noBinary` option and `server.mjs` passes none, so `BINARY_DEMAND` was written, measured at 61% of turns on the surface that had it, tested, and unreachable from the criticism path for as long as that path has existed. Nothing errored and no test failed, because the rule was only ever exercised against the surface that already carried it. It now runs on every criticism turn, against the model's own framing with quoted spans stripped — the text under question may itself offer a choice, and quoting it back is the method working.

**The guard alone would have fought the prompt, so the composing layer moved in the same commit.** Three of the seven `CRITICISM_POINTERS` aims were themselves written as binaries — `blur` ("describing something or deciding it"), `need-want` ("NEED this, or WANT it"), `hero-hindrance` ("serve the core function, or quietly distract") — as were the exemplar form in the system prompt and the located-spot instruction. The model was doing as it was told. **Rotating the station rotated the subject and preserved the menu**, which is why a session that traversed three stations on schedule read to the student as one question asked seven times, and why this looked like a fixation bug rather than a form bug. All five now ask open, and the prompt carries the prohibition explicitly so the guard and the composer say the same thing.

🔴 **The mode's signature form went with them, deliberately.** *"Whose call is that — yours, or the text's?"* is a menu. Its two options being exhaustive is what makes it feel exempt and does not make it easier to answer — the student still picks from boxes rather than saying what is so. *"Whose call is that?"* asks the same thing and loses nothing, so no carve-out was written. `test/loopiness.test.mjs` asserts the retired form is now refused, so the decision cannot be quietly undone.

**Measured over a whole conversation, not a unit test.** `critique-conversation-probe.mjs`, twelve rounds against the real endpoints: zero menus, zero guard breaches, four of six stations traversed. A unit test cannot tell you the questioning moved — this project has already paid for that lesson once, when every unit test passed while the plan sat on one station for fourteen rounds.

**Markdown emphasis is stripped before the question is validated or delivered.** Nothing told the model to avoid it and nothing rendered it, so `does the player *need* that feeling` reached a student with the asterisks intact and went out again inside the transcript they downloaded and sent on. It is removed in `generateGuarded`, so the validated string and the delivered string are one string, and the download cannot carry markers the screen did not.

⚠️ **Still open, and not fixed on a hunch.** A station can hold for `PIN_MAX` = 6 rounds, and in the twelve-round probe the play-acted student pushed back twice at exactly that. `plan.mjs` already records the suspicion that `blur` leading on every real document reinstates the single-axis fault the rotation was built to remove. Twelve rounds cannot see it; `plan-vs-clock.mjs` is what would.

### The about page credits split-domain cognition and Koher

Two paragraphs at the foot of the about page, in the existing credit component: **split-domain cognition** for the framework, and **Koher** for the method. The first states what every refusal on the page follows from — language work and judgement work being two unlike kinds of thinking. The second names Koher as the ten-year practice of free open-source tools this was built alongside, and the curtain as an instance of its habit of showing a tool's architecture rather than asking to be believed. zetizeti's engine and corpus stay its own; the debt is to the method, and it is stated as such.

🔴 **This required retiring a rule, and the retirement is the more useful part.** Since 24 May 2026 the project had held that Koher "may still be named only in" three enumerated places, so a credit of this kind was forbidden outright. Prayas, 16 August: *"remove the koher coupling rule — it was only an attempt to not be subsumed within koher."* It had never been a fact about the relationship — it was a defensive posture with a date on it, and read cold by any later session it was indistinguishable from one. What survives is the narrower claim that was always true: the engine and corpus are zetizeti's own, so authorship is not re-attributed. ⚠️ Do not reconstruct the prohibition.

Rendered and read at 1920 and 760 before shipping, per the rule that a measurement is not a render.

### The changelog was restored — it had been overwritten with a copy of `package.json`

**`ca006cb` replaced this file's 1,179 lines with the 23 lines of `app/package.json`, and it was committed and published.** The commit's purpose was the opposite: the v0.15.0 publish dry run had surfaced two passages naming private working files, and it set out to put placeholders in. The `index.html` half worked. The changelog half overwrote the file. Ninety-five kilobytes of release history, gone in a commit whose subject line was *"Use neutral examples in public files"* — and gone *quietly*, because a changelog is never read by anything that runs.

Restored from `b2fafe2`, with the sanitisation that commit intended actually applied: the two working filenames in the v0.15.0 load-state block are placeholders now.

⚠️ **`0.15.1` to `0.15.4` are reconstructed on 16 August from the annotated tags and commit messages**, because the file was already destroyed when those releases were cut, so no contemporaneous entry ever existed. They are shorter than the rest for that reason and should be read as a record rebuilt after the fact.

## [0.15.4] — 2026-08-13 *(reconstructed)*

**PDFs open on older browsers.** A student could not open a PDF within an hour of the link going out. pdf.js 6.2.108 calls `Iterator.prototype.join`, and iterator helpers reached Safari only in 18.2 (December 2024); the link went out over WhatsApp, so it was opened on phones. Every PDF failed on older iOS regardless of content, and it worked in my browser throughout — which is why it reached a student rather than a test. 6.2.108's own legacy build still calls it. Vendored 4.10.38 legacy instead: no iterator helpers, core-js bundled for the rest, identical text-extraction API.

**Errors stop guessing.** The catch named password protection as the cause of every failure, so it told a student their Google Doc export was encrypted when their browser was at fault. It now separates an unsupported browser from an encrypted file from anything else, and puts the real error where it can be read.

**The document chip is always visible.** It had been hidden in paste mode, leaving the brief chip as the only upload control on screen — so a reading went into the one slot where a reading is never questioned. Both chips are always visible; opening a document switches the mode itself.

## [0.15.3] — 2026-08-15 *(reconstructed)*

**The reading plan measured against the clock, and null on the questions.** `scripts/plan-vs-clock.mjs`: four documents of differing affordance, four conversations of eight rounds per arm, 128 questions each, play-acted student permitted to disengage, composed with the route's own functions. Disengagement 15.6% plan against 16.4% clock; frame entropy 1.83 against 1.93; distributions near-identical. **The plan changes the route, not the questions** — the v0.11.0 `readArc` result arriving on this surface.

It stays, because three claims were bundled and only one was tested: `windowOf` needs a live region or the whole document re-enters the prompt every turn, and the clock can never end, so completion would be lost. Neither was the tested claim. Recorded rather than quietly kept — a negative result is documentation, or the next session proposes it again and pays for the measurement twice.

## [0.15.2] — 2026-08-15 *(reconstructed)*

**The upload is a project brief; the toggle keeps `concept`.** `focus:'concept'` already meant the making filter — concept as opposed to production — and naming the new context document "project concept" beside it collided on screen and in the code, where `focus === 'concept'` and a `concept` parameter sat in the same functions meaning unrelated things. The established name stays and the new thing moves: `brief` everywhere — the wire key, `critBrief`, `briefDigest`, `BRIEF_AS_OBJECT`, `digestBrief`, and every line of copy. Renamed across client and server together and verified in the browser, because a wire-key rename is where a mismatch hides silently: the brief would simply have stopped arriving with nothing erroring.

## [0.15.1] — 2026-08-15 *(reconstructed)*

**Neutral examples in public files.** The v0.15.0 publish dry run staged two explanatory passages naming private working files — a code comment in `public/index.html` illustrating date-folding with a real document title, and changelog examples using two test filenames. No content was exposed, but both said what had been tested with, in a repo that is public. ⚠️ This is the release whose changelog half overwrote this file; see 0.16.0.

## [0.15.0] — 2026-08-15

### The criticism surface takes a document, plans an arc over it, and reads where the conversation has gone

Prayas: *"in criticism mode allow uploading any text in pdf to get the student to unpack it / critique it - plan arcs not one-offs - figure sensors to measure degree of dept of reading of text, if project concept pdf is uploaded - make that the context of unpacking text. keep all invariants same."*

**A PDF is read in the browser and never reaches the server.** The same path `parseTranscriptMd` has always used to pick up a saved critique: a hidden file input, `FileReader`, parsed in the tab. Only the extracted text travels, in the turn body, exactly as a paste always has. There is no upload endpoint, and the ephemeral pivot needs no new claim defending it — the service cannot retain a document it never receives. pdf.js 6.2.108 is vendored at `public/vendor/pdfjs` (Apache-2.0) rather than added to `package.json`, because nothing on the server executes it.

**The document ceiling rises from 8,000 to 25,000 characters**, and that is only safe because the artefact is now windowed. It used to enter the system prompt whole on every single turn, so raising the ceiling without windowing would have raised the per-turn bill in direct proportion, against a lifetime ₹12,000 cap that was set when the ceiling was 8,000. `lib/plan.mjs` `windowOf` puts the live region in verbatim and the rest as opening words, bounded to 6,000 characters — so a 25,000-character document now costs *less* per turn than a maximum-size paste did before. Anything under the old ceiling is byte-identical to before.

**`lib/plan.mjs` replaces the modulo clock.** `pickCriticismPointer` was `(floor(stoneCount / 3) + bump) % 7`: seven lines of questioning, three questions each, advancing on a timer and blind to the text. It would spend three turns asking what people actually DO in a document making no behavioural claim. The plan instead asks which lines *this* document affords, over which regions — affordance and territory are one computation, so a station cannot exist with nowhere to point — and recomputes the live station every turn by replaying the transcript the client posts back. It holds no state. It advances early where the student's own words have reached a region, caps the stay with the same dwell budget Siddhi asked for on 16 July, and **it ends**: `complete` flips once, at the depth where the plan was first traversed, which is the first thing on this surface that can tell finishing from leaving. A document affording nothing degrades to the old rotation, and says so.

**`lib/reading.mjs` reads how far into the text the conversation has gone, and steers the plan with it — nothing else.** Prayas chose "planner only, invisible": it is never rendered, never persisted, never sent to the model as a characterisation, and never in the download. What keeps that the right side of invariants #5 and #6 is not its vocabulary but its consumer, so `verification/reading-plan.test.mjs` asserts the consumer. The header says plainly what it cannot do: these sensors see typing, not reading, and a student who read closely and answers in four words registers as shallow on every one of them. The subtraction is the mechanism — a segment counts as reached only by words the preceding question did not put in front of the student, or the sensor reads its own steering back to itself.

**A project concept can be brought as context, and is never the object.** `buildCriticismSystemPrompt` had a `goal` socket rendering a "what the student is working on" block, `server.mjs` read `b.goal`, and the client sent `goal:''` hardcoded on both endpoints — built and wired to nothing. The concept fills that role, digested to the passages that frame anything. The prompt says the project is not under question; `validateCriticismOutput` enforces it, refusing a question that asks the student to justify or defend their own concept, and refusing one that anchors in not a single term of the text. Both proved by planting.

### The wash was reading as padding, and the focus switch is paste-only

Prayas, from two screenshots four seconds apart: *"the padding keeps reducing/increasing."*

**Nothing about the padding was changing.** `edgeBlob` breathes the painted mass behind the panel by up to 11% vertically over sixteen seconds — deliberate, part of the signature, and unnoticeable for as long as that panel held a short pasted paragraph. A document panel holds a hard-bordered specimen box, so the reader now has two edges to compare and reads the breathing gap between them as the container's padding pulsing.

The cause is `filter:blur(1px)`. A one-pixel blur on a large mass is a geometric **shape with a definite edge** — which is the thing the house style rules out in as many words: soft-edged colour masses, not hard geometric shapes. Blurred properly it is a wash again, and a wash has no boundary to measure a rectangle against. Softened to 16px with an eased amplitude over 22s, scoped to this panel alone; the enquiry surface's edge is untouched. Judged by pinning the animation at both extremes and comparing the frames, which is the only way to see it.

**Three left edges became two.** The conversation sat at the wrap's margin, the specimen at the floated sheet's inset, and the project concept at a third value aligned to neither. Things on the ground now share the ground's edge; the sheet keeps its inset because it is a sheet. The vermilion mass moved out into the page margin, which suits it better than an indent pushing the text right.

**The focus switch shows only in paste mode.** ⚠️ Hiding a control does not disable it — `critFocus` travels on both endpoints regardless — so it is reset to `null` on entering document mode, or a hidden switch could stay silently in force from a previous paste. The consequence is real and is recorded rather than smoothed: **a document critique can no longer be restricted to concept-only at all.**

⚠️ **An unresolved naming collision sits underneath this.** `ASKING ABOUT CONCEPT ONLY` (the making filter) and `add your project concept` (the context document) are unrelated things sharing a word, side by side on one screen, and reading as though one governs the other. Renaming the filter's label to `THE IDEA ONLY` — keeping `focus:'concept'` on the wire, so no protocol, test or lint changes — would dissolve it. Not done: it is copy on a live surface and Prayas's call.

### The toggle no longer reflows its own row, and the surface says what is loaded

Prayas: *"the width of the two toggle states is different so the whole page flashes when toggled"* and *"say clearly when you upload a reading and a project concept and when you upload as reading or project concept only."*

**Width is reserved arithmetically, and it took three attempts.** (1) Measuring both labels at runtime needs the element visible, so it landed a beat late and the first click still jumped. (2) A hidden `::before` carrying the longer string — the widths measured stable across every transition, so it was reported fixed **without a screenshot**. `display:block` on that pseudo-element put the real label on a second line: both toggles doubled in height, the top row wrapped, one toggle stopped being clickable, and the question went back under the composer. Prayas: *"very messy. the two toggles in different lines looks bad. one toggle is not even clickable."* (3) The labels are set in a monospace face, so the width is exact arithmetic — `n * (1ch + letter-spacing)` — with no box, no measurement, no timing. **The lesson is in the ledger as §82: a measurement is not a render**, and when a fix needs its own timing to be right, that is the signal to find a formulation needing no timing at all.

**The toggles were also given a row of their own.** Four controls could not share one line with `‹ back` and the save chip, and the wrap point moved as the labels changed — so the row re-laid itself out on every toggle. A deliberate second row cannot wrap and cannot surprise.

**Superseded note —** A toggle whose two labels differ in width reflows its row on every click — the control jumps, its neighbour slides, the row flashes. `what you paste` against `a document` is a 60px swing, and `everything` against `concept only` has always been one too; nobody noticed while there was a single switch on the row. The first fix measured both labels at runtime and stored the wider, which is self-maintaining against copy changes — but measuring needs the element VISIBLE, so it landed a beat late and the first click still jumped. Three attempts at that timing was two too many. `data-widest` now carries the longer label and a zero-height hidden `::before` renders it, so the box is always the wider state's width with no JavaScript and no timing at all. Verified stable across every transition from the first click: mode 250px, focus 243px.

**Every load state is stated in full.** The note under the composer reported only the LAST file touched, so after opening two it named one and left the other invisible, and after opening one it never said what was missing. All four states are now a sentence, and what is ABSENT is stated too — a missing project concept changes how the questions land, and a student cannot infer that from a panel that simply is not there.

```
nothing      Nothing opened yet. Open a reading to question — a project concept beside it is optional.
concept only Project concept loaded (a-concept.pdf) — context only, never questioned. Nothing is
             under question yet: open a reading to begin.
reading only Questioning a-reading.pdf — no project concept, so the questions are not tied to
             what you are working on. Add one at any time.
both         Questioning a-reading.pdf, in the light of your project concept
             (a-concept.pdf). Both are read in this tab; the files go nowhere.
```

### Two modes, one toggle — and paste is the default

Prayas: *"make the document critique mode and a paste/type mode a toggle - the pre-doc critique mode is the paste/type mode."*

`QUESTIONING WHAT YOU PASTE` / `QUESTIONING A DOCUMENT`, in the same grammar as the focus toggle beside it — switch dot, mono label, hard edges — because they are the same job at the same level. The difference is conscious and nameable: the focus toggle constrains *what may be asked* and stays turquoise; this one chooses *what you bring* and sits in the gold register with the document chips it governs. Two switches in the same colour side by side would read as one control with two halves.

🔴 **`paste` is the default and must stay the default.** It is the surface exactly as it was before documents existed, down to the placeholder and the opening line, and it is the reason documents could be added without disturbing anyone: a student who never touches the toggle sees no change at all. The mode governs one thing — where the text under question comes from — so it shows or hides the document chip and sets the composer's prompt and the stone's opening line to match.

**The project concept is available in BOTH modes, deliberately.** It is context for the questioning either way, and tying it to the document mode would mean a student who pastes a claim cannot say what they are working on.

**The toggle locks once a critique has started.** The object cannot change under a conversation about it; the control disables and says to begin a new critique. Both entry paths — a paste and an opened document — take the lock.

### What a document looks like, after actually looking at it

Prayas, on the first real render: *"looks so bad. redo. the paddings of the top part are not there. is it a summary? is it the doc content? What am I seeing?"* — and then *"the reading and concept upload buttons below are two small and insignificant."*

**A document now says what it is.** Its own title, taken from the first sentence or the words before the date line the extractor folds in; the source filename; the word count; and whether you are looking at all of it or the first 25,000 characters. A pasted paragraph is self-evident in that box and renders exactly as before — this header appears only when a document was opened.

**Bringing a document in is the point of the surface, so it has a real affordance.** Two 10px underlined words under the composer became chips in the established `.dl-transcript` grammar, the primary one filled and the concept one outlined, because context is not a peer of the object. They also report state, so it is never ambiguous which slot a file went to.

**The missing top padding was a symptom.** An unclamped document made the panel tall enough to force a scroll, sliding the save and focus controls under a translucent topbar so they showed half-cut. Clamping removes the cause.

Four mechanisms were present, looked right in the source, and did nothing. `-webkit-line-clamp` was set on an element whose `display` computed to `flow-root`, so the specimen just cut mid-line — replaced with a line-grid height and a fade. `--composer-h` measured the composer while the view was `display:none` and stored `0px`, and **a variable set to zero defeats its own fallback**, taking the clearance from 230px to 56px — worse than the bug it was added for; degenerate measurements are now discarded. The scroll aimed at `document.body.scrollHeight`, stale by the time the header and clamp changed the layout — measured, it left `scrollY` at 0 with 412px of the question buried; it now aims at the turn on the next frame with the composer's measured height as margin, and corrects again once the curtain has attached. And the raw file inputs relied on the `hidden` attribute alone, so a stray `hidden=false` during testing put two native "Choose file" buttons on the page; they are clipped out of the layout now.

*None of this was visible from the code. All of it came from rendering the page and looking, which is what `frontend-design-prayas` requires and what was skipped on the first pass.*

### The plan could not advance, and only a real conversation showed it

Found by the first end-to-end run, 15 August: a fourteen-round critique against the live endpoints sat at `idx 0/6` the whole time, never left `blur`, and the play-acted student disengaged twice — *"you already asked me that."* Two faults compounded and both were silent.

**The pin never released.** `returned` accumulated over the whole transcript and never expired, so one non-adjacent return anywhere in a 32-segment region pinned that station permanently. **And `served` was unreachable** — it required *every* segment of a region to be touched, which on a large region cannot happen, so early advance could never fire either. The plan was behaving worse than the modulo clock it replaced, because the clock at least rotated. Nothing errored, no test failed, and every turn returned a valid station: a plan that cannot advance looks entirely healthy from the outside.

Fixed: a return counts as heat only while recent (`RETURN_WINDOW`), no station holds past `PIN_MAX` whatever happens, and a line counts as engaged when a few of its spots are touched rather than all of them (`SERVED_TOUCHES`). Re-run on the same document: **blur → verified → need-want → behaviours**, four stations in eighteen rounds, zero guard breaches.

🔴 **The lesson is about the instrument, not the bug.** This was unit-tested, and the unit tests passed throughout — they asserted that the plan returns a well-formed station, which it always did. Only running a whole conversation asserts that it *moves*. `scripts/critique-conversation-probe.mjs` now does that, driving the real endpoints with a play-acted student permitted to disengage; `verification/reading-plan.test.mjs` carries the regression.

### Also

- `scripts/critique-conversation-probe.mjs` — a whole critique end to end against the real HTTP endpoints rather than a hand-reassembled route, because this project has twice paid for a copied route that drifted. Declared on the public shelf; its material arrives as `--doc=` and `--concept=`.
- The UI was rebuilt after being rendered and looked at. The concept had been a second bordered specimen box stacked under the artefact — two equal rectangles down the middle, which is three things the house style refuses at once (rectangular cards, a symmetric centred stack, the active void filled), with the first question running underneath the fixed composer. The concept now sits on the painted ground, clamped to two lines, dimmer, marked by a soft vermilion mass rather than a red word — so the composition says which document is under question, not just the label. *This should not have needed a second pass: `frontend-design-prayas` is binding for any UI work here and was not invoked the first time.*

### Four bugs found by building it, all silent

- **The window inflated.** Skeletonising every passage to its first nine words is compression only when passages are long. On 589 one-sentence segments it measured 28,095 characters against a 25,000-character source — bigger, on exactly the input the feature was for, with nothing failing and the bill quietly larger. It is budgeted in characters now, and the budget is asserted in both directions.
- **Completion emptied the region**, which sent `windowOf` down its "no region, show everything" path and put the whole document back in the prompt — the cost blowout arriving precisely when the plan succeeded. The walk laps instead; `complete` still flips once. A floor in `windowOf` now catches it independently, so two things must go wrong.
- **A fixed document-frequency ceiling empties short documents.** At one segment every token sits in 100% of them, so nothing is informative, nothing is ever touched, and the plan routes at random forever without throwing. `ceilingFor` opens the ceiling below four segments.
- **The separator counts.** `windowOf` budgeted without the newline its join adds and `conceptDigest` without the space; both landed a hair over and neither threw. Twice, in one file.

### Also

- `POST /api/criticism/turn` now segments the artefact, which it never did — it only ever used a spot the student had clicked, and the plan needs the document's segments to know where it is. Recomputed from the artefact the client posts back, so there is still one source of truth and no state.
- PDF text extraction spaces words by geometry, not by joining text items — pdf.js splits runs at kerning changes, so joining with a space produced "progr essive" on the first PDF tested. Hyphenated line breaks are rejoined. A break with no hyphen is indistinguishable from a word boundary and is documented as an unfixable limit rather than papered over.
- `verification/focus-threading.test.mjs` pinned the exact argument list of the criticism guard and broke the moment a correct call gained arguments. It now reads like the enquiry assertion beside it, which had the loose form all along.
- `scripts/audit-criticism.mjs` carried a comment naming `pickCriticismPointer` as the route's chooser. Corrected — and the harness now genuinely diverges from the route on unlocated turns, which is noted there because reading a run as faithful would repeat the 9 August error.

### Not done

The plan is **unmeasured**, and the project has a null on its neighbour: `readArc` was removed from the enquiry steering path at v0.11.0 because it traversed every aim correctly while the questions stayed identical in kind. The argument for why it need not transfer is that the object differs — a fixed external text with enumerable spots, so a plan is a reading order rather than a direction imposed on somebody's thinking. That is an argument. Measure it against the clock with `flow-probe.mjs` before believing it. The narrow (760px) render is also unverified: the browser would not resize below 1920 on the machine this was built on.

## [0.14.3] — 2026-08-13

### `app/scripts/` is the public shelf, and a file lands there by being declared

Prayas, after the v0.14.2 publish: "make sure nothing is put in the scripts folder anymore." Then,
when a private folder had been built to hold the overflow: "nothing to be withheld … what is ok with
going public can go there."

`publish-public.sh` copies five directories wholesale — `lib`, `corpus`, `public`, `scripts`,
`verification` — so anything left in `scripts/` publishes whether or not anybody chose to publish it.
It has cost twice, and neither was catchable by content: a student's 41-reply transcript staged for
publication on 29 July, and `repair-probe.mjs` reaching the v0.14.2 manifest on 13 August with two of
a student's sentences verbatim, their project goal in their own words, and a retrieval query naming
their subject. **Every guard passed it** — 153 roster names checked, no hit, no forbidden filename.
Nothing was wrong by the rules as written. A content guard refuses only what it recognises, and a
project subject is not a name.

So the check moved from what a file contains to where it sits. `scripts/` is the shelf for work that
is fine to be public, and putting something there is the act of saying so. That declaration is a list
in `verification/scripts-are-public.test.mjs`, which fails on any undeclared file and on any deletion
not recorded; `publish-public.sh` aborts on the same condition, reading **that same list**, so the two
cannot drift. Both proved by planting a file and watching them refuse, then removing it.

**No private overflow folder exists, and one should not be built.** An `app/probes/` was created for
exactly that and removed within the hour. The code stays public; the *material* moves.
`repair-probe.mjs` now takes `--cases=<file>`, defaulting to a fixture in publish-excluded
`docs/ops/`, and carries a synthetic set inline so it runs for anyone who clones it — announcing at
runtime which set it is on, because a probe that silently substitutes invented material for a real
session is measuring something else under the same name. It is the pattern `flow-probe.mjs` has always
used with `--replay=<fixture>`.

243 tests. No runtime behaviour changed.

## [0.14.2] — 2026-08-13

### The studio strip's `hidden` attribute never hid it

Prayas, looking at his own header: "stray studio word besides review". It was there for everyone
outside the AI Club cohort — every memorability student and every personal-tier account — from the day
the strip moved into the header on 10 August.

`#navStudio` carried `hidden` in the markup and `.nav-studio` set `display:flex` in the stylesheet. An
author rule outranks the user agent's `[hidden]{display:none}`, so the attribute was decorative and the
element rendered always. For anyone who is not an AI Club user `buildStudioNav` never runs, so no tool
links were appended and what remained was the kicker alone: the word *studio*, its turquoise divider,
and nothing after it. Below 900px the media query hides the kicker too, so there it showed as a bare
divider and a gap.

The fix is `.nav-studio[hidden]{display:none}`. The same guard is written correctly four times
elsewhere in the file — `.topbar`, `.edge`, `.dl-transcript`, and `#studioFooter`, which is the *footer
half of this same feature*. The knowledge existed and did not travel across the move.

**`verification/hidden-guard.test.mjs`** now reads the markup against the stylesheet and fails when any
element carrying `hidden` has a bare selector that sets `display` without a matching `[hidden]` rule.
Proved by removing the fix and watching it fail, then restoring it — a guard that has never refused
anything has not been shown to work. 241 tests.

Nothing else changed: the two gates, the tool list, and the credit meter are exactly as shipped in
0.12.0.

## [0.14.1] — 2026-08-12

### The concept-only control, where it can actually be found

Prayas asked "where is concept switch?" while looking straight at the page it was on. That is the whole
bug report and it is a good one: the control existed, worked, and shipped where nobody would find it.

It had been the **last item in the composer's status line** — 10.5px, faint grey, below the composer,
sitting after "grounded in design · the question is yours to answer". Everything beside it is passive
caption text, so it inherited that reading. A hollow 9px square at the end of a grey sentence is not an
affordance; it is punctuation.

It now sits in the **top row beside the save-transcript chip**, as a bordered chip with the same grammar
— hard 0-radius edge, hairline border, machinery type — but turquoise rather than gold, because the save
chip is an **action** and this is a **state**. And it names its state rather than leaving it to be
inferred from whether a box is filled: `asking about EVERYTHING` / `asking about CONCEPT ONLY`.

No behaviour changed. The filter, the guard and the flag are exactly as shipped in 0.14.0.

## [0.14.0] — 2026-08-12

### A switch that asks the stone for the concept, not the making

Both surfaces now carry a `concept only` switch in the composer. When it is on, the stone questions the
idea — what the thing is for, what it means, who it is for, what it assumes — and does not ask how it
would be made, produced, repaired, or what it would cost to produce.

**The line is narrow, and that is a decision rather than an oversight.** Making means fabrication,
tooling, material afterlife, repair, durability, cost-to-produce. Form, medium, styling and
truth-to-materials stay askable, because those are questions about what the thing *is*.

**It is enforced, not requested.** Two halves, because either alone is a control that does not control:

- **Retrieval** drops the 22 corpus entries marked `**register:** making`, so the material is not in the
  pool the question is composed from. A vocabulary heuristic cannot draw this line — the mark is a
  judgement written in the corpus where it can be read and corrected.
- **The guard** refuses a question that lands on production anyway and regenerates it once, exactly like
  the never-answer guard. A prompt line states the constraint as well, but this project has twice
  measured that a direction in the prompt does not displace the move the model was going to make.

**Measured over ten-round conversations against the real endpoints, two student types.** For a student
preoccupied with production, seven of ten questions would be production questions without the switch,
and **zero** reach them with it on; making tensions went from 7–10 turns out of 10 to **0 of 10**. For a
terse student on a project with no fabrication in it, the switch is invisible: same retrieval depth
(3.0 tensions a turn either way), no empty pools, no spurious refusals.

**Three faults the conversations found that no unit test could.** The criticism surface was wholly
broken — `focus` was read in the handlers but used inside `askCriticismQuestion`, a different scope, so
every turn died with `focus is not defined` while all fifteen unit tests passed. Widening the making
vocabulary made the refusal rate *worse*, because the breaches were in the **warmth preamble**, which
echoes the learner's own words as Clean Language requires; the check now reads the question, not the
preamble. And the abstract vocabulary of production is not what a stone actually uses — it asked about
tenon sizes, plywood dimensioned to standard sheet sizes, and hex keys, so the list now reaches the
fabrication particulars.

### A DIY / hacking / incremental lens — nine entries

A new always-on lens, `diy-hacking`, aimed at the assumption that a design is authored by its designer,
arrives finished, and is used rather than altered. Nine tensions, held two-sided: modding as unpaid
labour against modding as unalienated work (Kücklich; Postigo) · repair as the normal condition against
the rebuild some things need (Jackson) · making against caring (Chachra; Franklin) · the convivial tool
against legitimate expertise (Illich) · half a good house against what the unbounded increment did to it
(Aravena/Elemental; O'Brien et al. 2020) · open source as survivability against the unpaid maintainer
(Eghbal) · the user who already solved it against the limits of lead-user theory (von Hippel; Trott et
al.) · curiosity above permission against whose system it is (Levy) · and Linus's Law against the
evidence, where files touched by nine or more developers were roughly sixteen times more likely to carry
a vulnerability (Raymond; Meneely & Williams; Schryen).

Every citation was verified at source before the entry was drafted — Exa for the positions, Consensus
for the empirical literature — never from model memory. **All nine carry `provenance: pending`** and stay
so until the three-pass and Prayas's Gate-4 sign-off. Corpus is now **274 entries**. None of the nine is
marked `making`: the interesting tensions in this territory are about authorship, labour and power over
tools rather than fabrication, which is why they survive the concept-only focus.

**Nine of a requested thirty.** Verification sets the pace, not breadth (invariant #0). The remaining 21
have candidate anchors named and unverified in `docs/corpus-build/corpus-build-tracker.md`.

### A lint so the filter cannot rot

An entry with no `**register:**` line defaults to the concept side, so the next production tension
anyone writes would leak through the filter silently — the same shape as the legacy-provenance default
that told students "framing verified" for entries nobody had read. `verification/register-lint.test.mjs`
fails when an entry's own vocabulary reads as production and its register is left undecided. 240 tests.

## [0.13.0] — 2026-08-12

### A critique can be saved, the same way an enquiry can

The enquiry view has carried a download since the surface was stateless; the criticism view never did,
though the argument for it is identical. Both surfaces store nothing, so closing the tab is the end of
the work either way. The criticism chat now carries the same chip — `↓ save your critique · .md · .pdf`
— revealed the moment a text is pasted, and hidden in the canned demo, where none of it is the viewer's.

**What the file carries:** the text under question, the stone's questions, and the student's own
responses. **What it does not carry: the sensed reading.** That is this surface's *curtain*, and the
enquiry transcript has never carried its curtain either — no retrieved tensions, no citations. Following
that precedent also keeps a claim on the about page literally true: a reading is a self-frame and never a
benchmark, and three ratios written into a file that leaves the tab are a portable number that can be set
beside somebody else's.

### The gap the new file opened, closed in the same change

Both files declare `source: zetizeti`, so a saved critique would have parsed straight through the
enquiry pick-up: the questioned text becoming the student's own edge, and questions asked about somebody
else's text replaying as their enquiry. Nothing would have errored. `parseTranscriptMd` now requires
`type: idea-transcript` and refuses a critique by name. Every transcript ever written by the download
carries that line, including the real one in `docs/ops/fixtures/`, so nothing a student holds is orphaned.

### Also

- **A pasted paragraph is not a goal.** The enquiry topic is a line the student wrote and slicing it at
  120 characters is usually harmless; a critique's topic is a pasted paragraph, so the first render cut
  mid-word ("…prefer a minimal int"). The topic now takes a whole first sentence where there is one, and
  otherwise elides on a word boundary; the filename slug does the same.
- **One PDF writer for both surfaces** (`pdfWriter`), so an enquiry and a critique print as the same
  document family rather than as two near-copies of the same layout code.
- Seven tests, lifting the real builder out of `public/index.html` rather than reproducing its format —
  including one asserting that no ratio, no reading and no located-blur vocabulary reaches the file. 212
  assertions pass.

## [0.12.4] — 2026-08-11

### Two flags removed, not switched off

**`ZETIZETI_LOCATED_MODE` and its enum branch are gone.** The gloss-vs-enum question was measured
twice — 9 August without the route's posture, 11 August with it. Enum repeats the "whose call" frame
about twenty points more often in *both* runs, and under faithful composition its advantages evaporate:
brevity falls from 5.3 words to 1.9, and the multi-question win disappears entirely. Gloss wins, so the
switch went rather than being left off. Tables in `docs/ops/flow-probe-log.md`.

⚠️ What is *not* settled is a position rather than a measurement: the gloss **interprets** — a closed
set of four strings, but composed in the layer that writes sentences. If that is ever ruled
unacceptable, the answer is the third mode the log names, enum tokens plus a *non-interpretive* varying
element, built deliberately. Not this flag, resurrected. `verification/located-mode.test.mjs` now
guards the removal instead of the experiment: setting the retired variable must change nothing, no enum
rendering may survive, and `dialogue.mjs` must not read the name at all — the last one is source-shape,
because the behavioural test passes just as well if the flag is read and its result discarded.

**`ZETIZETI_DEMO_USAGE` is gone.** It made `GET /api/usage` return **invented** figures — a hardcoded
$32.40 of $52.60 — to any signed-in user whenever it was set. That endpoint is the AI Club credit
meter. Added 10 July 2026 in `f7b77fd`, the same commit that built `lib/credit-engine.mjs`, which
shipped inert: on that day there was no engine, no allowlist and no student with a key, so the meter
had nothing real to draw and this drew something fake instead.

It was never documented — not in the commit message, not in `.env.example` — and its justification
expired silently. The allowlist was set on 10 August, putting 26 students on that path, and a scaffold
for a meter with no data became a switch that would show real students invented balances. Its only
protection was that nobody had set it. **A flag that makes a live endpoint report fabricated numbers to
a student is a never-mislead problem wearing a demo's clothes.** Screenshots come from a real account
or they do not come.

Runtime env vars read: **31, down from 33.** No behaviour change in production, where neither was set.

## [0.12.3] — 2026-08-11

### Three invariants that claimed more than the code delivers

From the withholding-mechanisms audit (items 5, 6, 14). No behaviour changes; all three are
over-claims in prose, and the same shape each time — asserting *absence* or a *rule* where what exists
is a *guard* or a *missing wire*.

- **Invariant #3** was constitutive: *"the never-answer guard must hold."* It is regulative. The guard
  reads a finite list of marks and refuses output carrying them; it does not certify that no answer was
  given, and a leading question with no forbidden word passes. The buffer is also re-described as the
  interval in which judgement becomes possible, not only as latency traded for enforcement.
- **Invariant #7** was a division of labour — *"the nudge layer sends a posture, never a diagnosis"* —
  and a rule about who does what can be violated. It now states the access fact: `decideNudge()`
  returns `{ posture, fired }` and only `posture` is read by `buildTurnContext`. There is no wire.
- **The residency section** claimed *"no code path capable of retaining a conversation on its own
  enters the running service."* `lib/capture.mjs` is such a path and does ship. What stops it is
  `isCaptureEnabled()`, requiring `ZETIZETI_CAPTURE_DIR` **and** `NODE_ENV !== 'production'`. The guard
  is sound; the sentence was not.

🔴 **The audit's own acceptance criterion — grep for the sentence you REMOVED, not the one you added —
earned its keep.** Invariant #7's phrasing existed in four more places, including the **public**
`CONTRIBUTING.md`. And the first pass wrote the residency correction directly above an uncorrected
copy of the very sentence it was correcting.

### Also

`describeLocated` extracted to `lib/dialogue.mjs` and imported by both `server.mjs` and the audit
harness. It had been two copies and they had already drifted — the harness's silently omitted the
tokens, so a gloss-vs-enum comparison would have read `unspecified` for both modes and looked like a
clean null. Same defect class as v0.12.2's turn cap: one of two copies. The harness now also passes
the route's posture, which it never had; the gloss/enum comparison is settled in `flow-probe-log.md`.

## [0.12.2] — 2026-08-11

### The criticism surface refused every student, and had done since 29 July

**A missing `POOL_USER_TURNS > 0` guard.** `ZETIZETI_POOL_USER_TURNS = 0` means the per-user turn cap
is **disabled**, not that zero turns are allowed. The enquiry path checks
`POOL_USER_TURNS > 0 && ut >= POOL_USER_TURNS`. The criticism surface's key resolver checked only
`ut >= POOL_USER_TURNS` — true on a student's very first turn — so *"Push back on an idea"* answered
every `pool-students` user with **"You've used today's 0 messages — please come back tomorrow."**

Live from **29 July**, when the adaptive ₹ allowance replaced the fixed turn count and production
flipped the variable to `0`. The enquiry path was updated in that change; this one was not. Thirteen
days, the whole student cohort, one surface entirely unusable.

**Two reasons it stayed invisible, both structural.** The operator sits on `pool-personal`, which
returns from that resolver *above* the cap checks — so the only person able to notice it is on the one
tier whose code path never reaches the line. And the message blames the reader: a student who is told
they have used today's messages concludes they have a quota, not that the tool is broken. It surfaced
only because a student was asked for a transcript and said why she could not produce one.

- `server.mjs`: the guard added, matching the enquiry path.
- `verification/turn-cap-guard.test.mjs`: **new.** Reads *every* `>= POOL_USER_TURNS` comparison in
  `server.mjs` and fails if any lacks the `> 0`. Deliberately a source-shape test — the defect was
  never that a check was wrong on its own, but that one of two copies drifted, and only a test reading
  both would have caught it. Proved against the pre-fix source, where it names `server.mjs:793`.

209 tests pass, up from 206.

## [0.12.1] — 2026-08-11

### Dev traffic now says it is dev

Every call this project has ever made to OpenRouter — production turns and probe runs alike — carried
`X-Title: zetizeti`. So the one surface anywhere that could tell development apart from real use could
not, and nothing else could either: `flow-probe.mjs` discards the `onUsage` callback and writes no
ledger row, so `pool_spend` has never seen a probe.

The cost of that showed up on **28 July 2026**, when twenty-three probe runs spent roughly **$7 across
~7,500 calls** and were indistinguishable from a student cohort in the spend logs. They could be
separated only by noticing two token populations by eye — a small prompt with a long reply is the
play-acted student, a large prompt with a short question is the stone.

- `lib/llm.mjs` now sends `appTitle || ZETIZETI_APP_TITLE || 'zetizeti'`, read at **call** time rather
  than at module load, so a script can set it after its imports have already been evaluated.
  `streamQuestion` takes an explicit `appTitle` that outranks the environment.
- The eight model-calling scripts set `ZETIZETI_APP_TITLE ||= 'zetizeti-dev'`.
- `flow-probe.mjs` bills the play-acted student separately as `zetizeti-dev (student sim)`. It is
  roughly half the spend and it is the measuring instrument, not the tool.

**Production behaviour is unchanged and no new CapRover variable is needed** — unset still means
`zetizeti`. 206/206 tests pass, and the header was proved live rather than asserted: one call at
$0.0000035 filed under `zetizeti-dev`.

⚠️ A new script that calls a model and omits the line is invisible again, and nothing fails. The
convention is in `CLAUDE.md`; it is a convention, not a guard.

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
