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

// ───────────────────────── THE LEARNER REPEATING THEMSELVES (17 August 2026) ────────────────────────
// From a real student's session (private record in docs/ops/): nineteen questions, the last seven inside
// one narrow patch of the idea, and TWICE the student answered with a reply byte-identical to the one
// before it. They never complained. `isCorrection` catches somebody who SAYS "you asked that twice" and
// `isRedirect` somebody who says "let's move back" — both require a student willing to say so, and every
// fixture this project owns is a student who said so. This one said nothing, repeated themselves, and then
// stopped answering, while every instrument read the session as healthy.
// Worse than invisible: `pickAnchor` counts recurrence across the last six turns, so a repeated sentence
// RAISES the heat on exactly the words already being pressed. The comment above DWELL says persistence and
// exhaustion produce an identical measurement and resolves it toward pressing; here the discriminator sat
// in the data in its strongest possible form and nothing read it.
//
// 🔴 MEASURED BEFORE IT WAS WRITTEN, on all four real fixtures — 87 replies, both students the two-student
// rule names: ZERO consecutive exact repeats, ZERO token-identical pairs. So this fires nowhere in any
// session anybody has, and cannot overcorrect for her at their expense. That is the two-student rule
// discharged by construction rather than by argument, which is the only reason it ships in one pass.
// ⚠️ It is deliberately NOT a similarity measure. A repeat is the SAME words, not few new ones — the
// terse student's replies are new-word-poor constantly and must never be rotated away from on that basis
// (the 28 July finding: walking away from a live thread costs more than pressing it one turn too long).
// Two forms only: normalised equality, and identical token SETS for a reordered restatement.
const normaliseReply = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function isRepeatOf(cur, prev) {
  const a = normaliseReply(cur), b = normaliseReply(prev);
  if (!a || !b) return false;
  if (a === b) return true;
  const sa = new Set(a.split(' ')), sb = new Set(b.split(' '));
  if (sa.size < 4 || sa.size !== sb.size) return false;      // too short to distinguish restatement from idiom
  for (const w of sa) if (!sb.has(w)) return false;
  return true;
}
/** Did the learner just answer with the reply they had already given? Reads the last two student turns. */
export function readRepeat(studentTurns = []) {
  const n = studentTurns.length;
  return n >= 2 && isRepeatOf(studentTurns[n - 1], studentTurns[n - 2]);
}

// ───────────────────────── THE LEARNER ASKING WHAT WAS MEANT (9 September 2026) ─────────────────────
// From twenty real dialogues of one morning: a learner answered "what", then "positive or negative?",
// then "idk what is diff in ending and goodbye" — twenty-six turns had been built on a distinction between
// two words she did not have, and each time she said so she got a further question resting on it.
// Another wrote "i cant understand you pls explain" and was asked something new. `isDecline` reads
// "i don't know" and the response is to CHANGE FOOTING to earlier material, which is right for a learner
// who has nothing to say and wrong for one who could not parse the question: they want the SAME thing
// asked plainer, not a different thing.
//
// 🔴 NOT A PHRASE LIST. A phrase list finds only the students who talk like the one it was written from
// (this file's own rule, 17 August). The reading is STRUCTURAL: the reply is interrogative — a question
// mark, an interrogative opening, or a request to explain — AND it adds not one content word of its own:
// every word in it is either connective, one of the few words a person uses to ask what was meant, or a
// word the tool itself used in its last three questions. A learner handing the tool's own words back as
// a question has understood nothing in them; a learner who adds a word of their own ("names?", "I guess
// freedom?") is answering, and passes through to the ordinary path.
// ⚠️ Deliberately conservative, like `isDecline`: "positive or negative?" and "without changing the
// habit?" both introduce a word and are NOT read as asking back, though a person would hear them so.
// Measured over the twenty dialogues' 438 replies before this was written: eight fire, none of them an
// answer; "i cant understand you pls explain" was the ninth once "cant" joined the meta words.
// ⚠️ It outranks `isDecline`: "idk what is diff in X and Y" declines AND asks, and the ask is the part
// that can be acted on.
const ASKBACK_META = new Set([
  'mean', 'means', 'meant', 'meaning', 'explain', 'explaining', 'explanation', 'understand', 'understood',
  'question', 'asked', 'ask', 'asking', 'say', 'saying', 'said', 'talking', 'talk', 'refer', 'referring',
  'sorry', 'pls', 'please', 'huh', 'exactly', 'clarify', 'elaborate', 'diff', 'difference', 'different',
  'idk', 'dont', "don't", 'cant', "can't", 'know', 'get', 'got', 'follow', 'rephrase', 'repeat', 'again',
  'confused', 'confusing', 'wdym', 'like', 'you', 'your',
]);
// An interrogative counts when it opens the reply OR sits within its first three words ("idk what is diff…",
// "i dont know what you mean") — the hedge in front is how a polite person asks.
const ASKBACK_SHAPE = /\?\s*$|^(?:\S+\s+){0,2}(?:what|which|how|why|where|when|huh|meaning|wdym|sorry|eh)\b|\b(?:explain|you mean|mean by|rephrase|clarify|(?:don'?t|dont|cannot|can'?t) (?:understand|follow|get))\b/i;
export function isAskingBack(reply = '', recentQuestions = []) {
  const s = String(reply ?? '').trim();
  if (!s || !ASKBACK_SHAPE.test(s)) return false;
  const licence = new Set(recentQuestions.slice(-3).flatMap((q) => content(String(q || ''))));
  const own = content(s).filter((w) => !NONMATERIAL.has(w) && !ASKBACK_META.has(w));
  return own.every((w) => licence.has(w));
}

