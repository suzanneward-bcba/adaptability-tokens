const C = require('../src/core.js');
const assert = require('assert');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓', name); };
let T = 1e6; const tick = () => (T += 1000);

t('award and undo on individual board', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-mia'};
  assert(C.award(s, sc, {nowMs: tick()}).ok);
  assert(C.award(s, sc, {nowMs: tick()}).ok);
  assert.strictEqual(C.progress(s, sc).earned, 2);
  assert(C.undo(s, sc).ok);
  assert.strictEqual(C.progress(s, sc).earned, 1);
  assert(C.undo(s, sc).ok);
  assert.strictEqual(C.undo(s, sc).ok, false);
});
t('double tap is blocked', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-mia'};
  assert(C.award(s, sc, {nowMs: 5000}).ok);
  assert.strictEqual(C.award(s, sc, {nowMs: 5200}).reason, 'debounce');
  assert.strictEqual(C.progress(s, sc).earned, 1);
});
t('changing reinforcer preserves progress', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-mia'};
  C.select(s, sc, 'r-bubbles'); C.award(s, sc, {nowMs: tick()}); C.award(s, sc, {nowMs: tick()});
  assert(C.select(s, sc, 'r-swing').ok);
  assert.strictEqual(C.progress(s, sc).earned, 2);
  assert.strictEqual(C.select(s, sc, 'r-trains').reason, 'not-allowed');
  C.setAvailability(s, 'r-cars', false);
  assert.strictEqual(C.select(s, sc, 'r-cars').reason, 'unavailable');
});
t('complete -> exchange once -> new board', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-leo'}; // target 3, choose after
  for (let i=0;i<3;i++) C.award(s, sc, {nowMs: tick()});
  assert.strictEqual(C.progress(s, sc).status, 'complete');
  assert.strictEqual(C.award(s, sc, {nowMs: tick()}).reason, 'full');
  assert.strictEqual(C.confirmDelivery(s, sc).reason, 'no-selection');
  C.select(s, sc, 'r-lightshow');
  assert(C.confirmDelivery(s, sc).ok);
  assert.strictEqual(C.confirmDelivery(s, sc).reason, 'already');
  assert.strictEqual(C.progress(s, sc).earned, 3, 'tokens not erased on completion/delivery');
  assert.strictEqual(C.undo(s, sc).reason, 'delivered');
  assert.strictEqual(s.log.filter(e=>e.kind==='exchange').length, 1);
  assert(C.startNewBoard(s, sc).ok);
  assert.strictEqual(C.startNewBoard(s, sc).reason, 'not-delivered');
  const p = C.progress(s, sc); assert.strictEqual(p.earned, 0); assert.strictEqual(p.status, 'earning');
  assert.strictEqual(s.learners.find(l=>l.id==='l-leo').board.cycle, 2);
});
t('cannot exchange before complete', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-mia'};
  C.select(s, sc, 'r-bubbles');
  assert.strictEqual(C.confirmDelivery(s, sc).reason, 'not-complete');
});
t('individual boards in a group are independent', () => {
  const s = C.demo();
  for (let i=0;i<3;i++) C.award(s, {type:'learner', id:'l-leo'}, {nowMs: tick()});
  C.award(s, {type:'learner', id:'l-mia'}, {nowMs: tick()});
  C.select(s, {type:'learner', id:'l-leo'}, 'r-trains'); C.confirmDelivery(s, {type:'learner', id:'l-leo'}); C.startNewBoard(s, {type:'learner', id:'l-leo'});
  assert.strictEqual(C.progress(s, {type:'learner', id:'l-mia'}).earned, 1);
  assert.strictEqual(C.progress(s, {type:'learner', id:'l-noor'}).earned, 0);
});
t('team board independent from individual boards', () => {
  const s = C.demo(); const sc = {type:'team', groupId:'g-kitchen'};
  C.award(s, sc, {nowMs: tick(), note:'Helping a friend'});
  assert.strictEqual(C.progress(s, sc).earned, 1);
  assert.strictEqual(C.progress(s, {type:'learner', id:'l-mia'}).earned, 0);
  assert.strictEqual(s.log.at(-1).note, 'Helping a friend');
});
t('shared goal: contributions, caps, totals, undo', () => {
  const s = C.demo(); const g='g-friday'; const sc = {type:'shared', groupId:g};
  assert.strictEqual(C.progress(s, sc).target, 12);
  C.award(s, {...sc, learnerId:'l-leo'}, {nowMs: tick()});
  C.award(s, {...sc, learnerId:'l-leo'}, {nowMs: tick()});
  assert.strictEqual(C.award(s, {...sc, learnerId:'l-leo'}, {nowMs: tick()}).reason, 'met');
  C.award(s, {...sc, learnerId:'l-mia'}, {nowMs: tick()});
  assert.strictEqual(C.progress(s, sc).earned, 3);
  assert(C.undo(s, {...sc, learnerId:'l-leo'}).ok);
  assert.strictEqual(C.progress(s, sc).earned, 2);
  assert.strictEqual(C.progress(s, {type:'learner', id:'l-leo'}).earned, 0, 'shared goal does not touch individual board');
  // staff lowers targets so goal is met -> complete
  ['l-mia','l-leo','l-noor','l-jk'].forEach(id=>{});
  C.setSharedTarget(s, g, 'l-noor', 1); C.setSharedTarget(s, g, 'l-jk', 1); C.setSharedTarget(s, g, 'l-mia', 1); C.setSharedTarget(s, g, 'l-leo', 1);
  C.award(s, {...sc, learnerId:'l-noor'}, {nowMs: tick()});
  assert.strictEqual(C.progress(s, sc).status, 'earning');
  C.award(s, {...sc, learnerId:'l-jk'}, {nowMs: tick()});
  assert.strictEqual(C.progress(s, sc).status, 'complete');
  C.select(s, sc, 'r-candy'); assert(C.confirmDelivery(s, sc).ok); assert(C.startNewBoard(s, sc).ok);
  assert.strictEqual(C.progress(s, sc).earned, 0);
});
t('membership change keeps others progress', () => {
  const s = C.demo(); const g = C.findGroup(s,'g-friday'); const sc={type:'shared', groupId:'g-friday'};
  C.award(s, {...sc, learnerId:'l-mia'}, {nowMs: tick()});
  g.memberIds = g.memberIds.filter(id=>id!=='l-jk'); C.recheck(s, sc);
  assert.strictEqual(C.progress(s, sc).target, 8);
  assert.strictEqual(C.progress(s, sc).earned, 1);
});
t('lowering individual target completes without erasing', () => {
  const s = C.demo(); const sc={type:'learner', id:'l-jk'};
  for (let i=0;i<4;i++) C.award(s, sc, {nowMs: tick()});
  C.findLearner(s,'l-jk').target = 3; C.recheck(s, sc);
  const p = C.progress(s, sc); assert.strictEqual(p.status,'complete'); assert.strictEqual(p.earned,3);
});
t('backup round trip and CSV', () => {
  const s = C.demo(); C.award(s, {type:'learner', id:'l-mia'}, {nowMs: tick()});
  const b = C.makeBackup(s); const r = C.parseBackup(b);
  assert(r.ok); assert.strictEqual(C.progress(r.state, {type:'learner', id:'l-mia'}).earned, 1);
  assert.strictEqual(C.parseBackup('{"foo":1}').reason, 'wrong-file');
  assert.strictEqual(C.parseBackup('nope').reason, 'not-json');
  const csv = C.toCSV(s); assert(csv.includes('award')); assert(csv.split('\r\n').length === 2);
});
t('deleting reinforcer clears selection but keeps tokens', () => {
  const s = C.demo(); const sc={type:'learner', id:'l-mia'};
  C.select(s, sc, 'r-bubbles'); C.award(s, sc, {nowMs: tick()});
  C.deleteReinforcer(s, 'r-bubbles');
  assert.strictEqual(C.progress(s, sc).earned, 1);
  assert.strictEqual(C.findLearner(s,'l-mia').board.selectedId, null);
});
console.log(`\n${n} tests passed`);
t('token library + custom picture tokens', () => {
  assert(C.TOKEN_LIBRARY.reduce((n,c)=>n+c.items.length,0) >= 180);
  assert.strictEqual(C.tokenIcon('star'), '⭐'); assert.strictEqual(C.tokenIcon('🦒'), '🦒');
});
t('collective team board: attribution + fill modes', () => {
  const s = C.demo(); const g = C.findGroup(s,'g-kitchen'); const sc={type:'team', groupId:'g-kitchen'};
  C.findLearner(s,'l-mia').tokenStyle='🦒';
  C.award(s, {...sc, learnerId:'l-mia'}, {nowMs: tick()}); C.award(s, sc, {nowMs: tick()});
  g.tokenFill='group'; assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🌼','🌼']);
  g.tokenFill='ownStaff'; assert.deepStrictEqual(C.slotIcons(s, sc, 'staff'), ['🦒','🌼']); assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🌼','🌼']);
  g.tokenFill='ownAll'; assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🦒','🌼']);
  C.undo(s, sc); assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🦒']);
  assert.strictEqual(C.progress(s, {type:'learner', id:'l-mia'}).earned, 0, 'collective does not touch independent board');
});
t('collective shared board uses contributor tokens when allowed', () => {
  const s = C.demo(); const g = C.findGroup(s,'g-friday'); const sc={type:'shared', groupId:'g-friday'};
  C.award(s, {...sc, learnerId:'l-leo'}, {nowMs: tick()});
  assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🚀']);
  g.tokenFill='ownAll'; assert.deepStrictEqual(C.slotIcons(s, sc, 'display'), ['🚗']);
});
t('old saved team boards gain a stack on load', () => {
  const s = C.demo(); const g = C.findGroup(s,'g-kitchen'); delete g.board.stack; delete g.tokenFill; g.board.earned = 2;
  const s2 = C.ensureShape(JSON.parse(JSON.stringify(s))); const g2 = C.findGroup(s2,'g-kitchen');
  assert.deepStrictEqual(g2.board.stack, [null,null]); assert.strictEqual(g2.tokenFill, 'group');
});
t('fresh install has no learners or groups', () => {
  const s = C.seed(); assert.strictEqual(s.learners.length, 0); assert.strictEqual(s.groups.length, 0); assert.ok(s.reinforcers.length > 0);
  assert.ok(s.reinforcers.every(r => r.pic));
});
t('start a board: theme, count, both timing, reward, empty board', () => {
  const s = C.demo(); const sc = {type:'learner', id:'l-mia'};
  C.award(s, sc, {nowMs: tick()});
  const res = C.startSession(s, 'l-mia', {theme:'donut', target:3, reinforcerId:'r-swing', choiceTiming:'both'});
  const l = C.findLearner(s,'l-mia');
  assert.ok(res.ok); assert.strictEqual(l.theme,'donut'); assert.strictEqual(l.target,3); assert.strictEqual(l.choiceTiming,'both');
  assert.strictEqual(l.board.earned,0); assert.strictEqual(l.board.selectedId,'r-swing');
  assert.ok(s.log.some(e => e.kind === 'new-board'));
  const s2 = C.ensureShape(JSON.parse(JSON.stringify(s))); assert.strictEqual(C.findLearner(s2,'l-mia').choiceTiming,'both');
});
t('old saves move to animated boards and pictures', () => {
  const s = C.demo(); const l = C.findLearner(s,'l-mia'); l.tokenType='picture'; delete l.theme; l.tokenStyle='rocket';
  const r = C.findReinforcer(s,'r-bubbles'); delete r.pic; r.icon='🫧';
  const s2 = C.ensureShape(JSON.parse(JSON.stringify(s)));
  assert.strictEqual(C.findLearner(s2,'l-mia').theme,'rocket'); assert.strictEqual(C.findReinforcer(s2,'r-bubbles').pic,'bubbles');
});
console.log(`${n} tests passed`);
