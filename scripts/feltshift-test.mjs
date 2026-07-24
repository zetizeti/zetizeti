#!/usr/bin/env node
// feltshift-test.mjs — calibration + validation harness for the felt-shift event detector
// (lib/feltshift.mjs v3: item-coverage SEM channel + LEX channel), on NEURAL word embeddings.
//
// Four scripted scenarios, each targeting a failure mode that killed an earlier cut:
//   1. SHARPENING     — expect SEM on the causal-material turn (2), LEX on the crystallisation (4).
//   2. CIRCLING       — expect NO events (repeated words are exactly covered; paraphrases near-covered).
//   3. DRIFT          — new words but OFF the edge — expect NO events (edge-relevance gates the gain).
//   4. SHARPENING #2  — a different domain (typeface), so thresholds aren't overfitted to one text.
//
//   node scripts/feltshift-test.mjs

import { embedNeural, neuralReady } from '../lib/embed.mjs';
import { readFeltShifts, itemWords } from '../lib/feltshift.mjs';

const scenarios = [
  {
    name: 'SHARPENING — expect SEM at 2, LEX at 4',
    goal: 'make my app onboarding less annoying',
    turns: [
      'onboarding feels annoying and people drop off',
      'actually i think the sign-up form scares people, it asks for too much before they see any value',
      'right, so maybe let them try the core thing first and ask for details later',
      "yeah the real issue is i'm asking for commitment before i've shown them why it's worth it",
    ],
  },
  {
    name: 'CIRCLING — expect NO events',
    goal: 'make my app onboarding less annoying',
    turns: [
      'i want to make onboarding less annoying',
      'like it just feels annoying and too long',
      'yeah its annoying, too many steps i guess',
      'i dunno, its just annoying and people drop off',
      'annoying, the steps are annoying, thats it',
    ],
  },
  {
    name: 'DRIFT — new ground OFF the edge — expect NO events',
    goal: 'make my app onboarding less annoying',
    turns: [
      'the onboarding is annoying i guess',
      'also i have been thinking about the poster for the exhibition',
      'a serif typeface would feel more serious for it',
      'the venue lighting is quite dim so the poster needs contrast',
    ],
  },
  {
    name: 'SHARPENING #2 (typeface) — expect SEM at 2, LEX at 4',
    goal: 'choose a typeface for my exhibition poster',
    turns: [
      'i cant decide on a typeface for the poster',
      'the venue is a converted mill, so the type could feel industrial and rough',
      'so a grotesque with some roughness might fit the space',
      'the real question is whether the type should match the building or the artwork',
    ],
  },
];

async function itemsOf(text) {
  const out = [];
  for (const w of itemWords(text)) out.push({ w, embed: await embedNeural(w) });
  return out;
}

let headerShown = false;
for (const sc of scenarios) {
  const goalEmbed = await embedNeural(sc.goal);
  if (!headerShown) {                       // check AFTER the first embed — neuralReady is set lazily
    console.log(`\nfelt-shift detector v3 — item-coverage + lexical settling  ${neuralReady ? '(neural)' : '(⚠ DETERMINISTIC FALLBACK — numbers not valid for calibration)'}`);
    headerShown = true;
  }
  const goalItems = await itemsOf(sc.goal);
  const sequence = [];
  for (const t of sc.turns) sequence.push({ score: true, text: t, embed: await embedNeural(t), items: await itemsOf(t) });
  const { turns, totalGain } = readFeltShifts({ goalEmbed, goalItems, sequence });
  console.log(`\n\x1b[1m${sc.name}\x1b[0m   goal: "${sc.goal}"   totalGain ${totalGain}`);
  turns.forEach((r, i) => {
    const ev = r.semEvent ? ' \x1b[35m◄ SEM shift\x1b[0m' : r.lexEvent ? ' \x1b[33m◄ LEX shift\x1b[0m' : '';
    const words = r.newWords.length ? `  \x1b[36m[${r.newWords.map((n) => `${n.w} ${n.novelty}`).join(' · ')}]\x1b[0m` : '';
    console.log(`  semGain ${r.semGain.toFixed(2)} · rel ${r.rel.toFixed(2)}${ev}${words}`);
    console.log(`      \x1b[2m${sc.turns[i].slice(0, 74)}\x1b[0m`);
  });
}
console.log('');
