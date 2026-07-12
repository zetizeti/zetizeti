# zetizeti — spec (formerly "aaraaya", originally "socraticWeb")

**Created:** 23 May 2026, 16:55:04 · **Last updated:** 23 May 2026 (login build)
**Status:** 🔨 BUILT (working prototype in `app/`) — no longer parked. The web-deployable,
clean-corpus version exists and runs.
**One line:** A web Socratic inquiry toolkit (questions only) over a copyright-clean,
verified synthetic corpus — the releasable answer to the in-copyright local agent below.

---

## Built reality (23 May 2026) — supersedes the feasibility sections further down

Everything from "Decisions settled" onward was the *feasibility* framing; it's kept as the
origin record but the project has moved past it. Current state:

- **`app/`** — runnable Node/Express app. `npm install` done; `npm start` serves it.
- **Corpus (clean, verified):** 34 synthetic tension-entries — interaction-design (16),
  slow-design (8), critical-counterculture-attention-economy (10) — in `app/corpus/domain/`,
  retrieved by **SQLite FTS5** (exact-word). Method core (Part A) resident in the prompt.
  **All 34 Consensus-backed** against peer-reviewed literature with original-paper citations
  (`app/verification-consensus-backing.md`). No in-copyright text bundled — the licensing
  blocker is resolved by *synthetic-verified* corpus + bring-your-own-corpus engine.
