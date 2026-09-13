/*
 * commands-extra.js — コマンドをたくさん増やす。
 *
 *   dos  … コマンドプロンプト風（dir / type / ipconfig / ping …）
 *   unix … Unix 風（uname / grep / head / cal / which …）
 *   text … 文字を扱う（base64 / rot13 / figlet / morse …）
 *   fun  … お遊び（cowsay / 8ball / roll / clock …）
 *
 * 実在の機械を触るわけではないので、ネットワークや OS を覗く類のものは
 * 「それらしい表示を返すだけ」。説明文に（演出）と書いてある。
 */
(function () {
  'use strict';

  var TB = window.TB;
  var def = TB.def;
  var t = TB.t;

  function ja() { return TB.state.lang === 'ja'; }
  function L(j, e) { return ja() ? j : e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function err(msg) { return [[{ t: msg, c: 'err' }]]; }
  function warn(msg) { return [[{ t: msg, c: 'warn' }]]; }
  function dim(msg) { return [[{ t: msg, c: 'dim' }]]; }
  function usage(u) { return warn(TB.ui('usage') + ': ' + u); }

  var START = Date.now();

  /* ---------- 仮想ファイルの読み出し ------------------------------------ */

  function fileText(arg) {
    if (!arg) return { error: 'usage' };
    var parts = TB.fs.resolve(arg, TB.state.cwd);
    var node = TB.fs.get(parts);
    if (!node) return { error: TB.ui('nosuchfile')(arg) };
    if (node.type === 'dir') return { error: TB.ui('isdir')(arg) };
    return { lines: TB.plain(TB.readNode(node)) };
  }

  function walkFiles(node, path, out) {
    if (!node || node.type !== 'dir') return out;
    Object.keys(node.children).forEach(function (name) {
      var child = node.children[name];
      var p = path + '/' + name;
      if (child.type === 'dir') walkFiles(child, p, out);
      else out.push({ path: p, node: child, name: name });
    });
    return out;
  }

  function allFiles() {
    return walkFiles(TB.fs.get(['home', 'guest']), '~', []);
  }

  var READONLY = {
    ja: 'このファイルシステムは読み取り専用です（見るだけの飾りなので）。',
    en: 'This filesystem is read-only — it is only here to be looked at.'
  };
  function readOnly() { return [[{ t: t(READONLY), c: 'warn' }]]; }

  /* =====================================================================
     コマンドプロンプト風
     ===================================================================== */

  def('dir', {
    group: 'dos',
    usage: 'dir [path]',
    desc: { ja: 'ファイルの一覧（Windows 風の書式）', en: 'list files, DOS style' },
    run: function (args) {
      var target = args.filter(function (a) { return a.charAt(0) !== '/'; })[0] || '.';
      var parts = TB.fs.resolve(target, TB.state.cwd);
      var node = TB.fs.get(parts);
      if (!node) return err(TB.ui('nosuchfile')(target));
      if (node.type !== 'dir') return err(TB.ui('notdir')(target));

      var out = [
        [{ t: ' ドライブ C のボリューム ラベルは TUI-BASE です', c: 'dim' }],
        [{ t: ' ボリューム シリアル番号は 7409-1F2B です', c: 'dim' }],
        '',
        [{ t: ' ' + TB.fs.display(parts) + ' のディレクトリ', c: '' }],
        ''
      ];
      if (!ja()) {
        out = [
          [{ t: ' Volume in drive C is TUI-BASE', c: 'dim' }],
          [{ t: ' Volume Serial Number is 7409-1F2B', c: 'dim' }],
          '',
          [{ t: ' Directory of ' + TB.fs.display(parts), c: '' }],
          ''
        ];
      }
      var files = 0, dirs = 0, bytes = 0;
      Object.keys(node.children).sort().forEach(function (name) {
        var child = node.children[name];
        if (child.hidden) return;
        var isDir = child.type === 'dir';
        var size = isDir ? 0 : TB.plain(TB.readNode(child)).join('\n').length;
        if (isDir) dirs++; else { files++; bytes += size; }
        out.push([
          { t: '2026/09/13  08:16    ', c: 'dim' },
          { t: isDir ? '   <DIR>       ' : String(size).padStart(10) + '     ', c: isDir ? 'accent-2' : '' },
          { t: name, c: isDir ? 'accent-2 bold' : '' }
        ]);
      });
      out.push('');
      out.push([{ t: '          ' + files + L(' 個のファイル ', ' File(s) ') + bytes + L(' バイト', ' bytes'), c: 'dim' }]);
      out.push([{ t: '          ' + dirs + L(' 個のディレクトリ', ' Dir(s)'), c: 'dim' }]);
      out.push('');
      return out;
    }
  });

  def('type', {
    group: 'dos',
    usage: 'type <file>',
    desc: { ja: 'ファイルの中身を表示（cat と同じ）', en: 'print a file (same as cat)' },
    run: function (args) { return TB.commands.cat.run(args); }
  });

  def('ver', {
    group: 'dos',
    desc: { ja: 'バージョンを表示', en: 'show the version' },
    run: function () {
      return ['', [{ t: 'TUI-BASE [Version ' + window.CONTENT.meta.version + ']', c: 'accent' }],
        [{ t: '(c) 2026 TUI-BASE. All rights reserved.', c: 'dim' }], ''];
    }
  });

  def('vol', {
    group: 'dos',
    desc: { ja: 'ボリューム名を表示', en: 'show the volume label' },
    run: function () {
      return [[{ t: L(' ドライブ C のボリューム ラベルは TUI-BASE です', ' Volume in drive C is TUI-BASE'), c: '' }],
        [{ t: L(' ボリューム シリアル番号は 7409-1F2B です', ' Volume Serial Number is 7409-1F2B'), c: 'dim' }]];
    }
  });

  def('ipconfig', {
    group: 'dos',
    desc: { ja: 'ネットワーク設定らしきもの（演出）', en: 'network settings, sort of (pretend)' },
    run: function () {
      return ['',
        [{ t: 'Windows IP ' + L('構成', 'Configuration'), c: 'accent' }], '',
        [{ t: L('イーサネット アダプター Terminal:', 'Ethernet adapter Terminal:'), c: '' }],
        { row: ['   IPv4', '10.0.0.42'] },
        { row: ['   ' + L('サブネット マスク', 'Subnet Mask'), '255.255.255.0'] },
        { row: ['   ' + L('デフォルト ゲートウェイ', 'Default Gateway'), '10.0.0.1'] },
        '',
        [{ t: L('（本物の設定ではありません。ブラウザの中の作り物です）',
                '(not your real network — this all lives inside the page)'), c: 'dim' }], ''];
    }
  });

  def('ping', {
    group: 'dos',
    usage: 'ping <host>',
    desc: { ja: '届くか確かめる真似をする（演出）', en: 'pretend to ping a host' },
    run: function (args) {
      var host = args[0] || 'tui-base.local';
      var lines = ['', [{ t: host + ' に ping を送信しています:', c: '' }]];
      if (!ja()) lines = ['', [{ t: 'Pinging ' + host + ' with 32 bytes of data:', c: '' }]];
      TB.Term.printAll(lines);
      var times = [];
      return new Promise(function (resolve) {
        var i = 0;
        (function step() {
          if (i++ >= 4) {
            var min = Math.min.apply(null, times), max = Math.max.apply(null, times);
            var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
            TB.Term.printAll(['',
              [{ t: L(host + ' の ping 統計:', 'Ping statistics for ' + host + ':'), c: '' }],
              [{ t: L('    パケット数: 送信 = 4、受信 = 4、損失 = 0 (0% の損失)',
                      '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)'), c: 'dim' }],
              [{ t: L('    最小 = ' + min + 'ms、最大 = ' + max + 'ms、平均 = ' + avg + 'ms',
                      '    Minimum = ' + min + 'ms, Maximum = ' + max + 'ms, Average = ' + avg + 'ms'), c: 'dim' }],
              '', [{ t: L('（実際には何も送っていません）', '(nothing actually left the page)'), c: 'dim' }], '']);
            resolve();
            return;
          }
          var ms = 8 + rnd(40);
          times.push(ms);
          TB.Term.printAll([[{ t: L('10.0.0.42 からの応答: バイト数 =32 時間 =' + ms + 'ms TTL=64',
                                    'Reply from 10.0.0.42: bytes=32 time=' + ms + 'ms TTL=64'), c: 'accent' }]]);
          setTimeout(step, 260);
        })();
      });
    }
  });

  def('tracert', {
    group: 'dos',
    usage: 'tracert <host>',
    desc: { ja: '経路をたどる真似をする（演出）', en: 'pretend to trace a route' },
    run: function (args) {
      var host = args[0] || 'tui-base.local';
      var hops = ['10.0.0.1', '172.16.0.1', '192.0.2.8', '198.51.100.4', host];
      var out = ['', [{ t: L(host + ' への経路をトレースしています:', 'Tracing route to ' + host + ':'), c: '' }], ''];
      hops.forEach(function (h, i) {
        out.push([{ t: String(i + 1).padStart(3) + '   ', c: 'dim' },
                  { t: (2 + rnd(30)) + ' ms   ' + (2 + rnd(30)) + ' ms   ' + (2 + rnd(30)) + ' ms   ', c: 'dim' },
                  { t: h, c: 'accent-2' }]);
      });
      out.push('', [{ t: L('トレースを完了しました。（演出です）', 'Trace complete. (pretend)'), c: 'dim' }], '');
      return out;
    }
  });

  def('netstat', {
    group: 'dos',
    desc: { ja: '通信の一覧らしきもの（演出）', en: 'a list of connections (pretend)' },
    run: function () {
      return ['', [{ t: L('アクティブな接続', 'Active Connections'), c: 'accent' }], '',
        [{ t: '  Proto  ' + L('ローカル アドレス', 'Local Address').padEnd(22) + L('外部アドレス', 'Foreign Address').padEnd(22) + L('状態', 'State'), c: 'dim' }],
        [{ t: '  TCP    10.0.0.42:443         cdn.example:https     ESTABLISHED' }],
        [{ t: '  TCP    10.0.0.42:5173        localhost:5173        LISTENING' }],
        [{ t: '  TCP    10.0.0.42:22          kernel.local:ssh      TIME_WAIT' }],
        '', [{ t: L('（作り物です）', '(pretend)'), c: 'dim' }], ''];
    }
  });

  def('systeminfo', {
    group: 'dos',
    desc: { ja: 'この環境の情報（一部は本物）', en: 'system information (some of it real)' },
    run: function () {
      var nav = window.navigator;
      return ['',
        { row: [L('ホスト名', 'Host Name'), window.CONTENT.meta.host] },
        { row: ['OS', 'TUI-BASE ' + window.CONTENT.meta.version] },
        { row: [L('言語', 'Language'), nav.language || '-'] },
        { row: [L('画面', 'Screen'), window.innerWidth + ' x ' + window.innerHeight] },
        { row: [L('論理プロセッサ', 'Logical Processors'), String(nav.hardwareConcurrency || '?')] },
        { row: [L('起動してから', 'Up Time'), Math.floor((Date.now() - START) / 1000) + L(' 秒', ' s')] },
        { row: [L('接続', 'Network'), nav.onLine ? L('オンライン', 'online') : L('オフライン', 'offline')] },
        ''];
    }
  });

  def('tasklist', {
    group: 'dos',
    desc: { ja: '動いているものの一覧（演出）', en: 'a list of running tasks (pretend)' },
    run: function () {
      var rows = [
        ['terminal.exe', '1024', '12,480 K'],
        ['renderer.exe', '1288', '38,912 K'],
        ['themes.dll', '1440', ' 1,024 K'],
        ['games.exe', '2048', '20,480 K'],
        ['coffee.exe', '4096', '   418 K']
      ];
      var out = ['', [{ t: (L('イメージ名', 'Image Name') + '        PID  ' + L('メモリ使用量', 'Mem Usage')), c: 'dim' }],
        [{ t: '=================== ==== ============', c: 'dim' }]];
      rows.forEach(function (r) {
        out.push([{ t: r[0].padEnd(20), c: 'accent' }, { t: r[1].padStart(4) + '  ' + r[2], c: '' }]);
      });
      out.push('');
      return out;
    }
  });

  def('taskkill', {
    group: 'dos',
    usage: 'taskkill <name>',
    desc: { ja: '止めようとする（止まらない）', en: 'try to kill a task (it will not die)' },
    run: function (args) {
      var name = args[0] || 'coffee.exe';
      return [[{ t: L('"' + name + '" を止めようとしましたが、断られました。',
                      'Tried to stop "' + name + '". It declined.'), c: 'warn' }],
              [{ t: L('（このターミナルの中では、みんな元気に動き続けます）',
                      '(inside this terminal, everything keeps running happily)'), c: 'dim' }]];
    }
  });

  def('title', {
    group: 'dos',
    usage: 'title <text>',
    desc: { ja: 'ウィンドウのタイトルを変える（本当に変わる）', en: 'set the window title (really works)' },
    run: function (args) {
      var text = args.join(' ');
      var tag = document.getElementById('tb-tag');
      if (!text) {
        tag.textContent = window.CONTENT.meta.title + ' v' + window.CONTENT.meta.version;
        document.title = window.CONTENT.meta.title + ' — ' + t(window.CONTENT.meta.tagline);
        return dim(L('タイトルを元に戻しました。', 'Title restored.'));
      }
      tag.textContent = text;
      document.title = text;
      return [[{ t: L('タイトルを「' + text + '」にしました。', 'Title set to "' + text + '".'), c: 'accent' }]];
    }
  });

  var COLORS = {
    '0a': 'matrix', '0b': 'midnight', '0e': 'amber', '0d': 'synth', 'f0': 'paper',
    '07': 'midnight', '02': 'matrix', '06': 'amber', '05': 'synth'
  };
  def('color', {
    group: 'dos',
    usage: 'color [00-ff]',
    desc: { ja: '色を変える。0a などのコードでテーマが変わる', en: 'change colours DOS-style (0a, 0e, f0 …)' },
    run: function (args) {
      var code = (args[0] || '').toLowerCase();
      if (!code) return TB.commands.theme.run([]);
      var theme = COLORS[code];
      if (!theme) {
        return warn(L('使えるコード: ' + Object.keys(COLORS).join(' '),
                      'known codes: ' + Object.keys(COLORS).join(' ')));
      }
      TB.setTheme(theme);
      return [[{ t: L('色コード ' + code + ' → テーマ ' + theme, 'colour ' + code + ' → theme ' + theme), c: 'accent' }]];
    }
  });

  def('pause', {
    group: 'dos',
    desc: { ja: 'キーが押されるまで待つ', en: 'wait for a key press' },
    run: function () {
      TB.Term.printAll([[{ t: L('続行するには何かキーを押してください . . .',
                                'Press any key to continue . . .'), c: 'dim' }]]);
      return new Promise(function (resolve) {
        TB.Term.capture(function () {
          TB.Term.release();
          resolve([[{ t: L('（キーを受け取りました）', '(key received)'), c: 'dim' }], '']);
        });
      });
    }
  });

  def('set', {
    group: 'dos',
    desc: { ja: '今の設定を表示する', en: 'show the current settings' },
    run: function () {
      return ['',
        [{ t: 'THEME=' + TB.currentTheme() }],
        [{ t: 'LANG=' + TB.state.lang }],
        [{ t: 'CRT=' + (document.body.classList.contains('crt-on') ? 'on' : 'off') }],
        [{ t: 'CWD=' + TB.fs.display(TB.state.cwd) }],
        [{ t: 'USER=' + window.CONTENT.meta.user }],
        [{ t: 'HOST=' + window.CONTENT.meta.host }],
        [{ t: 'VERSION=' + window.CONTENT.meta.version }],
        ''];
    }
  });

  def('path', {
    group: 'dos',
    desc: { ja: 'コマンドを探す場所（演出）', en: 'where commands are looked for (pretend)' },
    run: function () {
      return [[{ t: 'PATH=/usr/local/bin:/usr/bin:/bin:C:\\TUI-BASE\\commands', c: 'dim' }]];
    }
  });

  def('hostname', {
    group: 'dos',
    desc: { ja: 'この端末の名前', en: 'the name of this machine' },
    run: function () { return [window.CONTENT.meta.host]; }
  });

  def('chkdsk', {
    group: 'dos',
    desc: { ja: 'ディスクを調べる真似をする（演出）', en: 'pretend to check the disk' },
    run: function () {
      var el = document.createElement('div');
      el.className = 'line';
      TB.Term.print({ node: el });
      return new Promise(function (resolve) {
        var pct = 0;
        var timer = setInterval(function () {
          pct += 4 + rnd(9);
          if (pct > 100) pct = 100;
          var filled = Math.round(pct / 4);
          el.textContent = L('ファイル システムの種類は TUIFS です。  ', 'File system is TUIFS.  ') +
            '[' + '█'.repeat(filled) + '░'.repeat(25 - filled) + '] ' + pct + '%';
          if (pct >= 100) {
            clearInterval(timer);
            resolve(['',
              [{ t: L('   1,024 個のファイルを処理しました。', '   1,024 files processed.'), c: 'dim' }],
              [{ t: L('   問題は見つかりませんでした。', '   No problems found.'), c: 'accent' }], '']);
          }
        }, 120);
      });
    }
  });

  def('format', {
    group: 'dos',
    usage: 'format <drive>',
    desc: { ja: '断られる', en: 'politely refused' },
    run: function () {
      return [[{ t: L('お断りします。ここにはあなたの大事な文章が入っています。',
                      'Absolutely not. Your words live here.'), c: 'err' }]];
    }
  });

  def('shutdown', {
    group: 'dos',
    desc: { ja: '電源を切ろうとする（切れない）', en: 'try to shut down (it will not)' },
    run: function () {
      return [[{ t: L('このターミナルには電源スイッチがありません。',
                      'This terminal has no power switch.'), c: 'warn' }],
              [{ t: L('閉じたいときはタブを閉じてください。', 'Close the tab if you must.'), c: 'dim' }]];
    }
  });

  ['copy', 'del', 'ren', 'md', 'rd', 'move', 'erase'].forEach(function (name) {
    def(name, {
      group: 'dos',
      hidden: true,
      desc: { ja: '読み取り専用なので使えません', en: 'not available: the filesystem is read-only' },
      run: readOnly
    });
  });

  /* =====================================================================
     Unix 風
     ===================================================================== */

  def('uname', {
    group: 'unix',
    usage: 'uname [-a]',
    desc: { ja: 'この環境の名前を表示', en: 'print system information' },
    run: function (args) {
      var ua = navigator.userAgent;
      var engine = (ua.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/) || ['unknown'])[0];
      if (args[0] === '-a') {
        return [[{ t: 'TUI-BASE ' + window.CONTENT.meta.host + ' ' + window.CONTENT.meta.version +
                     ' #1 ' + engine + ' ' + (navigator.platform || 'web') }]];
      }
      return ['TUI-BASE'];
    }
  });

  def('uptime', {
    group: 'unix',
    desc: { ja: 'このページを開いてからの時間', en: 'how long this page has been open' },
    run: function () {
      var sec = Math.floor((Date.now() - START) / 1000);
      var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = sec % 60;
      var d = new Date();
      return [[{ t: ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') +
                   L('  起動からの経過 ', '  up ') + (h ? h + 'h ' : '') + (m ? m + 'm ' : '') + s2 + 's' +
                   L('、ユーザー 1 人', ', 1 user') }]];
    }
  });

  def('id', {
    group: 'unix',
    desc: { ja: 'ユーザー ID を表示', en: 'print user identity' },
    run: function () {
      return [[{ t: 'uid=1000(' + window.CONTENT.meta.user + ') gid=1000(guest) groups=1000(guest),27(visitors)' }]];
    }
  });

  def('groups', {
    group: 'unix',
    desc: { ja: '所属グループ', en: 'the groups you belong to' },
    run: function () { return ['guest visitors readers']; }
  });

  def('env', {
    group: 'unix',
    desc: { ja: '環境変数らしきもの', en: 'environment variables' },
    run: function () { return TB.commands.set.run([]); }
  });

  def('ps', {
    group: 'unix',
    desc: { ja: '動いているものの一覧（演出）', en: 'list processes (pretend)' },
    run: function () {
      return ['', [{ t: '  PID TTY          TIME CMD', c: 'dim' }],
        [{ t: ' 1024 tty1     00:00:01 tuish' }],
        [{ t: ' 1288 tty1     00:00:12 renderer' }],
        [{ t: ' 2048 tty1     00:00:00 games' }],
        [{ t: ' 4096 tty1     00:00:07 coffee' }], ''];
    }
  });

  def('top', {
    group: 'unix',
    desc: { ja: '負荷の様子（演出）', en: 'a snapshot of the load (pretend)' },
    run: function () {
      var load = (Math.random() * 0.6).toFixed(2);
      return ['',
        [{ t: L('稼働 ', 'up ') + Math.floor((Date.now() - START) / 1000) + L(' 秒、負荷 ', 's, load average: ') + load, c: 'dim' }],
        [{ t: L('タスク: 5 個（実行中 1、待機 4）', 'Tasks: 5 total, 1 running, 4 sleeping'), c: 'dim' }],
        '',
        [{ t: '  PID USER      %CPU  %MEM  COMMAND', c: 'dim' }],
        [{ t: ' 1288 guest      2.1   3.4  renderer' }],
        [{ t: ' 1024 guest      0.7   1.2  tuish' }],
        [{ t: ' 4096 guest      0.0   0.1  coffee' }], ''];
    }
  });

  def('df', {
    group: 'unix',
    desc: { ja: '空き容量（演出）', en: 'free disk space (pretend)' },
    run: function () {
      return ['', [{ t: L('ファイルシス   サイズ  使用  残り 使用% マウント位置', 'Filesystem     Size  Used Avail Use% Mounted on'), c: 'dim' }],
        [{ t: '/dev/tui0       640K   12K  628K   2% /' }],
        [{ t: 'tmpfs            64K    0K   64K   0% /tmp' }], ''];
    }
  });

  def('free', {
    group: 'unix',
    desc: { ja: 'メモリの様子（演出）', en: 'memory usage (pretend)' },
    run: function () {
      return ['', [{ t: '              total        used        free', c: 'dim' }],
        [{ t: 'Mem:            640K         12K        628K' }],
        [{ t: 'Swap:             0K          0K          0K' }], ''];
    }
  });

  def('du', {
    group: 'unix',
    desc: { ja: 'ファイルの大きさを見る', en: 'show the size of each file' },
    run: function () {
      var out = [''], total = 0;
      allFiles().forEach(function (f) {
        var size = TB.plain(TB.readNode(f.node)).join('\n').length;
        total += size;
        out.push({ row: [String(size) + ' B', f.path] });
      });
      out.push({ row: [String(total) + ' B', L('合計', 'total')] });
      out.push('');
      return out;
    }
  });

  def('find', {
    group: 'unix',
    usage: 'find [name]',
    desc: { ja: 'ファイルを名前で探す', en: 'find files by name' },
    run: function (args) {
      var q = (args[0] || '').toLowerCase();
      var hits = allFiles().filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) !== -1; });
      if (!hits.length) return dim(L('見つかりませんでした。', 'Nothing found.'));
      return hits.map(function (f) { return [{ t: f.path, c: 'accent-2' }]; }).concat(['']);
    }
  });

  def('grep', {
    group: 'unix',
    usage: 'grep <word> [file]',
    desc: { ja: '文字を含む行を探す', en: 'find lines containing a word' },
    run: function (args) {
      if (!args.length) return usage('grep <word> [file]');
      var word = args[0], lower = word.toLowerCase();
      var targets = args[1]
        ? [{ path: args[1], node: TB.fs.get(TB.fs.resolve(args[1], TB.state.cwd)) }]
        : allFiles();
      if (args[1] && (!targets[0].node || targets[0].node.type === 'dir')) {
        return err(TB.ui('nosuchfile')(args[1]));
      }
      var out = [], hits = 0;
      targets.forEach(function (f) {
        TB.plain(TB.readNode(f.node)).forEach(function (line, i) {
          if (line.toLowerCase().indexOf(lower) === -1) return;
          hits++;
          var at = line.toLowerCase().indexOf(lower);
          out.push([
            { t: f.path + ':' + (i + 1) + ': ', c: 'dim' },
            { t: line.slice(0, at) },
            { t: line.substr(at, word.length), c: 'accent bold' },
            { t: line.slice(at + word.length) }
          ]);
        });
      });
      if (!hits) return dim(L('見つかりませんでした: ' + word, 'no matches for: ' + word));
      out.push('', [{ t: L(hits + ' 件見つかりました。', hits + ' matching line(s).'), c: 'dim' }], '');
      return out;
    }
  });

  function headTail(args, isHead) {
    var n = 10, rest = args.slice();
    if (rest[0] === '-n') { n = parseInt(rest[1], 10) || 10; rest = rest.slice(2); }
    else if (/^-\d+$/.test(rest[0] || '')) { n = parseInt(rest[0].slice(1), 10); rest = rest.slice(1); }
    var f = fileText(rest[0]);
    if (f.error === 'usage') return usage((isHead ? 'head' : 'tail') + ' [-n 5] <file>');
    if (f.error) return err(f.error);
    var lines = isHead ? f.lines.slice(0, n) : f.lines.slice(-n);
    return lines.concat(['']);
  }

  def('head', {
    group: 'unix',
    usage: 'head [-n 5] <file>',
    desc: { ja: 'ファイルの先頭だけ見る', en: 'show the first lines of a file' },
    run: function (args) { return headTail(args, true); }
  });

  def('tail', {
    group: 'unix',
    usage: 'tail [-n 5] <file>',
    desc: { ja: 'ファイルの末尾だけ見る', en: 'show the last lines of a file' },
    run: function (args) { return headTail(args, false); }
  });

  def('wc', {
    group: 'unix',
    usage: 'wc <file>',
    desc: { ja: '行数・語数・文字数を数える', en: 'count lines, words and characters' },
    run: function (args) {
      var f = fileText(args[0]);
      if (f.error === 'usage') return usage('wc <file>');
      if (f.error) return err(f.error);
      var text = f.lines.join('\n');
      var words = text.split(/\s+/).filter(Boolean).length;
      return [[{ t: '  ' + f.lines.length + '  ' + words + '  ' + text.length + '  ' + args[0] }]];
    }
  });

  def('sort', {
    group: 'unix',
    usage: 'sort <file>',
    desc: { ja: 'ファイルの行を並べ替える', en: 'sort the lines of a file' },
    run: function (args) {
      var f = fileText(args[0]);
      if (f.error === 'usage') return usage('sort <file>');
      if (f.error) return err(f.error);
      return f.lines.slice().sort().filter(function (l) { return l.trim(); }).concat(['']);
    }
  });

  def('uniq', {
    group: 'unix',
    usage: 'uniq <file>',
    desc: { ja: '続けて同じ行をまとめる', en: 'drop repeated neighbouring lines' },
    run: function (args) {
      var f = fileText(args[0]);
      if (f.error === 'usage') return usage('uniq <file>');
      if (f.error) return err(f.error);
      var out = [], last = null;
      f.lines.forEach(function (l) { if (l !== last) out.push(l); last = l; });
      return out.concat(['']);
    }
  });

  def('file', {
    group: 'unix',
    usage: 'file <name>',
    desc: { ja: 'それが何かを言う', en: 'say what something is' },
    run: function (args) {
      if (!args.length) return usage('file <name>');
      var node = TB.fs.get(TB.fs.resolve(args[0], TB.state.cwd));
      if (!node) return err(TB.ui('nosuchfile')(args[0]));
      if (node.type === 'dir') return [args[0] + ': ' + L('ディレクトリ', 'directory')];
      var kind = /\.md$/.test(args[0]) ? L('Markdown のテキスト', 'Markdown text')
        : /\.txt$/.test(args[0]) ? L('ただのテキスト', 'ASCII text')
        : L('テキスト', 'text');
      return [args[0] + ': ' + kind];
    }
  });

  def('stat', {
    group: 'unix',
    usage: 'stat <name>',
    desc: { ja: 'ファイルの詳しい情報', en: 'details about a file' },
    run: function (args) {
      if (!args.length) return usage('stat <name>');
      var parts = TB.fs.resolve(args[0], TB.state.cwd);
      var node = TB.fs.get(parts);
      if (!node) return err(TB.ui('nosuchfile')(args[0]));
      var size = node.type === 'dir' ? 0 : TB.plain(TB.readNode(node)).join('\n').length;
      return ['',
        { row: [L('名前', 'name'), TB.fs.display(parts)] },
        { row: [L('種類', 'type'), node.type === 'dir' ? L('ディレクトリ', 'directory') : L('ファイル', 'file')] },
        { row: [L('大きさ', 'size'), size + ' B'] },
        { row: [L('権限', 'access'), node.type === 'dir' ? 'dr-xr-xr-x' : '-r--r--r--'] },
        { row: [L('所有者', 'owner'), window.CONTENT.meta.user] },
        ''];
    }
  });

  def('which', {
    group: 'unix',
    usage: 'which <command>',
    desc: { ja: 'そのコマンドがあるか調べる', en: 'check whether a command exists' },
    run: function (args) {
      if (!args.length) return usage('which <command>');
      var name = args[0];
      if (TB.commands[name]) return [[{ t: '/usr/bin/' + name, c: 'accent' }]];
      if (TB.alias[name]) return [[{ t: name + ': ' + L('別名 → ', 'aliased to ') + TB.alias[name], c: 'accent-2' }]];
      return err(name + ': ' + L('見つかりません', 'not found'));
    }
  });

  def('alias', {
    group: 'unix',
    desc: { ja: '別名の一覧', en: 'list the aliases' },
    run: function () {
      return Object.keys(TB.alias).sort().map(function (a) {
        return [{ t: 'alias ' + a + '=', c: 'dim' }, { t: "'" + TB.alias[a] + "'", c: 'accent' }];
      }).concat(['']);
    }
  });

  def('apropos', {
    group: 'unix',
    usage: 'apropos <word>',
    desc: { ja: '説明文からコマンドを探す', en: 'search command descriptions' },
    run: function (args) {
      if (!args.length) return usage('apropos <word>');
      var q = args.join(' ').toLowerCase();
      var hits = Object.keys(TB.commands).filter(function (name) {
        var c = TB.commands[name];
        return name.indexOf(q) !== -1 || String(t(c.desc)).toLowerCase().indexOf(q) !== -1;
      });
      if (!hits.length) return dim(L('見つかりませんでした。', 'nothing found.'));
      return hits.map(function (n) {
        return { row: [[{ t: n, c: 'accent' }], t(TB.commands[n].desc)] };
      }).concat(['']);
    }
  });

  def('sleep', {
    group: 'unix',
    usage: 'sleep <秒>',
    desc: { ja: '少し待つ（最大 5 秒）', en: 'wait a moment (5 seconds max)' },
    run: function (args) {
      var n = Math.min(Math.max(parseFloat(args[0]) || 1, 0.1), 5);
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(dim(L(n + ' 秒待ちました。', 'waited ' + n + 's.'))); }, n * 1000);
      });
    }
  });

  def('seq', {
    group: 'unix',
    usage: 'seq [開始] <終わり>',
    desc: { ja: '数を並べる', en: 'print a sequence of numbers' },
    run: function (args) {
      var from = args.length > 1 ? parseInt(args[0], 10) : 1;
      var to = parseInt(args.length > 1 ? args[1] : args[0], 10);
      if (isNaN(to)) return usage('seq [from] <to>');
      if (Math.abs(to - from) > 200) return warn(L('200 個までにしてください。', 'keep it under 200 numbers.'));
      var out = [];
      for (var i = from; from <= to ? i <= to : i >= to; from <= to ? i++ : i--) out.push(String(i));
      return [out.join('  '), ''];
    }
  });

  def('yes', {
    group: 'unix',
    usage: 'yes [text]',
    desc: { ja: '同じ言葉を並べる（10 行でやめます）', en: 'repeat a word (stops after 10 lines)' },
    run: function (args) {
      var text = args.join(' ') || 'y';
      var out = [];
      for (var i = 0; i < 10; i++) out.push(text);
      out.push([{ t: L('（本物は止めるまで続きます。ここでは 10 行で失礼します）',
                       '(the real one never stops. ten lines will do here)'), c: 'dim' }], '');
      return out;
    }
  });

  def('cal', {
    group: 'unix',
    desc: { ja: '今月のカレンダー', en: "this month's calendar" },
    run: function () {
      var now = new Date();
      var y = now.getFullYear(), m = now.getMonth();
      var first = new Date(y, m, 1).getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var title = ja() ? (y + ' 年 ' + (m + 1) + ' 月') : now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      var head = ja() ? '日 月 火 水 木 金 土' : 'Su Mo Tu We Th Fr Sa';
      var pad = Math.max(0, Math.floor((20 - title.length) / 2));
      var out = ['', [{ t: ' '.repeat(pad) + title, c: 'accent bold' }], [{ t: head, c: 'dim' }]];
      var line = [], col = 0, i;
      for (i = 0; i < first; i++) { line.push({ t: '   ' }); col++; }
      for (i = 1; i <= days; i++) {
        var isToday = i === now.getDate();
        line.push({ t: String(i).padStart(2) + ' ', c: isToday ? 'accent bold inv' : '' });
        if (++col === 7) { out.push(line); line = []; col = 0; }
      }
      if (line.length) out.push(line);
      out.push('');
      return out;
    }
  });

  def('sl', {
    group: 'unix',
    hidden: true,
    desc: { ja: '打ち間違えた人のところに汽車が来る', en: 'a train for those who mistype ls' },
    run: function () {
      var train = [
        '      ====        ________                ___________ ',
        '  _D _|  |_______/        \\__I_I_____===__|_________| ',
        '   |(_)---  |   H\\________/ |   |        =|___ ___|   ',
        '   /     |  |   H  |  |     |   |         ||_| |_||   ',
        '  |      |  |   H  |__--------------------| [___] |   ',
        '  | ________|___H__/__|_____/[][]~\\_______|       |   ',
        '  |/ |   |-----------I_____I [][] []  D   |=======|__ '
      ];
      var el = document.createElement('div');
      el.className = 'line';
      el.style.whiteSpace = 'pre';
      el.style.overflow = 'hidden';
      TB.Term.print({ node: el });
      return new Promise(function (resolve) {
        var pos = 40;
        var timer = setInterval(function () {
          el.textContent = train.map(function (row) {
            return ' '.repeat(Math.max(0, pos)) + row.slice(Math.max(0, -pos));
          }).join('\n');
          pos -= 4;
          if (pos < -70) {
            clearInterval(timer);
            el.textContent = '';
            resolve(dim(L('汽車は行ってしまいました。', 'The train has left.')));
          }
        }, 70);
      });
    }
  });

  def('w', {
    group: 'unix',
    desc: { ja: '今いる人（演出）', en: 'who is logged in (pretend)' },
    run: function () {
      return ['', [{ t: 'USER     TTY      FROM              LOGIN@   WHAT', c: 'dim' }],
        [{ t: window.CONTENT.meta.user.padEnd(9) + 'tty1     browser           ' +
             new Date(START).toTimeString().slice(0, 5) + '    tuish' }], ''];
    }
  });

  def('curl', {
    group: 'unix',
    usage: 'curl <url>',
    desc: { ja: '外に出られないことを伝える', en: 'explain that it cannot reach out' },
    run: function (args) {
      if (!args.length) return usage('curl <url>');
      return [[{ t: L('このターミナルはページの中だけで動いているので、外へは取りに行けません。',
                      'This terminal lives inside the page and cannot fetch anything.'), c: 'warn' }],
              [{ t: L('開くだけなら open ' + args[0] + ' が使えます。',
                      'To just open it: open ' + args[0]), c: 'dim' }]];
    }
  });

  def('ssh', {
    group: 'unix',
    usage: 'ssh <host>',
    desc: { ja: '遠くへは行けない', en: 'there is nowhere to connect to' },
    run: function () {
      return [[{ t: L('接続できる先がありません。ここが終着点です。',
                      'No host to reach. This is the end of the line.'), c: 'warn' }]];
    }
  });

  def('basename', {
    group: 'unix',
    usage: 'basename <path>',
    desc: { ja: 'パスの最後の部分', en: 'the last part of a path' },
    run: function (args) {
      if (!args.length) return usage('basename <path>');
      var p = args[0].replace(/\/+$/, '').split('/');
      return [p[p.length - 1] || '/'];
    }
  });

  def('dirname', {
    group: 'unix',
    usage: 'dirname <path>',
    desc: { ja: 'パスの親の部分', en: 'the folder part of a path' },
    run: function (args) {
      if (!args.length) return usage('dirname <path>');
      var p = args[0].replace(/\/+$/, '').split('/');
      p.pop();
      return [p.join('/') || '.'];
    }
  });

  ['touch', 'rm', 'mv', 'cp', 'mkdir', 'rmdir', 'chmod', 'chown', 'ln'].forEach(function (name) {
    def(name, {
      group: 'unix',
      hidden: true,
      desc: { ja: '読み取り専用なので使えません', en: 'not available: the filesystem is read-only' },
      run: readOnly
    });
  });

  /* =====================================================================
     文字を扱う
     ===================================================================== */

  function joined(args) { return args.join(' '); }

  /* 全角文字を 2 桁として数える（cowsay の枠がずれないように） */
  function width(str) {
    var w = 0;
    Array.from(str).forEach(function (ch) {
      w += /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/.test(ch) ? 2 : 1;
    });
    return w;
  }
  TB.width = width;

  def('upper', {
    group: 'text',
    usage: 'upper <text>',
    desc: { ja: '大文字にする', en: 'make it upper case' },
    run: function (args) { return args.length ? [joined(args).toUpperCase()] : usage('upper <text>'); }
  });

  def('lower', {
    group: 'text',
    usage: 'lower <text>',
    desc: { ja: '小文字にする', en: 'make it lower case' },
    run: function (args) { return args.length ? [joined(args).toLowerCase()] : usage('lower <text>'); }
  });

  def('rev', {
    group: 'text',
    usage: 'rev <text>',
    desc: { ja: '文字を逆さまに並べる', en: 'reverse the text' },
    run: function (args) {
      if (!args.length) return usage('rev <text>');
      return [Array.from(joined(args)).reverse().join('')];
    }
  });

  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(str) {
    return decodeURIComponent(escape(atob(str)));
  }

  def('base64', {
    group: 'text',
    usage: 'base64 <text>',
    desc: { ja: 'base64 にする', en: 'encode to base64' },
    run: function (args) {
      if (!args.length) return usage('base64 <text>');
      try { return [[{ t: toBase64(joined(args)), c: 'accent' }]]; }
      catch (e) { return err(L('変換できませんでした。', 'could not encode that.')); }
    }
  });

  def('unbase64', {
    group: 'text',
    usage: 'unbase64 <text>',
    desc: { ja: 'base64 を元に戻す', en: 'decode from base64' },
    run: function (args) {
      if (!args.length) return usage('unbase64 <text>');
      try { return [[{ t: fromBase64(args[0]), c: 'accent' }]]; }
      catch (e) { return err(L('base64 として読めませんでした。', 'that is not valid base64.')); }
    }
  });

  def('rot13', {
    group: 'text',
    usage: 'rot13 <text>',
    desc: { ja: 'アルファベットを 13 文字ずらす', en: 'shift letters by 13' },
    run: function (args) {
      if (!args.length) return usage('rot13 <text>');
      return [joined(args).replace(/[a-zA-Z]/g, function (c) {
        var base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
      })];
    }
  });

  def('hash', {
    group: 'text',
    usage: 'hash <text>',
    desc: { ja: '短い指紋を作る（暗号用ではありません）', en: 'a short fingerprint (not cryptographic)' },
    run: function (args) {
      if (!args.length) return usage('hash <text>');
      var str = joined(args), h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
      }
      return [[{ t: ('00000000' + h.toString(16)).slice(-8), c: 'accent' },
               { t: L('   （FNV-1a。暗号には使わないでください）', '   (FNV-1a — not for security)'), c: 'dim' }]];
    }
  });

  def('count', {
    group: 'text',
    usage: 'count <text>',
    desc: { ja: '文字数と語数を数える', en: 'count characters and words' },
    run: function (args) {
      if (!args.length) return usage('count <text>');
      var s = joined(args);
      return [
        { row: [L('文字数', 'characters'), String(Array.from(s).length)] },
        { row: [L('語数', 'words'), String(s.split(/\s+/).filter(Boolean).length)] },
        ''
      ];
    }
  });

  def('repeat', {
    group: 'text',
    usage: 'repeat <回数> <text>',
    desc: { ja: '同じ文字を繰り返す', en: 'repeat some text' },
    run: function (args) {
      var n = parseInt(args[0], 10);
      if (isNaN(n) || args.length < 2) return usage('repeat <n> <text>');
      n = Math.min(Math.max(n, 1), 50);
      var text = args.slice(1).join(' ');
      var out = [];
      for (var i = 0; i < n; i++) out.push(text);
      return [out.join(' '), ''];
    }
  });

  def('urlencode', {
    group: 'text',
    usage: 'urlencode <text>',
    desc: { ja: 'URL 用に変換する', en: 'percent-encode text' },
    run: function (args) {
      return args.length ? [[{ t: encodeURIComponent(joined(args)), c: 'accent' }]] : usage('urlencode <text>');
    }
  });

  def('urldecode', {
    group: 'text',
    usage: 'urldecode <text>',
    desc: { ja: 'URL の変換を戻す', en: 'decode percent-encoded text' },
    run: function (args) {
      if (!args.length) return usage('urldecode <text>');
      try { return [[{ t: decodeURIComponent(args[0]), c: 'accent' }]]; }
      catch (e) { return err(L('読み取れませんでした。', 'could not decode that.')); }
    }
  });

  def('uuid', {
    group: 'text',
    desc: { ja: 'でたらめな UUID を 1 つ作る', en: 'generate a random UUID' },
    run: function () {
      var id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = rnd(16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      return [[{ t: id, c: 'accent' }]];
    }
  });

  def('password', {
    group: 'text',
    usage: 'password [長さ]',
    desc: { ja: 'その場かぎりの合言葉を作る', en: 'generate a throwaway password' },
    run: function (args) {
      var n = Math.min(Math.max(parseInt(args[0], 10) || 16, 6), 64);
      var chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*-_=+';
      var buf = '';
      if (window.crypto && window.crypto.getRandomValues) {
        var vals = new Uint32Array(n);
        window.crypto.getRandomValues(vals);
        for (var i = 0; i < n; i++) buf += chars[vals[i] % chars.length];
      } else {
        for (var j = 0; j < n; j++) buf += chars[rnd(chars.length)];
      }
      return [[{ t: buf, c: 'accent bold' }],
              [{ t: L('（この画面の中だけで作りました。どこにも送っていません）',
                      '(generated here in the page; nothing was sent anywhere)'), c: 'dim' }]];
    }
  });

  var LOREM_JA = ['吾輩は端末である。', '名前はまだ無い。', 'どこで生まれたかとんと見当がつかぬ。',
    '何でも薄暗い画面の中で明滅していた事だけは記憶している。', '文字はやがて行になり、行はやがて画面になった。'];
  var LOREM_EN = ['Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa.'];

  def('lorem', {
    group: 'text',
    usage: 'lorem [行数]',
    desc: { ja: '埋め草の文章を出す', en: 'print placeholder text' },
    run: function (args) {
      var n = Math.min(Math.max(parseInt(args[0], 10) || 3, 1), 12);
      var src = ja() ? LOREM_JA : LOREM_EN;
      var out = [''];
      for (var i = 0; i < n; i++) out.push(src[i % src.length]);
      out.push('');
      return out;
    }
  });

  /* --- figlet 用の 5 行フォント --- */
  var FONT = {
    A: [' ██ ', '█  █', '████', '█  █', '█  █'],
    B: ['███ ', '█  █', '███ ', '█  █', '███ '],
    C: [' ███', '█   ', '█   ', '█   ', ' ███'],
    D: ['███ ', '█  █', '█  █', '█  █', '███ '],
    E: ['████', '█   ', '███ ', '█   ', '████'],
    F: ['████', '█   ', '███ ', '█   ', '█   '],
    G: [' ███', '█   ', '█ ██', '█  █', ' ███'],
    H: ['█  █', '█  █', '████', '█  █', '█  █'],
    I: ['███', ' █ ', ' █ ', ' █ ', '███'],
    J: ['  ██', '   █', '   █', '█  █', ' ██ '],
    K: ['█  █', '█ █ ', '██  ', '█ █ ', '█  █'],
    L: ['█   ', '█   ', '█   ', '█   ', '████'],
    M: ['█   █', '██ ██', '█ █ █', '█   █', '█   █'],
    N: ['█  █', '██ █', '█ ██', '█  █', '█  █'],
    O: [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
    P: ['███ ', '█  █', '███ ', '█   ', '█   '],
    Q: [' ██ ', '█  █', '█  █', '█ ██', ' ███'],
    R: ['███ ', '█  █', '███ ', '█ █ ', '█  █'],
    S: [' ███', '█   ', ' ██ ', '   █', '███ '],
    T: ['███', ' █ ', ' █ ', ' █ ', ' █ '],
    U: ['█  █', '█  █', '█  █', '█  █', ' ██ '],
    V: ['█  █', '█  █', '█  █', '█  █', ' ██ '],
    W: ['█   █', '█   █', '█ █ █', '██ ██', '█   █'],
    X: ['█  █', ' ██ ', '  █ ', ' ██ ', '█  █'],
    Y: ['█  █', ' ██ ', ' █  ', ' █  ', ' █  '],
    Z: ['████', '   █', ' ██ ', '█   ', '████'],
    '0': [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
    '1': [' █ ', '██ ', ' █ ', ' █ ', '███'],
    '2': ['███ ', '   █', ' ██ ', '█   ', '████'],
    '3': ['███ ', '   █', ' ██ ', '   █', '███ '],
    '4': ['█  █', '█  █', '████', '   █', '   █'],
    '5': ['████', '█   ', '███ ', '   █', '███ '],
    '6': [' ███', '█   ', '███ ', '█  █', ' ██ '],
    '7': ['████', '   █', '  █ ', ' █  ', ' █  '],
    '8': [' ██ ', '█  █', ' ██ ', '█  █', ' ██ '],
    '9': [' ██ ', '█  █', ' ███', '   █', '███ '],
    ' ': ['  ', '  ', '  ', '  ', '  '],
    '!': ['█', '█', '█', ' ', '█'],
    '?': ['███ ', '   █', ' ██ ', '    ', ' █  '],
    '.': [' ', ' ', ' ', ' ', '█'],
    ',': [' ', ' ', ' ', '█', '█'],
    '-': ['    ', '    ', '████', '    ', '    '],
    ':': [' ', '█', ' ', '█', ' '],
    '/': ['   █', '  █ ', ' █  ', '█   ', '█   ']
  };

  function bigText(text) {
    var rows = ['', '', '', '', ''];
    Array.from(text.toUpperCase()).forEach(function (ch) {
      var g = FONT[ch];
      if (!g) g = FONT['?'];
      for (var i = 0; i < 5; i++) rows[i] += g[i] + ' ';
    });
    return rows;
  }

  def('figlet', {
    group: 'text',
    usage: 'figlet <text>',
    desc: { ja: '大きな文字で書く', en: 'write it big' },
    run: function (args) {
      if (!args.length) return usage('figlet <text>');
      var text = joined(args).slice(0, 14);
      var el = document.createElement('div');
      el.className = 'banner';
      el.textContent = bigText(text).join('\n');
      return ['', { node: el }, ''];
    }
  });

  var MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.'
  };

  def('morse', {
    group: 'text',
    usage: 'morse <text>',
    desc: { ja: 'モールス符号にする', en: 'convert to Morse code' },
    run: function (args) {
      if (!args.length) return usage('morse <text>');
      var out = joined(args).toUpperCase().split('').map(function (c) {
        if (c === ' ') return '/';
        return MORSE[c] || '?';
      }).join(' ');
      return [[{ t: out, c: 'accent' }]];
    }
  });

  var NATO = {
    A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot',
    G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima',
    M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo',
    S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey',
    X: 'X-ray', Y: 'Yankee', Z: 'Zulu'
  };

  def('nato', {
    group: 'text',
    usage: 'nato <text>',
    desc: { ja: '通話表（アルファ・ブラボー…）で読む', en: 'spell it with the NATO alphabet' },
    run: function (args) {
      if (!args.length) return usage('nato <text>');
      var out = joined(args).toUpperCase().split('').map(function (c) {
        return NATO[c] || (c === ' ' ? '/' : c);
      }).join(' ');
      return [[{ t: out, c: 'accent' }]];
    }
  });

  /* --- 電卓（eval は使わず自前で解く） --- */
  function calc(expr) {
    var s = expr.replace(/\s+/g, ''), i = 0;

    function primary() {
      if (s[i] === '(') {
        i++;
        var v = addSub();
        if (s[i] !== ')') throw new Error('paren');
        i++;
        return v;
      }
      if (s[i] === '-') { i++; return -primary(); }
      if (s[i] === '+') { i++; return primary(); }
      var m = /^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/.exec(s.slice(i));
      if (!m) throw new Error('number');
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function power() {
      var v = primary();
      while (s[i] === '^') { i++; v = Math.pow(v, primary()); }
      return v;
    }
    function mulDiv() {
      var v = power();
      while (i < s.length && '*/%'.indexOf(s[i]) !== -1) {
        var op = s[i++], r = power();
        v = op === '*' ? v * r : op === '/' ? v / r : v % r;
      }
      return v;
    }
    function addSub() {
      var v = mulDiv();
      while (i < s.length && (s[i] === '+' || s[i] === '-')) {
        var op = s[i++], r = mulDiv();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    var val = addSub();
    if (i < s.length) throw new Error('trailing');
    return val;
  }

  def('calc', {
    group: 'text',
    usage: 'calc <式>',
    desc: { ja: '計算する（+ - * / % ^ と括弧）', en: 'do arithmetic (+ - * / % ^ and parentheses)' },
    run: function (args) {
      if (!args.length) return usage('calc 12*(3+4)');
      try {
        var v = calc(joined(args));
        if (!isFinite(v)) return err(L('答えが出せません（0 で割ったかもしれません）。', 'not a finite number (division by zero?)'));
        return [[{ t: joined(args) + ' = ', c: 'dim' }, { t: String(Math.round(v * 1e10) / 1e10), c: 'accent bold' }]];
      } catch (e) {
        return err(L('式が読み取れませんでした。使えるのは数字と + - * / % ^ ( ) です。',
                     'could not read that. Use numbers and + - * / % ^ ( ).'));
      }
    }
  });

  /* =====================================================================
     お遊び
     ===================================================================== */

  def('cowsay', {
    group: 'fun',
    usage: 'cowsay <text>',
    desc: { ja: '牛にしゃべらせる', en: 'let the cow say it' },
    run: function (args) {
      var text = joined(args) || L('こんにちは', 'hello');
      var w = TB.width(text);
      var el = document.createElement('div');
      el.style.whiteSpace = 'pre';
      el.textContent = [
        ' ' + '_'.repeat(w + 2),
        '< ' + text + ' >',
        ' ' + '-'.repeat(w + 2),
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )\\/\\',
        '                ||----w |',
        '                ||     ||'
      ].join('\n');
      return ['', { node: el }, ''];
    }
  });

  var BALL = [
    { ja: 'たぶん そう', en: 'It is certain' },
    { ja: 'まちがいない', en: 'Without a doubt' },
    { ja: 'やってみるといい', en: 'Go for it' },
    { ja: 'いまは やめておこう', en: 'Better not tell you now' },
    { ja: 'もう一度きいて', en: 'Ask again later' },
    { ja: 'たぶん ちがう', en: 'My sources say no' },
    { ja: 'あまり期待しないで', en: "Don't count on it" },
    { ja: 'いい方向に向かっている', en: 'Signs point to yes' }
  ];

  def('8ball', {
    group: 'fun',
    usage: '8ball <質問>',
    desc: { ja: '占ってもらう', en: 'ask the magic 8-ball' },
    run: function (args) {
      if (!args.length) return warn(L('何か聞いてみてください。例: 8ball 明日は晴れる？',
                                      'Ask something. e.g. 8ball will it rain?'));
      return ['', [{ t: '  🎱  ', c: 'dim' }, { t: t(pick(BALL)), c: 'accent bold' }], ''];
    }
  });

  def('roll', {
    group: 'fun',
    usage: 'roll [2d6]',
    desc: { ja: 'さいころを振る', en: 'roll dice' },
    run: function (args) {
      var spec = (args[0] || '1d6').toLowerCase();
      var m = /^(\d*)d(\d+)$/.exec(spec);
      if (!m) return usage('roll 2d6');
      var n = Math.min(parseInt(m[1] || '1', 10), 20), faces = Math.min(parseInt(m[2], 10), 1000);
      if (!n || !faces) return usage('roll 2d6');
      var rolls = [], total = 0;
      for (var i = 0; i < n; i++) { var v = 1 + rnd(faces); rolls.push(v); total += v; }
      return [[{ t: rolls.join(' + '), c: '' }, { t: '  =  ', c: 'dim' }, { t: String(total), c: 'accent bold' }]];
    }
  });

  def('flip', {
    group: 'fun',
    desc: { ja: 'コインを投げる', en: 'flip a coin' },
    run: function () {
      var head = Math.random() < 0.5;
      return [[{ t: head ? L('表', 'heads') : L('裏', 'tails'), c: 'accent bold' }]];
    }
  });

  def('choose', {
    group: 'fun',
    usage: 'choose <A> <B> ...',
    desc: { ja: '迷ったときに選んでくれる', en: 'pick one for you' },
    run: function (args) {
      if (args.length < 2) return usage('choose ' + L('うどん そば', 'tea coffee'));
      return [[{ t: L('こちらでどうぞ: ', 'Take this one: '), c: 'dim' }, { t: pick(args), c: 'accent bold' }]];
    }
  });

  var JOKES = [
    { ja: 'バグは「仕様です」と言い張ると、仕様のバグになる。', en: 'Call it a feature and the bug becomes a spec bug.' },
    { ja: '「あとで直す」は、たいてい「誰かが直す」の意味。', en: '"Fix it later" usually means "someone else fixes it".' },
    { ja: '動いているコードには触るな。ただし触らないと動かなくなる。', en: "Don't touch working code. It stops working if you don't." },
    { ja: '2 つの難問: キャッシュの無効化と、名前を付けること。', en: 'Two hard things: cache invalidation and naming things.' },
    { ja: '本番でだけ再現するバグは、たいてい時計のせい。', en: 'If it only breaks in production, suspect the clock.' },
    { ja: 'セミコロンを 1 つ足すと、1 時間が返ってくる。', en: 'One semicolon can buy back an hour.' }
  ];

  def('joke', {
    group: 'fun',
    desc: { ja: '軽口をひとつ', en: 'a small joke' },
    run: function () { return ['', [{ t: '  ' + t(pick(JOKES)), c: 'accent' }], '']; }
  });

  var WEATHER = [
    { ja: '快晴。コードもよく通る。', en: 'Clear skies. The build passes.' },
    { ja: 'ときどきバグ。のち収束。', en: 'Scattered bugs, clearing by evening.' },
    { ja: 'キャッシュのち再読み込み。', en: 'Cache with a chance of refresh.' },
    { ja: '深夜に濃いコーヒー注意報。', en: 'Strong coffee advisory after midnight.' }
  ];

  def('weather', {
    group: 'fun',
    desc: { ja: '天気らしきもの（演出）', en: 'a forecast of sorts (pretend)' },
    run: function () {
      return ['',
        [{ t: '   \\   /   ', c: 'warn' }],
        [{ t: '    .-.    ', c: 'warn' }, { t: '   ' + t(pick(WEATHER)), c: 'accent' }],
        [{ t: ' ― (   ) ― ', c: 'warn' }, { t: '   ' + (18 + rnd(10)) + '°C', c: 'dim' }],
        [{ t: '    `-᾿    ', c: 'warn' }],
        [{ t: '   /   \\   ', c: 'warn' }],
        '', [{ t: L('（窓の外は見ていません）', '(not actually looking out of the window)'), c: 'dim' }], ''];
    }
  });

  def('coffee', {
    group: 'fun',
    desc: { ja: 'コーヒーを淹れようとする', en: 'attempt to brew coffee' },
    run: function () {
      var el = document.createElement('div');
      el.style.whiteSpace = 'pre';
      el.textContent = [
        '      (  )   (   )  )',
        '       ) (   )  (  (',
        '       ( )  (    ) )',
        '       _____________',
        '      <_____________> ___',
        '      |             |/ _ \\',
        '      |               | | |',
        '      |               |_| |',
        '   ___|             |\\___/',
        '  /    \\___________/    \\',
        '  \\_____________________/'
      ].join('\n');
      return ['', { node: el },
        [{ t: 'HTTP 418 — ' + L('私はティーポットです。', "I'm a teapot."), c: 'warn' }], ''];
    }
  });

  def('clock', {
    group: 'fun',
    desc: { ja: '大きな時計。何かキーを押すと戻る', en: 'a big clock; press any key to stop' },
    run: function () {
      var el = document.createElement('div');
      el.className = 'banner';
      TB.Term.print({ node: el });
      function tick() {
        var d = new Date();
        var text = String(d.getHours()).padStart(2, '0') + ':' +
                   String(d.getMinutes()).padStart(2, '0') + ':' +
                   String(d.getSeconds()).padStart(2, '0');
        el.textContent = bigText(text).join('\n');
      }
      tick();
      var timer = setInterval(tick, 1000);
      TB.Term.printAll([[{ t: L('何かキーを押すと戻ります。', 'Press any key to return.'), c: 'dim' }]]);
      return new Promise(function (resolve) {
        TB.Term.capture(function () {
          clearInterval(timer);
          TB.Term.release();
          resolve(['']);
        });
      });
    }
  });

  def('hack', {
    group: 'fun',
    hidden: true,
    desc: { ja: 'それっぽい画面を流す（何も起きません）', en: 'a very fake hacking screen' },
    run: function () {
      var steps = [
        'connecting to mainframe ............ ok',
        'bypassing firewall ................. ok',
        'decrypting payload ................. ok',
        'downloading the internet ........... 98%',
        'downloading the internet ........... 99%',
        'access granted.'
      ];
      return new Promise(function (resolve) {
        var i = 0;
        (function step() {
          if (i >= steps.length) {
            resolve(['', [{ t: L('……という画面でした。何も起きていません。',
                                 '…and none of that was real.'), c: 'dim' }], '']);
            return;
          }
          TB.Term.printAll([[{ t: steps[i++], c: 'accent' }]]);
          setTimeout(step, 380);
        })();
      });
    }
  });

  /* 別名をまとめて足す */
  var MORE_ALIAS = {
    cd_: 'cd', chdir: 'cd', ipconfig_: 'ipconfig',
    printenv: 'env', whereis: 'which', bc: 'calc', expr: 'calc',
    cls_: 'clear', wget: 'curl', less: 'cat', more: 'cat', nano: 'cat', vi: 'cat',
    dice: 'roll', coin: 'flip', fortune_: 'fortune', say: 'cowsay',
    '電卓': 'calc', 'カレンダー': 'cal', '時計': 'clock', 'さいころ': 'roll'
  };
  Object.keys(MORE_ALIAS).forEach(function (k) {
    if (k.slice(-1) === '_') return;      // 予約（同名コマンドがあるもの）は入れない
    TB.alias[k] = MORE_ALIAS[k];
  });
})();
