// dashboard.mjs — "send to dashboard" (v1.9.0, 16 September 2026)
//
// Prayas: "alongwith a save md/pdf there can be a small send to dashboard button clicking which it will go to
// their dashboard account - it will be shown only if they have an ai club dashboard account".
//
// The AI Club dashboard keeps each student's submitted work by stage. When a student presses the button, the
// idea transcript they are holding is filed on their own Think stage there, as if they had downloaded it and
// uploaded it by hand. This file is the client for the dashboard's two tool routes. Unset → inert, and the
// button never appears.
//
// 🔴 THE EPHEMERAL PIVOT HOLDS. zetizeti keeps nothing: the transcript arrives in the request, is forwarded
// once, and is dropped. It is never logged (invariant #8), never cached, and nothing moves without the press.
// The only thing cached is the yes/no "has this email a dashboard account", for five minutes, in memory, so
// the page does not ask on every load.
//
// 🔴 BOUNDED like the credit engine's calls: eight seconds, and a slow dashboard reads as "could not send"
// rather than as a hung button.

const URL_BASE = (process.env.ZETIZETI_DASHBOARD_URL || '').trim().replace(/\/+$/, '');
const TOKEN = (process.env.ZETIZETI_DASHBOARD_TOKEN || '').trim();
export const dashboardConfigured = Boolean(URL_BASE && TOKEN);

const TIMEOUT_MS = 8000;
const ACCOUNT_TTL_MS = 5 * 60 * 1000;
const accountCache = new Map();          // email → { at, account, thinkOpen }

async function call(path, body, fetchImpl = fetch) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetchImpl(URL_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (r.status === 401) return { ok: false, code: 'AUTH' };
    if (!r.ok) return { ok: false, code: 'UNAVAILABLE' };
    return await r.json();
  } catch {
    return { ok: false, code: 'UNREACHABLE' };
  } finally {
    clearTimeout(t);
  }
}

// { available, thinkOpen } — available means configured AND this person has signed in to the dashboard.
// A failure is `available:false`: the button simply does not appear, which is the quiet answer.
export async function dashboardAccount(email, { fetchImpl } = {}) {
  const e = String(email || '').trim().toLowerCase();
  if (!dashboardConfigured || !e) return { available: false, thinkOpen: false };
  const hit = accountCache.get(e);
  if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return { available: hit.account, thinkOpen: hit.thinkOpen };
  const r = await call('/api/tool/account', { email: e }, fetchImpl);
  if (!r || r.ok === false) return { available: false, thinkOpen: false };   // not cached: try again next load
  accountCache.set(e, { at: Date.now(), account: !!r.account, thinkOpen: !!r.thinkOpen });
  return { available: !!r.account, thinkOpen: !!r.thinkOpen };
}

const REASONS = {
  AUTH: 'The dashboard did not accept this site — tell your teacher.',
  UNAVAILABLE: 'The dashboard could not take it just now — try again, or save the .md and add it there.',
  UNREACHABLE: 'The dashboard could not be reached — try again, or save the .md and add it there.',
};

// Forward one transcript. Returns { ok, name, count } or { ok:false, error } with a sentence to show.
export async function sendToDashboard(email, { filename, text }, { fetchImpl } = {}) {
  const e = String(email || '').trim().toLowerCase();
  if (!dashboardConfigured) return { ok: false, error: 'Sending to the dashboard is not set up here.' };
  const r = await call('/api/tool/deposit', { email: e, stage: 'think', filename, text }, fetchImpl);
  if (r && r.ok) {
    accountCache.delete(e);                // the stage state may have moved; ask afresh next time
    return { ok: true, name: r.name, count: r.count };
  }
  return { ok: false, error: (r && (r.error || REASONS[r.code])) || REASONS.UNAVAILABLE };
}

// Only an idea transcript is sent: the enquiry's own download, carrying the front matter it has always
// written. Anything else is refused here rather than filed on somebody's Think stage.
// Under express.json()'s default 100kb body limit, so an over-long transcript gets a sentence rather than a bare 413.
export const SEND_MAX_CHARS = 90000;
export function sendProblem(text) {
  if (typeof text !== 'string' || !text.trim()) return 'There is nothing to send yet.';
  if (text.length > SEND_MAX_CHARS) return 'This transcript is too long to send — save the .md and add it on the dashboard instead.';
  if (!/^---\n[\s\S]*?^type: idea-transcript$[\s\S]*?^---$/m.test(text)) return 'Only an enquiry transcript can be sent to the dashboard.';
  return null;
}

export function _resetDashboardCache() { accountCache.clear(); }
