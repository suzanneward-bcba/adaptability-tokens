/* adaptABILITY Tokens — interface */
(function () {
  'use strict';
  var C = window.ATCore;
  var I = window.ATI18N;
  var S = null;
  var STAFF_MS = 10 * 60 * 1000;
  var ui = {
    route: { name: 'home' }, unlockedUntil: 0, fx: null, modal: null, pinEntry: '', pinErr: '', pendingFn: null,
    sheetOpen: false, sheetT: null, teamExample: {}, histFilter: '', draft: null, formErr: '', timer: null, autoChoice: {}, storage: 'mem', persisted: null, tokenCat: 'fav', teamWho: {}
  };
  var $app = document.getElementById('app');
  var $layer = document.getElementById('layer');

  /* ---------------- helpers ---------------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function lang() { return S.settings.lang === 'de' ? 'de' : 'en'; }
  function t(key, vars) {
    var d = I[lang()], s = d[key];
    if (s == null) s = I.en[key];
    if (s == null) s = key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function tv(key, vars) { return t(key + '_' + (S.settings.theme === 'older' ? 'older' : 'young'), vars); }
  function tx(v) { return C.txt(v, lang()); }
  function fmtTime(iso) {
    try { return new Date(iso).toLocaleTimeString(lang() === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
  }
  function fmtDateTime(iso) {
    try { return new Date(iso).toLocaleString(lang() === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; }
  }
  function reduceMotion() {
    var m = S.settings.motion;
    if (m === 'reduced') return true;
    if (m === 'full') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function staffOn() { return Date.now() < ui.unlockedUntil; }
  function inFrame() { try { return window.self !== window.top; } catch (e) { return true; } }

  /* ---------------- storage ---------------- */
  var db = null;
  function openDB() {
    return new Promise(function (res, rej) {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      var rq = indexedDB.open('adaptability-tokens', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function idbGet(key) {
    return new Promise(function (res, rej) {
      var rq = db.transaction('kv').objectStore('kv').get(key);
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  var LITE = 'adaptability-tokens-lite';
  function stripImages(o) {
    return JSON.parse(JSON.stringify(o, function (k, v) {
      return (typeof v === 'string' && v.indexOf('data:image') === 0) ? '@img' : v;
    }));
  }
  function mergeLite(lite, full) {
    // lite is newer: take it, re-attach photos from the full IndexedDB copy by id.
    function imgs(listA, listB, fields) {
      (listA || []).forEach(function (a) {
        var b = (listB || []).filter(function (x) { return x.id === a.id; })[0];
        fields.forEach(function (f) {
          var path = f.split('.'), tgt = a, src = b;
          for (var i = 0; i < path.length - 1; i++) { tgt = tgt && tgt[path[i]]; src = src && src[path[i]]; }
          var last = path[path.length - 1];
          if (tgt && tgt[last] === '@img') tgt[last] = (src && src[last] && src[last] !== '@img') ? src[last] : null;
        });
      });
    }
    imgs(lite.learners, full && full.learners, ['avatarImage', 'goal.image']);
    imgs(lite.reinforcers, full && full.reinforcers, ['image']);
    return lite;
  }
  function readLite() { try { var x = localStorage.getItem(LITE); return x ? JSON.parse(x) : null; } catch (e) { return null; } }
  function load() {
    return openDB().then(function (d) { db = d; ui.storage = 'idb'; return idbGet('state'); })
      .then(function (full) {
        var lite = readLite();
        if (lite && (!full || (lite.savedAt || 0) > (full.savedAt || 0))) return mergeLite(lite, full);
        return full;
      })
      .catch(function () {
        db = null;
        try { localStorage.setItem('at-probe', '1'); localStorage.removeItem('at-probe'); ui.storage = 'ls'; var x = localStorage.getItem('adaptability-tokens'); return x ? JSON.parse(x) : null; }
        catch (e) { ui.storage = 'mem'; return null; }
      });
  }
  function save() {
    S.savedAt = Date.now();
    try {
      if (db) {
        try { localStorage.setItem(LITE, JSON.stringify(stripImages(S))); } catch (e) { /* safety copy is best effort */ }
        var tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(JSON.parse(JSON.stringify(S)), 'state');
        tx.onerror = function () { toast('Save failed: ' + (tx.error && tx.error.name)); };
      } else if (ui.storage === 'ls') {
        localStorage.setItem('adaptability-tokens', JSON.stringify(S));
      }
    } catch (e) { toast('Save failed: ' + e.name); }
  }
  function commit(fn) {
    var r = fn();
    save();
    render();
    return r;
  }

  /* ---------------- feedback: sound, toast, celebration ---------------- */
  var actx = null;
  function ac() {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  /* one soft note: wave type, start/end pitch, length, loudness, start delay */
  function note(type, f1, f2, dur, vol, delay) {
    var a = ac(), o = a.createOscillator(), g = a.createGain(), st = a.currentTime + (delay || 0);
    o.type = type; o.frequency.setValueAtTime(f1, st);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, st + dur * 0.6);
    g.gain.setValueAtTime(0.0001, st);
    g.gain.exponentialRampToValueAtTime(vol, st + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
    o.connect(g); g.connect(a.destination); o.start(st); o.stop(st + dur + 0.05);
  }
  var SOUNDS = {
    chime: function (d) { note('sine', 1175, 1175, 0.8, 0.11, d); note('sine', 2350, 2350, 0.4, 0.025, d); note('sine', 3525, 3525, 0.2, 0.012, d); },
    marimba: function (d) { note('sine', 880, 880, 0.35, 0.16, d); note('sine', 3520, 3520, 0.08, 0.03, d); },
    pop: function (d) { note('sine', 620, 1240, 0.12, 0.18, d); },
    bell: function (d) { note('triangle', 1318, 1318, 0.9, 0.09, d); note('sine', 2637, 2637, 0.5, 0.025, d); }
  };
  var SOUND_KEYS = ['chime', 'marimba', 'pop', 'bell'];
  function play(fn) { if (!S.settings.sound) return; try { fn(); } catch (e) { /* audio not available */ } }
  function soundToken() { play(function () { (SOUNDS[S.settings.tokenSound] || SOUNDS.chime)(0); }); }
  /* Board complete: always a short marimba tune (C–E–G–high C). */
  function marimbaNote(f, d, len) { note('sine', f, f, len, 0.17, d); note('sine', f * 4, f * 4, 0.07, 0.03, d); note('sine', f * 2, f * 2, len * 0.4, 0.02, d); }
  function soundComplete() {
    play(function () {
      [[523.25, 0, 0.35], [659.25, 0.14, 0.35], [783.99, 0.28, 0.35], [1046.5, 0.44, 0.9]].forEach(function (n) { marimbaNote(n[0], n[1], n[2]); });
    });
  }
  function soundTimer() { play(function () { [784, 659, 523].forEach(function (f, i) { note('sine', f, f, 0.6, 0.1, i * 0.25); }); }); }
  var toastT = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, 2600);
  }
  function celebrate(themeId) {
    if (themeId) { window.ATSounds.setEnabled(S.settings.sound); window.ATSounds.finish(themeId); return; } // themes draw their own big finish
    soundComplete();
    if (reduceMotion()) return;
    var box = document.createElement('div');
    box.className = 'celebrate'; box.setAttribute('aria-hidden', 'true');
    var cols = ['#a12279', '#2a60a6', '#a7cf3b', '#fe920c'];
    for (var i = 0; i < 26; i++) {
      var d = document.createElement('i');
      d.style.left = (Math.random() * 100) + '%';
      d.style.background = cols[i % 4];
      d.style.animationDelay = (Math.random() * 0.6) + 's';
      d.style.width = d.style.height = (8 + Math.random() * 8) + 'px';
      box.appendChild(d);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3600);
  }

  /* ---------------- staff lock ---------------- */
  function requireStaff(fn) {
    if (staffOn()) { ui.unlockedUntil = Date.now() + STAFF_MS; fn(); return; }
    ui.pendingFn = fn; ui.pinEntry = ''; ui.pinErr = '';
    ui.modal = { type: 'pin' };
    renderLayer();
  }
  function pinDigit(d) {
    if (ui.pinEntry.length >= 8) return;
    ui.pinEntry += d; ui.pinErr = '';
    var pin = String(S.settings.pin);
    if (ui.pinEntry.length === pin.length) {
      if (ui.pinEntry === pin) {
        ui.unlockedUntil = Date.now() + STAFF_MS;
        ui.modal = null;
        var fn = ui.pendingFn; ui.pendingFn = null;
        if (navigator.storage && navigator.storage.persist && ui.persisted == null) {
          navigator.storage.persist().then(function (p) { ui.persisted = p; }).catch(function () {});
        }
        render();
        if (fn) fn();
        return;
      }
      ui.pinErr = t('pinWrong'); ui.pinEntry = '';
    }
    renderLayer();
  }
  setInterval(function () {
    if (ui.unlockedUntil && !staffOn()) {
      ui.unlockedUntil = 0;
      if (gated(ui.route.name)) go({ name: 'home' }); else render();
    }
  }, 15000);
  function gated(name) { return ['start', 'learners', 'learnerEdit', 'groups', 'groupEdit', 'reinforcers', 'reinforcerEdit', 'history', 'settings'].indexOf(name) !== -1; }

  /* ---------------- routing ---------------- */
  function go(route) {
    ui.route = route; ui.sheetOpen = false; ui.formErr = '';
    if (['home', 'board', 'group', 'lv'].indexOf(route.name) !== -1) { S.settings.lastRoute = route; save(); }
    render();
    window.scrollTo(0, 0);
  }
  function goGated(route) { requireStaff(function () { go(route); }); }

  /* ---------------- scope helpers ---------------- */
  function scopeAttrs(sc) {
    return 'data-st="' + sc.type + '"' + (sc.id ? ' data-id="' + esc(sc.id) + '"' : '') + (sc.groupId ? ' data-g="' + esc(sc.groupId) + '"' : '') + (sc.learnerId ? ' data-l="' + esc(sc.learnerId) + '"' : '');
  }
  function scopeFrom(el) {
    var sc = { type: el.getAttribute('data-st') };
    if (el.getAttribute('data-id')) sc.id = el.getAttribute('data-id');
    if (el.getAttribute('data-g')) sc.groupId = el.getAttribute('data-g');
    if (el.getAttribute('data-l')) sc.learnerId = el.getAttribute('data-l');
    return sc;
  }
  function boardScope(sc) { return sc.type === 'shared' || sc.type === 'team' ? { type: sc.type, groupId: sc.groupId } : sc; }
  function fxKey(sc) { return sc.type + ':' + (sc.id || sc.groupId) + (sc.learnerId ? ':' + sc.learnerId : ''); }

  /* ---------------- visual atoms ---------------- */
  var AV_COLORS = ['#a12279', '#2a60a6', '#3e7d1e', '#c2570c', '#6b4bb3', '#0f7c86'];
  function avatar(l, cls) {
    if (l.avatarImage) return '<span class="avatar ' + (cls || '') + '"><img alt="" src="' + l.avatarImage + '"></span>';
    var nm = (l.name || '?').trim(), h = 0;
    for (var i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) % 997;
    return '<span class="avatar initials ' + (cls || '') + '" style="background:' + AV_COLORS[h % AV_COLORS.length] + '" aria-hidden="true">' + esc(nm.charAt(0).toUpperCase()) + '</span>';
  }
  function pic(id, cls) { return '<span class="pic ' + (cls || '') + '" aria-hidden="true">' + window.ATPics.svg(id) + '</span>'; }
  function rIcon(r, cls) {
    if (!r) return '';
    if (r.image) return '<img class="' + cls + '" alt="" src="' + r.image + '">';
    return pic(r.pic || 'game', cls);
  }
  function rTag(r) { return '<span class="tag rtag">' + rIcon(r, 'tg') + ' ' + esc(tx(r.label)) + '</span>'; }
  function tray(earned, target, style, opts) {
    opts = opts || {};
    var ic = C.tokenIcon(style);
    var shown = Math.min(earned, target);
    var h = '';
    for (var i = 0; i < target; i++) {
      var on = i < shown;
      var isNew = opts.newIndex === i;
      var icon = on && opts.icons && opts.icons[i] ? opts.icons[i] : ic;
      h += '<span class="well dot' + (on ? ' on' : '') + (isNew ? ' new' : '') + '"></span>';
    }
    var size = '';
    if (!opts.mini && target > 12) size = ' style="--well:' + (target > 30 ? 40 : target > 20 ? 50 : 60) + 'px"';
    return '<div class="tray' + (opts.mini ? ' mini' : '') + (opts.full ? ' full' : '') + '" role="img" aria-label="' + esc(t('progressAria', { e: shown, t: target })) + '"' + size + '>' + h + '</div>';
  }
  /* Build-it themes: up to 10 pieces; bigger targets fill the picture in proportion. */
  function themeOf(owner) { if (!owner) return null; return window.ATThemes.themes[owner.theme] ? owner.theme : C.DEFAULT_THEME; }
  function themeSvg(id, earned, target, o) {
    o = o || {};
    var n = Math.min(target, 10), k = target <= 10 ? Math.min(earned, target) : (earned >= target ? 10 : Math.floor(earned * 10 / target));
    var ni = -1;
    if (o.newIdx != null && o.newIdx >= 0) ni = target <= 10 ? o.newIdx : (Math.floor((o.newIdx + 1) * 10 / target) > Math.floor(o.newIdx * 10 / target) ? k - 1 : -1);
    var done = k >= n;
    var reduced = reduceMotion() || !!o.mini || (done && !o.animateDone);
    return '<div class="themebox' + (o.mini ? ' mini' : '') + (o.small ? ' small' : '') + '">' + window.ATThemes.render(id, n, k, { newIdx: ni, mode: 'big', reduced: reduced }) + '</div>';
  }
  function timingKey(v) { return v === 'after' ? 'timingAfter' : v === 'both' ? 'timingBoth' : 'timingBefore'; }
  function themeName(id) { var th = window.ATThemes.themes[id]; return th ? (lang() === 'de' ? th.de : th.en) : ''; }
  function statusTag(p) {
    if (p.status === 'complete') return '<span class="tag ready">✓ ' + esc(t('ready')) + '</span>';
    if (p.status === 'delivered') return '<span class="tag done">✓ ' + esc(t('delivered')) + '</span>';
    return '<span class="tag">' + esc(t('ofN', { e: Math.min(p.earned, p.target), t: p.target })) + '</span>';
  }
  function holdBtn(action, label, attrs, cls) {
    return '<button class="btn hold ' + (cls || '') + '" data-hold="' + action + '" ' + (attrs || '') + '><span class="fill"></span><span style="position:relative">↶ ' + esc(label) + '</span></button>';
  }

  /* ---------------- bar ---------------- */
  function bar() {
    var cur = { home: 'home', start: 'home', board: 'home', group: 'home', learners: 'learners', learnerEdit: 'learners', groups: 'groups', groupEdit: 'groups', reinforcers: 'reinforcers', reinforcerEdit: 'reinforcers', history: 'history', settings: 'settings' }[ui.route.name];
    var items = ['home', 'learners', 'groups', 'reinforcers', 'history', 'settings'];
    var nav = items.map(function (k) {
      return '<button data-a="nav" data-to="' + k + '"' + (cur === k ? ' aria-current="page"' : '') + '>' + esc(t(k)) + '</button>';
    }).join('');
    return '<header class="bar"><button class="brand" data-a="nav" data-to="home"><span class="brand-mark" aria-hidden="true"><i style="background:#a12279"></i><i style="background:#2a60a6"></i><i style="background:#a7cf3b"></i><i style="background:#fe920c"></i></span>adaptABILITY <small>Tokens</small></button>' +
      '<nav class="nav" aria-label="Main">' + nav + '</nav>' +
      '<button class="lockbtn' + (staffOn() ? ' on' : '') + '" data-a="lock">' + esc(staffOn() ? t('staffOpen') : t('staffLocked')) + '</button>' +
      '<button class="lockbtn" data-a="lang" aria-label="' + esc(t('language')) + '">' + (lang() === 'de' ? 'EN' : 'DE') + '</button></header>';
  }

  /* ---------------- home ---------------- */
  function viewHome() {
    var h = '';
    if (!S.settings.seenNotice || !S.settings.pinChanged) {
      h += '<div class="notice" role="note"><span class="noticei" aria-hidden="true">i</span><div><p>' + esc(t('storageNotice')) + '</p>' +
        (!S.settings.pinChanged ? '<p style="margin-top:6px"><b>' + esc(t('defaultPin')) + '</b></p>' : '') +
        (!S.settings.seenNotice ? '<p style="margin-top:10px"><button class="btn small" data-a="seenNotice">' + esc(t('gotIt')) + '</button></p>' : '') + '</div></div>';
    }
    h += '<div class="row"><h1>' + esc(t('learnerBoards')) + '</h1><span class="spacer"></span><button class="btn primary startbtn" data-a="startOpen">' + esc(t('startBoard')) + '</button></div><p class="lede">' + esc(t('homeLede')) + '</p>';
    if (!S.learners.length) h += '<p class="lede">' + esc(t('noLearners')) + '</p>';
    h += '<div class="tiles">' + S.learners.map(function (l) {
      var sc = { type: 'learner', id: l.id }, p = C.progress(S, sc);
      var sel = l.board.selectedId ? C.findReinforcer(S, l.board.selectedId) : null;
      return '<button class="tile" data-a="openBoard" data-id="' + esc(l.id) + '"><span class="who">' + avatar(l) + '<span><span class="name">' + esc(l.name) + '</span><br><span class="sub">' + esc(tx(l.goal.text)) + '</span></span></span>' +
        themeSvg(themeOf(l), p.earned, p.target, { mini: true }) +
        '<span class="row">' + statusTag(p) + (sel ? rTag(sel) : '') + '</span></button>';
    }).join('') + '</div>';
    h += '<h2>' + esc(t('groupSessions')) + '</h2>';
    if (!S.groups.length) h += '<p class="lede">' + esc(t('noGroups')) + '</p>';
    h += '<div class="tiles">' + S.groups.map(function (g) {
      var names = g.memberIds.map(function (id) { var l = C.findLearner(S, id); return l ? l.name : ''; }).join(', ');
      var extra = '';
      if (g.type !== 'individual') {
        var p = C.progress(S, { type: g.type, groupId: g.id });
        extra = themeSvg(themeOf(g), p.earned, p.target, { mini: true }) + '<span class="row">' + statusTag(p) + '</span>';
      }
      return '<button class="tile" data-a="openGroup" data-id="' + esc(g.id) + '"><span class="name">' + esc(tx(g.name)) + '</span><span class="tag" style="align-self:flex-start">' + esc(g.type === 'individual' ? t('mode_independent') : t('mode_collective') + ' · ' + t('count_' + g.type)) + '</span><span class="sub">' + esc(names) + '</span>' + extra + '</button>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------------- board body (shared by staff and learner views) ---------------- */
  function boardInfo(sc) {
    var r = C.resolve(S, sc);
    if (!r) return null;
    var p = C.progress(S, sc);
    var sel = r.board.selectedId ? C.findReinforcer(S, r.board.selectedId) : null;
    var style = r.kind === 'learner' ? r.learner.tokenStyle : r.group.tokenStyle;
    var timing = r.kind === 'learner' ? r.learner.choiceTiming : 'before';
    var themeId = themeOf(r.kind === 'learner' ? r.learner : r.group);
    return { r: r, p: p, sel: sel, style: style, timing: timing, themeId: themeId };
  }
  function wfPanel(sc, info, mode) {
    var b = info.r.board;
    var label = info.r.kind === 'learner' ? tv('workingFor') : t('weWorkingFor');
    var h = '<div class="panel"><p class="wf-label">' + esc(label) + '</p>';
    if (info.sel) {
      var unavailable = !info.sel.available && b.status !== 'delivered';
      h += '<div class="wf-card">' + rIcon(info.sel, 'big') + '<div><div class="lbl">' + esc(tx(info.sel.label)) + '</div>' +
        (info.sel.duration ? '<div class="meta">' + esc(t('min', { m: info.sel.duration })) + '</div>' : '') +
        (unavailable ? '<div class="meta">' + esc(t('notAvailable')) + '</div>' : '') + '</div></div>';
      if (b.status !== 'delivered') h += '<div class="controls"><button class="btn" data-a="openChoice" ' + scopeAttrs(sc) + '>' + esc(t('change')) + '</button></div>';
    } else if (info.timing === 'after' && b.status === 'earning') {
      h += '<div class="wf-empty"><div class="big">' + pic('gift', 'wfp') + '</div><div>' + esc(t('chooseLater')) + '</div></div>';
      if (mode === 'staff') h += '<div class="controls"><button class="btn small" data-a="openChoice" ' + scopeAttrs(sc) + '>' + esc(t('chooseNow')) + '</button></div>';
    } else {
      h += '<button class="wf-empty" style="width:100%;background:none" data-a="openChoice" ' + scopeAttrs(sc) + '><div class="big">' + pic('ask', 'wfp') + '</div><div style="font-size:20px;font-weight:700;color:var(--ink)">' + esc(t('chooseWork')) + '</div></button>';
    }
    return h + '</div>';
  }
  function statePanel(sc, info, mode) {
    var b = info.r.board, isGroup = info.r.kind !== 'learner';
    if (b.status === 'complete') {
      var msg = info.sel ? t('isReady', { item: tx(info.sel.label) }) : t('chooseReward');
      return '<div class="state ready" role="status">' + pic('check', 'si') + '<span>' + esc(isGroup ? t('weDidIt') : tv('didIt')) + ' ' + esc(msg) +
        (mode === 'staff' ? '<br><small style="font-weight:400">' + esc(t('availableNow')) + '</small>' : '') + '</span></div>';
    }
    if (b.status === 'delivered' && info.sel) {
      return '<div class="state done" role="status">' + pic('star', 'si') + '<span>' + esc(t('enjoy', { item: tx(info.sel.label) })) +
        (mode === 'staff' && b.deliveredAt ? '<br><small style="font-weight:400">' + esc(t('deliveredAt', { time: fmtTime(b.deliveredAt) })) + '</small>' : '') + '</span></div>';
    }
    return '';
  }
  function staffControls(sc, info, opts) {
    opts = opts || {};
    var b = info.r.board, h = '<div class="controls">';
    if (b.status === 'earning') {
      if (info.r.kind !== 'shared') h += '<button class="award" data-a="award" ' + scopeAttrs(sc) + '><span class="plus" aria-hidden="true">＋</span>' + esc(t('giveToken')) + '</button>';
      h += holdBtn('undo', t('holdUndo'), scopeAttrs(sc));
    } else if (b.status === 'complete') {
      if (info.sel) h += '<button class="btn go" style="min-height:72px;font-size:20px" data-a="deliver" ' + scopeAttrs(sc) + '>✓ ' + esc(t('confirmGiven', { item: tx(info.sel.label) })) + '</button>';
      else h += '<button class="btn primary" style="min-height:72px" data-a="openChoice" ' + scopeAttrs(sc) + '>' + esc(t('needChoice')) + '</button>';
      h += holdBtn('undo', t('holdUndo'), scopeAttrs(sc));
    } else if (b.status === 'delivered') {
      if (info.sel && info.sel.duration) h += '<button class="btn blue" data-a="timer" ' + scopeAttrs(sc) + '>⏱ ' + esc(t('startTimer', { m: info.sel.duration })) + '</button>';
      h += '<button class="btn primary" style="min-height:72px;font-size:20px" data-a="newBoard" ' + scopeAttrs(sc) + '>↻ ' + esc(t('newBoard')) + '</button>';
    }
    return h + '</div>';
  }
  function goalBlock(info) {
    var r = info.r;
    if (r.kind === 'learner') {
      var g = r.learner.goal || {};
      var gi = g.image ? '<img alt="" src="' + g.image + '">' : window.ATPics.svg(g.pic || 'goal');
      return '<div class="goal"><span class="gi" aria-hidden="true">' + gi + '</span><span><span class="gl">' + esc(t('goalLabel')) + '</span><br><span class="gt">' + esc(tx(g.text)) + '</span></span></div>';
    }
    var lbl = r.kind === 'team' ? t('teamBoard') : t('sharedGoal');
    return '<div class="goal"><span class="gi" aria-hidden="true">' + window.ATPics.svg(r.kind === 'team' ? 'group' : 'goal') + '</span><span><span class="gl">' + esc(tx(r.group.name)) + '</span><br><span class="gt">' + esc(lbl) + '</span></span></div>';
  }
  function trayBlock(sc, info, mode) {
    var p = info.p, k = fxKey(boardScope(sc));
    var icons = C.slotIcons(S, boardScope(sc), mode === 'staff' ? 'staff' : 'display');
    var newIndex = ui.fx ? (ui.fx.bkey === k ? ui.fx.bidx : ui.fx.key === k ? ui.fx.index : -1) : -1;
    var full = p.status === 'complete' && ui.fx && ui.fx.bkey === k && ui.fx.completed;
    var left = p.target - Math.min(p.earned, p.target);
    var vis = info.themeId ? themeSvg(info.themeId, p.earned, p.target, { newIdx: newIndex, animateDone: full }) : tray(p.earned, p.target, info.style, { newIndex: newIndex, full: full, icons: icons });
    return vis +
      '<p class="count">' + esc(t('ofN', { e: Math.min(p.earned, p.target), t: p.target })) + (p.status === 'earning' && left > 0 ? '<small>' + esc(t('tokensAway', { n: left })) + '</small>' : '') + '</p>';
  }
  function boardBody(sc, mode) {
    var info = boardInfo(sc);
    if (!info) return '';
    var right = '<div class="panel">' + goalBlock(info) + trayBlock(sc, info, mode) + statePanel(sc, info, mode);
    if (info.r.kind === 'team') right += teamNoticed(info.r.group, mode);
    if (mode === 'staff') {
      if (info.r.kind === 'team') right += teamChips(info.r.group);
      right += staffControls(sc, info);
    }
    right += '</div>';
    return '<div class="board">' + wfPanel(sc, info, mode) + right + '</div>';
  }
  function teamChips(g) {
    if (g.board.status !== 'earning') return '';
    var h = '';
    {
      var who = ui.teamWho[g.id] || '';
      h += '<p class="private" style="margin:16px 0 6px">' + esc(t('whoEarned')) + '</p><div class="chips" role="group">' +
        '<button class="chip" data-a="teamWho" data-g="' + esc(g.id) + '" data-l="" aria-pressed="' + (who === '') + '">' + esc(t('wholeGroup')) + '</button>' +
        g.memberIds.map(function (id) {
          var l = C.findLearner(S, id);
          if (!l) return '';
          return '<button class="chip" data-a="teamWho" data-g="' + esc(g.id) + '" data-l="' + esc(id) + '" aria-pressed="' + (who === id) + '">' + esc(l.name) + '</button>';
        }).join('') + '</div>';
    }
    return h + exampleChips(g);
  }
  function exampleChips(g) {
    var cur = ui.teamExample[g.id] == null ? 0 : ui.teamExample[g.id];
    if (!g.examples.length) return '';
    return '<div class="chips" style="margin-top:16px" role="group">' + g.examples.map(function (ex, i) {
      return '<button class="chip" data-a="teamEx" data-g="' + esc(g.id) + '" data-i="' + i + '" aria-pressed="' + (cur === i) + '">' + esc(tx(ex)) + '</button>';
    }).join('') + '<button class="chip" data-a="teamEx" data-g="' + esc(g.id) + '" data-i="-1" aria-pressed="' + (cur === -1) + '">' + esc(t('noExample')) + '</button></div>';
  }
  function teamNoticed(g, mode) {
    var notes = [];
    for (var i = S.log.length - 1; i >= 0 && notes.length < 3; i--) {
      var e = S.log[i];
      if (e.groupId === g.id && e.cycle === g.board.cycle && e.kind === 'award' && e.note) {
        var lbl = e.note;
        g.examples.forEach(function (ex) { if (C.txt(ex, 'en') === e.note) lbl = tx(ex); });
        if (notes.indexOf(lbl) === -1) notes.push(lbl);
      }
    }
    if (!notes.length) return '';
    return '<p class="noticed">' + esc(t('noticed')) + ' ' + notes.map(esc).join(' · ') + '</p>';
  }

  /* ---------------- learner board (staff) ---------------- */
  function viewBoard() {
    var l = C.findLearner(S, ui.route.id);
    if (!l) return '<p>' + esc(t('noLearners')) + '</p>';
    var sc = { type: 'learner', id: l.id };
    var back = ui.route.from ? '<button class="btn small" data-a="openGroup" data-id="' + esc(ui.route.from) + '">' + esc(t('back')) + '</button>' : '<button class="btn small" data-a="nav" data-to="home">' + esc(t('back')) + '</button>';
    return '<div class="boardhead">' + back + avatar(l, 'lg') + '<span class="nm">' + esc(l.name) + '</span><span class="spacer"></span>' +
      '<button class="btn small" data-a="lv" ' + scopeAttrs(sc) + '>⤢ ' + esc(t('learnerView')) + '</button>' +
      '<button class="btn small" data-a="editLearner" data-id="' + esc(l.id) + '">' + esc(t('edit')) + '</button>' +
      '<button class="btn small warn" data-a="clearBoard" ' + scopeAttrs(sc) + '>' + esc(t('clearBoard')) + '</button></div>' + boardBody(sc, 'staff');
  }

  /* ---------------- groups (staff) ---------------- */
  function viewGroup() {
    var g = C.findGroup(S, ui.route.id);
    if (!g) return '<p>' + esc(t('noGroups')) + '</p>';
    var head = '<div class="boardhead"><button class="btn small" data-a="nav" data-to="home">' + esc(t('back')) + '</button><span><span class="nm">' + esc(tx(g.name)) + '</span><br><span class="tag">' + esc(t('arr_' + g.type)) + '</span></span><span class="spacer"></span>' +
      '<button class="btn small" data-a="lv" data-st="' + (g.type === 'individual' ? 'indiv' : g.type) + '" data-g="' + esc(g.id) + '">⤢ ' + esc(t('groupDisplay')) + '</button>' +
      '<button class="btn small" data-a="editGroup" data-id="' + esc(g.id) + '">' + esc(t('editMembers')) + '</button>' +
      (g.type !== 'individual' ? '<button class="btn small warn" data-a="clearBoard" data-st="' + g.type + '" data-g="' + esc(g.id) + '">' + esc(t('clearBoard')) + '</button>' : '') + '</div>';
    if (g.type === 'individual') return head + '<p class="lede">' + esc(t('arrd_individual')) + '</p>' + indivCards(g, 'staff');
    if (g.type === 'team') return head + boardBody({ type: 'team', groupId: g.id }, 'staff');
    return head + sharedStaff(g);
  }
  function indivCards(g, mode) {
    return '<div class="gcards">' + g.memberIds.map(function (id) {
      var l = C.findLearner(S, id);
      if (!l) return '';
      var sc = { type: 'learner', id: l.id }, info = boardInfo(sc), p = info.p, k = fxKey(sc);
      var newIndex = ui.fx && ui.fx.key === k ? ui.fx.index : -1;
      var act = '';
      if (mode === 'staff') {
        if (p.status === 'earning') act = '<button class="award" data-a="award" ' + scopeAttrs(sc) + '><span class="plus" aria-hidden="true">＋</span>' + esc(t('giveToken')) + '</button>';
        else if (p.status === 'complete') act = info.sel ? '<button class="btn go" data-a="deliver" ' + scopeAttrs(sc) + '>✓ ' + esc(t('confirmGiven', { item: tx(info.sel.label) })) + '</button>' : '<button class="btn primary" data-a="openChoice" ' + scopeAttrs(sc) + '>' + esc(t('needChoice')) + '</button>';
        else act = '<button class="btn primary" data-a="newBoard" ' + scopeAttrs(sc) + '>↻ ' + esc(t('newBoard')) + '</button>';
        act += '<div class="row">' + holdBtn('undo', t('holdUndo'), scopeAttrs(sc), 'small') + '<button class="btn small" data-a="openBoard" data-id="' + esc(l.id) + '" data-from="' + esc(g.id) + '">' + esc(t('openBoard')) + '</button><button class="btn small" data-a="lv" ' + scopeAttrs(sc) + ' data-from="' + esc(g.id) + '">⤢ ' + esc(t('fullScreen')) + '</button></div>';
      }
      var wf = info.sel ? rTag(info.sel) : '';
      return '<div class="gcard"><div class="row">' + avatar(l) + '<div><div class="t" style="font-weight:700;font-size:20px">' + esc(l.name) + '</div><div class="s" style="color:var(--muted);font-size:15px">' + esc(tx(l.goal.text)) + '</div></div></div>' +
        themeSvg(themeOf(l), p.earned, p.target, { newIdx: newIndex, small: true, animateDone: !!(ui.fx && ui.fx.key === k && ui.fx.completed) }) + '<div class="row">' + statusTag(p) + wf + '</div>' + act + '</div>';
    }).join('') + '</div>';
  }
  function sharedStaff(g) {
    var sc = { type: 'shared', groupId: g.id }, info = boardInfo(sc);
    var rows = g.memberIds.map(function (id) {
      var l = C.findLearner(S, id), c = g.board.contrib[id];
      if (!l || !c) return '';
      var lsc = { type: 'shared', groupId: g.id, learnerId: id }, k = fxKey(lsc);
      var met = c.earned >= c.target;
      var btn = g.board.status === 'earning' ? (met ? '<span class="tag ready">✓ ' + esc(t('met')) + '</span>' : '<button class="award" style="min-height:60px;min-width:150px;font-size:18px" data-a="award" ' + scopeAttrs(lsc) + '><span class="plus" aria-hidden="true">＋</span>' + esc(t('giveToken')) + '</button>') : '';
      return '<div class="contrib">' + avatar(l) + '<div><div style="font-weight:700">' + esc(l.name) + ' <span style="font-weight:400;color:var(--muted)">' + esc(t('ofN', { e: Math.min(c.earned, c.target), t: c.target })) + '</span></div>' +
        tray(c.earned, c.target, g.tokenFill === 'group' ? g.tokenStyle : l.tokenStyle, { mini: true, newIndex: ui.fx && ui.fx.key === k ? ui.fx.index : -1 }) +
        '<div class="stepper" style="margin-top:6px"><button data-a="contribTarget" data-g="' + esc(g.id) + '" data-l="' + esc(id) + '" data-d="-1" aria-label="−">−</button><output>' + c.target + '</output><button data-a="contribTarget" data-g="' + esc(g.id) + '" data-l="' + esc(id) + '" data-d="1" aria-label="+">+</button></div></div>' + btn + '</div>';
    }).join('');
    var right = '<div class="panel">' + goalBlock(info) + trayBlock(sc, info, 'staff') + statePanel(sc, info, 'staff') + staffControls(sc, info) + '</div>';
    return '<div class="board">' + wfPanel(sc, info, 'staff') + right + '</div>' +
      '<div class="panel" style="margin-top:22px"><h3>' + esc(t('contribTargets')) + '</h3><p class="private">' + esc(t('privateNote')) + '</p>' + rows + '</div>';
  }

  /* ---------------- learner view (full screen) ---------------- */
  function viewLV() {
    var sc = ui.route.scope, h = '<div class="lv">';
    if (sc.type === 'learner') {
      if (!C.findLearner(S, sc.id)) return '';
      h += lvBoard(sc);
    } else if (sc.type === 'indiv') {
      var g = C.findGroup(S, sc.groupId);
      if (!g) return '';
      h += '<div class="boardhead"><span class="nm">' + esc(tx(g.name)) + '</span></div>' + indivCards(g, 'learner');
    } else {
      h += lvBoard(sc);
    }
    h += '</div><button class="staffcorner" data-hold="sheet" data-ms="1000"><span class="fill"></span>' + esc(t('holdStaff')) + '</button>';
    if (ui.sheetOpen) h += staffSheet(sc);
    return h;
  }
  /* Full-screen board: the picture fills the screen, the reward sits in the top corner. */
  function rewardCorner(sc, info) {
    var b = info.r.board, label = info.r.kind === 'learner' ? tv('workingFor') : t('weWorkingFor');
    if (info.sel) {
      var can = b.status !== 'delivered';
      return '<button class="rcorner' + (b.status === 'complete' ? ' ready' : '') + '" ' + (can ? 'data-a="openChoice" ' + scopeAttrs(sc) : 'disabled') + '><span class="rl">' + esc(label) + '</span>' + rIcon(info.sel, 'rc-ic') + '<span class="rn">' + esc(tx(info.sel.label)) + '</span></button>';
    }
    if (info.timing === 'after' && b.status === 'earning') return '<div class="rcorner wait"><span class="rl">' + esc(label) + '</span>' + pic('gift', 'rc-ic') + '<span class="rn">' + esc(t('chooseLater')) + '</span></div>';
    return '<button class="rcorner ask" data-a="openChoice" ' + scopeAttrs(sc) + '><span class="rl">' + esc(label) + '</span>' + pic('ask', 'rc-ic') + '<span class="rn">' + esc(t('chooseWork')) + '</span></button>';
  }
  function lvBoard(sc) {
    var info = boardInfo(sc);
    if (!info) return '';
    var r = info.r, b = r.board, who;
    if (r.kind === 'learner') {
      var g = r.learner.goal || {}, gi = g.image ? '<img alt="" src="' + g.image + '">' : window.ATPics.svg(g.pic || 'goal');
      who = avatar(r.learner, 'lg') + '<span><span class="nm">' + esc(r.learner.name) + '</span>' + (tx(g.text) ? '<span class="lvgoal"><span class="gi" aria-hidden="true">' + gi + '</span>' + esc(tx(g.text)) + '</span>' : '') + '</span>';
    } else {
      who = '<span class="avatar lg grp" aria-hidden="true">' + window.ATPics.svg(r.kind === 'team' ? 'group' : 'goal') + '</span><span><span class="nm">' + esc(tx(r.group.name)) + '</span><span class="lvgoal">' + esc(r.kind === 'team' ? t('teamBoard') : t('sharedGoal')) + '</span></span>';
    }
    var stage = trayBlock(sc, info, 'learner');
    stage += statePanel(sc, info, 'learner');
    if (r.kind === 'team') stage += teamNoticed(r.group, 'learner');
    return '<div class="lvtop"><div class="lvwho">' + who + '</div>' + rewardCorner(sc, info) + '</div><div class="lvstage' + (b.status !== 'earning' ? ' done' : '') + '">' + stage + '</div>';
  }
  function goFullscreen() {
    var d = document.documentElement, fn = d.requestFullscreen || d.webkitRequestFullscreen;
    if (fn && !document.fullscreenElement && !document.webkitFullscreenElement) { try { var p = fn.call(d); if (p && p.catch) p.catch(function () {}); } catch (e) { /* not allowed here */ } }
  }
  function leaveFullscreen() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn && (document.fullscreenElement || document.webkitFullscreenElement)) { try { var p = fn.call(document); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ } }
  }
  function staffSheet(sc) {
    var h = '<div class="sheet" role="dialog" aria-label="' + esc(t('staffControls')) + '"><h3>' + esc(t('staffControls')) + '<button class="btn small" data-a="exitLV">' + esc(t('exitLV')) + '</button></h3>';
    if (sc.type === 'indiv') {
      var g = C.findGroup(S, sc.groupId);
      h += '<div class="list">' + g.memberIds.map(function (id) {
        var l = C.findLearner(S, id);
        if (!l) return '';
        var lsc = { type: 'learner', id: id }, info = boardInfo(lsc);
        return '<div class="item"><span class="grow t">' + esc(l.name) + ' · ' + esc(t('ofN', { e: Math.min(info.p.earned, info.p.target), t: info.p.target })) + '</span>' + staffControls(lsc, info).replace('class="controls"', 'class="controls" style="margin:0"') + '</div>';
      }).join('') + '</div>';
    } else if (sc.type === 'shared') {
      var gg = C.findGroup(S, sc.groupId), info2 = boardInfo(sc);
      if (gg.board.status === 'earning') {
        h += '<div class="chips">' + gg.memberIds.map(function (id) {
          var l = C.findLearner(S, id), c = gg.board.contrib[id];
          if (!l || !c) return '';
          var met = c.earned >= c.target;
          return '<button class="chip" data-a="award" ' + scopeAttrs({ type: 'shared', groupId: gg.id, learnerId: id }) + (met ? ' disabled' : '') + '>＋ ' + esc(l.name) + ' (' + Math.min(c.earned, c.target) + '/' + c.target + ')</button>';
        }).join('') + '</div>';
      }
      h += staffControls(sc, info2);
    } else {
      var info = boardInfo(sc);
      if (info.r.kind === 'team') h += teamChips(info.r.group);
      h += staffControls(sc, info);
    }
    return h + '</div>';
  }

  /* ---------------- start a board (staff) ---------------- */
  function startDefaults(l) {
    var b = l.board, sel = b.status === 'earning' && b.selectedId && C.findReinforcer(S, b.selectedId) ? b.selectedId : '';
    return { lid: l.id, theme: themeOf(l), target: l.target, rid: sel || (l.choiceTiming === 'after' ? '' : (l.reinforcerIds[0] || '')), offer: l.choiceTiming === 'both', libCat: 'play', libOpen: false };
  }
  function stepHead(n, label) { return '<h2 class="stephead"><span class="stepnum">' + n + '</span>' + esc(label) + '</h2>'; }
  function libGrid(action, cur, withNone, set) {
    var items = (set || window.ATPics.list).map(function (it) {
      var nm = lang() === 'de' ? it.de : it.en;
      return '<button type="button" class="libitem" data-a="' + action + '" data-p="' + it.id + '" aria-pressed="' + (cur === it.id) + '" aria-label="' + esc(nm) + '">' + pic(it.id, 'li') + '<span>' + esc(nm) + '</span></button>';
    }).join('');
    if (withNone) items = '<button type="button" class="libitem" data-a="' + action + '" data-p="" aria-pressed="' + (!cur) + '"><span class="pic li none"></span><span>' + esc(t('noPicture')) + '</span></button>' + items;
    return '<div class="libgrid">' + items + '</div>';
  }
  function picItem(id) { return window.ATPics.rewards.concat(window.ATPics.list).filter(function (x) { return x.id === id; })[0] || null; }
  function viewStart() {
    var st = ui.start || (ui.start = { lid: '' }), l = st.lid ? C.findLearner(S, st.lid) : null;
    var h = '<div class="row"><button class="btn small" data-a="nav" data-to="home">' + esc(t('back')) + '</button><h1>' + esc(t('startBoard')) + '</h1></div><p class="lede">' + esc(t('startLede')) + '</p><div class="form startform">';
    h += '<section class="panel">' + stepHead(1, t('stWho')) + '<div class="whopick">' + S.learners.map(function (x) {
      return '<button type="button" data-a="startWho" data-id="' + esc(x.id) + '" aria-pressed="' + (st.lid === x.id) + '">' + avatar(x) + '<span>' + esc(x.name) + '</span></button>';
    }).join('') + '</div><div class="row quickadd"><input type="text" id="qa-name" maxlength="24" autocomplete="off" placeholder="' + esc(t('stNewName')) + '" aria-label="' + esc(t('stNewName')) + '"><button type="button" class="btn" data-a="startAddLearner">＋ ' + esc(t('stAddLearner')) + '</button></div><p class="hint">' + esc(t('nameHint')) + '</p></section>';
    if (!l) return h + '</div>';
    var TH = window.ATThemes;
    h += '<section class="panel">' + stepHead(2, t('stBoard'));
    TH.families.forEach(function (f) {
      h += '<p class="lab" style="margin:6px 0 4px">' + esc(lang() === 'de' ? f.de : f.en) + '</p><div class="themepick">';
      TH.order.filter(function (id) { return TH.themes[id].fam === f.id; }).forEach(function (id) {
        h += '<button type="button" data-a="startSet" data-f="theme" data-v="' + id + '" aria-pressed="' + (st.theme === id) + '">' + TH.render(id, 5, 3, { reduced: true }) + '<span>' + esc(themeName(id)) + '</span></button>';
      });
      h += '</div>';
    });
    h += '</section>';
    h += '<section class="panel">' + stepHead(3, t('stTokens')) + '<div class="tokrow"><div>' + pickAct('startSet', 'target', [1, 3, 5, 10], st.target) +
      '<div class="stepper" style="margin-top:12px"><button type="button" data-a="startStep" data-d="-1" aria-label="−">−</button><output>' + st.target + '</output><button type="button" data-a="startStep" data-d="1" aria-label="+">+</button></div></div>' +
      '<div class="tokprevbig">' + themeSvg(st.theme, Math.min(2, st.target - 1), st.target, { small: true }) + '</div></div></section>';
    var menu = C.allowedReinforcers(S, { type: 'learner', id: l.id }, false);
    if (st.rid && !menu.some(function (x) { return x.id === st.rid; })) { var extra = C.findReinforcer(S, st.rid); if (extra) menu.push(extra); }
    h += '<section class="panel">' + stepHead(4, tv('workingFor')) + '<div class="menu">' + menu.map(function (x) {
      return '<button type="button" class="choice" data-a="startSet" data-f="rid" data-v="' + esc(x.id) + '" aria-pressed="' + (st.rid === x.id) + '">' + (st.rid === x.id ? '<span class="tick">✓</span>' : '') + rIcon(x, 'ci') + '<span class="cl">' + esc(tx(x.label)) + '</span></button>';
    }).join('') +
      '<button type="button" class="choice" data-a="startSet" data-f="rid" data-v="" aria-pressed="' + (!st.rid) + '">' + (!st.rid ? '<span class="tick">✓</span>' : '') + pic('gift', 'ci') + '<span class="cl" style="font-size:16px">' + esc(t('stNoReward')) + '</span></button></div>';
    if (st.rid) h += '<label class="check" style="margin-top:14px;max-width:560px"><input type="checkbox" data-start-offer="1"' + (st.offer ? ' checked' : '') + '>' + esc(t('stOffer')) + '</label>';
    h += '<div class="row" style="margin-top:14px"><button type="button" class="btn small" data-a="startLibToggle" aria-expanded="' + !!st.libOpen + '">' + (st.libOpen ? '▾ ' : '▸ ') + esc(t('stMore')) + '</button><button type="button" class="btn small" data-a="startOwn">＋ ' + esc(t('stOwn')) + '</button></div>';
    if (st.libOpen) h += '<p class="hint" style="margin-top:10px">' + esc(t('stLibHint')) + '</p>' + libGrid('startLib', '', false, window.ATPics.rewards);
    h += '</section>';
    h += (ui.formErr ? '<p class="err" role="alert" style="text-align:left">' + esc(ui.formErr) + '</p>' : '') +
      '<div class="row"><button class="btn primary startgo" data-a="startGo">⤢ ' + esc(t('stGo')) + '</button><button class="btn" data-a="nav" data-to="home">' + esc(t('cancel')) + '</button></div></div>';
    return h;
  }
  function pickAct(action, field, options, current) {
    return '<div class="pick" role="group">' + options.map(function (v) {
      return '<button type="button" class="txt" data-a="' + action + '" data-f="' + field + '" data-v="' + v + '" aria-pressed="' + (String(current) === String(v)) + '">' + v + '</button>';
    }).join('') + '</div>';
  }

  /* ---------------- setup: learners ---------------- */

  function viewLearners() {
    return '<div class="row"><h1>' + esc(t('learners')) + '</h1><span class="spacer"></span><button class="btn primary" data-a="editLearner">＋ ' + esc(t('newLearner')) + '</button></div>' +
      '<div class="list" style="margin-top:14px">' + S.learners.map(function (l) {
        var p = C.progress(S, { type: 'learner', id: l.id });
        return '<div class="item">' + avatar(l) + '<div class="grow"><div class="t">' + esc(l.name) + '</div><div class="s">' + esc(tx(l.goal.text)) + ' · ' + esc(themeName(themeOf(l)) + ' · ' + l.target) + ' · ' + esc(t(timingKey(l.choiceTiming))) + '</div></div>' + statusTag(p) +
          '<button class="btn small" data-a="openBoard" data-id="' + esc(l.id) + '">' + esc(t('openBoard')) + '</button><button class="btn small" data-a="editLearner" data-id="' + esc(l.id) + '">' + esc(t('edit')) + '</button><button class="btn small warn" data-a="delLearner" data-id="' + esc(l.id) + '">' + esc(t('del')) + '</button></div>';
      }).join('') + '</div>';
  }
  function pick(field, options, current, isText) {
    return '<div class="pick" role="group">' + options.map(function (o) {
      var val = typeof o === 'object' ? o.v : o, lab = typeof o === 'object' ? o.l : o;
      return '<button type="button" class="' + (isText ? 'txt' : '') + '" data-a="pick" data-f="' + field + '" data-v="' + esc(val) + '" aria-pressed="' + (String(current) === String(val)) + '">' + esc(lab) + '</button>';
    }).join('') + '</div>';
  }
  function tokenPicker(current) {
    var cat = ui.tokenCat, lib = C.TOKEN_LIBRARY, curIcon = C.tokenIcon(current);
    var tabs = lib.map(function (c) {
      return '<button type="button" class="txt" data-a="tokenCat" data-v="' + c.id + '" aria-pressed="' + (cat === c.id) + '">' + esc(c.items[0]) + ' ' + esc(lang() === 'de' ? c.de : c.en) + '</button>';
    }).join('');
    var c = lib.filter(function (x) { return x.id === cat; })[0] || lib[0];
    var grid = c.items.map(function (e) {
      return '<button type="button" data-a="pick" data-f="tokenStyle" data-v="' + esc(e) + '" aria-pressed="' + (curIcon === e) + '">' + esc(e) + '</button>';
    }).join('');
    return '<div class="tokpick"><div class="tokprev" aria-live="polite"><span class="well on"><span class="ic">' + esc(curIcon) + '</span></span><span class="well on"><span class="ic">' + esc(curIcon) + '</span></span><span class="well"><span class="ic">' + esc(curIcon) + '</span></span><span>' + esc(t('tokenPreview')) + '</span></div>' +
      '<div class="pick tabs" role="tablist">' + tabs + '</div><div class="pick tokgrid">' + grid + '</div></div>';
  }
  function themePicker(cur) {
    var TH = window.ATThemes, h = '<div class="tokpick">';
    TH.families.forEach(function (f) {
      h += '<p class="lab" style="margin:4px 0 0">' + esc(lang() === 'de' ? f.de : f.en) + '</p><div class="themepick">';
      TH.order.filter(function (id) { return TH.themes[id].fam === f.id; }).forEach(function (id) {
        h += '<button type="button" data-a="pick" data-f="theme" data-v="' + id + '" aria-pressed="' + (cur === id) + '">' + TH.render(id, 5, 3, { reduced: true }) + '<span>' + esc(themeName(id)) + '</span></button>';
      });
      h += '</div>';
    });
    return h + '<p class="hint">' + esc(t('themeHint')) + '</p></div>';
  }
  function themeField(d) {
    d.tokenType = 'theme'; if (!d.theme) d.theme = C.DEFAULT_THEME;
    return '<div class="field"><span class="lab">' + esc(t('stBoard')) + '</span>' + themePicker(d.theme) + '</div>';
  }
  function upload(field, current) {
    return '<div class="row" style="margin-top:8px">' + (current ? '<img class="thumb" alt="" src="' + current + '"><button type="button" class="btn small" data-a="clearImg" data-f="' + field + '">' + esc(t('removePhoto')) + '</button>' : '') +
      '<label class="btn small" style="cursor:pointer">' + esc(t('uploadPhoto')) + '<input type="file" accept="image/*" class="sr" data-upload="' + field + '"></label></div>';
  }
  function reinforcerChecks(selected, onlyGroup) {
    var list = S.reinforcers.slice().sort(function (a, b) { return (onlyGroup ? (b.group - a.group) : (a.group - b.group)); });
    return '<div class="checks">' + list.map(function (r) {
      return '<label class="check"><input type="checkbox" data-check="reinforcerIds" value="' + esc(r.id) + '"' + (selected.indexOf(r.id) !== -1 ? ' checked' : '') + '>' + rIcon(r, 'ck') +
        '<span>' + esc(tx(r.label)) + (r.available ? '' : ' <small>(' + esc(t('notAvailable')) + ')</small>') + '</span></label>';
    }).join('') + '</div>';
  }
  function viewLearnerEdit() {
    var d = ui.draft;
    var targets = [1, 3, 5, 10];
    return '<div class="row"><button class="btn small" data-a="nav" data-to="learners">' + esc(t('back')) + '</button><h1>' + esc(d._new ? t('newLearner') : t('editLearner')) + '</h1></div>' +
      '<div class="form" style="margin-top:14px">' +
      '<div class="field"><label for="f-name">' + esc(t('nameLabel')) + '</label><input id="f-name" type="text" maxlength="24" data-f="name" value="' + esc(d.name) + '" autocomplete="off"><p class="hint">' + esc(t('nameHint')) + '</p></div>' +
      '<div class="field"><span class="lab">' + esc(t('avatarLabel')) + '</span><div class="row">' + avatar(d, 'lg') + '<span class="hint" style="margin:0">' + esc(t('avatarHint')) + '</span></div>' + upload('avatarImage', d.avatarImage) + '</div>' +
      themeField(d) +
      '<div class="field"><span class="lab">' + esc(t('targetLabel')) + '</span><div class="row">' + pick('target', targets, d.target, true) +
      '<label style="display:flex;align-items:center;gap:8px;font-weight:400">' + esc(t('customLabel')) + '<input type="number" min="1" max="30" inputmode="numeric" data-f="target" value="' + esc(d.target) + '" style="width:100px"></label></div></div>' +
      '<div class="field"><label for="f-goal">' + esc(t('goalText')) + '</label><input id="f-goal" type="text" maxlength="60" data-f="goalText" value="' + esc(d._goalText) + '"><p class="hint">' + esc(t('goalHint')) + '</p></div>' +
      '<div class="field"><span class="lab">' + esc(t('goalIcon')) + '</span>' + libGrid('goalPic', d.goal.image ? 'x' : (d.goal.pic || ''), true) + upload('goalImage', d.goal.image) + '</div>' +
      '<div class="field"><span class="lab">' + esc(t('timingLabel')) + '</span><div class="radio-cards">' +
      '<label><input type="radio" name="timing" data-radio="choiceTiming" value="before"' + (d.choiceTiming === 'before' ? ' checked' : '') + '><b>' + esc(t('timingBefore')) + '</b><span>' + esc(t('timingBeforeD')) + '</span></label>' +
      '<label><input type="radio" name="timing" data-radio="choiceTiming" value="after"' + (d.choiceTiming === 'after' ? ' checked' : '') + '><b>' + esc(t('timingAfter')) + '</b><span>' + esc(t('timingAfterD')) + '</span></label>' +
      '<label><input type="radio" name="timing" data-radio="choiceTiming" value="both"' + (d.choiceTiming === 'both' ? ' checked' : '') + '><b>' + esc(t('timingBoth')) + '</b><span>' + esc(t('timingBothD')) + '</span></label></div></div>' +
      '<div class="field"><span class="lab">' + esc(t('menuLabel')) + '</span>' + reinforcerChecks(d.reinforcerIds) + '<p class="hint">' + esc(t('menuHint')) + '</p></div>' +
      (ui.formErr ? '<p class="err" role="alert" style="text-align:left">' + esc(ui.formErr) + '</p>' : '') +
      '<div class="row"><button class="btn primary" data-a="saveLearner">' + esc(t('save')) + '</button><button class="btn" data-a="nav" data-to="learners">' + esc(t('cancel')) + '</button></div></div>';
  }

  /* ---------------- setup: groups ---------------- */
  function viewGroups() {
    return '<div class="row"><h1>' + esc(t('groups')) + '</h1><span class="spacer"></span><button class="btn primary" data-a="editGroup">＋ ' + esc(t('newGroup')) + '</button></div>' +
      '<div class="list" style="margin-top:14px">' + S.groups.map(function (g) {
        var names = g.memberIds.map(function (id) { var l = C.findLearner(S, id); return l ? l.name : ''; }).join(', ');
        return '<div class="item"><div class="grow"><div class="t">' + esc(tx(g.name)) + '</div><div class="s">' + esc(t('arr_' + g.type)) + ' · ' + esc(names) + '</div></div>' +
          '<button class="btn small" data-a="openGroup" data-id="' + esc(g.id) + '">' + esc(t('openBoard')) + '</button><button class="btn small" data-a="editGroup" data-id="' + esc(g.id) + '">' + esc(t('edit')) + '</button>' +
          '<button class="btn small" data-a="dupGroup" data-id="' + esc(g.id) + '">' + esc(t('duplicate')) + '</button><button class="btn small warn" data-a="delGroup" data-id="' + esc(g.id) + '">' + esc(t('del')) + '</button></div>';
      }).join('') + '</div>';
  }
  function viewGroupEdit() {
    var d = ui.draft;
    var h = '<div class="row"><button class="btn small" data-a="nav" data-to="groups">' + esc(t('back')) + '</button><h1>' + esc(d._new ? t('newGroup') : t('editGroup')) + '</h1></div><div class="form" style="margin-top:14px">' +
      '<div class="field"><label for="g-name">' + esc(t('groupName')) + '</label><input id="g-name" type="text" maxlength="40" data-f="gname" value="' + esc(d._name) + '"></div>' +
      '<div class="field"><span class="lab">' + esc(t('arrangement')) + '</span><div class="radio-cards">' +
        '<label><input type="radio" name="mode" data-radio="mode" value="independent"' + (d.type === 'individual' ? ' checked' : '') + (d._new ? '' : ' disabled') + '><b>' + esc(t('mode_independent')) + '</b><span>' + esc(t('arrd_individual')) + '</span></label>' +
        '<label><input type="radio" name="mode" data-radio="mode" value="collective"' + (d.type !== 'individual' ? ' checked' : '') + (d._new ? '' : ' disabled') + '><b>' + esc(t('mode_collective')) + '</b><span>' + esc(t('moded_collective')) + '</span></label></div>' +
        (d._new ? '' : '<p class="hint">' + esc(t('modeLocked')) + '</p>') + '</div>' +
      (d.type !== 'individual' ? '<div class="field"><span class="lab">' + esc(t('countingLabel')) + '</span><div class="radio-cards">' + ['team', 'shared'].map(function (k) {
        return '<label><input type="radio" name="arr" data-radio="type" value="' + k + '"' + (d.type === k ? ' checked' : '') + (d._new ? '' : ' disabled') + '><b>' + esc(t('count_' + k)) + '</b><span>' + esc(t('arrd_' + k)) + '</span></label>';
      }).join('') + '</div></div>' : '') +
      '<div class="field"><span class="lab">' + esc(t('members')) + '</span><div class="checks">' + S.learners.map(function (l) {
        return '<label class="check"><input type="checkbox" data-check="memberIds" value="' + esc(l.id) + '"' + (d.memberIds.indexOf(l.id) !== -1 ? ' checked' : '') + '>' + avatar(l).replace('class="avatar', 'style="width:34px;height:34px;font-size:20px" class="avatar') + '<span>' + esc(l.name) + '</span></label>';
      }).join('') + '</div></div>';
    if (d.type !== 'individual') {
      h += themeField(d);
      h += '<div class="field"><span class="lab">' + esc(t('groupMenu')) + '</span>' + reinforcerChecks(d.reinforcerIds, true) + '</div>';
    }
    if (d.type === 'team') {
      h += '<div class="field"><span class="lab">' + esc(t('teamTarget')) + '</span><div class="row">' + pick('target', [5, 10, 15, 20], d.target, true) +
        '<label style="display:flex;align-items:center;gap:8px;font-weight:400">' + esc(t('customLabel')) + '<input type="number" min="1" max="40" inputmode="numeric" data-f="target" value="' + esc(d.target) + '" style="width:100px"></label></div></div>' +
        '<div class="field"><label for="g-ex">' + esc(t('examplesLabel')) + '</label><textarea id="g-ex" data-f="examples" style="font-family:var(--font);font-size:17px">' + esc(d._examples) + '</textarea><p class="hint">' + esc(t('examplesHint')) + '</p></div>';
    }
    if (d.type === 'shared') {
      h += '<div class="field"><span class="lab">' + esc(t('contribTargets')) + '</span><p class="hint" style="margin:0 0 8px">' + esc(t('contribHint')) + '</p><div class="list">' + d.memberIds.map(function (id) {
        var l = C.findLearner(S, id), c = d.board.contrib[id];
        if (!l || !c) return '';
        return '<div class="item">' + avatar(l) + '<span class="grow t">' + esc(l.name) + '</span><div class="stepper"><button type="button" data-a="draftContrib" data-l="' + esc(id) + '" data-d="-1" aria-label="−">−</button><output>' + c.target + '</output><button type="button" data-a="draftContrib" data-l="' + esc(id) + '" data-d="1" aria-label="+">+</button></div></div>';
      }).join('') + '</div></div>';
    }
    h += (ui.formErr ? '<p class="err" role="alert" style="text-align:left">' + esc(ui.formErr) + '</p>' : '') +
      '<div class="row"><button class="btn primary" data-a="saveGroup">' + esc(t('save')) + '</button><button class="btn" data-a="nav" data-to="groups">' + esc(t('cancel')) + '</button></div></div>';
    return h;
  }

  /* ---------------- setup: reinforcers ---------------- */
  function viewReinforcers() {
    return '<div class="row"><h1>' + esc(t('reinforcers')) + '</h1><span class="spacer"></span><button class="btn primary" data-a="editR">＋ ' + esc(t('newReinforcer')) + '</button></div><p class="lede">' + esc(t('reinforcersLede')) + '</p>' +
      '<div class="menu">' + S.reinforcers.map(function (r) {
        return '<div class="choice' + (r.available ? '' : ' off') + '" style="min-height:0">' + (r.available ? '' : '<span class="tick">' + esc(t('notAvailable')) + '</span>') + rIcon(r, 'ci') + '<span class="cl">' + esc(tx(r.label)) + '</span>' +
          '<span class="cm">' + esc(t('cat_' + (r.category || 'other'))) + (r.duration ? ' · ' + esc(t('min', { m: r.duration })) : '') + (r.group ? ' · ' + esc(t('cat_group')) : '') + '</span>' +
          '<div class="row" style="justify-content:center;margin-top:6px"><button class="btn small" data-a="toggleR" data-id="' + esc(r.id) + '">' + esc(r.available ? t('markUnavailable') : t('markAvailable')) + '</button>' +
          '<button class="btn small" data-a="editR" data-id="' + esc(r.id) + '">' + esc(t('edit')) + '</button><button class="btn small warn" data-a="delR" data-id="' + esc(r.id) + '" aria-label="' + esc(t('del')) + '">' + esc(t('del')) + '</button></div></div>';
      }).join('') + '</div>';
  }
  function viewREdit() {
    var d = ui.draft;
    return '<div class="row"><button class="btn small" data-a="nav" data-to="' + (ui.afterR ? 'start' : 'reinforcers') + '">' + esc(t('back')) + '</button><h1>' + esc(d._new ? t('newReinforcer') : t('editReinforcer')) + '</h1></div><div class="form" style="margin-top:14px">' +
      '<div class="field"><label for="r-l">' + esc(t('label')) + '</label><input id="r-l" type="text" maxlength="40" data-f="rlabel" value="' + esc(d._label) + '"></div>' +
      '<div class="field"><span class="lab">' + esc(t('picture')) + '</span><div class="rprev">' + (d.image ? '<img alt="" src="' + d.image + '">' : window.ATPics.svg(d.pic || 'bubbles')) + '</div><p class="hint">' + esc(t('libHint')) + '</p>' + libGrid('rLib', d.image ? '' : d.pic, false, window.ATPics.rewards) + upload('image', d.image) + '</div>' +
      '<div class="field"><label for="r-c">' + esc(t('category')) + '</label><select id="r-c" data-f="category">' + C.CATEGORIES.map(function (c) { return '<option value="' + c + '"' + (d.category === c ? ' selected' : '') + '>' + esc(t('cat_' + c)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="r-d">' + esc(t('duration')) + '</label><input id="r-d" type="number" min="0" max="120" inputmode="numeric" data-f="duration" value="' + esc(d.duration || '') + '" style="max-width:160px"><p class="hint">' + esc(t('durationHint')) + '</p></div>' +
      '<label class="check" style="max-width:420px"><input type="checkbox" data-check="group"' + (d.group ? ' checked' : '') + '>' + esc(t('groupR')) + '</label>' +
      '<label class="check" style="max-width:420px"><input type="checkbox" data-check="available"' + (d.available ? ' checked' : '') + '>' + esc(t('available')) + '</label>' +
      (ui.formErr ? '<p class="err" role="alert" style="text-align:left">' + esc(ui.formErr) + '</p>' : '') +
      '<div class="row"><button class="btn primary" data-a="saveR">' + esc(t('save')) + '</button><button class="btn" data-a="nav" data-to="' + (ui.afterR ? 'start' : 'reinforcers') + '">' + esc(t('cancel')) + '</button></div></div>';
  }

  /* ---------------- history ---------------- */
  function histFilterObj() {
    var f = ui.histFilter;
    if (!f) return null;
    if (f.indexOf('l:') === 0) return { learnerId: f.slice(2) };
    if (f.indexOf('g:') === 0) return { groupId: f.slice(2) };
    return null;
  }
  function viewHistory() {
    var f = histFilterObj();
    var rows = S.log.filter(function (e) {
      if (!f) return true;
      if (f.learnerId) return e.learnerId === f.learnerId;
      return e.groupId === f.groupId;
    });
    var shown = rows.slice(-300).reverse();
    var opts = '<option value="">' + esc(t('filterAll')) + '</option>' + S.learners.map(function (l) { return '<option value="l:' + esc(l.id) + '"' + (ui.histFilter === 'l:' + l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('') +
      S.groups.map(function (g) { return '<option value="g:' + esc(g.id) + '"' + (ui.histFilter === 'g:' + g.id ? ' selected' : '') + '>' + esc(t('groups')) + ': ' + esc(tx(g.name)) + '</option>'; }).join('');
    var h = '<div class="row"><h1>' + esc(t('history')) + '</h1><span class="spacer"></span><select data-f="histFilter" style="width:auto;min-width:200px">' + opts + '</select>' +
      '<button class="btn blue" data-a="csv">' + esc(t('exportCSV')) + '</button><button class="btn warn" data-a="clearHist">' + esc(t('clearHistory')) + '</button></div>';
    if (!shown.length) return h + '<p class="lede" style="margin-top:16px">' + esc(t('noHistory')) + '</p>';
    var cols = ['time', 'event', 'learner', 'group', 'goal', 'tokens', 'progress', 'reinforcer', 'note'];
    h += '<p class="lede" style="margin-top:12px">' + esc(t('showing', { n: shown.length })) + '</p><div class="scroll"><table><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(t('col_' + c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      shown.map(function (e) {
        return '<tr><td>' + esc(fmtDateTime(e.ts)) + '</td><td>' + esc(t('ev_' + e.kind)) + '</td><td>' + esc(e.learnerName) + '</td><td>' + esc(e.groupName) + '</td><td>' + esc(e.goal) + '</td><td>' + (e.tokens > 0 ? '+' + e.tokens : e.tokens || '') + '</td><td>' + esc(e.progress) + '</td><td>' + esc(e.reinforcer) + '</td><td>' + esc(e.note) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return h;
  }

  /* ---------------- settings ---------------- */
  function seg(field, options, cur) {
    return pick(field, options.map(function (o) { return { v: o[0], l: o[1] }; }), cur, true);
  }
  function viewSettings() {
    var st = S.settings;
    var persistTxt = ui.persisted === true ? t('persistYes') : ui.persisted === false ? t('persistNo') : '';
    return '<h1>' + esc(t('settings')) + '</h1><div class="form" style="margin-top:14px">' +
      '<div class="field"><span class="lab">' + esc(t('language')) + '</span>' + seg('s.lang', [['en', 'English'], ['de', 'Deutsch']], st.lang) + '</div>' +
      '<div class="field"><span class="lab">' + esc(t('theme')) + '</span>' + seg('s.theme', [['young', t('theme_young')], ['older', t('theme_older')]], st.theme) + '</div>' +
      '<div class="field"><span class="lab">' + esc(t('sound')) + '</span>' + seg('s.sound', [['true', t('on')], ['false', t('off')]], String(st.sound)) + '</div>' +
      '<div class="field"><span class="lab">' + esc(t('motion')) + '</span>' + seg('s.motion', [['system', t('motion_system')], ['full', t('motion_full')], ['reduced', t('motion_reduced')]], st.motion) + '</div>' +
      '<div class="panel"><h3>' + esc(t('changePin')) + '</h3><p class="hint" style="color:var(--muted)">' + esc(t('pinNote')) + '</p><div class="row" style="align-items:flex-end">' +
      '<label style="flex:1;min-width:180px">' + esc(t('newPin')) + '<input type="password" inputmode="numeric" maxlength="8" id="pin1" autocomplete="new-password"></label>' +
      '<label style="flex:1;min-width:180px">' + esc(t('confirmPin')) + '<input type="password" inputmode="numeric" maxlength="8" id="pin2" autocomplete="new-password"></label>' +
      '<button class="btn primary" data-a="savePin">' + esc(t('save')) + '</button></div></div>' +
      '<div class="panel"><h3>' + esc(t('backupTitle')) + '</h3><p>' + esc(t('backupBody')) + '</p><div class="row"><button class="btn blue" data-a="backup">' + esc(t('exportBackup')) + '</button><button class="btn" data-a="restore">' + esc(t('restoreBackup')) + '</button></div></div>' +
      '<div class="panel"><h3>' + esc(t('dataTitle')) + '</h3><p>' + esc(t('dataBody')) + '</p><p><b>' + esc(t('storageMode_' + ui.storage)) + '</b></p>' +
      (navigator.storage && navigator.storage.persist ? '<p><button class="btn small" data-a="persist">' + esc(t('persistBtn')) + '</button></p>' : '') + (persistTxt ? '<p>' + esc(persistTxt) + '</p>' : '') + '<p class="hint" style="color:var(--muted)">' + esc(t('install')) + '</p></div>' +
      '<div class="panel"><h3>' + esc(t('practiceTitle')) + '</h3><p>' + esc(t('practiceBody')) + '</p></div>' +
      '<div class="panel"><h3>' + esc(t('limitsTitle')) + '</h3><p>' + esc(t('limitsBody')) + '</p></div>' +
      '<div><button class="btn warn" data-a="resetAll">' + esc(t('resetAll')) + '</button></div></div>';
  }

  /* ---------------- modal layer ---------------- */
  function renderLayer() {
    var h = '', m = ui.modal;
    if (m) {
      h += '<div class="overlay" data-a="' + (m.type === 'pin' || m.type === 'choice' || m.type === 'text' || m.type === 'restore' ? 'closeModal' : '') + '" data-self="1"><div class="modal' + (m.type === 'choice' ? ' wide' : '') + '" role="dialog" aria-modal="true">';
      if (m.type === 'pin') {
        var dots = '';
        for (var i = 0; i < String(S.settings.pin).length; i++) dots += '<i class="' + (i < ui.pinEntry.length ? 'on' : '') + '"></i>';
        h += '<h2>' + esc(t('pinTitle')) + '</h2><p>' + esc(t('pinHint')) + '</p><div class="pindots" aria-hidden="true">' + dots + '</div><p class="err" role="alert">' + esc(ui.pinErr) + '</p>' +
          '<div class="pinpad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(function (k) {
            if (!k) return '<span></span>';
            return '<button data-a="' + (k === '⌫' ? 'pinBack' : 'pin') + '" data-v="' + k + '" aria-label="' + (k === '⌫' ? 'Delete' : k) + '">' + k + '</button>';
          }).join('') + '</div><p class="hint" style="color:var(--muted);font-size:14px;margin-top:14px">' + esc(t('pinNote')) + '</p><div class="row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">' + esc(t('cancel')) + '</button></div>';
      } else if (m.type === 'confirm') {
        h += '<h2>' + esc(m.title) + '</h2><p>' + esc(m.body) + '</p>' + (m.word ? '<input type="text" id="confirmWord" autocomplete="off" autocapitalize="characters">' : '') +
          '<p class="err" role="alert" id="confirmErr"></p><div class="row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">' + esc(t('cancel')) + '</button><button class="btn ' + (m.danger ? 'warn' : 'primary') + '" data-a="confirmOk">' + esc(m.okLabel || t('ok')) + '</button></div>';
      } else if (m.type === 'choice') {
        h += choiceModal(m);
      } else if (m.type === 'text') {
        h += '<h2>' + esc(t('textExportTitle')) + '</h2><p>' + esc(t('textExportBody', { name: m.name })) + '</p><textarea id="exportText" readonly>' + esc(m.text) + '</textarea>' +
          '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-a="copyText">' + esc(t('copyText')) + '</button><button class="btn primary" data-a="closeModal">' + esc(t('done')) + '</button></div>';
      } else if (m.type === 'restore') {
        h += '<h2>' + esc(t('restoreTitle')) + '</h2><p>' + esc(t('restorePick')) + '</p><input type="file" accept=".json,application/json,text/plain" data-restore-file="1" style="margin-bottom:12px"><textarea id="restoreText" placeholder="{ &quot;app&quot;: &quot;adaptability-tokens&quot; … }"></textarea>' +
          '<p class="err" role="alert">' + esc(m.err || '') + '</p><div class="row" style="justify-content:flex-end"><button class="btn" data-a="closeModal">' + esc(t('cancel')) + '</button><button class="btn primary" data-a="restoreGo">' + esc(t('restoreBtn')) + '</button></div>';
      }
      h += '</div></div>';
    }
    if (ui.timer) h += timerHTML();
    $layer.innerHTML = h;
    if (m && m.type === 'confirm' && m.word) { var w = document.getElementById('confirmWord'); if (w) w.focus(); }
  }
  function choiceModal(m) {
    var sc = m.scope, r = C.resolve(S, sc);
    if (!r) return '';
    var staff = m.mode === 'staff';
    var items = C.allowedReinforcers(S, sc, staff);
    var body = items.length ? '<div class="menu">' + items.map(function (x) {
      var sel = r.board.selectedId === x.id;
      return '<button class="choice' + (x.available ? '' : ' off') + '" data-a="choose" ' + scopeAttrs(sc) + ' data-r="' + esc(x.id) + '" aria-pressed="' + sel + '"' + (x.available ? '' : ' disabled') + '>' +
        (sel ? '<span class="tick">✓ ' + esc(t('selected')) + '</span>' : (!x.available ? '<span class="tick">' + esc(t('notAvailable')) + '</span>' : '')) + rIcon(x, 'ci') +
        '<span class="cl">' + esc(tx(x.label)) + '</span>' + (x.duration ? '<span class="cm">' + esc(t('min', { m: x.duration })) + '</span>' : '') + '</button>';
    }).join('') + '</div>' : '<p>' + esc(t('noChoices')) + '</p>';
    var cur = r.board.selectedId ? C.findReinforcer(S, r.board.selectedId) : null;
    if (m.finish && cur) {
      return '<h2 style="margin:0 0 12px;text-align:center">' + esc(t('keepOrSwitch', { item: tx(cur.label) })) + '</h2>' +
        '<div class="row" style="justify-content:center;margin-bottom:16px"><button class="btn go keepbtn" data-a="closeModal">' + rIcon(cur, 'kb-ic') + ' ' + esc(t('keepIt', { item: tx(cur.label) })) + '</button></div>' + body;
    }
    var title = r.kind === 'learner' ? tv('workingFor') + '…' : t('weWorkingFor') + '…';
    return '<div class="row"><h2 style="margin:0">' + esc(title) + '</h2><span class="spacer"></span><button class="btn small" data-a="closeModal">' + esc(t('done')) + '</button></div><p class="lede" style="margin-top:6px">' + esc(t('tapToHear')) + '</p>' + body;
  }
  function timerHTML() {
    var tm = ui.timer, frac = tm.total ? Math.max(0, tm.remaining / tm.total) : 0;
    var R = 120, circ = 2 * Math.PI * R;
    return '<div class="overlay" style="z-index:70"><div class="modal timer" role="dialog" aria-modal="true" aria-label="Timer"><div style="font-size:22px;font-weight:700">' + esc(tm.icon) + ' ' + esc(tm.label) + '</div>' +
      '<svg viewBox="0 0 280 280" aria-hidden="true"><circle cx="140" cy="140" r="' + R + '" fill="none" stroke="var(--tray)" stroke-width="28"/>' +
      '<circle id="timerArc" cx="140" cy="140" r="' + R + '" fill="none" stroke="var(--blue)" stroke-width="28" stroke-linecap="round" transform="rotate(-90 140 140)" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - frac)).toFixed(1) + '"/></svg>' +
      '<div class="tt" id="timerText" role="timer">' + (tm.done ? esc(t('timeUp')) : fmtMs(tm.remaining)) + '</div>' +
      '<div class="row" style="justify-content:center;margin-top:12px">' + (tm.done ? '' : '<button class="btn" data-a="timerPause">' + esc(tm.paused ? t('resume') : t('pause')) + '</button>') +
      '<button class="btn" data-a="timerPlus">' + esc(t('plusMin')) + '</button><button class="btn primary" data-a="timerClose">' + esc(t('close')) + '</button></div></div></div>';
  }
  function fmtMs(ms) {
    var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  setInterval(function () {
    var tm = ui.timer;
    if (!tm || tm.paused || tm.done) return;
    tm.remaining = Math.max(0, tm.endAt - Date.now());
    if (tm.remaining <= 0) { tm.done = true; soundTimer(); renderLayer(); return; }
    var arc = document.getElementById('timerArc'), tt = document.getElementById('timerText');
    if (arc) { var circ = 2 * Math.PI * 120; arc.setAttribute('stroke-dashoffset', (circ * (1 - tm.remaining / tm.total)).toFixed(1)); }
    if (tt) tt.textContent = fmtMs(tm.remaining);
  }, 250);

  function confirmBox(opts) { ui.modal = Object.assign({ type: 'confirm' }, opts); renderLayer(); }

  /* ---------------- main render ---------------- */
  function render() {
    if (ui.unlockedUntil && !staffOn()) ui.unlockedUntil = 0;
    if (gated(ui.route.name) && !staffOn()) ui.route = { name: 'home' };
    document.documentElement.lang = lang();
    document.body.className = (S.settings.theme === 'older' ? 'theme-older' : 'theme-young') + (reduceMotion() ? ' reduce-motion' : '') + (ui.route.name === 'lv' ? ' learnerview' : '');
    var v = {
      home: viewHome, start: viewStart, board: viewBoard, group: viewGroup, lv: viewLV, learners: viewLearners, learnerEdit: viewLearnerEdit, groups: viewGroups, groupEdit: viewGroupEdit,
      reinforcers: viewReinforcers, reinforcerEdit: viewREdit, history: viewHistory, settings: viewSettings
    }[ui.route.name] || viewHome;
    $app.innerHTML = (ui.route.name === 'lv' ? '' : bar()) + '<main id="main">' + v() + '</main>';
    renderLayer();
    ui.fx = null;
  }

  /* ---------------- actions ---------------- */
  function doAward(sc, note) {
    var bsc = boardScope(sc);
    var before = C.progress(S, sc.type === 'shared' ? sc : bsc);
    var res = C.award(S, sc, { note: note || '' });
    if (!res.ok) { if (res.reason !== 'debounce') render(); return; }
    var idx = before.earned;
    if (sc.type === 'shared') idx = C.findGroup(S, sc.groupId).board.contrib[sc.learnerId].earned - 1;
    ui.fx = { key: fxKey(sc), index: idx, bkey: fxKey(bsc), bidx: before.earned, completed: !!res.completed };
    save();
    var info = boardInfo(bsc);
    if (res.completed) {
      celebrate(info.themeId);
      var both = info.timing === 'both' && info.sel && C.allowedReinforcers(S, bsc, false).length > 1;
      if (ui.route.name === 'lv' && (!info.sel || both)) {
        setTimeout(function () {
          var i2 = boardInfo(bsc);
          if (ui.route.name !== 'lv' || ui.modal || !i2 || i2.p.status !== 'complete') return;
          if (!i2.sel) openChoice(bsc, 'learner');
          else if (both) { ui.modal = { type: 'choice', scope: bsc, mode: 'learner', finish: true }; renderLayer(); }
        }, info.themeId && !reduceMotion() ? 3600 : 1200);
      }
    } else if (info.themeId) { window.ATSounds.setEnabled(S.settings.sound); window.ATSounds.token(info.themeId, before.earned); }
    else soundToken();
    render();
    touchSheet();
  }
  function openChoice(sc, mode) {
    ui.modal = { type: 'choice', scope: boardScope(sc), mode: mode };
    renderLayer();
  }
  function touchSheet() {
    if (!ui.sheetOpen) return;
    clearTimeout(ui.sheetT);
    ui.sheetT = setTimeout(function () { ui.sheetOpen = false; if (ui.route.name === 'lv') render(); }, 20000);
  }

  function newDraftLearner(l) {
    var d = l ? C.clone(l) : { id: 'l-' + C.uid(), name: '', avatar: null, avatarImage: null, tokenStyle: 'star', tokenType: 'theme', theme: C.DEFAULT_THEME, target: 5, goal: { text: '', pic: null, image: null }, choiceTiming: 'before', reinforcerIds: [], board: C.newBoard(), _new: true };
    d._goalText = tx(d.goal.text);
    return d;
  }
  function newDraftGroup(g) {
    var d;
    if (g) d = C.clone(g);
    else d = { id: 'g-' + C.uid(), name: '', type: 'individual', memberIds: [], _new: true };
    d._name = tx(d.name);
    ensureGroupFields(d);
    d._examples = (d.examples || []).map(tx).join('\n');
    return d;
  }
  function ensureGroupFields(d) {
    if (d.type === 'team') {
      if (!d.board || d.board.contrib) d.board = C.newBoard();
      d.target = d.target || 10; d.tokenStyle = d.tokenStyle || 'flower'; d.tokenFill = d.tokenFill || 'group';
      if (!Array.isArray(d.board.stack)) d.board.stack = []; d.reinforcerIds = d.reinforcerIds || S.reinforcers.filter(function (r) { return r.group; }).map(function (r) { return r.id; });
      d.examples = d.examples || [{ en: 'Helping a friend', de: 'Einem Freund helfen' }, { en: 'Taking turns', de: 'Abwechseln' }];
      if (!d._examples) d._examples = d.examples.map(tx).join('\n');
    } else if (d.type === 'shared') {
      if (!d.board || !d.board.contrib) d.board = C.newSharedBoard();
      d.tokenStyle = d.tokenStyle || 'rocket'; d.tokenFill = d.tokenFill || 'group'; d.defaultTarget = d.defaultTarget || 3; d.reinforcerIds = d.reinforcerIds || S.reinforcers.filter(function (r) { return r.group; }).map(function (r) { return r.id; });
      C.syncSharedMembers(S, d);
    }
  }
  function newDraftR(r) {
    var d = r ? C.clone(r) : { id: 'r-' + C.uid(), label: '', category: 'play', pic: 'bubbles', image: null, duration: 0, available: true, group: false, _new: true };
    d._label = tx(d.label);
    return d;
  }
  function keepOrText(orig, val) {
    if (orig && typeof orig === 'object' && tx(orig) === val) return orig;
    return val;
  }
  function stripDraft(d) {
    var o = C.clone(d);
    Object.keys(o).forEach(function (k) { if (k.charAt(0) === '_') delete o[k]; });
    return o;
  }

  function download(name, text, mime) {
    if (inFrame() || /claude|anthropic/i.test(location.hostname)) { ui.modal = { type: 'text', name: name, text: text }; renderLayer(); return; }
    var blob = new Blob([text], { type: mime });
    try {
      var file = new File([blob], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
        navigator.share({ files: [file], title: name }).catch(function () {});
        return;
      }
    } catch (e) { /* fall through */ }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast(t('fileSaved', { name: name }));
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function readImage(file, max) {
    max = max || 520;
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          var g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = rej; img.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  var A = {
    nav: function (el) {
      var to = el.getAttribute('data-to');
      ui.afterR = null;
      if (to === 'home') return go({ name: 'home' });
      goGated({ name: to });
    },
    lock: function () { if (staffOn()) { ui.unlockedUntil = 0; render(); toast(t('locked')); } else requireStaff(function () { render(); }); },
    lang: function () { S.settings.lang = lang() === 'de' ? 'en' : 'de'; save(); render(); },
    seenNotice: function () { commit(function () { S.settings.seenNotice = true; }); },
    openBoard: function (el) { go({ name: 'board', id: el.getAttribute('data-id'), from: el.getAttribute('data-from') || null }); },
    openGroup: function (el) { go({ name: 'group', id: el.getAttribute('data-id') }); },
    lv: function (el) {
      var sc = scopeFrom(el);
      goFullscreen();
      go({ name: 'lv', scope: sc, back: ui.route, from: el.getAttribute('data-from') || null });
      var info = sc.type !== 'indiv' ? boardInfo(sc) : null;
      if (info && info.p.status === 'complete' && !info.sel) openChoice(sc, 'learner');
    },
    exitLV: function () {
      leaveFullscreen();
      var r = ui.route, sc = r.scope;
      if (sc.type === 'learner') go(r.from ? { name: 'group', id: r.from } : { name: 'board', id: sc.id });
      else go({ name: 'group', id: sc.groupId });
    },
    award: function (el) {
      var sc = scopeFrom(el), note = '';
      if (sc.type === 'team') {
        var g = C.findGroup(S, sc.groupId), i = ui.teamExample[g.id] == null ? 0 : ui.teamExample[g.id];
        if (i >= 0 && g.examples[i]) note = C.txt(g.examples[i], 'en');
        if (g.tokenFill !== 'group' && ui.teamWho[g.id]) sc.learnerId = ui.teamWho[g.id];
      }
      doAward(sc, note);
    },
    tokenCat: function (el) { ui.tokenCat = el.getAttribute('data-v'); render(); },
    teamWho: function (el) { ui.teamWho[el.getAttribute('data-g')] = el.getAttribute('data-l') || ''; render(); touchSheet(); },
    teamEx: function (el) { ui.teamExample[el.getAttribute('data-g')] = parseInt(el.getAttribute('data-i'), 10); render(); touchSheet(); },
    openChoice: function (el) { openChoice(scopeFrom(el), ui.route.name === 'lv' ? 'learner' : 'staff'); },
    choose: function (el) {
      var sc = scopeFrom(el), rid = el.getAttribute('data-r'), rf = C.findReinforcer(S, rid);
      var res = C.select(S, sc, rid);
      if (res.ok) { if (ui.modal && ui.modal.finish) ui.modal = null; save(); render(); }
    },
    deliver: function (el) {
      var sc = scopeFrom(el);
      var res = C.confirmDelivery(S, sc);
      if (!res.ok) { render(); return; }
      save(); render(); touchSheet();
    },
    newBoard: function (el) {
      var sc = scopeFrom(el);
      if (C.startNewBoard(S, sc).ok) { save(); render(); touchSheet(); }
    },
    timer: function (el) {
      var info = boardInfo(scopeFrom(el));
      if (!info || !info.sel) return;
      var ms = info.sel.duration * 60000;
      ui.timer = { label: tx(info.sel.label), icon: '', total: ms, remaining: ms, endAt: Date.now() + ms, paused: false, done: false };
      renderLayer();
    },
    timerPause: function () {
      var tm = ui.timer; if (!tm) return;
      if (tm.paused) { tm.paused = false; tm.endAt = Date.now() + tm.remaining; } else { tm.paused = true; tm.remaining = Math.max(0, tm.endAt - Date.now()); }
      renderLayer();
    },
    timerPlus: function () {
      var tm = ui.timer; if (!tm) return;
      if (tm.done) { tm.done = false; tm.remaining = 0; tm.endAt = Date.now(); }
      tm.total += 60000; tm.remaining += 60000; tm.endAt += 60000; renderLayer();
    },
    timerClose: function () { ui.timer = null; renderLayer(); },
    clearBoard: function (el) {
      var sc = scopeFrom(el);
      requireStaff(function () {
        confirmBox({ title: t('clearBoardQ'), body: t('clearBoardBody'), okLabel: t('clearBoard').replace('…', ''), danger: true, onOk: function () { C.resetBoard(S, sc); save(); render(); } });
      });
    },
    contribTarget: function (el) {
      var g = C.findGroup(S, el.getAttribute('data-g')), lid = el.getAttribute('data-l'), d = parseInt(el.getAttribute('data-d'), 10);
      commit(function () { C.setSharedTarget(S, g.id, lid, g.board.contrib[lid].target + d); });
    },
    pin: function (el) { pinDigit(el.getAttribute('data-v')); },
    pinBack: function () { ui.pinEntry = ui.pinEntry.slice(0, -1); renderLayer(); },
    closeModal: function (el, ev) {
      if (el.getAttribute('data-self') && ev.target !== el) return;
      ui.modal = null; ui.pendingFn = null; renderLayer();
    },
    confirmOk: function () {
      var m = ui.modal;
      if (m.word) {
        var v = (document.getElementById('confirmWord').value || '').trim().toUpperCase();
        if (v !== m.word) { document.getElementById('confirmErr').textContent = t('resetAllBody', { word: m.word }); return; }
      }
      ui.modal = null; renderLayer();
      if (m.onOk) m.onOk();
    },
    /* start a board */
    startOpen: function () {
      requireStaff(function () {
        ui.start = S.learners.length === 1 ? startDefaults(S.learners[0]) : { lid: '' };
        ui.formErr = ''; go({ name: 'start' });
      });
    },
    startAddLearner: function () {
      var f = document.getElementById('qa-name'), name = ((f && f.value) || '').trim();
      if (!name) { if (f) f.focus(); return; }
      var d = newDraftLearner(null); d.name = name; delete d._new; delete d._goalText;
      var clean = stripDraft(d); clean.goal.text = '';
      commit(function () { S.learners.push(clean); ui.start = startDefaults(clean); ui.formErr = ''; });
    },
    startWho: function (el) { var l = C.findLearner(S, el.getAttribute('data-id')); if (l) { ui.start = startDefaults(l); ui.formErr = ''; render(); } },
    startSet: function (el) {
      var f = el.getAttribute('data-f'), v = el.getAttribute('data-v');
      ui.start[f] = f === 'target' ? C.clampInt(v, 1, 30, 5) : v;
      if (f === 'theme' && window.ATSounds) { window.ATSounds.setEnabled(S.settings.sound); window.ATSounds.token(v, 0); }
      render();
    },
    startStep: function (el) { ui.start.target = C.clampInt(ui.start.target + parseInt(el.getAttribute('data-d'), 10), 1, 30, 5); render(); },
    startLibToggle: function () { ui.start.libOpen = !ui.start.libOpen; render(); },
    libCat: function (el) { if (ui.route.name === 'start' && ui.start) ui.start.libCat = el.getAttribute('data-v'); else ui.libCat = el.getAttribute('data-v'); render(); },
    startLib: function (el) {
      var item = picItem(el.getAttribute('data-p'));
      if (!item) return;
      ui.afterR = { lid: ui.start.lid };
      ui.draft = newDraftR(null);
      ui.draft.pic = item.id; ui.draft._label = lang() === 'de' ? item.de : item.en; ui.draft._libObj = { en: item.en, de: item.de };
      go({ name: 'reinforcerEdit' });
      var f = document.getElementById('r-l'); if (f) { f.focus(); f.select(); }
    },
    startOwn: function () { ui.afterR = { lid: ui.start.lid }; ui.draft = newDraftR(null); go({ name: 'reinforcerEdit' }); },
    startGo: function () {
      var st = ui.start, l = st && C.findLearner(S, st.lid);
      if (!l) { ui.formErr = t('stNeedWho'); return render(); }
      var p = C.progress(S, { type: 'learner', id: l.id });
      var run = function () {
        var res = C.startSession(S, l.id, { theme: st.theme, target: st.target, reinforcerId: st.rid || null, choiceTiming: st.rid ? (st.offer ? 'both' : 'before') : 'after' });
        if (!res.ok) { ui.formErr = res.reason; return render(); }
        save(); goFullscreen();
        go({ name: 'lv', scope: { type: 'learner', id: l.id } });
      };
      if (p.earned > 0 && p.status !== 'delivered') confirmBox({ title: t('stClearQ', { name: l.name }), body: t('stClearBody', { name: l.name, e: Math.min(p.earned, p.target), t: p.target }), okLabel: t('stStart'), onOk: run });
      else run();
    },
    rLib: function (el) {
      var d = ui.draft, item = picItem(el.getAttribute('data-p'));
      if (!d || !item) return;
      d.pic = item.id; d.image = null;
      if (!(d._label || '').trim() || (d._libObj && d._label === tx(d._libObj))) { d._label = lang() === 'de' ? item.de : item.en; d._libObj = { en: item.en, de: item.de }; }
      render();
    },
    goalPic: function (el) { var d = ui.draft; if (!d) return; d.goal.pic = el.getAttribute('data-p') || null; d.goal.image = null; render(); },
    /* setup */
    editLearner: function (el) {
      var id = el.getAttribute('data-id');
      requireStaff(function () { ui.draft = newDraftLearner(id ? C.findLearner(S, id) : null); go({ name: 'learnerEdit' }); });
    },
    delLearner: function (el) {
      var l = C.findLearner(S, el.getAttribute('data-id'));
      confirmBox({ title: t('deleteQ', { name: l.name }), body: t('deleteLearnerBody'), okLabel: t('del'), danger: true, onOk: function () { C.deleteLearner(S, l.id); save(); render(); toast(t('deleted')); } });
    },
    pick: function (el) {
      var f = el.getAttribute('data-f'), v = el.getAttribute('data-v'), d = ui.draft;
      if (f.indexOf('s.') === 0) {
        var k = f.slice(2);
        S.settings[k] = v === 'true' ? true : v === 'false' ? false : v;
        save(); render();
        if (k === 'tokenSound') soundToken();
        return;
      }
      if (f === 'avatar') { d.avatar = v; d.avatarImage = null; }
      else if (f === 'goalIcon') { d.goal.icon = v; d.goal.image = null; }
      else if (f === 'icon') { d.icon = v; d.image = null; }
      else if (f === 'target') d.target = parseInt(v, 10);
      else d[f] = v;
      render();
    },
    clearImg: function (el) {
      var f = el.getAttribute('data-f'), d = ui.draft;
      if (f === 'goalImage') d.goal.image = null; else d[f] = null;
      render();
    },
    saveLearner: function () {
      var d = ui.draft;
      d.name = (d.name || '').trim();
      if (!d.name) { ui.formErr = t('nameRequired'); return render(); }
      if (!d.reinforcerIds.length) { ui.formErr = t('menuRequired'); return render(); }
      d.target = C.clampInt(d.target, 1, 30, 5);
      var orig = C.findLearner(S, d.id);
      d.goal.text = keepOrText(orig && orig.goal.text, (d._goalText || '').trim());
      var clean = stripDraft(d);
      commit(function () {
        if (orig) {
          clean.board = orig.board; // never touch progress from the editor
          S.learners[S.learners.indexOf(orig)] = clean;
        } else S.learners.push(clean);
        var sel = clean.board.selectedId;
        if (sel && clean.reinforcerIds.indexOf(sel) === -1 && clean.board.status !== 'delivered') clean.board.selectedId = null;
        C.recheck(S, { type: 'learner', id: clean.id });
        ui.route = { name: 'learners' };
      });
      toast(t('saved'));
    },
    editGroup: function (el) {
      var id = el.getAttribute('data-id');
      requireStaff(function () { ui.draft = newDraftGroup(id ? C.findGroup(S, id) : null); go({ name: 'groupEdit' }); });
    },
    dupGroup: function (el) {
      commit(function () { C.duplicateGroup(S, el.getAttribute('data-id'), { en: I.en.copySuffix, de: I.de.copySuffix }); });
    },
    delGroup: function (el) {
      var g = C.findGroup(S, el.getAttribute('data-id'));
      confirmBox({ title: t('deleteQ', { name: tx(g.name) }), body: t('deleteGroupBody'), okLabel: t('del'), danger: true, onOk: function () { S.groups = S.groups.filter(function (x) { return x.id !== g.id; }); save(); render(); toast(t('deleted')); } });
    },
    draftContrib: function (el) {
      var c = ui.draft.board.contrib[el.getAttribute('data-l')];
      c.target = C.clampInt(c.target + parseInt(el.getAttribute('data-d'), 10), 1, 20, 3);
      render();
    },
    saveGroup: function () {
      var d = ui.draft, name = (d._name || '').trim();
      if (!name) { ui.formErr = t('nameRequired'); return render(); }
      if (!d.memberIds.length) { ui.formErr = t('membersRequired'); return render(); }
      if (d.type !== 'individual' && !d.reinforcerIds.length) { ui.formErr = t('menuRequired'); return render(); }
      var orig = C.findGroup(S, d.id);
      d.name = keepOrText(orig && orig.name, name);
      if (d.type === 'team') {
        d.target = C.clampInt(d.target, 1, 40, 10);
        var oldEx = (orig && orig.examples) || [];
        d.examples = (d._examples || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
          for (var i = 0; i < oldEx.length; i++) if (tx(oldEx[i]) === s) return oldEx[i];
          return s;
        });
      }
      if (d.type === 'shared') C.syncSharedMembers(S, d);
      var clean = stripDraft(d);
      commit(function () {
        if (orig) {
          if (clean.type === 'team') clean.board = orig.board; // keep earned tokens
          if (clean.type === 'shared') {
            // keep earned counts, take new targets/membership
            Object.keys(clean.board.contrib).forEach(function (id) {
              var o = orig.board.contrib[id];
              clean.board.contrib[id].earned = o ? o.earned : 0;
            });
            clean.board.status = orig.board.status; clean.board.cycle = orig.board.cycle; clean.board.selectedId = orig.board.selectedId;
            clean.board.stack = (orig.board.stack || []).filter(function (id) { return clean.memberIds.indexOf(id) !== -1; });
          }
          S.groups[S.groups.indexOf(orig)] = clean;
        } else S.groups.push(clean);
        if (clean.type !== 'individual') C.recheck(S, { type: clean.type, groupId: clean.id });
        ui.route = { name: 'groups' };
      });
      toast(t('saved'));
    },
    editR: function (el) {
      var id = el.getAttribute('data-id');
      requireStaff(function () { ui.draft = newDraftR(id ? C.findReinforcer(S, id) : null); go({ name: 'reinforcerEdit' }); });
    },
    toggleR: function (el) { commit(function () { var r = C.findReinforcer(S, el.getAttribute('data-id')); C.setAvailability(S, r.id, !r.available); }); },
    delR: function (el) {
      var r = C.findReinforcer(S, el.getAttribute('data-id'));
      confirmBox({ title: t('deleteQ', { name: tx(r.label) }), body: t('deleteRBody'), okLabel: t('del'), danger: true, onOk: function () { C.deleteReinforcer(S, r.id); save(); render(); toast(t('deleted')); } });
    },
    saveR: function () {
      var d = ui.draft, label = (d._label || '').trim();
      if (!label) { ui.formErr = t('labelRequired'); return render(); }
      var orig = C.findReinforcer(S, d.id);
      d.label = d._libObj && tx(d._libObj) === label ? d._libObj : keepOrText(orig && orig.label, label);
      d.duration = C.clampInt(d.duration, 0, 120, 0);
      var clean = stripDraft(d);
      var back = ui.afterR;
      ui.afterR = null;
      commit(function () {
        if (orig) S.reinforcers[S.reinforcers.indexOf(orig)] = clean; else S.reinforcers.push(clean);
        ui.route = { name: 'reinforcers' };
        if (back && ui.start && ui.start.lid === back.lid) {
          var bl = C.findLearner(S, back.lid);
          if (bl && bl.reinforcerIds.indexOf(clean.id) === -1) bl.reinforcerIds.push(clean.id);
          ui.start.rid = clean.id;
          ui.route = { name: 'start' };
        }
      });
      toast(t('saved'));
    },
    /* history & data */
    csv: function () { download('adaptability-tokens-' + stamp() + '.csv', C.toCSV(S, histFilterObj()), 'text/csv;charset=utf-8'); },
    clearHist: function () {
      confirmBox({ title: t('clearHistQ'), body: t('clearHistBody'), okLabel: t('clearHistory').replace('…', ''), danger: true, onOk: function () { S.log = []; save(); render(); } });
    },
    savePin: function () {
      var a = document.getElementById('pin1').value, b = document.getElementById('pin2').value;
      if (a !== b || !/^\d{4,8}$/.test(a)) { toast(t('pinMismatch')); return; }
      commit(function () { S.settings.pin = a; S.settings.pinChanged = true; });
      toast(t('pinSaved'));
    },
    backup: function () { download('adaptability-tokens-backup-' + stamp() + '.json', C.makeBackup(S), 'application/json'); },
    restore: function () { ui.modal = { type: 'restore' }; renderLayer(); },
    restoreGo: function () {
      var text = (document.getElementById('restoreText').value || '').trim();
      var res = C.parseBackup(text);
      if (!res.ok) { ui.modal.err = t('badBackup'); renderLayer(); return; }
      confirmBox({
        title: t('restoreQ'), body: t('restoreBody', { date: fmtDateTime(res.exportedAt) }), okLabel: t('restoreBtn'), danger: true,
        onOk: function () { S = res.state; save(); ui.route = { name: 'settings' }; render(); toast(t('restored')); }
      });
    },
    copyText: function () {
      var ta = document.getElementById('exportText');
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(function () { toast(t('copied')); }).catch(function () { if (ok) toast(t('copied')); });
      else if (ok) toast(t('copied'));
    },
    persist: function () {
      navigator.storage.persist().then(function (p) { ui.persisted = p; render(); }).catch(function () { ui.persisted = false; render(); });
    },
    resetAll: function () {
      var word = t('resetWord');
      confirmBox({
        title: t('resetAllQ'), body: t('resetAllBody', { word: word }), word: word, okLabel: t('resetAll').replace('…', ''), danger: true,
        onOk: function () { var keep = { lang: S.settings.lang }; S = C.seed(); S.settings.lang = keep.lang; save(); ui.route = { name: 'home' }; render(); toast(t('resetDone')); }
      });
    }
  };
  var HOLD = {
    undo: function (el) {
      var sc = scopeFrom(el);
      var res = C.undo(S, sc);
      if (res.ok) { save(); render(); toast(t('undone')); } else toast(t('nothingUndo'));
      touchSheet();
    },
    sheet: function () { ui.sheetOpen = !ui.sheetOpen; render(); touchSheet(); }
  };

  /* ---------------- events ---------------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]');
    if (!el || el.disabled) return;
    var a = el.getAttribute('data-a');
    if (!a || !A[a]) return;
    if (a !== 'closeModal') ev.preventDefault();
    A[a](el, ev);
  });
  var holdT = null, holdEl = null;
  function endHold() { clearTimeout(holdT); holdT = null; if (holdEl) holdEl.classList.remove('holding'); holdEl = null; }
  document.addEventListener('pointerdown', function (ev) {
    var el = ev.target.closest('[data-hold]');
    if (!el || el.disabled) return;
    var ms = parseInt(el.getAttribute('data-ms') || '800', 10);
    holdEl = el;
    el.style.setProperty('--hold-ms', ms + 'ms');
    void el.offsetWidth;
    el.classList.add('holding');
    holdT = setTimeout(function () { var e = holdEl; endHold(); if (navigator.vibrate) navigator.vibrate(20); HOLD[e.getAttribute('data-hold')](e); }, ms);
  });
  ['pointerup', 'pointercancel'].forEach(function (n) { document.addEventListener(n, endHold); });
  document.addEventListener('contextmenu', function (ev) { if (ev.target.closest('[data-hold]')) ev.preventDefault(); });
  document.addEventListener('keydown', function (ev) {
    var el = ev.target.closest && ev.target.closest('[data-hold]');
    if (el && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); HOLD[el.getAttribute('data-hold')](el); }
    if (ev.key === 'Escape' && ui.modal && ui.modal.type !== 'confirm') { ui.modal = null; renderLayer(); }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, f = el.getAttribute('data-f');
    if (!f) return;
    var d = ui.draft;
    if (f === 'histFilter') { ui.histFilter = el.value; render(); return; }
    if (!d) return;
    if (f === 'goalText') d._goalText = el.value;
    else if (f === 'gname') d._name = el.value;
    else if (f === 'rlabel') d._label = el.value;
    else if (f === 'examples') d._examples = el.value;
    else if (f === 'target') d.target = el.value;
    else if (f === 'duration') d.duration = el.value;
    else d[f] = el.value;
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target, d = ui.draft;
    if (el.hasAttribute('data-start-offer') && ui.start) { ui.start.offer = el.checked; return; }
    if (el.getAttribute('data-f') === 'target' && d) { d.target = C.clampInt(el.value, 1, d.type === 'team' ? 40 : 30, 5); render(); return; }
    if (el.hasAttribute('data-check') && d) {
      var k = el.getAttribute('data-check');
      if (k === 'group' || k === 'available') { d[k] = el.checked; return; }
      var arr = d[k], v = el.value, i = arr.indexOf(v);
      if (el.checked && i === -1) arr.push(v);
      if (!el.checked && i !== -1) arr.splice(i, 1);
      if (k === 'memberIds' && d.type === 'shared') { C.syncSharedMembers(S, d); render(); }
      return;
    }
    if (el.hasAttribute('data-radio') && d) {
      var rk = el.getAttribute('data-radio');
      if (rk === 'mode') { d.type = el.value === 'independent' ? 'individual' : (d.type === 'individual' ? 'team' : d.type); ensureGroupFields(d); render(); return; }
      d[rk] = el.value;
      if (rk === 'tokenType' && el.value === 'theme' && !d.theme) d.theme = 'cookie';
      if (rk === 'type') ensureGroupFields(d);
      render(); return;
    }
    if (el.hasAttribute('data-upload') && el.files && el.files[0] && d) {
      var f = el.getAttribute('data-upload');
      readImage(el.files[0]).then(function (url) {
        if (f === 'goalImage') d.goal.image = url; else d[f] = url;
        render();
      }).catch(function () { toast('Image could not be read'); });
      return;
    }
    if (el.hasAttribute('data-restore-file') && el.files && el.files[0]) {
      var fr = new FileReader();
      fr.onload = function () { document.getElementById('restoreText').value = fr.result; };
      fr.readAsText(el.files[0]);
    }
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && S) save(); });

  /* ---------------- start ---------------- */
  if (window.ATThemes) { var thcss = document.createElement('style'); thcss.textContent = window.ATThemes.css; document.head.appendChild(thcss); }
  load().then(function (data) {
    S = C.ensureShape(data || (/[?&]demo=1/.test(location.search) ? C.demo() : C.seed()));
    var lr = S.settings.lastRoute;
    if (lr && lr.name) {
      var valid = (lr.name === 'board' && C.findLearner(S, lr.id)) || (lr.name === 'group' && C.findGroup(S, lr.id)) ||
        (lr.name === 'lv' && lr.scope && (lr.scope.type === 'learner' ? C.findLearner(S, lr.scope.id) : C.findGroup(S, lr.scope.groupId)));
      if (valid) ui.route = lr;
    }
    save();
    render();
    if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) { ui.persisted = p ? true : null; }).catch(function () {});
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') && !inFrame() && !/claude|anthropic/i.test(location.hostname)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  window.__AT = { get state() { return S; }, ui: ui, render: render };
})();
