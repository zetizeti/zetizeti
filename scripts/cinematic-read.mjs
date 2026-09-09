// cinematic-read.mjs — 9 September 2026
//
// WHY THIS EXISTS. On 9 September the replay comparison showed a dialogue scoring well on every counter
// this project had — longest rut 4, five breaches, no tells, eleven distinct anchors, coverage 8 of 13 —
// while the probe's own prose notes said of the same run: "takes nothing the last answer added", "this
// question could have been asked at any point", "nothing new entered here at all". Open, varied,
// unbreached, and inert. **Every number was blind to it.** The counters measure whether the questioning
// misbehaves. Nothing measured whether the dialogue was worth being in.
//
// So this reads a dialogue the way a scene of dialogue is read. Two frames, and they are different
// questions, which is why there is no single score here and never will be:
//
//   ARTIFACT   — the transcript as a made thing, read after the fact, the way a scene is read on the page.
//   EXPERIENCE — what it was to be the person answering: whether there was room, and whether it was taken.
//
// The frame is Prayas's own, from MoVD *Conversation* (19 September 2014): "A contribution is not valuable
// by default. That is where the script comes in. If conversations were to be scripted dialogue and not mere
// speech with an unspecified intensity, then they could actually matter more." And, for the experience half,
// its closing question — "who spoke? The writer or the actor?" — with its answer that if an actor feels
// close to an experience someone else scripted, that closeness cannot be dismissed. Here the tool writes
// and the learner acts.
//
// GROUNDING, each axis to the source it comes from. Nothing here is invented craft.
//   A1 uptake        Nystrand et al. 2003 (Discourse Processes) — authentic questions and UPTAKE as dialogic
//                    bids, over 33,000 coded questions; Demszky et al. 2021 (ACL) formalise uptake
//                    computationally and find repetition-based baselines weaker than they look. Howe et al.
//                    2019 (JLS) find elaboration and querying of previous contributions associated with
//                    curriculum mastery. This is the axis that would have caught 20260729-a.
//   A2 obliqueness   Sol Stein's four questions of dialogue; Robert Towne on Nicholson — "he would not
//                    improvise on the nose… most scenes are rarely about what the subject matter is";
//                    McKee: "on the nose dialogue is dialogue without a subtext".
//   A3 periodic      McKee on the periodic sentence: withhold the key word until the end, so the listener
//                    cannot know the meaning until the last word. A line whose meaning completes early
//                    lets attention go.
//   E1 scope         🔴 MEASURED AND FAILED, 9 September 2026 — kept here as a negative result, per the rule
//                    that a mechanism found null belongs in the record or it gets proposed again. Yarmel 2026
//                    (Educational Theory) gives an inquiry question a GRAMMATICAL SCOPE — the extent to which
//                    its grammar constrains what could count as an answer — failing at BOTH ends, where every
//                    guard this project has catches only the narrow one. The idea is right and this
//                    OPERATIONALISATION of the wide end is not: "no purchase on the learner's own material"
//                    fired on 0-4% of turns across 58 runs, sd 0.7, saying the same thing about every dialogue.
//                    It is not a finding that zetizeti's questions are never too wide; it is a lexical proxy
//                    that cannot see width. Rebuilding it needs a real measure of answer-space, not word
//                    overlap. The axis is computed and reported so the zero stays visible rather than absent.
//   E2 transformation Heritage 2010 (Language in Society) — TRANSFORMATIVE ANSWERS, where the recipient
//                    retroactively adjusts the question: term transformations resist its design, agenda
//                    transformations resist its agenda and resist more strongly. Evidence that room existed
//                    AND was usable. Read as a property of the question, never as a grade of the person.
//   E3 room          ⚠️ NOT NEW, and reported only for company: this counts what `PREAMBLE_TELLS` and the
//                    interpretive-preamble guard already refuse at delivery, so it is an existing enforcement
//                    re-read, not a second opinion. It correlates 0.42 with breaches for that reason.
//                    Peditto: "leave something for the actors to play; don't have your characters speak
//                    everything out." Seger and every source agree on the failure: never explain your own
//                    subtext. That is this project's preamble guard, arriving from film craft.
//
// WHAT EARNED ITS PLACE, measured over 58 runs on 9 September 2026 — 20 real AI Club dialogues, the replay
// runs, and the older probe runs. Spearman against the existing counters, and spread across all runs:
//   inert / uptake  🟢 rho -0.05 vs longest-rut and 0.07 vs breaches — it is measuring something NO existing
//                   counter touches — and the widest spread of any axis here (5-63%, sd 17.8). On the
//                   controlled pairs, where the same fixture is replayed on two builds so the learner's half
//                   is identical, it found what the old counters cannot see: v1.4.0 took fixture `d` from rut
//                   10 to 4 and breaches 11 to 7 while uptake went 42% to 37%, and the periodic rut-invite
//                   took `s` from rut 14 to 7 while inert went 13% to 29%. **THE RUT-INVITE TRADES UPTAKE FOR
//                   RUT** — it breaks a rut by handing the subject back, and a question that hands the subject
//                   back is by construction one that takes less of what the learner just said. Every old
//                   counter sees the benefit and none sees the cost.
//   on-the-nose     🔵 modest spread (0-20%, sd 5.1), near-orthogonal (rho -0.01 / 0.27). A reading, not a gate.
//   early-completing 🔵 spread 0-20%, sd 5.5, orthogonal — and validated against nothing. A reading.
//   own% / agenda   🔵 own% has a narrow band (47-82%, sd 7.1); agenda correlates 0.62 with breaches, so it is
//                   partly the guard again. Readings.
// ⚠️ **THE CONFOUND, STATED RATHER THAN BURIED.** The older probe runs read mean uptake 9% against 41% for the
//    real dialogues, which looks like the axis detecting the period when the probe fed the route its own reply
//    twice. It cannot be read that way: those runs differ on TWO things at once — a play-acted student as well
//    as the broken probe — and nothing here separates them. The pre-fix 9 September runs, which would have
//    made the comparison clean, were never written to disk, because the probe crashed before its write step.
//    The controlled same-fixture pairs above are the evidence; that split is not.
//
// 🔴 NO COMPOSITE, EVER. Six axes, reported apart. "A contribution is not valuable by default" cuts against
//    summing them, and the existing probe already refuses it in its own words: notes do not average.
// ⚠️ EVERY AXIS IS A PROXY AND SAYS SO. These are lexical and structural approximations of craft judgements
//    a person makes by reading. They are built to be MORE discerning than counting breaches, not to be right.
//
//   node scripts/cinematic-read.mjs <run.json> [more.json ...]
//   node scripts/cinematic-read.mjs --all          every enquiry-conversation run under docs/ops/flow-probe-runs
//   node scripts/cinematic-read.mjs --compare      the same, as a table beside the old counters

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { NONMATERIAL } from '../lib/arc.mjs';

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const RUNS = join(APP, '..', 'docs', 'ops', 'flow-probe-runs');

