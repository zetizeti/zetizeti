// auth.mjs — Google OAuth 2.0 (Authorization Code) + opaque server-side sessions.
// Google is the ONLY sign-in. Hand-rolled (no passport) to keep deps minimal.

import { randomBytes } from 'node:crypto';
import { upsertGoogleUser, getOrCreateGuest, createSession, userForSession, destroySession } from './db.mjs';

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
