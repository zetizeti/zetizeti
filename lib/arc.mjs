// arc.mjs — the DYNAMIC arc of a Socratic enquiry: which line of questioning this turn is on.
//
// THE FAULT THIS ANSWERS (Siddhi, 26 Jul 2026: "this was asked many times, i got bored of answering
// again and again"). A 13-turn enquiry collapsed onto ONE axis from turn 6 and never left it. The
// selfEcho detector fired on eleven of those turns — this was never a failure to notice. It was a
// failure to have anywhere else to go: on the enquiry surface the *line of questioning* was chosen by
// the model, steered only by prose in the system prompt ("move the angle each turn"). An instruction
// addressed to the model that is doing the circling is not a rotation, in the same way a guard that
// only reports is not a guard. The criticism surface has had a real repertoire since 16 July
// (CRITICISM_POINTERS + pickCriticismPointer in dialogue.mjs); this is the enquiry surface's.
//
// WHY AN ARC AND NOT A CAROUSEL. A ring that changes subject every third turn fails as badly as a
// loop, only differently: the student is asked seven unrelated things instead of one thing seven
// times, and the tool reads as not listening. So the aims belong to MOVEMENTS with a direction —
//   locate  · what the idea is, for whom, in what real moment      (widening)
//   press   · what it rests on and where it stops                   (narrowing)
//   land    · what it becomes, and the learner's own sharper edge   (closing, then rising)
// The dialogue goes somewhere, which is the method's own standing requirement (CLAUDE.md: endless
// metaphor-development is the failure mode).
//
// WHY IT IS DYNAMIC, NOT SCHEDULED (Prayas, 27 Jul 2026: "the arc should be dynamic not static — for a
// 10 round chat the arc is 10, for a 5 round chat the arc is 5. It keeps growing"). The session is
// ephemeral and open-ended: the tool never knows how long a chat will run, so a proportional schedule
// ("turns 1–6 locate…") is not available to it — it would need to know the total in advance. The arc is
// therefore DRIVEN, not timed. Each aim is held while it is still yielding and released when it stops;
// each movement advances on readiness in the learner's own replies. A five-round chat traverses the
// early arc quickly because the evidence moves quickly; a twenty-round chat dwells. Nothing terminates:
// when 'land' is spent the lap rises and the arc re-enters 'locate' at a higher altitude, where each
// aim must take up material that arrived after its last visit. One lap spans roughly 6 to 40 turns.
//
// STATELESS. The service stores no conversation (the 11 July ephemeral pivot), so the arc cannot be
// remembered — it is REPLAYED from the transcript the client sends each turn. Same transcript, same
// position, always; there is no hidden state to drift. The replay's own features are cheap and
// deterministic — no model, no network. v0.10.2 briefly wired a semantic freshness series into this
// (lib/novelty.mjs) and UNWIRED it on measurement: it read a fluent restater as fresher than a genuine
// developer, inverting on the case it was built for. It is now a shadow reading only.
//
// INVARIANTS. An aim is a POSTURE — the KIND of question to ask — never a verdict about the learner
// (#7), never a score (#5/#6). The aim decides what kind of question; the learner's own words decide
// what it is about, which is why every aim ends by binding to a word they actually used (#1, Clean
// Language). The model composes the words; the code owns only the direction.

import { content, countPhrases, INSIGHT } from './signals.mjs';

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// How long one aim may hold. MIN: never abandon a line after a single question — a line needs at least
// two to open anything. MAX: the provenance cadence ("recalibrate direction every 3–4 exchanges"), and
// the criticism repertoire's budget. Calibrated to the LONGER end deliberately: until the learner can
// say "stay here" for themselves (`#stay`, v0.11.0), over-rotation has no in-session remedy, so the
// evidence must earn an early release rather than the clock forcing one.
export const AIM_MIN = 2;
export const AIM_MAX = 4;

