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
  loadMethodCore, buildSystemPrompt, validateOutput,
  loadCriticismCore, buildCriticismSystemPrompt, validateCriticismOutput,
} from './lib/dialogue.mjs';
import { readSensed } from './lib/sensed.mjs';
import { qualify, toCanonSegments } from './lib/qualify.mjs';   // DETERMINISTIC, no-LLM qualification (locating)
import {
  googleConfigured, adminConfigured, emailIsAdmin, currentUser, logout, publicUser,
  beginGoogleAuth, handleGoogleCallback, guestAllowed, beginGuest,
} from './lib/auth.mjs';
import {
  createQuest, listQuests, getQuest, renameQuest, forkQuest,
  messagesForQuest, persistStudentTurn, addMessage,
  recordSignals, signalsForQuest, turnsSinceLastNudge,
  createSubsidyRequest, mySubsidyRequest, listSubsidyRequests, updateSubsidyRequest, committedSubsidy,
  poolSpendToday, poolTurnsUser, poolUsersToday, addPoolSpend,
  createCriticismChat, listCriticismChats, getCriticismChat, criticismMessages, addCriticismMessage, deleteCriticismChat,
} from './lib/db.mjs';
import { streamQuestion } from './lib/llm.mjs';
import { computeSignals } from './lib/signals.mjs';
import { decideNudge } from './lib/nudge.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
// Declared budget available for subsidy grants (USD). Display + cap-tracking only — NOT the live
// OpenRouter balance (the app can't see that). Default $10; raise via ZETIZETI_SUBSIDY_BUDGET as you fund the org.
const SUBSIDY_BUDGET = process.env.ZETIZETI_SUBSIDY_BUDGET != null ? (Number(process.env.ZETIZETI_SUBSIDY_BUDGET) || 0) : 10;

// Optional shared "pool" key. A keyless (but signed-in) visitor falls back to the operator's OWN
// OpenRouter key (OPENROUTER_API_KEY) — but only up to a HARD daily spend cap (ZETIZETI_POOL_DAILY_USD,
// USD). BOTH must be set or the app stays pure BYOK (no fallback, no spend). The pool key is the
// operator's own, deliberately configured; it is never logged and never sent to the client. The cap
// meters the REAL billed cost OpenRouter reports per turn; if that is ever missing, it falls back to
// Haiku's per-token price so the brake never silently under-counts.
const POOL_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const POOL_DAILY_USD = Number(process.env.ZETIZETI_POOL_DAILY_USD || 0) || 0;
// Per-user daily turn allowance (chat messages) — the user-facing "free for X turns" limit and the
// header counter. So no single person eats the day's budget. Default 40 (≈ $0.20 of Haiku, so ≥5
// users share a $1 day). Override with ZETIZETI_POOL_USER_TURNS. The $/day total above is the hard
// money ceiling regardless.
const POOL_USER_TURNS = Number(process.env.ZETIZETI_POOL_USER_TURNS || 0) || 40;
// Day-wide cap on how many DISTINCT users may be admitted to the pool per UTC day (default 5).
// A user already counted today (has a row in pool_spend for `day`) is unaffected — only a *new*
// user attempting to start a pool turn after the cap is reached gets POOL_USERS_CAP. The $/day +
// per-user-turn caps still apply on top. The whole point is: the pool serves a small known number
// of unique people per day, not an unbounded queue that just happens to bottom-out at the $ ceiling.
const POOL_USERS_PER_DAY = Number(process.env.ZETIZETI_POOL_USERS_PER_DAY || 0) || 5;
const poolEnabled = !!POOL_KEY && POOL_DAILY_USD > 0;
const utcDay = () => new Date().toISOString().slice(0, 10);     // 'YYYY-MM-DD'
const HAIKU_IN = 1 / 1e6, HAIKU_OUT = 5 / 1e6;                  // $/token fallback (Haiku 4.5)
const usageCost = (u) => (u && typeof u.cost === 'number' && u.cost > 0)
  ? u.cost
  : ((u?.prompt_tokens || 0) * HAIKU_IN + (u?.completion_tokens || 0) * HAIKU_OUT);

