// The notes pages (lib/notes.mjs): published in the editor, read from its public texts API, rendered here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdown, notesIndex, noteFor, clearNotesCache } from '../lib/notes.mjs';

process.env.ZETIZETI_NOTES_URL = 'https://notes.invalid/texts';
const fake = routes => async url => {
  const path = url.replace('https://notes.invalid/texts', '');
  if (!(path in routes)) return { status: 404, ok: false, json: async () => ({}) };
  return { status: 200, ok: true, json: async () => routes[path] };
};

test('a note renders its text, with a carried HTML block left as it is and its words escaped once', () => {
  const html = markdown('<figure><svg></svg></figure>\n\nA line with a [link](https://example.org) and &lt;doer&gt;.\nA second line.\n\n## A heading\n\n- one\n- two');
  assert.match(html, /<figure><svg><\/svg><\/figure>/);
  assert.match(html, /<p>A line with a <a href="https:\/\/example.org">link<\/a> and &lt;doer&gt;\.<\/p>\n<p>A second line\.<\/p>/);
  assert.match(html, /<h3>A heading<\/h3>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.doesNotMatch(html, /&amp;lt;/);
});

test('the index lists the published notes, and says so when there are none', async () => {
  clearNotesCache();
  const list = await notesIndex(fake({ '': { texts: [{ title: 'First <note>', url: '/notes/first', date: '2026-11-13' }] } }));
  assert.match(list, /<a href="\/notes\/first"><b>First &lt;note&gt;<\/b><span>13 November 2026<\/span><\/a>/);
  clearNotesCache();
  assert.match(await notesIndex(fake({ '': { texts: [] } })), /No notes yet\./);
});

test('one note is found by its address, a missing one is null, and a strange address is refused before any request', async () => {
  clearNotesCache();
  const f = fake({ '/notes/first': { title: 'First', url: '/notes/first', text: 'Hello.', date: '2026-11-13' } });
  assert.match(await noteFor('first', f), /<h1>First<\/h1>[\s\S]*<p>Hello\.<\/p>/);
  assert.equal(await noteFor('missing', f), null);
  let asked = false;
  assert.equal(await noteFor('../etc', async () => { asked = true; }), null);
  assert.equal(asked, false);
});

test('with no source set, the page says there are no notes and asks nothing', async () => {
  clearNotesCache();
  const saved = process.env.ZETIZETI_NOTES_URL; delete process.env.ZETIZETI_NOTES_URL;
  let asked = false;
  assert.match(await notesIndex(async () => { asked = true; }), /No notes yet\./);
  assert.equal(await noteFor('first', async () => { asked = true; }), null);
  assert.equal(asked, false);
  process.env.ZETIZETI_NOTES_URL = saved;
});
