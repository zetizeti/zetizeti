// auth.mjs — Google OAuth 2.0 (Authorization Code) + opaque server-side sessions.
// Google is the ONLY sign-in. Hand-rolled (no passport) to keep deps minimal.

import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertGoogleUser, getOrCreateGuest, getOrCreateMaint, userIsMaint, createSession, userForSession, destroySession } from './db.mjs';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
const IS_PROD = process.env.NODE_ENV === 'production';

export const googleConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);

// Dev-only guest sign-in. NEVER in production: the deployed site stays Google-OAuth-only (the access
// model is a settled decision). Enabled only when NOT production AND ZETIZETI_ALLOW_GUEST is set —
// purely so the app is drivable locally (e.g. to demo criticism mode) without configuring OAuth.
export const guestAllowed = !IS_PROD && !!process.env.ZETIZETI_ALLOW_GUEST;

// ---- admin (subsidy review) ----
// ZETIZETI_ADMIN_EMAILS lists the operator accounts who may review subsidy applications. This is NOT
// a user gate — anyone signs in with Google; it only identifies who runs this instance. The subsidy
// admin view + its API are gated on this. Comma-separated, case-insensitive.
const ADMIN_EMAILS = new Set(
  (process.env.ZETIZETI_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);
export const adminConfigured = ADMIN_EMAILS.size > 0;
export function emailIsAdmin(email) {
  const e = String(email || '').trim().toLowerCase();
  return e ? ADMIN_EMAILS.has(e) : false;
}

// ---- pool allowlists (who may draw on a shared operator key) — BIFURCATED 11 Jul 2026 ----
// TWO separate cohorts, each on its OWN key, so operator/personal testing and the student pilot bill
// apart and never share a ₹ ceiling:
//   PERSONAL — a small env-var list (ZETIZETI_POOL_ALLOWLIST_PERSONAL, comma-separated) → the operator's
//     OWN key (OPENROUTER_API_KEY). Own-key billing: no cohort ₹ ceiling, no metering (server picks the key).
//   STUDENTS — a file-backed roster (a markdown file, so a large cohort is edited as a file, not a giant
//     env var) → the ORG key (OPENROUTER_API_KEY_ORG), metered against the ₹ ceiling + per-user caps.
// EMPTY = CLOSED for BOTH — a deliberate change from the old single ZETIZETI_POOL_ALLOWLIST's "unset =
// open" (which once left the ₹ budget open to any signed-in account). A gate must be SET to admit anyone.
// Separate from ADMIN_EMAILS (admin ≠ pool access). Case-insensitive throughout.
const POOL_ALLOWLIST_PERSONAL = new Set(
  (process.env.ZETIZETI_POOL_ALLOWLIST_PERSONAL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);
export const personalAllowlistConfigured = POOL_ALLOWLIST_PERSONAL.size > 0;
export const personalAllowlistSize = POOL_ALLOWLIST_PERSONAL.size;
export function emailAllowedOnPoolPersonal(email) {
  const e = String(email || '').trim().toLowerCase();
  return e ? POOL_ALLOWLIST_PERSONAL.has(e) : false;         // empty set = closed
}

// The students roster. ZETIZETI_POOL_ALLOWLIST_STUDENTS may be EITHER inline emails (if it contains '@'
// — handy for tests/small lists) OR a path to a markdown file; unset → the bundled pool-allowlist-
// students.md next to the app. Every email found in the text — bare or inside "Name <email>" — is a
// member (surrounding prose is ignored). Read ONCE at import; an absent/unreadable file = no students
// (closed). The roster is never logged.
const STUDENTS_SRC = (process.env.ZETIZETI_POOL_ALLOWLIST_STUDENTS || '').trim();
const DEFAULT_STUDENTS_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'pool-allowlist-students.md');
const STUDENTS_TEXT = (() => {
  if (STUDENTS_SRC.includes('@')) return STUDENTS_SRC;       // inline emails
  try { return readFileSync(STUDENTS_SRC || DEFAULT_STUDENTS_FILE, 'utf8'); } catch { return ''; }
})();
const POOL_ALLOWLIST_STUDENTS = new Set(
  (STUDENTS_TEXT.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [])
);
export const studentsAllowlistConfigured = POOL_ALLOWLIST_STUDENTS.size > 0;
export const studentsAllowlistSize = POOL_ALLOWLIST_STUDENTS.size;
export function emailAllowedOnPoolStudents(email) {
  const e = String(email || '').trim().toLowerCase();
  return e ? POOL_ALLOWLIST_STUDENTS.has(e) : false;         // empty/absent = closed
}

// ---- AI Club cohort (routes to the credit engine, NOT the shared pool) ----
// ZETIZETI_AICLUB_ALLOWLIST lists the 30 AI Club (Foundation) students. These users do NOT draw on the
// shared pool budget — each has their OWN individual OpenRouter key, resolved server-side by the credit
// engine (app #1) and spent against their own ~₹5,000 credit. So an AI Club email is checked BEFORE the
// pool path in the chat handler: it bypasses the pool allowlist and the ₹ caps entirely (its cap is
// OpenRouter's per-key limit, not any zetizeti table). EMPTY = no AI Club cohort here (the default,
// pre-engine state), so everyone flows through the pool exactly as before. Comma-separated, case-insensitive.
const AICLUB_ALLOWLIST = new Set(
  (process.env.ZETIZETI_AICLUB_ALLOWLIST || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);
export const aiClubAllowlistConfigured = AICLUB_ALLOWLIST.size > 0;
export const aiClubAllowlistSize = AICLUB_ALLOWLIST.size;
export function emailIsAiClub(email) {
  if (AICLUB_ALLOWLIST.size === 0) return false;             // unset = no AI Club cohort (pool-only default)
  const e = String(email || '').trim().toLowerCase();
  return e ? AICLUB_ALLOWLIST.has(e) : false;
}

const SESSION_COOKIE = 'zetizeti_session';
const STATE_COOKIE = 'zetizeti_oauth_state';

// ---- minimal cookie helpers (no cookie-parser dependency) ----
export function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(res, name, value, { maxAge, clear } = {}) {
  const bits = [`${name}=${clear ? '' : encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (IS_PROD) bits.push('Secure');
  if (clear) bits.push('Max-Age=0');
  else if (maxAge) bits.push(`Max-Age=${maxAge}`);
  const prev = res.getHeader('Set-Cookie');
  const next = prev ? [].concat(prev, bits.join('; ')) : bits.join('; ');
  res.setHeader('Set-Cookie', next);
}

// ---- current user (middleware-style) ----
export function currentUser(req) {
  return userForSession(parseCookies(req)[SESSION_COOKIE]);
}
function login(res, userId) {
  setCookie(res, SESSION_COOKIE, createSession(userId), { maxAge: 60 * 60 * 24 * 30 });
}
export function logout(req, res) {
  destroySession(parseCookies(req)[SESSION_COOKIE]);
  setCookie(res, SESSION_COOKIE, '', { clear: true });
}

// ---- OAuth flow ----
export function beginGoogleAuth(req, res) {
  if (!googleConfigured) { res.status(500).send('Google OAuth not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).'); return; }
  const state = randomBytes(16).toString('hex');
  setCookie(res, STATE_COOKIE, state, { maxAge: 600 }); // 10 min CSRF nonce
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
}

// Dev-only guest sign-in: create/reuse the singleton guest, set the session, go to the app.
// Refuses in production (404) so it cannot become a back door on the deployed, OAuth-only site.
export function beginGuest(req, res) {
  if (!guestAllowed) { res.status(404).send('Not found.'); return; }
  login(res, getOrCreateGuest().id);
  res.redirect('/');
}

// ---- the maintenance door (26 August 2026) ----------------------------------------------------------
// Prayas: *"keep a mantainence door open for you in all apps"*, *"remove gates for mantainence"*, and
// *"ONLY you should be able to log-in, with key - everything secure!"*
//
// One shared secret in ZETIZETI_MAINT_TOKEN mints an admin session directly. Every OTHER gate is off on
// this path by instruction: no Google round-trip, no ZETIZETI_ADMIN_EMAILS membership, and — unlike the
// guest door directly above — no production refusal, because reaching the deployed app is the entire
// purpose. The token is therefore the only thing between the open internet and the admin surfaces, and
// it is built to carry that alone:
//
//   · A minimum length is ENFORCED, not advised. A short token here is the whole failure, and a config
//     mistake that leaves the door ajar reports nothing — so a token under 32 characters disables the
//     door rather than guarding it weakly. Silent non-enforcement is the worst shape available.
//   · Compared with timingSafeEqual over a length-independent digest, so neither the comparison nor its
//     duration leaks the secret a byte at a time.
//   · Unset → the route 404s and does not admit it exists. Same discipline as beginGuest.
//   · The token is never logged, never echoed in a response, never put in an error message (invariant #8
//     is about the pool key, but its reasoning — security properties fail silently — governs here too).
//   · The minted session expires in two hours, not the thirty days a human sign-in gets.
//
// 🔴 WHAT IT CANNOT DO, and this is what keeps it from being the guest door under another name: it
// cannot spend. The maintenance identity is on no cohort allowlist, so tierForUser resolves it to NONE
// and every generation path refuses it. Admin surfaces are readable; no wallet is reachable. If a future
// change puts this email on an allowlist, that property is gone and this comment is a lie — do not.
const MAINT_TOKEN = (process.env.ZETIZETI_MAINT_TOKEN || '').trim();
const MAINT_MIN_LEN = 32;
const MAINT_TTL_MS = 1000 * 60 * 60 * 2;                       // two hours
export const maintConfigured = MAINT_TOKEN.length >= MAINT_MIN_LEN;

// Length-independent constant-time compare. timingSafeEqual throws on unequal buffer lengths, and
// catching that throw would itself leak the length — so both sides are hashed to a fixed 32 bytes first.
function secretEquals(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function maintTokenFromRequest(req) {
  const raw = req.headers?.authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1].trim() : '';
}

// POST /maint/session — the door. 404 when unconfigured, 401 on a wrong token, otherwise an admin
// session cookie plus the same token in the body, so a terminal client that does not keep cookies can
// send it back as `Cookie: zetizeti_session=…`.
export function beginMaint(req, res) {
  if (!maintConfigured) { res.status(404).json({ error: 'Not found.' }); return; }
  const presented = maintTokenFromRequest(req);
  if (!presented || !secretEquals(presented, MAINT_TOKEN)) {
    res.status(401).json({ error: 'unauthorised' });           // never say which half was wrong
    return;
  }
  const user = getOrCreateMaint();
  const token = createSession(user.id, MAINT_TTL_MS);
  setCookie(res, SESSION_COOKIE, token, { maxAge: MAINT_TTL_MS / 1000 });
  res.json({
    ok: true,
    session: token,                                            // the caller already holds it; not a leak
    cookieName: SESSION_COOKIE,
    email: user.email,
    expiresInSec: MAINT_TTL_MS / 1000,
    canSpend: false,
    note: 'Admin surfaces only. This identity is on no cohort allowlist and cannot generate.',
  });
}

export { userIsMaint };

export async function handleGoogleCallback(req, res) {
  try {
    const { code, state } = req.query;
    const cookieState = parseCookies(req)[STATE_COOKIE];
    if (!code || !state || !cookieState || state !== cookieState) {
      res.status(400).send('OAuth state mismatch — please try signing in again.');
      return;
    }
    setCookie(res, STATE_COOKIE, '', { clear: true });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) { res.status(502).send('Token exchange failed.'); return; }
    const { access_token } = await tokenRes.json();

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) { res.status(502).send('Could not fetch profile.'); return; }
    const info = await infoRes.json(); // { sub, email, name, picture }

    // Google is the only sign-in (BYOK model): anyone with a Google account may sign in.
    const user = upsertGoogleUser({ sub: info.sub, email: info.email, name: info.name, picture: info.picture });
    login(res, user.id);
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Sign-in error: ' + String(err?.message || err));
  }
}

export function publicUser(u) {
  return u ? { id: u.id, email: u.email, name: u.name, picture: u.picture, isGuest: !!u.is_guest } : null;
}
