# zetizeti — Goal flow & Behind-the-Curtain logic

**Purpose:** complete specification of the goal lifecycle, the progress-tracking
logic, the front-end ⇄ back-end contract, and the behind-the-curtain view — so the
backend session can implement/verify against it without re-reading the UI code.

**Status:** 23 May 2026. Single source of truth for the UI: `public/index.html`.
Backend: `server.mjs` + `lib/dialogue.mjs` + `lib/retrieval.mjs`. Design-version files
were deleted; do not look for them.

**Architecture stance (SDC):** the AI does *language* (asks one or two questions);
**code** does the *judgement/tracking* (honing count, exchange count, goal lineage,
the never-answer guard); the **human** decides (names the goal, re-draws it). Keep this
split. The model never scores the learner or decides progress — progress is code-tracked
and human-owned.

---

## 1. The goal lifecycle (front-end state machine)

Client state (in `public/index.html`):

| variable | meaning |
|----------|---------|
| `phase` | `'goal'` → `'dialogue'` → (`'redraw'` → `'dialogue'`)* |
| `goal` | the current goal string ("the edge") |
| `lineage[]` | every goal statement, oldest → newest (vague → sharp) |
| `honed` | count of times the goal was re-drawn (= `lineage.length - 1`) |
| `exchanges` | count of learner turns engaged |
| `history[]` | `[{role:'student'|'interlocutor', content}]` — the conversation |
| `busy` | request in flight (locks the composer) |

**Transitions**

1. **`phase = 'goal'` (start).** The stone shows a fixed opening question
   (*"What are you trying to do right now — and where does it resist you?"*). The composer
   placeholder is *"Name what you're trying to do…"*.
2. **First submit → `startDialogue(text)`.** `text` becomes `goal`; pushed to `lineage`;
   `history.push({role:'student', content:goal})`; the goal display appears; `phase` →
   `'dialogue'`; then `streamStone(goal)` is called (the stone asks its first
   goal-sharpening question).
3. **`phase = 'dialogue'` submit → `turn(text)`.** Adds a `you` turn, pushes history,
   `exchanges++`, then `streamStone(text)`.
4. **Re-draw.** Clicking *"↻ re-draw the edge"* sets `phase = 'redraw'` and changes the
   placeholder to *"Re-draw the edge, sharper…"*. The next submit → `redraw(text)`:
   `goal = text`; pushed to `lineage`; `honed++`; a divider *"— the edge, re-drawn —"* is
   added; a `you` turn with the new goal; then `streamStone(text)`. `phase` back to
   `'dialogue'`.

**The goal is sent on every call** (see §3) so questions keep sharpening toward the
*current* goal, and retrieval is biased toward it.

---

## 2. Progress tracking (code-owned)

Rendered by `updateEdge()` into the goal display:

- **Honing ticks** — `honed + 1` diamonds; the first `honed` are filled (`◆`), the last
  is dim (`◇`). Visualises "the edge has been re-drawn N times".
- **`honed ×N`** — number of re-draws.
- **`N exchanges`** — number of learner turns.
- **Lineage** — `lineage[]` rendered as a list; earlier entries struck through, the last
  (current) entry highlighted. Hidden by default; toggled by clicking the trace.

This is the *track-progress-toward-the-goal* feature: progress = the goal getting sharper
over the session, tracked structurally, owned by the learner. **No AI judgement of
progress.** If the backend ever returns a "progress" signal, it must be advisory only and
must not drive this display.

---

## 3. Front-end ⇄ back-end contract

### Request — `POST /api/chat`

```jsonc
{
  "quest_id": "<id of the enquiry being added to — owned by the signed-in user>",
  "message":  "<the learner's latest text>",
  "history":  [ {"role":"student"|"interlocutor", "content":"…"}, … ],  // EXCLUDING the latest message
  "goal":     "<the current goal string, may be empty before first goal is set>",
  "kind":     "goal" | "redraw" | "turn",   // what this student turn is
  "honed":    0,                              // re-draw count (code-owned)
  "exchanges":0,                              // learner-turn count (code-owned)
  "lineage":  [ "<vague>", … "<sharp>" ]      // every goal statement so far
}
```

**Auth + persistence (added 23 May 2026 — the login build).** `/api/chat` now requires a
signed-in session (cookie) and verifies the session's user **owns** `quest_id` (404 otherwise).
The widened body lets the server persist the turn: it writes the **student** turn and updates
the quest's code-owned progress (`current_goal`, `honed`, `exchanges`, `lineage`) in one
transaction **before** generation, and writes the **interlocutor** turn only on `done` (no
half-turns from failed streams). `honed/exchanges/lineage` remain client-tracked; the server
is a mirror, never the source of a "progress score". `kind='redraw'` is what lets a resumed
enquiry re-insert the *"— the edge, re-drawn —"* divider on hydration.

- The front-end sends `history.slice(0, -1)` (history minus the just-pushed latest), and
  the latest as `message`. The latest student message is therefore **not** duplicated in
  `history`.
- `goal` is the **current** goal (after any re-draws), not the original.

### How the backend uses `goal` (already implemented — verify/keep)

- **`server.mjs`** destructures `goal`, tokenises it (`goalTerms`, words > 2 chars), and
  passes `extraTerms: goalTerms` to `retrieve(...)` so retrieval is biased toward the goal,
  and passes `goal` to `buildSystemPrompt(...)`.
- **`lib/dialogue.mjs buildSystemPrompt(methodCore, retrieved, goal)`** injects a
  `== THE LEARNER'S GOAL — the edge they are sharpening ==` block instructing the model to
  *orient every question toward sharpening this goal* — and explicitly **not** to restate,
  praise, or evaluate it.

