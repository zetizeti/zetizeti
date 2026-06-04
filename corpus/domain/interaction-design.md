# Domain corpus: Interaction Design

> **Part B — domain knowledge.** Synthetic (original prose, written for zetizeti), retrieved per turn via FTS5. Every entry frames a concept as a *live tension* a student should grapple with — never a settled rule — so it sharpens questioning rather than supplying answers.
> **Intent register (`felt as:`).** Each entry carries a `felt as:` line — the colloquial, oblique, felt ways a student gropes toward the tension *before* they have its term — weighted in retrieval so plain words match **intent, not precise vocabulary** (architecture.md §5.1). Still exact-word FTS5; no embeddings.
> **Citations** point to the **original works** in which each idea was first stated, confirmed against secondary references (not from model memory). The prose is original; it re-expresses ideas (not copyrightable) without reproducing any author's expression.
> **Provenance:** `origin: synthetic` · `generated: 2026-05-23` · `passes_cleared: [factual, logical, philosophical]` · citations verified against the original works (Pass 4, citation-verifier) · **all 16 entries `verified`, signed off by Prayas (24 May 2026).** See `../../verification-interaction-design.md`.

---

## entry: affordances-and-signifiers
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** affordance, signifier, perceived affordance, convention, clickable, looks pressable, obvious, cue, learned, button, icon
**felt as:** you can't tell what's tappable; nothing looks clickable; it reads as flat and dead; people don't realise they can interact with it; how would they know to swipe here; it isn't obvious you can do anything.
**the_tension:** Should an interface make an action genuinely possible-and-obvious through its structure (affordance), or merely *signal* it through a cue the user has learned to read (signifier) — when a screen has almost no physical action-qualities at all?
James Gibson coined *affordance* to mean the action possibilities the environment offers an organism, treated as existing independent of the perceiver's experience. Donald Norman imported the word into design and shifted it toward *perceived* affordance, later adding *signifier* to name the cue that announces where action is possible — precisely because a flat screen affords nothing physically, so digital interfaces lean on signifiers and learned convention. The student's real problem is not the definition but the diagnosis: at which level is a given control held up — physical possibility, perceived possibility, or pure convention — and what becomes of a first-time user when the only thing holding the interaction together is a convention they have never learned?
**failure_modes:** a control that reads as decorative; a "flat" element with no signifier of being interactive; reliance on a convention the target user has never met.
**questions_it_invites:** When the control only *looks* pressable, what is the user actually relying on? · What would someone who has never seen this convention do here?
**sources:** Gibson, *The Ecological Approach to Visual Perception* (1979); Norman, *The Psychology of Everyday Things* / *The Design of Everyday Things* (1988); McGrenere & Ho, "Affordances: Clarifying and Evolving a Concept" (2000).

---

## entry: mapping-and-feedback
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** mapping, natural mapping, feedback, control, layout, predict, response, what happened, state, knob, slider
**felt as:** the controls don't line up with what they change; i pressed it and nothing happened; you can't tell if it worked; which control does what; it doesn't seem to respond; you have to guess what each one does.
**the_tension:** A literal spatial mapping between a control and its effect helps a novice predict outcomes without memory — but literal mappings get bulky and awkward in complex systems, where compact or abstract controls are efficient yet harder to learn. When does a design earn clearer mapping, and when may it offload meaning onto labels and convention?
Norman treats good mapping — the relationship between a control's layout and its effect — as a core principle, and *natural mapping* as its strongest form: arrange controls so their layout mirrors the outcome and the user need not remember anything. Feedback is the system's reply that an action registered and the state changed. The discriminating question is one of cost: clear mapping aids the first-time and the error-prone, but space, density, and expert speed pull the other way.
**failure_modes:** controls whose arrangement bears no relation to what they affect; actions with no feedback, so the user cannot tell whether anything happened.
**questions_it_invites:** How does the user know this worked? · What would they have to remember here that the layout could have shown them instead?
**sources:** Norman, *The Psychology of Everyday Things* (1988); Hutchins, Hollan & Norman, "Direct Manipulation Interfaces", in *User Centered System Design* (1986).

