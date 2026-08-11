// server.mjs — zetizeti backend.
// SDC split held: AI does language (the question); CODE does judgement/tracking
// (retrieval, the never-answer guard, honing/exchange counts, ownership); the HUMAN
// decides (names the goal, re-draws it). The model never scores the learner.

import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildIndex, retrieve } from './lib/retrieval.mjs';
import {
  loadMethodCore, buildSystemPrompt, buildTurnContext, validateOutput,
  loadCriticismCore, buildCriticismSystemPrompt, validateCriticismOutput,
  CRITICISM_POINTERS, pickCriticismPointer, questionOpener, describeLocated,
} from './lib/dialogue.mjs';
import { readSensed } from './lib/sensed.mjs';
import { qualify, toCanonSegments } from './lib/qualify.mjs';   // DETERMINISTIC, no-LLM qualification (locating)
import {
  googleConfigured, adminConfigured, emailIsAdmin, currentUser, logout, publicUser,
  beginGoogleAuth, handleGoogleCallback, guestAllowed, beginGuest,
  personalAllowlistConfigured, personalAllowlistSize,
  studentsAllowlistConfigured, studentsAllowlistSize,
  aiClubAllowlistConfigured, aiClubAllowlistSize,
} from './lib/auth.mjs';
import { resolveAiClubKey, forgetKey, creditEngineConfigured } from './lib/credit-engine.mjs';
import { TIER, tierForUser, cohortSummary } from './lib/cohorts.mjs';
import {
  // EPHEMERAL (privacy, 11 Jul 2026): zetizeti stores no conversation. The Socratic chat and the
  // critique surface both generate statelessly from the transcript the browser sends each turn, and
  // persist NOTHING — no quests, no messages, no signals, no critique text. The only DB writes that
  // remain are operational, not content: auth sessions (in auth.mjs) and the per-user pool-spend ledger
  // below (turn counts + billed cost, for the ₹ caps + the admin usage monitor). What a student asks,
  // and the questions asked back, are never written anywhere. See the login-screen assurance copy.
  usageByUser,
  poolSpendToday, poolSpendAllTime, poolSpendUser, poolSpendUserAllTime, poolTurnsUser, addPoolSpend,
  adaptiveUserDailyInr,
  // The survival curve (30 Jul 2026) — counts only, no user column, no session id, no content. The one
  // thing the project could never see was a learner stopping; see the table comment in db.mjs.
  noteTurnDepth, turnDepthCurve, turnDepthSummary, turnDepthVersions,
} from './lib/db.mjs';
import { streamQuestion } from './lib/llm.mjs';
import { generateGuarded } from './lib/guard.mjs';           // the guard's ENFORCEMENT layer (invariant #3)
import { computeSignals, content as contentWords } from './lib/signals.mjs';
import { readDwell, isDecline, isCorrection, lastSubstantive } from './lib/arc.mjs';
import { readAssociation, associationBlock } from './lib/assoc.mjs';
import { semanticFreshness, refineFresh } from './lib/novelty.mjs';   // SHADOW ONLY — measured, not wired (see novelty.mjs)           // the enquiry surface's dynamic arc (line of questioning)
import { decideNudge, feltPosture, formShape } from './lib/nudge.mjs';
import { embedNeural, neuralReady, warmEmbeddings } from './lib/embed.mjs';
import { readFeltShifts, itemWords } from './lib/feltshift.mjs';   // the felt-shift event detector (v0.10.0)
import { resolveVersion } from './lib/version.mjs';
import { capture, labelCapture, captureEnabled } from './lib/capture.mjs';   // LOCAL operator-only test-chat capture (never in production)
import { buildStudentSystemPrompt, pickSeed } from './lib/author.mjs';        // LOCAL "author mode" — the play-acted student

// Build version (SemVer, aligned to git tags — see lib/version.mjs). Resolved once at boot: from the
// image's version.json in production, live from `git describe` in dev.
const BUILD = resolveVersion();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// The shared "pool" key — the ONLY inference path (BYOK was removed). Every signed-in cohort user runs
// on the operator's OpenRouter key (OPENROUTER_API_KEY), bounded by the ₹/‌$ caps. The pool is enabled
// only when the key AND a ceiling (ZETIZETI_MAX_BUDGET_INR or ZETIZETI_POOL_DAILY_USD) are set; with no
// key the app cannot generate at all (there is no user-key fallback). The pool key is the operator's
// own, deliberately configured; it is never logged and never sent to the client. The cap
// meters the REAL billed cost OpenRouter reports per turn; if that is ever missing, it falls back to
// Haiku's per-token price so the brake never silently under-counts.
const POOL_KEY = (process.env.OPENROUTER_API_KEY || '').trim();          // PERSONAL cohort — operator's own key
const POOL_KEY_ORG = (process.env.OPENROUTER_API_KEY_ORG || '').trim();  // STUDENTS cohort — the org/pilot key
const POOL_DAILY_USD = Number(process.env.ZETIZETI_POOL_DAILY_USD || 0) || 0;
// Per-user daily turn allowance (chat messages) — the user-facing "free for X turns" limit and the
// header counter. So no single person eats the day's budget. Default 40 (≈ $0.20 of Haiku, so ≥5
// users share a $1 day). Override with ZETIZETI_POOL_USER_TURNS. The $/day total above is the hard
// money ceiling regardless.
// 🔵 "no turn cap. adaptive" (Prayas, 29 Jul 2026). Default 0 = DISABLED: the fixed daily turn count
// bounded something that costs almost nothing (24 Jul: 28 users, ₹37 of ₹12,000) and cut off exactly
// the students the pilot wants — a real tester hit 40 mid-thought and asked for her chats to be
// renewed. The operative day control is now the ADAPTIVE ₹ allowance below (adaptiveUserDailyInr —
// breathes with the pool's remaining budget); the lifetime ₹ ceiling stays absolute. A self-hoster who
// wants a hard count back sets ZETIZETI_POOL_USER_TURNS explicitly.
const POOL_USER_TURNS = Number(process.env.ZETIZETI_POOL_USER_TURNS || 0) || 0;
// Total budget ceiling in RUPEES across the whole instance lifetime — all days, all users (the
// pilot-grade cap, e.g. ₹12,000 for the Sem 7 cohort). 0/unset = no total cap. The pool ledger is in USD
// (OpenRouter bills in USD), so it is converted at the live USD→INR rate (see usdInr below). When cumulative
// real billed spend reaches this rupee ceiling, pool turns stop for everyone. Independent of the
// per-day USD cap: either may be set alone, or both together (defence in depth). The rupee cap can
// therefore be the SOLE control for a closed pilot — set OPENROUTER_API_KEY + ZETIZETI_MAX_BUDGET_INR
// and leave ZETIZETI_POOL_DAILY_USD unset.
const MAX_BUDGET_INR = Number(process.env.ZETIZETI_MAX_BUDGET_INR || 0) || 0;
// USD→INR rate for the ₹ caps + the money-used display. Fetched LIVE (open.er-api.com, no key) at boot
// and refreshed every 12h, so the rupee figures track the real rate rather than a stale constant.
// `ZETIZETI_USD_INR`, if set, PINS the rate (no fetch) — useful offline/in tests. 85 is the last-resort
// fallback used only until the first successful fetch. All cap maths read `usdInr()`, never a constant.
const USD_INR_OVERRIDE = Number(process.env.ZETIZETI_USD_INR || 0) || 0;
let _usdInr = USD_INR_OVERRIDE || 85;
const usdInr = () => _usdInr;
async function refreshUsdInr() {
  if (USD_INR_OVERRIDE) return;                         // pinned by env — never override a live fetch
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!r.ok) throw new Error('fx http ' + r.status);
    const rate = (await r.json())?.rates?.INR;
    if (typeof rate === 'number' && rate > 0) { _usdInr = rate; console.log(`[zetizeti] USD→INR rate: ₹${rate}`); }
  } catch (e) { /* keep the last good value; FX must never crash the app */ }
}
// Per-user, per-day budget ceiling in RUPEES — one student's daily share of the total. 0/unset = no
// per-user rupee cap (the per-user TURN cap, ZETIZETI_POOL_USER_TURNS, still applies). When a user's
// own real billed spend for the UTC day reaches this, that user is stopped for the day; others, and
// the same user tomorrow, are unaffected. Layered on the per-user turn cap — whichever bites first.
const USER_DAILY_INR = Number(process.env.ZETIZETI_USER_DAILY_INR || 0) || 0;
// Per-user LIFETIME budget ceiling in RUPEES — one student's hard share of the shared pool across the
// WHOLE run (all days). 0/unset = no per-user lifetime cap. For the memorability cohort this is how a
// fixed per-student slice is guaranteed on ONE shared key WITHOUT issuing individual keys: set it to the
// total ÷ cohort size (e.g. ₹12000 ÷ 87 ≈ ₹138). When a user's cumulative real billed spend reaches it,
// that user is stopped for good; others, and the shared ₹ ceiling, are unaffected. Layered on the
// per-user DAILY caps (turns + optional daily ₹) — whichever bites first.
const USER_BUDGET_INR = Number(process.env.ZETIZETI_USER_BUDGET_INR || 0) || 0;
// PERSONAL is live as soon as the operator key exists (own-key billing — no ceiling needed). STUDENTS is
// live only with the org key AND a ceiling (the pilot guardrail — never an unbounded shared org key).
const personalEnabled = !!POOL_KEY;
const studentsEnabled = !!POOL_KEY_ORG && (POOL_DAILY_USD > 0 || MAX_BUDGET_INR > 0);
const poolEnabled = personalEnabled || studentsEnabled;   // "is any shared-key path live?" (config/boot/USD refresh)
const utcDay = () => new Date().toISOString().slice(0, 10);     // 'YYYY-MM-DD'
const HAIKU_IN = 1 / 1e6, HAIKU_OUT = 5 / 1e6;                  // $/token fallback (Haiku 4.5)
const usageCost = (u) => (u && typeof u.cost === 'number' && u.cost > 0)
  ? u.cost
  : ((u?.prompt_tokens || 0) * HAIKU_IN + (u?.completion_tokens || 0) * HAIKU_OUT);

