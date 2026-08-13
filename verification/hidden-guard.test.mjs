// hidden-guard.test.mjs — an element that says `hidden` must actually BE hidden.
//
// THE FAILURE THIS EXISTS TO PREVENT, observed live on 13 August 2026. `#navStudio` carried the
// `hidden` attribute in the markup and `.nav-studio` set `display:flex` in the stylesheet. An author
// rule outranks the user-agent's `[hidden]{display:none}`, so the attribute did nothing: the strip
// rendered for everybody from the day it moved into the header (v0.12.0, 10 August 2026). For a user
// outside the AI Club cohort `buildStudioNav` never runs, so no tool links were appended and what
// showed was the kicker alone — the word "studio" and its divider, beside `review`, meaning nothing.
// Every memorability student and every personal-tier account saw it for three days.
//
// Nothing could have caught it except looking. No error, no failing test, no console line; the JS was
// correct, the CSS was correct in isolation, and the two were only wrong together. It is the same
// shape as the silent-default faults this suite already guards — a rule that is written and never
// enforced — arriving through the cascade instead of through a parser.
//
// What makes it worth a lint rather than a fix: the file writes this guard CORRECTLY four times
// (.topbar, .edge, .dl-transcript, #studioFooter) and wrongly once, and the wrong one was the header
// half of a feature whose footer half was right. So the knowledge existed and did not travel. The next
// element that needs `display` on a class and `hidden` in the markup will be written by somebody who
// has not read this comment.
//
// The rule: if a selector sets `display` on an element that carries the `hidden` attribute, that
// selector must also carry a `[hidden]` rule setting `display:none`. Nothing here reads intent — it
// reads the markup and the stylesheet and asks whether they agree.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HTML = join(dirname(fileURLToPath(import.meta.url)), '../public/index.html');

/** Markup only — scripts are stripped so `el.hidden = false` is never read as an attribute. */
function markupOf(src) {
  return src
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

/** Every element carrying a bare `hidden` attribute, as { id, classes[] }. */
function hiddenElements(markup) {
  const out = [];
  for (const tag of markup.match(/<[a-zA-Z][^>]*>/g) || []) {
    if (!/\shidden(?=[\s/>=])/.test(tag)) continue;
    const id = (tag.match(/\sid\s*=\s*["']([^"']+)["']/) || [])[1] || null;
    const cls = (tag.match(/\sclass\s*=\s*["']([^"']+)["']/) || [])[1] || '';
    out.push({ id, classes: cls.split(/\s+/).filter(Boolean), tag });
  }
  return out;
}

/** Innermost `selector { declarations }` pairs, including those nested in @media blocks. */
function rules(src) {
  // Comments are stripped FIRST, not per-selector. A comment may quote CSS — this file's own guard
  // comment contains a literal brace pair — and a brace inside a comment derails the rule matcher
  // silently, which is how the first run of this test failed on the very line that fixes the bug.
  const style = (src.match(/<style[\s\S]*?<\/style>/gi) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  for (const m of style.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    // A selector captured from inside @media carries the block opener; keep only what follows it.
    const sel = m[1].slice(m[1].lastIndexOf('{') + 1).trim();
    if (!sel || sel.startsWith('@')) continue;
    for (const one of sel.split(',')) out.push({ sel: one.trim(), decls: m[2] });
  }
  return out;
}

test('every hidden element whose class sets display also carries a [hidden] guard', () => {
  const src = readFileSync(HTML, 'utf8');
  const css = rules(src);
  const setsDisplay = css.filter(r => /(^|[;{\s])display\s*:/.test(r.decls));
  const guards = new Set(
    css.filter(r => /\[hidden\]/.test(r.sel) && /display\s*:\s*none/.test(r.decls))
       .map(r => r.sel.replace(/\[hidden\]/g, '').trim())
  );

  const unguarded = [];
  for (const el of hiddenElements(markupOf(src))) {
    const own = [...el.classes.map(c => '.' + c), ...(el.id ? ['#' + el.id] : [])];
    for (const sel of own) {
      // Only bare selectors decide the element's own display; a descendant rule cannot.
      const hit = setsDisplay.find(r => r.sel === sel);
      if (hit && !guards.has(sel)) unguarded.push(`${sel} sets display and has no ${sel}[hidden] guard`);
    }
  }

  assert.deepEqual(unguarded, [], 'an author display rule outranks [hidden], so these render regardless:\n  ' + unguarded.join('\n  '));
});