### Response — Server-Sent Events (SSE)

`Content-Type: text/event-stream`. Events, in order:

| event | data shape | when | front-end action |
|-------|-----------|------|-------------------|
| `curtain` | `{ retrieved: [ {id, snippet, sources}, … ] }` | **before** generation | stored; later rendered in the curtain panel |
| `token` | `{ t: "<chunk>" }` | streaming | appended to the stone's answer text |
| `validation` | `{ ok: boolean, reasons: string[] }` | after generation | stored; rendered as the guard line |
| `done` | `{}` | end | (no-op; stream closes) |
| `error` | `{ message: "<text>" }` | on failure / no API key | shown in place of the answer |

The front-end parses events as ``event: <type>\ndata: <json>\n\n`` (regex
`/^event: (.+)\ndata: (.+)$/s`). **Keep this exact framing.** One JSON object per `data:`.

---

## 4. Behind-the-Curtain logic

The promise: *the machinery is shown, never hidden.* Under each stone question, a toggle
*"behind the curtain — what sharpened this"* reveals what the engine retrieved before it
asked, plus the never-answer guard result.

**Rendered by `attachCurtain(node, retrieved, guard)`:**

- Heading: `tensions retrieved`.
- For each `retrieved` item: ``<id> — <snippet>`` with `<sources>` beneath, italic.
  - `id` — short tension id (e.g. `IxD·04`).
  - `snippet` — the retrieved tension, framed as a tension (not an answer).
  - `sources` — citation string (e.g. `Norman · Cooper`). Citations live **here**, behind
    the curtain — **never** inside the question itself.
- If `retrieved` is empty: *"no domain tension matched — questioned from method alone."*
- Guard line: `guard: passed` (green-ish) when `validation.ok`, else
  `guard: flagged — <reasons joined>`.

**Backend source of the curtain data:**

- `retrieve(db, message, {limit:3, extraTerms:goalTerms})` returns rows; `server.mjs` maps
  each to `{id, snippet, sources}` for the `curtain` event. (Internally rows also carry
  `tension`, `questions`, `body`, `discipline` — only `id/snippet/sources` are surfaced.)
- The guard is `validateOutput(text)` in `lib/dialogue.mjs` — a deterministic rules layer
  (the **judgement** layer of SDC). It flags if there is no `?`, or if any FORBIDDEN
  pattern matches (e.g. *"you should"*, *"the answer is"*, *"to summarise"*, list-giving
  openers). Returns `{ok, reasons}`. This must remain **code**, not model self-assessment.

**Curtain timing:** the `curtain` event is sent *before* the model generates, so the UI
can show "what was retrieved" even if generation fails. The panel is attached after the
turn completes (so it sits with the finished question).

---

## 5. Offline demo mode

When `public/index.html` is opened directly (`location.protocol === 'file:'`), `runDemo()`
auto-plays a full multi-round session (goal set, several exchanges, two re-draws, all with
behind-the-curtain views) using canned `retrieved`/`guard` data — **no backend call**.
Served over http(s), this branch is skipped and the tool is live. Backend work does not
need to touch `runDemo`; it is a self-demo only.

---

## 6. What the backend session should ensure

- [ ] `/api/chat` accepts `{message, history, goal}` and tolerates empty `goal`.
- [ ] `goal` flows into **both** retrieval (`extraTerms`) and the system prompt
      (`buildSystemPrompt(..., goal)`) — already wired; verify after any refactor.
- [ ] SSE events keep the exact names/shapes in §3 (`curtain` first, then `token`s, then
      `validation`, then `done`; `error` on failure).
- [ ] `curtain.retrieved[]` items expose `{id, snippet, sources}` and **no** raw answer.
- [ ] `validation` stays a deterministic code guard (`validateOutput`), never a model
      verdict; questions must contain `?` and avoid the FORBIDDEN patterns.
- [ ] The model is never asked to score the learner or judge progress. Honing/exchanges/
      lineage are client-side and code-owned.
- [x] **Persistence (built 23 May 2026).** Goal/lineage/history persist per **quest** in
      `db/zetizeti.db` (see `lib/db.mjs`). `/api/chat` requires a session and checks quest
      ownership; opening a quest (`GET /api/quests/:id`) returns `{quest:{…,lineage[]}, messages[]}`
      for client hydration. Auth is Google OAuth (`lib/auth.mjs`) with a dev-only guest fallback.
- [ ] Hydration parity: when a quest is reopened, the client rebuilds `history[]`, the edge
      display (`goal/lineage/honed/exchanges`), and the stream from `messages[]`; `kind='redraw'`
      messages re-insert the divider. Live-only dividers between turns are not persisted (by design).

---

## 7. File map

| file | holds |
|------|-------|
| `public/index.html` | all UI: goal state machine, `updateEdge`, `streamStone` (SSE client), `attachCurtain`, the goal blob + dialogue rendering, offline `runDemo` |
| `server.mjs` | `/api/chat` SSE handler; threads `goal` into retrieval + prompt; `/api/retrieve` debug endpoint |
| `lib/dialogue.mjs` | `loadMethodCore`, `buildSystemPrompt(methodCore, retrieved, goal)`, `validateOutput` (the guard) |
| `lib/retrieval.mjs` | `buildIndex`, `retrieve(db, text, {limit, extraTerms})` (FTS5 over the domain corpus) |
| `brand.md` | brand/voice/visual identity |
| `corpus/` | `domain/` tension entries (retrieved) + `method/` (resident method core) |

---

*The visual treatment (Prussian-blue organic goal blob, painterly animated washes, living
reading blob, Tiro Devanagari Sanskrit + Space Mono) is documented in `brand.md`; this file
is the logic/contract, which is what the backend cares about.*