// ───────────────────────── THE RUT — the stone's own questions holding one word (9 September 2026) ────
// v0.28.0's head ban refuses a repeated CONSTRUCTION (the first three words, six questions back) and it
// works: on the twenty real dialogues of 9 September every opener varied properly, and underneath that
// variation the questions sat on one noun for runs of six, seven, ten, eleven and fifteen turns — twenty
// questions recombining four of one learner's nouns with a different interrogative on the front each time.
// The metronome moved down a level. A guard whose satisfying set has a cheapest member is met by that
// member, and rotating the opener while keeping the noun set is the cheapest member of the head ban's set.
//
// 🔴 THIS IS NOT A FREQUENCY BAN, AND THE ARGUMENT AGAINST ONE STANDS (readDwell, 17 August): in a real
// session the most-repeated word across seven questions was the central noun of the whole project, and
// banning it would have been worse than the rut. Nothing is banned here. The reading fires the same move
// `stalled` fires — HAND THE SUBJECT BACK, ask them to name another part of what they are looking into,
// their word for it, no candidates — which is the only response that cannot choose the next subject
// wrongly, because they choose it. If they name the same thing again, the tool goes on with it and the
// run count has been broken by the invitation itself.
// 🔴 AND IT IS NOT THE SEMANTIC RE-ASK GATE THAT WAS MEASURED AND REFUSED (6 September). That looked for
// a repeated REQUEST by similarity, where every question in a focused conversation is similar by
// construction and no threshold separates them. This reads one word, exactly, across consecutive
// questions — the reading `enquiry-conversation-probe.mjs` has printed as "longest rut" since 17 August.
// Measured before the number was chosen, over the twenty real dialogues: a run of six or more occurs in
// ten of the twenty, and NOT in the 29 July session this file's other readings were tuned on (its longest
// run was five). Six is that session's ceiling plus one, and it is the cohort's median.
export const RUT_TURNS = 6;
// 🔴 A RUT THAT ALTERNATES DEFEATED THE CONSECUTIVE COUNT, AND IT TOOK A STUDENT TO FIND IT (20 September
// 2026). This read the LONGEST RUN OF CONSECUTIVE questions ending at the latest, and fired only when that
// run was an exact multiple of RUT_TURNS. A tester reported a dialogue as stuck in a loop; replaying her
// twelve questions through this function fired ZERO times, and it was working exactly as written. Her rut
// ran on TWO words for ONE subject — "common" present in six of the last eight questions and "pointers" in
// six of twelve — and the two took turns. "common" reads 000011001111: six of the last eight, never six in
// a row. The longest consecutive run in the whole dialogue was FOUR. A rut that breathes — drops the word
// for a question, comes back — was invisible, and so was any run of seven to eleven, which the modulo
// skipped entirely. **A guard whose satisfying set has a cheapest member is met by that member**, for the
// third time in this file: the opener ban put a floor under the period, the frame gate compared five-word
// shingles at a three-word template, and this counted consecutively at a fault that alternates.
// 🔴 PRESENCE IN A WINDOW, NOT A CONSECUTIVE RUN. A word counts if it appears in at least RUT_TURNS of the
// last RUT_WINDOW questions. ⚠️ **RUT_WINDOW = 8 IS MINE AND REVERTS IN ONE LINE.** Measured over the 488
// questions of the twenty-one class dialogues: consecutive fires 19 times (3.9 per 100 questions), window 7
// fires 31 (6.4), window 8 fires 39 (8.0), window 9 fires 51 (10.5). Seven does not reach the reported
// dialogue — six-in-eight is not six-in-seven — so EIGHT IS THE SMALLEST WINDOW THAT CATCHES THE FAULT THAT
// WAS REPORTED, and nine buys a third more firing for nothing extra there. The two longest fixtures go from
// 2 fires to 5, which is where an alternating rut lives; a seven-turn fixture with no rut still fires zero
// under every window, which is the control.
// ⚠️ THE COST IS REAL AND IS STATED RATHER THAN DISCOVERED. v1.6.0 measured that the hand-back LOWERS
// uptake — fixture `s` went rut 14 → 7 while the inert rate rose 13% → 29% — because a question handing the
// subject back takes less of what the learner just said. Roughly doubling how often it fires buys fewer
// ruts and pays in that coin. That is the mechanism's price, not an argument against it.
// 🔴 WHAT THIS DOES NOT FIX, and it is the fault underneath: "common" and "pointers" are one subject wearing
// two words. No window reaches that. It is readDwell's own open finding — *a word is not a subject: four
// words held the anchor in succession while all four named one small mechanism* — and this is a patch on the
// symptom. Do not read the window as having closed it.
export const RUT_WINDOW = 8;
// 🔴 FIRES ONCE PER RUT_TURNS, NOT ON EVERY TURN PAST IT (measured the day it was written, and unchanged).
// Replaying a real learner whose project IS the noun — "trust between strangers" — the invitation to name
// another part came back about trust, because the invitation itself kept the word (it is the subject of the
// whole conversation, and Clean Language says it back), so the run never broke and the reading fired on
// seven consecutive turns. A fixed reply cannot react to an invitation, so a replay overstates this; but
// seven invitations in a row is the tool's fault whatever the learner does. The modulo that used to carry
// this cannot survive a window, so the refractory is DERIVED BY REPLAY instead — the earlier turns are
// re-read on every call and a fire is refused within RUT_TURNS of the previous one. **The reading stays
// stateless**, which is what the ephemeral pivot requires: nothing is stored, and a replayed transcript
// reproduces the same fire sequence exactly.
function rutAt(sets, end) {
  const win = sets.slice(Math.max(0, end - RUT_WINDOW), end);
  if (win.length < RUT_TURNS) return null;
  const counts = new Map();
  for (const s of win) for (const w of s) counts.set(w, (counts.get(w) || 0) + 1);
  let best = { word: null, run: 0 };
  for (const [w, c] of counts) if (c > best.run) best = { word: w, run: c };
  return best.run >= RUT_TURNS ? { word: best.word, run: best.run, span: win.length } : null;
}
/** One content word carried by RUT_TURNS of the last RUT_WINDOW questions — at most one reading per RUT_TURNS. */
export function readRut(stoneTurns = []) {
  const n = stoneTurns.length;
  if (n < RUT_TURNS) return null;
  const sets = stoneTurns.map((q) => new Set(content(String(q || '')).filter((w) => !NONMATERIAL.has(w))));
  let last = -RUT_TURNS;
  let here = null;
  for (let i = RUT_TURNS; i <= n; i++) {
    here = null;
    if (i - last < RUT_TURNS) continue;
    const r = rutAt(sets, i);
    if (r) { here = r; last = i; }
  }
  return here;
}

