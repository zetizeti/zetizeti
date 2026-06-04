// llm.mjs — the question-generating model, behind one small interface.
// SDC: this is the only place the AI does *language* (composes the question). zetizeti is
// OpenRouter-only and BYOK — every request carries the user's OWN OpenRouter key; the server holds
// none. OpenRouter is an OpenAI-compatible gateway, but the MODEL is ALWAYS a Claude model
// (Claude only, never GPT) — OpenRouter is the gateway, not a different model family.

// The Claude model to ask OpenRouter for. Override with ZETIZETI_MODEL (OpenRouter slug form).
const MODEL = (process.env.ZETIZETI_MODEL || '').includes('/')
  ? process.env.ZETIZETI_MODEL
  : 'anthropic/claude-haiku-4.5';

// Stream a question. Calls onToken(chunk) as text arrives; resolves to the full text.
// `apiKey` = the OpenRouter key for THIS request (the user's BYOK key, or the operator's pool key for
// keyless visitors). It is NEVER logged or stored (invariant #8). `onUsage(usage)` — if given — is
// called once at the end with OpenRouter's usage object (incl. real `cost` in USD), so the pool-key
// daily-spend cap can meter actual billed cost.
export async function streamQuestion({ system, messages, onToken, onUsage = null, maxTokens = 400, temperature = 0.3, apiKey = null }) {
  const key = (apiKey || '').trim();
  if (!key) throw new Error('no OpenRouter key for this request');
  return streamOpenRouter({ system, messages, onToken, onUsage, maxTokens, temperature, apiKey: key, model: MODEL });
}

// OpenRouter: OpenAI-compatible /chat/completions with SSE streaming. System prompt is the
// first message; the rest are the dialogue turns (roles already 'user'/'assistant').
async function streamOpenRouter({ system, messages, onToken, onUsage, maxTokens, temperature, apiKey, model }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://zetizeti.com',
      'X-Title': 'zetizeti',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      usage: { include: true },          // ask OpenRouter to report token counts + real USD cost
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
