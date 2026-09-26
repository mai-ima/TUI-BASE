/*
 * race-story2.js — ストーリー2「湾岸 1989 ―眠らない環状線―」
 *
 * 1989 年、バブル景気のまっただ中の東京。
 * 昼は救命救急センターの看護師、夜は亡き兄の Z で首都高を走る神崎トウコ（22）。
 * 兄・修は三か月前、湾岸線で事故死した。目撃者は言う。「黒いポルシェと走っていた」と。
 * 兄はなぜ死んだのか。黒いポルシェ「夜鴉（よがらす）」は誰なのか。
 * ——高速道路の夜、ネオン、地上げ、そして夜明け。
 */
(function () {
  'use strict';
  var TB = window.TB, R = TB.Race, C = R.CHARS, B = R.BOSSES;

  /* ---------- 登場人物 ---------- */
  C.touko = { name: 'トウコ', color: '#f06292',
              face: { skin: '#f6d2b8', hair: '#3b2418', style: 'ponytail', eyes: '#3a1f14', acc: 'none', shirt: '#26324a', bg: '#1a1426' } };
  C.touko_n = { name: 'トウコ（看護師）', color: '#f06292',
                face: { skin: '#f6d2b8', hair: '#3b2418', style: 'bun', eyes: '#3a1f14', acc: 'nurse', shirt: '#fafafa', bg: '#e3eef5' } };
  C.shu = { name: '修（兄）', color: '#81d4fa',
            face: { skin: '#eccaa8', hair: '#222', style: 'swept', eyes: '#222', acc: 'none', shirt: '#37474f', bg: '#1c2430' } };
  C.yaegashi = { name: '八重樫', color: '#ffcc80',
                 face: { skin: '#dcae8c', hair: '#9e9e9e', style: 'bun', eyes: '#2a1a10', acc: 'cig', shirt: '#4e342e', bg: '#2a1f18' } };
  C.jin = { name: 'ジン', color: '#ffd54f',
            face: { skin: '#e2b58f', hair: '#1a1a1a', style: 'pompadour', eyes: '#222', acc: 'earring', shirt: '#b71c1c', bg: '#2a1010' } };
  C.mari = { name: 'マリ', color: '#aed581',
             face: { skin: '#f3cfb0', hair: '#8d5a2b', style: 'wavy', eyes: '#3b2a20', acc: 'bandana', shirt: '#33691e', bg: '#1b2a12' } };
  C.shindo = { name: '真堂先生', color: '#b0bec5',
               face: { skin: '#eed2bd', hair: '#263238', style: 'swept', eyes: '#1a2a3a', acc: 'glasses', shirt: '#eceff1', bg: '#12181f' } };
  C.goto = { name: '後藤', color: '#ef5350',
             face: { skin: '#d9ab86', hair: '#111', style: 'buzz', eyes: '#111', acc: 'shades', shirt: '#212121', bg: '#1a0808' } };
  C.kurosawa = { name: '黒沢', color: '#ffb300',
                 face: { skin: '#e0b48f', hair: '#3e2723', style: 'swept', eyes: '#1b1b1b', acc: 'mustache', shirt: '#4e3b00', bg: '#2b2100' } };
  C.radio89 = { name: 'FM 湾岸（DJ）', color: '#ce93d8',
                face: { skin: '#e7bb96', hair: '#6a1b9a', style: 'wavy', eyes: '#222', acc: 'headset', shirt: '#311b92', bg: '#1a0d33' } };

  /* ---------- ボスと車 ---------- */
  B.jin = { name: 'JIN', color: '#fdd835', body: 'muscle', ai: 'aggressive', skill: 0.9, boss: true, ability: 'burst' };
  B.mari = { name: 'MARI', color: '#7cb342', body: 'rally', ai: 'technician', skill: 0.95, boss: true, ability: 'block' };
  B.yogarasu = { name: 'YOGARASU', color: '#0d0d0d', body: 'rr', ai: 'speedster', skill: 1.02, boss: true, ability: 'burst' };
  B.goto = { name: 'GOTO', color: '#b71c1c', body: 'wedge', ai: 'aggressive', skill: 1.02, boss: true, ability: 'ram' };
  B.yaegashi = { name: 'YAEGASHI', color: '#ffb74d', body: 'classic', ai: 'technician', skill: 1, boss: true, ability: 'block' };
  B.shu = { name: 'SHU', color: '#1c1c1c', body: 'gt', ai: 'technician', skill: 1, boss: true, ability: 'block' };
  [
    { id: 'z31', name: { ja: '修の Z（Z31）', en: "Shu's Z (Z31)" }, cls: 'B', price: 0, body: 'gt', paint: 5, unlock: true, era: 1989,
      stats: { spd: 7, acc: 6, grp: 6, arm: 6, nit: 6 }, desc: { ja: '兄の形見。3 リッターのターボ。黒いボディに白いピンストライプ。', en: "Her late brother's turbo Z." } },
    { id: 'z31t', name: { ja: 'Z（八重樫チューン）', en: 'Z (Yaegashi tune)' }, cls: 'A', price: 0, body: 'gt', paint: 5, unlock: true, era: 1989,
      stats: { spd: 9, acc: 8, grp: 7, arm: 6, nit: 8 }, desc: { ja: '八重樫が組んだ最高速仕様。湾岸で 300km/h を目指す。', en: 'Tuned by Yaegashi for 300 km/h on the Wangan.' } }
  ].forEach(function (c) { if (!R.CARS.some(function (x) { return x.id === c.id; })) R.CARS.push(c); });

  function S(o) { return o; }

  var CH = [
    { id: '0', name: '序章　修の Z' },
    { id: '1', name: '第一章　辰巳の夜' },
    { id: '2', name: '第二章　箱根の上り坂' },
    { id: '3', name: '第三章　夜鴉' },
    { id: '4', name: '第四章　バブルの影' },
    { id: '5', name: '最終章　環状線の夜明け' }
  ];

  var EV = [
    /* ===================== 序章 ===================== */
    S({ id: 's2_1', ch: '0', title: '兄の車', track: 'highway', mode: 'time', laps: 1, car: 'z31', goal: { type: 'lap', factor: 0.55 }, reward: 800,
      scene: [
        { title: '湾岸 1989', sub: '序章　修の Z' },
        { bg: 'highway' },
        { narr: '1989 年、東京。' },
        { narr: '土地の値段が毎日上がり、夜の街はいつまでも眠らない。' },
        ['touko_n', '……救急車、あと三分で到着。交通事故、二十代男性、意識なし。', 'right'],
        { narr: '三か月前の夜。運ばれてきたのは、兄だった。' },
        ['shu', 'トウコ……泣くなよ。ナースだろ。', 'emo:smile flash'],
        { narr: '兄・修は、それから二度と目を覚まさなかった。' },
        { bg: 'city' },
        ['touko', '……兄さんのZ。まだ、兄さんの匂いがする。', 'emo:sad'],
        ['touko', '警察は「単独事故」だって。でも、見た人がいる。「黒いポルシェと走っていた」って。'],
        ['touko', '兄さんは、走り屋なんかじゃなかった。銀行員で、真面目で、……なのに、どうして夜の湾岸に。'],
        ['touko', 'マニュアルなんて、教習所以来。……でも、確かめなきゃ。兄さんが見ていた景色を。', 'lines'],
        ['radio89', 'こんばんは、FM 湾岸。午前一時。今夜も首都高は眠らない……。', 'right']
      ],
      radio: [
        { at: 'start', who: 'radio89', text: 'リクエストは「真夜中のドア」。それでは、安全運転で。' },
        { at: 'damage', who: 'touko', text: '……ごめん、兄さん。擦っちゃった。' },
        { at: 'final', who: 'touko', text: '兄さん……こんな景色を、毎晩見てたの？' }
      ],
      post: [
        ['touko', '……こわい。でも、きれい。', 'emo:sad'],
        { narr: 'パーキングエリアに戻ると、一台の車がトウコの Z の横に停まった。' },
        ['jin', 'よう。その Z、修のだろ。', 'right emo:cool'],
        ['touko', '兄を……知ってるんですか！', 'emo:shock']
      ] }),

    /* ===================== 第一章 ===================== */
    S({ id: 's2_2', ch: '1', title: '辰巳のジン', boss: 'jin', track: 'highway', mode: 'sp', pace: 0.86, traffic: 8, car: 'z31', goal: { type: 'win' }, reward: 1500,
      scene: [
        { title: '第一章', sub: '辰巳の夜' },
        { bg: 'highway' },
        ['jin', '俺はジン。辰巳のパーキングじゃ、ちょっとは知られた顔だ。', 'right emo:cool'],
        ['jin', '修は、半年前からここに来るようになった。走りはヘタクソだったけどな。', 'emo:smile'],
        ['jin', 'あいつ、いつも何かを探してた。「黒い車を見なかったか」ってな。'],
        ['touko', '黒い車……ポルシェですか？'],
        ['jin', '知りたきゃ、俺に勝ってみな。修の妹がどれだけ走れるか、見てやるよ。', 'emo:angry lines'],
        { vs: ['touko', 'jin'] }
      ],
      radio: [
        { at: 'start', who: 'jin', text: 'SP バトルだ。前の車が相手の気力を削る。ついてこいよ！' },
        { at: 'ahead', who: 'jin', text: 'おいおい……マジかよ、初心者だろ！？' },
        { at: 'overtaken', who: 'touko', text: '……まだ。兄さんの Z は、こんなもんじゃない。' }
      ],
      post: [
        ['jin', 'はは……やるじゃねえか。ハンドルの切り方、修とそっくりだ。', 'emo:smile'],
        ['jin', 'いいか。黒いポルシェは「夜鴉（よがらす）」って呼ばれてる。誰も正体を知らねえ。'],
        ['jin', 'ただ一人だけ、あいつと並んで走れた奴がいた。……それが修だ。', 'emo:sad'],
        ['touko', '兄さんが……？'],
        ['jin', 'Z をちゃんと仕上げな。八重樫のばあさんの店を教えてやる。', 'emo:cool']
      ] }),

    S({ id: 's2_3', ch: '1', title: '筑波のサンデーレース', track: 'r_tsukuba', mode: 'race', laps: 3, rivals: 7, pace: 0.82, car: 'z31', goal: { type: 'place', n: 3 }, reward: 3000,
      scene: [
        { bg: 'circuit' },
        { narr: '京浜運河沿いの高架下。「八重樫モータース」。' },
        ['yaegashi', '修の妹かい。……あの子の Z をいじってたのは、あたしだよ。', 'right emo:cool'],
        ['yaegashi', 'チューンしてやってもいい。ただし、部品代はきっちりもらう。'],
        ['touko', 'お金……看護師の給料じゃ、とても。', 'emo:sad'],
        ['yaegashi', 'なら稼ぎな。日曜の筑波で、素人のレースがある。表彰台なら賞金が出る。'],
        ['yaegashi', 'サーキットは首都高より、ずっと正直だよ。ぶつけたら自分が痛い。それだけさ。', 'emo:smile']
      ],
      radio: [
        { at: 'start', who: 'yaegashi', text: '一コーナーは焦るんじゃないよ。筑波は最終コーナーが命だ。' },
        { at: 'final', who: 'yaegashi', text: '最後の一周。3 位以内なら、あんたのZに火を入れてやる。' }
      ],
      post: [
        ['yaegashi', '合格だ。……修は、あんたの話ばかりしてたよ。「妹は、俺より度胸がある」ってね。', 'emo:smile'],
        ['touko', '……兄さん。', 'emo:sad']
      ] }),

    /* ===================== 第二章 ===================== */
    S({ id: 's2_4', ch: '2', title: 'ターンパイクのマリ', boss: 'mari', track: 'r_turnpike', mode: 'touge', pace: 0.9, car: 'z31', goal: { type: 'win' }, reward: 3000,
      scene: [
        { title: '第二章', sub: '箱根の上り坂' },
        { bg: 'forest' },
        ['yaegashi', '修の手帳が出てきた。Z のシートの下に挟まってたよ。', 'right emo:cool'],
        { narr: '手帳には、びっしりと数字が書かれていた。土地の番地、会社の名前、金額。そして最後のページに——「箱根」とだけ。' },
        ['mari', 'あんたが修さんの妹？ あたしはマリ。ラリーやってる。', 'right emo:smile'],
        ['mari', '修さん、ここで待ち合わせしてたみたい。「箱根の上で、人に会う」って。'],
        ['mari', 'ついでに勝負しなよ。上りのターンパイクは、馬力より気合だよ！', 'emo:cool lines'],
        { vs: ['touko', 'mari'] }
      ],
      radio: [
        { at: 'start', who: 'mari', text: '上りは踏み続けた方が勝ち！ ビビったら負けだよ！' },
        { at: 'overtook', who: 'mari', text: 'うそ、Z でそこから入る！？' }
      ],
      post: [
        ['mari', 'あー負けた！ ……ねえトウコ、あんた看護師なんだって？ 夜勤明けで峠来るとか、どうかしてるよ。', 'emo:smile'],
        ['touko', '兄さんも、どうかしてたから。', 'emo:smile'],
        ['mari', '……気に入った。友達になろ。', 'emo:smile']
      ] }),

    S({ id: 's2_5', ch: '2', title: '霧の榛名', track: 'r_haruna', mode: 'time', laps: 1, car: 'z31', weather: 'fog', goal: { type: 'lap', factor: 0.27 }, reward: 2500,
      scene: [
        { bg: 'forest', weather: 'fog' },
        ['mari', '手帳の番地、群馬の榛名の土地だった。ゴルフ場の予定地だって。', 'right'],
        ['mari', '地元の人が言ってた。「東京の会社が、山ごと買い占めてる」って。'],
        ['touko', '兄さんは、銀行で何を見たんだろう……。'],
        ['mari', '霧が出てる。無理しないで、でも急いで。地主のおじいさんが、朝までに山を下りなきゃいけないって。', 'emo:shock']
      ],
      radio: [{ at: 'start', who: 'mari', text: '霧の中はセンターラインを信じて！' }],
      post: [
        { narr: '榛名湖のほとりの小さな家。年老いた地主は、修の写真を見て泣き出した。' },
        { narr: '『あの銀行員さんは、黒沢不動産の地上げの証拠を集めてくれていた。脅されても、やめなかった』' },
        ['touko', '……黒沢、不動産。', 'emo:angry']
      ] }),

    /* ===================== 第三章 ===================== */
    S({ id: 's2_6', ch: '3', title: '夜鴉', boss: 'yogarasu', track: 'tomei', mode: 'sp', pace: 1.0, traffic: 10, car: 'z31', goal: { type: 'finish' }, reward: 2500,
      scene: [
        { title: '第三章', sub: '夜鴉' },
        { bg: 'highway' },
        { bgm: 'tension' },
        { narr: '午前三時。東名。バックミラーに、ヘッドライトの消えた黒い影。' },
        ['touko', '……来た。黒いポルシェ。', 'emo:shock shake'],
        ['radio89', '……今夜のリクエストは、差出人不明。曲名は「Night Crow」。', 'right'],
        ['touko', '兄さんを、置き去りにした車……！', 'emo:angry lines'],
        { vs: ['touko', 'yogarasu'] }
      ],
      radio: [
        { at: 'start', who: 'touko', text: '逃がさない……！' },
        { at: 'overtaken', who: 'touko', text: '速い……なに、この加速……！' },
        { at: 'ahead', who: 'touko', text: 'どうして……わざと、前に出させてる？' }
      ],
      post: [
        { narr: 'ポルシェはトウコを試すように走り、そして料金所の手前で、ふっと消えた。' },
        { narr: '翌朝。救命救急センター。夜勤明けのトウコの前に、見慣れた白衣の男が立っていた。' },
        ['shindo', '神崎さん。昨夜は、東名に行っていましたね。', 'right emo:cool'],
        ['touko', '真堂先生……？ どうしてそれを。', 'emo:shock'],
        ['shindo', 'Z のブレーキの踏み方で、すぐにわかりました。お兄さんと同じだ。', 'emo:sad'],
        ['touko', '……あなたが、夜鴉。', 'emo:angry shake sfx:ドクン']
      ] }),

    S({ id: 's2_7', ch: '3', title: 'ネオン街のサバイバル', track: 'city', mode: 'elim', rivals: 5, pace: 0.9, car: 'z31', goal: { type: 'survive' }, reward: 3000,
      scene: [
        { bg: 'city' },
        ['shindo', 'お兄さんの事故の夜、私は隣を走っていました。', 'right emo:sad'],
        ['shindo', '彼は私に言った。「黒沢の手下に追われている。証拠を病院の先生に預けたい」と。'],
        ['shindo', 'でもあの夜、一台の赤いカウンタックが割り込んできた。——彼を、壁へ押し出した。', 'emo:angry'],
        ['shindo', '私は、医者なのに、彼を助けられなかった。……それからずっと、夜の湾岸であの赤い車を探している。'],
        ['touko', 'なら……どうして、今まで黙ってたんですか！', 'emo:angry shake'],
        ['shindo', '証拠がない。あるのは、お兄さんの手帳だけです。……それも、黒沢は狙っている。'],
        ['jin', 'おい！ 黒沢の連中が、八重樫のばあさんの店に来てる！', 'shake'],
        ['jin', '街の中で囲まれてる。一台ずつ振り落とせ！', 'lines']
      ],
      radio: [
        { at: 'start', who: 'jin', text: '周回の最後にビリの奴は脱落だ！ 黒沢の手下を先に落とせ！' },
        { at: 'final', who: 'yaegashi', text: 'トウコ！ あと一台だよ！' }
      ],
      post: [['yaegashi', '……ふう。店は壊されたけど、手帳は無事だよ。', 'emo:cool'], ['yaegashi', 'Z を出しな。あたしの全部を注ぎ込んでやる。', 'emo:angry lines']] }),

    /* ===================== 第四章 ===================== */
    S({ id: 's2_8', ch: '4', title: '富士 1989', track: 'r_fuji', mode: 'race', laps: 2, rivals: 7, pace: 0.92, car: 'z31t', unlock: 'z31t', goal: { type: 'place', n: 2 }, reward: 5000,
      scene: [
        { title: '第四章', sub: 'バブルの影' },
        { bg: 'circuit' },
        { narr: '富士スピードウェイ。バブルの金が流れ込み、観客席は満員だった。' },
        ['kurosawa', 'レース場はいい。金の匂いがする。', 'right emo:smile'],
        ['kurosawa', '神崎の妹だそうだな。兄貴の手帳を持っているとか。……いくらで売る？', 'emo:cool'],
        ['touko', '売りません。', 'emo:angry'],
        ['kurosawa', 'では、このレースで事故が起きても、仕方がないな。', 'emo:smile'],
        ['yaegashi', 'トウコ。Z はもう、あんたの兄さんの Z じゃない。あんたの Z だ。', 'emo:cool lines']
      ],
      radio: [
        { at: 'start', who: 'yaegashi', text: '1.5 キロのストレート、ターボが本気を出すよ！' },
        { at: 'damage', who: 'shindo', text: '無理をしないで。……あなたまで失いたくない。' },
        { at: 'final', who: 'mari', text: 'ファイナルラップ！ 2 位以内！' }
      ],
      post: [['kurosawa', '……ちっ。', 'emo:angry'], ['shindo', '神崎さん。今夜、後藤という男が湾岸に出るそうです。……赤いカウンタックの男が。', 'right emo:cool']] }),

    S({ id: 's2_9', ch: '4', title: '赤いカウンタック', boss: 'goto', track: 'harbor', mode: 'duel', laps: 2, pace: 0.98, weather: 'fog', car: 'z31t', goal: { type: 'win' }, reward: 6000,
      scene: [
        { bg: 'harbor', weather: 'fog' },
        { bgm: 'tension' },
        ['goto', '修の妹か。兄貴と同じ顔してやがる。', 'right emo:cool'],
        ['goto', '俺は後藤。黒沢の旦那に金をもらって、面倒な奴を「事故」にする仕事さ。', 'emo:smile'],
        ['touko', '……兄さんを、殺したのね。', 'emo:angry shake'],
        ['goto', '勝手にぶつかっただけだ。証拠なんて、どこにもねえよ。', 'emo:cool'],
        ['shindo', 'あります。私が見ていた。……今夜は、証言台の代わりに、走らせてもらいます。', 'right emo:angry lines'],
        { vs: ['touko', 'goto'] }
      ],
      radio: [
        { at: 'start', who: 'shindo', text: '彼は体当たりしてきます。横に並ばれないで！' },
        { at: 'damage', who: 'yaegashi', text: 'ぶつけられてる！ 逃げな！' },
        { at: 'overtook', who: 'goto', text: 'なんだと……！？' }
      ],
      post: [
        ['goto', '……くそ、女に負けるとはな。', 'emo:angry'],
        ['goto', 'いいか。黒沢の旦那は明日の夜明け、全部の書類を燃やして海外に飛ぶ。', 'emo:cool'],
        ['goto', '湾岸を抜けて成田へ。……追いつけるもんならな。'],
        ['shindo', '神崎さん。最後は、夜鴉と Z で行きましょう。', 'emo:cool']
      ] }),

    /* ===================== 最終章 ===================== */
    S({ id: 's2_10', ch: '5', title: '二台の夜', boss: 'yogarasu', track: 'highway', mode: 'sp', pace: 1.0, traffic: 8, car: 'z31t', goal: { type: 'win' }, reward: 6000,
      scene: [
        { title: '最終章', sub: '環状線の夜明け' },
        { bg: 'highway' },
        ['shindo', 'その前に、一度だけ。あなたと本気で走りたい。', 'right emo:cool'],
        ['shindo', 'お兄さんは、最後の夜、私に言いました。「妹は俺より速くなる」と。'],
        ['shindo', '確かめさせてください。……私が、あの夜から逃げずに走れるかどうかも。', 'emo:sad'],
        ['touko', '……先生。手加減したら、許しませんから。', 'emo:cool lines'],
        { vs: ['touko', 'yogarasu'] }
      ],
      radio: [
        { at: 'ahead', who: 'shindo', text: '……ああ。修くん、君の言った通りだ。' },
        { at: 'overtaken', who: 'shindo', text: 'まだです。お兄さんは、ここからもう一段踏んだ。' }
      ],
      post: [['shindo', '……完敗です。', 'emo:smile'], ['touko', '先生。夜明けまで、あと一時間です。', 'emo:cool']] }),

    S({ id: 's2_11', ch: '5', title: '夜明けの逃走', boss: 'goto', track: 'highway', mode: 'chase', pace: 0.95, traffic: 10, car: 'z31t', goal: { type: 'catch' }, reward: 10000,
      scene: [
        { bg: 'highway', weather: 'rain' },
        { narr: '午前四時半。湾岸線。雨。' },
        ['kurosawa', '後藤、飛ばせ！ 成田まで一時間だ！', 'right emo:angry'],
        ['goto', '……後ろに Z とポルシェ。しつこい連中だ。', 'emo:cool'],
        ['jin', '辰巳の連中、全員出てるぜ！ 一般車は俺たちが誘導する！', 'shake'],
        ['mari', 'ヤエガシさんが警察に手帳を届けた！ あとは、あの車を止めるだけ！'],
        ['touko', '……兄さん。一緒に行こう。', 'lines sfx:ブォォン']
      ],
      radio: [
        { at: 'start', who: 'shindo', text: '私が外から押さえます。神崎さんは、内側から！' },
        { at: 'close', who: 'goto', text: 'ちっ、並ばれた……！' },
        { at: 'damage', who: 'yaegashi', text: 'Z が悲鳴をあげてる！ でも、あと少しだよ！' }
      ],
      post: [
        { narr: '赤いカウンタックは、湾岸線の出口で、静かに止まった。' },
        { narr: '黒沢と後藤は逮捕された。修の手帳は、黒沢不動産の不正を暴く決定的な証拠になった。' },
        ['radio89', 'おはようございます、FM 湾岸。……今朝は、とてもきれいな日の出です。', 'right']
      ] }),

    S({ id: 's2_12', ch: '5', title: '大観山の朝', track: 'r_turnpike', mode: 'time', laps: 1, car: 'z31t', goal: { type: 'lap', factor: 0.3 }, reward: 5000, final: true,
      scene: [
        { bg: 'forest' },
        ['shindo', '神崎さん。お兄さんが最後に行きたがっていた場所へ、行きませんか。', 'right emo:smile'],
        ['touko', '……大観山。富士山が見えるところ。', 'emo:smile'],
        ['touko', '兄さん、いつか私を連れて行くって言ってた。「峠の上から見る富士は、東京のどのビルより高い」って。']
      ],
      radio: [{ at: 'final', who: 'touko', text: '……見えた。兄さん、富士山だよ。' }],
      post: [
        { narr: '朝日の中の富士山は、バブルのビルよりもずっと高く、ずっと静かだった。' },
        ['touko', '兄さん。……私、これからも走る。夜勤明けに、たまにね。', 'emo:smile'],
        ['shindo', '次の夜勤、一緒ですね。', 'emo:smile'],
        ['touko', '先生、救急車より速く走らないでくださいね。', 'emo:smile'],
        { narr: '——湾岸 1989　完。' }
      ] })
  ];

  var SIDE = [
    S({ id: 's2_sq1', after: 's2_3', title: '夜勤明けの救急車', track: 'city', mode: 'time', laps: 1, car: 'ambulance', goal: { type: 'lap', factor: 0.55 }, reward: 1500, char: 'touko_n',
      scene: [
        { bg: 'city' },
        ['touko_n', '救急隊が足りない！ 神崎さん、運転できる！？', 'right emo:shock'],
        ['touko', '……できます。この街の道なら、夜の間に全部覚えました。', 'emo:cool'],
        { narr: '患者は、心臓の発作を起こした老人。一分でも早く、病院へ。' }
      ],
      radio: [{ at: 'start', who: 'shindo', text: '揺らさず、でも急いで。患者さんは寝ている。' }],
      post: [['shindo', '……間に合いました。あなたの運転で、ひとり助かった。', 'right emo:smile'], ['touko', '兄さんの時は、間に合わなかったから。', 'emo:sad']] }),
    S({ id: 's2_sq2', after: 's2_7', title: '八重樫の若いころ', boss: 'yaegashi', track: 'r_usui', mode: 'touge', pace: 0.95, car: 'z31', goal: { type: 'win' }, reward: 3500, char: 'yaegashi',
      scene: [
        { bg: 'forest' },
        ['yaegashi', '昔、あたしも碓氷を走ってた。女だからって、誰も相手にしなかった時代にね。', 'right emo:cool'],
        ['yaegashi', 'だからメカニックになった。男どもの車を、あたしが速くしてやるって。', 'emo:smile'],
        ['yaegashi', '一本だけ、付き合いな。あたしの最後の峠だ。', 'emo:cool lines'],
        { vs: ['touko', 'yaegashi'] }
      ],
      radio: [{ at: 'close', who: 'yaegashi', text: 'ふん……やるじゃないか。' }],
      post: [['yaegashi', '……負けたよ。最後に、いい峠だった。', 'emo:smile'], ['touko', 'ヤエガシさん、たばこ、やめてくださいね。看護師として言ってます。', 'emo:smile']] }),
    S({ id: 's2_sq3', after: 's2_9', title: 'ジンの最後の夏', boss: 'jin', track: 'tomei', mode: 'sp', pace: 0.93, traffic: 10, car: 'z31t', goal: { type: 'win' }, reward: 3000, char: 'jin',
      scene: [
        { bg: 'highway' },
        ['jin', '俺、来月から親父の工場を継ぐ。走り屋は卒業だ。', 'right emo:cool'],
        ['jin', '最後に、修の妹と本気で一本。……いいだろ？', 'emo:smile'],
        { vs: ['touko', 'jin'] }
      ],
      radio: [{ at: 'ahead', who: 'jin', text: '……ああ、速えな。夏が終わるみてえだ。' }],
      post: [['jin', 'ありがとな。……修にも、こうやって負けたかったぜ。', 'emo:smile']] }),
    S({ id: 's2_sq4', after: 's2_12', title: '修の走り', boss: 'shu', track: 'r_tsukuba', mode: 'duel', laps: 3, pace: 0.96, car: 'z31t', goal: { type: 'win' }, reward: 5000, char: 'shu',
      scene: [
        { bg: 'circuit' },
        { narr: '八重樫の店に残っていた、一本のビデオテープ。修が筑波で走った、最後の練習の映像だった。' },
        ['yaegashi', 'ゴーストってやつだ。修の走りを、Z に覚えさせた。', 'right emo:cool'],
        ['touko', '……兄さん。一緒に走ろう。', 'emo:smile lines'],
        { vs: ['touko', 'shu'] }
      ],
      radio: [{ at: 'overtook', who: 'touko', text: '兄さん……私、ここまで来たよ。' }],
      post: [{ narr: 'テープの最後に、修の声が残っていた。' }, ['shu', '……トウコ。お前の方が、きっと速いよ。', 'emo:smile flash'], ['touko', '……うん。', 'emo:sad']] })
  ];

  R.STORIES = R.STORIES || [];
  R.STORIES.push({ id: 's2', name: { ja: 'ストーリー2　湾岸 1989', en: 'Story 2: Wangan 1989' }, hero: 'touko', era: '1989 年（平成元年）', place: '東京・首都高／箱根・群馬',
                   desc: { ja: '亡き兄の Z で夜の高速を走る看護師トウコ。兄はなぜ死んだのか。黒いポルシェ「夜鴉」の正体とは。', en: 'A nurse drives her late brother\'s Z to learn why he died.' },
                   chapters: CH, events: EV, side: SIDE, filter: 'sepia(0.12) saturate(1.15) hue-rotate(-6deg) contrast(1.05)' });
})();
