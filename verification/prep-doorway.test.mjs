// prep-doorway.test.mjs — the prep sheet must survive the press of `begin` (30 August 2026).
//
// 🔴 THE DEFECT THIS EXISTS FOR SHIPPED IN v0.20.0 AND WAS SILENT FOR TWO DAYS. `resetConversation` clears
// prepText unconditionally, which is correct and its comment says why: a sheet surviving into the NEXT
// enquiry would prep the wrong field with nothing erroring. But `startFreshEnquiry` calls that same
// function at the START of the enquiry the sheet was just attached for. So attaching a sheet and pressing
// begin discarded it, the conversation opened as an ordinary enquiry asking about an edge, and no error
// appeared on either side. The prep arc — six stations, three parts, its own tests, its own concept doc —
// was unreachable from the only door into it.
//
// This is the project's own recurring shape: BINARY_DEMAND written, widened, measured and tested while
// unreachable from the criticism route; the shared guard set inert on that surface for its whole life.
// A unit test passing on a mechanism nobody can reach. So this file reads the CLIENT SOURCE for whether
// the door is open, because there is no other consumer test for a browser path in this repo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, '..', 'public', 'index.html'), 'utf8');

// Everything below reads one function body at a time. Grepping the whole file would pass on a mention of
// `prep` anywhere in 2,400 lines, which is exactly the kind of positive that establishes nothing.
const bodyOf = (name) => {
  const at = SRC.indexOf(`function ${name}(`);
  assert.notEqual(at, -1, `${name} is gone from public/index.html — this test is now about nothing`);
  const open = SRC.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}' && --depth === 0) return SRC.slice(open, i + 1);
  }
  throw new Error(`${name} never closes`);
};

