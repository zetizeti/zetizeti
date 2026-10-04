// channels.mjs — the three-channel prompt for a model on the person's own machine (4 Oct 2026, Prayas: "make
// tri-furcated context. code + RAG + LoRA", "work on fixing speed"). Off unless ZETIZETI_CHANNELS=3; the live
// site is untouched. Code decides (the steering lines buildTurnContext already writes), RAG supplies material
// (cut to a budget here), the LoRA carries the method (until it exists, the method stays in the system prompt).
//
// 🔴 THE PROMPT ONLY GROWS. Measured on Ollama with Qwen3.5-4B (4 Oct 2026): a second turn that rebuilt the
// history read all 4,125 tokens again (11.7 s), even though its first 3,000 matched the first turn; the same
// turn sent as an exact continuation of the first read only the new part (4.2 s). So each earlier turn is sent
// exactly as the model saw it. zetizeti keeps nothing, so the browser holds those turns (`tails`) and posts them
// back, as it already posts the history; a turn it does not hold is sent plain, and that turn is read again.
export const CHANNELS = process.env.ZETIZETI_CHANNELS === '3';

// The RAG budget: two entries, each its tension cut to RAG_WORDS and its first seed. Sources stay behind the
// curtain for the page; the full entries still go to the page as before.
export const RAG_ENTRIES = 2, RAG_WORDS = 45;
const cut = (s, n) => { const w = String(s || '').trim().split(/\s+/); return w.length > n ? `${w.slice(0, n).join(' ')} …` : w.join(' '); };
export const compactRetrieved = (retrieved = []) => retrieved.slice(0, RAG_ENTRIES)
  .map((r) => ({ ...r, tension: cut(r.tension, RAG_WORDS), questions: String(r.questions || '').split(' · ')[0], sources: '' }));

// The conversation so far for the model: each earlier reply as the model saw it (its tail, when the browser holds
// it), each earlier question as asked. Every call on the route starts from this, so every call extends the same
// prompt. `history` has blanks already removed by the route.
export function earlierMessages(history = [], tails = []) {
  let k = 0;
  return history.map((h) => {
    if (h.role === 'student') { const tail = tails[k++]; return { role: 'user', content: typeof tail === 'string' && tail ? tail : h.content }; }
    return { role: 'assistant', content: h.content };
  });
}

// Ollama cuts a prompt longer than the model's context from the front, silently, which would drop the method. So
// the oldest exchanges after the opening go first, never the opening or this turn. Tokens are estimated from
// characters (about 3.5 a token for this English); CONTEXT_TOKENS is the Modelfile's num_ctx.
export const CONTEXT_TOKENS = Number(process.env.ZETIZETI_CONTEXT_TOKENS) || 8192;
const est = (s) => Math.ceil(String(s || '').length / 3.5);
export function fitContext(system, messages, budget = CONTEXT_TOKENS - 400) {
  const out = [...messages];
  let total = est(system) + out.reduce((a, m) => a + est(m.content), 0);
  while (total > budget && out.length > 3) {
    const [q, r] = out.splice(1, 2);           // an earlier question and the reply to it, as a pair
    total -= est(q.content) + est(r.content);
  }
  return out;
}

// Read the shared part of the system prompt once at start, so a first turn reads only its own opening. It helps a
// model that can reuse a shared start (Phi-4-mini); Qwen3.5 reuses only an exact continuation and gains nothing.
export async function prewarm(streamQuestion, system) {
  try { await streamQuestion({ system, messages: [{ role: 'user', content: '.' }], onToken: () => {}, maxTokens: 1, reasoning: { enabled: false } }); }
  catch (e) { console.warn(`[channels] prewarm failed: ${e.message}`); }
}