---

## entry: gulfs-of-execution-and-evaluation
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** gulf, execution, evaluation, goal, intention, state, figure out, what does it mean, distance, gap, translate
**felt as:** i can't work out how to do the thing; i did something but don't know what changed; i don't know where to start; what is this screen even telling me; is it stuck or did it actually work.
**the_tension:** Two distinct distances separate a user from a system: the *gulf of execution* (how do I get the system to do what I intend?) and the *gulf of evaluation* (what state is it in, and what does that mean for my goal?). A design can narrow one while leaving the other wide — so which gulf is hurting *this* user *now*?
Hutchins, Hollan and Norman named these two gulfs to explain why direct-manipulation interfaces feel effortless: they shrink the translation a user must perform between their goals and the system's representation, in both directions. The student's analytic move is to ask which gulf a given difficulty belongs to — a user who cannot find how to act faces an execution problem; a user who acted but cannot tell what happened faces an evaluation problem — because the remedies differ.
**failure_modes:** treating every confusion as one undifferentiated "usability" problem; closing the execution gulf (easy to act) while leaving the evaluation gulf open (impossible to read the result).
**questions_it_invites:** Is the user stuck on *doing* the thing, or on *reading* what the thing did? · Which of those two is this?
**sources:** Hutchins, Hollan & Norman, "Direct Manipulation Interfaces", in *User Centered System Design: New Perspectives on Human-Computer Interaction* (1986); Norman, *The Psychology of Everyday Things* (1988).

---

## entry: direct-manipulation-vs-agents
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** direct manipulation, agent, automation, delegate, control, do it for me, suggestion, predictable, reversible, assistant, AI
**felt as:** should it just do it for them or let them do it; the assistant did something they didn't want; people don't trust it to act on its own; they'd rather stay in control; can they take over when it gets it wrong; letting the AI handle it.
**the_tension:** Should the user act directly on visible objects and keep control, predictability and responsibility — or delegate to an agent that acts on their behalf? The two are not simple substitutes, and the choice reshapes who is responsible when it goes wrong.
Shneiderman defined *direct manipulation* by continuous representation of the objects of interest, physical reversible actions in place of complex syntax, and immediately visible effects. In their 1997 debate, Shneiderman argued agents should not replace direct manipulation, while Maes argued delegation scales to tasks too large to manipulate by hand. The tension is sharper than ever with AI assistants: delegation buys reach but spends the user's sense of control, predictability, and accountability — and a student should be able to argue when each is the right trade.
**failure_modes:** delegating a consequential, hard-to-reverse action to an agent the user cannot predict or correct; insisting on manual manipulation for a task far too large to do by hand.
**questions_it_invites:** If this acts on the user's behalf and gets it wrong, who notices, and how do they undo it? · What does the user give up when they stop doing this themselves?
**sources:** Shneiderman, "Direct Manipulation: A Step Beyond Programming Languages", *IEEE Computer* 16(8) (1983); Shneiderman & Maes, "Direct Manipulation vs. Interface Agents", *interactions* (Nov/Dec 1997).

---

## entry: modes-and-modelessness
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** mode, modeless, state, same action different result, error, switch, caps lock, accidentally, gesture, current
**felt as:** the same action does different things at different times; they switched something on by accident; why did that key do that; they didn't notice they were in another state; it behaves differently and no one knows why.
**the_tension:** A *mode* lets the same input mean different things depending on system state — economical, but the source of a whole class of errors when the user forgets which state they are in. When is a mode worth its error cost, and when should the interface be modeless?
Larry Tesler argued against modes — a mode being a state whose only role is to reinterpret the same operator input — because users act on the state they *think* they are in, not the one they are actually in. Raskin systematised this in *The Humane Interface*, making modelessness central to reducing mode errors and protecting attention. The student's judgement is about locus and visibility: a mode the user deliberately entered and can plainly see costs little; a mode entered accidentally and signalled faintly is where mode errors breed — though even a costly mode can earn its place when the economy it buys is large.
**failure_modes:** a powerful hidden mode toggled by an easy-to-hit input; a mode whose indicator is too quiet to notice during the action it changes.
**questions_it_invites:** When the same action does two different things here, how does the user know which one they will get? · How did they get *into* this state, and can they tell that they are in it?
**sources:** Tesler, "A Personal History of Modeless Text Editing and Cut/Copy-Paste", *interactions* 19(4) (2012) — plus his "Don't Mode Me In" slogan (not a publication); Raskin, *The Humane Interface* (2000).

