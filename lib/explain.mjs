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

import { jargonIn } from './jargon.mjs';
import { content } from './signals.mjs';
import { FORBIDDEN, stripQuoted } from './dialogue.mjs';
import { generateGuarded } from './guard.mjs';

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

// ── A TURN THAT DID NOT ASK (30 September 2026) ─────────────────────────────────────────────────────
// Prayas: "there should be a explain-like chip under non-questions explaining the narrative logic in the conversation (so also enquiry logic)". The same three parts under other labels.
//
// 🔴 THE EXPLANATION IS ABOUT THE FLOW OF THE CONVERSATION, NEVER ABOUT WHAT THE CODE READ. The first build handed the prompt the trigger that fired (new material, a short reply, replies shrinking) and had it repeated as the reason. Prayas, shown the list: "I do not want technical, code-based reasons. I want narrative/dialogue flow". The same fault as 28 September, when the said-back itself was briefed with a mechanical account and came back as "seems coded". So this prompt is told nothing about why the turn came. It is given his own account of how a conversation moves (docs/concept/dialogue-flow.md: "dialogue is not hammering. it has ebb and flow", "every dialogue does not need to be a question") and describes the turns before this one and what this one does. It gives no cause, and the guard refuses one.
export const TURN_PARTS = [
  { key: 'context', marker: 'ABOUT', label: 'how the conversation has been moving' },
  { key: 'benefit', marker: 'HELPS', label: 'what holding still does for your idea' },
  { key: 'repercussions', marker: 'CHANGES', label: 'where it can go from here' },
];
// The second sentence was added after the first live read (30 Sep 2026): the explanation of a blank offered "ideas about sound or music", which the person had never said.
const DO_NOT_STEER = 'Do not tell them what to say next, do not say what their words mean, and do not say which way is better. Add no detail of your own to their idea: name no feature, cause, fix or example they have not said themselves. The next reply is theirs.';

const SURFACE_NOTE = {
  enquiry: 'The person is thinking through something they are trying to do. The questions help them think; they never tell them what to do.',
  criticism: 'The person is looking hard at a piece of writing (shown below) and deciding for themselves what they think of it. The questions point at parts of that writing.',
  spec: 'The person is writing a description of a thing they want to make (shown below), so that someone else could build it. The questions ask about what the description says and does not say.',
};

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

// Bounded, so an explanation can never carry the whole 25,000-character document into the prompt.
export function explainInputs(body = {}) {
  const surface = Object.prototype.hasOwnProperty.call(SURFACE_NOTE, body.surface) ? body.surface : 'enquiry';
  const turns = (Array.isArray(body.context) ? body.context : []).filter((m) => m && typeof m.content === 'string' && m.content.trim());
  // Licensed before anything is cut: the prompt sees six turns and 3,000 characters, the guard sees every word of the conversation and the text.
  const own = new Set([body.question, body.goal, body.material, ...turns.map((m) => m.content)].join(' ').toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 1));
  const context = turns
    .slice(-6)
    .map((m) => ({ who: m.role === 'student' || m.role === 'you' ? 'the person' : 'the question-asker', text: clip(m.content, 700) }));
  return {
    surface,
    own,
    question: clip(body.question, 700),
    notAsked: !!body.notAsked,   // a turn that did not ask; with no text it is a blank
    goal: clip(body.goal, 800),
    material: clip(body.material, 3000),
    context,
  };
}

