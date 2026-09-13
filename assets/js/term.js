/*
 * term.js — 画面描画と入力。DOM は組み立てて作るので innerHTML は使わない。
 *
 * 行の書き方（commands.js から渡す形）:
 *   "文字列"                        … {accent:...} などの簡易装飾と URL 自動リンク
 *   [{t:'text', c:'accent'}, ...]   … 部分ごとに色を付ける
 *   { row: ['キー', '値'] }          … 2 カラム（日本語でもズレない）
 *   { block: { cls:'card', lines:[...] } }
 *   { hr: true }  /  ''             … 罫線 / 空行
 */
(function () {
  'use strict';

  var TB = window.TB;
  var screenEl, inputEl, preEl, caretEl, postEl, ghostEl, promptEl, lineEl;
  var CLASSES = /^(accent|accent-2|dim|warn|err|bold|inv)$/;

  var history = [];
  var histIndex = -1;
  var draft = '';
  var busy = false;
  var skipRequested = false;

  /* ---------- テキスト → DOM ------------------------------------------ */

  function linkify(text, frag) {
    var re = /(https?:\/\/[^\s<>"'`]+|mailto:[^\s<>"'`]+)/g;
    var last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a');
      a.href = m[0];
      a.textContent = m[0].replace(/^mailto:/, '');
      if (m[0].indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      frag.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  }

  /** "{accent:foo} bar" → DocumentFragment */
  function parse(text) {
    var frag = document.createDocumentFragment();
    var re = /\{([a-z0-9-]+):([^}]*)\}/gi;
    var last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (!CLASSES.test(m[1])) continue;
      if (m.index > last) linkify(text.slice(last, m.index), frag);
      var span = document.createElement('span');
      span.className = m[1];
      linkify(m[2], span);
      frag.appendChild(span);
      last = m.index + m[0].length;
    }
    if (last < text.length) linkify(text.slice(last), frag);
    return frag;
  }

  function segments(arr, target) {
    arr.forEach(function (seg) {
      if (typeof seg === 'string') { target.appendChild(parse(seg)); return; }
      var span = document.createElement('span');
      if (seg.c) span.className = seg.c;
      if (seg.link) {
        var a = document.createElement('a');
        a.href = seg.link;
        a.textContent = seg.t;
        if (seg.link.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        span.appendChild(a);
      } else {
        span.appendChild(parse(String(seg.t)));
      }
      target.appendChild(span);
    });
  }

  /** 1 行ぶんの要素を作る */
  function build(line) {
    var el = document.createElement('div');
    el.className = 'line';

    if (line === '' || line === null || line === undefined) {
      el.className = 'line spacer';
      return el;
    }
    if (typeof line === 'string') { el.appendChild(parse(line)); return el; }
    if (Array.isArray(line)) { segments(line, el); return el; }

    if (line.hr) { el.className = 'line hr'; return el; }

    if (line.row) {
      el.className = 'line row' + (line.sub ? ' sub' : '');
      var k = document.createElement('span'); k.className = 'k';
      var v = document.createElement('span'); v.className = 'v';
      segments(Array.isArray(line.row[0]) ? line.row[0] : [line.row[0]], k);
      segments(Array.isArray(line.row[1]) ? line.row[1] : [line.row[1]], v);
      el.appendChild(k); el.appendChild(v);
      return el;
    }

    if (line.block) {
      el.className = 'line ' + (line.block.cls || '');
      (line.block.lines || []).forEach(function (l) { el.appendChild(build(l)); });
      return el;
    }

    if (line.node) { el.appendChild(line.node); return el; }

    // { t: '…', c: '…' } を 1 行として渡された場合も受け取る
    if (line.t !== undefined) { segments([line], el); return el; }

    el.appendChild(parse(String(line)));
    return el;
  }

  /* ---------- 出力 ------------------------------------------------------ */

  function atBottom() {
    return screenEl.scrollHeight - screenEl.scrollTop - screenEl.clientHeight < 40;
  }

  function scroll() {
    screenEl.scrollTop = screenEl.scrollHeight;
  }

  function print(line) {
    var stick = atBottom();
    screenEl.appendChild(build(line));
    if (stick) scroll();
  }

  function printAll(lines) {
    (Array.isArray(lines) ? lines : [lines]).forEach(print);
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** 行を少しずつ出す。キー操作やクリックで即座に最後まで飛ぶ。 */
  function typeAll(lines, delay) {
    lines = Array.isArray(lines) ? lines : [lines];
    delay = delay === undefined ? 16 : delay;
    if (reduceMotion || delay === 0 || lines.length > 60) {
      printAll(lines);
      return Promise.resolve();
    }
    skipRequested = false;
    setBusy(true);
    return new Promise(function (resolve) {
      var i = 0;
      (function step() {
        if (skipRequested) {
          while (i < lines.length) print(lines[i++]);
          setBusy(false); resolve(); return;
        }
        if (i >= lines.length) { setBusy(false); resolve(); return; }
        print(lines[i++]);
        setTimeout(step, delay);
      })();
    });
  }

  function clear() {
    while (screenEl.firstChild) screenEl.removeChild(screenEl.firstChild);
  }

  function echo(text) {
    var el = document.createElement('div');
    el.className = 'line echo';
    var p = document.createElement('span');
    p.className = 'prompt';
    p.textContent = promptText();
    el.appendChild(p);
    el.appendChild(document.createTextNode(' ' + text));
    screenEl.appendChild(el);
    scroll();
  }

  /* ---------- プロンプト・入力 ------------------------------------------ */

  function promptText() {
    var m = window.CONTENT.meta;
    return m.user + '@' + m.host + ':' + TB.fs.display(TB.state.cwd) + '$';
  }

  function renderPrompt() {
    var m = window.CONTENT.meta;
    promptEl.textContent = '';
    promptEl.appendChild(document.createTextNode(m.user + '@' + m.host + ':'));
    var path = document.createElement('span');
    path.className = 'path';
    path.textContent = TB.fs.display(TB.state.cwd);
    promptEl.appendChild(path);
    promptEl.appendChild(document.createTextNode('$'));
  }

  function mirror() {
    var v = inputEl.value;
    var pos = inputEl.selectionStart === null ? v.length : inputEl.selectionStart;
    preEl.textContent = v.slice(0, pos);
    var ch = v.charAt(pos);
    caretEl.textContent = ch === '' ? ' ' : ch;
    postEl.textContent = v.slice(pos + (ch === '' ? 0 : 1));

    var ghost = '';
    if (v && pos === v.length && typeof window.TB.suggest === 'function') {
      var s = window.TB.suggest(v);
      if (s && s.indexOf(v) === 0) ghost = s.slice(v.length);
    }
    ghostEl.textContent = ghost;
  }

  function setValue(v, moveToEnd) {
    inputEl.value = v;
    if (moveToEnd !== false) {
      try { inputEl.setSelectionRange(v.length, v.length); } catch (e) { /* ignore */ }
    }
    mirror();
  }

  function setBusy(b) {
    busy = b;
    lineEl.classList.toggle('idle', b);
    var mode = document.getElementById('st-mode');
    if (mode) mode.textContent = b ? TB.ui('busy') : TB.ui('ready');
  }

  function focus() {
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; // モバイルで勝手にキーボードを出さない
    inputEl.focus({ preventScroll: true });
  }

  /* ---------- 履歴 ------------------------------------------------------ */

  function loadHistory() {
    try {
      var raw = TB.store.get('history', '[]');
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) history = arr.slice(-50);
    } catch (e) { history = []; }
    histIndex = history.length;
  }

  function pushHistory(cmd) {
    if (!cmd) return;
    if (history[history.length - 1] !== cmd) history.push(cmd);
    if (history.length > 50) history = history.slice(-50);
    histIndex = history.length;
    TB.store.set('history', JSON.stringify(history));
  }

  /* ---------- 初期化 ---------------------------------------------------- */

  function init(onSubmit, onKey) {
    screenEl = document.getElementById('screen');
    inputEl = document.getElementById('cmdline');
    preEl = document.getElementById('m-pre');
    caretEl = document.getElementById('m-caret');
    postEl = document.getElementById('m-post');
    ghostEl = document.getElementById('m-ghost');
    promptEl = document.getElementById('prompt');
    lineEl = document.getElementById('inputline');

    loadHistory();
    renderPrompt();
    mirror();

    ['input', 'click', 'keyup', 'select'].forEach(function (ev) {
      inputEl.addEventListener(ev, mirror);
    });

    inputEl.addEventListener('keydown', function (e) {
      skipRequested = true;

      if (e.key === 'Enter') {
        e.preventDefault();
        var cmd = inputEl.value;
        setValue('');
        if (cmd.trim()) pushHistory(cmd.trim());
        onSubmit(cmd);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIndex === history.length) draft = inputEl.value;
        if (histIndex > 0) { histIndex--; setValue(history[histIndex]); }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIndex < history.length - 1) { histIndex++; setValue(history[histIndex]); }
        else { histIndex = history.length; setValue(draft); }
        return;
      }

      if (e.key === 'ArrowRight' && ghostEl.textContent &&
          inputEl.selectionStart === inputEl.value.length) {
        e.preventDefault();
        setValue(inputEl.value + ghostEl.textContent);
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        onKey('complete', e);
        return;
      }

      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault(); clear(); return;
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection().toString()) {
        e.preventDefault();
        echo(inputEl.value + '^C');
        setValue('');
        return;
      }
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault(); setValue(''); return;
      }
    });

    // 画面のどこをクリックしても入力に戻る（文字選択中は邪魔しない）
    document.getElementById('main').addEventListener('mouseup', function () {
      if (!window.getSelection().toString()) inputEl.focus({ preventScroll: true });
    });
    document.getElementById('main').addEventListener('touchend', function (e) {
      if (e.target.closest('a, button')) return;
      if (!window.getSelection().toString()) inputEl.focus({ preventScroll: true });
    });

    window.addEventListener('keydown', function (e) {
      if (e.target === inputEl) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length === 1 || e.key === 'Backspace') {
        inputEl.focus({ preventScroll: true });
      }
    });
  }

  TB.Term = {
    init: init,
    print: print,
    printAll: printAll,
    typeAll: typeAll,
    clear: clear,
    echo: echo,
    scroll: scroll,
    focus: focus,
    mirror: mirror,
    setValue: setValue,
    setBusy: setBusy,
    renderPrompt: renderPrompt,
    getValue: function () { return inputEl.value; },
    history: function () { return history.slice(); },
    isBusy: function () { return busy; },
    skip: function () { skipRequested = true; }
  };
})();
