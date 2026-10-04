import { content } from './signals.mjs';
import { NONMATERIAL } from './arc.mjs';
import { isTheirWord } from './dialogue.mjs';
// pace.mjs — the turn that says nothing, and how long a turn takes.
//
// 🔴 TWO THINGS THE TOOL COULD NOT DO BEFORE: stay silent, and take a different amount of time depending
//    on what happened. Both were asked for after a student reported the questioning as "constant
//    hammering" — Prayas: "dialogue is not hammering. it has ebb and flow", then "blank response with
//    <blank> should be possible".
//
// 🔴 NEITHER CALLS A MODEL. Code decides whether this turn is blank and how long it takes; on a blank turn
//    the model is not called at all.

// 🔴 THE BLANK IS FOR DRAMATIC EFFECT (Prayas, 28 September 2026, on a local test where it fired on "A
//    melancholy song", a real three-word answer: "a blank here makes no sense. it should be used for
//    dramatic effect"). So it no longer reads reply length. It comes only where the felt-shift detector
//    reads a LEX event, the learner having just named what matters in their own words (lib/feltshift.mjs).
//    The question the tool would have asked there tests the naming; the blank lets it land instead.
// ⚠️ Two earlier triggers are gone: three words or fewer (it read a writing style, and fired on real
//    answers) and the tiring reading of the same day (a real finding, recorded in
//    docs/concept/dialogue-flow.md, but tiring is not a dramatic moment).
// ⚠️ With no neural backend there is no felt read, so no blank. BLANK_FROM_REPLY is mine: a naming in the
//    first two replies is too early for a pause to carry weight.
export const BLANK_FROM_REPLY = 3;

// 🔴 NEVER TWICE RUNNING, and the check is DERIVED rather than stored. The service keeps nothing between
//    turns, so "did I just blank?" is answered by replaying what the browser posts back — a blank is a
//    stone turn with empty content, an ack a stone turn with no question mark. Whoever knows the raw history
//    passes the one boolean: did the last stone turn ask?
export function blankTurn({ named, replies, lastStoneAsked }) {
  return named && replies >= BLANK_FROM_REPLY && lastStoneAsked;
}

// 🔴 THE TURNS THAT DO NOT ASK, AND WHEN (29 September 2026). Prayas: "it should not be so predictable.
//    compute rhythm from content, from need". The first cut counted (4+ new words, much longer or shorter,
//    a slow reply, three questions in a row) and replayed as Q Q Q S Q S Q S: a metronome. Now a turn does
//    not ask only when the dialogue needs it, read from what the tool already reads:
//      · 'new'    — new material has just entered the learner's words (a felt SEM event, about one reply
//                   in eight): it is held, then said back, so it lands instead of being pressed.
//      · 'tiring' — they are writing much less than they did at the start (Stage 0: replies fall as a step
//                   at about the ninth question in most long class dialogues): said back, not pressed.
//      · 'repeat' — they gave the same answer again: said back, not asked a third time.
//    A naming (felt LEX) is the blank, above. Never on the first reply, never after a turn that did not ask.
//    Code decides when; the model writes the sentence (lib/dialogue.mjs, validateStatement).
const wordsOf = (s) => String(s || '').trim().split(/\s+/).filter(Boolean);
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Tiring, relative to the person: from reply 10, the last two replies both under half their own median of
// replies 1-8, where that median is at least ten words (below it, "half" is noise). Numbers are mine.
export function readsAsTiring(replies) {
  if (replies.length < 10) return false;
  const base = median(replies.slice(0, 8).map((r) => wordsOf(r).length));
  return base >= 10 && replies.slice(-2).every((r) => wordsOf(r).length < base / 2);
}

// 🔴 A CHARGED SHORT REPLY (29 Sep 2026, Prayas on a dialogue of short replies, "still all questions"). The
//    felt reading measures new ground covered, and two or three words cannot cover much however much they
//    carry ("Romance", "A willingness to be fooled"): on his seven-turn test it fired on none. So a short
//    reply (six words or fewer) whose every material word is new to the dialogue, the stone's questions
//    included, is read as weight in few words, and said back. It waits for CHARGED_GAP questions since the
//    last turn that did not ask, or a terse writer gets strict alternation. Both numbers are mine.
//    Simulated before building: his session Q S Q Q S Q; five fixtures scattered and uneven.
export const CHARGED_MAX_WORDS = 6;   // CHARGED_GAP (2) gave way to SAY_BACK_GAP, 4 Oct 2026
function readsAsCharged(reply, earlier) {
  const mat = (s) => content(s).filter((w) => !NONMATERIAL.has(w));
  const words = mat(reply);
  const seen = new Set(earlier.flatMap(mat));
  return wordsOf(reply).length <= CHARGED_MAX_WORDS && words.length > 0 && words.every((w) => !isTheirWord(w, seen));
}

