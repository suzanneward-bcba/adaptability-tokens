/* adaptABILITY Tokens — core logic (no DOM). Works in browser (window.ATCore) and Node (module.exports). */
(function (root) {
  'use strict';

  var APP_ID = 'adaptability-tokens';
  var SCHEMA = 1;
  var DEBOUNCE_MS = 600;
  var LOG_MAX = 8000;

  function uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }
  function L(en, de) { return { en: en, de: de }; }
  function txt(v, lang) {
    if (v && typeof v === 'object') return v[lang] || v.en || v.de || '';
    return v == null ? '' : String(v);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function clampInt(n, lo, hi, dflt) {
    n = parseInt(n, 10);
    if (isNaN(n)) return dflt;
    return Math.max(lo, Math.min(hi, n));
  }

  var TOKEN_STYLES = {
    star: '⭐', heart: '❤️', car: '🚗', train: '🚂', dino: '🦕', paw: '🐾',
    fish: '🐟', rocket: '🚀', flower: '🌼', ball: '⚽', check: '✔️', gem: '💎'
  };
  var TOKEN_LIBRARY = [
    { id: 'fav', en: 'Favorites', de: 'Favoriten', items: '⭐ ❤️ 🚗 🚂 🦕 🐾 🐟 🚀 🌼 ⚽ ✔️ 💎' },
    { id: 'animals', en: 'Animals', de: 'Tiere', items: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐴 🐝 🦋 🐞 🐢 🦒 🐘 🦓 🦔 🐿️ 🦥 🦘 🐑 🦩' },
    { id: 'ocean', en: 'Ocean', de: 'Meer', items: '🐳 🐋 🐬 🐟 🐠 🐡 🐙 🦀 🦞 🦈 🦭 🦑 🐚 🐊 🐸 🌊' },
    { id: 'dino', en: 'Dinosaurs & dragons', de: 'Dinos & Drachen', items: '🦕 🦖 🐉 🐲 🥚 🌋' },
    { id: 'vehicles', en: 'Vehicles', de: 'Fahrzeuge', items: '🚗 🚕 🚙 🛻 🚌 🚓 🚑 🚒 🚜 🏎️ 🚛 🚚 🏍️ 🚲 🛴 🚂 🚆 🚇 🚋 ✈️ 🚁 🛸 🚀 ⛵ 🚤 🚢 🚧' },
    { id: 'space', en: 'Space & weather', de: 'Weltall & Wetter', items: '⭐ 🌟 ✨ 🌙 ☀️ 🪐 ☄️ 🌍 🌈 ☁️ ⚡ ❄️ 🔥 💫 🌠' },
    { id: 'nature', en: 'Nature', de: 'Natur', items: '🌼 🌻 🌷 🌸 🌹 🍀 🌳 🌲 🌵 🍄 🍁 🍂 🌰 🪨 🌱' },
    { id: 'food', en: 'Food', de: 'Essen', items: '🍎 🍓 🍌 🍉 🍇 🍒 🍑 🥕 🌽 🍕 🍪 🧁 🍩 🍦 🥨 🧀 🍿 🥞 🍋 🫐' },
    { id: 'sports', en: 'Sports & play', de: 'Sport & Spiel', items: '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🥏 🎯 🪁 🛹 🎳 🏆 🥇 🎲 🧩 🧸 🪀 🎮' },
    { id: 'music', en: 'Music & art', de: 'Musik & Kunst', items: '🎵 🎶 🎸 🥁 🎹 🎺 🎻 🎤 🎧 🎨 🖍️ ✏️ 📚 🎭 🎬' },
    { id: 'fantasy', en: 'Fantasy', de: 'Fantasie', items: '🦄 🧚 🧜 🧙 👑 🏰 🪄 💎 🔮 🤖 👾 👻 🐲 🌈' },
    { id: 'symbols', en: 'Symbols & colors', de: 'Symbole & Farben', items: '✔️ ✅ ❤️ 🧡 💛 💚 💙 💜 🤍 🔴 🟠 🟡 🟢 🔵 🟣 🟥 🟧 🟨 🟩 🟦 🟪 🔷 🔶 ➕ 💯 👍 🙌 👏 🔒 🔑' },
    { id: 'celebrate', en: 'Celebrations', de: 'Feste', items: '🎈 🎉 🎊 🎁 🎂 🎃 🎄 ⛄ 🐣 🏖️ 🎆 🪅' }
  ];
  TOKEN_LIBRARY.forEach(function (c) { c.items = c.items.split(' '); });
  function tokenIcon(style) {
    if (!style) return '⭐';
    return TOKEN_STYLES[style] || style;
  }
  var FILL_MODES = ['group', 'ownStaff', 'ownAll'];
  var CATEGORIES = ['play', 'sensory', 'creative', 'movement', 'screen', 'food', 'social', 'group', 'other'];
  /* Old picture-token styles map to the closest animated board. */
  var STYLE_TO_THEME = { rocket: 'rocket', train: 'train', car: 'train', dino: 'dino', flower: 'flower', fish: 'treasure', gem: 'treasure', heart: 'flower', star: 'rainbow', paw: 'egg', ball: 'puzzle', check: 'puzzle' };
  var DEFAULT_THEME = 'cookie';
  /* Older saves used emoji pictures; map them to the matching Pick and Play picture. */
  var EMOJI_PIC = { '🫧': 'bubbles', '🖍': 'draw', '🎵': 'music', '🧱': 'blocks', '🌈': 'lightshow', '🎲': 'game', '🙌': 'circletime', '🪂': 'playground', '💃': 'jump', '📱': 'videogame', '📺': 'videogame', '🚗': 'cars', '🧸': 'baby', '⚽': 'ball', '🛝': 'slide', '🧩': 'puzzle', '📖': 'book', '🎨': 'paint', '🥁': 'music', '🪀': 'game', '🏀': 'ball', '🎮': 'videogame', '🐾': 'animals', '🌟': 'game', '🧃': 'snack', '🍪': 'snack' };
  var GOAL_PIC = { '🤝': 'game', '⭕': 'circletime', '👕': 'dressup', '🧹': 'kitchen', '🪑': 'tablework', '🧩': 'puzzle', '🍽': 'snack', '📚': 'book', '🙌': 'circletime' };
  function themeFor(style) { return STYLE_TO_THEME[style] || DEFAULT_THEME; }

  function newBoard() {
    return { earned: 0, selectedId: null, status: 'earning', cycle: 1, lastAwardAt: 0, startedAt: new Date().toISOString() };
  }
  function newSharedBoard() {
    return { contrib: {}, stack: [], selectedId: null, status: 'earning', cycle: 1, lastAwardAt: {}, startedAt: new Date().toISOString() };
  }

  function defaultSettings() {
    return { lang: 'en', theme: 'young', sound: true, tokenSound: 'chime', soundV: 2, motion: 'system', pin: '1234', pinChanged: false, seenNotice: false };
  }

  /* A fresh install starts with no learners and no groups (only starter reinforcers). */
  function seed() {
    var d = demo();
    d.learners = []; d.groups = [];
    return d;
  }
  /* Sample learners and groups for training and tests (open the app with ?demo=1 on an empty device). */
  function demo() {
    function r(id, label, category, pic, duration, group) {
      return { id: id, label: label, category: category, pic: pic, image: null, duration: duration || 0, available: true, group: !!group };
    }
    var reinforcers = [
      r('r-trampoline', L('Trampoline', 'Trampolin'), 'movement', 'jump', 5, true),
      r('r-bubbles', L('Bubbles', 'Seifenblasen'), 'sensory', 'bubbles', 3, true),
      r('r-swing', L('Swing', 'Schaukel'), 'movement', 'swing', 3),
      r('r-lightshow', L('Light show', 'Lichtshow'), 'sensory', 'lightshow', 5),
      r('r-cars', L('Cars', 'Autos'), 'play', 'cars', 5),
      r('r-animals', L('Animals', 'Tiere'), 'play', 'animals', 5),
      r('r-trains', L('Trains', 'Eisenbahn'), 'play', 'train', 5),
      r('r-balloons', L('Balloons', 'Luftballons'), 'sensory', 'balloons', 3, true),
      r('r-candy', L('Candy', 'Süßigkeiten'), 'food', 'candy', 0, true)
    ];
    function learner(id, name, avatar, tokenStyle, target, goalText, goalPic, timing, rids) {
      return {
        id: id, name: name, avatar: null, avatarImage: null, tokenStyle: tokenStyle, target: target,
        goal: { text: goalText, pic: goalPic, image: null }, choiceTiming: timing, reinforcerIds: rids, board: newBoard()
      };
    }
    var learners = [
      learner('l-mia', 'Mia', '', 'star', 5, L('Take turns', 'Abwechseln'), 'game', 'before', ['r-bubbles', 'r-cars', 'r-swing', 'r-lightshow']),
      learner('l-leo', 'Leo', '', 'car', 3, L('Ask for help', 'Um Hilfe bitten'), null, 'after', ['r-lightshow', 'r-trains', 'r-animals', 'r-bubbles']),
      learner('l-noor', 'Noor', '', 'heart', 5, L('Join circle time', 'Beim Stuhlkreis mitmachen'), 'circletime', 'before', ['r-swing', 'r-animals', 'r-cars']),
      learner('l-jk', 'J.K.', '', 'check', 10, L('Practice getting dressed', 'Anziehen üben'), 'dressup', 'after', ['r-swing', 'r-trains', 'r-cars'])
    ];
    learners[0].tokenType = 'theme'; learners[0].theme = 'cookie';
    learners[1].tokenType = 'theme'; learners[1].theme = 'train';
    learners[2].tokenType = 'theme'; learners[2].theme = 'flower';
    learners[3].tokenType = 'theme'; learners[3].theme = 'dino';
    var shared = newSharedBoard();
    shared.contrib = { 'l-mia': { target: 3, earned: 0 }, 'l-leo': { target: 2, earned: 0 }, 'l-noor': { target: 3, earned: 0 }, 'l-jk': { target: 4, earned: 0 } };
    var groups = [
      { id: 'g-morning', name: L('Morning group', 'Morgengruppe'), type: 'individual', memberIds: ['l-mia', 'l-leo', 'l-noor'] },
      {
        id: 'g-kitchen', name: L('Social Kitchen team', 'Social-Kitchen-Team'), type: 'team', memberIds: ['l-mia', 'l-noor', 'l-jk'],
        target: 10, tokenStyle: 'flower', reinforcerIds: ['r-trampoline', 'r-candy', 'r-balloons'],
        tokenFill: 'ownStaff', examples: [L('Helping a friend', 'Einem Freund helfen'), L('Taking turns', 'Abwechseln'), L('Sharing materials', 'Material teilen'), L('Kind words', 'Freundliche Worte')],
        board: Object.assign(newBoard(), { stack: [] })
      },
      {
        id: 'g-rocket', name: L('Circle time rocket', 'Stuhlkreis-Rakete'), type: 'team', memberIds: ['l-mia', 'l-leo', 'l-noor'],
        target: 8, tokenStyle: 'rocket', tokenType: 'theme', theme: 'rocket', tokenFill: 'group', reinforcerIds: ['r-candy', 'r-trampoline', 'r-balloons'],
        examples: [L('Waiting for a turn', 'Auf den eigenen Zug warten'), L('Listening to a friend', 'Einem Freund zuhören'), L('Joining the song', 'Beim Lied mitmachen')],
        board: Object.assign(newBoard(), { stack: [] })
      },
      {
        id: 'g-friday', name: L('Friday shared goal', 'Gemeinsames Freitagsziel'), type: 'shared', memberIds: ['l-mia', 'l-leo', 'l-noor', 'l-jk'],
        tokenStyle: 'rocket', tokenFill: 'group', reinforcerIds: ['r-candy', 'r-trampoline', 'r-balloons'], defaultTarget: 3, board: shared
      }
    ];
    return { app: APP_ID, schema: SCHEMA, settings: defaultSettings(), reinforcers: reinforcers, learners: learners, groups: groups, log: [] };
  }

  function ensureShape(s) {
    if (!s || typeof s !== 'object') return seed();
    var out = s;
    out.app = APP_ID;
    out.schema = SCHEMA;
    out.settings = Object.assign(defaultSettings(), out.settings || {});
    delete out.settings.tts;
    if (out.settings.soundV !== 2) { out.settings.tokenSound = 'chime'; out.settings.soundV = 2; }
    out.reinforcers = Array.isArray(out.reinforcers) ? out.reinforcers : [];
    out.learners = Array.isArray(out.learners) ? out.learners : [];
    out.groups = Array.isArray(out.groups) ? out.groups : [];
    out.log = Array.isArray(out.log) ? out.log : [];
    out.reinforcers.forEach(function (r) {
      if (r.available === undefined) r.available = true;
      if (!r.pic) r.pic = EMOJI_PIC[String(r.icon || '').replace(/\uFE0F/g, '')] || 'game';
      if (!r.duration) r.duration = 0;
    });
    out.learners.forEach(function (l) {
      l.board = Object.assign(newBoard(), l.board || {});
      l.target = clampInt(l.target, 1, 30, 5);
      l.reinforcerIds = Array.isArray(l.reinforcerIds) ? l.reinforcerIds : [];
      l.goal = l.goal || { text: '', pic: null, image: null };
      if (l.goal.pic === undefined) l.goal.pic = GOAL_PIC[String(l.goal.icon || '').replace(/\uFE0F/g, '')] || null;
      l.choiceTiming = l.choiceTiming === 'after' || l.choiceTiming === 'both' ? l.choiceTiming : 'before';
      if (l.tokenType !== 'theme' || !l.theme) { l.tokenType = 'theme'; l.theme = l.theme || themeFor(l.tokenStyle); }
    });
    out.groups.forEach(function (g) {
      if (g.type !== 'individual' && (g.tokenType !== 'theme' || !g.theme)) { g.tokenType = 'theme'; g.theme = g.theme || themeFor(g.tokenStyle); }
      g.memberIds = (g.memberIds || []).filter(function (id) { return !!findLearner(out, id); });
      if (g.type === 'team') {
        g.board = Object.assign(newBoard(), g.board || {});
        g.target = clampInt(g.target, 1, 40, 10);
        g.examples = g.examples || [];
        g.reinforcerIds = g.reinforcerIds || [];
        if (!Array.isArray(g.board.stack)) g.board.stack = [];
        while (g.board.stack.length < g.board.earned) g.board.stack.unshift(null);
        if (g.board.stack.length > g.board.earned) g.board.stack = g.board.stack.slice(-g.board.earned || g.board.stack.length);
        if (g.board.earned === 0) g.board.stack = [];
        if (FILL_MODES.indexOf(g.tokenFill) === -1) g.tokenFill = 'group';
      } else if (g.type === 'shared') {
        if (FILL_MODES.indexOf(g.tokenFill) === -1) g.tokenFill = 'group';
        g.board = Object.assign(newSharedBoard(), g.board || {});
        g.reinforcerIds = g.reinforcerIds || [];
        g.defaultTarget = clampInt(g.defaultTarget, 1, 20, 3);
        syncSharedMembers(out, g);
      }
    });
    return out;
  }

  /* ---------- lookups ---------- */
  function findLearner(s, id) { for (var i = 0; i < s.learners.length; i++) if (s.learners[i].id === id) return s.learners[i]; return null; }
  function findGroup(s, id) { for (var i = 0; i < s.groups.length; i++) if (s.groups[i].id === id) return s.groups[i]; return null; }
  function findReinforcer(s, id) { for (var i = 0; i < s.reinforcers.length; i++) if (s.reinforcers[i].id === id) return s.reinforcers[i]; return null; }

  /* A "scope" identifies one board:
     {type:'learner', id}  |  {type:'team', groupId}  |  {type:'shared', groupId}
     Shared awards/undo also take a learnerId. */
  function resolve(s, scope) {
    if (!scope) return null;
    if (scope.type === 'learner') {
      var l = findLearner(s, scope.id);
      if (!l) return null;
      return { kind: 'learner', owner: l, board: l.board, target: l.target, reinforcerIds: l.reinforcerIds, learner: l, group: null };
    }
    var g = findGroup(s, scope.groupId);
    if (!g) return null;
    if (scope.type === 'team' && g.type === 'team') return { kind: 'team', owner: g, board: g.board, target: g.target, reinforcerIds: g.reinforcerIds, learner: null, group: g };
    if (scope.type === 'shared' && g.type === 'shared') return { kind: 'shared', owner: g, board: g.board, target: sharedTotals(g).target, reinforcerIds: g.reinforcerIds, learner: null, group: g };
    return null;
  }

  function sharedTotals(g) {
    var t = 0, e = 0;
    (g.memberIds || []).forEach(function (id) {
      var c = g.board.contrib[id];
      if (!c) return;
      t += c.target;
      e += Math.min(c.earned, c.target);
    });
    return { target: t, earned: e };
  }
  function syncSharedMembers(s, g) {
    var b = g.board;
    g.memberIds.forEach(function (id) {
      if (!b.contrib[id]) b.contrib[id] = { target: g.defaultTarget || 3, earned: 0 };
    });
    Object.keys(b.contrib).forEach(function (id) {
      if (g.memberIds.indexOf(id) === -1) delete b.contrib[id];
    });
    b.stack = (b.stack || []).filter(function (id) { return g.memberIds.indexOf(id) !== -1; });
  }

  function progress(s, scope) {
    var r = resolve(s, scope);
    if (!r) return null;
    if (r.kind === 'shared') {
      var t = sharedTotals(r.group);
      return { earned: t.earned, target: t.target, status: r.board.status };
    }
    return { earned: r.board.earned, target: r.target, status: r.board.status };
  }

  /* Which picture goes in each filled slot of a collective board.
     view: 'staff' or 'display'. Learner tokens appear when the group's fill mode allows it for that view. */
  function slotIcons(s, scope, view) {
    var r = resolve(s, scope);
    if (!r || r.kind === 'learner') return null;
    var g = r.group, groupIcon = tokenIcon(g.tokenStyle);
    var own = g.tokenFill === 'ownAll' || (g.tokenFill === 'ownStaff' && view === 'staff');
    var p = progress(s, scope), shown = Math.min(p.earned, p.target), out = [];
    var stack = (g.board.stack || []);
    if (r.kind === 'team') stack = stack.slice(-g.board.earned);
    for (var i = 0; i < shown; i++) {
      var lid = stack[i], l = lid ? findLearner(s, lid) : null;
      out.push(own && l ? tokenIcon(l.tokenStyle) : groupIcon);
    }
    return out;
  }

  /* ---------- log ---------- */
  function addLog(s, r, kind, extra) {
    var lang = 'en';
    var sel = r.board.selectedId ? findReinforcer(s, r.board.selectedId) : null;
    var p = r.kind === 'shared' ? sharedTotals(r.group) : { earned: r.board.earned, target: r.target };
    var entry = {
      id: uid(),
      ts: (extra && extra.ts) || new Date().toISOString(),
      kind: kind,
      arrangement: r.kind,
      learnerId: r.learner ? r.learner.id : (extra && extra.learnerId) || null,
      learnerName: r.learner ? r.learner.name : (extra && extra.learnerName) || '',
      groupId: r.group ? r.group.id : null,
      groupName: r.group ? txt(r.group.name, lang) : '',
      goal: r.learner ? txt(r.learner.goal && r.learner.goal.text, lang) : '',
      tokens: (extra && extra.tokens) || 0,
      progress: p.earned + '/' + p.target,
      reinforcer: sel ? txt(sel.label, lang) : '',
      cycle: r.board.cycle,
      note: (extra && extra.note) || ''
    };
    s.log.push(entry);
    if (s.log.length > LOG_MAX) s.log.splice(0, s.log.length - LOG_MAX);
    return entry;
  }

  function checkComplete(s, r) {
    var p = r.kind === 'shared' ? sharedTotals(r.group) : { earned: r.board.earned, target: r.target };
    if (r.board.status === 'earning' && p.target > 0 && p.earned >= p.target) {
      r.board.status = 'complete';
      addLog(s, r, 'complete');
      return true;
    }
    return false;
  }

  /* ---------- actions (mutate state, return result) ---------- */
  function award(s, scope, opts) {
    opts = opts || {};
    var nowMs = opts.nowMs != null ? opts.nowMs : Date.now();
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    var b = r.board;
    if (b.status !== 'earning') return { ok: false, reason: 'full' };

    if (r.kind === 'shared') {
      var lid = scope.learnerId;
      var c = b.contrib[lid];
      if (!c || r.group.memberIds.indexOf(lid) === -1) return { ok: false, reason: 'missing' };
      if (c.earned >= c.target) return { ok: false, reason: 'met' };
      var last = b.lastAwardAt[lid] || 0;
      if (nowMs - last < DEBOUNCE_MS) return { ok: false, reason: 'debounce' };
      b.lastAwardAt[lid] = nowMs;
      c.earned += 1;
      b.stack.push(lid);
      var ln = findLearner(s, lid);
      addLog(s, r, 'award', { tokens: 1, learnerId: lid, learnerName: ln ? ln.name : '', note: opts.note || '' });
      var done = checkComplete(s, r);
      return { ok: true, completed: done };
    }

    if (nowMs - (b.lastAwardAt || 0) < DEBOUNCE_MS) return { ok: false, reason: 'debounce' };
    if (b.earned >= r.target) return { ok: false, reason: 'full' };
    var who = null;
    if (r.kind === 'team' && scope.learnerId && r.group.memberIds.indexOf(scope.learnerId) !== -1) who = scope.learnerId;
    b.lastAwardAt = nowMs;
    b.earned += 1;
    if (r.kind === 'team') { if (!Array.isArray(b.stack)) b.stack = []; b.stack.push(who); }
    var wl = who ? findLearner(s, who) : null;
    addLog(s, r, 'award', { tokens: 1, note: opts.note || '', learnerId: who, learnerName: wl ? wl.name : '' });
    var completed = checkComplete(s, r);
    return { ok: true, completed: completed };
  }

  function undo(s, scope) {
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    var b = r.board;
    if (b.status === 'delivered') return { ok: false, reason: 'delivered' };
    if (r.kind === 'shared') {
      var lid = scope.learnerId;
      var idx;
      if (lid) idx = b.stack.lastIndexOf(lid);
      else idx = b.stack.length - 1;
      if (idx < 0) return { ok: false, reason: 'empty' };
      var who = b.stack.splice(idx, 1)[0];
      var c = b.contrib[who];
      if (!c || c.earned <= 0) return { ok: false, reason: 'empty' };
      c.earned -= 1;
      var ln = findLearner(s, who);
      if (b.status === 'complete') b.status = 'earning';
      addLog(s, r, 'undo', { tokens: -1, learnerId: who, learnerName: ln ? ln.name : '' });
      return { ok: true };
    }
    if (b.earned <= 0) return { ok: false, reason: 'empty' };
    b.earned -= 1;
    if (r.kind === 'team' && Array.isArray(b.stack)) b.stack.pop();
    if (b.status === 'complete' && b.earned < r.target) b.status = 'earning';
    b.lastAwardAt = 0;
    addLog(s, r, 'undo', { tokens: -1 });
    return { ok: true };
  }

  function allowedReinforcers(s, scope, includeUnavailable) {
    var r = resolve(s, scope);
    if (!r) return [];
    return r.reinforcerIds.map(function (id) { return findReinforcer(s, id); })
      .filter(function (x) { return x && (includeUnavailable || x.available); });
  }

  function select(s, scope, reinforcerId) {
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    if (r.board.status === 'delivered') return { ok: false, reason: 'delivered' };
    var rf = findReinforcer(s, reinforcerId);
    if (!rf || r.reinforcerIds.indexOf(reinforcerId) === -1) return { ok: false, reason: 'not-allowed' };
    if (!rf.available) return { ok: false, reason: 'unavailable' };
    if (r.board.selectedId === reinforcerId) return { ok: true, unchanged: true };
    r.board.selectedId = reinforcerId;
    addLog(s, r, 'select');
    return { ok: true };
  }

  function confirmDelivery(s, scope) {
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    if (r.board.status === 'delivered') return { ok: false, reason: 'already' };
    if (r.board.status !== 'complete') return { ok: false, reason: 'not-complete' };
    var rf = r.board.selectedId ? findReinforcer(s, r.board.selectedId) : null;
    if (!rf) return { ok: false, reason: 'no-selection' };
    r.board.status = 'delivered';
    r.board.deliveredAt = new Date().toISOString();
    addLog(s, r, 'exchange');
    return { ok: true, reinforcer: rf };
  }

  function startNewBoard(s, scope) {
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    if (r.board.status !== 'delivered') return { ok: false, reason: 'not-delivered' };
    addLog(s, r, 'new-board');
    resetBoardData(r);
    return { ok: true };
  }

  /* Start a board in one go: board, number of tokens, timing and (optionally) the reinforcer.
     Clears the learner's current board (logged as a new board) so the session starts at 0. */
  function startSession(s, learnerId, o) {
    o = o || {};
    var l = findLearner(s, learnerId);
    if (!l) return { ok: false, reason: 'missing' };
    l.tokenType = 'theme';
    if (o.theme) l.theme = o.theme;
    if (!l.theme) l.theme = DEFAULT_THEME;
    l.target = clampInt(o.target, 1, 30, l.target);
    if (o.choiceTiming === 'before' || o.choiceTiming === 'after' || o.choiceTiming === 'both') l.choiceTiming = o.choiceTiming;
    var sc = { type: 'learner', id: learnerId }, r = resolve(s, sc);
    addLog(s, r, 'new-board', { note: 'Started with Start a board' });
    resetBoardData(r);
    if (o.reinforcerId) {
      var rf = findReinforcer(s, o.reinforcerId);
      if (!rf) return { ok: false, reason: 'no-reinforcer' };
      if (l.reinforcerIds.indexOf(rf.id) === -1) l.reinforcerIds.push(rf.id);
      var sr = select(s, sc, rf.id);
      if (!sr.ok) return { ok: false, reason: sr.reason };
    }
    return { ok: true };
  }

  /* Add a built-in library picture as a reinforcer (reuses an existing one with the same picture and name). */
  function addLibraryReinforcer(s, item) {
    for (var i = 0; i < s.reinforcers.length; i++) {
      var x = s.reinforcers[i];
      if (!x.image && x.pic === item.id && txt(x.label, 'en') === item.en) return x;
    }
    var rf = { id: 'r-' + uid(), label: L(item.en, item.de), category: 'play', pic: item.id, image: null, duration: 0, available: true, group: false };
    s.reinforcers.push(rf);
    return rf;
  }

  /* Staff-only clear without an exchange (needs confirmation in UI). */
  function resetBoard(s, scope) {
    var r = resolve(s, scope);
    if (!r) return { ok: false, reason: 'missing' };
    addLog(s, r, 'reset', { note: 'Cleared by staff without exchange' });
    resetBoardData(r);
    return { ok: true };
  }

  function resetBoardData(r) {
    var b = r.board;
    b.cycle += 1;
    b.status = 'earning';
    b.selectedId = null;
    b.startedAt = new Date().toISOString();
    b.deliveredAt = null;
    if (r.kind === 'shared') {
      Object.keys(b.contrib).forEach(function (id) { b.contrib[id].earned = 0; });
      b.stack = [];
      b.lastAwardAt = {};
    } else {
      b.earned = 0;
      b.lastAwardAt = 0;
      if (r.kind === 'team') b.stack = [];
    }
  }

  /* After staff edit a target or membership, re-evaluate status without erasing tokens. */
  function recheck(s, scope) {
    var r = resolve(s, scope);
    if (!r) return;
    var b = r.board;
    if (r.kind === 'shared') syncSharedMembers(s, r.group);
    var p = progress(s, scope);
    if (b.status === 'earning' && p.target > 0 && p.earned >= p.target) { b.status = 'complete'; addLog(s, resolve(s, scope), 'complete', { note: 'Target changed by staff' }); }
    else if (b.status === 'complete' && p.earned < p.target) b.status = 'earning';
    if (r.kind !== 'shared' && b.earned > r.target && b.status !== 'delivered') b.earned = r.target;
  }

  function setSharedTarget(s, groupId, learnerId, target) {
    var g = findGroup(s, groupId);
    if (!g || g.type !== 'shared' || !g.board.contrib[learnerId]) return { ok: false };
    g.board.contrib[learnerId].target = clampInt(target, 1, 20, 3);
    recheck(s, { type: 'shared', groupId: groupId });
    return { ok: true };
  }

  /* ---------- CRUD helpers ---------- */
  function deleteLearner(s, id) {
    s.learners = s.learners.filter(function (l) { return l.id !== id; });
    s.groups.forEach(function (g) {
      g.memberIds = g.memberIds.filter(function (m) { return m !== id; });
      if (g.type === 'shared') syncSharedMembers(s, g);
    });
  }
  function deleteReinforcer(s, id) {
    s.reinforcers = s.reinforcers.filter(function (r) { return r.id !== id; });
    s.learners.forEach(function (l) {
      l.reinforcerIds = l.reinforcerIds.filter(function (x) { return x !== id; });
      if (l.board.selectedId === id && l.board.status !== 'delivered') l.board.selectedId = null;
    });
    s.groups.forEach(function (g) {
      if (!g.reinforcerIds) return;
      g.reinforcerIds = g.reinforcerIds.filter(function (x) { return x !== id; });
      if (g.board && g.board.selectedId === id && g.board.status !== 'delivered') g.board.selectedId = null;
    });
  }
  function setAvailability(s, id, available) {
    var r = findReinforcer(s, id);
    if (!r) return;
    r.available = !!available;
    // A selection that just became unavailable stays visible to staff but learners can re-choose; it is never auto-removed while delivered.
  }
  function duplicateGroup(s, id, suffix) {
    var g = findGroup(s, id);
    if (!g) return null;
    var c = clone(g);
    c.id = 'g-' + uid();
    if (typeof c.name === 'object') { c.name = { en: txt(g.name, 'en') + ' ' + suffix.en, de: txt(g.name, 'de') + ' ' + suffix.de }; }
    else c.name = c.name + ' ' + suffix.en;
    if (c.type === 'team') c.board = newBoard();
    if (c.type === 'shared') {
      var nb = newSharedBoard();
      Object.keys(g.board.contrib).forEach(function (k) { nb.contrib[k] = { target: g.board.contrib[k].target, earned: 0 }; });
      c.board = nb;
    }
    s.groups.push(c);
    return c;
  }

  /* ---------- export / import ---------- */
  function csvCell(v) {
    v = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(v)) v = "'" + v; // avoid spreadsheet formula injection
    if (/[",\n;]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  var CSV_KINDS = ['award', 'undo', 'complete', 'select', 'exchange', 'new-board', 'reset'];
  function toCSV(s, filter) {
    var rows = [['timestamp', 'event', 'arrangement', 'learner', 'group', 'earning_goal', 'tokens', 'progress_after', 'reinforcer', 'cycle', 'note']];
    s.log.forEach(function (e) {
      if (CSV_KINDS.indexOf(e.kind) === -1) return;
      if (filter && filter.learnerId && e.learnerId !== filter.learnerId) return;
      if (filter && filter.groupId && e.groupId !== filter.groupId) return;
      rows.push([e.ts, e.kind, e.arrangement, e.learnerName, e.groupName, e.goal, e.tokens, e.progress, e.reinforcer, e.cycle, e.note]);
    });
    return '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
  }
  function makeBackup(s) {
    return JSON.stringify({ app: APP_ID, schema: SCHEMA, exportedAt: new Date().toISOString(), state: s });
  }
  function parseBackup(text) {
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, reason: 'not-json' }; }
    if (!o || o.app !== APP_ID || !o.state) return { ok: false, reason: 'wrong-file' };
    if (!Array.isArray(o.state.learners) || !Array.isArray(o.state.reinforcers)) return { ok: false, reason: 'wrong-file' };
    return { ok: true, state: ensureShape(o.state), exportedAt: o.exportedAt };
  }

  var api = {
    APP_ID: APP_ID, SCHEMA: SCHEMA, DEBOUNCE_MS: DEBOUNCE_MS, TOKEN_STYLES: TOKEN_STYLES, TOKEN_LIBRARY: TOKEN_LIBRARY, FILL_MODES: FILL_MODES, tokenIcon: tokenIcon, slotIcons: slotIcons, CATEGORIES: CATEGORIES, themeFor: themeFor, DEFAULT_THEME: DEFAULT_THEME,
    uid: uid, txt: txt, clone: clone, clampInt: clampInt, seed: seed, demo: demo, ensureShape: ensureShape,
    newBoard: newBoard, newSharedBoard: newSharedBoard,
    findLearner: findLearner, findGroup: findGroup, findReinforcer: findReinforcer,
    resolve: resolve, progress: progress, sharedTotals: sharedTotals, syncSharedMembers: syncSharedMembers,
    award: award, undo: undo, select: select, startSession: startSession, addLibraryReinforcer: addLibraryReinforcer, confirmDelivery: confirmDelivery, startNewBoard: startNewBoard,
    resetBoard: resetBoard, recheck: recheck, setSharedTarget: setSharedTarget, allowedReinforcers: allowedReinforcers,
    deleteLearner: deleteLearner, deleteReinforcer: deleteReinforcer, setAvailability: setAvailability, duplicateGroup: duplicateGroup,
    toCSV: toCSV, makeBackup: makeBackup, parseBackup: parseBackup
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ATCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