- **Model:** `claude-haiku-4-5` (the corpus carries the substance; the model only composes
  a question in the learner's words).
- **Engine contract:** the SSE contract as implemented (`server.mjs` + `public/index.html`) — goal/edge flow, code-tracked honing,
  the never-answer guard (`validateOutput`), and the SSE behind-the-curtain protocol.
- **Login flow (built 23 May 2026):** Google OAuth (`lib/auth.mjs`) + dev-only guest fallback;
  opaque server-side sessions; **enquiries → conversation → progress** single-page views with
  no reloads; quests (incl. **fork**), per-quest persistence + hydration, private code-owned
  progress (`lib/db.mjs`, `db/zetizeti.db`). Needs a Google Cloud OAuth client (Client ID/secret +
  the redirect URIs in `app/.env.example`) for real sign-in.
- **UI:** zetizeti's own painterly identity (cobalt washes, Tiro Devanagari Sanskrit + Space Mono),
  **not** `koher-ui.css`. See `app/brand.md`.
- **Deploy target:** `zetizeti.com` (not `*.koher.app`) — the corpus is clean, so a public demo
  no longer carries the licensing exposure flagged below.

**Still open:** real Google OAuth credentials; three-pass verifier on the slow-design + critical
lenses (only IxD went through the independent agents); Part A questioning corpus deepening;
HTTPS deploy + domain wiring.

---

## Name — zetizeti (decided 23 May 2026, 21:55) — SUPERSEDES aaraaya

**Name:** **zetizeti** — a reduplication of **zeti**, clipped from *zetetic* (Greek *zeteo*, ζητέω: "to inquire, seek, question"). *Zetetic* means "proceeding by inquiry / questioning" — the Socratic act itself. The doubling is the point: it is **catchy** (the decisive criterion), in the globally legible reduplication family (bonbon, tuk-tuk, byebye, Chupa Chups), playful and gen-z-native, all-open-vowels, easy to say across languages (ZEH-tee-ZEH-tee). The meaning lives in sound, not transparency — like most brand names; the Socratic root is real but carried in copy, not decoded from the word.

**Domain:** **zetizeti.com** — ✅ **REGISTERED / owned by Prayas, 23 May 2026, 21:59.** (Was verified available earlier the same day; now bought.) The `.com` is the decisive win: every single-word coinage tried was exhausted on `.com`, and `.app` was fully exhausted too (verified via Google's registry). The reduplication is almost certainly *why* the `.com` was free when `zeti.com` was not. Supersedes the earlier `aaraaya.net` choice. Deploy target moves from `aaraaya.net` → `zetizeti.com`.

**Availability scan (23 May 2026, whois):** `.com` taken for sokra/sokri/maiu/maieu/elenq/elenko/aporo/thauma/quro/quern/qora. `.app` taken for eroto/erota/elenq/sokri/zeti/maiu/zeteo/noema/aporo (Google registry). Single-word fallbacks that *were* live on `.io`: **elenq.io, sokri.io, eroto.io, erota.io** (held in reserve). `zetizeti.com` available — chosen.

**NOT yet done (open follow-ups for this rename):**
- **Trademark / collision scan for "zetizeti" / "zeti" NOT run.** The thorough scan below (Arya.ai, AARYA, etc.) covered *aaraaya* only. Before any monetisation or formal registration, run an IP India knock-out search on zetizeti / zeti (Classes 9 / 41 / 42) with counsel. Practical risk for an open, non-commercial FOSS tool is presumed low but **unverified**.
- **Code-level rename DONE (23 May 2026).** `db/` path → `db/zetizeti.db`; env vars → `ZETIZETI_DB` / `ZETIZETI_ALLOW_GUEST`; cookies → `zetizeti_session` / `zetizeti_oauth_state`; package name, UI title/wordmark, server log, README, GOAL-AND-CURTAIN, brand.md, build-plan all carry "zetizeti"; deploy target → `zetizeti.com`. App boot-verified under the new name (guest path, cookie, db, log). The painterly cobalt visual identity was **kept** (name change only); whether it survives long-term is still a separate, open decision.
- Hold `zetizeti.org` / `.app` alongside `.com` as cheap collision insurance (not yet checked/registered).

**Why over aaraaya:** aaraaya's weak point was global spell/say-ability (double-vowel Malayalam). zetizeti trades the native-language meaning for catchiness, a clean `.com`, and frictionless global pronunciation — the explicit brief was *catchy*.

---

## Name — aaraaya (decided 23 May 2026, 19:53) — SUPERSEDED by zetizeti (see above)

**Name:** **aaraaya** — from Malayalam ആരായൽ / ആരായുക (*aaraayal* / *aaraayuka*): "inquiry / to inquire, examine, look into." Native Dravidian root (not Sanskrit). The dictionary noun is ആരായൽ (*aaraayal*); the final **-l** is dropped, turning the word into a name — softer, all-open-vowels (aa-raa-ya), ownable. Same move that produced "Koher" from "cohere": a clipped/respelled real word whose meaning shows through. Names the *act of inquiry*, fitting a questions-only tool.

**Non-Koher tool.** Carries no Koher branding, no `koher.app` subdomain, none of Koher's release conventions. Naming and domain are independent. (Relocated OUT of the Koher tree 23 May 2026 to its own top-level project: `~/Dropbox/personal_projects/zetizeti.com/`.)

**Domain:** **aaraaya.net** (chosen). Verified available 23 May 2026 via whois. Also available at decision time: `aaraaya.org`, `aaraaya.app`, `aaraaya.dev`, likely `aaraaya.in`. Taken: `aaraaya.com`. Holding `.org` + `.app` alongside `.net` was flagged as cheap collision insurance.

**Collision / trademark scan (23 May 2026, Perplexity):** No exact "Aaraaya"/"Aaraya" tech/AI/edtech product or registered mark found. Phonetic neighbours exist in the Indian AI space — **Arya.ai** (registered TM, Lithasa Technologies, AI SaaS, India Class 9/42, valid to 2030) and **AARYA** (6D Technologies LLM assistant); "Araya" appears in non-tech US/Canada brands (records, industrial). Distinct spelling + Malayalam origin lower confusion. For an open, non-commercial FOSS tool (no SaaS, no monetisation) practical risk is low. **NOT legally cleared** — before any monetisation or formal registration, run an IP India knock-out search (Classes 9 / 41 / 42) on aaraaya / aaraya / arya with counsel. README hygiene: title as "aaraaya — Socratic inquiry toolkit"; avoid "AI assistant" framing that echoes Arya.ai / AARYA.

**Naming routes considered and dropped (for the record):** English coinages (whet / whetstone family — domain-crowded); Latin *rogare* (`rogare.dev` available, but European register + name-collision with a fundraising think-tank); short plain Hindi / Sanskrit words (kyun, prashna, tarka, etc. — registry-premium or Sanskrit, which was ruled out); Koher-derivatives (`kyoher` — available but too derivative). Landed on a clipped native-Malayalam inquiry word.

## Decisions settled 23 May 2026

1. **Scope = feasibility only.** Stop at this doc. No verification work, no prototype yet.
2. **Local corpus stays as-is (private).** The local Claude Code agent keeps grepping the in-copyright books for personal use. A release-clean track, when built, runs in parallel and never touches those files. (No public demo until a clean corpus exists — see Sequencing exposure below.)
3. **Workshop carve-out.** Classified as a course-flow / workshop tool, exempt from the engine-grade rule. No formal SDC architecture ruling needed. The thin SDC-fit is accepted as fine for a workshop tool.

---

## What exists today

A Claude Code subagent (`gabor.mate/.claude/agents/socratic-interlocutor.md`) that:

- Before **every** response, greps `research-socratic/` (9 books, 147,794 lines, ~11 MB) and cites line numbers.
- Asks questions only — never answers. Clean Language syntax (student's literal words), Gendlin felt-sense, Gadamer genuine-question, Freire problem-posing.
- Tracks movement toward clarity / confusion; recalibrates direction every 3–4 exchanges.
- Stores sessions as markdown on disk (new / branch / resume).
- Already packaged for **local** Claude Code distribution: `desktop_monthly/.May_2026/socratic-interlocutor-package-20260515.zip` (agent + hooks + install.sh + bundled books).

**The corpus is the value. The corpus is the blocker.** Freire, Gadamer, Gendlin ×4, Lawley-Tompkins, Palmer, Polanyi — all in copyright. The May package ships the books inside it; that is a private-use artefact, not a releasable one.

---

## The core finding

**The licensing constraint dominates the architecture constraint.** Web-deploy is conventional engineering (Anthropic SDK + retrieval + session store + chat UI). The hard, distinctive problem is the corpus. Spend the effort there.

**Engine / corpus separation is the only release path that holds.** Do NOT transform the pirated books into "extracted patterns" or "short fair-use quotes" — legally fragile, and unnecessary. Instead:

- **Release = the engine.** System prompt, retrieval loop, session machinery, chat UI, Clean Language guardrails, never-answer output validation. This is original work → AGPL-3.0.
- **Corpus = a folder the operator supplies.** Bring-your-own-corpus. The release ships with a *verified-open default corpus* only.

This is exactly the "configurable perception engine" framing, and structurally identical to the `net-input` agent (reads a folder of nets, holds it as operating context). The interlocutor becomes: *a grounded-questioning engine that runs over whatever corpus you point it at.*

---

## Default corpus (VERIFY before naming — do not trust memory)

The release demo needs a legally-clean default corpus so it works out of the box.

- ✅ **Safe:** Plato's dialogues — the actual Socratic source — Jowett translation, Project Gutenberg, public domain.
- ⚠️ **Needs verification (separate work item):** Gendlin's papers (some open at the International Focusing Institute — but *which* papers, *what* licence, redistribute vs. link-only?); Lawley & Tompkins' free Clean Language articles (cleanlanguage.com — same questions). Do not enumerate these as "the default corpus" until each is checked. The spec can commit to a "verified-open default corpus" without listing it yet.

---

## Architecture (the conventional part)

| Layer | Choice | Why |
|-------|--------|-----|
| Model | Anthropic SDK, `claude-...` (Claude only) | — |
| Retrieval | **SQLite FTS5** (or ripgrep subprocess) | **Exact-word matching is non-negotiable** — Clean Language uses the student's *literal* words. Embeddings are wrong here and must never "improve" this to semantic search. FTS5 is edge-deployable ("Do More With Less"). |
| Sessions | SQLite / cookie (matches Turnstile + anonymous-cookie pattern on existing demos) | — |
| Frontend | zetizeti's own painterly identity (`app/brand.md`), Behind-the-Curtain showing retrieved passages | architecture-visibility rule |
| Deploy | CapRover, `zetizeti.com` (only after corpus is clean) | — |

---

## 🔴 Sequencing exposure (advisor flag)

A **public web demo on the current books is the same licensing problem under a new surface** — arguably worse than a private Claude Code install, because it serves copyrighted passages to strangers (public display/distribution, not personal use). Therefore:

**The corpus swap must happen BEFORE any demo goes up — not after the engine is released.** Standing up `zetizeti.com` on the current `research-socratic/` corpus would publish the exact thing the release is trying to avoid.

Open sequencing question (Prayas's call): does the **local** agent keep operating on the in-copyright corpus (private use) while a release-clean track is built in parallel — or is the local corpus swapped first?

---

## SDC-fit (settled — workshop carve-out, 23 May 2026)

1. **SDC-fit.** This is a *conversational* agent, not a qualification → rules → narration pipeline. A defensible SDC reading exists (retrieval = bounded qualification; never-answer + clarity/confusion tracking + forbidden-output validation = rules; grounded question generation = language) — but it is thinner than the diagnostics. Either seek a formal SDC architecture-fit ruling, or classify as a course-flow / workshop-tool carve-out (exempt from engine-grade rule).
Resolved as a course-flow / workshop-tool carve-out — exempt from the engine-grade rule, no formal SDC architecture ruling required. The thin SDC-fit is accepted as fine for a workshop tool.

---

## Next steps (when this is un-parked)

The gating work, in order, when feasibility is revisited:

- [ ] Verify the open-corpus candidates — Gutenberg Plato (Jowett) confirmed safe; Gendlin papers (International Focusing Institute) and Lawley-Tompkins articles (cleanlanguage.com) need per-text licence checks (redistribute vs. link-only). **This is the gate.**
- [ ] Prototype FTS5 retrieval over the verified default corpus + thin never-answer chat loop, behind zetizeti's own UI (`app/brand.md`).
- [ ] Only then: `zetizeti.com` (never on the in-copyright corpus).