// Guard telemetry — IN-MEMORY, per process, three integers per surface. It records how often the
// never-answer guard had to act, and NOTHING about any turn's content (invariant #8: no request body, no
// question, no reasons text). Resets on restart by design: this is a live health reading for the operator
// (/api/admin/usage), not a stored record, and zetizeti stores no conversation.
const guardStats = {
  enquiry:   { turns: 0, regenerated: 0, flagged: 0 },
  criticism: { turns: 0, regenerated: 0, flagged: 0 },
};
// Felt-shift telemetry — same discipline as guardStats: counts + a latency reading, never content.
const feltStats = { computed: 0, sem: 0, lex: 0, skipped: 0, msLast: 0 };
function noteGuard(surface, guarded) {
  const s = guardStats[surface];
  if (!s) return;
  s.turns++;
  if (guarded.regenerated) s.regenerated++;      // the guard rejected an attempt and made the model ask again
  if (!guarded.check.ok) s.flagged++;            // it broke the rule twice; the least-bad was delivered, flagged
}
// Total-budget helpers. budgetSpentINR — cumulative real billed spend across all days, in rupees.
// budgetExhausted — true once the rupee ceiling is reached (false when no ceiling is configured).
const budgetSpentINR = () => poolSpendAllTime() * usdInr();
const budgetExhausted = () => MAX_BUDGET_INR > 0 && budgetSpentINR() >= MAX_BUDGET_INR;
const dayCapReached = (day) => POOL_DAILY_USD > 0 && poolSpendToday(day) >= POOL_DAILY_USD;
// Per-user daily rupee cap: this user's real billed spend today (USD ledger → ₹) against USER_DAILY_INR.
const userDayCapReached = (day, userId) => USER_DAILY_INR > 0 && poolSpendUser(day, userId) * usdInr() >= USER_DAILY_INR;
// Per-user LIFETIME rupee cap: this user's cumulative billed spend across all days against USER_BUDGET_INR
// (their hard share of the shared pool). Inert when unset. This is the memorability per-student guarantee.
const userBudgetExhausted = (userId) => USER_BUDGET_INR > 0 && poolSpendUserAllTime(userId) * usdInr() >= USER_BUDGET_INR;
// Access + cap messages. zetizeti is pool-only (BYOK removed): there is no user-supplied-key escape
// hatch, so a refused turn ends in a clear cohort-appropriate message, never "add your own key".
const NO_POOL_MSG    = 'This instance is not set up for use yet — please contact the person running it.';
const NO_ACCESS_MSG  = 'This tool is open to the course cohort. If you need access, please contact the person running it.';
const POOL_CAP_MSG   = "Today's shared budget is used up — please come back tomorrow, or contact the person running it.";
const POOL_BUDGET_MSG = 'The shared budget for this run has been used up — please contact the person running it.';
const USER_TURNS_MSG = `You've used today's ${POOL_USER_TURNS} messages — please come back tomorrow.`;
// The adaptive day-share: a small fraction of the pool's REMAINING ₹, generous ceiling, session-sized
// floor — effectively unlimited at healthy budget, shrinking only as the pool actually depletes.
const remainingPoolInr = () => Math.max(0, MAX_BUDGET_INR - poolSpendAllTime() * usdInr());
const effectiveUserDailyInr = () => (USER_DAILY_INR > 0 ? USER_DAILY_INR : (MAX_BUDGET_INR > 0 ? adaptiveUserDailyInr(remainingPoolInr()) : 0));
const userAdaptiveCapReached = (day, userId) => {
  const cap = effectiveUserDailyInr();
  return cap > 0 && poolSpendUser(day, userId) * usdInr() >= cap;
};
const USER_BUDGET_MSG = "You've used your share of today's budget — please come back tomorrow.";
// Per-user LIFETIME cap: distinct from the daily one — this is final, not "come back tomorrow".
const USER_LIFETIME_MSG = "You've used your full share of the shared budget — please contact the person running it.";
// Both attempts came back empty (a provider blip, or a local model that had not warmed up). The turn is
// refused honestly rather than delivered as a blank stone bubble — see lib/guard.mjs.
const EMPTY_MSG = "The interlocutor didn't answer that time — send that again.";
// AI Club path (credit engine). An AI Club student runs on their OWN key, not the pool, so their refusals
// are distinct from the pool caps: the credit exhausted at OpenRouter, the student not yet provisioned,
// their access withdrawn, or the credit service itself being unreachable (an operator-side problem).
const AICLUB_EXHAUSTED_MSG = 'Your AI Club credit is used up. Speak to the person running the studio about topping it up.';
const AICLUB_NOT_REG_MSG   = "Your AI Club account isn't set up yet — please contact the person running the studio.";
const AICLUB_REVOKED_MSG   = 'Your AI Club access has been withdrawn — please contact the person running the studio.';
const AICLUB_SERVICE_MSG   = 'The AI Club credit service is unavailable right now — please try again shortly.';
// Map a credit-engine resolve-failure code → a { code, message } the client can show. ENGINE_AUTH /
// ENGINE_ERROR / ENGINE_UNREACHABLE all read as the same "service unavailable" to the student (the
// distinction is operator-facing and lives in the engine's logs, never in a key-bearing surface).
const aiClubResolveError = (code) => {
  if (code === 'NOT_REGISTERED') return { code: 'AICLUB_NOT_REGISTERED', message: AICLUB_NOT_REG_MSG };
  if (code === 'REVOKED')        return { code: 'AICLUB_REVOKED', message: AICLUB_REVOKED_MSG };
  return { code: 'AICLUB_SERVICE', message: AICLUB_SERVICE_MSG };
};
// Which cohort tier is this signed-in user in? The SINGLE classifier (lib/cohorts.mjs) — the chat path,
// the criticism path, and the status endpoints all ask this, so the tiering never drifts between them.
const tierOf = (email) => tierForUser(email, { personalEnabled, studentsEnabled });
// A generation error is mapped to the AI-Club "credit used up" message when it came from an AI-Club turn
// and OpenRouter refused for want of credit (402 / insufficient). On that path the cached key is dropped
// so a re-issued key is resolved fresh next turn. Otherwise the raw error message passes through as before
// (it never contains key material — streamOpenRouter only echoes the provider's status + body snippet).
function sendGenerationError(send, err, aiClubEmail = null) {
  const msg = String(err?.message || err);
  if (aiClubEmail && /\b402\b|insufficient|quota|credit/i.test(msg)) {
    forgetKey(aiClubEmail);
    send('error', { code: 'AICLUB_CREDIT_EXHAUSTED', message: AICLUB_EXHAUSTED_MSG });
    return;
  }
  send('error', { message: msg });
}
// The rupee budget view shown in the chat header (money used so far / the ceiling). Fields are null
// when their cap is unset, so the front-end shows only what is configured. Rounded to whole rupees.
const poolBudgetView = (day, userId) => ({
  totalInr: MAX_BUDGET_INR || null,
  spentInr: MAX_BUDGET_INR ? Math.round(budgetSpentINR()) : null,
  userDailyInr: effectiveUserDailyInr() ? Math.round(effectiveUserDailyInr()) : null,
  userSpentInr: effectiveUserDailyInr() ? Math.round(poolSpendUser(day, userId) * usdInr() * 100) / 100 : null,
  // Per-user lifetime share (the memorability per-student guarantee). Null when uncapped. This is the
  // most personal figure — "how much of MY share is left" — so the chat header prefers it when set.
  userLifetimeInr: USER_BUDGET_INR || null,
  userLifetimeSpentInr: USER_BUDGET_INR ? Math.round(poolSpendUserAllTime(userId) * usdInr()) : null,
});
// The live pool event payload sent after each metered turn: free turns left + the budget view.
const poolEvent = (userId) => {
  const day = utcDay();
  return { turnsLeft: POOL_USER_TURNS > 0 ? Math.max(0, POOL_USER_TURNS - poolTurnsUser(day, userId)) : null, budget: poolBudgetView(day, userId) };
};

// In-memory corpus index, rebuilt from the markdown corpus at boot.
const corpus = new Database(':memory:');
const nEntries = buildIndex(corpus, join(__dirname, 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, 'corpus', 'method'));
// Criticism surface (zetizeti's second face): base Clean discipline + the critical-register notes.
// Loaded resident on /api/criticise only — NOT globbed into the Socratic prompt.
const criticismCore = methodCore + '\n\n---\n\n' + loadCriticismCore(join(__dirname, 'corpus', 'criticism'));
console.log(`[zetizeti] indexed ${nEntries} domain entries; method core ${methodCore.length} chars; criticism core ${criticismCore.length} chars; pool-only (operator key; BYOK removed)`);

