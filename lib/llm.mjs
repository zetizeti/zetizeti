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
// 🔴 LOCAL MODEL (4 Oct 2026, toward Prayas's "everyone installs their own", "no server", "0 runtime cost"):
// ZETIZETI_LLM_BASE points at any OpenAI-compatible server on the person's own machine, e.g. Ollama's
// http://localhost:11434/v1, and ZETIZETI_MODEL is then that server's model name (no slash needed). Unset, nothing
// changes: OpenRouter as before. The blacklist and every guard apply either way.
const LLM_BASE = (process.env.ZETIZETI_LLM_BASE || '').trim().replace(/\/+$/, '');
const LOCAL_TIMEOUT_MS = 90000;   // a first turn on a slow processor reads the whole method; 90 s is its ceiling
const MODEL = (process.env.ZETIZETI_MODEL || '').includes('/') || (LLM_BASE && process.env.ZETIZETI_MODEL)
  ? process.env.ZETIZETI_MODEL
  : 'google/gemini-3.1-flash-lite';

// Optional automatic fallback (OpenRouter native `models` routing): if the PRIMARY model errors or is
// unavailable (e.g. a *preview* endpoint pulled mid-pilot), OpenRouter transparently retries the next.
// Set ZETIZETI_MODEL_FALLBACK (slug form). Applied ONLY to the default production model — calls that
// pass an explicit `model` (the eval scripts) are never given a fallback, so evals stay single-model.
const FALLBACK = (process.env.ZETIZETI_MODEL_FALLBACK || '').includes('/')
  ? process.env.ZETIZETI_MODEL_FALLBACK
  : null;

// 🔴 THE MODEL BLACKLIST (4 Oct 2026, Prayas: "put mimo on blacklist"). Refused in code, never only in a note:
// a banned slug stops the server at start, and any call naming one is refused. MiMo failed his live test three
// times (29 Sep; 4 Oct twice, on "nonsense" after short abstract replies); OpenAI is his standing rule.
export const BANNED_MODELS = [/^xiaomi\/mimo/i, /^openai\//i];
export const isBannedModel = (m) => BANNED_MODELS.some((re) => re.test(String(m || '')));
for (const m of [MODEL, FALLBACK]) if (m && isBannedModel(m)) throw new Error(`zetizeti: ${m} is on the model blacklist (lib/llm.mjs)`);

// Stream a question. Calls onToken(chunk) as text arrives; resolves to the full text.
// `apiKey` = the OpenRouter key for THIS request (the operator's shared pool key, server-supplied).
// It is NEVER logged or stored (invariant #8). `onUsage(usage)` — if given — is
// called once at the end with OpenRouter's usage object (incl. real `cost` in USD), so the pool-key
// daily-spend cap can meter actual billed cost.
export async function streamQuestion({ system, messages, onToken, onUsage = null, maxTokens = 400, temperature = 0.3, apiKey = null, cache = false, model = MODEL, reasoning = null, appTitle = null }) {
  if (isBannedModel(model)) throw new Error(`zetizeti: ${model} is on the model blacklist (lib/llm.mjs)`);
  const key = (apiKey || '').trim() || (LLM_BASE ? 'local' : '');   // a local server needs no key
  if (!key) throw new Error('no OpenRouter key for this request');
  let sys = system, msgs = messages;
  // Cache breakpoints are OpenRouter's format (content as a list); a local server is sent plain text, which it reuses
  // by itself (4 Oct 2026: the list reached Ollama as a 1-element system prompt, so the method was never sent).
  if (cache && !LLM_BASE) ({ sys, msgs } = withCacheBreakpoints(system, messages));
  // Fallback applies ONLY to the default production model (server path), never to explicit-model
  // calls (eval scripts) — so evaluations stay strictly single-model.
  const models = (model === MODEL && FALLBACK && FALLBACK !== MODEL) ? [MODEL, FALLBACK] : null;
  return streamOpenRouter({ system: sys, messages: msgs, onToken, onUsage, maxTokens, temperature, apiKey: key, model, models, reasoning, appTitle });
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
async function streamOpenRouter({ system, messages, onToken, onUsage, maxTokens, temperature, apiKey, model, models = null, reasoning = null, appTitle = null }) {
  if (LLM_BASE) {
    // Ollama's OpenAI endpoint: thinking off is reasoning_effort "none" (measured 4 Oct 2026; `think: false` and
    // OpenRouter's `reasoning` were ignored and the model thought for its whole budget). No provider routing to ask.
    const off = reasoning && reasoning.enabled === false;
    // A model that is not running, or one stuck past LOCAL_TIMEOUT_MS, ends the turn with a plain reason, never a hang.
    let r;
    try {
      r = await fetch(`${LLM_BASE}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS),
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature, stream: true, ...(off ? { reasoning_effort: 'none' } : {}),
          messages: [{ role: 'system', content: system }, ...messages] }) });
    } catch (e) {
      throw new Error(e.name === 'TimeoutError' ? `the local model took longer than ${LOCAL_TIMEOUT_MS / 1000} s` : `the local model is not reachable at ${LLM_BASE}: is Ollama running?`);
    }
    if (!r.ok || !r.body) throw new Error(`local model ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
    return readStream(r, onToken, onUsage);
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zetizeti.com',
      // OpenRouter files spend under this string in its App column, so it is the ONE place where
      // dev traffic can be told apart from real use — and until 11 Aug 2026 everything said
      // "zetizeti". A single probe day (28 Jul) spent ~$7 across ~7,500 calls and was
      // indistinguishable from a cohort. Read at CALL time, never at module load, so a script can
      // set it after its imports have already been evaluated. Unset = 'zetizeti', so PRODUCTION IS
      // UNCHANGED and no deployment needs this variable.
      'X-Title': appTitle || process.env.ZETIZETI_APP_TITLE || 'zetizeti',
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
      // 🔴 ONLY PROVIDERS THAT KEEP NOTHING (29 Sep 2026). The page tells students "Nothing is saved here";
      //    without this OpenRouter may route a turn to a provider that stores or trains on it. Checked
      //    live: both google/gemini-3.1-flash-lite and xiaomi/mimo-v2.6-flash still route with it.
      provider: { data_collection: 'deny' },
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`);
  }
  return readStream(res, onToken, onUsage);
}

// The SSE reader both paths share: OpenRouter and a local OpenAI-compatible server stream the same shape.
async function readStream(res, onToken, onUsage) {
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
