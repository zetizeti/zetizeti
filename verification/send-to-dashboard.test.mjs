// send-to-dashboard.test.mjs — v1.9.0, 16 September 2026.
//
// Prayas: "a small send to dashboard button … it will be shown only if they have an ai club dashboard account".
// These pin the three things that make it safe: the button's visibility rests on the dashboard's own answer
// and fails quiet; only an idea transcript is forwarded, with a sentence on every refusal; and the route keeps
// nothing and logs nothing. Network-free: the dashboard is a stub. Every value here is invented.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.ZETIZETI_DASHBOARD_URL = 'https://dashboard.example.test/';
process.env.ZETIZETI_DASHBOARD_TOKEN = 'test-token-not-real';
const D = await import('../lib/dashboard.mjs');

const stub = (reply, status = 200, seen = []) => async (url, opts) => {
  seen.push({ url, body: JSON.parse(opts.body), auth: opts.headers.Authorization });
  if (reply instanceof Error) throw reply;
  return { status, ok: status >= 200 && status < 300, json: async () => reply };
};
const MD = '---\nsource: zetizeti\ntype: idea-transcript\ntopic: a lamp\n---\n\n# A dialogue — a lamp\n\nhello\n';

test('visible only when the dashboard says this person has an account', async () => {
  D._resetDashboardCache();
  const seen = [];
  assert.deepEqual(await D.dashboardAccount('A@Example.test', { fetchImpl: stub({ ok: true, account: true, thinkOpen: false }, 200, seen) }),
    { available: true, thinkOpen: false });
  assert.equal(seen[0].url, 'https://dashboard.example.test/api/tool/account');
  assert.equal(seen[0].body.email, 'a@example.test');
  assert.equal(seen[0].auth, 'Bearer test-token-not-real');
  D._resetDashboardCache();
  assert.equal((await D.dashboardAccount('b@example.test', { fetchImpl: stub({ ok: true, account: false }) })).available, false);
});

test('any failure hides the button rather than erroring, and is not cached', async () => {
  D._resetDashboardCache();
  assert.equal((await D.dashboardAccount('c@example.test', { fetchImpl: stub(new Error('down')) })).available, false);
  assert.equal((await D.dashboardAccount('c@example.test', { fetchImpl: stub({}, 401) })).available, false);
  // a later success is asked for, not served from a cached failure
  assert.equal((await D.dashboardAccount('c@example.test', { fetchImpl: stub({ ok: true, account: true }) })).available, true);
});

test('a yes is cached, so a page load does not ask every time', async () => {
  D._resetDashboardCache();
  const seen = [];
  const f = stub({ ok: true, account: true, thinkOpen: true }, 200, seen);
  await D.dashboardAccount('d@example.test', { fetchImpl: f });
  await D.dashboardAccount('d@example.test', { fetchImpl: f });
  assert.equal(seen.length, 1);
});

test('only an idea transcript is sent, and every refusal is a sentence', () => {
  assert.equal(D.sendProblem(MD), null);
  assert.match(D.sendProblem(''), /nothing to send/);
  assert.match(D.sendProblem('---\nsource: zetizeti\ntype: critique-transcript\n---\nx'), /Only an enquiry transcript/);
  assert.match(D.sendProblem('just some text'), /Only an enquiry transcript/);
  assert.match(D.sendProblem(MD + 'x'.repeat(D.SEND_MAX_CHARS)), /too long/);
});

test('a send goes to Think, and the dashboard’s own reason reaches the student', async () => {
  const seen = [];
  const ok = await D.sendToDashboard('e@example.test', { filename: 'zetizeti-a-lamp.md', text: MD }, { fetchImpl: stub({ ok: true, name: 'zetizeti-a-lamp.md', count: 2 }, 200, seen) });
  assert.deepEqual(ok, { ok: true, name: 'zetizeti-a-lamp.md', count: 2 });
  assert.equal(seen[0].url, 'https://dashboard.example.test/api/tool/deposit');
  assert.equal(seen[0].body.stage, 'think');
  const locked = await D.sendToDashboard('e@example.test', { filename: 'x.md', text: MD }, { fetchImpl: stub({ ok: false, code: 'LOCKED', error: 'Pick your challenge on the dashboard first — Think opens after that.' }) });
  assert.match(locked.error, /Pick your challenge/);
  const down = await D.sendToDashboard('e@example.test', { filename: 'x.md', text: MD }, { fetchImpl: stub(new Error('down')) });
  assert.equal(down.ok, false);
  assert.match(down.error, /could not be reached/);
});

// The routes and the page, read rather than described.
const SERVER = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

test('both routes need a signed-in user, check the text first, and log nothing', () => {
  const a = SERVER.indexOf("app.post('/api/dashboard/send'");
  const r = SERVER.slice(a, SERVER.indexOf('\n});', a));
  assert.match(r, /requireUser/);
  assert.match(r, /sendProblem\(text\)[\s\S]*sendToDashboard\(req\.user\.email/);
  assert.doesNotMatch(r, /console\./);
  assert.match(SERVER, /app\.get\('\/api\/dashboard', requireUser/);
});

test('the link is hidden by default, shown only by the account check, and only beside the save strip', () => {
  assert.match(HTML, /<span class="dl-send" id="dlSend" hidden>/);
  assert.match(HTML, /\.dl-send\[hidden\], \.dl-transcript\[hidden\] \+ \.dl-send\{display:none\}/);
  assert.match(HTML, /w\.hidden=!\(d && d\.available\)/);
  assert.match(HTML, /has-note/);
  assert.match(HTML, /paintDashboardSend\(\);/);
  assert.match(HTML, /body:JSON\.stringify\(\{ filename: transcriptName\('md'\), text: buildTranscriptMd\(\) \}\)/);
});

// v1.9.2 — the account check ran once, at sign-in; a failure there hid the link for the life of the page.
test('revealing the save strip re-asks for the link when it is still hidden, from ONE place', () => {
  assert.match(HTML, /function showSaveStrip\(\)\{[^}]*dl\.hidden=false;[^}]*if\(w && w\.hidden\) paintDashboardSend\(\);/);
  assert.doesNotMatch(HTML, /\$\('dlTranscript'\); if\(dl\) dl\.hidden=false;\s*\}/, 'no second copy reveals the strip by hand');
});
