// reading.mjs — how far into the TEXT the conversation has actually gone.
//
// 🔴 WHAT THIS CANNOT DO, said first because the name of the thing it was asked for is wrong. This does not measure how deeply a student read. Nothing here can. A student who read the document closely and answers in four words registers as shallow on every measure below; one who skimmed and quotes fluently registers as deep. These sensors see TYPING, not reading, and the gap between the two is the same gap the survival curve names when it says it reports where a conversation stopped and never why. Do not rename anything here to close that gap in words — the gap is real and the honest name is the one that keeps it visible.
//
// 🔴 WHAT IT IS FOR, and this is the whole of its licence. The ONLY consumer is the planner (lib/plan.mjs), which reads it to decide WHICH REGION OF THE DOCUMENT the next question points at. It is never rendered, never persisted, never sent to the model as a characterisation of the learner, and never carried in the transcript download. Invariant #5 holds that the model never scores the learner; invariant #6 forbids %-complete and comparison; and a figure describing how well somebody read is a grade whatever else it is called. What keeps this the right side of all three is not its vocabulary but its CONSUMER, so verification/reading-consumer.test.mjs asserts the consumer and will fail if a display ever grows here. Check the consumer, not the producer.
//
// 🔴 IT DESCRIBES THE READING, NEVER THE READER — the same line signals.mjs already holds for the enquiry surface, and for the same reason. Every value below is a relation between two texts (the document and what has been said about it). None of them is a property of a person, and none may be reworded into one.
//
// THIS FILE IS A PURE SIBLING AND TOUCHES NOTHING. It imports two helpers and modifies no existing module, exactly as coverage.mjs does — so the enquiry path is byte-identical and invariant #1 is not in play at all.

import { isInformative } from './coverage.mjs';
import { NONMATERIAL, isDecline } from './arc.mjs';

