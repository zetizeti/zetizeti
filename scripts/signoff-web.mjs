#!/usr/bin/env node
//
// signoff-web.mjs — the Gate-4 sign-off bench, in a browser.
//
//   node scripts/signoff-web.mjs        → http://localhost:4321
//
// WHY THIS EXISTS. `signoff.mjs` walks pending entries one at a time in a terminal. That is fine
// for a handful and hopeless for 231. This is the same operation with a whole-corpus view, bulk
// selection, bookmarks and keyboard flow — for doing the entire backlog in one sitting.
//
// 🔴 IT CHANGES NOTHING BY ITSELF. Invariant #0: the ONLY step that flips pending → verified is
// my own sign-off. This tool removes the friction, never the judgement. Every flip is an
// explicit action here, is written straight into `corpus/domain/*.md`, and is appended to
// `docs/corpus-build/signoff-log.md` with a second-precision timestamp.
//
// 🔴 LOCAL ONLY. Binds 127.0.0.1. Never deployed — `make-caprover-tar.sh` whitelists only
// server.mjs, lib/, public/, corpus/ and the package files, so `scripts/` never enters the tar.
//
// It writes the SAME strings signoff.mjs writes, so the two routes cannot drift.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, readdirSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..');
const DOMAIN = join(APP, 'corpus', 'domain');
const LOG = join(APP, '..', 'docs', 'corpus-build', 'signoff-log.md');
const NOTES = join(APP, '..', 'docs', 'corpus-build', 'reading-notes.md');
const PORT = Number(process.env.PORT || 4321);

const PENDING = '**provenance:** pending';
const VERIFIED = '**provenance:** verified';

const stamp = () => {
  const d = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const field = (block, name) => {
  const m = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|\\n---|$)`, 'i'));
  return m ? m[1].trim() : '';
};

const splitEntries = (content) => content.split(/(?=^## entry: )/m);

// Recency comes from the log's line ORDER, not from parsing its dates: the file is append-only, so
// a later line is a later action, and a slug verified → reverted → verified again resolves to its
// last occurrence. The file's own provenance line stays the authority on state; this only orders.
function verifiedOrder() {
  const at = {};
  if (!existsSync(LOG)) return at;
  readFileSync(LOG, 'utf8').split('\n').forEach((line, i) => {
    const m = line.match(/^- .+ · (verified|REVERTED to pending) · `([^`]+)`/);
    if (!m) return;
    if (m[1] === 'verified') at[m[2]] = i; else delete at[m[2]];
  });
  return at;
}

