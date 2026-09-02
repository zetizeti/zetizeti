// spec-face.test.mjs — the speccing surface's CLIENT half: the third face exists, is reachable, and does
// not carry the two things this surface must refuse to show.
//
// ⚠️ It reads the client source, one region at a time, for the reason `prep-doorway.test.mjs` gives —
// there is no other consumer test for a browser path in this repo, and a `spec` mention anywhere in
// 2,600 lines would pass and establish nothing.
//
// 🟢 PROVED BY FAILING ON THE PRE-FACE COPY. `ZETIZETI_CLIENT` points this at the client as it stood
// before the face was built, kept privately; every assertion below fails there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = process.env.ZETIZETI_CLIENT
  || fileURLToPath(new URL('../public/index.html', import.meta.url));
const html = readFileSync(SRC, 'utf8');
const decomment = (s) => s.replace(/<!--[\s\S]*?-->/g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const code = decomment(html);

// 🔴 A FUNCTION IS BOUNDED BY ITS BRACES, NEVER BY A CHARACTER COUNT. Written as `slice(i, i + 3000)`
// this test failed on correct code: the window ran past the end of `specStream` into the function
// declared after it and found that one's mentions of the criticism surface. A fixed window does not
// measure the thing it names, and it fails in whichever direction the file happens to be arranged.
function fnBody(name) {
  const at = code.indexOf(name);
  assert.notEqual(at, -1, `${name} not found in the client`);
  const open = code.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}' && --depth === 0) return code.slice(open, i + 1);
  }
  throw new Error(`unbalanced braces reading ${name}`);
}

// 🔴 A DEEP LINK HAS TO SURVIVE A RELOAD, and it did not until this was added. The client routes /spec
// perfectly well and the SERVER 404'd it, because the app shell is served for a NAMED LIST of paths and a
// new face does not join it by existing. Nothing in the client could have revealed this: the face worked
// for anybody who clicked the nav and broke for anybody who reloaded, bookmarked or was sent the link.
test('the server serves the app shell at /spec, or a reload 404s', () => {
  const server = readFileSync(fileURLToPath(new URL('../server.mjs', import.meta.url)), 'utf8');
  const list = server.match(/app\.get\(\[([^\]]+)\][^)]*\)\s*=>\s*\{[\s\S]{0,200}?sendFile/);
  assert.ok(list, 'the app-shell path list is gone or has changed shape');
  assert.match(list[1], /'\/spec'/, "/spec is not in the app-shell path list — the face works on a click and 404s on a reload");
});

test('the third face is in the nav, the view map, the router and the click handlers', () => {
  assert.match(html, /<a id="navSpec">/, 'no nav entry');
  assert.match(code, /spec:\$\('view-spec'\)/, 'view-spec is not in the views map — showView cannot reach it');
  assert.match(code, /'spec-chat':\$\('view-spec-chat'\)/, 'view-spec-chat is not in the views map');
  assert.match(code, /case '\/spec':\s*openNewSpec\(\)/, '/spec does not route');
  assert.match(code, /\$\('navSpec'\)\.addEventListener\('click'/, 'the nav entry does nothing');
});

test('both endpoints are called, and no other surface\'s are called from the spec path', () => {
  assert.match(code, /'\/api\/spec\/open'/);
  assert.match(code, /'\/api\/spec\/turn'/);
  const fn = fnBody('async function specStream');
  assert.ok(!/criticism/.test(fn), 'the spec stream reader mentions the criticism surface — they must not share a reader');
});

// 🔴 THE TWO THINGS THIS SURFACE MUST NOT SHOW, and both would look like helpful additions.

test('🔴 it never renders a count of the joints — a figure about unfinished work is a mark', () => {
  const fn = fnBody('async function specStream');
  assert.match(fn, /joints/, 'the joints event is not handled at all');
  // The handler must exist and do nothing with it. Anything that turns the payload into a number on the
  // page — a length, a ratio, a "3 of 6" — is the failure this asserts against.
  assert.ok(!/\bof 6\b|\.length\s*\+\s*'\s*\/|touched\.length|Math\.round\(/.test(fn),
    'the joints payload is being turned into a figure — this surface does not score');
});

test('🔴 there is no focus toggle on this face — the making filter would empty it', () => {
  const view = html.slice(html.indexOf('id="view-spec-chat"'), html.indexOf('id="view-admin"'));
  assert.ok(!/focus-toggle/.test(view),
    'a focus toggle reached the spec face — concept-only drops the corpus entries marked making, which is '
    + 'the entire register this surface works in, so the switch would offer a setting that breaks the tool');
});

test('the specification panel is editable, because she is expected to change it mid-conversation', () => {
  assert.match(code, /setAttribute\('contenteditable','true'\)/,
    'the spec panel is read-only — that says the opposite of what this surface is for');
  assert.match(code, /function currentSpec\(\)/, 'nothing reads the panel back, so an edit would never reach a turn');
  // and every turn must post what is there NOW rather than what was pasted
  assert.match(code, /spec: currentSpec\(\)/);
});

test('the assignment is optional, removable, and labelled as never marked against', () => {
  assert.match(html, /never marked against/i);
  assert.match(code, /\$\('specAssignClear'\)/);
});

test('the copy says the specification is the thing under question, not context', () => {
  const view = html.slice(html.indexOf('id="view-spec"'), html.indexOf('id="view-spec-chat"'));
  assert.match(view, /nothing is saved/i);
  assert.match(view, /never tells you what is missing/i,
    'the landing copy does not state the one thing that distinguishes this from a review');
});
