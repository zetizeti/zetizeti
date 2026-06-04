# AI-criticism mode — implementation start

**Created:** 2 June 2026. A starting point, not a finished spec. Describes how zetizeti
grows a second face — *criticism mode* — alongside its Socratic mode, and where it plugs
into the architecture that already exists.

## The idea, in one breath

zetizeti already refuses to drop a sentence into a student's *understanding gap* — it
questions, it never answers. An AI text (a ChatGPT answer a student brings in) is precisely
*a fluent answer already dropped into an understanding gap* — the harm zetizeti was built
against, made into an object. Criticism mode turns the same whetstone outward: the student
pastes a found AI text, and instead of questioning the student's own thinking, zetizeti
questions *the text* — pointing to the spots where it smuggled a verdict in as description,
and asking Clean-Language questions about those spots. **The tool locates; the student
judges.** Same gesture (refuse the deposited conclusion), new object (the machine's
fluency rather than the student's own).

This is the *sensed register* of the Split-Domain Cognition split ratio, applied to a text
artefact. The deterministic locating is owned by the split-ratio MCP's `read_sensed`
(shipped 2 June 2026); zetizeti owns the conversation around it.

## Why this is a small change, not a new app

Criticism mode reuses almost everything zetizeti already has. The only genuinely new parts
are the qualification pass (segment + tag the pasted text) and the conflation-locating call.

| zetizeti piece (today) | Role in criticism mode |
|---|---|
| `lib/llm.mjs` (Claude via OpenRouter, BYOK) | unchanged — does the qualification pass and the question pass |
| `lib/dialogue.mjs` `buildSystemPrompt` | a second system prompt: "question this text" rather than "question this learner" |
| `lib/nudge.mjs` / `lib/signals.mjs` (deterministic posture) | the model receives a *posture*, never a verdict — criticism mode swaps the posture source: the located conflation point becomes the posture ("ask about this spot"), exactly as the nudge policy today steers *how* to ask without diagnosing |
| `lib/dialogue.mjs` `validateOutput` (never-answer guard) | extended: forbid verdict language about the text ("wrong", "incorrect", "the AI failed") just as it forbids answering |
| `lib/retrieval.mjs` (domain corpus) | unchanged — domain entries still ground the questions in the student's discipline |
| SSE `/api/chat` shape | mirrored by a new stateless endpoint (below) |

The posture mechanism is the elegant hinge. zetizeti's design already says: *a deterministic
layer decides the mode to question in; the model never sees a diagnosis.* Criticism mode
simply gives that layer a new, deterministic input — the conflation points located by
`read_sensed` — and the model questions *toward* them without ever being told they are
errors.

## The pipeline (one criticism interaction)

1. **Student pastes a found AI text** (and, optionally, the prompt that produced it).
2. **Qualification pass (deterministic — superseded the LLM pass).** `lib/qualify.mjs` segments the
   text and tags each segment `{origin: "text", sdc_stage: qualification|judgement|narration|mixed,
   judgement_held_by}`, where `judgement_held_by` ∈ `text|human|shared|n/a`. The value is
   **source-neutral** — `text` (the found text held the call), never `ai`: the tool questions an idea
   from anywhere, not necessarily a machine, and must not conflate "the text decided" with "this is
   AI-generated". It is a source-neutral variant of Split Record v1.0; the canon's `ai` value is mapped
   in only at the compute boundary (`qualify.toCanonSegments`) so `lib/sensed.mjs` stays a faithful port.
3. **Locating (deterministic, no LLM).** Feed the Split Record to the split-ratio rules and
   get back the `sensed_reading`: the strict/balanced/generous spread plus
   `conflation_segment_ids` — the spots where description and judgement blur.
4. **Question pass (LLM, language work).** For a chosen conflation point, generate a
   Clean-Language question aimed at that spot ("What is this sentence doing — describing,
   or deciding for you?"), grounded in the domain corpus. Never "this is wrong."
5. **Student critiques.** The student decides whether the located spot is actually a
   smuggled verdict and what to make of it. zetizeti holds the gap open; it does not close
   it.

## How zetizeti gets the locating from the MCP

The split-ratio rules are deterministic and tiny (counting conflations by category, a
clamp). Three integration options, in increasing order of coupling:

- **JS port (recommended for the web app).** Re-implement `read_sensed`'s arithmetic in a
  small `lib/sensed.mjs`, a faithful hand-verifiable port of the MCP's `src/rules.py`, with
  a parity test that asserts the same inputs yield the same ratios and conflation ids as the
  MCP. The MCP stays the *canonical standard*; the port references it. No cross-runtime
  dependency, no per-request process spawn. This keeps "no LLM in compute" as a pure-JS
  code boundary, mirroring how Sensorium keeps it in its own runtime.
- **MCP as a sidecar HTTP service.** Wrap the MCP behind a tiny local HTTP endpoint and
  have zetizeti POST the Split Record. Keeps a single source of arithmetic, adds an ops
  dependency.
- **Spawn the MCP over stdio per request.** Simplest to reason about, heaviest at runtime;
  not advised for a web endpoint under class load.

Whichever path: the arithmetic must remain reconstructible by hand and contain no model
call. If the JS port drifts from the MCP, the parity test fails — that is the guard.

## The persistence boundary (binding)

Socratic mode persists a student's inquiry (quests, `lib/db.mjs`) — that is its whole point
as a longitudinal companion. **Criticism mode persists nothing.** The new endpoint (e.g.
`POST /api/criticise`) does *not* `requireUser`+`ownQuest`, does *not* write to the quests
DB, and stores neither the pasted text nor its reading. It is request → response, then gone.
This is how the split ratio's canon §155 ("never aggregate") is honoured *without a
hand-held boundary*: there is simply no store for a critique to land in. The toggle on the
client switches which endpoint the UI talks to; the stateful one and the stateless one never
share a table.

(zetizeti's existing auth still gates *who* can use the app and meters pool spend — that is
about cost, not about persisting critiques. Criticism turns count against the same OpenRouter
spend metering; they just leave no inquiry record behind.)

## The verdict-drift guard

The single thing that would betray the whole exercise is the tool sliding from *locating* to
*judging* — "here is a conflation point" becoming "here is the AI's mistake." The guard is
the same discipline zetizeti already enforces in code, not in a prompt: extend
`validateOutput` to reject output that names the text's spots as errors, grades the text, or
declares an "is-this-AI" verdict. The framing is always "we sensed blur here — what do *you*
see?", never "the AI got this wrong." If the model produces a verdict, the guard catches it
the same way it catches an answer today.

## The register

This lives in **zetizeti's own visual identity** (the painterly cobalt, its voice), NOT
`koher-ui.css`. zetizeti is not a Koher tool; it shares the SDC bones, not the skin.

## Build checklist (first pass)

> **Status (2 June 2026, 21:00):** item 1 DONE; items 2–7 NOT STARTED. Live build state, the
> corpus-asset state, and the resume point are tracked in **`corpus-criticism-tracker.md`** (read that
> to resume). Nothing of criticism is wired or deployed yet.

- [x] `lib/sensed.mjs` — JS port of the MCP `read_sensed` arithmetic + a parity test
      against the MCP's worked examples. **DONE** — `scripts/sync-mcp.mjs` + baseline track drift;
      parity 16/16, 0 skipped (the live JS-vs-Python cross-check now runs by default on both Mac and
      Linux after the test's MCP path was made to resolve via `$HOME`).
- [ ] Qualification prompt — segments a pasted text into a Split Record v1.0; tags only,
      never judges.
- [ ] Criticism system prompt in `dialogue.mjs` — "question this text", posture = a located
      conflation point.
- [ ] `POST /api/criticise` — stateless: qualify → locate → question; no DB write, no quest.
- [ ] `validateOutput` extension — forbid verdict/grade/"is-this-AI" language about the text.
- [ ] Client toggle — Socratic ↔ criticism; criticism talks only to the stateless endpoint.
- [ ] Spend metering — criticism turns count against the same OpenRouter pool/BYOK accounting.

## References

- Decision + the two-agent reasoning behind it:
  `~/Dropbox/personal_projects/koher/tools-scratch/24-split-ratio-mcp/ai-criticism-and-the-three-surfaces.md`
- `read_sensed` (the canonical locating): `koher/tools-release/split-ratio-mcp/src/rules.py`
- Sensed register canon: `~/Dropbox/personal_projects/splitdomaincognition/split-ratio.md`
  ("Two registers", §121-187; text-artefact permitted §125; never "the split ratio" §153;
  never aggregate §155)
- zetizeti's own argument that already contains the kinship: `position.md` (information gap
  vs understanding gap; category fidelity), `name.md` (the doubling, *zeti·zeti*).
