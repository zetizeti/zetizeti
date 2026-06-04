// stress-locator.mjs — accuracy + robustness stress test for the DETERMINISTIC criticism locator.
//
// It exercises the SAME functions the live route and audit-criticism.mjs call — qualify() (segment +
// SDC-tag) and readSensed() (locate) — across ~1000+ GENERATED, LABELLED sentences. Each case carries
// the SDC stage it is built to be, so "find bugs" becomes a measurement: actual tag vs intended tag.
//
//   pass  = the locator produced the intended stage (or, for 'none', produced no blur at all)
//   FALSE NEGATIVE = a clear verdict/directive/consensus the locator missed (read as qualification)
//   FALSE POSITIVE = neutral, factual text the locator flagged as a blur
//   CRASH = qualify()/readSensed() threw, or returned a malformed/empty record
//
// No LLM, no key, no network. Run: node scripts/stress-locator.mjs [--samples N]

import { qualify, toCanonSegments } from '../lib/qualify.mjs';
import { readSensed } from '../lib/sensed.mjs';

const SAMPLES = (() => { const i = process.argv.indexOf('--samples'); return i > -1 ? Math.max(1, +process.argv[i + 1] || 4) : 4; })();

// ── vocab ────────────────────────────────────────────────────────────────────────────────────
const NOUNS = ['interface', 'layout', 'grid', 'form', 'button', 'navigation', 'typeface', 'palette',
  'flow', 'prototype', 'wireframe', 'dashboard', 'menu', 'page', 'icon', 'animation', 'system', 'product'];
const EVAL = ['clean', 'intuitive', 'elegant', 'seamless', 'powerful', 'beautiful', 'ugly', 'optimal',
  'ideal', 'perfect', 'superior', 'effective', 'efficient', 'innovative', 'cluttered', 'confusing',
  'clunky', 'messy', 'ethical', 'unethical', 'fair', 'unfair', 'responsible', 'professional', 'biased'];
const ACTION = ['remove', 'add', 'simplify', 'redesign', 'delete', 'merge', 'flatten', 'reduce', 'hide', 'expand'];
const NEUTRAL_V3 = ['has', 'contains', 'shows', 'loads', 'includes', 'displays', 'opens', 'lists', 'holds', 'stores'];
const CONSENSUS = ['Obviously', 'Clearly', 'Of course', 'Naturally', 'Evidently', 'Undeniably',
  'Everyone knows', 'It is well known that', 'Needless to say', 'Without question'];
const CONSENSUS_PHRASE = ['the best practice', 'standard practice', 'the standard approach', 'common sense'];
const HEDGE = ['might be', 'may be', 'could be', 'is perhaps', 'is possibly', 'is arguably', 'tends to be'];
const HANDBACK = ['Depending on your audience,', 'It is up to you whether', 'Your call whether'];
// nouns that are ALSO base-form verbs — capitalised sentence-initial, the imperative trap
const NOUN_VERBS = ['Design', 'Research', 'Process', 'Practice', 'Type', 'Print', 'Draft', 'Map', 'Layer',
  'Group', 'Order', 'Place', 'Space', 'Pattern', 'Scale', 'Balance', 'Focus', 'Frame', 'Form', 'Question',
  'Plan', 'Model', 'Sketch', 'Brand', 'Market', 'Target', 'Flow', 'Stack', 'Grid', 'Profile'];
const NV_TAILS = ['teams iterate constantly.', 'methods vary by studio.', 'documentation helps onboarding.',
  'tools evolved over decades.', 'students submit on Friday.', 'reviews happen weekly.'];
const NUMS = ['three', 'six', 'twelve', 'two', 'forty'];

// ── case generators: each pushes {text, category, expect, held?} ───────────────────────────────
const cases = [];
const add = (text, category, expect, held) => cases.push({ text, category, expect, held });
const pick = (arr, n) => arr[n % arr.length];

// A. NEUTRAL factual — expect NO blur
for (let i = 0; i < 120; i++)
  add(`The ${pick(NOUNS, i)} ${pick(NEUTRAL_V3, i)} ${pick(NUMS, i)} ${pick(NOUNS, i + 3)}s.`, 'neutral-factual', 'none');
for (let i = 0; i < 60; i++)
  add(`Users open the ${pick(NOUNS, i)} and enter their details.`, 'neutral-factual', 'none');

// B. NOUN-VERB sentence-initial — neutral subject, NOT an imperative (the trap)
for (let i = 0; i < NOUN_VERBS.length; i++)
  for (let j = 0; j < NV_TAILS.length; j++)
    add(`${NOUN_VERBS[i]} ${NV_TAILS[j]}`, 'nounverb-initial', 'none');

// C. ATTRIBUTIVE evaluative — expect mixed
for (let i = 0; i < EVAL.length; i++)
  for (let j = 0; j < 6; j++)
    add(`The ${EVAL[i]} ${pick(NOUNS, i + j)} loaded on the screen.`, 'attributive', 'mixed');

