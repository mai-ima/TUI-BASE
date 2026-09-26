/*
 * race-city3d.js — 浜松市の街並みを 3D で組み立てる（three.js）。
 *
 * 地図データ（R.Map）から、自車のまわりだけを 400m 四方のタイルで作っては捨てる。
 *   ・地形（国土地理院の標高）… 道の下は道の高さに削る／盛る
 *   ・道路網（実際の幅・種類の色）・鉄道
 *   ・建物（OpenStreetMap の実際の建物。データのない所は土地利用から家を並べる）
 *   ・森・茶畑・みかん畑の木々、水面（浜名湖・天竜川・佐鳴湖・遠州灘）
 * 座標はゲーム共通（x 東 / z 南 / y 上, m）。
 */
(function () {
  'use strict';
  var TB = window.TB, R = TB.Race;
  var TILE = 400, NEAR = 1000, FAR = 1500, STEP = 20;

  var LUCOL = { 0: '#6f8a52', 1: '#9a958c', 2: '#9b968f', 3: '#a4a6a2', 4: '#7e9c4e', 5: '#5d8a3c', 6: '#3f5f36', 7: '#6d9a52', 8: '#d9c89c', 9: '#51708a', 10: '#a4aaa2', 11: '#86907a', 12: '#6d9a52' };

  /* ---------- 共有テクスチャ（窓の並んだ外壁） ---------- */
  var texCache = null;
  function facadeTex(T) {
    if (texCache) return texCache;
    var c = document.createElement('canvas'); c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    // 上半分: オフィス（帯状の窓）/ 下半分左: 集合住宅 / 下半分右: 戸建て
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#5b6b80';
    for (var y = 0; y < 128; y += 32) g.fillRect(0, y + 8, 128, 18);
    g.fillStyle = 'rgba(255,255,255,.35)'; for (y = 0; y < 128; y += 32) g.fillRect(0, y + 8, 128, 3);
    g.fillStyle = '#e8e8e8'; for (var x = 0; x < 128; x += 32) g.fillRect(x, 0, 3, 128);
    // 集合住宅: 窓とベランダ
    for (y = 128; y < 256; y += 32) for (x = 0; x < 128; x += 32) {
      g.fillStyle = '#4b5a6c'; g.fillRect(x + 6, y + 6, 20, 14);
      g.fillStyle = '#d7d7d2'; g.fillRect(x + 2, y + 21, 28, 6);
    }
    // 戸建て: 小さな窓
    for (y = 128; y < 256; y += 64) for (x = 128; x < 256; x += 64) {
      g.fillStyle = '#3f4a57'; g.fillRect(x + 12, y + 20, 16, 16); g.fillRect(x + 38, y + 20, 14, 16);
      g.fillStyle = '#fff'; g.fillRect(x + 19, y + 20, 2, 16); g.fillRect(x + 44, y + 20, 2, 16);
    }
    // 右上: 無地（屋根・工場）
    g.fillStyle = '#ffffff'; g.fillRect(128, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (x = 128; x < 256; x += 16) g.fillRect(x, 0, 2, 128);
    var t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    texCache = t;
    return t;
  }

  function hexRGB(T, c) { var cc = new T.Color(c); return [cc.r, cc.g, cc.b]; }

  /** 点から折れ線までの距離の 2 乗と、その点での高さ */
  function nearRoad(M, x, z, cands) {
    var best = 1e18, by = 0, bw = 4;
    for (var k = 0; k < cands.length; k++) {
      var E = cands[k], p = E.pts, n = p.length / 3;
      for (var i = 0; i < n - 1; i++) {
        var ax = p[i * 3], az = p[i * 3 + 1], dx = p[i * 3 + 3] - ax, dz = p[i * 3 + 4] - az;
        var L2 = dx * dx + dz * dz || 1, t = ((x - ax) * dx + (z - az) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        var qx = ax + dx * t - x, qz = az + dz * t - z, d = qx * qx + qz * qz;
        if (d < best) { best = d; by = p[i * 3 + 2] + (p[i * 3 + 5] - p[i * 3 + 2]) * t; bw = R.Map.geomFor(E.c, E.lanes, E.c === 0 || E.c === 5).hw; }
      }
    }
    return { d: Math.sqrt(best), y: by, hw: bw };
  }

  R.City3D = function (scene, opts) {
    var T = THREE, M = R.Map;
    opts = opts || {};
    var tiles = {}, queue = [], night = !!opts.night;
    var grassT = R.tex3D && R.tex3D('grass'), asphT = R.tex3D && R.tex3D('asphalt');
    var TK = grassT ? 2.3 : 1, RK = asphT ? 2.1 : 1;   // 写真の暗さを色で打ち消す
    var matTerrain = new T.MeshLambertMaterial({ vertexColors: true, map: grassT || null });
    var matFar = new T.MeshLambertMaterial({ vertexColors: true });
    var matRoad = new T.MeshLambertMaterial({ vertexColors: true, map: asphT || null, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var matBld = new T.MeshLambertMaterial({ vertexColors: true, map: facadeTex(T) });
    if (night) { matBld.emissive = new T.Color(0x332a10); matBld.emissiveMap = facadeTex(T); }
    var matTree = new T.MeshLambertMaterial({ vertexColors: true });
    var matWater = new T.MeshPhongMaterial({ color: 0x3d6f93, shininess: 90, specular: 0x9ab7cc, transparent: true, opacity: 0.93 });
    var group = new T.Group(); scene.add(group);

    /* --- 遠景の地形（全域・400m 格子） --- */
    (function farTerrain() {
      var g = M.grid, S = 400, nx = Math.floor(g.dw * g.dc / S), nz = Math.floor(g.dh * g.dc / S);
      var pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = new Float32Array((nx + 1) * (nz + 1) * 3), idx = [];
      for (var j = 0; j <= nz; j++) for (var i = 0; i <= nx; i++) {
        var x = g.x0 + i * S, z = g.z0 + j * S, lu = M.landuse(x, z), y = M.height(x, z);
        if (lu === 9) y = Math.min(y, -3);
        var k = (j * (nx + 1) + i) * 3, c = hexRGB(T, LUCOL[lu] || LUCOL[0]), f = lu === 9 ? 0.9 : 0.8 + Math.min(0.25, y / 4000);
        pos[k] = x; pos[k + 1] = y - 4; pos[k + 2] = z; col[k] = c[0] * f; col[k + 1] = c[1] * f; col[k + 2] = c[2] * f;
        if (i < nx && j < nz) { var a = j * (nx + 1) + i; idx.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2); }
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
      geo.setIndex(idx); geo.computeVertexNormals();
      var m = new T.Mesh(geo, matFar); m.userData.city = true; group.add(m);
      // 海
      var sea = new T.Mesh(new T.PlaneGeometry(200000, 200000).rotateX(-Math.PI / 2), matWater);
      sea.position.set(0, -0.6, 0); group.add(sea);
    })();

    /* --- 水面（浜名湖・佐鳴湖・天竜川など） --- */
    (function water() {
      var pos = [];
      M.water.forEach(function (w) {
        var pts = [];
        for (var i = 0; i < w.p.length; i += 2) pts.push(new T.Vector2(w.p[i], w.p[i + 1]));
        if (pts.length < 3) return;
        var tri;
        try { tri = T.ShapeUtils.triangulateShape(pts, []); } catch (e) { return; }
        var y = Math.max(-0.3, w.y - 0.4);
        tri.forEach(function (t3) { t3.forEach(function (k) { pos.push(pts[k].x, y, pts[k].y); }); });
      });
      if (!pos.length) return;
      var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      var m = new T.Mesh(geo, new T.MeshPhongMaterial({ color: 0x3d6f93, shininess: 90, specular: 0x9ab7cc, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
      group.add(m);
    })();

    /* --- 1 タイル --- */
    function edgesNear(x0, z0, x1, z1) {
      var seen = {}, out = [];
      for (var gx = Math.floor(x0 / 200) - 1; gx <= Math.floor(x1 / 200) + 1; gx++) for (var gz = Math.floor(z0 / 200) - 1; gz <= Math.floor(z1 / 200) + 1; gz++) {
        (M.egrid[gx + ',' + gz] || []).forEach(function (id) { if (!seen[id]) { seen[id] = 1; out.push(M.edges[id]); } });
      }
      return out;
    }
    function buildTile(tx, tz) {
      var x0 = tx * TILE, z0 = tz * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
      var tg = new T.Group();
      var roads = edgesNear(x0 - 40, z0 - 40, x1 + 40, z1 + 40);
      // ---- 地形 ----
      var N = TILE / STEP, pos = new Float32Array((N + 1) * (N + 1) * 3), col = new Float32Array((N + 1) * (N + 1) * 3), uvs = new Float32Array((N + 1) * (N + 1) * 2), idx = [];
      for (var j = 0; j <= N; j++) for (var i = 0; i <= N; i++) {
        var x = x0 + i * STEP, z = z0 + j * STEP, y = M.height(x, z), lu = M.landuse(x, z);
        if (roads.length) {
          var nr = nearRoad(M, x, z, roads);
          if (nr.d < nr.hw + 4) y = nr.y - 0.25;
          else if (nr.d < nr.hw + 45) { var f = (nr.d - nr.hw - 4) / 41; f = f * f * (3 - 2 * f); y = nr.y - 0.25 + (y - nr.y + 0.25) * f; }
        }
        if (lu === 9) y = Math.min(y, M.height(x, z) - 2.5, 0.2);
        var k = (j * (N + 1) + i) * 3, c = hexRGB(T, LUCOL[lu] || LUCOL[0]);
        var nz2 = 0.9 + R.Map.hash2(x * 0.7, z * 1.3) * 0.18;
        var tk = lu === 9 ? 1 : (lu === 1 || lu === 2 || lu === 3 || lu === 10) ? TK * 0.95 : TK;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; col[k] = Math.min(1, c[0] * nz2 * tk); col[k + 1] = Math.min(1, c[1] * nz2 * tk); col[k + 2] = Math.min(1, c[2] * nz2 * tk);
        uvs[(j * (N + 1) + i) * 2] = x / 18; uvs[(j * (N + 1) + i) * 2 + 1] = z / 18;
        if (i < N && j < N) { var a = j * (N + 1) + i; idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2); }
      }
      var tgeo = new T.BufferGeometry();
      tgeo.setAttribute('position', new T.BufferAttribute(pos, 3)); tgeo.setAttribute('color', new T.BufferAttribute(col, 3)); tgeo.setAttribute('uv', new T.BufferAttribute(uvs, 2));
      tgeo.setIndex(idx); tgeo.computeVertexNormals();
      var terr = new T.Mesh(tgeo, matTerrain); terr.receiveShadow = true; tg.add(terr);
      // ---- 道路網 ----
      var rp = [], rc = [], ru = [];
      function ribbon(p, n, hw, c, lift, isLine) {
        var cc = hexRGB(T, c).map(function (v2) { return Math.min(1, v2 * RK); });
        for (var i2 = 0; i2 < n - 1; i2++) {
          var ax = p[i2 * 3], az = p[i2 * 3 + 1], bx = p[i2 * 3 + 3], bz = p[i2 * 3 + 4];
          if ((ax < x0 - 5 && bx < x0 - 5) || (ax > x1 + 5 && bx > x1 + 5) || (az < z0 - 5 && bz < z0 - 5) || (az > z1 + 5 && bz > z1 + 5)) continue;
          var ay = isLine ? M.height(ax, az) : p[i2 * 3 + 2], by = isLine ? M.height(bx, bz) : p[i2 * 3 + 5];
          var dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx2 = -dz / L * hw, nz3 = dx / L * hw;
          var v = [[ax - nx2, ay + lift, az - nz3], [ax + nx2, ay + lift, az + nz3], [bx + nx2, by + lift, bz + nz3], [bx - nx2, by + lift, bz - nz3]];
          var uvq = [[-hw / 3.5, 0], [hw / 3.5, 0], [hw / 3.5, L / 3.5], [-hw / 3.5, L / 3.5]];
          [0, 1, 2, 0, 2, 3].forEach(function (q) { rp.push(v[q][0], v[q][1], v[q][2]); rc.push(cc[0], cc[1], cc[2]); ru.push(uvq[q][0], uvq[q][1]); });
        }
      }
      roads.forEach(function (E) {
        var g2 = M.geomFor(E.c, E.lanes, E.c === 0 || E.c === 5), n = E.pts.length / 3;
        var urban = M.landuse(E.pts[0], E.pts[1]); urban = urban === 1 || urban === 2 || urban === 3;
        if (urban && E.c !== 0 && E.c !== 5) ribbon(E.pts, n, g2.hw + 2.8, '#7f7d78', 0.12);   // 歩道
        ribbon(E.pts, n, g2.hw, E.c === 0 ? '#55595e' : '#5c6065', 0.16);
        ribbon(E.pts, n, 0.07, E.c <= 2 ? '#e2b53a' : '#e6e6e6', 0.19);                      // 中央線
        ribbon(E.pts, n, 0.06, '#e6e6e6', 0.19);
      });
      M.minor.forEach(function (p2) {
        var f2 = new Float32Array(p2.length / 2 * 3);
        for (var q = 0; q < p2.length / 2; q++) { f2[q * 3] = p2[q * 2]; f2[q * 3 + 1] = p2[q * 2 + 1]; }
        var inside = false;
        for (q = 0; q < p2.length; q += 2) if (p2[q] > x0 - 50 && p2[q] < x1 + 50 && p2[q + 1] > z0 - 50 && p2[q + 1] < z1 + 50) { inside = true; break; }
        if (inside) ribbon(f2, p2.length / 2, 2.4, '#696c70', 0.1, true);
      });
      M.rail.forEach(function (r) {
        var inside = false;
        for (var q = 0; q < r.p.length; q += 3) if (r.p[q] > x0 - 50 && r.p[q] < x1 + 50 && r.p[q + 1] > z0 - 50 && r.p[q + 1] < z1 + 50) { inside = true; break; }
        if (!inside) return;
        ribbon(r.p, r.p.length / 3, 2.4, '#8a847a', 0.25);
        ribbon(r.p, r.p.length / 3, 0.9, '#5a4a3a', 0.32);
      });
      if (rp.length) {
        var rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new T.Float32BufferAttribute(rc, 3)); rg.setAttribute('uv', new T.Float32BufferAttribute(ru, 2)); rg.computeVertexNormals();
        var rm = new T.Mesh(rg, matRoad); rm.receiveShadow = true; tg.add(rm);
      }
      // ---- 建物 ----
      var bp = [], bn = [], bc = [], bu = [];
      function quad(a, b, c2, d, nrm, col2, uv) {
        [[a, uv[0]], [b, uv[1]], [c2, uv[2]], [a, uv[0]], [c2, uv[2]], [d, uv[3]]].forEach(function (e) {
          bp.push(e[0][0], e[0][1], e[0][2]); bn.push(nrm[0], nrm[1], nrm[2]); bc.push(col2[0], col2[1], col2[2]); bu.push(e[1][0], e[1][1]);
        });
      }
      function tri(a, b, c2, nrm, col2) {
        [a, b, c2].forEach(function (e) { bp.push(e[0], e[1], e[2]); bn.push(nrm[0], nrm[1], nrm[2]); bc.push(col2[0], col2[1], col2[2]); bu.push(0.75, 0.75); });
      }
      function box(cx, cz, w, d, ang, h, style, seed) {
        var y0 = M.height(cx, cz), ca = Math.cos(ang), sa = Math.sin(ang);
        if (roads.length) { var nr2 = nearRoad(M, cx, cz, roads); if (nr2.d < nr2.hw + 60) y0 = nr2.y - 0.25 + (y0 - nr2.y) * Math.min(1, Math.max(0, (nr2.d - nr2.hw - 4) / 41)); }
        function P(u, v, y) { return [cx + u * ca - v * sa, y, cz + u * sa + v * ca]; }
        var hw2 = w / 2, hd = d / 2, top = y0 + h;
        var c = hexRGB(T, style.c);
        var kind = style.win, u0, v0, us, vs;
        if (kind === 'grid') { u0 = 0; v0 = 0.5; us = 0.5 / 14; vs = 0.5 / 12.4; }      // オフィス（上左）
        else if (kind === 'apt') { u0 = 0; v0 = 0; us = 0.5 / 14; vs = 0.5 / 12.4; }     // 集合住宅（下左）
        else if (kind === 'house') { u0 = 0.5; v0 = 0; us = 0.5 / 16; vs = 0.5 / 6.2; }
        else { u0 = 0.5; v0 = 0.5; us = 0.5 / 20; vs = 0.5 / 20; }
        var corners = [[-hw2, -hd], [hw2, -hd], [hw2, hd], [-hw2, hd]];
        for (var s = 0; s < 4; s++) {
          var A = corners[s], B = corners[(s + 1) % 4], len = Math.hypot(B[0] - A[0], B[1] - A[1]);
          var p0 = P(A[0], A[1], y0 - 0.5), p1 = P(B[0], B[1], y0 - 0.5), p2 = P(B[0], B[1], top), p3 = P(A[0], A[1], top);
          var ex = p1[0] - p0[0], ez = p1[2] - p0[2], L = Math.hypot(ex, ez) || 1, nrm = [ez / L, 0, -ex / L];
          var U = len * us, V = (h + 0.5) * vs;
          // テクスチャは繰り返し（u0/v0 の区画の中で）
          var uvq = [[u0, v0], [u0 + U, v0], [u0 + U, v0 + V], [u0, v0 + V]];
          quad(p0, p1, p2, p3, nrm, c, uvq);
        }
        var rcol = hexRGB(T, style.roof === 'gable' || style.roof === 'temple' ? (style.rc || '#4a4f57') : '#8c8f92');
        if (style.roof === 'gable' || style.roof === 'temple') {
          var rh = Math.min(3.5, Math.min(w, d) * 0.35), ridgeAlongW = w >= d;
          if (ridgeAlongW) {
            var r0 = P(-hw2, 0, top + rh), r1 = P(hw2, 0, top + rh);
            quad(P(-hw2 - 0.3, -hd - 0.4, top - 0.1), P(hw2 + 0.3, -hd - 0.4, top - 0.1), r1, r0, [sa * -0.7, 0.7, ca * -0.7], rcol, [[0.8, 0.8], [0.8, 0.8], [0.8, 0.8], [0.8, 0.8]]);
            quad(P(hw2 + 0.3, hd + 0.4, top - 0.1), P(-hw2 - 0.3, hd + 0.4, top - 0.1), r0, r1, [sa * 0.7, 0.7, ca * 0.7], rcol, [[0.8, 0.8], [0.8, 0.8], [0.8, 0.8], [0.8, 0.8]]);
            tri(P(-hw2, -hd, top), P(-hw2, hd, top), r0, [-ca, 0, -sa], c); tri(P(hw2, hd, top), P(hw2, -hd, top), r1, [ca, 0, sa], c);
          } else {
            var r2 = P(0, -hd, top + rh), r3 = P(0, hd, top + rh);
            quad(P(hw2 + 0.4, -hd - 0.3, top - 0.1), P(hw2 + 0.4, hd + 0.3, top - 0.1), r3, r2, [ca * 0.7, 0.7, sa * 0.7], rcol, [[0.8, 0.8], [0.8, 0.8], [0.8, 0.8], [0.8, 0.8]]);
            quad(P(-hw2 - 0.4, hd + 0.3, top - 0.1), P(-hw2 - 0.4, -hd - 0.3, top - 0.1), r2, r3, [-ca * 0.7, 0.7, -sa * 0.7], rcol, [[0.8, 0.8], [0.8, 0.8], [0.8, 0.8], [0.8, 0.8]]);
            tri(P(hw2, -hd, top), P(-hw2, -hd, top), r2, [sa, 0, -ca], c); tri(P(-hw2, hd, top), P(hw2, hd, top), r3, [-sa, 0, ca], c);
          }
        } else {
          quad(P(-hw2, -hd, top), P(-hw2, hd, top), P(hw2, hd, top), P(hw2, -hd, top), [0, 1, 0], rcol, [[0.8, 0.8], [0.8, 0.8], [0.8, 0.8], [0.8, 0.8]]);
          if (h > 12 && seed % 3 === 0) {   // 屋上の設備
            var q2 = Math.min(w, d) * 0.3;
            box(cx, cz, q2, q2, ang, 0.01, { c: '#9aa0a6', win: 'none', roof: 'flat' }, 1);
          }
        }
      }
      var B = M.bld, cnt = 0;
      for (var gx = Math.floor(x0 / 100); gx < Math.ceil(x1 / 100); gx++) for (var gz = Math.floor(z0 / 100); gz < Math.ceil(z1 / 100); gz++) {
        (M.bgrid[gx + ',' + gz] || []).forEach(function (b) {
          var seed = R.Map.hash2(B.x[b], B.z[b]), st = R.Map.bldStyle(B.k[b], B.l[b], seed);
          box(B.x[b], B.z[b], B.w[b], B.d[b], B.a[b], B.l[b] * 3.1 + 0.4, st, Math.floor(seed * 1000));
          cnt++;
        });
      }
      // 建物データのない住宅地・商業地・工業地には、道沿いに家や店を建てる
      var treesP = [], treesC = [];
      roads.concat([]).forEach(function (E) {
        if (E.c === 0 || E.c === 5) return;
        var g2 = M.geomFor(E.c, E.lanes, false), p = E.pts, n = p.length / 3, d0 = 0;
        for (var i3 = 0; i3 < n - 1; i3++) {
          var ax = p[i3 * 3], az = p[i3 * 3 + 1], bx = p[i3 * 3 + 3], bz = p[i3 * 3 + 4], L = Math.hypot(bx - ax, bz - az);
          if (L < 1) continue;
          var fx = (bx - ax) / L, fz = (bz - az) / L;
          for (var s2 = (14 - d0 % 14); s2 < L; s2 += 14) {
            var px = ax + fx * s2, pz = az + fz * s2;
            if (px < x0 || px >= x1 || pz < z0 || pz >= z1) continue;
            [-1, 1].forEach(function (sd) {
              var ox = px - fz * sd * (g2.hw + 9), oz = pz + fx * sd * (g2.hw + 9), lu = M.landuse(ox, oz);
              var hs = R.Map.hash2(ox * 1.7, oz * 0.9);
              if ((lu === 1 || lu === 2 || lu === 3) && !M.covered(ox, oz)) {
                if (hs < 0.75) {
                  var big = lu !== 1, ww = big ? 12 + hs * 10 : 8 + hs * 3, dd = big ? 14 + hs * 12 : 8 + hs * 3;
                  var cx2 = px - fz * sd * (g2.hw + 3 + dd / 2 + hs * 3), cz2 = pz + fx * sd * (g2.hw + 3 + dd / 2 + hs * 3);
                  box(cx2, cz2, ww, dd, Math.atan2(fz, fx), (big ? 2 + Math.floor(hs * 3) : 2) * 3.1, R.Map.bldStyle(lu === 2 ? 2 : lu === 3 ? 3 : 0, big ? 3 : 2, hs), Math.floor(hs * 1000));
                }
              } else if (lu === 6 || lu === 5 || lu === 7) {
                for (var tt = 0; tt < (lu === 6 ? 3 : 1); tt++) {
                  var h2 = R.Map.hash2(ox + tt * 13, oz - tt * 7), off = g2.hw + 4 + h2 * 30;
                  treesP.push([px - fz * sd * off + fx * (h2 - 0.5) * 10, pz + fx * sd * off + fz * (h2 - 0.5) * 10, lu, h2]);
                }
              }
            });
          }
          d0 += L;
        }
      });
      if (bp.length) {
        var bg = new T.BufferGeometry();
        bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); bg.setAttribute('normal', new T.Float32BufferAttribute(bn, 3));
        bg.setAttribute('color', new T.Float32BufferAttribute(bc, 3)); bg.setAttribute('uv', new T.Float32BufferAttribute(bu, 2));
        var bm = new T.Mesh(bg, matBld); bm.castShadow = true; bm.receiveShadow = true; tg.add(bm);
      }
      // 森の中の木（タイル内に散らす）
      for (var k2 = 0; k2 < 90; k2++) {
        var hx = R.Map.hash2(tx * 131 + k2, tz * 71 - k2), hz = R.Map.hash2(tz * 97 + k2 * 3, tx * 53 + k2);
        var wx = x0 + hx * TILE, wz = z0 + hz * TILE, lu2 = M.landuse(wx, wz);
        if (lu2 === 6 && roads.every(function (E) { return true; })) treesP.push([wx, wz, 6, hx]);
      }
      if (treesP.length) {
        var tp = [], tcol = [];
        treesP.forEach(function (t4) {
          var y = M.height(t4[0], t4[1]);
          if (roads.length) { var nr3 = nearRoad(M, t4[0], t4[1], roads); if (nr3.d < nr3.hw + 3) return; if (nr3.d < nr3.hw + 45) y = nr3.y + (y - nr3.y) * Math.min(1, (nr3.d - nr3.hw - 4) / 41); }
          var cedar = t4[2] === 6 && t4[3] < 0.6, tea = t4[2] === 5, hgt = tea ? 1.2 : cedar ? 12 + t4[3] * 8 : 7 + t4[3] * 5, rad = tea ? 1.4 : cedar ? 2.4 : 3.2;
          var cc = hexRGB(T, tea ? '#3f7a32' : cedar ? '#244a2c' : ['#3f6b3a', '#4b7a3f', '#355f33'][Math.floor(t4[3] * 3)]), tr = hexRGB(T, '#4e3b2c');
          var sides = 6, x = t4[0], z = t4[1];
          for (var s3 = 0; s3 < sides; s3++) {
            var a1 = s3 / sides * Math.PI * 2, a2 = (s3 + 1) / sides * Math.PI * 2;
            if (!tea) { tp.push(x + Math.cos(a1) * 0.25, y, z + Math.sin(a1) * 0.25, x + Math.cos(a2) * 0.25, y, z + Math.sin(a2) * 0.25, x, y + hgt * 0.4, z); for (var q3 = 0; q3 < 3; q3++) tcol.push(tr[0], tr[1], tr[2]); }
            var base = tea ? y : y + hgt * (cedar ? 0.25 : 0.35), apex = y + hgt;
            if (cedar || tea) { tp.push(x + Math.cos(a1) * rad, base, z + Math.sin(a1) * rad, x, apex, z, x + Math.cos(a2) * rad, base, z + Math.sin(a2) * rad); for (q3 = 0; q3 < 3; q3++) tcol.push(cc[0], cc[1], cc[2]); }
            else {
              var mid = base + (apex - base) * 0.5;
              tp.push(x + Math.cos(a1) * rad, mid, z + Math.sin(a1) * rad, x, apex, z, x + Math.cos(a2) * rad, mid, z + Math.sin(a2) * rad);
              tp.push(x + Math.cos(a2) * rad, mid, z + Math.sin(a2) * rad, x, base, z, x + Math.cos(a1) * rad, mid, z + Math.sin(a1) * rad);
              for (q3 = 0; q3 < 6; q3++) tcol.push(cc[0] * (q3 < 3 ? 1.1 : 0.8), cc[1] * (q3 < 3 ? 1.1 : 0.8), cc[2] * (q3 < 3 ? 1.1 : 0.8));
            }
          }
        });
        if (tp.length) {
          var tgeo2 = new T.BufferGeometry(); tgeo2.setAttribute('position', new T.Float32BufferAttribute(tp, 3)); tgeo2.setAttribute('color', new T.Float32BufferAttribute(tcol, 3)); tgeo2.computeVertexNormals();
          var tm = new T.Mesh(tgeo2, matTree); tm.castShadow = true; tg.add(tm);
        }
      }
      group.add(tg);
      return tg;
    }

    function update(cx, cz) {
      var need = {};
      for (var tx = Math.floor((cx - NEAR) / TILE); tx <= Math.floor((cx + NEAR) / TILE); tx++) for (var tz = Math.floor((cz - NEAR) / TILE); tz <= Math.floor((cz + NEAR) / TILE); tz++) {
        var dx = Math.max(0, Math.abs(cx - (tx + 0.5) * TILE) - TILE / 2), dz = Math.max(0, Math.abs(cz - (tz + 0.5) * TILE) - TILE / 2);
        if (dx * dx + dz * dz > NEAR * NEAR) continue;
        var key = tx + ',' + tz; need[key] = 1;
        if (!tiles[key] && queue.indexOf(key) < 0) queue.push(key);
      }
      // 近い順に 1 フレーム 1 枚ずつ作る
      queue.sort(function (a, b) { var A = a.split(',').map(Number), B = b.split(',').map(Number); return Math.hypot((A[0] + 0.5) * TILE - cx, (A[1] + 0.5) * TILE - cz) - Math.hypot((B[0] + 0.5) * TILE - cx, (B[1] + 0.5) * TILE - cz); });
      var budget = opts.sync ? queue.length : 1;
      while (budget-- > 0 && queue.length) {
        var k = queue.shift(), p = k.split(',').map(Number);
        if (!tiles[k]) tiles[k] = buildTile(p[0], p[1]);
      }
      Object.keys(tiles).forEach(function (k2) {
        var p2 = k2.split(',').map(Number), d = Math.hypot((p2[0] + 0.5) * TILE - cx, (p2[1] + 0.5) * TILE - cz);
        if (d > FAR + TILE) { disposeTile(tiles[k2]); delete tiles[k2]; }
      });
    }
    function disposeTile(tg) { group.remove(tg); tg.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    function dispose() { Object.keys(tiles).forEach(function (k) { disposeTile(tiles[k]); }); tiles = {}; scene.remove(group); group.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); }
    return { update: update, dispose: dispose, group: group, pending: function () { return queue.length; } };
  };
})();
