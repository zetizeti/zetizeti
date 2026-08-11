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
  banOpeners = [], precision = false, featureInvite = false,
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

  return `[DOMAIN MATERIAL for this turn — tensions in my discipline, for you to sharpen your question, not to state back to me:
${passages}
]${(declined || corrected) ? '' : `${vantageBlock}${aim || ''}${assoc}${widen}${dwellBlock}`}${declined ? '' : successionBlock}${declinedBlock}${correctedBlock}${(declined || corrected) ? '' : inviteBlock}${postureBlock}${precisionBlock}${shapeBlock}${openerBlock}
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
  + '|\\beither\\b[^?]{0,60}\\bor\\b|\\bwhether or not\\b',
  'i');

// A question that opens with an auxiliary or a modal can be answered "yes" — it hands the learner a
// shape to fill rather than asking what is so. THE EVIDENCE (30 Jul 2026, a real ten-turn session):
// three of ten questions opened this way, and both of the session's two thin replies followed one
// ("yes, by identifying behavioural cues"). Its longest, sharpest replies followed the open moves the
// 1,938-pair measurement already favoured. Nothing in the steering asks for this shape — no APPROACH
// and no FLOW_SHAPE is closed — so the guard is not fighting the aim layer here; it is catching a
// default the model falls into on its own.
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

export function validateOutput(text, {
  maxWords = 0, avoid = [], banOpeners = [], mustHold = null, noBinary = false,
  noClosed = false, ownWords = null,
} = {}) {
  const reasons = [];
  if (!text.includes('?')) reasons.push('no question present');
  for (const re of FORBIDDEN) if (re.test(text)) reasons.push(`forbidden pattern: ${re}`);
  if (maxWords > 0) {
    const n = String(text).trim().split(/\s+/).filter(Boolean).length;
    if (n > maxWords) reasons.push(`too long: ${n} words (max ${maxWords}) — ask it in fewer`);
  }
  if (noBinary && BINARY_DEMAND.test(stripQuoted(text))) {
    reasons.push('offers a choice between two options — ask what is so, not which of two boxes it falls in');
  }

  // CLOSED QUESTION (30 Jul 2026) — the question sentence opens with an auxiliary or modal, so "yes" is
  // a complete answer to it. Withheld here because the guard is the only place a shape can be refused
  // before the learner reads it; the repair carries the reason, so the model re-asks it open.
  if (noClosed) {
    const op = questionOpener(text);
    if (op && CLOSED_OPENERS.has(op)) {
      reasons.push(`"${op} …?" can be answered yes or no — ask it open, so the answer has to be what is actually so (what/how/where/when it happens, or what they would want)`);
    }
  }

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

  // OPENER ROTATION, enforced (29 Jul 2026). The question may not open with the word either of the two
  // previous questions opened with. Rotation-by-instruction alone failed the way prose always fails: a
  // real session opened "When …" on 22 of 24 turns while every sameness metric read clean, because
  // dupOpen compares four-word prefixes and consec drops stopwords — both blind to a one-word frame.
  // Enforcement lives here because the guard is the only place a repeat can be WITHHELD (invariant #3's
  // machinery), and the ban is two words wide, so language never runs short.
  if (banOpeners && banOpeners.length) {
    const op = questionOpener(text);
    if (op && banOpeners.includes(op)) {
      reasons.push(`the question opens with "${op}" again — your last questions opened the same way; open with a different word`);
    }
  }
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
  if (avoid && avoid.length) {
    const g = questionFrames(text);
    if (g.size && avoid.some((prev) => { const pg = questionFrames(prev); for (const x of g) if (pg.has(x)) return true; return false; })) {
      reasons.push('repeats the frame of an earlier question — ask something else entirely, in a different construction');
    }
  }
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
export function buildCriticismSystemPrompt(criticismCore, { artefact = '', located = null, posture = '', retrieved = [], goal = '' } = {}) {
  const passages = retrieved.length
    ? retrieved.map((r) => `- [${r.id}] tension: ${r.tension}\n  seeds: ${r.questions}`).join('\n')
    : '(no domain passage matched — question from the critical method only, and say nothing false)';

  const goalBlock = goal && goal.trim()
    ? `\n== WHAT THE STUDENT IS WORKING ON ==\n"${goal.trim()}" — keep the question tethered to this; do not restate or evaluate it.\n`
    : '';

  // The whole artefact, anchored on EVERY turn — so a multi-turn critique keeps pointing at the text
  // rather than drifting into generic questioning of the student's own words (advisor trap).
  const artefactBlock = artefact && artefact.trim()
    ? `\n== THE TEXT UNDER QUESTION (the found AI text the student pasted — keep EVERY question pointed at THIS text) ==\n"""\n${artefact.trim()}\n"""\n`
    : '';

  // THE AIM for this turn — the rotating line of questioning (the "pointer": one of blur / problem /
  // verified / stakes / behaviours / need-vs-want / hero-hindrance, chosen by pickCriticismPointer and
  // spent ~3–4 questions before advancing — Siddhi, 16 Jul). This is what stops the critique collapsing
  // to "is this a verdict or a property?" every turn: the verdict/blur line is ONE aim among several, not
  // the only one. Injected as a POSTURE (the KIND of question to ask), never a verdict — exactly as the
  // Socratic nudge passes a mode of asking (invariant #7).
  const aimBlock = posture && posture.trim()
    ? `\n== THE LINE OF QUESTIONING FOR THIS TURN (rotate — do NOT repeat the last question's shape) ==\n${posture.trim()}\nAsk about the text in THIS direction. Quote the text's own words where you point, and keep the question genuine — it still hands the judging back to the student, never a verdict.\n`
    : '';

  // The located blur, rendered as an aim — never as a verdict the model should pronounce. Present only
  // on the 'blur' pointer (or when the student clicked a spot). On other pointers `located` is null and
  // the AIM block above carries the direction, so the question does NOT keep re-pointing at the same blur.
  //
  // 🧪 EXPERIMENT (branch experiment/located-enum, 9 Aug 2026) — TWO RENDERINGS of the same located spot.
  //
  //   'gloss' (DEFAULT, unchanged): passes describeLocated()'s phrase — one of four fixed strings the
  //   server selects from (sdc_stage × judgement_held_by). Already a closed set, so the model cannot be
  //   handed novel rationale; but the phrases INTERPRET ("a consequential call the text appears to make",
  //   "describing and deciding in the same breath"), and the interpretation is made in the layer that
  //   writes sentences.
  //
  //   'enum' (EXPERIMENTAL): passes the two TOKENS the phrase was derived from, plus the span, and no
  //   interpretation at all. This is the "schema of enums and spans" shape: the deterministic layer
  //   reports WHICH CASE fired, the span carries the text's own words, and nothing crosses that could
  //   be lifted into the question as a finding about the text.
  //
  // The question this is built to answer is empirical and cuts both ways: does the model still point at
  // the right spot without being told what the spot IS? Withholding the gloss may sharpen the question
  // (nothing to paraphrase into a verdict) or blunt it (nothing to aim at). Compare with
  // scripts/audit-criticism.mjs under both modes on identical input.
  //
  // 🔴 STATUS, corrected 11 August 2026 — this line used to read "Not merged; not deployed." BOTH
  // halves were false. It merged into `main` on 11 Aug, and it has been DEPLOYED since v0.12.0 on
  // 10 Aug, riding in as an ancestor of that tag — inert, because ZETIZETI_LOCATED_MODE is not set on
  // production, so `gloss` is what actually runs. Live code behind an off switch is not "not deployed",
  // and a stale status line is how three separate things went wrong on 11 Aug.
  const mode = (process.env.ZETIZETI_LOCATED_MODE || 'gloss').trim();
  const spot = located && located.text
    ? (mode === 'enum'
      ? `\n== THE SPOT TO QUESTION (located deterministically — NOT a known error) ==\nWithin that text, one segment reads:\n  "${located.text.trim()}"\nThe locator reports only which case fired, and says nothing about what it means:\n  case: ${located.stage || 'unspecified'}\n  the call sits with: ${located.heldBy || 'unspecified'}\nIt has made no reading of this spot for you, and you must not supply one either. Ask about THIS spot. Quote the text's own word(s) when you point — keep the object in view. Your aim: help the student SEE whether this is describing or deciding for them — never tell them which it is.\n`
      : `\n== THE SPOT TO QUESTION (located deterministically — a place where describing and deciding BLUR, NOT a known error) ==\nWithin that text, one segment reads:\n  "${located.text.trim()}"\nThe locator marks this as: ${located.why || 'a blur of description and judgement'}.\nAsk about THIS spot. Quote the text's own word(s) when you point — keep the object in view. Your aim: help the student SEE whether this is describing or deciding for them — never tell them which it is.\n`)
    : '';

  return `You are a critical interlocutor, thinking ALONGSIDE the student. The object in front of you is a FOUND TEXT the student pasted in — an idea, whatever its source (a conclusion they reached, an answer a machine gave them, a claim from anywhere). THE PURPOSE OF THIS MODE IS TO STRESS-TEST THAT IDEA — to find out whether it HOLDS. (The other mode develops an idea; this one tests it.) So your questions press where the idea might not hold, ask what it rests on, and probe whether it stands up — but you are not against the student and you are not here to win an argument: testing whether the idea holds is how you help them, and a test they can answer well leaves the idea stronger. You ask questions ABOUT THE TEXT. You do NOT judge, grade, correct, or declare the text right or wrong. You never say "the text is wrong", "this is a good/bad answer", or "this is a hallucination". Do not assume or remark on where the text came from. The tool LOCATES the places to test; the STUDENT judges whether it holds.

Your only outputs are: questions about the text; brief reflections that echo the text's or the student's exact words to keep the spot in view. Never explain, advise, summarise-and-conclude, offer a verdict, or grade.

== REGISTER: ALONGSIDE, DIRECT, AND USEFUL ==
The stance is next to the student, looking at the text together — never a challenge to argue with. Be direct and plain, and be USEFUL: the point is to help the idea get stronger, so the student can SEE it more clearly and take it further — never to knock it down, score it, or vent at it. No flattery and no false reassurance — but no needless harshness either, and no interrogation-for-its-own-sake. Do not cushion the question to protect the student's feelings, and do not sharpen it to sting: a question that only wounds teaches nothing. As often as you point at a soft spot, ask what the idea is reaching for and what would let it stand — the constructive question, not only the corrosive one. Name the spot plainly, in the text's own words, and ask the question that opens a way forward.

Use REAL, plain language — short sentences, the words a person says out loud. THREE rules, tuned to Prayas's own writing voice:
1. Open on the question itself: Why / What / Who / How + the text's own word + a full stop. No framing devices ("What is this sentence doing —", "Let's look at…", "I notice that…", "It's worth asking…"), no throat-clearing, no preamble, no stacking sub-clauses.
2. Point, then hand it back. Name the move plainly — but as a question, not a declaration. Where you could declare "this word is a verdict dressed as description", instead ask "what is this word deciding for you before you've decided it?" Same clarity, conclusion withheld. (Declaring the verdict is the exact thing you are pointing at in the text — never do it yourself.)
3. Balance the pointing-out with a way forward. As well as asking where a judgement was slipped in, ask what the idea is trying to do and what would make it stand up — a constructive question, not only a corrosive one. Productive criticism opens the next step; it does not just puncture.
One clear, useful question beats a cutting one. (Form, not wording to reuse: "Whose call is 'best' — yours, or the text's?" · "What is this word deciding for you?" · "What is this idea reaching for that it hasn't yet said?")

Be clear what "helpful" means here: making the student do the judging IS the help, not a withholding of it — the question helps *because* it lets them decide and see where to go next. Refusing to hand over the verdict is not unhelpful; it is the point. (Still questions only, never a verdict — direct means the question is clear and useful, not that you decide for them, and productive means it opens a way forward, never that you soften into praise or reassurance. You locate; the student judges.)

== METHOD (the critical register — how you question a text) ==
${criticismCore}
${artefactBlock}${goalBlock}${aimBlock}${spot}
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

export function validateCriticismOutput(text) {
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
  { key: 'blur',           aim: "Point at ONE word or phrase in the text and ask whether it is describing something or deciding it for the reader — whose call is that word making, the text's or the student's? Quote the text's own word." },
  { key: 'problem',        aim: "Set the verdict/property question aside this turn. LEAD with this instead: what problem, and for whom, is this idea actually solving? Name the person and the problem in the text's own terms, and ask whether the text has shown it or just assumed it." },
  { key: 'verified',       aim: "Set the verdict/property question aside this turn. LEAD with this instead: is a specific claim here something OBSERVED, or something ASSUMED? Ask what evidence would show it is real rather than taken on faith." },
  { key: 'stakes',         aim: "Set the verdict/property question aside this turn. LEAD with this instead: what is at stake here — who is helped if this idea holds, what outcome it is reaching for, and what it costs if it is wrong?" },
  { key: 'behaviours',     aim: "Set the verdict/property question aside this turn. LEAD with this instead: what do people actually DO in this situation? Ask about the observed behaviour the text rests on, as against what it merely supposes they do." },
  { key: 'need-want',      aim: "Set the verdict/property question aside this turn. LEAD with this instead: do the people in the text NEED this, or WANT it — and how is the text telling those two apart?" },
  { key: 'hero-hindrance', aim: "Set the verdict/property question aside this turn. LEAD with this instead: does this move help or get in the way of the main thing the product is for — does it serve the core function, or quietly distract from it?" },
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
