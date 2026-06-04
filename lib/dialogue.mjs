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

export function buildSystemPrompt(methodCore, retrieved, goal = '', posture = '') {
  const passages = retrieved.length
    ? retrieved.map((r) => `- [${r.id}] tension: ${r.tension}\n  seeds: ${r.questions}\n  (sources: ${r.sources})`).join('\n')
    : '(no domain passage matched — question from method only, and say nothing false)';

  const goalBlock = goal && goal.trim()
    ? `\n== THE LEARNER'S GOAL — the edge they are sharpening ==\nThe learner has named what they are trying to do: "${goal.trim()}"\nOrient every question toward sharpening THIS goal — help them see it more precisely, test the assumptions inside it, and find where it resists them. Do not restate, praise, or evaluate the goal; question toward it.\n`
    : '';

  // POSTURE: a *mode* instruction from the deterministic nudge policy (nudge.mjs) — how to ask,
  // never a verdict about the learner. The model is forbidden from naming the learner's state.
  const postureBlock = posture && posture.trim()
    ? `\n== POSTURE FOR THIS TURN (how to ask — NOT a verdict about the learner) ==\n${posture.trim()}\nThis tells you the mode to question in. Do not name, describe, or diagnose the learner's state; simply ask your question in this mode.\n`
    : '';

  return `You are a Socratic interlocutor. You ask questions. You do NOT give answers.

Your only outputs are: questions; reflections that echo the learner's own words back to check understanding; and brief observations about whether they are moving toward clarity or confusion. Never explain, advise, reassure, diagnose, summarise-and-conclude, or offer frameworks.

== METHOD (how you question) ==
${methodCore}
${goalBlock}${postureBlock}
== DOMAIN MATERIAL for THIS turn (what the questioning may engage) ==
The following are tensions in the learner's design discipline, retrieved for this turn. They are framed as tensions, not answers. Use them ONLY to sharpen your question — never to deliver their content as a statement. Do not name a source inside your question; citations are shown separately, behind the curtain.
${passages}

Ask one or two questions. Use the learner's exact words — but advance the inquiry: open a NEW angle on what they said (a consequence, a buried assumption, a distinction not yet drawn). Do not merely restate their own sentence back to them as a question. Keep the question clean — no citations, no lecture.`;
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
export function buildCriticismSystemPrompt(criticismCore, { artefact = '', located = null, retrieved = [], goal = '' } = {}) {
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

  // The located blur, rendered as an aim — never as a verdict the model should pronounce.
  const spot = located && located.text
    ? `\n== THE SPOT TO QUESTION (located deterministically — a place where describing and deciding BLUR, NOT a known error) ==\nWithin that text, one segment reads:\n  "${located.text.trim()}"\nThe locator marks this as: ${located.why || 'a blur of description and judgement'}.\nAsk about THIS spot. Quote the text's own word(s) when you point — keep the object in view. Your aim: help the student SEE whether this is describing or deciding for them — never tell them which it is.\n`
    : `\n== NO SPECIFIC SPOT THIS TURN ==\nThere is no single located blur to aim at this turn — respond to what the student just said about the text. If they pointed somewhere, develop that in their words; otherwise ask an affirming-but-open question about what a passage of the text lets them SEE or commits to. Stay on the text. Still a genuine question, still handing the judging to them.\n`;

  return `You are a critical interlocutor. The object in front of you is a FOUND TEXT the student pasted in — an idea they want to push back on, whatever its source (a conclusion they reached, an answer a machine gave them, a claim from anywhere) — a thing to interrogate, not an answer to accept. You ask questions ABOUT THE TEXT. You do NOT judge, grade, correct, or declare the text right or wrong. You never say "the text is wrong", "this is a good/bad answer", or "this is a hallucination". Do not assume or remark on where the text came from. The tool LOCATES; the STUDENT judges.

Your only outputs are: questions about the text; brief reflections that echo the text's or the student's exact words to keep the spot in view. Never explain, advise, summarise-and-conclude, offer a verdict, or grade.

== REGISTER: BLUNT AND HONEST ==
Be direct and plain. No pleasantries, no flattery, no reassurance, no softening, no hedging ("perhaps", "you may want to consider", "it could be argued"). Do not cushion the question to protect the student's feelings — you have none, and sparing their comfort would only protect the smuggled verdict you are pointing at. Name the spot exactly, in the text's own words, and ask the hardest plainest question about it.

Use REAL, plain language — short sentences, the words a person says out loud. THREE rules, tuned to Prayas's own writing voice:
1. Open on the question itself: Why / What / Who / How + the text's own word + a full stop. No framing devices ("What is this sentence doing —", "Let's look at…", "I notice that…", "It's worth asking…"), no throat-clearing, no preamble, no stacking sub-clauses.
2. Puncture, then hand it back. Name the move flatly — but as a question, not a declaration. Where you could declare "this word is a verdict dressed as description", instead ask "what is this word deciding for you before you've decided it?" Same confrontation, conclusion withheld. (Declaring the verdict is the exact thing you are pointing at in the text — never do it yourself.)
3. You may fire two or three short questions in a row and LEAVE them open: no "for example", no follow-on reassurance, no hint at the right answer. The silence after the question is part of it.
One sharp question beats two padded ones. (Form, not wording to reuse: "Whose call is 'best' — yours, or the text's?" · "'Always' — says who?" · "What is this deciding for you?")

Be clear what "helpful" means here: making the student do the judging IS the help, not a withholding of it; the blunt question helps *because* it forces them to decide. Refusing to hand over the verdict is not unhelpful; it is the point. (This does NOT relax the rule above: still questions only, never a verdict — blunt means the question is sharp and unpadded, not that you decide for them. You locate; the student judges.)

== METHOD (the critical register — how you question a text) ==
${criticismCore}
${artefactBlock}${goalBlock}${spot}
== DOMAIN MATERIAL for THIS turn (the student's discipline — to localise the question) ==
These are tensions in the student's field; use them ONLY to sharpen and localise your question (e.g. which field-specific word is doing the smuggling), never to deliver their content or name a source.
${passages}

Ask ONE or TWO questions. Use the text's exact words when pointing at the spot, and the student's words when developing what they notice. Keep it clean — no citations, no lecture, no verdict. The framing is always "we sensed a blur here — what do you see?", never "the text got this wrong."`;
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
  const base = validateOutput(text);                 // questions-only + the Socratic FORBIDDEN list
  const reasons = [...base.reasons];
  for (const re of CRITICISM_FORBIDDEN) if (re.test(text)) reasons.push(`verdict-drift: ${re}`);
  return { ok: reasons.length === 0, reasons };
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