// The aims. Each is a mode of asking, in the same voice as CRITICISM_POINTERS — an aim, not a script.
// Every one closes by binding the question to the learner's own words: without that binding a rotation
// becomes a questionnaire, which sustains twenty turns while being less relevant than the loop it
// replaced.
export const ENQUIRY_AIMS = [
  // ── locate — what the idea is, for whom, in what real moment ──────────────────────────────────
  { key: 'instance', movement: 'locate',
    aim: "Ask for ONE concrete instance: a single real moment, person, or case where this actually shows up. Not the general shape of it — one occasion. Use their own words for the thing, and ask when it last happened or where they saw it." },
  { key: 'stakes', movement: 'locate',
    aim: "Ask what is at stake: who is helped if this works, and what changes for that person. Name the person in their own terms. Not whether the idea is good — what it is FOR." },
  { key: 'origin', movement: 'locate',
    aim: "Ask what pulled them to this: what they noticed, or ran into, that made this worth doing. Take up one of their own words and ask where it came from." },

  // ── press — what it rests on and where it stops ────────────────────────────────────────────────
  { key: 'assumption', movement: 'press',
    aim: "Take ONE thing their last answer rests on but has not shown, quote it back in their exact words, and ask what would have to be true for it to hold." },
  { key: 'boundary', movement: 'press',
    aim: "Ask where this stops working: the case it does not cover, or the person it is not for. One specific case, in their own words — not a list of limitations." },
  { key: 'consequence', movement: 'press',
    aim: "Ask what follows one step further out: if this works as they describe, what then happens — to the people in it, or to the thing it is part of. A consequence, not a restatement." },
  { key: 'need-want', movement: 'press',
    aim: "Ask whether the people in their account NEED this or WANT it, and how they would tell the two apart in a real case. Use their own word for those people." },

  // ── land — what it becomes, and the learner's own sharper edge ────────────────────────────────
  { key: 'adjacent', movement: 'land',
    aim: "Ask about a neighbouring practice, field, or situation this touches — where else the same problem already lives, and what that neighbour does about it. A sideways question, not a critical one." },
  { key: 'next', movement: 'land',
    aim: "Ask what would have to be made, tried, or found out FIRST — the nearest concrete next move, in their own words. Not a plan; one move." },
  { key: 'redraw', movement: 'land',
    aim: "Invite them to say, in ONE sentence, what they are now trying to do — knowing what they did not know when they started. Ask for their sentence, never offer one." },
];

export const MOVEMENTS = ['locate', 'press', 'land'];
const aimsIn = (m) => ENQUIRY_AIMS.filter((a) => a.movement === m);
const byKey = (k) => ENQUIRY_AIMS.find((a) => a.key === k) || ENQUIRY_AIMS[0];

// A concrete instance has landed: a number, a time/place word, or the learner narrating a real
// occasion. Deliberately lexical and dumb — it decides only WHEN TO MOVE ON, never anything about the
// person, and a miss costs at most one extra turn on the same aim.
const CONCRETE = ['for example', 'for instance', 'last time', 'yesterday', 'when i', 'we had', 'i saw', 'i tried', 'once', 'in class', 'at work', 'a student', 'my friend', 'happened'];

// Per-reply features. Cheap, deterministic, and about the INQUIRY's material — never about the person.
//   fresh — content words in this reply seen in no earlier reply (the material still opening)
//   thin  — the reply contracting against the session's own median (the earliest legible sign that a
//           line is spent: Siddhi's replies fell from ~40 words to "it stays" and "clear cut")
//   insight / concrete — the learner's own movement markers
function features(studentTurns, semFresh = null) {
  const out = [];
  const seen = new Set();
  const lens = [];
  for (let i = 0; i < studentTurns.length; i++) {
    const c = content(studentTurns[i]);
    let fresh = 1;
    if (i > 0) {
      let n = 0;
      for (const w of c) if (!seen.has(w)) n++;
      fresh = c.length ? clamp01(n / c.length) : 0;
    }
    // (v0.10.2 wired a semantic reading in here and then unwired it on measurement — see novelty.mjs.
    //  `semFresh` is accepted and ignored: the shadow is recorded, the line release stays deterministic.)
    let thin = 0;
    if (i >= 2 && lens.length) {
      const sorted = [...lens].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      if (median > 0) thin = clamp01(1 - c.length / (0.6 * median));
    }
    const text = studentTurns[i];
    out.push({
      fresh,
      thin,
      insight: countPhrases(text, INSIGHT) > 0,
      concrete: countPhrases(text, CONCRETE) > 0 || /\d/.test(String(text)),
      empty: c.length === 0,
    });
    for (const w of c) seen.add(w);
    lens.push(c.length);
  }
  return out;
}

