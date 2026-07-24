// kimi-code-quality-test.mjs — code-generation quality of moonshotai/Kimi-K2.7-Code for STUDENT use,
// via Featherless. Prayas, 23 Jul 2026.
//
// Quality is measured the honest way: EXECUTION. Each generated solution is run against hidden tests
// (python3 / node) → objective PASS/FAIL, not an LLM judge's opinion. Plus two "student-fit" tasks
// (a p5.js sketch, a Pythonic-refactor explanation) captured for the pedagogy read — because for a
// LEARNER, "good" also means: explains itself, stays simple, uses idiomatic current APIs, invents no
// libraries.
//
// Kimi-K2.7-Code needs 4 Featherless concurrency units (the whole plan) — run it with NOTHING else
// hitting Featherless.
//
// Run:  FEATHERLESS_API_KEY=rc_... node scripts/kimi-code-quality-test.mjs

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const F_KEY = (process.env.FEATHERLESS_API_KEY || '').trim();
if (!F_KEY) { console.error('No FEATHERLESS_API_KEY in env.'); process.exit(1); }
const MODEL = process.env.CODE_MODEL || 'moonshotai/Kimi-K2.7-Code';
const TMP = mkdtempSync(join(tmpdir(), 'kimicode-'));

async function ask(prompt, tries = 4) {
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch('https://api.featherless.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${F_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 1200, stream: false }),
      });
      if (!res.ok) { await res.text().catch(() => ''); continue; }
      const j = await res.json();
      const c = j?.choices?.[0]?.message?.content || '';
      if (c) return c;
    } catch { /* retry */ }
  }
  return '';
}
// Pull the FIRST fenced code block of the wanted language (fallback: any fence; fallback: whole text).
function extractCode(text, lang) {
  const fences = [...text.matchAll(/```([a-zA-Z0-9+]*)\s*\n([\s\S]*?)```/g)];
  if (!fences.length) return text.trim();
  const langHit = fences.find(f => (f[1] || '').toLowerCase().match(lang));
  return (langHit ? langHit[2] : fences[0][2]).trim();
}
function run(cmd, file) {
  try {
    const out = execFileSync(cmd, [file], { timeout: 15000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { pass: /(^|\n)PASS\s*$/.test(out.trim()) || out.includes('PASS'), out: out.trim().slice(0, 300) };
  } catch (e) {
    return { pass: false, out: `RUNTIME ERROR: ${(e.stderr || e.stdout || e.message || '').toString().trim().slice(0, 300)}` };
  }
}

// ── EXECUTABLE tasks: {name, lang, prompt, test (appended after model code), runner} ────────────────
const PY_ASSERT = 'python3';
const JS_ASSERT = 'node';
const execTasks = [
  { name: 'py:is_palindrome', lang: /py/, runner: PY_ASSERT, ext: 'py',
    prompt: "Write a Python function `is_palindrome(s)` that returns True if s reads the same forwards and backwards, IGNORING case, spaces and punctuation; else False. Output ONLY one Python code block, the function only.",
    test: `\nassert is_palindrome("A man, a plan, a canal: Panama") is True\nassert is_palindrome("race a car") is False\nassert is_palindrome("") is True\nassert is_palindrome("No 'x' in Nixon") is True\nprint("PASS")\n` },
  { name: 'py:two_sum', lang: /py/, runner: PY_ASSERT, ext: 'py',
    prompt: "Write a Python function `two_sum(nums, target)` returning the indices [i, j] of the two numbers that add to target (exactly one solution exists). Output ONLY one Python code block.",
    test: `\nassert sorted(two_sum([2,7,11,15],9))==[0,1]\nassert sorted(two_sum([3,2,4],6))==[1,2]\nassert sorted(two_sum([3,3],6))==[0,1]\nprint("PASS")\n` },
  { name: 'py:word_count', lang: /py/, runner: PY_ASSERT, ext: 'py',
    prompt: "Write a Python function `word_count(text)` returning a dict mapping each lowercase word to how many times it appears, ignoring punctuation and case. Output ONLY one Python code block.",
    test: `\nwc=word_count("The cat sat. The CAT ran!")\nassert wc.get('the')==2 and wc.get('cat')==2 and wc.get('sat')==1 and wc.get('ran')==1, wc\nprint("PASS")\n` },
  { name: 'py:fix_average(bug)', lang: /py/, runner: PY_ASSERT, ext: 'py',
    prompt: "A student wrote this to average a list, but it skips the first element and crashes on an empty list:\n```python\ndef average(nums):\n    total = 0\n    for i in range(1, len(nums)):\n        total += nums[i]\n    return total / len(nums)\n```\nFix it so it correctly averages ALL elements and returns 0.0 for an empty list. Output ONLY the corrected Python code block.",
    test: `\nassert average([2,4,6])==4\nassert average([10])==10\nassert average([])==0.0\nprint("PASS")\n` },
  { name: 'js:flatten(deep)', lang: /js|javascript/, runner: JS_ASSERT, ext: 'js',
    prompt: "Write a JavaScript function named `flatten(arr)` that DEEPLY flattens a nested array to a single level. Define it as a standalone function (no module.exports, no export). Output ONLY one JavaScript code block.",
    test: `\nconst assert=require('assert');\nassert.deepStrictEqual(flatten([1,[2,[3,[4]],5]]),[1,2,3,4,5]);\nassert.deepStrictEqual(flatten([[1],[2,[3]]]),[1,2,3]);\nassert.deepStrictEqual(flatten([]),[]);\nconsole.log("PASS");\n` },
  { name: 'js:titleCase', lang: /js|javascript/, runner: JS_ASSERT, ext: 'js',
    prompt: "Write a JavaScript function named `titleCase(str)` that capitalises the first letter of each word and lowercases the rest. Standalone function, no exports. Output ONLY one JavaScript code block.",
    test: `\nconst assert=require('assert');\nassert.strictEqual(titleCase("hello WORLD"),"Hello World");\nassert.strictEqual(titleCase("the quick brown fox"),"The Quick Brown Fox");\nconsole.log("PASS");\n` },
];

// ── STUDENT-FIT tasks (captured, light automatic checks) ────────────────────────────────────────────
const softTasks = [
  { name: 'p5:bouncing-ball', lang: /js|javascript/,
    prompt: "Write a p5.js sketch where a ball bounces off all four canvas edges. Include setup() and draw(). Keep it beginner-friendly. Output the code and a ONE-sentence explanation.",
    checks: t => ({ 'has createCanvas': /createCanvas\s*\(/.test(t), 'has draw()': /function\s+draw\s*\(/.test(t), 'reverses velocity': /[*]=\s*-1|=-\s*|-=|\*-1|\* -1|velocity|vx|vy|xspeed|speedX/i.test(t) }) },
  { name: 'pedagogy:pythonic-refactor', lang: /py/,
    prompt: "A beginner design student wrote:\n```python\nfor i in range(len(items)):\n    print(items[i])\n```\nShow a more Pythonic version and explain WHY in one or two sentences, pitched at someone new to code.",
    checks: t => ({ 'suggests direct iteration': /for\s+\w+\s+in\s+items\b/.test(t), 'explains why (short)': /(readable|pythonic|index|simpler|directly)/i.test(t) }) },
];

(async () => {
  console.log(`\nCODE-GEN QUALITY — ${MODEL} (Featherless) — student tasks, graded by EXECUTION\n`);
  const captures = [];
  let pass = 0;
  for (const task of execTasks) {
    const raw = await ask(task.prompt);
    const code = extractCode(raw, task.lang);
    const file = join(TMP, `${task.name.replace(/[^a-z0-9]/gi, '_')}.${task.ext}`);
    writeFileSync(file, code + '\n' + task.test);
    const r = run(task.runner, file);
    if (r.pass) pass++;
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${task.name.padEnd(22)} ${r.pass ? '' : '→ ' + r.out.replace(/\n/g, ' ')}`);
    captures.push({ name: task.name, raw, code, result: r });
  }
  console.log(`\n  EXECUTABLE SCORE: ${pass}/${execTasks.length} passed hidden tests\n`);

  console.log(`STUDENT-FIT tasks (captured; light checks):`);
  for (const task of softTasks) {
    const raw = await ask(task.prompt);
    const checks = task.checks(raw);
    const line = Object.entries(checks).map(([k, v]) => `${v ? '✓' : '✗'} ${k}`).join('  ');
    console.log(`  ${task.name.padEnd(26)} ${line}`);
    captures.push({ name: task.name, raw, checks });
  }

  console.log(`\n\n══════════ RAW OUTPUTS (for the human read) ══════════`);
  for (const c of captures) {
    console.log(`\n──── ${c.name} ${c.result ? `[${c.result.pass ? 'PASS' : 'FAIL'}]` : ''} ────`);
    console.log(c.raw.trim().slice(0, 1400));
  }
  console.log('\ndone.');
})();
