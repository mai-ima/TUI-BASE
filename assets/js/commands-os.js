/*
 * commands-os.js — Windows 以外の道具箱。
 *   mac     … macOS のターミナルでおなじみのもの
 *   linux   … Linux のディストリビューションでよく使うもの
 *   android … adb やシェルで打つもの
 *   ios     … 開発者向けのコマンドと、電話の中の機能
 *
 * 本物の機械を触れるわけではないので、多くは「それらしい表示」を返すだけ。
 * ただし say / beep / vibrate / battery / pbcopy / share / fullscreen などは
 * ブラウザの機能をそのまま使っていて、実際に動く。
 */
(function () {
  'use strict';

  var TB = window.TB;
  var def = TB.def;

  function ja() { return TB.state.lang === 'ja'; }
  function L(j, e) { return ja() ? j : e; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function line(text, cls) { return [{ t: text, c: cls || '' }]; }
  function dim(text) { return [line(text, 'dim')]; }
  function warn(text) { return [line(text, 'warn')]; }
  function note(j, e) { return line(L('（' + j + '）', '(' + e + ')'), 'dim'); }
  function usage(u) { return warn(TB.ui('usage') + ': ' + u); }

  /* =====================================================================
     macOS
     ===================================================================== */

  def('sw_vers', {
    group: 'mac',
    desc: { ja: 'OS の版を表示（演出）', en: 'print the OS version (pretend)' },
    run: function () {
      return ['',
        { row: ['ProductName', 'TUI-BASE'] },
        { row: ['ProductVersion', window.CONTENT.meta.version] },
        { row: ['BuildVersion', '26A111'] },
        ''];
    }
  });

  def('say', {
    group: 'mac',
    usage: 'say <text>',
    desc: { ja: '声に出して読む（本当に鳴ります）', en: 'speak the text out loud (really)' },
    run: function (args) {
      if (!args.length) return usage('say ' + L('こんにちは', 'hello there'));
      var text = args.join(' ');
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return warn(L('このブラウザは読み上げに対応していません。', 'This browser cannot speak.'));
      }
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = ja() ? 'ja-JP' : 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        return [line('🔊 ' + text, 'accent'),
                note('音が出ない場合は、端末の音量と自動再生の設定を確認してください',
                     'no sound? check the volume and autoplay settings')];
      } catch (e) {
        return warn(L('読み上げられませんでした。', 'Could not speak that.'));
      }
    }
  });

  def('pbcopy', {
    group: 'mac',
    usage: 'pbcopy <text>',
    desc: { ja: 'クリップボードに入れる（本当に入ります）', en: 'copy to the clipboard (really)' },
    run: function (args) {
      if (!args.length) return usage('pbcopy <text>');
      var text = args.join(' ');
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        return warn(L('このブラウザでは書き込めません。', 'Clipboard writing is not available here.'));
      }
      return navigator.clipboard.writeText(text).then(function () {
        return [line(L('クリップボードに入れました: ', 'Copied: ') + text, 'accent')];
      }, function () {
        return warn(L('クリップボードに入れられませんでした（許可が要ります）。',
                      'Could not copy — the browser refused permission.'));
      });
    }
  });

  def('pbpaste', {
    group: 'mac',
    desc: { ja: 'クリップボードの中身を出す', en: 'print what is on the clipboard' },
    run: function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        return warn(L('このブラウザでは読み取れません。', 'Clipboard reading is not available here.'));
      }
      return navigator.clipboard.readText().then(function (text) {
        return text ? [line(text)] : dim(L('クリップボードは空でした。', 'The clipboard is empty.'));
      }, function () {
        return warn(L('読み取りを断られました（ブラウザの許可が要ります）。',
                      'The browser refused to hand over the clipboard.'));
      });
    }
  });

  def('mdfind', {
    group: 'mac',
    usage: 'mdfind <word>',
    desc: { ja: 'Spotlight のように中身から探す', en: 'search file contents, Spotlight style' },
    run: function (args) {
      if (!args.length) return usage('mdfind <word>');
      return TB.commands.grep.run(args);
    }
  });

  def('brew', {
    group: 'mac',
    usage: 'brew [install <name>]',
    desc: { ja: 'パッケージを入れる真似をする（演出）', en: 'pretend to install a package' },
    run: function (args) {
      if (args[0] === 'install' && args[1]) {
        return ['',
          line('==> Fetching ' + args[1], 'accent'),
          line('==> Pouring ' + args[1] + '--1.0.0.tui_base.bottle.tar.gz', 'dim'),
          line('🍺  /usr/local/Cellar/' + args[1] + '/1.0.0: 3 files, 12KB', 'accent'),
          note('入っていません。気分だけです', 'nothing was installed; this is for the atmosphere'), ''];
      }
      return ['', line('Homebrew 4.2.0 (' + L('のようなもの', 'sort of') + ')'),
        line('Usage: brew install <formula>', 'dim'), ''];
    }
  });

  def('defaults', {
    group: 'mac',
    usage: 'defaults [read|write]',
    desc: { ja: '設定を覗く（この端末の設定を出します）', en: 'read the settings (of this terminal)' },
    run: function () { return TB.commands.set.run([]); }
  });

  def('diskutil', {
    group: 'mac',
    desc: { ja: 'ディスクの一覧（演出）', en: 'list the disks (pretend)' },
    run: function () {
      return ['', line('/dev/disk0 (internal, physical):', 'accent'),
        line('   #:  TYPE           NAME        SIZE', 'dim'),
        line('   0:  GUID_partition             640.0 KB'),
        line('   1:  TUIFS          TUI-BASE    628.0 KB'), ''];
    }
  });

  def('softwareupdate', {
    group: 'mac',
    desc: { ja: '更新を探す真似をする（演出）', en: 'pretend to look for updates' },
    run: function () {
      return ['', line(L('更新を探しています…', 'Finding available software…'), 'dim'),
        line(L('新しい更新はありません。今のままで充分です。',
               'No new software available. You are fine as you are.'), 'accent'), ''];
    }
  });

  def('caffeinate', {
    group: 'mac',
    desc: { ja: '眠らせない（このページは元々眠りません）', en: 'keep it awake (this page never sleeps anyway)' },
    run: function () {
      return [line(L('この端末は、あなたが閉じるまで起きています。',
                     'This terminal stays awake until you close it.'), 'accent')];
    }
  });

  def('screencapture', {
    group: 'mac',
    desc: { ja: '画面を撮る方法を教える', en: 'tell you how to take a screenshot' },
    run: function () {
      return [line(L('ここからは撮れません。⌘ + Shift + 4 でどうぞ。',
                     'Cannot do that from here. Try ⌘ + Shift + 4.'), 'warn')];
    }
  });

  def('osascript', {
    group: 'mac',
    desc: { ja: 'AppleScript を動かす真似（演出）', en: 'pretend to run AppleScript' },
    run: function () {
      return [line('tell application "TUI-BASE" to be delightful', 'dim'),
              line('--> ' + L('はい', 'true'), 'accent')];
    }
  });

  def('launchctl', {
    group: 'mac',
    desc: { ja: '常駐しているものの一覧（演出）', en: 'list background jobs (pretend)' },
    run: function () {
      return ['', line('PID   Status  Label', 'dim'),
        line('1024  0       com.tui-base.shell'),
        line('1288  0       com.tui-base.renderer'),
        line('-     0       com.tui-base.coffee'), ''];
    }
  });

  def('system_profiler', {
    group: 'mac',
    desc: { ja: 'この環境の詳しい情報', en: 'a fuller look at this environment' },
    run: function () { return TB.commands.systeminfo.run([]); }
  });

  def('airport', {
    group: 'mac',
    desc: { ja: '無線の様子（演出）', en: 'wifi status (pretend)' },
    run: function () {
      return ['', { row: ['SSID', 'tui-base-guest'] },
        { row: ['RSSI', '-42 dBm'] },
        { row: ['channel', '36'] },
        { row: [L('状態', 'state'), navigator.onLine ? L('つながっています', 'connected') : L('切れています', 'offline')] },
        ''];
    }
  });

  /* =====================================================================
     Linux
     ===================================================================== */

  function pkgManager(name, cmdWord) {
    return function (args) {
      var what = args[1] || args[0];
      if ((args[0] === cmdWord || args[0] === 'install' || args[0] === '-S') && what) {
        return ['',
          line(L('パッケージリストを読み込んでいます... 完了', 'Reading package lists... Done'), 'dim'),
          line(L('依存関係ツリーを作成しています... 完了', 'Building dependency tree... Done'), 'dim'),
          line(what + ' (1.0.0-1) ' + L('を展開しています…', 'unpacking…'), ''),
          line(L('…と見せかけて、何も入れていません。', '…except nothing was installed.'), 'accent'), ''];
      }
      return ['', line(name + ' 1.0 (' + L('のようなもの', 'sort of') + ')'),
        line(L('例: ', 'e.g. ') + name + ' ' + cmdWord + ' vim', 'dim'), ''];
    };
  }

  def('apt', {
    group: 'linux',
    usage: 'apt [install <name>]',
    desc: { ja: 'Debian 系のパッケージ管理（演出）', en: 'Debian package manager (pretend)' },
    run: pkgManager('apt', 'install')
  });

  def('pacman', {
    group: 'linux',
    usage: 'pacman [-S <name>]',
    desc: { ja: 'Arch のパッケージ管理（演出）', en: 'Arch package manager (pretend)' },
    run: pkgManager('pacman', '-S')
  });

  def('dnf', {
    group: 'linux',
    usage: 'dnf [install <name>]',
    desc: { ja: 'Fedora 系のパッケージ管理（演出）', en: 'Fedora package manager (pretend)' },
    run: pkgManager('dnf', 'install')
  });

  def('systemctl', {
    group: 'linux',
    usage: 'systemctl [status <name>]',
    desc: { ja: 'サービスの様子を見る（演出）', en: 'look at services (pretend)' },
    run: function (args) {
      var name = args[1] || 'tuish';
      if (args[0] === 'status' || !args.length) {
        return ['',
          [{ t: '● ', c: 'accent' }, { t: name + '.service - TUI-BASE ' + L('の心臓部', 'core') }],
          { row: ['Loaded', 'loaded (/etc/systemd/system/' + name + '.service; enabled)'] },
          { row: ['Active', [{ t: 'active (running)', c: 'accent' }]] },
          { row: ['Memory', '12.4M'] },
          ''];
      }
      return [line(name + ': ' + L('変えられません。読み取り専用の世界です。',
                                   'cannot change it — this world is read-only.'), 'warn')];
    }
  });

  def('journalctl', {
    group: 'linux',
    desc: { ja: 'ログを見る（演出）', en: 'read the journal (pretend)' },
    run: function () {
      var now = new Date().toTimeString().slice(0, 8);
      return ['',
        line(now + ' tui-base systemd[1]: Started TUI-BASE shell.', 'dim'),
        line(now + ' tui-base tuish[1024]: theme=' + TB.currentTheme(), 'dim'),
        line(now + ' tui-base tuish[1024]: ' + L('訪問者が 1 人います。', 'one visitor is present.'), 'accent'),
        ''];
    }
  });

  def('dmesg', {
    group: 'linux',
    desc: { ja: '起動時のメッセージ（演出）', en: 'kernel messages (pretend)' },
    run: function () {
      return ['',
        line('[    0.000000] TUI-BASE kernel booting…', 'dim'),
        line('[    0.128000] terminal: 80x24 text mode', 'dim'),
        line('[    0.342000] themes: 5 palettes registered', 'dim'),
        line('[    0.501000] games: 12 entries found', 'dim'),
        line('[    0.777000] ' + L('準備ができました。', 'ready.'), 'accent'), ''];
    }
  });

  def('lsblk', {
    group: 'linux',
    desc: { ja: 'ブロックデバイスの一覧（演出）', en: 'list block devices (pretend)' },
    run: function () {
      return ['', line('NAME   SIZE TYPE MOUNTPOINT', 'dim'),
        line('tui0  640K disk '), line('└─tui0p1 628K part /'), ''];
    }
  });

  def('lscpu', {
    group: 'linux',
    desc: { ja: 'CPU の情報（一部は本物）', en: 'CPU information (partly real)' },
    run: function () {
      return ['',
        { row: ['Architecture', 'web'] },
        { row: ['CPU(s)', String(navigator.hardwareConcurrency || '?')] },
        { row: ['Model name', 'WebEngine Virtual Core'] },
        { row: ['Vendor', navigator.vendor || 'unknown'] },
        ''];
    }
  });

  def('lsusb', {
    group: 'linux',
    desc: { ja: 'つながっている機器（演出）', en: 'connected devices (pretend)' },
    run: function () {
      return ['', line('Bus 001 Device 001: ID 1d6b:0002 Keyboard'),
        line('Bus 001 Device 002: ID 1d6b:0003 Pointing device'),
        line('Bus 001 Device 003: ID 0000:0042 Coffee mug (unsupported)'), ''];
    }
  });

  def('lspci', {
    group: 'linux',
    desc: { ja: '内部の機器（演出）', en: 'internal devices (pretend)' },
    run: function () {
      return ['', line('00:00.0 Host bridge: WebEngine Root Complex'),
        line('00:02.0 VGA compatible controller: Text Mode Adapter'), ''];
    }
  });

  def('ip', {
    group: 'linux',
    usage: 'ip [a]',
    desc: { ja: 'ネットワークの様子（演出）', en: 'network addresses (pretend)' },
    run: function () {
      return ['',
        line('1: lo: <LOOPBACK,UP> mtu 65536', 'dim'),
        line('    inet 127.0.0.1/8 scope host lo'),
        line('2: web0: <BROADCAST,UP> mtu 1500', 'dim'),
        line('    inet 10.0.0.42/24 scope global web0'),
        note('本物のネットワークではありません', 'not your real network'), ''];
    }
  });

  def('ifconfig', {
    group: 'linux',
    desc: { ja: '昔ながらのネットワーク表示（演出）', en: 'the older network view (pretend)' },
    run: function () { return TB.commands.ip.run([]); }
  });

  def('lsb_release', {
    group: 'linux',
    desc: { ja: 'ディストリビューション名（演出）', en: 'the distribution name (pretend)' },
    run: function () {
      return ['',
        { row: ['Distributor ID', 'TUI-BASE'] },
        { row: ['Description', 'TUI-BASE GNU/Web ' + window.CONTENT.meta.version] },
        { row: ['Codename', 'gallant'] },
        ''];
    }
  });

  def('mount', {
    group: 'linux',
    desc: { ja: 'マウントの一覧（演出）', en: 'what is mounted (pretend)' },
    run: function () {
      return ['', line('/dev/tui0 on / type tuifs (ro,relatime)'),
        line('tmpfs on /tmp type tmpfs (rw,nosuid)'), ''];
    }
  });

  def('service', {
    group: 'linux',
    usage: 'service <name> status',
    desc: { ja: '古い書き方のサービス操作（演出）', en: 'the older service command (pretend)' },
    run: function (args) { return TB.commands.systemctl.run(['status', args[0] || 'tuish']); }
  });

  def('snap', {
    group: 'linux',
    desc: { ja: 'snap のパッケージ一覧（演出）', en: 'list snap packages (pretend)' },
    run: function () {
      return ['', line('Name      Version  Publisher', 'dim'),
        line('tuish     1.0.0    tui-base'),
        line('coffee    0.4.1    kitchen'), ''];
    }
  });

  def('modprobe', {
    group: 'linux',
    usage: 'modprobe <module>',
    desc: { ja: 'モジュールを読み込む真似（演出）', en: 'pretend to load a module' },
    run: function (args) {
      var m = args[0] || 'tui_fun';
      return [line('modprobe: ' + m + ' ' + L('を読み込みました（気持ちだけ）',
                                              'loaded (in spirit)'), 'accent')];
    }
  });

  def('htop', {
    group: 'linux',
    desc: { ja: '色付きの top（中身は top と同じ）', en: 'a colourful top (same content)' },
    run: function () { return TB.commands.top.run([]); }
  });

  function editorJoke(name, hint) {
    return {
      group: 'linux',
      usage: name + ' [file]',
      desc: { ja: name + ' を開こうとする', en: 'try to open ' + name },
      run: function (args) {
        var out = [line(L(name + ' は入っていません。', name + ' is not installed here.'), 'warn')];
        if (args[0]) out.push(line(L('中身を見るだけなら: cat ' + args[0],
                                     'to just read it: cat ' + args[0]), 'dim'));
        out.push(line(TB.t(hint), 'dim'));
        return out;
      }
    };
  }

  def('vim', editorJoke('vim', { ja: '（出られなくなる心配もありません）', en: '(so you cannot get stuck in it, either)' }));
  def('emacs', editorJoke('emacs', { ja: '（指もつりません）', en: '(your fingers are safe)' }));
  def('nano', editorJoke('nano', { ja: '（いちばん優しいやつですが、やはりありません）', en: '(the friendly one — still absent)' }));

  def('lolcat', {
    group: 'linux',
    usage: 'lolcat <text>',
    desc: { ja: '虹色にする', en: 'paint it in rainbow colours' },
    run: function (args) {
      if (!args.length) return usage('lolcat ' + L('たのしい', 'hello world'));
      var text = args.join(' ');
      var el = document.createElement('span');
      Array.from(text).forEach(function (ch, i) {
        var s = document.createElement('span');
        s.style.color = 'hsl(' + ((i * 14) % 360) + ', 80%, 60%)';
        s.textContent = ch;
        el.appendChild(s);
      });
      return [{ node: el }];
    }
  });

  def('xdg-open', {
    group: 'linux',
    usage: 'xdg-open <url>',
    desc: { ja: 'リンクを開く（open と同じ）', en: 'open a link (same as open)' },
    run: function (args) { return TB.commands.open.run(args); }
  });

  /* =====================================================================
     Android
     ===================================================================== */

  def('adb', {
    group: 'android',
    usage: 'adb [devices|shell]',
    desc: { ja: '端末につなぐ真似をする（演出）', en: 'pretend to talk to a device' },
    run: function (args) {
      if (args[0] === 'devices') {
        return ['', line('List of devices attached', 'dim'),
          line('tuibase0042\tdevice', 'accent'), ''];
      }
      if (args[0] === 'shell') {
        return [line(L('もうシェルの中にいます。', 'You are already in the shell.'), 'accent')];
      }
      return ['', line('Android Debug Bridge version 1.0.0 (' + L('のようなもの', 'sort of') + ')'),
        line(L('例: adb devices / adb shell', 'e.g. adb devices / adb shell'), 'dim'), ''];
    }
  });

  def('fastboot', {
    group: 'android',
    desc: { ja: 'ブートローダに話しかける真似（演出）', en: 'pretend to talk to a bootloader' },
    run: function () {
      return [line('< waiting for any device >', 'dim'),
              line(L('…このページには電源ボタンがありません。',
                     '…this page has no power button to hold.'), 'warn')];
    }
  });

  def('pm', {
    group: 'android',
    usage: 'pm list packages',
    desc: { ja: '入っているものの一覧（演出）', en: 'list packages (pretend)' },
    run: function () {
      return ['', line('package:com.tuibase.terminal'),
        line('package:com.tuibase.games'),
        line('package:com.tuibase.themes'),
        line('package:com.tuibase.coffee'), ''];
    }
  });

  def('am', {
    group: 'android',
    usage: 'am start <name>',
    desc: { ja: 'アプリを起動する真似（ゲーム名なら本当に始まります）',
            en: 'start something (a game name really starts it)' },
    run: function (args) {
      var name = (args[1] || args[0] || '').replace(/^com\.tuibase\./, '');
      if (name && TB.commands[name] && (TB.commands[name].group === 'game')) {
        TB.Term.printAll([line('Starting: Intent { act=android.intent.action.MAIN cmp=' + name + ' }', 'dim')]);
        return TB.commands[name].run([]);
      }
      return [line('Starting: Intent { cmp=com.tuibase/' + (name || 'main') + ' }', 'dim'),
              line(L('起動しました（気持ちのうえで）。ゲーム名を渡すと本当に始まります。',
                     'Started (in spirit). Pass a game name to really start one.'), 'accent')];
    }
  });

  def('getprop', {
    group: 'android',
    desc: { ja: '端末の設定値（一部は本物）', en: 'device properties (partly real)' },
    run: function () {
      return ['',
        line('[ro.product.model]: [TUI-BASE]'),
        line('[ro.build.version.release]: [' + window.CONTENT.meta.version + ']'),
        line('[ro.product.locale]: [' + (navigator.language || 'ja-JP') + ']'),
        line('[persist.sys.theme]: [' + TB.currentTheme() + ']'),
        line('[persist.sys.timezone]: [' + (Intl.DateTimeFormat().resolvedOptions().timeZone || '?') + ']'),
        ''];
    }
  });

  def('logcat', {
    group: 'android',
    desc: { ja: 'ログを流す（演出）', en: 'stream the log (pretend)' },
    run: function () {
      var now = new Date().toTimeString().slice(0, 8);
      return ['',
        line(now + ' I/tuish   ( 1024): ' + L('入力を待っています', 'waiting for input'), 'dim'),
        line(now + ' D/render  ( 1288): frame drawn', 'dim'),
        line(now + ' W/coffee  ( 4096): ' + L('カップが空です', 'cup is empty'), 'warn'),
        ''];
    }
  });

  def('dumpsys', {
    group: 'android',
    desc: { ja: '状態をまとめて出す（演出）', en: 'dump the system state (pretend)' },
    run: function () {
      return ['', line('DUMP OF SERVICE tuish:', 'accent'),
        { row: ['  visitors', '1'] },
        { row: ['  theme', TB.currentTheme()] },
        { row: ['  lang', TB.state.lang] },
        { row: ['  commands', String(Object.keys(TB.commands).length)] },
        ''];
    }
  });

  def('settings', {
    group: 'android',
    usage: 'settings [get|list]',
    desc: { ja: '設定を覗く（この端末の設定です）', en: 'peek at the settings (of this terminal)' },
    run: function () { return TB.commands.set.run([]); }
  });

  def('input', {
    group: 'android',
    usage: 'input text <text>',
    desc: { ja: '入力欄に文字を流し込む（本当に入ります）', en: 'type into the prompt for you (really)' },
    run: function (args) {
      var text = (args[0] === 'text' ? args.slice(1) : args).join(' ');
      if (!text) return usage('input text hello');
      TB.Term.setValue(text);
      return [line(L('入力欄に入れました。Enter を押すと実行されます。',
                     'Put it in the prompt. Press Enter to run it.'), 'accent')];
    }
  });

  def('wm', {
    group: 'android',
    desc: { ja: '画面の大きさ（本物）', en: 'the screen size (real)' },
    run: function () {
      return [line('Physical size: ' + window.screen.width + 'x' + window.screen.height),
              line('Window size: ' + window.innerWidth + 'x' + window.innerHeight),
              line('Density: ' + (window.devicePixelRatio || 1))];
    }
  });

  def('battery', {
    group: 'android',
    desc: { ja: '電池の残り（対応していれば本物）', en: 'battery level (real where supported)' },
    run: function () {
      if (!navigator.getBattery) {
        return warn(L('このブラウザは電池の状態を教えてくれません。',
                      'This browser will not tell us about the battery.'));
      }
      return navigator.getBattery().then(function (b) {
        var pct = Math.round(b.level * 100);
        return ['',
          [{ t: '  ' + TB.Kit.bar(pct, 100, 20) + '  ', c: pct > 20 ? 'accent' : 'err' }, { t: pct + '%' }],
          { row: [L('状態', 'state'), b.charging ? L('充電中', 'charging') : L('使用中', 'discharging')] },
          ''];
      }, function () {
        return warn(L('電池の状態を取れませんでした。', 'Could not read the battery.'));
      });
    }
  });

  def('vibrate', {
    group: 'android',
    usage: 'vibrate [ミリ秒]',
    desc: { ja: '震わせる（対応端末では本当に震えます）', en: 'buzz (really, on a phone)' },
    run: function (args) {
      var ms = Math.min(Math.max(parseInt(args[0], 10) || 200, 10), 2000);
      if (!navigator.vibrate) {
        return warn(L('この端末は震えません（たぶんパソコンです）。',
                      'Nothing to vibrate here — probably a desktop.'));
      }
      var ok = navigator.vibrate(ms);
      return [line(ok ? L(ms + ' ミリ秒ぶるっとしました。', 'Buzzed for ' + ms + 'ms.')
                      : L('震わせられませんでした。', 'The device declined to buzz.'),
                   ok ? 'accent' : 'warn')];
    }
  });

  def('share', {
    group: 'android',
    usage: 'share [text]',
    desc: { ja: '共有メニューを開く（対応端末では本当に開きます）', en: 'open the share sheet (really, where supported)' },
    run: function (args) {
      var text = args.join(' ') || 'TUI-BASE';
      if (!navigator.share) {
        return warn(L('このブラウザには共有メニューがありません。', 'No share sheet in this browser.'));
      }
      return navigator.share({ title: 'TUI-BASE', text: text, url: location.href })
        .then(function () { return [line(L('共有しました。', 'Shared.'), 'accent')]; },
              function () { return dim(L('共有はやめました。', 'Sharing was cancelled.')); });
    }
  });

  def('toast', {
    group: 'android',
    usage: 'toast <text>',
    desc: { ja: '画面の下に小さく出す（本当に出ます）', en: 'pop a little message at the bottom (really)' },
    run: function (args) {
      var text = args.join(' ') || L('こんにちは', 'hello');
      var el = document.createElement('div');
      el.className = 'toast';
      el.textContent = text;
      document.body.appendChild(el);
      setTimeout(function () { el.classList.add('go'); }, 2200);
      setTimeout(function () { el.remove(); }, 2800);
      return dim(L('下に出しました。', 'Popped it at the bottom.'));
    }
  });

  /* =====================================================================
     iOS
     ===================================================================== */

  def('ideviceinfo', {
    group: 'ios',
    desc: { ja: '端末の情報（一部は本物）', en: 'device information (partly real)' },
    run: function () {
      return ['',
        { row: ['DeviceName', window.CONTENT.meta.host] },
        { row: ['ProductType', 'TuiBase1,1'] },
        { row: ['ProductVersion', window.CONTENT.meta.version] },
        { row: ['ScreenSize', window.screen.width + 'x' + window.screen.height] },
        { row: ['Language', navigator.language || '-'] },
        ''];
    }
  });

  def('xcrun', {
    group: 'ios',
    usage: 'xcrun simctl list',
    desc: { ja: '開発道具を呼ぶ真似（演出）', en: 'pretend to call the developer tools' },
    run: function () { return TB.commands.simctl.run([]); }
  });

  def('simctl', {
    group: 'ios',
    desc: { ja: 'シミュレータの一覧（演出）', en: 'list simulators (pretend)' },
    run: function () {
      return ['', line('== Devices ==', 'accent'),
        line('-- TUI-BASE 1.0 --', 'dim'),
        line('    Terminal (7409-1F2B) (Booted)'),
        line('    Terminal mini (2E31-77A0) (Shutdown)'), ''];
    }
  });

  var SIRI = [
    { ja: 'ちょっと考えさせてください……はい、たぶん大丈夫です。', en: 'Let me think… yes, probably.' },
    { ja: 'それについては、web で見つけたものがあります（ありません）。', en: "Here's what I found on the web (nothing)." },
    { ja: 'すみません、それはよくわかりません。', en: "I'm not sure I understand." },
    { ja: 'いい質問ですね。答えは manual にあるかもしれません。', en: 'Good question. The manual may know.' }
  ];

  def('siri', {
    group: 'ios',
    usage: 'siri <話しかけたいこと>',
    desc: { ja: '話しかけてみる（返事は適当です）', en: 'ask it something (answers are improvised)' },
    run: function (args) {
      if (!args.length) return [line(L('はい、なんでしょう？', 'Mm-hmm?'), 'accent')];
      return ['', [{ t: '  ◗ ', c: 'accent-2' }, { t: TB.t(pick(SIRI)) }], ''];
    }
  });

  def('shortcuts', {
    group: 'ios',
    desc: { ja: 'ショートカットの一覧（このサイトの別名を出します）', en: 'list shortcuts (the aliases of this site)' },
    run: function () { return TB.commands.alias.run([]); }
  });

  def('springboard', {
    group: 'ios',
    desc: { ja: 'ホーム画面（メニューのこと）', en: 'the home screen (this menu)' },
    run: function () {
      return ['', line(L('ホーム画面はこの左（スマートフォンでは上）のメニューです。',
                         'Your home screen is the menu on the left (top on a phone).'), 'accent'),
        line(L('games でゲーム、manual で全コマンドが見られます。',
               'games for the games, manual for every command.'), 'dim'), ''];
    }
  });

  def('airdrop', {
    group: 'ios',
    desc: { ja: '近くの人に渡す真似（演出）', en: 'pretend to beam it to someone nearby' },
    run: function () {
      return [line(L('近くに端末が見つかりません。ここには誰もいません。',
                     'No devices nearby. It is just us here.'), 'warn')];
    }
  });

  def('facetime', {
    group: 'ios',
    desc: { ja: '通話しようとする（誰も出ません）', en: 'try to call (nobody answers)' },
    run: function () {
      return [line(L('呼び出しています……', 'Calling…'), 'dim'),
              line(L('応答がありません。テキストの世界にはカメラがないのです。',
                     'No answer. There are no cameras in a text world.'), 'warn')];
    }
  });

  def('haptic', {
    group: 'ios',
    desc: { ja: '軽く震わせる（対応端末のみ）', en: 'a light tap (supported devices only)' },
    run: function () { return TB.commands.vibrate.run(['40']); }
  });

  def('icloud', {
    group: 'ios',
    desc: { ja: '保存先の話（記録はこの端末の中だけです）', en: 'where things are saved (only in this browser)' },
    run: function () {
      return ['', line(L('雲には何も上がっていません。', 'Nothing has gone to any cloud.'), 'accent'),
        line(L('テーマ・言語・ゲームの記録は、このブラウザの中だけに残ります。',
               'Your theme, language and game records stay in this browser alone.'), 'dim'), ''];
    }
  });

  def('testflight', {
    group: 'ios',
    desc: { ja: '配布の真似（演出）', en: 'pretend to hand out a build' },
    run: function () {
      return [line(L('このビルドは常に最新です。招待は要りません。',
                     'This build is always the latest. No invite needed.'), 'accent')];
    }
  });

  def('xcodebuild', {
    group: 'ios',
    desc: { ja: 'ビルドする真似（演出）', en: 'pretend to build' },
    run: function () {
      return ['', line('** BUILD SUCCEEDED **', 'accent bold'),
        line(L('（ビルドするものが無いので、いつも成功します）',
               '(there is nothing to build, so it always succeeds)'), 'dim'), ''];
    }
  });

  /* =====================================================================
     どの OS でも使う小物
     ===================================================================== */

  def('beep', {
    group: 'sys',
    desc: { ja: '短い音を鳴らす（本当に鳴ります）', en: 'make a short sound (really)' },
    run: function () {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return warn(L('音が出せません。', 'No audio available here.'));
      try {
        var ctx = new Ctx();
        var osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
        setTimeout(function () { ctx.close(); }, 600);
        return [line('♪ beep', 'accent')];
      } catch (e) {
        return warn(L('鳴らせませんでした。', 'Could not make a sound.'));
      }
    }
  });

  def('fullscreen', {
    group: 'sys',
    desc: { ja: '全画面にする（本当に切り替わります）', en: 'go full screen (really)' },
    run: function () {
      var el = document.documentElement;
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          return dim(L('全画面をやめました。', 'Left full screen.'));
        }
        if (el.requestFullscreen) {
          el.requestFullscreen();
          return [line(L('全画面にしました。Esc で戻れます。', 'Full screen. Press Esc to leave.'), 'accent')];
        }
      } catch (e) { /* ignore */ }
      return warn(L('全画面にできませんでした。', 'Full screen was refused.'));
    }
  });

  /* 別名 */
  var A = {
    'apt-get': 'apt', yum: 'dnf', zypper: 'dnf',
    copy_text: 'pbcopy', clip: 'pbcopy', spotlight: 'mdfind',
    'adb-shell': 'adb', fdisk: 'lsblk', 'ios': 'ideviceinfo'
  };
  Object.keys(A).forEach(function (k) { TB.alias[k] = A[k]; });
})();
