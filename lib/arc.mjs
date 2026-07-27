// arc.mjs — the DYNAMIC arc of a Socratic enquiry: which line of questioning this turn is on.
//
// THE FAULT THIS ANSWERS (Siddhie, 26 Jul 2026: "this was asked many times, i got bored of answering
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
//           line is spent: Siddhie's replies fell from ~40 words to "it stays" and "clear cut")
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
