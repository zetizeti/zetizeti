// explain.mjs — "explain question" (16 September 2026)
//
// Prayas: "there should a chip 'explain question' under each question — if clicked, the context, the benefit
// to the idea of thinking of the answer and the repercussions of the response will be explained in 250
// words. this will be an exception to all 'no answer' guards. explanation should be in elementary —
// 10-year old level."
//
// 🔴 THIS IS THE ONE PLACE THE NEVER-ANSWER GUARD DOES NOT RUN, AND THAT IS HIS DECISION, NOT A GAP.
// Invariant #3 governs the QUESTIONS. An explanation is a different act, produced on request only, and
// nothing here passes through `validateOutput`, `validateCriticismOutput`, `validateSpecOutput` or
// `generateGuarded`. Do not "restore parity" by routing it through them — the guards would refuse every
// explanation, because explaining is exactly what they exist to refuse.
//
// 🔴 WHAT THE EXCEPTION DOES NOT REACH. The explanation is never added to the transcript the client posts
// back, so the stone never reads it and the next question is composed exactly as it would have been. It is
// not in the download. The questioning is untouched, which is why this file is deliberately NOT in the
// cinematic read's QUESTIONING set.
//
// ⚠️ ONE READING OF THE BRIEF IS MINE AND IS WRITTEN DOWN SO IT CAN BE REVERSED IN ONE LINE. He named three
// things — the context, why thinking about the answer helps, what the response changes. An answer to the
// question is not among them, so the prompt asks the model to explain the question and leave the answering
// to the learner (`DO_NOT_ANSWER` below). Nothing in code enforces it; the exception holds.
//
// Two things ARE checked in code, because both are his stated scope rather than a guard: the length (250
// words, trimmed at a sentence end) and the reading level (a 10-year-old — one regeneration if the first
// draft reads harder than that, then the easier of the two is delivered).

export const EXPLAIN_MAX_WORDS = 250;
// "explained in 250 words" — so the aim is near 250, not merely under it. The first live draft came back at
// 112 when the prompt said only "no more than 250". 250 stays the hard ceiling; the floor is asked for, and
// not enforced, because padding a child's explanation to reach a number would make it worse.
export const EXPLAIN_MIN_WORDS = 200;

// Flesch–Kincaid grade 5 is a ten-year-old's school year. The regeneration fires above 6, not above 5,
// because the syllable count below is a heuristic and a hair-trigger would spend a second call on noise.
export const EXPLAIN_GRADE_TARGET = 5;
const EXPLAIN_GRADE_RETRY = 6;

// The three parts, in his order. Labels are what the learner reads; markers are what the model writes.
export const EXPLAIN_PARTS = [
  { key: 'context', marker: 'ABOUT', label: 'what this question is about' },
  { key: 'benefit', marker: 'HELPS', label: 'why thinking about your answer helps your idea' },
  { key: 'repercussions', marker: 'CHANGES', label: 'what your answer could change' },
];

const DO_NOT_ANSWER = 'Do not answer the question for them, and do not say which answer is right. The answering is theirs.';

