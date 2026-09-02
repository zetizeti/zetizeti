// spec.mjs — the SPECCING surface's deterministic half: which of the six joints a specification touches,
// and which line of questioning comes next.
//
// 🔴 WHAT THIS SURFACE IS, AND WHY IT IS A THIRD THING RATHER THAN A MODE OF THE OTHER TWO. Enquiry
// questions an idea the student holds. Criticism unpacks a text she brought and did not write. This one
// questions a SPECIFICATION — language written so that something can be built from it — and its polarity
// is neither of theirs: the student's own document IS the object, and it is unfinished on purpose.
//
// 🔴 IT CANNOT BE THE CRITICISM SURFACE WITH THE SLOTS SWAPPED, AND THE CODE SAYS SO. `dialogue.mjs`
// refuses, by regex, any criticism question pairing "your project / concept / proposal" with "justify,
// defend, evidence, prove" — because there the student's work is CONTEXT and the found text is the
// object. That guard is right there and would refuse exactly the questions this surface exists to ask.
// Do not relax it; this surface has its own validator.
//
// 🔴 IT NEVER NEEDS TO KNOW THE DOMAIN, and that is what keeps invariant #3 intact. A specification's
// gaps are gaps in LANGUAGE, not errors in engineering. "What decides a bounce" is askable without
// knowing physics; "which of these could somebody change" is askable without knowing Linux. So the
// questions come from the shape of specifying itself, and the stone is never in the position of knowing
// better than the student about her own material — which is the position from which it would start
// telling.
//
// ⚠️ THE TEMPTATION HERE IS SHARPER THAN ON EITHER OTHER SURFACE, and it is worth naming in the file it
// threatens. A spec can be genuinely, checkably incomplete in a way an idea and a found text cannot. So
// "you have not said what happens at the edges" is both TRUE and an answer, and it will feel like help.
// Everything below is arranged so the absence is found by the student: the aim moves the question to an
// untouched joint, and the question asks what hers says there.

// THE SIX JOINTS. A specification of anything holds together at these places, and they are the same six
// for a sketch, a daemon, a shopfront and a mesh of radios. The generality is the point: it is what makes
// one surface serve a first-year specifying a bouncing ball and a final-year specifying a wireless mesh.
export const JOINTS = [
  {
    key: 'state',
    label: 'state',
    aim: 'Ask what the thing HOLDS — what it knows at any given moment, and what it does not. Point at a '
      + 'noun in their own text and ask what it is at rest, or what it would say if you asked it right now.',
    // Exact-word markers, `unicode61`-style: no stemming, no synonyms, matched whole. Same discipline as
    // retrieval — a specification says these words or it does not, and guessing at intent is how a
    // deterministic reading turns into a judgement about the writer.
    marks: ['state', 'holds', 'stores', 'remembers', 'position', 'value', 'variable', 'current',
      'knows', 'memory', 'buffer', 'record', 'field', 'property', 'attribute'],
  },
  {
    key: 'change',
    label: 'what changes',
    aim: 'Ask what MOVES — what is different after one pass, one frame, one tick, one visit. Take their '
      + 'own verb and ask what it acts on, or how often it happens.',
    marks: ['each', 'every', 'frame', 'tick', 'loop', 'step', 'update', 'updates', 'moves', 'changes',
      'increment', 'per second', 'interval', 'repeat', 'again', 'cycle'],
  },
  {
    key: 'decision',
    label: 'what decides',
    aim: 'Ask what DECIDES — what the thing compares, and against what. Point at a moment in their text '
      + 'where something happens and ask what has to be true for it to happen.',
    marks: ['if', 'when', 'decides', 'threshold', 'condition', 'trigger', 'detect', 'detects', 'reaches',
      'exceeds', 'greater', 'less', 'compare', 'check', 'rule', 'depends'],
  },
  {
    key: 'edges',
    label: 'the edges',
    aim: 'Ask about a BOUNDARY — the first moment before anything has happened, the empty case, the '
      + 'thing arriving twice, the failure. Ask what theirs does there, in their own words for it.',
    marks: ['first', 'start', 'begin', 'empty', 'none', 'nothing', 'edge', 'boundary', 'wall', 'limit',
      'fail', 'fails', 'error', 'missing', 'offline', 'lost', 'timeout', 'resized', 'corner'],
  },
  {
    key: 'fixed',
    label: 'fixed or free',
    // ⚠️ REWRITTEN 2 September 2026 after a ten-round run. The first version said "point at a number or a
    // named quality", and on a specification with no numbers in it the model pointed at "red" and asked
    // how the red quality EXISTS within the window, and where the speed RESIDES — questions that are not
    // about changeability at all and barely mean anything. The aim now names the act (somebody else
    // changing it) rather than the grammar (a number or a quality).
    aim: 'Ask what somebody OTHER than her could change about it without rebuilding it — and what would '
      + 'happen if they did. Take a thing her text treats as settled and ask who settled it, or what it '
      + 'would take for it to be different.',
    marks: ['constant', 'fixed', 'configurable', 'setting', 'settings', 'parameter', 'adjust',
      'adjustable', 'default', 'config', 'tune', 'change it', 'hardcoded', 'preference'],
  },
  {
    key: 'enough',
    label: 'how anybody would know',
    aim: 'Ask how somebody who did NOT build it would know it works — what they would do, and what they '
      + 'would see. Not whether it is good; what would be observable.',
    marks: ['works', 'working', 'test', 'tests', 'verify', 'check', 'demonstrate', 'show', 'observe',
      'measure', 'prove', 'confirm', 'succeeds', 'done', 'complete'],
  },
];