test('🔴 newQuest captures the attached sheet BEFORE the reset that clears it', () => {
  const b = bodyOf('newQuest');
  assert.match(b, /prepText\s*\?/, 'newQuest no longer reads prepText — an attached sheet is being dropped again');
  assert.match(b, /startFreshEnquiry\(\s*seed\s*,\s*prep/, 'the sheet is not being handed to startFreshEnquiry');
});

test('🔴 startFreshEnquiry restores the sheet AFTER resetConversation, not before', () => {
  const b = bodyOf('startFreshEnquiry');
  const reset = b.indexOf('resetConversation()');
  const restore = b.indexOf('prepText=prep.text');
  assert.notEqual(reset, -1, 'startFreshEnquiry no longer resets — check what replaced it');
  assert.notEqual(restore, -1, 'startFreshEnquiry does not restore the sheet');
  assert.ok(restore > reset, 'the sheet is restored BEFORE the reset, so the reset wipes it — the original bug');
});

test('🔴 an attached sheet begins the prep and never asks for an edge first', () => {
  const b = bodyOf('startFreshEnquiry');
  assert.match(b, /if\s*\(\s*prep\s*\)/, 'no prep branch — an attached sheet falls through to the edge question');
  const branch = b.slice(b.indexOf('if(prep)') === -1 ? b.indexOf('if (prep)') : b.indexOf('if(prep)'));
  assert.match(branch, /startPrep\(\)/, 'the prep branch does not start the prep');
  assert.match(branch, /return/, 'the prep branch does not return, so it falls into the edge path as well');
});

test('startPrep opens with an empty message — the walk is seated by stone turns, not by anything said', () => {
  const b = bodyOf('startPrep');
  assert.match(b, /streamStone\(\s*''\s*,/, "startPrep must send an empty message; anything else is a turn the learner did not take");
  assert.doesNotMatch(b, /showEdge\(\)/, 'there is no edge during prep and showing one invites naming it');
});

test('the doorway tells the truth in both directions', () => {
  assert.match(bodyOf('armPrepDoorway'), /begin the prep/, 'the button does not say what it will now do');
  const r = bodyOf('resetPrepDoorway');
  assert.match(r, /PREP_NOTE_DEFAULT/, 'the note is not restored, so the doorway keeps describing a sheet that is gone');
  assert.match(r, /'begin'/, 'the button label is not restored');
  assert.match(SRC, /const PREP_NOTE_DEFAULT/, 'PREP_NOTE_DEFAULT is referenced and never defined');
});

// 30 August 2026 — the separate tasks upload was removed from the doorway (Prayas: "I dont want any
// tasks initially"). 🔴 THE DOOR WENT AND THE MECHANISM STAYED. These two assertions are a pair on
// purpose: the first fails if the slot creeps back, the second fails if somebody "tidies up" the tasks
// plumbing behind it, which would silently stop a sheet's own things-to-try from ever reaching a turn.
test('🔴 the doorway offers no one-or-three control', () => {
  assert.doesNotMatch(SRC, /sitchoice/, 'the sittings control is back on the doorway');
  assert.doesNotMatch(SRC, /prepSittings/, 'the client is choosing a shape again — it is read off the document');
});

test('🔴 a mentor prep sheet is one sitting, decided by its filename', () => {
  const SERVER = readFileSync(join(HERE, '..', 'server.mjs'), 'utf8');
  assert.match(SERVER, /\/mentor\/i\.test\(sheetName\)\s*\?\s*1\s*:\s*3/, 'the filename no longer decides the shape');
  const re = /mentor/i;
  assert.equal(re.test('dsl-mentor-prep-sheet-20260830.md'), true);
  assert.equal(re.test('DSL-MENTOR-PREP-SHEET-20260830.MD'), true, 'the browser may hand back either case');
  assert.equal(re.test('part-2-prep.md'), false, "a student's pack must stay at three sittings");
  assert.equal(re.test('g01-the-room-that-forgets-prep.md'), false);
});

test('🔴 the sheet name reaches the turn, or the rule above decides nothing', () => {
  assert.match(SRC, /sheetName\s*:\s*prepName/, 'the client stopped sending the filename — every sheet silently becomes three sittings');
});

test('🔴 the doorway offers no separate tasks upload', () => {
  assert.doesNotMatch(SRC, /prepTasksChip/, 'the tasks upload chip is back on the doorway');
  assert.doesNotMatch(SRC, /\$\('prepTasks'\)/, 'a handler is wired to a tasks input again');
});

test('🔴 the tasks MECHANISM survives the removal of its door', () => {
  assert.match(SRC, /tasks:\s*prepTasksText/, 'the chat body no longer carries tasks — a sheet with its own things-to-try is now inert');
  assert.match(SRC, /let prepText=''.*prepTasksText/s, 'the tasks state was removed along with the slot');
});

// 30 August 2026 — the part boundary must not assert a task or a departure. Both were in one hardcoded
// string, and both were false for a learner doing the arc in one sitting with no tasks document: it told
// him to do a task that did not exist and to leave a conversation he was mid-way through.
test('🔴 the part-boundary line claims neither a task nor a departure', () => {
  const b = bodyOf('afterPrepTurn');
  assert.doesNotMatch(b, /do the task/i, 'the boundary line asserts a task again — this code cannot know whether one was set');
  assert.doesNotMatch(b, /bring the file back to carry on/i, 'the boundary line assumes the learner is leaving');
  assert.match(b, /carry straight on/i, 'the boundary line no longer says that continuing is fine');
});

// 30 August 2026 — a prep that cannot be saved loses everything when the tab closes, and nothing on
// screen fails. The chip used to be revealed only at a part boundary, so it was absent for the whole of
// part one, and once one sitting existed — no boundaries — absent for the entire walk.
test('🔴 a prep reveals the save from its first turn, not at a boundary', () => {
  const b = bodyOf('startPrep');
  assert.match(b, /dlTranscript/, 'startPrep does not reveal the transcript download — a one-sitting walk cannot be saved at all');
  assert.match(b, /hidden\s*=\s*false/, 'the chip is referenced but not revealed');
});

// 30 August 2026 — the line closing the arc must describe the DOCUMENT, not the person. "prepared —" told
// the learner they now are prepared: a characterisation, which invariant #7 keeps out of this system, and
// delivered at the moment they are least placed to argue with it.
test('🔴 the end of the prep says nothing about the learner', () => {
  const b = bodyOf('afterPrepTurn');
  assert.doesNotMatch(b, /'prepared/i, 'the closing line asserts a state of the learner again');
  assert.match(b, /the sheet walked through/i, 'the closing line no longer names what actually finished');
});