const howToWrite = (noun, leave) => `HOW TO WRITE
- For a ten-year-old. Short sentences. Everyday words.${noun === 'question' ? ' If the question uses a hard word, say what it means in simple words.' : ''}
- No design jargon (affordance, stakeholder, persona, user journey, pain point, iterate, artefact, usability and the like). ${noun === 'question' ? 'If the question itself uses such a word, explain it in plain words; never add one of your own.' : 'Never add one of your own.'}
- Between ${EXPLAIN_MIN_WORDS} and ${EXPLAIN_MAX_WORDS} words in total — about 75 words for each part. Never more than ${EXPLAIN_MAX_WORDS}.
- ${leave}
- Do not say what the person feels, thinks or is like. Talk about the ${noun} and the idea, not about them.
- Do not praise the ${noun} or the person, and call nothing good, clear, important, right or better.
- Ask nothing: no question marks, and no list of things they could answer.
- Use two kinds of words only. For anything about their idea, use words already in the conversation above. For the rest, use plain words about a conversation itself (question, reply, turn, think, choose, next). Bring in no other thing, feeling, cause or example.
- Speak to the person as "you", and call the ${noun} "this ${noun}". Never say "we", "us" or "our" — nobody else is in this conversation.
- British English: "children", not "kids"; British spelling.
- Plain text only. No bullet points, no headings other than the three marker words, no bold.`;

export function buildExplainPrompt({ surface = 'enquiry', question = '', notAsked = false, goal = '', material = '', context = [] } = {}) {
  const goalBlock = goal ? `\n== WHAT THE PERSON SAID THEY ARE TRYING TO DO ==\n"""\n${goal}\n"""\n` : '';
  const materialBlock = material ? `\n== THE WRITING THEY ARE WORKING ON (may be cut short) ==\n"""\n${material}\n"""\n` : '';
  const contextBlock = context.length
    ? `\n== THE CONVERSATION JUST BEFORE THE ${notAsked ? 'TURN' : 'QUESTION'} ==\n${context.map((c) => `${c.who}: ${c.text}`).join('\n')}\n`
    : '';
  if (notAsked) return `You explain one turn of a conversation to someone, in words a ten-year-old can follow.

${SURFACE_NOTE.enquiry}

== HOW THIS KIND OF CONVERSATION MOVES ==
A conversation is not hammering. It has ebb and flow. Most turns push forward with a question. Now and then a turn holds still: it asks nothing and answers nothing. It gives a phrase of the person's own back to them, or it says nothing at all. What was just said gets heard before the conversation moves on, and the next question is made from whatever the person says then.
${goalBlock}${contextBlock}
== THE TURN TO EXPLAIN ==
${question ? `"""\n${question}\n"""\nThis turn holds still. It gives one phrase from the person's last reply back to them, in their own words.` : 'This turn holds still. Nothing at all was said on it; the page shows the word <blank> where a question would be.'}

Write three short parts, each starting on its own line with its marker word and a colon:

ABOUT: how the conversation has been moving — what the turns just before this one did, and what this turn does instead. Describe the movement. Give no cause for it: never say why the turn came, only what it does.
HELPS: what a turn that holds still does for the person's idea, at this point in this conversation.
CHANGES: where the conversation can go from here — how it picks up again from whatever they say next.

${howToWrite('turn', DO_NOT_STEER)}`;
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

${howToWrite('question', DO_NOT_ANSWER)}`;
}

