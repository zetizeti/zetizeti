# Dialogue flow — a work description

*Written 20 September 2026. Not a plan that has been agreed and not work that has been done. It describes how insights about dialogue flow would be got from real dialogue and landed in `lib/arc.mjs`, and it says at each stage what would make the approach fail.*

## The fault

***"students get tired with zetizeti dialogue - it is constant hammering"*** · ***"dialogue is not hammering. it has ebb and flow"*** (Prayas, 20 September 2026).

This is an observation of real students, not a reading off an instrument, and it is the only statement of the problem this document treats as settled.

🔴 **The tool cannot ebb, and it is enforced.** `lib/dialogue.mjs` pushes the reason *no question present* at lines 566, 1178 and 1535 — once per surface. A turn without a question mark is a breach, repaired once, and delivered flagged if the repair fails. **So every turn is a question by construction.** Ebb and flow needs at least two amplitudes; this has one. That makes the fatigue a property of the form rather than of the questions, and no amount of better questioning reaches it.

🔴 **DECIDED, 20 September 2026: no answers stays; every turn a question goes.** Prayas: ***"constant questioning feels like hammering"*** · ***"no answers is fine"*** · ***"every dialogue does not need to be a question"***. The never-answer commitment is untouched and is not in question.

🔴 **Invariant #3 has always bundled TWO commitments, and they are two adjacent lines of code.** `lib/dialogue.mjs` line 566 pushes *no question present*; line 567 runs the FORBIDDEN patterns — *you should*, *the answer is*, *to summarise*, *here is how*. **Never answer and always ask are separable, and only the first is the position.** The second rode along with it in one function and in one paragraph of documentation, and it is what makes the tool incapable of an ebb. Keeping FORBIDDEN exactly as it is costs nothing and gives up nothing.

🟢 **So the permitted ebb move is defined by subtraction: a turn that is neither a question nor an answer.** FORBIDDEN still refuses the answer; dropping the `?` requirement permits the rest. That space is not empty — an acknowledgement is neither, a saying-back of their own words is neither, and a short beat that holds without advancing is neither.

🔴 **And one such move already exists, bolted to a question.** The warmth clause may open a turn by saying back, in the learner's exact words, the thing they have just named — an acknowledgement, never a verdict, policed by `ownWords`. It is already composed, already guarded, already in the learner's own language. **Today it may only arrive attached to a question.** Letting it stand alone is the smallest possible ebb and needs no new composing capability whatever.

⚠️ **The change is an option, not a deletion, and it goes in one place.** `validateOutput` already takes `noBinary`, `noClosed`, `noCompound`, `noJargon`, `noDefine` — the shape is established. A `mustAsk` defaulting to true, switched off by a reading that says this turn is an ebb, fits it exactly. 🔴 **It must be done in `sharedFormChecks`**, because *no question present* is written three times — lines 566, 1178 and 1535, one per surface — and a check that exists on one route and not another is the guard-parity fault this project has already shipped twice.

## What is not known, and why this document exists

The vocabulary usually reached for here — delay, digression, escalation, entering late and leaving early, on the nose — is received. It is a paraphrase of screenwriting craft, not a reading of scripts, and a plan built on it would be a plan built on a stereotype of flow. 🔴 **The work is to replace that vocabulary with counts taken from real dialogue.** Where this document names a quantity it is a quantity to go and measure, never one already known.

## Stage 0 — measure the fault in his own dialogues first, before any script is opened

**Free, no model calls, and it may settle the question on its own.** The material is already fixtures: twenty-one class dialogues and a set of guided prep dialogues, all kept private, 488 questions in the class set alone.

The signature of tiring is a **decline in the learner's reply length as the dialogue goes on**. Count words per reply against turn index, per dialogue, and pool. A flat line says the fatigue is not where it is assumed to be and the rest of this document is aimed wrong. A decline gives the fault a shape, a rate and a depth at which it sets in, which is what every later stage would be tested against.

🟢 **A second instrument already exists and is unread.** `turn_depth` — the survival curve, v0.11.4 — counts one row per depth, so the drop between depth N and N+1 is exactly how many conversations ended on the Nth question. It is admin-gated and nobody has looked. **If students are tiring, it is already recorded.** Reading it costs a sign-in.

### Stage 0, run on 28 September 2026

**The fault is real, and it is a step, not a slope.** In the twenty-one class dialogues of 9 September (467 replies, the opening edge excluded), the pooled median reply holds at 15–20 words for the first eight replies and falls to about 10 from the ninth, reaching 5–8 words past the twentieth. The later figures are thinned by who is still writing, so the check that matters is within the same people: in the fifteen dialogues that reached sixteen replies, the median fell from 14 words (replies 1–8) to 9 (replies 9–12) and held near 10 (13–16). Ten of the fifteen wrote less after the eighth reply, down to 0.37 of their start, and five wrote more, up to 1.75. So it is most students, not every student, and it sets in at about the ninth question.

**The guided prep dialogues barely show it** (last third against first third 0.98). The prep walk moves through six fixed stations, and a change of station may already work as an ebb. That is a reading of one number, not a finding.

**The blank as built on 21 September does not reach it.** Its trigger, a reply of three words or fewer, fires mostly on students who write tersely from the first reply: 18% of replies 1–4 against 12% of replies 13–16 in the same fifteen dialogues. It reads a writing style, not tiring.

**A candidate rule, admitted by the Stage 4 test and built (uncommitted) as `readsAsTiring` in `lib/pace.mjs`.** From the tenth reply, when the last two replies are both under half the person's own median over replies 1–8, and that median is at least ten words, the turn is a blank. It is computable by replay. It fires on the four dialogues that fell most and not on the one that rose most, and it fires once, late, on one that rose. The three numbers are Claude's, not Prayas's, and each reverts in one line. It opens the same blank as a non-answer, under the same never-twice-running rule. **Superseded the same evening:** on a local test Prayas found the blank firing on a real three-word answer and ruled that *"it should be used for dramatic effect"*. Both reply-length triggers were removed, and the blank now comes only after a felt-shift LEX event (the learner naming what matters), from reply 3: 10 of 467 class replies. Tiring remains a finding without a mechanism. Left open: a tiring learner who stays low gets a blank on every other turn, which may read as an ebb or as a pattern, and only watching a class will say which.

