// Full test for the progress-signals subsystem (progress-signals.md).
// Run:  node --test   (from app/)   — zero dependencies, uses Node 20's built-in test runner.
//
// Covers: the deterministic signals (vague↔sharp, converging↔leaping, hedged↔committed,
// insight, cycling, drift), the nudge policy's guardrails (quiet default, refractory, joint-firing,
// topic-authority, posture-NOT-diagnosis), and the storage trajectory + refractory bookkeeping.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';

import { computeSignals } from '../lib/signals.mjs';
import { decideNudge, REFRACTORY } from '../lib/nudge.mjs';

// ───────────────────────── signals ─────────────────────────

test('specificity: a vague goal is thin, a concrete goal is rich', () => {
  const vague = computeSignals({ goal: 'make it better' }).specificity;
  const sharp = computeSignals({ goal: 'let new users breathe for three screens before the app asks for any personal detail' }).specificity;
  assert.ok(vague < 0.4, `vague should be low, got ${vague}`);
  assert.ok(sharp > 0.8, `sharp should be high, got ${sharp}`);
  assert.ok(sharp > vague);
});

test('convergence: near-identical re-draws settle high; a leap reads low', () => {
  const settling = computeSignals({ goal: 'the onboarding feels rushed and noisy',
    lineage: ['the onboarding feels rushed', 'the onboarding feels rushed and noisy'] }).convergence;
  const leap = computeSignals({ goal: 'let users breathe before the ask',
    lineage: ['make it better', 'let users breathe before the ask'] }).convergence;
  assert.ok(settling > 0.4, `settling=${settling}`);
  assert.ok(leap < 0.2, `leap=${leap}`);
});

test('conviction: hedged goal is low, committed goal is high', () => {
  const hedged = computeSignals({ goal: 'maybe sort of make it a bit nicer i think' }).conviction;
  const firm = computeSignals({ goal: 'remove the third sign-up field' }).conviction;
  assert.ok(hedged < 0.6, `hedged=${hedged}`);
  assert.equal(firm, 1);
});

test('movement: insight markers in the learner turns raise movement', () => {
  const none = computeSignals({ goal: 'g', studentTurns: ['the sign up is noisy', 'it has many fields'] }).movement;
  const some = computeSignals({ goal: 'g', studentTurns: ['actually what i realise is the first screen lies', 'i see now it is a broken promise'] }).movement;
  assert.equal(none, 0);
  assert.ok(some > 0, `some=${some}`);
});

test('cycling: repeating turns read high; developing turns read low', () => {
  const stuck = computeSignals({ goal: 'g', studentTurns: ['the sign up is noisy', 'the sign up is noisy and loud', 'the sign up is really noisy'] }).cycling;
  const moving = computeSignals({ goal: 'g', studentTurns: ['the sign up is noisy', 'maybe the problem is the order of the fields', 'or the promise the first screen makes'] }).cycling;
  assert.ok(stuck > moving, `stuck=${stuck} moving=${moving}`);
});

test('drift: far from the preliminary enquiry reads high; staying near reads ~0', () => {
  const far = computeSignals({ goal: 'dark patterns in the checkout flow', lineage: ['onboarding for a meditation app', 'dark patterns in the checkout flow'] }).drift;
  const near = computeSignals({ goal: 'onboarding for a meditation app', lineage: ['onboarding for a meditation app'] }).drift;
  assert.ok(far > 0.7, `far=${far}`);
  assert.ok(near < 0.2, `near=${near}`);
});

// ───────────────────────── nudge policy ─────────────────────────

const baseState = { exchanges: 4, turnsSinceNudge: 99, reDrewThisTurn: false };

test('nudge is quiet before any history and under the refractory period', () => {
  const sig = { conviction: 0.1, specificity: 0.1, drift: 0, cycling: 0, movement: 0, condensation: 0.2 };
  assert.equal(decideNudge(sig, { ...baseState, exchanges: 0 }).fired, null, 'no nudge with no history');
  assert.equal(decideNudge(sig, { ...baseState, turnsSinceNudge: REFRACTORY - 1 }).fired, null, 'refractory holds');
});

test('hedging on the goal fires a commitment-testing posture', () => {
  const n = decideNudge({ conviction: 0.2, specificity: 0.8, drift: 0.1, cycling: 0, movement: 0.1, condensation: 0.5 }, baseState);
  assert.equal(n.fired, 'hedging');
  assert.match(n.posture, /commit|real edge/i);
});

