// signals.mjs — the "watch" layer of the progress subsystem (see ../../docs/concept/progress-signals.md).
//
// These signals are the SDC *code-judgement* layer: deterministic, inspectable, edge-deployable
// (no model, no embeddings — v1 lexicons + token overlap; the doc's v2 swaps in embeddings).
// They describe the INQUIRY (the goal + the learner's own words), NEVER the inquirer, and never
// produce a score. There is NO nudge/steering here — watch before nudge. The values only drive
// the edge visualisation (how the form condenses), advisory per GOAL-AND-CURTAIN-LOGIC.md §2.

const STOP = new Set(
  'the a an and or but to of in on is it im my me this that for with about how what when why do dont cant we us our you your they them their are be as at so just have has had not no yes if then than into out up off over'.split(' ')
);
// hedging (commitment ↓) — checked on the GOAL
const HEDGE = ['maybe', 'perhaps', 'possibly', 'might', 'probably', 'somewhat', 'sort of', 'kind of', 'kinda', 'i think', 'i guess', 'not sure', 'unsure', 'a bit', 'i feel like', 'dunno', 'i suppose', "i'm not sure"];
// insight / realisation (the learner's OWN movement) — checked across their turns
const INSIGHT = ['realise', 'realize', 'actually', 'i see', 'what i mean', "it's really", 'its really', 'the real', 'makes sense', 'i get it', 'the point is', "what i'm trying", 'what im trying', 'now i', 'i notice', 'turns out', 'oh,'];

const tokens = (s) => (String(s || '').toLowerCase().match(/[a-z0-9']+/g) || []);
const content = (s) => tokens(s).filter((t) => t.length > 2 && !STOP.has(t));
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function countPhrases(text, phrases) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  let n = 0;
  for (const p of phrases) if (t.includes(p)) n++;
  return n;
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
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
export function computeSignals({ goal = '', lineage = [], studentTurns = [], exchanges = 0 } = {}) {
  const g = goal || lineage[lineage.length - 1] || '';

  const specificity = specificityOf(g);

  // convergence: how much consecutive re-draws overlap (the edge settling). Neutral 0.5 if <2.
  let convergence = 0.5;
  if (lineage.length >= 2) {
    let sum = 0;
    for (let i = 1; i < lineage.length; i++) sum += jaccard(content(lineage[i - 1]), content(lineage[i]));
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
    for (let i = 1; i < recent.length; i++) { sum += jaccard(content(recent[i - 1]), content(recent[i])); pairs++; }
    cycling = pairs ? clamp01(sum / pairs) : 0;
  }
  // drift: how far the current goal sits from the preliminary enquiry (the anchor). The nudge
  // policy suppresses any drift-nudge when the learner has just re-drawn — a re-draw is them
  // declaring a new anchor (§5, only the learner changes the topic). 0 when at/near the anchor.
  const enquiry = lineage[0] || studentTurns[0] || '';
  const drift = (enquiry && g) ? clamp01(1 - jaccard(content(enquiry), content(g))) : 0;

  // engagement: how much the inquiry has been *worked* — sustained turns form the edge even while
  // the wording is still rough. Saturates after ~7 exchanges. (This is what makes the canvas move
  // turn to turn, not only on a re-draw: the inquiry condenses as you stay with it.)
  const engagement = clamp01(exchanges / 7);

  // condensation: what the canvas uses to draw the cloud → edge. The edge forms as the goal gets
  // specific (and its re-draws settle) AND as the inquiry is sustained — so it moves each turn.
  const condensation = clamp01(0.5 * specificity + 0.2 * convergence + 0.3 * engagement);

  return { specificity, convergence, conviction, movement, cycling, drift, redraws, engagement, condensation };
}
