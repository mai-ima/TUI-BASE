/*
 * race-3d.js — TUI RACING の 3D 描画（WebGL / three.js）。
 *
 * 物理は race-engine.js の Session のまま。ここでは Session の区間データから
 *   ・道路（路面・路肩・白線・芝・水面・トンネル・ガードレール・交差点）
 *   ・沿道の木や建物（インスタンス描画でまとめて描く）
 *   ・車（車種ごとの形の立体）
 * を本物の 3D に組み立て、自車の後ろからのカメラで描く。
 * three.js は 3D 表示を選んだときだけ読み込む（assets/vendor/three.min.js）。
 */
(function () {
  'use strict';

  var TB = window.TB;
  var R = TB.Race;

  var M_SEG = 1.3;          // 1 区間 = 1.3 m
  var Y_SCALE = 0.35;       // 起伏は現実的な勾配に縮める

  /** three.js を必要なときだけ読み込む */
  function loadScript(src, cb) {
    var sc = document.createElement('script');
    sc.src = src; sc.onload = function () { cb(true); }; sc.onerror = function () { cb(false); };
    document.head.appendChild(sc);
  }
  R.load3D = function (cb) {
    if (window.THREE && TB.RaceTex) { cb(true); return; }
    loadScript('assets/vendor/three.min.js', function (ok) {
      if (!ok || !window.THREE) { cb(false); return; }
      // 写真テクスチャ（Poly Haven, CC0）。読めなくても 3D は動く
      loadScript('assets/vendor/race-tex.js', function () { cb(true); });
    });
  };
  /** 写真テクスチャ（data URL なので file:// でも使える） */
  var texStore = {};
  R.tex3D = function (name, rep) {
    if (!window.THREE || !TB.RaceTex || !TB.RaceTex[name]) return null;
    var key = name + (rep || '');
    if (texStore[key]) return texStore[key];
    var img = new Image(), t = new THREE.Texture(img);
    img.onload = function () { t.needsUpdate = true; };
    img.src = TB.RaceTex[name];
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    if (name === 'sky') { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; }
    texStore[key] = t;
    return t;
  };
  R.can3D = function () {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  };

  /* ---------- 道の中心線（区間ごとの位置と向き） ---------- */
  function centerline(v, mirror) {
    var segs = v.segs, n = segs.length, spec = v.spec;
    if (segs[0] && segs[0].wp) {   // 実在の道・実在のコース: 地図の座標そのもの（ずれない）
      var hx0 = new Float64Array(n + 1), px0 = new Float64Array(n + 1), pz0 = new Float64Array(n + 1), py0 = new Float64Array(n + 1);
      for (var q = 0; q < n; q++) { var w = segs[q].wp; hx0[q] = w.h; px0[q] = w.x; pz0[q] = w.z; py0[q] = w.y; }
      var wl = segs[n - 1].wp, loop0 = !!spec.loop;
      if (loop0) { hx0[n] = hx0[0] + Math.round((hx0[n - 1] - hx0[0]) / (2 * Math.PI)) * 2 * Math.PI; px0[n] = px0[0]; pz0[n] = pz0[0]; py0[n] = py0[0]; }
      else { hx0[n] = wl.h; px0[n] = wl.x + Math.sin(wl.h) * M_SEG; pz0[n] = wl.z + Math.cos(wl.h) * M_SEG; py0[n] = wl.y; }
      return { n: n, loop: loop0, h: hx0, x: px0, z: pz0, y: py0, real: true };
    }
    var loop = !(spec.touge || spec.p2p || spec.noFinish || spec.stopZone || spec.finishAt);
    var total = 0, abs = 0;
    segs.forEach(function (s) { total += s.curve; abs += Math.abs(s.curve); });
    var turn = loop ? (3.2 * Math.PI) / (abs || 1) : 0.0055;
    var bias = loop ? (2 * Math.PI * (mirror ? -1 : 1) - total * turn) / n : 0;
    var hx = new Float64Array(n + 1), px = new Float64Array(n + 1), pz = new Float64Array(n + 1), py = new Float64Array(n + 1);
    var h = 0, x = 0, z = 0;
    for (var i = 0; i <= n; i++) {
      hx[i] = h; px[i] = x; pz[i] = z;
      var s = segs[i % n];
      py[i] = (i < n ? s.p1.world.y : segs[n - 1].p2.world.y) / 200 * M_SEG * Y_SCALE;
      if (i < n) { h -= s.curve * turn + bias; x += Math.sin(h) * M_SEG; z += Math.cos(h) * M_SEG; }
    }
    if (loop) {   // 一周で元の場所に戻るよう、ずれを少しずつ配る
      var ex = px[n], ez = pz[n];
      for (i = 0; i <= n; i++) { px[i] -= ex * i / n; pz[i] -= ez * i / n; }
      py[n] = py[0];
    }
    return { n: n, loop: loop, h: hx, x: px, z: pz, y: py };
  }

  function at(cl, sIdx) {
    var n = cl.n;
    if (cl.loop) sIdx = ((sIdx % n) + n) % n; else sIdx = Math.max(0, Math.min(n - 0.001, sIdx));
    var i = Math.floor(sIdx), f = sIdx - i, j = i + 1;
    return {
      x: cl.x[i] + (cl.x[j] - cl.x[i]) * f, z: cl.z[i] + (cl.z[j] - cl.z[i]) * f,
      y: cl.y[i] + (cl.y[j] - cl.y[i]) * f, h: cl.h[i] + (cl.h[j] - cl.h[i]) * f
    };
  }
  // 向き h の「右」ベクトル
  function rightOf(h) { return { x: -Math.cos(h), z: Math.sin(h) }; }

  /* ---------- 色 ---------- */
  var colCache = {};
  function col(c) {
    if (!colCache[c]) colCache[c] = new THREE.Color(c);
    return colCache[c];
  }

  /* ---------- 道路のメッシュ ---------- */
  function buildRoad(v, cl, RW) {
    var THREE_ = THREE, segs = v.segs, n = cl.n, pal = v.pal;
    var pos = [], cols = [], tpos = [], tcol = [], tuv = [];
    var asph = R.tex3D('asphalt');
    function quadT(i, a0, a1, c) {   // 写真の路面（アスファルト）
      if (!asph) { quad(i, a0, a1, 0, 0, c); return; }
      var j = cl.loop ? (i + 1) : Math.min(i + 1, n);
      var A = rightOf(cl.h[i]), B = rightOf(cl.h[j]);
      var p = [[cl.x[i] + A.x * a0, cl.y[i], cl.z[i] + A.z * a0], [cl.x[i] + A.x * a1, cl.y[i], cl.z[i] + A.z * a1],
               [cl.x[j] + B.x * a1, cl.y[j], cl.z[j] + B.z * a1], [cl.x[j] + B.x * a0, cl.y[j], cl.z[j] + B.z * a0]];
      var uv = [[a0 / 3.5, i * M_SEG / 3.5], [a1 / 3.5, i * M_SEG / 3.5], [a1 / 3.5, (i + 1) * M_SEG / 3.5], [a0 / 3.5, (i + 1) * M_SEG / 3.5]];
      var k2 = 2.35;
      [0, 2, 1, 0, 3, 2].forEach(function (k) { tpos.push(p[k][0], p[k][1], p[k][2]); tcol.push(Math.min(1, c.r * k2), Math.min(1, c.g * k2), Math.min(1, c.b * k2)); tuv.push(uv[k][0], uv[k][1]); });
    }
    function quad(i, a0, a1, y0, y1, c, lift) {
      var j = cl.loop ? (i + 1) : Math.min(i + 1, n);
      var A = rightOf(cl.h[i]), B = rightOf(cl.h[j]);
      var p = [
        [cl.x[i] + A.x * a0, cl.y[i] + y0 + (lift || 0), cl.z[i] + A.z * a0],
        [cl.x[i] + A.x * a1, cl.y[i] + y1 + (lift || 0), cl.z[i] + A.z * a1],
        [cl.x[j] + B.x * a1, cl.y[j] + y1 + (lift || 0), cl.z[j] + B.z * a1],
        [cl.x[j] + B.x * a0, cl.y[j] + y0 + (lift || 0), cl.z[j] + B.z * a0]
      ];
      [0, 2, 1, 0, 3, 2].forEach(function (k) { pos.push(p[k][0], p[k][1], p[k][2]); cols.push(c.r, c.g, c.b); });
    }
    function wall(i, a, y0, y1, c) {   // 縦の面（トンネルの壁・ガードレール）
      var j = cl.loop ? (i + 1) : Math.min(i + 1, n);
      var A = rightOf(cl.h[i]), B = rightOf(cl.h[j]);
      var p = [[cl.x[i] + A.x * a, cl.y[i] + y0, cl.z[i] + A.z * a], [cl.x[i] + A.x * a, cl.y[i] + y1, cl.z[i] + A.z * a],
               [cl.x[j] + B.x * a, cl.y[j] + y1, cl.z[j] + B.z * a], [cl.x[j] + B.x * a, cl.y[j] + y0, cl.z[j] + B.z * a]];
      [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2].forEach(function (k) { pos.push(p[k][0], p[k][1], p[k][2]); cols.push(c.r, c.g, c.b); });
    }
    var RS = RW * 1.17, G = 90, lanes = v.geom.lanes, real = !!cl.real && !!v.spec.custom;
    var white = col('#f2f2f2'), laneC = col(pal.lane), water = col(pal.water || '#2f7fc1'), black = col('#111111');
    for (var i = 0; i < n; i++) {
      var s = segs[i];
      var road = col(s.stopZone ? '#b71c1c' : s.cRoad), rum = col(s.cRumble), grass = col(s.cross ? s.cRoad : s.cGrass);
      if (s.finishLine) {
        for (var k = 0; k < 8; k++) quad(i, -RW + k * RW / 4, -RW + (k + 1) * RW / 4, 0, 0, (k + i) % 2 ? black : white);
      } else if (s.stopZone || s.tunnel) quad(i, -RW, RW, 0, 0, road); else quadT(i, -RW, RW, road);
      var RS2 = real ? RW * (1 + (s.rumW || 0.15)) : RS;
      quad(i, -RS2, -RW, s.curb ? 0.15 : 0, s.curb ? 0.15 : 0, rum); quad(i, RW, RS2, s.curb ? 0.15 : 0, s.curb ? 0.15 : 0, rum);
      if (s.curb) { wall(i, -RW, 0, 0.15, col('#8a8a86')); wall(i, RW, 0, 0.15, col('#8a8a86')); }
      var wl = s.waterSide && s.waterSide !== 'right', wr = s.waterSide && s.waterSide !== 'left';
      if (s.tunnel) { quad(i, -RS - 2, -RS, 0, 0, grass); quad(i, RS, RS + 2, 0, 0, grass); }
      else if (real) { /* 周りの地面・水面は 3D の街（City3D）が描く */ }
      else {
        quad(i, -RS - G, -RS, wl ? -40 : -1.5, 0, grass);
        quad(i, RS, RS + G, 0, wr ? -40 : -1.5, grass);
        if (wl) quad(i, -RW * 1.7 - 400, -RW * 1.7, -0.6, -0.6, water);
        if (wr) quad(i, RW * 1.7, RW * 1.7 + 400, -0.6, -0.6, water);
        if (s.cross) { quad(i, -RS - 60, -RS, 0.01, 0.01, road); quad(i, RS, RS + 60, 0.01, 0.01, road); }
      }
      // 白線
      if (!s.finishLine) {
        for (var l = 1; l < lanes; l++) {
          var lx = -RW + 2 * RW * l / lanes, ctr = v.spec.twoWay && l * 2 === lanes;
          if (s.cross || (!s.alt && !(ctr && lanes >= 4))) continue;
          quad(i, lx - 0.08, lx + 0.08, 0, 0, ctr && lanes >= 4 && real ? col('#f0c030') : laneC, 0.02);
        }
        quad(i, -RW * 0.97, -RW * 0.94, 0, 0, white, 0.02); quad(i, RW * 0.94, RW * 0.97, 0, 0, white, 0.02);
        if (s.crosswalk) for (var c2 = 0; c2 < 10; c2 += 2) quad(i, -RW + c2 * RW / 5, -RW + (c2 + 1) * RW / 5, 0, 0, white, 0.02);
        if (s.stopLine) quad(i, -RW, 0, 0, 0, white, 0.03);
      }
      if (s.tunnel) {
        var wc = col(pal.wall || '#444');
        wall(i, -RW * 1.2, 0, 6.5, wc); wall(i, RW * 1.2, 0, 6.5, wc);
        quad(i, -RW * 1.2, RW * 1.2, 6.5, 6.5, col('#1d1f25'));
      }
      if (s.rails) { var rc = col('#c9ced4'), ro = real ? RW + 0.8 : RW * 1.1; wall(i, -ro, 0.35, 0.8, rc); wall(i, ro, 0.35, 0.8, rc); }
      if (s.bridge && real) { var bc2 = col('#9ea3a8'); wall(i, -RS2 - 0.2, -0.8, 1.0, bc2); wall(i, RS2 + 0.2, -0.8, 1.0, bc2); quad(i, -RS2 - 0.2, RS2 + 0.2, -0.8, -0.8, col('#7d8288')); }
    }
    var geo = new THREE_.BufferGeometry();
    geo.setAttribute('position', new THREE_.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE_.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    var rm = new THREE_.Mesh(geo, new THREE_.MeshLambertMaterial({ vertexColors: true, side: THREE_.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }));
    rm.receiveShadow = true;
    var grp = new THREE_.Group(); grp.add(rm);
    if (tpos.length) {
      var tg = new THREE_.BufferGeometry();
      tg.setAttribute('position', new THREE_.Float32BufferAttribute(tpos, 3)); tg.setAttribute('color', new THREE_.Float32BufferAttribute(tcol, 3)); tg.setAttribute('uv', new THREE_.Float32BufferAttribute(tuv, 2));
      tg.computeVertexNormals();
      var tm = new THREE_.Mesh(tg, new THREE_.MeshLambertMaterial({ vertexColors: true, map: asph, side: THREE_.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      tm.receiveShadow = true; grp.add(tm);
    }
    return grp;
  }

  /* ---------- 沿道の物（インスタンス描画） ---------- */
  function Props(scene, night) {
    var T = THREE, lists = {};
    var geos = {
      box: new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      cone: new T.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
      cyl: new T.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0),
      ball: new T.IcosahedronGeometry(1, 1),
      roof: new T.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
      ring: new T.TorusGeometry(1, 0.05, 6, 24),
      disc: new T.CylinderGeometry(1, 1, 0.04, 20).rotateX(Math.PI / 2)
    };
    function add(g, x, y, z, sx, sy, sz, rot, color, glow) {
      var key = g + (glow ? ':g' : '');
      (lists[key] = lists[key] || []).push([x, y, z, sx, sy, sz, rot, color]);
    }
    function finish() {
      var dummy = new T.Object3D();
      Object.keys(lists).forEach(function (key) {
        var arr = lists[key], glow = /:g$/.test(key), g = key.replace(/:g$/, '');
        var mat = glow ? new T.MeshBasicMaterial({ color: 0xffffff }) : new T.MeshLambertMaterial({ color: 0xffffff });
        var m = new T.InstancedMesh(geos[g], mat, arr.length);
        arr.forEach(function (a, i) {
          dummy.position.set(a[0], a[1], a[2]); dummy.scale.set(a[3], a[4], a[5]); dummy.rotation.set(0, a[6], 0); dummy.updateMatrix();
          m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, col(a[7]));
        });
        m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
        scene.add(m);
      });
    }
    return { add: add, finish: finish };
  }

  function placeSprites(v, cl, RW, props) {
    var U = RW * 0.12, night = v.night, dynamic = [];
    var city = !!v.cityOn;
    v.segs.forEach(function (s, i) {
      s.sprites.forEach(function (sp) {
        if (city && (sp.kind === 'bldg' || sp.kind === 'noisewall' || sp.gen)) return;   // 街並みは City3D が描く
        var p = at(cl, i), r = rightOf(p.h), off = sp.offset * RW, x = p.x + r.x * off, z = p.z + r.z * off, y = p.y, rot = p.h, seed = sp.seed || i;
        var u = sp.city ? 1.1 : U * (0.9 + (seed % 5) * 0.06);
        var fw = { x: Math.sin(p.h), z: Math.cos(p.h) }, inward = sp.offset > 0 ? -1 : 1;
        function A(g, dy, sx, sy, sz, c, glow, dx, dz) { props.add(g, x + (dx || 0) * r.x, y + dy, z + (dx || 0) * r.z + (dz || 0), sx, sy, sz, rot, c, glow); }
        switch (sp.kind) {
          case 'tree': A('cyl', 0, u * 0.2, u * 2, u * 0.2, '#5b3a1e'); A('cone', u * 1.6, u * 2, u * 4.6, u * 2, '#236b2a'); break;
          case 'pine': case 'cedar': case 'snowpine':
            A('cyl', 0, u * 0.18, u * 1.6, u * 0.18, '#4a2f1a'); A('cone', u * 1.2, u * 1.7, u * 7.5, u * 1.7, sp.kind === 'snowpine' ? '#dfe9ef' : '#1b4d2b'); break;
          case 'palm': A('cyl', 0, u * 0.18, u * 6, u * 0.18, '#8a5a2b'); A('ball', u * 6.2, u * 2.4, u * 0.7, u * 2.4, '#2e9b4f'); break;
          case 'maple': A('cyl', 0, u * 0.2, u * 2.4, u * 0.2, '#4e342e'); A('ball', u * 3.6, u * 1.9, u * 1.7, u * 1.9, ['#d84315', '#ef6c00', '#c62828', '#f9a825'][seed % 4]); break;
          case 'bush': case 'tea': A('ball', u * 0.6, u * 1.4, u * 0.8, u * 1.4, '#2e7d32'); break;
          case 'mikan': A('ball', u * 1.8, u * 1.4, u * 1.3, u * 1.4, '#2e7d32'); A('ball', u * 1.9, u * 0.3, u * 0.3, u * 0.3, '#ff9800', false, u * 0.9); break;
          case 'cactus': A('cyl', 0, u * 0.35, u * 4, u * 0.35, '#2e7d32'); break;
          case 'rock': case 'lavarock': A('ball', u * 0.5, u * 1.5, u * 1.1, u * 1.3, sp.kind === 'lavarock' ? '#2a1a17' : '#8c8c8c'); break;
          case 'mesa': A('box', 0, u * 16, u * 6, u * 10, '#b5562a'); break;
          case 'dune': A('ball', 0, u * 7, u * 2.5, u * 5, '#e8d3a0'); break;
          case 'lamp': A('cyl', 0, u * 0.12, u * 6.5, u * 0.12, '#666'); A('ball', u * 6.3, u * 0.35, u * 0.2, u * 0.35, night ? '#ffe9a3' : '#dddddd', night); break;
          case 'building':
            var bh = u * (10 + (seed % 4) * 5), bw = u * (6 + (seed % 3) * 2);
            A('box', 0, bw, bh, bw, night ? ['#1b1f33', '#242a44', '#161a2c'][seed % 3] : ['#8a93a1', '#6b7280', '#9aa3b1'][seed % 3]);
            if (night) A('box', bh * 0.3, bw * 1.01, bh * 0.08, bw * 1.01, '#ffd76a', true);
            break;
          case 'house': A('box', 0, u * 6, u * 3.6, u * 5, ['#eceff1', '#d7ccc8', '#cfd8dc', '#fff3e0'][seed % 4]); A('roof', u * 3.6, u * 5.5, u * 2, u * 5, ['#455a64', '#6d4c41', '#37474f', '#8d6e63'][seed % 4]); break;
          case 'factory': A('box', 0, u * 12, u * 5, u * 10, '#b0bec5'); A('cyl', 0, u * 0.5, u * 11, u * 0.5, '#78909c', false, u * 4); break;
          case 'container': for (var k = 0; k < 1 + seed % 3; k++) A('box', k * u * 1.9, u * 5.2, u * 1.8, u * 2, ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'][(seed + k) % 4]); break;
          case 'crane': A('box', 0, u * 0.6, u * 14, u * 0.6, '#f9a825', false, -u * 3); A('box', 0, u * 0.6, u * 14, u * 0.6, '#f9a825', false, u * 3); A('box', u * 14, u * 12, u * 0.8, u * 1, '#f9a825'); break;
          case 'barrier': case 'soundwall': A('box', 0, u * 0.3, sp.kind === 'soundwall' ? u * 3 : u * 1.2, u * 6, sp.kind === 'soundwall' ? '#9aa7b3' : '#9e9e9e'); break;
          case 'limitsign':   // 丸い制限速度標識（運転手の方を向く）
            A('cyl', 0, 0.05, 2.6, 0.05, '#777');
            props.add('disc', x, y + 2.9, z, 0.45, 0.45, 0.45, rot, '#d32f2f');
            props.add('disc', x - fw.x * 0.02, y + 2.9, z - fw.z * 0.02, 0.36, 0.36, 0.36, rot, '#ffffff');
            break;
          case 'billboard': case 'sign': case 'greensign': case 'unagi': case 'gyoza': case 'piano':
            A('cyl', 0, u * 0.12, u * 3, u * 0.12, '#555');
            A('box', u * 3, u * 3.5, u * 2, u * 0.2, { billboard: '#fafafa', sign: '#f2f2f2', greensign: '#1b7a3e', unagi: '#1a237e', gyoza: '#c62828', piano: '#222' }[sp.kind]);
            break;
          case 'pole':   // 電柱
            A('cyl', 0, 0.17, 11, 0.17, '#a3a6a5'); A('box', 10.4, 1.8, 0.12, 0.12, '#6b6e70'); A('box', 9.6, 1.4, 0.1, 0.1, '#6b6e70');
            if ((sp.id || 0) % 3 === 0) A('cyl', 8, 0.35, 1, 0.35, '#8d9499', false, inward * 0.5);
            dynamic.push({ kind: 'pole', x: x, y: y + 10.4, z: z, side: sp.offset > 0 ? 1 : -1 });
            break;
          case 'streetlamp': case 'hwlamp':
            var lh = sp.kind === 'hwlamp' ? 10.5 : 8.2;
            A('cyl', 0, 0.12, lh, 0.12, '#6c7278'); A('box', lh, 2.6, 0.14, 0.14, '#6c7278', false, inward * 1.3);
            A('box', lh - 0.15, 0.9, 0.18, 0.4, v.night ? '#fff1b8' : '#d7dbe0', v.night, inward * 2.5);
            break;
          case 'broadleaf':
            A('cyl', 0, 0.22, 3.2, 0.22, '#4e3b2c'); A('ball', 4.6, 2.6, 2.3, 2.6, ['#3f6b3a', '#4b7a3f', '#355f33', '#56813f'][seed % 4]); break;
          case 'grandstand': for (k = 0; k < 4; k++) A('box', k * u * 1.6, u * (6 - k * 1.2), u * 1.6, u * 14, k % 2 ? '#78909c' : '#90a4ae', false, u * k * 1.4); break;
          case 'tyrewall': A('box', 0, u * 1, u * 2, u * 4, '#222'); break;
          case 'neon': A('cyl', 0, u * 0.3, u * 9, u * 0.3, seed % 2 ? '#00e5ff' : '#ff00c8', true); break;
          case 'torii': case 'bigtorii':
            var ts = sp.kind === 'bigtorii' ? 2.2 : 1;
            A('cyl', 0, u * 0.3 * ts, u * 5 * ts, u * 0.3 * ts, '#d32f2f', false, 0, -u * 2 * ts); A('cyl', 0, u * 0.3 * ts, u * 5 * ts, u * 0.3 * ts, '#d32f2f', false, 0, u * 2 * ts);
            A('box', u * 5 * ts, u * 0.5 * ts, u * 0.5 * ts, u * 6 * ts, '#222'); break;
          case 'lighthouse': A('cyl', 0, u * 1, u * 9, u * 1, '#f5f5f5'); A('cyl', u * 3, u * 1.02, u * 1.6, u * 1.02, '#e53935'); A('ball', u * 9.4, u * 0.6, u * 0.6, u * 0.6, '#fff59d', true); break;
          case 'acttower': A('box', 0, u * 5, u * 36, u * 4, '#b0bec5'); if (night) A('box', u * 10, u * 5.05, u * 20, u * 4.05, '#ffd76a', true); break;
          case 'twintower': A('box', 0, u * 3.2, u * 30, u * 3.2, '#b3c4d6', false, -u * 3); A('box', 0, u * 3.2, u * 26, u * 3.2, '#b3c4d6', false, u * 3); break;
          case 'tvtower': A('cyl', 0, u * 0.6, u * 22, u * 0.6, '#b0443a'); A('box', u * 15, u * 3, u * 1.4, u * 3, '#cfd8dc'); break;
          case 'castle': A('box', 0, u * 10, u * 3, u * 10, '#8d8d8d'); A('box', u * 3, u * 7, u * 3, u * 7, '#f5f5f0'); A('roof', u * 6, u * 9, u * 2, u * 9, '#37474f'); A('box', u * 7.5, u * 4, u * 2.5, u * 4, '#f5f5f0'); A('roof', u * 10, u * 6, u * 2, u * 6, '#37474f'); break;
          case 'ferris': props.add('ring', x, y + u * 7.5, z, u * 6, u * 6, u * 6, rot + Math.PI / 2, night ? '#80deea' : '#eceff1', night); break;
          case 'station': A('box', 0, u * 12, u * 4.5, u * 6, '#eceff1'); A('box', u * 4.5, u * 13, u * 0.8, u * 7, '#37474f'); break;
          case 'kite': A('box', u * 9, u * 1.5, u * 1.5, u * 0.1, ['#e53935', '#1e88e5', '#fdd835'][seed % 3]); break;
          case 'snowman': A('ball', u * 1.1, u * 1.1, u * 1.1, u * 1.1, '#ffffff'); A('ball', u * 2.7, u * 0.75, u * 0.75, u * 0.75, '#ffffff'); break;
          case 'tollgate': for (k = -2; k <= 2; k++) A('box', 0, u * 0.8, u * 4, u * 0.8, '#607d8b', false, k * u * 2.6); A('box', u * 4, u * 1.2, u * 1, u * 13, '#eceff1'); break;
          case 'gantry': case 'cpgate': case 'arch': case 'banner': case 'fork': case 'orbis':
            // 道をまたぐ門・案内標識（板は道を横切る向き）
            var hw2 = RW * 1.15, cx0 = p.x, cz0 = p.z;
            props.add('cyl', cx0 - r.x * hw2, y, cz0 - r.z * hw2, 0.15, 6.2, 0.15, rot, '#555');
            props.add('cyl', cx0 + r.x * hw2, y, cz0 + r.z * hw2, 0.15, 6.2, 0.15, rot, '#555');
            props.add('box', cx0, y + 5.2, cz0, hw2 * 2, sp.kind === 'fork' ? 2.0 : 1.1, 0.25, rot, { gantry: '#eeeeee', cpgate: '#1565c0', arch: '#00e5ff', banner: '#0d47a1', fork: sp.blue ? '#1d4fa3' : '#1b7a3e', orbis: '#263238' }[sp.kind], sp.kind === 'arch');
            if (sp.kind === 'fork' || sp.kind === 'banner') dynamic.push({ kind: 'signtext', x: cx0 - fw.x * 0.14, y: y + 5.2, z: cz0 - fw.z * 0.14, rot: rot, w: hw2 * 2, h: sp.kind === 'fork' ? 2.0 : 1.1, texts: sp.texts || [sp.text], blue: sp.blue });
            break;
          case 'signal':   // 横型の信号機。柱は道の外、灯器は車線の上で運転手の方を向く
            var sOff = sp.offset * RW, armTo = sp.offset > 0 ? RW * 0.35 : -RW * 0.35;
            props.add('cyl', p.x + r.x * sOff, y, p.z + r.z * sOff, 0.14, 6.2, 0.14, rot, '#5b5f63');
            var ax = (sOff + armTo) / 2;
            props.add('box', p.x + r.x * ax, y + 5.9, p.z + r.z * ax, Math.abs(sOff - armTo), 0.12, 0.12, rot, '#5b5f63');
            props.add('box', p.x + r.x * armTo, y + 5.5, p.z + r.z * armTo, 1.9, 0.55, 0.35, rot, '#2b2f36');
            dynamic.push({ kind: 'signal', x: p.x + r.x * armTo - fw.x * 0.2, y: y + 5.5, z: p.z + r.z * armTo - fw.z * 0.2, r: r, rot: rot });
            break;
          case 'chevron': A('cyl', 0, 0.08, 1.5, 0.08, '#333'); A('box', 1.4, 1.8, 0.9, 0.1, '#ffd93d'); break;
          default: break;
        }
      });
    });
    return dynamic;
  }

  /* ---------- 車の立体 ---------- */
  var carCache = {};
  function carModel(body, color, opts) {
    var T = THREE, key = body + color + (opts && opts.front ? 'f' : '');
    var B = (R.BODIES && R.BODIES[body]) || { h: 0.56, body: 0.64 };
    var wm = (B.wm || 1) * (B.wide || 1);
    var W = 1.8 * wm, Hh = Math.max(0.9, 1.8 * (B.h || 0.56) * 1.4), Lg = B.box ? (body === 'bus' ? 11 : body === 'truck' || body === 'fire' ? 8 : body === 'train' ? 18 : 5.2) : B.kart ? 1.9 : B.open ? 4.8 : 4.4;
    if (!carCache[key]) {
      var g = new T.Group();
      var paint = new T.MeshPhongMaterial({ color: color, shininess: 90, specular: 0x444444 });
      var dark = new T.MeshLambertMaterial({ color: 0x15171c }), glass = new T.MeshPhongMaterial({ color: 0x1c2433, shininess: 120, specular: 0x8899aa });
      var tail = new T.MeshBasicMaterial({ color: 0xaa1515 }), head = new T.MeshBasicMaterial({ color: 0xfff4c8 });
      function box(w, h, l, x, y, z, m) { var b = new T.Mesh(new T.BoxGeometry(w, h, l), m); b.position.set(x, y, z); g.add(b); return b; }
      var wheelG = new T.CylinderGeometry(0.34, 0.34, 0.26, 12).rotateZ(Math.PI / 2);
      function wheel(x, z, r) { var m = new T.Mesh(wheelG, dark); m.position.set(x, r || 0.34, z); if (r) m.scale.set(1, r / 0.34, r / 0.34); g.add(m); }
      if (B.kart || B.open) {
        box(W * 0.35, 0.35, Lg * 0.9, 0, 0.35, 0, paint);
        box(W * 0.9, 0.08, 0.5, 0, 1.0, -Lg * 0.45, paint);
        var hel = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshPhongMaterial({ color: 0xffd93d })); hel.position.set(0, 0.8, -0.2); g.add(hel);
        wheel(-W * 0.5, Lg * 0.35, 0.36); wheel(W * 0.5, Lg * 0.35, 0.36); wheel(-W * 0.5, -Lg * 0.35, 0.42); wheel(W * 0.5, -Lg * 0.35, 0.42);
      } else if (B.box) {
        box(W, Hh * 0.82, Lg, 0, Hh * 0.52, 0, paint);
        box(W * 0.9, Hh * 0.25, 0.05, 0, Hh * 0.72, Lg / 2 + 0.01, glass);
        box(W * 0.9, Hh * 0.25, 0.05, 0, Hh * 0.72, -Lg / 2 - 0.01, glass);
        box(0.2, 0.15, 0.05, -W * 0.4, Hh * 0.3, -Lg / 2 - 0.03, tail); box(0.2, 0.15, 0.05, W * 0.4, Hh * 0.3, -Lg / 2 - 0.03, tail);
        box(0.25, 0.15, 0.05, -W * 0.35, Hh * 0.3, Lg / 2 + 0.03, head); box(0.25, 0.15, 0.05, W * 0.35, Hh * 0.3, Lg / 2 + 0.03, head);
        wheel(-W * 0.5, Lg * 0.35); wheel(W * 0.5, Lg * 0.35); wheel(-W * 0.5, -Lg * 0.35); wheel(W * 0.5, -Lg * 0.35);
        if (B.bar) { box(W * 0.25, 0.12, 0.3, -W * 0.15, Hh * 0.96, 0, new T.MeshBasicMaterial({ color: 0xff2d2d })); box(W * 0.25, 0.12, 0.3, W * 0.15, Hh * 0.96, 0, new T.MeshBasicMaterial({ color: 0x2d6bff })); }
      } else {
        var lowH = Hh * (B.body || 0.62) * 0.75;
        box(W, lowH, Lg, 0, 0.3 + lowH / 2, 0, paint);
        if (B.panda) box(W * 1.01, lowH * 0.45, Lg * 1.01, 0, 0.3 + lowH * 0.22, 0, dark);
        var cabH = Hh - lowH - 0.3, cabL = Lg * (B.monster ? 0.4 : 0.48);
        var cab = box(W * 0.8, Math.max(0.3, cabH), cabL, 0, 0.3 + lowH + cabH / 2, -Lg * 0.04, body === 'police' ? new T.MeshPhongMaterial({ color: 0xf2f2f2 }) : paint);
        box(W * 0.74, Math.max(0.25, cabH * 0.8), cabL * 1.02, 0, 0.3 + lowH + cabH / 2, -Lg * 0.04, glass);
        box(0.36, 0.14, 0.05, -W * 0.36, 0.3 + lowH * 0.75, -Lg / 2 - 0.02, tail); box(0.36, 0.14, 0.05, W * 0.36, 0.3 + lowH * 0.75, -Lg / 2 - 0.02, tail);
        box(0.34, 0.14, 0.05, -W * 0.34, 0.3 + lowH * 0.7, Lg / 2 + 0.02, head); box(0.34, 0.14, 0.05, W * 0.34, 0.3 + lowH * 0.7, Lg / 2 + 0.02, head);
        if (B.wing) { box(W * 0.95, 0.06, 0.35, 0, 0.3 + lowH + 0.18 + B.wing, -Lg / 2 + 0.2, dark); box(0.06, 0.2 + B.wing, 0.1, -W * 0.3, 0.3 + lowH + (0.2 + B.wing) / 2, -Lg / 2 + 0.2, dark); box(0.06, 0.2 + B.wing, 0.1, W * 0.3, 0.3 + lowH + (0.2 + B.wing) / 2, -Lg / 2 + 0.2, dark); }
        if (B.bar || B.taxi) box(W * 0.45, 0.12, 0.3, 0, 0.3 + lowH + cabH + 0.06, 0, B.taxi ? new T.MeshBasicMaterial({ color: 0xfafafa }) : new T.MeshBasicMaterial({ color: 0xff2d2d }));
        if (B.stripes) { box(0.14, 0.02, Lg * 1.001, -0.12, 0.3 + lowH + 0.005, 0, new T.MeshBasicMaterial({ color: 0xffffff })); box(0.14, 0.02, Lg * 1.001, 0.12, 0.3 + lowH + 0.005, 0, new T.MeshBasicMaterial({ color: 0xffffff })); }
        var wr2 = B.monster ? 0.8 : B.tractor ? 0.7 : 0.34;
        wheel(-W * 0.5, Lg * 0.33, wr2); wheel(W * 0.5, Lg * 0.33, wr2); wheel(-W * 0.5, -Lg * 0.33, wr2); wheel(W * 0.5, -Lg * 0.33, wr2);
        if (B.monster || B.tractor) g.children.forEach(function (c) { if (c.material !== dark) c.position.y += wr2 - 0.34; });
      }
      // 影
      var sh = new T.Mesh(new T.PlaneGeometry(W * 1.15, Lg * 1.05), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
      g.traverse(function (o) { if (o.isMesh && o !== sh) o.castShadow = true; });
      carCache[key] = g;
    }
    return carCache[key].clone();
  }

  /* ---------- 遠景（山並みの帯） ---------- */
  function horizon(v) {
    var T = THREE, c = document.createElement('canvas'); c.width = 2048; c.height = 256;
    var g = c.getContext('2d'), pal = v.pal;
    g.clearRect(0, 0, 2048, 256);
    function range(color, base, amp, seed) {
      g.fillStyle = color; g.beginPath(); g.moveTo(0, 256);
      for (var i = 0; i <= 2048; i += 8) { var t = i * 0.006 * Math.PI; g.lineTo(i, base - (Math.sin(t * 2 + seed) * 0.5 + Math.sin(t * 5 + seed * 1.7) * 0.3 + 0.6) * amp); }
      g.lineTo(2048, 256); g.fill();
    }
    if (v.spec.skyline) {
      g.fillStyle = pal.far;
      for (var b = 0; b < 160; b++) { var hh = 30 + (b * 37 % 90); g.fillRect(b * 13, 220 - hh, 12, hh + 40); if (v.night) { g.fillStyle = 'rgba(255,215,106,.7)'; for (var y2 = 230 - hh; y2 < 215; y2 += 7) if ((b + y2) % 3 === 0) g.fillRect(b * 13 + 3, y2, 3, 3); g.fillStyle = pal.far; } }
    } else { range(pal.far, 200, 70, 1.3); range(pal.hill, 236, 36, 4.1); }
    var tex = new T.CanvasTexture(c); tex.wrapS = T.RepeatWrapping; tex.repeat.set(2, 1);
    var m = new T.Mesh(new T.CylinderGeometry(1400, 1400, 500, 48, 1, true), new T.MeshBasicMaterial({ map: tex, transparent: true, side: T.BackSide, fog: false, depthWrite: false }));
    m.position.y = 150;
    return m;
  }
  function skyTexture(v) {
    var c = document.createElement('canvas'); c.width = 4; c.height = 256;
    var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, v.pal.sky[0]); gr.addColorStop(0.55, v.pal.sky[1]); gr.addColorStop(1, v.pal.sky[2]);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  }

  /* =====================================================================
     1 セッションぶんの 3D の舞台
     ===================================================================== */
  R.Render3D = function (canvas, sess) {
    var T = THREE;
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setSize(canvas.width, canvas.height, false);
    var stage = null, city = null;

    function textPlane(d) {   // 案内標識の文字
      var c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * d.h / d.w) || 64;
      var g = c.getContext('2d');
      g.fillStyle = d.blue ? '#1d4fa3' : '#1b7a3e'; g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(6, 6, c.width - 12, c.height - 12);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var n = d.texts.length, fs = Math.min(c.height * 0.42, 512 / n / Math.max(4, Math.max.apply(null, d.texts.map(function (t) { return t.length; }))) * 1.7);
      g.font = 'bold ' + Math.round(fs) + 'px sans-serif';
      d.texts.forEach(function (t, i) { g.fillText(t, c.width * (i + 0.5) / n, c.height / 2); });
      var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
      var m = new T.Mesh(new T.PlaneGeometry(d.w * 0.98, d.h * 0.94), new T.MeshBasicMaterial({ map: tex }));
      m.position.set(d.x, d.y, d.z); m.rotation.set(0, d.rot + Math.PI, 0);
      return m;
    }

    function build(s) {
      if (stage) dispose();
      var v = s.view(), scene = new T.Scene();
      var world = !!(v.spec.custom && R.Map && R.Map.ready && v.segs[0] && v.segs[0].wp && v.spec.mapEdge !== undefined);
      v.cityOn = world;
      var RW = 0.9 / v.geom.cw;
      var cl = centerline(v, s.cfg.mirror);
      scene.background = skyTexture(v);
      var skyT = !v.night && (v.weather === 'clear' || !v.weather) ? R.tex3D('sky') : null, dome = null;
      if (skyT) {
        dome = new T.Mesh(new T.SphereGeometry(world ? 5000 : 2200, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5625), new T.MeshBasicMaterial({ map: skyT, side: T.BackSide, fog: false, depthWrite: false }));
        dome.renderOrder = -1; scene.add(dome);
      }
      var far = { fog: 170, rain: 380, snow: 320, sand: 400, ash: 350 }[v.weather] || (v.night ? 520 : world ? 2200 : 900);
      scene.fog = new T.Fog(new T.Color(v.pal.fog), far * (world ? 0.18 : 0.25), far);
      var hemi = new T.HemisphereLight(v.night ? 0x445577 : 0xdfeaf5, v.night ? 0x111118 : 0x4a5440, v.night ? 0.5 : 0.75);
      scene.add(hemi);
      var sun = new T.DirectionalLight(v.night ? 0x8899cc : 0xfff0d8, v.night ? 0.3 : 1.15);
      sun.position.set(120, 180, 60); sun.castShadow = !v.night;
      sun.shadow.mapSize.set(2048, 2048);
      var sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 10; sc.far = 500;
      sun.shadow.bias = -0.0006;
      scene.add(sun); scene.add(sun.target);
      scene.add(buildRoad(v, cl, RW));
      var props = Props(scene, v.night);
      var dyn = placeSprites(v, cl, RW, props);
      props.finish();
      var hz = null;
      if (!world) { hz = horizon(v); scene.add(hz); }
      if (world) {
        if (!city) city = R.City3D(scene, { night: v.night });
        else scene.add(city.group);
        var p0 = at(cl, v.pz / R.SEG);
        city.update(p0.x, p0.z);
      }
      var cam = new T.PerspectiveCamera(62, canvas.width / canvas.height, 0.3, world ? 6000 : 2500);
      var me = carModel(v.car.body, v.car.color); scene.add(me);
      var head = null;
      if (v.night || v.spec.lava) {
        head = new T.SpotLight(0xfff2cc, 2.2, 90, 0.45, 0.5, 1.2); scene.add(head); scene.add(head.target);
      }
      // 信号の灯り（青・黄・赤。運転手の方を向く）
      var sigMeshes = dyn.filter(function (d) { return d.kind === 'signal'; }).map(function (d) {
        var gg = new T.Group();
        ['#00e0a0', '#ffc400', '#ff2a2a'].forEach(function (c, i) {
          var m = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.06, 14).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: 0x15181d }));
          var o = (i - 1) * 0.58;
          m.position.set(d.r.x * o, 0, d.r.z * o); m.rotation.set(0, d.rot, 0); m.userData.on = c; gg.add(m);
        });
        gg.position.set(d.x, d.y, d.z); scene.add(gg); return gg;
      });
      // 案内標識の文字
      dyn.filter(function (d) { return d.kind === 'signtext'; }).forEach(function (d) { scene.add(textPlane(d)); });
      // 電線
      var poles = dyn.filter(function (d) { return d.kind === 'pole'; }), wp = [];
      [-1, 1].forEach(function (sd) {
        var ps = poles.filter(function (d) { return d.side === sd; });
        for (var i = 0; i + 1 < ps.length; i++) for (var k = 0; k < 2; k++) {
          var a = ps[i], b = ps[i + 1], dy = k * 0.8;
          for (var q = 0; q < 6; q++) {
            var t1 = q / 6, t2 = (q + 1) / 6, sag1 = Math.sin(t1 * Math.PI) * 0.6, sag2 = Math.sin(t2 * Math.PI) * 0.6;
            wp.push(a.x + (b.x - a.x) * t1, a.y - dy + (b.y - a.y) * t1 - sag1, a.z + (b.z - a.z) * t1, a.x + (b.x - a.x) * t2, a.y - dy + (b.y - a.y) * t2 - sag2, a.z + (b.z - a.z) * t2);
          }
        }
      });
      if (wp.length) { var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); scene.add(new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0x2a2a2e }))); }
      if (dome && hz) hz.material.opacity = 0.55;
      stage = { s: s, v: v, scene: scene, cl: cl, RW: RW, cam: cam, me: me, head: head, hz: hz, pool: {}, sig: sigMeshes, camPos: null, sun: sun, world: world, dome: dome };
    }

    function place(obj, total, offset, yaw, extraY) {
      var st = stage, sIdx = total / R.SEG, p = at(st.cl, sIdx), r = rightOf(p.h);
      obj.position.set(p.x + r.x * offset * st.RW, p.y + (extraY || 0), p.z + r.z * offset * st.RW);
      obj.rotation.set(0, p.h + (yaw || 0), 0);
      return p;
    }

    function render() {
      var st = stage, s = st.s, v = s.view(), P = v.P;
      // 車を置く（出たり消えたりするので使い回す）
      var seen = {};
      function carFor(key, c, front) {
        seen[key] = true;
        if (!st.pool[key]) { st.pool[key] = carModel(c.body, c.color, { front: front }); st.scene.add(st.pool[key]); }
        return st.pool[key];
      }
      v.cars.forEach(function (c, i) { place(carFor('r' + i, c), c.total, c.offset, 0); });
      v.traffic.forEach(function (c, i) { if (Math.abs(c.total - v.pz) < R.SEG * 900) place(carFor('t' + i + c.body + c.color, c, c.dir === -1), c.total, c.offset, c.dir === -1 ? Math.PI : 0); });
      v.cops.forEach(function (c, i) { place(carFor('c' + i, c), c.total, c.offset, 0); });
      if (v.crossSeg) v.cross.forEach(function (c, i) { var m = carFor('x' + i + c.body, c); place(m, v.crossSeg * R.SEG, c.x, c.v > 0 ? -Math.PI / 2 : Math.PI / 2); });
      Object.keys(st.pool).forEach(function (k) { st.pool[k].visible = !!seen[k]; });
      // 自車
      var steer = v.keys.left ? 1 : v.keys.right ? -1 : 0;
      var p = place(st.me, v.pz, P.x, steer * 0.06 + (P.spin > 0 ? Math.sin(v.t * 20) * 0.4 : 0));
      if (P.bump > 0) st.me.position.y += Math.sin(v.t * 60) * 0.05;
      // カメラ（自車の後ろ上から、少し遅れてついていく）
      var f = { x: Math.sin(p.h), z: Math.cos(p.h) };
      var want = new T.Vector3(st.me.position.x - f.x * 6.8, st.me.position.y + 2.3, st.me.position.z - f.z * 6.8);
      if (!st.camPos) st.camPos = want.clone(); else st.camPos.lerp(want, 0.25);
      st.cam.position.copy(st.camPos);
      var ahead = at(st.cl, v.pz / R.SEG + 12 / 1.3);
      st.cam.lookAt(st.me.position.x * 0.6 + (ahead.x + rightOf(ahead.h).x * P.x * st.RW) * 0.4, st.me.position.y + 1.1, st.me.position.z * 0.6 + (ahead.z + rightOf(ahead.h).z * P.x * st.RW) * 0.4);
      var fov = 62 + (P.boosting ? 8 : 0) + Math.min(6, P.speed / R.MAX * 6);
      if (Math.abs(st.cam.fov - fov) > 0.1) { st.cam.fov += (fov - st.cam.fov) * 0.15; st.cam.updateProjectionMatrix(); }
      if (st.hz) { st.hz.position.x = st.cam.position.x; st.hz.position.z = st.cam.position.z; }
      if (st.dome) st.dome.position.set(st.cam.position.x, st.cam.position.y - 40, st.cam.position.z);
      st.sun.position.set(st.me.position.x + 120, st.me.position.y + 180, st.me.position.z + 60);
      st.sun.target.position.copy(st.me.position);
      if (st.world && city) city.update(st.me.position.x, st.me.position.z);
      if (st.head) { st.head.position.set(st.me.position.x, st.me.position.y + 1, st.me.position.z); st.head.target.position.set(st.me.position.x + f.x * 30, st.me.position.y, st.me.position.z + f.z * 30); }
      st.sig.forEach(function (gg) {
        gg.children.forEach(function (m, i) { var on = ['green', 'yellow', 'red'][i] === v.signal; m.material.color.set(on ? m.userData.on : '#15181d'); });
      });
      renderer.render(st.scene, st.cam);
    }

    function dispose() {
      if (!stage) return;
      if (city) stage.scene.remove(city.group);   // 街は次の道でも使い回す
      stage.scene.traverse(function (o) {
        if (o.geometry && !o.userData.shared) o.geometry.dispose();
        if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); }
      });
      stage = null;
      carCache = {};
    }

    build(sess);
    return {
      render: render,
      rebuild: function (s) { build(s); },
      resize: function (w, h) { renderer.setSize(w, h, false); if (stage) { stage.cam.aspect = w / h; stage.cam.updateProjectionMatrix(); } },
      dispose: function () { dispose(); if (city) { city.dispose(); city = null; } renderer.dispose(); }
    };
  };
})();