⚠️ `turn_depth`, the second instrument, is still unread.

## Stage 1 — the reference distribution, from dialogue somebody else wrote

The question to put to a corpus is narrow enough to answer and decisive enough to be worth answering: **how long is a run of consecutive questions from one party before that party does something else?** If real dialogue almost never runs past two or three, zetizeti's unbroken run of N is the fault stated as a number, and the permitted length is the first parameter.

Corpora that exist and can be counted, with what each is:

- **Cornell Movie-Dialogs Corpus** — 220,579 conversational exchanges, 304,713 utterances, 617 films, distributed through ConvoKit with per-character and per-film metadata. The standard resource; used and cited widely enough that a finding taken from it is legible to others.
- **Film Corpus 2.0** (UCSC Natural Language and Dialogue Systems) — 1,068 scripts, of which 960 have dialogue separated from scene description. The separation matters: it is the difference between counting speech and counting stage direction.
- **Movie-DiC** — 132,229 dialogues, 764,146 turns, 753 films, with the extraction method documented including what it discarded and why.
- **Movie Scripts Corpus** — about 2,858 scripts with structural annotation, including a rule-based screenplay annotator.

🔴 **Provenance is established per corpus before use, and I have not established it.** These are research datasets derived from scraped scripts; what each licenses is a question for their own pages and is not answered here. What is taken is a distribution, never text, so nothing of theirs enters `corpus/` and invariant #2 is untouched — but that is an argument about the output, not a clearance for the input.

⚠️ **The load-bearing caveat, and it could kill the stage.** Film dialogue is written. Both parties are authored, and a scene's rhythm exists because somebody built it. So a number taken from scripts is a **craft norm — what writers think reads as dialogue** — and not a fact about how people talk. That may be exactly what is wanted, since the complaint is that zetizeti does not read as dialogue. It is not evidence about real conversation, and any finding must be labelled as the first and not the second. Where a natural-talk comparison is needed, the dialogue-act-tagged Switchboard material behind Stolcke et al. is the reference, and the difference between the two distributions is itself informative.

### Stage 1, run on 28 September 2026

Counted from the ten screenplays already parsed for the timing study (`docs/ops/script-study/turns.json`; counts only, no line of any script is used). A turn counts as a question when a question mark falls near its end, and runs are not reset between scenes, so the figures are rough. **The character who asks most in each film asks in 34–64% of their own turns** (the therapist in *Ordinary People* 59%, Lecter 45%, Landa 48%). **Across all speakers, a run of questions has a median length of 1, nine runs in ten are three or shorter, and the longest is 14.** zetizeti asked in about 98% of turns. This is a craft norm, what writers think reads as dialogue, not a fact about talk. It set the ceiling of three questions in a row (`MAX_QUESTION_RUN` in `app/lib/pace.mjs`, 29 September).

## Stage 2 — name the moves, using a taxonomy that already exists

🔴 **Do not invent a scheme.** Tutorial dialogue has been annotated with dialogue-act taxonomies for two decades, and adopting one makes any finding here comparable with a literature instead of private. Candidates: Buckley and Zinn's taxonomy of tutorial dialogue moves; the schemes behind Rus et al.'s tutorial dialogue-act classification; and Cade et al.'s **modes** — sustained, pedagogically distinct phases that give context to individual moves, which is the literature's name for ebb and flow.

Then tag zetizeti's own dialogues with the same scheme. **The expected result is that it occupies one cell**, and the value of doing it is that the gap stops being an impression and becomes a table.

## Stage 3 — find where the ebb sits in the sequence

The established method is sequence and sub-sequence mining over tagged dialogue, with hidden Markov models where latent modes are wanted: Boyer et al. induced tutorial strategies this way, D'Mello identified two-step excitatory transitions between moves, Maharjan et al. used sub-sequence mining to separate effective from ineffective sessions, and Solomon et al. found five-turn motifs in supportive conversation.

🟢 **The closest finding to this problem is Vanacore et al. (2026).** Across seventy-seven online maths tutoring sessions they found three latent states — Inquiry Elicitation, dominated by repeated prompting; Direct Instruction; and Affective Support — and the engagement result was about **ordering**: sessions that began in Inquiry Elicitation and ended in Affective Support drew more student talk. zetizeti is Inquiry Elicitation, permanently and by enforcement. That is the hammering, named in a literature, with an engagement finding attached to leaving it.

What Stage 3 must produce is not a theory but **candidate rules of the form: after this, that** — stated so code can compute them from a transcript.

## Stage 4 — landing it in `lib/arc.mjs`

Flow lives in `arc.mjs` and is entirely code: `readDwell`, `readRut`, `readRepeat`, `readReturn`, the head and opener bans. Every flow capability this project has arrived as a reading plus a guard, and none arrived as prose.

🔴 **The admission test, and it comes from a measurement taken on 20 September 2026.** A candidate rule is admitted only if it is **computable from the transcript by replay**. On that date the resident method core's exemplar question-forms were shown not to reach the output at all — across eighty delivered questions, forty with the forms present and forty with them removed, three indicted forms appeared zero times in both arms, while `APPROACHES[0]`, steered per turn from code, appeared twice in each. **One lever reaches the questions and the other does not.** A flow insight that can only be stated as advice in the prompt will be inert, and inert in a way nothing reports.