// Parse the three marked parts. Returns null when the text does not carry all three, so the caller can
// regenerate rather than deliver half an explanation dressed as a whole one.
export function readExplanation(text, parts_ = EXPLAIN_PARTS) {
  const src = String(text || '').replace(/\*\*/g, '').replace(/\r/g, '');
  const re = new RegExp(`^\\s*(?:#+\\s*)?(${EXPLAIN_PARTS.map((p) => p.marker).join('|')})\\s*:\\s*`, 'gim');
  const hits = [];
  let m;
  while ((m = re.exec(src))) hits.push({ marker: m[1].toUpperCase(), start: m.index, body: m.index + m[0].length });
  const parts = [];
  for (const p of parts_) {
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

// ── THE EXPLANATION GUARD (30 September 2026) ────────────────────────────────────────────────────────
// Prayas: "make robust guards for both the sets of explanations". Until now the rules above lived in the prompt alone, and a prompt instruction is not a guard. Over 48 first drafts drawn from real class dialogues (docs/ops/explain-guard-20260930/): 4 of 24 question explanations offered candidate answers as questions ("Do they leave a note? Do they delete an app?"), 39 of 48 used a value word, every question explanation read above the ten-year-old level, and one turn explanation told the person they might be stuck.
//
// 🔴 THIS IS THE EXPLANATION'S OWN GUARD, NOT THE QUESTION'S. `validateOutput` and its siblings would refuse every explanation, since explaining is what they exist to refuse; they still never run here. What is shared is the loop (`generateGuarded`: buffer, validate, repair with the reasons, deliver) and the FORBIDDEN list.
//
// 🔴 A DRAFT THAT FAILS EVERY ATTEMPT IS WITHHELD, NEVER DELIVERED FLAGGED. A question has to be delivered because the turn is owed; an explanation is asked for and can be asked for again.
//
// 🔴 THE CENTRAL RULE IS A CLOSED VOCABULARY. Every content word must be the person's own (their goal, their turns, the text under question), a word of the question or turn being explained, or one of the plain words for talking about a conversation listed below. A list of banned details could never be complete; a list of licensed words is, and the cheapest way to satisfy it is to say the thing in their words, which is the behaviour wanted. It bounds what it can read: an answer assembled entirely from the person's own words still passes.
//
// ⚠️ The word lists are mine, drawn from those 48 drafts, and are his to edit: adding a word licenses it everywhere, removing one refuses it.
export const EXPLAIN_ATTEMPTS = 4;   // generateGuarded's own budget on every other surface, not a new number

const FUNCTION_WORDS = 'will can could would might may shall because where which there here these those from was were been being does did done its who whom whose each every any some more most much many few less least only also even still yet now then when while before after again once already always never sometimes often soon later next last first second same other another else such both either neither whether than into onto over under without within between through during until about around toward towards away back down instead rather too very quite itself yourself something anything nothing everything someone anyone one two three thing way kind sort part bit lot own yours whatever wherever however perhaps maybe cannot else all'.split(' ');
const EXPLAINING_WORDS = 'though set possible fact listen tell movement anywhere everywhere nowhere right person people based finish create free lose link difference fast hard easy fit speak relate provide grow reach allow main subject big teach compare specific problem share continue gap act extra match meet shape inside seen guess learn information middle front work really shift final flow pace slow quick rest row run push forward ahead quiet silence silent nothing like sure little small mind meant get got become enough together entirely completely simply actually usually suddenly finally somewhere anymore along able sense having going doing getting question turn answer reply conversation talk word phrase idea thought plan project goal reason step path direction place moment time pause space chance choice side detail point ask say explain describe mention name call use repeat give let help make take bring put go come move stay stop start begin end keep hold sit look see hear notice think know decide choose pick want need try find figure show change happen depend lead follow add leave return open close wait read write focus explore understand remember check mean new different next simple plain short long whole single exact ready far further early recent blank still slow said asked gave went took came made kept held saw heard thought knew chose found began left brought'.split(' ');
export const EXPLAIN_WORDS = new Set([...FUNCTION_WORDS, ...EXPLAINING_WORDS]);

// Words that value what was said. Refused outside quotation marks even where the person used the word: the question guard's own rule is that appraisal is never acquitted by their use of it.
const VALUE = /\b(good|great|important|clear|clearly|clearer|right (?:answer|way|one|choice|thing)|wrong|better|best|correct|true|truly|strong|stronger|powerful|interesting|special|perfect|brave|bold|smart|clever|wonderful|excellent|nice|valuable|key|crucial|deep|deeper|honest)\b/gi;
const ADVICE = /\byou (?:should|must|ought to|need to|have to|had better)\b/i;
const STATE = /\byou (?:seem|appear)\b|\byou (?:sound|look) (?:like|as if|as though)\b|\byou (?:are|were|may be|might be|must be|could be)(?: (?:a bit|very|so|feeling|getting))? (?:stuck|tired|bored|confused|lost|unsure|worried|afraid|nervous|frustrated|struggling|rushing|anxious|excited|proud)\b|\b(?:noticed|saw|sees|can tell|knows) that you(?:r)?\b/i;
const NARRATOR = /\b(?:[Ww]e|us|[Oo]ur|[Ll]et's)\b|\b[Tt]he (?:question-asker|asker|person asking|stone)\b|\bI (?:think|would|am|can|see|notice)\b/;   // 'the student', 'the user' are often the people in their idea, so only the narrator's own names are refused

const wordForms = (w) => {
  const base = w.replace(/(?:n't|'s|'re|'ve|'ll|'d|'m|')$/, '');
  const out = new Set([base]);
  for (const [re, to] of [[/ies$/, 'y'], [/es$/, ''], [/s$/, ''], [/ied$/, 'y'], [/ed$/, ''], [/ed$/, 'e'], [/ing$/, ''], [/ing$/, 'e'], [/ly$/, ''], [/er$/, ''], [/est$/, '']]) {
    if (re.test(base)) { const x = base.replace(re, to); out.add(x); out.add(x.replace(/(.)\1$/, '$1')); }
  }
  return out;
};
const LICENSED_FORMS = new Set([...EXPLAIN_WORDS].flatMap((w) => [...wordForms(w)]));

// `explanation` is what readExplanation returned ({ parts, words }); `input` is what explainInputs returned.
export function validateExplanation(explanation, input = {}, { grade: checkGrade = true } = {}) {
  const reasons = [];
  const text = explanation.parts.map((p) => p.text).join(' ');
  const bare = stripQuoted(text);
  if (bare.includes('?')) reasons.push('it asks a question — an explanation asks nothing and offers no possible answers; say it as a statement');
  for (const re of FORBIDDEN) if (re.test(bare)) reasons.push(`forbidden pattern: ${re}`);
  if (ADVICE.test(bare)) reasons.push('it tells them what they should or need to do — describe, never advise');
  if (STATE.test(bare)) reasons.push('it says what the person is like or how they seem — talk about the replies and the conversation, never about them');
  if (NARRATOR.test(bare)) reasons.push('it speaks as "we" or "I", or about "the person" — speak only to "you", and call it "this question" or "this turn"');
  const valued = [...new Set((bare.match(VALUE) || []).map((w) => w.toLowerCase()))];
  if (valued.length) reasons.push(`it values what was said (${valued.join(', ')}) — drop these words; say what the ${input.notAsked ? 'turn' : 'question'} does without praising or grading anything`);
  const own = input.own || new Set();
  const ownForms = new Set([...own].flatMap((w) => [...wordForms(w)]));
  const foreign = [...new Set(content(bare).filter((w) => !/^\d+$/.test(w) && ![...wordForms(w)].some((f) => f.length < 3 || LICENSED_FORMS.has(f) || ownForms.has(f))))];
  if (foreign.length) reasons.push(`it brings in words that are neither theirs nor plain words about a conversation (${foreign.slice(0, 14).join(', ')}) — for anything about their idea use only words they used themselves; add no thing, feeling, cause or example of your own`);
  const jargon = jargonIn(text, own);
  if (jargon.length) reasons.push(`it uses design words they did not (${jargon.join(', ')}) — say each in everyday words`);
  const grade = Math.round(readingGrade(text) * 10) / 10;
  if (checkGrade && grade > EXPLAIN_GRADE_RETRY) reasons.push(`too hard to read for a ten-year-old (school year ${grade}) — sentences of about ten words, and short words`);
  // Nothing told the model why the turn came, so a cause in the first part is an invented one.
  if (input.notAsked && /\b(?:because|since|reason|why)\b/i.test(stripQuoted(explanation.parts[0].text))) reasons.push('the first part gives a cause for the turn — describe how the conversation has been moving and what this turn does, and give no "because"');
  return { ok: reasons.length === 0, reasons, grade };
}

// 🔴 WITHHOLD THE SENTENCE, NOT THE EXPLANATION (30 September 2026). With the guard alone about one explanation in five was withheld, and the chip said to try again. Prayas: "isn't this a problem in experience?" It is. Every rule but the reading grade can be read off one sentence, so when no draft passes, the sentences that breach are cut from a draft and the rest is delivered, provided each of the three parts keeps a sentence and what remains passes the whole guard. Nothing that was refused is shown; what changes is how much is thrown away with it.
//
// 🔴 ALTERNATIVES STAND TOGETHER. Read over the thirteen explanations the first cut rescued (Prayas: "does it still make sense"), eight read well and four had lost one of a pair: "If you say X, … If you say Y, …" with the second cut leaves the first standing alone, and a lone alternative is a nudge towards it. So where a sentence that offers an alternative is cut, the whole run from the part's first such sentence to its last goes with it. What stays is the framing on either side, which says the reply decides and names no way to decide it.
const offersAlternative = (s) => /^(?:if|you might|you could|or)\b/i.test(s);
export function pruneExplanation(explanation, input = {}) {
  const parts = explanation.parts.map((p, i) => {
    const all = sentencesOf(p.text);
    const keep = all.map((s) => validateExplanation({ parts: [{ text: s }] }, { ...input, notAsked: input.notAsked && i === 0 }, { grade: false }).ok);   // the no-cause rule belongs to the first part only
    const alt = all.map((s, k) => (offersAlternative(s) ? k : -1)).filter((k) => k >= 0);
    if (alt.some((k) => !keep[k])) for (let k = alt[0]; k <= alt[alt.length - 1]; k++) keep[k] = false;
    return { ...p, text: all.filter((_, k) => keep[k]).join(' ') };
  });
  if (parts.some((p) => !p.text)) return null;
  const pruned = { parts, words: parts.reduce((n, p) => n + wordsOf(p.text).length, 0) };
  return validateExplanation(pruned, input).ok ? pruned : null;
}

export const EXPLAIN_REFORMAT = `it is not three parts — write exactly three, each starting on its own line with ABOUT:, HELPS: and CHANGES:, plain text, no more than ${EXPLAIN_MAX_WORDS} words`;
export const explainRepair = (reasons = []) => `That explanation was refused: ${reasons.join('; ')}. Write it again with the same three marker words, keeping what it said that was not refused.`;

// Generate, read, check; repaired with the guard's own reasons up to the shared budget. `generate(correction)` is the caller's model call, so this stays testable without a network. Returns the explanation, or `{ withheld: true, reasons }` when no draft passed.
export async function explainQuestion({ generate, input = {}, parts = EXPLAIN_PARTS }) {
  const read = (text) => readExplanation(text, parts);
  const refused = [];   // every draft that was read and did not pass, kept for pruning
  const g = await generateGuarded({
    attempts: EXPLAIN_ATTEMPTS,
    validate: (text) => { const a = read(text); if (!a) return { ok: false, reasons: [EXPLAIN_REFORMAT] }; const v = validateExplanation(a, input); if (!v.ok) refused.push(a); return v; },
    generate: (c) => generate(c && { previous: c.previous, instruction: explainRepair(c.reasons) }),
  });
  if (g.check.ok) return { ...read(g.text), grade: g.check.grade, attempts: g.attempts };
  // No draft passed whole: deliver the one that keeps the most once its breaching sentences are cut.
  const kept = refused.map((a) => pruneExplanation(a, input)).filter(Boolean).sort((a, b) => b.words - a.words)[0];
  return kept ? { ...kept, pruned: true, attempts: g.attempts } : { withheld: true, reasons: g.check.reasons, attempts: g.attempts };
}
