/*
 * race-lowpoly.js — ローポリ車両（外部 3D モデル: Kenney "Car Kit", CC0）。
 *
 * 3D 表示ではモデルそのもの（assets/vendor/kenney-cars.js を必要なときに読む）、
 * 疑似 3D と TUI では近い形の絵で描く。エンジン音も車種に合わせる。
 */
(function () {
  'use strict';
  var TB = window.TB, R = TB.Race;

  // [id, 名前, 疑似 3D の形, 音, 性能 spd acc grp arm nit, 値段, 説明]
  var LIST = [
    ['lp_sports', 'ポップ・スポーツ', 'Pop Sports', 's13', 'i4t', [7, 7, 7, 5, 6], 9000, 'ころんとした形のスポーツカー。見た目より速い。'],
    ['lp_hatch', 'ポップ・ハッチ', 'Pop Hatch', 'hatch', 'i4hi', [6, 8, 7, 5, 6], 6500, '軽快なホットハッチ。'],
    ['lp_suvlux', 'ポップ・ラグジュアリー', 'Pop Luxury SUV', 'suv', 'v8', [6, 6, 5, 8, 5], 9500, '大きくて丈夫な高級 SUV。'],
    ['lp_suv', 'ポップ・クロカン', 'Pop Crossover', 'suv', 'v6', [5, 6, 5, 8, 5], 6000, '悪路に強い四駆。'],
    ['lp_van', 'ポップ・バン', 'Pop Van', 'minivan', 'i4', [4, 5, 5, 7, 5], 3500, '荷物もたくさん積める。'],
    ['lp_delivery', 'ポップ・配送車', 'Pop Delivery', 'van', 'diesel', [4, 4, 4, 9, 4], 4500, '宅配便のアルバイトに。'],
    ['lp_garbage', 'ポップ・ゴミ収集車', 'Pop Garbage Truck', 'truck', 'diesel', [3, 3, 3, 10, 4], 5000, '朝の町の働き者。とにかく頑丈。'],
    ['lp_fire', 'ポップ・消防車', 'Pop Fire Engine', 'fire', 'diesel', [5, 4, 4, 10, 5], 8000, 'サイレン付き。'],
    ['lp_ambulance', 'ポップ・救急車', 'Pop Ambulance', 'ambulance', 'v8', [6, 5, 5, 8, 6], 7500, '一刻を争う。'],
    ['lp_taxi', 'ポップ・タクシー', 'Pop Taxi', 'taxi', 'i4', [5, 5, 6, 6, 5], 4000, '町の足。'],
    ['lp_police', 'ポップ・パトカー', 'Pop Patrol', 'police', 'v8', [7, 7, 6, 7, 6], 9000, '追跡用のパトカー。'],
    ['lp_race', 'ポップ・レーサー', 'Pop Racer', 'gt', 'v8', [8, 8, 8, 4, 7], 16000, '低くて速いレーシングカー。'],
    ['lp_future', 'ポップ・フューチャー', 'Pop Future', 'wedge', 'ev', [9, 9, 8, 4, 8], 24000, '未来のレーシングカー。静かに速い。'],
    ['lp_tractor', 'ポップ・トラクター', 'Pop Tractor', 'tractor', 'diesel', [2, 3, 4, 9, 3], 2500, '田んぼの王様。'],
    ['lp_shovel', 'ポップ・ショベル', 'Pop Loader', 'tractor', 'diesel', [2, 2, 3, 10, 3], 3500, '工事現場からやってきた。'],
    ['lp_truck', 'ポップ・トラック', 'Pop Flatbed', 'pickup', 'v8', [5, 5, 5, 8, 5], 5000, '荷台つきの小さなトラック。'],
    ['lp_kart', 'ポップ・カート', 'Pop Kart', 'kart', 'kart', [5, 9, 9, 3, 6], 3000, 'ヘルメットの運転手つき。'],
    ['lp_kart2', 'ポップ・カート Z', 'Pop Kart Z', 'kart', 'kart', [6, 9, 9, 3, 7], 4500, 'もう少し速いカート。']
  ];
  LIST.forEach(function (x) {
    var id = x[0];
    if (!R.BODIES[id]) { var base = R.BODIES[x[3]] || R.BODIES.sedan, b = {}; for (var k in base) b[k] = base[k]; b.lowpoly = true; R.BODIES[id] = b; }
    if (R.BODY_PROFILE) R.BODY_PROFILE[id] = x[4];
    if (!R.CARS.some(function (c) { return c.id === id; })) {
      R.CARS.push({ id: id, name: { ja: x[1], en: x[2] }, cls: x[6] >= 15000 ? 'A' : x[6] >= 7000 ? 'B' : 'C', price: x[6], body: id, paint: 0, lowpoly: true,
                    stats: { spd: x[5][0], acc: x[5][1], grp: x[5][2], arm: x[5][3], nit: x[5][4] },
                    desc: { ja: x[7] + '（ローポリ車両・3D モデル: Kenney）', en: 'Low-poly vehicle (3D model by Kenney).' } });
    }
  });
  R.LOWPOLY = LIST.map(function (x) { return x[0]; });

  /* ---------- 3D モデル ---------- */
  var geo = {};
  function dec(b64, T) {
    var bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new T(u8.buffer);
  }
  function build(id) {
    if (geo[id]) return geo[id];
    var D = TB.RaceLowPoly && TB.RaceLowPoly[id];
    if (!D) return null;
    var T = THREE;
    function mk(p, n, c, m, idx, paint) {
      var P = dec(p, Int16Array), N = dec(n, Int8Array), Cc = dec(c, Uint8Array), M = m ? dec(m, Uint8Array) : null, I = dec(idx, Uint16Array);
      var pos = new Float32Array(P.length), nor = new Float32Array(N.length), col = new Float32Array(Cc.length), msk = new Float32Array(P.length / 3);
      for (var i = 0; i < P.length; i++) { pos[i] = P[i] / 1000; nor[i] = N[i] / 127; }
      var cc = new T.Color();
      for (i = 0; i < Cc.length; i += 3) { cc.setRGB(Cc[i] / 255, Cc[i + 1] / 255, Cc[i + 2] / 255); if (T.ColorManagement && !T.ColorManagement.legacyMode) cc.convertSRGBToLinear(); col[i] = cc.r; col[i + 1] = cc.g; col[i + 2] = cc.b; }
      if (M) for (i = 0; i < msk.length; i++) msk[i] = M[i];
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
      g.setIndex(new T.BufferAttribute(I, 1));
      g.userData.keep = true; g.userData.mask = msk; g.userData.col0 = col.slice();
      return g;
    }
    geo[id] = { body: mk(D.p, D.n, D.c, D.m, D.i), wheel: D.wp ? mk(D.wp, D.wn, D.wc, null, D.wi) : null, wx: D.wx, L: D.L, W: D.W };
    return geo[id];
  }
  var bodyCache = {};
  /** ローポリ車両の 3D モデル（色 color で塗り替え）。データがまだなら null */
  R.lowPolyModel = function (id, color) {
    var G = build(id);
    if (!G) return null;
    var T = THREE, g = new T.Group(), key = id + color;
    if (!bodyCache[key]) {
      var bg = G.body.clone(), col = bg.getAttribute('color'), msk = G.body.userData.mask, c0 = G.body.userData.col0;
      var tc = new T.Color(color);
      for (var i = 0; i < msk.length; i++) if (msk[i]) {
        var lum = (c0[i * 3] + c0[i * 3 + 1] + c0[i * 3 + 2]) / 3 / 0.45;   // 元の陰影を残す
        col.setXYZ(i, tc.r * Math.min(1.3, lum), tc.g * Math.min(1.3, lum), tc.b * Math.min(1.3, lum));
      }
      bg.userData.keep = true;
      bodyCache[key] = bg;
    }
    var mat = R.lowPolyMat || (R.lowPolyMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }));
    mat.userData.keep = true;
    var body = new T.Mesh(bodyCache[key], mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
    if (G.wheel) G.wx.forEach(function (c) { var w = new T.Mesh(G.wheel, mat); w.position.set(c[0], c[1], c[2]); w.castShadow = true; w.userData.wheel = true; g.add(w); });
    var sh = new T.Mesh(new T.PlaneGeometry(G.W * 1.05, G.L * 1.02), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    return g;
  };
})();