const SURFACE_NOTE = {
  enquiry: 'The person is thinking through something they are trying to do. The questions help them think; they never tell them what to do.',
  criticism: 'The person is looking hard at a piece of writing (shown below) and deciding for themselves what they think of it. The questions point at parts of that writing.',
  spec: 'The person is writing a description of a thing they want to make (shown below), so that someone else could build it. The questions ask about what the description says and does not say.',
};

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Bounded, so an explanation can never carry the whole 25,000-character document into the prompt.
export function explainInputs(body = {}) {
  const surface = Object.prototype.hasOwnProperty.call(SURFACE_NOTE, body.surface) ? body.surface : 'enquiry';
  const context = (Array.isArray(body.context) ? body.context : [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-6)
    .map((m) => ({ who: m.role === 'student' || m.role === 'you' ? 'the person' : 'the question-asker', text: clip(m.content, 700) }));
  return {
    surface,
    question: clip(body.question, 700),
    goal: clip(body.goal, 800),
    material: clip(body.material, 3000),
    context,
  };
}

export function buildExplainPrompt({ surface = 'enquiry', question = '', goal = '', material = '', context = [] } = {}) {
  const goalBlock = goal ? `\n== WHAT THE PERSON SAID THEY ARE TRYING TO DO ==\n"""\n${goal}\n"""\n` : '';
  const materialBlock = material ? `\n== THE WRITING THEY ARE WORKING ON (may be cut short) ==\n"""\n${material}\n"""\n` : '';
  const contextBlock = context.length
    ? `\n== THE CONVERSATION JUST BEFORE THE QUESTION ==\n${context.map((c) => `${c.who}: ${c.text}`).join('\n')}\n`
    : '';
  return `You explain a question to someone, in words a ten-year-old can follow.

${SURFACE_NOTE[surface]}
${goalBlock}${materialBlock}${contextBlock}
== THE QUESTION TO EXPLAIN ==
"""
${question}
"""

Write three short parts, each starting on its own line with its marker word and a colon:

ABOUT: what this question is about, and why it is being asked at this point in the conversation.
HELPS: how thinking about the answer can help the person's idea.
CHANGES: what could happen next depending on how they answer — how different kinds of answer would take the idea in different directions.

HOW TO WRITE
- For a ten-year-old. Short sentences. Everyday words. If the question uses a hard word, say what it means in simple words.
- Between ${EXPLAIN_MIN_WORDS} and ${EXPLAIN_MAX_WORDS} words in total — about 75 words for each part. Never more than ${EXPLAIN_MAX_WORDS}.
- ${DO_NOT_ANSWER}
- Do not say what the person feels, thinks or is like. Talk about the question and the idea, not about them.
- Do not praise the question or the person.
- Speak to the person as "you", and call the question "this question". Never say "we", "us" or "our" — nobody else is in this conversation.
- British English: "children", not "kids"; British spelling.
- Plain text only. No bullet points, no headings other than the three marker words, no bold.`;
}

// Parse the three marked parts. Returns null when the text does not carry all three, so the caller can
// regenerate rather than deliver half an explanation dressed as a whole one.
export function readExplanation(text) {
  const src = String(text || '').replace(/\*\*/g, '').replace(/\r/g, '');
  const re = new RegExp(`^\\s*(?:#+\\s*)?(${EXPLAIN_PARTS.map((p) => p.marker).join('|')})\\s*:\\s*`, 'gim');
  const hits = [];
  let m;
  while ((m = re.exec(src))) hits.push({ marker: m[1].toUpperCase(), start: m.index, body: m.index + m[0].length });
  const parts = [];
  for (const p of EXPLAIN_PARTS) {
    const h = hits.find((x) => x.marker === p.marker);
    if (!h) return null;
    const next = hits.filter((x) => x.start > h.start).sort((a, b) => a.start - b.start)[0];
    const body = src.slice(h.body, next ? next.start : src.length).replace(/\s+/g, ' ').trim();
    if (!body) return null;
    parts.push({ key: p.key, label: p.label, text: body });
  }
  return capWords(parts, EXPLAIN_MAX_WORDS);
}

const wordsOf = (s) => String(s || '').split(/\s+/).filter(Boolean);
const sentencesOf = (s) => String(s || '').match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((x) => x.trim()).filter(Boolean) || [];

// 🔴 THE CAP IS HARD. Trim the longest part by whole sentences until the total fits; a part is never cut
// mid-sentence and never emptied (its first sentence always stays), because an explanation with a missing
// part is worse than one a few words long.
export function capWords(parts, max = EXPLAIN_MAX_WORDS) {
  const out = parts.map((p) => ({ ...p, sentences: sentencesOf(p.text) }));
  const total = () => out.reduce((n, p) => n + wordsOf(p.sentences.join(' ')).length, 0);
  while (total() > max) {
    const trimmable = out.filter((p) => p.sentences.length > 1)
      .sort((a, b) => wordsOf(b.sentences.join(' ')).length - wordsOf(a.sentences.join(' ')).length)[0];
    if (!trimmable) break;
    trimmable.sentences.pop();
  }
  // Last resort, only if three single sentences still exceed the cap: cut words and close with a full stop.
  while (total() > max) {
    const longest = out.slice().sort((a, b) => wordsOf(b.sentences[0]).length - wordsOf(a.sentences[0]).length)[0];
    const w = wordsOf(longest.sentences[0]);
    longest.sentences[0] = w.slice(0, Math.max(3, w.length - (total() - max))).join(' ').replace(/[,;:]$/, '') + '.';
  }
  const final = out.map(({ key, label, sentences }) => ({ key, label, text: sentences.join(' ') }));
  return { parts: final, words: final.reduce((n, p) => n + wordsOf(p.text).length, 0) };
}

// Flesch–Kincaid grade level. The syllable count is the usual vowel-group heuristic: good enough to tell a
// primary-school paragraph from a university one, not good enough to argue about a single grade.
export function syllables(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) || []).length);
}
export function readingGrade(text) {
  const words = wordsOf(String(text).replace(/[^A-Za-z'\s.!?-]/g, ' '));
  const sents = Math.max(1, sentencesOf(text).length);
  if (!words.length) return 0;
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sents) + 11.8 * (syl / words.length) - 15.59;
}

export const EXPLAIN_SIMPLER = `That was too hard to read for a ten-year-old. Write it again with the same three marker words. Use shorter sentences — about ten words each — and simpler, shorter words. Keep the same meaning. ${DO_NOT_ANSWER}`;
export const EXPLAIN_REFORMAT = `Write it again as exactly three parts, each starting on its own line with ABOUT:, HELPS: and CHANGES:. Plain text, no more than ${EXPLAIN_MAX_WORDS} words. ${DO_NOT_ANSWER}`;

// Generate, parse, check the level; at most one regeneration. `generate(correction)` is the caller's model
// call, so this stays testable without a network.
export async function explainQuestion({ generate }) {
  const first = await generate(null);
  let a = readExplanation(first);
  if (!a) {
    const again = await generate({ previous: first, instruction: EXPLAIN_REFORMAT });
    a = readExplanation(again);
    if (!a) return null;
    return { ...a, grade: gradeOf(a), attempts: 2 };
  }
  const g = gradeOf(a);
  if (g <= EXPLAIN_GRADE_RETRY) return { ...a, grade: g, attempts: 1 };
  const second = await generate({ previous: first, instruction: EXPLAIN_SIMPLER });
  const b = readExplanation(second);
  if (!b) return { ...a, grade: g, attempts: 2 };
  const gb = gradeOf(b);
  return gb < g ? { ...b, grade: gb, attempts: 2 } : { ...a, grade: g, attempts: 2 };
}
const gradeOf = (a) => Math.round(readingGrade(a.parts.map((p) => p.text).join(' ')) * 10) / 10;