// One replay step: the learner's reply has just arrived on the current aim — does the line hold or move?
function step(st, f) {
  const held = st.held + 1;
  const spent = f.thin >= 0.5 || f.fresh < 0.25 || f.empty;   // the line has stopped yielding
  const alive = f.insight && !f.empty;                        // they just moved their own thinking
  const force = held >= AIM_MAX;
  const advance = force || (held >= AIM_MIN && spent && !alive);
  if (!advance) return { ...st, held };

  // The aim is released. Does the MOVEMENT also turn? It turns when this movement's aims are spent, or
  // early on readiness in the learner's own reply — a located instance opens the pressing; material
  // that has stopped yielding is the signal to stop pressing and start landing.
  const mine = aimsIn(st.movement);
  const idx = mine.findIndex((a) => a.key === st.aimKey);
  const visited = idx + 1;
  const last = idx >= mine.length - 1;
  const ready =
    (st.movement === 'locate' && visited >= 1 && f.concrete) ||
    (st.movement === 'press' && visited >= 2 && spent);

  if (!last && !ready) return { ...st, aimKey: mine[idx + 1].key, held: 0 };

  const mi = MOVEMENTS.indexOf(st.movement);
  if (mi < MOVEMENTS.length - 1) {
    const next = MOVEMENTS[mi + 1];
    return { ...st, movement: next, aimKey: aimsIn(next)[0].key, held: 0 };
  }
  // 'land' is spent — the arc does not end, it rises. A new lap re-enters 'locate' on ground the
  // enquiry has since covered, which is what lets a long conversation keep growing instead of looping
  // back through its own first questions.
  return { movement: 'locate', aimKey: aimsIn('locate')[0].key, held: 0, lap: st.lap + 1, lapStart: st.turn ?? 0 };
}

// Where is this enquiry, right now? A pure function of the LEARNER's turns.
//
// TWO THINGS OWN TWO THINGS (settled 27 Jul 2026, on the evidence of three 20-round runs). The arc owns
// the LINE of questioning and reads only the learner's material. The nudge layer owns the FORM of the
// question and reads only the stone's self-similarity. They were briefly crossed — `sustainedEcho` also
// released the arc's aim — and the runs showed why that is wrong twice over. First, `selfEcho` mostly
// measures the model's stock opener ("When you say X, what is the specific…"), which is a fact about
// the WORDING, not about whether the line is spent; using it to move the line rotates on the wrong
// evidence. Second, applying it as a current-turn override on top of a stateless replay made the arc
// NON-MONOTONE — the override advanced the aim on the turn it fired and vanished on the next, so the
// questioning stepped backwards (press → locate → press, observed in run B turns 9–11). An override
// that is not part of the replayed history cannot persist in a replay. Nothing is overridden now.
//
//   feltEvent — the one current-turn input, and it may only HOLD, never advance: the felt-shift detector
//               marked this turn, so the thread is demonstrably alive and the aim stands one more
//               question. A hold that is forgotten next turn merely delays; it cannot reverse. This is
//               the release valve that stops a rotation cutting across a landing (the 24 July false
//               positive).
//   lineage   — the learner's re-draws. A re-draw is them declaring a NEW edge, and only the learner
//               changes the topic (#5, the topic-authority rule the drift nudge already respects). So
//               the arc returns to LOCATING the new edge and the lap rises: continuing to press the old
//               line after someone has just said "actually, this is what I'm trying to do" is the tool
//               not listening. Replayable because a re-draw IS a student turn — the turn whose text is
//               the new lineage entry — so no state is needed to find it again.
export function readArc({ studentTurns = [], lineage = [], feltEvent = false, semFresh = null } = {}) {
  const feats = features(studentTurns, semFresh);
  const redraws = new Set(lineage.slice(1).map((g) => String(g || '').trim()).filter(Boolean));
  let st = { movement: 'locate', aimKey: aimsIn('locate')[0].key, held: 0, lap: 1, lapStart: 0 };
  for (let i = 0; i < feats.length; i++) {
    if (i > 0 && redraws.has(String(studentTurns[i] || '').trim())) {
      st = { movement: 'locate', aimKey: aimsIn('locate')[0].key, held: 0, lap: st.lap + 1, lapStart: i, turn: i + 1 };
      continue;
    }
    const hold = feltEvent && i === feats.length - 1 && st.held + 1 < AIM_MAX;
    st = { ...(hold ? { ...st, held: st.held + 1 } : step(st, feats[i])), turn: i + 1 };
  }

  const aim = byKey(st.aimKey);
  return { movement: st.movement, aimKey: aim.key, aim: aim.aim, lap: st.lap, held: st.held };
}