🔴 **And it must discriminate.** It fires on at least one real fixture and does **not** fire on a matched control — the standard set by `RUT_WINDOW`, where fixture `a` ruts, `b` does not, same person and same day. A rule that fires on everything is a rhythm imposed rather than a rhythm read, which is the same fault the lens relevance test exists to catch.

⚠️ **One prior to beat, so it is not rediscovered.** `readArc` already carries `MOVEMENTS = ['locate', 'press', 'land']` — a three-beat shape, which is structure-of-a-scene thinking — and it was **measured null on the enquiry surface**. Scene structure has been tried here once and did not land. That is the bar, not a reason to refuse.

## What is Prayas's, and is not decided here

🟢 **Settled on 20 September 2026:** never-answer stays absolutely; a turn need not be a question.

**Open.** Which non-question moves are permitted, beyond the acknowledgement that already exists — a silence, a short holding beat, a saying-back that does not advance are different products and he has named none of them. How long a run of questions may go before an ebb is required, if that number is to be set by hand rather than read off Stage 1. And whether the ebb is a fixed cadence or a reading: **a cadence is a metronome, and this codebase has been bitten by one twice** — the approach rotation's constant phase gave twenty dialogues the same opening line, and the opener ban set the period of a loop it was written to prevent. An ebb on every fifth turn would be the third.

## Timing as a variable, and how it could be implemented (Prayas, 20 September 2026)

***"timing should also become a variable. timing creates drama"*** · ***"how will you implement timing? in conversational ui that will be a unique experiment"***

🟢 **The channel is already open and nobody is using it.** Invariant #3 buffers the turn — composed, validated, repaired once, then delivered whole, explicitly **not** streamed token by token. That cost was paid for enforcement, and it accidentally bought the one thing a streaming tool cannot have: **an interval in which nothing is on the person's screen and the tool is deciding.** A token-by-token interface has nowhere to put a pause. This one has a pause already and currently fills it with whatever the model and the guard happen to take.

🔴 **The asymmetry that makes this hard, and it is not a UI detail.** In a scene the audience watches the actor hold the beat, so the pause is *visible* and reads as intent. In a conversational interface a pause is invisible and **indistinguishable from a failure** — this project has already had a student read a silent stream as `connection lost`, which is why the keepalive exists. A delay the person cannot see is not drama; it is a bug they are experiencing.

**So the order of implementation is content first, mechanism second.**

**(a) The ebb as a turn, not as dead time.** A turn that acknowledges and does not ask *is* the beat, and it arrives as text, so nothing reads as broken. This needs no timing machinery at all and is the same change already described above — the acknowledgement clause, freed to stand alone. 🔴 **Do this one first**; it delivers the rhythm without ever leaving the screen blank.

**(b) A delay derived from what they just did.** Not a constant and not random: the pause after a long or difficult reply should differ from the pause after three words, and that is computable from the transcript by replay like every other reading here. ⚠️ **The design problem is the indicator, not the delay.** A typing indicator converts a pause into a promise of imminent arrival, which is the opposite of a beat — a beat is silence that does not promise. What is shown during the interval decides whether the delay reads as thinking, as courtesy, or as a hang, and that is a question for a rendering, not for `arc.mjs`.

**(c) Pace off their rhythm rather than imposing one.** The client knows whether the person is still typing; the tool could decline to arrive while they are mid-thought. ⚠️ Bounded by the ephemeral pivot — nothing may be kept between turns, so anything stateful is out and any timing must be derivable from what the client already posts back.

⚠️ **What the scripts can and cannot give here.** They encode pause as written action between speeches, so the corpus can say how long a beat is *relative to what preceded it*, in lines. It cannot give seconds, and converting one to the other is an invention. Any figure in milliseconds is Prayas's to set or to read off real use, never a number taken from a screenplay.

## Choosing the treatment — procedural music, ambience, sound marks, colour field (20 September 2026)

***"figure a way to choose between layered procedural music / nature sounds / env sounds and color fields like screensavers"***

🔴 **THEY ARE NOT FOUR FLAVOURS OF ONE CHOICE. They do different jobs, and three-quarters of the choosing is done by saying which job is wanted.** The fault is that a pause in a text interface is invisible and reads as a broken connection; the aim is to make duration legible and to moderate pace. Against those two, the four separate cleanly.

| treatment | makes the pause legible | sets pace | works with no sound | competes with reading |
|---|---|---|---|---|
| **layered procedural music** | yes, audibly | **yes — tempo is a shared clock** | no | no |
| **nature sounds** | yes, audibly | no — a rain bed has no tempo | no | no |
| **environmental / room tone** | yes, audibly | no | no | no |
| **colour field** | yes, visibly | weakly | **yes** | **yes — same channel as the text** |

🔴 **ROOM TONE IS NOT THE WEAK FORM OF MUSIC. It is the century-old craft solution to precisely the fault named here.** In post-production room tone is recorded deliberately so that a silence has texture, because a cut to true digital silence reads to an audience as the sound having dropped out — as a fault in the film rather than a pause in the scene. **That is the same problem as a blank chat reading as a lost connection**, and the film industry solved it by making silence audible without making it mean anything. Room tone claims nothing, says only *you are still somewhere*, and has no opinion about how you are doing.

⚠️ **Nature sounds and room tone are not interchangeable, and the difference is register, not fidelity.** Rain and birdsong are the sound of a wellness application. They arrive carrying calm-down-and-breathe, which is an affective instruction this tool has no business issuing and which sits badly beside a spare, unsentimental voice that refuses to reassure. Room tone carries nothing. **Of the two, room tone is the one that fits what this project already is**, and nature sounds would put the dialogue in a register nothing else here holds.

**So the real either/or is procedural music against the colour field**, because they answer the same question in different channels and cannot both be the primary — while **room tone is the floor under all of them**, the cheapest thing that stops a pause reading as a fault, and the one to try first because it makes the least claim.

