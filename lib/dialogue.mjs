// dialogue.mjs — Part A method core (resident) + system-prompt assembly + never-answer validation.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Load all method notes; they sit resident in the system prompt every turn (net-input-like).
export function loadMethodCore(methodDir) {
  return readdirSync(methodDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(join(methodDir, f), 'utf8'))
    .join('\n\n---\n\n');
}

// The STABLE system prompt — preamble + method core + the learner's goal (which holds across a quest)
// + the standing instruction. It deliberately carries NONE of the per-turn material (retrieved tensions,
// posture): those change every turn and live in the turn context (buildTurnContext) instead. Keeping
// the leading prefix stable is what lets prompt caching reuse it (the model recomputes only the fresh
// turn, not the whole preamble + history, every time). The goal is stable within a quest, so it stays
// here; it changes only when the learner re-draws their edge, which legitimately invalidates the cache.
export function buildSystemPrompt(methodCore, goal = '') {
  const goalBlock = goal && goal.trim()
    ? `\n== THE LEARNER'S GOAL — the edge they are sharpening ==\nThe learner has named what they are trying to do: "${goal.trim()}"\nOrient every question toward sharpening THIS goal — help them see it more precisely, test the assumptions inside it, and find where it resists them. But do not ONLY press on its weak points: also open where it could go — what it makes possible, what else makes it worth pursuing, an adjacent question it raises. Move the angle each turn — a consequence, a buried assumption, a sideways connection — and never circle the same question you already asked. Vary the FORM as well as the angle — do not make every question a hypothetical reframe ("if you were to imagine/treat X as Y…"); a short, blunt, concrete question is often better. Each question should be MORE concrete and particular than the one before — reach for a specific tension, moment, consequence, or example; never fall back on a generic opener ("what else could be better", "how might you improve this", "what else could you consider"). When the learner has just moved their own thinking forward, you MAY open with a brief, warm line naming what is working in their line of thought ("this line is opening something", "that distinction is doing real work") — encouragement aimed at the thread they are developing, never a grade of them as a person — before the single question. Do not restate or evaluate the goal; question toward it.\n`
    : '';

  return `You are a Socratic interlocutor. You ask questions. You do NOT give answers. THE PURPOSE OF THIS MODE IS TO HELP THE LEARNER DEVELOP THEIR IDEA — to open it, sharpen it, and take it further through their own thinking. (The other mode stress-tests an idea to see if it holds; this one grows it.)

Your only outputs are: questions; reflections that echo the learner's own words back to check understanding; and brief observations about whether they are moving toward clarity or confusion. Never explain, advise, reassure, diagnose, summarise-and-conclude, or offer frameworks.

== METHOD (how you question) ==
${methodCore}
${goalBlock}
== DOMAIN MATERIAL ==
With the learner's latest message you are given tensions in their design discipline, retrieved for this turn, and sometimes a posture telling you the mode to question in. They are framed as tensions, not answers. Use them ONLY to sharpen your question — never to deliver their content as a statement, and never to name, describe, or diagnose the learner's state. Do not name a source inside your question; citations are shown separately, behind the curtain.

Ask EXACTLY ONE question — a single sentence ending in one question mark. Do NOT ask a second question or tack on a follow-up ("And when…? And if…?"): one clean cut, never a pincer. (A short reflection in the learner's own words may precede it, but the turn ends on that single question.) Use the learner's exact words — but advance the inquiry: open a NEW angle on what they said (a consequence, a buried assumption, a distinction not yet drawn). Do not merely restate their own sentence back to them as a question. Keep it short and clean — one question, no citations, no lecture.`;
}

// The PER-TURN context — the volatile material (retrieved tensions + posture) prepended to the learner's
// latest message. It lives in the final turn, AFTER the cached prefix (stable system + prior history),
// so it is the only part recomputed each turn. The persisted history stores the learner's RAW message,
// never this wrapper, so the prior turns stay byte-stable for the cache and carry no stale per-turn
// material. POSTURE is a *mode* instruction (nudge.mjs) — how to ask, never a verdict about the learner.
// AIM vs POSTURE — two different things, both code-owned, and the order matters. The AIM (lib/arc.mjs)
// is the LINE OF QUESTIONING: what kind of question this turn asks, rotated by the arc so a long
// enquiry keeps moving. The POSTURE is the MODE of asking for this one turn (a felt-shift event, or a
// cadence nudge). When a felt event fires, the arc has already held its aim, so the two agree rather
// than compete: stay with what the learner just named, and ask it in this line. Neither is ever a
// verdict about the learner (#7); both are modes of asking.
export function buildTurnContext({
  retrieved = [], posture = '', aim = '', shape = '', message = '',
  newMaterial = null, dwell = null, vantage = false, declined = null, corrected = false, assoc = '', widen = '',
  banOpeners = [], precision = false, featureInvite = false, focus = null,
}) {
  const passages = retrieved.length
    ? retrieved.map((r) => `- [${r.id}] tension: ${r.tension}\n  seeds: ${r.questions}\n  (sources: ${r.sources})`).join('\n')
    : '(no domain passage matched — question from method only, and say nothing false)';

  // VANTAGE (change 3, 28 Jul 2026) — promote ONE retrieved tension from background grounding to the
  // DIMENSION this question opens. The learner's problem stays fixed; the place you look at it from
  // moves. This is what makes the corpus load-bearing: 265 citation-verified design tensions are 265
  // places to stand, and until now they only ever informed a question the model was composing about
  // something else. (Said "265 verified" until 9 Aug 2026, which the curtain has never claimed: the
  // CITATIONS are verified for all 265; the FRAMING is signed off on 70 — invariant #0.)
  const vantageBlock = vantage && retrieved.length
    ? `\n[VANTAGE for this turn — do NOT state this tension, do not name it, do not teach it. Stand in it and ask about THEIR project from here: ${retrieved[0].tension}]\n`
    : '';

  // SUCCESSION (change 1) — the question exists because of what they just said. The student laid a trail of
  // new material on almost every turn (vacuum → no air → background sounds → anxiety) and the stone
  // followed none of it, because the aim was chosen by a counter rather than by his reply.
  const successionBlock = newMaterial && newMaterial.length
    ? `\n[TAKE THIS UP — words the learner has JUST brought in that they had not used before: ${newMaterial.map((w) => `"${w}"`).join(', ')}. Build your question out of ONE of them. It must be legible to them that this question came from what they just said.]\n`
    : '';

  // DWELL (change 2) — persistence is heat, not exhaustion. What they keep returning to is the anchor
  // and does not move; what moves is the approach to it.
  const dwellBlock = dwell && dwell.anchor
    ? `\n[STAY ON "${dwell.anchor}" — they keep coming back to it, which means it matters, not that it is spent. Do NOT change the subject to something else. Come at "${dwell.anchor}" a different way this turn: ${dwell.approach}]\n`
    : '';

  // OPENER BAN (proactive half of the enforcement above): name the forbidden openers in the prompt so
  // the guard's repair path is the backstop, not the norm.
  const openerBlock = banOpeners && banOpeners.length
    ? `\n[Do NOT begin this question with ${banOpeners.map((w) => `"${w}"`).join(' or ')} — your last question${banOpeners.length > 1 ? 's' : ''} began that way. Open with a different word.]\n`
    : '';

  // PRECISION, conditional on the learner (29 Jul 2026 — Siddhi: prefer "what specifically" / "which
  // one" / "what's the exact moment" over "what makes"). The demand v0.11.0 removed globally is back as
  // a CONDITIONAL: the caller sets `precision` only when the learner's recent replies show they have
  // particulars ready to give (rich, no recent refusals). A learner who has just said they cannot word
  // it never sees this; a learner handing over dense material is met at their level instead of being
  // asked soft "what makes" questions they experience as evasive. Two real students, opposite needs —
  // the register follows the evidence of the current session, never a global setting.
  const precisionBlock = precision
    ? `\n[This learner answers with specifics. Prefer the pointed ask — "which one?", "what exactly?", "what is the exact moment?", "name the particular …" — over soft "what makes" framings. Still ONE question, still their words.
The particular you ask for must belong to something they have ACTUALLY SAID. Do not ask for the exact moment, point or threshold of a change, shift, transition or trade-off they have not described — a pointed question about an event that never happened is worse than a vague one, because its precision makes the invention sound established.]\n`
    : '';

  // FEATURE INVITE (29 Jul 2026) — every concrete part of the idea the conversation has named has had
  // its questions. Rather than re-enter one, hand the naming to the learner: her spec verbatim ("after
  // 2 questions ask for another feature that may help the users"), and the topic stays theirs to grow.
  const inviteBlock = featureInvite
    ? `\n[Every concrete part of their idea that this conversation has named has been asked about. Do NOT re-enter one. Invite them to NAME another concrete part or feature of what they are making — one that would help the people it is for — and ask ONE question about that. Their word for it; do not supply candidates.]\n`
    : '';

  const postureBlock = posture && posture.trim()
    ? `\n[POSTURE for this turn — the mode to ask in, NOT a verdict about the learner: ${posture.trim()}]\n`
    : '';

  // SHAPE — the question's FORM for this turn, rotated deterministically (nudge.mjs formShape). Separate
  // from AIM (what to ask about) and POSTURE (the mode): this one is only about the sentence. It exists
  // because the model falls into a stock opener and the echo detector that was meant to catch that fired
  // on 16 turns in 19, i.e. always. Rotating the shape prevents the repetition instead of chasing it.
  const shapeBlock = shape && shape.trim()
    ? `\n[SHAPE of this question — about the SENTENCE only, never about the learner: ${shape.trim()}]\n`
    : '';

  // DECLINED — they have just said they do not know. This OUTRANKS everything above it: when it fires,
  // the aim, the dwell anchor and the new-material list are all suppressed, because each of them would
  // have the model build on words that carry no content. Nothing here characterises the learner (#7); it
  // describes what the last message WAS, and hands over material they themselves supplied earlier.
  const declinedBlock = declined
    ? `\n[THEY HAVE JUST SAID THEY DO NOT KNOW. Do NOT build a question out of that reply. Do NOT quote it back to them, do not ask them why they don't know, and do NOT ask the same thing again in different words — they have already told you they cannot answer it.
Change footing. Go back to something they DESCRIBED earlier${declined.anchorText ? `, for instance: "${declined.anchorText}"` : ''}, and ask about that instead.
The question must be EASIER than the one they just refused — that is the whole point of this turn:
- UNDER TWELVE WORDS.
- Do NOT ask for "the first", "the one", "the specific", "the exact" or "the particular" anything. They have just told you they cannot name a thing precisely; asking for a precise thing about something else is the same demand wearing a different coat.
- Do NOT offer them a choice between two options — they are not in a position to pick.
- Ask what HAPPENS, or what they NOTICED, or what they would WANT, or simply invite them to say more about the thing they described. Anything they can answer from what they already know.]\n`
    : '';

  // CORRECTED (round 4) — they have just told the stone its reading was wrong, or its question a
  // repeat. Their correction is authoritative (the same topic authority the redirect rule honours).
  // Suppresses the steering that would press on — but keeps succession (the correction itself carries
  // their re-assertion, which is exactly the material to take up) and keeps the shape rotation.
  const correctedBlock = corrected
    ? `\n[THEY HAVE JUST CORRECTED A READING — the last question read something into their words that they did not put there, or asked again what was already asked. Their correction is authoritative. Do NOT defend the reading, do not re-assert it, do not apologise beyond a word. Take what they DID say — the thing they re-stated in this message — and ask one plain, short question about THAT, in their words. Under fifteen words. Nothing clever.]\n`
    : '';

  // CONCEPT-ONLY (12 Aug 2026). The learner has asked to be questioned about the idea and not about how
  // it gets made. Stated here as well as enforced in the guard, because a refusal that arrives with no
  // prior instruction costs a whole regeneration every time. The prompt makes compliance likely; the
  // guard makes it true. Neither alone is the feature — this project has twice measured that a direction
  // in the prompt does not displace the move the model was going to make anyway.
  const focusBlock = focus === 'concept'
    ? `\n[THE LEARNER HAS ASKED FOR THE CONCEPT ONLY. Do not ask how this would be made, produced, fabricated, tooled, assembled, repaired, or what it would be made of or cost to make. Ask about what it is for, what it means, who it is for, what it assumes, what would have to be true. If they raise production themselves, you may use their word back — but the question you ask is still about the idea.]\n`
    : '';

  return `[DOMAIN MATERIAL for this turn — tensions in my discipline, for you to sharpen your question, not to state back to me:
${passages}
]${focusBlock}${(declined || corrected) ? '' : `${vantageBlock}${aim || ''}${assoc}${widen}${dwellBlock}`}${declined ? '' : successionBlock}${declinedBlock}${correctedBlock}${(declined || corrected) ? '' : inviteBlock}${postureBlock}${precisionBlock}${shapeBlock}${openerBlock}
${message}

[Reply with ONE short Socratic question only — a single sentence. No second question, no follow-up.]`;
}