// In-memory corpus index, rebuilt from the markdown corpus at boot.
const corpus = new Database(':memory:');
const nEntries = buildIndex(corpus, join(__dirname, 'corpus', 'domain'));
const methodCore = loadMethodCore(join(__dirname, 'corpus', 'method'));
// Criticism surface (zetizeti's second face): base Clean discipline + the critical-register notes.
// Loaded resident on /api/criticise only — NOT globbed into the Socratic prompt.
const criticismCore = methodCore + '\n\n---\n\n' + loadCriticismCore(join(__dirname, 'corpus', 'criticism'));
console.log(`[zetizeti] indexed ${nEntries} domain entries; method core ${methodCore.length} chars; criticism core ${criticismCore.length} chars; BYOK — each user supplies their own OpenRouter key`);

const app = express();
app.use(express.json());

// ---- auth ----
app.get('/auth/google', beginGoogleAuth);
app.get('/auth/google/callback', handleGoogleCallback);
app.get('/auth/guest', beginGuest);          // dev-only (refuses in production)
app.post('/auth/logout', (req, res) => { logout(req, res); res.json({ ok: true }); });

app.get('/api/config', (req, res) => res.json({
  googleConfigured, guestAllowed, poolEnabled,
  poolUserTurns: poolEnabled ? POOL_USER_TURNS : 0,
  poolUsersPerDay: poolEnabled ? POOL_USERS_PER_DAY : 0,
}));