// ───────────────────────────── DWELL — persistence as heat (change 2, 28 Jul 2026) ─────────────────
// The inversion of `spent` above, and the reason it exists: `features()` reads a reply with few new
// content words as a line that has stopped yielding, so a learner who keeps returning to one thing is
// read as exhausted and rotated away from. Prayas, 28 Jul: *"the learner persisting with the same thing
// multiple times should be a signal — I think the student was searching for a way out, a breakthrough, not a
// browbeating."* Persistence and exhaustion produce an identical measurement, and the codebase already
// knows this (nudge.mjs: stuck and productive dwelling look identical alone). Dwell resolves the
// ambiguity the other way, deliberately: the cost of pressing a live thread one turn too long is far
// smaller than the cost of walking away from the thing the learner came for.
//
// What holds is the ANCHOR — the learner's own most-returned-to word. What moves is the APPROACH, and
// the approaches are not invented here: they are the moves already written in corpus/method/, which the
// July steering layer had no way to reach. Nothing about the person is computed; the anchor is a word
// they used and the approach is a way of asking.
// PRUNED FOR MEANING (28 Jul 2026, second pass). The first version rotated eight approaches on
// `studentTurns.length % 8`, and two of them PRESUPPOSE a property the anchor may not have: "whereabouts
// is it" assumes the thing has a location, and "what is it close to that it is not" assumes it has near
// neighbours. Applied to an abstraction on a clock, they produce sentences that sound deep and mean
// nothing — the rotation fired on turns 3, 11, 19, 27, 35 of the 28 July replay and produced, among
// others, *"where does that anxiety sit in your body?"* to a student who had just written "i have no
// idea". Prayas: *"this is gibberish. randomly poetic sounding things is weird."*
//
// The fault was not rotation as such. It was rotating through moves that carry assumptions. Every
// approach kept below is answerable about ANY noun a learner might use — a device, a feeling, a plan, a
// silence — so firing it on a counter cannot produce a category error. The two that could were removed
// rather than guarded by a classifier: a wrong classifier fails the same way, more quietly.
// RE-PRUNED ON EVIDENCE (29 Jul 2026). The first pruning removed the two approaches that presuppose a
// property ("whereabouts", "close to that it isn't") by reasoning alone. Measuring all six survivors
// across 1,938 pairs shows three more failing, and failing in a pattern worth naming:
//
//   what KIND of it this is      43% refused · reply −20% · insight 22%   ← worst of everything measured
//   what it makes POSSIBLE       34% refused · reply −10% · insight 40%
//   anything ELSE about it       27% refused · reply  −9% · insight 14%   ← lowest insight of anything
//   what happens BEFORE/after    23% refused · reply  −3% · insight 28%
//   what they would WANT         16% refused · reply  +5% · insight 48%   ← highest insight
//   what would have to be TRUE   15% refused · reply +12% · insight 44%   ← best on both
//
// The three that fail are the classic Clean Language felt-sense moves; the two that win treat the
// learner's material as a DESIGN PROPOSITION — something that could be true, something they intend.
// That is a finding about the method core, not just this list: the repertoire in
// corpus/method/clean-questioning.md was developed for therapeutic material, where "what kind of X is
// that X?" opens a felt sense. Asked of a technical object it produces 'what kind of "avoid" is that?'
// — measured, refused. Only the measured-good moves survive here; three approaches is enough, since
// ANCHOR_MAX holds any anchor for at most three turns.
export const APPROACHES = [
  'ask what would have to be TRUE for it to hold',
  'ask what they would WANT to have happen with it',
  // Reworded 30 Jul 2026. It used to read "ask what happens JUST BEFORE it, or just after" — an
  // instruction that offers the model an alternation, and the model duly handed the alternation on to
  // the learner: "does the vendor confirm the buyer is bluffing BEFORE OR AFTER the transaction is
  // recorded?", the last question of a real session and the one she stopped at. The two sides are the
  // approach's own menu to pick from, never the learner's. (The guard now refuses the menu form too —
  // both ends, because a steering line that can be misread will be.)
  'ask what happens JUST BEFORE it — or on a later turn, what happens just after; pick ONE side and ask about only that, never offering both in the same question',
  // Both added 29 Jul 2026, at a real student's request, and both are the propositional family the
  // 1,938-pair measurement favoured. PROVENANCE is her exact ask: "what made you validate this part —
  // is it acquired from information online, or insight gathered and understood from in-person work?
  // 'I have noticed' is way different than 'gathered insight'." GATHER answers her convergence
  // question — the redraw move the removed arc used to carry, now one approach among five.
  'ask how they KNOW it — what they noticed themselves, what they gathered from others, what they read — and which of those this part rests on',
  'invite them to say, in ONE sentence, what they are now trying to do — their sentence, never yours',
];

