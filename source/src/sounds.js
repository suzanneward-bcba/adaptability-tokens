/* adaptABILITY Tokens — sounds, all synthesized on the device (no audio files).
   ATSounds.token(themeId|null, index) and ATSounds.finish(themeId|null).
   themeId null = standard: soft chime per token, marimba tune when full. */
(function (root) {
  'use strict';
  var ctx = null, noiseBuf = null, enabled = true;
  function ac() {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function note(type, f1, f2, dur, vol, delay) {
    var a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (delay || 0);
    o.type = type; o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, ftype, f1, f2, q) {
    var a = ac(), t = a.currentTime + (delay || 0);
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = ftype || 'bandpass'; f.frequency.setValueAtTime(f1 || 1000, t); f.Q.value = q || 1;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5, 1568, 1760];

  function chime(d) { note('sine', 1175, 1175, 0.8, 0.11, d); note('sine', 2350, 2350, 0.4, 0.025, d); note('sine', 3525, 3525, 0.2, 0.012, d); }
  function marimbaNote(f, d, len) { note('sine', f, f, len, 0.17, d); note('sine', f * 4, f * 4, 0.07, 0.03, d); note('sine', f * 2, f * 2, len * 0.4, 0.02, d); }
  function marimbaTune(d) { d = d || 0; [[523.25, 0, 0.35], [659.25, 0.14, 0.35], [783.99, 0.28, 0.35], [1046.5, 0.44, 0.9]].forEach(function (n) { marimbaNote(n[0], d + n[1], n[2]); }); }
  function plop(f, d) { note('sine', f, f * 0.55, 0.14, 0.2, d); }
  function ding(f, d) { note('triangle', f, f, 0.9, 0.12, d); note('sine', f * 2, f * 2, 0.4, 0.03, d); }
  /* metal: inharmonic partials like a struck coin */
  function metal(f, d, vol, len) { [[1, 1], [1.48, 0.6], [2.17, 0.45], [2.9, 0.3], [3.8, 0.18]].forEach(function (p, i) { note('sine', f * p[0], f * p[0], len * (1 - i * 0.15), vol * p[1], d); }); }
  function clink(d, f) { d = d || 0; f = f || 2400; metal(f, d, 0.06, 0.4); metal(f * 1.03, d + 0.09, 0.03, 0.25); noise(0.02, 0.12, d, 'highpass', 6000); }
  function click(d) { noise(0.035, 0.25, d, 'bandpass', 3200, null, 4); note('sine', 1400, 1100, 0.04, 0.05, d); }
  function snap(d) { noise(0.03, 0.35, d, 'bandpass', 3500, null, 3); note('sine', 240, 160, 0.08, 0.14, d); }
  function crackle(d, count) { for (var i = 0; i < count; i++) noise(0.025, 0.28, (d || 0) + i * 0.035 + Math.random() * 0.015, 'highpass', 2200 + Math.random() * 1500); }
  function chuff(d, vol) { noise(0.16, vol || 0.32, d, 'bandpass', 700, 400, 0.9); noise(0.1, (vol || 0.32) * 0.4, d, 'highpass', 3000); }
  function whistle(d, len) { [698.5, 880, 1046.5].forEach(function (f) { note('sine', f * 0.94, f, len, 0.06, d); }); noise(len, 0.03, d, 'bandpass', 1400, null, 1); }
  function peep(d) { note('sine', 2300, 3100, 0.11, 0.07, d); }

  var THEME = {
    cookie: { en: 'chip plops on, oven timer dings', de: 'Schokostück plumpst, Ofen-Timer klingelt',
      token: function () { plop(330); }, finish: function () { noise(0.6, 0.05, 0, 'lowpass', 900); ding(1568, 0.5); ding(1568, 0.85); } },
    pizza: { en: 'topping plops on, cheese sizzles, ding', de: 'Belag plumpst, Käse brutzelt, Ding',
      token: function () { plop(420); }, finish: function () { noise(1.1, 0.06, 0, 'highpass', 3500); noise(1.1, 0.03, 0.15, 'highpass', 5000); ding(1318, 1.2); } },
    icecream: { en: 'soft scoop boop, cherry boings on top', de: 'Weiches Kugel-Plopp, Kirsche hüpft oben drauf',
      token: function (i) { note('sine', 420 + i * 30, 640 + i * 30, 0.16, 0.16); }, finish: function () { note('sine', 220, 880, 0.35, 0.14); note('sine', 880, 440, 0.3, 0.12, 0.35); note('sine', 440, 660, 0.25, 0.1, 0.65); } },
    cake: { en: 'candle tink, party horn and fanfare', de: 'Kerzen-Ping, Partytröte und Fanfare',
      token: function (i) { note('triangle', 1568 + i * 40, 1568 + i * 40, 0.25, 0.1); }, finish: function () { note('sawtooth', 330, 470, 0.5, 0.05); noise(0.5, 0.03, 0, 'bandpass', 1200, null, 2); [[392, 0.55], [523.25, 0.7], [659.25, 0.85], [783.99, 1.0], [1046.5, 1.17]].forEach(function (n, j) { note('triangle', n[0], n[0], j === 4 ? 0.9 : 0.25, 0.12, n[1]); note('sine', n[0] * 2, n[0] * 2, 0.15, 0.03, n[1]); }); } },
    donut: { en: 'sprinkle tick, sprinkle shower and a sparkly ding', de: 'Streusel-Tick, Streuselregen und funkelndes Ding',
      token: function (i) { note('sine', 2600 + i * 70, 2100 + i * 70, 0.07, 0.08); noise(0.03, 0.08, 0, 'highpass', 5000); },
      finish: function () { for (var j = 0; j < 16; j++) note('sine', 2200 + Math.random() * 1400, 1900, 0.05, 0.05, j * 0.06 + Math.random() * 0.03); ding(1568, 1.1); ding(2093, 1.3); } },
    dino: { en: 'shell cracks, then three tiny rawrs', de: 'Schale knackt, dann drei kleine Rawrs',
      token: function () { crackle(0, 3); note('sine', 180, 120, 0.08, 0.08); },
      finish: function () {
        [0, 0.35, 0.7].forEach(function (d) { crackle(d, 4); noise(0.1, 0.2, d + 0.15, 'bandpass', 1600, null, 2); });
        [[1.1, 330], [1.45, 440], [1.8, 390]].forEach(function (r) { note('sawtooth', r[1], r[1] * 1.6, 0.25, 0.035, r[0]); note('square', r[1] * 2, r[1] * 1.4, 0.25, 0.012, r[0]); noise(0.25, 0.03, r[0], 'bandpass', 900, 600, 2); });
      } },
    rocket: { en: 'ignition sputter, 3-2-1 and a rumbling blast-off', de: 'Zündungsknistern, 3-2-1 und donnernder Start',
      token: function (i) { noise(0.18, 0.12, 0, 'lowpass', 500, 900); note('sine', 300 + i * 50, 700 + i * 50, 0.16, 0.09); },
      finish: function () {
        [0, 0.15, 0.3].forEach(function (d, j) { note('sine', j === 2 ? 1320 : 880, null, 0.1, 0.1, d); });
        noise(2.4, 0.28, 0.45, 'lowpass', 140, 1600, 0.7);
        noise(2.0, 0.12, 0.5, 'bandpass', 90, 60, 1);
        note('sine', 60, 38, 2.0, 0.18, 0.45);
        noise(1.3, 0.1, 1.2, 'highpass', 900, 5000);
      } },
    train: { en: 'steam chuff, speeding chuffs and a choo-choo whistle', de: 'Dampfstoß, schneller werdendes Schnaufen und Tuut-Tuut-Pfeife',
      token: function () { chuff(0); noise(0.05, 0.22, 0.2, 'bandpass', 1400, null, 3); },
      finish: function () {
        [0, 0.34, 0.62, 0.86, 1.06, 1.22, 1.36, 1.48, 1.59].forEach(function (d, j) { chuff(d, 0.22 + j * 0.015); });
        whistle(1.75, 0.42); whistle(2.25, 0.6);
      } },
    robot: { en: 'computer bleeps, power-up whirr and a beep-boop tune', de: 'Computer-Piepsen, Hochfahr-Surren und Piep-Pup-Melodie',
      token: function () { [1320, 990, 1568].forEach(function (f, j) { note('square', f, null, 0.05, 0.03, j * 0.06); }); },
      finish: function () {
        note('sawtooth', 110, 1100, 0.75, 0.035); note('square', 220, 440, 0.75, 0.015);
        note('sine', 1500, 3000, 0.12, 0.08, 0.8); note('sine', 3000, 1200, 0.15, 0.07, 0.93);
        [[1046.5, 1.15], [784, 1.3], [1318.5, 1.45], [1568, 1.6], [2093, 1.78]].forEach(function (n, j) { note('square', n[0], null, j === 4 ? 0.25 : 0.1, 0.035, n[1]); });
      } },
    flower: { en: 'gentle pluck, harp-like bloom', de: 'Sanftes Zupfen, harfenartiges Aufblühen',
      token: function (i) { var f = PENTA[i % PENTA.length]; note('sine', f, f, 0.5, 0.12); note('sine', f * 2, f * 2, 0.2, 0.02); },
      finish: function () { PENTA.slice(0, 8).forEach(function (f, j) { note('sine', f, f, 0.7, 0.09, j * 0.07); note('sine', f * 2, f * 2, 0.25, 0.015, j * 0.07); }); } },
    egg: { en: 'crisp crackle, then chirpy peeps', de: 'Knackendes Knistern, dann fröhliches Piepsen',
      token: function () { crackle(0, 3); },
      finish: function () { crackle(0, 7); noise(0.12, 0.25, 0.28, 'bandpass', 1800, null, 2); [0.6, 0.76, 1.05, 1.2, 1.5].forEach(function (d) { peep(d); }); } },
    rainbow: { en: 'each stripe a step up the scale, shimmer', de: 'Jeder Streifen eine Stufe höher, Schimmern',
      token: function (i) { var f = PENTA[i % PENTA.length]; note('sine', f, f, 0.6, 0.11); note('sine', f * 1.5, f * 1.5, 0.3, 0.02); },
      finish: function () { PENTA.forEach(function (f, j) { note('sine', f, f, 0.5, 0.08, j * 0.05); }); note('sine', 2093, 2093, 1.2, 0.04, 0.55); } },
    puzzle: { en: 'piece snaps in, ta-da', de: 'Teil rastet ein, Tadaa',
      token: function () { snap(0); }, finish: function () { snap(0); [523.25, 659.25, 783.99].forEach(function (f) { note('triangle', f, f, 0.18, 0.08, 0.15); note('triangle', f * 2, f * 2, 0.9, 0.06, 0.35); }); } },
    treasure: { en: 'coin clink, coins pour in, creaky lid, sparkle', de: 'Münz-Klirren, Münzen prasseln, knarrender Deckel, Funkeln',
      token: function (i) { clink(0, 2300 + (i % 4) * 120); },
      finish: function () {
        for (var j = 0; j < 11; j++) clink(j * 0.08 + Math.random() * 0.03, 2100 + Math.random() * 700);
        note('sawtooth', 85, 130, 0.45, 0.025, 0.95); noise(0.45, 0.05, 0.95, 'bandpass', 400, 700, 4);
        [1318.5, 1568, 2093, 2637, 3136].forEach(function (f, j) { note('sine', f, f, 0.6, 0.06, 1.35 + j * 0.08); });
      } }
  };

  function safe(fn) { if (!enabled) return; try { fn(); } catch (e) { /* audio unavailable */ } }
  var api = {
    themes: THEME,
    setEnabled: function (v) { enabled = !!v; },
    token: function (themeId, index) { safe(function () { var t = themeId && THEME[themeId]; if (t) t.token(index || 0); else chime(0); }); },
    finish: function (themeId) { safe(function () { var t = themeId && THEME[themeId]; if (t) t.finish(); else marimbaTune(0); }); },
    chime: function () { safe(function () { chime(0); }); },
    marimba: function () { safe(function () { marimbaTune(0); }); }
  };
  root.ATSounds = api;
})(typeof window !== 'undefined' ? window : globalThis);