export const JOINT_KEYS = JOINTS.map((j) => j.key);

// 🔴 A JOINT IS "TOUCHED", NEVER "COVERED", AND THE WORD IS DELIBERATE. This reads whether the words of a
// joint appear at all. It does not read whether the answer is any good, whether it is complete, or
// whether the student has thought about it — none of which is available from a word list, and all of
// which the vocabulary would quietly imply. Everything downstream treats an untouched joint as a place
// to ASK, never as a fault to report.
//
// ⚠️ Bounded, and the bound is stated rather than hidden: a spec that addresses the edges without using
// any of the edge words reads as untouched, and the question that follows will ask about something she
// has already said. That is a wasted turn, not a wrong verdict — which is the failure direction to
// prefer on a surface whose whole risk is telling somebody what is missing.
export function readJoints(text) {
  const hay = ` ${String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const touched = {};
  for (const j of JOINTS) {
    const hits = j.marks.filter((m) => hay.includes(` ${m} `));
    touched[j.key] = { touched: hits.length > 0, hits };
  }
  const untouched = JOINTS.filter((j) => !touched[j.key].touched).map((j) => j.key);
  return { touched, untouched, n: JOINT_KEYS.length - untouched.length };
}

// WHICH LINE OF QUESTIONING COMES NEXT.
//
// 🔴 UNTOUCHED JOINTS FIRST, THEN ROTATION — and never the same joint twice running. The first rule is
// where the value is: the joints she has not written about are the ones something else will decide for
// her. The second is this project's standing finding that a station spent too long reads to a student as
// one question asked seven times.
//
// ⚠️ `asked` is the list of joint keys already used in THIS conversation, taken from the client's own
// transcript. There is no session and no store — the surface is stateless like the other two, and the
// rotation is recomputed from what the transcript says, which is the same machinery the prep arc uses.
export function nextJoint({ text = '', asked = [] } = {}) {
  const { untouched } = readJoints(text);
  const spent = new Set(asked);
  const fresh = untouched.filter((k) => !spent.has(k));
  if (fresh.length) return JOINTS.find((j) => j.key === fresh[0]);
  const rest = JOINT_KEYS.filter((k) => !spent.has(k));
  if (rest.length) return JOINTS.find((j) => j.key === rest[0]);
  // 🔴 EVERY JOINT HAS BEEN ASKED — GO TO THE LEAST RECENTLY ASKED, and this line was wrong until a
  // ten-round probe caught it. It read `asked[0]`, the FIRST joint ever asked, which after the sixth
  // question is the same key every turn: the run went state · fixed · enough · change · decision · edges
  // and then state · state · state · state. Every unit test passed throughout, because each proves the
  // rotation for ONE call and none of them runs a conversation past six turns. That is this repository's
  // own standing lesson — a unit test cannot tell you the plan moves — arriving in the surface built
  // after it was written down.
  const lastAt = new Map();
  asked.forEach((k, i) => lastAt.set(k, i));
  let pick = JOINT_KEYS[0], best = Infinity;
  for (const k of JOINT_KEYS) {
    const at = lastAt.has(k) ? lastAt.get(k) : -1;
    if (at < best) { best = at; pick = k; }
  }
  return JOINTS.find((j) => j.key === pick) || JOINTS[0];
}

// The words of the student's own specification, for the invention check the validator runs. Same shape as
// the enquiry surface's `ownWords`: the stone may only point with words that are already on the page.
export function specTerms(text) {
  const set = new Set();
  for (const w of String(text || '').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || []) set.add(w);
  return set;
}