// Deterministic output guard (architecture.md §5.4). The thin rules layer.
const FORBIDDEN = [
  /\byou should\b/i, /\byou need to\b/i, /\bi (would |'d )?recommend\b/i,
  /\bthe answer is\b/i, /\bit sounds like you\b/i, /\bin conclusion\b/i,
  /\bto summari[sz]e\b/i, /\bhere(?:'s| is) (?:how|why|what)\b/i,
  /\bthere are (?:three|four|five|several|two) (?:types|kinds|ways)\b/i,
];

// `maxWords` (change 5, 28 Jul 2026) — BREVITY AS A CONDITION OF DELIVERY, not a request in a prompt.
// FORM_SHAPES[0] has asked for twelve words or fewer since v0.10.2 and the model complied on 10 of 40
// questions in that student's real session: a rule that only advises is not a rule (the same lesson as the
// guard's own enforcement fix, 24 Jul). Off by default — a caller must opt in, so nothing changes for
// any path that does not pass it.
// `avoid` (round 4, 28 Jul 2026) — the REPEAT gate. Round-3 transcripts showed a question re-asked
// nearly verbatim five turns later ("what happens to the architecture when you stop …" twice), and the
// learner calling it out ("you just asked me the same thing twice"). Rotation prevents the scheduled
// repeats; this catches the composed ones, at the only place a repeat can actually be withheld — the
// guard, which already buffers and repairs (invariant #3's machinery). A question repeats when it
// shares any five-word run with an earlier question, quoted learner text stripped first (two joins may
// legitimately quote the same learner phrase; the FRAME must not recur).
const stripQuoted = (s) => String(s).replace(/["“”][^"“”]*["“”]/g, ' ');
// The QUESTION's opening word — the first token of the first sentence that ends in '?'. A warmth
// preamble ("That distinction… . When…?") must not mask the question's own opener, which is what the
// learner hears as the frame. (Siddhi, 29 Jul: 22 of 24 questions opened "When …" — the two sameness
// metrics, dupOpen and consec, were both structurally blind to a shared opening word.)
export function questionOpener(text) {
  const m = String(text).match(/(?:^|[.!]\s+)([A-Za-z"“']+)[^.!?]*\?/);
  return m ? m[1].toLowerCase().replace(/[^a-z]/g, '') : '';
}
export const questionFrames = (s) => {
  const w = stripQuoted(s).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);
  const g = new Set();
  for (let i = 0; i + 5 <= w.length; i++) g.add(w.slice(i, i + 5).join(' '));
  return g;
};
// The BINARY demand — "is it X, or is it Y?". Judge-shaped: the learner must pick from the tool's two
// boxes rather than say what is so. Measured at 61% of turns the moment the form rotation was removed,
// and still 2 of 7 in a real session that was abandoned. Deliberately narrow: it matches an offered
// CHOICE between two alternatives, not the ordinary conjunction ("what would have to be true for X or
// Y"), so a question is only rejected when it actually hands the learner a menu.
// WIDENED 30 Jul 2026. The first form missed the menu that has no comma and no auxiliary on the second
// limb — "…bluffing BEFORE OR AFTER the transaction is recorded?" — which is a two-box menu exactly as
// much as "is it X or Y", and is where a real student's ten-turn session stopped. The addition is a
// closed set of POLAR PAIRS joined by "or" (before/after, more/less, …): both limbs name opposite ends
// of one axis, which is what makes them a menu rather than a conjunction. "readers or creators" is two
// different things and still passes; "before or after" is one axis with two boxes and does not. Also
// "either X or Y" and "whether or not", which announce the menu outright.
const POLAR = 'before|after|more|less|better|worse|higher|lower|first|last|earlier|later|now|then|good|bad|right|wrong|always|never|inside|outside|internal|external|public|private|start|end|beginning|end';
const BINARY_DEMAND = new RegExp(
  ',\\s*or\\s+(is|are|does|do|was|were|will|would|the|a|an|to|it|that|something)\\b'
  + '|\\bor is it\\b|\\bor are (you|they)\\b|\\bor do you\\b'
  + `|\\b(${POLAR})\\s+or\\s+(${POLAR})\\b`
  + '|\\beither\\b[^?]{0,60}\\bor\\b|\\bwhether or not\\b'
  // 🔴 THE COMPARISON IS A MENU IN A DIFFERENT COAT (17 August 2026). A ten-round critique asked "what is
  // the difference between a standard and a right", "…between wholesale and winning my trust", "…between a
  // wholesale price and the actual cost" — three of ten turns. Every one hands the student two boxes and
  // asks them to sort, which is the thing this rule exists to refuse; it simply says "difference between"
  // where the earlier forms said "or". The student's replies to all three were the shortest in the run.
  // ⚠️ Bounded to the two-term form: "the difference between A and B". A question about a difference the
  // student themselves named ("you said it changed — what changed?") carries no "between" and is untouched.
  // ⚠️ `gap` was in this alternation for one run and came out. "What does that waiting period reveal about
  // the gap between what is promised and what is delivered?" is not a menu — it asks about a gap rather
  // than handing over two boxes to sort — and a gap is an ordinary noun in exactly the register this
  // surface works in. `difference`/`distinction` stay, because a question built on them IS the sorting task.
  + '|\\b(difference|distinction)\\s+between\\b[^?]{0,60}\\band\\b',
  'i');

// A question that opens with an auxiliary or a modal can be answered "yes" — it hands the learner a
// shape to fill rather than asking what is so. THE EVIDENCE (30 Jul 2026, a real ten-turn session):
// three of ten questions opened this way, and both of the session's two thin replies followed one
// ("yes, by identifying behavioural cues"). Its longest, sharpest replies followed the open moves the
// 1,938-pair measurement already favoured. Nothing in the steering asks for this shape — no APPROACH
// and no FLOW_SHAPE is closed — so the guard is not fighting the aim layer here; it is catching a
// default the model falls into on its own.
// MAKING — the vocabulary of production, for the concept-only focus (12 Aug 2026). The learner can ask
// the stone to question the idea and not how it gets made; retrieval drops entries marked
// `**register:** making`, and this is the other half: the question itself is refused if it lands on
// production, and regenerated once with the reason handed back.
//
// 🔴 The line is NARROW and deliberately so (Prayas, 12 Aug 2026): making = fabrication, tooling,
// material afterlife, repair, durability, cost-to-produce. It is NOT everything executional. Form,
// medium, styling, interface and truth-to-materials stay askable, because those are questions about
// what the thing IS, and only production is being set aside. Widening this list quietly changes what
// the toggle means — it is the definition, not a filter to tune.
//
// ⚠️ Bounded by construction, like every guard here (invariant #3): it reads a finite list of marks. A
// production question phrased without any of these words passes. The claim is "the breaches it can see",
// never "no making question was asked".
const MAKING = [
  /\b(manufactur\w+|fabricat\w+|factory|factories|tooling|mould|moulded|injection[- ]mould\w*)\b/i,
  /\b(assembly line|production line|supply chain|batch size|mass[- ]produc\w+|unit cost|cost per unit)\b/i,
  /\b(3d[- ]print\w*|cnc|laser[- ]cut\w*|welded|welding|stitch\w+|extrud\w+)\b/i,
  /\b(repairab\w+|reparable|serviceab\w+|spare parts?|disassembl\w+)\b/i,
  /\b(durability|hard[- ]wearing|wear out|lifespan|shelf life|offcuts?|recycl\w+|landfill|disposal)\b/i,
  /\bhow (?:would|will|do) you (?:make|build|produce|manufacture|fabricate|assemble|repair|fix|mend|join|cut) (?:it|this|that|them|the\b)/i,
  // THE FABRICATION PARTICULARS (added 12 Aug 2026, from the first ten-round run). The list above is
  // the ABSTRACT vocabulary of production, and a stone questioning a real project does not use it: over
  // ten rounds with a making-preoccupied student it asked about tenon sizes, plywood dimensioned to
  // standard sheet sizes, and whether the hex key and fasteners stay available — none of which contains
  // "manufacture", "tooling" or "production". The gap was not in the LINE Prayas drew; every one of
  // those is production under his narrow reading. It was in the list's altitude.
  /\b(tenons?|mortises?|dowels?|joinery|fasteners?|screws?|bolts?|rivets?|brackets?|jigs?|kerf)\b/i,
  /\b(plywood|mdf|laminate|veneer|sheet (?:size|good|stock)|stock thickness|ply|gauge of|tolerances?)\b/i,
  /\b(adhesives?|glue[sd]?|solder\w*|fixings?|hex key|allen key|flat[- ]pack\w*)\b/i,
];

const CLOSED_OPENERS = new Set([
  'is', 'are', 'was', 'were', 'am', 'do', 'does', 'did', 'has', 'have', 'had',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
]);

// The text BEFORE the question sentence — the warmth clause FLOW_SHAPES[3] permits ("if something in
// what they said struck you, you may say so in one short clause first, then ask").
// Everything up to the sentence that carries the '?'. Empty when the question opens the text.
export function preambleOf(text) {
  const m = String(text).match(/^([\s\S]*?[.!])\s+(?=[A-Za-z"“'][^.!?]*\?)/);
  return m ? m[1].trim() : '';
}
// Words a preamble may use freely without them counting as the tool's own material: the connective
// tissue of any English clause, plus the deictics a warmth clause is built from ("that distinction …").
const PREAMBLE_STOP = new Set([
  'that', 'this', 'these', 'those', 'the', 'and', 'but', 'for', 'with', 'from', 'into', 'onto',
  'you', 'your', 'yours', 'they', 'them', 'their', 'its', 'has', 'have', 'had', 'was', 'were',
  'are', 'been', 'being', 'not', 'now', 'just', 'still', 'there', 'here', 'what', 'which', 'when',
  'where', 'how', 'why', 'said', 'say', 'says', 'saying', 'thing', 'something', 'one', 'two',
  'about', 'over', 'under', 'than', 'then', 'also', 'own',
  // APPRAISAL vocabulary — the words a warmth clause uses to VALUE what the learner said rather than to
  // add to it. Neutral by design: they neither count as the learner's words nor against them. Measured
  // over 5,256 logged questions (30 Jul 2026), leaving them in made the rule fire on 3.7% of all turns,
  // and what it caught was overwhelmingly the "that distinction between X and Y is doing real work"
  // warmth motif — a clause built from the learner's own X and Y, dragged under the threshold by the
  // appraisal phrase wrapped around it. Warmth is the largest measured lever there is (+15 arc); the
  // target here is a clause that ASSERTS A TRANSFORMATION the learner never described, and words like
  // "shifting", "becoming" and "turning into" are deliberately NOT neutralised, because they are the tell.
  'distinction', 'difference', 'doing', 'real', 'work', 'pivot', 'interesting', 'strikes', 'struck',
  'noticing', 'notice', 'matter', 'matters', 'sits', 'holds', 'between', 'seems', 'sounds', 'feels',
]);

// 🔴 THE TELL IS REFUSED ON ITS OWN, NOT COUNTED IN A RATIO (17 August 2026). The `ownWords` test below
// is a VOCABULARY test — fewer than half the preamble's content words drawn from the learner — so an
// interpretation ASSEMBLED OUT OF THE LEARNER'S OWN WORDS passes it. Two such clauses reached a real
// student on 17 August (private record in docs/ops/), and both passed correctly by that test: one scored
// four of its eight content words as the student's and missed the threshold by exactly ONE word; the other
// scored nine of twelve and passed comfortably. Both asserted a transformation the student had never
// described, as settled fact, before they were asked anything. The interpretive freight rode on their own
// nouns, which is the whole problem: the more of their vocabulary a reading borrows, the safer it looks.
//
// Shape of it, synthetic: a learner has said "queue", "wait" and "tyre". «The queue building while people
// wait suggests a shift in how the kiosk values time. Where does the waiting start?» — the nouns are all
// theirs, the CLAIM is the tool's, and only "suggests", "shift" and "values" betray it.
//
// The PREAMBLE_STOP comment below already knew this. It neutralises appraisal words and deliberately leaves
// "shifting", "becoming" and "turning into" un-neutralised *because they are the tell* — and then let them
// stand as one vote among many, which is how a ratio drowns them. So they are refused directly instead.
//
// ⚠️ A tell the learner themselves used is THEIRS and passes. In that session the student had written
// "becoming", and Clean Language positively requires saying their word back (invariant #1). The check is
// where the word came from, exactly as the ratio test intends; only the arithmetic changes.
// ⚠️ Bounded, and the bound is the claim: a lexicon refuses only what it recognises. An interpretation
// phrased around none of these words is delivered, and this rule does not certify that no reading was
// smuggled — it refuses the constructions listed here (invariant #3's own standard).
// 🔴 REVERSED THE SAME DAY IT WAS WRITTEN, ON EVIDENCE. This paragraph read: not wired into
// `validateCriticismOutput`, deliberately, because there the preamble points at a TEXT and there is no
// `ownWords` to acquit a word against. The first half was a fair reading and the second half was simply
// wrong — the licence set on that surface is the student's words UNION the artefact's, which the route can
// build and now does. A ten-round critique then showed that surface has the WORSE form problem of the two,
// so the argument for withholding a form guard from it was backwards.
// ⚠️ The original worry stands and is answered by scope: "where does the text move from describing to
// suggesting…" is the method working, and it is untouched, because `preambleOf` reads only the clause
// BEFORE the question sentence. A tell there is the same fault on both surfaces — a reading asserted as
// settled before anybody is asked.
// 🔴 Recorded rather than quietly edited: a decision reversed within a day is worth more to the next
// session than either version alone, because it shows which argument turned out to be load-bearing.
const PREAMBLE_TELLS = [
  { re: /\bsuggests?\b/i,                          forms: ['suggest', 'suggests', 'suggesting', 'suggestion'] },
  { re: /\bimpl(?:ies|y|ying)\b/i,                 forms: ['imply', 'implies', 'implying', 'implication'] },
  { re: /\breveals?\b/i,                           forms: ['reveal', 'reveals', 'revealing'] },
  { re: /\breflects?\b/i,                          forms: ['reflect', 'reflects', 'reflecting'] },
  { re: /\bshifts?\b/i,                            forms: ['shift', 'shifts', 'shifting', 'shifted'] },
  { re: /\bsignificant(?:ly)?\b/i,                 forms: ['significant', 'significantly', 'significance'] },
  { re: /\bunfolds?\b/i,                           forms: ['unfold', 'unfolds', 'unfolding'] },
  { re: /\b(?:shows?|showing)\s+(?:that|how)\b/i,  forms: ['show', 'shows', 'showing'] },
  { re: /\bmeans?\s+(?:that|the)\b/i,              forms: ['mean', 'means', 'meaning'] },
  { re: /\bpoints?\s+(?:to|toward|towards)\b/i,    forms: ['point', 'points', 'pointing'] },
  { re: /\bamounts?\s+to\b/i,                      forms: ['amount', 'amounts'] },
  { re: /\bis\s+really\s+about\b/i,                forms: [] },
];

// MARKDOWN EMPHASIS IS STRIPPED BEFORE ANYTHING ELSE SEES THE QUESTION (16 August 2026). Nothing tells the model to avoid markdown and nothing rendered it, so `does the player *need* that feeling, or do they *want* it?` reached a student with the asterisks intact, and went out again inside the transcript they downloaded and sent on. Formatting, not judgement — the SDC split is untouched: this removes two characters the model added and changes not one word of what it asked.
//
// ⚠️ Deliberately conservative. A marker only comes off when it opens and closes a run tight against non-space and sits at a word boundary, so an asterisk used as an asterisk survives. It runs on the way OUT rather than as a prompt instruction, because a prompt instruction is a request and this is the last place the text can still be changed before it is read.
export function plainQuestion(s) {
  return String(s ?? '')
    .replace(/\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g, '$1')
    .replace(/(?<=^|[\s("'—–-])\*(?=\S)([^*\n]+?)(?<=\S)\*(?=$|[\s.,;:!?)"'—–-])/g, '$1')
    .replace(/(?<=^|[\s("'—–-])_(?=\S)([^_\n]+?)(?<=\S)_(?=$|[\s.,;:!?)"'—–-])/g, '$1');
}

export function validateOutput(text, {
  maxWords = 0, avoid = [], banOpeners = [], mustHold = null, noBinary = false,
  noClosed = false, ownWords = null, focus = null, noCompound = false,
} = {}) {
  const reasons = [];
  if (!text.includes('?')) reasons.push('no question present');
  for (const re of FORBIDDEN) if (re.test(text)) reasons.push(`forbidden pattern: ${re}`);
  // Concept-only: a question about how the thing gets produced is withheld, not merely discouraged.
  // Quoted material is stripped first — the learner may well have SAID "manufacturing", and Clean
  // Language reuses their exact words, so echoing their own term back is not the stone changing subject.
  if (focus === 'concept') {
    // 🔴 CHECK THE QUESTION, NOT THE PREAMBLE (12 Aug 2026, from the second ten-round run). The focus
    // governs what the stone ASKS. The warmth clause says the learner's own words back to them, and
    // invariant #1 positively requires that — Clean Language reuses their literal words. A student
    // building a plywood stool says "plywood", "CNC files", "joinery" and "fasteners" every turn, so
    // checking the whole text refused five turns in ten whose QUESTION was perfectly concept-side and
    // whose preamble merely echoed them. Widening the vocabulary made this WORSE, not better, which is
    // how it was found: the rate went up when the list got more accurate.
    const pre = preambleOf(text);
    const at = pre ? String(text).indexOf(pre) : -1;
    const asked = at >= 0 ? String(text).slice(at + pre.length) : String(text);
    for (const re of MAKING) {
      if (re.test(stripQuoted(asked))) {
        reasons.push('asks about how it gets made, and the learner asked for the concept only — ask about what the thing is for, what it means, or who it is for, not how it would be produced');
        break;
      }
    }
  }

  // CLOSED QUESTION (30 Jul 2026) — the question sentence opens with an auxiliary or modal, so "yes" is
  // a complete answer to it. Withheld here because the guard is the only place a shape can be refused
  // before the learner reads it; the repair carries the reason, so the model re-asks it open.

  // THE PREAMBLE MAY ONLY BE MADE OF THEIR WORDS (30 Jul 2026). The warmth clause is permitted and is
  // the biggest measured lever there is, so it is not banned — but it may ACKNOWLEDGE, never INTERPRET.
  // In a real session the stone prefaced a question with "that focus on behavioural cues is shifting the
  // log from a record of the past to a tool for the next interaction" — a reading the learner had not
  // made, delivered as settled fact before she was asked anything. This is the same failure as the
  // invent-no-premise rule (v0.11.2), one clause earlier: the tool supplying material and treating it as
  // given. The test is where the words come from. Fewer than half the preamble's content words drawn
  // from the learner's own transcript means the clause is the tool's reading, not theirs.
  if (ownWords && ownWords.size) {
    const pre = preambleOf(text);
    const pw = [...new Set((stripQuoted(pre).toLowerCase().match(/[a-z]{3,}/g) || []))].filter((w) => !PREAMBLE_STOP.has(w));
    if (pw.length >= 4) {
      const theirs = pw.filter((w) => ownWords.has(w)).length;
      if (theirs * 2 < pw.length) {
        reasons.push(`the clause before the question states a reading they did not give ("${pre.slice(0, 60)}…") — either drop it and ask the question on its own, or say back only words they used`);
      }
    }
  }

  // THE TELL, refused on its own (17 Aug 2026 — see PREAMBLE_TELLS). Independent of the ratio above,
  // because an interpretation built out of the learner's vocabulary passes the ratio and still asserts.

  // OPENER ROTATION, enforced (29 Jul 2026). The question may not open with the word either of the two
  // previous questions opened with. Rotation-by-instruction alone failed the way prose always fails: a
  // real session opened "When …" on 22 of 24 turns while every sameness metric read clean, because
  // dupOpen compares four-word prefixes and consec drops stopwords — both blind to a one-word frame.
  // Enforcement lives here because the guard is the only place a repeat can be WITHHELD (invariant #3's
  // machinery), and the ban is two words wide, so language never runs short.
  // JOIN VISIBILITY, enforced (29 Jul 2026). When code selected a pair to hold together, the delivered
  // question must actually hold BOTH — at least one of the learner's own content words from each side.
  // Measured before this: joins fired on 13 of 17 turns of a real session and were visible in none.
  // A steering block the model may ignore is not steering (the aim-block lesson, relearned).
  if (mustHold && mustHold.a && mustHold.b) {
    const tw = new Set(stripQuoted(text).toLowerCase().match(/[a-z]{3,}/g) || []);
    const hasA = mustHold.a.some((w) => tw.has(w));
    const hasB = mustHold.b.some((w) => tw.has(w));
    if (!hasA || !hasB) reasons.push(`the question must take up their own words from BOTH quoted statements — reuse one word from each (earlier: ${mustHold.a.slice(0,3).join('/')}; just now: ${mustHold.b.slice(0,3).join('/')})`);
  }
  // THE SIX SHARED WITH THE CRITICISM SURFACE (17 Aug 2026). maxWords, the menu, the closed opener, the
  // opener ban, the frame-repeat gate and the interpretive tell have ONE implementation now, so neither
  // surface can quietly acquire a rule the other lacks — which is exactly how this surface came to have
  // all six while the other had none of them.
  reasons.push(...sharedFormChecks(text, stripQuoted(text),
    { maxWords, avoid, banOpeners, noBinary, noClosed, ownWords, noCompound }));
  return { ok: reasons.length === 0, reasons };
}

// ───────────────────────────── criticism surface ─────────────────────────────
// zetizeti's second face: the same Clean-Language questioning, pointed at a found AI text the
// student pastes in (ai-criticism-mode-start.md, docs/corpus-build/corpus-criticism-*.md). The tool
// LOCATES where the text blurs description into judgement (deterministically, lib/sensed.mjs) and
// ASKS about it; the student judges. Never a verdict about the text.

// The criticism method core: the base Clean discipline + the critical-register notes
// (corpus/criticism/), loaded resident on the criticism surface only — NOT globbed into the Socratic
// prompt (invariant: where the register loads is a per-surface choice, not a silent default).
export function loadCriticismCore(criticismDir) {
  return readdirSync(criticismDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readFileSync(join(criticismDir, f), 'utf8'))
    .join('\n\n---\n\n');
}

// Qualification pass (LLM does LANGUAGE only — it tags, it does not judge). Segments the found text
// the student is pushing back on (whatever its source) and tags each segment's SDC stage so the
// deterministic locator (sensed.mjs) can find the blurs. zetizeti's record is SOURCE-NEUTRAL: `origin`
// and the held value are 'text' = "from the found text, not the reader" — never 'ai' (the tool questions
// an idea from anywhere, not necessarily a machine). 'text' maps to the canon's 'ai' only at the compute
// boundary (qualify.toCanonSegments). The model MUST return ONLY a JSON object — parsed downstream, never streamed to the learner.
export function buildQualificationPrompt() {
  return `You are a careful reader segmenting a found text — an idea the student wants to push back on, whatever its source (a conclusion they reached, an answer a machine gave them, a claim from anywhere) — so a separate, deterministic tool can locate where the text blurs *describing* into *deciding for the reader*. You TAG; you do NOT judge, rate, or correct. You never decide whether a blur is a mistake — that is the student's job, later.

Split the text into consecutive segments (sentences or clauses — a segment is a unit that does ONE kind of work). For each segment assign:
- "sdc_stage": one of
   • "qualification" — neutral setup, description, framing, restating, defining: no consequential call is being made.
   • "judgement" — a consequential call/evaluation/recommendation is made ("X is the best option", "this is good practice", "you should…").
   • "narration" — a call is RELAYED as already-settled fact, with no alternative in view ("the standard approach is…", "obviously…").
   • "mixed" — describing and deciding in the SAME breath (an evaluative word worn as a property: "the clean, intuitive interface…").
- "judgement_held_by": one of
   • "text" — the found TEXT itself made the call (the source decided, not the reader).
   • "human" — the call is explicitly left to the reader to make.
   • "shared" — partly made, partly left open.
   • "n/a" — no judgement in this segment (use with "qualification").

Return ONLY this JSON, nothing else (no prose, no code fence):
{"segments":[{"id":1,"text":"<verbatim segment text>","origin":"text","sdc_stage":"…","judgement_held_by":"…"}, …]}
Use sequential integer ids from 1. Copy each segment's text verbatim. Do not add, omit, summarise, or reorder text. Do not include any field other than those shown.`;
}

// The question pass (LLM does LANGUAGE — composes ONE Clean critical question). The deterministic
// locator has already run; `located` describes the chosen blur (its SDC type), which becomes the
// POSTURE — the *aim* of the question — exactly as the Socratic nudge passes a mode of asking, never
// a verdict (invariant #7). The question points at the spot and hands the judging back. Retrieved
// domain tensions localise it to the student's discipline (discipline-localised-exemplars.md).
export function buildCriticismSystemPrompt(criticismCore, { artefact = '', located = null, posture = '', retrieved = [], goal = '', focus = null, brief = '', windowNote = '', banOpeners = [], avoidFrames = [] } = {}) {
  const passages = retrieved.length
    ? retrieved.map((r) => `- [${r.id}] tension: ${r.tension}\n  seeds: ${r.questions}`).join('\n')
    : '(no domain passage matched — question from the critical method only, and say nothing false)';

  const goalBlock = goal && goal.trim()
    ? `\n== WHAT THE STUDENT IS WORKING ON ==\n"${goal.trim()}" — keep the question tethered to this; do not restate or evaluate it.\n`
    : '';

  // CONCEPT-ONLY (12 Aug 2026) — the same request as on the enquiry surface, and it needs saying here
  // too because the PASTED TEXT often argues about production, and the stone points in the text's own
  // words. The student may still be shown a claim the text makes about making; what is refused is the
  // stone asking THEM to work out how it would be made.
  const focusBlock = focus === 'concept'
    ? `\n== THE STUDENT HAS ASKED FOR THE CONCEPT ONLY ==\nDo not ask how the thing would be made, produced, fabricated, tooled, assembled, repaired, what it would be made of, or what it would cost to produce. Question what the text CLAIMS, DECIDES or ASSUMES — its reasoning, its evidence, whose call it is making. If the text itself talks about production, you may point at that claim in its own words; the question you ask is still about the idea, never about how to build it.\n`
    : '';

  // The artefact, anchored on EVERY turn — so a multi-turn critique keeps pointing at the text rather
  // than drifting into generic questioning of the student's own words (advisor trap).
  //
  // WINDOWED FOR LONG DOCUMENTS (v0.15.0). `artefact` may arrive whole (anything under the old 8,000
  // ceiling, which is byte-identical to previous behaviour) or as a window composed by lib/plan.mjs —
  // the live region verbatim, every other passage present as its opening words. `windowNote` says which,
  // and it is NOT decoration: handed a bare extract a model will assert what the document "never
  // addresses" while the document addresses it two pages later, which on this surface is a verdict about
  // the text. The note is what keeps the question honest about how much of the text it can see.
  const artefactBlock = artefact && artefact.trim()
    ? `\n== THE TEXT UNDER QUESTION (the text the student brought — keep EVERY question pointed at THIS text) ==\n"""\n${artefact.trim()}\n"""\n${windowNote ? `You are seeing PART of a longer document: ${windowNote}. Passages marked […] are shown only by their opening words. Ask about what is IN FRONT OF YOU, and never claim the document does not address something — you cannot see all of it.\n` : ''}`
    : '';

  // THE STUDENT'S OWN PROJECT BRIEF — context for unpacking the text, and NEVER the object of it.
  //
  // 🔴 CALLED "BRIEF", NOT "CONCEPT", AND THE NAME MATTERS IN THIS FILE MOST OF ALL. `focus === 'concept'`
  // already lives here and means something entirely different — the making filter, concept as opposed to
  // production. Shipping a second `concept` in the same functions was a collision I introduced, on screen
  // (a student read "asking about concept only" beside "add your project concept" as one setting) and in
  // the code, where two identifiers a few lines apart meant unrelated things. Prayas, 15 Aug 2026: keep the
  // toggle as concept, rename the upload to project brief. Do not reintroduce `concept` for the document.
  //
  // 🔴 THE WHOLE RISK OF THIS BLOCK IS THAT THE CRITIQUE TURNS ROUND. The student brought a found text to
  // be tested; if the stone starts asking them to justify their own project, the surface has quietly
  // become an assessment of their work, which is a different tool and one nobody consented to. The
  // instruction below is necessary and is NOT what holds the line — a prompt instruction is not a guard.
  // validateCriticismOutput refuses a question that makes the concept the thing being judged, and that
  // refusal is what enforces it.
  const briefBlock = brief && brief.trim()
    ? `\n== WHAT THE STUDENT IS WORKING ON (an EXTRACT from their own project brief — CONTEXT ONLY) ==\n"""\n${brief.trim()}\n"""\nThis is here so your question about the text can land where the student actually stands: use it to choose WHICH part of the text matters to them and WHICH words to point at. This is an extract, not the whole brief, so never say what their project does or does not contain.\n🔴 THEIR PROJECT IS NOT THE THING UNDER QUESTION. Never ask them to justify, defend, evidence or account for their own concept, and never evaluate it. Every question you ask is about THE TEXT UNDER QUESTION above — asked in the light of what they are working on.\n`
    : '';

  // 🔴 TELL THE MODEL WHAT THE GUARD WILL REFUSE (17 Aug 2026). The opener ban and the frame-repeat gate
  // reached this surface earlier today and were enforced at the guard with the composing layer never
  // informed — so the model was fighting a rule it had not been given, and the last question of a
  // ten-round run was still refused for opening with a word it had no way to know was spent. That is this
  // file's own 16 August lesson arriving as SILENCE rather than as contradiction, and it has the same
  // effect: **a rule the composing layer has not been told is a repair loop, not a guard.**
  // The enquiry surface has told its model since 29 July (`openerBlock` in buildTurnContext). This is the
  // same block, and the guard stays exactly as it is — the instruction reduces breaches, the refusal is
  // what enforces them.
  const openerBlock = banOpeners && banOpeners.length
    ? `\n[Do NOT begin this question with ${banOpeners.map((w) => `"${w}"`).join(' or ')} — your last question${banOpeners.length > 1 ? 's' : ''} began that way. Open with a different word.]\n`
    : '';
  // The frames already spent. Named rather than counted, because "do not repeat a frame" is unactionable
  // and "you have already used these openings" is: the model can see what to move away from. Bounded to
  // the last few so the prompt does not grow with the conversation.
  const oneQuestionBlock = '\n[ONE question. A single clause ending in a single question mark. Do NOT join a second question on with "and" — the student answers one of them and the other is noise.]\n';
  const frameBlock = avoidFrames && avoidFrames.length
    ? `\n[You have already asked, in these shapes: ${avoidFrames.slice(-4).map((f) => `"${f}"`).join('; ')}. Ask this one in a DIFFERENT construction — not the same opening move with a new subject.]\n`
    : '';

  // THE AIM for this turn — the rotating line of questioning (the "pointer": one of blur / problem /
  // verified / stakes / behaviours / need-vs-want / hero-hindrance, chosen by pickCriticismPointer and
  // spent ~3–4 questions before advancing — Siddhi, 16 Jul). This is what stops the critique collapsing
  // to "is this a verdict or a property?" every turn: the verdict/blur line is ONE aim among several, not
  // the only one. Injected as a POSTURE (the KIND of question to ask), never a verdict — exactly as the
  // Socratic nudge passes a mode of asking (invariant #7).
  const aimBlock = posture && posture.trim()
    ? `\n== THE LINE OF QUESTIONING FOR THIS TURN (rotate — do NOT repeat the last question's shape) ==\n${posture.trim()}\nAsk about the text in THIS direction. Quote the text's own words where you point, and keep the question genuine — it still hands the judging back to the student, never a verdict.\n🔴 MOVE TO A NEW PLACE IN THE TEXT. If your own previous questions have circled one word, do not point at that word again — the student has answered about it as far as they can, and asking again reads as fixation. Take the word from THIS turn's line of questioning, from a part of the text not yet touched.\n`
    : '';

  // The located blur, rendered as an aim — never as a verdict the model should pronounce. Present only
  // on the 'blur' pointer (or when the student clicked a spot). On other pointers `located` is null and
  // the AIM block above carries the direction, so the question does NOT keep re-pointing at the same blur.
  //
  // 🔴 SETTLED 11 August 2026 — there is ONE rendering. The `experiment/located-enum` flag
  // (`ZETIZETI_LOCATED_MODE`) and its enum branch are REMOVED, not left switched off.
  //
  // What it tested: passing the two tokens (`sdc_stage`, `judgement_held_by`) plus the span, with no
  // interpretation, instead of describeLocated()'s phrase. Measured twice — 9 Aug without the route's
  // posture, 11 Aug with it. Both runs: enum repeats the "whose call" frame ~20 points more often, and
  // under faithful composition its advantages evaporate (brevity 5.3 words -> 1.9; the multi-question
  // win disappears). Full tables: docs/ops/flow-probe-log.md, 9 and 11 August.
  //
  // ⚠️ What is NOT settled, and is a position rather than a measurement: the gloss below INTERPRETS —
  // a closed set of four strings, but composed in the layer that writes sentences. If that is ever
  // ruled unacceptable, the answer is NOT to restore this flag; it is the third mode the log names —
  // enum tokens plus a non-interpretive varying element, to supply the variety the gloss currently
  // smuggles in alongside its reading. Rebuild it deliberately; do not resurrect a dead switch.
  const spot = located && located.text
    ? `\n== THE SPOT TO QUESTION (located deterministically — a place where describing and deciding BLUR, NOT a known error) ==\nWithin that text, one segment reads:\n  "${located.text.trim()}"\nThe locator marks this as: ${located.why || 'a blur of description and judgement'}.\nAsk about THIS spot. Quote the text's own word(s) when you point — keep the object in view. Your aim: help the student SEE what this spot decides for them — asked OPEN, never as a choice between two labels, and never telling them which it is.\n`
    : '';

  return `You are a critical interlocutor, thinking ALONGSIDE the student. The object in front of you is a FOUND TEXT the student pasted in — an idea, whatever its source (a conclusion they reached, an answer a machine gave them, a claim from anywhere). THE PURPOSE OF THIS MODE IS TO STRESS-TEST THAT IDEA — to find out whether it HOLDS. (The other mode develops an idea; this one tests it.) So your questions press where the idea might not hold, ask what it rests on, and probe whether it stands up — but you are not against the student and you are not here to win an argument: testing whether the idea holds is how you help them, and a test they can answer well leaves the idea stronger. You ask questions ABOUT THE TEXT. You do NOT judge, grade, correct, or declare the text right or wrong. You never say "the text is wrong", "this is a good/bad answer", or "this is a hallucination". Do not assume or remark on where the text came from. The tool LOCATES the places to test; the STUDENT judges whether it holds.

Your only outputs are: questions about the text; brief reflections that echo the text's or the student's exact words to keep the spot in view. Never explain, advise, summarise-and-conclude, offer a verdict, or grade.

== REGISTER: ALONGSIDE, DIRECT, AND USEFUL ==
The stance is next to the student, looking at the text together — never a challenge to argue with. Be direct and plain, and be USEFUL: the point is to help the idea get stronger, so the student can SEE it more clearly and take it further — never to knock it down, score it, or vent at it. No flattery and no false reassurance — but no needless harshness either, and no interrogation-for-its-own-sake. Do not cushion the question to protect the student's feelings, and do not sharpen it to sting: a question that only wounds teaches nothing. As often as you point at a soft spot, ask what the idea is reaching for and what would let it stand — the constructive question, not only the corrosive one. Name the spot plainly, in the text's own words, and ask the question that opens a way forward.

Use REAL, plain language — short sentences, the words a person says out loud. THREE rules, tuned to Prayas's own writing voice:
1. Open on the question itself: Why / What / Who / How + the text's own word + a full stop. No framing devices ("What is this sentence doing —", "Let's look at…", "I notice that…", "It's worth asking…"), no throat-clearing, no preamble, no stacking sub-clauses.
2. Point, then hand it back. Name the move plainly — but as a question, not a declaration. Where you could declare "this word is a verdict dressed as description", instead ask "what is this word deciding for you before you've decided it?" Same clarity, conclusion withheld. (Declaring the verdict is the exact thing you are pointing at in the text — never do it yourself.)
3. Balance the pointing-out with a way forward. As well as asking where a judgement was slipped in, ask what the idea is trying to do and what would make it stand up — a constructive question, not only a corrosive one. Productive criticism opens the next step; it does not just puncture.
One clear, useful question beats a cutting one. (Form, not wording to reuse: "Whose call is 'best'?" · "What is this word deciding for you?" · "What is this idea reaching for that it hasn't yet said?")

🔴 NEVER OFFER A CHOICE BETWEEN TWO OPTIONS. Not "is it X, or is it Y?", not "does it A, or does it B?", not "do they need it, or want it?". A two-box question makes the student pick from your boxes instead of saying what is so, and asked every turn it reads as an interrogation with a form to fill. Ask what is so: what the word settles, what the text rests on, what would have to be true. If a contrast is genuinely the point, name ONE side and ask what the text has done about it.

Be clear what "helpful" means here: making the student do the judging IS the help, not a withholding of it — the question helps *because* it lets them decide and see where to go next. Refusing to hand over the verdict is not unhelpful; it is the point. (Still questions only, never a verdict — direct means the question is clear and useful, not that you decide for them, and productive means it opens a way forward, never that you soften into praise or reassurance. You locate; the student judges.)

== METHOD (the critical register — how you question a text) ==
${criticismCore}
${artefactBlock}${briefBlock}${goalBlock}${focusBlock}${aimBlock}${oneQuestionBlock}${openerBlock}${frameBlock}${spot}
== DOMAIN MATERIAL for THIS turn (the student's discipline — to localise the question) ==
These are tensions in the student's field; use them ONLY to sharpen and localise your question (e.g. which field-specific word is doing the smuggling), never to deliver their content or name a source.
${passages}

Ask ONE clear question — a second only if it genuinely opens a different door, never as a pile-on (two questions stacked every turn read as an interrogation, and this mode is alongside the student, not against them). Use the text's exact words when pointing at the spot, and the student's words when developing what they notice. Keep it clean — no citations, no lecture, no verdict. The framing is always "let's test whether this holds — what do you see?", never "the text got this wrong."`;
}

// The verdict-drift guard (item 5). EXTENDS the base never-answer guard — it is still questions-only —
// and additionally forbids verdict/grade/"is-this-AI" language aimed AT THE TEXT (content from
// verdict-language-lexicon.md). Deterministic CODE, sibling to invariant #3; runs only on the
// criticism surface so Socratic validation is unchanged.
const CRITICISM_FORBIDDEN = [
  // 1. verdicts on the text's correctness
  /\b(wrong|incorrect|mistaken|inaccurate)\b/i, /\bthe (text|ai|answer|model)\b[^?]*\b(is|gets|got|made)\b[^?]*\b(wrong|right|a mistake|an error)\b/i,
  /\bhallucinat/i, /\b(this|that) is (a |an )?(error|mistake|falsehood)\b/i, /\bfactually (false|wrong|incorrect)\b/i,
  // 2. grades / appreciation verdicts on the text
  /\b(good|bad|poor|strong|weak|excellent|great|brilliant) (answer|explanation|response|writing|text|point|take)\b/i,
  /\b(this|that|it) is (a |an )?(poor|strong|excellent|weak|good|bad|great)\b/i, /\bwell done\b/i,
  // 3. "is-this-AI" verdicts about the writing
  /\b(this is|clearly|obviously) (ai|machine|chatgpt|ai[- ]generated)\b/i, /\bAI[- ]generated\b/i,
  /\bwritten by (a )?(machine|an? ai|chatgpt)\b/i,
];

// The concept-as-object guard (v0.15.0). When the student has supplied their own project concept as
// CONTEXT, the one thing that must not happen is the critique turning round to interrogate that concept:
// they brought a found text to be tested, and a surface that starts asking them to defend their own work
// is a different tool nobody agreed to. These patterns catch the question whose OBJECT has moved — their
// project named as the thing to justify, evidence, defend or evaluate. Merely mentioning the project is
// fine and must stay fine: "what does this text give your project that it doesn't already have?" is a
// question about the TEXT, asked in the light of the concept, which is exactly the intended shape.
const BRIEF_AS_OBJECT = [
  /\byour (own )?(project|concept|brief|proposal|idea|design|work)\b[^?]{0,80}\b(assume|assumes|assuming|justify|justifies|defend|defends|prove|proves|evidence|support|supports|hold up|holds up|stand up|stands up|valid|works|working)\b/i,
  /\b(justify|defend|evidence|prove|account for|back up)\b[^?]{0,40}\byour (own )?(project|concept|brief|proposal|idea|design|work)\b/i,
  /\b(what|where|why|how)\b[^?]{0,60}\byour (own )?(project|concept|brief|proposal)\b[^?]{0,40}\b(fall|falls|fail|fails|weak|weakness|gap|gaps|missing|lacking|wrong)\b/i,
  /\bis your (own )?(project|concept|brief|proposal|idea|design)\b[^?]{0,60}\?/i,
];

// ─────────────────────── THE FORM CHECKS BOTH SURFACES SHARE (17 August 2026) ───────────────────────
// 🔴 THE TWO SURFACES HAD DISJOINT GUARD SETS AND EACH WAS MISSING THE OTHER'S. Enquiry passed `avoid`,
// `banOpeners`, `noBinary`, `noClosed`, `ownWords` and `mustHold`; `validateCriticismOutput` took
// `{ focus, brief, artefactTerms }` and nothing else. So the opener rotation enforced on enquiry since
// 29 July had NEVER existed here — a ten-round critique on 17 August opened "When you say…" on NINE of
// ten questions, which is the identical failure the enquiry ban was built against ("When…" on 22 of 24).
// This is the SECOND instance of the exact defect fixed on 16 August, when BINARY_DEMAND turned out to be
// unreachable from this function, and it was sitting one parameter list away from the first.
//
// 🔴 THE LESSON IS NOT "ADD banOpeners". It is that a rule written on one surface does not arrive on the
// other, and nothing in the code makes the omission visible — both functions read fine alone. So the
// shared checks now live in ONE function that both call, and `verification/guard-parity.test.mjs` fails
// when a check reaches one surface and not the other. A parity that has to be remembered is not a parity.
//
// ⚠️ What stays per-surface is what is genuinely per-surface: verdict-drift and the artefact anchor belong
// to criticism because only it has a text under question; `mustHold` belongs to enquiry because only it
// makes association joins. Those are differences somebody chose. The six below were nobody's decision.
// ─────────────────── INVENTION, REFUSED RATHER THAN REQUESTED (17 August 2026) ───────────────────
// The system prompt has carried this rule since v0.11.2: *"The particular you ask for must belong to
// something they have ACTUALLY SAID. Do not ask for the exact moment, point or threshold of a change,
// shift, transition or trade-off they have not described — a pointed question about an event that never
// happened is worse than a vague one, because its precision makes the invention sound established."*
//
// 🔴 IT WAS AN INSTRUCTION TO THE MODEL THAT IS DOING THE INVENTING, which is the same shape as a guard
// that only reports. On 17 August a probe asked *"…the specific moment when the rider realizes the repair
// has shifted from a fast service to an artisanal one?"* — the student had described no shift and had never
// said "artisanal". The question is precise, fluent, and about an event that did not happen, and every
// existing rule passed it: it is not a menu, not closed, not too long, its preamble is clean, and its
// content words are mostly the learner's. Precision is exactly what makes it dangerous.
//
// Two constructions, both narrow on purpose. A wide "no new words" rule is wrong — the tool must be able to
// use ordinary English, and Clean Language governs the learner's MATERIAL, not the tool's grammar.

// (a) THE PARTICULAR OF AN UNDESCRIBED CHANGE — the prompt's own rule, made checkable. Fires only when the
// question asks for a pinpoint AND names a transformation the learner never named. Either alone is fine:
// asking for a moment is good questioning, and a learner who said "it changed" may be asked what changed.
const PINPOINT = /\b(the |a |that |this )?(specific|exact|precise)?\s?(moment|point|instant|threshold|second|juncture)\b|\bwhen exactly\b|\bexactly when\b|\bat what point\b/i;
const CHANGE_WORDS = [
  { re: /\bshift(s|ed|ing)?\b/i, forms: ['shift', 'shifts', 'shifted', 'shifting'] },
  { re: /\btransition(s|ed|ing)?\b/i, forms: ['transition', 'transitions', 'transitioned', 'transitioning'] },
  { re: /\btrade[- ]?offs?\b/i, forms: ['tradeoff', 'tradeoffs', 'trade'] },
  { re: /\bturn(s|ed|ing)?\s+into\b/i, forms: ['turn', 'turns', 'turned', 'turning'] },
  { re: /\bbecom(e|es|ing)\b|\bbecame\b/i, forms: ['become', 'becomes', 'becoming', 'became'] },
  { re: /\bevolv(e|es|ed|ing)\b/i, forms: ['evolve', 'evolves', 'evolved', 'evolving'] },
  { re: /\btipping point\b/i, forms: ['tipping'] },
];

// (b) THE DEICTIC INVENTION — "this pharmacy of components", where a noun nobody used is introduced with a
// word that presupposes it is already shared. A learner's reply had said "surgical kit"; the tool said
// "pharmacy" and asked about it as given.
// ⚠️ `the` is deliberately NOT among the triggers, and the first draft included it. English needs "the"
// constantly to refer to what is already in play, and the draft duly refused *"You said the bargaining is
// the part the record misses. What would the log hold instead?"* — a warmth clause made entirely of the
// learner's own words, which is the single largest measured lever this tool has. `this`/`that`/`these`/
// `those` are the words that assert shared reference, and they are the fault.
// ⚠️ At most ONE word may sit between the deictic and the noun. The draft allowed two and lazily, so it
// could skip the actual head noun and land on an adverb three words downstream — the refusal above was
// fired by "instead". A rule that can match the wrong token is a rule about nothing.
// ⚠️ Five letters or more: the abstract nouns any question needs are short, and are listed below anyway.
// Quoted spans are exempt — on the criticism surface, quoting the text IS the method.
const DEICTIC_OK = new Set([
  'moment', 'moments', 'thing', 'things', 'point', 'points', 'reason', 'reasons', 'difference', 'question',
  'questions', 'answer', 'answers', 'place', 'places', 'sense', 'kind', 'kinds', 'sort', 'sorts', 'case',
  'cases', 'example', 'examples', 'person', 'people', 'others', 'rest', 'whole', 'part', 'parts', 'time',
  'times', 'idea', 'ideas', 'word', 'words', 'phrase', 'phrases', 'sentence', 'claim', 'claims', 'text',
  'texts', 'passage', 'line', 'lines', 'story', 'stories', 'first', 'last', 'next', 'same', 'other', 'one',
  'ones', 'something', 'anything', 'nothing', 'everything', 'situation', 'situations', 'experience',
  'experiences', 'process', 'way', 'ways', 'work', 'change', 'changes', 'result', 'results', 'effect',
]);
// ⚠️ A TOKEN SCAN, not a regex with an optional slot. Two drafts of that regex matched the wrong word:
// the first skipped the head noun and landed on an adverb ("the log hold INSTEAD"), the second took a
// preposition as the noun ("That guess ABOUT the buyer's budget"). Both refused warmth clauses made
// entirely of the learner's own words. So the window after the deictic is walked one token at a time,
// function words end the phrase, and a word the learner used clears it without ending the scan — because
// the invented word is often the second one ("that VISUAL synchronization", where "visual" was theirs).
// 🔴 `that` IS NOT HERE, AND THAT IS THE FIFTH NARROWING OF THIS RULE. In English "that" is a relative
// pronoun and a complementiser far more often than it is a determiner, and a question is exactly where
// those uses cluster: *"the information THAT TELLS them…"*, *"the sign THAT DESCRIBES…"*. Both were refused
// as invented things in one ten-round run. Every false positive here refuses a QUESTION THAT WAS FINE,
// which is the worst direction to be wrong in — a missed invention costs one weak question, a wrongly
// refused one costs a good question and a wasted generation.
// ⚠️ The cost is real and is accepted: "that visual synchronisation" is no longer caught. `this`, `these`
// and `those` carry the presupposition this rule is about and almost never introduce a clause.
const DEICTICS = new Set(['this', 'these', 'those']);
const FUNCTION_WORD = new Set([
  'about', 'above', 'after', 'again', 'against', 'along', 'among', 'around', 'because', 'before',
  'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'could', 'during', 'every', 'from',
  'further', 'inside', 'into', 'might', 'more', 'most', 'much', 'must', 'near', 'once', 'only', 'onto',
  'other', 'outside', 'over', 'quite', 'rather', 'really', 'shall', 'should', 'since', 'some', 'such',
  'than', 'their', 'them', 'then', 'there', 'they', 'those', 'through', 'toward', 'towards', 'under',
  'until', 'upon', 'very', 'were', 'what', 'when', 'where', 'which', 'while', 'whose', 'with', 'within',
  'without', 'would', 'your', 'yours', 'still', 'just', 'even', 'also', 'both', 'each', 'been', 'being',
  'have', 'having', 'does', 'doing', 'that', 'this', 'these',
]);

function inventionReasons(text, ownWords) {
  const reasons = [];
  const bare = stripQuoted(String(text));
  const said = (w) => ownWords.has(w.toLowerCase());
  if (PINPOINT.test(bare)) {
    for (const c of CHANGE_WORDS) {
      if (!c.re.test(bare)) continue;
      if (c.forms.some(said)) continue;
      reasons.push('asks for the exact moment of a change they never described — a pointed question about '
        + 'an event that did not happen makes the invention sound established; ask about something they '
        + 'actually said happened');
      break;
    }
  }
  const toks = bare.toLowerCase().match(/[a-z]+/g) || [];
  // ⚠️ MORPHOLOGY, not just plurals (17 Aug 2026, from the run this rule shipped in). A critique quoted the
  // text's word "accountable" and asked about "that accountability" — the same thing named in its own noun
  // form, refused as an invention. A shared prefix of six characters is crude and is the right crudeness
  // here: the cost of missing an invention is one wasted generation, and the cost of refusing the learner's
  // own word back is refusing the method itself (invariant #1).
  const known = [...ownWords];
  const theirs = (w) => said(w)
    || (w.endsWith('s') && said(w.slice(0, -1)))          // plural tolerance: "drawers" clears on "drawer"
    || said(`${w}s`)
    || known.some((k) => k.length >= 6 && w.length >= 6 && k.slice(0, 6) === w.slice(0, 6));
  outer:
  for (let i = 0; i < toks.length - 1; i++) {
    if (!DEICTICS.has(toks[i])) continue;
    for (let j = i + 1; j <= Math.min(i + 2, toks.length - 1); j++) {
      const w = toks[j];
      // 🔴 ONLY A WORD THE LEARNER USED IS WALKED THROUGH. Everything else ENDS the phrase. Earlier drafts
      // skipped past a token they judged uninteresting and flagged one further along — that is how the verb
      // in "this word deciding" came to be refused as an invented thing, and it recurred with a four-letter
      // noun that simply was not on the benign list. The list cannot be complete, so it is no longer load-
      // bearing: the FIRST plausible head noun after the deictic decides, and if it is short, benign or a
      // participle the scan stops rather than hunting for something to object to.
      // ⚠️ The one exception is a modifier they themselves used — that is what catches "that VISUAL
      // synchronisation", where the invented word is the second one and the first is theirs.
      // ⚠️ ORDER MATTERS AND COST A FOURTH DRAFT. The phrase-ending tests run FIRST; only then does a word
      // the learner used let the scan walk on. With `theirs` checked first, "this word decide…" walked
      // through the learner's own noun and flagged the VERB after it. A word being theirs is a reason not
      // to object to that word — never a reason to keep hunting past the end of the noun phrase.
      if (FUNCTION_WORD.has(w)) break;                    // the phrase ended before a noun appeared
      if (DEICTIC_OK.has(w)) break;                       // a benign abstract head noun
      if (w.length < 5) break;                            // a short head noun; the list above cannot be complete
      if (/(?:ing|ed)$/.test(w)) break;                   // a participle means the noun phrase is already over
      if (theirs(w)) continue;                            // their own word: a modifier, or the noun itself
      reasons.push(`"${toks[i]} … ${w}" treats a thing nobody named as already agreed — either use their `
        + 'word for it or ask what it is, never both name it and assume it');
      break outer;
    }
  }
  return reasons;
}

// 🔴 THE COMPOUND QUESTION IS THE TIC'S CARRIER (17 August 2026). Both modes' repair instructions have
// always said "ONE question" — "a single sentence ending in one question mark" on enquiry, "ONE clear
// question ABOUT THE TEXT" on criticism — and neither was ever code. Every question that survived the
// opener ban and the frame gate to ship flagged had the same shape: a first question, then ", and what
// would it take to…". Rotating the opener changed the first clause and left the second, which is why the
// frame gate kept firing after the ban was satisfied: **the frame was never the opening, it was the join.**
// One question also happens to be the method's own requirement, so this is prose becoming enforcement
// rather than a new rule — the third time today.
// ⚠️ Checked against `framing`, so a question mark inside a span quoted from the text is not counted: on
// the criticism surface the text under question may itself contain a question, and quoting it is the method.
const COMPOUND = /[,;]\s+(and|or)\s+(what|how|why|where|when|which|who|whose|whether)\b/i;
function sharedFormChecks(text, framing, { maxWords = 0, avoid = [], banOpeners = [], noBinary = false,
  noClosed = false, ownWords = null, noCompound = false } = {}) {
  const reasons = [];
  if (noCompound) {
    const marks = (String(framing).match(/\?/g) || []).length;
    if (marks > 1) reasons.push('asks more than one question — ask ONE, and let them answer it');
    else if (COMPOUND.test(framing)) {
      reasons.push('joins a second question on with "and" — the student answers one of them and the other '
        + 'is noise; ask the one you most want the answer to, in a single clause');
    }
  }
  if (maxWords > 0) {
    const n = plainQuestion(text).trim().split(/\s+/).filter(Boolean).length;
    if (n > maxWords) reasons.push(`too long: ${n} words (max ${maxWords}) — ask it in fewer`);
  }
  if (noBinary && BINARY_DEMAND.test(framing)) {
    reasons.push('offers a choice between two options — ask what is so, not which of two boxes it falls in');
  }
  if (noClosed) {
    const op = questionOpener(text);
    if (op && CLOSED_OPENERS.has(op)) {
      reasons.push(`"${op} …?" can be answered yes or no — ask it open, so the answer has to be what is actually so (what/how/where/when it happens, or what they would want)`);
    }
  }
  if (banOpeners && banOpeners.length) {
    const op = questionOpener(text);
    if (op && banOpeners.includes(op)) {
      reasons.push(`the question opens with "${op}" again — your last questions opened the same way; open with a different word`);
    }
  }
  if (avoid && avoid.length) {
    const g = questionFrames(text);
    if (g.size && avoid.some((prev) => { const pg = questionFrames(prev); for (const x of g) if (pg.has(x)) return true; return false; })) {
      reasons.push('repeats the frame of an earlier question — ask something else entirely, in a different construction');
    }
  }
  if (ownWords instanceof Set && ownWords.size) {
    reasons.push(...inventionReasons(text, ownWords));
    const pre = stripQuoted(preambleOf(text));
    if (pre) {
      for (const t of PREAMBLE_TELLS) {
        if (!t.re.test(pre)) continue;
        if (t.forms.some((f) => ownWords.has(f))) continue;
        reasons.push(`the clause before the question interprets what they said (${t.re.source.replace(/\\b|\(\?:|\)/g, '')}) — a word nobody used, asserting a reading as settled before they are asked; drop the clause or say back only their own words`);
        break;
      }
    }
  }
  return reasons;
}

export function validateCriticismOutput(text, { focus = null, brief = false, artefactTerms = null,
  maxWords = 0, avoid = [], banOpeners = [], noClosed = false, ownWords = null, noCompound = false } = {}) {
  // The critical register QUOTES the text's own words when pointing at a spot — that IS the method
  // ("point in the text's own words"). A verdict-word ("right", "a mistake", "wrong") or a "you should"
  // sitting INSIDE such a double-quoted span is the TEXT's, not the model's; scanning it there flags
  // CORRECT questions as drift — e.g. «what does that do to the text's claim that "this is the right
  // approach"?» is the model handing the verdict back, not pronouncing one. So run the pattern checks
  // against the model's OWN framing, with double-quoted spans (straight + typographic) removed. The model
  // never wraps its OWN verdict in quotes attributed to the text, so this cannot hide real drift; and
  // questions-only ('?') is still checked on the FULL, unstripped text.
  const framing = String(text).replace(/["“”][^"“”]*["“”]/g, ' ');   // drop the text-quoted spans
  const reasons = [];
  if (!String(text).includes('?')) reasons.push('no question present');
  for (const re of FORBIDDEN) if (re.test(framing)) reasons.push(`forbidden pattern: ${re}`);
  for (const re of CRITICISM_FORBIDDEN) if (re.test(framing)) reasons.push(`verdict-drift: ${re}`);

  // 🔴 THE MENU, refused here as it has been on the enquiry surface since v0.11.3 — added 16 August 2026, from a real student's session. `validateOutput` takes `noBinary` and this function did not, so BINARY_DEMAND existed and was unreachable from the criticism path: six of seven questions in that session were two-box menus, every one of them delivered. The student's words for it were "it feels very off" and "idk in what way more to explain it", which is what a form to fill produces in somebody who has already said what they think.
  //
  // 🔴 THE GUARD ALONE WOULD HAVE FOUGHT THE PROMPT, so the prompt moved in the same commit. Three of the seven CRITICISM_POINTERS aims were themselves written as binaries — blur ("describing something or deciding it"), need-want ("NEED this, or WANT it"), hero-hindrance ("serve the core function, or quietly distract") — as was the exemplar form in the system prompt and the located-spot instruction. The model was doing as it was told, and rotating the station rotated the SUBJECT while preserving the MENU, which is why a session that traversed three stations on schedule read to the student as one question asked seven times. A rule the composing layer contradicts is a repair loop, not a guard.
  //
  // Checked against `framing` for this file's existing reason: the text under question may itself contain "X or Y", and quoting it back is the method working. ⚠️ Bounded like every rule here — it reads a finite list of marks, so a menu phrased around them passes. The claim is the breaches it can see.
  // THE SIX FORM CHECKS THIS SURFACE NEVER HAD. `noBinary` is fixed true: there is no state in which a
  // menu is acceptable here, which is what the 16 August fix established. Everything else arrives from the
  // route exactly as it does on the enquiry side.
  reasons.push(...sharedFormChecks(text, framing,
    { maxWords, avoid, banOpeners, noBinary: true, noClosed, ownWords, noCompound }));
  // Concept-only, same rule as the enquiry surface. Checked against `framing` for the reason above and
  // for a second one that is sharper here: the PASTED TEXT very often talks about production, and the
  // stone points in the text's own words. Quoting the artefact's "manufacturing" back at the student is
  // the method working, not the stone changing subject.
  if (focus === 'concept') {
    for (const re of MAKING) {
      if (re.test(framing)) {
        reasons.push('asks about how the thing gets made, and the student asked for the concept only — question what the text claims, decides or assumes, not how it would be produced');
        break;
      }
    }
  }
  // Only when a concept document is actually in play. Bounding it this way keeps the blast radius at
  // exactly the situation the guard exists for, and leaves every critique without a concept byte-identical.
  if (brief) {
    for (const re of BRIEF_AS_OBJECT) {
      if (re.test(framing)) {
        reasons.push("makes the student's own project the thing being judged — their concept is CONTEXT; the object under question is the text they brought");
        break;
      }
    }
    // 🔴 THE ANCHOR CHECK, and it ENFORCES rather than reports — it returns a reason, generateGuarded
    // repairs once on it, and a question that still cannot anchor is delivered flagged and visible. A
    // question sharing not one informative word with the text under question has stopped being about that
    // text, and with a concept document in the prompt the place it has drifted to is obvious. Deliberately
    // weak — ONE shared term clears it — because the cost of a false refusal here is a wasted generation
    // and the cost of a miss is the surface silently changing what it critiques.
    if (Array.isArray(artefactTerms) && artefactTerms.length) {
      const said = new Set((String(text).toLowerCase().match(/[a-z0-9']+/g) || []));
      if (!artefactTerms.some((t) => said.has(t))) {
        reasons.push('does not point at the text under question — not one of its terms appears; ask about the text, in the light of the concept');
      }
    }
  }
  return { ok: reasons.length === 0, reasons };
}

// ───────────────────────────── criticism repertoire (the pointers) ─────────────────────────────
// The FIX for the single-axis loop (Siddhi, 16 Jul: the critique "constantly framing 'is this a
// property or a verdict' to whatever answer I give"). The verdict/blur line — locate where the text
// blurs describing into deciding — stays as ONE move (it is criticism mode's identity; dropping it
// dissolves the tool). But it becomes one AIM among several: alongside it the design-reasoning lines
// Siddhi wrote out herself (problem · verified-or-observed · stakes · behaviours · need-vs-want ·
// hero-hindrance). The stone spends a small BUDGET of questions on one line, then advances — her
// exact instruction ("get in depth for 3–4 questions for each pointer, then move onto next point"),
// which is also zetizeti's own provenance cadence ("recalibrate every 3–4 exchanges"). Each aim is a
// POSTURE (the kind of question to ask), never a verdict — the model composes the words.
// Each non-'blur' aim OPENS with "Set the verdict/property question aside this turn" because the
// criticism method core pulls hard toward that one axis — without the explicit hand-off the model leads
// every question with "is this a verdict or a property?" (Siddhi's exact complaint). The design-reasoning
// move must be the LEAD of the question, not a coda after the verdict framing.
// describeLocated — the located segment rendered for the prompt: ONE of four fixed strings, selected by
// (sdc_stage × judgement_held_by). It lives HERE, and is imported by both server.mjs and
// scripts/audit-criticism.mjs, because it used to exist as two copies (server.mjs and a "copied
// VERBATIM" duplicate in the audit harness) and they drifted: the harness's copy silently omitted the
// tokens, so a comparison run would have reported `unspecified` for both modes and looked like a clean
// null. Same defect class as the turn-cap guard that refused a whole cohort — one of two copies. One
// copy cannot diverge from itself.
//
// 🔴 NOTE WHAT THIS IS, because the gloss/enum question turns on it: these four strings INTERPRET
// ("describing and deciding in the same breath"), and the interpretation is composed in the layer that
// writes sentences. The set is closed — no novel rationale ever reaches the model — but a closed set of
// interpretations is still an interpretation crossing the seam.
export function describeLocated(seg) {
  const s = seg.sdc_stage, h = seg.judgement_held_by;
  if (s === 'judgement' && (h === 'text' || h === 'shared')) return 'a consequential call the text appears to make for the reader';
  if (s === 'narration' && h === 'text') return 'a call relayed as if it were already settled';
  if (s === 'mixed') return 'describing and deciding in the same breath';
  return 'a place where describing and deciding may blur';
}

export const CRITICISM_POINTERS = [
  { key: 'blur',           aim: "Point at ONE word or phrase in the text and ask what that word settles for the reader before the reader has settled it. Quote the text's own word. ASK IT OPEN — what the word decides, what it rests on, whose call it is — and NEVER as a choice between two labels ('is it describing, or deciding?'), which hands the student a menu instead of a question." },
  { key: 'problem',        aim: "Set the verdict/property question aside this turn. LEAD with this instead: what problem, and for whom, is this idea actually solving? Name the person and the problem in the text's own terms, and ask whether the text has shown it or just assumed it." },
  { key: 'verified',       aim: "Set the verdict/property question aside this turn. LEAD with this instead: is a specific claim here something OBSERVED, or something ASSUMED? Ask what evidence would show it is real rather than taken on faith." },
  { key: 'stakes',         aim: "Set the verdict/property question aside this turn. LEAD with this instead: what is at stake here — who is helped if this idea holds, what outcome it is reaching for, and what it costs if it is wrong?" },
  { key: 'behaviours',     aim: "Set the verdict/property question aside this turn. LEAD with this instead: what do people actually DO in this situation? Ask about the observed behaviour the text rests on, as against what it merely supposes they do." },
  { key: 'need-want',      aim: "Set the verdict/property question aside this turn. LEAD with this instead: what has the text done to tell a need apart from a want here? Name what it would take to show one rather than the other. ASK IT OPEN, never as a choice between the two." },
  { key: 'hero-hindrance', aim: "Set the verdict/property question aside this turn. LEAD with this instead: what is the main thing this is for, and what does this move do to it? Name what it serves and what it costs. ASK IT OPEN, never as a choice between serving and distracting." },
];

// Which line of questioning is this turn on? STATELESS — derived from how many questions the stone has
// already asked (the client sends the transcript each turn) so it needs no stored state. ~3 questions per
// pointer (BUDGET), then advance; a high selfEcho (the stone circling its OWN question) advances one
// pointer early — the same backstop the enquiry break-loop uses, so a stuck line is broken at source.
export function pickCriticismPointer({ stoneCount = 0, selfEcho = 0 } = {}) {
  const BUDGET = 3;                                   // ~3–4 questions per pointer, then move on (Siddhi, 16 Jul)
  const bump = (selfEcho ?? 0) >= 0.5 ? 1 : 0;        // circling its own question → jump to the next line now
  const idx = (Math.floor((stoneCount || 0) / BUDGET) + bump) % CRITICISM_POINTERS.length;
  return CRITICISM_POINTERS[idx];
}

// Robust parse of the qualification pass's JSON output → a Split Record sensed.mjs can read.
// Tolerates a stray code fence or surrounding prose; throws a clean error on genuinely malformed
// output (the endpoint turns that into a graceful 'could not read the text' message, never a crash).
export function parseQualification(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) throw new Error('qualification output was not JSON');
  let obj;
  try { obj = JSON.parse(s.slice(start, end + 1)); } catch { throw new Error('qualification output was not valid JSON'); }
  const segments = Array.isArray(obj.segments) ? obj.segments : null;
  if (!segments || segments.length === 0) throw new Error('qualification produced no segments');
  // Normalise: ensure id, origin, the two SDC tags; keep verbatim text.
  return segments.map((seg, i) => ({
    id: seg.id != null ? seg.id : i + 1,
    text: String(seg.text || ''),
    origin: 'text',
    sdc_stage: ['qualification', 'judgement', 'narration', 'mixed'].includes(seg.sdc_stage) ? seg.sdc_stage : 'qualification',
    judgement_held_by: ['human', 'text', 'shared', 'n/a'].includes(seg.judgement_held_by) ? seg.judgement_held_by : 'n/a',
  }));
}