---

## entry: recognition-rather-than-recall
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** recognition, recall, remember, memory load, visible, options, hidden, menu, find, hint, cognitive load
**felt as:** you have to remember where everything lives; the option is buried somewhere; i can never find that setting; why isn't it just shown; too much to hold in your head; only people who already know can find it.
**the_tension:** Showing options and cues lets users *recognise* what they can do rather than *recall* it from memory — but exposing everything clutters, and hiding things keeps the surface clean at the cost of memory. Where should the load fall: on the interface, or on the user's head?
Nielsen's sixth heuristic asks designers to minimise memory load by making objects, actions and options visible, so the user need not carry information from one part of the interaction to another. The tension lives in the opposite pull: a surface that recognises everything for the user becomes dense and slow for the expert; a minimal surface asks the user to remember. The student should be able to argue, for a given user and frequency of use, which way the load should tip.
**failure_modes:** burying a needed action where only a user who already knows it will look; surfacing so many cues that none stands out.
**questions_it_invites:** What is the user being asked to remember here that the screen could simply show? · For someone who does this every day, is all this visible help still helping?
**sources:** Nielsen, "10 Usability Heuristics for User Interface Design" (1994); Norman, *The Psychology of Everyday Things* (1988) — knowledge in the world vs. in the head.

---

## entry: conceptual-and-mental-models
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** mental model, conceptual model, system image, expectation, how it works, makes sense, confused, assume, wrong idea, story
**felt as:** people think it works one way but it works another; they get the wrong idea of it; it doesn't behave the way you'd expect; it's confusing because it doesn't make sense; users assume the wrong thing.
**the_tension:** A user builds a *mental model* of how the system works only from what the system shows them — the *system image*. When the designer's model and the user's model diverge, where does responsibility sit — with an image that told the wrong story, or with a user who has not yet learned a model the system genuinely needs them to hold?
Craik proposed that minds carry small-scale models of reality to predict and act ahead of events. Norman applied this to design: the designer holds a conceptual model, the user forms a mental model, and the *only* channel between them is the system image — the visible behaviour, words and structure. When users "get it wrong," one productive question is what the system image led them to believe — and another is when it is legitimate to ask a user to *learn* a model the image alone cannot fully convey (expert tools, irreducibly complex domains). Both the image and the user's investment are in play.
**failure_modes:** an interface whose visible behaviour implies a model different from how it actually works; assuming users share the designer's model without the image ever conveying it.
**questions_it_invites:** What story is this interface telling the user about how it works? · Where did the user's idea of this come from, if not from what they could see?
**sources:** Craik, *The Nature of Explanation* (1943); Norman, *The Psychology of Everyday Things* (1988) — design model, system image, user's model.

---

## entry: metaphor-vs-native-interaction
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** metaphor, desktop, folder, familiar, like a, real world, skeuomorph, intuitive, limit, borrow, trash
**felt as:** i made it like a real object and now it's limiting; "it's just like a folder" but that holds it back; the familiar comparison breaks down; should it copy the real world; the metaphor promises things it can't deliver.
**the_tension:** A metaphor makes an unfamiliar system instantly legible by borrowing a familiar domain — but cling to it too literally and it becomes a cage, blocking interaction models that have no physical counterpart. How much should a design borrow before the borrowing constrains it?
Interface metaphors (desktop, folder, trash) reduce first-time learning by mapping the digital onto the known; the desktop metaphor of the Xerox Star is the canonical case. But metaphor carries the source domain's limits with it, and conceptual-metaphor theory shows how deeply a chosen metaphor structures what users then expect. One position holds that interface metaphor should be selective, not literal — borrowing just enough to teach, then stopping before it dictates what the system may become; another holds that a thoroughly literal metaphor is exactly what makes some systems learnable for the unfamiliar. The student should be able to name what a metaphor teaches *and* what it forbids.
**failure_modes:** extending a metaphor past its usefulness so the system inherits irrelevant real-world limits; a metaphor that sets expectations the system cannot or should not meet.
**questions_it_invites:** What does this metaphor teach the user for free — and what does it quietly forbid? · Where is the metaphor making a promise the system can't keep?
**sources:** Lakoff & Johnson, *Metaphors We Live By* (1980); Smith, Irby, Kimball et al., "Designing the Star User Interface" (1982).