function readAll() {
  const order = verifiedOrder();
  const files = readdirSync(DOMAIN).filter((f) => f.endsWith('.md')).sort();
  const entries = [];
  for (const file of files) {
    const parts = splitEntries(readFileSync(join(DOMAIN, file), 'utf8'));
    for (const block of parts) {
      if (!block.startsWith('## entry: ')) continue;
      const slug = (block.match(/^## entry: (.+)$/m) || [, '(unknown)'])[1].trim();
      // No provenance line at all = legacy, parsed as verified (retrieval.mjs:25).
      const hasLine = /\*\*provenance:\*\*/i.test(block);
      const state = !hasLine ? 'legacy' : block.includes(PENDING) ? 'pending' : 'verified';
      entries.push({
        file, slug, state,
        seq: order[slug] ?? -1,   // -1 = verified before the log existed (the original sixteen)
        discipline: field(block, 'discipline'),
        tension: field(block, 'the_tension'),
        feltAs: field(block, 'felt as'),
        failures: field(block, 'failure_modes'),
        invites: field(block, 'questions_it_invites'),
        sources: field(block, 'sources'),
      });
    }
  }
  return entries;
}

// Flip a set of slugs. `to` is 'verified' or 'pending' — the reverse exists because a bulk
// action needs an undo; a mis-click across sixty entries must not be a one-way door.
function flip(slugs, to) {
  const want = new Set(slugs);
  const changed = [];
  for (const file of readdirSync(DOMAIN).filter((f) => f.endsWith('.md'))) {
    const path = join(DOMAIN, file);
    const parts = splitEntries(readFileSync(path, 'utf8'));
    let touched = false;
    const out = parts.map((block) => {
      if (!block.startsWith('## entry: ')) return block;
      const slug = (block.match(/^## entry: (.+)$/m) || [, ''])[1].trim();
      if (!want.has(slug)) return block;
      const from = to === 'verified' ? PENDING : VERIFIED;
      const dest = to === 'verified' ? VERIFIED : PENDING;
      if (!block.includes(from)) return block;
      touched = true;
      changed.push({ file, slug });
      return block.replace(from, dest);
    });
    if (touched) writeFileSync(path, out.join(''), 'utf8');
  }
  if (changed.length) {
    mkdirSync(dirname(LOG), { recursive: true });
    if (!existsSync(LOG)) appendFileSync(LOG, '# Gate-4 sign-off log\n\n*Every flip, with a timestamp. Written by `signoff.mjs` and `signoff-web.mjs`.*\n\n', 'utf8');
    const verb = to === 'verified' ? 'verified' : 'REVERTED to pending';
    appendFileSync(LOG, changed.map((c) => `- ${stamp()} · ${verb} · \`${c.slug}\` (${c.file}) · via signoff-web\n`).join(''), 'utf8');
  }
  return changed;
}

// Marginalia, not tickets. A thought lands next to the entry that provoked it, with a timestamp,
// and nothing more happens to it — no status, no queue, nothing that can be behind.
function addNote(slug, file, text) {
  const clean = String(text).replace(/\r?\n/g, ' ').trim();
  if (!clean) return false;
  mkdirSync(dirname(NOTES), { recursive: true });
  if (!existsSync(NOTES)) appendFileSync(NOTES, '# Reading notes\n\n*Written while reading the corpus for Gate-4 sign-off. Marginalia — not a backlog, nothing here is owed. Each note names the entry that provoked it.*\n\n', 'utf8');
  appendFileSync(NOTES, `- **\`${slug}\`** (${file}) · ${stamp()}\n  ${clean}\n\n`, 'utf8');
  return true;
}

function readNotes() {
  if (!existsSync(NOTES)) return {};
  const byslug = {};
  for (const m of readFileSync(NOTES, 'utf8').matchAll(/^- \*\*`([^`]+)`\*\*[^\n]*\n  (.+)$/gm)) {
    (byslug[m[1]] ||= []).push(m[2]);
  }
  return byslug;
}

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

createServer((req, res) => {
  if (req.url === '/' ) return send(res, 200, PAGE, 'text/html; charset=utf-8');
  if (req.url === '/api/entries') {
    const notes = readNotes();
    return send(res, 200, readAll().map((e) => ({ ...e, notes: notes[e.slug] || [] })));
  }
  if (req.url === '/api/note' && req.method === 'POST') {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      try {
        const { slug, file, text } = JSON.parse(b);
        send(res, 200, { ok: addNote(slug, file, text) });
      } catch { send(res, 400, { error: 'could not save' }); }
    });
    return;
  }
  if (req.url === '/api/flip' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { slugs, to } = JSON.parse(body);
        if (!Array.isArray(slugs) || !['verified', 'pending'].includes(to)) return send(res, 400, { error: 'bad request' });
        const changed = flip(slugs, to);
        send(res, 200, { changed: changed.length, entries: readAll() });
      } catch (e) {
        // The body carries no personal data, but never echo a request body into an error.
        send(res, 400, { error: 'could not apply' });
      }
    });
    return;
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, '127.0.0.1', () => {
  const all = readAll();
  const pending = all.filter((e) => e.state === 'pending').length;
  console.log(`\n  zetizeti — Gate-4 sign-off bench`);
  console.log(`  ${all.length} entries · ${pending} pending · ${all.length - pending} already through`);
  console.log(`\n  http://localhost:${PORT}\n`);
  console.log(`  Nothing is flipped until you flip it. Every flip is logged.\n`);
});

const PAGE = String.raw`<!doctype html>
<meta charset="utf-8"><title>Gate-4 sign-off — zetizeti</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{
  --ground:#070d18; --ground-2:#0b1526; --ink:#e8eefc; --dim:#8fa3c4;
  --cobalt:#1848c0; --cobalt-hi:#3d7ae0; --fire:#d84830; --gold:#e0ae5c; --teal:#18c0c0;
  --line:rgba(160,190,240,.16);
  --mono:ui-monospace,"SF Mono",Menlo,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font:15px/1.55 "Iowan Old Style",Georgia,serif;}
/* hard edges throughout — no rounded cards (recorded correction, 3 Jun 2026) */
header{position:sticky;top:0;z-index:9;background:var(--ground-2);
  border-bottom:1px solid var(--line);padding:14px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
h1{font-size:15px;margin:0;letter-spacing:.02em;font-weight:600}
.bar{flex:1;min-width:220px;height:6px;background:rgba(255,255,255,.07);position:relative}
.bar i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--cobalt),var(--teal));display:block}
.count{font-family:var(--mono);font-size:12px;color:var(--dim);white-space:nowrap}
button{font:inherit;font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  background:transparent;color:var(--ink);border:1px solid var(--line);padding:7px 12px;cursor:pointer}
button:hover{border-color:var(--cobalt-hi)}
button.go{background:var(--cobalt);border-color:var(--cobalt)}
button.go:hover{background:var(--cobalt-hi)}
button.warn{color:var(--fire);border-color:rgba(216,72,48,.5)}
button[disabled]{opacity:.35;cursor:default}
main{display:grid;grid-template-columns:250px 1fr;min-height:100vh}
nav{border-right:1px solid var(--line);padding:16px 0;position:sticky;top:57px;align-self:start;max-height:calc(100vh - 57px);overflow:auto}
nav a{display:flex;justify-content:space-between;gap:8px;padding:7px 20px;color:var(--dim);
  text-decoration:none;font-family:var(--mono);font-size:11.5px;cursor:pointer;border-left:2px solid transparent}
nav a:hover{color:var(--ink)}
nav a.on{color:var(--ink);border-left-color:var(--gold);background:rgba(255,255,255,.03)}
nav .n{color:var(--gold)}
nav .n.done{color:var(--teal)}
section{padding:20px 24px 140px;max-width:1000px}
.filters{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;align-items:center}
input[type=search]{font:inherit;background:var(--ground-2);border:1px solid var(--line);color:var(--ink);padding:7px 10px;min-width:220px}
.card{border:1px solid var(--line);border-left:3px solid var(--gold);background:var(--ground-2);
  padding:16px 18px;margin-bottom:14px;position:relative}
.card.verified{border-left-color:var(--teal);opacity:.62}
.card.legacy{border-left-color:var(--dim);opacity:.5}
.card.sel{border-color:var(--cobalt-hi);box-shadow:inset 0 0 0 1px var(--cobalt-hi)}
.card.cursor{outline:2px solid var(--fire);outline-offset:3px}
.card.cursor::before{content:'▸ v verifies THIS';position:absolute;top:-11px;left:14px;
  background:var(--fire);color:#0b0b0b;font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;padding:2px 7px}
.top{display:flex;gap:12px;align-items:baseline;margin-bottom:9px;flex-wrap:wrap}
.slug{font-family:var(--mono);font-size:13px;color:var(--gold)}
.card.verified .slug{color:var(--teal)}
.meta{font-family:var(--mono);font-size:10.5px;color:var(--dim);letter-spacing:.05em;text-transform:uppercase}
.tension{margin:0 0 10px}
.lab{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);display:block;margin:10px 0 3px}
.small{font-size:13.5px;color:#c3d0e8;margin:0}
.acts{display:flex;gap:8px;margin-top:14px;align-items:center}
.mark{cursor:pointer;font-family:var(--mono);font-size:11px;color:var(--dim);user-select:none}
.notes{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}
.note{font-size:13.5px;color:var(--gold);margin:0 0 6px;padding-left:12px;border-left:2px solid var(--gold)}
.noteform{display:flex;gap:8px;margin-top:8px}
.noteform input{flex:1;font:inherit;font-size:13.5px;background:rgba(255,255,255,.04);
  border:1px solid var(--line);color:var(--ink);padding:7px 10px}
.noteform input:focus{outline:none;border-color:var(--gold)}
.noteform input::placeholder{color:var(--dim);font-style:italic}
.mark.on{color:var(--fire)}
footer{position:fixed;bottom:0;left:0;right:0;background:var(--ground-2);border-top:1px solid var(--line);
  padding:12px 20px;display:flex;gap:12px;align-items:center;z-index:9}
.hint{font-family:var(--mono);font-size:11px;color:var(--dim)}
</style>

<header>
  <h1>Gate-4 sign-off</h1>
  <div class="bar"><i id="bar" style="width:0"></i></div>
  <span class="count" id="count">…</span>
</header>

<main>
  <nav id="files"></nav>
  <section>
    <div class="filters">
      <input type="search" id="q" placeholder="search tension, slug, felt-as…">
      <button data-f="pending" class="go">pending</button>
      <button data-f="all">all</button>
      <button data-f="verified">verified</button>
      <button data-f="marked">bookmarked</button>
      <span class="hint" id="showing"></span>
    </div>
    <div id="list"></div>
  </section>
</main>

<footer>
  <button id="selall">select all shown</button>
  <button id="selnone">clear</button>
  <button id="verify" class="go" disabled>verify selected</button>
  <button id="revert" class="warn" disabled>revert selected</button>
  <span class="hint" id="selinfo">nothing selected</span>
  <span class="hint" id="target" style="color:var(--fire)"></span>
  <span class="hint" style="margin-left:auto">j/k move · x select · v verify one · b bookmark</span>
</footer>

<script>
let ALL=[], filter='pending', file=null, sel=new Set(), cursor=0;
const marks = new Set(JSON.parse(localStorage.getItem('zz-marks')||'[]'));
const saveMarks = () => localStorage.setItem('zz-marks', JSON.stringify([...marks]));
const esc = (s) => (s||'').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

async function load(){ ALL = await (await fetch('/api/entries')).json(); render(); }

function shown(){
  const q = document.getElementById('q').value.trim().toLowerCase();
  const out = ALL.filter(e => {
    if (file && e.file !== file) return false;
    if (filter==='pending'  && e.state!=='pending')  return false;
    if (filter==='verified' && e.state==='pending')  return false;
    if (filter==='marked'   && !marks.has(e.slug))   return false;
    if (q && !(e.slug+' '+e.tension+' '+e.feltAs+' '+e.discipline).toLowerCase().includes(q)) return false;
    return true;
  });
  // Most recently verified on top — only in the verified view. Pending stays in corpus order,
  // because that is reading order and jumbling it would lose your place.
  if (filter==='verified') out.sort((a,b)=> b.seq - a.seq);
  return out;
}

function render(){
  const done = ALL.filter(e=>e.state!=='pending').length;
  document.getElementById('bar').style.width = (done/ALL.length*100)+'%';
  document.getElementById('count').textContent = done+' / '+ALL.length+' through · '+(ALL.length-done)+' pending';

  const byFile = {};
  for (const e of ALL) (byFile[e.file] ||= []).push(e);
  document.getElementById('files').innerHTML =
    '<a class="'+(file?'':'on')+'" data-file=""><span>all files</span><span class="n">'+
      ALL.filter(e=>e.state==='pending').length+'</span></a>' +
    Object.keys(byFile).sort().map(f=>{
      const p = byFile[f].filter(e=>e.state==='pending').length;
      return '<a class="'+(file===f?'on':'')+'" data-file="'+f+'"><span>'+f.replace('.md','')+
        '</span><span class="n '+(p?'':'done')+'">'+(p||'✓')+'</span></a>';
    }).join('');

  const list = shown();
  if (cursor >= list.length) cursor = Math.max(0, list.length-1);
  document.getElementById('showing').textContent = list.length+' shown';
  document.getElementById('list').innerHTML = list.map((e,i)=>
    '<div class="card '+e.state+(sel.has(e.slug)?' sel':'')+(i===cursor?' cursor':'')+'" data-slug="'+e.slug+'">'+
      '<div class="top"><span class="slug">'+esc(e.slug)+'</span>'+
        '<span class="meta">'+esc(e.file.replace('.md',''))+' · '+e.state+'</span></div>'+
      '<p class="tension">'+esc(e.tension).slice(0,1400)+'</p>'+
      (e.feltAs?'<span class="lab">felt as</span><p class="small">'+esc(e.feltAs)+'</p>':'')+
      (e.invites?'<span class="lab">questions it invites</span><p class="small">'+esc(e.invites)+'</p>':'')+
      (e.sources?'<span class="lab">sources</span><p class="small">'+esc(e.sources)+'</p>':'')+
      '<div class="acts">'+
        '<button data-act="sel">'+(sel.has(e.slug)?'deselect':'select')+'</button>'+
        (e.state==='pending'
          ? '<button data-act="v" class="go">verify</button>'
          : '<button data-act="r" class="warn">revert</button>')+
        '<span class="mark '+(marks.has(e.slug)?'on':'')+'" data-act="b">'+(marks.has(e.slug)?'★ bookmarked':'☆ bookmark')+'</span>'+
      '</div>'+
      '<div class="notes">'+
        (e.notes||[]).map(n=>'<p class="note">'+esc(n)+'</p>').join('')+
        '<div class="noteform"><input placeholder="an idea this gave you — enter to keep it" data-note="'+e.slug+'" data-file="'+e.file+'"></div>'+
      '</div>'+
    '</div>').join('') || '<p class="hint">nothing here.</p>';

  document.getElementById('selinfo').textContent = sel.size ? sel.size+' selected' : 'nothing selected';
  document.getElementById('verify').disabled = !sel.size;
  document.getElementById('revert').disabled = !sel.size;
  paintCursor();
}

// The cursor is whatever card sits nearest the middle of the viewport. It is NOT separate state
// you have to track: scroll and it follows, so the card you are reading is always the card v acts
// on. (Before this, v fired on an index that could be far off-screen — a blind-fire key on an
// operation that writes to the corpus.)
function cardAtCentre(){
  const cards=[...document.querySelectorAll('.card')];
  if(!cards.length) return -1;
  const mid=window.innerHeight/2;
  let best=0, dist=Infinity;
  cards.forEach((c,i)=>{ const r=c.getBoundingClientRect();
    const d=Math.abs((r.top+r.bottom)/2 - mid); if(d<dist){dist=d;best=i;} });
  return best;
}
function paintCursor(){
  const cards=[...document.querySelectorAll('.card')];
  cards.forEach((c,i)=>c.classList.toggle('cursor', i===cursor));
  const t=document.getElementById('target');
  if(t) t.textContent = cards[cursor] ? '▸ '+cards[cursor].dataset.slug : '';
}
let tick=false;
addEventListener('scroll', ()=>{ if(tick) return; tick=true;
  requestAnimationFrame(()=>{ tick=false;
    const i=cardAtCentre(); if(i>=0 && i!==cursor){ cursor=i; paintCursor(); } }); }, {passive:true});

async function flip(slugs, to){
  if (!slugs.length) return;
  if (slugs.length > 20 && !confirm(to+' '+slugs.length+' entries in the corpus?\n\nThis writes to corpus/domain/*.md and is logged. It can be reverted.')) return;
  const r = await (await fetch('/api/flip',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({slugs,to})})).json();
  ALL = r.entries; sel.clear(); render();
}

document.addEventListener('click', (ev)=>{
  const nav = ev.target.closest('nav a');
  if (nav){ file = nav.dataset.file || null; cursor=0; render(); return; }
  const f = ev.target.closest('[data-f]');
  if (f){ filter = f.dataset.f; cursor=0;
    document.querySelectorAll('[data-f]').forEach(b=>b.classList.toggle('go', b.dataset.f===filter));
    render(); return; }
  const act = ev.target.closest('[data-act]');
  if (act){
    const slug = act.closest('.card').dataset.slug;
    const a = act.dataset.act;
    if (a==='sel'){ sel.has(slug)?sel.delete(slug):sel.add(slug); render(); }
    if (a==='v') flip([slug],'verified');
    if (a==='r') flip([slug],'pending');
    if (a==='b'){ marks.has(slug)?marks.delete(slug):marks.add(slug); saveMarks(); render(); }
  }
});
document.addEventListener('keydown', async (ev)=>{
  const inp = ev.target.closest('[data-note]');
  if (!inp || ev.key !== 'Enter') return;
  const text = inp.value.trim(); if (!text) return;
  await fetch('/api/note',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({slug:inp.dataset.note,file:inp.dataset.file,text})});
  const p=document.createElement('p'); p.className='note'; p.textContent=text;
  inp.closest('.notes').insertBefore(p, inp.closest('.noteform'));
  const e=ALL.find(x=>x.slug===inp.dataset.note); if(e){ (e.notes||=[]).push(text); }
  inp.value=''; inp.blur();
});

document.getElementById('q').addEventListener('input', ()=>{cursor=0;render();});
document.getElementById('selall').onclick  = ()=>{ shown().forEach(e=>sel.add(e.slug)); render(); };
document.getElementById('selnone').onclick = ()=>{ sel.clear(); render(); };
document.getElementById('verify').onclick  = ()=> flip([...sel],'verified');
document.getElementById('revert').onclick  = ()=> flip([...sel],'pending');

document.addEventListener('keydown',(e)=>{
  if (e.target.tagName==='INPUT') return;
  const list = shown(); if (!list.length) return;
  const cur = list[cursor];
  const move=(d)=>{ cursor=Math.max(0,Math.min(cursor+d,list.length-1)); paintCursor();
    const c=document.querySelectorAll('.card')[cursor]; if(c) c.scrollIntoView({block:'center',behavior:'smooth'}); };
  if (e.key==='j'){ move(1); return; }
  if (e.key==='k'){ move(-1); return; }
  if (e.key==='x'){ sel.has(cur.slug)?sel.delete(cur.slug):sel.add(cur.slug); render(); }
  if (e.key==='v' && cur.state==='pending') flip([cur.slug],'verified');
  if (e.key==='b'){ marks.has(cur.slug)?marks.delete(cur.slug):marks.add(cur.slug); saveMarks(); render(); }
});

load();
</script>`;
