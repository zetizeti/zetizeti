// signals.mjs — the "watch" layer of the progress subsystem (see ../../docs/concept/progress-signals.md).
//
// These signals are the SDC *code-judgement* layer: deterministic, inspectable, edge-deployable
// (v0.9.2: deterministic embedding-space geometry via embed.mjs — feature-hashed cosine, still no
// model, no network, fully reproducible; a neural MiniLM backend is optional behind the same interface).
// They describe the INQUIRY (the goal + the learner's own words), NEVER the inquirer, and never
// produce a score. There is NO nudge/steering here — watch before nudge. The values only drive
// the edge visualisation (how the form condenses), advisory per GOAL-AND-CURTAIN-LOGIC.md §2.

import { embedDet, cosine } from './embed.mjs';

const STOP = new Set(
  'the a an and or but to of in on is it im my me this that for with about how what when why do dont cant we us our you your they them their are be as at so just have has had not no yes if then than into out up off over'.split(' ')
);
// hedging (commitment ↓) — checked on the GOAL. Exported for the felt-shift event detector
// (lib/feltshift.mjs), which reuses the same lexicons so the two never drift apart.
export const HEDGE = ['maybe', 'perhaps', 'possibly', 'might', 'probably', 'somewhat', 'sort of', 'kind of', 'kinda', 'i think', 'i guess', 'not sure', 'unsure', 'a bit', 'i feel like', 'dunno', 'i suppose', "i'm not sure"];
// insight / realisation (the learner's OWN movement) — checked across their turns
export const INSIGHT = ['realise', 'realize', 'actually', 'i see', 'what i mean', "it's really", 'its really', 'the real', 'makes sense', 'i get it', 'the point is', "what i'm trying", 'what im trying', 'now i', 'i notice', 'turns out', 'oh,'];