// D. PREDICATIVE evaluative — expect judgement
for (let i = 0; i < EVAL.length; i++)
  for (let j = 0; j < 4; j++) {
    const adv = j % 2 ? 'very ' : '';
    add(`The ${pick(NOUNS, i + j)} is ${adv}${EVAL[i]}.`, 'predicative', 'judgement');
  }

// E. DEONTIC — expect judgement
for (let i = 0; i < ACTION.length; i++)
  for (let j = 0; j < 8; j++)
    add(`You should ${ACTION[i]} the ${pick(NOUNS, i + j)}.`, 'deontic', 'judgement');

// F. IMPERATIVE — expect judgement
for (let i = 0; i < ACTION.length; i++)
  for (let j = 0; j < 8; j++)
    add(`${ACTION[i][0].toUpperCase()}${ACTION[i].slice(1)} the ${pick(NOUNS, i + j)} from the ${pick(NOUNS, i + j + 1)}.`, 'imperative', 'judgement');

// G. CONSENSUS — expect narration
for (let i = 0; i < CONSENSUS.length; i++)
  for (let j = 0; j < 6; j++)
    add(`${CONSENSUS[i]}, the ${pick(NOUNS, i + j)} works for everyone.`, 'consensus', 'narration');
for (let i = 0; i < CONSENSUS_PHRASE.length; i++)
  for (let j = 0; j < 6; j++)
    add(`Following ${CONSENSUS_PHRASE[i]} keeps the ${pick(NOUNS, i + j)} consistent.`, 'consensus-phrase', 'narration');

// H. HEDGED predicative — expect judgement, held shared
for (let i = 0; i < EVAL.length; i++)
  for (let j = 0; j < 2; j++)
    add(`The ${pick(NOUNS, i + j)} ${pick(HEDGE, i)} ${EVAL[i]}.`, 'hedged', 'judgement', 'shared');

// I. HANDBACK — expect held human (if a judgement is present)
for (let i = 0; i < HANDBACK.length; i++)
  for (let j = 0; j < EVAL.length; j++)
    add(`${HANDBACK[i]} the ${pick(NOUNS, j)} is ${EVAL[j]}.`, 'handback', 'judgement', 'human');

// N. subject + bare-"be" + eval (hedged via "tends to be") — MUST flag judgement, held shared
for (let i = 0; i < EVAL.length; i++)
  add(`The ${pick(NOUNS, i)} tends to be ${EVAL[i]}.`, 'subject-bare-be', 'judgement', 'shared');

// O. discourse opener "to be honest/fair" — subjectless bare-"be", must NOT flag the eval word
add('To be honest, the layout has six fields.', 'discourse-tobe', 'none');
add('To be fair, users open the menu first.', 'discourse-tobe', 'none');
add('To be honest, the form loads on the screen.', 'discourse-tobe', 'none');
add('To be fair, the grid spans twelve columns.', 'discourse-tobe', 'none');

// ── probe sets (behaviour to OBSERVE; expectations are best-guess, flagged in the report) ───────
// P. imperative + bare/relative object + later finite verb — the conscious new miss class (measure)
const IMP_REL = ['Remove fields that confuse users.', 'Simplify forms users abandon.',
  'Hide options that overwhelm people.', 'Delete buttons nobody clicks.', 'Merge screens users skip.'];
for (const t of IMP_REL) add(t, 'imperative-relative-probe', null);

// J. technical-neutral uses of evaluative words — likely FALSE POSITIVES (documented tradeoff)
const TECH_NEUTRAL = ['A biased estimator converges slowly.', 'The optimal substructure enables recursion.',
  'An efficient sort runs in n log n.', 'The correct answer to two plus two is four.', 'A clean install removes old files.',
  'The fair value is computed quarterly.', 'Perfect numbers equal the sum of their divisors.',
  'The superior vena cava returns blood.', 'An ideal gas obeys the law.', 'The effective date is Monday.'];
for (const t of TECH_NEUTRAL) add(t, 'tech-neutral-probe', 'none');

// K. segmentation / punctuation edge cases — must not crash or mis-split
const PUNCT = ['The form has 3.5 average fields per page.', 'Use a serif, e.g. Besley, for body text.',
  'Dr. Rao reviewed the layout.', 'The grid is 12 cols; the gutter is 24px.',
  'It works, but the menu is cluttered.', 'Ship it, so users can test.', 'The price is $1,200.00 today.',
  'See section 2.1 for details.', 'The file is named v1.2.final.sketch.', 'Wait... the icon is ugly.'];
for (const t of PUNCT) add(t, 'punctuation-probe', null);

// L. robustness — must not crash; expectation not asserted
const ROBUST = ['', '   ', '!!!', '???', '...', '“”', 'a', 'The', '🙂 the clean interface 🔥',
  'word '.repeat(400) + 'is clean.', 'NoPunctuationHereJustOneLongToken', '123 456 789'];
for (const t of ROBUST) add(t, 'robustness-probe', null);