// ───────────────────────── THE RETURN — saying what the last answer left out (v1.11.0, 17 September 2026) ─
// Prayas: "when a question is repeated (seemingly) because the student's answer was neither complete or
// detailed enough - specify what was left out, what detail is still needed."
//
// The dwell reader holds an anchor for up to ANCHOR_MAX turns, on the argument that persistence is heat.
// From the learner's side that looks like being asked the same thing again with no reason given, and the
// reason — the last answer did not reach part of what was asked — was sitting in the transcript unread.
// This reads it. CODE decides three things: that the coming question RETURNS to the last question's subject
// (the dwell anchor is a word of that question), WHAT KIND of detail the last question asked for, and WHICH
// of the last question's own words the reply did not reach. The model only phrases the clause that says so.
//
// 🔴 "LEFT OUT" MEANS THE QUESTION'S OWN WORDS, NEVER THE LEARNER'S. A question says the learner's earlier
// words back to them (Clean Language), so a reply that does not repeat them has left nothing out. Measured
// over the twenty 9 September dialogues: counting every word of the last question fired on 82 returns with
// lists full of the learner's own vocabulary; counting only what the question itself added fired on 52.
// 🔴 AND A WORD LIST OVERCLAIMS, so the KIND of detail is checked where a lexical check is honest. "At what
// point do the shards become visible?" answered "when they open their third eye" has answered the moment,
// and "visible" not reappearing is not an omission. Where the reply supplies the kind asked for, nothing
// fires. Kinds with no honest check (where, how, which, what) fall back on the word list alone.
// ⚠️ It never grades the reply. "Incomplete", "vague", "not detailed enough" are verdicts on somebody's
// material, and the 9 September reversal holds that those are theirs; the guard refuses them in the clause
// (`noAnswerVerdict`). What is said is a fact about two texts: the question asked this, the answer did not say it.
const RETURN_FRAME = new Set([
  'which', 'does', 'doing', 'specific', 'specifically', 'exactly', 'point', 'way', 'ways', 'part', 'parts',
  'kind', 'would', 'could', 'should', 'happen', 'happens', 'happening', 'true', 'thing', 'things', 'moment',
  'particular', 'make', 'makes', 'mean', 'means', 'differ', 'difference', 'different', 'change', 'changes',
  'look', 'looks', 'start', 'begin', 'end', 'ends', 'become', 'becomes', 'feel', 'feels', 'want', 'there',
  'where', 'when', 'what', 'how', 'who', 'why', 'say', 'said', 'tell', 'first', 'still', 'more', 'less',
  'most', 'one', 'each', 'some', 'any', 'other', 'else', 'own', 'role', 'play', 'left', 'instead', 'letting',
  'turns', 'turn', 'create', 'same', 'tries', 'trying', 'simply', 'rather', 'itself', 'was', 'were', 'goes',
  'anything', 'nothing', 'everything', 'someone', 'something', 'held', 'hold', 'keep', 'get', 'gets', 'give',
  'gives', 'take', 'takes', 'set', 'use', 'used', 'using', 'suppose', 'actually', 'having', 'need', 'needs',
  'from', 'between', 'being', 'into', 'onto', 'about', 'with', 'without', 'within', 'through', 'toward',
  'towards', 'against', 'upon', 'those', 'these', 'this', 'that', 'them', 'their', 'your', 'you', 'they',
  'during', 'before', 'after', 'while', 'until', 'across', 'around', 'over', 'under', 'among', 'beyond',
  'inside', 'outside', 'behind', 'along', 'since', 'whether', 'because', 'every', 'only', 'even', 'also',
]);
// The kind of detail a question asks for, read off its main clause. A leading "When X, …" / "If X, …" is
// a subordinate clause and not the ask, so it is stripped first ("When the person tries to change the
// ending, where does the power go?" asks WHERE).
// `has: 'named'` — a which/what question is answered by naming something, so a reply that brings in a word of
// its own (not the question's, not said before) has supplied the kind asked for.
const ASK_KINDS = [
  { kind: 'when',    re: /^(?:at what (?:point|moment|stage|time)|when)\b/, need: 'when it happens',
    has: /\b(?:when|after|before|once|while|until|during|moment|time|day|days|week|month|year|morning|evening|night|then|soon|start|starts|begin|begins|end|ends|first|last|always|never|every)\b/ },
  { kind: 'who',     re: /^(?:who|whose|for whom)\b/, need: 'who it is',
    has: /\b(?:i|we|they|he|she|people|person|someone|somebody|user|users|everyone|anyone|customer|customers|student|students|friend|friends|family|them|him|her|me|us|parents?|child|children|kids?|teacher|staff|owner|vendor|buyer)\b/ },
  { kind: 'why',     re: /^(?:why|what (?:is|was|would be) the reason)\b/, need: 'why',
    has: /\b(?:because|since|so|reason|cause|causes|due)\b/ },
  { kind: 'number',  re: /^how (?:many|much|often|long|far)\b/, need: 'how many or how much',
    has: /\d|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|few|many|half|once|twice|daily|weekly|hours?|minutes?)\b/ },
  // A closed question is answered by yes or no — the guard refuses them now, but older transcripts carry them.
  { kind: 'yesno',   re: /^(?:is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b/, need: 'a yes or a no',
    has: /\b(?:yes|no|not|never|nope|yeah|yep|maybe|sometimes|always|partly)\b|n't\b/ },
  { kind: 'which',   re: /^(?:which|what (?:specific|exact|particular))\b/, need: 'which one', has: 'named' },
  { kind: 'where',   re: /^where\b/, need: 'where it happens', has: null },
  { kind: 'how',     re: /^how\b/, need: 'how it happens', has: null },
  { kind: 'true',    re: /^what would (?:have to|need to) be true\b/, need: 'what would have to be true', has: null },
  { kind: 'follows', re: /^what (?:happens|would happen|changes)\b/, need: 'what happens next', has: null },
];
function askedSentence(question = '') {
  const qs = String(question).match(/[^.!?]*\?/g);
  let s = (qs ? qs[qs.length - 1] : String(question)).trim().toLowerCase().replace(/^["“'\s]+/, '');
  s = s.replace(/^(?:when|if|once|as|suppose|instead of|while|after|before)\b[^,]*,\s*/, '');
  return s;
}
/** What kind of detail the question asks for — `{ kind, need, has }`, or a plain `what` when nothing matches. */
export function askedFor(question = '') {
  const s = askedSentence(question);
  return ASK_KINDS.find((k) => k.re.test(s)) || { kind: 'what', need: 'what it is', has: 'named' };
}
const nearWord = (w, words) => words.some((x) => x === w || (w.length >= 5 && x.length >= 5 && x.slice(0, 5) === w.slice(0, 5)));
/**
 * Does the coming question return to the last question's subject, and if so what did the reply leave out?
 * `anchor` is the dwell anchor this turn; `studentTurns` ends with the reply to `lastQuestion`.
 * Returns `{ anchor, kind, need, missing: [words] }` or null.
 */
// `sameSubject` — the caller already knows the question stays where the last one was (the critique surface's
// reading plan holding its station), so no anchor word is needed. `alsoGiven` — text whose words were never
// the question's to ask for (the text under question): a reply not repeating them has left nothing out.
export function readReturn({ anchor = '', lastQuestion = '', studentTurns = [], goal = '', sameSubject = false, alsoGiven = '' } = {}) {
  if ((!anchor && !sameSubject) || !lastQuestion || !studentTurns.length) return null;
  if (!sameSubject && studentTurns.length < 2) return null;
  const mat = (s) => content(String(s || '')).filter((w) => !NONMATERIAL.has(w));
  const qWords = [...new Set(mat(lastQuestion))];
  if (!sameSubject && !qWords.includes(anchor)) return null;      // not a return: the last question was about something else
  const reply = String(studentTurns[studentTurns.length - 1] || '');
  const replyWords = mat(reply);
  const before = studentTurns.slice(0, -1).flatMap(mat).concat(mat(goal), mat(alsoGiven));
  const missing = qWords.filter((w) => w !== anchor && !RETURN_FRAME.has(w)
    && !nearWord(w, replyWords) && !nearWord(w, before)).slice(0, 3);
  const ask = askedFor(lastQuestion);
  const named = replyWords.some((w) => !RETURN_FRAME.has(w) && !nearWord(w, qWords) && !nearWord(w, before));
  const kindMissing = ask.has === 'named' ? !named : ask.has ? !ask.has.test(reply.toLowerCase()) : null;
  // The kind was supplied: the reply answered what was asked, whatever words it used. Nothing to name.
  if (kindMissing === false) return null;
  if (!missing.length && !kindMissing) return null;
  // `words` is what the guard accepts as NAMING the gap: the listed words, any other word of the last question
  // the reply did not reach (the learner's own included — naming it back is fine, it is only not counted as
  // left out), and the plain word for the kind of detail asked. Never the anchor: naming the subject says
  // nothing about what is missing from it.
  const unreached = qWords.filter((w) => w !== anchor && !RETURN_FRAME.has(w) && !nearWord(w, replyWords));
  const words = [...new Set([...missing, ...unreached, ...(KIND_CUES[ask.kind] || [])])];
  // `ask` is narrower: what the QUESTION must go after — a listed missing word, or the kind of detail itself.
  // A lead-in saying "you have not said when" followed by "by what means …?" names the gap and then asks
  // for something else; that was measured on the first live run and is what this list refuses.
  // A kind with no cue word (what, where-less abstract asks) has no plain word for the detail, so there the
  // question may take up any word of the last question the reply did not reach — measured live: "what is the
  // role of the platform in that process?" left `process` as the only admissible word, and a question asking
  // who is responsible for the platform's part was refused for moving on.
  const cues = KIND_CUES[ask.kind] || [];
  const asks = cues.length ? [...new Set([...missing, ...cues])] : words;
  return { anchor, kind: ask.kind, need: ask.need, missing, words, ask: asks.length ? asks : words };
}
const KIND_CUES = {
  // Kept to words that name a KIND. 'what', 'then', 'way' and 'point' were left out: they turn up in almost
  // any sentence, so accepting them would let a clause pass that names nothing.
  when: ['when', 'moment', 'time'], who: ['who', 'person', 'people'], why: ['why', 'reason'],
  number: ['many', 'much', 'number', 'amount', 'often'], which: ['which', 'particular'],
  where: ['where', 'place'], how: ['how'], true: ['true'], follows: ['happens', 'next'],
  yesno: ['whether'], what: [],
};

// A concrete thing named in the GOAL that no question has yet touched. Extracted 17 August 2026 so the
// repeat path and the nothing-live path can reach the same tether — it was inline inside `if (!picked)`,
// which made it unreachable while anything at all was live. In her session something always was.
function untouchedGoalWord(goal, stoneTurns, exclude) {
  const stoneSets = stoneTurns.map((q) => new Set(content(q)));
  const cov = (w) => stoneSets.reduce((a, qs) => a + (qs.has(w) ? 1 : 0), 0);
  const goalWords = [...new Set(content(goal).filter((w) => !NONMATERIAL.has(w)))];
  return goalWords.find((w) => cov(w) === 0 && !exclude.has(w)) || null;
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
  APPROACHES[4],
  // 🔴 `APPROACHES[5]` stood here until 9 September 2026 and APPROACHES has five entries, so this
  // array carried a literal `undefined` — one steering line in eight on the `poetic` probe variant,
  // silently, for as long as the fifth approach has been gone. Nothing live reads this set (only
  // flow-probe.mjs, via `legacy: !!V.poetic`), so no learner ever met it; it degraded the instrument
  // that variants are compared with, which is the worse place for a silent fault to sit.
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
  // 🔴 THE INFLECTION GAPS, and the hedges nobody had hit yet (17 August 2026). Found by the first
  // conversation-level probe this surface has ever had: across three ten-round runs the anchor was
  // `like`, `probably` or `makes` on HALF the turns. `make` was on this list and `makes` was not;
  // `come`/`comes` were both on it. Nothing could have caught this, because every test asserted that an
  // anchor is well-formed and none asserted what the anchor IS across a conversation — the same shape as
  // the 15 August plan finding, where a plan sat on one station for fourteen rounds with every unit test
  // green. A hand-written list does not fail loudly; it just quietly anchors a session on "probably".
  // ⚠️ MEASURED, not argued: 5 of 87 turns change across the four real fixtures, and every one moves from
  // a light verb to the learner's own material (`getting`→`space`, `making`→`app`). It helps both students
  // the two-student rule names and harms neither, which is the bar a register change has to clear here.
  // ⚠️ FLAGGED 7 September 2026, AND NOT CHANGED. Prayas: *"I do not want design to be the reigning
  // context anymore."* The justification below is design-specific — it turns on what words mean IN A
  // DESIGN TUTORIAL — so its stated reason has lost its context even though the decision may still be
  // right. Measured cost, three independent runs since: a hedge or an auxiliary takes about half the
  // anchors (`feel` in the live probe, `was`/`will` in a real July dialogue). His to settle. ⚠️ Note
  // also that this comment says `think` is NOT on the list and `think`/`thinks`/`thought` ARE, three
  // lines above — the comment and the code disagree and nobody has said which is wrong.
  // ⚠️ DELIBERATELY CONSERVATIVE. `see`, `look`, `feel`, `need`, `use` and `think` were measured too and
  // are NOT here: in a design tutorial they can be the material itself — how a thing looks, what it feels
  // like — and a list that eats those is worse than the gaps. The probe still reports them as weak
  // anchors, so the judgement stays visible rather than being silently encoded.
  'makes', 'made', 'making', 'getting', 'taking', 'giving', 'keeping', 'wanting', 'goes', 'gone',
  'like', 'likes', 'liked', 'probably', 'maybe', 'perhaps', 'really', 'actually', 'sort', 'kind',
  'basically', 'kinda',
  // 🔴 AND THE APOSTROPHE FORMS, which this list has been missing since it was written. It carries
  // `dont`, `arent`, `isnt`, `cant`, `didnt` — the apostrophe-LESS spellings — so it was written on the
  // assumption that tokens arrive stripped. They do not: `content()` keeps the apostrophe, so every real
  // contraction a student types has walked straight past a list built to stop it, and a probe anchored a
  // question on "aren't". The stripped forms stay, because a student may also type them.
  // ⚠️ Zero of 87 turns change across the four real fixtures — provably non-regressive — and one fixture
  // was already anchored on `i'm`.
  "don't", "aren't", "isn't", "wasn't", "weren't", "can't", "won't", "didn't", "doesn't",
  "couldn't", "wouldn't", "shouldn't", "haven't", "hasn't", "hadn't", "i'm", "it's", "that's",
  "they're", "you're", "we're", "i've", "i'd", "i'll",
  // 🔴 AND THE MODALS. A student describing a design speaks almost entirely in them — "the mechanic WOULD
  // need", "it COULD create" — so they recur constantly and are the emptiest words in the reply. A probe
  // anchored two of ten turns on `would` and `could`. Zero of 87 fixture turns change, because no real
  // session had ever anchored on one; the play-acted student simply hedges harder than a person does,
  // which is what made the gap visible at all. `will`, `can` and `may` are NOT here: each is also an
  // ordinary noun, and this list must not eat a learner's material.
  'would', 'could', 'should', 'might', 'must', 'shall',
  // 🔴 AND THE POSSESSIVES AND DEMONSTRATIVES (6 Sep 2026). `STOP` in signals.mjs carries `their`,
  // `them`, `they`, `this` and `that`, and does NOT carry `its` — which is three characters, so it
  // survives `content()`'s length filter and can be selected as the word a learner keeps returning to.
  // In a real session of 30 August `its` held the anchor for three consecutive turns, the full
  // ANCHOR_MAX, while the conversation was nominally about something else entirely. A possessive
  // determiner is
  // never a learner's material: it is what English requires in order to point at material.
  // ⚠️ DELIBERATELY STILL CONSERVATIVE, and the same judgement as the comment above. `helps`, `floor`
  // and `below` also held anchors in that session and are NOT here — one of the three was the very
  // thing the learner was talking about, and a list that eats a learner's noun is worse than the gaps.
  // ⚠️ Zero of 87 turns change across the four real fixtures.
  'its', 'his', 'her', 'hers', 'theirs', 'ours', 'yours', 'mine',
  'itself', 'himself', 'herself', 'themselves', 'these', 'those',
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

// ───────────────────────────── the approach rotation's PHASE (9 September 2026) ─────────────────────
// 🔴 THE ROTATION TURNED EVERY TURN AND ALWAYS STARTED IN THE SAME PLACE. All three call sites indexed
// APPROACHES at `Math.max(0, studentTurns.length - 1) % set.length`, which is **0 on every first turn of
// every conversation** — so a repertoire six moves wide opened on move one, always. Twenty AI Club
// dialogues on 9 September 2026 began with the identical sentence, `What would have to be true for …`
// with the topic swapped, and twenty students in one room could compare screens. Neither ban can reach
// it: the opener ban and the head ban both compare against PREVIOUS questions and turn one has none, so
// the most-repeated line in the whole corpus is the one line no guard can see.
//
// 🔴 NOTHING IS PRUNED, WIDENED OR RE-MEASURED HERE. The 29 July finding that the propositional moves
// beat the felt-sense ones is untouched and `APPROACHES` is unchanged — all six were already good. What
// was never anybody's decision is that the rotation's phase is a constant, and it fell out of a modulo
// seeded at zero rather than being chosen. This is the same modulo-pointer-clock shape `lib/plan.mjs`
// replaced on the criticism surface in v0.15.0; the enquiry surface still turns on one, and that part
// is deliberate — only its starting point moves.
//
// 🔴 THE PHASE COMES FROM THE LEARNER'S OWN GOAL, so it is STATELESS and DETERMINISTIC. Nothing is
// stored, nothing is random: the ephemeral pivot is untouched, a replayed fixture reproduces exactly,
// and two people arriving with different edges start on different moves. ⚠️ Two learners who paste the
// SAME words still get the same opening, which is the honest limit of a stateless fix — a room handed
// one brief will still cluster, and only the part of the opening they typed themselves separates them.
// ONE helper feeding all three call sites, because this file already carries the lesson that a repair
// applied per-call-site leaves the accident standing wherever a fourth site appears.
function approachPhase(goal = '') {
  let h = 2166136261;                       // FNV-1a, 32-bit — a hash, never a random source
  const s = String(goal);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function approachFor(set, studentTurns = [], goal = '') {
  return set[(Math.max(0, studentTurns.length - 1) + approachPhase(goal)) % set.length];
}

export function readDwell({ studentTurns = [], minReturns = 2, legacy = false, stoneTurns = [], goal = '', repeated = false } = {}) {
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
  // A VERBATIM REPEAT RETIRES THE ANCHOR AT ONCE, AND REACHES FOR THE GOAL FIRST (17 August 2026).
  // ANCHOR_MAX needs three turns to elapse, and it rotates WORDS. In the 17 August session four different
  // words held the anchor in succession — each rotation satisfying the theme ledger — while every one of
  // them named part of the same small mechanism, so seven questions ran inside one detail of the idea and
  // several things the student had named in their own goal were never asked about at all. Rotating the
  // anchor kept the SUBJECT, which is the 16 August criticism finding in mirror (there, rotating the
  // station kept the menu).
  // 🔴 The tether is PREFERRED over the next live word rather than merely reached when nothing is live.
  // That is the whole promotion: an untouched thing the learner themselves named beats the second-hottest
  // word in a stretch they have just shown is exhausted.
  // ⚠️ A frequency rule over the stone's own past questions was the obvious alternative and is WRONG. In
  // that session the most-repeated word across the last seven questions was the central noun of the whole
  // project — banning it would have been worse than the rut. A frequency rule cannot tell the subject of
  // the idea from a groove worn in it; the goal can, because the learner wrote it.
  if (repeated) {
    if (picked) exclude.add(picked.anchor);
    const fresh = untouchedGoalWord(goal, stoneTurns, exclude);
    if (fresh) {
      return { anchor: fresh, returns: 1,
               approach: approachFor(APPROACHES, studentTurns, goal) };
    }
    picked = pickAnchor(studentTurns, minReturns, exclude, stoneTurns);
  }
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
    const fresh = untouchedGoalWord(goal, stoneTurns, exclude);
    if (fresh) {
      return { anchor: fresh, returns: 1,
               approach: approachFor(APPROACHES, studentTurns, goal) };
    }
    if (studentTurns.length >= 6 && content(goal).filter((w) => !NONMATERIAL.has(w)).length) {
      return { invite: true };
    }
    return null;
  }
  const { anchor, returns: best } = picked;
  // The approach turns every turn, so the same anchor is never approached the same way twice running.
  const set = legacy ? LEGACY_APPROACHES : APPROACHES;
  return { anchor, returns: best, approach: approachFor(set, studentTurns, goal) };
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