// Per-user pool status for the chat-header counter: how many free messages this signed-in user has
// left today, whether the day's shared $ ceiling is still open, how many of the day's user-count
// spots remain, and whether THIS user is already counted in today's pool. With this the front-end
// can tell "you're in for today, keep going" apart from "you'd be a new entrant and the day is full".
// Cheap; called on load + after caps.
app.get('/api/pool', requireUser, (req, res) => {
  if (!poolEnabled) { res.json({ enabled: false }); return; }
  const day = utcDay();
  const isExistingPoolUserToday = poolTurnsUser(day, req.user.id) > 0;
  const usersToday = poolUsersToday(day);
  const dayOpen = poolSpendToday(day) < POOL_DAILY_USD;
  res.json({
    enabled: true,
    userTurnsPerDay: POOL_USER_TURNS,
    userTurnsLeft: Math.max(0, POOL_USER_TURNS - poolTurnsUser(day, req.user.id)),
    usersPerDay: POOL_USERS_PER_DAY,
    usersToday,
    usersLeft: Math.max(0, POOL_USERS_PER_DAY - usersToday),
    isExistingPoolUserToday,
    dayOpen,
    // True iff a *new* user could still join the pool today (day-wide $ + user-count caps both open).
    // An existing pool user today is gated only by their per-user turn cap, not by newUsersOpen.
    newUsersOpen: dayOpen && usersToday < POOL_USERS_PER_DAY,
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
// Ownership: load the quest and confirm it belongs to the signed-in user.
function ownQuest(req, res, next) {
  const q = getQuest(req.params.id || req.body.quest_id);
  if (!q || q.user_id !== req.user.id) { res.status(404).json({ error: 'quest not found' }); return; }
  req.quest = q;
  next();
}
// Admin gate: a signed-in user whose verified Google email is on ZETIZETI_ADMIN_EMAILS.
function requireAdmin(req, res, next) {
  if (!emailIsAdmin(req.user.email)) { res.status(403).json({ error: 'not an admin' }); return; }
  next();
}

// ---- quests ----
app.get('/api/quests', requireUser, (req, res) => res.json({ quests: listQuests(req.user.id) }));

app.post('/api/quests', requireUser, (req, res) => {
  const name = (req.body?.name || '').trim() || 'Untitled enquiry';
  res.json({ quest: questPublic(createQuest(req.user.id, { name })) });
});

app.post('/api/quests/:id/fork', requireUser, (req, res) => {
  const forked = forkQuest(req.user.id, req.params.id, (req.body?.name || '').trim() || null);
  if (!forked) { res.status(404).json({ error: 'quest not found' }); return; }
  res.json({ quest: questPublic(forked) });
});

app.patch('/api/quests/:id', requireUser, ownQuest, (req, res) => {
  const name = (req.body?.name || '').trim();
  if (name) renameQuest(req.params.id, name);
  res.json({ ok: true });
});

// Open / resume a quest: full state for client hydration.
app.get('/api/quests/:id', requireUser, ownQuest, (req, res) => {
  const q = req.quest;
  const lineage = safeJson(q.lineage_json, []);
  const messages = messagesForQuest(q.id);
  const studentTurns = messages.filter((m) => m.role === 'student').map((m) => m.content);
  res.json({
    quest: { ...questPublic(q), lineage },
    messages,
    // the "watch"-layer signal vector, so the edge visualisation hydrates on open (advisory only)
    signals: computeSignals({ goal: q.current_goal, lineage, studentTurns, exchanges: q.exchanges }),
    trajectory: signalsForQuest(q.id),   // the recorded per-turn progress trajectory (progress view)
  });
});

function questPublic(q) {
  return {
    id: q.id, name: q.name, parent_id: q.parent_id, current_goal: q.current_goal,
    honed: q.honed, exchanges: q.exchanges, status: q.status,
    created_at: q.created_at, updated_at: q.updated_at,
  };
}
function safeJson(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

// ---- subsidy intake — apply for a subsidised OpenRouter key (granting is MANUAL at OpenRouter) ----
// The app records applications only; it never holds or issues a key. The operator issues a capped
// org-key at OpenRouter and emails it to the applicant, then marks the request fulfilled.
app.get('/api/subsidy/mine', requireUser, (req, res) => res.json({ request: mySubsidyRequest(req.user.id) }));
app.post('/api/subsidy', requireUser, (req, res) => {
  const context = (req.body?.context || '').trim();
  if (context.length < 10) { res.status(400).json({ error: 'Please say a little about who you are and why a subsidised key would help.' }); return; }
  const r = createSubsidyRequest({ userId: req.user.id, email: req.user.email, name: req.user.name, context });
  if (!r.ok) { res.status(409).json({ error: 'You already have an application in progress.', request: r.request }); return; }
  res.json({ request: r.request });
});
app.get('/api/admin/subsidy', requireUser, requireAdmin, (req, res) => {
  const committed = committedSubsidy();
  res.json({ requests: listSubsidyRequests(), budget: SUBSIDY_BUDGET, committed, available: Math.max(0, SUBSIDY_BUDGET - committed) });
});
app.post('/api/admin/subsidy/:id', requireUser, requireAdmin, (req, res) => {
  const updated = updateSubsidyRequest(req.params.id, { status: req.body?.status, adminNote: req.body?.note, amount: req.body?.amount });
  if (!updated) { res.status(404).json({ error: 'request not found' }); return; }
  const committed = committedSubsidy();
  res.json({ request: updated, budget: SUBSIDY_BUDGET, committed, available: Math.max(0, SUBSIDY_BUDGET - committed) });
});

// ---- chat (SSE) — contract in GOAL-AND-CURTAIN-LOGIC.md §3 ----
// Body: { quest_id, message, history[], goal, kind:'goal'|'redraw'|'turn', honed, exchanges, lineage[] }
app.post('/api/chat', requireUser, ownQuest, async (req, res) => {
  const {
    message = '', history = [], goal = '', kind = 'turn',
    honed = 0, exchanges = 0, lineage = [], discipline = 'all',
  } = req.body || {};

  const goalTerms = (goal.toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);
  const retrieved = retrieve(corpus, message, { limit: 3, extraTerms: goalTerms, discipline });
  const curtain = retrieved.map((r) => ({ id: r.id, snippet: r.snippet, sources: r.sources, provenance: r.provenance }));

  // watch — deterministic, code-owned signals describing how the INQUIRY is moving (never a score).
  const studentTurns = [...history.filter((h) => h.role === 'student').map((h) => h.content), message];
  const sig = computeSignals({ goal, lineage, studentTurns, exchanges });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Curtain + signals stream regardless of key — even a keyless visitor sees the tensions + the edge.
  send('curtain', { retrieved: curtain });
  send('signals', sig);

  // --- key resolution. BYOK first (the user's own key — never logged or stored, invariant #8). If a
  // signed-in visitor has no key and the pool is enabled, fall back to the operator's pool key — but
  // ONLY under three hard caps applied in priority order: day-wide $ ceiling, day-wide distinct-user
  // count, and this user's per-day turn allowance. The pool key is never logged or sent to the client.
  const byokKey = (req.get('X-LLM-Key') || '').trim();           // never logged
  let apiKey = byokKey, usingPool = false;
  if (!apiKey) {
    if (poolEnabled) {
      const day = utcDay();
      // 1. Day-wide $ ceiling — applies to everyone, including users already counted today.
      if (poolSpendToday(day) >= POOL_DAILY_USD) {
        send('error', { code: 'POOL_CAP', message: "Today's shared free access budget is used up. Add your own OpenRouter key to continue now, or come back tomorrow." });
        return res.end();
      }
      // 2. Day-wide distinct-user count — applies to NEW users only. A user already in pool_spend
      //    for `day` is "in for the day" and continues to be served up to their per-user turn cap.
      const userTurnsToday = poolTurnsUser(day, req.user.id);
      const isNewPoolUserToday = userTurnsToday === 0;
      if (isNewPoolUserToday && poolUsersToday(day) >= POOL_USERS_PER_DAY) {
        send('error', { code: 'POOL_USERS_CAP', message: `Today's ${POOL_USERS_PER_DAY} free spots are all taken. Add your own OpenRouter key to use zetizeti now, or come back tomorrow.` });
        return res.end();
      }
      // 3. Per-user daily turn allowance — applies to users already counted today who've used up their share.
      if (userTurnsToday >= POOL_USER_TURNS) {
        send('error', { code: 'POOL_USER_CAP', message: `You've used today's ${POOL_USER_TURNS} free messages. Add your own OpenRouter key to keep going now, or come back tomorrow.` });
        return res.end();
      }
      apiKey = POOL_KEY; usingPool = true;
    } else {
      send('error', { code: 'NO_KEY', message: 'zetizeti runs on your own OpenRouter API key — add one to continue. It is stored only in your browser.' });
      return res.end();
    }
  }

  // A usable key exists, so we commit to the turn: persist + nudge + record. Persist BEFORE
  // generation so a mid-stream failure still keeps the student turn; a NO_KEY abort above persists nothing.
  persistStudentTurn(req.quest.id, { message, kind, goal, honed, exchanges, lineage });
  const nudge = decideNudge(sig, {
    exchanges, reDrewThisTurn: kind === 'redraw', turnsSinceNudge: turnsSinceLastNudge(req.quest.id),
  });
  recordSignals(req.quest.id, { turnIndex: exchanges, goal, signals: sig, retrieved: curtain, nudgePosture: nudge.posture });
  if (nudge.surface) send('nudge', { surface: nudge.surface });  // a read handed back to the learner
  // the posture steers the QUESTION's mode; the model receives the posture, never the diagnosis.
  const system = buildSystemPrompt(methodCore, retrieved, goal, nudge.posture || '');

  const messages = [
    ...history.map((h) => ({ role: h.role === 'student' ? 'user' : 'assistant', content: h.content })),
    { role: 'user', content: message },
  ];

  // Only the pool path meters spend. Capture usage during the stream, then count the turn ONCE on
  // success (so the counter is exact even if OpenRouter omits the cost figure). BYOK users pay
  // OpenRouter directly and are never tracked here.
  let poolUsage = null;
  const onUsage = usingPool ? (u) => { poolUsage = u; } : null;
  try {
    const full = await streamQuestion({ system, messages, onToken: (t) => send('token', { t }), apiKey, onUsage });
    const check = validateOutput(full);
    send('validation', check);
    // Persist the interlocutor turn only on success (no half-turns from failed streams).
    addMessage(req.quest.id, { role: 'interlocutor', content: full, retrieved: curtain, guard: check });
    if (usingPool) {
      addPoolSpend(utcDay(), req.user.id, usageCost(poolUsage));   // count this turn + add its real cost
      send('pool', { turnsLeft: Math.max(0, POOL_USER_TURNS - poolTurnsUser(utcDay(), req.user.id)) });
    }
    send('done', {});
  } catch (err) {
    send('error', { message: String(err?.message || err) });
  }
  res.end();
});

// ---- criticism surface (SSE) — zetizeti's second face. STATEFUL but NEVER AGGREGATED: each critique
// (one pasted AI text, its per-instance sensed reading, the stone's questions) is saved to the user's
// own list and is resumable, but there is no score, no cross-chat/cross-user rollup, no benchmark —
// each stands alone (split-record-v1: "no aggregation across records"; the canon's "never aggregate"
// is honoured). Pool spend is metered (cost, not aggregated content). The pasted text lives in req.body
// and is NEVER logged (invariant #8 extends to the student's text). Endpoints: POST /chats (create +
// first question), GET /chats (index), GET /chats/:id (resume), POST /chats/:id/turn (continue / blur).
const describeLocated = (seg) => {
  const s = seg.sdc_stage, h = seg.judgement_held_by;
  if (s === 'judgement' && (h === 'text' || h === 'shared')) return 'a consequential call the text appears to make for the reader';
  if (s === 'narration' && h === 'text') return 'a call relayed as if it were already settled';
  if (s === 'mixed') return 'describing and deciding in the same breath';
  return 'a place where describing and deciding may blur';
};

const sseHeaders = (res) => { res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('Connection', 'keep-alive'); };
const goalTermsOf = (g) => (String(g || '').toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length > 2);

// Key resolution for the criticism SSE endpoints: BYOK first (never logged/stored, invariant #8), else
// the operator pool under the same three hard caps as /api/chat. Returns {apiKey, usingPool} or sends a
// precise error event, ends the response, and returns null. (function declaration → hoisted.)
function resolveKeyForCriticism(req, res, send) {
  const byok = (req.get('X-LLM-Key') || '').trim();          // never logged
  if (byok) return { apiKey: byok, usingPool: false };
  if (!poolEnabled) { send('error', { code: 'NO_KEY', message: 'zetizeti runs on your own OpenRouter API key — add one to continue. It is stored only in your browser.' }); res.end(); return null; }
  const day = utcDay();
  if (poolSpendToday(day) >= POOL_DAILY_USD) { send('error', { code: 'POOL_CAP', message: "Today's shared free access budget is used up. Add your own OpenRouter key to continue now, or come back tomorrow." }); res.end(); return null; }
  const ut = poolTurnsUser(day, req.user.id);
  if (ut === 0 && poolUsersToday(day) >= POOL_USERS_PER_DAY) { send('error', { code: 'POOL_USERS_CAP', message: `Today's ${POOL_USERS_PER_DAY} free spots are all taken. Add your own OpenRouter key to use zetizeti now, or come back tomorrow.` }); res.end(); return null; }
  if (ut >= POOL_USER_TURNS) { send('error', { code: 'POOL_USER_CAP', message: `You've used today's ${POOL_USER_TURNS} free messages. Add your own OpenRouter key to keep going now, or come back tomorrow.` }); res.end(); return null; }
  return { apiKey: POOL_KEY, usingPool: true };
}

// Compose + stream ONE criticism question, guard it (verdict-drift, EVERY turn), persist it as a stone
// message, and report its cost. Shared by create + turn. Anchored to the artefact on every turn.
async function askCriticismQuestion({ send, apiKey, usingPool, chatId, artefact, located, discipline, goal, priorMessages, studentTurn }) {
  const probe = (located && located.text) ? located.text : (studentTurn || artefact);
  const retrieved = retrieve(corpus, probe, { limit: 3, extraTerms: goalTermsOf(goal), discipline });
  const system = buildCriticismSystemPrompt(criticismCore, { artefact, located, retrieved, goal });
  const messages = [
    ...priorMessages.map((m) => ({ role: m.role === 'stone' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: studentTurn || (located ? `Point me at this spot: "${located.text}"` : '(continue questioning the text)') },
  ];
  let qCost = 0;
  const full = await streamQuestion({
    system, messages,
    onToken: (t) => send('token', { t }),
    onUsage: usingPool ? (u) => { qCost = usageCost(u); } : null,
    maxTokens: 400, temperature: 0.3, apiKey,
  });
  const guard = validateCriticismOutput(full);               // verdict-drift guard EVERY turn
  send('validation', guard);
  addCriticismMessage(chatId, { role: 'stone', segment: located ? located.text : null, content: full, guard });
  return { qCost };
}

// POST /api/criticism/chats — create a critique: paste a text → qualify → locate → persist the chat +
// reading → ask the first question about the top blur. SSE.
app.post('/api/criticism/chats', requireUser, async (req, res) => {
  const b = req.body || {};                                  // NEVER logged
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const goal = typeof b.goal === 'string' ? b.goal : '';
  const discipline = typeof b.discipline === 'string' ? b.discipline : 'all';
  if (!text) { res.status(400).json({ error: 'Paste an AI text to question.' }); return; }
  if (text.length > 8000) { res.status(413).json({ error: 'That text is long — paste a passage (up to ~8000 characters) to question.' }); return; }
  sseHeaders(res);
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const key = resolveKeyForCriticism(req, res, send); if (!key) return;
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
    const chat = createCriticismChat(req.user.id, { artefact: text, discipline, goal, reading: readingPayload });
    send('chat', { id: chat.id, title: chat.title });        // the new chat id → client opens it
    send('reading', readingPayload);                         // sensed reading behind the curtain
    const ids = reading.strict.conflation_segment_ids || [];
    let located = null;
    if (ids.length) { const chosen = segments.find((s) => s.id === ids[0]) || segments[ids[0]]; if (chosen) located = { text: chosen.text, why: describeLocated(chosen) }; }
    send('status', { t: 'composing a question…' });
    const { qCost } = await askCriticismQuestion({ send, apiKey: key.apiKey, usingPool: key.usingPool, chatId: chat.id, artefact: text, located, discipline, goal, priorMessages: [], studentTurn: null });
    if (key.usingPool) { addPoolSpend(utcDay(), req.user.id, qCost); send('pool', { turnsLeft: Math.max(0, POOL_USER_TURNS - poolTurnsUser(utcDay(), req.user.id)) }); }
    send('done', { chat_id: chat.id });
  } catch (err) { send('error', { message: String(err?.message || err) }); }  // never echo req.body
  res.end();
});

// GET /api/criticism/chats — the index (the user's saved critiques). Never aggregated — a plain list.
app.get('/api/criticism/chats', requireUser, (req, res) => res.json({ chats: listCriticismChats(req.user.id) }));

// GET /api/criticism/chats/:id — resume one critique: the text, its sensed reading, the stone's questions.
app.get('/api/criticism/chats/:id', requireUser, (req, res) => {
  const chat = getCriticismChat(req.params.id);
  if (!chat || chat.user_id !== req.user.id) { res.status(404).json({ error: 'critique not found' }); return; }
  res.json({
    chat: { id: chat.id, title: chat.title, artefact: chat.artefact, discipline: chat.discipline, goal: chat.goal, created_at: chat.created_at, updated_at: chat.updated_at },
    reading: chat.reading_json ? JSON.parse(chat.reading_json) : null,
    messages: criticismMessages(chat.id),
  });
});

app.delete('/api/criticism/chats/:id', requireUser, (req, res) => {
  const chat = getCriticismChat(req.params.id);
  if (!chat || chat.user_id !== req.user.id) { res.status(404).json({ error: 'critique not found' }); return; }
  deleteCriticismChat(chat.id);
  res.json({ ok: true });
});

// POST /api/criticism/chats/:id/turn — continue a critique (SSE): a student response (message) or a
// click on a located blur (segment). Anchored to the saved artefact + prior turns; guarded every turn.
app.post('/api/criticism/chats/:id/turn', requireUser, async (req, res) => {
  const chat = getCriticismChat(req.params.id);
  if (!chat || chat.user_id !== req.user.id) { res.status(404).json({ error: 'critique not found' }); return; }
  const b = req.body || {};                                  // NEVER logged
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  const seg = b.segment && typeof b.segment.text === 'string' ? b.segment : null;
  sseHeaders(res);
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const key = resolveKeyForCriticism(req, res, send); if (!key) return;
  try {
    const prior = criticismMessages(chat.id);
    if (message) addCriticismMessage(chat.id, { role: 'you', content: message });   // persist the student turn
    const located = seg ? { text: seg.text, why: describeLocated(seg) } : null;
    const { qCost } = await askCriticismQuestion({
      send, apiKey: key.apiKey, usingPool: key.usingPool, chatId: chat.id,
      artefact: chat.artefact, located, discipline: chat.discipline, goal: chat.goal,
      priorMessages: prior, studentTurn: message || null,
    });
    if (key.usingPool) { addPoolSpend(utcDay(), req.user.id, qCost); send('pool', { turnsLeft: Math.max(0, POOL_USER_TURNS - poolTurnsUser(utcDay(), req.user.id)) }); }
    send('done', {});
  } catch (err) { send('error', { message: String(err?.message || err) }); }
  res.end();
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
app.get(['/about', '/critique', '/critique/:id', '/progress', '/enquiries', '/enquiry/:id', '/subsidy', '/admin'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`[zetizeti] http://localhost:${PORT}  (google:${googleConfigured} · BYOK · admin:${adminConfigured ? 'set' : 'unset'} · pool:${poolEnabled ? `on $${POOL_DAILY_USD}/day, ${POOL_USER_TURNS} turns/user, ${POOL_USERS_PER_DAY} users/day` : 'off'})`));
