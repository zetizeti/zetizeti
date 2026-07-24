#!/usr/bin/env node
// server-probe.mjs — the AUTH-LESS validation of the WIRED server (feedback-auth-less-local-build-testing).
//
// Unlike dialogue-probe.mjs (which drives the libs directly), this drives the REAL /api/chat route over
// HTTP against a locally running dev server — guest session, cohort tier, SSE contract, felt wiring,
// guard, live model: the whole path a student's browser takes. This is the sign-off artefact for a
// server-side change.
//
// Usage:
//   ZETIZETI_ALLOW_GUEST=1 ZETIZETI_POOL_ALLOWLIST_PERSONAL=guest@localhost npm run dev   # terminal 1
//   node scripts/server-probe.mjs [scenario.json] [baseUrl]                               # terminal 2
//
// scenario.json = { goal, discipline?, turns: [...] } (defaults to the sharpening learner).

import { readFileSync } from 'node:fs';

const BASE = process.argv[3] || 'http://localhost:3000';
const scenario = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : {
      goal: 'make my app onboarding less annoying',
      turns: [
        'onboarding feels annoying and people drop off',
        'actually i think the sign-up form scares people, it asks for too much before they see any value',
        'right, so maybe let them try the core thing first and ask for details later',
        "yeah the real issue is i'm asking for commitment before i've shown them why it's worth it",
      ],
    };

// 1. guest session (dev-only route; refuses in production)
const authRes = await fetch(`${BASE}/auth/guest`, { redirect: 'manual' });
const cookie = (authRes.headers.get('set-cookie') || '').split(';')[0];
if (!cookie) { console.error('no guest session — is the server running with ZETIZETI_ALLOW_GUEST=1?'); process.exit(1); }
console.log(`\n=== server-probe · ${BASE} · guest session ok ===`);
console.log(`GOAL: "${scenario.goal}"\n`);

const history = [];
let exchanges = 0;

for (const message of scenario.turns) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      message, history, goal: scenario.goal, kind: 'turn',
      honed: 0, exchanges, lineage: [scenario.goal], discipline: scenario.discipline || 'all', turnsSinceNudge: 99,
    }),
  });
  const raw = await res.text();
  // parse the SSE stream: event/data pairs
  const events = [];
  for (const block of raw.split('\n\n')) {
    const ev = (block.match(/^event: (.+)$/m) || [])[1];
    const data = (block.match(/^data: (.+)$/m) || [])[1];
    if (ev && data) { try { events.push([ev, JSON.parse(data)]); } catch { /* ignore */ } }
  }
  const sig = (events.find(([e]) => e === 'signals') || [])[1] || {};
  const q = ((events.find(([e]) => e === 'token') || [])[1] || {}).t || '(no question)';
  const err = (events.find(([e]) => e === 'error') || [])[1];
  const felt = sig.feltEvent ? `\x1b[33mfelt:${sig.feltEvent.toUpperCase()}\x1b[0m` : '\x1b[2m(no felt)\x1b[0m';
  console.log(`\x1b[33mstudent:\x1b[0m ${message}`);
  console.log(`  ${felt}${sig.feltWhy ? ` \x1b[2m— ${sig.feltWhy}\x1b[0m` : ''}`);
  if (err) { console.log(`  \x1b[31mERROR: ${err.code || ''} ${err.message || ''}\x1b[0m`); process.exit(1); }
  console.log(`\x1b[36mstone:\x1b[0m ${q.trim()}\n`);
  history.push({ role: 'student', content: message });
  history.push({ role: 'stone', content: q.trim() });
  exchanges++;
}
console.log('=== done — check the server console for [felt] latency lines ===');
