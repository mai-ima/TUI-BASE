/*
 * games.js — ターミナルの中で遊べるゲーム。
 *
 *   guess … 数当て（1 行ずつ入力）
 *   ttt   … 三目並べ（1 行ずつ入力、CPU は minimax）
 *   rogue … ローグライク（キーを直接受け取る本格版）
 *
 * 行入力を使うゲームは TB.setLineHandler()、キー入力を使うゲームは
 * TB.Term.capture() で端末の入力を借りる。
 */
(function () {
  'use strict';

  var TB = window.TB;
  var def = TB.def;

  function ja() { return TB.state.lang === 'ja'; }
  function L(j, e) { return ja() ? j : e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function best(key, value, lower) {
    var cur = parseInt(TB.store.get('best:' + key, ''), 10);
    var better = isNaN(cur) || (lower ? value < cur : value > cur);
    if (better) TB.store.set('best:' + key, String(value));
    return { best: better ? value : cur, updated: better };
  }

  /* =====================================================================
     1. guess — 数当て
     ===================================================================== */

  var guessState = null;

  function guessBar(lo, hi) {
    var width = 24;
    var a = Math.round((lo - 1) / 99 * width);
    var b = Math.round((hi - 1) / 99 * width);
    return '[' + '·'.repeat(a) + '█'.repeat(Math.max(1, b - a)) + '·'.repeat(Math.max(0, width - b)) + ']';
  }

  function guessQuit(reason) {
    TB.setLineHandler(null);
    var lines = [];
    if (reason === 'quit') {
      lines.push([{ t: L('やめました。答えは ', 'Gave up. The number was ') + guessState.target + L(' でした。', '.'), c: 'dim' }]);
    }
    guessState = null;
    lines.push('');
    TB.Term.printAll(lines);
  }

  function guessLine(input) {
    var s = guessState;
    if (!s) return;
    var v = input.trim().toLowerCase();
    if (v === 'q' || v === 'quit' || v === 'exit') return guessQuit('quit');

    var n = parseInt(v, 10);
    if (isNaN(n) || n < 1 || n > 100) {
      TB.Term.printAll([[{ t: L('1〜100 の数を入れてください（q でやめる）。', 'Enter a number from 1 to 100 (q to quit).'), c: 'warn' }]]);
      return;
    }

    s.tries++;
    if (n === s.target) {
      var r = best('guess', s.tries, true);
      var out = [
        '',
        [{ t: L('正解！ ', 'Correct! ') + s.target, c: 'accent bold' }],
        [{ t: L(s.tries + ' 回で当てました。', 'You got it in ' + s.tries + ' guesses.'), c: '' }]
      ];
      if (r.updated) out.push([{ t: L('自己最高記録を更新しました。', 'New personal best.'), c: 'accent-2' }]);
      else out.push([{ t: L('自己最高記録: ' + r.best + ' 回', 'Personal best: ' + r.best + ' guesses'), c: 'dim' }]);
      out.push('');
      TB.setLineHandler(null);
      guessState = null;
      TB.Term.printAll(out);
      return;
    }

    if (n < s.target) s.lo = Math.max(s.lo, n + 1);
    else s.hi = Math.min(s.hi, n - 1);

    var hint = n < s.target ? L('もっと大きい ↑', 'higher ↑') : L('もっと小さい ↓', 'lower ↓');
    TB.Term.printAll([[
      { t: hint, c: n < s.target ? 'accent-2' : 'warn' },
      { t: '   ' + guessBar(s.lo, s.hi) + ' ', c: 'dim' },
      { t: s.lo + '–' + s.hi, c: 'dim' },
      { t: '   ' + L(s.tries + ' 回目', 'try ' + s.tries), c: 'dim' }
    ]]);
  }

  def('guess', {
    group: 'game',
    desc: { ja: '数当てゲーム（1〜100）', en: 'guess the number (1–100)' },
    run: function () {
      guessState = { target: 1 + rnd(100), lo: 1, hi: 100, tries: 0 };
      TB.setLineHandler(guessLine, 'guess>');
      return [
        '',
        [{ t: L('1 から 100 の数を思い浮かべました。', 'I picked a number between 1 and 100.'), c: 'accent' }],
        [{ t: L('当ててください。q でやめられます。', 'Try to guess it. Type q to quit.'), c: 'dim' }],
        ''
      ];
    }
  });

  /* =====================================================================
     2. ttt — 三目並べ
     ===================================================================== */

  var WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var tttState = null;

  function tttWinner(b) {
    for (var i = 0; i < WINS.length; i++) {
      var w = WINS[i];
      if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) return { who: b[w[0]], line: w };
    }
    return b.indexOf('') === -1 ? { who: 'draw', line: null } : null;
  }

  function minimax(b, me, turn) {
    var end = tttWinner(b);
    if (end) return { score: end.who === 'draw' ? 0 : (end.who === me ? 10 : -10), move: -1 };
    var bestScore = turn === me ? -99 : 99;
    var bestMove = -1;
    for (var i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = turn;
      var s = minimax(b, me, turn === 'X' ? 'O' : 'X').score;
      b[i] = '';
      if (turn === me ? s > bestScore : s < bestScore) { bestScore = s; bestMove = i; }
    }
    return { score: bestScore - (turn === me ? 0 : 0), move: bestMove };
  }

  function tttBoard(b, line) {
    var cells = [];
    for (var i = 0; i < 9; i++) {
      var v = b[i];
      var hit = line && line.indexOf(i) !== -1;
      cells.push(v === 'X' ? { t: 'X', c: hit ? 'accent bold hit' : 'accent bold' }
        : v === 'O' ? { t: 'O', c: hit ? 'warn bold hit' : 'warn bold' }
        : { t: String(i + 1), c: 'faint dim' });
    }
    var bar = function (l, m, r) { return [{ t: '  ' + l + '───' + m + '───' + m + '───' + r, c: 'dim' }]; };
    var row = function (i) {
      return [
        { t: '  │ ', c: 'dim' }, cells[i], { t: ' │ ', c: 'dim' }, cells[i + 1],
        { t: ' │ ', c: 'dim' }, cells[i + 2], { t: ' │', c: 'dim' }
      ];
    };
    // 罫線がつながるよう、盤面は行間を詰めたひとかたまりとして出す
    return [{ block: { cls: 'board', lines: [
      bar('┌', '┬', '┐'), row(0), bar('├', '┼', '┤'), row(3), bar('├', '┼', '┤'), row(6), bar('└', '┴', '┘')
    ] } }];
  }

  function tttEnd(result) {
    var out = [''];
    if (result.who === 'draw') out.push([{ t: L('引き分け。', 'A draw.'), c: 'dim' }]);
    else if (result.who === 'X') out.push([{ t: L('あなたの勝ち！', 'You win!'), c: 'accent bold' }]);
    else out.push([{ t: L('CPU の勝ち。', 'The computer wins.'), c: 'err' }]);

    var rec = JSON.parse(TB.store.get('ttt', '{"w":0,"l":0,"d":0}'));
    if (result.who === 'X') rec.w++; else if (result.who === 'O') rec.l++; else rec.d++;
    TB.store.set('ttt', JSON.stringify(rec));
    out.push([{ t: L('通算 ' + rec.w + ' 勝 ' + rec.l + ' 敗 ' + rec.d + ' 分', 'record: ' + rec.w + 'W ' + rec.l + 'L ' + rec.d + 'D'), c: 'dim' }]);
    out.push([{ t: L('もう一度遊ぶ: y / やめる: n', 'play again: y / quit: n'), c: 'dim' }], '');
    tttState.over = true;
    return out;
  }

  function tttLine(input) {
    var s = tttState;
    if (!s) return;
    var v = input.trim().toLowerCase();

    if (v === 'q' || v === 'quit' || v === 'n') {
      TB.setLineHandler(null);
      tttState = null;
      TB.Term.printAll([[{ t: L('またどうぞ。', 'Come back any time.'), c: 'dim' }], '']);
      return;
    }
    if (s.over) {
      if (v === 'y' || v === 'yes' || v === '') {
        s.board = ['', '', '', '', '', '', '', '', ''];
        s.over = false;
        TB.Term.printAll([''].concat(tttBoard(s.board, null), ['']));
      } else {
        TB.Term.printAll([[{ t: L('y か n を入れてください。', 'Please answer y or n.'), c: 'warn' }]]);
      }
      return;
    }

    var i = parseInt(v, 10) - 1;
    if (isNaN(i) || i < 0 || i > 8) {
      TB.Term.printAll([[{ t: L('1〜9 の番号で置いてください（q でやめる）。', 'Pick a cell 1–9 (q to quit).'), c: 'warn' }]]);
      return;
    }
    if (s.board[i]) {
      TB.Term.printAll([[{ t: L('そこは埋まっています。', 'That cell is taken.'), c: 'warn' }]]);
      return;
    }

    s.board[i] = 'X';
    var end = tttWinner(s.board);
    if (!end) {
      var open = [];
      s.board.forEach(function (c, k) { if (!c) open.push(k); });
      var mv = Math.random() < s.slip ? pick(open) : minimax(s.board.slice(), 'O', 'O').move;
      s.board[mv] = 'O';
      end = tttWinner(s.board);
    }

    var out = [''].concat(tttBoard(s.board, end && end.line));
    if (end) out = out.concat(tttEnd(end));
    else out.push('');
    TB.Term.printAll(out);
  }

  def('ttt', {
    group: 'game',
    usage: 'ttt [easy|normal|hard]',
    desc: { ja: '三目並べ（CPU 対戦）', en: 'tic-tac-toe against the computer' },
    run: function (args) {
      var level = (args[0] || 'normal').toLowerCase();
      var slip = level === 'easy' ? 0.6 : level === 'hard' ? 0 : 0.25;
      if (['easy', 'normal', 'hard'].indexOf(level) === -1) {
        return [[{ t: TB.ui('usage') + ': ttt [easy|normal|hard]', c: 'warn' }]];
      }
      tttState = { board: ['', '', '', '', '', '', '', '', ''], slip: slip, over: false };
      TB.setLineHandler(tttLine, 'ttt>');
      return [
        '',
        [{ t: L('三目並べ。あなたが ', 'Tic-tac-toe. You are ') , c: '' }, { t: 'X', c: 'accent bold' },
         { t: L('、CPU が ', ', the computer is ') }, { t: 'O', c: 'warn bold' },
         { t: L('。難易度: ', '. level: ') + level, c: 'dim' }],
        [{ t: L('置きたいマスの番号（1〜9）を入力してください。q でやめる。', 'Type the number of a cell (1–9). q to quit.'), c: 'dim' }],
        ''
      ].concat(tttBoard(tttState.board, null), ['']);
    }
  });

  /* =====================================================================
     3. rogue — ローグライク
     ===================================================================== */

  var WALL = 0, FLOOR = 1, STAIR = 2;
  var MAX_DEPTH = 8;

  var MONSTERS = [
    { ch: 'r', hp: 5,  atk: 2,  def: 0, xp: 2,  min: 1, cls: 'g-m1', name: { ja: 'ネズミ', en: 'rat' } },
    { ch: 'k', hp: 8,  atk: 3,  def: 1, xp: 5,  min: 1, cls: 'g-m1', name: { ja: 'コボルト', en: 'kobold' } },
    { ch: 'g', hp: 11, atk: 4,  def: 1, xp: 9,  min: 2, cls: 'g-m2', name: { ja: 'ゴブリン', en: 'goblin' } },
    { ch: 'o', hp: 17, atk: 5,  def: 2, xp: 18, min: 3, cls: 'g-m2', name: { ja: 'オーク', en: 'orc' } },
    { ch: 'w', hp: 14, atk: 6,  def: 1, xp: 22, min: 4, cls: 'g-m3', name: { ja: 'ダイアウルフ', en: 'dire wolf' } },
    { ch: 'T', hp: 28, atk: 8,  def: 3, xp: 45, min: 5, cls: 'g-m3', name: { ja: 'トロル', en: 'troll' } },
    { ch: 'D', hp: 44, atk: 11, def: 5, xp: 95, min: 7, cls: 'g-m4', name: { ja: 'ドラゴン', en: 'dragon' } }
  ];

  var G = null;

  /* --- 地図生成 ------------------------------------------------------- */

  function makeMap(w, h) {
    var m = [];
    for (var y = 0; y < h; y++) {
      m.push([]);
      for (var x = 0; x < w; x++) m[y].push(WALL);
    }
    return m;
  }

  function carveRoom(map, r) {
    for (var y = r.y; y < r.y + r.h; y++) {
      for (var x = r.x; x < r.x + r.w; x++) map[y][x] = FLOOR;
    }
  }

  function carveCorridor(map, a, b) {
    var x = a.cx, y = a.cy;
    var order = Math.random() < 0.5;
    var stepX = function () { while (x !== b.cx) { x += x < b.cx ? 1 : -1; map[y][x] = FLOOR; } };
    var stepY = function () { while (y !== b.cy) { y += y < b.cy ? 1 : -1; map[y][x] = FLOOR; } };
    if (order) { stepX(); stepY(); } else { stepY(); stepX(); }
  }

  function generate(w, h, depth) {
    var map = makeMap(w, h);
    var rooms = [];
    var attempts = 120;

    while (attempts-- > 0 && rooms.length < 9) {
      var rw = 4 + rnd(7), rh = 3 + rnd(4);
      var rx = 1 + rnd(Math.max(1, w - rw - 2));
      var ry = 1 + rnd(Math.max(1, h - rh - 2));
      var r = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) };
      var clash = rooms.some(function (o) {
        return r.x <= o.x + o.w + 1 && r.x + r.w + 1 >= o.x &&
               r.y <= o.y + o.h + 1 && r.y + r.h + 1 >= o.y;
      });
      if (clash) continue;
      carveRoom(map, r);
      if (rooms.length) carveCorridor(map, rooms[rooms.length - 1], r);
      rooms.push(r);
    }
    return { map: map, rooms: rooms };
  }

  function freeSpot(rooms, taken) {
    for (var i = 0; i < 200; i++) {
      var r = pick(rooms);
      var x = r.x + rnd(r.w), y = r.y + rnd(r.h);
      if (!taken.some(function (t) { return t.x === x && t.y === y; })) return { x: x, y: y };
    }
    return { x: rooms[0].cx, y: rooms[0].cy };
  }

  /* --- 視界（シャドウキャスティング） --------------------------------- */

  var MULT = [
    [1, 0, 0, -1, -1, 0, 0, 1],
    [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0],
    [1, 0, 0, 1, -1, 0, 0, -1]
  ];

  function blocked(x, y) {
    return x < 0 || y < 0 || x >= G.w || y >= G.h || G.map[y][x] === WALL;
  }

  function light(x, y) {
    if (x < 0 || y < 0 || x >= G.w || y >= G.h) return;
    G.vis[y][x] = true;
    G.seen[y][x] = true;
  }

  function castLight(cx, cy, row, start, end, radius, xx, xy, yx, yy) {
    if (start < end) return;
    var newStart = 0;
    for (var i = row; i <= radius; i++) {
      var dx = -i - 1, dy = -i, done = false;
      while (dx <= 0) {
        dx++;
        var X = cx + dx * xx + dy * xy;
        var Y = cy + dx * yx + dy * yy;
        var lSlope = (dx - 0.5) / (dy + 0.5);
        var rSlope = (dx + 0.5) / (dy - 0.5);
        if (start < rSlope) continue;
        if (end > lSlope) break;
        if (dx * dx + dy * dy <= radius * radius) light(X, Y);
        if (done) {
          if (blocked(X, Y)) { newStart = rSlope; continue; }
          done = false;
          start = newStart;
        } else if (blocked(X, Y) && i < radius) {
          done = true;
          castLight(cx, cy, i + 1, start, lSlope, radius, xx, xy, yx, yy);
          newStart = rSlope;
        }
      }
      if (done) break;
    }
  }

  function computeFov() {
    for (var y = 0; y < G.h; y++) for (var x = 0; x < G.w; x++) G.vis[y][x] = false;
    light(G.px, G.py);
    for (var o = 0; o < 8; o++) {
      castLight(G.px, G.py, 1, 1.0, 0.0, G.radius, MULT[0][o], MULT[1][o], MULT[2][o], MULT[3][o]);
    }
  }

  /* --- 階層の用意 ------------------------------------------------------ */

  function enterLevel(depth) {
    var gen = generate(G.w, G.h, depth);
    G.map = gen.map;
    G.rooms = gen.rooms;
    G.depth = depth;
    G.monsters = [];
    G.items = [];
    G.vis = []; G.seen = [];
    for (var y = 0; y < G.h; y++) {
      G.vis.push([]); G.seen.push([]);
      for (var x = 0; x < G.w; x++) { G.vis[y].push(false); G.seen[y].push(false); }
    }

    var start = gen.rooms[0];
    G.px = start.cx; G.py = start.cy;
    var taken = [{ x: G.px, y: G.py }];

    // 階段（最深部には代わりに護符を置く）
    if (depth < MAX_DEPTH) {
      var st = freeSpot(gen.rooms.slice(1).length ? gen.rooms.slice(1) : gen.rooms, taken);
      G.map[st.y][st.x] = STAIR;
      taken.push(st);
    } else {
      var am = freeSpot(gen.rooms.slice(1).length ? gen.rooms.slice(1) : gen.rooms, taken);
      G.items.push({ x: am.x, y: am.y, kind: 'amulet', ch: '*', cls: 'g-amulet' });
      taken.push(am);
    }

    // モンスター（最初の部屋には置かない。降りた直後に囲まれないように）
    var pool = MONSTERS.filter(function (m) { return m.min <= depth; });
    var spawnRooms = gen.rooms.length > 1 ? gen.rooms.slice(1) : gen.rooms;
    var count = 2 + depth + rnd(3);
    for (var i = 0; i < count; i++) {
      var proto = pick(pool.slice(-4));
      var p = freeSpot(spawnRooms, taken);
      taken.push(p);
      G.monsters.push({
        x: p.x, y: p.y, ch: proto.ch, cls: proto.cls, name: proto.name,
        hp: proto.hp + rnd(depth), maxhp: proto.hp + rnd(depth),
        atk: proto.atk, def: proto.def, xp: proto.xp
      });
    }

    // アイテム
    var drops = 2 + rnd(3);
    for (var d = 0; d < drops; d++) {
      var q = freeSpot(gen.rooms, taken);
      taken.push(q);
      var roll = Math.random();
      if (roll < 0.5) G.items.push({ x: q.x, y: q.y, kind: 'potion', ch: '!', cls: 'g-potion', amount: 10 + rnd(8) });
      else if (roll < 0.82) G.items.push({ x: q.x, y: q.y, kind: 'gold', ch: '$', cls: 'g-gold', amount: 5 + rnd(10 * depth) });
      else if (roll < 0.9) G.items.push({ x: q.x, y: q.y, kind: 'weapon', ch: ')', cls: 'g-gear', amount: 1 });
      else G.items.push({ x: q.x, y: q.y, kind: 'armor', ch: '[', cls: 'g-gear', amount: 1 });
    }

    computeFov();
  }

  /* --- 画面 ------------------------------------------------------------ */

  function tileGlyph(x, y) {
    var t = G.map[y][x];
    if (t === STAIR) return ['>', 'g-stair'];
    if (t === FLOOR) return ['·', 'g-floor'];
    return ['#', 'g-wall'];
  }

  function glyphAt(x, y) {
    if (!G.seen[y][x]) return [' ', 'g-void'];
    if (!G.vis[y][x]) {
      var g = tileGlyph(x, y);
      return [g[0], g[1] + ' g-dark'];
    }
    if (G.px === x && G.py === y) return ['@', 'g-you'];
    for (var i = 0; i < G.monsters.length; i++) {
      if (G.monsters[i].x === x && G.monsters[i].y === y) return [G.monsters[i].ch, G.monsters[i].cls];
    }
    for (var k = 0; k < G.items.length; k++) {
      if (G.items[k].x === x && G.items[k].y === y) return [G.items[k].ch, G.items[k].cls];
    }
    return tileGlyph(x, y);
  }

  function renderMap() {
    var frag = document.createDocumentFragment();
    for (var y = 0; y < G.h; y++) {
      var row = document.createElement('div');
      row.className = 'g-row';
      var runCls = null, runTxt = '';
      for (var x = 0; x < G.w; x++) {
        var g = glyphAt(x, y);
        if (g[1] === runCls) { runTxt += g[0]; continue; }
        if (runCls !== null) {
          var s = document.createElement('span');
          s.className = runCls; s.textContent = runTxt;
          row.appendChild(s);
        }
        runCls = g[1]; runTxt = g[0];
      }
      if (runCls !== null) {
        var last = document.createElement('span');
        last.className = runCls; last.textContent = runTxt;
        row.appendChild(last);
      }
      frag.appendChild(row);
    }
    G.el.map.textContent = '';
    G.el.map.appendChild(frag);
  }

  function bar(cur, max, width) {
    var n = clamp(Math.round(cur / max * width), 0, width);
    return '█'.repeat(n) + '░'.repeat(width - n);
  }

  function renderStatus() {
    var st = G.el.status;
    st.textContent = '';
    var hpCls = G.hp / G.maxhp > 0.5 ? 'accent' : (G.hp / G.maxhp > 0.25 ? 'warn' : 'err');
    var parts = [
      ['HP ', 'dim'], [bar(G.hp, G.maxhp, 10), hpCls], [' ' + G.hp + '/' + G.maxhp + '  ', hpCls],
      ['Lv ', 'dim'], [G.lv + '  ', ''],
      ['XP ', 'dim'], [G.xp + '/' + G.next + '  ', ''],
      [L('攻 ', 'atk '), 'dim'], [G.atk + '  ', ''],
      [L('防 ', 'def '), 'dim'], [G.def + '  ', ''],
      ['! ', 'dim'], [G.potions + '  ', 'g-potion'],
      ['$ ', 'dim'], [G.gold + '  ', 'g-gold'],
      [L('深さ ', 'depth '), 'dim'], [G.depth + '/' + MAX_DEPTH, 'accent-2']
    ];
    parts.forEach(function (p) {
      var s = document.createElement('span');
      s.className = p[1]; s.textContent = p[0];
      st.appendChild(s);
    });
  }

  function renderLog() {
    var box = G.el.log;
    box.textContent = '';
    var recent = G.log.slice(-3);
    recent.forEach(function (m, i) {
      var d = document.createElement('div');
      d.className = 'line' + (i < recent.length - 1 ? ' dim' : '');
      var s = document.createElement('span');
      s.className = m[1] || '';
      s.textContent = m[0];
      d.appendChild(s);
      box.appendChild(d);
    });
  }

  function draw() {
    computeFov();
    renderMap();
    renderStatus();
    renderLog();
  }

  function msg(text, cls) {
    G.log.push([text, cls || '']);
    if (G.log.length > 40) G.log.shift();
  }

  /* --- 戦闘・行動 ------------------------------------------------------ */

  function damage(atk, def) {
    return Math.max(1, atk + rnd(3) - def);
  }

  function monsterName(m) { return TB.t(m.name); }

  /* 次のレベルに必要な累計 XP: 15, 55, 115, 195 … と離れていく */
  function levelUp() {
    while (G.xp >= G.next) {
      G.lv++;
      G.next += 20 * G.lv;
      G.maxhp += 6;
      G.hp = Math.min(G.maxhp, G.hp + 6);
      G.atk += 1;
      if (G.lv % 2 === 0) G.def += 1;
      msg(L('レベル ' + G.lv + ' に上がった！', 'Welcome to level ' + G.lv + '!'), 'accent bold');
    }
  }

  function attack(m) {
    var dmg = damage(G.atk, m.def);
    m.hp -= dmg;
    if (m.hp > 0) {
      msg(L(monsterName(m) + ' に ' + dmg + ' のダメージ。', 'You hit the ' + monsterName(m) + ' for ' + dmg + '.'), '');
      return;
    }
    G.monsters = G.monsters.filter(function (o) { return o !== m; });
    G.xp += m.xp;
    msg(L(monsterName(m) + ' を倒した！ (+' + m.xp + ' XP)', 'The ' + monsterName(m) + ' dies! (+' + m.xp + ' XP)'), 'accent');
    levelUp();
  }

  function pickUp() {
    var here = G.items.filter(function (i) { return i.x === G.px && i.y === G.py; });
    here.forEach(function (i) {
      G.items = G.items.filter(function (o) { return o !== i; });
      if (i.kind === 'gold') {
        G.gold += i.amount;
        msg(L(i.amount + ' ゴールドを拾った。', 'You pick up ' + i.amount + ' gold.'), 'g-gold');
      } else if (i.kind === 'potion') {
        G.potions++;
        msg(L('薬を拾った（p で飲む）。持ち物: ' + G.potions, 'You pick up a potion (p to drink). You carry ' + G.potions + '.'), 'accent');
      } else if (i.kind === 'weapon') {
        G.atk += 2;
        msg(L('鋭い武器を手に入れた。攻撃 +2', 'You find a sharper weapon. atk +2'), 'accent-2');
      } else if (i.kind === 'armor') {
        G.def += 1;
        msg(L('丈夫な防具を手に入れた。防御 +1', 'You find sturdier armour. def +1'), 'accent-2');
      } else if (i.kind === 'amulet') {
        G.won = true;
      }
    });
  }

  function monstersTurn() {
    G.monsters.forEach(function (m) {
      if (G.dead || G.won) return;
      var dist = Math.max(Math.abs(m.x - G.px), Math.abs(m.y - G.py));
      if (dist === 1) {
        var dmg = damage(m.atk, G.def);
        G.hp -= dmg;
        msg(L(monsterName(m) + ' の攻撃！ ' + dmg + ' のダメージ。', 'The ' + monsterName(m) + ' hits you for ' + dmg + '.'), 'err');
        if (G.hp <= 0) { G.dead = true; }
        return;
      }
      if (!G.vis[m.y][m.x] || dist > G.radius + 2) {
        if (Math.random() < 0.4) tryMove(m, rnd(3) - 1, rnd(3) - 1);
        return;
      }
      var dx = G.px === m.x ? 0 : (G.px > m.x ? 1 : -1);
      var dy = G.py === m.y ? 0 : (G.py > m.y ? 1 : -1);
      if (!tryMove(m, dx, dy)) {
        if (!tryMove(m, dx, 0)) tryMove(m, 0, dy);
      }
    });
  }

  function occupied(x, y, self) {
    if (G.px === x && G.py === y) return true;
    return G.monsters.some(function (o) { return o !== self && o.x === x && o.y === y; });
  }

  function tryMove(m, dx, dy) {
    if (!dx && !dy) return false;
    var nx = m.x + dx, ny = m.y + dy;
    if (blocked(nx, ny) || occupied(nx, ny, m)) return false;
    m.x = nx; m.y = ny;
    return true;
  }

  function descend() {
    if (G.depth >= MAX_DEPTH) return;
    enterLevel(G.depth + 1);
    msg(L('階段を降りた。地下 ' + G.depth + ' 階。', 'You descend to depth ' + G.depth + '.'), 'accent-2');
  }

  function playerMove(dx, dy) {
    var nx = G.px + dx, ny = G.py + dy;
    if (blocked(nx, ny)) { msg(L('壁だ。', 'A wall blocks the way.'), 'dim'); return; }
    var target = null;
    G.monsters.forEach(function (m) { if (m.x === nx && m.y === ny) target = m; });
    if (target) { attack(target); return; }
    G.px = nx; G.py = ny;
    pickUp();
    if (!G.won && G.map[ny][nx] === STAIR) descend();
  }

  /* --- 終了処理 -------------------------------------------------------- */

  function score() {
    return G.gold + G.xp * 2 + G.depth * 100 + (G.won ? 5000 : 0);
  }

  function finish(reason) {
    TB.Term.release();
    if (G.el.pad) G.el.pad.remove();
    G.el.hint.textContent = '';

    var sc = score();
    var r = best('rogue', sc, false);
    var out = [''];
    if (reason === 'won') {
      out.push([{ t: L('★ 護符を手に入れた！ あなたの勝ちです。', '★ You seize the amulet. You win!'), c: 'accent bold' }]);
    } else if (reason === 'dead') {
      out.push([{ t: L('あなたは倒れた…', 'You have died…'), c: 'err bold' }]);
    } else {
      out.push([{ t: L('迷宮から引き返した。', 'You climb back out of the dungeon.'), c: 'dim' }]);
    }
    out.push({ row: [L('スコア', 'score'), String(sc)] });
    out.push({ row: [L('到達', 'depth'), L('地下 ' + G.depth + ' 階', 'floor ' + G.depth)] });
    out.push({ row: [L('レベル', 'level'), String(G.lv)] });
    out.push({ row: [L('所持金', 'gold'), String(G.gold)] });
    out.push({ row: [L('最高記録', 'best'), String(r.best) + (r.updated ? L('（更新！）', ' (new!)') : '')] });
    out.push('', [{ t: L('もう一度: rogue', 'play again: rogue'), c: 'dim' }], '');

    var resolve = G.resolve;
    G = null;
    TB.Term.printAll(out);
    TB.Term.scroll();
    if (resolve) resolve();
  }

  /* --- 入力 ------------------------------------------------------------ */

  var KEYS = {
    ArrowUp: [0, -1], k: [0, -1], w: [0, -1],
    ArrowDown: [0, 1], j: [0, 1], s: [0, 1],
    ArrowLeft: [-1, 0], h: [-1, 0], a: [-1, 0],
    ArrowRight: [1, 0], l: [1, 0], d: [1, 0],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1]
  };

  function onKey(key) {
    if (!G) return;
    if (key === 'q' || key === 'Escape') { finish('quit'); return; }

    var mv = KEYS[key];
    if (mv) playerMove(mv[0], mv[1]);
    else if (key === 'p') {
      if (!G.potions) { msg(L('薬を持っていない。', 'You have no potions.'), 'dim'); draw(); return; }
      G.potions--;
      var heal = Math.min(10 + rnd(8), G.maxhp - G.hp);
      G.hp += heal;
      msg(L('薬を飲んだ。HP が ' + heal + ' 回復。', 'You quaff a potion and recover ' + heal + ' HP.'), 'accent');
    }
    else if (key === '.' || key === ' ' || key === '5') msg(L('ひと息ついた。', 'You wait.'), 'dim');
    else return;

    if (G.won) { draw(); finish('won'); return; }
    monstersTurn();
    if (G.dead) { draw(); finish('dead'); return; }
    G.turn++;
    if (G.turn % 8 === 0 && G.hp < G.maxhp) G.hp++;   // ゆっくり回復
    draw();
  }

  /* --- 画面の組み立て -------------------------------------------------- */

  function charWidth(container) {
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;';
    probe.textContent = new Array(51).join('0');
    container.appendChild(probe);
    var w = probe.getBoundingClientRect().width / 50;
    container.removeChild(probe);
    return w || 8;
  }

  function buildPad(box) {
    if (!window.matchMedia || !window.matchMedia('(hover: none)').matches) return null;
    var pad = document.createElement('div');
    pad.className = 'g-pad';
    [['↖', 'y'], ['↑', 'ArrowUp'], ['↗', 'u'],
     ['←', 'ArrowLeft'], ['·', '.'], ['→', 'ArrowRight'],
     ['↙', 'b'], ['↓', 'ArrowDown'], ['↘', 'n'],
     ['quit', 'q']].forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = p[0];
      if (p[1] === 'q') b.className = 'wide';
      b.addEventListener('click', function (e) { e.preventDefault(); onKey(p[1]); });
      pad.appendChild(b);
    });
    box.appendChild(pad);
    return pad;
  }

  def('rogue', {
    group: 'game',
    desc: { ja: 'ローグライク：地下 8 階の護符を目指す', en: 'roguelike: reach the amulet on floor 8' },
    run: function () {
      var screen = document.getElementById('screen');
      var pane = document.getElementById('main');
      var cw = charWidth(screen) * 1.05;  // .g-map の字間ぶん
      var fs = parseFloat(window.getComputedStyle(screen).fontSize) || 14;
      // 高さは画面全体（pane）から測る。screen は内容ぶんしか高さを持たないため。
      var cols = clamp(Math.floor((screen.clientWidth - 48) / cw), 32, 68);
      var maxRows = window.innerWidth < 720 ? 16 : 22;   // 縦長の画面で空白が増えすぎないように
      var rows = clamp(Math.floor(pane.clientHeight * 0.58 / (fs * 1.2)), 12, maxRows);

      var box = document.createElement('div');
      box.className = 'game';
      var mapEl = document.createElement('div'); mapEl.className = 'g-map';
      var statusEl = document.createElement('div'); statusEl.className = 'g-status';
      var logEl = document.createElement('div'); logEl.className = 'g-log';
      var hintEl = document.createElement('div'); hintEl.className = 'g-hint';
      hintEl.textContent = L('移動: 矢印 / hjkl · 斜め: yubn · 待つ: . · 薬: p · やめる: q',
                             'move: arrows / hjkl · diagonal: yubn · wait: . · potion: p · quit: q');
      box.appendChild(statusEl);
      box.appendChild(mapEl);
      box.appendChild(logEl);
      box.appendChild(hintEl);

      G = {
        w: cols, h: rows, radius: 8,
        hp: 30, maxhp: 30, atk: 4, def: 1, lv: 1, xp: 0, next: 15, gold: 0, potions: 0,
        turn: 0, dead: false, won: false, log: [],
        el: { box: box, map: mapEl, status: statusEl, log: logEl, hint: hintEl }
      };

      TB.Term.printAll([
        '',
        [{ t: L('── 迷宮へ ', '── into the dungeon '), c: 'accent bold' }, { t: '─'.repeat(18), c: 'dim' }],
        [{ t: L('地下 8 階に眠る護符を持ち帰れ。', 'Bring back the amulet from floor 8.'), c: 'dim' }],
        { node: box }
      ]);

      G.el.pad = buildPad(box);
      enterLevel(1);
      msg(L('迷宮に入った。地下 1 階。', 'You enter the dungeon. Depth 1.'), 'accent-2');
      draw();
      TB.Term.scroll();
      TB.Term.capture(onKey);

      return new Promise(function (resolve) { G.resolve = resolve; });
    }
  });

  /* --- ゲーム一覧 ------------------------------------------------------ */

  /* 記録の読み方: [保存キー, 表示名, 単位] */
  var RECORDS = [
    ['tetris', 'tetris', { ja: ' 点', en: ' points' }],
    ['rogue', 'rogue', { ja: ' 点', en: ' points' }],
    ['snake', 'snake', { ja: ' 点', en: ' points' }],
    ['2048', '2048', { ja: ' 点', en: ' points' }],
    ['mine-easy', 'mine easy', { ja: ' 秒', en: 's' }],
    ['mine-normal', 'mine normal', { ja: ' 秒', en: 's' }],
    ['mine-hard', 'mine hard', { ja: ' 秒', en: 's' }],
    ['guess', 'guess', { ja: ' 回で正解', en: ' guesses' }],
    ['quiz', 'quiz', { ja: ' 問正解', en: ' correct' }],
    ['hangman', 'hangman', { ja: ' 回余して正解', en: ' tries to spare' }]
  ];

  def('games', {
    group: 'game',
    desc: { ja: '遊べるものの一覧と自己記録', en: 'list the games and your records' },
    run: function () {
      var out = TB.head(L('ゲーム', 'games'));
      out.push([{ t: ja()
        ? '遊びたいものの名前を入力してください。記録はこの端末に残ります。'
        : 'Type the name of the one you want. Records are kept in this browser.', c: 'dim' }], '');

      Object.keys(TB.commands).forEach(function (name) {
        var c = TB.commands[name];
        if ((c.group || '') !== 'game' || c.hidden || name === 'games') return;
        out.push({ row: [[{ t: c.usage || name, c: 'accent' }], t(c.desc)] });
      });
      out.push('');

      var rows = [];
      RECORDS.forEach(function (r) {
        var v = TB.store.get('best:' + r[0], null);
        if (v !== null) rows.push({ row: [r[1], v + t(r[2])] });
      });
      var ttt = TB.store.get('ttt', null);
      if (ttt) {
        try {
          var rec = JSON.parse(ttt);
          rows.push({ row: ['ttt', L(rec.w + ' 勝 ' + rec.l + ' 敗 ' + rec.d + ' 分', rec.w + 'W ' + rec.l + 'L ' + rec.d + 'D')] });
        } catch (e) { /* ignore */ }
      }
      if (rows.length) {
        out.push([{ t: L('あなたの記録', 'your records'), c: 'accent-2' }]);
        out = out.concat(rows);
        out.push('');
      }
      return out;
    }
  });

  TB.alias.game = 'games';
  TB.alias.roguelike = 'rogue';
  TB.alias.tictactoe = 'ttt';
})();
