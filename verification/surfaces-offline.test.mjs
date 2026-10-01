// surfaces-offline.test.mjs — enquiry only (30 September 2026)
//
// Prayas: "make the critique ad spec pages offline - only enquiry mode needed". The two surfaces stay in the code and are switched off. These tests read the server and the page, because a switch that the routes or the links do not consult is off in name only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = readFileSync(join(APP, 'server.mjs'), 'utf8');
const page = readFileSync(join(APP, 'public', 'index.html'), 'utf8');

test('with nothing set, enquiry is the only surface on', () => {
  assert.match(server, /process\.env\.ZETIZETI_SURFACES \|\| 'enquiry'/);
});

test('every critique and spec route sits behind the switch, and a closed one answers 404', () => {
  const gateCrit = server.indexOf("app.use('/api/criticism', surfaceOn('criticism'))");
  const gateSpec = server.indexOf("app.use('/api/spec', surfaceOn('spec'))");
  assert.ok(gateCrit > 0 && gateSpec > 0, 'both prefixes are gated');
  const routes = [...server.matchAll(/^app\.(?:get|post|put|delete)\('(\/api\/(?:criticism|spec)\/[^']+)'/gm)];
  assert.ok(routes.length >= 5, 'the routes are still in the code');
  for (const r of routes) assert.ok(r.index > Math.max(gateCrit, gateSpec), `${r[1]} is registered after its gate, so the gate runs first`);
  assert.match(server, /SURFACES\.has\(name\) \? next\(\) : res\.status\(404\)/);
});

test('the page is told which surfaces are on, and shows a way in to no other', () => {
  assert.match(server, /surfaces: \[\.\.\.SURFACES\]/);
  assert.match(page, /<a id="navCrit" hidden>critique<\/a>/);
  assert.match(page, /<a id="navSpec" hidden>spec<\/a>/);
  assert.match(page, /\$\('navCrit'\)\.hidden = !cfg\.surfaces\.includes\('criticism'\)/);
  assert.match(page, /\$\('navSpec'\)\.hidden = !cfg\.surfaces\.includes\('spec'\)/);
});

test('an address for an offline surface lands on the start screen', () => {
  assert.match(page, /case '\/critique': cfg\.surfaces\.includes\('criticism'\) \? openNewCritique\(\) : showStart\(\)/);
  assert.match(page, /case '\/spec':\s+cfg\.surfaces\.includes\('spec'\) \? openNewSpec\(\) : showStart\(\)/);
  assert.match(page, /if\(crit\)\{ cfg\.surfaces\.includes\('criticism'\) \? openNewCritique\(\) : showStart\(\); return; \}/);
  const direct = [...page.matchAll(/openNew(?:Critique|Spec)\(\)/g)].length;
  assert.equal(direct, 3 + 2, 'three guarded calls and the two definitions; a new caller must be guarded too');
});

test('the about page says the second voice is offline, until the server says it is on', () => {
  assert.match(page, /second voice · to stress-test<span id="critOffline"> · offline for now<\/span>/);
  assert.match(page, /if\(cfg\.surfaces\.includes\('criticism'\)\)\{ const o=\$\('critOffline'\); if\(o\) o\.remove\(\); \}/);
});

// Prep offline (1 October 2026, Prayas: "take prep offline"). Prep rides inside /api/chat, so the gate is the
// readiness prefix PLUS the chat route ignoring the sheet; a door hidden on the page alone would still let a
// posted `prep` field run the arc.
test('prep is off by default: its helper answers 404 and the chat route ignores a sheet', () => {
  assert.ok(server.indexOf("app.use('/api/prep', surfaceOn('prep'))") > 0, 'the readiness helper is gated');
  assert.ok(server.indexOf("app.use('/api/prep', surfaceOn('prep'))") < server.indexOf("app.post('/api/prep/readiness'"), 'gate registered before the route');
  assert.match(server, /const prepOn = SURFACES\.has\('prep'\)/);
  assert.match(server, /const prepText = prepOn && typeof req\.body\?\.prep === 'string'/);
});

test('the prep doorway is hidden in the markup and shown only when the server says prep is on', () => {
  assert.match(page, /<label class="ul-transcript" for="prepDoc" id="prepDoor" hidden>/);
  assert.match(page, /<p class="ul-note" id="prepNote" hidden>/);
  assert.match(page, /\.ul-transcript\[hidden\]\{display:none\}/);
  assert.match(page, /if\(cfg\.surfaces\.includes\('prep'\)\)\{ \$\('prepDoor'\)\.hidden=false; \$\('prepNote'\)\.hidden=false; \}/);
});
