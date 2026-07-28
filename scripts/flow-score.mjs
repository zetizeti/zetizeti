#!/usr/bin/env node
// flow-score.mjs — the two-axis score Prayas asked for (28 Jul 2026): "give the score of improvement
// across a 20-turn conversation - on the engrossing and the meaning-arc axis". Reads a flow-probe run
// JSON and scores each variant 0–100 on both axes, with the per-third trajectory that shows the ARC
// rather than the average. Formulas are stated here and nowhere else — engineered composites for
// comparison between variants of the same run, not truths about students.
//
//   ENGROSSING — does the student stay, and give more as it goes?
//     trend01   reply-length trend, last third ÷ first third   (0.6→0 … 1.4→1)
//     dry01     1 − dry-reply share / 50%
//     conf01    1 − confused-reply share / 30%
//     lateNew01 new-material rate in the LAST third / 60%      (still bringing fresh things late)
//
//   MEANING-ARC — does one thing lead to another, and arrive?
//     uptake01  questions built from what was just said / 100%
//     judge01   1 − interrogation-shaped questions / 40%
//     reQ01     1 − repeated question-frames / 8
//     join01    joins that were not rejected by the next reply (0.5 neutral when none fired)
//     late01    the learner's own movement markers (INSIGHT) in the last third / 2 per conversation
//
// Run:  node scripts/flow-score.mjs ../docs/ops/flow-probe-runs/<stamp>.json [--misses]

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { content, countPhrases, INSIGHT } from '../lib/signals.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/flow-score.mjs <run.json> [--misses]'); process.exit(1); }
const SHOW_MISSES = process.argv.includes('--misses');
const run = JSON.parse(readFileSync(file.startsWith('/') ? file : join(HERE, file), 'utf8'));

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const oneLine = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REJECT = /(^|\s)(what\?+|huh\??)(\s|$)|does ?n'?t make sense|makes no sense|aren'?t related|not related like that|not what i (meant|said)|did ?n'?t say|don'?t (get|understand|follow)|asked (me )?(that|the same)|told you/i;

function thirds(arr) {
  const t = Math.max(1, Math.floor(arr.length / 3));
  return [arr.slice(0, t), arr.slice(t, arr.length - t), arr.slice(arr.length - t)];
}
function newMatSeries(replies) {
  const seen = new Set();
  return replies.map((s) => {
    const c = content(s);
    const n = c.filter((w) => !seen.has(w)).length;
    c.forEach((w) => seen.add(w));
    return c.length ? n / c.length : 0;
  });
}

console.log(`\nflow-score · ${run.config.stamp} · ${run.config.mode} · ${run.config.rounds} rounds × ${run.config.convos} conversation(s)\n`);
console.log(`  ${'variant'.padEnd(36)} ENGROSSING  MEANING-ARC   arc of reply-length (w/turn by third)   arc of new material`);
const rows = [];
for (const v of run.results) {
  const per = v.convos.map((c) => {
    const lens = c.replies.map((s) => content(s).length);
    const [l1, , l3] = thirds(lens);
    const nm = newMatSeries(c.replies);
    const [n1, n2, n3] = thirds(nm.slice(1));
    const ins = c.replies.map((s) => countPhrases(s, INSIGHT));
    const [, , i3] = thirds(ins);
    return { l1: mean(l1), l3: mean(l3), n1: mean(n1) * 100, n2: mean(n2) * 100, n3: mean(n3) * 100, lateIns: i3.reduce((a, b) => a + b, 0) };
  });
  const agg = (k) => mean(per.map((p) => p[k]));
  const engross = 100 * mean([
    clamp01(((v.trend ?? 0) - 0.6) / 0.8),
    clamp01(1 - (v.dryPct ?? 0) / 50),
    clamp01(1 - (v.confusedPct ?? 0) / 30),
    clamp01(agg('n3') / 60),
  ]);
  const joins = v.firedAssoc ?? 0, miss = v.joinMiss ?? 0;
  const arc = 100 * mean([
    clamp01((v.uptakePct ?? 0) / 100),
    clamp01(1 - ((v.particPct ?? 0) + (v.binaryPct ?? 0)) / 40),
    clamp01(1 - (v.reQ ?? 0) / 8),
    joins > 0 ? clamp01(1 - miss / joins) : 0.5,
    clamp01(agg('lateIns') / 2),
  ]);
  rows.push({ key: v.key, engross, arc });
  console.log(`  ${(v.key + ' ' + v.label).slice(0, 36).padEnd(36)} ${engross.toFixed(0).padStart(6)}      ${arc.toFixed(0).padStart(6)}        ${agg('l1').toFixed(0)} → ${agg('l3').toFixed(0)}${' '.repeat(24)}${agg('n1').toFixed(0)}% → ${agg('n2').toFixed(0)}% → ${agg('n3').toFixed(0)}%`);
}
const base = rows[0];
console.log(`\n  improvement vs ${base.key}:`);
for (const r of rows.slice(1)) {
  console.log(`    ${r.key.padEnd(6)} engrossing ${r.engross >= base.engross ? '+' : ''}${(r.engross - base.engross).toFixed(0)} · meaning-arc ${r.arc >= base.arc ? '+' : ''}${(r.arc - base.arc).toFixed(0)}`);
}

if (SHOW_MISSES) {
  console.log(`\n── rejected joins (the question, and the reply that refused it) ──`);
  for (const v of run.results) {
    for (const c of v.convos) {
      (c.trace || []).forEach((t) => {
        if (!t.assoc) return;
        const reply = oneLine(c.replies[t.turn] || '');
        if (REJECT.test(reply)) {
          console.log(`\n  [${v.key} · ${c.seed.slice(0, 40)} · turn ${t.turn}] ${t.assoc.why ? `(${t.assoc.why.join('+')})` : ''}`);
          console.log(`    Q: ${oneLine(c.questions[t.turn - 1])}`);
          console.log(`    → ${reply.slice(0, 220)}`);
        }
      });
    }
  }
}