// ───────────────────────────── the learner declining to answer (28 Jul 2026) ───────────────────────
// Ten of the student's forty-one replies were not answers: "idk", "yeah", "i have no idea", a sentence that
// stops mid-clause. The stone built a full, elaborate question on top of every one — in the shipped
// build as much as in any variant — because nothing in the system distinguishes a reply from a refusal.
// That is where the gibberish came from: "yeah" became *"When you say 'yeah' to the idea that these
// constant sounds might be trapping the person, what is it about that trap that makes it worth
// exploring?"* A person hearing "idk" does not press the same door in a new grammar; they change footing.
//
// Deliberately CONSERVATIVE: only explicit declines match. A short reply is not a refusal — "anxiety" is
// one word and is an answer, and treating it as a decline would throw away the learner's best material.
const DECLINE = [
  /^(i )?(do ?n'?t|dont|don't) know\b/i, /^idk\b/i, /^no idea\b/i, /^i have no idea\b/i,
  /^(i'?m )?not sure\b/i, /^dunno\b/i, /^(i )?can'?t say\b/i, /^no clue\b/i,
  /^(yeah|yes|yep|ok|okay|hmm+|uh+|k)\b[.!]?$/i, /^maybe$/i, /^i guess( so)?$/i,
  /^(i )?(do ?n'?t|dont|don't) know how to (explain|say|put)/i,
];
export function isDecline(text = '') {
  const s = String(text).trim();
  if (!s) return true;
  return DECLINE.some((re) => re.test(s));
}

// When they decline, the question must reach for something they DID give. This returns the most recent
// substantive reply — their own concrete material, still in their own words — so the next question has
// somewhere real to stand instead of building on the refusal.
export function lastSubstantive(studentTurns = []) {
  for (let i = studentTurns.length - 2; i >= 0; i--) {
    const t = String(studentTurns[i] || '').trim();
    if (!isDecline(t) && content(t).length >= 3) return t;
  }
  return '';
}

// The anchor: the content word the learner has returned to across the most separate replies (ties broken
// by total use). Deliberately lexical and dumb, like CONCRETE above — it selects a word to stay with, and
// a miss costs one turn spent on their second-most-live word rather than their first.
// The two removed approaches, kept ONLY so the meaning fix can be measured against what it replaced
// under identical conditions (flow-probe variant M0). Not used by any shipped path.
export const LEGACY_APPROACHES = [
  APPROACHES[0], APPROACHES[1],
  'ask WHEREABOUTS it is — where it sits, what is around it',
  APPROACHES[2], APPROACHES[3],
  'ask what it is CLOSE TO that it is not — the near neighbour it gets confused with',
  APPROACHES[4], APPROACHES[5],
];

// NONMATERIAL — hedge, negation-fragment and meta-conversation vocabulary, excluded wherever a single
// word is promoted to a load-bearing role (the dwell anchor, a join's carried words). Round-4 traces
// showed dwell anchoring on "don't" and "doesn't" — the learner's resistance words recur heavily, so
// recurrence-based selection mistakes them for the thing being discussed. Join hygiene and anchor
// hygiene share this one list (assoc.mjs imports it). NOT applied to retrieval or signals.
export const NONMATERIAL = new Set([
  'don', 'dont', 'didn', 'didnt', 'doesn', 'doesnt', 'isn', 'isnt', 'wasn', 'wasnt', 'aren', 'arent',
  'can', 'cant', 'cannot', 'won', 'wont', 'couldn', 'couldnt', 'wouldn', 'wouldnt', 'shouldn', 'shouldnt',
  'maybe', 'guess', 'know', 'knows', 'knew', 'think', 'thinks', 'thought', 'sure', 'really', 'actually',
  'kind', 'sort', 'idea', 'question', 'sense', 'say', 'said', 'saying', 'mean', 'means', 'meant',
  'talking', 'asking', 'asked', 'told', 'just', 'stuff', 'thing', 'things', 'something', 'anything',
  // 29 Jul 2026 — a real session anchored dwell on "more", "gets" and "where": comparatives, light
  // verbs and interrogatives recur exactly the way hedges do. Same list, same reason.
  'more', 'most', 'less', 'least', 'gets', 'get', 'got', 'goes', 'going', 'went', 'keep', 'keeps',
  'kept', 'still', 'also', 'even', 'much', 'many', 'way', 'ways', 'part', 'parts', 'lot', 'lots',
  'well', 'back', 'around', 'where', 'here', 'other', 'others', 'another', 'every', 'both', 'each',
  'take', 'takes', 'took', 'make', 'give', 'gives', 'gave', 'comes', 'come', 'came', 'want', 'wants',
]);

// ANCHOR_MAX — how many consecutive turns one anchor may hold before it must give way to the next-best.
// Dwell without a bound is just the loop again wearing the opposite argument. Measured 28 Jul against a
// play-acted student permitted to say so: three separate complaints of "i don't get why you're asking
// the same thing twice" / "are you asking me that twice on purpose?" in a single 3×20 run. Holding the
// learner's material still is right; holding it forever is the fault the whole enquiry-loopiness thread
// has been about. Recomputed statelessly by replaying the anchor over prefixes, so no state is stored.
export const ANCHOR_MAX = 3;

// TRAVERSAL, not orbit (29 Jul 2026 — Siddhi: "take a feature and probe on it further, then after 2
// questions ask for another feature that may help the users, so there is less chance of circling
// back"; Prayas: a feature "means something concrete, not a product-feature-level thing"). The
// learner's concrete things ARE their material words once hedges are filtered — her transcript's
// candidates are storefront, flyers, orders, logistics, analytics, chat, ads. What changes is the
// SELECTION: pure recurrence re-orbits the hottest word (her sessions orbited "visibility" while
// "analytics" and "commission" never got a question). Among live candidates the pick now prefers the
// LEAST-ASKED-ABOUT — coverage read from the stone's own past questions, replayed statelessly like
// everything else. Persistence still wins admission (a thing must return to be a candidate, and a
// spent thing revives on fresh mention); coverage decides ORDER.
function pickAnchor(turns, minReturns, exclude, stones = []) {
  const recent = turns.slice(-6);
  const turnsWith = new Map();
  const uses = new Map();
  for (const t of recent) {
    const c = content(t).filter((w) => !NONMATERIAL.has(w));   // an anchor must be material, never a hedge
    for (const w of new Set(c)) turnsWith.set(w, (turnsWith.get(w) || 0) + 1);
    for (const w of c) uses.set(w, (uses.get(w) || 0) + 1);
  }
  const stoneSets = stones.map((q) => new Set(content(q)));
  const coverage = (w) => stoneSets.reduce((a, qs) => a + (qs.has(w) ? 1 : 0), 0);
  let bestPick = null;
  for (const [w, n] of turnsWith) {
    if (n < minReturns || exclude.has(w)) continue;
    const cand = { anchor: w, returns: n, uses: uses.get(w) || 0, cov: coverage(w) };
    if (!bestPick
        || cand.cov < bestPick.cov
        || (cand.cov === bestPick.cov && (cand.returns > bestPick.returns
            || (cand.returns === bestPick.returns && cand.uses > bestPick.uses)))) bestPick = cand;
  }
  return bestPick ? { anchor: bestPick.anchor, returns: bestPick.returns } : null;
}

export function readDwell({ studentTurns = [], minReturns = 2, legacy = false, stoneTurns = [], goal = '' } = {}) {
  const stonesAt = (m) => stoneTurns.slice(0, Math.max(0, m - 1));
  // THE THEME LEDGER (29 Jul 2026 — Siddhi: "keeping an invisible list of themes already asked about,
  // and don't re-enter one unless there's a genuinely new perspective"). An anchor that has served its
  // full ANCHOR_MAX is SPENT for the rest of the session — not merely rotated away from — unless the
  // learner's LATEST reply takes it up again, which is the genuinely-new-perspective case and theirs to
  // signal. Replayed statelessly over prefixes like everything else here: walk the transcript, retire
  // each anchor as it completes its budget, and let a fresh mention re-admit it.
  const lastWords = new Set(content(studentTurns[studentTurns.length - 1] || ''));
  const spent = new Set();
  for (let m = 2; m < studentTurns.length; m++) {
    const active = new Set([...spent].filter((w) => !lastWords.has(w)));
    const a = pickAnchor(studentTurns.slice(0, m), minReturns, active, stonesAt(m));
    if (!a) continue;
    let held = 1;
    for (let i = m - 1; i > 1 && held <= ANCHOR_MAX; i--) {
      const prev = pickAnchor(studentTurns.slice(0, i), minReturns, active, stonesAt(i));
      if (!prev || prev.anchor !== a.anchor) break;
      held++;
    }
    if (held >= ANCHOR_MAX) spent.add(a.anchor);
  }
  const exclude = new Set([...spent].filter((w) => !lastWords.has(w)));
  let picked = pickAnchor(studentTurns, minReturns, exclude, stoneTurns);
  // How many turns running has this anchor already held? Replay the same choice over the prefixes.
  while (picked) {
    let held = 1;
    for (let i = studentTurns.length - 1; i > 0 && held <= ANCHOR_MAX; i--) {
      const prev = pickAnchor(studentTurns.slice(0, i), minReturns, exclude, stonesAt(i));
      if (!prev || prev.anchor !== picked.anchor) break;
      held++;
    }
    if (held <= ANCHOR_MAX) break;
    exclude.add(picked.anchor);              // spent its budget — hand over to the next live word
    picked = pickAnchor(studentTurns, minReturns, exclude, stoneTurns);
  }
  // NOTHING LIVE TO ANCHOR ON. Two distinct cases, both from the goal (the proposal's own words):
  //   tether — a concrete thing named in the GOAL that no question has touched yet: anchor there
  //            (early conversations, and the tether against drifting into the person's life);
  //   invite — every concrete thing named so far, goal included, has had its questions: rather than
  //            re-enter one, hand the naming to the learner — "ask for another feature that may help
  //            the users" is her spec, and only the learner adds to the idea's parts (topic authority).
  if (!picked) {
    const stoneSets = stoneTurns.map((q) => new Set(content(q)));
    const cov = (w) => stoneSets.reduce((a, qs) => a + (qs.has(w) ? 1 : 0), 0);
    const goalWords = [...new Set(content(goal).filter((w) => !NONMATERIAL.has(w)))];
    const untouched = goalWords.filter((w) => cov(w) === 0 && !exclude.has(w));
    if (untouched.length) {
      return { anchor: untouched[0], returns: 1,
               approach: APPROACHES[Math.max(0, studentTurns.length - 1) % APPROACHES.length] };
    }
    if (studentTurns.length >= 6 && goalWords.length) return { invite: true };
    return null;
  }
  const { anchor, returns: best } = picked;
  // The approach turns every turn, so the same anchor is never approached the same way twice running.
  const set = legacy ? LEGACY_APPROACHES : APPROACHES;
  return { anchor, returns: best, approach: set[Math.max(0, studentTurns.length - 1) % set.length] };
}

// ───────────────────────────── the learner correcting a reading (28 Jul 2026, round 4) ─────────────
// Jung's association experiment logged the disturbed REPRODUCTION — the stimulus mis-heard, the reply
// the subject could not repeat back — as a complex indicator in its own right. The dialogue analogue is
// the learner correcting the stone's reading: "that's not what i meant", "i didn't say that", "you
// asked that twice". Round-3 transcripts show what happens when nothing detects this: the stone
// re-asserted its own misreading straight after the learner refused it ("registered by the space"), and
// re-asked a question the learner had just called a repeat. A correction is DEFENDED material — the
// learner cares enough to police the boundary — so it counts toward charge (assoc.mjs), but the
// correcting turn itself is never pressed on: the correction is authoritative, the same topic authority
// the redirect rule honours. Conservative marker phrases only, the DECLINE policy: a false positive
// re-anchors an enquiry the learner never asked to move.
const CORRECTION = [
  /^\s*(what\?+|huh\??)\s*[,.!]?\s*$/i, /^\s*(what\?+|huh\??)[\s,.!]/i,
  /\bnot what i (meant|said)\b/i,
  /\bi did ?n'?t say\b/i,
  /\b(do ?n'?t|don'?t|dont) (get|understand|follow) (the|that|this|your) question\b/i,
  /\b(that|this|your question) (just )?(does ?n'?t|doesn'?t|does not) make (any )?sense\b(?!\s+to\s)/i,
  /\bmakes no sense\b/i,
  /\b(you('ve| have)?|u) (already )?asked (me )?(that|this|the same)\b/i,
  /\basking (me )?the same (thing|question)\b/i, /\bsame (thing|question) (twice|again)\b/i,
  /^\s*i (already )?told you\b/i,
  /\bwhy (are you|do you keep) asking\b/i,
  /\baren'?t related\b/i, /\bnot related like that\b/i,
];
export function isCorrection(text = '') {
  const s = String(text);
  return CORRECTION.some((re) => re.test(s));
}

// ───────────────────────────── the learner's own redirect (change 4, 28 Jul 2026) ──────────────────
// Invariant #5 gives the learner topic authority, and the code honoured it only through `lineage` — an
// explicit UI re-draw. A student who simply SAYS it held none. the student, turn 20: *"this is going out of
// context to the idea - lets move back to it and disccuss about it"*, which passed through as an ordinary
// reply while the arc went on pressing the same aim for two more turns. This reads the sentence.
// Conservative by construction: it must match a redirect PHRASE, not merely a negative word, because a
// false positive re-anchors an enquiry the learner never asked to move.
const REDIRECT = [
  /\b(lets?|let us)\s+(move|go|come|get)\s+(back|on)\b/i,
  /\b(going|getting|this is)\s+(out of|off)\s+(context|topic|track)\b/i,
  /\bback to (the|my)\s+(idea|project|point|question|topic)\b/i,
  /\b(that|this) ?('s| is)? not what i (mean|meant|asked|said)\b/i,
  /\b(stop|quit) asking\b/i,
  /\b(you|we) (are|keep) (asking|going) (the same|in circles|round)\b/i,
  /\bmove (on|onto|to) (the )?next\b/i,
];
export function isRedirect(text = '') {
  const s = String(text);
  return REDIRECT.some((re) => re.test(s));
}

// The aim as prompt material. On a second or later lap the aim carries the altitude rule: an aim
// re-entered must take up material that arrived AFTER its last visit, so the arc rises rather than
// repeating its own first questions.
export function aimBlock(arc) {
  if (!arc || !arc.aim) return '';
  const lap = arc.lap > 1
    ? `\nThis line has been visited before in this conversation. Do NOT re-ask what was already asked: take up material the learner has introduced SINCE — their newer words, not their opening ones.`
    : '';
  return `\n[LINE OF QUESTIONING for this turn — the KIND of question to ask, NOT a verdict about the learner. Ask in THIS direction, in the learner's own words: ${arc.aim.trim()}${lap}]\n`;
}
