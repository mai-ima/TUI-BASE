/*
 * games-arcade.js — 画面を直接操作するゲーム。
 *   tetris  … テトリス（7種バッグ・ホールド・ゴースト・ハードドロップ）
 *   snake   … スネーク
 *   2048    … 2048
 *   mine    … マインスイーパ
 *   sokoban … 倉庫番（8 面）
 */
(function () {
  'use strict';

  var TB = window.TB;
  var K = TB.Kit;
  var L = K.L, rnd = K.rnd, clamp = K.clamp;

  /* =====================================================================
     tetris
     ===================================================================== */

  var PIECES = {
    I: { c: 'p-i', m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { c: 'p-o', m: [[1, 1], [1, 1]] },
    T: { c: 'p-t', m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { c: 'p-s', m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { c: 'p-z', m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { c: 'p-j', m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { c: 'p-l', m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }
  };
  var NAMES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var SPEEDS = [800, 700, 610, 530, 450, 380, 310, 250, 190, 150, 120, 100, 85, 75, 65];
  var CLEAR_SCORE = [0, 100, 300, 500, 800];
  var W = 10, H = 20;

  function rotate(m) {
    var n = m.length, out = [];
    for (var i = 0; i < m[0].length; i++) {
      out.push([]);
      for (var j = 0; j < n; j++) out[i].push(m[n - 1 - j][i]);
    }
    return out;
  }

  function tetris() {
    var board = [];
    for (var y = 0; y < H; y++) { board.push([]); for (var x = 0; x < W; x++) board[y].push(null); }

    var bag = [], queue = [], cur = null, hold = null, canHold = true;
    var score = 0, lines = 0, level = 0, paused = false, over = false;

    function refill() {
      var b = NAMES.slice();
      while (b.length) bag.push(b.splice(rnd(b.length), 1)[0]);
    }
    function nextName() {
      if (bag.length < 2) refill();
      return bag.shift();
    }
    while (queue.length < 3) queue.push(nextName());

    function spawn() {
      var name = queue.shift();
      queue.push(nextName());
      var p = PIECES[name];
      cur = { k: name, c: p.c, m: p.m.map(function (r) { return r.slice(); }), x: Math.floor((W - p.m[0].length) / 2), y: -1 };
      canHold = true;
      if (collide(cur.m, cur.x, cur.y)) { gameOver(); return false; }
      return true;
    }

    function collide(m, px, py) {
      for (var i = 0; i < m.length; i++) {
        for (var j = 0; j < m[i].length; j++) {
          if (!m[i][j]) continue;
          var bx = px + j, by = py + i;
          if (bx < 0 || bx >= W || by >= H) return true;
          if (by >= 0 && board[by][bx]) return true;
        }
      }
      return false;
    }

    function lock() {
      var dead = false;
      cur.m.forEach(function (row, i) {
        row.forEach(function (v, j) {
          if (!v) return;
          var by = cur.y + i, bx = cur.x + j;
          if (by < 0) { dead = true; return; }
          board[by][bx] = cur.c;
        });
      });
      if (dead) { gameOver(); return; }

      var full = [];
      for (var y2 = 0; y2 < H; y2++) {
        if (board[y2].every(function (c) { return c; })) full.push(y2);
      }
      if (full.length) {
        full.forEach(function (y3) { board.splice(y3, 1); board.unshift(new Array(W).fill(null)); });
        lines += full.length;
        score += CLEAR_SCORE[full.length] * (level + 1);
        var nextLevel = Math.floor(lines / 10);
        if (nextLevel !== level) {
          level = nextLevel;
          timer.setSpeed(SPEEDS[Math.min(level, SPEEDS.length - 1)]);
          s.msg(L('レベル ' + (level + 1) + '！ 速くなります。', 'Level ' + (level + 1) + '! Faster now.'), 'accent bold');
        }
        if (full.length === 4) s.msg(L('テトリス！ +' + (CLEAR_SCORE[4] * (level + 1)), 'Tetris! +' + (CLEAR_SCORE[4] * (level + 1))), 'accent bold');
        else s.msg(L(full.length + ' 列消えた。', full.length + ' line' + (full.length > 1 ? 's' : '') + ' cleared.'), 'accent');
      }
      spawn();
    }

    function ghostY() {
      var gy = cur.y;
      while (!collide(cur.m, cur.x, gy + 1)) gy++;
      return gy;
    }

    function move(dx) { if (!collide(cur.m, cur.x + dx, cur.y)) { cur.x += dx; draw(); } }

    function softDrop() {
      if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; score += 1; draw(); }
      else lock();
    }

    function hardDrop() {
      var d = 0;
      while (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; d++; }
      score += d * 2;
      lock();
      draw();
    }

    function spin(times) {
      var m = cur.m;
      for (var i = 0; i < times; i++) m = rotate(m);
      var kicks = [0, -1, 1, -2, 2];
      for (var k = 0; k < kicks.length; k++) {
        if (!collide(m, cur.x + kicks[k], cur.y)) {
          cur.m = m; cur.x += kicks[k]; draw(); return;
        }
      }
    }

    function doHold() {
      if (!canHold) return;
      var keep = cur.k;
      if (hold) {
        var p = PIECES[hold];
        cur = { k: hold, c: p.c, m: p.m.map(function (r) { return r.slice(); }), x: Math.floor((W - p.m[0].length) / 2), y: -1 };
      } else {
        queue.push(nextName());
        if (!spawn()) return;
      }
      hold = keep;
      canHold = false;
      draw();
    }

    /* --- 描画 --- */
    var boardEl = document.createElement('div');
    boardEl.className = 't-board';
    var sideEl = document.createElement('div');
    sideEl.className = 't-side';

    function mini(name, label) {
      var rows = [[[label, 'dim']]];
      if (!name) { rows.push([['   ─', 'dim']], [['', '']]); return rows; }
      var m = PIECES[name].m, c = PIECES[name].c;
      m.forEach(function (row) {
        if (!row.some(function (v) { return v; })) return;
        var cells = [['  ', '']];
        row.forEach(function (v) { cells.push([v ? '██' : '  ', v ? c : '']); });
        rows.push(cells);
      });
      rows.push([['', '']]);
      return rows;
    }

    function draw() {
      var gy = over ? -99 : ghostY();
      var rows = [];
      for (var y = 0; y < H; y++) {
        var cells = [];
        for (var x = 0; x < W; x++) {
          var ch = null, cls = 'p-empty', glyph = '· ';
          if (!over && cur) {
            var i = y - cur.y, j = x - cur.x;
            if (i >= 0 && i < cur.m.length && j >= 0 && j < cur.m[i].length && cur.m[i][j]) { ch = cur.c; }
            if (!ch) {
              var gi = y - gy;
              if (gi >= 0 && gi < cur.m.length && j >= 0 && j < cur.m[gi].length && cur.m[gi][j] && !board[y][x]) {
                cls = 'p-ghost'; glyph = '[]';
              }
            }
          }
          if (!ch && board[y][x]) ch = board[y][x];
          if (ch) { cls = ch; glyph = '██'; }
          cells.push([glyph, cls]);
        }
        rows.push(cells);
      }
      K.renderGrid(boardEl, rows);

      var side = [];
      side = side.concat(mini(hold, L('ホールド (c)', 'HOLD (c)')));
      side.push([[L('つぎ', 'NEXT'), 'dim']]);
      queue.slice(0, 3).forEach(function (n) {
        var m = PIECES[n].m, c = PIECES[n].c;
        m.forEach(function (row) {
          if (!row.some(function (v) { return v; })) return;
          var cells = [['  ', '']];
          row.forEach(function (v) { cells.push([v ? '██' : '  ', v ? c : '']); });
          side.push(cells);
        });
        side.push([['', '']]);
      });
      K.renderGrid(sideEl, side);

      var bestNow = K.readBest('tetris');
      K.renderParts(s.status, [
        [L('得点 ', 'SCORE '), 'dim'], [String(score) + '  ', 'accent bold'],
        [L('レベル ', 'LEVEL '), 'dim'], [String(level + 1) + '  ', ''],
        [L('ライン ', 'LINES '), 'dim'], [String(lines) + '  ', ''],
        [L('最高 ', 'BEST '), 'dim'], [String(bestNow === null ? '-' : bestNow), 'accent-2'],
        [paused ? L('   一時停止中', '   PAUSED') : '', 'warn bold']
      ]);
    }

    function gameOver() {
      over = true;
      draw();
      s.end(K.scoreLines(L('ゲームオーバー', 'Game over'), [
        [L('得点', 'score'), score],
        [L('消したライン', 'lines'), lines],
        [L('レベル', 'level'), level + 1]
      ], 'tetris', score).concat(['', [{ t: L('もう一度: tetris', 'play again: tetris'), c: 'dim' }]]));
    }

    var s = K.open({
      title: 'TETRIS',
      subtitle: L('← → 移動 / ↑ 回転 / ↓ 落とす / スペース 一気に落とす / c ホールド / p 一時停止 / q やめる',
                  'arrows to move, up to rotate, space to hard drop, c to hold, p to pause, q to quit'),
      hint: L('← → 移動   ↑ 回転   ↓ ソフトドロップ   スペース ハードドロップ   c ホールド   p 一時停止   q やめる',
              'move ← →   rotate ↑   soft drop ↓   hard drop space   hold c   pause p   quit q'),
      padCols: 3,
      pad: [['←', 'ArrowLeft'], ['↻', 'ArrowUp'], ['→', 'ArrowRight'],
            ['↓', 'ArrowDown'], ['落', ' '], ['H', 'c'],
            ['やめる', 'q', 'wide']],
      onQuit: function () {
        return K.scoreLines(L('中断しました', 'Stopped'), [
          [L('得点', 'score'), score], [L('消したライン', 'lines'), lines]
        ], 'tetris', score);
      },
      onKey: function (key) {
        if (over) return;
        if (key === 'p') {
          paused = !paused;
          if (paused) timer.stop(); else timer.resume();
          draw();
          return;
        }
        if (paused) return;
        if (key === 'ArrowLeft' || key === 'h') move(-1);
        else if (key === 'ArrowRight' || key === 'l') move(1);
        else if (key === 'ArrowDown' || key === 'j') softDrop();
        else if (key === 'ArrowUp' || key === 'x' || key === 'k') spin(1);
        else if (key === 'z') spin(3);
        else if (key === ' ') hardDrop();
        else if (key === 'c') doHold();
      }
    });

    s.body.appendChild(boardEl);
    s.body.appendChild(sideEl);
    s.body.className = 'g-body t-body';

    var timer = s.tick(function () {
      if (paused || over) return;
      if (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; draw(); }
      else lock();
    }, SPEEDS[0]);

    spawn();
    s.msg(L('はじめ！', 'Go!'), 'accent');
    draw();
    return s.promise;
  }

  TB.def('tetris', {
    group: 'game',
    desc: { ja: 'テトリス。ホールドとゴースト付き', en: 'Tetris, with hold and ghost piece' },
    run: tetris
  });

  /* =====================================================================
     snake
     ===================================================================== */

  function snake() {
    var cols = 26, rows = 14;
    var body = [{ x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }];
    var dir = { x: 1, y: 0 }, pending = [];
    var food = null, score = 0, alive = true, paused = false, speed = 150;

    function placeFood() {
      for (var i = 0; i < 500; i++) {
        var p = { x: rnd(cols), y: rnd(rows) };
        if (!body.some(function (b) { return b.x === p.x && b.y === p.y; })) { food = p; return; }
      }
    }
    placeFood();

    var gridEl = document.createElement('div');
    gridEl.className = 'g-map';

    function draw() {
      var map = [];
      for (var y = 0; y < rows; y++) {
        var line = [];
        for (var x = 0; x < cols; x++) line.push(['· ', 'p-empty']);
        map.push(line);
      }
      if (food) map[food.y][food.x] = ['◆◆', 'warn'];
      body.forEach(function (b, i) {
        map[b.y][b.x] = ['██', i === 0 ? 'accent bold' : 'accent'];
      });
      K.renderGrid(gridEl, map);
      K.renderParts(s.status, [
        [L('得点 ', 'SCORE '), 'dim'], [String(score) + '  ', 'accent bold'],
        [L('長さ ', 'LENGTH '), 'dim'], [String(body.length) + '  ', ''],
        [L('最高 ', 'BEST '), 'dim'], [String(K.readBest('snake') === null ? '-' : K.readBest('snake')), 'accent-2'],
        [paused ? L('   一時停止中', '   PAUSED') : '', 'warn bold']
      ]);
    }

    function step() {
      if (!alive || paused) return;
      if (pending.length) dir = pending.shift();
      var head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows ||
          body.some(function (b) { return b.x === head.x && b.y === head.y; })) {
        alive = false;
        draw();
        s.end(K.scoreLines(L('ぶつかった！', 'You crashed!'), [
          [L('得点', 'score'), score], [L('長さ', 'length'), body.length]
        ], 'snake', score).concat(['', [{ t: L('もう一度: snake', 'play again: snake'), c: 'dim' }]]));
        return;
      }
      body.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        placeFood();
        if (score % 50 === 0) {
          speed = Math.max(60, speed - 12);
          timer.setSpeed(speed);
          s.msg(L('速くなった！', 'Faster!'), 'warn');
        }
      } else {
        body.pop();
      }
      draw();
    }

    function turn(x, y) {
      var last = pending.length ? pending[pending.length - 1] : dir;
      if (last.x === -x && last.y === -y) return;   // 逆走はしない
      if (last.x === x && last.y === y) return;
      if (pending.length < 2) pending.push({ x: x, y: y });
    }

    var s = K.open({
      title: 'SNAKE',
      subtitle: L('矢印キーで曲がる。壁と自分にぶつかると終わり。', 'Steer with the arrows. Walls and your own tail are fatal.'),
      hint: L('矢印 / hjkl で移動   p 一時停止   q やめる', 'arrows / hjkl to steer   p pause   q quit'),
      padCols: 3,
      pad: [[' ', ''], ['↑', 'ArrowUp'], [' ', ''],
            ['←', 'ArrowLeft'], ['⏸', 'p'], ['→', 'ArrowRight'],
            [' ', ''], ['↓', 'ArrowDown'], [' ', ''],
            ['やめる', 'q', 'wide']],
      onQuit: function () {
        return K.scoreLines(L('中断しました', 'Stopped'), [[L('得点', 'score'), score]], 'snake', score);
      },
      onKey: function (key) {
        if (key === 'p') { paused = !paused; draw(); return; }
        if (key === 'ArrowUp' || key === 'k' || key === 'w') turn(0, -1);
        else if (key === 'ArrowDown' || key === 'j' || key === 's') turn(0, 1);
        else if (key === 'ArrowLeft' || key === 'h' || key === 'a') turn(-1, 0);
        else if (key === 'ArrowRight' || key === 'l' || key === 'd') turn(1, 0);
      }
    });

    s.body.appendChild(gridEl);
    var timer = s.tick(step, speed);
    s.msg(L('◆ を食べて伸ばそう。', 'Eat the ◆ to grow.'), 'accent');
    draw();
    return s.promise;
  }

  TB.def('snake', {
    group: 'game',
    desc: { ja: 'スネーク。◆ を食べて伸ばす', en: 'Snake. Eat the ◆ and grow' },
    run: snake
  });

  /* =====================================================================
     2048
     ===================================================================== */

  function game2048() {
    var grid = [];
    for (var i = 0; i < 4; i++) grid.push([0, 0, 0, 0]);
    var score = 0, won = false, over = false;

    function empties() {
      var out = [];
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) if (!grid[y][x]) out.push([x, y]);
      return out;
    }
    function addTile() {
      var e = empties();
      if (!e.length) return;
      var p = e[rnd(e.length)];
      grid[p[1]][p[0]] = Math.random() < 0.9 ? 2 : 4;
    }
    addTile(); addTile();

    function slide(row) {
      var vals = row.filter(function (v) { return v; });
      var out = [], gained = 0;
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === vals[i + 1]) {
          out.push(vals[i] * 2);
          gained += vals[i] * 2;
          if (vals[i] * 2 === 2048) won = true;
          i++;
        } else out.push(vals[i]);
      }
      while (out.length < 4) out.push(0);
      return { row: out, gained: gained };
    }

    function move(dir) {
      var before = JSON.stringify(grid), gained = 0;
      var lines = [];
      for (var i = 0; i < 4; i++) {
        var line = [];
        for (var j = 0; j < 4; j++) {
          if (dir === 'left') line.push(grid[i][j]);
          else if (dir === 'right') line.push(grid[i][3 - j]);
          else if (dir === 'up') line.push(grid[j][i]);
          else line.push(grid[3 - j][i]);
        }
        lines.push(line);
      }
      lines = lines.map(function (line) {
        var r = slide(line);
        gained += r.gained;
        return r.row;
      });
      for (i = 0; i < 4; i++) {
        for (var j2 = 0; j2 < 4; j2++) {
          var v = lines[i][j2];
          if (dir === 'left') grid[i][j2] = v;
          else if (dir === 'right') grid[i][3 - j2] = v;
          else if (dir === 'up') grid[j2][i] = v;
          else grid[3 - j2][i] = v;
        }
      }
      if (JSON.stringify(grid) === before) return false;
      score += gained;
      addTile();
      return true;
    }

    function canMove() {
      if (empties().length) return true;
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
        if (x < 3 && grid[y][x] === grid[y][x + 1]) return true;
        if (y < 3 && grid[y][x] === grid[y + 1][x]) return true;
      }
      return false;
    }

    var gridEl = document.createElement('div');
    gridEl.className = 'g-map n-grid';

    function pad(v) {
      var s2 = v ? String(v) : '·';
      var total = 6 - s2.length;
      var left = Math.floor(total / 2);
      return ' '.repeat(left) + s2 + ' '.repeat(total - left);
    }

    function draw() {
      var rows = [];
      rows.push([['┌──────┬──────┬──────┬──────┐', 'dim']]);
      for (var y = 0; y < 4; y++) {
        var cells = [['│', 'dim']];
        for (var x = 0; x < 4; x++) {
          var v = grid[y][x];
          cells.push([pad(v), v ? 'n' + v : 'p-empty']);
          cells.push(['│', 'dim']);
        }
        rows.push(cells);
        rows.push([[y < 3 ? '├──────┼──────┼──────┼──────┤' : '└──────┴──────┴──────┴──────┘', 'dim']]);
      }
      K.renderGrid(gridEl, rows);
      K.renderParts(s.status, [
        [L('得点 ', 'SCORE '), 'dim'], [String(score) + '  ', 'accent bold'],
        [L('最高 ', 'BEST '), 'dim'], [String(K.readBest('2048') === null ? '-' : K.readBest('2048')), 'accent-2']
      ]);
    }

    var s = K.open({
      title: '2048',
      subtitle: L('矢印キーで寄せる。同じ数どうしが合わさる。2048 を目指そう。',
                  'Slide with the arrows. Equal tiles merge. Reach 2048.'),
      hint: L('矢印 / hjkl で寄せる   q やめる', 'arrows / hjkl to slide   q quit'),
      padCols: 3,
      pad: [[' ', ''], ['↑', 'ArrowUp'], [' ', ''],
            ['←', 'ArrowLeft'], [' ', ''], ['→', 'ArrowRight'],
            [' ', ''], ['↓', 'ArrowDown'], [' ', ''],
            ['やめる', 'q', 'wide']],
      onQuit: function () {
        return K.scoreLines(L('中断しました', 'Stopped'), [[L('得点', 'score'), score]], '2048', score);
      },
      onKey: function (key) {
        if (over) return;
        var dir = (key === 'ArrowLeft' || key === 'h') ? 'left'
          : (key === 'ArrowRight' || key === 'l') ? 'right'
          : (key === 'ArrowUp' || key === 'k') ? 'up'
          : (key === 'ArrowDown' || key === 'j') ? 'down' : null;
        if (!dir) return;
        var moved = move(dir);
        draw();
        if (won) {
          won = false;
          s.msg(L('2048 を作りました！ このまま続けられます。', 'You made 2048! Keep going if you like.'), 'accent bold');
        }
        if (!moved) return;
        if (!canMove()) {
          over = true;
          s.end(K.scoreLines(L('動かせる手がなくなりました', 'No moves left'), [
            [L('得点', 'score'), score],
            [L('最大のタイル', 'largest tile'), Math.max.apply(null, grid.map(function (r) { return Math.max.apply(null, r); }))]
          ], '2048', score).concat(['', [{ t: L('もう一度: 2048', 'play again: 2048'), c: 'dim' }]]));
        }
      }
    });

    s.body.appendChild(gridEl);
    s.msg(L('同じ数を合わせて大きくしよう。', 'Merge equal tiles to grow them.'), 'accent');
    draw();
    return s.promise;
  }

  TB.def('2048', {
    group: 'game',
    desc: { ja: '2048。同じ数を合わせて大きくする', en: '2048. Merge tiles to reach 2048' },
    run: game2048
  });

  /* =====================================================================
     mine — マインスイーパ
     ===================================================================== */

  var LEVELS = {
    easy: { w: 9, h: 9, n: 10 },
    normal: { w: 16, h: 12, n: 30 },
    hard: { w: 22, h: 14, n: 65 }
  };

  function mine(args) {
    var levelName = (args[0] || 'normal').toLowerCase();
    if (!LEVELS[levelName]) levelName = 'normal';
    var cfg = LEVELS[levelName];
    var w = cfg.w, h = cfg.h, total = cfg.n;

    var mines = [], open = [], flag = [], started = false, dead = false, cleared = false;
    for (var y = 0; y < h; y++) {
      mines.push([]); open.push([]); flag.push([]);
      for (var x = 0; x < w; x++) { mines[y].push(false); open[y].push(false); flag[y].push(false); }
    }
    var cx = Math.floor(w / 2), cy = Math.floor(h / 2), startedAt = 0;

    function place(sx, sy) {
      var put = 0;
      while (put < total) {
        var x = rnd(w), y = rnd(h);
        if (mines[y][x]) continue;
        if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue;  // 最初の一手の周りは安全
        mines[y][x] = true;
        put++;
      }
      started = true;
      startedAt = Date.now();
    }

    function around(x, y) {
      var n = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        var nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || (!dx && !dy)) continue;
        if (mines[ny][nx]) n++;
      }
      return n;
    }

    function reveal(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h || open[y][x] || flag[y][x]) return;
      open[y][x] = true;
      if (around(x, y) === 0 && !mines[y][x]) {
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) reveal(x + dx, y + dy);
      }
    }

    function remaining() {
      var f = 0;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (flag[y][x]) f++;
      return total - f;
    }

    function checkWin() {
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        if (!mines[y][x] && !open[y][x]) return false;
      }
      return true;
    }

    var gridEl = document.createElement('div');
    gridEl.className = 'g-map';

    var NUMCLS = ['', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];

    function draw() {
      var rows = [];
      for (var y = 0; y < h; y++) {
        var cells = [];
        for (var x = 0; x < w; x++) {
          var glyph = '·', cls = 'p-empty';
          if (flag[y][x] && !open[y][x]) { glyph = 'F'; cls = 'warn bold'; }
          else if (!open[y][x]) { glyph = dead && mines[y][x] ? '*' : '·'; cls = dead && mines[y][x] ? 'err' : 'p-empty'; }
          else if (mines[y][x]) { glyph = '*'; cls = 'err bold'; }
          else {
            var n = around(x, y);
            glyph = n ? String(n) : ' ';
            cls = n ? NUMCLS[n] : 'dim';
          }
          var isCur = x === cx && y === cy;
          cells.push([glyph + ' ', cls + (isCur ? ' cur' : '')]);
        }
        rows.push(cells);
      }
      K.renderGrid(gridEl, rows);
      var secs = started ? Math.floor((Date.now() - startedAt) / 1000) : 0;
      K.renderParts(s.status, [
        [L('残り ', 'MINES '), 'dim'], [String(remaining()) + '  ', 'accent bold'],
        [L('時間 ', 'TIME '), 'dim'], [secs + L(' 秒  ', 's  '), ''],
        [L('難度 ', 'LEVEL '), 'dim'], [levelName + '  ', 'accent-2'],
        [L('最短 ', 'BEST '), 'dim'],
        [String(K.readBest('mine-' + levelName) === null ? '-' : K.readBest('mine-' + levelName) + L(' 秒', 's')), 'accent-2']
      ]);
    }

    var s = K.open({
      title: 'MINESWEEPER (' + levelName + ')',
      subtitle: L('矢印でカーソルを動かし、スペースで開ける。f で旗。',
                  'Move with the arrows, space to open, f to flag.'),
      hint: L('矢印 / hjkl 移動   スペース 開く   f 旗   q やめる',
              'arrows / hjkl move   space open   f flag   q quit'),
      padCols: 3,
      pad: [[' ', ''], ['↑', 'ArrowUp'], [' ', ''],
            ['←', 'ArrowLeft'], ['開', ' '], ['→', 'ArrowRight'],
            [' ', ''], ['↓', 'ArrowDown'], ['旗', 'f'],
            ['やめる', 'q', 'wide']],
      onQuit: function () {
        return [[{ t: L('やめました。', 'Stopped.'), c: 'dim' }]];
      },
      onKey: function (key) {
        if (dead || cleared) return;
        if (key === 'ArrowUp' || key === 'k') cy = clamp(cy - 1, 0, h - 1);
        else if (key === 'ArrowDown' || key === 'j') cy = clamp(cy + 1, 0, h - 1);
        else if (key === 'ArrowLeft' || key === 'h') cx = clamp(cx - 1, 0, w - 1);
        else if (key === 'ArrowRight' || key === 'l') cx = clamp(cx + 1, 0, w - 1);
        else if (key === 'f') { if (!open[cy][cx]) flag[cy][cx] = !flag[cy][cx]; }
        else if (key === ' ' || key === 'o' || key === 'Enter') {
          if (flag[cy][cx]) { s.msg(L('旗が立っています。f で外せます。', 'Flagged. Press f to unflag.'), 'dim'); draw(); return; }
          if (!started) place(cx, cy);
          if (mines[cy][cx]) {
            dead = true;
            draw();
            s.end([[{ t: L('地雷を踏んでしまいました…', 'You hit a mine…'), c: 'err bold' }],
                   [{ t: L('もう一度: mine ' + levelName, 'play again: mine ' + levelName), c: 'dim' }]]);
            return;
          }
          reveal(cx, cy);
          if (checkWin()) {
            cleared = true;
            var secs = Math.floor((Date.now() - startedAt) / 1000);
            draw();
            s.end(K.scoreLines(L('全部開けました！', 'Cleared!'), [
              [L('時間', 'time'), secs + L(' 秒', 's')],
              [L('難度', 'level'), levelName]
            ], 'mine-' + levelName, secs, true));
            return;
          }
        } else return;
        draw();
      }
    });

    s.body.appendChild(gridEl);
    s.msg(L('数字はまわり 8 マスの地雷の数です。', 'Numbers count the mines in the 8 neighbouring cells.'), 'accent');
    draw();
    var clock = s.tick(function () { if (started && !dead && !cleared) draw(); }, 1000);
    return s.promise;
  }

  TB.def('mine', {
    group: 'game',
    usage: 'mine [easy|normal|hard]',
    desc: { ja: 'マインスイーパ', en: 'Minesweeper' },
    run: mine
  });

  /* =====================================================================
     sokoban — 倉庫番
     ===================================================================== */

  var SOKO = [
    ['  #####', '###   #', '#.@$  #', '### $.#', '#.##$ #', '# # . ##', '#$ *$$.#', '#   .  #', '########'],
    ['####  ', '# .#  ', '#  ###', '#*@  #', '#  $ #', '#  ###', '####  '],
    ['  ####', '###  ####', '#     $ #', '# #  #$ #', '# . .#@ #', '#########'],
    ['########', '#      #', '# .$@$.#', '#      #', '########'],
    ['  #####  ', '  #   #  ', '  #$  #  ', '###  $###', '#. $  . #', '### @ ###', '  #  ..#  ', '  ######  '],
    ['#######', '#     #', '# .$. #', '# $@$ #', '# .$. #', '#     #', '#######'],
    ['#########', '#  .#   #', '#  $$   #', '#  .# @ #', '#########'],
    ['######  ', '#    ###', '# $$@  #', '# ...  #', '#      #', '########']
  ];

  function sokoban(args) {
    var index = clamp(parseInt(args[0], 10) || 1, 1, SOKO.length) - 1;
    var map = [], goals = [], boxes = [], px = 0, py = 0;
    var moves = 0, pushes = 0, undo = [];

    function load(i) {
      index = i;
      map = []; goals = []; boxes = []; moves = 0; pushes = 0; undo = [];
      SOKO[index].forEach(function (row, y) {
        var line = [];
        row.split('').forEach(function (ch, x) {
          if (ch === '#') line.push('#');
          else line.push(' ');
          if (ch === '.' || ch === '*' || ch === '+') goals.push(x + ',' + y);
          if (ch === '$' || ch === '*') boxes.push({ x: x, y: y });
          if (ch === '@' || ch === '+') { px = x; py = y; }
        });
        map.push(line);
      });
    }
    load(index);

    function wall(x, y) { return !map[y] || map[y][x] === undefined || map[y][x] === '#'; }
    function boxAt(x, y) {
      for (var i = 0; i < boxes.length; i++) if (boxes[i].x === x && boxes[i].y === y) return boxes[i];
      return null;
    }
    function solved() {
      return boxes.every(function (b) { return goals.indexOf(b.x + ',' + b.y) !== -1; });
    }

    var gridEl = document.createElement('div');
    gridEl.className = 'g-map';

    function draw() {
      var rows = [];
      for (var y = 0; y < map.length; y++) {
        var cells = [];
        for (var x = 0; x < map[y].length; x++) {
          var goal = goals.indexOf(x + ',' + y) !== -1;
          var b = boxAt(x, y);
          if (wall(x, y)) cells.push(['##', 'dim']);
          else if (px === x && py === y) cells.push(['@ ', 'accent bold']);
          else if (b) cells.push([goal ? '$$' : '$ ', goal ? 'accent' : 'warn']);
          else if (goal) cells.push(['. ', 'accent-2']);
          else cells.push(['  ', '']);
        }
        rows.push(cells);
      }
      K.renderGrid(gridEl, rows);
      var done = boxes.filter(function (b) { return goals.indexOf(b.x + ',' + b.y) !== -1; }).length;
      K.renderParts(s.status, [
        [L('面 ', 'LEVEL '), 'dim'], [(index + 1) + '/' + SOKO.length + '  ', 'accent bold'],
        [L('置けた ', 'PLACED '), 'dim'], [done + '/' + boxes.length + '  ', ''],
        [L('手数 ', 'MOVES '), 'dim'], [moves + '  ', ''],
        [L('押した ', 'PUSHES '), 'dim'], [String(pushes), '']
      ]);
    }

    function step(dx, dy) {
      var nx = px + dx, ny = py + dy;
      if (wall(nx, ny)) return;
      var b = boxAt(nx, ny);
      if (b) {
        var bx = nx + dx, by = ny + dy;
        if (wall(bx, by) || boxAt(bx, by)) return;
        undo.push({ px: px, py: py, box: b, bx: b.x, by: b.y });
        b.x = bx; b.y = by;
        pushes++;
      } else {
        undo.push({ px: px, py: py, box: null });
      }
      px = nx; py = ny;
      moves++;
      draw();

      if (solved()) {
        if (index + 1 < SOKO.length) {
          s.msg(L('クリア！ 次の面へ。', 'Solved! On to the next level.'), 'accent bold');
          setTimeout(function () { load(index + 1); draw(); }, 500);
        } else {
          s.end([[{ t: L('全 ' + SOKO.length + ' 面クリア！おみごと。', 'All ' + SOKO.length + ' levels solved. Nicely done.'), c: 'accent bold' }],
                 { row: [L('手数', 'moves'), String(moves)] }]);
        }
      }
    }

    var s = K.open({
      title: 'SOKOBAN',
      subtitle: L('$ を . の上にすべて押し込めばクリア。引くことはできません。',
                  'Push every $ onto a . — you can only push, never pull.'),
      hint: L('矢印 / hjkl 移動   u 一手戻す   r やり直し   n 次の面   q やめる',
              'arrows / hjkl move   u undo   r reset   n next level   q quit'),
      padCols: 3,
      pad: [['u', 'u'], ['↑', 'ArrowUp'], ['r', 'r'],
            ['←', 'ArrowLeft'], [' ', ''], ['→', 'ArrowRight'],
            [' ', ''], ['↓', 'ArrowDown'], [' ', ''],
            ['やめる', 'q', 'wide']],
      onQuit: function () {
        return [[{ t: L('やめました。', 'Stopped.'), c: 'dim' }]];
      },
      onKey: function (key) {
        if (key === 'ArrowUp' || key === 'k') step(0, -1);
        else if (key === 'ArrowDown' || key === 'j') step(0, 1);
        else if (key === 'ArrowLeft' || key === 'h') step(-1, 0);
        else if (key === 'ArrowRight' || key === 'l') step(1, 0);
        else if (key === 'r') { load(index); s.msg(L('やり直しました。', 'Level reset.'), 'dim'); draw(); }
        else if (key === 'n') { load(Math.min(index + 1, SOKO.length - 1)); draw(); }
        else if (key === 'u') {
          var u = undo.pop();
          if (!u) return;
          px = u.px; py = u.py;
          if (u.box) { u.box.x = u.bx; u.box.y = u.by; pushes--; }
          moves--;
          draw();
        }
      }
    });

    s.body.appendChild(gridEl);
    s.msg(L('箱を押して目印に載せましょう。', 'Push the boxes onto the marks.'), 'accent');
    draw();
    return s.promise;
  }

  TB.def('sokoban', {
    group: 'game',
    usage: 'sokoban [1-8]',
    desc: { ja: '倉庫番。箱を押して目印に載せる（全 8 面）', en: 'Sokoban. Push boxes onto the marks (8 levels)' },
    run: sokoban
  });
})();
