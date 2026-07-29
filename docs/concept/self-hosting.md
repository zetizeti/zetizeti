# self-hosting.md — running your own zetizeti

*zetizeti is AGPL-3.0 deliberately: so it cannot die, and so any school can run its own. This is the
operator's guide. For what the tool does and why, start at [`position.md`](position.md); for how the
questioning works, [`dialogue.md`](dialogue.md).*

---

## What you are running

A small Node service (Express, SQLite, no build step) that does five things per turn: exact-word
retrieval over a verified corpus, deterministic steering, one model call, a deterministic guard, and a
spend ledger. There is no vector database, no fine-tune, no queue, and no background worker. It runs
comfortably in ~1 GB of RAM; the reference deployment is a 4 GB / 2 vCPU box shared with other apps.

**It stores no conversations.** Not "deletes them after N days" — never writes them. The database holds
accounts, sessions, and a per-user spend ledger (turn counts and billed cost). What a student asks, and
what is asked back, exist only in their browser tab.

---

## Quick start (local)

```bash
cd app
npm install
cp .env.example .env        # then edit — see below
npm run dev                 # http://localhost:3000
```

Two things work with no API key at all:

```bash
npm run retrieve-test "I want to make the checkout faster"   # FTS5 retrieval over the corpus
open public/index.html                                       # the offline self-demo (file://, canned data)
```

For local work without Google OAuth, keep `NODE_ENV=development` and set `ZETIZETI_ALLOW_GUEST=1`, then
use *continue as guest*. **Production disables guest entirely** — the deployed site is Google-OAuth-only
by design, and the guest route returns 404 whenever `NODE_ENV=production`.

---

## Configuration

Every setting is an environment variable; nothing sensitive belongs in the image.

### Sign-in

| | |
|---|---|
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · `GOOGLE_REDIRECT_URI` | the only sign-in path in production |
| `ZETIZETI_ADMIN_EMAILS` | who may read `/api/admin/usage` (turn counts and spend — never content) |
| `ZETIZETI_ALLOW_GUEST` | dev only; hard-refused in production |

### Inference

| | |
|---|---|
| `OPENROUTER_API_KEY` | the **personal** key — used only by `ZETIZETI_POOL_ALLOWLIST_PERSONAL`, own-key billing, uncapped |
| `OPENROUTER_API_KEY_ORG` | the **students** key — used by the students roster, metered against the ₹ ceiling |
| `ZETIZETI_MODEL` | defaults to `google/gemini-3.1-flash-lite` |

OpenRouter is a gateway, not a dependency of the design: the corpus carries the substance and the model
only composes a question in the learner's words. A cheap model is the intended configuration, not a
compromise. **Turn auto-top-up OFF on the key** — the ₹ ceiling is the application's brake, but a
runaway top-up is a separate risk it cannot reach.

Keys are held in memory, resolved per request, and **never logged, never echoed in a response, never
returned by any endpoint**. `/api/config` and `/api/pool` return booleans and counts only. This is a
security property, and security properties fail silently — a stray `console.log(req.body)` would begin
leaking with nothing to flag it.

### Access

Two tiers, resolved by one classifier (`lib/cohorts.mjs`) so the tiering can never drift between the
chat path, the critique path, and the config endpoints.

| | |
|---|---|
| `ZETIZETI_POOL_ALLOWLIST_PERSONAL` | operator and trusted accounts → the personal key |
| `ZETIZETI_POOL_ALLOWLIST_STUDENTS` | the cohort roster → the org key, metered |

**Both are closed by default.** A signed-in user on neither list is refused with a clear message. There
is no user-supplied-key fallback: if you configure no key, the service cannot generate at all, and says
so.

### Spend

