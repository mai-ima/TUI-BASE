/*
 * race-story3.js — ストーリー3「やらまいか 1964 ―浜松から世界へ―」
 *
 * 1964 年（昭和 39 年）、東京オリンピックの年。静岡県浜松市。
 * オートバイと織機の工場がひしめく「ものづくりの町」で、
 * 小さな町工場「坂下発動機」の見習い・早瀬イチロー（19）は、
 * オートバイのエンジンで作った手作りの車で、鈴鹿の日本グランプリに挑む。
 * 遠州弁の「やらまいか（やってみよう）」を合言葉に。
 */
(function () {
  'use strict';
  var TB = window.TB, R = TB.Race, C = R.CHARS, B = R.BOSSES;

  /* ---------- 登場人物 ---------- */
  C.ichiro = { name: 'イチロー', color: '#ffb74d',
               face: { skin: '#e9c09a', hair: '#1a1a1a', style: 'short', eyes: '#2a1a10', acc: 'hachimaki', shirt: '#546e7a', bg: '#2b2418' } };
  C.tome = { name: 'トメ社長', color: '#a1887f',
             face: { skin: '#d8a882', hair: '#eeeeee', style: 'bun', eyes: '#2a1a10', acc: 'glasses', shirt: '#5d4037', bg: '#2a1f18' } };
  C.natsu = { name: 'ナツ', color: '#f48fb1',
              face: { skin: '#f3cfb0', hair: '#2b1b12', style: 'ponytail', eyes: '#3b2a20', acc: 'freckles', shirt: '#90a4ae', bg: '#2b2a36' } };
  C.himuro = { name: '氷室', color: '#80deea',
               face: { skin: '#f0d0b4', hair: '#101010', style: 'pompadour', eyes: '#1a2a3a', acc: 'shades', shirt: '#eceff1', bg: '#12202a' } };
  C.jack = { name: 'ジャック', color: '#c5e1a5',
             face: { skin: '#f7dccb', hair: '#f0d070', style: 'wavy', eyes: '#3a6a9a', acc: 'none', shirt: '#2e7d32', bg: '#16261a' } };
  C.tetsu = { name: '鉄っつぁん', color: '#bcaaa4',
              face: { skin: '#c9966f', hair: '#6d6d6d', style: 'buzz', eyes: '#222', acc: 'scar', shirt: '#3e4a52', bg: '#1a1d20' } };
  C.okawa = { name: '実況・大川アナ', color: '#fff59d',
              face: { skin: '#e8c3a2', hair: '#222', style: 'swept', eyes: '#222', acc: 'glasses', shirt: '#37474f', bg: '#262626' } };
  C.ichiro_old = { name: 'イチロー（2024 年）', color: '#ffb74d',
                   face: { skin: '#dcae8c', hair: '#f5f5f5', style: 'short', eyes: '#2a1a10', acc: 'glasses', shirt: '#546e7a', bg: '#2b2418' } };

  /* ---------- ボスと車 ---------- */
  B.himuro = { name: 'HIMURO', color: '#eceff1', body: 'classic', ai: 'technician', skill: 1.02, boss: true, ability: 'block' };
  B.sawaki = { name: 'SAWAKI', color: '#90caf9', body: 'classic', ai: 'aggressive', skill: 0.85, boss: true, ability: 'ram' };
  B.jack = { name: 'JACK', color: '#2e7d32', body: 'classic', ai: 'speedster', skill: 1, boss: true, ability: 'burst' };
  B.tetsu = { name: 'TETSU', color: '#8d6e63', body: 'trike', ai: 'technician', skill: 0.9, boss: true, ability: 'block' };
  B.tome = { name: 'TOME', color: '#6d4c41', body: 'keitra', ai: 'technician', skill: 0.95, boss: true, ability: 'block' };
  [
    { id: 'trike3', name: { ja: '三輪トラック（坂下発動機）', en: 'Three-wheeler truck' }, cls: 'D', price: 0, body: 'trike', paint: 7, unlock: true, era: 1964,
      stats: { spd: 3, acc: 4, grp: 4, arm: 6, nit: 3 }, desc: { ja: '工場の配達用。曲がるときは体を傾けろ。', en: 'The factory delivery trike.' } },
    { id: 'saka1', name: { ja: 'サカシタ号（手作り 1 号）', en: 'Sakashita No.1' }, cls: 'C', price: 0, body: 'kei', paint: 7, unlock: true, era: 1964,
      stats: { spd: 5, acc: 6, grp: 6, arm: 4, nit: 5 }, desc: { ja: 'オートバイの 2 気筒エンジンを積んだ手作りの軽自動車。', en: 'A handmade car with a motorcycle twin.' } },
    { id: 'saka2', name: { ja: 'サカシタ GP（1964 年型）', en: 'Sakashita GP (1964)' }, cls: 'A', price: 0, body: 'classic', paint: 1, unlock: true, era: 1964,
      stats: { spd: 8, acc: 8, grp: 8, arm: 5, nit: 7 }, desc: { ja: 'ナツが設計した流線形のボディ。4 気筒・4 キャブ。日本グランプリ仕様。', en: "Natsu's streamlined GP car." } }
  ].forEach(function (c) { if (!R.CARS.some(function (x) { return x.id === c.id; })) R.CARS.push(c); });

  function S(o) { return o; }

  var CH = [
    { id: '0', name: '序章　やらまいか' },
    { id: '1', name: '第一章　浜名湖の草レース' },
    { id: '2', name: '第二章　峠を越えて' },
    { id: '3', name: '第三章　鈴鹿' },
    { id: '4', name: '第四章　日本グランプリ' },
    { id: '5', name: '終章　富士の約束（1966）' }
  ];

  var EV = [
    /* ===================== 序章 ===================== */
    S({ id: 's3_1', ch: '0', title: '三輪トラックの配達', track: 'hm_mikata', mode: 'time', laps: 1, car: 'trike3', goal: { type: 'lap', factor: 0.33 }, reward: 500,
      scene: [
        { title: 'やらまいか 1964', sub: '序章' },
        { bg: 'hamamatsu' },
        { narr: '昭和 39 年、春。静岡県浜松市。' },
        { narr: '町じゅうに、織機の音とオートバイのエンジン音が響いていた。' },
        ['tome', 'イチロー！ 三方原の組立工場まで、クランクシャフト二十本！ 昼までだよ！', 'right emo:angry'],
        ['ichiro', 'へい、社長！ ……って、あと三十分しかないじゃないすか！', 'emo:shock'],
        ['tome', 'だもんで急ぎなって言っとるだら！ 遠州の男なら、やらまいか！', 'emo:angry shake'],
        ['natsu', 'イチロー、ばあちゃんの「やらまいか」は「つべこべ言わずにやれ」って意味だでね。', 'right emo:smile'],
        ['ichiro', '知ってるよナツ！ ……よし、姫街道を一気に上るぞ！', 'lines']
      ],
      radio: [
        { at: 'start', who: 'natsu', text: '三輪は曲がるとき倒れやすいで！ 体を内側に！' },
        { at: 'final', who: 'natsu', text: '工場の煙突が見えた！ あと少し！' }
      ],
      post: [
        ['tome', '……間に合ったか。まあまあだね。', 'emo:cool'],
        { narr: 'その夜、工場の片隅で。ナツが一枚の設計図を広げた。' },
        ['natsu', 'イチロー。これ、見て。', 'emo:smile'],
        ['ichiro', '……車？ 四つ輪の……レースカー！？', 'emo:shock'],
        ['natsu', 'うちのオートバイのエンジンを二つ積むの。鈴鹿の日本グランプリに出る車だよ。', 'emo:smile'],
        ['ichiro', '俺たちみたいな町工場が、グランプリに……？'],
        ['natsu', '……やらまいか。', 'emo:smile lines']
      ] }),

    /* ===================== 第一章 ===================== */
    S({ id: 's3_2', ch: '1', title: '湖畔の草レース', track: 'hm_oku', mode: 'race', laps: 1, rivals: 5, pace: 0.8, car: 'saka1', unlock: 'saka1', goal: { type: 'place', n: 3 }, reward: 1500,
      scene: [
        { title: '第一章', sub: '浜名湖の草レース' },
        { bg: 'hamanako' },
        { narr: '三か月後。休日も夜も返上して、手作りの「サカシタ号」が完成した。' },
        ['tome', '……エンジンは、うちの二気筒を二つ。フレームは鉄パイプ。ボディはナツの手叩きのアルミ。', 'right emo:cool'],
        ['tome', 'こんなもんで、走るのかね。', 'emo:sad'],
        ['natsu', '走るよ！ 浜名湖の草レースで、三位までに入れたら……ばあちゃん、グランプリ出場、許して！', 'emo:angry'],
        ['tome', '……ええら。三位に入ったら考えてやる。', 'emo:cool'],
        ['ichiro', 'よっしゃ！', 'lines sfx:ブロロロ']
      ],
      radio: [
        { at: 'start', who: 'natsu', text: 'エンジンは 8000 回転まで回るで！ でも、それ以上はダメ！' },
        { at: 'overtook', who: 'natsu', text: '抜いた！ 手作りの車が、外車を抜いたよ！' },
        { at: 'final', who: 'tome', text: 'イチロー！ 踏みな！' }
      ],
      post: [
        ['tome', '……三位、かね。', 'emo:cool'],
        ['tome', 'あたしはね、戦争で工場を二度焼かれた。二度とも、この町の人間は、翌日から瓦礫を片付けた。', 'emo:sad'],
        ['tome', '浜松の人間はね、負けると、次の日にはもう作り始めるんだ。……行きな。グランプリ。', 'emo:smile'],
        ['natsu', 'ばあちゃん……！', 'emo:smile shake']
      ] }),

    S({ id: 's3_3', ch: '1', title: 'ワークスの影', boss: 'sawaki', track: 'hm_bypass', mode: 'duel', laps: 1, pace: 0.86, car: 'saka1', goal: { type: 'win' }, reward: 2000,
      scene: [
        { bg: 'coast' },
        ['himuro', '浜松の町工場が、グランプリに出るそうだな。', 'right emo:cool'],
        ['himuro', '俺は氷室。大手メーカー「東亜自動車」のワークスドライバーだ。'],
        ['himuro', '素人の手作り車が鈴鹿を走れば、事故のもとだ。……沢木、相手をしてやれ。', 'emo:cool'],
        ['ichiro', '素人かどうか、走って見せてやる！', 'emo:angry lines'],
        { vs: ['ichiro', 'himuro'] }
      ],
      radio: [{ at: 'start', who: 'natsu', text: '相手は体当たりしてくるかも！ 横に並ばれないで！' }],
      post: [['himuro', '……ほう。', 'emo:cool'], ['himuro', '鈴鹿で待っている。本物のレースを教えてやろう。']] }),

    /* ===================== 第二章 ===================== */
    S({ id: 's3_4', ch: '2', title: '碓氷の郵便屋', boss: 'tetsu', track: 'r_usui', mode: 'touge', pace: 0.85, car: 'saka1', goal: { type: 'win' }, reward: 2500,
      scene: [
        { title: '第二章', sub: '峠を越えて' },
        { bg: 'forest' },
        { narr: '部品を手に入れるため、イチローたちは群馬の部品屋へ向かった。碓氷峠を越えて。' },
        ['tetsu', 'おう、坊主。その妙ちくりんな車で峠を越えるだと？', 'right emo:smile'],
        ['tetsu', 'わしは鉄。この峠で三十年、郵便を運んどる。三輪でな。'],
        ['tetsu', '峠はな、エンジンで越えるもんじゃねえ。道を知ってるやつが越えるんだ。', 'emo:cool'],
        ['ichiro', 'じゃあ、教えてくれよ。走りで。', 'emo:smile lines'],
        { vs: ['ichiro', 'tetsu'] }
      ],
      radio: [{ at: 'close', who: 'tetsu', text: 'ほう……若いのに、道の声を聞いとる。' }],
      post: [['tetsu', '参った。……持ってけ、坊主。キャブレターの調整のコツだ。', 'emo:smile'], ['natsu', '鉄っつぁん、元は飛行機のエンジン屋さんだったんだって！', 'emo:shock']] }),

    S({ id: 's3_5', ch: '2', title: '榛名の夜', track: 'r_haruna', mode: 'time', laps: 1, car: 'saka1', goal: { type: 'lap', factor: 0.27 }, reward: 2000,
      scene: [
        { bg: 'forest' },
        ['natsu', 'イチロー、部品屋の親父さんが、朝までに榛名の上まで来いって。', 'right'],
        ['natsu', '「夜の峠を時間内に上れたら、4 気筒のエンジンを譲ってやる」って！', 'emo:smile'],
        ['ichiro', '夜の峠かよ……ライト、暗いんだよなこの車。', 'emo:sad']
      ],
      radio: [{ at: 'final', who: 'natsu', text: '湖が見えた！ 間に合う！' }],
      post: [['natsu', '4 気筒……これで、グランプリ仕様が作れる！', 'emo:smile shake'], { narr: '帰りの車の中で、ナツは一晩中、新しい設計図を描き続けた。' }] }),

    /* ===================== 第三章 ===================== */
    S({ id: 's3_6', ch: '3', title: '鈴鹿・予選', track: 'r_suzuka', mode: 'time', laps: 1, car: 'saka2', unlock: 'saka2', goal: { type: 'lap', factor: 0.36 }, reward: 3000,
      scene: [
        { title: '第三章', sub: '鈴鹿' },
        { bg: 'circuit' },
        { narr: '三重県、鈴鹿サーキット。二年前にできたばかりの、日本で初めての本格的なサーキット。' },
        ['okawa', '日本グランプリ予選！ 国内のメーカー、海外のプライベーター、そして……浜松の町工場！', 'right shake'],
        ['natsu', '「サカシタ GP」。流線形のアルミのボディ。4 気筒・4 キャブレター。……わたしの車だよ。', 'emo:smile'],
        ['ichiro', '8 の字のコースか。立体交差で上を通るのって、変な感じだな。'],
        ['natsu', 'S 字は、リズムよく！ 目標タイムを切れば決勝に出られる！', 'lines']
      ],
      radio: [{ at: 'start', who: 'natsu', text: '一コーナーは思ったより長いよ！' }],
      post: [['okawa', '予選通過！ 浜松の手作りマシンが、決勝グリッドに並びます！', 'shake sfx:ワアアア'], ['himuro', '……来たか。', 'right emo:cool']] }),

    S({ id: 's3_7', ch: '3', title: '雨のサポートレース', track: 'r_suzuka', mode: 'race', laps: 1, rivals: 7, pace: 0.88, weather: 'rain', car: 'saka2', goal: { type: 'place', n: 3 }, reward: 3500,
      scene: [
        { bg: 'circuit', weather: 'rain' },
        ['jack', 'ハロー！ ジャック・ハリス。イギリスから来たよ。', 'right emo:smile'],
        ['jack', 'きみの車、美しいね。ハンドメイド？ ブリティッシュ・ガレージの精神だ！'],
        ['ichiro', 'え、ええと……サンキュー？', 'emo:shock'],
        ['jack', '雨の鈴鹿は、イギリスの天気。ボクの得意だよ。表彰台で会おう！', 'emo:cool']
      ],
      radio: [
        { at: 'start', who: 'natsu', text: '雨はアクセルを丁寧に！ 4 キャブは急に踏むとむせるよ！' },
        { at: 'overtook', who: 'jack', text: 'ワオ！ ナイス・ムーブ！' }
      ],
      post: [['jack', 'イチロー、きみは雨の中でも笑ってた。本物のレーサーだ。', 'emo:smile'], ['jack', '明日の決勝、氷室には気をつけて。彼は……勝つためなら何でもする。', 'emo:cool']] }),

    S({ id: 's3_8', ch: '3', title: '夜の火事', track: 'hm_city', mode: 'time', laps: 1, car: 'trike3', goal: { type: 'lap', factor: 0.33 }, reward: 2000,
      scene: [
        { bg: 'city' },
        { bgm: 'tension' },
        { narr: '決勝前夜。浜松から電報が届いた。「コウジョウ　カジ　スグカエレ」' },
        ['natsu', 'うそ……工場が……！', 'emo:shock shake'],
        ['ichiro', '俺が行く！ 決勝までに戻ってくる！', 'emo:angry lines'],
        { narr: '夜行で浜松へ。駅前に置いてあった工場の三輪トラックで、燃える工場へ走る。' }
      ],
      radio: [{ at: 'start', who: 'ichiro', text: '社長……無事でいてくれ……！' }],
      post: [
        { narr: '工場は半分が焼けていた。だが、トメ社長は無事だった。' },
        ['tome', '……ばかもん。レーサーがレースの前の晩に何しとる。', 'right emo:angry'],
        ['tome', '工場なんて、また建てりゃいい。三度目だでね。慣れとる。', 'emo:smile'],
        ['tome', '火をつけた男の車を見た。白い、東亜の車だったよ。……でも、そんなことはどうでもいい。', 'emo:cool'],
        ['tome', '走って、勝って、浜松の名前を鈴鹿に刻んできな。それが一番の仕返しだ。', 'emo:smile lines']
      ] }),

    /* ===================== 第四章 ===================== */
    S({ id: 's3_9', ch: '4', title: '日本グランプリ決勝', boss: 'himuro', track: 'r_suzuka', mode: 'race', laps: 2, rivals: 7, pace: 0.96, car: 'saka2', goal: { type: 'win' }, reward: 10000,
      scene: [
        { title: '第四章', sub: '日本グランプリ' },
        { bg: 'circuit' },
        ['okawa', '日本グランプリ決勝！ 観衆は十万人！ ラジオの前の皆さん、歴史が動きます！', 'right shake sfx:ワアアア'],
        ['himuro', '……工場が焼けたそうだな。気の毒に。', 'right emo:cool'],
        ['ichiro', '火をつけたのは、あんたのとこの誰かだろ。', 'emo:angry'],
        ['himuro', '……俺は知らない。だが、会社は町工場に勝たれることを恐れている。', 'emo:sad'],
        ['himuro', '俺は、ドライバーだ。勝つのは、ハンドルでだ。', 'emo:cool lines'],
        ['natsu', 'イチロー。ばあちゃんの、町の、浜松のみんなの車だよ。', 'emo:smile'],
        ['ichiro', '……やらまいか！', 'lines sfx:ブォォン'],
        { vs: ['ichiro', 'himuro'] }
      ],
      radio: [
        { at: 'start', who: 'okawa', text: 'スタート！ 浜松のサカシタ GP、好スタート！' },
        { at: 'close', who: 'himuro', text: '……町工場の車が、この速さか。' },
        { at: 'overtook', who: 'okawa', text: '抜いたァ！ 130R で、ワークスを抜いたァ！' },
        { at: 'final', who: 'natsu', text: 'ファイナルラップ！ イチロー、やらまいか！' }
      ],
      post: [
        ['okawa', '優勝は……浜松の町工場、坂下発動機！ 早瀬イチロー！！', 'shake flash sfx:ワアアアア'],
        ['himuro', '……完敗だ。会社には、俺から話す。火事の件も、全部。', 'emo:sad'],
        ['himuro', 'いい車だった。設計者は、あの娘か。', 'emo:smile'],
        ['natsu', '……うん！', 'emo:smile']
      ] }),

    /* ===================== 終章 ===================== */
    S({ id: 's3_10', ch: '5', title: '富士の約束', track: 'r_fuji', mode: 'race', laps: 2, rivals: 6, pace: 0.98, boss: 'jack', car: 'saka2', goal: { type: 'win' }, reward: 10000,
      scene: [
        { title: '終章', sub: '富士の約束（1966）' },
        { bg: 'circuit' },
        { narr: '二年後、1966 年。富士山のふもとに、新しいサーキットができた。' },
        ['jack', 'イチロー！ 約束通り、また来たよ。今度は負けない！', 'right emo:smile'],
        ['himuro', '俺もだ。今は自分のチームで走っている。……町工場の、な。', 'emo:cool'],
        ['tome', '新しい工場もできた。従業員は三十人。……イチロー、あんたのおかげだよ。', 'emo:smile'],
        ['natsu', 'イチロー、最後のストレートは 1.5 キロ。サカシタ GP の最高速、試してみて！', 'lines']
      ],
      radio: [
        { at: 'start', who: 'natsu', text: 'スタート！ 富士のストレートは、ぜんぶ踏んで！' },
        { at: 'overtook', who: 'jack', text: 'ハハ！ やっぱりきみは最高だ！' }
      ],
      post: [['jack', 'おめでとう、イチロー。次は、ヨーロッパで会おう。', 'emo:smile'], ['ichiro', 'ヨーロッパ……！', 'emo:shock']] }),

    S({ id: 's3_11', ch: '5', title: 'ふるさとの凱旋', track: 'hm_city', mode: 'time', laps: 1, car: 'saka2', goal: { type: 'lap', factor: 0.36 }, reward: 5000, final: true,
      scene: [
        { bg: 'city' },
        { narr: '浜松の町は、凱旋パレードで埋め尽くされた。駅前から、鍛冶町、浜松城まで。' },
        ['tome', 'ほら、手を振りな。町じゅうが、あんたたちを見とるよ。', 'right emo:smile'],
        ['natsu', 'イチロー。わたし、決めた。自動車の設計者になる。世界一の。', 'emo:smile'],
        ['ichiro', 'じゃあ俺は、その車で世界一になる。', 'emo:smile lines']
      ],
      radio: [{ at: 'final', who: 'natsu', text: '浜松城が見えた！ ……ありがとう、みんな！' }],
      post: [
        { narr: '——それから、六十年。' },
        { bg: 'hamamatsu' },
        ['ichiro_old', '……あの年、町工場の小さな車が、世界への道を開いた。', 'right emo:smile'],
        ['ichiro_old', 'この町の人間は、負けても次の日には作り始める。それが、浜松だ。'],
        ['ichiro_old', 'さあ、今度はお前たちの番だ。……やらまいか。', 'emo:smile lines'],
        { narr: '——やらまいか 1964　完。' }
      ] })
  ];

  var SIDE = [
    S({ id: 's3_sq1', after: 's3_2', title: 'トメの戦後', boss: 'tome', track: 'hm_mikata', mode: 'touge', pace: 0.86, car: 'trike3', goal: { type: 'win' }, reward: 1500, char: 'tome',
      scene: [
        { bg: 'hamamatsu' },
        ['tome', '戦争が終わったとき、あたしは焼け野原で、軍の払い下げのトラックを直して走らせた。', 'right emo:cool'],
        ['tome', '食べ物を運んで、部品を運んで、町を作り直した。女がトラックなんて、って笑われたよ。'],
        ['tome', '……一本、付き合いな。あのころの走りを見せてやる。', 'emo:smile lines'],
        { vs: ['ichiro', 'tome'] }
      ],
      radio: [{ at: 'close', who: 'tome', text: 'ほう、ついてくるかい！' }],
      post: [['tome', '……年には勝てんね。', 'emo:smile'], ['ichiro', 'いや、社長、あと一息で負けてましたよ……。', 'emo:shock']] }),
    S({ id: 's3_sq2', after: 's3_5', title: 'ナツの設計図', track: 'hm_oku', mode: 'time', laps: 1, car: 'saka1', goal: { type: 'lap', factor: 0.38 }, reward: 2000, char: 'natsu',
      scene: [
        { bg: 'hamanako' },
        ['natsu', 'わたしね、大学に行きたかった。でも、女の子は工業大学には入れないって言われた。', 'right emo:sad'],
        ['natsu', 'だから、ばあちゃんの工場で、図書館の本で勉強したの。空気の流れも、重心も。'],
        ['natsu', '新しいボディの形、湖畔の道で確かめて。風の音が静かになれば、正解だよ。', 'emo:smile']
      ],
      radio: [{ at: 'final', who: 'natsu', text: '……静かだ。風が、車に沿って流れてる。' }],
      post: [['natsu', '正解だった……！ 本の中の数字が、ほんとうに走った！', 'emo:smile shake']] }),
    S({ id: 's3_sq3', after: 's3_7', title: 'ジャックの故郷', boss: 'jack', track: 'r_iroha', mode: 'touge', pace: 0.93, car: 'saka2', goal: { type: 'win' }, reward: 3000, char: 'jack',
      scene: [
        { bg: 'forest' },
        ['jack', 'ボクの父は、戦争で日本と戦った。父は日本を憎んでいた。', 'right emo:sad'],
        ['jack', 'でもボクは、日本の職人の車に憧れて来たんだ。……日光の九十九折り、一緒に走ろう。', 'emo:smile'],
        { vs: ['ichiro', 'jack'] }
      ],
      radio: [{ at: 'overtook', who: 'jack', text: 'ビューティフル……！' }],
      post: [['jack', '父に手紙を書くよ。「日本には、最高の友達がいる」って。', 'emo:smile']] }),
    S({ id: 's3_sq4', after: 's3_9', title: '氷室の走り', boss: 'himuro', track: 'r_suzuka', mode: 'duel', laps: 1, pace: 0.97, car: 'saka2', goal: { type: 'win' }, reward: 4000, char: 'himuro',
      scene: [
        { bg: 'circuit' },
        ['himuro', '会社を辞めた。……これからは、自分の意思で走る。', 'right emo:cool'],
        ['himuro', '誰も見ていない鈴鹿で、もう一度だけ。ドライバー同士として。', 'emo:smile'],
        { vs: ['ichiro', 'himuro'] }
      ],
      radio: [{ at: 'close', who: 'himuro', text: '……楽しいな。レースは、本当は楽しいものだった。' }],
      post: [['himuro', 'ありがとう、イチロー。やっと、走るのが好きになれた。', 'emo:smile']] })
  ];

  R.STORIES = R.STORIES || [];
  R.STORIES.push({ id: 's3', name: { ja: 'ストーリー3　やらまいか 1964', en: 'Story 3: Yaramaika 1964' }, hero: 'ichiro', era: '1964 年（昭和 39 年）', place: '静岡県浜松市・鈴鹿・富士',
                   desc: { ja: '浜松の町工場の見習いイチローが、手作りの車で鈴鹿の日本グランプリに挑む。', en: 'A Hamamatsu factory apprentice takes a handmade car to the Japanese GP.' },
                   chapters: CH, events: EV, side: SIDE, filter: 'sepia(0.45) saturate(0.85) contrast(1.06) brightness(1.02)' });
})();