🔴 **AMENDED 20 September 2026 — the sound MAY follow the dialogue, and the line moved rather than dissolved.** Prayas: ***"it should follow the content of the dialogue"*** · ***"no verdict, but movement - not direct"***. What is permitted is **movement**: one slow internal value that a turn *nudges* and that then travels over about fifteen seconds — far longer than a turn — so nothing coincides with an utterance. After several pressing turns the bed has closed a little; after an ebb it has opened. **You could not point at a second and say the tool said something about you, which is the difference between weather and a remark.** 🔴 **What stays forbidden is CORRESPONDENCE**: a first attempt mapped each move to its own sound — asking fell, an ebb rose, pressing went low — and that is a caption. A sound legible turn by turn is one turn away from being read as comment, and the guard reads text and cannot hear. **The rule is now: the sound may drift with the dialogue; it may not annotate it, and it may never grade the person.** The original argument is kept below because the eliminations it makes still stand. Anything that responds to what was said *in a way that can be read back* is a verdict delivered in a channel no guard can read — `validateOutput` reads text and cannot hear a swell or see a colour shift, so a content-reactive treatment would be the smuggled verdict in the one place nothing is watching. **Every one of the four marks time and knows nothing about the dialogue.** And all four are off by default: a student on a shared machine, in a hostel or without headphones would have it done to them rather than offered.

⚠️ **The colour field carries a cost the other three do not**, and it is the reason I would not make it the primary. Text and colour occupy the same channel — the eye — so a field that moves enough to express duration is competing with the reading, and one that moves little enough not to compete will not express much. Its compensating virtue is real and may outweigh that: **it is the only one that works in a silent classroom**, which is where this tool is actually used.

### The tech of implementation (20 September 2026)

🔴 **The colour field is dropped** (Prayas: *"if colour field /screensaver is a problem - avoid"*). What remains is room tone as the floor, a procedural pulse if pace is wanted, and sound marks as optional punctuation.

**Where the delay is applied, and this is the load-bearing choice: the CLIENT holds, not the server.** The server computes the beat and sends it; the browser waits and then renders. Three reasons. The pause and the sound that makes it legible are then in the same place and cannot drift apart. The server is not sitting on an open connection doing nothing, which is what the 15-second keepalive exists to survive. And the question is already buffered rather than streamed, so holding it renders nothing half-drawn — invariant #3 bought this for enforcement and it pays again here.

**Server**
1. **`lib/arc.mjs` — `readBeat({ studentTurns, stoneTurns, scale })` → `{ ms, why }`.** Derived by replaying the transcript on every call, holding no state, exactly as `readRut`'s refractory is. `scale` selects one of the six in `beat-scales.mjs`.
2. **The field rides an existing event's payload — no new event name.** The SSE contract is `event: <name>\ndata: <json>`, parsed by hand in five places in `public/index.html` with the same regex, and `send(event, data)` is defined five times in `server.mjs`. **A new event name means five parsers and five emitters**, which is the guard-parity fault waiting to happen a third time. Adding `beat` to the question event's data is additive and inert for anything that ignores it — the way `feltEvent` and `feltWhy` went onto the signals stream.
3. 🔴 **It sends a number and a short reason. Never content.**

**Client**
4. On the question event, wait `beat.ms`, then render. 🔴 **Cancel the wait on stream error or close.** A held question plus a dead socket is a person waiting eight seconds for nothing — which is the 26 August failure exactly, reintroduced by the cure. The hold must lose to any transport event.
5. **Audio is a separate module receiving `(ms)` and nothing else.** 🔴 **The signature IS the guard**: a function handed only a duration is structurally incapable of commenting on what was said, and that is assertable by a test reading the call site, the way `reading-plan.test.mjs` asserts the engagement sensors reach only the planner. No validator can hear, so the protection has to be that there is nothing to hear about.
6. **Room tone by LAYERING REAL SAMPLES — better than synthesis, and possible for free** (Prayas: *"if procedural sound based on layering pre-recorded samples is possible with free samples, cool"*). Synthetic noise is an approximation of a room; a recording is a room. The single-file objection was an audible loop point, and **layering dissolves it**: play three short samples at deliberately non-commensurate lengths — say 8.3s, 11.7s and 14.9s — and the combination's repeat period is their common multiple, which is longer than any session. Add a slow independent gain drift per layer and it never settles into a pattern. That is genuinely procedural without anything being generated, and it is how game audio has done ambience for years.

   🔴 **The licence is the binding constraint, because this repo redistributes.** It is AGPL and public, so the samples ship inside it — which rules out anything attribution-only or non-commercial and means **CC0 or nothing**. CC0 room tone is abundant: **BigSoundBank** (Joseph Sardin) catalogues it under the UCS category *Ambience / Room Tone (AMBRoom)* at 48kHz with redistribution explicitly permitted; **Signature Sounds** publishes a CC0 room-tone pack of neutral tones, HVAC hums and faint electronics in 24-bit WAV; **VCSL** and **code4fukui/sound-cc0** are CC0 libraries already living on GitHub. ⚠️ **Luftrum's free field recordings are CC BY 4.0, not CC0** — usable, but they create an attribution obligation that has to be carried, so prefer the CC0 sources and keep the choice simple.

   ⚠️ **Weight, which is the real cost and is manageable.** Room tone at 48kHz/24-bit stereo is about 280KB per second, and a tool this light cannot carry that. It does not need to: room tone is low-frequency and nearly transient-free, which is exactly the content that survives heavy compression. **Mono, downsampled, Opus at a low bitrate — three loops of eight to fifteen seconds come to roughly 100–250KB in total.** Short loops are also what layering wants, so the cheap choice and the good choice agree.

   🔴 **Record provenance beside the files.** A licence claim on a web page is not evidence it will still say that next year: keep a plain list of each sample's source URL, its stated licence and the date it was taken, in the folder with them.