---

## entry: friction-and-frictionlessness
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** friction, frictionless, smooth, effort, steps, fast, easy, confirmation, pause, undo, speed, slow down
**felt as:** i want it faster and smoother; should there be a confirm step; it feels too easy to do something risky; cut the extra steps; it's smooth but maybe too smooth; done in one tap before you can think.
**the_tension:** Frictionless design removes effort and shortens the path; but friction can protect a user — prompting reflection, preventing error, slowing impulsive or high-stakes acts. When is removing friction a gift to the user, and when is it merely serving a metric?
The reflex is "faster is better," yet research on *designed* friction argues some resistance is purposeful: a confirmation before deletion, a pause before payment, a deliberate step before consent. The discriminating question is whose interest the friction — or its removal — serves. Routine, low-risk, reversible tasks reward smoothness; irreversible or high-stakes ones may deserve a pause that lets the user think.
**failure_modes:** one-tap flows on irreversible actions; friction engineered only to obstruct cancellation while entry stays instant; treating "frictionless" as an unconditional good.
**questions_it_invites:** Who is this smoothness for? · What does the user lose if this happens faster than they can think?
**sources:** Cox et al., "Design Frictions for Mindful Interactions" (2016); Norman, *The Psychology of Everyday Things* (1988) — error prevention and constraints.

---

## entry: dark-patterns-and-ethics
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** dark pattern, deceptive pattern, nudge, manipulation, default, consent, urgency, trick, agency, opt-out, coercion, engagement
**felt as:** the sign-up feels pushy; it nudges people into things; is this manipulative; easy to join but hard to cancel; the urgency feels fake; great for conversion but it feels gross; pressuring or tricking users into it.
**the_tension:** The same technique can read as helpful guidance or as exploitative coercion depending on intent, transparency and reversibility. Where is the line between a nudge and a manipulation — given that "good for conversion" is not the same as "good for people"?
Brignull named *dark patterns* (now often *deceptive patterns*) for interface choices that steer users into actions they would not otherwise take — via defaults, manufactured urgency, confusing wording, emotional pressure. Gray and colleagues mapped these as an ethics-of-design problem. The live question is not whether a pattern lifts engagement but whether it preserves the user's agency, informed consent and an easy exit. A student should separate nudge, mandate, coercion and manipulation, then test a real interface against autonomy under realistic conditions — not the idealised user who reads everything.
**failure_modes:** pre-ticked consent; cancellation hidden behind effort that signup never required; countdown timers untethered from real scarcity; manipulation dressed as "guidance."
**questions_it_invites:** If the user fully understood what this default does, would they still choose it? · How hard is it to leave, compared with how easy it was to enter?
**sources:** Brignull, *Deceptive Patterns* (term coined c. 2010; book 2023); Gray, Kou, Battles, Hoggatt & Toombs, "The Dark (Patterns) Side of UX Design", *CHI* (2018).

---