const words = (s) => String(s || '').toLowerCase().match(/[a-z][a-z'-]+/g) || [];
const content = (s) => words(s).filter((w) => w.length > 2 && !NONMATERIAL.has(w));
const setOf = (s) => new Set(content(s));

// ── A2. On the nose: the question names the mental act it wants instead of asking for the thing.
// Towne's "he would not improvise on the nose — he'd talk around the problem".
const NAMES_THE_ACT = /\b(think about|consider|reflect on|describe|define|explain|articulate|clarify|elaborate on|identify|imagine|understand|unpack|explore|examine|analyse|analyze|what do you mean by|in what sense)\b/i;

// ── A3. Periodic: does the line withhold its key word? A question ending in a function-word tail has
// completed its meaning before it stops. McKee's "the sentence you cannot know the meaning of until you
// hear the very last word".
const TAIL = /\b(it|them|that|this|one|things?|way|ways|there|here|now|then|too|as well|at all|about it|for you|to you|of it)\s*\??$/i;

// ── E1. Too wide: a question with no purchase on anything the learner has actually put on the table.
// Yarmel's grammatical scope failing at the WIDE end, which no guard here has ever looked at.
const readOne = (run) => {
  const rows = (run.rows || []).filter((r) => (r.question || '').trim());
  const goal = setOf(run.edge || '');
  const out = { n: rows.length, inert: 0, onNose: 0, early: 0, wide: 0, narrowish: 0, agenda: 0, deposited: 0,
                uptakes: [], owns: [], notes: [] };
  if (!rows.length) return out;

  rows.forEach((r, i) => {
    const q = r.question || '';
    const prevA = i > 0 ? (rows[i - 1].reply || '') : '';
    const prevQ = i > 0 ? (rows[i - 1].question || '') : '';
    const qs = setOf(q), pa = setOf(prevA), pq = setOf(prevQ);

    // A1 UPTAKE — how much of what the learner JUST ADDED does the question pick up?
    // 🔴 Novelty is measured against the WHOLE prior dialogue, both halves — the probe's own definition,
    //    adopted here because the first draft of this file used "not in the previous question", which is
    //    far too permissive: with a long answer there is nearly always some overlap, and the axis reported
    //    0% inert on the very run whose notes read "takes nothing the last answer added". Calibrating a new
    //    instrument against an existing one that already works is cheaper than trusting it.
    // 🔴 A turn where the learner added nothing new is SKIPPED, not counted against the question. That is
    //    their turn, not its fault, and counting it would be a measure of the learner (invariant #7).
    // ⚠️ Reported as a RATIO as well as a rate, which is the part that is new: a question picking up one of
    //    eleven new words satisfies a binary test and is barely taking anything up.
    if (i > 0) {
      const priorAll = new Set(rows.slice(0, i - 1).flatMap((x) => [...content(x.question), ...content(x.reply)]));
      const added = [...new Set(content(prevA))].filter((w) => !priorAll.has(w) && !goal.has(w));
      if (added.length) {
        const taken = added.filter((w) => qs.has(w));
        out.uptakes.push(taken.length / added.length);
        if (!taken.length) { out.inert++; out.notes.push(`turn ${i + 1}  inert — takes none of the ${added.length} thing(s) this answer added (${added.slice(0, 3).join(', ')})`); }
      }
    }

    // A2 ON THE NOSE
    if (NAMES_THE_ACT.test(q)) { out.onNose++; out.notes.push(`turn ${i + 1}  on the nose — names the thinking it wants`); }

    // A3 EARLY-COMPLETING LINE
    if (TAIL.test(q.trim())) out.early++;

    // E1 SCOPE, both ends. Wide: nothing of the learner's own material in it. Narrow: very short and
    // built on the goal's vocabulary alone, so it can only be answered inside the brief.
    const learnerOwned = [...qs].filter((w) => !goal.has(w));
    if (i > 0 && [...qs].filter((w) => pa.has(w)).length === 0 && learnerOwned.length < 3) out.wide++;
    if (content(q).length <= 4) out.narrowish++;

    // E2 TRANSFORMATION — did the answer adjust the question rather than fill it in? Heritage's two kinds.
    // Reported as the SHARE of the answer that is the learner's own material — neither the question's words
    // nor the brief's — because a count rewards long answers and says nothing about whether they had room.
    // ⚠️ This is the axis closest to measuring the learner rather than the question, and it is read the other
    //    way round on purpose: a question that leaves no room cannot produce a transforming answer. It is
    //    offline, never rendered, never in a prompt, and never shown to anybody being questioned.
    const a = r.reply || '';
    if (a.trim()) {
      const as = [...setOf(a)];
      if (as.length >= 4) {
        const own = as.filter((w) => !qs.has(w) && !goal.has(w));
        out.owns.push(own.length / as.length);
        if (!as.some((w) => qs.has(w)) && own.length >= 3) { out.agenda++; out.notes.push(`turn ${i + 1}  agenda transformed — the answer shares not one word with the question`); }
      }
    }

    // E3 ROOM — the question deposits a reading before asking, so there is nothing left to fill in.
    if (r.pre || r.tell) out.deposited++;
  });
  return out;
};

const pct = (k, n) => (n ? Math.round((100 * k) / n) : 0);
const mean = (xs) => (xs.length ? Math.round((100 * xs.reduce((a, b) => a + b, 0)) / xs.length) : 0);

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const wantAll = process.argv.includes('--all') || process.argv.includes('--compare');
const compare = process.argv.includes('--compare');
const list = wantAll
  ? readdirSync(RUNS).filter((f) => f.startsWith('enquiry-conversation-') && f.endsWith('.json')).map((f) => join(RUNS, f))
  : files;

if (!list.length) { console.error('usage: cinematic-read.mjs <run.json ...> | --all | --compare'); process.exit(2); }

const results = [];
for (const f of list) {
  let run; try { run = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const r = readOne(run);
  if (!r.n) continue;
  results.push({ file: basename(f), label: (run.replay ? 'replay:' + basename(run.replay) : run.source || '?'), run, r });
}

if (compare) {
  console.log('\nCINEMATIC READ vs THE OLD COUNTERS — every axis a percentage of delivered questions\n');
  console.log('                                   │        ARTIFACT        │      EXPERIENCE       │   OLD COUNTERS');
  console.log('run                            n   │ inert  uptk  nose  early │ wide  own%  agenda  deposit │ rut  breach');
  console.log('───────────────────────────────────┼──────────────────────────┼─────────────────────────────┼──────────────');
  for (const { file, run, r } of results.sort((a, b) => (b.r.inert / (b.r.uptakes.length || 1)) - (a.r.inert / (a.r.uptakes.length || 1)))) {
    const s = run.summary || {};
    const id = file.replace('enquiry-conversation-', '').replace('.json', '').slice(0, 22);
    console.log(
      `${id.padEnd(23)} ${String(r.n).padStart(3)}   │ ${String(pct(r.inert, r.uptakes.length)).padStart(4)}% ${String(mean(r.uptakes)).padStart(4)}% ${String(pct(r.onNose, r.n)).padStart(4)}% ${String(pct(r.early, r.n)).padStart(4)}%  │` +
      ` ${String(pct(r.wide, r.n)).padStart(3)}% ${String(mean(r.owns)).padStart(4)}% ${String(pct(r.agenda, r.n)).padStart(6)}%  ${String(pct(r.deposited, r.n)).padStart(6)}% │` +
      ` ${String(s.longestRut ?? s.rut ?? '?').padStart(3)}  ${String(s.breaches ?? '?').padStart(4)}`);
  }
  console.log('\ninert   = the question takes NOTHING the previous answer added (uptake; Nystrand, Demszky)');
  console.log('nose    = names the thinking it wants instead of asking for the thing (Towne, McKee)');
  console.log('early   = the line completes its meaning before it ends (McKee, periodic sentence)');
  console.log('wide    = no purchase on the learner\'s own material (Yarmel, grammatical scope, wide end)');
  console.log('uptk    = mean SHARE of what the answer added that the next question picked up');
console.log('own%    = share of the answer that is the learner\'s own material, not the question\'s or the brief\'s (Heritage)');
  console.log('agenda  = the answer left the question\'s terms entirely — the strongest sign of room');
  console.log('deposit = a reading was deposited before the question (Peditto, Seger; this tool\'s own guard)');
  console.log('\n🔴 There is no total. Six axes, read apart. "A contribution is not valuable by default."');
} else {
  for (const { file, label, r } of results) {
    console.log(`\n${'═'.repeat(78)}\n${file}\n${label} · ${r.n} delivered questions\n${'─'.repeat(78)}`);
    console.log(`ARTIFACT     inert ${pct(r.inert, r.uptakes.length)}% of ${r.uptakes.length} answerable turns   mean uptake ${mean(r.uptakes)}%   on-the-nose ${pct(r.onNose, r.n)}%   early-completing ${pct(r.early, r.n)}%`);
    console.log(`EXPERIENCE   wide ${pct(r.wide, r.n)}%   learner's own material ${mean(r.owns)}%   agenda-transformed ${pct(r.agenda, r.n)}%   deposited ${pct(r.deposited, r.n)}%`);
    if (r.notes.length) { console.log('─'.repeat(78)); r.notes.slice(0, 14).forEach((n) => console.log('  ' + n)); if (r.notes.length > 14) console.log(`  … ${r.notes.length - 14} more`); }
  }
}
