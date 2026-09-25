/*
 * gamekit.js — ゲームの共通部品。
 *
 * 画面の枠（状態・盤面・メッセージ・操作説明・スマホ用ボタン）を作り、
 * キー入力の受け取りと後片付けをまとめて面倒みる。
 *
 *   var s = TB.Kit.open({ title:'…', hint:'…', pad:[…], onKey:fn });
 *   s.body   … 盤面を置く場所
 *   s.status … 上の 1 行
 *   s.log    … 下のメッセージ
 *   s.tick(fn, ms) … 一定間隔で動かす（終了時に自動で止まる）
 *   s.end(lines)   … 終了して結果を印字（promise が解決する）
 */
(function () {
  'use strict';

  var TB = window.TB;

  function ja() { return TB.state.lang === 'ja'; }
  function L(j, e) { return ja() ? j : e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** 記録の保存。lower=true なら小さいほど良い記録 */
  function best(key, value, lower) {
    var cur = parseInt(TB.store.get('best:' + key, ''), 10);
    var better = isNaN(cur) || (lower ? value < cur : value > cur);
    if (better) TB.store.set('best:' + key, String(value));
    return { best: better ? value : cur, updated: better };
  }

  /**
   * 上位 5 件のランキングに記録する。{ rank: 入った順位 (0 なら圏外), list: [...] }
   * best:<key> も最上位の値で更新しておく（games の一覧が読む）。
   */
  function record(key, value, lower) {
    var list = [];
    try { list = JSON.parse(TB.store.get('top:' + key, '[]')) || []; } catch (e) { list = []; }
    var entry = { v: value, d: Date.now() };
    list.push(entry);
    list.sort(function (a, b) { return lower ? a.v - b.v : b.v - a.v; });
    list = list.slice(0, 5);
    TB.store.set('top:' + key, JSON.stringify(list));
    TB.store.set('best:' + key, String(list[0].v));
    return { rank: list.indexOf(entry) + 1, list: list };
  }

  function topList(key) {
    try { return JSON.parse(TB.store.get('top:' + key, '[]')) || []; } catch (e) { return []; }
  }

  function sfx(name) { if (TB.Sfx) TB.Sfx.play(name); }

  function readBest(key) {
    var v = parseInt(TB.store.get('best:' + key, ''), 10);
    return isNaN(v) ? null : v;
  }

  function isTouch() {
    return !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
  }

  /* ---------- 文字盤の描画 ---------------------------------------------- */

  /**
   * rows: [[ [文字, クラス], … ], …] を DOM にする。
   * 同じクラスが続くところはまとめて 1 つの span にする。
   */
  function renderGrid(el, rows) {
    var frag = document.createDocumentFragment();
    rows.forEach(function (cells) {
      var row = document.createElement('div');
      row.className = 'g-row';
      var cls = null, txt = '';
      cells.forEach(function (c) {
        if (c[1] === cls) { txt += c[0]; return; }
        if (cls !== null) {
          var s = document.createElement('span');
          s.className = cls; s.textContent = txt;
          row.appendChild(s);
        }
        cls = c[1]; txt = c[0];
      });
      if (cls !== null) {
        var last = document.createElement('span');
        last.className = cls; last.textContent = txt;
        row.appendChild(last);
      }
      frag.appendChild(row);
    });
    el.textContent = '';
    el.appendChild(frag);
  }

  /** 文字列と色の組を 1 行に流し込む */
  function renderParts(el, parts) {
    el.textContent = '';
    parts.forEach(function (p) {
      var s = document.createElement('span');
      s.className = p[1] || '';
      s.textContent = p[0];
      el.appendChild(s);
    });
  }

  function bar(cur, max, width) {
    var n = clamp(Math.round(cur / max * width), 0, width);
    return '█'.repeat(n) + '░'.repeat(width - n);
  }

  /* ---------- 画面の枠 -------------------------------------------------- */

  function open(opts) {
    var box = document.createElement('div');
    box.className = 'game';

    var status = document.createElement('div');
    status.className = 'g-status';

    var body = document.createElement('div');
    body.className = 'g-body';

    var log = document.createElement('div');
    log.className = 'g-log';

    var hint = document.createElement('div');
    hint.className = 'g-hint';
    hint.textContent = opts.hint || '';

    box.appendChild(status);
    box.appendChild(body);
    box.appendChild(log);
    box.appendChild(hint);

    var timers = [];
    var ended = false;
    var session = {
      box: box, status: status, body: body, log: log, hint: hint,
      messages: []
    };

    /* 見出しを印字してから枠を置く */
    var intro = ['', [{ t: '── ' + opts.title + ' ', c: 'accent bold' }, { t: '─'.repeat(16), c: 'dim' }]];
    if (opts.subtitle) intro.push([{ t: opts.subtitle, c: 'dim' }]);
    intro.push({ node: box });
    TB.Term.printAll(intro);

    /* スマホ用のボタン */
    if (opts.pad && isTouch()) {
      var pad = document.createElement('div');
      pad.className = 'g-pad' + (opts.padCols ? ' cols-' + opts.padCols : '');
      opts.pad.forEach(function (p) {
        if (!p || !p[1]) { pad.appendChild(document.createElement('span')); return; }
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = p[0];
        if (p[2]) b.className = p[2];
        b.addEventListener('click', function (e) {
          e.preventDefault();
          if (!ended) session.key(p[1]);
        });
        pad.appendChild(b);
      });
      box.appendChild(pad);
      session.pad = pad;
    }

    session.msg = function (text, cls) {
      session.messages.push([text, cls || '']);
      if (session.messages.length > 30) session.messages.shift();
      var recent = session.messages.slice(-3);
      log.textContent = '';
      recent.forEach(function (m, i) {
        var d = document.createElement('div');
        d.className = 'line' + (i < recent.length - 1 ? ' dim' : '');
        var s = document.createElement('span');
        s.className = m[1];
        s.textContent = m[0];
        d.appendChild(s);
        log.appendChild(d);
      });
    };

    /** 一定間隔で呼ぶ。返り値の setSpeed で速さを変えられる */
    session.tick = function (fn, ms) {
      var handle = { id: null, ms: ms };
      handle.id = setInterval(fn, ms);
      handle.setSpeed = function (next) {
        if (next === handle.ms) return;
        clearInterval(handle.id);
        handle.ms = next;
        handle.id = setInterval(fn, next);
      };
      handle.stop = function () { clearInterval(handle.id); handle.id = null; };
      handle.resume = function () {
        if (handle.id === null) handle.id = setInterval(fn, handle.ms);
      };
      timers.push(handle);
      return handle;
    };

    session.key = function (key) {
      if (ended) return;
      if (key === 'q' || key === 'Escape') { session.end(opts.onQuit ? opts.onQuit() : null); return; }
      opts.onKey(key, session);
    };

    session.end = function (lines) {
      if (ended) return;
      ended = true;
      timers.forEach(function (t) { t.stop(); });
      TB.Term.release();
      if (session.pad) session.pad.remove();
      hint.textContent = '';
      TB.Term.printAll([''].concat(lines || [], ['']));
      TB.Term.scroll();
      if (session.resolve) session.resolve();
    };

    session.promise = new Promise(function (resolve) { session.resolve = resolve; });

    /* スマートフォンのスワイプを矢印キーとして渡す */
    if (opts.swipe) {
      var sx = 0, sy = 0, st = 0;
      box.addEventListener('touchstart', function (e) {
        if (e.target.closest('button')) return;
        var t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
      }, { passive: true });
      box.addEventListener('touchend', function (e) {
        if (e.target.closest('button') || !st) return;
        var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
        st = 0;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        session.key(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
      });
      box.style.touchAction = 'none';
    }

    TB.Term.capture(session.key, opts.onKeyUp ? function (k) { if (!ended) opts.onKeyUp(k, session); } : null);
    // 画面の高さを使うので、枠の頭が見えるところまでスクロールする。
    // 盤面は open() のあとで描かれるので、1 コマ待ってから（枠が本来の高さになってから）。
    requestAnimationFrame(function () {
      if (box.scrollIntoView) box.scrollIntoView({ block: 'start' });
      else TB.Term.scroll();
    });
    return session;
  }

  /** 終了時に出す成績表（上位 5 件のランキングつき）。fmt で値の見せ方を変えられる */
  function scoreLines(title, rows, key, value, lower, fmt) {
    fmt = fmt || function (v) { return String(v); };
    var out = [[{ t: title, c: 'accent bold' }]];
    rows.forEach(function (row) { out.push({ row: [row[0], String(row[1])] }); });
    // 0 点（すぐやめた等）はランキングに載せない
    if (!lower && !value) {
      var top = topList(key);
      if (top.length) out.push([{ t: L('自己最高: ', 'best: ') + fmt(top[0].v), c: 'dim' }]);
      return out;
    }
    var r = record(key, value, lower);
    if (r.rank === 1) { out.push([{ t: L('★ 自己最高記録です！', '★ A new personal best!'), c: 'accent bold' }]); sfx('win'); }
    else if (r.rank) out.push([{ t: L('ランキング ' + r.rank + ' 位に入りました。', 'You placed #' + r.rank + ' on your board.'), c: 'accent-2' }]);
    out.push([{ t: L('— ベスト 5 —', '— top 5 —'), c: 'dim' }]);
    r.list.forEach(function (e, i) {
      var mine = i === r.rank - 1;
      var d = new Date(e.d);
      out.push({ row: [[{ t: '  ' + (i + 1) + '.', c: mine ? 'accent bold' : 'dim' }],
                       [{ t: fmt(e.v), c: mine ? 'accent bold' : '' },
                        { t: '   ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), c: 'dim' }]] });
    });
    return out;
  }

  TB.Kit = {
    L: L, ja: ja, rnd: rnd, pick: pick, clamp: clamp,
    best: best, readBest: readBest, isTouch: isTouch, record: record, topList: topList, sfx: sfx,
    renderGrid: renderGrid, renderParts: renderParts, bar: bar,
    open: open, scoreLines: scoreLines
  };
})();