## entry: situated-action-vs-plans
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** plan, situated, in the moment, real use, context, improvise, workflow, ideal path, what actually happens, messy, adapt
**felt as:** people don't use it the way we planned; they go off the intended path; real use is messier than the flow; they improvise and work around it; the happy path isn't what actually happens; users keep doing unexpected things.
**the_tension:** Designers imagine a plan — the path a user "should" follow — but real action is situated: people improvise from the resources at hand in the actual moment. Is your design treating its happy-path plan as a description of what users do, or as just one resource among many they will rework?
Suchman argued that plans do not determine action; they are resources people draw on while acting in concrete, shifting circumstances. For interaction design this is a standing warning against mistaking the idealised flow for real use. One response is to watch what people actually do — the workarounds, the out-of-order steps — and design for situated action; the counter-case is that a clear designed path is itself a service: it reduces decision-load, scaffolds novices, and carries safety-critical procedure. The open question is how to hold a legible happy-path and graceful departure from it at once.
**failure_modes:** a rigid flow that breaks the moment a user departs from the imagined path; treating workarounds as user error rather than as evidence.
**questions_it_invites:** What does the user actually do here, as opposed to what the design assumes? · When they leave the intended path, what are they reaching for?
**sources:** Suchman, *Plans and Situated Actions: The Problem of Human–Machine Communication* (1987).

---

## entry: embodied-interaction
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** embodied, body, physical, gesture, tangible, skill, felt, hands, presence, in the world, screen
**felt as:** so much of it happens with the hands, not the screen; it loses something on a flat screen; the physical, bodily part matters; it's about being in the room, not just the app; what's lost when it's only symbols on glass.
**the_tension:** Meaning in interaction can be treated as symbol manipulation on a screen — or as something that emerges through skilled, bodily, situated engagement with the world. How much of the experience you are designing actually lives in the body and the setting, not in the interface's symbols?
Dourish framed *embodied interaction* as meaning arising through engaged practice in the world rather than through disembodied symbols, drawing the lineage of tangible and social computing together. The tension for a student raised on screens is to notice how much of an interaction is carried by hands, space, presence and skill — and to weigh that against what a screen genuinely gains: accessibility, precision, scale, reach, and undo.
**failure_modes:** reducing a richly physical, situated practice to on-screen symbols and losing its meaning; ignoring the setting and body in which the interaction actually happens.
**questions_it_invites:** What part of this experience lives in the user's body or surroundings, not on the screen? · What does a screen gain here, and what does it leave behind?
**sources:** Dourish, *Where the Action Is: The Foundations of Embodied Interaction* (2001).

---

## entry: reflection-in-action-and-wicked-problems
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** reflection, reflect in action, wicked problem, no right answer, reframe, experiment, messy, ill-defined, process, iterate, design thinking
**felt as:** the problem changes every time we touch it; there's no single right answer; i can't pin it down before starting; it's messy and ill-defined; each attempt reframes it; we keep going round in circles; you only understand it by doing.
**the_tension:** Design problems are often *wicked* — ill-defined, with no stopping rule, where each attempt changes the problem — so a designer cannot solve them by analysis-then-build. Are you treating your problem as tame (definable, solvable once) when it is actually wicked (only workable through reframing and reflection while acting)?
Rittel and Webber named wicked problems: ill-structured, non-finalisable, where every intervention reshapes the question. Schön described how skilled practitioners cope — *reflection-in-action*: thinking, experimenting and reframing *while* doing, not only afterward. Together they explain why design proceeds by moves-and-reflection rather than by specification. For a genuinely wicked problem, being unable to fully define it upfront is the nature of the work, and reflection-in-action is the method that fits; for a tame one, refusing to specify upfront is avoidable waste. So the first question is which kind this actually is.
**failure_modes:** demanding a complete, fixed problem definition before starting a wicked problem; treating early "failure" as a verdict rather than as material to reframe from.
**questions_it_invites:** Is this a problem you can define once and solve, or one that changes each time you touch it? · What did this last attempt teach you about the problem itself?
**sources:** Rittel & Webber, "Dilemmas in a General Theory of Planning" (1973); Schön, *The Reflective Practitioner: How Professionals Think in Action* (1983).

---

