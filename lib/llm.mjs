// llm.mjs — the question-generating model, behind one small interface.
// SDC: this is the only place the AI does *language* (composes the question). zetizeti is
// OpenRouter-only — every request carries the operator's shared pool key (server-supplied, never sent
// to the client; BYOK was removed). OpenRouter is an OpenAI-compatible gateway; the MODEL is set by
// ZETIZETI_MODEL (default google/gemini-3.1-flash-lite) — OpenRouter is the gateway, not the model family.

// The model to ask OpenRouter for. Override with ZETIZETI_MODEL (OpenRouter slug form). Production sets
// it (this Anant mod: gemini-3.1-flash-lite, per the 22 Jun evals — see CLAUDE.md model note). The
// hardcoded default is the SAFE fallback used ONLY if the env var is missing/mistyped: it is the same
// cheap, budget-safe lite — NOT Haiku — so a missing env can never silently breach the ₹12k worst-case
// guarantee. (Upstream zetizeti.com defaults to Claude; this mod deliberately diverges.)
const MODEL = (process.env.ZETIZETI_MODEL || '').includes('/')
  ? process.env.ZETIZETI_MODEL
  : 'google/gemini-3.1-flash-lite';

// Optional automatic fallback (OpenRouter native `models` routing): if the PRIMARY model errors or is
// unavailable (e.g. a *preview* endpoint pulled mid-pilot), OpenRouter transparently retries the next.
// Set ZETIZETI_MODEL_FALLBACK (slug form). Applied ONLY to the default production model — calls that
// pass an explicit `model` (the eval scripts) are never given a fallback, so evals stay single-model.
const FALLBACK = (process.env.ZETIZETI_MODEL_FALLBACK || '').includes('/')
  ? process.env.ZETIZETI_MODEL_FALLBACK
  : null;

// Stream a question. Calls onToken(chunk) as text arrives; resolves to the full text.
// `apiKey` = the OpenRouter key for THIS request (the operator's shared pool key, server-supplied).
// It is NEVER logged or stored (invariant #8). `onUsage(usage)` — if given — is
// called once at the end with OpenRouter's usage object (incl. real `cost` in USD), so the pool-key
// daily-spend cap can meter actual billed cost.
export async function streamQuestion({ system, messages, onToken, onUsage = null, maxTokens = 400, temperature = 0.3, apiKey = null, cache = false, model = MODEL, reasoning = null }) {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('no OpenRouter key for this request');
  let sys = system, msgs = messages;
  if (cache) ({ sys, msgs } = withCacheBreakpoints(system, messages));
  // Fallback applies ONLY to the default production model (server path), never to explicit-model
  // calls (eval scripts) — so evaluations stay strictly single-model.
  const models = (model === MODEL && FALLBACK && FALLBACK !== MODEL) ? [MODEL, FALLBACK] : null;
  return streamOpenRouter({ system: sys, messages: msgs, onToken, onUsage, maxTokens, temperature, apiKey: key, model, models, reasoning });
}

// Prompt caching (Anthropic, via OpenRouter): mark the cacheable prefix with `cache_control` so the
// provider reuses it at ~1/10th the input price instead of recomputing it every turn. Two breakpoints,
// both on a STABLE prefix: (1) the system prompt (shared across all quests — the method core), and
// (2) the last prior-history message (the system + accumulated history up to, but not including, the
// fresh final turn). The final turn — which carries the volatile per-turn material — is left UNMARKED
// so it is the only part recomputed. The caller guarantees the prefix is stable (dialogue.mjs keeps
// per-turn material out of the system prompt and out of persisted history). The string forms still
// work uncached, so a non-caching provider degrades cleanly. Caching is purely a cost/latency change:
// the model receives identical tokens and produces identical output — never a quality trade.
export function withCacheBreakpoints(system, messages) {
  const mark = (text) => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
  const sys = mark(system);
  const lastHistoryIdx = messages.length - 2; // everything before the final, volatile turn
  const msgs = messages.map((m, i) =>
    i === lastHistoryIdx && typeof m.content === 'string' ? { ...m, content: mark(m.content) } : m
  );
  return { sys, msgs };
}

// OpenRouter: OpenAI-compatible /chat/completions with SSE streaming. System prompt is the
// first message; the rest are the dialogue turns (roles already 'user'/'assistant').
async function streamOpenRouter({ system, messages, onToken, onUsage, maxTokens, temperature, apiKey, model, models = null, reasoning = null }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zetizeti.com',
      'X-Title': 'zetizeti',
    },
    body: JSON.stringify({
      // `models` (array) enables OpenRouter's transparent fallback routing; otherwise a single `model`.
      ...(models ? { models } : { model }),
      max_tokens: maxTokens,
      temperature,
      stream: true,
      usage: { include: true },          // ask OpenRouter to report token counts + real USD cost
      // Optional reasoning control. zetizeti is a thin composer — for models that DEFAULT to a thinking
      // budget (Gemini, some Qwen), pass { enabled: false } so they answer instead of burning tokens.
      ...(reasoning ? { reasoning } : {}),
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '', usage = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop(); // keep the partial trailing line for the next chunk
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;          // skip ':' keep-alive comments / blanks
      const data = s.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const obj = JSON.parse(data);
        const delta = obj.choices?.[0]?.delta?.content;
        if (delta) { full += delta; onToken(delta); }
        if (obj.usage) usage = obj.usage;            // final chunk carries token counts + cost
      } catch { /* partial JSON across chunk boundary — ignore, the buffer keeps the remainder */ }
    }
  }
  if (onUsage && usage) { try { onUsage(usage); } catch { /* metering must never break the stream */ } }
  return full;
}
