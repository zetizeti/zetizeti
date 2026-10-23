// cadence.mjs — no machine cadence in what the stone says (v1.21.0, 23 October 2026)
//
// Prayas: "add rules from de-ai-coldread sub-agen to zetizeti". The de-ai-cold-read reader he runs over public
// prose lists the tells that make a reader stop and think a machine wrote this. Most of its method is for whole documents (burstiness, first person, citations, paragraph shape) and
// cannot be read off one question. What can be read off one question or one explanation is here, in one list, so
// the questions, the choices, the explanations, the prompts and the tests all follow it.
//
// 🔴 TWO KINDS, LICENSED DIFFERENTLY. A WORD the person used is theirs and passes, as with design jargon: someone who
// writes "navigate" may be asked about navigating. A STOCK PHRASE never passes outside quotation marks, because it
// is not about their idea at all; it is the voice of the thing asking ("moreover", "it is worth", "not merely").
//
// 🔴 LEFT OUT ON PURPOSE: "exactly", "precisely" and "specific". The agent cuts them as self-certifying, but in a
// question they ask for precision, which the stone does on purpose and spaces on its own (PRECISION_WORDS in
// dialogue.mjs). Decorative analogies and coined phrasings (the agent's group H) are left out too: no code can
// read them, and a prompt line that nothing enforces is a request, not a rule.
//
// 🔴 THE LIST IS A JUDGEMENT AND IS MEANT TO BE EDITED. Each entry was measured alone over the questions on record
// before it went in (docs/ops/cadence-census/README.md).

const WORDS = [
  'delve', 'navigate', 'underscore', 'robust', 'comprehensive', 'multifaceted', 'pivotal', 'unprecedented',
  'elucidate', 'foster', 'leverage', 'utilise', 'utilize', 'seamless', 'seamlessly', 'holistic', 'tapestry',
  'testament', 'realm', 'landscape', 'boast', 'showcase', 'intricate', 'nuanced', 'nuance', 'crucial', 'vital',
  'essential', 'genuine', 'genuinely', 'rigorous', 'load-bearing', 'truly', 'nexus', 'symbiosis', 'crucible',
  'overarching', 'salient', 'interplay', 'paradigm', 'inflection point', 'unpack',
];

// 🔴 ONLY PHRASES THAT CANNOT BEGIN A REAL QUESTION. Cut after the census: "to be sure" (its one hit was a literal "so as to
// be sure", as in "where would you stand to be sure of it?"), "of course" (its one hit was the person's own phrase), and "as a result", "speaks
// to", "one must", "a reminder of", "the importance of", each of which opens an ordinary question ("who speaks to
// the child?"). A phrase that can be literal is a detector built from a phrase.
const PHRASES = [
  'furthermore', 'moreover', 'additionally', 'notably', 'consequently', 'in summary',
  'it is important to', "it's important to", 'it is worth', "it's worth", 'worth noting',
  'looking closer', 'seen this way', 'not merely', 'not just about', "isn't just",
];

// The agent's own cap: one or two dashes a paragraph. A third is asides carrying the meaning.
export const DASH_MAX = 2;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- ]/g, '[-\\s]').replace(/'/g, "['’]");
// The common endings, so "delves", "navigating" and "fostered" are caught by one line.
const WORD_ENTRIES = WORDS.map((t) => ({ term: t, re: new RegExp(`\\b${esc(t.replace(/e$/, ''))}(?:e|es|ed|ing|s|d)?\\b`, 'gi') }));
const PHRASE_ENTRIES = PHRASES.map((t) => ({ term: t, re: new RegExp(`\\b${esc(t)}\\b`, 'i') }));

const words = (s) => String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1);
const stem = (w) => w.replace(/(?:ing|ed|es|s|e)$/, '');

// The tells in `text` (quoted spans already stripped by the caller) that the person's own words do not license.
// `own` is a Set of lower-case words, the shape the other guards use.
export function cadenceIn(text, own = null) {
  const s = String(text || '');
  const found = new Set();
  const ownStems = own instanceof Set ? new Set([...own].map(stem)) : new Set();
  for (const { term, re } of WORD_ENTRIES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) if (!words(m[0]).every((w) => ownStems.has(stem(w)))) found.add(term);
  }
  for (const { term, re } of PHRASE_ENTRIES) if (re.test(s)) found.add(term);
  if ((s.match(/—|–|\s-\s/g) || []).length > DASH_MAX) found.add('dashes');
  return [...found];
}

export const cadenceReason = (found) => `sounds machine-written (${found.join(', ')}) — say it the way a person would say it at a desk, in plain words and with no more than two dashes`;

// The line the composing prompts carry, so the model is told the rule the guard enforces.
export const CADENCE_PROMPT_LINE = `Write as a person talks, not as a report reads: no words like ${WORDS.slice(0, 10).join(', ')}, crucial or truly unless the person has used them, no "moreover", "it is worth" or "not merely", and no more than two dashes.`;

export const CADENCE_WORDS = WORDS;
export const CADENCE_PHRASES = PHRASES;
