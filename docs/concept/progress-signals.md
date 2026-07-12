# progress-signals.md — measuring the movement of an inquiry

*The design of zetizeti's progress subsystem: declaring a preliminary enquiry, sharpening it
into a goal, and tracking movement toward that goal with solid, code-computed signals — without
betraying `position.md`. Read with `position.md` (the core commitment), the SSE contract as implemented
§2 (progress is code-owned, never an AI verdict), and a settled build decision (the anti-gamification
reconciliation). This is the method. **Implementation status (24 May 2026): BUILT & tested** — see the banner below.*

---

> **BUILT & tested (24 May 2026).** The watch layer (`app/lib/signals.mjs`), the nudge policy
> (`app/lib/nudge.mjs`), the per-turn trajectory (the `signals` table in `app/lib/db.mjs`), and the
> surfaces (the split-screen edge canvas + the progress-view "tensions taken up" trace) are
> implemented and covered by `app/test/progress-signals.test.mjs` — **13 tests, all green**, incl.
> the §2 *posture-not-diagnosis* cardinal. The question engine runs on Claude Haiku 4.5 via
> OpenRouter (`app/lib/llm.mjs`). The §9 build order held — *watch shipped before nudge*. v2
> (MiniLM embeddings for the §4 convergence/cycling signals) remains the documented upgrade.
>
> *Viz responsiveness (24 May 2026):* `condensation` also carries an **engagement** term —
> sustained turns *form* the edge even before the wording sharpens — so the canvas moves each turn,
> not only on a re-draw; and the particle floor was raised so a low/early inquiry reads as a
> luminous cloud, not near-black. (Honesty held: a re-draw or rising specificity still drives the
> large condensation; engagement only forms it partway.)
>
> *Low signals must SHOW (24 May 2026):* a faint **readout** sits in the panel — *"what the canvas
> reads"*: the goal `broad↔precise`, the question `tentative↔settled`, the inquiry `still↔moving`,
> re-drawn ×N — with a level bar each. So a **low** state reads legibly *as* low ("broad / still",
> near-empty bars), naming what the low indicates, rather than appearing as nothing. Describes the
> inquiry, never the inquirer; not a score.
>
> *Hover-to-name (24 May 2026):* moving over the canvas names the element under the cursor **and
> what it symbolises** — the **origin cloud** (your first vague words; the question before it has
> shape), the **motes** (fragments of your thinking; scattered = vague, gathered = sharpening,
> warmth = your insight), the **line of re-draws** (the path vague→sharp; its length = how far the
> question has travelled), the **open clarity** (an arrival the system won't define). The canvas
> explains itself — nobody should have to guess what the cloud or the motes are.

## 1. What "progress" must NOT mean here

The request put *progress* in scare quotes, rightly. In a tool whose creed is **understanding is
not deliverable**, the ordinary meanings of progress are all traps, and each would detonate the
core the rest of the project is built on:

- **Not proximity to an answer.** There is no answer to approach. The never-answer guard exists
  precisely because the understanding gap does not close by delivery (`position.md`).
- **Not a grade of the learner.** The SDC split is absolute: the model never scores the human, and
  no part of the system may. Progress is not a measure of how well the person is doing.
- **Not a score, percentage, badge, streak, or comparison.** That apparatus is what converts a
  person into a tracked quantity — the exact thing density-not-mass and the anti-banking stance
  refuse (`a settled build decision`, Tension 2).

If the subsystem produced any of these, it would be a betrayal wearing the costume of a feature.
So the notion of progress has to be rebuilt from scratch, against these prohibitions. What
remains, once they are cleared away, is narrow and honest.

## 2. What progress is: the edge sharpening, and the learner moving toward clarity

Two movements, both **the learner's own**, both measurable:

1. **The edge sharpening.** The preliminary enquiry is the learner's first, vague articulation —
   *"I'm blocked on my game's economy loop."* The goal (the *edge*) is the current, sharper
   articulation, re-drawn across the session. The lineage `[enquiry → … → current edge]` is the
   trajectory. Progress is the **shape of that trajectory**: the goal becoming more specific, more
   concrete, and more stable across re-draws.
2. **The learner moving toward clarity.** The `socratic-interlocutor` already names the signs —
   abstraction giving way to the concrete, hedging to commitment, cycling to development. These are
   linguistic, and so they are measurable in the learner's own words over the turns.

> **The system measures movement. The learner judges arrival.** zetizeti never declares "you've
> arrived" — that would deliver the conclusion the whole tool refuses to deliver. It shows the
> movement it can measure, framed as movement, and leaves the meaning of it to the learner.

### The cardinal framing rule (load-bearing — a wording rule as much as an architecture rule)

**Every signal describes the *inquiry*, never the *inquirer*.** Concreteness rising is a property
of the language being produced *about the problem* — not a property *of the person*.

- ✅ *"Your edge has stabilised across the last three re-draws."* — describes the artefact (the goal).
- ✅ *"The question hasn't moved in three turns."* — describes the inquiry.
- ❌ *"You are becoming more concrete / more focused / clearer."* — a grade of the person, dressed
  as observation. **Forbidden.** This is the single line this subsystem can cross to betray
  `position.md`, and it is enforced in the *wording* of every surfaced signal, not only in the maths.

## 3. Why solid ML, and why not the LLM

The signals are the **code-does-judgement layer of the SDC split** — deterministic and inspectable,
not the model rating the human. Three reasons this is non-negotiable:

- **SDC fidelity.** AI does language (asks the question); **code does judgement/tracking** (the
  signals); the human decides (names the goal, reads the movement, judges arrival). An LLM asked to
  "rate the learner's progress" would collapse the split — the model would be doing judgement.
- **Transparency.** A deterministic signal can be *shown* behind the curtain — the learner can see
  exactly what was measured and how. An LLM's "I think you're about 70% there" is uninspectable and
  is the model passing verdict on a person. zetizeti's transparency-over-grounding stance requires
  signals that can be opened up.
- **"Solid" means reproducible, not vibes.** Lexicon scores and vector geometry give the same answer
  every time and can be audited. That is what makes them solid — more solid, in this sense, than a
  model's mood.

**Edge-deployable (Do More With Less).** v1 needs *no model and no training*: static lexicons plus
classical IR geometry (TF-IDF / token-overlap cosine) over the goal lineage. v2 upgrades the
semantic signals to a small sentence-embedding model (MiniLM-class, ~80 MB, CPU, via
`transformers.js` in-process — no Python sidecar, no labels). The design below is written so v1 is
fully functional on deterministic signals alone; embeddings only sharpen two of them.

## 4. The signals — and which actually carry the load

Six signals are specified. **Two are progress; four are diagnostic gates.** Presenting all six as
equal would be over-confident — most of the work is done by the first two.

**Load-bearing (these *are* progress):**

| # | Signal | Computed by | What it captures |
|---|--------|-------------|------------------|
| 1 | **Lineage convergence + specificity** | v1: TF-IDF cosine between successive goal re-draws + specificity score (concreteness + qualifier/entity density + content-length). v2: sentence embeddings. | The edge sharpening, measured directly — re-draws settling (shrinking inter-draw distance) *and* getting more specific. This is the whole game. |
| 2 | **Insight-marker rise** | Open LIWC-style lexicon of realisation tokens (*"I realise", "actually", "it's really about", "what I mean is"*), rate over the learner's turns. | The most distinctive sign of the learner's *own* movement — hard to fake from outside, and squarely the learner's, not the tool's. |

**Diagnostic gates (not "progress" alone — they gate a nudge or surface a question):**

| # | Signal | Computed by | Role · failure mode |
|---|--------|-------------|---------------------|
| 3 | **Concreteness** | Brysbaert concreteness lexicon, over learner turns. | Gate for the "ground it" posture. Partly subsumed by specificity (#1). |
| 4 | **Hedging / commitment** | Hyland hedge lexicon, over the *goal statements*. | Gate for the "test the commitment" posture. |
| 5 | **Cycling** | Cosine between consecutive learner turns (v1 token-overlap, v2 embeddings); low novelty = repetition. | Detects repetition-without-development. **Failure mode:** looks *identical* to *productive dwelling* — "willingness to stay with difficulty" is a sign of clarity, not stuckness. Never acts alone (see §5). |
| 6 | **Anchor-tethering** | Distance from current turn to the preliminary enquiry, with return-after-deviation. | Continuity. **Failure mode:** the learner is *allowed* to change the question. Only meaningful if the edge has **not** been re-drawn (see §5). |

## 5. The nudge — steering the questioning stance, never the content

The point of the signals is not a dashboard; it is to **nudge the learner from the preliminary
enquiry toward a sharper edge** — through better questions, never answers, and never toward a
destination the system holds.

**Toward *their* edge, not a system answer.** The nudge moves the learner toward their own goal,
sharper. It never steers toward a conclusion the engine has decided. That distinction is the line
between Socratic direction and banking (depositing a path).

**Posture, not diagnosis (the LLM boundary).** A small deterministic policy maps the signal-state
to a *posture* directive injected into `buildSystemPrompt` — and the directive names the **mode to
question in**, never the **diagnosis of the human**:

- ✅ injected: *"Ask one question that tests whether the current goal is the real edge."*
- ❌ never injected: *"The learner is hedging / stuck / unfocused."*

The model receives a posture, not a verdict about the person — so it cannot leak a characterisation
of the learner into its question. The signals stay code-side; only a neutral instruction crosses to
the model.

**Quiet by default, with a refractory period.** Most turns add **no** directive — the resident
method core questions perfectly well on its own. The policy injects a posture only when (a) the
gating signals fire **jointly** above threshold, and (b) at least *N* turns have passed since the
last nudge. *The whetstone does not whisper a direction on every stroke.* Over-steering — a fresh
directive each turn — is the subsystem's worst failure: the questioning turns jittery and the
learner senses they are being managed.

**Joint firing, because stuck and dwelling look the same.** "Shift the angle" never fires on cycling
(#5) alone — only on cycling **and** flat insight (#2) **and** flat specificity (#1) together. And
even then, the more honest move is often to hand the read back to the learner rather than steer:
surface it as a question — *"the question hasn't moved in three turns — are you sitting with it, or
stuck?"* Both paths are available to the policy; the second is preferred, because it returns the
judgement to the person.

**Respect the learner's authority over the topic.** A drift nudge (#6 → "connect back to the
enquiry") fires **only if the learner has not re-drawn the edge during the drift.** A re-drawn edge
*is* the learner declaring a new anchor — the system has no standing to pull them back to the old
one. Only the learner changes the question.

| Signal-state (jointly) | Posture directive (mode only) |
|------------------------|-------------------------------|
| Low specificity + low concreteness, sustained | ask for the concrete instance — ground the goal in one real case |
| High hedging on the goal | ask a question that tests commitment to the current goal as stated |
| Cycling + flat insight + flat specificity | offer a question from a different angle — or surface "sitting, or stuck?" to the learner |
| Drift from enquiry **and** no recent re-draw | ask a question that connects the present thread back to the original enquiry |
| Converging + rising specificity + rising insight | stay close; minimal questions; do not interrupt the landing |
| (none of the above) | **no directive** — default method core |

*Example questions are never templated into the model. The LLM composes fresh, in the learner's
words, grounded in the retrieved tensions. The policy supplies only the posture.*

## 6. Storage — per user, as a trajectory

Progress is a trajectory, not a point, so it is stored per turn. Extend the SQLite schema
(`lib/db.mjs`), keyed to the existing `quests` / `messages` (and thus to `user_id`):

```
signals
  id            INTEGER PK
  quest_id      → quests.id            (and therefore user_id)
  message_id    → messages.id          (the turn this snapshot belongs to)
  turn_index    INTEGER
  created_at    TEXT
  goal_at_turn  TEXT                    -- the edge as it stood this turn
  signal_json   TEXT                    -- the computed vector (the six signals + derived deltas)
  retrieved_refs TEXT                    -- the tensions that were behind the curtain this turn
  nudge_posture TEXT                     -- which posture fired, or null (most turns: null)
```

`retrieved_refs` is stored here (it already exists on `messages`) for a specific reason the advisor
named: **the most interesting question the progress view can ask over time is not "did my
concreteness rise" — it is "which tensions did the engine surface, and which did I take up?"** That
is the learner's own intellectual trajectory through the discipline's grit — surfaceable without
scoring anyone. Cheap to store, and the most aligned thing the subsystem can show.

## 7. Surfacing — behind the curtain, and a progress view

Two surfaces, both governed by the §2 framing rule (the inquiry, never the inquirer) and by
the SSE contract as implemented §2 (no score drives any display):

- **Behind the curtain (per turn).** Alongside the retrieved tensions and the guard line, an
  optional plain line of what moved this turn — *"the edge held steady; the question gained a
  concrete instance"* — in the machinery register, inspectable, never a number.
- **The progress view (per quest, private).** The trajectory rendered as the lineage from vague to
  sharp (already built), now annotated with the measured movement framed as artefact-properties, and
  — the distinctive part — the **trace of tensions surfaced and taken up** over the session. No
  percentage, no completion bar, no comparison to others, no "level". Private to the learner.

What is never rendered: a score, a grade, a rank, an "arrived". The view shows movement and hands
the meaning back.

## 8. Reconciliation with the core (explicit)

- **`position.md` (understanding is not deliverable):** progress measures the *question sharpening
  and the learner's own clarity-movement*, not delivery of an answer; the system never declares
  arrival. ✅
- **SDC split:** signals are the *code* judgement/tracking layer; the LLM still only asks (and
  receives a posture, never a verdict); the human still decides. ✅
- **the SSE contract as implemented §2:** any backend progress signal is *advisory only and must not
  drive the display* — honoured: signals surface as observation, never as a score that drives UI. ✅
- **Anti-gamification / density-not-mass:** no score, %, badge, streak, comparison; the surfaces are
  private observations to the learner. ✅
- **The model never scores the learner:** the maths describes the *inquiry*; the framing rule (§2)
  forbids the wording that would make it a grade of the *person*; the model never sees a diagnosis,
  only a posture. ✅

## 9. Phased build (implementation is the next ticket)

1. **`lib/signals.mjs`** — pure functions over `(enquiry, lineage[], learnerTurns[], retrieved[])`
   returning the six-signal vector. v1 deterministic: bundled lexicons (`corpus/signals/` —
   concreteness, hedges, insight) + TF-IDF/token-overlap geometry. No model, no network.
2. **Storage** — `signals` table in `lib/db.mjs`; compute and persist a snapshot in `/api/chat`
   after the turn is persisted (reusing `messages.retrieved_refs`).
3. **`lib/nudge.mjs`** — the deterministic policy of §5 (joint thresholds, refractory period,
   topic-authority rule, posture vocabulary). `buildSystemPrompt` gains an optional posture line,
   added *only* when the policy fires.
4. **Surfaces** — the per-turn curtain line and the per-quest progress view (§7), under the §2
   framing rule. Strings reviewed against "inquiry not inquirer" before they ship.
5. **v2 (optional upgrade)** — swap TF-IDF for MiniLM embeddings (`transformers.js`, in-process) for
   the convergence (#1) and cycling (#5) signals. Nothing else changes; the contract is stable.

A note on order, in the spirit of the tool: build the *measurement and its honest framing* (1, 2,
4) before the *steering* (3). A subsystem that can see movement but does not yet act on it is safe;
one that steers before it can see, or before its wording is disciplined, is not. Let it watch before
it nudges.
