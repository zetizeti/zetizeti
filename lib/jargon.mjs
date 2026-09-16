// jargon.mjs — no design jargon in a question or an explanation (v1.10.0, 16 September 2026)
//
// Prayas: "make sure neither the questions, nor the explanations use design jargon".
//
// The corpus is written in a design school's vocabulary and the model reaches for it, so a question can come
// back asking about "affordances" or "the user journey" when the person only said they wanted to make a toy.
// A word the person has to look up is a question they cannot answer yet.
//
// 🔴 A WORD THE PERSON USED IS THEIRS AND PASSES. Saying their own words back is the method (Clean Language),
// so a student who writes "stakeholders" may be asked about their stakeholders. The caller passes the words
// that licence a term: the student's turns everywhere, plus the text under question on the critique and
// spec surfaces, plus the question itself when an explanation is being written about it.
//
// 🔴 THE LIST IS A JUDGEMENT AND IS MEANT TO BE EDITED. It holds terms a first-year student or a
// non-designer would not use in ordinary speech. Everyday words that designers also use (prototype, sketch,
// brief, user, tension, framework) are deliberately left off; refusing them would make questions stilted
// rather than plain. Add or remove a line and the questions, the explanations, the prompts and the tests all
// follow, because they all read this one list.

const TERMS = [
  'affordance', 'signifier', 'heuristic', 'persona', 'stakeholder', 'touchpoint',
  'ideation', 'ideate', 'wireframe', 'mockup', 'mock-up', 'low-fidelity', 'high-fidelity', 'lo-fi', 'hi-fi',
  'usability', 'ux', 'ui', 'user-centred', 'user-centered', 'human-centred', 'human-centered',
  'design thinking', 'empathy map', 'pain point', 'user journey', 'journey map', 'user flow',
  'mental model', 'cognitive load', 'information architecture', 'microinteraction', 'micro-interaction',
  'mvp', 'minimum viable product', 'form factor', 'ergonomic', 'ergonomics', 'gestalt', 'visual hierarchy',
  'typographic', 'materiality', 'speculative design', 'critical design', 'service design', 'systems thinking',
  'double diamond', 'wicked problem', 'co-design', 'participatory design', 'design language', 'semiotic',
  'semiotics', 'signification', 'dark pattern', 'use case', 'edge case', 'value proposition', 'deliverable',
  'problematise', 'problematize', 'positionality', 'praxis', 'artefact', 'artifact', 'iterate', 'iteration',
  'scalability', 'modularity', 'ethnographic', 'ethnography', 'contextual inquiry', 'card sorting',
  'felt sense', 'intervention', 'user research', 'user testing', 'interaction design',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[- ]/g, '[-\\s]');
// Plurals and the common -s/-es/-ies endings, so "affordances" and "stakeholders" are caught by one line.
const ENTRIES = TERMS.map((t) => ({ term: t, re: new RegExp(`\\b${esc(t)}(?:s|es)?\\b`, 'gi') }));

const words = (s) => String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1);
const stem = (w) => w.replace(/(?:ies|es|s)$/, '');

// The jargon terms in `text` that the licensing words do not cover. `own` is a Set of lower-case words
// (the same shape the question guards already use); a term passes when every word in it — singular or
// plural — is in that set.
export function jargonIn(text, own = null) {
  const s = String(text || '');
  const found = new Set();
  const has = (w) => own instanceof Set && (own.has(w) || own.has(stem(w)) || own.has(w + 's'));
  for (const { term, re } of ENTRIES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      const ws = words(m[0]);
      if (ws.length && ws.every(has)) continue;
      found.add(term);
    }
  }
  return [...found];
}

// The line the composing prompts carry, so the model is told the rule the guard enforces.
export const JARGON_PROMPT_LINE = `Use everyday words a first-year student uses. Do not use design jargon — for example ${TERMS.slice(0, 14).join(', ')} — unless the person has used that word themselves.`;

export function jargonReason(found) {
  return `uses design jargon the person has not used (${found.join(', ')}) — say it in everyday words instead`;
}

export const JARGON_TERMS = TERMS;
