// contour.test.mjs — the hidden intensity contour (30 Sep 2026). A quiet turn is a short question the guard
// holds to LIGHT_MAX; nothing about the contour is shown to the learner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { intensity, isLight, strip, LIGHT_MAX, LIGHT_BELOW } from '../lib/contour.mjs';
import { buildTurnContext, validateOutput } from '../lib/dialogue.mjs';

const goal = 'I am trying to organise a programme for the leadership';
const replies = (n) => Array.from({ length: n }, (_, i) => `reply number ${i} with a few words in it`);

test('the contour is deterministic, bounded, and never comes on the opening question', () => {
  assert.equal(intensity({ replies: replies(7), goal }), intensity({ replies: replies(7), goal }));
  for (let n = 0; n <= 40; n++) {
    const v = intensity({ replies: replies(n), goal });
    assert.ok(v >= 0 && v <= 1, `n=${n}`);
  }
  assert.equal(isLight({ replies: [], goal, asked: 0 }), false);
});

test('a quiet turn is never followed by another quiet turn, and it does come', () => {
  const s = strip({ replies: replies(40), goal });
  assert.ok(s.some((x) => x.light), 'forty turns contain a quiet one');
  for (let i = 1; i < s.length; i++) assert.ok(!(s[i].light && s[i - 1].light), `turns ${i - 1} and ${i}`);
  for (const x of s) if (x.light) assert.ok(x.v < LIGHT_BELOW);
});

test('different edges give different contours, so two dialogues do not breathe together', () => {
  const a = strip({ replies: replies(30), goal }).map((x) => x.light ? 1 : 0).join('');
  const b = strip({ replies: replies(30), goal: 'I want to sing' }).map((x) => x.light ? 1 : 0).join('');
  assert.notEqual(a, b);
});

test('a worked reply lifts the value and a bare one lowers it, against that person\'s own median', () => {
  const base = replies(6);
  const worked = [...base, 'a much longer reply than any of the others so far in this dialogue, with a great many more words in it'];
  const bare = [...base, 'yes'];
  assert.ok(intensity({ replies: worked, goal, asked: 7 }) > intensity({ replies: bare, goal, asked: 7 }));
});

test('the guard holds a quiet turn to LIGHT_MAX and leaves an ordinary turn its 34', () => {
  const q = 'What was it about the lecture that made you stop and write that sentence down in the first place?';
  assert.ok(q.split(/\s+/).length > LIGHT_MAX && q.split(/\s+/).length <= 34);
  assert.equal(validateOutput(q, { maxWords: LIGHT_MAX }).ok, false);
  assert.equal(validateOutput(q, { maxWords: 34 }).ok, true);
});

test('the prompt names a quiet turn and the words it may use', () => {
  const ctx = buildTurnContext({ light: ['nature', 'habits'], message: 'x' });
  assert.match(ctx, /QUIET TURN/);
  assert.match(ctx, /"nature", "habits"/);
  assert.doesNotMatch(buildTurnContext({ message: 'x' }), /QUIET TURN/);
});

// 🔴 A mechanism can be written, tested and unreachable: read the route for its consumers.
test('the route passes the contour to the guard and to the prompt, and only on a plain turn', () => {
  const src = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(src, /maxWords: prepping \? 40 : light \? LIGHT_MAX : 34/);
  assert.match(src, /const precision = !prepping && !light/);
  assert.match(src, /light: light \? contentWords\(message\) : null,/, 'light reaches buildTurnContext');
  assert.match(src, /quietWords: light \? new Set\(\[\.\.\.studentTurns, message\]\.flatMap/, 'the guard gets their words');
  assert.match(src, /quietWords: null, maxWords: 34/, 'the hand-back fallback drops the quiet demand');
  for (const footing of ['declined', 'corrected', 'askingBack', 'playing', 'rutInvite', 'stalledInvite', 'featureInvite', 'returnNote']) {
    assert.match(src, new RegExp(`const light = [^;]*!${footing}\\b`, 's'), `${footing} keeps the turn plain`);
  }
});

// 🔴 A QUIET TURN IS BUILT ONLY FROM THEIR LAST WORDS: a cap on length let the premise through.
test('a quiet turn may use only words they have said, and refuses the one that brings in a premise', () => {
  const theirs = new Set(['nature', 'will', 'power', 'habits']);
  assert.equal(validateOutput('Which of their habits?', { quietWords: theirs, maxWords: LIGHT_MAX }).ok, true);
  assert.equal(validateOutput('What about the will power?', { quietWords: theirs, maxWords: LIGHT_MAX }).ok, true);
  const bad = validateOutput('When their nature fails, does the design provide the closure?', { quietWords: theirs, maxWords: LIGHT_MAX });
  assert.equal(bad.ok, false);
  assert.match(bad.reasons.join(' '), /design, provide, closure/);
  assert.equal(validateOutput('When their nature fails, does the design provide the closure?', { maxWords: 34 }).ok, true, 'an ordinary turn is unaffected');
  assert.equal(validateOutput('Which of their habits?', { quietWords: new Set(['habbits']) }).ok, true, 'a corrected spelling still counts as theirs');
});