| | |
|---|---|
| `ZETIZETI_MAX_BUDGET_INR` | **lifetime** ₹ ceiling on the org key — the fixed-pilot hard stop |
| `ZETIZETI_POOL_USER_TURNS` | hard per-user daily turn count. **Default 0 = off** |
| `ZETIZETI_USER_DAILY_INR` | explicit per-user daily ₹ share; overrides the adaptive one |
| `ZETIZETI_USER_BUDGET_INR` | per-user lifetime ₹ slice |
| `ZETIZETI_POOL_DAILY_USD` | optional day-wide $ ceiling |
| `ZETIZETI_USD_INR` | pin the rate (otherwise live, refreshed every 12h) |

**The adaptive allowance (v0.11.1).** The day control is no longer a turn count. Each user's daily share
is **2% of the pool's remaining ₹, clamped to ₹2–₹50** — effectively unlimited while the pool is healthy,
shrinking proportionally only as it depletes, with the lifetime ceiling absolute above it. Graceful
degradation rather than a cliff.

The fixed 40-turn cap was retired on evidence: it bounded something that costs almost nothing (a real
pilot spent ₹37 of ₹12,000 across 28 users) while cutting off exactly the long, engaged sessions the tool
exists for — a tester hit the wall mid-thought and had to ask for a renewal. Set
`ZETIZETI_POOL_USER_TURNS` to a number only if you want a hard count back.

Every refusal is a specific code with a plain message: `NO_ACCESS`, `NO_POOL`, `POOL_CAP`,
`POOL_BUDGET_CAP`, `POOL_USER_CAP`, `POOL_USER_BUDGET_CAP`, `POOL_USER_LIFETIME_CAP`.

### Storage

`ZETIZETI_DB` — defaults to `db/zetizeti.db` locally; the image expects a persistent volume (the
reference deployment mounts `/app/data`). Losing it loses accounts and the spend ledger, never
conversations.

---

## Deploying

The reference target is CapRover, but nothing depends on it — the image is an ordinary
`node:20-slim` container.

```bash
cd app
/opt/homebrew/bin/bash make-caprover-tar.sh      # whitelists ONLY the running app; stamps version.json
caprover deploy -n <machine> -a zetizeti -t zetizeti.tar
```

**The base image must remain glibc.** `onnxruntime-node` DLOPEN-crashes at runtime on alpine/musl; the
neural embedding path exists for the felt-shift reading, so `node:20-slim` is not a preference.

HTTPS is required in production — the session cookie is `Secure`, so an http:// deployment cannot hold a
login.

The tar contains only `server.mjs`, `lib/`, `public/`, `corpus/`, and the package files. Probe scripts,
tests, docs and fixtures are **not deployed**.

---

## Verifying a deployment

```bash
curl -s https://<host>/api/version     # {"version":"0.11.1","commit":"…","dirty":false}
curl -s https://<host>/api/config      # version, cohorts (counts only), poolEnabled, capture
```

`capture` must read `false` in production. It is hard-guarded off whenever `NODE_ENV=production`, so it
cannot be switched on by configuration — capture exists only for an operator running a local instance
against their own chats.

A clean release reports `"dirty": false` with the commit matching the tag. `X.Y.Z+N.gsha` means the
running build is ahead of its tag.

---

## What you must not change

These are documented in full in the repository root's `CLAUDE.md` and enforced by the test suite. The
three that matter most to an operator:

1. **The never-answer guard is code.** `validateOutput` buffers, checks, repairs once, and only then
   delivers. Restoring token-by-token streaming would silently revert enforcement to reporting, because
   a question cannot be withheld after it has been read.
2. **Retrieval is exact-word.** FTS5, `unicode61`, no stemming, no embeddings. Clean Language reuses the
   learner's literal words, so retrieval must be literal too.
3. **No in-copyright text in `corpus/`.** Every entry is original prose backed by verified citations to
   public sources. This is the entire reason the project exists as something distributable.

## Getting help, and helping

Issues and pull requests at [github.com/zetizeti/zetizeti](https://github.com/zetizeti/zetizeti). The
most valuable contribution is not a feature: it is **a transcript where the questioning fails**, with a
note on what it should have asked. That is how every mechanism in [`dialogue.md`](dialogue.md) came to
exist, and roughly half of what was tried is documented there as rejected.