test('cycling fires ONLY jointly (not on cycling alone)', () => {
  // cycling high but the learner is clearly moving (insight) → must NOT read as stuck
  const moving = decideNudge({ cycling: 0.8, movement: 0.6, specificity: 0.7, conviction: 1, drift: 0.2, condensation: 0.6 }, baseState);
  assert.notEqual(moving.fired, 'cycling', 'high movement must veto the stuck read');
  // cycling + flat insight + flat specificity → the joint condition
  const stuck = decideNudge({ cycling: 0.7, movement: 0.1, specificity: 0.3, conviction: 1, drift: 0.2, condensation: 0.4 }, baseState);
  assert.equal(stuck.fired, 'cycling');
  assert.ok(stuck.surface, 'cycling hands a question back to the learner');
});

test('drift fires a connect-back posture — but is suppressed when the learner just re-drew', () => {
  const sig = { drift: 0.9, conviction: 1, specificity: 0.8, cycling: 0, movement: 0.1, condensation: 0.5 };
  assert.equal(decideNudge(sig, { ...baseState, reDrewThisTurn: false }).fired, 'drift');
  assert.notEqual(decideNudge(sig, { ...baseState, reDrewThisTurn: true }).fired, 'drift', 'a re-draw is the learner declaring a new anchor');
});

test('low specificity grounds; converging+moving stays close (lets it land)', () => {
  const ground = decideNudge({ specificity: 0.2, conviction: 1, drift: 0, cycling: 0, movement: 0.1, condensation: 0.3 }, baseState);
  assert.equal(ground.fired, 'grounding');
  const land = decideNudge({ condensation: 0.7, movement: 0.5, conviction: 1, specificity: 0.85, drift: 0.2, cycling: 0 }, baseState);
  assert.equal(land.fired, 'landing');
});

test('CARDINAL: every posture is a mode-of-asking, never a diagnosis of the learner', () => {
  const sigs = [
    { conviction: 0.2, specificity: 0.8, drift: 0.1, cycling: 0, movement: 0.1, condensation: 0.5 }, // hedging
    { cycling: 0.7, movement: 0.1, specificity: 0.3, conviction: 1, drift: 0.2, condensation: 0.4 }, // cycling
    { drift: 0.9, conviction: 1, specificity: 0.8, cycling: 0, movement: 0.1, condensation: 0.5 },   // drift
    { specificity: 0.2, conviction: 1, drift: 0, cycling: 0, movement: 0.1, condensation: 0.3 },     // grounding
    { condensation: 0.7, movement: 0.5, conviction: 1, specificity: 0.85, drift: 0.2, cycling: 0 },  // landing
  ];
  const diagnosis = /\b(the learner|the student|you are|they are|is hedging|is stuck|is cycling|is drifting|unfocused|confused)\b/i;
  for (const s of sigs) {
    const n = decideNudge(s, baseState);
    assert.ok(n.posture, `expected a posture for ${JSON.stringify(s)}`);
    assert.doesNotMatch(n.posture, diagnosis, `posture leaked a diagnosis: "${n.posture}"`);
  }
});

// ───────────────────────── storage trajectory ─────────────────────────

test('storage: signals persist as a trajectory; refractory bookkeeping is correct', async () => {
  const dbPath = join(tmpdir(), `zz-signals-test-${Date.now()}.db`);
  process.env.ZETIZETI_DB = dbPath;
  const db = await import('../lib/db.mjs');
  try {
    const user = db.getOrCreateGuest();
    const quest = db.createQuest(user.id, { name: 'test enquiry' });

    assert.equal(db.turnsSinceLastNudge(quest.id), 99, 'no nudges yet → large');

    db.recordSignals(quest.id, { turnIndex: 0, goal: 'make it better', signals: { specificity: 0.2 }, retrieved: [{ id: 'dark-patterns-and-ethics' }], nudgePosture: null });
    db.recordSignals(quest.id, { turnIndex: 1, goal: 'let users breathe first', signals: { specificity: 0.8 }, retrieved: [{ id: 'friction-and-frictionlessness' }], nudgePosture: 'Ask for the one concrete instance.' });

    const traj = db.signalsForQuest(quest.id);
    assert.equal(traj.length, 2, 'two snapshots stored');
    assert.equal(traj[0].goal, 'make it better');
    assert.equal(traj[1].nudge_posture, 'Ask for the one concrete instance.');
    assert.equal(traj[0].retrieved[0].id, 'dark-patterns-and-ethics');
    assert.equal(traj[1].signals.specificity, 0.8);

    assert.equal(db.turnsSinceLastNudge(quest.id), 0, 'last turn nudged → 0');
    db.recordSignals(quest.id, { turnIndex: 2, goal: 'x', signals: {}, nudgePosture: null });
    assert.equal(db.turnsSinceLastNudge(quest.id), 1, 'one turn since the nudge');
  } finally {
    db.default.close();
    for (const ext of ['', '-wal', '-shm']) { try { rmSync(dbPath + ext); } catch {} }
  }
});
