// transcript-pdf-refusal.test.mjs — the saved PDF is refused BY NAME at the resume input.
//
// 🔴 WHY THIS EXISTS. The transcript downloads as `.md` or `.pdf` and only the markdown can come back:
// `buildTranscriptMd` writes front matter and `**Q.**`, while `downloadTranscriptPdf` writes neither,
// by design, because the PDF is for reading and handing on. Until 2 September 2026 the resume input's
// `accept` excluded PDFs, so a student who had saved one opened the picker, found her own file greyed
// out, and was told nothing. Measured the same day: six of ninety-five transcripts submitted to a
// course app were the text inside one of these PDFs, pasted in as though it were the transcript.
//
// ⚠️ It reads the CLIENT SOURCE, one function body at a time, for the reason `prep-doorway.test.mjs`
// gives: there is no other consumer test for a browser path in this repo, and a `pdf` mention anywhere
// in 2,400 lines would pass and establish nothing.
//
// 🟢 PROVED BY FAILING ON THE PRE-FIX COPY. `ZETIZETI_CLIENT` points this at any other copy of the
// client, which is how it was run against the version that had the defect (kept privately) — four of
// five fail there, and four of five fail again on the tooltip-only draft that put the caveat in a
// `title`. A test written after a fix is worth nothing until it has been shown to fail on the version
// that had the defect — this repository's own rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = process.env.ZETIZETI_CLIENT
  || fileURLToPath(new URL('../public/index.html', import.meta.url));
const html = readFileSync(SRC, 'utf8');

// Pull one function body out, brace-matched, so an assertion cannot be satisfied by text elsewhere.
function body(name) {
  const at = html.indexOf(`function ${name}(`);
  assert.notEqual(at, -1, `${name} not found in the client`);
  const open = html.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces reading ${name}`);
}
function iife(marker) {
  const at = html.indexOf(marker);
  assert.notEqual(at, -1, `${marker} not found in the client`);
  const open = html.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces reading ${marker}`);
}

test('the resume input ACCEPTS a pdf, so the student can select it and be told why not', () => {
  const tag = html.match(/<input id="ulMd"[^>]*>/);
  assert.ok(tag, 'the ulMd input is gone');
  assert.match(tag[0], /accept="[^"]*\.pdf/,
    'ulMd does not accept .pdf — the file greys out in the picker and the student learns nothing');
});

// 🔴 COMMENTS COME OUT BEFORE ANY ORDER IS CHECKED. Written without this, the ordering assertion below
// failed on the correct code: the comment explaining the guard says the word `readAsText`, and it sits
// above the guard, so the test read prose about the code as the code. A source-reading test cannot tell
// the two apart and will happily be satisfied — or defeated — by a sentence.
const decomment = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

test('the resume handler refuses a pdf before it is read as text', () => {
  const b = decomment(iife('function wireTranscriptUl'));
  assert.match(b, /application\/pdf|\.pdf/, 'wireTranscriptUl does not test for a PDF at all');
  const guard = b.indexOf('pdf');
  const read = b.indexOf('readAsText');
  assert.ok(guard !== -1 && read !== -1 && guard < read,
    'the PDF check must come BEFORE readAsText — otherwise postscript reaches parseTranscriptMd and the '
    + 'student is told her own transcript does not look like one of ours');
});

test('the refusal names the .md rather than only rejecting', () => {
  const b = iife('function wireTranscriptUl');
  const msg = b.match(/say\('That is the PDF[^']*'/);
  assert.ok(msg, 'the PDF refusal message is missing or reworded past recognition');
  assert.match(msg[0], /\.md/, 'the refusal does not tell her which file to pick instead');
});

// 🔴 VISIBLE TEXT, NOT A `title`. This assertion originally accepted tooltips and passed on a version
// that told a phone user nothing — a caveat needing a hover is not a caveat for the people most likely
// to save the wrong file. Prayas, 2 September 2026: "the download link should say that the pdf cannot
// be resumed." A title alone must fail here, which is why the check is on the rendered words.
test('the download strip SAYS ON THE PAGE that the pdf cannot be resumed', () => {
  const strip = html.match(/<span class="dl-transcript" id="dlTranscript"[\s\S]{0,1200}/)[0];
  const visible = strip.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  assert.match(visible, /cannot be resumed/i,
    'the words "cannot be resumed" are not rendered — a tooltip does not count, it needs a hover');
  assert.match(visible, /carry on/i, 'nothing on the page says which file DOES carry on');
  assert.match(strip, /<span class="dl-why">[^<]*cannot be resumed[^<]*<\/span>\s*<\/span>/,
    'the caveat is not attached to the .pdf link — it must sit after it, not float in the strip');
});

test('the PDF genuinely cannot resume — this is a fact about the writer, not a policy', () => {
  const md = body('buildTranscriptMd');
  const pdf = body('downloadTranscriptPdf');
  assert.match(md, /source: zetizeti/, 'the markdown no longer writes front matter');
  assert.ok(!/source: zetizeti/.test(pdf),
    'the PDF now writes front matter — if it became resumable, this refusal is wrong and must be revisited '
    + 'rather than left standing');
});
