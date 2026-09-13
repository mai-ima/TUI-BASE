/*
 * easter-eggs.js — help には出さず、manual にだけ載せるもの。
 *
 * すべて hidden: true。manual では ◆ の印が付いて一覧に出る。
 * コナミコマンド（↑↑↓↓←→←→ba）を入れると隠しテーマが開く。
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
  function art(text) {
    var el = document.createElement('div');
    el.style.whiteSpace = 'pre';
    el.textContent = text;
    return { node: el };
  }

  /** かくれコマンドをまとめて定義する */
  function egg(name, desc, run, usage) {
    def(name, { group: 'egg', hidden: true, usage: usage, desc: desc, run: run });
  }

  /* ---------- 昔からある合言葉 ------------------------------------------ */

  egg('xyzzy', { ja: '唱えてみる', en: 'say the magic word' }, function () {
    return [line(L('何も起こらない。', 'Nothing happens.'), 'dim')];
  });

  egg('42', { ja: '生命、宇宙、そして万物についての答え', en: 'the answer to life, the universe, and everything' }, function () {
    return ['', line('  42', 'accent bold'),
      line(L('  ……ただし、問いのほうは誰も覚えていません。',
             '  …though nobody remembers the question.'), 'dim'), ''];
  });

  egg('hello', { ja: 'あいさつを返す', en: 'say hello back' }, function () {
    return [line(L('こんにちは。よく来てくれました。', 'Hello there. Good of you to come.'), 'accent')];
  });

  egg('please', { ja: '丁寧に頼んでみる', en: 'ask nicely' }, function () {
    return [line(L('そういう言い方をされると、だいたいのことは通ります。',
                   'Ask like that and most things will be granted.'), 'accent')];
  });

  egg('make', { ja: 'make を動かそうとする', en: 'try to run make' }, function (args) {
    if (args.join(' ').toLowerCase().indexOf('love') !== -1) {
      return [line(L('make: *** ターゲット `love` を作る方法がわかりません。止めます。',
                     "make: *** No rule to make target `love'.  Stop."), 'warn')];
    }
    return [line(L('make: *** ターゲットが指定されていません。止めます。',
                   'make: *** No targets specified and no makefile found.  Stop.'), 'warn')];
  }, 'make [target]');

  egg(':q', { ja: 'vim から出ようとする', en: 'try to escape vim' }, function () {
    return [line(L('ここは vim ではありません。もう自由です。',
                   'This is not vim. You are already free.'), 'accent')];
  });
  TB.alias[':wq'] = ':q';
  TB.alias[':q!'] = ':q';
  TB.alias['ZZ'] = ':q';

  egg('cake', { ja: 'ケーキについて', en: 'about the cake' }, function () {
    return [line(L('ケーキは、うそです。', 'The cake is a lie.'), 'err')];
  });

  egg('tea', { ja: 'お茶を淹れる', en: 'make tea' }, function () {
    return ['', art([
      '      )  (',
      '     (   ) )',
      '      ) ( (',
      '    _______)_',
      ' .-\'---------|',
      '( C|/\\/\\/\\/\\/|',
      " '-./\\/\\/\\/\\/|",
      '   \'_________\'',
      "    '-------'"
    ].join('\n')),
      line(L('どうぞ。こちらは淹れられます。', 'Here you are. Tea we can do.'), 'accent'), ''];
  });

  egg('telnet', { ja: '遠い昔、遥か彼方の銀河系へ', en: 'a long time ago in a galaxy far, far away' },
    function () {
      return ['', line('Trying towel.blinkenlights.nl…', 'dim'),
        line(L('……つながりませんでした。でも、あの映画は心の中で流れています。',
               '…no connection. But the film plays on in your heart.'), 'accent'), ''];
    });

  egg('sudo', { ja: '管理者として実行する（お願いの仕方で結果が変わる）',
                en: 'run as root (the phrasing matters)' }, function (args) {
    var what = args.join(' ').toLowerCase();
    if (/make me a sandwich/.test(what)) {
      return [line(L('わかりました。……はい、サンドイッチです。', 'Okay. …Here is your sandwich.'), 'accent')];
    }
    if (/rm\s+-rf?\s+\//.test(what)) {
      return [line(L('だめです。そこにはこのサイト全部が入っています。',
                     'No. The entire site lives there.'), 'err')];
    }
    if (what) {
      return [line(L('権限がありません。この件は記録されました。',
                     'Permission denied. This incident has been reported.'), 'err'),
              line(L('（言い方を変えると、通ることもあります）',
                     '(sometimes a different phrasing works)'), 'dim')];
    }
    return [line(TB.ui('sudo'), 'err')];
  }, 'sudo <command>');

  egg('rm', { ja: '消そうとする（消えません）', en: 'try to delete something (it will not)' }, function (args) {
    var what = args.join(' ');
    if (/-rf?\s*\/$|-rf?\s+\/\s*$/.test(what) || /^-rf?\s+\/$/.test(what)) {
      return ['', line(L('……本気ですか？', '…are you sure?'), 'warn'),
        line(L('いいえ。ここはあなたの読み物です。守ります。',
               'No. This is your reading material. It stays.'), 'err'), ''];
    }
    return [line(L('このファイルシステムは読み取り専用です（見るだけの飾りなので）。',
                   'This filesystem is read-only — it is only here to be looked at.'), 'warn')];
  }, 'rm [-rf] <file>');

  /* ---------- OS のマスコットたち --------------------------------------- */

  egg('tux', { ja: 'Linux のペンギン', en: 'the Linux penguin' }, function () {
    return ['', art([
      '    .--.',
      '   |o_o |',
      '   |:_/ |',
      '  //   \\ \\',
      ' (|     | )',
      '/\'\\_   _/`\\',
      '\\___)=(___/'
    ].join('\n')), line(L('Linux です。', 'Linux, at your service.'), 'dim'), ''];
  });

  egg('apple', { ja: 'かじられた果物', en: 'a bitten fruit' }, function () {
    return ['', art([
      '        .:\'',
      '    __ :\'__',
      ' .\'`  `-\'  ``.',
      ':          .-\'',
      ':         :',
      ' :         `-;',
      '  `.__.-.__.\''
    ].join('\n')), line(L('macOS / iOS のほうです。', 'The macOS / iOS side of things.'), 'dim'), ''];
  });

  egg('droid', { ja: '緑色のロボット', en: 'the green robot' }, function () {
    return ['', art([
      '    \\      /',
      '  .-"""""""-.',
      ' /  o     o  \\',
      '|      _      |',
      '|             |',
      ' \\___________/'
    ].join('\n')), line(L('Android です。vibrate や toast も試してみてください。',
                          'Android. Try vibrate and toast too.'), 'dim'), ''];
  });

  egg('win', { ja: '四つの窓', en: 'four panes' }, function () {
    return ['', art([
      '  ▄▄▄▄  ▄▄▄▄',
      '  ████  ████',
      '  ████  ████',
      '',
      '  ████  ████',
      '  ████  ████'
    ].join('\n')), line(L('Windows です。dir や ipconfig もあります。',
                          'Windows. dir and ipconfig are here too.'), 'dim'), ''];
  });

  /* ---------- 動くもの --------------------------------------------------- */

  egg('nyan', { ja: '虹を連れた猫が通る', en: 'a cat with a rainbow goes by' }, function () {
    var el = document.createElement('div');
    el.style.whiteSpace = 'pre';
    el.style.overflow = 'hidden';
    TB.Term.print({ node: el });
    var cat = ['~=[,,_,,]:3', '  ~~~~~~~ '];
    return new Promise(function (resolve) {
      var pos = -12;
      var timer = setInterval(function () {
        var tail = '≈'.repeat(Math.max(0, Math.min(pos, 40)));
        el.textContent = '';
        var rowA = document.createElement('div');
        Array.from(tail).forEach(function (ch, i) {
          var s = document.createElement('span');
          s.style.color = 'hsl(' + ((i * 18) % 360) + ',80%,60%)';
          s.textContent = ch;
          rowA.appendChild(s);
        });
        var catSpan = document.createElement('span');
        catSpan.className = 'accent bold';
        catSpan.textContent = cat[0];
        rowA.appendChild(catSpan);
        el.appendChild(rowA);
        pos += 2;
        if (pos > 44) {
          clearInterval(timer);
          el.textContent = '';
          resolve([line(L('行ってしまいました。', 'And off it went.'), 'dim')]);
        }
      }, 90);
    });
  });

  egg('snow', { ja: '雪を降らせる', en: 'let it snow' }, function () {
    var el = document.createElement('div');
    el.style.whiteSpace = 'pre';
    TB.Term.print({ node: el });
    var cols = Math.min(60, Math.floor(window.innerWidth / 14));
    var rows = [];
    for (var i = 0; i < 8; i++) rows.push(' '.repeat(cols));
    return new Promise(function (resolve) {
      var n = 0;
      var timer = setInterval(function () {
        var top = '';
        for (var x = 0; x < cols; x++) top += Math.random() < 0.08 ? pick(['*', '.', '·']) : ' ';
        rows.unshift(top);
        rows.pop();
        el.textContent = rows.join('\n');
        if (++n > 40) {
          clearInterval(timer);
          el.textContent = '';
          resolve([line(L('やみました。', 'It has stopped.'), 'dim')]);
        }
      }, 110);
    });
  });

  egg('dance', { ja: '踊る', en: 'have a little dance' }, function () {
    var frames = [
      ['  (>^_^)>  ', '   /   \\   '],
      ['  <(^_^<)  ', '   /   \\   '],
      ['  ^(^_^)^  ', '   /   \\   '],
      ['  <(^_^)>  ', '   /   \\   ']
    ];
    var el = document.createElement('div');
    el.style.whiteSpace = 'pre';
    el.className = 'accent';
    TB.Term.print({ node: el });
    return new Promise(function (resolve) {
      var i = 0;
      var timer = setInterval(function () {
        el.textContent = frames[i % frames.length].join('\n');
        if (++i > 16) {
          clearInterval(timer);
          resolve([line(L('おしまい。', 'That is the dance.'), 'dim')]);
        }
      }, 180);
    });
  });

  egg('upside', { ja: '画面をひっくり返す（もう一度で戻る）', en: 'turn the screen upside down (again to undo)' },
    function () {
      var on = document.body.classList.toggle('upside');
      return [line(on ? L('ひっくり返しました。もう一度 upside で戻ります。',
                          'Upside down. Type upside again to undo.')
                      : L('戻しました。', 'Back to normal.'), 'accent')];
    });

  /* ---------- ことば ----------------------------------------------------- */

  var ZEN = [
    { ja: '速いことより、読めること。', en: 'Readable beats clever.' },
    { ja: '画面の端は、文章の終わりではない。', en: 'The edge of the screen is not the end of the sentence.' },
    { ja: '消せる機能は、増やせる機能より強い。', en: 'A feature you can delete outlives one you merely added.' },
    { ja: '待たされない道具は、それだけで優しい。', en: 'A tool that never makes you wait is already kind.' },
    { ja: '説明が要るものは、たいてい直せる。', en: 'If it needs explaining, it can usually be fixed.' }
  ];

  egg('zen', { ja: '端末の禅', en: 'the zen of the terminal' }, function () {
    return ['', line('  ' + TB.t(pick(ZEN)), 'accent'), ''];
  });

  egg('love', { ja: '愛について', en: 'about love' }, function () {
    return [line(L('愛はコンパイルできませんが、リンクはできます。',
                   'Love does not compile, but it does link.'), 'accent')];
  });

  egg('404', { ja: '見つからない', en: 'not found' }, function () {
    return ['', line('  404', 'err bold'),
      line(L('  お探しのものは、ここにはありません。でも、ここには何かあります。',
             '  What you sought is not here. But something else is.'), 'dim'), ''];
  });

  egg('boo', { ja: 'おどかす', en: 'a small fright' }, function () {
    return ['', art(['  .-.  ', ' (o o) ', ' | O \\ ', '  \\   \\', "   `~~~'"].join('\n')),
      line(L('びっくりしましたか。', 'Did that startle you?'), 'dim'), ''];
  });

  egg('moon', { ja: '今夜の月', en: "tonight's moon" }, function () {
    var phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    var names = ja()
      ? ['新月', '三日月', '上弦', '十三夜', '満月', '寝待月', '下弦', '有明月']
      : ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
         'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
    var days = Math.floor((Date.now() - Date.UTC(2026, 0, 3)) / 86400000);
    var i = Math.floor(((days % 29.53) / 29.53) * 8) % 8;
    return ['', [{ t: '  ' + phases[i] + '  ', c: '' }, { t: names[i], c: 'accent' }], ''];
  });

  egg('credits', { ja: 'この端末を作った人たち', en: 'who made this terminal' }, function () {
    return ['',
      line('── TUI-BASE ──', 'accent bold'), '',
      { row: [L('文章', 'words'), 'assets/js/content.js'] },
      { row: [L('見た目', 'looks'), 'assets/css/tui.css'] },
      { row: [L('入力', 'input'), 'assets/js/term.js'] },
      { row: [L('遊び', 'play'), 'games / gamekit / arcade / mini'] },
      { row: [L('道具', 'tools'), 'commands / extra / os'] },
      '',
      line(L('画像もフレームワークも使っていません。文字だけです。',
             'No images, no framework. Only text.'), 'dim'), ''];
  });

  egg('secret', { ja: 'ここまで来た人へ', en: 'for those who got this far' }, function () {
    return ['',
      line(L('よく見つけました。', 'Well found.'), 'accent bold'),
      line(L('↑ ↑ ↓ ↓ ← → ← → b a と押してみてください。',
             'Try pressing ↑ ↑ ↓ ↓ ← → ← → b a.'), ''),
      line(L('（manual には、このほかの隠しコマンドも全部載っています）',
             '(the manual lists every hidden command, by the way)'), 'dim'), ''];
  });

  egg('konami', { ja: 'あの並びについて', en: 'about that sequence' }, function () {
    var open = TB.store.get('konami', '') === '1';
    return open
      ? [line(L('もう開いています。theme konami でどうぞ。',
                'Already unlocked. Try theme konami.'), 'accent')]
      : [line(L('↑ ↑ ↓ ↓ ← → ← → b a。どこで押しても構いません。',
                'Up up down down left right left right b a. Anywhere will do.'), 'accent')];
  });

  /* ---------- コナミコマンド --------------------------------------------- */

  var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
             'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var progress = 0;

  function unlock(quiet) {
    var first = TB.store.get('konami', '') !== '1';
    TB.store.set('konami', '1');
    if (TB.themes.indexOf('konami') === -1) TB.themes.push('konami');
    TB.setTheme('konami');
    if (quiet) return;
    TB.Term.setValue('');   // 入力欄に残った b a を片づける
    TB.Term.printAll(['',
      line('★ ' + L('隠しテーマが開きました。', 'A hidden theme is now yours.'), 'accent bold'),
      line(L('theme konami で、いつでも呼び出せます。',
             'Call it back any time with: theme konami'), ''),
      first ? line(L('（ほかにも manual の ◆ 印を探してみてください）',
                     '(look for the ◆ marks in the manual for more)'), 'dim') : '',
      '']);
    TB.Term.scroll();
  }

  window.addEventListener('keydown', function (e) {
    // ゲーム中は矢印キーを使うので、この並びは数えない
    if (TB.Term && TB.Term.isCapturing && TB.Term.isCapturing()) { progress = 0; return; }
    var key = e.key;
    if (key === SEQ[progress] || (SEQ[progress].length === 1 && key && key.toLowerCase() === SEQ[progress])) {
      progress++;
      if (progress === SEQ.length) {
        progress = 0;
        unlock(false);
      }
    } else {
      progress = (key === SEQ[0]) ? 1 : 0;
    }
  });

  /* 一度開けた人は、次に来たときも theme の一覧に出す */
  if (TB.store.get('konami', '') === '1' && TB.themes.indexOf('konami') === -1) {
    TB.themes.push('konami');
  }
})();
