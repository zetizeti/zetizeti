// spec.mjs — the SPECCING surface's deterministic half: which of the eight lines a specification touches,
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

// THE EIGHT LINES. Six of them are joints — the places a specification of anything holds together, and
// they are the same six for a sketch, a daemon, a shopfront and a mesh of radios. The generality is the
// point: it is what makes one surface serve a first-year specifying a bouncing ball and a final-year
// specifying a wireless mesh.
//
// 🔴 A NAME ABOVE THEM AND A REFUSAL BELOW THEM (2 September 2026). `thing` and `refusal` were added so
// this surface asks about the WHOLE written format rather than its middle. The format is eight lines —
// THE THING · STATE · CHANGE · DECISION · EDGES · FIXED OR FREE · ENOUGH · NOT THIS — and until this
// date the surface questioned six of them, so the two lines a student is most likely to get wrong were
// the two nothing here ever asked about. They are kept at the ends rather than folded into the six
// because they are not joints in the same sense: a joint is a place the description holds together,
// `thing` is what the description is OF, and `refusal` is a position the description takes.
//
// 🔴 `line` IS THE FORMAT'S OWN LABEL AND `label` IS THE CONVERSATIONAL ONE, and both live here so they
// cannot drift. The client files an answer under `line`; the prompt and the page name the joint with
// `label`. Two lists would be two derivations of the same fact, which is this repository's most-repeated
// defect and the reason `sharedFormChecks` exists.
export const JOINTS = [
  {
    key: 'thing',
    label: 'the thing itself',
    line: 'THE THING',
    aim: 'Ask what it IS — in one sentence, with no adjectives. Ask what she would call it to somebody '
      + 'who has not read a word of this, or what somebody would have it for. Not how it works.',
    // 🔴 THIS ONE CANNOT BE READ FROM A WORD LIST AND SAYS SO RATHER THAN PRETENDING. Every
    // specification names something, so any mark list here would report `touched` on all of them and the
    // reading would be a formality. Whether a naming sentence is actually present — one sentence, no
    // adjectives, intelligible to somebody outside the project — is a judgement, and this repository has
    // now watched a vocabulary rule fail to draw a judgement line three times (the making/concept
    // register, `ownWords` against an interpretation assembled from her own nouns, `hasTasks` reading
    // true on a sheet carrying none). So it is `detect: false`: never reported touched, always available
    // to ask, and first in the order because naming the thing is where the format starts.
    detect: false,
    marks: [],
    // 🔴 A WORKED WRONG ANSWER, because the aim alone did not hold. Measured 3 September 2026 over three
    // ten-round runs: `thing` produced a naming question twice in six, and the other four were state or
    // decision questions wearing this label — one of them asked "in what state does the box keep the
    // cards?", with the neighbouring joint's own word in it. An aim says what to do and a counter-example
    // says what the near-miss looks like, which is the thing the model actually reaches for.
    example: 'Good: "what would you call this in one sentence, to somebody outside your project?" '
      + 'Not: "in what state does the box keep the cards?" — that asks what it HOLDS, which is a '
      + 'different line entirely.',
  },
  {
    key: 'state',
    label: 'state',
    line: 'STATE',
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
    line: 'CHANGE',
    aim: 'Ask what MOVES — what is different after one pass, one frame, one tick, one visit. Take their '
      + 'own verb and ask what it acts on, or how often it happens.',
    marks: ['each', 'every', 'frame', 'tick', 'loop', 'step', 'update', 'updates', 'moves', 'changes',
      'increment', 'per second', 'interval', 'repeat', 'again', 'cycle'],
  },
  {
    key: 'decision',
    label: 'what decides',
    line: 'DECISION',
    aim: 'Ask what DECIDES — what the thing compares, and against what. Point at a moment in their text '
      + 'where something happens and ask what has to be true for it to happen.',
    marks: ['if', 'when', 'decides', 'threshold', 'condition', 'trigger', 'detect', 'detects', 'reaches',
      'exceeds', 'greater', 'less', 'compare', 'check', 'rule', 'depends'],
  },
  {
    key: 'edges',
    label: 'the edges',
    line: 'EDGES',
    aim: 'Ask about a BOUNDARY — the first moment before anything has happened, the empty case, the '
      + 'thing arriving twice, the failure. Ask what theirs does there, in their own words for it.',
    marks: ['first', 'start', 'begin', 'empty', 'none', 'nothing', 'edge', 'boundary', 'wall', 'limit',
      'fail', 'fails', 'error', 'missing', 'offline', 'lost', 'timeout', 'resized', 'corner'],
  },
  {
    key: 'fixed',
    label: 'fixed or free',
    line: 'FIXED OR FREE',
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
    line: 'ENOUGH',
    aim: 'Ask how somebody who did NOT build it would know it works — what they would do, and what they '
      + 'would see. Not whether it is good; what would be observable.',
    marks: ['works', 'working', 'test', 'tests', 'verify', 'check', 'demonstrate', 'show', 'observe',
      'measure', 'prove', 'confirm', 'succeeds', 'done', 'complete'],
  },
  {
    key: 'refusal',
    label: 'what it will not know',
    line: 'NOT THIS',
    // 🔴 THE ONE LINE THAT IS A POSITION RATHER THAN A DESCRIPTION, and it is asked last for that reason:
    // it is answerable only once she has said what the thing holds and decides, because a refusal is
    // about a conclusion available to it that it declines to draw. Asked first it produces a disclaimer.
    //
    // ⚠️ THE AIM MAY NOT REACH FOR A REASON, and the first draft did. "Why does it not know that?" asks
    // her to defend a position, which is the shape `validateCriticismOutput` refuses on the other surface
    // and which would arrive here as the stone deciding a refusal needs justifying. It asks what, not why.
    // 🔴 THREE WAYS IN RATHER THAN ONE DESCRIPTION, after two rewrites failed. An abstract aim ("ask what
    // it declines to conclude") gave the model nothing to instantiate on a three-line specification, so it
    // substituted the nearest ordinary question every time. Three openings, not one, because a single
    // shape manufactures a tic — `nudge.mjs` found that once with FLOW_SHAPES and it is the reason
    // FLOW_SHAPES constrains plainness rather than construction.
    aim: 'Ask from OUTSIDE the thing, about what somebody cannot learn from it. Best opening: what could '
      + 'somebody NOT find out from it, however long they watched it? Others: what does it do with a '
      + 'thing it has counted, once it has acted on that? What would she not want it to know? Use her '
      + 'own nouns and take nothing for granted about how it works.',
    // Refusal language is detectable in a way a naming sentence is not, because a refusal has to be
    // WRITTEN to exist at all — an unstated refusal is not a refusal, which is the whole finding this
    // line carries. Narrow on purpose: "no" and "not" are everywhere in ordinary prose and would report
    // every specification as having taken a position.
    marks: ['never', 'refuses', 'refuse', 'declines', 'ignores', 'discards', 'forgets', 'deliberately',
      'on purpose', 'will not', 'does not know', 'cannot tell', 'without knowing', 'no history',
      'not stored', 'never stored', 'does not keep', 'keeps none'],
    // 🔴 THIS JOINT FAILED COMPLETELY ON ITS FIRST MEASURED RUN — nought of three — and the cause is a
    // collision with the surface's own refusals rather than a weak aim. The prompt forbids naming an
    // absence, so a question about what the OBJECT does not know reads to the model as the thing it has
    // just been told not to write, and it inverts it: all three came back as "how does it show…", which
    // is the opposite question. The counter-example names the inversion, and `buildSpecSystemPrompt`
    // carries the distinction the model was missing.
    example: 'Good: "what can somebody NOT find out from the shelf, however long they stand there?" '
      + 'Not: "how does the shelf show that a tool is borrowed?" — that asks what it DISPLAYS, which is '
      + 'the inverse of what this line is about.',
    // ⚠️ MEASURED AFTER THE FIX AND ONLY PARTLY BETTER — recorded because a negative result is
    // documentation too, and the next session will otherwise read the fix as having worked. Second run,
    // same three specifications: `refusal` went from nought of three to about one of three, and the two
    // misses were detection questions again ("how does the box distinguish somebody walking in from
    // somebody walking out"). `thing` went from two of six to three of six, and the pattern inside that
    // is the useful part — the FIRST ask is now right in all three runs and the wrap-around ask at
    // question nine drifts back every time, which says the counter-example is doing its work early in a
    // conversation and being outweighed later by everything the transcript has since accumulated. NOT
    // SOLVED. Do not read the example block as having fixed this joint.
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
    // 🔴 `detect: false` READS AS UNTOUCHED, ALWAYS, and that is a stated limit rather than a bug. A line
    // whose presence is a judgement gets no word list here; it is left permanently available to ask, and
    // the cost — one question that may go to something she has already written well — is the cheap
    // direction on a surface whose whole risk is telling somebody what is missing.
    const hits = j.detect === false ? [] : j.marks.filter((m) => hay.includes(` ${m} `));
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
// ⚠️ ONE CONSEQUENCE OF THE ORDER, AND IT IS DELIBERATE RATHER THAN INCIDENTAL. `untouched` comes back in
// JOINTS order and `thing` is both first and permanently untouched, so the FIRST question is always about
// what the thing is. That is where the written format starts and it is the question a specification most
// often cannot answer without adjectives. `refusal` sits last, so it arrives after the six — which is
// what it needs, because a refusal is a conclusion declined and there has to be something to decline.
// 🔴 BUT SAY WHAT THAT ACTUALLY GUARANTEES, WHICH IS LESS THAN "LAST". Being last in the list makes
// `refusal` the last of the UNTOUCHED lines to be asked, not the eighth question — on a specification
// that already touches three joints it arrives fifth. That is accepted; what the order buys is that it
// never comes before a line she has written nothing about, and nothing here can promise more.
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

// 🔴 THE REFUSAL LINE IS COMPOSED IN CODE, AND FOUR MEASURED RUNS ARE WHY (3 September 2026).
//
// It is the only line here the model could not be got to ask, and the record is worth keeping because
// every attempt failed differently and each looked like progress. Ten rounds over three specifications,
// against the real endpoint, four times:
//
//   as first written                          0 of 3 — every question inverted into "how does it show…"
//   + counter-example, + object/document      1 of 3 — the inversion survived on two
//   + an explicit demand for a negative       2 of 3 — and BOTH by presupposing a refusal she never
//                                                      wrote: "why does the window refuse to record the
//                                                      bounces?" invents the refusal and asks her to
//                                                      justify it, which is the presupposition fault and
//                                                      is worse than the inversion it replaced
//   + asked from outside, presupposition named 0 of 3 — the presupposition went and so did the refusal
//
// 🔴 THE PATTERN IS THE FINDING: pushed toward the negative it INVENTS one, and pushed away from
// inventing it stops asking. The model will not hold "ask about something that is not there" without
// either asserting the thing or abandoning the question, and every increment of prompt pressure bought
// one fault by paying for the other. This repository's standing rule is that loosening a gate buys a
// number by giving up the thing being measured; the same is true of tightening a prompt past the point
// where the model can comply honestly.
//
// 🔴 SO THE STONE DOES NOT WRITE THIS ONE. That is Prayas's own move on the prep arc — "the tasks are
// pre-set by another doc, the stone does not have to do it" — arriving on the line that carries the
// course's whole position, and it is the line that can least afford to be wrong.
//
// ⚠️ WHAT IT COSTS, stated because the friction rule requires a cost to be named rather than discovered:
// the question no longer responds to what she has just said. It takes a noun from her specification and
// nothing else, so within one conversation the refusal question is one of three sentences rather than a
// fresh one. That is accepted on this line and would not be accepted on the other seven, which are
// measurably fine.
//
// ⚠️ AND IT PRESUPPOSES NOTHING BY CONSTRUCTION, which is the property the model kept losing: all three
// frames ask about the OBSERVER's knowledge, so none of them asserts anything about how her thing works.

const STOP = new Set(['this', 'that', 'with', 'from', 'when', 'then', 'they', 'them', 'their', 'there',
  'have', 'has', 'been', 'will', 'would', 'could', 'should', 'each', 'every', 'into', 'onto', 'over',
  'under', 'about', 'after', 'before', 'which', 'what', 'where', 'while', 'does', 'doing', 'done',
  'also', 'just', 'only', 'some', 'more', 'most', 'other', 'than', 'thing', 'things', 'something',
  'anything', 'nothing', 'someone', 'somebody', 'anybody', 'person', 'people', 'user', 'users']);

// The noun the question points at: her most-used content word, chosen deterministically so the same
// specification always produces the same question. Ties break on first appearance, which keeps it stable.
export function specNoun(text) {
  const words = String(text || '').toLowerCase().match(/[a-z][a-z-]{3,}/g) || [];
  const order = [], tally = new Map();
  for (const w of words) {
    if (STOP.has(w)) continue;
    if (!tally.has(w)) order.push(w);
    tally.set(w, (tally.get(w) || 0) + 1);
  }
  let best = null, n = 0;
  for (const w of order) if (tally.get(w) > n) { n = tally.get(w); best = w; }
  return best || 'thing';
}

// Three frames rather than one. A single frame is a tic — `nudge.mjs` found that with FLOW_SHAPES — and
// three is enough that the second and third askings of this line in one conversation differ.
const REFUSAL_FRAMES = [
  (n) => `What could somebody not find out from the ${n}, however long they watched it?`,
  (n) => `What does the ${n} do with what it has counted, once it has acted on it?`,
  (n) => `What would you not want the ${n} to know?`,
];

// `nth` is how many times this line has already been asked in this conversation, so the frame advances
// with the conversation and is recomputed from the transcript like everything else here.
export function refusalQuestion(text, nth = 0) {
  return REFUSAL_FRAMES[nth % REFUSAL_FRAMES.length](specNoun(text));
}