7. **Off by default, unlocked by a gesture.** Browsers refuse audio without one, which usefully forces the opt-in this needs anyway. The switch reuses the existing `.focus-toggle` grammar rather than inventing a control, and the preference lives in `localStorage` — already used in this file — never on the server, per the ephemeral pivot.

**Tests, and each names a failure that has already happened here in another form**
8. **Consumer assertion** — `beat` reaches the renderer and the audio and nothing else: not the prompt, not the transcript, not the download.
9. **A bound on `ms`**, pinned by test, so a change of scale cannot produce a forty-second hang.
10. **Scope assertion** — which surfaces carry it, stated and tested, rather than one route quietly having it and two not.

⚠️ **Sequence.** Room tone with `beat.ms` always zero is the first build: it costs almost nothing and, if a bed alone stops a pause reading as a fault, the delay may never be needed. Only then turn a scale on.

### Does AI sound generation have a role? (Prayas, 20 September 2026)

**Very little, and the reasons are structural rather than aesthetic.**

🔴 **Its distinctive capability is the one thing forbidden here.** What generation offers over a recording is *responsiveness* — audio shaped by what is happening. Shaped by the dialogue is a verdict in a channel no guard can read, which is settled above. So the feature that would justify the dependency is the feature that may not be used.

⚠️ **Generating a bed is a production job, not a runtime one, and it loses on the merits.** If the thing wanted is room tone, the honest source is a room: a field recording is the real article, costs nothing, and is more convincing than a synthetic imitation of a space. If the thing wanted is a pulse, procedural Web Audio is a few dozen lines with no file to host in a tool that is deliberately light. Generation sits between the two and is better than neither.

🔴 **And the timing argument eats itself.** Generating audio to cover a pause takes time. The medicine is the disease: a per-turn generation call would add latency to a feature whose entire purpose is to stop latency reading as failure.

🔴 **It would also be the only output in this system that no guard could inspect.** Invariant #3 states its own limit — the guard bounds the breaches it can see, and it reads text. There is no validator that can hear. Generated audio would be the single channel leaving this tool with nothing checking it, in a project whose whole discipline is that code checks the output.

⚠️ **The one place the question stays open is identity rather than pace**, and it is a different question from this document's: whether the tool should have a sound of its own. That is composition, not timing, and Prayas runs a music label — a person making it is a route that needs no model at all.

### How to choose, given that reception cannot be measured here

**Not by argument, and not by counting.** The project refuses to measure how anything lands, so the instrument is the one it already relies on: a real person, asked — which is how five of the clearest findings about the questioning arrived.

1. **Build them behind one switch on the same session.** Procedural audio is a few dozen lines of Web Audio with no asset, and a colour field is CSS; neither needs a file, a library or a download. The cost of trying all four is lower than the cost of arguing about them.
2. **One person, one dialogue each.** Not a cohort, not a form. ⚠️ **Run room tone first**, since if it alone fixes the legibility problem the other three are answering a question that no longer exists.
3. 🔴 **Ask the discriminating question, not the preference question.** *Which did you like* is taste and settles nothing. The fault is fatigue, so the question is **"in which one did you stop noticing that you were waiting?"** — and the better one is where the pause stopped registering as delay and started registering as a beat. A second question worth asking: **"which one could you have stayed in longer?"**
4. **One thing can be checked without asking anybody**, and it should be a test rather than an intention: that the treatment reads no content. A guard can assert the consumer, the way `reading-plan.test.mjs` asserts that the engagement sensors reach only the planner.

⚠️ **And the honest possibility that the trial must be able to return: none of them helps.** Or that room tone helps and nothing beyond it adds anything. The `sorkin` scale exists as the zero control for exactly this. If the dialogue is no easier to stay in under any treatment, the tiredness is coming from the questioning rather than from its pacing, and the answer is the ebb move — a turn that does not ask — with no audio and no colour at all.

## Beat to milliseconds — six scales, and deliberately not one (20 September 2026)

**Ten screenplays parsed, 10,540 turns.** `docs/ops/script-study/` — gitignored, publish-excluded. The scales are in `beat-scales.mjs` beside the parser.

🔴 **THE CASE FOR SIX RATHER THAN ONE IS MEASURED, NOT ARGUED.** Explicit beat marks run from **0.0 to 8.7 per hundred turns** across ten scripts by good writers: Mamet 8.7, Good Will Hunting 4.1, Silence of the Lambs 3.7, Reservoir Dogs 1.5, Pulp Fiction 0.6, The Social Network 0.4, Inglourious Basterds 0.1, Django Unchained and Ordinary People 0.0. **A twenty-fold spread means there is no such thing as the beat rate**, and any single constant would be one writer's habit dressed as a fact.

🔴 **TWO NOTATIONS, AND THIS NEARLY PRODUCED A WRONG ANSWER.** Mamet writes pause as a parenthetical — 8.7 marks per hundred and a 90th-percentile inter-turn action of **zero words**. Tarantino writes it as business — Django has **no** beat marks at all and the highest action at 28 words. **Counting only parentheticals would have reported Django as pauseless, when it is the opposite.** The measurement had to read both channels, and a study of screenplay pause that reads one of them is measuring a notation preference.

🔴 **87% OF TURNS HAVE NOTHING BETWEEN THEM.** Speech follows speech; the beat is the exception in every script here. **A beat that happens every turn is not a beat** — it is latency. Every scale below returns zero most of the time, by construction, and that is the single most important property they share.

⚠️ **One constant is declared rather than measured, and it is isolated so it moves in one line.** `WORD_MS = 300` — a word of written action to 300ms of implied screen time. At the measured 90th percentile of 28 words that is 8.4 seconds, a long held beat; at the median of zero it is nothing. **Scripts give duration in lines and never in seconds, so this conversion is an invention** and no figure below is evidence about time.