// `replies`: the learner's replies, current last, without the opening edge. `earlier`: every earlier text of
// the dialogue, edge and stone turns included. `questionsSince`: questions asked since the last turn that
// did not ask. `newMaterial`: a felt SEM event.
// 🔴 AT LEAST SAY_BACK_GAP QUESTIONS BETWEEN TURNS THAT DO NOT ASK (4 Oct 2026, Prayas: "it is too much. not feeling
//    natural else it would not come up"). A tester heard the stone shift "from questioning me to giving me statements":
//    15 of 54 stone turns in five testers' dialogues (28%), 11 of them from the felt reading of new material. Four
//    questions between them: 28% → 17% there, 17% → 13% over the 500 rating conversations (simulated on the saved
//    sequences). The number is mine.
export const SAY_BACK_GAP = 4;
export function ackTurn({ replies, lastStoneAsked, newMaterial = false, earlier = [], questionsSince = 99 }) {
  if (replies.length < 2 || !lastStoneAsked || questionsSince < SAY_BACK_GAP) return null;
  const cur = replies[replies.length - 1], prev = replies[replies.length - 2];
  const kind = cur.trim().toLowerCase() === prev.trim().toLowerCase() ? 'repeat'
    : newMaterial ? 'new' : readsAsTiring(replies) ? 'tiring'
    : readsAsCharged(cur, earlier) ? 'charged' : null;
  return kind ? { kind } : null;
}

// 🔴 THE CHOICE TURN, AND WHEN (1 October 2026). Code decides when, from need: the learner has just said
//    they do not know ("idk", "not sure"), or their reply added nothing new (`stalled`). Both already hand
//    the subject back to them; a choice of three ways on, from their own words, is that hand-back made
//    concrete. Only after a turn that said something, a question or a said-back (4 Oct 2026): a choice not
//    taken and a blank are both stored empty, so one choice never follows another. Reading need from these
//    two is mine, as is allowing it on the first reply.
export function choiceTurn({ declined, stalled, replies, lastStoneSpoke }) {
  return !!(declined || stalled) && replies >= 1 && lastStoneSpoke;
}

// 🔴 ONE TIMING, BUILT FROM THE SIX SCALES (28 September 2026). Prayas, 21 Sep: "i do not want different
//    timing modes (tarantino, interrogation etc) I want one timing which is suited for pedagogical dialogue
//    and sensitive to the content too", then "combined pacing not segregated by director". The first build
//    of that (21 Sep) dropped the modes AND what they had measured, and made every turn wait 3-6.5s: the
//    same pause every time, which is no ebb at all. This keeps the measurements
//    (docs/ops/script-study/beat-scales.mjs, ten screenplays, 10,540 turns):
//      · 87% of screenplay turns have nothing between them. Speech follows speech, so most turns add
//        NOTHING here: the model's own generation time (median 3382ms) is already the gap.
//      · THERAPY: the pause sits after what the person said, and a worked reply earns air (12+ words).
//      · TARANTINO: the real beat is rare and long. It comes where new material has just entered the
//        learner's words (a felt SEM event, about one reply in eight), held before the question.
//    Interrogation (pressure before the question) and Sorkin (none at all) are left out on purpose.
// ⚠️ WORD_MS = 300 is the scales' declared conversion (one word of written action ≈ 300ms of screen
//    time), never measured; the other numbers are the scales' own clamps. All are Prayas's to move.
export const WORD_MS = 300;
const clamp = (ms, lo, hi) => Math.max(lo, Math.min(hi, Math.round(ms)));

// The pause after generation and before the question appears. `moment` is 'new' on a felt SEM event.
export function beatMs({ replyWords = 0, moment = null } = {}) {
  const air = replyWords < 12 ? 0 : clamp((replyWords / 8) * WORD_MS, 600, 4000);
  return moment === 'new' ? clamp(air + 6 * WORD_MS, 1800, 6000) : air;
}

// 🔴 A BLANK COMES AFTER A SHORT HOLD, NOT A LONG ONE. A long wait ending in nothing reads as a failure.
export const BLANK_MS = 1500;

export const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
