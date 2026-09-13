/*
 * fs.js — 共通ユーティリティ（言語・保存）と、仮想ファイルシステム。
 * window.TB に生やす。
 */
(function () {
  'use strict';

  var C = window.CONTENT;

  /* ---------- 保存（file:// でも落ちないように包む） ------------------ */
  var store = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem('tui-base:' + k);
        return v === null ? fallback : v;
      } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem('tui-base:' + k, v); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- 言語 ---------------------------------------------------- */
  var state = {
    lang: store.get('lang', C.meta.defaultLang || 'ja'),
    cwd: ['home', 'guest']
  };

  /** {ja,en} 形式・文字列・配列のいずれでも受け取り、現在の言語で返す */
  function t(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(t);
    if (typeof v === 'object') {
      if (state.lang in v) return t(v[state.lang]);
      if ('ja' in v || 'en' in v) return t(v.ja || v.en);
    }
    return v;
  }

  /** 言語別の短い文言（UI ラベル） */
  var UI = {
    ja: {
      ready: 'READY', busy: 'BUSY',
      hint: '[Tab] 補完   [↑/↓] 履歴   [Ctrl+L] 消去   [help] 一覧',
      notfound: function (c) { return 'コマンドが見つかりません: ' + c; },
      didyoumean: function (c) { return 'もしかして: ' + c; },
      nosuchfile: function (p) { return 'そのようなファイルはありません: ' + p; },
      notdir: function (p) { return 'ディレクトリではありません: ' + p; },
      isdir: function (p) { return 'ディレクトリです: ' + p; },
      usage: '使い方',
      themeset: function (n) { return 'テーマを ' + n + ' にしました。'; },
      themelist: '利用できるテーマ:',
      langset: '表示言語を日本語にしました。',
      commands: 'コマンド一覧',
      shortcuts: 'キー操作',
      empty: '(空です)',
      opened: function (u) { return '新しいタブで開きました: ' + u; },
      nourl: 'URL が設定されていません。',
      crton: 'CRT 効果: ON', crtoff: 'CRT 効果: OFF',
      bye: 'セッションを終了しました。再開するには何かキーを押してください。',
      sudo: '権限がありません。この件は記録されました。',
      helphead: 'コマンド名を入力して Enter。引数のあるものは man <名前> で詳しく。'
    },
    en: {
      ready: 'READY', busy: 'BUSY',
      hint: '[Tab] complete   [Up/Down] history   [Ctrl+L] clear   [help] index',
      notfound: function (c) { return 'command not found: ' + c; },
      didyoumean: function (c) { return 'did you mean: ' + c; },
      nosuchfile: function (p) { return 'no such file or directory: ' + p; },
      notdir: function (p) { return 'not a directory: ' + p; },
      isdir: function (p) { return 'is a directory: ' + p; },
      usage: 'usage',
      themeset: function (n) { return 'theme set to ' + n + '.'; },
      themelist: 'available themes:',
      langset: 'Display language set to English.',
      commands: 'commands',
      shortcuts: 'keys',
      empty: '(empty)',
      opened: function (u) { return 'opened in a new tab: ' + u; },
      nourl: 'no url configured.',
      crton: 'CRT effect: on', crtoff: 'CRT effect: off',
      bye: 'session closed. press any key to reconnect.',
      sudo: 'permission denied. this incident has been reported.',
      helphead: 'Type a command and press Enter. Use man <name> for details.'
    }
  };

  function ui(key) {
    var pack = UI[state.lang] || UI.en;
    return pack[key] !== undefined ? pack[key] : (UI.en[key] !== undefined ? UI.en[key] : key);
  }

  /* ---------- 仮想ファイルシステム ------------------------------------ */
  /* file の body は「行の配列を返す関数」。term.js の行フォーマットに従う。 */

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '');
  }

  function projectFile(p) {
    return function () {
      var lines = [
        [{ t: '# ' + p.name, c: 'accent bold' }],
        ''
      ];
      var ja = state.lang === 'ja';
      lines.push({ row: [ja ? '年' : 'year', p.year || '-'] });
      lines.push({ row: [ja ? 'タグ' : 'tags', (p.tags || []).join(' · ')] });
      if (p.url) lines.push({ row: ['url', p.url] });
      lines.push('');
      lines.push(t(p.desc));
      return lines;
    };
  }

  function buildFS() {
    var projects = {};
    (C.projects || []).forEach(function (p) {
      projects[slug(p.name) + '.md'] = { type: 'file', body: projectFile(p) };
    });

    return {
      type: 'dir',
      children: {
        home: {
          type: 'dir',
          children: {
            guest: {
              type: 'dir',
              children: {
                'README.md': { type: 'file', body: function () { return t(C.about); } },
                'skills.txt': { type: 'file', cmd: 'skills' },
                'contact.txt': { type: 'file', cmd: 'contact' },
                'projects': { type: 'dir', children: projects },
                '.secret': {
                  type: 'file', hidden: true,
                  body: function () {
                    return [
                      [{ t: state.lang === 'ja' ? 'おめでとう。隠しファイルを見つけました。' : 'Well done — you found the hidden file.', c: 'accent' }],
                      state.lang === 'ja'
                        ? 'ご褒美に fortune か matrix と入力してみてください。'
                        : 'Try typing fortune or matrix.'
                    ];
                  }
                }
              }
            }
          }
        },
        etc: {
          type: 'dir',
          children: {
            'motd': {
              type: 'file',
              body: function () { return [t(C.meta.tagline)]; }
            }
          }
        }
      }
    };
  }

  var root = buildFS();

  function getNode(parts) {
    var node = root;
    for (var i = 0; i < parts.length; i++) {
      if (!node || node.type !== 'dir') return null;
      node = node.children[parts[i]];
      if (!node) return null;
    }
    return node;
  }

  /** カレントディレクトリと引数からパス配列を解決する */
  function resolve(arg, cwd) {
    var parts;
    arg = String(arg == null ? '' : arg).trim();
    if (arg === '' || arg === '~') return ['home', 'guest'];
    if (arg.charAt(0) === '/') parts = arg.split('/');
    else if (arg.indexOf('~/') === 0) parts = ['home', 'guest'].concat(arg.slice(2).split('/'));
    else parts = cwd.concat(arg.split('/'));

    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') continue;
      if (p === '..') out.pop();
      else out.push(p);
    }
    return out;
  }

  function display(parts) {
    var home = 'home/guest';
    var p = parts.join('/');
    if (p === home) return '~';
    if (p.indexOf(home + '/') === 0) return '~/' + p.slice(home.length + 1);
    return '/' + p;
  }

  window.TB = {
    state: state,
    store: store,
    t: t,
    ui: ui,
    slug: slug,
    fs: {
      root: root,
      get: getNode,
      resolve: resolve,
      display: display,
      rebuild: function () { root = buildFS(); window.TB.fs.root = root; }
    }
  };
})();