const tokens = (s) => (String(s || '').toLowerCase().match(/[a-z0-9']+/g) || []);
export const content = (s) => tokens(s).filter((t) => t.length > 2 && !STOP.has(t));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// Deterministic embedding-space similarity in [0,1] — the successor to the old jaccard token-overlap
// (embed.mjs). The v0.9.2 Stalling-Index / edge-condensation foundation: cosine over feature-hashed
// vectors captures near-duplicate phrasing and shared stems that set-overlap missed.
const sim = (a, b) => { const s = cosine(embedDet(a), embedDet(b)); return s < 0 ? 0 : s; };
export function countPhrases(text, phrases) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  let n = 0;
  for (const p of phrases) if (t.includes(p)) n++;
  return n;
}

// specificity of the CURRENT goal: lexical richness + a concreteness nudge. "make it better" is
// thin (~1 content word); "let new users breathe before the app asks for anything" is rich.
function specificityOf(goal) {
  const c = content(goal);
  const richness = clamp01(new Set(c).size / 9);   // saturates ~9 distinct content words
  const concrete = /\d/.test(String(goal)) ? 0.12 : 0; // a number is a concrete specific
  return clamp01(richness + concrete);
}

// Compute the signal vector from the inquiry's own materials. All 0..1 except redraws/exchanges.
// stoneTurns = the interlocutor's OWN recent questions — read so we can see IT repeating (selfEcho),
// which is the "same question loop" a learner feels but the learner-side signals cannot detect.
export function computeSignals({ goal = '', lineage = [], studentTurns = [], stoneTurns = [], exchanges = 0 } = {}) {
  const g = goal || lineage[lineage.length - 1] || '';

  const specificity = specificityOf(g);

  // convergence: how much consecutive re-draws overlap (the edge settling). Neutral 0.5 if <2.
  let convergence = 0.5;
  if (lineage.length >= 2) {
    let sum = 0;
    for (let i = 1; i < lineage.length; i++) sum += sim(lineage[i - 1], lineage[i]);
    convergence = clamp01(sum / (lineage.length - 1));
  }

  // conviction: 1 − hedging density on the goal (steady vs trembling).
  const hedges = countPhrases(g, HEDGE);
  const conviction = clamp01(1 - hedges / Math.max(2, content(g).length / 2));

  // movement: the learner's own insight markers across their turns (hard to fake from outside).
  const insightHits = studentTurns.reduce((n, t) => n + countPhrases(t, INSIGHT), 0);
  const movement = clamp01(insightHits / 3);

  const redraws = Math.max(0, lineage.length - 1);

  // cycling: repetition-without-development — overlap between consecutive learner turns. DANGER:
  // identical to *productive dwelling*, so the nudge policy NEVER acts on this alone (§5).
  let cycling = 0;
  if (studentTurns.length >= 2) {
    const recent = studentTurns.slice(-3);
    let sum = 0, pairs = 0;
    for (let i = 1; i < recent.length; i++) { sum += sim(recent[i - 1], recent[i]); pairs++; }
    cycling = pairs ? clamp01(sum / pairs) : 0;
  }
  // drift: how far the current goal sits from the preliminary enquiry (the anchor). The nudge
  // policy suppresses any drift-nudge when the learner has just re-drawn — a re-draw is them
  // declaring a new anchor (§5, only the learner changes the topic). 0 when at/near the anchor.
  const enquiry = lineage[0] || studentTurns[0] || '';
  const drift = (enquiry && g) ? clamp01(1 - sim(enquiry, g)) : 0;

  // selfEcho: the STONE repeating ITSELF — repetition-without-development on the QUESTION side. This is
  // the learner's actual complaint ("going in the same question loop"): the mirror of `cycling`, pointed
  // at the interlocutor's own recent questions. Unlike `cycling` (which from outside is indistinguishable
  // from productive dwelling), an interlocutor echoing itself is never productive, so the nudge policy
  // may act on this ALONE (nudge.mjs §0). 0 when there aren't two stone turns to compare.
  let selfEcho = 0;
  if (stoneTurns.length >= 2) {
    const recent = stoneTurns.slice(-3);
    let sum = 0, pairs = 0;
    for (let i = 1; i < recent.length; i++) { sum += sim(recent[i - 1], recent[i]); pairs++; }
    selfEcho = pairs ? clamp01(sum / pairs) : 0;
  }

  // advancement: is NEW conceptual ground being covered? The fraction of the latest learner turn's
  // content words not seen in any earlier learner turn. Sustained-low = the enquiry is spinning, not
  // moving ("progress nahi ho raha tha"). This is code-side steering, NEVER a displayed score
  // (invariants #5/#6): it feeds the nudge, it is not surfaced as progress. Neutral 1 before there is
  // a prior turn to compare (an opening turn is, trivially, all new ground).
  let advancement = 1;
  if (studentTurns.length >= 2) {
    const prior = new Set();
    for (let i = 0; i < studentTurns.length - 1; i++) for (const t of content(studentTurns[i])) prior.add(t);
    const latest = content(studentTurns[studentTurns.length - 1]);
    if (latest.length) {
      let fresh = 0;
      for (const t of latest) if (!prior.has(t)) fresh++;
      advancement = clamp01(fresh / latest.length);
    }
  }

  // engagement: how much the inquiry has been *worked* — sustained turns form the edge even while
  // the wording is still rough. Saturates after ~7 exchanges. (This is what makes the canvas move
  // turn to turn, not only on a re-draw: the inquiry condenses as you stay with it.)
  const engagement = clamp01(exchanges / 7);

  // condensation: what the canvas uses to draw the cloud → edge. The edge forms as the goal gets
  // specific (and its re-draws settle) AND as the inquiry is sustained — so it moves each turn.
  const condensation = clamp01(0.5 * specificity + 0.2 * convergence + 0.3 * engagement);

  // feltShift — the enquiry-side edge-condensation INDICATOR (measuring-the-inquiry.md), v1: an honest
  // COMPOSITE of the already-validated signals, WATCH-SIDE ONLY — it drives nothing yet. The vague-to-
  // precise move, read off the learner's OWN words and never off them: genuine insight (movement — the
  // marker that separates sharpening from circling) over FRESH ground (advancement, so repetition can
  // never register as a shift), with a concrete edge (specificity). Gated to 0 without fresh ground. This
  // is the FIRST approximation; the rigorous version re-points He et al.'s closed-form information-gain
  // estimator at edge-vagueness (docs/ops/todo-inquiry-maths.md). Surfaced behind the curtain as an
  // observation about the inquiry, NEVER as a score (invariants #5/#6).
  const feltShift = (advancement >= 0.4)
    ? clamp01(0.5 * movement + 0.3 * advancement + 0.2 * specificity)
    : 0;

  return { specificity, convergence, conviction, movement, cycling, selfEcho, advancement, drift, redraws, engagement, condensation, feltShift };
}