| scale | what it is | short reply | worked reply, beat | long business beat |
|---|---|---|---|---|
| **mamet** | frequent, clipped; pressure by interruption | 0ms | 360ms | 360ms |
| **tarantino** | rare and long; the questioner stops and does something else | 0ms | 2700ms | 8400ms |
| **therapy** | the pause sits AFTER what they said, and answers their effort | 0ms | 2250ms | 938ms |
| **interrogation** | pause BEFORE the question, as pressure | 0ms | 2100ms | 0ms |
| **sorkin** | near-zero, momentum as the whole effect | 0ms | 0ms | 0ms |
| **mirror** | no fixed scale; take the pace from the person | 1050ms | 6000ms | 4200ms |

**Tarantino is the one that matches the fault being fixed** — infrequent and real, nothing for stretches and then the questioner genuinely stops. **Therapy is the one nearest the purpose**, because its pause honours what the person did rather than pressing them, and it is the only scale whose length is set by their effort. **Interrogation is included so the register can be rejected deliberately rather than by omission.** **Sorkin is the control**: if pacing helps, it should feel worse than the others, and if nothing changes under any of them the timing hypothesis is wrong and should be dropped rather than tuned.

⚠️ **Mirror behaves unlike the rest and that is worth deciding about, not smoothing.** It is the only scale that pauses when nothing notable happened — 1050ms on a four-word reply, because the person themselves took three seconds. That is either the most humane of the six or the most pointless, and it cannot be settled from a screenplay.

## Sourcing — where the scripts come from, and what reads them (20 September 2026)

🔴 **Prayas's decision, recorded: copyrighted scripts are fine, because nothing is used verbatim.** ***"copyrighted is fine. we wont use them verbatim."*** What leaves the parsing is a distribution — run lengths, turn lengths, the position of a move in a sequence — and no line of anybody's dialogue enters `corpus/`, the prompt, or the repository. Invariant #2 governs what the corpus holds and is untouched by what a script is counted for.

### Where to get them

**IMSDb** is the largest single index and the one most research corpora were built from, which is an advantage: findings here are comparable with Film Corpus 2.0, Movie-DiC and the Cornell set, all derived from it. **8FLiX** holds thousands of film screenplays including recent releases and an FYC archive, in PDF. **SimplyScripts** indexes movie, television and radio scripts and transcripts, and is twenty-seven years old. **Industrial Scripts** sells a bundle of 1,095 produced screenplays as PDFs, foldered by Oscar winners, genre and writer-director, for about USD 35 — the only paid option here and the fastest route to a large, clean, already-organised set. ⚠️ **The Margaret Herrick Library** holds scripts for more than 15,000 produced films from 1910 onward, which is by far the deepest archive and is **reading-room only, with unpublished scripts not photocopiable** — it is a source for a human reader in Los Angeles, not for parsing.

### What reads them, and this is the binding constraint

**None of the above is countable until screenplay format becomes speaker-attributed turns.** A script is a layout, not a data structure: character cues, dialogue, action and parentheticals are distinguished by indentation, and a PDF has thrown that away into positioned text. The parser is therefore the whole of stage one's engineering, and several exist.

**`SMASH-CUT/screenplay-pdf-to-json`** emits exactly the shape this measurement needs — per scene, a list of snippets typed `ACTION`, `CHARACTER`, `TRANSITION` or `DUAL_DIALOGUE`, with each character block carrying speaker, modifier and dialogue lines. **`drwiner/ScreenPy`** is the research-grade option, Python, built against IMSDb and published at the Intelligent Narrative Technologies workshop, with dialogue extraction, speaker identification and JSON export. **`trentw/script-to-speech`** is the pragmatic one: `sts-parse-screenplay` takes PDF or TXT to JSON dialogue chunks and `sts-analyze-json` exists precisely to answer *did the speakers parse correctly* — which is the question that will consume the first day. **`CAST`** converts to TEI-XML with `<sp><speaker>` elements, which is the right encoding if any of this is ever to be read by somebody other than us. **`pdf2fountain`** is a dependency-free Rust route from PDF to Fountain.

⚠️ **Parsing accuracy is the first thing to measure, not to assume.** Movie-DiC discarded 17% of crawled scripts as unparseable and the screenplay-doc-parser's own notes say plainly that screenwriters play with formatting. A run-length distribution computed over a set whose speaker attribution is silently wrong is a number about the parser.

### Which scripts — and one find that changes the caveat above

🔴 **Do not scrape a thousand films and count everything.** The question is about sustained questioning by one party, so a genre-blind sample answers a different question and buries the signal in scenes where nobody is asking anything.

🔴 **TARANTINO FIRST (Prayas, 20 September 2026: *"prefer tarantino if available"*), and the earlier judgement in this thread that he was close to the worst choice was WRONG.** That verdict was about him as corpus material, where it holds; on the measurement this document actually specifies it is backwards. **He writes more sustained one-party interrogation than almost anyone available, and — the part that matters — his questioners conspicuously stop asking.** Chapter One of *Inglourious Basterds* is Landa questioning LaPadite for around twenty minutes: he asks for milk, praises the milk, admires the daughters, fills his pipe, switches language, and talks about rats and hawks. **The pressure is built by the delay between the questions, not by their density.** That is the ebb, in the target genre, and it is the precise capability zetizeti lacks. *The Hateful Eight* is 169 pages largely in one location under mutual suspicion; *Reservoir Dogs* opens on pure digression — the Madonna reading, the tipping argument — before a single question of consequence; *Django Unchained*'s Candyland dinner is a long questioning conducted under a false premise.

🟢 **All five are obtainable.** *Pulp Fiction* is hosted by co-writer **Roger Avary on his own site** with an explicit educational fair-use statement, which is the cleanest provenance in this whole document — a rights-holder publishing it himself. *Django Unchained* is the studio FYC PDF on dailyscript. *The Hateful Eight* is the Final FYC of 25 November 2015, 169 pages, on 8FLiX and credited there to Lionsgate. *Reservoir Dogs* and *Inglourious Basterds* are both freely posted.