const app = express();
app.use(express.json());

// ---- auth ----
app.get('/auth/google', beginGoogleAuth);
app.get('/auth/google/callback', handleGoogleCallback);
app.get('/auth/guest', beginGuest);          // dev-only (refuses in production)
app.post('/auth/logout', (req, res) => { logout(req, res); res.json({ ok: true }); });

// Sibling AI Club app URLs for the footer strip (AI Club students only). Unset → shown as a label, no link.
const STUDIO = { zetizeti: (process.env.STUDIO_URL_ZETIZETI || '').trim(), mindmaps: (process.env.STUDIO_URL_MINDMAPS || '').trim(), visualgen: (process.env.STUDIO_URL_VISUALGEN || '').trim(), dashboard: (process.env.STUDIO_URL_DASHBOARD || '').trim() };

// Build version — the traceable SemVer build string (e.g. "0.9.0" or "0.9.0+3.g<sha>"), plus the raw
// describe fields for tooling. No auth needed; carries nothing sensitive.
app.get('/api/version', (req, res) => res.json(BUILD));

app.get('/api/config', (req, res) => res.json({
  version: BUILD.build,
  capture: captureEnabled,          // LOCAL build only — true only on a capturing dev instance, drives the on-voice/off-voice UI
  googleConfigured, guestAllowed, poolEnabled,
  poolUserTurns: studentsEnabled ? POOL_USER_TURNS : 0,   // the per-user turn cap is a STUDENTS-tier control
  cohorts: cohortSummary({ personalEnabled, studentsEnabled }),   // which tiers are wired + their sizes (no per-user data)
  studio: STUDIO,
}));

