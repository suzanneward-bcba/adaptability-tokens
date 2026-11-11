/* adaptABILITY Tokens — animated "build-it" token themes.
   Each theme draws an original SVG scene for n tokens with k earned.
   render(id, n, k, {newIdx, mode:'calm'|'big', reduced}) -> SVG string. CSS lives in ATThemes.css. */
(function (root) {
  'use strict';
  var uidN = 0;
  function r1(v) { return Math.round(v * 10) / 10; }
  function state(i, k, newIdx) { return i < k ? 'on' + (i === newIdx ? ' pnew' : '') : 'slot'; }
  function sunflower(n, cx, cy, R, sy) {
    sy = sy || 1;
    if (n === 1) return [[cx, cy]];
    var pts = [];
    for (var i = 0; i < n; i++) {
      var r = R * Math.sqrt((i + 0.5) / n), a = i * 2.39996 + 0.6;
      pts.push([r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a) * sy)]);
    }
    return pts;
  }
  /* Even spacing: 1 = center, 2-6 = one ring, 7-10 = outer ring + small center group. */
  function spread(n, cx, cy, R, sy) {
    sy = sy || 1;
    if (n === 1) return [[cx, cy]];
    function ring(m, rad, start) {
      var out = [];
      for (var i = 0; i < m; i++) {
        var a = (start + i * 360 / m) * Math.PI / 180;
        out.push([r1(cx + rad * Math.cos(a)), r1(cy + rad * Math.sin(a) * sy)]);
      }
      return out;
    }
    var even = function (m) { return m % 2 ? -90 : -90 + 180 / m; };
    if (n <= 6) return ring(n, R * (n === 2 ? 0.75 : 0.85), even(n));
    var inner = n <= 9 ? 1 : 3, outer = n - inner;
    var pts = ring(outer, R, even(outer));
    return inner === 1 ? pts.concat([[cx, cy]]) : pts.concat(ring(3, R * 0.38, -90));
  }
  function card(bg) { return '<rect x="4" y="4" width="392" height="292" rx="26" fill="' + (bg || '#fffaf0') + '" stroke="#eadfca" stroke-width="2"/>'; }
  function confetti(cx, cy) {
    var cols = ['#a12279', '#2a60a6', '#a7cf3b', '#fe920c', '#ffd23f'], h = '<g class="fx bigonly">';
    for (var i = 0; i < 30; i++) {
      var a = i / 30 * Math.PI * 2 + (i % 3) * 0.2, d = 120 + (i * 37 % 70);
      h += '<rect class="conf" x="' + (cx - 4) + '" y="' + (cy - 5) + '" width="8" height="' + (i % 2 ? 8 : 12) + '" rx="2" fill="' + cols[i % 5] +
        '" style="--dx:' + r1(Math.cos(a) * d) + 'px;--dy:' + r1(Math.sin(a) * d - 30) + 'px;animation-delay:' + (0.2 + (i % 5) * 0.06) + 's"/>';
    }
    return h + '</g>';
  }
  function star(x, y, s) {
    return 'M' + x + ' ' + (y - s) + 'L' + (x + s * 0.3) + ' ' + (y - s * 0.3) + 'L' + (x + s) + ' ' + y + 'L' + (x + s * 0.3) + ' ' + (y + s * 0.3) + 'L' + x + ' ' + (y + s) + 'L' + (x - s * 0.3) + ' ' + (y + s * 0.3) + 'L' + (x - s) + ' ' + y + 'L' + (x - s * 0.3) + ' ' + (y - s * 0.3) + 'Z';
  }
  function sparkles(pts, cls) {
    return '<g class="fx ' + (cls || '') + '">' + pts.map(function (p, i) {
      return '<path class="spk" d="' + star(p[0], p[1], p[2] || 10) + '" fill="#ffd23f" style="animation-delay:' + (0.4 + i * 0.18) + 's"/>';
    }).join('') + '</g>';
  }
  function steam(xs, y) {
    return '<g class="fx">' + xs.map(function (x, i) {
      return '<path class="steam" d="M' + x + ' ' + y + ' q-8 -12 0 -24 q8 -12 0 -24" fill="none" stroke="#c9b9a0" stroke-width="5" stroke-linecap="round" style="animation-delay:' + (0.5 + i * 0.3) + 's"/>';
    }).join('') + '</g>';
  }

  var T = {};

  /* ---------- FOOD ---------- */
  T.cookie = {
    fam: 'food', en: 'Chocolate chip cookie', de: 'Schokokeks', finish: { en: 'Bakes into a golden cookie', de: 'Wird zum goldenen Keks gebacken' },
    draw: function (n, k, o) {
      var pts = spread(n, 200, 150, 74), r = Math.max(9, 26 - n * 1.5);
      var h = '<defs><radialGradient id="ckg"><stop offset="0" stop-color="#f0c27b"/><stop offset=".75" stop-color="#d99a4e"/><stop offset="1" stop-color="#b97a37"/></radialGradient></defs>' + card();
      h += '<ellipse cx="200" cy="272" rx="105" ry="11" fill="#000" opacity=".07"/><g class="ck-all">';
      h += '<circle cx="200" cy="150" r="112" fill="#f6e2b8" stroke="#e5c78f" stroke-width="5"/>';
      h += '<circle class="fx ck-bake" cx="200" cy="150" r="112" fill="url(#ckg)" stroke="#a96a2c" stroke-width="5"/>';
      pts.forEach(function (p, i) {
        var c = state(i, k, o.newIdx), x = p[0], y = p[1];
        if (c === 'slot') h += '<circle class="slot" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
        else h += '<path class="' + c + '" fill="#4a2c1d" d="M' + r1(x - r) + ' ' + r1(y + r * 0.5) + 'Q' + r1(x - r * 0.9) + ' ' + r1(y - r * 0.8) + ' ' + x + ' ' + r1(y - r) + 'Q' + r1(x + r * 0.9) + ' ' + r1(y - r * 0.8) + ' ' + r1(x + r) + ' ' + r1(y + r * 0.5) + 'Q' + x + ' ' + r1(y + r * 1.05) + ' ' + r1(x - r) + ' ' + r1(y + r * 0.5) + 'Z"/>';
      });
      h += '</g>' + steam([170, 200, 230], 42) + sparkles([[92, 70], [315, 90], [300, 240], [100, 230]]) + confetti(200, 150);
      return h;
    }
  };
  T.pizza = {
    fam: 'food', en: 'Pizza', de: 'Pizza', finish: { en: 'Cheese melts and it’s ready to slice', de: 'Käse schmilzt, fertig zum Schneiden' },
    draw: function (n, k, o) {
      var pts = spread(n, 200, 150, 64), r = Math.max(10, 24 - n * 1.2);
      var h = card() + '<ellipse cx="200" cy="272" rx="105" ry="11" fill="#000" opacity=".07"/><g class="pz-all">';
      h += '<circle cx="200" cy="150" r="114" fill="#e8b464" stroke="#c98c3c" stroke-width="5"/><circle cx="200" cy="150" r="96" fill="#d64a2e"/>';
      h += '<g class="fx pz-cheese"><circle cx="200" cy="150" r="96" fill="#ffd66b"/><circle cx="170" cy="120" r="16" fill="#ffe7a1"/><circle cx="235" cy="175" r="20" fill="#ffe7a1"/><circle cx="215" cy="105" r="10" fill="#ffe7a1"/><circle cx="160" cy="190" r="12" fill="#ffe7a1"/></g>';
      pts.forEach(function (p, i) {
        var c = state(i, k, o.newIdx), x = p[0], y = p[1];
        if (c === 'slot') { h += '<circle class="slot" cx="' + x + '" cy="' + y + '" r="' + r + '" style="stroke:#f6c1b5"/>'; return; }
        var t = i % 3;
        if (t === 0) h += '<g class="' + c + '"><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#a7241b"/><circle cx="' + r1(x - r * 0.35) + '" cy="' + r1(y - r * 0.3) + '" r="' + r1(r * 0.16) + '" fill="#7a150f"/><circle cx="' + r1(x + r * 0.35) + '" cy="' + r1(y + r * 0.2) + '" r="' + r1(r * 0.16) + '" fill="#7a150f"/></g>';
        else if (t === 1) h += '<g class="' + c + '"><circle cx="' + x + '" cy="' + y + '" r="' + r1(r * 0.8) + '" fill="#2e2a2a"/><circle cx="' + x + '" cy="' + y + '" r="' + r1(r * 0.35) + '" fill="#d64a2e"/></g>';
        else h += '<g class="' + c + '"><ellipse cx="' + x + '" cy="' + y + '" rx="' + r1(r * 1.05) + '" ry="' + r1(r * 0.55) + '" fill="#3f8f3a" transform="rotate(' + (i * 47 % 180) + ' ' + x + ' ' + y + ')"/></g>';
      });
      h += '<g class="fx pz-cut" stroke="#c98c3c" stroke-width="3" opacity=".7"><line x1="200" y1="40" x2="200" y2="260"/><line x1="90" y1="150" x2="310" y2="150"/><line x1="122" y1="72" x2="278" y2="228"/><line x1="278" y1="72" x2="122" y2="228"/></g>';
      h += '</g>' + steam([175, 205, 235], 40) + sparkles([[85, 70], [318, 85], [315, 240]]) + confetti(200, 150);
      return h;
    }
  };
  T.icecream = {
    fam: 'food', en: 'Ice cream', de: 'Eiscreme', finish: { en: 'A cherry drops on top', de: 'Eine Kirsche landet oben drauf' },
    draw: function (n, k, o) {
      var s = 168 / (n + 0.4), ry = Math.min(42, s * 0.8), rx = Math.max(ry * 1.05, 40);
      var cols = ['#f7a8c4', '#9ee0c4', '#8a5a3c', '#fff1c9', '#a9c9ff'];
      var h = card() + '<g class="ic-all"><path d="M158 200 L242 200 L200 292 Z" fill="#e6b06a" stroke="#c18a45" stroke-width="3"/>' +
        '<path d="M170 212 L222 266 M186 210 L230 244 M214 210 L178 266 M230 210 L190 252" stroke="#c18a45" stroke-width="2" opacity=".7"/>';
      var topY = 200;
      for (var i = 0; i < n; i++) {
        var cy = r1(200 - ry * 0.55 - i * s), cx = 200 + (i % 2 ? 6 : -6), c = state(i, k, o.newIdx);
        topY = cy - ry;
        if (c === 'slot') h += '<ellipse class="slot" cx="' + cx + '" cy="' + cy + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '"/>';
        else h += '<g class="' + c + '"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '" fill="' + cols[i % 5] + '"/><ellipse cx="' + r1(cx - rx * 0.35) + '" cy="' + r1(cy - ry * 0.35) + '" rx="' + r1(rx * 0.22) + '" ry="' + r1(ry * 0.18) + '" fill="#fff" opacity=".5"/></g>';
      }
      h += '<g class="fx ic-sprinkle">';
      for (var j = 0; j < Math.min(n, 6) * 3; j++) {
        var li = j % n, ly = 200 - ry * 0.55 - li * s, lx = 200 + ((j * 29) % 50) - 25;
        h += '<rect x="' + r1(lx) + '" y="' + r1(ly - ry * 0.5 + (j % 3) * 6) + '" width="8" height="3" rx="1.5" fill="' + ['#a12279', '#2a60a6', '#a7cf3b', '#fe920c'][j % 4] + '" transform="rotate(' + (j * 53 % 180) + ' ' + r1(lx + 4) + ' ' + r1(ly) + ')"/>';
      }
      h += '</g><g class="fx ic-cherry"><path d="M200 ' + r1(topY - 14) + ' q6 -20 18 -26" fill="none" stroke="#3f8f3a" stroke-width="3"/><circle cx="200" cy="' + r1(topY - 6) + '" r="12" fill="#d42a3a"/><circle cx="196" cy="' + r1(topY - 10) + '" r="3" fill="#fff" opacity=".6"/></g>';
      h += '</g>' + sparkles([[100, 80], [300, 70], [310, 210], [90, 220]]) + confetti(200, 130);
      return h;
    }
  };
  T.cake = {
    fam: 'food', en: 'Birthday cake', de: 'Geburtstagstorte', finish: { en: 'All the candles light up', de: 'Alle Kerzen leuchten' },
    draw: function (n, k, o) {
      var sp = 160 / n, cw = Math.min(14, sp * 0.55), cols = ['#2a60a6', '#a7cf3b', '#fe920c', '#a12279'];
      var h = card() + '<g class="ck2-all"><ellipse cx="200" cy="262" rx="130" ry="16" fill="#e9e2d4"/>' +
        '<rect x="105" y="175" width="190" height="82" rx="12" fill="#f4b6c8"/><rect x="105" y="222" width="190" height="10" fill="#e98fae"/>' +
        '<path d="M105 182 q0 -14 14 -14 h162 q14 0 14 14 v8 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -24 0 q-12 14 -25 0 z" fill="#fffaf2"/>';
      for (var i = 0; i < n; i++) {
        var x = r1(120 + sp * (i + 0.5)), c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<rect class="slot" x="' + r1(x - cw / 2) + '" y="128" width="' + r1(cw) + '" height="44" rx="3"/>';
        else h += '<g class="' + c + '"><rect x="' + r1(x - cw / 2) + '" y="128" width="' + r1(cw) + '" height="44" rx="3" fill="' + cols[i % 4] + '"/><rect x="' + r1(x - cw / 2) + '" y="140" width="' + r1(cw) + '" height="5" fill="#fff" opacity=".6"/><line x1="' + x + '" y1="128" x2="' + x + '" y2="120" stroke="#5a4a3a" stroke-width="2"/></g>';
        h += '<path class="fx flame" style="animation-delay:' + (0.15 * i) + 's,' + (0.15 * i + 0.4) + 's" d="M' + x + ' 96 q9 12 0 22 q-9 -10 0 -22z" fill="#ffb13b"/>';
      }
      h += '</g>' + sparkles([[80, 70], [320, 65], [70, 160], [330, 160]]) + confetti(200, 120);
      return h;
    }
  };

  T.donut = {
    fam: 'food', en: 'Pink donut', de: 'Rosa Donut', finish: { en: 'Sprinkles shower down and it gets a shiny glaze', de: 'Streusel regnen herab und er glänzt' },
    draw: function (n, k, o) {
      var scols = ['#2a60a6', '#ffd23f', '#a7cf3b', '#fe920c', '#ffffff', '#8e4ec6'];
      var len = Math.min(30, 300 / n * 0.62), wid = Math.max(7, len * 0.32);
      var fr = '', N = 72;
      for (var q = 0; q <= N; q++) {
        var a = q / N * Math.PI * 2, rr = 97 + 5 * Math.sin(a * 9) + 2 * Math.sin(a * 4);
        fr += (q ? 'L' : 'M') + r1(200 + rr * Math.cos(a)) + ' ' + r1(150 + rr * Math.sin(a));
      }
      fr += 'Z';
      var h = card() + '<ellipse cx="200" cy="272" rx="110" ry="11" fill="#000" opacity=".07"/><g class="dn-all">';
      h += '<circle cx="200" cy="150" r="114" fill="#e2a65c" stroke="#c3833d" stroke-width="4"/>';
      h += '<path d="' + fr + '" fill="#f7a1c4" stroke="#e57fab" stroke-width="3"/>';
      h += '<circle cx="200" cy="150" r="42" fill="#e57fab"/><circle cx="200" cy="150" r="36" fill="#d9954c"/><circle cx="200" cy="150" r="30" fill="#fffaf0" stroke="#c3833d" stroke-width="2"/>';
      h += '<path class="fx dn-gloss" d="M128 108 Q160 66 214 64" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>';
      for (var i = 0; i < n; i++) {
        var ang = (i * 360 / n - 90 + (n % 2 ? 0 : 180 / n)) * Math.PI / 180, x = r1(200 + 68 * Math.cos(ang)), y = r1(150 + 68 * Math.sin(ang));
        var rot = r1(ang * 180 / Math.PI + 90 + (i % 2 ? 35 : -35)), c = state(i, k, o.newIdx);
        var rect = 'x="' + r1(x - len / 2) + '" y="' + r1(y - wid / 2) + '" width="' + r1(len) + '" height="' + r1(wid) + '" rx="' + r1(wid / 2) + '" transform="rotate(' + rot + ' ' + x + ' ' + y + ')"';
        if (c === 'slot') h += '<rect class="slot" style="stroke:#e57fab" ' + rect + '/>';
        else h += '<g class="' + c + '"><rect ' + rect + ' fill="' + scols[i % 6] + '" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/></g>';
      }
      for (var j = 0; j < 22; j++) {
        var ra = j * 2.39996, rd = 50 + (j * 23 % 38), rx = r1(200 + rd * Math.cos(ra)), ry = r1(150 + rd * Math.sin(ra));
        h += '<g class="dnr" style="--d:' + r1(0.05 * j) + 's"><rect x="' + r1(rx - 6) + '" y="' + r1(ry - 2) + '" width="12" height="4" rx="2" fill="' + scols[j % 6] + '" transform="rotate(' + (j * 67 % 180) + ' ' + rx + ' ' + ry + ')"/></g>';
      }
      h += '</g>' + sparkles([[80, 60], [325, 70], [330, 235], [72, 230]]) + confetti(200, 150);
      return h;
    }
  };

  /* ---------- BUILD & GO ---------- */
  T.rocket = {
    fam: 'build', en: 'Rocket', de: 'Rakete', finish: { en: 'Engines fire and it lifts off', de: 'Triebwerke zünden, die Rakete hebt ab' },
    draw: function (n, k, o) {
      var bh = 140 / n, h = card('#1f2a4a');
      [[40, 40], [90, 90], [330, 50], [360, 130], [60, 200], [300, 250], [120, 260], [250, 30], [370, 230]].forEach(function (p, i) {
        h += '<circle class="twk" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 ? 1.6 : 2.4) + '" fill="#fff" style="animation-delay:' + (i * 0.3) + 's"/>';
      });
      h += '<rect x="70" y="262" width="260" height="10" rx="5" fill="#3a4870"/><g class="rk">';
      h += '<path class="fx flame" d="M180 236 Q200 300 220 236 Z" fill="#fe920c"/><path class="fx flame" style="animation-delay:.1s,.5s" d="M190 236 Q200 278 210 236 Z" fill="#ffd23f"/>';
      h += '<path d="M165 200 L132 248 L165 236 Z M235 200 L268 248 L235 236 Z" class="slot" style="stroke:#7b8bb8"/><path class="fx" d="M165 200 L132 248 L165 236 Z M235 200 L268 248 L235 236 Z" fill="#a12279"/>';
      h += '<path d="M165 95 L200 38 L235 95 Z" class="slot" style="stroke:#7b8bb8"/><path class="fx" d="M165 95 L200 38 L235 95 Z" fill="#e04f3a"/>';
      for (var i = 0; i < n; i++) {
        var y = r1(235 - (i + 1) * bh), c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<rect class="slot" style="stroke:#7b8bb8" x="167" y="' + r1(y + 1) + '" width="66" height="' + r1(bh - 2) + '" rx="3"/>';
        else h += '<rect class="' + c + '" x="165" y="' + y + '" width="70" height="' + r1(bh) + '" fill="' + (i % 2 ? '#e8ecf5' : '#cfd7ea') + '" stroke="#9aa6c4" stroke-width="1"/>';
      }
      h += '<circle cx="200" cy="130" r="16" fill="none" stroke="#9aa6c4" stroke-width="5"/><circle class="fx" cx="200" cy="130" r="13" fill="#9fd3ff"/>';
      h += '</g>' + confetti(200, 120);
      return h;
    }
  };
  T.train = {
    fam: 'build', en: 'Train', de: 'Zug', finish: { en: 'Smoke puffs and it chugs away', de: 'Dampf steigt auf und der Zug fährt los' },
    draw: function (n, k, o) {
      var w = Math.min(64, 288 / n - 8), cols = ['#a7cf3b', '#fe920c', '#2a60a6', '#a12279', '#ffd23f'], wr = Math.min(9, w / 4);
      var h = card() + '<rect x="10" y="252" width="380" height="5" fill="#9b8a72"/>';
      for (var t = 18; t < 390; t += 22) h += '<rect x="' + t + '" y="256" width="12" height="5" fill="#c4b49a"/>';
      h += '<g class="tr">';
      for (var i = 0; i < n; i++) {
        var x = r1(296 - (i + 1) * (w + 8)), c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<rect class="slot" x="' + x + '" y="200" width="' + r1(w) + '" height="40" rx="5"/>';
        else h += '<g class="' + c + '"><line x1="' + r1(x + w) + '" y1="232" x2="' + r1(x + w + 8) + '" y2="232" stroke="#5a4a3a" stroke-width="3"/><rect x="' + x + '" y="200" width="' + r1(w) + '" height="40" rx="5" fill="' + cols[i % 5] + '"/><circle cx="' + r1(x + w * 0.25) + '" cy="244" r="' + r1(wr) + '" fill="#3b3b3b"/><circle cx="' + r1(x + w * 0.75) + '" cy="244" r="' + r1(wr) + '" fill="#3b3b3b"/></g>';
      }
      h += '<g><rect x="300" y="150" width="38" height="92" rx="5" fill="#a12279"/><rect x="306" y="160" width="26" height="22" rx="3" fill="#ffe9a8"/>' +
        '<rect x="334" y="190" width="46" height="50" rx="8" fill="#2a60a6"/><rect x="352" y="168" width="12" height="24" fill="#3b3b3b"/>' +
        '<path d="M380 240 L392 248 L380 248 Z" fill="#3b3b3b"/><circle cx="318" cy="244" r="12" fill="#3b3b3b"/><circle cx="360" cy="244" r="12" fill="#3b3b3b"/></g>';
      h += '<g class="fx">' + [0, 1, 2].map(function (j) { return '<circle class="smoke" cx="358" cy="' + (150 - j * 2) + '" r="' + (10 + j * 3) + '" fill="#d8d2c8" style="animation-delay:' + (0.4 + j * 0.35) + 's"/>'; }).join('') + '</g>';
      h += '</g>' + sparkles([[60, 70], [200, 50], [330, 70]]) + confetti(200, 150);
      return h;
    }
  };
  T.robot = {
    fam: 'build', en: 'Robot', de: 'Roboter', finish: { en: 'Powers up, lights on, and waves', de: 'Schaltet sich ein, leuchtet und winkt' },
    draw: function (n, k, o) {
      var cols = Math.min(5, n <= 4 ? n : Math.ceil(n / 2)), rows = Math.ceil(n / cols);
      var lr = Math.min(13, 80 / cols / 2.4, 70 / rows / 2.4), lc = ['#fe920c', '#a7cf3b', '#2a60a6', '#a12279', '#ffd23f'];
      var h = card() + '<g class="rb">';
      h += '<rect x="160" y="228" width="26" height="40" rx="6" fill="#9aa6b8"/><rect x="214" y="228" width="26" height="40" rx="6" fill="#9aa6b8"/>';
      h += '<g class="rb-arm rb-l"><rect x="104" y="128" width="40" height="18" rx="9" fill="#9aa6b8"/><circle cx="102" cy="137" r="12" fill="#7c8ba1"/></g>';
      h += '<g class="rb-arm rb-r"><rect x="256" y="128" width="40" height="18" rx="9" fill="#9aa6b8"/><circle cx="298" cy="137" r="12" fill="#7c8ba1"/></g>';
      h += '<rect x="140" y="118" width="120" height="114" rx="16" fill="#c9d3df" stroke="#7c8ba1" stroke-width="4"/>';
      h += '<rect x="152" y="130" width="96" height="90" rx="10" fill="#e9eef4"/>';
      h += '<line x1="200" y1="58" x2="200" y2="38" stroke="#7c8ba1" stroke-width="4"/><circle cx="200" cy="34" r="7" fill="#9aa6b8"/><circle class="fx rb-ant" cx="200" cy="34" r="7" fill="#e5484d"/>';
      h += '<rect x="158" y="56" width="84" height="62" rx="14" fill="#c9d3df" stroke="#7c8ba1" stroke-width="4"/>';
      h += '<circle cx="182" cy="82" r="9" fill="#3b4252"/><circle cx="218" cy="82" r="9" fill="#3b4252"/><circle class="fx" cx="182" cy="82" r="9" fill="#5fe1ff"/><circle class="fx" cx="218" cy="82" r="9" fill="#5fe1ff"/>';
      h += '<line x1="186" y1="102" x2="214" y2="102" stroke="#3b4252" stroke-width="4" stroke-linecap="round"/><path class="fx" d="M184 99 q16 12 32 0" fill="none" stroke="#3b4252" stroke-width="4" stroke-linecap="round"/>';
      var gw = 96 / cols, gh = 90 / rows;
      for (var i = 0; i < n; i++) {
        var row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
        var off = (cols - inRow) * gw / 2, x = r1(152 + off + gw * (col + 0.5)), y = r1(130 + gh * (row + 0.5)), c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<circle class="slot" cx="' + x + '" cy="' + y + '" r="' + r1(lr) + '"/>';
        else h += '<circle class="' + c + '" cx="' + x + '" cy="' + y + '" r="' + r1(lr) + '" fill="' + lc[i % 5] + '"/>';
      }
      h += '</g>' + sparkles([[80, 60], [320, 60], [70, 230], [330, 230]]) + confetti(200, 140);
      return h;
    }
  };

  /* ---------- GROW & HATCH ---------- */
  T.flower = {
    fam: 'grow', en: 'Flower', de: 'Blume', finish: { en: 'Blooms in the sunshine', de: 'Blüht im Sonnenschein auf' },
    draw: function (n, k, o) {
      var frac = k / n, cols = ['#f48fb1', '#fe920c', '#a12279', '#b388ff', '#ff6f61'];
      var h = card('#f3fbff') + '<path d="M4 240 H396 V270 Q396 296 370 296 H30 Q4 296 4 270 Z" fill="#dff0c8"/>';
      h += '<g class="fx fl-sun"><circle cx="70" cy="66" r="24" fill="#ffd23f"/>';
      for (var a = 0; a < 8; a++) h += '<line x1="70" y1="30" x2="70" y2="20" stroke="#ffd23f" stroke-width="5" stroke-linecap="round" transform="rotate(' + (a * 45) + ' 70 66)"/>';
      h += '</g><g class="fl">';
      h += '<path d="M200 232 L200 104" class="slot" style="stroke:#9cc59a"/>';
      var top = r1(232 - 128 * frac);
      if (k > 0) h += '<path d="M200 232 L200 ' + top + '" stroke="#3f8f3a" stroke-width="7" stroke-linecap="round"/>';
      if (frac >= 0.34) h += '<path class="' + (k === Math.ceil(n * 0.34) ? 'pnew' : '') + '" d="M200 200 q-34 -6 -40 -28 q30 0 40 28z" fill="#5aa84e"/>';
      if (frac >= 0.67) h += '<path class="' + (k === Math.ceil(n * 0.67) ? 'pnew' : '') + '" d="M200 168 q34 -6 40 -28 q-30 0 -40 28z" fill="#5aa84e"/>';
      var pr = n <= 4 ? 34 : 30, plen = n <= 4 ? 32 : 26, pw = Math.min(18, 120 / n + 4);
      for (var i = 0; i < n; i++) {
        var ang = i * 360 / n, c = state(i, k, o.newIdx);
        var tf = 'rotate(' + r1(ang) + ' 200 100)';
        if (c === 'slot') h += '<ellipse class="slot" cx="200" cy="' + (100 - pr) + '" rx="' + r1(pw) + '" ry="' + plen + '" transform="' + tf + '"/>';
        else h += '<g transform="' + tf + '"><ellipse class="' + c + '" cx="200" cy="' + (100 - pr) + '" rx="' + r1(pw) + '" ry="' + plen + '" fill="' + cols[i % 5] + '"/></g>';
      }
      h += '<circle cx="200" cy="100" r="20" class="slot"/><g class="fx"><circle cx="200" cy="100" r="21" fill="#ffd23f"/><circle cx="193" cy="96" r="2.6" fill="#5a3b1a"/><circle cx="207" cy="96" r="2.6" fill="#5a3b1a"/><path d="M192 105 q8 7 16 0" fill="none" stroke="#5a3b1a" stroke-width="2.5" stroke-linecap="round"/></g>';
      h += '<path d="M160 232 L240 232 L230 286 L170 286 Z" fill="#d9814e"/><rect x="154" y="226" width="92" height="14" rx="5" fill="#c46f3e"/></g>';
      h += '<g class="fx bigonly"><path class="bfly" d="M310 120 q-14 -14 -4 -20 q8 0 4 20 q14 -14 20 -4 q0 8 -20 4z" fill="#2a60a6"/><path class="bfly" style="animation-delay:.6s" d="M95 170 q-12 -12 -3 -17 q7 0 3 17 q12 -12 17 -3 q0 7 -17 3z" fill="#fe920c"/></g>';
      h += sparkles([[300, 60], [330, 180], [120, 130]]) + confetti(200, 100);
      return h;
    }
  };
  T.egg = {
    fam: 'grow', en: 'Hatching egg', de: 'Schlüpfendes Ei', finish: { en: 'A little chick hatches', de: 'Ein Küken schlüpft' },
    draw: function (n, k, o) {
      var zig = '', xs = [];
      for (var x = 271.6, j = 0; x > 128.4; x -= 14.3, j++) xs.push([r1(x), j % 2 ? 158 : 144]);
      xs.push([128.4, 150]);
      zig = xs.map(function (p) { return 'L' + p[0] + ' ' + p[1]; }).join(' ');
      var topHalf = 'M128.4 150 A72 92 0 0 1 271.6 150 ' + zig + ' Z';
      var botHalf = 'M128.4 150 A72 92 0 1 0 271.6 150 ' + zig + ' Z';
      var rowsY = n <= 4 ? [114, 200] : [94, 124, 184, 216], counts = rowsY.map(function () { return 0; }), pts = [], topCr = '', botCr = '';
      for (var q = 0; q < n; q++) counts[q % rowsY.length]++;
      rowsY.forEach(function (ry, ri) {
        var m = counts[ri], hw = 72 * Math.sqrt(Math.max(0, 1 - Math.pow((ry - 160) / 92, 2))) * 0.6;
        for (var j = 0; j < m; j++) pts.push([m === 1 ? 200 : r1(200 - hw + 2 * hw * j / (m - 1)), ry]);
      });
      pts.forEach(function (p, i) {
        var c = state(i, k, o.newIdx), x = p[0], y = p[1];
        var d = 'M' + r1(x - 13) + ' ' + y + ' l7 -7 l7 9 l6 -8 l7 6';
        var el = c === 'slot' ? '<path class="slot" d="' + d + '" style="stroke:#e3d6bd"/>' : '<path class="' + c + '" d="' + d + '" fill="none" stroke="#7a6240" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>';
        if (y < 150) topCr += el; else botCr += el;
      });
      var h = card() + '<ellipse cx="200" cy="256" rx="112" ry="26" fill="#b98a55"/><path d="M95 250 q50 -14 105 -6 q55 -8 105 6" fill="none" stroke="#8d6538" stroke-width="4"/>';
      h += '<g class="fx eg-chick"><circle cx="200" cy="150" r="46" fill="#ffd84d"/><circle cx="216" cy="138" r="5" fill="#3b2a1a"/><circle cx="184" cy="138" r="5" fill="#3b2a1a"/><path d="M193 150 L207 150 L200 160 Z" fill="#fe920c"/><path d="M160 160 q-14 8 -6 20 q10 -4 14 -14z" fill="#f5c032"/><path d="M240 160 q14 8 6 20 q-10 -4 -14 -14z" fill="#f5c032"/></g>';
      h += '<g class="eg-bot"><path d="' + botHalf + '" fill="#fdf6e8" stroke="#d8c7a6" stroke-width="3"/><circle cx="170" cy="200" r="5" fill="#eadcc0"/><circle cx="232" cy="215" r="4" fill="#eadcc0"/>' + botCr + '</g>';
      h += '<g class="eg-top"><path d="' + topHalf + '" fill="#fdf6e8" stroke="#d8c7a6" stroke-width="3"/><circle cx="185" cy="100" r="5" fill="#eadcc0"/><circle cx="228" cy="120" r="4" fill="#eadcc0"/>' + topCr + '</g>';
      h += '<g class="fx bigonly">' + [[120, 70], [290, 80], [300, 150]].map(function (p, i) { return '<path class="heart" style="animation-delay:' + (0.9 + i * 0.25) + 's" d="M' + p[0] + ' ' + p[1] + ' c-6 -10 -20 -2 -12 8 l12 12 l12 -12 c8 -10 -6 -18 -12 -8z" fill="#f48fb1"/>'; }).join('') + '</g>';
      h += sparkles([[100, 120], [310, 200]]) + confetti(200, 120);
      return h;
    }
  };
  T.dino = {
    fam: 'grow', en: 'Dino eggs', de: 'Dino-Eier', finish: { en: 'Three baby dinosaurs hatch', de: 'Drei Dino-Babys schlüpfen' },
    draw: function (n, k, o) {
      var eggs = [
        { x: 96, cy: 166, rx: 50, ry: 60, fill: '#e6f2d2', spot: '#a9cf94', body: '#7cc96a', dark: '#4f9a45', spike: '#fe920c', lx: -70, lr: -45, d: 0 },
        { x: 200, cy: 150, rx: 56, ry: 68, fill: '#f6ead0', spot: '#e3bd82', body: '#5cc6c0', dark: '#2f938d', spike: '#8e4ec6', lx: -10, lr: 25, d: 0.35 },
        { x: 304, cy: 166, rx: 50, ry: 60, fill: '#e4ecf7', spot: '#a3bfdc', body: '#b388ff', dark: '#7d55c7', spike: '#ffd23f', lx: 70, lr: 45, d: 0.7 }
      ];
      var offs = [[-12, -26], [8, 22], [14, -6], [-16, 8]], top = ['', '', ''], bot = ['', '', ''];
      for (var i = 0; i < n; i++) {
        var e = eggs[i % 3], j = Math.floor(i / 3), sc = e.rx / 46, x = r1(e.x + offs[j][0] * sc), y = r1(e.cy + offs[j][1] * sc), c = state(i, k, o.newIdx);
        var d = 'M' + r1(x - 12) + ' ' + y + ' l6 -6 l6 8 l6 -7 l6 5';
        var el = c === 'slot' ? '<path class="slot" d="' + d + '" style="stroke:#d6c9ad"/>' : '<path class="' + c + '" d="' + d + '" fill="none" stroke="#6b5636" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>';
        if (y < e.cy) top[i % 3] += el; else bot[i % 3] += el;
      }
      var h = card('#f4fbf0') + '<path d="M4 236 H396 V270 Q396 296 370 296 H30 Q4 296 4 270 Z" fill="#d9ecc0"/>';
      h += '<path d="M40 238 q8 -22 14 0 M350 236 q8 -20 14 0 M70 240 q6 -14 10 0" fill="#9cc59a"/>';
      h += '<ellipse cx="200" cy="236" rx="168" ry="30" fill="#b98a55"/><path d="M42 232 q80 -16 158 -6 q78 -10 158 6" fill="none" stroke="#8d6538" stroke-width="4"/>';
      eggs.forEach(function (e, ei) {
        var x = e.x, cy = e.cy, zig = '', pts = [];
        for (var zx = x + e.rx, zj = 0; zx > x - e.rx; zx -= e.rx / 5, zj++) pts.push('L' + r1(zx) + ' ' + (zj % 2 ? cy + 7 : cy - 7));
        zig = pts.join(' ') + ' L' + (x - e.rx) + ' ' + cy;
        var topP = 'M' + (x - e.rx) + ' ' + cy + ' A' + e.rx + ' ' + r1(e.ry * 1.12) + ' 0 0 1 ' + (x + e.rx) + ' ' + cy + ' ' + zig + ' Z';
        var botP = 'M' + (x - e.rx) + ' ' + cy + ' A' + e.rx + ' ' + r1(e.ry * 0.88) + ' 0 0 0 ' + (x + e.rx) + ' ' + cy + ' ' + zig + ' Z';
        var s = e.rx / 46, sp = function (dx, dy, r) { return '<circle cx="' + r1(x + dx * s) + '" cy="' + r1(cy + dy * s) + '" r="' + r1(r * s) + '" fill="' + e.spot + '"/>'; };
        /* baby dino rising from the bottom shell */
        var hx = x + 6 * s, hy = cy - 46 * s;
        h += '<g class="fx dy-dino" style="--d:' + e.d + 's">';
        h += '<path d="M' + r1(hx - 22 * s) + ' ' + r1(hy - 10 * s) + ' l' + r1(7 * s) + ' ' + r1(-20 * s) + ' l' + r1(7 * s) + ' ' + r1(14 * s) + ' l' + r1(8 * s) + ' ' + r1(-22 * s) + ' l' + r1(7 * s) + ' ' + r1(16 * s) + ' l' + r1(8 * s) + ' ' + r1(-20 * s) + ' l' + r1(7 * s) + ' ' + r1(22 * s) + 'Z" fill="' + e.spike + '"/>';
        h += '<ellipse cx="' + x + '" cy="' + r1(cy - 6 * s) + '" rx="' + r1(30 * s) + '" ry="' + r1(32 * s) + '" fill="' + e.body + '"/>';
        h += '<ellipse cx="' + x + '" cy="' + r1(cy - 2 * s) + '" rx="' + r1(18 * s) + '" ry="' + r1(20 * s) + '" fill="#fff" opacity=".35"/>';
        h += '<ellipse cx="' + r1(hx) + '" cy="' + r1(hy) + '" rx="' + r1(28 * s) + '" ry="' + r1(22 * s) + '" fill="' + e.body + '"/>';
        h += '<circle cx="' + r1(hx - 9 * s) + '" cy="' + r1(hy - 5 * s) + '" r="' + r1(7.5 * s) + '" fill="#fff"/><circle cx="' + r1(hx + 9 * s) + '" cy="' + r1(hy - 5 * s) + '" r="' + r1(7.5 * s) + '" fill="#fff"/>';
        h += '<circle cx="' + r1(hx - 7.5 * s) + '" cy="' + r1(hy - 4 * s) + '" r="' + r1(4 * s) + '" fill="#2f2a33"/><circle cx="' + r1(hx + 10.5 * s) + '" cy="' + r1(hy - 4 * s) + '" r="' + r1(4 * s) + '" fill="#2f2a33"/>';
        h += '<path d="M' + r1(hx - 9 * s) + ' ' + r1(hy + 8 * s) + ' q' + r1(9 * s) + ' ' + r1(8 * s) + ' ' + r1(18 * s) + ' 0" fill="none" stroke="' + e.dark + '" stroke-width="3" stroke-linecap="round"/>';
        h += '<circle cx="' + r1(hx - 16 * s) + '" cy="' + r1(hy + 4 * s) + '" r="' + r1(4 * s) + '" fill="#f48fb1" opacity=".7"/><circle cx="' + r1(hx + 18 * s) + '" cy="' + r1(hy + 4 * s) + '" r="' + r1(4 * s) + '" fill="#f48fb1" opacity=".7"/>';
        h += '<ellipse cx="' + r1(x - 26 * s) + '" cy="' + r1(cy - 10 * s) + '" rx="' + r1(6 * s) + '" ry="' + r1(10 * s) + '" fill="' + e.dark + '" transform="rotate(-30 ' + r1(x - 26 * s) + ' ' + r1(cy - 10 * s) + ')"/>';
        h += '<ellipse cx="' + r1(x + 26 * s) + '" cy="' + r1(cy - 10 * s) + '" rx="' + r1(6 * s) + '" ry="' + r1(10 * s) + '" fill="' + e.dark + '" transform="rotate(30 ' + r1(x + 26 * s) + ' ' + r1(cy - 10 * s) + ')"/>';
        h += '</g>';
        h += '<g class="dy-bot"><path d="' + botP + '" fill="' + e.fill + '" stroke="#cbbf9f" stroke-width="3"/>' + sp(-18, 22, 6) + sp(16, 34, 4.5) + sp(24, 12, 3.5) + bot[ei] + '</g>';
        h += '<g class="dy-top" style="--d:' + e.d + 's;--lx:' + e.lx + 'px;--lr:' + e.lr + 'deg;transform-origin:' + x + 'px ' + cy + 'px"><path d="' + topP + '" fill="' + e.fill + '" stroke="#cbbf9f" stroke-width="3"/>' + sp(-14, -40, 6) + sp(18, -24, 5) + sp(-24, -14, 3.5) + top[ei] + '</g>';
      });
      h += '<g class="fx bigonly">' + [[64, 70], [200, 40], [336, 70]].map(function (p, i) { return '<path class="heart" style="animation-delay:' + (1.4 + i * 0.25) + 's" d="M' + p[0] + ' ' + p[1] + ' c-6 -10 -20 -2 -12 8 l12 12 l12 -12 c8 -10 -6 -18 -12 -8z" fill="#f48fb1"/>'; }).join('') + '</g>';
      h += sparkles([[60, 130], [340, 130], [150, 60], [255, 60]]) + confetti(200, 120);
      return h;
    }
  };
  T.rainbow = {
    fam: 'grow', en: 'Rainbow', de: 'Regenbogen', finish: { en: 'The sun comes out', de: 'Die Sonne kommt heraus' },
    draw: function (n, k, o) {
      var t = Math.min(22, 120 / n), cols = ['#e5484d', '#fe920c', '#ffd23f', '#a7cf3b', '#2a9df4', '#2a60a6', '#8e4ec6'];
      var h = card('#eaf6ff');
      h += '<g class="fx rb-sun"><circle cx="330" cy="62" r="24" fill="#ffd23f"/>';
      for (var a = 0; a < 10; a++) h += '<line x1="330" y1="28" x2="330" y2="18" stroke="#ffd23f" stroke-width="5" stroke-linecap="round" transform="rotate(' + (a * 36) + ' 330 62)"/>';
      h += '</g>';
      for (var i = 0; i < n; i++) {
        var ri = r1(170 - t * (i + 0.5)), d = 'M' + r1(200 - ri) + ' 262 A' + ri + ' ' + ri + ' 0 0 1 ' + r1(200 + ri) + ' 262', c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<path class="slot" d="' + d + '" style="stroke:#c3d4e3"/>';
        else h += '<path class="' + c.replace('pnew', 'pdraw') + '" pathLength="1" d="' + d + '" fill="none" stroke="' + cols[i % 7] + '" stroke-width="' + r1(t - 1.5) + '"/>';
      }
      function cloud(x, y) { return '<g><circle cx="' + (x - 22) + '" cy="' + y + '" r="18" fill="#fff"/><circle cx="' + x + '" cy="' + (y - 12) + '" r="24" fill="#fff"/><circle cx="' + (x + 24) + '" cy="' + y + '" r="18" fill="#fff"/><rect x="' + (x - 40) + '" y="' + y + '" width="82" height="18" rx="9" fill="#fff"/></g>'; }
      h += '<g class="fx">' + cloud(46, 246) + cloud(354, 246) + '</g>';
      h += sparkles([[200, 70], [120, 120], [280, 120], [70, 150]]) + confetti(200, 150);
      return h;
    }
  };

  /* ---------- DISCOVER ---------- */
  T.puzzle = {
    fam: 'discover', en: 'Puzzle', de: 'Puzzle', finish: { en: 'The picture comes together', de: 'Das Bild wird vollständig' },
    draw: function (n, k, o) {
      var id = 'pz' + (++uidN), rows = n <= 3 ? 1 : n <= 8 ? 2 : 3, base = Math.floor(n / rows), extra = n % rows, tiles = [], idx = 0;
      for (var r = 0; r < rows; r++) {
        var cnt = base + (r < extra ? 1 : 0), tw = 240 / cnt, th = 200 / rows;
        for (var c = 0; c < cnt; c++) tiles.push({ x: r1(80 + c * tw), y: r1(50 + r * th), w: r1(tw), h: r1(th), i: idx++ });
      }
      var scene = '<rect x="80" y="50" width="240" height="200" fill="#bfe3ff"/><circle cx="282" cy="92" r="22" fill="#ffd23f"/>' +
        '<path d="M80 205 Q150 150 220 200 T320 190 L320 250 L80 250 Z" fill="#8cc56b"/><path d="M80 230 Q180 200 320 228 L320 250 L80 250 Z" fill="#6aa84f"/>' +
        '<rect x="130" y="160" width="56" height="46" fill="#fe920c"/><path d="M122 162 L158 130 L194 162 Z" fill="#a12279"/><rect x="150" y="180" width="16" height="26" fill="#7a4a32"/>' +
        '<rect x="252" y="158" width="10" height="40" fill="#7a4a32"/><circle cx="257" cy="148" r="22" fill="#3f8f3a"/>' +
        '<path d="M100 80 q10 -10 20 0 q10 -10 20 0" fill="none" stroke="#fff" stroke-width="4"/>';
      var h = card() + '<defs><clipPath id="' + id + '">' + tiles.filter(function (t) { return t.i < k; }).map(function (t) { return '<rect x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '"/>'; }).join('') + '</clipPath></defs>';
      h += '<rect x="72" y="42" width="256" height="216" rx="10" fill="#e8dcc6"/>';
      tiles.forEach(function (t) { if (t.i >= k) h += '<rect class="slot" x="' + r1(t.x + 3) + '" y="' + r1(t.y + 3) + '" width="' + r1(t.w - 6) + '" height="' + r1(t.h - 6) + '" rx="6"/>'; });
      h += '<g clip-path="url(#' + id + ')">' + scene + '</g>';
      tiles.forEach(function (t) {
        if (t.i < k) h += '<rect class="pz-seam" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" fill="none" stroke="#fffaf0" stroke-width="3"/>';
        if (t.i === o.newIdx) h += '<rect class="pflash" x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" fill="#fff"/>';
      });
      h += '<g class="fx pz-full">' + scene + '<rect x="80" y="50" width="240" height="200" fill="none" stroke="#e0a83c" stroke-width="6"/></g>';
      h += '<clipPath id="' + id + 's"><rect x="80" y="50" width="240" height="200"/></clipPath><g clip-path="url(#' + id + 's)"><rect class="fx shine" x="40" y="40" width="40" height="230" fill="#fff" opacity=".45" transform="skewX(-20)"/></g>';
      h += sparkles([[60, 40], [345, 60], [345, 250], [55, 255]]) + confetti(200, 150);
      return h;
    }
  };
  T.treasure = {
    fam: 'discover', en: 'Treasure chest', de: 'Schatztruhe', finish: { en: 'Coins drop in and the chest opens', de: 'Münzen fallen hinein, die Truhe öffnet sich' },
    draw: function (n, k, o) {
      var cr = Math.min(20, 300 / n * 0.42);
      var h = card() + '<defs><radialGradient id="trg"><stop offset="0" stop-color="#fff6c2"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></radialGradient></defs>';
      h += '<ellipse cx="200" cy="262" rx="110" ry="12" fill="#000" opacity=".08"/>';
      h += '<circle class="fx tr-glow" cx="200" cy="160" r="110" fill="url(#trg)"/>';
      h += '<g class="fx tr-open"><path d="M134 172 L150 98 L250 98 L266 172 Z" fill="#7a4520"/><path d="M146 166 L158 108 L242 108 L254 166 Z" fill="#5b3216"/></g>';
      h += '<g class="fx tr-gems"><path d="M175 168 l10 -14 l10 14 l-10 10z" fill="#5fe1ff"/><path d="M205 166 l8 -12 l8 12 l-8 8z" fill="#e5484d"/><circle cx="230" cy="164" r="8" fill="#a7cf3b"/></g>';
      h += '<rect x="130" y="170" width="140" height="82" rx="10" fill="#9b5d2e"/><rect x="130" y="196" width="140" height="10" fill="#e0a83c"/><rect x="152" y="170" width="10" height="82" fill="#e0a83c"/><rect x="238" y="170" width="10" height="82" fill="#e0a83c"/><rect x="190" y="190" width="20" height="24" rx="4" fill="#ffd23f"/>';
      h += '<g class="tr-lid"><path d="M130 172 Q130 124 200 124 Q270 124 270 172 Z" fill="#a8683a"/><rect x="152" y="128" width="10" height="44" fill="#e0a83c"/><rect x="238" y="128" width="10" height="44" fill="#e0a83c"/></g>';
      for (var i = 0; i < n; i++) {
        var ang = (205 + 130 * (i + 0.5) / n) * Math.PI / 180, x = r1(200 + 150 * Math.cos(ang)), y = r1(190 + 150 * Math.sin(ang)), c = state(i, k, o.newIdx);
        if (c === 'slot') h += '<circle class="slot" cx="' + x + '" cy="' + y + '" r="' + r1(cr) + '"/>';
        else h += '<g class="coin ' + c + '" style="--tx:' + r1(200 - x) + 'px;--ty:' + r1(175 - y) + 'px;animation-delay:' + r1(i * 0.07) + 's"><circle cx="' + x + '" cy="' + y + '" r="' + r1(cr) + '" fill="#f6c343" stroke="#c9932a" stroke-width="3"/><circle cx="' + x + '" cy="' + y + '" r="' + r1(cr * 0.55) + '" fill="none" stroke="#e3a92d" stroke-width="2"/></g>';
      }
      h += sparkles([[150, 80], [255, 70], [200, 50], [300, 140], [100, 140]]) + confetti(200, 140);
      return h;
    }
  };

  var ORDER = ['cookie', 'pizza', 'icecream', 'cake', 'donut', 'rocket', 'train', 'robot', 'flower', 'egg', 'dino', 'rainbow', 'puzzle', 'treasure'];
  var FAMILIES = [
    { id: 'food', en: 'Food', de: 'Essen' }, { id: 'build', en: 'Build & go', de: 'Bauen & los' },
    { id: 'grow', en: 'Grow & hatch', de: 'Wachsen & schlüpfen' }, { id: 'discover', en: 'Discover', de: 'Entdecken' }
  ];

  function render(id, n, k, o) {
    o = o || {};
    var th = T[id] || T.cookie;
    n = Math.max(1, Math.min(10, n | 0));
    k = Math.max(0, Math.min(n, k | 0));
    var cls = 'th th-' + id + (k >= n ? ' done' : '') + (o.mode === 'big' ? ' big' : ' calm') + (o.reduced ? ' rm' : '');
    return '<svg class="' + cls + '" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + k + ' / ' + n + '">' + th.draw(n, k, o) + '</svg>';
  }

  var css = [
    '.th{width:100%;height:auto;display:block;overflow:hidden}',
    '.th .slot{fill:none;stroke:#cdbfa6;stroke-width:2.5;stroke-dasharray:5 5}',
    '.th .pnew,.th .pnew *{animation:thpop .55s cubic-bezier(.3,1.6,.5,1) both;transform-box:fill-box;transform-origin:center}',
    '.th .pdraw{stroke-dasharray:1;animation:thdraw .7s ease-out both}',
    '.th .pflash{opacity:0;animation:thflash .6s ease-out}',
    '.th .fx{opacity:0}',
    '.th.done .fx{opacity:1;animation:thfade .9s ease both}',
    '.th .bigonly{display:none}.th.big.done .bigonly{display:inline}',
    '.th .conf{transform-box:fill-box;transform-origin:center;animation:thconf 1.6s cubic-bezier(.2,.7,.4,1) both}',
    '.th.done .spk{transform-box:fill-box;transform-origin:center;animation:thspk 1.1s ease both}',
    '.th.calm.done .spk{animation-iteration-count:1}.th.big.done .spk{animation-iteration-count:3}',
    '.th.done .steam{animation:thsteam 1.8s ease-out 3 both}',
    '.th.done .flame{transform-box:fill-box;transform-origin:50% 100%;animation:thfade .4s ease both,thflick .5s ease-in-out 6 alternate}',
    '.th.big.done .flame{animation:thfade .4s ease both,thflick .45s ease-in-out infinite alternate}',
    '.th .twk{animation:none}.th.big.done .twk{animation:thtwk 1.2s ease-in-out 4 alternate}',
    /* cookie */
    '.th-cookie.done .ck-bake{animation:thfade 1.6s ease both}',
    '.th-cookie.big.done .ck-all{transform-box:fill-box;transform-origin:center;animation:thspin 1.4s cubic-bezier(.3,1.3,.5,1) .3s both}',
    /* pizza */
    '.th-pizza.done .pz-cheese{animation:thfade 1.4s ease both}.th-pizza.done .pz-cut{animation:thfade .6s ease 1.2s both}',
    '.th-pizza.big.done .pz-all{transform-box:fill-box;transform-origin:center;animation:thwiggle .9s ease 1.4s 2 both}',
    /* ice cream */
    '.th-icecream.done .ic-cherry{transform-box:fill-box;animation:thdrop .9s cubic-bezier(.3,1.5,.6,1) both}.th-icecream.done .ic-sprinkle{animation:thfade .8s ease .7s both}',
    '.th-icecream.big.done .ic-all{transform-box:fill-box;transform-origin:50% 100%;animation:thwiggle .8s ease 1s 3 both}',
    /* cake */
    '.th-cake.big.done .ck2-all{transform-box:fill-box;transform-origin:50% 100%;animation:thhop .6s ease 1s 3 both}',
    /* rocket */
    '.th-rocket.calm.done .rk{animation:thhover 1.6s ease .4s both}',
    '.th-rocket.big.done .rk{animation:thlaunch 3.2s ease-in-out .3s both}',
    /* train */
    '.th-train.done .smoke{transform-box:fill-box;transform-origin:center;animation:thsmoke 1.6s ease-out 3 both}',
    '.th-train.calm.done .tr{animation:thchug .35s ease-in-out .3s 6 alternate}',
    '.th-train.big.done .tr{animation:thdrive 3s ease-in-out .5s both}',
    /* robot */
    '.th-robot.done .rb-ant{animation:thfade .3s ease both,thblink .6s steps(2) .3s 5}',
    '.th-robot .rb-l{transform-box:view-box;transform-origin:144px 137px}.th-robot .rb-r{transform-box:view-box;transform-origin:256px 137px}',
    '.th-robot.done .rb-l{animation:thwaveL .7s ease-in-out .6s 2 alternate}.th-robot.done .rb-r{animation:thwaveR .7s ease-in-out .6s 4 alternate}',
    '.th-robot.big.done .rb{animation:thjump .5s ease .8s 4 alternate}',
    /* flower */
    '.th-flower .fl{transform-box:view-box;transform-origin:200px 286px}',
    '.th-flower.done .fl{animation:thsway 1.6s ease-in-out .4s 2 alternate}',
    '.th-flower.done .fl-sun{transform-box:view-box;transform-origin:70px 66px;animation:thfade .8s ease both,thsun 6s linear 1}',
    '.th-flower.big.done .bfly{transform-box:fill-box;transform-origin:center;animation:thflut .5s ease-in-out infinite alternate}',
    /* egg */
    '.th-egg.done .eg-top{transform-box:view-box;transform-origin:200px 150px;animation:thlid 1s cubic-bezier(.3,1.2,.5,1) both}',
    '.th-egg.done .eg-chick{animation:thfade .3s ease .3s both,thchick .8s cubic-bezier(.3,1.5,.6,1) .3s both}',
    '.th-egg.big.done .eg-chick{animation:thfade .3s ease .3s both,thchick .8s cubic-bezier(.3,1.5,.6,1) .3s both,thhop .5s ease 1.2s 4}',
    '.th-dino.big.done .heart,.th-egg.big.done .heart{transform-box:fill-box;transform-origin:center;animation:thheart 1.6s ease-out both}',
    /* rainbow */
    '.th-rainbow.done .rb-sun{transform-box:view-box;transform-origin:330px 62px;animation:thfade .8s ease both,thsun 8s linear 1}',
    /* puzzle */
    '.th-puzzle.done .pz-full{animation:thfade 1.2s ease .2s both}',
    '.th-puzzle.done .shine{opacity:.45;animation:thshine 1.4s ease .9s both}.th-puzzle.big.done .shine{animation:thshine 1.2s ease .9s 3 both}',
    /* treasure */
    '.th-treasure.done .coin.on{transform-box:fill-box;transform-origin:center;animation:thcoin .8s ease-in both}',
    '.th-treasure.done .tr-lid{animation:thout .3s ease .9s both}',
    '.th-treasure.done .tr-open{transform-box:fill-box;transform-origin:50% 100%;animation:thopen .6s cubic-bezier(.3,1.4,.6,1) 1s both}',
    '.th-treasure.done .tr-glow{animation:thfade .8s ease 1.2s both}.th-treasure.done .tr-gems{animation:thgems .9s cubic-bezier(.3,1.5,.6,1) 1.3s both}',
    '.th-treasure.big.done .tr-glow{animation:thfade .8s ease 1.2s both,thpulse 1s ease-in-out 2s 3 alternate}',
    '.th-donut .dnr{transform-box:fill-box;opacity:0}',
    '.th-donut.done .dnr{opacity:1;animation:thfade .15s ease var(--d) both,thdrop .7s cubic-bezier(.3,1.4,.6,1) var(--d) both}',
    '.th-donut.done .dn-gloss{animation:thfade .8s ease 1.1s both}',
    '.th-donut.big.done .dn-all{transform-box:fill-box;transform-origin:50% 100%;animation:thhop .6s ease 1.4s 3 both}',
    '.th-dino .dy-top{transform-box:view-box}',
    '.th-dino.done .dy-top{animation:thlid2 .9s cubic-bezier(.3,1.2,.5,1) var(--d) both}',
    '.th-dino.done .dy-dino{animation:thrise .8s cubic-bezier(.3,1.5,.6,1) calc(var(--d) + .25s) both}',
    '.th-dino.big.done .dy-dino{animation:thrise .8s cubic-bezier(.3,1.5,.6,1) calc(var(--d) + .25s) both,thhop .5s ease calc(var(--d) + 1.2s) 4}',
    '@keyframes thlid2{0%{transform:none;opacity:1}70%{opacity:1}100%{transform:translate(var(--lx),-80px) rotate(var(--lr));opacity:0}}',
    '@keyframes thrise{0%{transform:translateY(60px);opacity:0}25%{opacity:1}100%{transform:none;opacity:1}}',
    /* keyframes */
    '@keyframes thpop{0%{transform:translateY(-24px) scale(.2);opacity:0}100%{transform:none;opacity:1}}',
    '@keyframes thdraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}',
    '@keyframes thflash{0%{opacity:.8}100%{opacity:0}}',
    '@keyframes thfade{from{opacity:0}to{opacity:1}}',
    '@keyframes thconf{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(420deg);opacity:0}}',
    '@keyframes thspk{0%{transform:scale(0);opacity:0}50%{transform:scale(1.2);opacity:1}100%{transform:scale(0);opacity:0}}',
    '@keyframes thsteam{0%{transform:translateY(10px);opacity:0}40%{opacity:.8}100%{transform:translateY(-30px);opacity:0}}',
    '@keyframes thflick{from{transform:scaleY(1)}to{transform:scaleY(1.18) scaleX(.9)}}',
    '@keyframes thtwk{from{opacity:.3}to{opacity:1}}',
    '@keyframes thspin{0%{transform:rotate(0) scale(1)}50%{transform:rotate(200deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)}}',
    '@keyframes thwiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}',
    '@keyframes thdrop{0%{transform:translateY(-170px)}100%{transform:none}}',
    '@keyframes thhop{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}',
    '@keyframes thhover{0%{transform:translateY(0)}30%{transform:translateY(4px)}100%{transform:translateY(-22px)}}',
    '@keyframes thlaunch{0%{transform:translateY(0)}10%{transform:translateY(6px)}45%{transform:translateY(-340px)}55%{transform:translateY(-340px)}56%{transform:translateY(-340px)}100%{transform:translateY(-22px)}}',
    '@keyframes thsmoke{0%{transform:translate(0,0) scale(.4);opacity:0}30%{opacity:.9}100%{transform:translate(-30px,-60px) scale(1.4);opacity:0}}',
    '@keyframes thchug{from{transform:translateY(0)}to{transform:translateY(-3px)}}',
    '@keyframes thdrive{0%{transform:translateX(0)}45%{transform:translateX(430px)}46%{transform:translateX(-430px)}100%{transform:translateX(0)}}',
    '@keyframes thblink{0%{opacity:1}100%{opacity:.2}}',
    '@keyframes thwaveL{from{transform:rotate(0)}to{transform:rotate(25deg)}}',
    '@keyframes thwaveR{from{transform:rotate(0)}to{transform:rotate(-40deg)}}',
    '@keyframes thjump{from{transform:translateY(0)}to{transform:translateY(-18px)}}',
    '@keyframes thsway{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}',
    '@keyframes thsun{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
    '@keyframes thflut{from{transform:translateY(0) scaleX(1)}to{transform:translateY(-8px) scaleX(.6)}}',
    '@keyframes thlid{0%{transform:none}100%{transform:translate(-70px,-60px) rotate(-38deg)}}',
    '@keyframes thchick{0%{transform:translateY(46px)}100%{transform:none}}',
    '@keyframes thheart{0%{transform:translateY(10px) scale(.3);opacity:0}30%{opacity:1}100%{transform:translateY(-40px) scale(1);opacity:0}}',
    '@keyframes thshine{0%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(330px) skewX(-20deg)}}',
    '@keyframes thcoin{0%{transform:none;opacity:1}100%{transform:translate(var(--tx),var(--ty)) scale(.3);opacity:0}}',
    '@keyframes thopen{0%{transform:scaleY(.15)}100%{transform:none}}',
    '@keyframes thgems{0%{transform:translateY(20px);opacity:0}100%{transform:translateY(-34px);opacity:1}}',
    '@keyframes thout{from{opacity:1}to{opacity:0}}',
    '@keyframes thpulse{from{opacity:1}to{opacity:.55}}',
    /* reduced motion: show final states with no movement */
    '.th.rm *,.th.rm{animation:none!important;transition:none!important}',
    '.th.rm.done .tr-lid{opacity:0}.th.rm.done .coin.on{opacity:0}.th.rm.done .eg-top{transform-box:view-box;transform-origin:200px 150px;transform:translate(-70px,-60px) rotate(-38deg)}.th.rm .bigonly{display:none}.th.rm .shine{opacity:0}.th-dino.rm.done .dy-top{opacity:0}'
  ].join('\n');

  var api = { render: render, themes: T, order: ORDER, families: FAMILIES, css: css };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ATThemes = api;
})(typeof window !== 'undefined' ? window : globalThis);
