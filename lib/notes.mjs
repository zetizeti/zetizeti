// Notes, published elsewhere and read here (13 November 2026, his words: "publish all texts everywhere through editor
// make my own api", then "not public and published - private. it exposes my setup"). Where they are read from, the key
// and where attachments are served are settings, never code: ZETIZETI_NOTES_URL, ZETIZETI_NOTES_KEY and
// ZETIZETI_NOTES_MEDIA. Unset, the page says there are no notes. Nothing is kept but a one-minute copy in memory, and
// no request is logged.
const API = () => (process.env.ZETIZETI_NOTES_URL || '').replace(/\/+$/, '');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let cache = new Map();

async function get(path, fetchImpl = fetch) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < 60_000) return hit.value;
  if (!API()) return path ? null : { texts: [] };
  const r = await fetchImpl(API() + path, { headers: { 'User-Agent': 'zetizeti-notes', Authorization: 'Bearer ' + (process.env.ZETIZETI_NOTES_KEY || '') }, signal: AbortSignal.timeout(8000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('the editor answered ' + r.status);
  const value = await r.json();
  cache.set(path, { at: Date.now(), value });
  return value;
}
export const clearNotesCache = () => { cache = new Map(); };

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const unesc = s => String(s).replace(/&(lt|gt|quot|amp);/g, (_, n) => ({ lt: '<', gt: '>', quot: '"', amp: '&' })[n]);
const media = url => (url.startsWith('/media/') && process.env.ZETIZETI_NOTES_MEDIA ? process.env.ZETIZETI_NOTES_MEDIA.replace(/\/+$/, '') + url : url);
const when = d => (d ? `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : '');

function inline(t) {
  return esc(unesc(t))
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, u) => `<img src="${media(u)}" alt="${alt}">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, u) => `<a href="${media(u)}">${txt}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
}

// The editor's Markdown, in the few marks it uses. A block of HTML the note carries (a diagram) goes through as it is;
// every other line is its own paragraph, as the editor shows it.
export function markdown(text) {
  const out = [];
  for (const block of String(text || '').trim().split(/\n\s*\n/)) {
    const lines = block.split('\n');
    if (block.trimStart().startsWith('<')) out.push(block);
    else if (lines.length === 1 && /^#{1,6} /.test(lines[0])) { const n = Math.min(lines[0].indexOf(' ') + 1, 4); out.push(`<h${n}>${inline(lines[0].slice(lines[0].indexOf(' ') + 1))}</h${n}>`); }
    else if (lines.every(l => /^\s*[-•] /.test(l))) out.push('<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-•] /, ''))}</li>`).join('') + '</ul>');
    else if (lines.every(l => /^\s*\d+\. /.test(l))) out.push('<ol>' + lines.map(l => `<li>${inline(l.replace(/^\s*\d+\. /, ''))}</li>`).join('') + '</ol>');
    else if (lines.every(l => l.startsWith('>'))) out.push('<blockquote><p>' + lines.map(l => inline(l.replace(/^>\s?/, ''))).join('<br>') + '</p></blockquote>');
    else out.push(...lines.filter(l => l.trim()).map(l => `<p>${inline(l)}</p>`));
  }
  return out.join('\n');
}

function page(title, body, path) {
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><link rel="canonical" href="https://zetizeti.com${path}">
<meta property="og:title" content="${esc(title)}"><meta property="og:image" content="https://zetizeti.com/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rozha+One&family=Besley:ital,wght@0,400;0,600;1,400&family=Space+Mono&display=swap" rel="stylesheet">
<style>
  :root{--ground:#173a8c;--bone:#F6E8C6;--gold:#f0b324;--vermilion:#e8431f;--ink:#14224a;--teal:#0a4f49}
  *{box-sizing:border-box} html{overflow-x:clip}
  body{margin:0;background:var(--ground);color:var(--bone);font:400 19px/1.7 Besley,Georgia,serif}
  body::before{content:"";position:fixed;inset:auto -10vw -20vh auto;width:55vw;height:55vh;background:var(--vermilion);border-radius:46% 54% 38% 62%/52% 40% 60% 48%;z-index:-1;opacity:.9}
  .wrap{max-width:46rem;margin:0 auto;padding:40px 22px 80px}
  .top{display:flex;gap:18px;align-items:baseline;flex-wrap:wrap;font:400 13px/1 'Space Mono',monospace;letter-spacing:.08em;text-transform:uppercase}
  .top a{color:var(--gold);text-decoration:none} .top a:hover{color:var(--bone)}
  .mark{font:400 30px/1 'Rozha One',serif;letter-spacing:0;text-transform:none;color:var(--bone)!important}
  h1{font:400 clamp(38px,6vw,64px)/1.08 'Rozha One',serif;margin:40px 0 10px}
  h2,h3,h4{font:400 28px/1.2 'Rozha One',serif;margin:34px 0 8px}
  .date{font:400 13px/1 'Space Mono',monospace;color:var(--gold);letter-spacing:.06em;margin:0 0 26px}
  p{margin:0 0 16px} a{color:var(--gold)} img,svg{max-width:100%;height:auto}
  blockquote{margin:18px 0;padding:6px 0 6px 18px;border-left:4px solid var(--gold)}
  figure{background:var(--bone);border-radius:4px;padding:10px;margin:22px 0}
  .list{list-style:none;padding:0;margin:20px 0 0} .list li{margin:0 0 12px}
  .list a{display:block;background:var(--gold);color:var(--ink);text-decoration:none;padding:18px 22px;border-radius:2px}
  .list a:hover{background:var(--bone)} .list b{display:block;font:400 26px/1.2 'Rozha One',serif} .list span{font:400 13px/1 'Space Mono',monospace}
</style></head><body><div class="wrap">
<nav class="top"><a class="mark" href="/">zetizeti</a><a href="/notes">Notes</a><a href="/about">About</a></nav>
${body}
</div></body></html>`;
}

export async function notesIndex(fetchImpl) {
  let texts = [];
  try { texts = (await get('', fetchImpl))?.texts || []; } catch (e) { return page('Notes · zetizeti', '<h1>Notes</h1><p>The notes cannot be read just now. Try again in a minute.</p>', '/notes'); }
  const list = texts.map(t => `<li><a href="${esc(t.url)}"><b>${esc(t.title)}</b><span>${when(t.date)}</span></a></li>`).join('');
  return page('Notes · zetizeti', `<h1>Notes</h1>${list ? `<ul class="list">${list}</ul>` : '<p>No notes yet.</p>'}`, '/notes');
}

export async function noteFor(slug, fetchImpl) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const n = await get('/notes/' + slug, fetchImpl);
  if (!n) return null;
  return page(`${n.title} · zetizeti`, `<h1>${esc(n.title)}</h1><p class="date">${when(n.date)}</p>\n${markdown(n.text)}\n<p><a href="/notes">All notes</a></p>`, '/notes/' + slug);
}
