// heartbeat.mjs — keep an OPEN BUT SILENT SSE stream alive (26 August 2026).
//
// 🔴 WHY THIS EXISTS, AND IT IS THE COST OF INVARIANT #3. The guard buffers the question rather than
// streaming it: generate → validate → repair (up to twice) → deliver whole, because a question cannot be
// withheld after it has been read. That decision is right and is not in question here. What it creates is
// an interval during which the response is open and nothing at all travels down it — after `curtain` and
// `signals`, before the single `token` carrying the accepted question. Nothing filled that interval.
//
// zetizeti.com sits behind Cloudflare. A proxy cuts a stream that has gone quiet, and the browser then
// throws from `reader.read()` — the client's catch renders "connection lost — TypeError: Failed to fetch"
// with no partial text, because no token had arrived yet. A student saw exactly that on 26 August 2026,
// mid-conversation, on a build whose process had not restarted under her.
//
// ⚠️ WHAT WAS NOT ESTABLISHED, and it is recorded rather than smoothed over: her own network could produce
// a byte-identical failure, and there are no logs to separate the two — by rule, and rightly. This closes
// the mechanism the project owns. It does not diagnose that instance and must not be written up as though
// it had.
//
// 🔴 A DEAD TURN IS INVISIBLE TO THE ONE INSTRUMENT BUILT TO SEE PEOPLE LEAVE. `turn_depth` is written on
// DELIVERED turns only, deliberately, so refusals do not inflate the depth where people stop. A turn that
// dies in this silence delivers nothing and writes no row, so the survival curve records a shorter
// conversation — indistinguishable from a student who had had enough. That is the real cost of the gap and
// the reason to close it rather than to watch it.
//
// WHAT IT COSTS (the friction rule — every fix states which pressure it removes). A turn that is genuinely
// stuck will now keep a student waiting instead of failing in front of her. That is a real loss and it is
// accepted: a wait is legible and recoverable, a dead socket mid-question is neither.

// SSE comment frames. A line beginning ':' is a comment by the EventSource grammar and carries no event.
// The client reads the stream by hand (`public/index.html`): it splits on '\n\n' and matches each frame
// against /^event: (.+)\ndata: (.+)$/s, so a comment frame simply fails the match and is skipped. It can
// never be mistaken for a turn. `verification/heartbeat.test.mjs` asserts that against the REAL regex read
// out of index.html rather than a copy of it — a hand-copied route is a fault this project has paid for.
const FRAME = ': keepalive\n\n';

// 15 seconds. Chosen against the shortest proxy patience worth surviving rather than against a measured
// generation time: the generation is what varies, so the heartbeat must not be tuned to it. Overridable so
// a test can run in milliseconds without faking a clock.
export const HEARTBEAT_MS = 15000;

// Start writing keepalive frames on `res` until the response finishes or the connection closes.
//
// Returns stop(); calling it more than once is safe. The stop is ALSO wired to the response's own
// 'close' and 'finish' events, so a caller that returns early — and this handler returns early on nine
// separate refusal paths — cannot leave a timer running by forgetting one. 🔴 Never make the caller
// responsible for stopping it: that is the shape of every guard in this project that enforced nothing
// because one of two call sites did not do its half.
export function startHeartbeat(res, { intervalMs = HEARTBEAT_MS } = {}) {
  let timer = null;
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  timer = setInterval(() => {
    // writableEnded covers the ordinary finish; destroyed covers a socket that went away without one.
    if (res.writableEnded || res.destroyed) { stop(); return; }
    // A write on a half-dead socket throws rather than returning false. It must never take down the turn.
    try { res.write(FRAME); } catch { stop(); }
  }, intervalMs);
  // Do not hold the process open for a stream nobody is reading.
  if (typeof timer.unref === 'function') timer.unref();

  if (typeof res.on === 'function') { res.on('close', stop); res.on('finish', stop); }
  return stop;
}