// Credit affordance for the AI Club footer — how many questions the student's own ₹5,000 key affords, ₹ via the
// live rate. AI-CLUB COHORT ONLY (memorability users draw on the pool, not a personal key). Never returns the key.
const QUESTION_USD = Number(process.env.ZETIZETI_QUESTION_USD) || 0.001;   // ~gemini-3.1-flash-lite / question
async function keyStatus(apiKey) {
  const r = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${(apiKey || '').trim()}` } });
  if (!r.ok) throw new Error('OpenRouter ' + r.status);
  const d = (await r.json().catch(() => ({})))?.data || {};
  const num = (v) => (typeof v === 'number' ? v : null);
  return { limit: num(d.limit), remaining: num(d.limit_remaining) };
}
app.get('/api/usage', requireUser, async (req, res) => {
  if (process.env.ZETIZETI_DEMO_USAGE) {
    const rate = usdInr(), remUsd = 32.4, limUsd = 52.6, remainingInr = Math.round(remUsd * rate);
    res.json({ ok: true, demo: true, remainingInr, totalInr: Math.round(limUsd * rate), fraction: remUsd / limUsd, rate: Math.round(rate), questions: Math.floor(remainingInr / (QUESTION_USD * rate)) });
    return;
  }
  if (tierOf(req.user.email) !== TIER.AI_CLUB) { res.json({ ok: false, reason: 'not-ai-club' }); return; }
  const r = await resolveAiClubKey(req.user.email);
  if (!r.ok) { res.json({ ok: false, reason: 'unresolved' }); return; }
  try {
    const s = await keyStatus(r.key), rate = usdInr();
    if (typeof s.remaining === 'number' && typeof s.limit === 'number' && s.limit > 0) {
      const remainingInr = Math.round(s.remaining * rate);
      res.json({ ok: true, remainingInr, totalInr: Math.round(s.limit * rate), fraction: Math.max(0, Math.min(1, s.remaining / s.limit)), rate: Math.round(rate), questions: Math.floor(remainingInr / (QUESTION_USD * rate)) });
    } else res.json({ ok: false, reason: 'no-cap' });
  } catch { res.json({ ok: false, reason: 'unavailable' }); }
});

// Per-user pool status for the chat-header counter: how many free messages this signed-in user has
// left today, whether the day's shared $ ceiling / lifetime ₹ budget is still open, and this user's
// ₹ budget view. Cheap; called on load + after caps. (No day-wide headcount cap — the cohort is
// gated by the ₹ budget and the per-user turn allowance, not by a distinct-users-per-day limit.)
app.get('/api/pool', requireUser, (req, res) => {
  const tier = tierOf(req.user.email);
  // AI Club students don't draw on the pool — their cap is OpenRouter's per-key limit (invisible here).
  // Report the pool as off, tagged with the tier, so the front-end shows no (misleading) free-message counter.
  if (tier === TIER.AI_CLUB) { res.json({ enabled: false, tier, aiClub: true }); return; }
  // POOL_PERSONAL is own-key billing (no ₹ ceiling, no per-user turn cap) → no free-message counter,
  // same as AI Club. Only the STUDENTS tier has a metered turn allowance to report.
  if (tier !== TIER.POOL_STUDENTS) { res.json({ enabled: false, tier }); return; }
  const day = utcDay();
  // The day is "open" when neither the per-day $ cap nor the lifetime ₹ budget is exhausted. Each
  // guard is inert when its env var is unset, so an instance capped only in rupees is read correctly.
  const dayOpen = !dayCapReached(day) && !budgetExhausted();
  res.json({
    enabled: true,
    tier,                                     // 'memorability'
    userTurnsPerDay: POOL_USER_TURNS,
    userTurnsLeft: Math.max(0, POOL_USER_TURNS - poolTurnsUser(day, req.user.id)),
    dayOpen,
    // Budget visibility (₹). Fields are null when the corresponding cap is unset.
    budget: poolBudgetView(day, req.user.id),
  });
});

app.get('/api/me', (req, res) => {
  const u = currentUser(req);
  const pub = publicUser(u);
  res.json({ user: pub ? { ...pub, isAdmin: emailIsAdmin(u.email) } : null });
});

// Gate for everything below: must be signed in.
function requireUser(req, res, next) {
  const u = currentUser(req);
  if (!u) { res.status(401).json({ error: 'not signed in' }); return; }
  req.user = u;
  next();
}
// Admin gate: a signed-in user whose verified Google email is on ZETIZETI_ADMIN_EMAILS.
function requireAdmin(req, res, next) {
  if (!emailIsAdmin(req.user.email)) { res.status(403).json({ error: 'not an admin' }); return; }
  next();
}

// ---- quests / history: REMOVED (ephemeral, 11 Jul 2026) ----
// There is no server-side quest, message, resume, fork, or progress-trajectory persistence any more.
// An enquiry lives only in the browser tab; the client holds its own transcript and sends it with each
// /api/chat turn. Nothing to list, open, rename, or fork on the server. The old /api/quests* routes
// (list, create, fork, rename, resume-hydration) are gone with the history view they fed.

// ---- admin usage monitor (operator only) — read-only view of pool usage across all users ----
// Per-user turns + real billed spend (USD ledger → ₹ at the live usdInr() rate) + days active + last active, plus
// the instance total against the configured ₹ ceiling. No writes, no per-user content — just the
// usage figures the operator needs to watch a cohort's spend. Gated on requireAdmin (ZETIZETI_ADMIN_EMAILS).
app.get('/api/admin/usage', requireUser, requireAdmin, (req, res) => {
  const users = usageByUser().map((r) => ({
    email: r.email || '—',
    name: r.name || '',
    turns: r.turns,
    spentInr: Math.round((r.usd || 0) * usdInr()),
    daysActive: r.daysActive,
    lastDay: r.lastDay,
    pool: r.pool === 1,   // true = shared students pool key; false = personal/own key
  }));
  // personalInr is the personal-key spend total — shown apart from the pool figure, which stays the ₹
  // ceiling meter (budgetSpentINR() is pool = 1 only).
  const personalInr = Math.round(users.filter((u) => !u.pool).reduce((s, u) => s + u.spentInr, 0));
  res.json({
    users,
    userCount: users.length,
    totalInr: Math.round(budgetSpentINR()),
    personalInr,
    maxBudgetInr: MAX_BUDGET_INR || null,
    usdInr: usdInr(),
    // How hard the never-answer guard is working, per surface, since this process started. Counts only —
    // no content (invariant #8). `regenerated` = the guard rejected a question and made the model ask
    // again; `flagged` = it broke the rule twice and the least-bad was delivered, marked, to the student.
    guard: guardStats,
    // Felt-shift health — counts + the last compute's latency; no content (invariant #8). `neural`
    // says whether the embedding backend is live (false = felt off entirely, the app unaffected).
    felt: { ...feltStats, neural: neuralReady },
    // THE SURVIVAL CURVE (30 Jul 2026) — the answer to "did they stay", which no instrument here could
    // give before. `reached` is how many turns got to that depth; `leftHere` is the drop to the next one,
    // i.e. how many conversations ended on that question. Counts only: no user, no session, no content —
    // strictly more private than the per-user ledger above it. `byVersion` is what makes it a measurement
    // rather than a number: a release that loses people one turn earlier is visible here and nowhere else.
    depth: {
      enquiry:   { summary: turnDepthSummary({ surface: 'enquiry' }),   curve: turnDepthCurve({ surface: 'enquiry' }) },
      criticism: { summary: turnDepthSummary({ surface: 'criticism' }), curve: turnDepthCurve({ surface: 'criticism' }) },
      byVersion: {
        enquiry:   turnDepthVersions('enquiry').map((v) => ({ ...v, ...turnDepthSummary({ surface: 'enquiry',   version: v.version }) })),
        criticism: turnDepthVersions('criticism').map((v) => ({ ...v, ...turnDepthSummary({ surface: 'criticism', version: v.version }) })),
      },
    },
  });
});

// ---- felt-shift for one turn (v0.10.0) — the event detector over the learner's own words
// (lib/feltshift.mjs), WATCH-SIDE + posture-steering only. Gated on the neural backend: the
// deterministic fallback's geometry was proven inadequate for this measure (it ordered a related pair
// below an unrelated one), so with no model there is NO felt — never a degraded felt. Any failure
// returns null and the turn proceeds exactly as before the feature existed. Stateless like the route
// itself: rebuilt per turn from the client-held transcript; embeds are memoised globally, so only
// genuinely new strings cost inference (~tens of ms warm). The stone's turns enter the covered ground
// but are never scored (an echo of the stone is not the learner shifting).
async function feltForTurn({ goal, history, message }) {
  if (!neuralReady) { feltStats.skipped++; return null; }
  try {
    const t0 = Date.now();
    const itemsOf = async (text) => {
      const out = [];
      for (const w of itemWords(text)) out.push({ w, embed: await embedNeural(w) });
      return out;
    };
    const goalEmbed = goal ? await embedNeural(goal) : null;
    const goalItems = goal ? await itemsOf(goal) : [];
    const sequence = [];
    for (const h of history) {
      const text = String(h.content || '');
      sequence.push({ score: h.role === 'student', text, embed: await embedNeural(text), items: await itemsOf(text) });
    }
    sequence.push({ score: true, text: message, embed: await embedNeural(message), items: await itemsOf(message) });
    const read = readFeltShifts({ goalEmbed, goalItems, sequence });
    const fs = read.turns[read.turns.length - 1] || null;
    // v0.10.2 — the semantic freshness series, read off THIS pass (no extra embedding, no extra
    // latency): per-turn mean item novelty, which is the level at which circling separates from
    // sharpening. Whole-utterance similarity was measured and does not separate them (lib/novelty.mjs).
    if (fs) fs.semFresh = semanticFreshness(read.turns);
    feltStats.computed++;
    feltStats.msLast = Date.now() - t0;
    if (fs && fs.semEvent) feltStats.sem++;
    if (fs && fs.lexEvent) feltStats.lex++;
    console.log(`[felt] ${feltStats.msLast}ms · seq=${sequence.length}${fs && fs.semEvent ? ' · SEM' : ''}${fs && fs.lexEvent ? ' · LEX' : ''}`);   // timing only — no content (invariant #8)
    return fs;
  } catch {
    feltStats.skipped++;
    return null;
  }
}

// ---- chat (SSE) — STATELESS / EPHEMERAL. The browser holds the enquiry and sends its whole transcript
// (history[]) each turn; the server composes a question from it and persists NOTHING (no quest, no
// message, no signal row). `turnsSinceNudge` is carried in the body too — the client tracks it from the
// nudge events it has received, so the refractory rule needs no stored trajectory. Only pool spend
// (turn counts + billed cost, no content) is written, for the caps + admin monitor.
// Body: { message, history[], goal, kind:'goal'|'redraw'|'turn', honed, exchanges, lineage[], turnsSinceNudge }
app.post('/api/chat', requireUser, async (req, res) => {
  const {
    message = '', history = [], goal = '', kind = 'turn',
    honed = 0, exchanges = 0, lineage = [], discipline = 'all', turnsSinceNudge = 99,
  } = req.body || {};

  const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);

  // watch — deterministic, code-owned signals describing how the INQUIRY is moving (never a score).
  // Both parties' turns are read: studentTurns drive the learner-side signals; stoneTurns let us see the
  // interlocutor repeating ITSELF (selfEcho) — the "same question loop" the learner feels but which the
  // learner-side signals cannot see. (Stateless: the client sends the whole transcript each turn.)
  const studentTurns = [...history.filter((h) => h.role === 'student').map((h) => h.content), message];
  const stoneTurns = history.filter((h) => h.role !== 'student').map((h) => h.content);
  // The felt-shift read for THIS turn (null unless the neural backend is live and an event structure
  // computes cleanly). Costs ~tens of ms warm (memoised embeds); sits before the SSE stream opens so
  // the signals event below can carry the reading.
  const fs = await feltForTurn({ goal, history, message });
  // Signals AFTER the felt pass, so `advancement` can be refined by the semantic channel it produces.
  const sig = computeSignals({ goal, lineage, studentTurns, stoneTurns, exchanges });

  // Retrieval, tuned against BLANDNESS (Siddhi, 15 Jul: "questions become bland / round-and-round as we
  // move forward") — the tail flattens when the SAME top tensions are retrieved turn after turn. Two
  // invariant-#1-safe fixes (still exact-word FTS, only recency + more literal text — never semantics):
  //   (a) ROLLING WINDOW — key retrieval on the last ~2 learner turns + this message (message weighted
  //       twice), so grounding stays rich even when the latest reply is short/abstract and would otherwise
  //       collapse onto the stable goal terms alone (the staleness driver).
  //   (b) ROTATE BY DEFAULT — always drop the tensions the PREVIOUS turn served (not only when a loop is
  //       detected), so each turn is pushed onto fresh ground. Graceful cycle-back: if rotation starves
  //       this turn (small corpus, everything excluded), retry without the exclusion so it degrades to
  //       "rotate", never "empty".
  //   (c) WIDER EXCLUSION (27 Jul 2026) — drop what the last THREE turns served, not just the previous
  //       one. With a discipline selected a student draws on a few dozen entries at three per turn, so
  //       across a twenty-turn arc a one-turn exclusion lets the same tensions return every other turn:
  //       the aims rotate while the grounding underneath them repeats. Still degrades to "rotate" via
  //       the cycle-back below, never to "empty".
  const prev = studentTurns[studentTurns.length - 2] || '';
  const windowText = [prev, message, message].join(' ').trim() || message;
  const recentWindows = [
    [studentTurns[studentTurns.length - 3] || '', prev, prev].join(' ').trim() || prev,
    studentTurns[studentTurns.length - 4] || '',
  ].filter(Boolean);
  const excludeIds = studentTurns.length >= 2
    ? [...new Set(recentWindows.flatMap((w) =>
        retrieve(corpus, w, { limit: 3, extraTerms: goalTerms, discipline }).map((r) => r.id)))]
    : [];
  let retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms, discipline, excludeIds });
  if (!retrieved.length && excludeIds.length) {   // cycle-back: rotation emptied the results → re-include
    retrieved = retrieve(corpus, windowText, { limit: 3, extraTerms: goalTerms, discipline });
  }
  const curtain = retrieved.map((r) => ({ id: r.id, snippet: r.snippet, sources: r.sources, provenance: r.provenance }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Curtain + signals stream regardless of key — even a keyless visitor sees the tensions + the edge.
  // feltEvent/feltWhy are ADDITIVE fields on the existing signals event (the SSE contract's shape is
  // extended, never changed): an observation about the ARTICULATION for the watch-side readout — never
  // a score, never rendered as one (invariants #5/#6).
  send('curtain', { retrieved: curtain });
  send('signals', { ...sig, feltEvent: fs && fs.semEvent ? 'sem' : fs && fs.lexEvent ? 'lex' : null, feltWhy: (fs && fs.why) || null });

  // --- key resolution, by cohort tier (lib/cohorts.mjs — the single classifier):
  //   AI_CLUB      — resolve THIS student's OWN OpenRouter key from the credit engine (app #1) and spend
  //     against their own ~₹5,000 credit (shared across all AI Club apps at OpenRouter). usingPool stays
  //     false: no pool allowlist, no ₹ caps, no pool metering — their cap is OpenRouter's per-key limit.
  //     The key is held only for this request (the engine client caches it in memory, never persisted/logged).
  //   MEMORABILITY — the 87-student shared pool key, gated by the hard caps in priority order. There is
  //     NO user-supplied key (BYOK removed); a refused turn ends with a clear message. Never logged/echoed.
  //   NONE         — signed in but in neither cohort → refused (NO_ACCESS when a pool exists to be gated,
  //     NO_POOL when no pool is configured at all).
  // meter = record this turn's spend in the pool_spend ledger; poolFlag = 1 counts it against the shared
  // ₹ ceiling, 0 records it as personal (monitor only). usingPool stays the "shared students pool" marker
  // that gates the caps + the budget-header event.
  let apiKey = null, usingPool = false, aiClubEmail = null, meter = false, poolFlag = 1;
  const tier = tierOf(req.user.email);
  if (tier === TIER.AI_CLUB) {
    const r = await resolveAiClubKey(req.user.email);
    if (!r.ok) { send('error', aiClubResolveError(r.code)); return res.end(); }
    apiKey = r.key; aiClubEmail = req.user.email;            // usingPool = false — their own credit, metered at OpenRouter
  } else if (tier === TIER.POOL_PERSONAL) {
    // Operator's own key — own-key billing: no ₹ ceiling, no per-user caps (usingPool stays false). But we
    // DO meter it (poolFlag = 0) so personal usage shows in the admin monitor, kept apart from the shared
    // pool so it never eats the students' ₹ budget.
    apiKey = POOL_KEY; meter = true; poolFlag = 0;
  } else if (tier === TIER.POOL_STUDENTS) {
    const day = utcDay();
    // 0. Total budget ceiling (₹) across the whole run — applies to everyone, does not reset with the day.
    if (budgetExhausted()) {
      send('error', { code: 'POOL_BUDGET_CAP', message: POOL_BUDGET_MSG });
      return res.end();
    }
    // 1. Day-wide $ ceiling — applies to everyone, including users already counted today.
    if (dayCapReached(day)) {
      send('error', { code: 'POOL_CAP', message: POOL_CAP_MSG });
      return res.end();
    }
    const userTurnsToday = poolTurnsUser(day, req.user.id);
    // 2. Per-user LIFETIME ₹ share — this student's hard slice of the shared pool across the whole run.
    if (userBudgetExhausted(req.user.id)) {
      send('error', { code: 'POOL_USER_LIFETIME_CAP', message: USER_LIFETIME_MSG });
      return res.end();
    }
    // 3. Per-user daily ₹ share — explicit (ZETIZETI_USER_DAILY_INR) or ADAPTIVE from the pool's
    //    remaining budget. This replaced the fixed turn count as the operative day control (29 Jul).
    if (userAdaptiveCapReached(day, req.user.id)) {
      send('error', { code: 'POOL_USER_BUDGET_CAP', message: USER_BUDGET_MSG });
      return res.end();
    }
    // 4. Per-user daily turn count — DISABLED unless a self-hoster sets it explicitly.
    if (POOL_USER_TURNS > 0 && userTurnsToday >= POOL_USER_TURNS) {
      send('error', { code: 'POOL_USER_CAP', message: USER_TURNS_MSG });
      return res.end();
    }
    apiKey = POOL_KEY_ORG; usingPool = true; meter = true; poolFlag = 1;   // the ORG key, metered against the ₹ ceiling
  } else {
    send('error', poolEnabled ? { code: 'NO_ACCESS', message: NO_ACCESS_MSG } : { code: 'NO_POOL', message: NO_POOL_MSG });
    return res.end();
  }

  // A usable key exists, so we commit to the turn. Nothing is persisted — the enquiry lives only in the
  // client. The nudge refractory uses the client-supplied turnsSinceNudge (no stored trajectory).
  // warmth: true — promoted above the refractory (lib/nudge.mjs). Measured 29 Jul across 1,938
  // question→reply pairs as the only element that moves BOTH axes the same way: +14 points of reply
  // length against that conversation's own baseline, refusals 10% against 23%, and it holds when
  // matched on turns where the learner was already warm (so it is a lever, not a selection effect).
  // At variant level it recovers 9 of the 13 engrossment points the meaning machinery costs, for 7 of
  // its 22 arc points — by a distance the cheapest trade available.
  // lastMaterial — the substantive weight of THIS reply (content words minus hedges), for warmth's
  // development route: an analytical learner who narrates no insight but keeps handing over dense
  // material is developing, and the lexicon route cannot see them (measured 29 Jul: movement 0.00
  // across a real 24-turn session; warmth fired zero times).
  const lastMaterial = contentWords(message).length;
  const nudge = decideNudge(sig, {
    exchanges, reDrewThisTurn: kind === 'redraw', turnsSinceNudge, lastMaterial,
  }, { warmth: true });
  // Felt-shift postures OUTRANK the cadence-driven nudges: an event is exactly when to respond (the
  // same standing the selfEcho break has). When one fires, the nudge's surface is suppressed too — a
  // "we've circled, shall we move?" line would contradict a landing the detector just marked.
  const felt = feltPosture(fs);            // (event counts were already taken in feltForTurn)
  // ── THE FLOW TURN (28 Jul 2026, branch fix-enquiry-flow) — replaces the aim block ────────────────
  // The aim block is NO LONGER INJECTED. Measured on the student's real 41 replies of 28 July (the session
  // that prompted this: "it was just circling back the question and something some bs"), the arc did
  // everything it was designed to do — all ten aims reached, both movements traversed, lap 2 — and the
  // questions still asked him to name the one particular sound ten times out of forty. The aim arrives
  // as a DIRECTION and the shape as a GRAMMAR, and neither displaces the move just made, so every aim
  // executed faithfully in his own vocabulary produced another question about a sound at a threshold.
  // Removing it and adding the two readers below took interrogation-shaped questions from 32% to 7-17%
  // and questions that take up what the learner just said from 41% to 82-90%. Full record, every run:
  // docs/ops/flow-probe-log.md. `readArc` stays exported and tested — it is the honest record of the
  // 27 July attempt, and the dwell reader is built from the same material — but it no longer steers.
  //
  // What DID survive the measurement is the FORM rotation: stripping it did not make the stone
  // friendlier, it made it ask "are you X, or are you Y?" on 61% of turns and let questions balloon to
  // 38 words. The rotation now runs on FLOW_SHAPES, which is FORM_SHAPES with its fourth shape — "ask
  // for a particular: a thing, a moment, a person, a number" — replaced. That shape contradicted the
  // method core's own section "Never require the precise word", and it was the measurable source of the
  // browbeating.
  const dwellRead = readDwell({ studentTurns, stoneTurns, goal });
  const featureInvite = !!(dwellRead && dwellRead.invite);
  const dwell = featureInvite ? null : dwellRead;
  // The learner has declined this question. Outranks everything: nothing is built on words that carry no
  // content, and the next question changes footing to material they themselves supplied earlier.
  const declined = isDecline(message) ? { anchorText: lastSubstantive([...studentTurns]) } : null;
  // The learner corrected a reading ("that's not what i meant", "you asked that twice") — Jung's
  // disturbed-reproduction indicator, worn protectively: their correction is authoritative, so the
  // steering that would press on is suppressed and the next question takes up what they re-stated.
  const corrected = !declined && isCorrection(message);
  // WIDENING BY ASSOCIATIVE VALUE (lib/assoc.mjs) — join two things the learner said at different times
  // and has never been asked about together. Measured 28 Jul as the best single addition of the day:
  // dry replies 30%→17%, uptake 83%→95%, and the only configuration whose student writes MORE as the
  // conversation goes on. Internal only; the external flavour (model-proposed neighbours) measured worse
  // on every meaning column and is not wired.
  // selector 'open' — the measured synthesis (flow-probe round 4, 28 Jul): generous recurrence-valued
  // joining (the charge-as-targeting selector maximised the meaning-arc but bounced ~30% of its joins
  // on three successive runs — charged material is resistant material) behind the protective gates:
  // corrections never quoted, refusals quotable only when they name the blockage, hedge words never
  // material. Jung as tact, Cummings as manner, the join itself generous.
  const assoc = (declined || corrected) ? null : readAssociation({ studentTurns, stoneTurns, selector: 'open' });
  // OPENER BAN — the question may not open with the word either of the last two questions opened with
  // (proactive here; enforced in the guard). 22 of 24 questions in a real session opened "When…" while
  // every sameness metric read clean.
  const banOpeners = [...new Set(stoneTurns.slice(-2).map((q) => questionOpener(q)).filter(Boolean))];
  // PRECISION CAPACITY — pointed asks ("which one?", "what exactly?") only for a learner whose recent
  // replies show particulars ready to give: median material of the last three replies ≥ 10 content
  // words and no refusal in the last two. Two real students, opposite needs; the register follows the
  // session's own evidence.
  const recent = studentTurns.slice(-3).map((t) => contentWords(t).length).sort((a, b) => a - b);
  const precision = recent.length >= 2
    && recent[Math.floor(recent.length / 2)] >= 10
    && !studentTurns.slice(-2).some((t) => isDecline(t));
  const earlierWords = new Set(studentTurns.slice(0, -1).flatMap((t) => contentWords(t)));
  const newMaterial = [...new Set(contentWords(message))].filter((w) => !earlierWords.has(w)).slice(0, 4);
  // Tell the client a posture fired even when there is nothing to SHOW. The refractory lives in the
  // client (the service is stateless — it sends `turnsSinceNudge` back each turn), and it used to reset
  // only on a nudge that carried a `surface` line. Most postures carry none, so the refractory was dead
  // for all of them: whichever silent branch matched fired every single turn. That went unnoticed while
  // the self-echo branch stood at the top of the policy returning first; removing it exposed the fault —
  // `acknowledge` reached a learner on 15 turns of 20. The event is now sent whenever a posture fires,
  // with `surface` null when there is nothing to display. (No content, invariant #8: a branch name only.)
  if (!felt && nudge.fired) send('nudge', { surface: nudge.surface || null, fired: nudge.fired });
  // the posture steers the QUESTION's mode; the model receives the posture, never the diagnosis.
  // Stable system (cacheable prefix) + per-turn volatile material on the final turn. Keeping the
  // retrieved tensions and posture OUT of the system prompt is what lets prompt caching reuse the prefix
  // (cache: true below); only the live final turn is wrapped with this turn's domain material.
  const system = buildSystemPrompt(methodCore, goal);
  const turnContent = buildTurnContext({
    retrieved,
    posture: (felt && felt.posture) || nudge.posture || '',
    shape: formShape(exchanges, { flow: true }),
    dwell,
    newMaterial: newMaterial.length ? newMaterial : null,
    declined,
    corrected,
    assoc: assoc ? associationBlock(assoc) : '',
    banOpeners,
    precision,
    featureInvite,
    message,
  });

  const messages = [
    ...history.map((h) => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: turnContent },
  ];

  // Metered paths (shared pool AND the personal key) capture usage during the stream, then count the turn
  // ONCE on success (so the counter is exact even if OpenRouter omits the cost figure). AI-club keys are
  // billed at OpenRouter against the student's own credit, so they are not metered here.
  // Cost accumulates ACROSS attempts: a guard-rejected generation was still billed, so summing (rather
  // than overwriting) keeps the ₹ ceiling honest when the guard has to make the model ask again.
  let poolCost = 0;
  const onUsage = meter ? (u) => { poolCost += usageCost(u); } : null;
  try {
    // BUFFERED + GUARDED (invariant #3 — the guard now HOLDS rather than merely reporting). The question
    // is generated in full, checked by validateOutput, and regenerated ONCE with the guard's own reasons
    // if it breaches; only an accepted question is sent. It is deliberately NOT streamed token by token
    // any more: a question cannot be withheld after the student has read it, which is exactly why the
    // guard was inert until 24 Jul 2026. maxTokens 150 keeps one short question a beat, not a wait.
    // cache: true — reuse the stable prefix (system + prior history) at ~1/10th input price. reasoning
    // off — gemini-lite defaults to a thinking budget; zetizeti is a thin composer.
    const guarded = await generateGuarded({
      // avoid: the repeat gate (round 4) — a question sharing a five-word frame with an earlier one is
      // withheld and repaired (quoted learner text stripped first). Detection at the only place a repeat
      // can actually be withheld: the guard.
      validate: (t) => validateOutput(t, {
        avoid: stoneTurns,
        banOpeners,
        noBinary: true,
        // noClosed — a question answerable "yes" is withheld and re-asked open (30 Jul 2026: three of
        // ten in a real session, and both of its thin replies followed one).
        noClosed: true,
        // ownWords — the warmth clause may only say back words the learner used. Their whole transcript
        // is the licence, so a clause reaching back to turn 2 still passes; only material that is
        // nowhere in their own words counts as the tool's own reading.
        ownWords: new Set([...studentTurns, message].flatMap((t) => contentWords(t))),
        mustHold: assoc ? {
          a: [...new Set(contentWords(assoc.earlyText))].slice(0, 8),
          b: [...new Set(contentWords(assoc.liveText))].slice(0, 8),
        } : null,
      }),
      generate: (correction) => streamQuestion({
        system,
        // On a repair attempt the rejected question and the correction are appended as a normal turn pair,
        // so the model sees what it did and what the rule is. Neither reaches the student.
        messages: (correction && correction.previous)
          ? [...messages, { role: 'assistant', content: correction.previous }, { role: 'user', content: correction.instruction }]
          : messages,
        cache: true, maxTokens: 150, reasoning: { enabled: false },
        onToken: () => {},                       // buffered — nothing reaches the student until it passes
        apiKey, onUsage,
      }),
    });
    noteGuard('enquiry', guarded);
    const full = guarded.text;
    // Both attempts empty (provider blip / cold local model) — refuse honestly rather than deliver a blank.
    if (!full.trim()) {
      if (meter) addPoolSpend(utcDay(), req.user.id, poolCost, poolFlag);    // it still cost money
      send('error', { code: 'EMPTY_GENERATION', message: EMPTY_MSG });
      return res.end();
    }
    send('token', { t: full });                  // the ACCEPTED question, delivered whole
    send('validation', { ...guarded.check, attempts: guarded.attempts, regenerated: guarded.regenerated });
    // LOCAL, operator-only capture (no-op in production and unless ZETIZETI_CAPTURE_DIR is set) — the
    // situation → the question, so a chat can be replayed by the 2.0 "sounds-like-Prayas" harness. The
    // returned id lets the local UI attach an on-voice/off-voice label to this exact question. The guard's
    // work is captured too (a repaired question is a different kind of specimen from a first-pass one).
    const capId = capture({ mode: 'enquiry', chatKey: studentTurns[0] || goal, goal, discipline, turn: exchanges, student: message, retrieved: retrieved.map((r) => r.id), posture: nudge.posture || null, fired: nudge.fired || null, dwell: featureInvite ? 'INVITE' : dwell ? `${dwell.anchor}×${dwell.returns}` : null, joined: assoc ? assoc.distance : null, declined: !!declined, corrected, newMaterial: newMaterial.slice(0, 3), shape: exchanges % 4, // SHADOW: what the semantic channel read, and what `advancement` WOULD have become had it steered.
      // Logged side by side so the comparison the todo doc asks for can be made on real transcripts
      // before anything is wired again. Local capture only — never in production (capture.mjs).
      sem: fs && fs.semFresh ? +fs.semFresh[fs.semFresh.length - 1].toFixed(3) : null,
      advancement: +sig.advancement.toFixed(3),
      advancementIfWired: +refineFresh(sig.advancement, fs && fs.semFresh, studentTurns.length - 1).toFixed(3), question: full, guard: guarded.check.ok, attempts: guarded.attempts, rejected: guarded.rejected });
    if (capId) send('capture', { id: capId });
    // THE SURVIVAL CURVE. Recorded here and only here: a turn that was actually DELIVERED. The depth is
    // read off the transcript the browser already sends, so no session identifier is needed or created —
    // `studentTurns.length` IS how deep this conversation is. A refused turn (no access, cap, empty
    // generation) never reaches this line, which matters: counting refusals would inflate precisely the
    // depth where people leave, and make the tool look like it lost them when the budget did.
    noteTurnDepth({ day: utcDay(), surface: 'enquiry', version: BUILD.version, depth: studentTurns.length });
    // Nothing of the conversation persisted — the client keeps the turn in its own transcript.
    if (meter) {
      addPoolSpend(utcDay(), req.user.id, poolCost, poolFlag);   // count this turn + its real cost, all attempts (poolFlag: 1 shared, 0 personal)
      if (usingPool) send('pool', poolEvent(req.user.id));       // budget-header event only for the shared pool
    }
    send('done', {});
  } catch (err) {
    sendGenerationError(send, err, aiClubEmail);
  }
  res.end();
});

// ---- criticism surface (SSE) — zetizeti's second face. EPHEMERAL (11 Jul 2026): a critique now lives
// only in the browser tab, exactly like the Socratic chat. Nothing is saved — no stored pasted text, no
// sensed reading, no questions, no list, no resume. "Never aggregated" is now trivially true: there is
// no record at all to aggregate. Pool spend is still metered (turn counts + cost, no content). The
// pasted text lives in req.body and is NEVER logged (invariant #8). Two stateless endpoints:
// POST /open (paste → reading + first question) and POST /turn (client sends artefact + transcript → next question).
// describeLocated now lives in lib/dialogue.mjs and is IMPORTED — see the note there. It was
// duplicated in scripts/audit-criticism.mjs and the two drifted (11 Aug 2026).

const sseHeaders = (res) => { res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); };
const goalTermsOf = (g) => (String(g || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);

// Key resolution for the criticism SSE endpoints: the SAME tier switch as /api/chat (lib/cohorts.mjs).
// AI_CLUB → own credit-engine key (usingPool=false); POOL_PERSONAL → the operator key, own-key billing
// (usingPool=false, no caps); POOL_STUDENTS → the ORG key behind the hard caps; NONE → refused. Returns
// {apiKey, usingPool} or sends a clear error event, ends the response, and returns null. Async, so
// callers must await. (function declaration → hoisted.)
async function resolveKeyForCriticism(req, res, send) {
  const tier = tierOf(req.user.email);
  if (tier === TIER.AI_CLUB) {
    const r = await resolveAiClubKey(req.user.email);
    if (!r.ok) { send('error', aiClubResolveError(r.code)); res.end(); return null; }
    return { apiKey: r.key, usingPool: false, meter: false, poolFlag: 0 };  // their own credit, metered at OpenRouter
  }
  if (tier === TIER.POOL_PERSONAL) {
    return { apiKey: POOL_KEY, usingPool: false, meter: true, poolFlag: 0 };  // operator key — own-key billing, no caps; metered for the monitor only
  }
  if (tier !== TIER.POOL_STUDENTS) {
    send('error', poolEnabled ? { code: 'NO_ACCESS', message: NO_ACCESS_MSG } : { code: 'NO_POOL', message: NO_POOL_MSG });
    res.end(); return null;
  }
  const day = utcDay();
  if (budgetExhausted()) { send('error', { code: 'POOL_BUDGET_CAP', message: POOL_BUDGET_MSG }); res.end(); return null; }
  if (dayCapReached(day)) { send('error', { code: 'POOL_CAP', message: POOL_CAP_MSG }); res.end(); return null; }
  const ut = poolTurnsUser(day, req.user.id);
  if (userBudgetExhausted(req.user.id)) { send('error', { code: 'POOL_USER_LIFETIME_CAP', message: USER_LIFETIME_MSG }); res.end(); return null; }
  if (userDayCapReached(day, req.user.id)) { send('error', { code: 'POOL_USER_BUDGET_CAP', message: USER_BUDGET_MSG }); res.end(); return null; }
  // 🔴 `POOL_USER_TURNS > 0` is NOT optional — the cap is DISABLED at 0, not set to zero. Without it
  // `ut >= 0` is true on a student's very first turn, so this refused the ENTIRE students cohort with
  // "You've used today's 0 messages — please come back tomorrow." Live from 29 July 2026, when the
  // adaptive ₹ allowance replaced the fixed turn count and prod flipped the var to 0: the enquiry path
  // (line ~549) got the guard, this one — the CRITICISM path — did not. Thirteen days, whole cohort,
  // and invisible because the operator sits on POOL_PERSONAL, which returns above this line.
  if (POOL_USER_TURNS > 0 && ut >= POOL_USER_TURNS) { send('error', { code: 'POOL_USER_CAP', message: USER_TURNS_MSG }); res.end(); return null; }
  return { apiKey: POOL_KEY_ORG, usingPool: true, meter: true, poolFlag: 1 };   // the ORG key, metered against the ₹ ceiling
}

// Compose + stream ONE criticism question, guard it (verdict-drift, EVERY turn), and report its cost.
// Shared by open + turn. Anchored to the artefact on every turn. Persists NOTHING — the client holds the
// artefact, the reading, and the running transcript, and sends them back each turn.
async function askCriticismQuestion({ send, apiKey, meter, artefact, forcedLocated = null, discipline, goal, priorMessages, studentTurn }) {
  // Anti-sameness on the criticism surface (Siddhi, 16 Jul: it "constantly framing 'is this a property
  // or a verdict' to whatever answer I give"). This is the SAME machinery the enquiry path got on 13 Jul
  // and which this surface never had: watch the stone repeating ITSELF (selfEcho over its own prior
  // questions), ROTATE the line of questioning (the pointer — verdict/blur is one aim among several), and
  // de-correlate retrieval when it circles.
  const stoneTurns = priorMessages.filter((m) => m.role === 'stone').map((m) => m.content);
  const selfEcho = computeSignals({ stoneTurns }).selfEcho;
  // forcedLocated = the sensed blur on /open, or a spot the student explicitly clicked → the 'blur' line.
  // Otherwise rotate through the pointer set (~3 questions each), advancing early if the stone is circling.
  let pointer, located;
  if (forcedLocated && forcedLocated.text) { pointer = CRITICISM_POINTERS[0]; located = forcedLocated; }
  else { pointer = pickCriticismPointer({ stoneCount: stoneTurns.length, selfEcho }); located = null; }
  const probe = (located && located.text) ? located.text : (studentTurn || artefact);
  // rotate retrieval off the previous turn's tensions when it's circling (recency filter, invariant #1 safe).
  const prevStudent = [...priorMessages].reverse().find((m) => m.role !== 'stone')?.content || '';
  const excludeIds = (selfEcho >= 0.5 && prevStudent)
    ? retrieve(corpus, prevStudent, { limit: 3, extraTerms: goalTermsOf(goal), discipline }).map((r) => r.id)
    : [];
  let retrieved = retrieve(corpus, probe, { limit: 3, extraTerms: goalTermsOf(goal), discipline, excludeIds });
  if (!retrieved.length && excludeIds.length) retrieved = retrieve(corpus, probe, { limit: 3, extraTerms: goalTermsOf(goal), discipline });
  const system = buildCriticismSystemPrompt(criticismCore, { artefact, located, posture: pointer.aim, retrieved, goal });
  const messages = [
    ...priorMessages.map((m) => ({ role: m.role === 'stone' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: studentTurn || (located ? `Point me at this spot: "${located.text}"` : '(continue questioning the text)') },
  ];
  // BUFFERED + GUARDED, exactly as the enquiry path (invariant #3's sibling). This surface needed it
  // most: until 24 Jul 2026 the verdict-drift guard ran every turn and the client assigned its result to
  // a variable it never read — a drifted verdict about the text reached the student with nothing to stop
  // it and nothing to show it. Now a breach is repaired once, and a surviving breach is surfaced.
  // Cost sums across attempts so a repaired turn is metered honestly.
  let qCost = 0;
  const guarded = await generateGuarded({
    mode: 'criticism',
    validate: validateCriticismOutput,                       // verdict-drift guard EVERY turn
    generate: (correction) => streamQuestion({
      system,
      messages: (correction && correction.previous)
        ? [...messages, { role: 'assistant', content: correction.previous }, { role: 'user', content: correction.instruction }]
        : messages,
      onToken: () => {},                                     // buffered — a verdict cannot be unread
      onUsage: meter ? (u) => { qCost += usageCost(u); } : null,
      // reasoning off — same cheap default model as the dialogue path; don't burn a thinking budget.
      // (No cache: the criticism prefix carries the per-critique artefact + located span, so it isn't stable across turns.)
      maxTokens: 400, temperature: 0.3, reasoning: { enabled: false }, apiKey,
    }),
  });
  noteGuard('criticism', guarded);
  const full = guarded.text;
  if (!full.trim()) { send('error', { code: 'EMPTY_GENERATION', message: EMPTY_MSG }); return { qCost, empty: true }; }
  send('token', { t: full });                                // the ACCEPTED question, delivered whole
  send('validation', { ...guarded.check, attempts: guarded.attempts, regenerated: guarded.regenerated });
  // LOCAL, operator-only capture (no-op in production and unless ZETIZETI_CAPTURE_DIR is set).
  const capId = capture({ mode: 'criticism', chatKey: artefact, goal, discipline, turn: stoneTurns.length, artefact, student: studentTurn || null, pointer: pointer.key, located: located ? located.text : null, retrieved: retrieved.map((r) => r.id), question: full, guard: guarded.check.ok, attempts: guarded.attempts, rejected: guarded.rejected });
  if (capId) send('capture', { id: capId });
  return { qCost };                                          // nothing persisted server-side; client keeps the turn
}

// POST /api/criticism/open — STATELESS. Paste a text → qualify → locate → ask the first question about
// the top blur. Persists NOTHING: the reading + artefact are streamed back to the client, which holds
// them (in the tab, ephemeral) and sends them with each follow-up turn. The pasted text lives in
// req.body and is NEVER logged (invariant #8). SSE.
app.post('/api/criticism/open', requireUser, async (req, res) => {
  const b = req.body || {};                                  // NEVER logged
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const goal = typeof b.goal === 'string' ? b.goal : '';
  const discipline = typeof b.discipline === 'string' ? b.discipline : 'all';
  if (!text) { res.status(400).json({ error: 'Paste an AI text to question.' }); return; }
  if (text.length > 8000) { res.status(413).json({ error: 'That text is long — paste a passage (up to ~8000 characters) to question.' }); return; }
  sseHeaders(res);
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const key = await resolveKeyForCriticism(req, res, send); if (!key) return;
  try {
    // DETERMINISTIC qualify + locate — NO LLM in the locating path (lib/qualify.mjs → lib/sensed.mjs).
    // Reproducible (same text → same blurs), inspectable (each segment carries a `why`), and it
    // cannot fail to parse or return malformed output — the reliability win over the old LLM pass.
    const segments = qualify(text).segments;
    const reading = readSensed({ segments: toCanonSegments(segments) });  // map 'text'→canon 'ai' at the compute boundary
    const readingPayload = {
      segments: segments.map((s) => ({ id: s.id, text: s.text, sdc_stage: s.sdc_stage, judgement_held_by: s.judgement_held_by, why: s.why })),
      strict: reading.strict, balanced: reading.balanced, generous: reading.generous, note: reading.note,
    };
    send('reading', readingPayload);                         // sensed reading behind the curtain (client keeps it)
    const ids = reading.strict.conflation_segment_ids || [];
    let located = null;
    if (ids.length) { const chosen = segments.find((s) => s.id === ids[0]) || segments[ids[0]]; if (chosen) located = { text: chosen.text, why: describeLocated(chosen), stage: chosen.sdc_stage, heldBy: chosen.judgement_held_by }; }
    send('status', { t: 'composing a question…' });
    const { qCost } = await askCriticismQuestion({ send, apiKey: key.apiKey, meter: key.meter, artefact: text, forcedLocated: located, discipline, goal, priorMessages: [], studentTurn: null });
    // Survival curve, depth 1: the paste that opened this critique. Counts only — see db.mjs.
    noteTurnDepth({ day: utcDay(), surface: 'criticism', version: BUILD.version, depth: 1 });
    if (key.meter) { addPoolSpend(utcDay(), req.user.id, qCost, key.poolFlag); if (key.usingPool) send('pool', poolEvent(req.user.id)); }
    send('done', {});
  } catch (err) { sendGenerationError(send, err, key.usingPool ? null : req.user.email); }  // never echo req.body
  res.end();
});

// POST /api/criticism/turn — STATELESS continue. The client sends the artefact it holds, the running
// transcript (priorMessages[]), and either a typed response (message) or a clicked located blur
// (segment). Anchored to that artefact; guarded every turn; persists nothing. req.body NEVER logged. SSE.
app.post('/api/criticism/turn', requireUser, async (req, res) => {
  const b = req.body || {};                                  // NEVER logged
  const artefact = typeof b.artefact === 'string' ? b.artefact : '';
  const goal = typeof b.goal === 'string' ? b.goal : '';
  const discipline = typeof b.discipline === 'string' ? b.discipline : 'all';
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  const priorMessages = Array.isArray(b.priorMessages) ? b.priorMessages : [];
  const seg = b.segment && typeof b.segment.text === 'string' ? b.segment : null;
  if (!artefact) { res.status(400).json({ error: 'No text under question.' }); return; }
  sseHeaders(res);
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const key = await resolveKeyForCriticism(req, res, send); if (!key) return;
  try {
    const located = seg ? { text: seg.text, why: describeLocated(seg), stage: seg.sdc_stage, heldBy: seg.judgement_held_by } : null;
    send('status', { t: 'composing a question…' });          // the question is buffered until it passes the guard
    const { qCost } = await askCriticismQuestion({
      send, apiKey: key.apiKey, meter: key.meter,
      artefact, forcedLocated: located, discipline, goal,
      priorMessages, studentTurn: message || null,
    });
    // Survival curve. The client's own transcript carries the depth, so no session id exists here either:
    // depth = the number of questions this critique has now delivered, counting this one. priorMessages is
    // the transcript BEFORE this turn, so its 'stone' entries are the earlier questions and the opening
    // paste is depth 1 — which keeps the enquiry and criticism curves reading on the same scale.
    noteTurnDepth({ day: utcDay(), surface: 'criticism', version: BUILD.version,
      depth: priorMessages.filter((m) => m && m.role === 'stone').length + 1 });
    if (key.meter) { addPoolSpend(utcDay(), req.user.id, qCost, key.poolFlag); if (key.usingPool) send('pool', poolEvent(req.user.id)); }
    send('done', {});
  } catch (err) { sendGenerationError(send, err, key.usingPool ? null : req.user.email); }
  res.end();
});

// LOCAL "author mode" (build 2.0) — role-flipped: PRAYAS is the stone, this LLM play-acts a design
// student, and HIS questions are captured as the first-hand voice corpus. Both endpoints 404 unless this
// is a capturing dev instance (captureEnabled is hard-guarded off in production), so author mode cannot
// exist on the live site. Runs on the local operator key (POOL_KEY); not metered — this is building, not
// serving. JSON (not SSE) — the student's turns are short.
async function studentReply({ discipline, messages }) {
  const system = buildStudentSystemPrompt({ discipline });
  return (await streamQuestion({ system, messages, maxTokens: 240, temperature: 0.9, reasoning: { enabled: false }, onToken: () => {}, apiKey: POOL_KEY })).trim();
}
app.post('/api/author/open', requireUser, async (req, res) => {
  if (!captureEnabled) { res.status(404).json({ error: 'not a capturing instance' }); return; }
  if (!POOL_KEY) { res.status(503).json({ error: 'no local key (set OPENROUTER_API_KEY)' }); return; }
  const seed = (typeof req.body?.seed === 'string' && req.body.seed.trim()) || pickSeed();
  const discipline = typeof req.body?.discipline === 'string' ? req.body.discipline : 'all';
  try {
    const student = await studentReply({ discipline, messages: [{ role: 'user', content: `(Tutorial begins. Your project: "${seed}". Introduce it in your own words in a sentence or two — what you're trying to do, a bit unresolved — as your opening. Do not ask anything.)` }] });
    res.json({ seed, student });
  } catch (err) { res.status(500).json({ error: String(err?.message || err) }); }
});
app.post('/api/author/turn', requireUser, async (req, res) => {
  if (!captureEnabled) { res.status(404).json({ error: 'not a capturing instance' }); return; }
  const b = req.body || {};
  const seed = typeof b.seed === 'string' ? b.seed : '';
  const discipline = typeof b.discipline === 'string' ? b.discipline : 'all';
  const transcript = Array.isArray(b.transcript) ? b.transcript : [];   // [{role:'student'|'stone', content}]
  const question = typeof b.question === 'string' ? b.question.trim() : '';
  if (!question) { res.status(400).json({ error: 'no question' }); return; }
  // CAPTURE Prayas's question — the gold — with the student turn that prompted it (the situation → his ask).
  const lastStudent = [...transcript].reverse().find((m) => m.role === 'student')?.content || '';
  capture({ mode: 'author', chatKey: seed || transcript[0]?.content || question, turn: transcript.filter((m) => m.role === 'stone').length, discipline, student: lastStudent, question });
  try {
    const messages = [
      ...transcript.map((m) => ({ role: m.role === 'student' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: question },
    ];
    res.json({ student: await studentReply({ discipline, messages }) });
  } catch (err) { res.status(500).json({ error: String(err?.message || err) }); }
});

// LOCAL capture labelling — the operator's "sounds like me / not" verdict on a captured question.
// 404s unless this is a capturing dev instance (captureEnabled is hard-guarded off in production), so it
// cannot exist on the live site. Body: { id, rating:'me'|'not' }.
app.post('/api/capture/label', requireUser, (req, res) => {
  if (!captureEnabled) { res.status(404).json({ error: 'not a capturing instance' }); return; }
  const { id, rating } = req.body || {};
  res.json({ ok: labelCapture(id, rating) });
});

// Debug retrieval (no API key needed).
app.post('/api/retrieve', (req, res) => {
  const { message = '', extraTerms = [] } = req.body || {};
  res.json({ retrieved: retrieve(corpus, message, { extraTerms }) });
});

// no-cache for the HTML so a deploy is seen immediately (the inline CSS lives in index.html, so a
// cached page shows stale styling). Hashed/static assets keep default caching.
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); },
}));

