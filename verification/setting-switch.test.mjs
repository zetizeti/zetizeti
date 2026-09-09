// setting-switch.test.mjs — the self-serve / in-class switch of 9 September 2026.
//
// Prayas: "they use on their own and with me around both - make a switch (self-serve, in class) - both
// modes are different." What is asserted here is that the switch is REAL end to end: it exists on the
// page in the shared toggle grammar, it travels with every turn, the route whitelists it, the transcript
// records it, a resumed transcript restores it, and the client is told it back. What is deliberately NOT
// asserted is any behavioural difference between the two settings, because none has been specified —
// and the last test pins that the route does not pass it to the steering yet, so the day it does, the
// test that changes is this one and the change is a decision rather than drift.
//
// Client functions are lifted out of public/index.html and run here, the way transcript.test.mjs does,
// so what is tested is the code the browser runs and not a copy that can drift from it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const HTML = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const SERVER = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');
const PROBE = readFileSync(new URL('../scripts/enquiry-conversation-probe.mjs', import.meta.url), 'utf8');
const lift = (name) => {
  const i = HTML.indexOf(`function ${name}(`);
  assert.notEqual(i, -1, `${name} must exist in public/index.html`);
  let depth = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) {
    if (HTML[k] === '{') depth++;
    else if (HTML[k] === '}' && --depth === 0) return HTML.slice(i, k + 1);
  }
  throw new Error(`could not lift ${name}`);
};
const parse = (() => { const c = {}; new Function('ctx', `${lift('parseTranscriptMd')}\nctx.f = parseTranscriptMd;`)(c); return c.f; })();
// buildTranscriptMd reads page globals; supply them, run the real function.
const build = (setting, focus = null) => new Function('ctx', `
  let history = ctx.history, focus = ctx.focus, setting = ctx.setting;
  function transcriptTopic(){ return 'a kiosk that repairs bicycles'; }
  ${lift('buildTranscriptMd')}
  return buildTranscriptMd();`)({ setting, focus, history: [
  { role: 'student', content: 'a kiosk that repairs bicycles' },
  { role: 'interlocutor', content: 'What happens to the queue when the rider waits?' },
  { role: 'student', content: 'it builds because every rider waits for the tyre' },
] });

test('the switch is on the enquiry surface, in the toggles\' shared grammar, unpressed by default', () => {
  const m = HTML.match(/<button class="focus-toggle setting-toggle" id="settingToggle" aria-pressed="false"[^>]*>[\s\S]*?<span class="val" id="settingVal" data-widest="self-serve">self-serve<\/span><\/button>/);
  assert.ok(m, 'the setting switch must exist with the focus-toggle grammar and reserve its widest label');
  assert.match(HTML, /#settingVal\{min-width:calc\(10 \* \(1ch \+ 0\.09em\)\)\}/, 'width reserved arithmetically, like the other two');
  assert.match(HTML, /\.setting-toggle\{color:/, 'its own register, so it does not read as a third half of the focus control');
});
test('it travels with every turn', () => {
  assert.match(HTML, /turnsSinceNudge, focus, setting, prep:prepText/, 'the chat body carries `setting`');
});
test('the route whitelists it — only the exact string is the other setting', () => {
  assert.match(SERVER, /const setting = req\.body\?\.setting === 'in-class' \? 'in-class' : 'self-serve';/);
});
test('the route tells the client which setting the turn was taken in, and captures it locally', () => {
  assert.match(SERVER, /footing: askingBack[^\n]*\n\s+setting \}\);/, 'on the validation event');
  assert.match(SERVER, /capture\(\{ mode: prepping \? 'prep' : 'enquiry', setting,/, 'in the local capture');
});
test('the transcript records the setting only when it is in class, and says how it ended', () => {
  const inClass = build('in-class'), solo = build('self-serve');
  assert.match(inClass, /^setting: in-class$/m);
  assert.doesNotMatch(solo, /^setting:/m, 'self-serve is the default and is not written — like focus');
  assert.match(inClass, /held in class/); assert.match(inClass, /It ended when the session did/);
  assert.doesNotMatch(solo, /held in class|ended when the session/);
});
test('a transcript saved in class comes back in class; one without the line comes back self-serve', () => {
  const p1 = parse(build('in-class')); assert.equal(p1.setting, 'in-class');
  const p2 = parse(build('self-serve')); assert.equal(p2.setting, 'self-serve');
  assert.equal(p1.turns.length, 3, 'the in-class note is skipped by shape and never leaks into the turns');
  assert.equal(p1.turns[0].role, 'student');
  assert.match(HTML, /setting=parsed\.setting\|\|'self-serve'; paintSetting\(\);/, 'resume restores the switch');
});
test('the PDF says it too', () => {
  assert.match(HTML, /block\(setting==='in-class'\n\s+\? "This is a dialogue with zetizeti, held in class/);
});
test('the probe can replay in either setting', () => {
  assert.match(PROBE, /const SETTING = arg\('setting', 'self-serve'\)/);
  assert.match(PROBE, /discipline: DISCIPLINE, setting: SETTING,/);
});
test('🔴 the steering does not read the setting yet — a difference between the two is Prayas\'s to specify', () => {
  // The day this fails is the day a difference is built. Change it then, deliberately.
  const calls = SERVER.split('buildTurnContext({').slice(1);
  assert.ok(calls.length >= 3, 'the three buildTurnContext call sites are still there');
  for (const c of calls) assert.doesNotMatch(c.slice(0, 1200), /\bsetting\b/, 'no call site passes `setting` to the steering');
});
