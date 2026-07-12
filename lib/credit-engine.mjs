// credit-engine.mjs — client for the AI Club credit engine (app #1,
// koher/ai-club/apps/01-credit-engine). Resolves an AI Club student's OWN individual OpenRouter key at
// request time, so their ~₹5,000 credit (held on their key at OpenRouter) is spent instead of the
// shared pool. This is the zetizeti side of HANDOFF Part 2, task C.
//
// 🔴 Invariant #8 extends here. The resolved key is a live money-key. It is:
//   • cached in memory ONLY, for a short TTL (never written to disk, never into the DB),
//   • NEVER logged, NEVER echoed to the client, NEVER put in an error message,
//   • dropped from the cache the moment OpenRouter reports the credit is exhausted (so a re-issued key
//     is picked up on the next turn).
// The engine itself never persists a key in zetizeti — zetizeti holds it transiently and forgets it.
//
// DISABLED BY DEFAULT. Active only when BOTH the engine URL and this tool's token are configured. With
// them unset (today's state — the engine is not yet deployed) this module is inert and every user flows
// through the existing pool path unchanged, so nothing here can block the Part 1 deploy.

const ENGINE_URL = (process.env.ZETIZETI_CREDIT_ENGINE_URL || '').trim().replace(/\/+$/, '');
const ENGINE_TOKEN = (process.env.ZETIZETI_CREDIT_ENGINE_TOKEN || '').trim();
export const creditEngineConfigured = Boolean(ENGINE_URL && ENGINE_TOKEN);

// How long a resolved key may live in memory before we re-ask the engine. "For the session" in the
// SPEC, softened to a TTL so we neither re-fetch every turn nor hold a key indefinitely. Default 15 min.
const TTL_MS = (Number(process.env.ZETIZETI_CREDIT_CACHE_TTL_SEC) || 900) * 1000;

const norm = (email) => String(email || '').trim().toLowerCase();
const cache = new Map();                                   // email → { key, expires } (in-memory only)

// Drop a cached key (call on credit-exhausted / revoked so we re-resolve next time). No-op if absent.
export function forgetKey(email) { cache.delete(norm(email)); }

// Resolve the student's key. Returns { ok:true, key, cohort } or { ok:false, code } — the code is a
// stable token the caller maps to a user-facing message. Never throws; a network failure is a code.
// Codes: NOT_REGISTERED | REVOKED (from the engine) · ENGINE_AUTH | ENGINE_ERROR | ENGINE_UNREACHABLE
// (client-side / transport). The key is never logged on any path.
export async function resolveAiClubKey(email) {
  const e = norm(email);
  if (!creditEngineConfigured) return { ok: false, code: 'ENGINE_ERROR' };   // guarded by caller; belt-and-braces
  if (!e) return { ok: false, code: 'NOT_REGISTERED' };

  const hit = cache.get(e);
  if (hit && hit.expires > Date.now()) return { ok: true, key: hit.key, cohort: hit.cohort };

  let res;
  try {
    res = await fetch(`${ENGINE_URL}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENGINE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e }),
    });
  } catch {
    return { ok: false, code: 'ENGINE_UNREACHABLE' };      // never surface the underlying error (could name internals)
  }

  if (res.ok) {
    let data;
    try { data = await res.json(); } catch { return { ok: false, code: 'ENGINE_ERROR' }; }
    if (!data || typeof data.key !== 'string' || !data.key) return { ok: false, code: 'ENGINE_ERROR' };
    cache.set(e, { key: data.key, cohort: data.cohort || 'ai-club', expires: Date.now() + TTL_MS });
    return { ok: true, key: data.key, cohort: data.cohort || 'ai-club' };
  }

  // Map the engine's typed misses. Read the code from the body, fall back on status. NEVER read/echo
  // any key material — the miss body carries only { error, code }.
  let code = null;
  try { code = (await res.json())?.code || null; } catch { /* ignore */ }
  if (code === 'NOT_REGISTERED' || code === 'REVOKED') return { ok: false, code };
  if (res.status === 401) return { ok: false, code: 'ENGINE_AUTH' };   // our tool token is wrong — operator issue
  if (res.status === 404) return { ok: false, code: 'NOT_REGISTERED' };
  if (res.status === 403) return { ok: false, code: 'REVOKED' };
  return { ok: false, code: 'ENGINE_ERROR' };
}
