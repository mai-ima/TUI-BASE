/*
 * games-race.js — 疑似 3D のレースゲーム（GUI ウィンドウで走る）。
 *
 *   race                 … メニュー（コースを選ぶ・選手権・ガレージ・記録）
 *   race <コース> [難度] [周回]   例: race coast hard 2
 *   race career [難度]   … 3 戦の選手権。順位でポイントと賞金
 *   race shop            … 賞金で改造（エンジン・タイヤ・ニトロ・車体）
 *   race stats           … 自己ベストと戦績
 *
 * 描き方は昔ながらの「道路を区間に切って、奥から手前へ台形を投影する」方式。
 * カーブと起伏、路肩の飾り、ライバル車、ミニマップをすべて Canvas に手描きする。
 */
(function () {
  'use strict';

  var TB = window.TB;
  var def = TB.def;
  var K = TB.Kit;

  function ja() { return TB.state.lang === 'ja'; }
  function L(j, e) { return ja() ? j : e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function easeIn(a, b, p) { return a + (b - a) * Math.pow(p, 2); }
  function easeInOut(a, b, p) { return a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5); }
  function sfx(n) { if (TB.Sfx) TB.Sfx.play(n); }

  /* ---------- 定数 ------------------------------------------------------ */

  var SEG = 200;             // 1 区間の長さ
  var RUMBLE = 3;            // 縁石の縞の長さ（区間数）
  var ROAD_W = 2000;         // 道幅の半分
  var LANES = 3;
  var CAM_H = 1000;
  var DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);   // 視野角 100 度
  var DRAW = 220;            // 何区間先まで描くか
  var W = 640, H = 360;      // 内部の解像度
  var MAX = SEG * 60;        // 最高速（1 秒に 60 区間）
  var CENTRIFUGAL = 0.3;
  var PLAYER_Z = CAM_H * DEPTH;   // カメラから自車までの距離
  var CAR_W = 0.13;          // 車幅の半分（道幅の半分に対する比）
  var OVERLAP = CAR_W * 2 * 0.9;   // 横に重なったとみなす中心間の距離

  var POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
  var PRIZE = [320, 220, 160, 120, 90, 70, 50, 30];
  var UPG_COST = [200, 450, 800];
  var UPGRADES = [
    { id: 'engine', name: { ja: 'エンジン', en: 'Engine' }, what: { ja: '最高速と加速', en: 'top speed & acceleration' } },
    { id: 'tyres', name: { ja: 'タイヤ', en: 'Tyres' }, what: { ja: 'カーブで膨らみにくく、芝でも減速しにくい', en: 'grip in corners, less drag off-road' } },
    { id: 'nitro', name: { ja: 'ニトロ', en: 'Nitro' }, what: { ja: '量・回復・加速', en: 'capacity, refill and punch' } },
    { id: 'body', name: { ja: '車体', en: 'Body' }, what: { ja: 'ぶつかったときの傷みを減らす', en: 'take less damage in contact' } }
  ];

  var RIVALS = [
    { name: 'ASTRA', color: '#e06c75' }, { name: 'BOLT', color: '#ffd93d' },
    { name: 'CIRRUS', color: '#56a8f5' }, { name: 'DYNA', color: '#a78bfa' },
    { name: 'EDGE', color: '#ff9f43' }, { name: 'FLUX', color: '#4dd0e1' },
    { name: 'GALE', color: '#ff5fd2' }
  ];

  /* ---------- 保存 ------------------------------------------------------ */

  function money() { return parseInt(TB.store.get('race:money', '0'), 10) || 0; }
  function setMoney(v) { TB.store.set('race:money', String(Math.max(0, Math.round(v)))); }
  function upgrades() {
    try {
      var u = JSON.parse(TB.store.get('race:upg', '{}'));
      return { engine: u.engine || 0, tyres: u.tyres || 0, nitro: u.nitro || 0, body: u.body || 0 };
    } catch (e) { return { engine: 0, tyres: 0, nitro: 0, body: 0 }; }
  }
  function setUpgrades(u) { TB.store.set('race:upg', JSON.stringify(u)); }
  function bestLap(id) { var v = parseInt(TB.store.get('race:lap:' + id, ''), 10); return isNaN(v) ? null : v; }
  function stat(k) { return parseInt(TB.store.get('race:' + k, '0'), 10) || 0; }
  function addStat(k, n) { TB.store.set('race:' + k, String(stat(k) + (n || 1))); }

  function fmt(ms) {
    if (ms === null || ms === undefined || !isFinite(ms)) return '--:--.--';
    var m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000), c = Math.floor(ms % 1000 / 10);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
  }

  /* =====================================================================
     コース
     ===================================================================== */

  function builder() {
    var segs = [];
    function lastY() { return segs.length ? segs[segs.length - 1].p2.world.y : 0; }
    function add(curve, y) {
      var n = segs.length;
      segs.push({
        index: n, curve: curve, sprites: [],
        p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
        p2: { world: { y: y, z: (n + 1) * SEG }, camera: {}, screen: {} }
      });
    }
    function road(enter, hold, leave, curve, hill) {
      var startY = lastY(), endY = startY + (hill || 0) * SEG, total = enter + hold + leave, i;
      for (i = 0; i < enter; i++) add(easeIn(0, curve, i / enter), easeInOut(startY, endY, i / total));
      for (i = 0; i < hold; i++) add(curve, easeInOut(startY, endY, (enter + i) / total));
      for (i = 0; i < leave; i++) add(easeInOut(curve, 0, i / leave), easeInOut(startY, endY, (enter + hold + i) / total));
    }
    return {
      segs: segs,
      road: road,
      straight: function (n) { road(n, n, n, 0, 0); },
      curve: function (n, c, h) { road(n, n, n, c, h || 0); },
      hill: function (n, h) { road(n, n, n, 0, h); },
      bumps: function () {
        road(10, 10, 10, 0, 5); road(10, 10, 10, 0, -2); road(10, 10, 10, 0, -5);
        road(10, 10, 10, 0, 8); road(10, 10, 10, 0, 5); road(10, 10, 10, 0, -7);
      },
      sCurves: function (c) {
        road(30, 30, 30, -c, 0); road(30, 30, 30, c, 10); road(30, 30, 30, c, 0);
        road(30, 30, 30, -c, 0); road(30, 30, 30, -c, -10);
      },
      finish: function () {
        // 出発点の高さ 0 に戻して、つなぎ目で段差ができないようにする
        road(60, 40, 60, 0, -lastY() / SEG);
      }
    };
  }

  var TRACKS = {
    coast: {
      name: { ja: '海岸線', en: 'Coastline' }, laps: 3, diff: 1,
      pal: { sky: ['#4aa3df', '#bfe6ff'], far: '#6fa8c9', hill: '#2f8f5b', fog: '#bfe6ff',
             grass: ['#3fae5a', '#37a052'], road: ['#6b6b72', '#65656c'], rumble: ['#e7e7e7', '#e14d4d'], lane: '#f2f2f2' },
      deco: ['palm', 'palm', 'sign', 'rock'],
      build: function (b) {
        b.straight(40); b.curve(50, 2, 0); b.hill(40, 20); b.curve(60, -3, -10);
        b.straight(30); b.sCurves(3); b.curve(70, 3, 30); b.straight(40);
        b.curve(50, -2, -20); b.bumps(); b.curve(60, 4, 0); b.straight(50); b.finish();
      }
    },
    ridge: {
      name: { ja: '山岳路', en: 'Ridge Pass' }, laps: 3, diff: 2,
      pal: { sky: ['#f39c6b', '#ffe0b3'], far: '#8c6a8f', hill: '#5c7a3a', fog: '#ffe0b3',
             grass: ['#6f8f3a', '#678634'], road: ['#5c5c63', '#57575e'], rumble: ['#f5f5f5', '#333'], lane: '#e8e8e8' },
      deco: ['tree', 'tree', 'rock', 'sign'],
      build: function (b) {
        b.straight(30); b.hill(40, 40); b.curve(50, 4, 20); b.curve(40, -5, -30);
        b.hill(30, -30); b.sCurves(5); b.curve(50, 6, 40); b.bumps(); b.curve(40, -6, -20);
        b.hill(50, 30); b.curve(60, -4, -40); b.straight(40); b.sCurves(4); b.finish();
      }
    },
    city: {
      name: { ja: '夜の都市', en: 'Night City' }, laps: 3, diff: 3,
      pal: { sky: ['#0b0f24', '#2a2150'], far: '#1a1838', hill: '#141a2e', fog: '#1f1a3d',
             grass: ['#1a1f2b', '#171b26'], road: ['#2c2c38', '#282833'], rumble: ['#ffd93d', '#222'], lane: '#ffd93d' },
      deco: ['lamp', 'building', 'lamp', 'building', 'sign'],
      night: true,
      build: function (b) {
        b.straight(60); b.curve(40, 5, 0); b.straight(40); b.curve(40, -6, 10);
        b.straight(80); b.sCurves(6); b.curve(50, 5, -10); b.straight(40);
        b.curve(30, -7, 0); b.curve(30, 7, 0); b.straight(60); b.curve(50, -4, 0); b.finish();
      }
    }
  };
  var ORDER = ['coast', 'ridge', 'city'];

  function buildTrack(id) {
    var spec = TRACKS[id];
    var b = builder();
    spec.build(b);
    var segs = b.segs;

    // 路肩の飾り。カーブの外側には矢印看板を置く
    for (var i = 20; i < segs.length - 5; i++) {
      var seg = segs[i];
      if (Math.abs(seg.curve) > 2.5 && i % 12 === 0) {
        var out = seg.curve > 0 ? -1 : 1;
        seg.sprites.push({ kind: 'chevron', offset: out * 1.35, dir: seg.curve > 0 ? 1 : -1 });
      } else if (i % 9 === 0 || i % 14 === 0) {
        var kind = spec.deco[(i * 7) % spec.deco.length];
        var side = (i % 2 ? 1 : -1);
        var off = side * (kind === 'building' ? 2.4 + (i % 3) * 0.5 : 1.35 + (i % 5) * 0.28);
        seg.sprites.push({ kind: kind, offset: off, seed: i });
      }
    }
    // スタート / ゴールの門
    segs[2].sprites.push({ kind: 'gantry', offset: 0 });
    for (var k = 0; k < 3; k++) segs[k].finishLine = true;

    // ミニマップ用の平面の道筋（カーブを積分し、最後に閉じるよう補正）
    // サーキットらしく、一周でちょうど 360 度回るようにする。
    // カーブの揺れ（合計でおよそ 1.1π ぶん）に、一定の回転を足して帳尻を合わせる。
    var heading = 0, x = 0, y = 0, pts = [];
    var total = segs.reduce(function (a, s) { return a + s.curve; }, 0);
    var absTotal = segs.reduce(function (a, s) { return a + Math.abs(s.curve); }, 0) || 1;
    var turn = (3.2 * Math.PI) / absTotal;
    var bias = (2 * Math.PI - total * turn) / segs.length;
    segs.forEach(function (s) {
      heading += s.curve * turn + bias;
      x += Math.sin(heading); y -= Math.cos(heading);
      pts.push([x, y]);
    });
    var ex = pts[pts.length - 1][0], ey = pts[pts.length - 1][1];
    pts = pts.map(function (p, i2) {
      var f = (i2 + 1) / pts.length;
      return [p[0] - ex * f, p[1] - ey * f];
    });
    var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    pts.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var sc = 1 / Math.max(maxx - minx, maxy - miny);
    var map = pts.map(function (p) { return [(p[0] - minx) * sc, (p[1] - miny) * sc]; });

    return { id: id, spec: spec, segs: segs, length: segs.length * SEG, map: map };
  }

  /* =====================================================================
     描画の部品
     ===================================================================== */

  function project(p, camX, camY, camZ) {
    p.camera.x = (p.world.x || 0) - camX;
    p.camera.y = (p.world.y || 0) - camY;
    p.camera.z = (p.world.z || 0) - camZ;
    p.screen.scale = DEPTH / p.camera.z;
    p.screen.x = Math.round((W / 2) + (p.screen.scale * p.camera.x * W / 2));
    p.screen.y = Math.round((H / 2) - (p.screen.scale * p.camera.y * H / 2));
    p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
  }

  function poly(g, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4);
    g.closePath();
    g.fill();
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
    var gg = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
    var b = clamp(Math.round((n & 255) * f), 0, 255);
    return 'rgb(' + r + ',' + gg + ',' + b + ')';
  }

  /** 後ろから見た車。x は中心、y は接地面、w は車幅（画面上の画素） */
  function drawCar(g, x, y, w, color, opt) {
    opt = opt || {};
    var h = w * 0.56, lean = (opt.lean || 0) * w * 0.06;
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(x - w * 0.54, y - h * 0.07, w * 1.08, h * 0.12);
    g.fillStyle = '#121212';
    g.fillRect(x - w * 0.5, y - h * 0.34, w * 0.17, h * 0.34);
    g.fillRect(x + w * 0.33, y - h * 0.34, w * 0.17, h * 0.34);
    g.fillStyle = color;
    g.fillRect(x - w * 0.47, y - h * 0.66, w * 0.94, h * 0.44);
    poly(g, x - w * 0.34 + lean, y - h * 0.66, x + w * 0.34 + lean, y - h * 0.66,
         x + w * 0.26 + lean, y - h * 0.98, x - w * 0.26 + lean, y - h * 0.98, shade(color, 0.75));
    poly(g, x - w * 0.27 + lean, y - h * 0.7, x + w * 0.27 + lean, y - h * 0.7,
         x + w * 0.21 + lean, y - h * 0.93, x - w * 0.21 + lean, y - h * 0.93, '#1c2433');
    g.fillStyle = opt.brake ? '#ff3030' : '#8e1c1c';
    g.fillRect(x - w * 0.44, y - h * 0.6, w * 0.18, h * 0.1);
    g.fillRect(x + w * 0.26, y - h * 0.6, w * 0.18, h * 0.1);
    g.fillStyle = shade(color, 0.55);
    g.fillRect(x - w * 0.47, y - h * 0.3, w * 0.94, h * 0.07);
    if (w > 26) {
      g.fillStyle = '#e8e8e8';
      g.fillRect(x - w * 0.1, y - h * 0.44, w * 0.2, h * 0.1);
    }
    if (opt.boost) {
      g.fillStyle = 'rgba(80,180,255,.85)';
      g.fillRect(x - w * 0.36, y - h * 0.24, w * 0.12, h * (0.18 + Math.random() * 0.2));
      g.fillRect(x + w * 0.24, y - h * 0.24, w * 0.12, h * (0.18 + Math.random() * 0.2));
    }
    if (opt.label && w > 18) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.font = 'bold ' + clamp(Math.round(w * 0.14), 8, 13) + 'px monospace';
      g.textAlign = 'center';
      g.fillText(opt.label, x, y - h * 1.08);
      g.fillStyle = '#fff';
      g.fillText(opt.label, x - 1, y - h * 1.1);
    }
  }

  /** 路肩の飾り。s は大きさの基準（画面上の道幅の半分） */
  function drawSprite(g, sp, x, y, s, pal, night) {
    var u = s * 0.12;
    switch (sp.kind) {
      case 'tree':
        g.fillStyle = '#5b3a1e'; g.fillRect(x - u * 0.3, y - u * 2, u * 0.6, u * 2);
        poly(g, x - u * 2, y - u * 1.6, x + u * 2, y - u * 1.6, x + u * 0.2, y - u * 5, x - u * 0.2, y - u * 5, '#1f6b3a');
        poly(g, x - u * 1.5, y - u * 3.4, x + u * 1.5, y - u * 3.4, x + u * 0.1, y - u * 6.2, x - u * 0.1, y - u * 6.2, '#27804a');
        break;
      case 'palm':
        g.fillStyle = '#8a5a2b';
        poly(g, x - u * 0.3, y, x + u * 0.3, y, x + u * 0.8, y - u * 6, x + u * 0.3, y - u * 6, '#8a5a2b');
        g.fillStyle = '#2e9b4f';
        for (var i = 0; i < 5; i++) {
          var a = -Math.PI / 2 + (i - 2) * 0.7;
          poly(g, x + u * 0.5, y - u * 6, x + u * 0.5 + Math.cos(a) * u * 3, y - u * 6 + Math.sin(a) * u * 3 + u * 1.2,
               x + u * 0.5 + Math.cos(a) * u * 3.2, y - u * 6 + Math.sin(a) * u * 3 + u * 1.6, x + u * 0.5, y - u * 5.6, '#2e9b4f');
        }
        break;
      case 'rock':
        poly(g, x - u * 1.6, y, x + u * 1.5, y, x + u * 0.9, y - u * 1.4, x - u * 0.8, y - u * 1.6, '#8c8c8c');
        poly(g, x - u * 0.8, y - u * 1.6, x + u * 0.9, y - u * 1.4, x + u * 0.3, y - u * 2.1, x - u * 0.3, y - u * 2.2, '#a8a8a8');
        break;
      case 'lamp':
        g.fillStyle = '#555'; g.fillRect(x - u * 0.15, y - u * 6, u * 0.3, u * 6);
        g.fillRect(x - u * 1.2 * Math.sign(sp.offset), y - u * 6, u * 1.2, u * 0.25);
        g.fillStyle = night ? '#ffe9a3' : '#ddd';
        g.fillRect(x - u * 1.3 * Math.sign(sp.offset) - u * 0.2, y - u * 5.95, u * 0.6, u * 0.3);
        if (night) {
          g.fillStyle = 'rgba(255,233,163,.12)';
          g.beginPath(); g.arc(x - u * 1.2 * Math.sign(sp.offset), y - u * 5.6, u * 2.2, 0, Math.PI * 2); g.fill();
        }
        break;
      case 'building':
        var bw = u * (6 + (sp.seed % 3) * 2), bh = u * (10 + (sp.seed % 4) * 4);
        g.fillStyle = night ? '#1b1f33' : '#6b7280';
        g.fillRect(x - bw / 2, y - bh, bw, bh);
        if (u > 1.2) {
          for (var wy = 1; wy * u * 1.6 < bh - u; wy++) {
            for (var wx = 0; wx < 4; wx++) {
              var lit = ((sp.seed + wy * 3 + wx * 5) % 4) !== 0;
              g.fillStyle = night ? (lit ? '#ffd76a' : '#2a2f47') : '#9aa3b1';
              g.fillRect(x - bw / 2 + bw * (0.12 + wx * 0.22), y - bh + wy * u * 1.6, bw * 0.12, u * 0.8);
            }
          }
        }
        break;
      case 'sign':
        g.fillStyle = '#444'; g.fillRect(x - u * 1.4, y - u * 2.4, u * 0.2, u * 2.4); g.fillRect(x + u * 1.2, y - u * 2.4, u * 0.2, u * 2.4);
        g.fillStyle = '#f2f2f2'; g.fillRect(x - u * 1.8, y - u * 4, u * 3.6, u * 1.8);
        if (u > 1.4) {
          g.fillStyle = '#e14d4d'; g.font = 'bold ' + Math.round(u * 1.1) + 'px monospace'; g.textAlign = 'center';
          g.fillText('TUI', x, y - u * 2.7);
        }
        break;
      case 'chevron':
        g.fillStyle = '#333'; g.fillRect(x - u * 0.15, y - u * 2.2, u * 0.3, u * 2.2);
        g.fillStyle = '#ffd93d'; g.fillRect(x - u * 1.6, y - u * 3.6, u * 3.2, u * 1.6);
        g.fillStyle = '#222';
        for (var c = -1; c <= 1; c++) {
          var cx = x + c * u * 0.9, d = sp.dir;
          poly(g, cx - d * u * 0.3, y - u * 3.45, cx + d * u * 0.2, y - u * 2.8, cx - d * u * 0.3, y - u * 2.15, cx - d * u * 0.1, y - u * 2.8, '#222');
        }
        break;
      case 'gantry':
        var half = s * 1.2;
        g.fillStyle = '#333';
        g.fillRect(x - half, y - s * 0.9, s * 0.05, s * 0.9);
        g.fillRect(x + half - s * 0.05, y - s * 0.9, s * 0.05, s * 0.9);
        var cells = 16, cw = (half * 2) / cells;
        for (var k = 0; k < cells; k++) {
          g.fillStyle = k % 2 ? '#111' : '#f5f5f5';
          g.fillRect(x - half + k * cw, y - s * 0.95, cw, s * 0.07);
          g.fillStyle = k % 2 ? '#f5f5f5' : '#111';
          g.fillRect(x - half + k * cw, y - s * 0.88, cw, s * 0.07);
        }
        break;
    }
  }

  /** 当たり判定用の幅（道幅の半分に対する比） */
  function spriteWidth(kind) {
    return { tree: 0.35, palm: 0.3, rock: 0.35, lamp: 0.12, building: 0.9, sign: 0.4, chevron: 0.35 }[kind] || 0;
  }

  /* =====================================================================
     レース本体
     ===================================================================== */

  /** 文字版の画面の大きさ（桁数・行数）を、今のターミナルの幅から決める */
  function textDims() {
    var screen = document.getElementById('screen');
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;line-height:1;letter-spacing:0';
    probe.textContent = new Array(51).join('0');
    screen.appendChild(probe);
    var cw = probe.getBoundingClientRect().width / 50 || 8;
    screen.removeChild(probe);
    var lh = parseFloat(window.getComputedStyle(screen).fontSize) || 14;   // 文字版は行間 1.0
    var cols = clamp(Math.floor((screen.clientWidth - 40) / cw), 40, 120);
    // 枠（状態・案内・メッセージ）と見出しのぶんを引いた高さに収める
    var pane = document.getElementById('main').clientHeight;
    var fit = Math.floor((pane - lh * 11) / lh);
    var rows = clamp(Math.min(Math.round(cols * 0.3), fit), 14, 30);
    return { w: cols, h: rows };
  }

  function startRace(cfg) {
    // cfg: { track, laps, level, career, tui, onDone(result) }
    var tui = !!cfg.tui;
    // 縦長の画面（スマートフォンの縦持ち）では、描画も縦長にする
    var portrait = !tui && window.innerHeight > window.innerWidth * 1.1;
    if (tui) { var dims = textDims(); W = dims.w; H = dims.h; }
    else { W = portrait ? 400 : 640; H = portrait ? 600 : 360; }
    var T = buildTrack(cfg.track);
    var segs = T.segs, trackLen = T.length, pal = T.spec.pal, night = !!T.spec.night;
    var up = upgrades();
    var level = cfg.level || 'normal';
    var lvl = { easy: 0.9, normal: 1.0, hard: 1.06 }[level] || 1.0;

    var P = {
      pos: 0, x: 0, speed: 0, total: 0, lap: 0,
      nitro: 0.6, boosting: false, damage: 0,
      lapStart: 0, lastLap: null, bestLap: null, laps: [],
      finished: false, finishTime: null, bump: 0, draft: 0, hitCool: 0
    };
    var accel = MAX / 5 * (1 + up.engine * 0.1);
    var topSpeed = MAX * (1 + up.engine * 0.04);
    var grip = 1 - up.tyres * 0.12;
    var offDecel = -MAX / 2 * (1 - up.tyres * 0.12);
    var nitroRate = 0.28 / (1 + up.nitro * 0.25);
    var nitroPower = 1.22 + up.nitro * 0.03;
    var dmgTaken = 1 - up.body * 0.2;

    // グリッド（自車は後方スタート）
    var grid = RIVALS.slice(0, 7);
    var cars = grid.map(function (r, i) {
      var row = Math.floor(i / 2), side = i % 2 ? 0.45 : -0.45;
      return {
        name: r.name, color: r.color,
        total: (7 - row) * SEG * 3 + (i % 2) * SEG,
        offset: side, target: side,
        speed: 0,
        max: MAX * lvl * (0.9 + (i / 7) * 0.12) * (0.98 + Math.random() * 0.04),
        boostT: 0,
        skill: 0.6 + Math.random() * 0.4,
        finished: false, finishTime: null, lapsDone: 0
      };
    });
    P.x = 0;

    var state = 'count', countT = 3.6, raceT = 0, keys = {}, paused = false;
    var msg = { text: '', t: 0 }, skyOff = 0, hillOff = 0, last = null, raf = 0, closed = false;
    var finishWait = 0, results = null;

    var KEYMAP = {
      ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
      ' ': 'nitro', Shift: 'nitro', n: 'nitro', N: 'nitro'
    };
    function onDown(key) {
      if (closed) return;
      if (key === 'm' || key === 'M') { switchMode(); return; }
      if (key === 'p' || key === 'P') { if (state === 'race' || state === 'count') { paused = !paused; last = null; } return; }
      if (key === 'Enter' && state === 'results') { next(); return; }
      if (KEYMAP[key]) keys[KEYMAP[key]] = true;
    }
    function onUp(key) { if (KEYMAP[key]) keys[KEYMAP[key]] = false; }

    // スマホ用ボタン（押している間だけ効く）
    function makePad() {
      var pad = document.createElement('div');
      pad.className = 'race-pad';
      [['◀', 'left'], ['▶', 'right'], ['N₂O', 'nitro'], ['BRK', 'down'], ['GAS', 'up']].forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button'; b.textContent = p[0]; b.className = 'rbtn ' + p[1];
        function on(e) { e.preventDefault(); keys[p[1]] = true; }
        function off(e) { e.preventDefault(); keys[p[1]] = false; }
        b.addEventListener('pointerdown', on);
        b.addEventListener('pointerup', off);
        b.addEventListener('pointerleave', off);
        b.addEventListener('pointercancel', off);
        pad.appendChild(b);
      });
      return pad;
    }

    var titleText = 'TUI RACING — ' + TB.t(T.spec.name) + (cfg.career ? L('  [選手権 第 ' + cfg.career.round + ' 戦]', '  [championship round ' + cfg.career.round + ']') : '');
    var keysHint = L('←→ ハンドル  ↑ アクセル  ↓ ブレーキ  スペース ニトロ  p 一時停止  m ' + (tui ? 'GUI' : 'TUI') + ' へ  q やめる',
                     '←→ steer  ↑ accelerate  ↓ brake  space nitro  p pause  m to ' + (tui ? 'GUI' : 'TUI') + '  q quit');
    var win = null, g = null, s = null, view = null;

    if (!tui) {
      /* --- GUI: 窓と Canvas --- */
      win = TB.Win.open({
        title: titleText, width: 860, maximized: true, bodyClass: 'race-body',
        onClose: function () { finish('closed'); },
        toTui: function () { switchMode(); }
      });
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H; cv.className = 'race-canvas';
      cv.style.aspectRatio = W + ' / ' + H;
      cv.style.maxWidth = 'calc((100dvh - ' + (portrait ? 13 : 9) + 'em) * ' + (W / H).toFixed(3) + ')';
      win.body.appendChild(cv);
      g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      var hint = document.createElement('div');
      hint.className = 'ghint race-hint';
      hint.textContent = keysHint;
      win.body.appendChild(hint);
      win.body.appendChild(makePad());
      cv.addEventListener('pointerdown', function () { if (state === 'results') next(); });
      TB.Term.capture(function (key) {
        if (key === 'q' || key === 'Escape') { if (!closed) win.close(); return; }
        onDown(key);
      }, onUp);
    } else {
      /* --- TUI: ターミナルの中に文字で描く --- */
      s = TB.Kit.open({
        title: titleText + L('  (文字版)', '  (text mode)'),
        subtitle: L('同じコースを文字だけで走ります。GUI 版は race ' + T.id + '。', 'Same track, drawn in text. GUI version: race ' + T.id + '.'),
        hint: keysHint,
        onKey: onDown,
        onKeyUp: onUp,
        onQuit: function () {
          var done = state === 'results' ? results : null;
          stop();
          if (cfg.onDone) setTimeout(function () { cfg.onDone(done, 'closed'); }, 0);
          return [];
        }
      });
      view = document.createElement('div');
      view.className = 'g-map tr-view';
      [['--tr-sky', pal.sky[0]], ['--tr-sky2', pal.sky[1]], ['--tr-hill', pal.hill],
       ['--tr-grass-a', pal.grass[0]], ['--tr-grass-b', pal.grass[1]],
       ['--tr-road-a', pal.road[0]], ['--tr-road-b', pal.road[1]],
       ['--tr-rumble-a', pal.rumble[0]], ['--tr-rumble-b', pal.rumble[1]], ['--tr-lane', pal.lane]].forEach(function (v) {
        view.style.setProperty(v[0], v[1]);
      });
      s.body.appendChild(view);
      s.body.appendChild(makePad());
      view.addEventListener('pointerdown', function () { if (state === 'results') next(); });
    }

    var eng = TB.Sfx ? TB.Sfx.engine() : { set: function () {}, stop: function () {} };

    function say(text, t) { msg.text = text; msg.t = t || 1.6; }

    function findSeg(z) { return segs[Math.floor(z / SEG) % segs.length]; }

    /* 自車はカメラより PLAYER_Z だけ前に描いている。ライバルとの比較はこちらで行う */
    function pz() { return P.total + PLAYER_Z; }

    function rank() {
      var n = 1, me = pz();
      cars.forEach(function (c) { if (c.total > me) n++; });
      return n;
    }

    /* --- 更新 --- */
    function update(dt) {
      if (msg.t > 0) msg.t -= dt;

      if (state === 'count') {
        var before = Math.ceil(countT);
        countT -= dt;
        var after = Math.ceil(countT);
        if (after !== before && after >= 1 && after <= 3) sfx('count');
        if (countT <= 0) { state = 'race'; say('GO!', 1); sfx('go'); }
        eng.set(keys.up ? 0.6 : 0.1);
        return;
      }
      if (state === 'results') { eng.set(0); return; }

      raceT += dt;
      var seg = findSeg(P.pos + PLAYER_Z);
      var pct = P.speed / MAX;
      var dx = dt * 2 * pct;

      // ハンドルと遠心力
      if (!P.finished) {
        if (keys.left) P.x -= dx;
        else if (keys.right) P.x += dx;
      }
      P.x -= dx * pct * seg.curve * CENTRIFUGAL * grip;

      // スリップストリーム（前の車の真後ろにつくと速くなり、ニトロが溜まる）
      P.draft = 0;
      cars.forEach(function (c) {
        var gap = c.total - pz();
        if (gap > SEG * 1.5 && gap < SEG * 9 && Math.abs(c.offset - P.x) < 0.35) P.draft = 1;
      });

      // ニトロ
      P.boosting = false;
      if (keys.nitro && P.nitro > 0.02 && !P.finished && pct > 0.2) {
        P.boosting = true;
        P.nitro = Math.max(0, P.nitro - nitroRate * dt);
        if (!P.wasBoosting) sfx('boost');
      }
      P.wasBoosting = P.boosting;
      var refill = (0.012 + (P.draft ? 0.08 : 0) + (pct > 0.85 && Math.abs(P.x) < 1 ? 0.018 : 0)) * (1 + up.nitro * 0.2);
      if (!P.boosting) P.nitro = Math.min(1, P.nitro + refill * dt);

      var limit = topSpeed * (1 - P.damage * 0.18) * (P.boosting ? nitroPower : 1) * (P.draft ? 1.06 : 1);
      if (P.finished) {
        P.speed = Math.max(MAX * 0.35, P.speed - MAX * 0.4 * dt);
      } else if (keys.up || P.boosting) {
        P.speed += (P.boosting ? accel * 1.6 : accel) * dt;
      } else if (keys.down) {
        P.speed -= MAX * dt;
      } else {
        P.speed -= MAX / 5 * dt;
      }

      // 芝に出たら減速、飾りにぶつかったら止まる
      if (P.x < -1 || P.x > 1) {
        if (P.speed > MAX / 4) P.speed += offDecel * dt;
        seg.sprites.forEach(function (sp) {
          var sw = spriteWidth(sp.kind);
          if (!sw) return;
          var so = sp.offset + (sp.offset > 0 ? sw / 2 : -sw / 2) * 0.6;
          if (Math.abs(P.x - so) < sw * 0.5 + CAR_W && P.speed > MAX / 6) {
            P.speed = MAX / 6;
            P.damage = Math.min(1, P.damage + 0.08 * dmgTaken);
            P.pos = Math.max(0, P.pos - SEG * 0.4);
            P.bump = 0.3;
            sfx('crash');
            say(L('クラッシュ！', 'CRASH!'), 1);
          }
        });
      }

      // ライバルとの接触（追突したときだけ。速度差が大きいほど傷む）
      if (P.hitCool > 0) P.hitCool -= dt;
      cars.forEach(function (c) {
        var gap = c.total - pz();
        if (gap > 0 && gap < SEG * 0.8 && Math.abs(c.offset - P.x) < OVERLAP && P.speed > c.speed) {
          var closing = (P.speed - c.speed) / MAX;
          P.speed = c.speed * 0.9;
          P.x += (P.x > c.offset ? 0.12 : -0.12);
          c.target = clamp(c.offset + (c.offset > P.x ? 0.3 : -0.3), -0.85, 0.85);
          if (P.hitCool <= 0) {
            P.damage = Math.min(1, P.damage + clamp(closing * 0.12, 0.005, 0.03) * dmgTaken);
            P.hitCool = 0.6;
            P.bump = 0.2;
            sfx('hit');
          }
        }
      });

      P.speed = clamp(P.speed, 0, limit);
      if (P.speed > limit) P.speed = limit;
      P.x = clamp(P.x, -2.6, 2.6);
      if (P.bump > 0) P.bump -= dt;

      var move = P.speed * dt;
      P.pos += move;
      P.total += move;
      while (P.pos >= trackLen) P.pos -= trackLen;

      // 周回
      var lapNow = Math.floor(P.total / trackLen);
      if (lapNow > P.lap && !P.finished) {
        var t = raceT - P.lapStart;
        P.laps.push(t * 1000);
        P.lastLap = t * 1000;
        if (P.bestLap === null || P.lastLap < P.bestLap) P.bestLap = P.lastLap;
        var pb = bestLap(T.id);
        if (pb === null || P.lastLap < pb) {
          TB.store.set('race:lap:' + T.id, String(Math.round(P.lastLap)));
          say(L('自己ベスト！ ', 'NEW BEST LAP ') + fmt(P.lastLap), 2.2);
        } else {
          say(L('ラップ ', 'LAP ') + fmt(P.lastLap), 1.8);
        }
        sfx('lap');
        P.lap = lapNow;
        P.lapStart = raceT;
        if (P.lap >= cfg.laps) {
          P.finished = true;
          P.finishTime = raceT;
          P.place = rank();
          say(P.place === 1 ? L('優勝！', 'VICTORY!') : L('ゴール！ ', 'FINISH! ') + P.place + L(' 位', ordinal(P.place)), 3);
          sfx(P.place <= 3 ? 'win' : 'lap');
        } else if (P.lap === cfg.laps - 1) {
          setTimeout(function () { say(L('ファイナルラップ', 'FINAL LAP'), 1.8); }, 1300);
        }
      }

      // ライバル
      cars.forEach(function (c) {
        var cs = findSeg((c.total + PLAYER_Z) % trackLen);
        var curv = Math.abs(cs.curve);
        var target = c.max * (1 - curv * 0.022 * (1.2 - c.skill));
        var gap = pz() - c.total;
        // 追い上げ・様子見（離れすぎないように）
        if (!P.finished) {
          if (gap > SEG * 60) target *= 1.12;
          else if (gap > SEG * 25) target *= 1.06;
          else if (gap < -SEG * 60) target *= 0.93;
        }
        // ライバルもニトロを使う（直線でときどき）
        if (c.boostT > 0) { c.boostT -= dt; target *= 1.14; }
        else if (state === 'race' && curv < 0.5 && Math.random() < 0.12 * dt * c.skill) c.boostT = 1.2 + Math.random();
        c.speed += (c.speed < target ? MAX / 5.5 : -MAX / 3) * dt;
        c.speed = clamp(c.speed, 0, c.max * 1.2);
        if (state === 'race') c.total += c.speed * dt;

        // 前の車や自車をよける
        var blocked = false;
        cars.forEach(function (o) {
          if (o === c) return;
          var d = o.total - c.total;
          if (d > 0 && d < SEG * 5 && Math.abs(o.offset - c.offset) < OVERLAP * 1.3 && o.speed < c.speed) blocked = true;
        });
        var dp = pz() - c.total;
        if (dp > 0 && dp < SEG * 5 && Math.abs(P.x - c.offset) < OVERLAP * 1.3) blocked = true;
        if (blocked) c.target = c.offset > 0 ? c.offset - 0.6 : c.offset + 0.6;
        // カーブではイン側へ
        if (!blocked && Math.random() < 0.01) c.target = clamp(-cs.curve * 0.12 + (Math.random() - 0.5) * 0.6, -0.8, 0.8);
        c.target = clamp(c.target, -0.82, 0.82);
        c.offset += clamp(c.target - c.offset, -dt * 0.9, dt * 0.9);

        var cl = Math.floor(c.total / trackLen);
        if (cl >= cfg.laps && !c.finished) { c.finished = true; c.finishTime = raceT; }
      });

      // 視差
      skyOff += dt * pct * seg.curve * 0.0012;
      hillOff += dt * pct * seg.curve * 0.0025;

      eng.set(clamp(pct * (P.boosting ? 1.15 : 1), 0, 1.2));

      if (P.finished) {
        finishWait += dt;
        var allDone = cars.every(function (c) { return c.finished; });
        if (allDone || finishWait > 7) settle();
      }
    }

    function ordinal(n) { return ['st', 'nd', 'rd'][n - 1] || 'th'; }

    function settle() {
      if (state === 'results') return;
      state = 'results';
      var list = [{ name: 'YOU', you: true, time: P.finishTime, total: pz() }].concat(cars.map(function (c) {
        return { name: c.name, color: c.color, time: c.finished ? c.finishTime : null, total: c.total };
      }));
      list.sort(function (a, b) {
        if (a.time !== null && b.time !== null) return a.time - b.time;
        if (a.time !== null) return -1;
        if (b.time !== null) return 1;
        return b.total - a.total;
      });
      var place = list.findIndex(function (r) { return r.you; }) + 1;
      var prize = Math.round(PRIZE[place - 1] * (cfg.career ? 1 : 0.5) * (level === 'hard' ? 1.3 : level === 'easy' ? 0.7 : 1));
      setMoney(money() + prize);
      addStat('races');
      if (place === 1) addStat('wins');
      if (place <= 3) addStat('podiums');
      results = { place: place, list: list, prize: prize, best: P.bestLap, time: P.finishTime, laps: P.laps };
      if (cfg.career) {
        list.forEach(function (r, i) { cfg.career.points[r.name] = (cfg.career.points[r.name] || 0) + (POINTS[i] || 0); });
      }
    }

    /* --- 描画 --- */
    function render() {
      var base = findSeg(P.pos);
      var basePct = (P.pos % SEG) / SEG;
      var pSeg = findSeg(P.pos + PLAYER_Z);
      var pPct = ((P.pos + PLAYER_Z) % SEG) / SEG;
      var pY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
      var maxy = H, x = 0, dx = -(base.curve * basePct);

      // 空と遠景
      var sky = g.createLinearGradient(0, 0, 0, H * 0.6);
      sky.addColorStop(0, pal.sky[0]); sky.addColorStop(1, pal.sky[1]);
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      if (night) {
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (var st = 0; st < 40; st++) {
          var sx = ((st * 97 + skyOff * 800) % W + W) % W, sy = (st * 53) % (H * 0.4);
          g.fillRect(sx, sy, 1, 1);
        }
      } else {
        g.fillStyle = 'rgba(255,255,255,.8)';
        for (var cl = 0; cl < 5; cl++) {
          var cx = ((cl * 170 + skyOff * 600) % (W + 120) + W + 120) % (W + 120) - 60;
          g.beginPath(); g.ellipse(cx, 40 + (cl % 3) * 18, 34, 9, 0, 0, Math.PI * 2); g.fill();
        }
      }
      drawRange(pal.far, H * 0.5, 38, skyOff * 900, 7);
      drawRange(pal.hill, H * 0.53, 26, hillOff * 1200, 13);

      // 道路（手前から奥へ）
      for (var n = 0; n < DRAW; n++) {
        var s = segs[(base.index + n) % segs.length];
        var looped = s.index < base.index;
        s.fog = 1 / Math.pow(Math.E, Math.pow(n / DRAW, 2) * 5);
        s.clip = maxy;
        project(s.p1, (P.x * ROAD_W) - x, pY + CAM_H, P.pos - (looped ? trackLen : 0));
        project(s.p2, (P.x * ROAD_W) - x - dx, pY + CAM_H, P.pos - (looped ? trackLen : 0));
        x += dx; dx += s.curve;
        if (s.p1.camera.z <= DEPTH || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy) continue;
        drawSegment(s);
        maxy = s.p2.screen.y;
      }

      // 飾りと車（奥から手前へ）
      var carSeg = {};
      cars.forEach(function (c) {
        if (c.total - pz() < -SEG * 0.3) return;   // 自車より後ろ（カメラとの間）は描かない
        var z = ((c.total % trackLen) + trackLen) % trackLen;
        var idx = Math.floor(z / SEG);
        (carSeg[idx] = carSeg[idx] || []).push({ c: c, pct: (z % SEG) / SEG });
      });
      for (n = DRAW - 1; n > 0; n--) {
        var sg = segs[(base.index + n) % segs.length];
        if (!sg.p1.screen.scale || sg.p1.camera.z <= DEPTH) continue;
        var scale = sg.p1.screen.scale;
        g.save();
        g.beginPath(); g.rect(0, 0, W, sg.clip); g.clip();
        sg.sprites.forEach(function (sp) {
          var sx = sg.p1.screen.x + (scale * sp.offset * ROAD_W * W / 2);
          drawSprite(g, sp, sx, sg.p1.screen.y, sg.p1.screen.w, pal, night);
        });
        (carSeg[sg.index] || []).forEach(function (e) {
          var c = e.c;
          var sc2 = lerp(sg.p1.screen.scale, sg.p2.screen.scale, e.pct);
          var cx = lerp(sg.p1.screen.x, sg.p2.screen.x, e.pct) + (sc2 * c.offset * ROAD_W * W / 2);
          var cy = lerp(sg.p1.screen.y, sg.p2.screen.y, e.pct);
          var cw = sc2 * CAR_W * 2 * ROAD_W * W / 2;
          if (cw < 2) return;
          drawCar(g, cx, cy, cw, c.color, { brake: c.speed < c.max * 0.8, boost: c.boostT > 0, label: cw > 34 ? c.name : '' });
        });
        g.restore();
      }

      // 自車
      var bounce = (P.speed > 0 ? (Math.random() - 0.5) * 2 * (P.x < -1 || P.x > 1 ? 2 : 0.6) : 0) + (P.bump > 0 ? Math.sin(raceT * 60) * 3 : 0);
      var lean = keys.left ? -1 : keys.right ? 1 : 0;
      var myW = (DEPTH / PLAYER_Z) * CAR_W * 2 * ROAD_W * W / 2;
      drawCar(g, W / 2, H - 14 + bounce, myW, '#5ccfa0', { brake: keys.down, boost: P.boosting, lean: lean });

      drawHud();
    }

    function drawRange(color, baseY, amp, off, seed) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, H);
      for (var i = 0; i <= W; i += 8) {
        var t = (i + off) * 0.012;
        var y = baseY - (Math.sin(t + seed) * 0.5 + Math.sin(t * 2.3 + seed * 1.7) * 0.3 + 0.6) * amp;
        g.lineTo(i, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    }

    function drawSegment(s) {
      var x1 = s.p1.screen.x, y1 = s.p1.screen.y, w1 = s.p1.screen.w;
      var x2 = s.p2.screen.x, y2 = s.p2.screen.y, w2 = s.p2.screen.w;
      var alt = Math.floor(s.index / RUMBLE) % 2;
      var r1 = w1 / Math.max(6, 2 * LANES), r2 = w2 / Math.max(6, 2 * LANES);
      var l1 = w1 / Math.max(32, 8 * LANES), l2 = w2 / Math.max(32, 8 * LANES);
      // 手前の区間の上端を塗りつぶさないよう、はみ出しは奥（上）側にだけ取る
      g.fillStyle = pal.grass[alt];
      g.fillRect(0, y2 - 1, W, y1 - y2 + 1);
      poly(g, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, pal.rumble[alt]);
      poly(g, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, pal.rumble[alt]);
      if (s.finishLine) {
        var cells = 12;
        for (var k = 0; k < cells; k++) {
          var a1 = x1 - w1 + (w1 * 2 / cells) * k, a2 = x2 - w2 + (w2 * 2 / cells) * k;
          poly(g, a1, y1, a1 + w1 * 2 / cells, y1, a2 + w2 * 2 / cells, y2, a2, y2, (k + s.index) % 2 ? '#111' : '#f5f5f5');
        }
      } else {
        poly(g, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, pal.road[alt]);
        if (alt) {
          var lw1 = w1 * 2 / LANES, lw2 = w2 * 2 / LANES, lx1 = x1 - w1 + lw1, lx2 = x2 - w2 + lw2;
          for (var lane = 1; lane < LANES; lane++, lx1 += lw1, lx2 += lw2) {
            poly(g, lx1 - l1 / 2, y1, lx1 + l1 / 2, y1, lx2 + l2 / 2, y2, lx2 - l2 / 2, y2, pal.lane);
          }
        }
      }
      if (s.fog < 1) {
        g.globalAlpha = 1 - s.fog;
        g.fillStyle = pal.fog;
        g.fillRect(0, y2, W, y1 - y2);
        g.globalAlpha = 1;
      }
    }

    function panel(x, y, w, h) {
      g.fillStyle = 'rgba(8,12,20,.62)';
      g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(255,255,255,.18)';
      g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    function text(t, x, y, size, color, align) {
      g.font = 'bold ' + size + 'px ui-monospace, Menlo, Consolas, monospace';
      g.textAlign = align || 'left';
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillText(t, x + 1, y + 1);
      g.fillStyle = color || '#fff';
      g.fillText(t, x, y);
    }

    function meter(x, y, w, h, v, color, label) {
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y, w, h);
      g.fillStyle = color; g.fillRect(x, y, w * clamp(v, 0, 1), h);
      text(label, x, y - 3, 9, '#cfd8e3');
    }

    function drawHud() {
      var place = P.finished && P.place ? P.place : rank();
      // 左上: 順位と周回
      var narrowHud = W < 500;
      panel(8, 8, narrowHud ? 100 : 118, 50);
      text(L('順位', 'POS'), 16, 24, 10, '#9fb0c2');
      text(place + '/' + (cars.length + 1), 16, 50, narrowHud ? 20 : 24, place === 1 ? '#ffd93d' : '#fff');
      text(L('周', 'LAP'), narrowHud ? 68 : 80, 24, 10, '#9fb0c2');
      text(Math.min(P.lap + 1, cfg.laps) + '/' + cfg.laps, narrowHud ? 68 : 80, 50, narrowHud ? 14 : 16, '#fff');

      // 中央上: タイム
      var tw = W < 500 ? 136 : 184;
      panel(W / 2 - tw / 2, 8, tw, 42);
      text(fmt((state === 'race' ? raceT - P.lapStart : 0) * 1000), W / 2, 30, 18, '#fff', 'center');
      text(L('ベスト ', 'BEST ') + fmt(P.bestLap !== null ? P.bestLap : bestLap(T.id)), W / 2, 44, 10, '#9fb0c2', 'center');

      // 右上: ミニマップ
      var ms = W < 500 ? 84 : 98, mx = W - ms - 8, my = 8;
      panel(mx, my, ms, ms);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
      g.beginPath();
      T.map.forEach(function (p, i) {
        var px = mx + 8 + p[0] * (ms - 16), py = my + 8 + p[1] * (ms - 16);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      });
      g.closePath(); g.stroke(); g.lineWidth = 1;
      function dot(total, color, r) {
        var i = Math.floor(((total % trackLen) + trackLen) % trackLen / SEG) % T.map.length;
        var p = T.map[i];
        g.fillStyle = color;
        g.beginPath(); g.arc(mx + 8 + p[0] * (ms - 16), my + 8 + p[1] * (ms - 16), r, 0, Math.PI * 2); g.fill();
      }
      cars.forEach(function (c) { dot(c.total, c.color, 2.2); });
      dot(pz(), '#5ccfa0', 3.4);

      // 左下: 速度とギア
      var kmh = Math.round(P.speed / MAX * 280);
      var gear = P.speed < 1 ? 'N' : String(Math.min(6, 1 + Math.floor(P.speed / (topSpeed * nitroPower) * 6.5)));
      var rpm = (P.speed / MAX * 6.5) % 1;
      panel(8, H - 70, 150, 62);
      text(String(kmh), 20, H - 28, 30, '#fff');
      text('km/h', 96, H - 28, 11, '#9fb0c2');
      text(L('ギア ', 'GEAR ') + gear, 20, H - 14, 10, '#9fb0c2');
      meter(86, H - 60, 64, 6, P.speed < 1 ? 0 : 0.35 + rpm * 0.65, rpm > 0.85 ? '#e06c75' : '#5ccfa0', 'RPM');

      // 右下: ニトロとダメージ
      panel(W - 158, H - 70, 150, 62);
      meter(W - 146, H - 50, 126, 8, P.nitro, P.boosting ? '#8fd3ff' : '#4ea3ff', L('ニトロ', 'NITRO') + (P.draft ? L('  スリップ中', '  DRAFT') : ''));
      meter(W - 146, H - 22, 126, 8, P.damage, P.damage > 0.6 ? '#e06c75' : '#ffb74d', L('ダメージ', 'DAMAGE'));

      // 中央のお知らせ
      if (state === 'count') {
        var c = Math.ceil(countT);
        text(c > 3 ? L('位置について', 'READY') : String(c), W / 2, H / 2 - 20, c > 3 ? 26 : 56, '#ffd93d', 'center');
      }
      if (msg.t > 0 && state !== 'results') {
        text(msg.text, W / 2, H / 2 - 40, 22, '#ffd93d', 'center');
      }
      if (P.x < -1.05 || P.x > 1.05) text(L('コースアウト', 'OFF ROAD'), W / 2, H / 2 + 6, 12, '#ffb74d', 'center');
      if (paused) {
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H);
        text(L('一時停止', 'PAUSED'), W / 2, H / 2, 30, '#fff', 'center');
        text(L('p でつづける / q でやめる', 'p to resume / q to quit'), W / 2, H / 2 + 22, 11, '#cfd8e3', 'center');
      }
      if (state === 'results') drawResults();
    }

    function drawResults() {
      g.fillStyle = 'rgba(6,9,16,.82)';
      g.fillRect(0, 0, W, H);
      var r = results;
      text(r.place === 1 ? L('優勝！', 'VICTORY') : L(r.place + ' 位でゴール', 'FINISHED ' + r.place + ordinal(r.place)),
           W / 2, 40, 26, r.place === 1 ? '#ffd93d' : '#fff', 'center');
      text(TB.t(T.spec.name) + ' — ' + level.toUpperCase(), W / 2, 58, 11, '#9fb0c2', 'center');
      r.list.forEach(function (e, i) {
        var y = 86 + i * 20;
        g.fillStyle = e.you ? 'rgba(92,207,160,.2)' : 'rgba(255,255,255,.04)';
        g.fillRect(W / 2 - 200, y - 14, 400, 18);
        text(String(i + 1), W / 2 - 186, y, 12, i === 0 ? '#ffd93d' : '#cfd8e3');
        g.fillStyle = e.you ? '#5ccfa0' : e.color; g.fillRect(W / 2 - 160, y - 10, 10, 10);
        text(e.you ? L('あなた', 'YOU') : e.name, W / 2 - 142, y, 12, e.you ? '#5ccfa0' : '#fff');
        text(e.time !== null ? fmt(e.time * 1000) : L('走行中', 'running'), W / 2 + 40, y, 12, '#cfd8e3');
        if (cfg.career) text('+' + (POINTS[i] || 0) + 'pt', W / 2 + 150, y, 12, '#ffd93d');
      });
      var yy = 86 + r.list.length * 20 + 10;
      text(L('賞金 +', 'PRIZE +') + r.prize + L(' 円', ' cr') + L('   ベストラップ ', '   BEST LAP ') + fmt(r.best), W / 2, yy, 12, '#ffd93d', 'center');
      text(cfg.career && cfg.career.round < ORDER.length ? L('Enter / クリックで次のレースへ', 'Enter / click for the next race')
                                                        : L('Enter / クリックで閉じる', 'Enter / click to close'),
           W / 2, yy + 20, 11, '#9fb0c2', 'center');
    }

    /* --- 文字版の描画 --------------------------------------------------- */

    function wide(ch) {
      return /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/.test(ch);
    }

    /** 1 マスに 1 文字置く。clip より下（丘の陰）には描かない */
    function put(rows, x, yy, ch, cls, clip) {
      if (yy < 0 || yy >= H || x < 0 || x >= W) return;
      if (clip !== undefined && yy >= clip) return;
      rows[yy][x] = [ch, cls];
    }

    /** 文字列を置く。全角は 2 マス使う（後ろのマスを空にして桁をそろえる） */
    function puts(rows, x, yy, str, cls) {
      Array.from(str).forEach(function (ch) {
        if (x >= 0 && x < W && yy >= 0 && yy < H) {
          rows[yy][x] = [ch, cls];
          if (wide(ch) && x + 1 < W) rows[yy][x + 1] = ['', cls];
        }
        x += wide(ch) ? 2 : 1;
      });
    }
    function strw(str) { return Array.from(str).reduce(function (a, ch) { return a + (wide(ch) ? 2 : 1); }, 0); }
    function center(rows, yy, str, cls) { puts(rows, Math.floor((W - strw(str)) / 2), yy, str, cls); }

    function textSegment(rows, sg) {
      var y1 = sg.p1.screen.y, y2 = sg.p2.screen.y;
      var alt = Math.floor(sg.index / RUMBLE) % 2;
      for (var r = Math.max(0, y2); r < Math.min(H, y1); r++) {
        var t = (y1 - r) / (y1 - y2);
        var cx = lerp(sg.p1.screen.x, sg.p2.screen.x, t), w = lerp(sg.p1.screen.w, sg.p2.screen.w, t);
        var rw = Math.max(0.7, w / 6), lw = Math.max(0.5, w / 22);
        var row = rows[r];
        for (var c = 0; c < W; c++) {
          var d = c + 0.5 - cx, ad = Math.abs(d), cell;
          if (ad < w) {
            if (sg.finishLine) {
              cell = [' ', (Math.floor((d + w) / Math.max(1, w / 6)) + sg.index) % 2 ? 'tr-fin-a' : 'tr-fin-b'];
            } else {
              cell = [' ', alt ? 'tr-road-a' : 'tr-road-b'];
              if (alt) {
                for (var l = 1; l < LANES; l++) {
                  if (Math.abs(d - (-w + 2 * w * l / LANES)) < lw) cell = ['│', 'tr-lane'];
                }
              }
            }
          } else if (ad < w + rw) {
            cell = [' ', alt ? 'tr-rumble-a' : 'tr-rumble-b'];
          } else {
            cell = [alt ? '░' : ' ', alt ? 'tr-grass-a' : 'tr-grass-b'];
          }
          row[c] = cell;
        }
      }
    }

    function textSprite(rows, sp, sx, sy, u, clip) {
      var X = Math.round(sx), Y = Math.round(sy) - 1, i, j;
      switch (sp.kind) {
        case 'tree':
          if (u < 0.7) { put(rows, X, Y, '▲', 'tr-tree', clip); break; }
          put(rows, X, Y, '█', 'tr-trunk', clip);
          put(rows, X, Y - 1, '▲', 'tr-tree', clip);
          if (u > 1.4) { put(rows, X - 1, Y - 1, '◢', 'tr-tree', clip); put(rows, X + 1, Y - 1, '◣', 'tr-tree', clip); put(rows, X, Y - 2, '▲', 'tr-tree', clip); }
          break;
        case 'palm':
          if (u < 0.7) { put(rows, X, Y, 'Y', 'tr-tree', clip); break; }
          put(rows, X, Y, '│', 'tr-trunk', clip);
          put(rows, X, Y - 1, '│', 'tr-trunk', clip);
          put(rows, X - 1, Y - 2, '╲', 'tr-tree', clip); put(rows, X, Y - 2, '♣', 'tr-tree', clip); put(rows, X + 1, Y - 2, '╱', 'tr-tree', clip);
          break;
        case 'rock':
          put(rows, X, Y, u < 1.2 ? '▄' : '▟', 'tr-rock', clip);
          if (u >= 1.2) put(rows, X + 1, Y, '▙', 'tr-rock', clip);
          break;
        case 'lamp':
          var lh = u < 0.8 ? 1 : 3;
          for (i = 0; i < lh; i++) put(rows, X, Y - i, '│', 'tr-pole', clip);
          put(rows, X, Y - lh, night ? '●' : '┐', night ? 'tr-light2' : 'tr-pole', clip);
          break;
        case 'building':
          var bw = Math.max(1, Math.round(u * 5)), bh = Math.max(1, Math.round(u * 7));
          for (j = 0; j < bh; j++) for (i = 0; i < bw; i++) {
            var win2 = night && i % 2 === 1 && j % 2 === 1 && ((sp.seed + i + j) % 3);
            put(rows, X - Math.floor(bw / 2) + i, Y - j, win2 ? '▪' : '█', win2 ? 'tr-win' : 'tr-bld', clip);
          }
          break;
        case 'sign':
          if (u < 0.9) { put(rows, X, Y, '▣', 'tr-sign', clip); break; }
          puts(rows, X - 2, Y - 1, '[TUI]', 'tr-sign');
          put(rows, X - 1, Y, '│', 'tr-pole', clip); put(rows, X + 1, Y, '│', 'tr-pole', clip);
          break;
        case 'chevron':
          var ch = sp.dir > 0 ? '»' : '«';
          put(rows, X, Y - (u > 1 ? 1 : 0), ch, 'tr-chev', clip);
          if (u > 1) { put(rows, X - 1, Y - 1, ch, 'tr-chev', clip); put(rows, X + 1, Y - 1, ch, 'tr-chev', clip); put(rows, X, Y, '│', 'tr-pole', clip); }
          break;
        case 'gantry':
          var half = Math.round(u / 0.12 * 1.15), top = Y - Math.max(2, Math.round(u / 0.12 * 0.8));
          for (i = -half; i <= half; i++) put(rows, X + i, top, (i + half) % 2 ? '▀' : '▄', 'tr-fin-b', clip);
          for (j = top + 1; j <= Y; j++) { put(rows, X - half, j, '│', 'tr-pole', clip); put(rows, X + half, j, '│', 'tr-pole', clip); }
          break;
      }
    }

    function textCar(rows, cx, cy, cw, cls, label, clip) {
      var n = Math.max(1, Math.round(cw)), X0 = Math.round(cx - n / 2), Y = Math.round(cy) - 1, i;
      if (n <= 1) { put(rows, X0, Y, '▄', cls, clip); return; }
      if (n <= 3) { for (i = 0; i < n; i++) put(rows, X0 + i, Y, '▆', cls, clip); return; }
      for (i = 1; i < n - 1; i++) put(rows, X0 + i, Y - 1, '▄', i > 1 && i < n - 2 ? 'tr-glass' : cls, clip);
      for (i = 0; i < n; i++) put(rows, X0 + i, Y, i === 0 || i === n - 1 ? '▐' : '█', i === 0 || i === n - 1 ? 'tr-light' : cls, clip);
      if (label && n >= 6 && Y - 2 < clip) puts(rows, Math.round(cx - label.length / 2), Y - 2, label, 'tr-label');
    }

    function renderText() {
      var rows = [], x, yy, i;
      var horizon = Math.floor(H / 2);
      for (yy = 0; yy < H; yy++) {
        var line = [];
        for (x = 0; x < W; x++) line.push([' ', yy < horizon / 2 ? 'tr-sky' : 'tr-sky2']);
        rows.push(line);
      }
      if (night) {
        for (i = 0; i < W * 0.12; i++) {
          var sx = ((i * 37 + Math.floor(skyOff * 300)) % W + W) % W, sy = (i * 7) % Math.max(1, horizon - 2);
          rows[sy][sx] = ['·', sy < horizon / 2 ? 'tr-star' : 'tr-star2'];
        }
      } else {
        for (i = 0; i < 3; i++) {
          var cx = ((i * 29 + Math.floor(skyOff * 220)) % (W + 12) + W + 12) % (W + 12) - 6;
          puts(rows, cx, 1 + i % 2, '~~~~', 'tr-cloud');
        }
      }
      for (x = 0; x < W; x++) {
        var t = (x + hillOff * 350) * 0.11;
        var hh = Math.round((Math.sin(t) * 0.5 + Math.sin(t * 2.3 + 1.7) * 0.3 + 0.8) * H * 0.1);
        for (var k = 0; k < hh; k++) {
          var hy = horizon - 1 - k;
          if (hy >= 0) rows[hy][x] = [k === hh - 1 ? '▄' : '█', 'tr-hill'];
        }
      }

      // 道路（手前から奥へ）
      var base = findSeg(P.pos), basePct = (P.pos % SEG) / SEG;
      var pSeg = findSeg(P.pos + PLAYER_Z), pPct = ((P.pos + PLAYER_Z) % SEG) / SEG;
      var pY = lerp(pSeg.p1.world.y, pSeg.p2.world.y, pPct);
      var maxy = H, ox = 0, dx = -(base.curve * basePct), n, sg;
      for (n = 0; n < DRAW; n++) {
        sg = segs[(base.index + n) % segs.length];
        var looped = sg.index < base.index;
        sg.clip = maxy;
        project(sg.p1, (P.x * ROAD_W) - ox, pY + CAM_H, P.pos - (looped ? trackLen : 0));
        project(sg.p2, (P.x * ROAD_W) - ox - dx, pY + CAM_H, P.pos - (looped ? trackLen : 0));
        ox += dx; dx += sg.curve;
        if (sg.p1.camera.z <= DEPTH || sg.p2.screen.y >= sg.p1.screen.y || sg.p2.screen.y >= maxy) continue;
        textSegment(rows, sg);
        maxy = sg.p2.screen.y;
      }

      // 飾りと車（奥から手前へ）
      var carSeg = {};
      cars.forEach(function (c, ci) {
        if (c.total - pz() < -SEG * 0.3) return;
        var z = ((c.total % trackLen) + trackLen) % trackLen;
        var idx = Math.floor(z / SEG);
        (carSeg[idx] = carSeg[idx] || []).push({ c: c, ci: ci, pct: (z % SEG) / SEG });
      });
      for (n = DRAW - 1; n > 0; n--) {
        sg = segs[(base.index + n) % segs.length];
        if (!sg.p1.screen.scale || sg.p1.camera.z <= DEPTH) continue;
        var scale = sg.p1.screen.scale;
        sg.sprites.forEach(function (sp) {
          var spx = sg.p1.screen.x + (scale * sp.offset * ROAD_W * W / 2);
          textSprite(rows, sp, spx, sg.p1.screen.y, sg.p1.screen.w * 0.12, sg.clip);
        });
        (carSeg[sg.index] || []).forEach(function (e) {
          var sc2 = lerp(sg.p1.screen.scale, sg.p2.screen.scale, e.pct);
          var ccx = lerp(sg.p1.screen.x, sg.p2.screen.x, e.pct) + (sc2 * e.c.offset * ROAD_W * W / 2);
          var ccy = lerp(sg.p1.screen.y, sg.p2.screen.y, e.pct);
          var cw = sc2 * CAR_W * 2 * ROAD_W * W / 2;
          textCar(rows, ccx, ccy, cw, 'tr-c' + e.ci, e.c.name, sg.clip);
        });
      }

      // 自車
      var myW = Math.max(7, Math.round((DEPTH / PLAYER_Z) * CAR_W * 2 * ROAD_W * W / 2));
      var shake = (P.x < -1 || P.x > 1) && P.speed > MAX / 5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      var X0 = Math.round(W / 2 - myW / 2) + shake + (keys.left ? -1 : keys.right ? 1 : 0) * 0;
      for (i = 2; i < myW - 2; i++) put(rows, X0 + i, H - 3, '▄', i > 2 && i < myW - 3 ? 'tr-glass' : 'tr-me');
      for (i = 0; i < myW; i++) {
        var edge = i < 2 || i >= myW - 2;
        put(rows, X0 + i, H - 2, edge ? '█' : '█', edge ? (keys.down ? 'tr-light' : 'tr-light-d') : 'tr-me');
      }
      put(rows, X0 + 1, H - 1, '▀', 'tr-tyre'); put(rows, X0 + 2, H - 1, '▀', 'tr-tyre');
      put(rows, X0 + myW - 3, H - 1, '▀', 'tr-tyre'); put(rows, X0 + myW - 2, H - 1, '▀', 'tr-tyre');
      if (P.boosting) { put(rows, X0 + 3, H - 1, '≈', 'tr-boost'); put(rows, X0 + myW - 4, H - 1, '≈', 'tr-boost'); }

      // お知らせ
      var mid = Math.max(1, Math.floor(H / 2) - 3);
      if (state === 'count') {
        var cd = Math.ceil(countT);
        center(rows, mid, cd > 3 ? L(' 位置について ', ' READY ') : '  ' + cd + '  ', 'tr-msg');
      } else if (msg.t > 0 && state !== 'results') {
        center(rows, mid, ' ' + msg.text + ' ', 'tr-msg');
      }
      if ((P.x < -1.05 || P.x > 1.05) && state === 'race') center(rows, mid + 2, L(' コースアウト ', ' OFF ROAD '), 'tr-warn');
      if (paused) center(rows, mid, L(' 一時停止 — p でつづける ', ' PAUSED — p to resume '), 'tr-msg');
      if (state === 'results' && results) textResults(rows);

      K.renderGrid(view, rows);
      var place = P.finished && P.place ? P.place : rank();
      var kmh = Math.round(P.speed / MAX * 280);
      var gear = P.speed < 1 ? 'N' : String(Math.min(6, 1 + Math.floor(P.speed / (topSpeed * nitroPower) * 6.5)));
      K.renderParts(s.status, [
        [L('順位 ', 'POS '), 'dim'], [place + '/' + (cars.length + 1) + '  ', place === 1 ? 'warn bold' : 'accent bold'],
        [L('周 ', 'LAP '), 'dim'], [Math.min(P.lap + 1, cfg.laps) + '/' + cfg.laps + '  ', ''],
        [fmt((state === 'race' ? raceT - P.lapStart : 0) * 1000) + '  ', ''],
        [L('ベスト ', 'BEST '), 'dim'], [fmt(P.bestLap !== null ? P.bestLap : bestLap(T.id)) + '  ', 'accent-2'],
        [String(kmh) + 'km/h G' + gear + '  ', 'accent bold'],
        ['N₂O ', 'dim'], [K.bar(P.nitro, 1, 6) + '  ', P.boosting ? 'accent-2 bold' : 'accent-2'],
        [L('傷 ', 'DMG '), 'dim'], [K.bar(P.damage, 1, 4), P.damage > 0.6 ? 'err' : 'warn'],
        [P.draft ? L('  スリップ中', '  DRAFT') : '', 'accent-2']
      ]);
    }

    function textResults(rows) {
      var r = results, top = 1, i;
      var bw = Math.min(W - 2, 44), bx = Math.floor((W - bw) / 2);
      for (var yy = top; yy < Math.min(H - 1, top + r.list.length + 5); yy++) {
        for (i = 0; i < bw; i++) rows[yy][bx + i] = [' ', 'tr-panel'];
      }
      center(rows, top, r.place === 1 ? L('優勝！', 'VICTORY!') : L(r.place + ' 位でゴール', 'FINISHED ' + r.place + ordinal(r.place)), 'tr-panel-h');
      r.list.forEach(function (e, k) {
        var name = e.you ? L('あなた', 'YOU') : e.name;
        var t = e.time !== null ? fmt(e.time * 1000) : L('走行中', 'running');
        var line = (k + 1) + '. ' + name;
        puts(rows, bx + 2, top + 2 + k, line, e.you ? 'tr-panel-me' : 'tr-panel');
        puts(rows, bx + 18, top + 2 + k, t, 'tr-panel');
        if (cfg.career) puts(rows, bx + 30, top + 2 + k, '+' + (POINTS[k] || 0) + 'pt', 'tr-panel-h');
      });
      var yl = top + 2 + r.list.length + 1;
      center(rows, yl, L('賞金 +', 'PRIZE +') + r.prize + L('  Enter で続ける', '  Enter to continue'), 'tr-panel-h');
    }

    /* --- ループ --- */
    var tick2 = false;
    function frame(now) {
      if (closed) return;
      if (last === null) last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused) update(dt);
      if (tui) { tick2 = !tick2; if (tick2) renderText(); }
      else render();
      raf = requestAnimationFrame(frame);
    }

    /* GUI ⇄ TUI の切り替え。描き方が違うので、同じ設定でスタートからやり直す */
    function switchMode() {
      if (closed) return;
      stop();
      if (tui) s.end([[{ t: L('GUI 版に切り替えます…', 'Switching to the GUI…'), c: 'dim' }]]);
      else { TB.Term.release(); win.close(); TB.Term.printAll([[{ t: L('文字版に切り替えます…', 'Switching to text mode…'), c: 'dim' }]]); }
      var again = {};
      for (var k in cfg) again[k] = cfg[k];
      again.tui = !tui;
      setTimeout(function () { startRace(again); }, 0);
    }
    if (tui && TB.Win) TB.Win.setTuiApp({ toGui: switchMode });

    function stop() {
      if (tui && TB.Win) TB.Win.setTuiApp(null);
      closed = true;
      cancelAnimationFrame(raf);
      eng.stop();
    }

    function next() {
      if (state !== 'results' || closed) return;
      var done = results;
      stop();
      if (tui) s.end([]);
      else { TB.Term.release(); win.close(); }
      if (cfg.onDone) cfg.onDone(done);
    }

    function finish(reason) {
      if (closed) return;
      stop();
      TB.Term.release();
      if (cfg.onDone) cfg.onDone(state === 'results' ? results : null, reason);
    }

    say(L('位置について', 'READY'), 1);
    if (tui) renderText();   // 枠の高さが決まってから見える位置へスクロールされるように、先に 1 コマ描く
    raf = requestAnimationFrame(frame);
  }

  /* =====================================================================
     コマンド
     ===================================================================== */

  function trackArg(a) {
    if (!a) return null;
    a = a.toLowerCase();
    if (TRACKS[a]) return a;
    var i = parseInt(a, 10);
    if (i >= 1 && i <= ORDER.length) return ORDER[i - 1];
    return null;
  }

  function levelArg(args) {
    for (var i = 0; i < args.length; i++) {
      if (/^(easy|normal|hard)$/i.test(args[i])) return args[i].toLowerCase();
    }
    return 'normal';
  }

  function menu() {
    var out = TB.head('TUI RACING');
    out.push([{ t: L('疑似 3D のレース。ライバル 7 台と周回を競います。', 'A pseudo-3D racer. Seven rivals, several laps.'), c: 'dim' }]);
    out.push([{ t: L('名前をクリックするか、コマンドを打って始めます。GUI 版（窓で描く）と文字版（ターミナルの中）を選べます。',
                     'Click a name or type the command. Choose the GUI version (a window) or the text version (in the terminal).'), c: 'dim' }], '');
    out.push([{ t: L('コース', 'Tracks'), c: 'accent-2 bold' }]);
    ORDER.forEach(function (id, i) {
      var t = TRACKS[id], b = bestLap(id);
      out.push([
        { t: '  ' + (i + 1) + '. ', c: 'dim' },
        { t: TB.t(t.name), cmd: 'race ' + id, c: 'accent' },
        { t: '  ' + '★'.repeat(t.diff) + '☆'.repeat(3 - t.diff), c: 'warn' },
        { t: L('   ベスト ', '   best ') + fmt(b), c: 'dim' },
        { t: '   ' },
        { t: 'GUI', cmd: 'race gui ' + id, c: 'accent-2' },
        { t: ' / ' , c: 'dim' },
        { t: L('文字版', 'text'), cmd: 'race tui ' + id, c: 'accent-2' }
      ]);
    });
    out.push('');
    out.push([{ t: L('ほかに', 'More'), c: 'accent-2 bold' }]);
    out.push([{ t: '  ' }, { t: L('選手権（3 戦）', 'Championship (3 rounds)'), cmd: 'race career', c: 'accent' }, { t: '   race career [easy|hard] [周回数]', c: 'dim' }]);
    out.push([{ t: '  ' }, { t: L('ガレージ（改造）', 'Garage (upgrades)'), cmd: 'race shop', c: 'accent' }, { t: '   race shop', c: 'dim' }]);
    out.push([{ t: '  ' }, { t: L('戦績', 'Stats'), cmd: 'race stats', c: 'accent' }, { t: '   race stats', c: 'dim' }]);
    out.push('');
    out.push([{ t: L('所持金 ', 'Credits ') + money() + L(' 円', ' cr'), c: 'warn' }]);
    out.push([{ t: L('操作: ←→ ハンドル / ↑ アクセル / ↓ ブレーキ / スペース ニトロ / p 一時停止 / q やめる',
                     'Keys: ←→ steer / ↑ gas / ↓ brake / space nitro / p pause / q quit'), c: 'dim' }]);
    out.push([{ t: L('コツ: 前の車の真後ろにつくとスリップストリームで速くなり、ニトロも溜まります。',
                     'Tip: sit right behind a rival to draft — you go faster and refill nitro.'), c: 'dim' }], '');
    return out;
  }

  function quick(id, level, laps, tui) {
    return new Promise(function (resolve) {
      startRace({
        track: id, laps: laps, level: level, tui: tui,
        onDone: function (r) {
          if (!r) { resolve([[{ t: L('レースをやめました。', 'Race abandoned.'), c: 'dim' }], '']); return; }
          resolve(summary(r, id, level));
        }
      });
    });
  }

  function summary(r, id, level) {
    var out = ['', [{ t: (r.place === 1 ? '🏆 ' : '') + L(r.place + ' 位 / 8 台', 'Finished ' + r.place + ' of 8'), c: r.place === 1 ? 'accent bold' : 'accent' }]];
    out.push({ row: [L('コース', 'track'), TB.t(TRACKS[id].name) + ' (' + level + ')'] });
    out.push({ row: [L('タイム', 'time'), fmt(r.time * 1000)] });
    out.push({ row: [L('ベストラップ', 'best lap'), fmt(r.best) + L('（自己ベスト ', ' (PB ') + fmt(bestLap(id)) + ')'] });
    out.push({ row: [L('賞金', 'prize'), '+' + r.prize + L(' 円（所持 ', ' cr (total ') + money() + ')'] });
    out.push('', [{ t: L('もう一度: ', 'again: '), c: 'dim' }, { t: 'race ' + id, cmd: 'race ' + id, c: 'accent' },
                  { t: L('   改造: ', '   upgrades: '), c: 'dim' }, { t: 'race shop', cmd: 'race shop', c: 'accent' }], '');
    return out;
  }

  function career(level, laps, tui) {
    var state = { round: 0, points: {}, level: level };
    return new Promise(function (resolve) {
      function run() {
        if (state.round >= ORDER.length) { resolve(champion()); return; }
        var id = ORDER[state.round];
        state.round++;
        TB.Term.printAll([[{ t: L('第 ' + state.round + ' 戦: ', 'Round ' + state.round + ': ') + TB.t(TRACKS[id].name), c: 'accent-2 bold' }]]);
        startRace({
          track: id, laps: laps || TRACKS[id].laps, level: level, career: state, tui: tui,
          onDone: function (r) {
            if (!r) { resolve([[{ t: L('選手権を途中でやめました。', 'Championship abandoned.'), c: 'dim' }], '']); return; }
            TB.Term.printAll(standings(L('第 ' + state.round + ' 戦のあと', 'after round ' + state.round)));
            setTimeout(run, 400);
          }
        });
      }
      run();
    });

    function table() {
      var names = ['YOU'].concat(RIVALS.map(function (r) { return r.name; }));
      return names.map(function (n) { return { n: n, p: state.points[n] || 0 }; })
        .sort(function (a, b) { return b.p - a.p; });
    }
    function standings(title) {
      var out = ['', [{ t: L('選手権順位 — ', 'Standings — ') + title, c: 'accent-2' }]];
      table().forEach(function (e, i) {
        out.push({ row: [[{ t: (i + 1) + '. ' + (e.n === 'YOU' ? L('あなた', 'YOU') : e.n), c: e.n === 'YOU' ? 'accent bold' : '' }], e.p + ' pt'] });
      });
      return out;
    }
    function champion() {
      var t = table();
      var pos = t.findIndex(function (e) { return e.n === 'YOU'; }) + 1;
      var bonus = pos === 1 ? 800 : pos === 2 ? 400 : pos === 3 ? 200 : 0;
      setMoney(money() + bonus);
      if (pos === 1) addStat('titles');
      var out = standings(L('最終', 'final'));
      out.push('', [{ t: pos === 1 ? L('🏆 年間王者です！ おめでとうございます。', '🏆 You are the champion!')
                                   : L('選手権 ' + pos + ' 位でした。', 'Championship position: ' + pos), c: pos === 1 ? 'accent bold' : 'accent' }]);
      if (bonus) out.push([{ t: L('ボーナス +' + bonus + ' 円', 'Bonus +' + bonus + ' cr'), c: 'warn' }]);
      out.push([{ t: L('所持金 ', 'Credits ') + money() + L(' 円 — ', ' cr — '), c: 'dim' }, { t: 'race shop', cmd: 'race shop', c: 'accent' }], '');
      return out;
    }
  }

  function shopLines() {
    var u = upgrades();
    var out = TB.head(L('ガレージ', 'Garage'));
    out.push([{ t: L('所持金 ', 'Credits ') + money() + L(' 円', ' cr'), c: 'warn bold' }], '');
    UPGRADES.forEach(function (x, i) {
      var lv = u[x.id], cost = UPG_COST[lv];
      var bar = '■'.repeat(lv) + '□'.repeat(3 - lv);
      var row = [
        { t: '  ' + (i + 1) + '. ', c: 'dim' },
        { t: TB.t(x.name), c: 'accent' },
        { t: '  ' + bar + '  ', c: 'accent-2' }
      ];
      if (lv >= 3) row.push({ t: L('最大', 'MAX'), c: 'dim' });
      else row.push({ t: L('買う（' + cost + ' 円）', 'buy (' + cost + ' cr)'), cmd: String(i + 1), c: money() >= cost ? 'accent' : 'dim' });
      out.push(row);
      out.push([{ t: '       ' + TB.t(x.what), c: 'dim' }]);
    });
    out.push('', [{ t: L('番号で買います（クリックでも可）。q で出ます。', 'Buy by number (or click). q to leave.'), c: 'dim' }], '');
    return out;
  }

  function shop() {
    TB.setLineHandler(function (input) {
      var v = input.trim().toLowerCase();
      if (v === 'q' || v === 'quit' || v === 'exit' || v === '') {
        TB.setLineHandler(null);
        TB.Term.printAll([[{ t: L('ガレージを出ました。', 'Left the garage.'), c: 'dim' }], '']);
        return;
      }
      var i = parseInt(v, 10) - 1;
      var x = UPGRADES[i];
      if (!x) { TB.Term.printAll([[{ t: L('1〜4 の番号か q を入れてください。', 'Type 1–4 or q.'), c: 'warn' }]]); return; }
      var u = upgrades(), lv = u[x.id];
      if (lv >= 3) { TB.Term.printAll([[{ t: L('これ以上は上げられません。', 'Already maxed out.'), c: 'dim' }]]); return; }
      var cost = UPG_COST[lv];
      if (money() < cost) { sfx('bad'); TB.Term.printAll([[{ t: L('お金が足りません（あと ' + (cost - money()) + ' 円）。', 'Not enough credits (' + (cost - money()) + ' short).'), c: 'err' }]]); return; }
      setMoney(money() - cost);
      u[x.id] = lv + 1;
      setUpgrades(u);
      sfx('coin');
      TB.Term.printAll([[{ t: TB.t(x.name) + L(' をレベル ' + (lv + 1) + ' にしました！', ' upgraded to level ' + (lv + 1) + '!'), c: 'accent bold' }]].concat(shopLines()));
    }, 'garage>');
    return shopLines();
  }

  function stats() {
    var u = upgrades();
    var out = TB.head(L('戦績', 'Stats'));
    out.push({ row: [L('レース数', 'races'), String(stat('races'))] });
    out.push({ row: [L('優勝', 'wins'), String(stat('wins'))] });
    out.push({ row: [L('表彰台', 'podiums'), String(stat('podiums'))] });
    out.push({ row: [L('年間王者', 'titles'), String(stat('titles'))] });
    out.push({ row: [L('所持金', 'credits'), money() + L(' 円', ' cr')] });
    out.push('');
    out.push([{ t: L('自己ベストラップ', 'Personal best laps'), c: 'accent-2' }]);
    ORDER.forEach(function (id) { out.push({ row: [TB.t(TRACKS[id].name), fmt(bestLap(id))] }); });
    out.push('');
    out.push([{ t: L('改造', 'Upgrades'), c: 'accent-2' }]);
    UPGRADES.forEach(function (x) { out.push({ row: [TB.t(x.name), '■'.repeat(u[x.id]) + '□'.repeat(3 - u[x.id])] }); });
    out.push('');
    return out;
  }

  def('race', {
    group: 'game',
    usage: 'race [gui|tui] [coast|ridge|city|career|shop|stats] [easy|normal|hard] [周回数]',
    desc: { ja: '疑似 3D のレース。選手権・賞金・改造つき（GUI）', en: 'pseudo-3D racing with championship, prize money and upgrades (GUI)' },
    run: function (args) {
      // tui / text が入っていれば文字版で走る
      // tui / text なら文字版、gui なら窓。指定がなければ ui の設定に従う
      var m = TB.Win ? TB.Win.modeArgs(args) : { tui: false, args: args };
      var tui = m.tui;
      args = m.args;
      var a = (args[0] || '').toLowerCase();
      if (!a) return menu();
      if (a === 'shop' || a === 'garage') return shop();
      if (a === 'stats') return stats();
      if (a === 'career' || a === 'championship') {
        var cl = parseInt(args.filter(function (x) { return /^\d+$/.test(x); })[0], 10);
        return career(levelArg(args.slice(1)), cl ? clamp(cl, 1, 9) : 0, tui);
      }
      var id = trackArg(a);
      if (!id) return [[{ t: L('そのコースはありません: ', 'no such track: ') + a, c: 'err' }]].concat(menu());
      var laps = parseInt(args.filter(function (x) { return /^\d+$/.test(x); })[0], 10) || 2;
      laps = clamp(laps, 1, 9);
      return quick(id, levelArg(args.slice(1)), laps, tui);
    }
  });

  def('tuirace', {
    group: 'game',
    usage: 'tuirace [coast|ridge|city|career] [easy|normal|hard] [周回数]',
    desc: { ja: 'レースの TUI 版。同じコースを文字だけで走る', en: 'the text-mode racer: same tracks, drawn in characters' },
    run: function (args) { return TB.commands.race.run((args.length ? args : ['coast']).concat(['tui'])); }
  });

  TB.raceBest = function () {
    return ORDER.filter(function (id) { return bestLap(id) !== null; })
      .map(function (id) { return [id, fmt(bestLap(id))]; });
  };

  TB.alias.racing = 'race';
  TB.alias.drive = 'race';
  TB.alias['レース'] = 'race';
})();
