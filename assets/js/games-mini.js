/*
 * games-mini.js — 1 行ずつ入力して遊ぶ小さなゲーム。
 *   rps       … じゃんけん
 *   hangman   … 言葉当て
 *   blackjack … ブラックジャック
 *   quiz      … コマンドの豆知識クイズ
 */
(function () {
  'use strict';

  var TB = window.TB;
  var K = TB.Kit;
  var L = K.L, rnd = K.rnd, pick = K.pick;

  function out(lines) { TB.Term.printAll(lines); }
  function quit(msg) {
    TB.setLineHandler(null);
    out([[{ t: msg || L('またどうぞ。', 'Come back any time.'), c: 'dim' }], '']);
  }
  function isQuit(v) { return v === 'q' || v === 'quit' || v === 'exit' || v === 'やめる'; }

  /* =====================================================================
     rps — じゃんけん
     ===================================================================== */

  var HANDS = [
    { key: 'r', ja: 'グー', en: 'rock', art: '  ✊', beats: 's' },
    { key: 's', ja: 'チョキ', en: 'scissors', art: '  ✌', beats: 'p' },
    { key: 'p', ja: 'パー', en: 'paper', art: '  ✋', beats: 'r' }
  ];
  var RPS_WORDS = {
    r: ['r', 'rock', 'ぐー', 'グー', 'ぐ', 'g', 'ぱー'.length ? 'ロック' : ''],
    s: ['s', 'scissors', 'ちょき', 'チョキ', 'ち', 'c'],
    p: ['p', 'paper', 'ぱー', 'パー', 'ぱ']
  };
  var rpsState = null;

  function handOf(v) {
    for (var k in RPS_WORDS) {
      if (RPS_WORDS[k].indexOf(v) !== -1) return k;
    }
    return null;
  }
  function hand(k) {
    for (var i = 0; i < HANDS.length; i++) if (HANDS[i].key === k) return HANDS[i];
    return null;
  }

  function rpsLine(input) {
    var v = input.trim().toLowerCase();
    if (isQuit(v)) {
      var s = rpsState;
      rpsState = null;
      quit(L('通算 ' + s.w + ' 勝 ' + s.l + ' 敗 ' + s.d + ' 分でした。',
             'Final tally: ' + s.w + 'W ' + s.l + 'L ' + s.d + 'D.'));
      return;
    }
    var mine = handOf(v);
    if (!mine) {
      out([[{ t: L('グー(r) / チョキ(s) / パー(p) のどれかを入れてください。',
                   'Type rock (r), scissors (s) or paper (p).'), c: 'warn' }]]);
      return;
    }
    var cpu = pick(HANDS).key;
    var me = hand(mine), you = hand(cpu);
    var result, cls;
    if (mine === cpu) { rpsState.d++; result = L('あいこ', 'Draw'); cls = 'dim'; }
    else if (me.beats === cpu) { rpsState.w++; result = L('あなたの勝ち！', 'You win!'); cls = 'accent bold'; }
    else { rpsState.l++; result = L('あなたの負け', 'You lose'); cls = 'err'; }

    out([
      [{ t: L('あなた: ', 'you: '), c: 'dim' }, { t: me.art + ' ' + TB.t({ ja: me.ja, en: me.en }), c: 'accent' },
       { t: L('   CPU: ', '   cpu: '), c: 'dim' }, { t: you.art + ' ' + TB.t({ ja: you.ja, en: you.en }), c: 'warn' }],
      [{ t: result, c: cls },
       { t: '   ' + L(rpsState.w + '勝 ' + rpsState.l + '敗 ' + rpsState.d + '分', rpsState.w + 'W ' + rpsState.l + 'L ' + rpsState.d + 'D'), c: 'dim' }]
    ]);
  }

  TB.def('rps', {
    group: 'game',
    desc: { ja: 'じゃんけん。何度でも勝負できる', en: 'rock-paper-scissors, as many rounds as you like' },
    run: function () {
      rpsState = { w: 0, l: 0, d: 0 };
      TB.setLineHandler(rpsLine, 'rps>');
      return ['', [{ t: L('じゃんけん、はじめ。', "Let's play."), c: 'accent' }],
        [{ t: L('グー(r) / チョキ(s) / パー(p)。q でやめます。',
                'rock (r) / scissors (s) / paper (p). q to quit.'), c: 'dim' }], ''];
    }
  });

  /* =====================================================================
     hangman — 言葉当て
     ===================================================================== */

  var WORDS = [
    { w: 'TERMINAL', h: { ja: '文字で操作する画面', en: 'a text screen you type into' } },
    { w: 'KEYBOARD', h: { ja: '指で叩く道具', en: 'the thing under your fingers' } },
    { w: 'JAVASCRIPT', h: { ja: 'ブラウザで動く言語', en: 'the language of the browser' } },
    { w: 'MONOSPACE', h: { ja: '字幅がそろった書体', en: 'every glyph the same width' } },
    { w: 'ROGUELIKE', h: { ja: '毎回変わる迷宮のゲーム', en: 'a dungeon that changes every time' } },
    { w: 'RECURSION', h: { ja: '自分自身を呼ぶこと', en: 'see: recursion' } },
    { w: 'COMPILER', h: { ja: 'ソースを機械語に翻訳する道具', en: 'turns source into machine code' } },
    { w: 'PIPELINE', h: { ja: '出力を次の入力へつなぐ仕組み', en: 'output flowing into input' } },
    { w: 'VARIABLE', h: { ja: '値を入れておく名前', en: 'a name that holds a value' } },
    { w: 'FUNCTION', h: { ja: 'まとまった処理のかたまり', en: 'a reusable block of work' } },
    { w: 'DEBUGGER', h: { ja: '虫を捕まえる道具', en: 'the tool that catches bugs' } },
    { w: 'CURSOR', h: { ja: '点滅している四角', en: 'the blinking block' } },
    { w: 'SHELL', h: { ja: 'コマンドを受け取るプログラム', en: 'the program that reads your commands' } },
    { w: 'KERNEL', h: { ja: 'OS の中心', en: 'the core of the operating system' } },
    { w: 'BUFFER', h: { ja: '一時的に貯めておく場所', en: 'a place to hold data for a moment' } },
    { w: 'ASCII', h: { ja: '古い文字コード', en: 'the old character set' } }
  ];

  var GALLOWS = [
    ['  +----+ ', '  |    | ', '       | ', '       | ', '       | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', '       | ', '       | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', '  |    | ', '       | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', ' /|    | ', '       | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', ' /|\\   | ', '       | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', ' /|\\   | ', ' /     | ', '       | ', '========='],
    ['  +----+ ', '  |    | ', '  O    | ', ' /|\\   | ', ' / \\   | ', '       | ', '=========']
  ];
  var MAX_MISS = 6;
  var hangState = null;

  function hangBoard() {
    var s = hangState;
    var shown = s.word.split('').map(function (c) {
      return s.hit.indexOf(c) !== -1 ? c : '_';
    }).join(' ');
    var lines = [''];
    GALLOWS[s.miss].forEach(function (row) { lines.push([{ t: '   ' + row, c: s.miss >= MAX_MISS ? 'err' : 'dim' }]); });
    lines.push('');
    lines.push([{ t: '   ' + shown, c: 'accent bold' }]);
    lines.push([{ t: L('   ヒント: ', '   hint: ') + TB.t(s.hint), c: 'dim' }]);
    lines.push([{ t: L('   はずれ: ', '   wrong: ') + (s.miss ? s.bad.join(' ') : '-') +
                     L('   残り ' + (MAX_MISS - s.miss) + ' 回', '   ' + (MAX_MISS - s.miss) + ' left'), c: 'warn' }]);
    lines.push('');
    return lines;
  }

  function hangLine(input) {
    var v = input.trim().toUpperCase();
    if (isQuit(v.toLowerCase())) {
      var w = hangState.word;
      hangState = null;
      quit(L('答えは ' + w + ' でした。', 'The word was ' + w + '.'));
      return;
    }
    var s = hangState;

    if (v.length > 1) {            // 単語まるごとの解答
      if (v === s.word) { s.hit = s.word.split(''); return hangFinish(true); }
      s.miss++;
      out(hangBoard().concat([[{ t: L('ちがいます。', 'Not that word.'), c: 'err' }]]));
      if (s.miss >= MAX_MISS) return hangFinish(false);
      return;
    }
    if (!/^[A-Z]$/.test(v)) {
      out([[{ t: L('アルファベット 1 文字を入れてください（q でやめる）。',
                   'Type a single letter (q to quit).'), c: 'warn' }]]);
      return;
    }
    if (s.hit.indexOf(v) !== -1 || s.bad.indexOf(v) !== -1) {
      out([[{ t: L('その文字はもう試しました。', 'You already tried that letter.'), c: 'dim' }]]);
      return;
    }
    if (s.word.indexOf(v) !== -1) {
      s.hit.push(v);
      if (s.word.split('').every(function (c) { return s.hit.indexOf(c) !== -1; })) return hangFinish(true);
      out(hangBoard().concat([[{ t: L('あった！', 'A hit!'), c: 'accent' }]]));
    } else {
      s.bad.push(v);
      s.miss++;
      if (s.miss >= MAX_MISS) return hangFinish(false);
      out(hangBoard().concat([[{ t: L('はずれ。', 'Nope.'), c: 'warn' }]]));
    }
  }

  function hangFinish(won) {
    var s = hangState;
    var lines = hangBoard();
    if (won) {
      var r = K.best('hangman', MAX_MISS - s.miss, false);
      lines.push([{ t: L('正解！ ' + s.word, 'Correct! ' + s.word), c: 'accent bold' }]);
      lines.push([{ t: L('はずれ ' + s.miss + ' 回で当てました。', 'Solved with ' + s.miss + ' misses.'), c: '' }]);
      if (r.updated) lines.push([{ t: L('自己最高記録！', 'A personal best!'), c: 'accent-2' }]);
    } else {
      lines.push([{ t: L('力尽きました…  答えは ' + s.word, 'Out of tries. The word was ' + s.word), c: 'err bold' }]);
    }
    lines.push('', [{ t: L('もう一度: hangman', 'play again: hangman'), c: 'dim' }], '');
    hangState = null;
    TB.setLineHandler(null);
    out(lines);
  }

  TB.def('hangman', {
    group: 'game',
    desc: { ja: '言葉当て。1 文字ずつ当てる', en: 'hangman: guess the word letter by letter' },
    run: function () {
      var w = pick(WORDS);
      hangState = { word: w.w, hint: w.h, hit: [], bad: [], miss: 0 };
      TB.setLineHandler(hangLine, 'word>');
      return ['', [{ t: L('言葉当てです。1 文字ずつ入力してください。',
                          'Guess the word, one letter at a time.'), c: 'accent' }],
        [{ t: L('単語まるごとの解答もできます。q でやめる。',
                'You may also type the whole word. q to quit.'), c: 'dim' }]].concat(hangBoard());
    }
  });

  /* =====================================================================
     blackjack — ブラックジャック
     ===================================================================== */

  var SUITS = ['♠', '♥', '♦', '♣'];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var bjState = null;

  function newDeck() {
    var d = [];
    SUITS.forEach(function (s) { RANKS.forEach(function (r) { d.push({ s: s, r: r }); }); });
    for (var i = d.length - 1; i > 0; i--) {
      var j = rnd(i + 1), t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  function handValue(cards) {
    var total = 0, aces = 0;
    cards.forEach(function (c) {
      if (c.r === 'A') { aces++; total += 11; }
      else if (['J', 'Q', 'K'].indexOf(c.r) !== -1) total += 10;
      else total += parseInt(c.r, 10);
    });
    while (total > 21 && aces) { total -= 10; aces--; }
    return total;
  }

  function cardParts(cards, hideFirst) {
    var segs = [];
    cards.forEach(function (c, i) {
      if (hideFirst && i === 0) { segs.push({ t: '[??] ', c: 'dim' }); return; }
      var red = c.s === '♥' || c.s === '♦';
      segs.push({ t: '[' + c.r + c.s + '] ', c: red ? 'err' : 'fg' });
    });
    return segs;
  }

  function bjTable(hideDealer) {
    var s = bjState;
    return [
      '',
      [{ t: L('ディーラー ', 'dealer '), c: 'dim' }].concat(cardParts(s.dealer, hideDealer),
        [{ t: hideDealer ? '' : '= ' + handValue(s.dealer), c: 'dim' }]),
      [{ t: L('あなた     ', 'you    ') , c: 'dim' }].concat(cardParts(s.player, false),
        [{ t: '= ' + handValue(s.player), c: 'accent' }]),
      ''
    ];
  }

  function bjDeal() {
    var s = bjState;
    if (s.deck.length < 12) s.deck = newDeck();
    s.player = [s.deck.pop(), s.deck.pop()];
    s.dealer = [s.deck.pop(), s.deck.pop()];
    s.done = false;
    var lines = bjTable(true);
    if (handValue(s.player) === 21) {
      lines = lines.concat(bjSettle(L('ブラックジャック！', 'Blackjack!')));
    } else {
      lines.push([{ t: L('h で引く / s で止める / q でやめる', 'h to hit, s to stand, q to quit'), c: 'dim' }]);
    }
    return lines;
  }

  function bjSettle(prefix) {
    var s = bjState;
    s.done = true;
    while (handValue(s.dealer) < 17) s.dealer.push(s.deck.pop());
    var p = handValue(s.player), d = handValue(s.dealer);
    var lines = bjTable(false);
    var msg, cls;
    if (p > 21) { s.l++; msg = L('バースト。あなたの負け。', 'Bust. You lose.'); cls = 'err'; }
    else if (d > 21) { s.w++; msg = L('ディーラーがバースト。あなたの勝ち！', 'Dealer busts. You win!'); cls = 'accent bold'; }
    else if (p > d) { s.w++; msg = L('あなたの勝ち！', 'You win!'); cls = 'accent bold'; }
    else if (p < d) { s.l++; msg = L('あなたの負け。', 'You lose.'); cls = 'err'; }
    else { s.d++; msg = L('引き分け。', 'Push.'); cls = 'dim'; }
    if (prefix) msg = prefix + ' ' + msg;
    lines.push([{ t: msg, c: cls }]);
    lines.push([{ t: L('通算 ' + s.w + '勝 ' + s.l + '敗 ' + s.d + '分', s.w + 'W ' + s.l + 'L ' + s.d + 'D') +
                    L('   次の勝負: d / やめる: q', '   deal again: d / quit: q'), c: 'dim' }]);
    return lines;
  }

  function bjLine(input) {
    var v = input.trim().toLowerCase();
    var s = bjState;
    if (isQuit(v)) {
      bjState = null;
      quit(L('通算 ' + s.w + '勝 ' + s.l + '敗 ' + s.d + '分でした。', 'Tally: ' + s.w + 'W ' + s.l + 'L ' + s.d + 'D.'));
      return;
    }
    if (s.done) {
      if (v === 'd' || v === '' || v === 'y') out(bjDeal());
      else out([[{ t: L('d で次の勝負、q でやめます。', 'd to deal, q to quit.'), c: 'warn' }]]);
      return;
    }
    if (v === 'h' || v === 'hit') {
      s.player.push(s.deck.pop());
      if (handValue(s.player) > 21) { out(bjSettle(null)); return; }
      out(bjTable(true).concat([[{ t: L('h で引く / s で止める', 'h to hit, s to stand'), c: 'dim' }]]));
      return;
    }
    if (v === 's' || v === 'stand') { out(bjSettle(null)); return; }
    out([[{ t: L('h（引く）/ s（止める）/ q（やめる）', 'h (hit) / s (stand) / q (quit)'), c: 'warn' }]]);
  }

  TB.def('blackjack', {
    group: 'game',
    desc: { ja: 'ブラックジャック。21 を超えずに勝つ', en: 'Blackjack. Get close to 21 without busting' },
    run: function () {
      bjState = { deck: newDeck(), player: [], dealer: [], w: 0, l: 0, d: 0, done: false };
      TB.setLineHandler(bjLine, 'bj>');
      return ['', [{ t: L('ブラックジャック。21 に近づけましょう。', 'Blackjack. Get as close to 21 as you dare.'), c: 'accent' }]]
        .concat(bjDeal());
    }
  });

  /* =====================================================================
     quiz — コマンドの豆知識クイズ
     ===================================================================== */

  var QUESTIONS = [
    { q: { ja: 'ファイルの中身を表示するコマンドは？', en: 'Which command prints a file?' }, a: ['cat', 'ls', 'cd', 'pwd'] },
    { q: { ja: '今いる場所を表示するコマンドは？', en: 'Which command shows where you are?' }, a: ['pwd', 'ls', 'man', 'echo'] },
    { q: { ja: 'ディレクトリを移動するコマンドは？', en: 'Which command changes directory?' }, a: ['cd', 'mv', 'cp', 'go'] },
    { q: { ja: '画面を消すコマンドは？（Unix 風）', en: 'Which command clears the screen (UNIX)?' }, a: ['clear', 'cls', 'wipe', 'erase'] },
    { q: { ja: 'Windows で ls にあたるコマンドは？', en: 'The Windows equivalent of ls?' }, a: ['dir', 'list', 'ls-win', 'show'] },
    { q: { ja: 'Windows で cat にあたるコマンドは？', en: 'The Windows equivalent of cat?' }, a: ['type', 'print', 'read', 'more'] },
    { q: { ja: 'Windows で clear にあたるコマンドは？', en: 'The Windows equivalent of clear?' }, a: ['cls', 'clean', 'cl', 'reset'] },
    { q: { ja: 'ネットワーク設定を見る Windows のコマンドは？', en: 'Which Windows command shows network settings?' }, a: ['ipconfig', 'ifconfig', 'netsh', 'nslookup'] },
    { q: { ja: '相手に届くか確かめるコマンドは？', en: 'Which command checks if a host answers?' }, a: ['ping', 'echo', 'pong', 'call'] },
    { q: { ja: '文字を検索するコマンドは？', en: 'Which command searches text?' }, a: ['grep', 'find-text', 'search', 'seek'] },
    { q: { ja: '入力を補完するキーは？', en: 'Which key completes your input?' }, a: ['Tab', 'Enter', 'Shift', 'Alt'] },
    { q: { ja: 'Ctrl+L は何をする？', en: 'What does Ctrl+L do?' }, a: [{ ja: '画面を消す', en: 'clears the screen' }, { ja: '行を消す', en: 'deletes the line' }, { ja: '終了する', en: 'exits' }, { ja: '貼り付け', en: 'pastes' }] },
    { q: { ja: 'このサイトで全コマンドの使い方を読むには？', en: 'How do you read the full reference here?' }, a: ['manual', 'readme', 'info', 'docs'] },
    { q: { ja: 'ファイルの先頭だけ見るコマンドは？', en: 'Which command shows the first lines?' }, a: ['head', 'top', 'first', 'begin'] },
    { q: { ja: 'ファイルの末尾だけ見るコマンドは？', en: 'Which command shows the last lines?' }, a: ['tail', 'end', 'last', 'bottom'] },
    { q: { ja: '行数や語数を数えるコマンドは？', en: 'Which command counts lines and words?' }, a: ['wc', 'count', 'num', 'stat'] },
    { q: { ja: '実行中のプロセスを見るコマンドは？（Unix）', en: 'Which UNIX command lists processes?' }, a: ['ps', 'proc', 'jobs-all', 'run'] },
    { q: { ja: '自分が誰かを表示するコマンドは？', en: 'Which command prints your user name?' }, a: ['whoami', 'me', 'user', 'id-me'] },
    { q: { ja: 'コマンドの説明書を読むコマンドは？', en: 'Which command opens the manual page?' }, a: ['man', 'help-me', 'doc', 'info-page'] },
    { q: { ja: 'ディスクの空きを見るコマンドは？', en: 'Which command shows free disk space?' }, a: ['df', 'du', 'free', 'disk'] }
  ];

  var quizState = null;

  function quizAsk() {
    var s = quizState;
    var item = s.list[s.i];
    var lines = ['', [{ t: L('第 ' + (s.i + 1) + ' 問 / ' + s.list.length, 'Question ' + (s.i + 1) + ' of ' + s.list.length), c: 'dim' }],
      [{ t: TB.t(item.q), c: 'accent bold' }]];
    item.shuffled.forEach(function (a, i) {
      lines.push([{ t: '  ' + (i + 1) + ') ', c: 'dim' }, { t: typeof a === 'string' ? a : TB.t(a) }]);
    });
    lines.push([{ t: L('番号で答えてください（q でやめる）。', 'Answer with a number (q to quit).'), c: 'dim' }]);
    return lines;
  }

  function quizLine(input) {
    var v = input.trim().toLowerCase();
    if (isQuit(v)) { quizState = null; quit(); return; }
    var s = quizState;
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 1 || n > 4) {
      out([[{ t: L('1〜4 の番号で答えてください。', 'Answer with 1–4.'), c: 'warn' }]]);
      return;
    }
    var item = s.list[s.i];
    var chosen = item.shuffled[n - 1];
    var correct = chosen === item.correct;
    if (correct) s.score++;
    var right = typeof item.correct === 'string' ? item.correct : TB.t(item.correct);
    out([correct
      ? [{ t: L('○ 正解！', '○ Correct!'), c: 'accent bold' }]
      : [{ t: L('× 残念。正解は ', '× Nope. The answer was '), c: 'err' }, { t: right, c: 'accent' }]]);

    s.i++;
    if (s.i < s.list.length) { out(quizAsk()); return; }

    var r = K.best('quiz', s.score, false);
    var grade = s.score === s.list.length ? L('満点です。おみごと。', 'A perfect score. Impressive.')
      : s.score >= s.list.length * 0.7 ? L('よくできました。', 'Nicely done.')
      : L('manual を読むともっと解けます。', 'Read the manual and try again.');
    TB.setLineHandler(null);
    quizState = null;
    out(['', [{ t: L('結果: ' + s.score + ' / ' + s.list.length + ' 問正解',
                     'Score: ' + s.score + ' of ' + s.list.length), c: 'accent bold' }],
      [{ t: grade, c: '' }],
      [{ t: L('自己最高: ' + r.best + (r.updated ? '（更新！）' : ''), 'best: ' + r.best + (r.updated ? ' (new!)' : '')), c: 'dim' }],
      '', [{ t: L('もう一度: quiz', 'play again: quiz'), c: 'dim' }], '']);
  }

  TB.def('quiz', {
    group: 'game',
    usage: 'quiz [問題数]',
    desc: { ja: 'コマンドの豆知識クイズ', en: 'a quiz about terminal commands' },
    run: function (args) {
      var count = Math.min(Math.max(parseInt(args[0], 10) || 8, 3), QUESTIONS.length);
      var pool = QUESTIONS.slice();
      var list = [];
      while (list.length < count && pool.length) {
        var item = pool.splice(rnd(pool.length), 1)[0];
        var shuffled = item.a.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
          var j = rnd(i + 1), t = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = t;
        }
        list.push({ q: item.q, shuffled: shuffled, correct: item.a[0] });
      }
      quizState = { list: list, i: 0, score: 0 };
      TB.setLineHandler(quizLine, 'quiz>');
      return ['', [{ t: L('コマンドのクイズです。全 ' + count + ' 問。',
                          'A quiz about commands. ' + count + ' questions.'), c: 'accent' }]]
        .concat(quizAsk());
    }
  });
})();