const tokens = (s) => (String(s || '').toLowerCase().match(/[a-z0-9']+/g) || []);

// The grammar of a sentence, not anybody's vocabulary. Deliberately a separate list from coverage.mjs's: that one is tuned to corpus rows, this one to conversational replies, and merging them would make one file's tuning silently change the other's verdicts.
const STOP = new Set(['the','a','an','and','or','but','to','of','in','on','is','it','its','i','im','my','me','this','that','for','with','about','how','what','when','why','do','does','so','not','are','was','were','be','been','being','has','have','had','at','by','from','as','if','then','than','there','their','they','them','you','your','we','us','our','he','she','his','her','can','could','would','will','just','also','very','more','most','some','any','all','no','yes','one','two','into','out','up','off','over','under','because','which','who','whom','whose','said','says','say']);

/**
 * Document frequency over the DOCUMENT'S OWN segments, not over the corpus.
 *
 * 🔴 The scoping is the point and it is easy to get backwards. coverage.mjs builds df over the corpus because it is asking whether a corpus entry grounds a query. Here the question is whether the student has engaged a particular REGION of one document, so a word appearing in most of that document's segments distinguishes nothing — a brief about wayfinding says "wayfinding" everywhere. Scoped to the corpus instead, "wayfinding" would read as rare and therefore informative, and every segment would look touched the moment the student used the document's subject noun once.
 */
export function docFreq(segments) {
  const df = new Map();
  for (const s of segments || []) {
    for (const t of new Set(tokens(s.text))) df.set(t, (df.get(t) || 0) + 1);
  }
  return { df, n: Math.max(1, (segments || []).length) };
}

/**
 * The document-frequency ceiling for a document of n segments.
 *
 * 🔴 A FIXED CEILING SILENTLY EMPTIES SHORT DOCUMENTS, and the failure is total rather than partial. At n=1 every token of the document sits in 100% of its segments, so a fixed 0.5 marks every one of them uninformative, nothing is ever touched, every region reads as unvisited and the plan routes at random forever. Nothing throws. The same holds weakly at n=2 and n=3. So below four segments the ceiling opens to admit everything — with that few regions there is nothing to discriminate between anyway, and the routing question barely arises.
 */
export function ceilingFor(n) {
  return n < 4 ? 1.01 : 0.5;
}

/** Content tokens of a text that say something about THIS document. Hedges are excluded for coverage.mjs's reason: a hedge is rare in a declarative document and therefore reads as informative, which is precisely backwards. */
export function informativeOf(text, freq, ceiling = null) {
  const c = ceiling == null ? ceilingFor(freq.n) : ceiling;
  return [...new Set(tokens(text))].filter((t) => t.length > 2 && !STOP.has(t) && !NONMATERIAL.has(t) && isInformative(t, freq, c));
}

/**
 * Region contact — which segments of the document the student's OWN words have reached.
 *
 * 🔴 THE SUBTRACTION IS THE WHOLE MECHANISM. The stone quotes the document when it points at a spot, so a student who simply answers the question in front of them repeats the document's words back without having gone anywhere near the rest of the text. Counting raw overlap would therefore report the student as having engaged exactly the regions the STONE chose — the sensor would be reading its own steering back to itself, and the planner reading it would confirm whatever it had already decided. So a segment counts as touched only by informative tokens the student used that the preceding question did not put in front of them.
 *
 * The turns are paired by position: stoneTurns[i] is the question that preceded studentTurns[i]. That is how the client assembles the transcript, and it is why nothing here needs a session identifier.
 */
export function regionContact({ segments = [], studentTurns = [], stoneTurns = [] } = {}) {
  const freq = docFreq(segments);
  const contact = new Map();
  for (const s of segments) contact.set(s.id, { id: s.id, hits: 0, turns: [] });

  studentTurns.forEach((reply, i) => {
    if (!reply || isDecline(reply)) return;                       // a refusal is not material — arc.mjs holds the same line
    const supplied = new Set(informativeOf(stoneTurns[i] || '', freq));
    const own = informativeOf(reply, freq).filter((t) => !supplied.has(t));
    if (!own.length) return;
    for (const s of segments) {
      const inSeg = new Set(tokens(s.text));
      const shared = own.filter((t) => inSeg.has(t));
      if (!shared.length) continue;
      const rec = contact.get(s.id);
      rec.hits += shared.length;
      if (!rec.turns.includes(i)) rec.turns.push(i);
    }
  });
  return contact;
}

/**
 * The reading, as the planner needs it.
 *
 * touched / untouched — segment ids, the routing signal: the plan steers toward regions the conversation has not reached.
 * returned           — ids the student came back to on NON-ADJACENT turns. Persistence is heat, the same reading readDwell already makes on the enquiry surface; a region returned to after leaving it is one the student is actually working on, and the plan should not route away from it just because it is technically "touched".
 * ownMaterial        — 0..1 over the LAST reply: how much of it is content the document and the preceding question did not supply. Low means the reply is an echo. It says nothing about the person and everything about whether the conversation has anywhere left to go on this station.
 * quoting            — 0..1 over the last reply: how much of it comes from the document. High quoting with low ownMaterial is a reply made entirely of borrowed words.
 * declined           — the last reply was a refusal.
 *
 * ⚠️ ownMaterial and quoting are NOT complements and must not be treated as though they sum to one. A reply can be high on both (the student quotes the document and brings their own material) or low on both (a four-word answer). Reading one as the inverse of the other is the error this note exists to prevent.
 */
export function readEngagement({ segments = [], studentTurns = [], stoneTurns = [] } = {}) {
  const freq = docFreq(segments);
  const contact = regionContact({ segments, studentTurns, stoneTurns });

  const touched = [], untouched = [], returned = [];
  for (const s of segments) {
    const rec = contact.get(s.id);
    if (rec && rec.hits > 0) {
      touched.push(s.id);
      // non-adjacent return: left the region for at least one turn and came back to it.
      if (rec.turns.length >= 2 && rec.turns.some((t, k) => k > 0 && t - rec.turns[k - 1] > 1)) returned.push(s.id);
    } else untouched.push(s.id);
  }

  const last = studentTurns.length ? studentTurns[studentTurns.length - 1] : '';
  const lastStone = stoneTurns.length ? stoneTurns[Math.min(stoneTurns.length - 1, studentTurns.length - 1)] : '';
  const declined = !!last && isDecline(last);

  const lastContent = [...new Set(tokens(last))].filter((t) => t.length > 2 && !STOP.has(t) && !NONMATERIAL.has(t));
  const inDoc = new Set(segments.flatMap((s) => tokens(s.text)));
  const inStone = new Set(tokens(lastStone));
  const ownMaterial = lastContent.length ? lastContent.filter((t) => !inDoc.has(t) && !inStone.has(t)).length / lastContent.length : 0;
  const quoting = lastContent.length ? lastContent.filter((t) => inDoc.has(t)).length / lastContent.length : 0;

  return { contact, touched, untouched, returned, ownMaterial, quoting, declined, freq };
}
