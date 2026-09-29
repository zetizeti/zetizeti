// contour.mjs — the intensity of a question. Hidden: nothing here is shown to the learner or stored.
//
// 🔴 Prayas, 30 Sep 2026: "even if there are a lot of questions, they should not have the same intensity.
//    there should be a graph in the conversation anyhow." Chosen by him: a hidden contour the dialogue
//    follows, not a graph on the page (a shown curve would be a score, which invariant 5 and 6 refuse).
//
// ONE LEVER IN THIS FIRST BUILD: a quiet turn. Where the contour is low the question is held to a few words
// and presses on nothing (`LIGHT_MAX`, enforced by the guard, not requested in a prompt). Every other turn is
// as before. So the graph has two states that differ in what is asked; the value under it is continuous.
//
// The value is a slow wave plus the reply's own weight. The wave is two sines of unrelated period, phased by a
// hash of the learner's edge, so it is deterministic and stateless (a replayed fixture reproduces it) and does
// not repeat on a beat. The weight lifts it after a worked reply and lowers it after a bare one, relative to
// that person's own median. It never comes on the opening question, and never twice running.
// ⚠️ Every number here is mine and reverts in one line: the periods, the phase, the 0.15 weight, LIGHT_BELOW.
import { approachPhase } from './arc.mjs';

export const LIGHT_MAX = 14;
export const LIGHT_BELOW = 0.35;

const wordsIn = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

// The value under the graph for the question that follows `replies` (the learner's replies, the edge not
// included, the current one last). `asked` is how many questions have been asked so far.
export function intensity({ replies = [], goal = '', asked = replies.length }) {
  const h = approachPhase(goal);
  const p1 = ((h % 1000) / 1000) * 5.3, p2 = (((h >>> 10) % 1000) / 1000) * 8.7;
  const wave = 0.5 + 0.25 * Math.sin((2 * Math.PI * (asked + p1)) / 5.3) + 0.25 * Math.sin((2 * Math.PI * (asked + p2)) / 8.7);
  const lens = replies.map(wordsIn);
  const lift = lens.length >= 3 ? clamp((lens[lens.length - 1] / Math.max(1, median(lens)) - 1) * 0.15, -0.2, 0.2) : 0;
  return clamp(wave + lift, 0, 1);
}

// Is the next question a quiet one? Replays the earlier questions so "never twice running" is derived, not
// stored. `asked` counts questions asked; replies before the first are 0, so the opening is never light.
export function isLight({ replies = [], goal = '', asked = replies.length }) {
  if (asked < 1) return false;
  const now = intensity({ replies, goal, asked }) < LIGHT_BELOW;
  if (!now) return false;
  return !isLight({ replies: replies.slice(0, -1), goal, asked: asked - 1 });
}

// The same contour for a whole dialogue, for reading: one value per question after each reply.
export function strip({ replies = [], goal = '' }) {
  return replies.map((_, i) => {
    const r = replies.slice(0, i + 1);
    return { v: intensity({ replies: r, goal, asked: i + 1 }), light: isLight({ replies: r, goal, asked: i + 1 }) };
  });
}