// M. non-English / mixed — compromise is English-only; observe (likely all 'none')
const MULTILANG = ['Le bouton est très élégant.', 'El diseño es óptimo.', 'इंटरफ़ेस साफ़ है।',
  'Die Schnittstelle ist sauber.', 'Очевидно, это лучший выбор.', 'この設計は最適です。',
  'The レイアウト is clean.', 'Obviously, le design est the best choice.'];
for (const t of MULTILANG) add(t, 'multilang-probe', null);

// ── run ─────────────────────────────────────────────────────────────────────────────────────
const BLUR = ['judgement', 'narration', 'mixed'];
function evaluate(tc) {
  let segs, reading;
  try { segs = qualify(tc.text).segments; }
  catch (e) { return { status: 'CRASH', detail: `qualify: ${e.message}` }; }
  if (!Array.isArray(segs)) return { status: 'CRASH', detail: 'qualify returned non-array' };
  try { reading = readSensed({ segments: toCanonSegments(segs) }); }
  catch (e) { return { status: 'CRASH', detail: `readSensed: ${e.message}`, segs }; }
  if (!reading || !reading.strict) return { status: 'CRASH', detail: 'readSensed malformed', segs };

  const stages = new Set(segs.map((s) => s.sdc_stage));
  const hasBlur = BLUR.some((b) => stages.has(b));
  const blurSeg = segs.find((s) => BLUR.includes(s.sdc_stage)) || null;

  if (tc.expect == null) return { status: 'OBSERVED', segs, stages: [...stages], hasBlur, blurSeg };

  let ok;
  if (tc.expect === 'none') ok = !hasBlur;
  else ok = stages.has(tc.expect);
  if (ok && tc.held) ok = blurSeg && blurSeg.judgement_held_by === tc.held;

  let kind = 'pass';
  if (!ok) {
    if (tc.expect === 'none') kind = 'FALSE_POSITIVE';
    else if (!hasBlur) kind = 'FALSE_NEGATIVE';
    else kind = 'WRONG_TAG';
  }
  return { status: ok ? 'pass' : 'fail', kind, segs, stages: [...stages], blurSeg };
}

const byCat = new Map();
let crashes = 0;
const crashList = [];
for (const tc of cases) {
  const r = evaluate(tc);
  if (!byCat.has(tc.category)) byCat.set(tc.category, { n: 0, pass: 0, fail: 0, observed: 0, fails: [], kinds: {} });
  const c = byCat.get(tc.category);
  c.n++;
  if (r.status === 'CRASH') { crashes++; crashList.push({ text: tc.text, detail: r.detail }); c.fail++; }
  else if (r.status === 'OBSERVED') { c.observed++; if (c.fails.length < SAMPLES) c.fails.push({ text: tc.text, got: r.stages.join('+'), blur: r.hasBlur }); }
  else if (r.status === 'pass') c.pass++;
  else { c.fail++; c.kinds[r.kind] = (c.kinds[r.kind] || 0) + 1; if (c.fails.length < SAMPLES) c.fails.push({ text: tc.text, kind: r.kind, got: (r.blurSeg ? `${r.blurSeg.sdc_stage}/${r.blurSeg.judgement_held_by}` : r.stages.join('+')) }); }
}

const L = (c = '─') => c.repeat(82);
console.log(L('='));
console.log(`STRESS TEST — deterministic locator (qualify + readSensed)`);
console.log(`generated cases: ${cases.length}   ·   crashes: ${crashes}   ·   sample failures shown: ${SAMPLES}/category`);
console.log(L('='));

const LABELLED = [...byCat].filter(([, c]) => c.observed === 0);
const PROBES = [...byCat].filter(([, c]) => c.observed > 0);

console.log('\nLABELLED categories (have ground truth) — accuracy:');
let totN = 0, totPass = 0;
for (const [cat, c] of LABELLED) {
  totN += c.n; totPass += c.pass;
  const pct = ((c.pass / c.n) * 100).toFixed(1).padStart(5);
  const kinds = Object.entries(c.kinds).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`  ${pct}%  ${String(c.pass + '/' + c.n).padStart(8)}  ${cat.padEnd(20)} ${kinds}`);
  for (const f of c.fails) console.log(`           ✗ [${f.kind}] got ${f.got}  «${f.text}»`);
}
console.log(`  ${L('·').slice(0, 60)}`);
console.log(`  ${((totPass / totN) * 100).toFixed(1)}% overall labelled accuracy (${totPass}/${totN})`);

console.log('\nPROBE categories (behaviour observed, no hard pass/fail):');
for (const [cat, c] of PROBES) {
  console.log(`  ${cat} (${c.n}) — sampled:`);
  for (const f of c.fails) console.log(`           · blur=${f.blur}  got ${f.got}  «${f.text.length > 60 ? f.text.slice(0, 57) + '…' : f.text}»`);
}

if (crashes) {
  console.log(`\n${L()}\nCRASHES (${crashes}):`);
  for (const c of crashList.slice(0, 20)) console.log(`  ✗ ${c.detail}  «${c.text.length > 50 ? c.text.slice(0, 47) + '…' : c.text}»`);
}
console.log(L('='));