## entry: sketching-and-fidelity
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** sketch, fidelity, prototype, rough, quick, disposable, commit, polish, explore, low-fi, refine, too early
**felt as:** it got polished too early; we committed before exploring; should this be rough or finished; the mockup looks so done nobody wants to change it; are we exploring or refining; too high-fidelity too soon.
**the_tension:** Early design wants to *explore* possibilities (get the right design); later design wants to *refine* one (get the design right). High-fidelity work too early signals commitment and shuts exploration down. Is the fidelity of what you are making matched to the question you are actually asking?
Buxton distinguished sketching from prototyping: sketches are fast, cheap, disposable and deliberately ambiguous, made to suggest and explore many options, whereas prototypes are made to refine and resolve a chosen one. The danger is fidelity mismatch — polishing before the direction is found, so that the polish itself argues against changing course. The student's discipline is to ask what stage they are in and to keep the artefact's fidelity honest to it.
**failure_modes:** a high-fidelity mock so finished that no one will now question the direction; staying in rough sketches long after the question has become one of refinement.
**questions_it_invites:** Are you exploring which design, or refining this one? · What is this level of polish making it harder to change?
**sources:** Buxton, *Sketching User Experiences: Getting the Design Right and the Right Design* (2007).

---

## entry: experience-beyond-usability
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** experience, usability, usable, meaning, emotion, felt, boring, efficient, delight, hedonic, pragmatic, why bother
**felt as:** it works fine but feels empty; usable but boring; efficient and meaningless; it does the job but there's no soul or delight; technically fine but nothing to it; what does it actually feel like to use.
**the_tension:** A thing can be perfectly usable and still feel empty — efficient, error-free, and meaningless; yet for some tools, efficient-and-error-free is the whole of the job and "meaning" would be noise. Usability concerns whether a user *can* act; experience concerns what the doing *feels like* and *means*. Which of those is the real work here?
McCarthy and Wright argued that technology is encountered as felt, lived experience — emotional, sensual, intellectual — not merely as function to be made usable. Hassenzahl's separate framework distinguishes *pragmatic* quality (utility, usability) from *hedonic* quality (stimulation, identification, meaning). One position holds that removing friction and error does not, by itself, make an experience worth having; the counter is that for high-frequency utility and safety-critical tools, frictionless usability *is* the experience worth having. The student's move is to ask what the interaction *means* to the person — and whether, here, meaning is the point or the distraction.
**failure_modes:** declaring success on task-completion metrics for an experience that is hollow; treating emotion and meaning as decoration on top of "real" usability.
**questions_it_invites:** Suppose this is perfectly usable — would it still be worth doing? · What does this moment feel like, and mean, to the person in it?
**sources:** McCarthy & Wright, *Technology as Experience* (2004); Hassenzahl, "The Thing and I: Understanding the Relationship Between User and Product" (2003, in Blythe et al., eds., *Funology*).

---

## entry: ironies-of-automation
**discipline:** interaction-design
**provenance:** verified
**vocabulary:** automation, automate, manual, take over, fails, edge case, operator, skill, out of the loop, monitor, fallback
**felt as:** the machine does the easy part and leaves people the hardest bit; they lose the skill because it's automated; when it fails the human can't take over; you're just watching until something breaks; automating it makes users rusty; out of the loop until it's an emergency.
**the_tension:** Automating the easy parts of a task can leave the human responsible only for the hardest part — the moment the automation fails — while stripping away the practice that would have kept them skilled enough to handle it. When does automating the routine free the user, and when does it quietly hand them the worst job — monitoring, and rescue at the failure moment — with eroded skill?
Bainbridge's *ironies of automation* observed that automating routine work leaves the operator to monitor and to intervene precisely when things go wrong — a rarer, harder demand — even as disuse erodes the very skills the intervention requires. For interaction and AI-assisted design this is a direct warning: the more an agent handles, the less practised and situationally-aware the user becomes, so the eventual hand-back lands on someone less ready for it. The student should ask what skill the automation lets atrophy, and what the hand-off moment demands.
**failure_modes:** automating until the user can no longer perform the task they are expected to rescue; a hand-back at a failure moment with no context for the human to act on.
**questions_it_invites:** When this hands control back to the user, what state are they in to receive it? · What skill does the user lose by never doing this themselves?
**sources:** Bainbridge, "Ironies of Automation", *Automatica* 19(6) (1983), pp. 775–779.
