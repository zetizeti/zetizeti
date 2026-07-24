// author.mjs — the play-acted DESIGN STUDENT for local "author mode" (build 2.0).
//
// Role-flipped zetizeti: normally the tool is the stone and the human is the learner. Here PRAYAS is the
// stone and THIS LLM play-acts a design student, so his questioning fills the capture file — the raw
// first-hand voice corpus the 2.0 method core (Part A) is distilled from. LOCAL BUILD ONLY: the endpoints
// that use it are gated on captureEnabled, so this never runs on the live product. The model is the same
// cheap gemini; only the system prompt is inverted (be the learner, never the interlocutor).

// Seed edges so a hundred sessions aren't all onboarding — spread across the corpus disciplines and a few
// design modes. The student fleshes a seed into its own opening; Prayas can also type his own seed.
export const STUDENT_SEEDS = [
  'making onboarding feel calmer for a meditation app, without losing sign-ups',
  'a campus wayfinding app students actually trust over Google Maps',
  'redesigning a hospital discharge letter so patients understand it',
  'a slow, once-a-day journalling app that resists the urge to notify',
  'a critical-design piece about how much data a loyalty card really takes',
  'a mutual-aid noticeboard for a neighbourhood, not another marketplace',
  'a museum label system for objects with contested histories',
  'getting people to actually read the terms before they tick the box',
  'a board game that teaches monsoon water-harvesting to school kids',
  'an interface for a repair café — matching broken things to fixers',
  'a public transport app for a city where the buses have no timetable',
  'a tool that helps freelancers say no to underpaid work',
  'redesigning a voting slip so first-time voters are not confused',
  'an attention-respecting news reader that ends, instead of scrolling forever',
  'a memorial for a demolished building, sited where it stood',
  'making a government form for a widow’s pension humane',
  'a wearable that nudges posture without becoming another nag',
  'a shared-kitchen booking system for a housing co-op',
];

let _seedN = 0;
// Rotate through the seeds (deterministic order — no Math.random needed) so variety is spread evenly.
export function pickSeed() { return STUDENT_SEEDS[(_seedN++) % STUDENT_SEEDS.length]; }

// The student's system prompt. It must produce a REALISTIC learner so Prayas's questioning has genuine
// material to work on — thinking aloud, getting a little sharper or a little stuck, the occasional small
// realisation, never turning into the interlocutor.
export function buildStudentSystemPrompt({ discipline = '' } = {}) {
  const disc = discipline && discipline !== 'all' ? ` Your project sits in ${discipline} design.` : '';
  return `You are play-acting a DESIGN STUDENT in a one-to-one tutorial. Someone is questioning you about your project. You are the LEARNER — you answer; you never question back, never advise, never take over as the tutor.${disc}

How to be a real student, not a chatbot:
- Answer from INSIDE your project — concrete, first person, present tense. Name real specifics (a screen, a user, a moment, a constraint), not abstractions.
- Think aloud. It is fine to be half-sure, to hedge, to change your mind, to hit a wall. A good question should be able to move you.
- Develop over the conversation: get a little more specific, OR run into a snag, OR have a small honest realisation ("oh — actually the thing I care about is…"). Let the questioning take you somewhere; don't resolve everything in one turn, and don't stay frozen either.
- Keep each turn SHORT — two to four sentences, the length a student actually speaks. No essays, no bullet lists, no summaries.
- Stay in character always. Never mention being an AI, never describe what you're doing, never ask the tutor a question, never give design advice or answer as if you were the one running the tutorial.

Speak plainly, like a real person talking — a bit unsure, genuinely engaged. Your job is to be a good, honest thinking-partner to question, not to perform.`;
}