// SPA deep links — serve the app shell for the client routes so /critique, /about, /enquiry/:id
// etc. resolve on a direct load or refresh (real shareable URLs, not hash links). The API routes
// and static assets are matched first above; only genuine client paths fall through to here.
app.get(['/about', '/critique', '/critique/:id', '/progress', '/enquiries', '/enquiry/:id', '/admin', '/author'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// The cohort tiers, reported at boot. PERSONAL = the operator's own key (own-key billing, no ceiling);
// STUDENTS = the org key behind the ₹ ceiling + per-user caps; AI_CLUB = the credit engine. Each off independently.
const personalLog = personalEnabled
  ? `on · ${personalAllowlistConfigured ? `${personalAllowlistSize} email${personalAllowlistSize === 1 ? '' : 's'}` : 'CLOSED (no allowlist)'}`
  : 'off (no personal key)';
const studentsLog = studentsEnabled
  ? `on ${POOL_DAILY_USD > 0 ? `$${POOL_DAILY_USD}/day, ` : ''}${MAX_BUDGET_INR > 0 ? `₹${MAX_BUDGET_INR} total budget, ` : ''}${USER_BUDGET_INR > 0 ? `₹${USER_BUDGET_INR}/user total, ` : ''}${USER_DAILY_INR > 0 ? `₹${USER_DAILY_INR}/user/day, ` : ''}${POOL_USER_TURNS} turns/user @ ₹${usdInr()}/$ · roster:${studentsAllowlistConfigured ? `${studentsAllowlistSize} student${studentsAllowlistSize === 1 ? '' : 's'}` : 'CLOSED (empty)'}`
  : `off (${POOL_KEY_ORG ? 'no ₹ ceiling set' : 'no org key'})`;
// AI Club routing is wired only when the engine URL + token are set; an allowlist then names the cohort.
const aiClubLog = creditEngineConfigured
  ? `engine wired · cohort:${aiClubAllowlistConfigured ? `${aiClubAllowlistSize} students` : 'OFF (no allowlist)'}`
  : 'off (no engine)';
app.listen(PORT, () => {
  console.log(`[zetizeti] v${BUILD.build} · http://localhost:${PORT}  (google:${googleConfigured} · admin:${adminConfigured ? 'set' : 'unset'} · personal:${personalLog} · students:${studentsLog} · ai-club:${aiClubLog})`);
  // Listen-first, warm-async (24 Jul 2026): the app serves immediately; the embedding model loads in
  // the background so no learner ever meets the cold path. Until it resolves, felt-shift turns are
  // simply skipped (feltForTurn gates on neuralReady) — the dialogue is unaffected. A load failure
  // leaves felt off for the process and harms nothing else.
  const t0 = Date.now();
  warmEmbeddings().then((ok) => console.log(`[felt] embedding backend ${ok ? `warm in ${Date.now() - t0}ms` : 'unavailable — felt-shift disabled for this process'}`));
});
// Capture status — loud when ON so it's never a surprise, silent otherwise. It CANNOT be on in
// production (hard guard in lib/capture.mjs); this only ever prints on a local dev instance.
if (captureEnabled) console.log(`[zetizeti] 🔴 TEST-CHAT CAPTURE ON → ${process.env.ZETIZETI_CAPTURE_DIR}/zetizeti-testchats.jsonl (local build tool; never in production)`);

// Fetch the live USD→INR rate at boot, then refresh every 12h (no-op if ZETIZETI_USD_INR pins it).
if (poolEnabled && !USD_INR_OVERRIDE) { refreshUsdInr(); setInterval(refreshUsdInr, 12 * 60 * 60 * 1000).unref(); }