⚠️ **And what Tarantino cannot tell us, which is why the verbatim control stays.** His digressions are authored to land, and a questioner who breaks off to discuss milk is doing so because a writer knew where the scene was going. The count taken from him is *what a master of the form thinks a questioning scene should breathe like* — which is worth having, and is not evidence about talk. Read beside *Reality*, the difference between the two is the finding.

🔴 **Before any parsing, read one scene properly.** The vocabulary this document was first drafted with — delay, digression, entering late — was received rather than observed, which is the whole reason it exists. Landa and LaPadite is nine pages. **Read it, mark every turn as question or not-question, and write down what the not-questions are doing.** That hand-read generates the candidate rules; the corpus then tests whether they generalise. A thousand parsed scripts cannot produce a hypothesis nobody has had.

The wider targeted set, beyond him: **Garde à vue (1981)** and its remake **Under Suspicion (2000)**, both chamber pieces played almost entirely in real time between a questioner and a suspect; **The Interview (1998)**, set almost wholly in an interrogation room; and the interrogation sequences inside larger films, of which The Dark Knight's is the most written-about and has its scene script published openly.

🟢 **AND THE FIND THAT MATTERS MOST — verbatim theatre dissolves this document's main caveat.** Stage 1 warns that film dialogue is authored on both sides, so any number from it is a craft norm rather than a fact about talk. **Tina Satter's *Is This a Room* and its film *Reality* (2023) are the FBI interrogation of Reality Winner, word for word from the released transcript, keeping every hem, haw, cough and stammer.** That is a real dialogue, unauthored on the answering side, distributed in script format that a screenplay parser can read. **It is both objects at once**, and it is the control the script corpus otherwise lacks: parse it beside the written interrogations and the difference between the two distributions is the difference between how people question and how writers think questioning reads. Verbatim and documentary theatre generally is the seam to work, and this is its clearest instance.

⚠️ **One published count already exists and is worth reading before generating any.** A study of Duras's *L'Amante anglaise* — a play composed entirely of an interrogation — reports that the accused *"asks nearly two thirds as many questions as the Interrogator"*, and treats the answering-with-questions as the play's whole argument. **A dialogue in which only one party may ask is a form somebody has already examined critically**, which is worth knowing before building one.

## 🔖 BOOKMARKED, 20 September 2026 — the working demo, what it established, and what is unresolved

🟢 **PARTLY BUILT, 21 September 2026 — the timing and the not-always-a-question turn went into the REAL tool, not into the demo.** `lib/pace.mjs`, the blank branch in `/api/chat`, `.body.blank` on the page. Two things this document got wrong and the build corrected: **a timing floor was the wrong design**, because a real turn already takes a median 3382ms and the demo's 600–2200ms sat inside it, so the pace shapes what is spent rather than adding to it; and **the not-a-question turn became a BLANK rather than an observation**, because a short remark is structurally the appraisal preamble v1.4.0 removed. Full account: CLAUDE.md. The sound half is next and is unstarted.

**Status: parked at Prayas's instruction — *"bookmark this direction, will resolve and release later."* Nothing here is shipped, nothing is deployed, no version moved.** The demo is `docs/ops/beat-demo.html`, a single self-contained file that runs from `file://` with no server and no model. `docs/ops/` is publish-excluded and the publish script fails outright if it is ever staged, so none of this can reach the public repository by accident.

**What it is.** A dialogue with timed pauses and procedural audio, built to find out whether the timing argument above survives contact with a person using it. It did not survive in the form it was first written, which is the point of having built it.

### The finding that was not predicted, and it is the strongest thing here

**Three sound gestures attached to the turn were each heard immediately as the tool passing remark on the reply.** A unity-gain burst (a defect), a duck across the whole mix (a defect), and a band-passed noise layer swelling and falling under a filter sweep (a deliberate design). Three different mechanisms, two accidents and one intention, and it made no difference to how any of them landed: *jarring breaks*, then *after every reply of mine, it resets*, then *everytime I respond, there is a swoosh sound*.

🔴 **So the position stated earlier in this document is too weak.** It argues that a sound legible turn by turn is one turn away from reading as comment. What the demo suggests is that **anything arriving on the beat of a reply reads as correspondence more or less regardless of its shape**, because the timing alone supplies the relation. A gesture does not have to be legible to be heard as a remark. It only has to be punctual.

**What the demo now does with that.** Nothing fires on a turn except a single pluck of the drone's own low Sa — the instrument being played at a moment when a tanpura would anyway be plucked, rather than an effect laid over it. The bed and the tanpura cycle run on their own clocks and are never told a turn occurred. `beatSound` is no longer passed the move at all: the parameter was removed rather than ignored, because a function that cannot see which kind of turn this was cannot comment on it by accident, and a promise not to is not a guard.

⚠️ **Whether that last pluck also announces is the open question, and it is not answerable by reasoning about it.** If it does, the honest conclusion is that nothing should fire on a turn and the pause carries the beat alone — which is what this document argues in the first place, and would be a more interesting result than a working demo.

### What the sound is allowed to know

It reads the **shape of the exchange** and never its substance: whether the reply was bare, whether it repeated the last one, how many words it carried that the question did not supply, whether it opened out or closed down, and how long the person waited. Those are properties of the dialogue, which is the line invariant #7 already draws — a reading of the *inquiry*, never of the *inquirer*. It cannot tell a good answer from a bad one and is never asked to.

The weights are −0.16 for a bare reply, −0.20 for a repeat, +0.14 for words the question did not supply, +0.12 for opening out by eight words or more, −0.08 for closing down by as much, and +0.07 for a long wait. A single slow value carries all of it and travels over about fifteen seconds, several turns' worth, so no audible change lands on any one reply. **The weights and the timescale are guesses and are the obvious thing to argue with.**

### A fixed script cannot test timing, and it reproduced this project's own worst fault

