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
export function buildTurnContext({ retrieved = [], posture = '', message = '' }) {
  const passages = retrieved.length
    ? retrieved.map((r) => `- [${r.id}] tension: ${r.tension}\n  seeds: ${r.questions}\n  (sources: ${r.sources})`).join('\n')
    : '(no domain passage matched — question from method only, and say nothing false)';

  const postureBlock = posture && posture.trim()
    ? `\n[POSTURE for this turn — the mode to ask in, NOT a verdict about the learner: ${posture.trim()}]\n`
    : '';

  return `[DOMAIN MATERIAL for this turn — tensions in my discipline, for you to sharpen your question, not to state back to me:
${passages}
]${postureBlock}
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

export function validateOutput(text) {
  const reasons = [];
  if (!text.includes('?')) reasons.push('no question present');
  for (const re of FORBIDDEN) if (re.test(text)) reasons.push(`forbidden pattern: ${re}`);
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
  // spent ~3–4 questions before advancing — Siddhie, 16 Jul). This is what stops the critique collapsing
  // to "is this a verdict or a property?" every turn: the verdict/blur line is ONE aim among several, not
  // the only one. Injected as a POSTURE (the KIND of question to ask), never a verdict — exactly as the
  // Socratic nudge passes a mode of asking (invariant #7).
  const aimBlock = posture && posture.trim()
    ? `\n== THE LINE OF QUESTIONING FOR THIS TURN (rotate — do NOT repeat the last question's shape) ==\n${posture.trim()}\nAsk about the text in THIS direction. Quote the text's own words where you point, and keep the question genuine — it still hands the judging back to the student, never a verdict.\n`
    : '';

  // The located blur, rendered as an aim — never as a verdict the model should pronounce. Present only
  // on the 'blur' pointer (or when the student clicked a spot). On other pointers `located` is null and
  // the AIM block above carries the direction, so the question does NOT keep re-pointing at the same blur.
  const spot = located && located.text
    ? `\n== THE SPOT TO QUESTION (located deterministically — a place where describing and deciding BLUR, NOT a known error) ==\nWithin that text, one segment reads:\n  "${located.text.trim()}"\nThe locator marks this as: ${located.why || 'a blur of description and judgement'}.\nAsk about THIS spot. Quote the text's own word(s) when you point — keep the object in view. Your aim: help the student SEE whether this is describing or deciding for them — never tell them which it is.\n`
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
// The FIX for the single-axis loop (Siddhie, 16 Jul: the critique "constantly framing 'is this a
// property or a verdict' to whatever answer I give"). The verdict/blur line — locate where the text
// blurs describing into deciding — stays as ONE move (it is criticism mode's identity; dropping it
// dissolves the tool). But it becomes one AIM among several: alongside it the design-reasoning lines
// Siddhie wrote out herself (problem · verified-or-observed · stakes · behaviours · need-vs-want ·
// hero-hindrance). The stone spends a small BUDGET of questions on one line, then advances — her
// exact instruction ("get in depth for 3–4 questions for each pointer, then move onto next point"),
// which is also zetizeti's own provenance cadence ("recalibrate every 3–4 exchanges"). Each aim is a
// POSTURE (the kind of question to ask), never a verdict — the model composes the words.
// Each non-'blur' aim OPENS with "Set the verdict/property question aside this turn" because the
// criticism method core pulls hard toward that one axis — without the explicit hand-off the model leads
// every question with "is this a verdict or a property?" (Siddhie's exact complaint). The design-reasoning
// move must be the LEAD of the question, not a coda after the verdict framing.
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
  const BUDGET = 3;                                   // ~3–4 questions per pointer, then move on (Siddhie, 16 Jul)
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
