// db.mjs — persistent user data (accounts, sessions, quests, messages, memory).
// Separate from the in-memory corpus index (which is rebuilt from files at boot).
// SDC note: this stores code-owned/human-owned state only — goals, lineage, honing
// counts, message transcripts. The model never writes here and never scores progress.

import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.ZETIZETI_DB || join(__dirname, '..', 'db', 'zetizeti.db');

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    google_sub  TEXT UNIQUE,
    email       TEXT,
    name        TEXT,
    picture     TEXT,
    is_guest    INTEGER DEFAULT 0,
    created_at  INTEGER
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  INTEGER,
    expires_at  INTEGER
  );
  CREATE TABLE IF NOT EXISTS quests (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id    TEXT,                       -- fork lineage (nullable)
    name         TEXT,
    current_goal TEXT DEFAULT '',
    lineage_json TEXT DEFAULT '[]',          -- every goal statement, vague -> sharp
    honed        INTEGER DEFAULT 0,          -- re-draw count (code-owned)
    exchanges    INTEGER DEFAULT 0,          -- learner turns (code-owned)
    status       TEXT DEFAULT 'open',        -- 'open' | 'resting'
    created_at   INTEGER,
    updated_at   INTEGER
  );
  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    quest_id      TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    role          TEXT NOT NULL,             -- 'student' | 'interlocutor'
    kind          TEXT DEFAULT 'turn',       -- 'goal' | 'redraw' | 'turn' (student only)
    content       TEXT NOT NULL,
    retrieved_json TEXT,                     -- interlocutor: curtain payload
    guard_json    TEXT,                      -- interlocutor: validateOutput result
    created_at    INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_quest ON messages(quest_id, created_at ASC);
  CREATE TABLE IF NOT EXISTS user_memory (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key           TEXT,
    value         TEXT,
    source_quest  TEXT,
    created_at    INTEGER
  );
  -- progress-signals "watch" trajectory: one snapshot per learner turn (progress-signals.md §6).
  -- The code-computed signal vector + the tensions behind the curtain that turn + which nudge
  -- posture (if any) fired. Never a score; the model never writes here.
  CREATE TABLE IF NOT EXISTS signals (
    id             TEXT PRIMARY KEY,
    quest_id       TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    turn_index     INTEGER,
    goal_at_turn   TEXT,
    signal_json    TEXT,
    retrieved_json TEXT,
    nudge_posture  TEXT,
    created_at     INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_signals_quest ON signals(quest_id, created_at ASC);
  -- pool-key spend ledger: the hard cost brake for the optional shared key (OPENROUTER_API_KEY).
  -- One row per (UTC day, user); usd accumulates the REAL billed cost of that user's pool-key turns
  -- (OpenRouter usage accounting), turns counts them. The /api/chat gate refuses a pool turn once the
  -- DAY's total reaches the daily cap OR that USER's share reaches the per-user cap — so no single
  -- person can eat the whole day's budget. Stores no key and no user secret.
  CREATE TABLE IF NOT EXISTS pool_spend (
    day        TEXT NOT NULL,      -- 'YYYY-MM-DD' (UTC)
    user_id    TEXT NOT NULL,      -- which signed-in user spent it (per-user fairness share)
    usd        REAL DEFAULT 0,
    turns      INTEGER DEFAULT 0,
    pool       INTEGER NOT NULL DEFAULT 1,  -- 1 = shared students pool key (counts against the ₹ ceiling + caps); 0 = personal/own key (metered for the admin monitor ONLY, never against the pool budget)
    updated_at INTEGER,
    PRIMARY KEY (day, user_id)
  );
  -- criticism (the second voice) — STATEFUL but NEVER AGGREGATED. Each critique is one found AI text
  -- the student pasted, the per-instance sensed reading of it, and the stone's questions about its
  -- located blurs. Saved + resumable + listed (an index, like quests). Honours the split-ratio canon's
  -- "never aggregate" by construction: there is NO score column, NO cross-chat or cross-user rollup,
  -- NO benchmark — each row stands alone (split-record-v1.md: "no aggregation across records").
  CREATE TABLE IF NOT EXISTS criticism_chats (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT,                       -- derived from the pasted text (first words)
    artefact     TEXT NOT NULL,              -- the found AI text under question (per-user)
    discipline   TEXT DEFAULT 'all',
    goal         TEXT DEFAULT '',
    reading_json TEXT,                       -- the per-instance sensed reading (segments + located blur ids + ratios)
    created_at   INTEGER,
    updated_at   INTEGER
  );
  CREATE TABLE IF NOT EXISTS criticism_messages (
    id          TEXT PRIMARY KEY,
    chat_id     TEXT NOT NULL REFERENCES criticism_chats(id) ON DELETE CASCADE,
    role        TEXT NOT NULL,               -- 'stone' (the question); no free-text student turns
    segment     TEXT,                        -- which located blur this question was about (verbatim), nullable for the opening
    content     TEXT NOT NULL,               -- the stone's question
    guard_json  TEXT,                        -- validateCriticismOutput result
    created_at  INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_crit_chats_user ON criticism_chats(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_crit_msgs_chat ON criticism_messages(chat_id, created_at ASC);
`);

// Migration (idempotent): DBs on the /app/data volume created before the `pool` flag existed have a
// pool_spend without that column. ADD COLUMN throws "duplicate column name" once it is present — swallow
// it. Existing rows default to pool = 1 (they were all shared-pool spend), so the ₹ ceiling is unchanged.
try { db.exec('ALTER TABLE pool_spend ADD COLUMN pool INTEGER NOT NULL DEFAULT 1'); } catch (e) { /* column already present */ }

// EPHEMERAL enforcement (11 Jul 2026): zetizeti writes NO conversation content any more (both surfaces
// generate statelessly). These content tables are legacy — kept only so the module's prepared
// statements still bind — and are PURGED on every boot. That makes "nothing is kept" self-enforcing:
// any residual rows a previous, persisting build wrote to the live /app/data volume are cleared on the
// next deploy, with no manual SQL against the volume. Operational tables (users, sessions, pool_spend —
// identity + the metering that backs the caps and admin monitor, never conversation) are preserved.
try {
  db.exec(`DELETE FROM messages; DELETE FROM quests; DELETE FROM signals;
           DELETE FROM criticism_messages; DELETE FROM criticism_chats; DELETE FROM user_memory;`);
} catch (e) { /* tables absent on a fresh DB — nothing to purge */ }

const now = () => Date.now();
const id = (p = '') => p + randomBytes(12).toString('hex');

// ---- users ----
const _userBySub = db.prepare('SELECT * FROM users WHERE google_sub = ?');
const _userById = db.prepare('SELECT * FROM users WHERE id = ?');
const _insUser = db.prepare(
  `INSERT INTO users (id, google_sub, email, name, picture, is_guest, created_at)
   VALUES (@id, @google_sub, @email, @name, @picture, @is_guest, @created_at)`
);

export function upsertGoogleUser({ sub, email, name, picture }) {
  const existing = _userBySub.get(sub);
  if (existing) return existing;
  const row = { id: id('u_'), google_sub: sub, email, name, picture, is_guest: 0, created_at: now() };
  _insUser.run(row);
  return row;
}

// A singleton local guest account. For LOCAL DEVELOPMENT / DEMO ONLY — the dev-only guest sign-in
// (auth.mjs `beginGuest`, gated to non-production) and the test suite use it. Production stays
// Google-OAuth-only (the guest endpoint refuses there), so this never creates a guest in prod.
const GUEST_SUB = '__guest__';
export function getOrCreateGuest() {
  const existing = _userBySub.get(GUEST_SUB);
  if (existing) return existing;
  const row = { id: id('u_'), google_sub: GUEST_SUB, email: 'guest@localhost', name: 'Guest (local)', picture: null, is_guest: 1, created_at: now() };
  _insUser.run(row);
  return row;
}

// ---- sessions ----
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const _insSession = db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)');
const _sessionRow = db.prepare('SELECT * FROM sessions WHERE token = ?');
const _delSession = db.prepare('DELETE FROM sessions WHERE token = ?');

export function createSession(userId) {
  const token = randomBytes(24).toString('hex');
  _insSession.run(token, userId, now(), now() + SESSION_TTL);
  return token;
}
export function userForSession(token) {
  if (!token) return null;
  const s = _sessionRow.get(token);
  if (!s) return null;
  if (s.expires_at < now()) { _delSession.run(token); return null; }
  return _userById.get(s.user_id) || null;
}
export function destroySession(token) { if (token) _delSession.run(token); }

// ---- quests ----
const _insQuest = db.prepare(
  `INSERT INTO quests (id, user_id, parent_id, name, current_goal, lineage_json, honed, exchanges, status, created_at, updated_at)
   VALUES (@id, @user_id, @parent_id, @name, @current_goal, @lineage_json, @honed, @exchanges, 'open', @created_at, @updated_at)`
);
const _questsForUser = db.prepare('SELECT * FROM quests WHERE user_id = ? ORDER BY updated_at DESC');
const _questById = db.prepare('SELECT * FROM quests WHERE id = ?');
const _updQuest = db.prepare(
  // current_goal only overwritten when a non-empty goal is supplied — a malformed/empty
  // goal mid-dialogue must not silently wipe the row's goal.
  `UPDATE quests SET
     current_goal = CASE WHEN @current_goal <> '' THEN @current_goal ELSE current_goal END,
     lineage_json=@lineage_json, honed=@honed, exchanges=@exchanges, updated_at=@updated_at
   WHERE id=@id`
);
const _renameQuest = db.prepare('UPDATE quests SET name=@name, updated_at=@updated_at WHERE id=@id');

export function createQuest(userId, { name = 'Untitled enquiry', parentId = null } = {}) {
  const row = {
    id: id('q_'), user_id: userId, parent_id: parentId, name,
    current_goal: '', lineage_json: '[]', honed: 0, exchanges: 0,
    created_at: now(), updated_at: now(),
  };
  _insQuest.run(row);
  return _questById.get(row.id);
}
export function listQuests(userId) {
  return _questsForUser.all(userId).map((q) => ({
    id: q.id, name: q.name, parent_id: q.parent_id, current_goal: q.current_goal,
    honed: q.honed, exchanges: q.exchanges, status: q.status,
    created_at: q.created_at, updated_at: q.updated_at,
  }));
}
export function getQuest(questId) { return _questById.get(questId) || null; }
export function renameQuest(questId, name) { _renameQuest.run({ id: questId, name, updated_at: now() }); }

// ---- messages ----
const _insMessage = db.prepare(
  `INSERT INTO messages (id, quest_id, role, kind, content, retrieved_json, guard_json, created_at)
   VALUES (@id, @quest_id, @role, @kind, @content, @retrieved_json, @guard_json, @created_at)`
);
const _messagesForQuest = db.prepare('SELECT * FROM messages WHERE quest_id = ? ORDER BY created_at ASC, rowid ASC');

export function addMessage(questId, { role, kind = 'turn', content, retrieved = null, guard = null }) {
  const row = {
    id: id('m_'), quest_id: questId, role, kind, content,
    retrieved_json: retrieved ? JSON.stringify(retrieved) : null,
    guard_json: guard ? JSON.stringify(guard) : null,
    created_at: now(),
  };
  _insMessage.run(row);
  return row.id;
}
export function messagesForQuest(questId) {
  return _messagesForQuest.all(questId).map((m) => ({
    role: m.role, kind: m.kind, content: m.content,
    retrieved: m.retrieved_json ? JSON.parse(m.retrieved_json) : null,
    guard: m.guard_json ? JSON.parse(m.guard_json) : null,
  }));
}

// ---- criticism (the second voice): stateful per-user critiques, never aggregated ----
const _insCritChat = db.prepare(
  `INSERT INTO criticism_chats (id, user_id, title, artefact, discipline, goal, reading_json, created_at, updated_at)
   VALUES (@id, @user_id, @title, @artefact, @discipline, @goal, @reading_json, @created_at, @updated_at)`
);
const _critChatsForUser = db.prepare('SELECT id, title, discipline, created_at, updated_at FROM criticism_chats WHERE user_id = ? ORDER BY updated_at DESC');
const _critChatById = db.prepare('SELECT * FROM criticism_chats WHERE id = ?');
const _touchCritChat = db.prepare('UPDATE criticism_chats SET updated_at=@updated_at WHERE id=@id');
const _delCritChat = db.prepare('DELETE FROM criticism_chats WHERE id = ?');
const _insCritMsg = db.prepare(
  `INSERT INTO criticism_messages (id, chat_id, role, segment, content, guard_json, created_at)
   VALUES (@id, @chat_id, @role, @segment, @content, @guard_json, @created_at)`
);
const _critMsgsForChat = db.prepare('SELECT * FROM criticism_messages WHERE chat_id = ? ORDER BY created_at ASC, rowid ASC');

// derive a short title from the pasted artefact (first ~6 words), so the index reads sensibly.
function titleFromArtefact(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return 'Untitled critique';
  const words = t.split(' ').slice(0, 7).join(' ');
  return words.length < t.length ? words + '…' : words;
}

export function createCriticismChat(userId, { artefact, discipline = 'all', goal = '', reading = null }) {
  const row = {
    id: id('c_'), user_id: userId, title: titleFromArtefact(artefact), artefact,
    discipline: discipline || 'all', goal: goal || '',
    reading_json: reading ? JSON.stringify(reading) : null,
    created_at: now(), updated_at: now(),
  };
  _insCritChat.run(row);
  return _critChatById.get(row.id);
}
export function listCriticismChats(userId) { return _critChatsForUser.all(userId); }
export function getCriticismChat(chatId) { return _critChatById.get(chatId) || null; }
export function touchCriticismChat(chatId) { _touchCritChat.run({ id: chatId, updated_at: now() }); }
export function deleteCriticismChat(chatId) { _delCritChat.run(chatId); }
export function addCriticismMessage(chatId, { role = 'stone', segment = null, content, guard = null }) {
  const row = {
    id: id('cm_'), chat_id: chatId, role, segment: segment || null, content,
    guard_json: guard ? JSON.stringify(guard) : null, created_at: now(),
  };
  _insCritMsg.run(row);
  _touchCritChat.run({ id: chatId, updated_at: now() });
  return row.id;
}
export function criticismMessages(chatId) {
  return _critMsgsForChat.all(chatId).map((m) => ({
    role: m.role, segment: m.segment, content: m.content,
    guard: m.guard_json ? JSON.parse(m.guard_json) : null, created_at: m.created_at,
  }));
}

// ---- progress signals (the "watch" trajectory) ----
const _insSignal = db.prepare(
  `INSERT INTO signals (id, quest_id, turn_index, goal_at_turn, signal_json, retrieved_json, nudge_posture, created_at)
   VALUES (@id, @quest_id, @turn_index, @goal_at_turn, @signal_json, @retrieved_json, @nudge_posture, @created_at)`
);
const _signalsForQuest = db.prepare('SELECT * FROM signals WHERE quest_id = ? ORDER BY created_at ASC, rowid ASC');

export function recordSignals(questId, { turnIndex = 0, goal = '', signals = {}, retrieved = null, nudgePosture = null } = {}) {
  const row = {
    id: id('s_'), quest_id: questId, turn_index: turnIndex | 0, goal_at_turn: goal || '',
    signal_json: JSON.stringify(signals || {}),
    retrieved_json: retrieved ? JSON.stringify(retrieved) : null,
    nudge_posture: nudgePosture || null, created_at: now(),
  };
  _insSignal.run(row);
  return row.id;
}
export function signalsForQuest(questId) {
  return _signalsForQuest.all(questId).map((s) => ({
    turn_index: s.turn_index, goal: s.goal_at_turn,
    signals: s.signal_json ? JSON.parse(s.signal_json) : {},
    retrieved: s.retrieved_json ? JSON.parse(s.retrieved_json) : null,
    nudge_posture: s.nudge_posture, created_at: s.created_at,
  }));
}
// turns since a nudge last fired (for the refractory rule). Large when none has yet.
export function turnsSinceLastNudge(questId) {
  const rows = _signalsForQuest.all(questId);
  let since = 99;
  for (const r of rows) since = r.nudge_posture ? 0 : since + 1;
  return since;
}

// Persist a student turn AND update the quest's code-owned progress, atomically.
export const persistStudentTurn = db.transaction((questId, { message, kind, goal, honed, exchanges, lineage }) => {
  addMessage(questId, { role: 'student', kind, content: message });
  _updQuest.run({
    id: questId, current_goal: goal || '', lineage_json: JSON.stringify(lineage || []),
    honed: honed | 0, exchanges: exchanges | 0, updated_at: now(),
  });
});

// Fork (option A): copy the parent's messages + state into a new quest.
export const forkQuest = db.transaction((userId, parentId, name) => {
  const parent = _questById.get(parentId);
  if (!parent || parent.user_id !== userId) return null;
  const child = createQuest(userId, { name: name || `${parent.name} (fork)`, parentId });
  _updQuest.run({
    id: child.id, current_goal: parent.current_goal, lineage_json: parent.lineage_json,
    honed: parent.honed, exchanges: parent.exchanges, updated_at: now(),
  });
  for (const m of _messagesForQuest.all(parentId)) {
    _insMessage.run({
      id: id('m_'), quest_id: child.id, role: m.role, kind: m.kind, content: m.content,
      retrieved_json: m.retrieved_json, guard_json: m.guard_json, created_at: now(),
    });
  }
  return _questById.get(child.id);
});

// ---- admin usage monitor: per-user key usage across all days (the operator's read-only view) ----
// Aggregates the pool_spend ledger per signed-in user — total turns, total USD billed, days active,
// last-active day, and which key path they are on (pool: 1 = shared students pool, 0 = personal/own key).
// USD→₹ conversion is the caller's job (it holds the rate). BOTH shared-pool AND personal-key spenders
// appear (INNER JOIN over all rows) — a user is single-tier, so MAX(p.pool) is that user's path. Heaviest
// spenders first.
const _usageByUser = db.prepare(`
  SELECT u.id AS userId, u.email AS email, u.name AS name,
         COALESCE(SUM(p.turns), 0) AS turns,
         COALESCE(SUM(p.usd),   0) AS usd,
         COUNT(p.day)              AS daysActive,
         MAX(p.day)                AS lastDay,
         MAX(p.pool)               AS pool
  FROM users u
  JOIN pool_spend p ON p.user_id = u.id
  GROUP BY u.id
  ORDER BY usd DESC, turns DESC
`);
export function usageByUser() { return _usageByUser.all(); }

// ---- pool-key spend (the $/day cost brake + per-user fairness share) ----
// These drive the SHARED-POOL ceilings/caps ONLY, so every one filters pool = 1 — personal-key spend
// (pool = 0) is metered for the monitor but must never count against the students' budget.
const _poolDayTotal = db.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM pool_spend WHERE day = ? AND pool = 1');
const _poolAllTotal = db.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM pool_spend WHERE pool = 1');
const _poolUserGet  = db.prepare('SELECT usd FROM pool_spend WHERE day = ? AND user_id = ? AND pool = 1');
const _poolUpsert = db.prepare(
  `INSERT INTO pool_spend (day, user_id, usd, turns, pool, updated_at) VALUES (@day, @user_id, @usd, 1, @pool, @updated_at)
   ON CONFLICT(day, user_id) DO UPDATE SET usd = usd + @usd, turns = turns + 1, updated_at = @updated_at`
);
// Total USD spent on the shared pool key across ALL users this UTC day (the daily ceiling).
export function poolSpendToday(day) { return _poolDayTotal.get(day).usd || 0; }
// Total USD spent on the shared pool key across ALL users and ALL days (the lifetime/total-budget ceiling).
export function poolSpendAllTime() { return _poolAllTotal.get().usd || 0; }
// USD this one user has spent on the shared pool key today (their per-user daily share).
export function poolSpendUser(day, userId) { const r = _poolUserGet.get(day, userId); return r ? r.usd : 0; }
// USD this one user has spent on the shared pool key across ALL days (their lifetime share of the shared
// budget — drives the per-user lifetime ₹ cap, so a hard per-student slice can be enforced on one key).
const _poolUserAll = db.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM pool_spend WHERE user_id = ? AND pool = 1');
export function poolSpendUserAllTime(userId) { return _poolUserAll.get(userId).usd || 0; }

// ── adaptive per-user daily allowance (29 Jul 2026 — "no turn cap. adaptive") ───────────────────────
// The fixed 40-turn day cap bounded something that costs almost nothing (24 Jul: 28 users, ₹37 of
// ₹12,000) and cut off exactly the students the pilot wants — long, engaged sessions. The real
// constraint is the pool's remaining ₹, which the ledger already meters. So the allowance BREATHES with
// the pool: each user's day-share is a small fraction of what remains, clamped to a generous ceiling
// and a floor that still buys a real session. At today's spend the ceiling applies (≈ hundreds of
// turns); if the pool ever runs down the allowance shrinks proportionally — graceful degradation,
// never a cliff — and the lifetime ₹ ceiling stays absolute above it all.
export function adaptiveUserDailyInr(remainingInr, { fraction = 0.02, min = 2, max = 50 } = {}) {
  const r = Number(remainingInr) || 0;
  if (r <= 0) return 0;
  return Math.min(max, Math.max(min, r * fraction));
}
// How many shared-pool turns (chat messages) this user has spent today — drives the per-user turn
// allowance and the "free messages left" counter shown in the chat header.
const _poolTurnsUser = db.prepare('SELECT turns FROM pool_spend WHERE day = ? AND user_id = ? AND pool = 1');
export function poolTurnsUser(day, userId) { const r = _poolTurnsUser.get(day, userId); return r ? r.turns : 0; }
// Record one key turn's real billed cost against (day, user); also increments that user's turn count.
// `pool`: 1 = shared students pool (counts against the ₹ ceiling); 0 = personal/own key (monitor only).
// On conflict the existing `pool` is kept — a user is single-tier, so it never flips row to row.
export function addPoolSpend(day, userId, usd, pool = 1) { _poolUpsert.run({ day, user_id: userId, usd: Number(usd) || 0, pool: pool ? 1 : 0, updated_at: now() }); }

export default db;