The first demo ran seventeen scripted lines in a fixed order. **Predictability is not a small flaw in a timing demo — it removes the thing being demonstrated, because a beat before a line you can already recite is not a beat.** Prayas: *"predictability breaks flow and seems robotic."*

🔴 **Worse, the script asserted things that had not been said.** After the one-word reply *none* it replied *"You have said what it does. Not yet who it is for."* That is the invent-no-premise fault — a fluent invented premise stated as settled fact — reproduced inside a demo built to study this tool's dialogue, and it is the clearest possible demonstration that the fault does not need a model to produce it. Any composing layer that does not read the reply will invent one.

**The replacement needs no model and does not have one.** Each turn reads the reply deterministically — length, bareness, repetition, words the question did not supply, waiting time — and selects from a pool on that basis, never repeating a line. **Every not-asking line is a property of the exchange and never a claim about content**: *That was longer* is true whatever was written; *You have said what it does* is a reading of somebody's material, and this thing has not got one. That is the same discipline the sound holds, arriving at the language surface for the same reason.

⚠️ **The opener pool went too.** A fixed first question ignores the first thing the person says, which is how *"I want to fly"* was answered with *"What is it you want to do?"* — the same question handed back. The first reply is read like every other; what the first-turn flag still suppresses is the not-asking turn, since every observation compares this reply with the one before it and on turn one there is nothing to compare against.

### The timing arithmetic, and a fault worth keeping in mind

**A turn's wait is the line's own speaking time plus the scale's beat, capped.** `min(spokenMs + beatMs, TOTAL_MAX)`, at 110ms per word with the floor bounded to 600–2200ms and the total to 4800ms.

🔴 **It was not that for most of the demo's life: `ms` was the scale's beat alone, and `floorFor` and `TOTAL_MAX` were computed on every turn and read by nothing.** The comment directly above them had described the floor-plus-beat sum since it was written. On the `sorkin` scale, which returns a beat of zero by design, the reply therefore arrived the instant the person pressed enter — *"the dialogue comes immediatly"* — and the cause was assigned-and-never-read, in the one place where this document's own argument lives.

⚠️ **The earlier overcorrection is also worth not repeating.** 260ms per word with a 7-second cap plus a beat gave up to thirteen seconds of blank screen, and it read as a hang: *"still waiting. very long pause. is it woprking?"* **That is this document's central prediction reproduced by its own demo — a pause a person cannot perceive as intent is indistinguishable from a broken tool.** The wait bar exists for exactly that and is deliberately not a typing indicator, which promises that something is coming *now* and is therefore the opposite of a beat.

### Four Web Audio faults, and the one rule worth carrying out of them

🔴 **A gain must be scheduled at the same instant its source starts, never later.** A `GainNode` holds 1.0 until its first scheduled event, so `setValueAtTime(0.0001, t + 0.10)` against an oscillator started at `t` plays 100ms at full scale and then steps to silence. A delay before the first event is not a delay before the sound; it is the sound at full volume. Nothing in the API warns about it.

🔴 **A looped random-walk buffer clicks at every wrap.** The last sample has no reason to sit near the first. Measured over 120 buffers, the average seam step was as large as the buffer's single worst ordinary transition and the worst was 4.4× it; after generating extra material and equal-power crossfading the tail over the head, no seam exceeds material already in the signal. Equal-power rather than linear, because two uncorrelated stretches of noise summed linearly dip in level at the midpoint — a half-second hole instead of a click is not an improvement.

The other two were the duck and the swell described above. **All four were found by reading code and by one person listening, and neither method could have been replaced by the other**: the arithmetic fault was invisible to the ear until it produced an instant reply, and the three gestures were invisible to a code reading because each was doing exactly what it was written to do.

## References

🟢 **Verified through Crossref, 20 September 2026.** Stolcke, A., Ries, K., Coccaro, N., Shriberg, E., Bates, R., Jurafsky, D., Taylor, P., Martin, R., Van Ess-Dykema, C. and Meteer, M. (2000) *Dialogue Act Modeling for Automatic Tagging and Recognition of Conversational Speech*, Computational Linguistics, September 2000, DOI 10.1162/089120100561737. ⚠️ Consensus returned this with "M. Burstein" as first author, which is wrong and is the author-mangling the corrections ledger records — a name from a search tool is not a citation until the registry says so.

🟢 **Verified through Crossref, 20 September 2026.** Vanacore, K., Lee, J., Ahtisham, B., Shaw, S., Reich, J. and Kizilcec, R. (2026) *From Tutor Moves to Tutoring States: Modeling the Timing and Sequencing of Pedagogical Strategies for Student Engagement*, Proceedings of the Thirteenth ACM Conference on Learning @ Scale, 28 June 2026, DOI 10.1145/3774398.3811604.

⚠️ **Retrieved through Consensus and NOT yet put through the verification chain** — years, authors and venues below are as that tool reported them and none may be cited until checked: Lin et al. (2022) on mining tutoring strategies, DOI 10.1016/j.future.2021.09.001; D'Mello et al. (2010) on collaborative patterns in tutorial dialogue; Boyer et al. (2009) on adjacency pairs and hidden Markov models, and on discovering tutorial strategies; Buckley and Zinn (2008) on a classification of dialogue actions; Cade et al. (2008) on dialogue modes in expert tutoring; Maharjan et al. (2018) on sub-sequence mining of effective sessions; Chen et al. (2011) on effective dialogue act sequences; Solomon et al. (2022) on conversational motifs, DOI 10.1177/02654075211066618; Hrastinski et al. (2019) on tutor question types over 13,317 conversations, DOI 10.1080/10494820.2019.1583674; Jaeger (2019) on tutor moves being varied and balanced, DOI 10.5195/dpj.2019.195; de Medeiros et al. (2019) on small-talk segments maintaining conversational rhythm, DOI 10.3991/ijet.v14i11.10288.
