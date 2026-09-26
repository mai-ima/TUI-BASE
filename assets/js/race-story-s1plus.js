/*
 * race-story-s1plus.js — 本編「天竜の白い亡霊」の追加分。
 *
 *   ・序章の前に回想「十年前の夜明け」（主人公ユウが何者で、なぜ走らなくなったのか）
 *   ・実在のコース（浜松の市街地・国道・鈴鹿・いろは坂・ターンパイク…）を使う新しい話
 *   ・エピローグ「ふたたび、夜明けの配達」
 *   ・サブクエスト（仲間たちのサイドストーリー）8 本
 * 台本の書き方は race-story.js と同じ。{ bgm: 'tension' } で曲を変えられる。
 */
(function () {
  'use strict';
  var TB = window.TB, R = TB.Race, C = R.CHARS;

  /* ---------- 登場人物（追加） ---------- */
  C.genzo = { name: '源蔵じいちゃん', color: '#c5a880',
              face: { skin: '#dcb08a', hair: '#e8e8e8', style: 'buzz', eyes: '#2a1a10', acc: 'glasses', shirt: '#3f51b5', bg: '#1d2238' } };
  C.soichi_y = { name: 'ソウイチ（十年前）', color: '#fafafa',
                 face: { skin: '#e8c8aa', hair: '#2a2a2a', style: 'swept', eyes: '#3a2a1a', acc: 'none', shirt: '#eceff1', bg: '#2a2f3a' } };
  C.you_y = { name: 'ユウ（九歳）', color: '#5ccfa0',
              face: { skin: '#f6d6b8', hair: '#2a2a2a', style: 'short', eyes: '#2b1d14', acc: 'none', shirt: '#ffb74d', bg: '#23303a' } };
  C.shin = { name: 'シン（タカの弟）', color: '#ffab91',
             face: { skin: '#eccaa8', hair: '#e0a030', style: 'short', eyes: '#222', acc: 'freckles', shirt: '#ff7043', bg: '#2a1810' } };
  C.kei = { name: 'ケイ（鉄仮面の素顔）', color: '#b0bec5',
            face: { skin: '#f0d4bc', hair: '#90a4ae', style: 'hood', eyes: '#607d8b', acc: 'none', shirt: '#263238', bg: '#101418' } };
  C.hikaru = { name: 'ヒカル（レイの兄）', color: '#90caf9',
               face: { skin: '#f1d0b5', hair: '#1e3f8a', style: 'swept', eyes: '#16325c', acc: 'glasses', shirt: '#eceff1', bg: '#18263d' } };

  C.null = C.null || { name: 'NULL', color: '#ff1744', face: C.zero.face };

  /* ---------- ボス（追加） ---------- */
  var B = R.BOSSES;
  B.soichi = { name: 'SOICHI', color: '#f5f5f5', body: 'ae86', ai: 'technician', skill: 1.05, boss: true, ability: 'block' };
  B.shin = { name: 'SHIN', color: '#ff8a65', body: 's13', ai: 'aggressive', skill: 0.7, boss: true };
  B.kei = { name: 'KEI', color: '#546e7a', body: 'r32', ai: 'technician', skill: 1, boss: true, ability: 'block' };
  B.hikaru = { name: 'HIKARU', color: '#1e88e5', body: 'gt', ai: 'technician', skill: 1, boss: true, ability: 'block' };
  B.genzo = { name: 'GENZO', color: '#c5a880', body: 'classic', ai: 'technician', skill: 1, boss: true, ability: 'block' };

  function S(o) { return o; }
  function at(id) { for (var i = 0; i < R.STORY.length; i++) if (R.STORY[i].id === id) return i; return -1; }
  function after(id, ev) { var i = at(id); R.STORY.splice(i + 1, 0, ev); }
  function before(id, ev) { var i = at(id); R.STORY.splice(i, 0, ev); }
  function set(id, o) { var e = R.STORY[at(id)]; for (var k in o) e[k] = o[k]; }

  /* ===================== 回想：十年前の夜明け ===================== */
  R.CHAPTERS.unshift({ id: 'z', name: '回想　十年前の夜明け' });
  before('p1', S({ id: 'z1', ch: 'z', title: '最後の夜明けドライブ', track: 'hm_tenryu', mode: 'time', laps: 1, car: 'ae86', goal: { type: 'lap', factor: 0.33 }, reward: 300,
    scene: [
      { title: '回想', sub: '十年前の夜明け' },
      { bg: 'tenryu' },
      { narr: '十年前。静岡県浜松市、天竜区。国道152号。' },
      { narr: '夜明け前の山道を、白と黒のハチロクが下っていく。助手席には、九歳の俺が乗っていた。' },
      ['you_y', 'とうちゃん、なんで毎朝この道なの？ 高速のほうが早いのに。'],
      ['soichi_y', 'この道はな、正直なんだ。ごまかした分だけ、ちゃんと怒る。', 'right emo:smile'],
      ['soichi_y', '母さんが入院してたころ、毎朝この道で病院に通った。……母さんが好きだったんだ。天竜川が朝日で光るところ。'],
      ['you_y', '……かあちゃん、もう見られないね。', 'emo:sad'],
      ['soichi_y', 'だから、代わりに俺たちが見るんだ。ほら、ハンドル。一緒に持て。', 'emo:smile'],
      { narr: '父は、シフトの位置も、ブレーキの抜き方も、何ひとつ口で教えなかった。' },
      { narr: 'ただ毎朝、同じ道を、同じように走ってみせた。俺はそれを、全身で覚えた。' },
      ['soichi_y', 'ユウ。速く走るってのはな、怖いことを我慢することじゃない。'],
      ['soichi_y', '怖いものが何かを、ちゃんと知ることだ。', 'lines'],
      ['you_y', '……よくわかんない。'],
      ['soichi_y', 'いつか全部教えてやる。約束だ。', 'emo:smile']
    ],
    radio: [
      { at: 'start', who: 'soichi_y', text: 'ほら、力を抜け。車が行きたい方へ、ちょっとだけ手伝うんだ。' },
      { at: 'final', who: 'you_y', text: 'とうちゃん、川が光ってる！' }
    ],
    post: [
      { narr: 'それが、父と走った最後の朝になった。' },
      { narr: 'その夜、父は「白い亡霊」として天竜の峠に出て——翌朝、ガードレールの外に、壊れた相手の車だけが残っていた。' },
      { narr: '父のハチロクは、どこにもなかった。警察は「事故のあと行方不明」とだけ言った。' },
      { bg: 'city' },
      ['genzo', '……ユウ坊。今日から、うちに来い。', 'right emo:sad'],
      ['genzo', 'わしは源蔵。お前の親父の車を、ずっと見てきた整備屋だ。孫のミナもおる。'],
      ['you_y', '……とうちゃんは、走るのが好きだったから、いなくなったの？', 'emo:sad'],
      ['genzo', '……。', 'emo:sad'],
      { narr: '九歳の俺は決めた。車で速く走るのは、もうやめよう、と。' },
      { narr: '速く走れば、大事な人がいなくなる。だから俺は、弁当を揺らさないようにだけ走ることにした。' },
      { narr: '——十年間、毎朝、父と同じ道を。父と同じ走り方で。そうとは気づかないまま。' }
    ] }));

  /* ===================== 既存の話を実在のコースへ ===================== */
  set('1a', { track: 'hm_city', laps: 1, goal: { type: 'lap', factor: 0.37 } });
  set('2a', { track: 'r_iroha', goal: { type: 'win' } });
  set('6a', { track: 'r_turnpike', laps: 1, goal: { type: 'lap', factor: 0.34 } });
  set('6b', { track: 'r_tsubaki', laps: 1 });
  set('7a', { track: 'r_suzuka', laps: 2 });
  // 1a の会話に市街地の説明を足す
  R.STORY[at('1a')].scene.splice(4, 0, ['bit', '今年の予選は、なんと浜松の本物の街の中！ 駅前から鍛冶町、浜松城まで、道を丸ごと閉鎖したァ！', 'shake']);

  /* ===================== 第一章に追加：浜名バイパス ===================== */
  after('1c', S({ id: '1d', ch: '1', title: '浜名バイパスの夜', boss: 'taka', track: 'hm_bypass', mode: 'race', laps: 1, rivals: 3, pace: 0.86, goal: { type: 'win' }, reward: 2000,
    scene: [
      { bg: 'coast' },
      { narr: 'レイとのデュエルから三日後。浜松の南、国道1号・浜名バイパス。' },
      ['taka', 'よう、配達屋。ちっと付き合えや。', 'right emo:cool'],
      ['taka', 'うちの餃子屋、今月で閉めるかもしれねえ。借金ってやつだ。', 'emo:sad'],
      ['taka', 'このバイパスの草レースで勝てば、賞金が出る。……お前に勝たなきゃ、意味がねえんだよ。', 'emo:angry'],
      ['you', '……なんで俺なんだ。'],
      ['taka', 'お前に負けてから、弟のシンが言うんだよ。「兄ちゃんより配達屋の方がかっこいい」ってな！', 'emo:angry shake'],
      ['mina', '……それ、ただの兄弟げんかじゃない？', 'emo:smile'],
      ['taka', 'うるせえ！ 海沿いの直線は俺の S13 の庭だ！', 'lines sfx:ブォォン'],
      { vs: ['you', 'taka'] }
    ],
    radio: [
      { at: 'start', who: 'mina', text: 'ほとんど直線！ スリップストリームを使って！' },
      { at: 'overtaken', who: 'taka', text: '見てるかシン！ 兄ちゃんの走りを！' },
      { at: 'overtook', who: 'taka', text: 'くそっ、またかよ……！' },
      { at: 'final', who: 'mina', text: '弁天島の橋が見えたらゴール！' }
    ],
    post: [
      ['taka', '……へっ。完敗だ。', 'emo:smile'],
      ['you', '賞金、半分持ってけ。'],
      ['taka', 'はあ！？ 施しなんていらねえよ！', 'emo:angry'],
      ['you', '施しじゃない。……餃子、百人前の前払いだ。ガレージのみんなで食う。', 'emo:cool'],
      ['taka', '……配達屋。お前、ほんと変なやつだな。', 'emo:smile'],
      { narr: 'その夜、ガレージ遠州には、焼きたての浜松餃子の匂いが満ちた。' }
    ] }));

  /* ===================== 第二章に追加：碓氷の184カーブ ===================== */
  after('2d', S({ id: '2e', ch: '2', title: '碓氷峠・184 のカーブ', track: 'r_usui', mode: 'time', laps: 1, goal: { type: 'lap', factor: 0.215 }, reward: 2500,
    scene: [
      { bg: 'forest' },
      { narr: '群馬と長野の境、旧国道18号・碓氷峠。カーブの数は、184。' },
      ['gen', 'ユウ。名古屋へ行く前に、ひとつ聞いておく。', 'right emo:cool'],
      ['gen', 'お前、本当は走るのが怖いんだろう。'],
      ['you', '……。'],
      ['gen', '親父が消えてから、お前は「速く走ると大事な人がいなくなる」と思い込んできた。'],
      ['gen', 'だから誰にも負けないくらい上手いのに、ずっと配達屋のふりをしていた。', 'emo:sad'],
      ['you', '……ふりじゃない。俺は、配達屋だ。', 'emo:angry'],
      ['gen', 'なら、配達屋として走れ。184 のカーブの先で、ミナが朝飯を待っとる。'],
      ['gen', '怖さを消すんじゃない。怖いものが何か、ちゃんと見るんだ。', 'lines'],
      ['you', '……それ、親父も言ってた。', 'emo:shock'],
      ['gen', 'わしが教えた言葉だからな。', 'emo:smile']
    ],
    radio: [
      { at: 'start', who: 'gen', text: '一つ一つのカーブに名前をつけるつもりで走れ。' },
      { at: 'damage', who: 'gen', text: '当てたな。怖さから目をそらすと、そうなる。' },
      { at: 'final', who: 'mina', text: 'ユウ！ 峠の茶屋が見えたよ！ 朝ごはん、冷めちゃう！' }
    ],
    post: [
      ['mina', 'おかえり！ ……なんか、顔つき変わった？', 'emo:smile'],
      ['you', '……184 個、全部怖かった。', 'emo:cool'],
      ['you', 'でも、どれが怖いのか、全部わかった。', 'emo:smile'],
      ['gen', '……それでいい。それが、ソウイチの走りだ。', 'emo:smile']
    ] }));

  /* ===================== 第五章に追加：鉄仮面の素顔・父の手紙 ===================== */
  after('5b', S({ id: '5c', ch: '5', title: '赤城の鉄仮面', boss: 'kei', track: 'r_akagi', mode: 'touge', pace: 0.97, goal: { type: 'win' }, reward: 5000,
    scene: [
      { bg: 'forest', weather: 'fog' },
      { narr: 'カーネルに勝った翌週。ミナがハチロクのドアの内張りの裏から、一通の封筒を見つけた。' },
      ['mina', 'ユウ……これ、ソウイチおじさんの字だよ。', 'emo:shock'],
      { narr: '『ユウへ。もしこれを読んでいるなら、お前はもう、あの道を走っているんだろう。』' },
      { narr: '『俺は、走り屋たちを守るために消える。お前には、父親のいない十年を背負わせることになる。』' },
      { narr: '『許してくれとは言わない。ただ、赤城に行け。そこに、俺が救えなかった子がいる。』' },
      ['you', '……救えなかった子？'],
      { bgm: 'tension' },
      ['tekkamen', '……………………。', 'right sfx:ゴォォォ'],
      ['tekkamen', '……ソウイチの、ムスコ。', 'emo:angry'],
      { narr: '鉄仮面が、ゆっくりと仮面を外した。現れたのは、俺と同じくらいの年の少年だった。' },
      ['kei', '僕はケイ。カーネルの研究所で育った。NULL の「教師データ」になるために。', 'emo:sad'],
      ['kei', '十年前、ソウイチさんは僕を研究所から連れ出そうとして……失敗した。'],
      ['kei', 'あの人は言った。「必ず迎えに来る」って。……来なかった。', 'emo:angry shake'],
      ['you', '……俺も、待ってた。十年。', 'emo:sad'],
      ['kei', 'なら、どっちが本当に待ってたか。赤城の下りで決めよう。', 'emo:cool lines'],
      { vs: ['you', 'kei'] }
    ],
    radio: [
      { at: 'start', who: 'kei', text: '僕の走りは、NULL に教えるために作られた。完璧な線だ。' },
      { at: 'close', who: 'kei', text: 'どうして……データにない線なのに、速い……！' },
      { at: 'overtook', who: 'kei', text: '……あったかい走り方だね。ソウイチさんと同じだ。' },
      { at: 'overtaken', who: 'mina', text: '霧で前が見えない！ でもユウなら、道を覚えてるはず！' }
    ],
    post: [
      ['kei', '……僕、ずっと怒ってたんだ。迎えに来なかった人に。', 'emo:sad'],
      ['you', '俺もだ。……でも、たぶん、迎えに来られない理由があったんだ。'],
      ['you', '一緒に確かめに行こう。親父と、NULL のところへ。', 'emo:smile'],
      ['kei', '……うん。', 'emo:smile'],
      { narr: '鉄仮面——ケイは、その日から仮面をかぶるのをやめた。' }
    ] }));

  /* ===================== エピローグ ===================== */
  after('f1', S({ id: 'f2', ch: 'f', title: 'ふたたび、夜明けの配達', track: 'hm_tenryu', mode: 'time', laps: 1, car: 'keitra', goal: { type: 'lap', factor: 0.3 }, reward: 5000, final: true,
    scene: [
      { title: 'エピローグ', sub: 'ふたたび、夜明けの配達' },
      { bg: 'tenryu' },
      { narr: 'あの嵐の夜から、ひと月。' },
      { narr: '浜松市天竜区。国道152号。夜明け前、四時半。' },
      ['soichi', '……本当に軽トラで行くのか。', 'right emo:smile'],
      ['you', '配達だからな。親父は助手席。弁当を揺らしたら、罰金な。', 'emo:cool'],
      ['soichi', 'はは……十年前と逆だな。', 'emo:smile'],
      ['mina', 'ユウ！ 荷台のロープ、今日はちゃんとしてる！ えらい！', 'emo:smile'],
      ['genzo', '行ってこい、二人とも。', 'emo:smile'],
      ['you', '……行ってきます。', 'lines']
    ],
    radio: [
      { at: 'start', who: 'soichi', text: 'ユウ、力を抜け。車が行きたい方へ……「ちょっとだけ手伝う」。……覚えてるか。' },
      { at: 'final', who: 'soichi', text: '……川が光ってる。母さんに見せたかったな。' }
    ],
    post: [
      { narr: '天竜川が、朝日で光った。' },
      ['soichi', 'ユウ。速く走るってのは——', 'emo:smile'],
      ['you', '怖いものが何かを、ちゃんと知ること。……だろ。', 'emo:smile'],
      ['soichi', '……もう、教えることは何もないな。', 'emo:smile flash'],
      { narr: '——天竜の白い亡霊　完。' },
      { narr: 'サブストーリーのタブで、仲間たちのその後が読める。' }
    ] }));
  // f1 の終わりのせりふを、エピローグへつながる形に
  var f1 = R.STORY[at('f1')];
  f1.post = f1.post.filter(function (x) { return !(x.narr && (x.narr.indexOf('完') >= 0 || x.narr.indexOf('道はどこまでも') >= 0)); });

  /* ===================== サブクエスト ===================== */
  R.SIDE1 = [
    S({ id: 'sq1', after: '1d', title: 'タカの弟・シンの初峠', boss: 'shin', track: 'r_myogi', mode: 'touge', pace: 0.8, goal: { type: 'win' }, reward: 1500, char: 'shin',
      scene: [
        { bg: 'forest' },
        ['shin', 'ユウ兄ちゃん！ 兄ちゃんに内緒で、S13 借りてきた！', 'right emo:smile'],
        ['you', '……タカに殺されるぞ。'],
        ['shin', 'だって兄ちゃん、「お前にはまだ早い」ばっかり！ 妙義山で勝負して！', 'emo:angry'],
        ['taka', 'シィィン！！ 俺の車ァ！！', 'shake sfx:ドドドド'],
        ['you', '……一本だけだ。俺が後ろから教える。', 'emo:cool']
      ],
      radio: [{ at: 'start', who: 'taka', text: '配達屋！ 弟に怪我させたら承知しねえぞ！' }, { at: 'close', who: 'shin', text: 'ユウ兄ちゃん、ぴったり後ろ……こわっ！' }],
      post: [['shin', '……ぜんぜん敵わなかった。', 'emo:sad'], ['taka', 'それでいいんだよ。負けて覚えるんだ。俺もそうだった。', 'emo:smile'], ['taka', '……配達屋。ありがとな。', 'emo:cool']] }),
    S({ id: 'sq2', after: '2e', title: 'ミナのセッティング・ノート', track: 'r_tsukuba', mode: 'time', laps: 2, goal: { type: 'lap', factor: 0.33 }, reward: 1800, char: 'mina',
      scene: [
        { bg: 'circuit' },
        ['mina', 'ねえユウ。わたし、ずっと隠してたことがあるの。', 'right emo:sad'],
        ['mina', '本当は、レースのエンジニアになりたい。おじいちゃんの工場も継ぎたいけど……サーキットで働きたいの。'],
        ['mina', 'これ、十年分のセッティング・ノート。ハチロクの足回り、全部わたしが考えた数字。'],
        ['you', '……どうりで、曲がるたびに車が言うことを聞くわけだ。', 'emo:smile'],
        ['mina', '筑波で、このノートのセッティングが正しいか確かめさせて！ 目標タイムを切れたら……わたし、エンジニアの学校に願書出す！', 'emo:smile lines']
      ],
      radio: [{ at: 'lap', who: 'mina', text: '最終コーナーの立ち上がり、どう？ 数字、合ってる？' }, { at: 'final', who: 'mina', text: 'お願い……切って……！' }],
      post: [['mina', '切った……切ったよユウ！', 'emo:smile shake'], ['genzo', '……ミナ。工場のことは気にするな。わしはまだ百まで働くでな。', 'right emo:smile'], ['mina', 'おじいちゃん……！', 'emo:sad']] }),
    S({ id: 'sq3', after: '3b', title: 'ガンマ署長の十年', track: 'hm_bypass', mode: 'chase', boss: 'phantom', pace: 0.86, traffic: 8, car: 'police', goal: { type: 'catch' }, reward: 2500, char: 'gamma',
      scene: [
        { bg: 'coast' },
        ['gamma', '浜松の浜名バイパスで、ファントムの仲間が暴走している。', 'right'],
        ['gamma', '……十年前、私はソウイチを追っていた。「白い亡霊」を捕まえるのが、私の仕事だった。', 'emo:sad'],
        ['gamma', 'あの夜、私が追い詰めなければ、彼は消えなかったのかもしれない。'],
        ['you', '……署長のせいじゃない。'],
        ['gamma', 'だから今度は、守るために追う。力を貸してくれ。', 'emo:cool']
      ],
      radio: [{ at: 'start', who: 'gamma', text: '一般車を巻き込むな。止めるのは、あいつだけだ。' }],
      post: [['gamma', '確保。……ありがとう、ユウくん。', 'emo:smile'], ['gamma', 'ソウイチに会ったら伝えてくれ。「十年分の追跡は、もう終わりだ」と。']] }),
    S({ id: 'sq4', after: '4d', title: '宵闇の約束', boss: 'yoiyami', track: 'hm_tomei', mode: 'sp', pace: 0.95, traffic: 8, goal: { type: 'win' }, reward: 3500, char: 'yoiyami',
      scene: [
        { bg: 'highway' },
        ['yoiyami', '……私が東名を走る理由、聞きたい？', 'right emo:cool'],
        ['yoiyami', '私の父は、ソウイチのナビゲーターだった。十年前のあの夜も、助手席に乗るはずだった。'],
        ['yoiyami', 'でも父は、あの夜だけ熱を出して寝込んでいた。……代わりに乗ったのが、レイのお兄さん。', 'emo:sad'],
        ['yoiyami', '父はずっと、自分が乗っていれば、って言い続けて……去年、亡くなった。'],
        ['yoiyami', '父の分まで、あなたの走りを隣で見届けたかったの。……今夜は、浜松の東名で。', 'emo:smile']
      ],
      radio: [{ at: 'ahead', who: 'yoiyami', text: '……父さん。これが、ソウイチの息子の走りよ。' }],
      post: [['yoiyami', 'ありがとう。父も、きっと笑ってる。', 'emo:smile'], ['yoiyami', 'これからは、宵闇じゃなくて本名で走るわ。……ヨイ。ただのヨイ。']] }),
    S({ id: 'sq5', after: '5c', title: 'ケイの初めての朝', track: 'hm_oku', mode: 'time', laps: 1, goal: { type: 'lap', factor: 0.38 }, reward: 2500, char: 'kei',
      scene: [
        { bg: 'hamanako' },
        ['kei', 'ユウ。研究所の外で、朝を見たことがないんだ。', 'right emo:sad'],
        ['you', 'じゃあ、奥浜名湖の湖岸を走ろう。舘山寺から気賀まで。朝日が湖に映る。'],
        ['kei', '……それは、データにない景色だね。', 'emo:smile']
      ],
      radio: [{ at: 'final', who: 'kei', text: '光ってる……湖が、光ってる……！' }],
      post: [['kei', 'NULL に教えたかったのは、これだったのかもしれない。', 'emo:smile'], ['kei', '速さだけじゃなくて……走った先に、何があるか。']] }),
    S({ id: 'sq6', after: '7a', title: 'レイの兄・ヒカル', boss: 'hikaru', track: 'r_fuji', mode: 'duel', laps: 2, pace: 0.96, goal: { type: 'win' }, reward: 4000, char: 'ray',
      scene: [
        { bg: 'circuit' },
        ['ray', 'ユウ。兄貴が、どうしてもお前と走りたいって。', 'right emo:cool'],
        ['hikaru', 'はじめまして。ヒカルです。……足はもう動かないけど、手で運転できる車を作ってもらった。', 'emo:smile'],
        ['hikaru', '十年前、君のお父さんは、ガードレールの外で動けない僕を、夜が明けるまで励まし続けてくれた。'],
        ['hikaru', 'そして救急車が来た瞬間、「俺はここにいなかったことにしてくれ」って……消えたんだ。', 'emo:sad'],
        ['you', '……親父は、ヒカルさんを助けてたのか。', 'emo:shock'],
        ['hikaru', '富士のストレートで、それを伝えたかった。……本気で来て。', 'emo:cool lines']
      ],
      radio: [{ at: 'close', who: 'ray', text: '兄貴、楽しそうだな……。' }, { at: 'overtook', who: 'hikaru', text: 'はは……やっぱり、あの人の息子だ！' }],
      post: [['hikaru', 'ありがとう。……十年分、スッキリした。', 'emo:smile'], ['ray', '兄貴が笑ったの、十年ぶりだ。', 'emo:sad']] }),
    S({ id: 'sq7', after: 'f2', title: '源蔵じいちゃんの青春', boss: 'genzo', track: 'r_haruna', mode: 'touge', pace: 0.95, goal: { type: 'win' }, reward: 5000, char: 'genzo',
      scene: [
        { bg: 'forest' },
        ['genzo', 'ユウ坊。わしがなんで整備屋になったか、話したことはなかったな。', 'right emo:cool'],
        ['genzo', '五十年前、わしも走り屋だった。榛名で、ゲンと毎晩張り合っとった。', 'emo:smile'],
        ['gen', 'こいつは下りだけはわしより速かった。……上りは遅かったがな。', 'emo:smile'],
        ['genzo', '一本、下りで勝負せい。ソウイチにも一度も負けたことはないぞ。', 'emo:angry lines'],
        { vs: ['you', 'genzo'] }
      ],
      radio: [{ at: 'close', who: 'gen', text: '源蔵、年を考えろ！' }, { at: 'overtook', who: 'genzo', text: 'ほう……！' }],
      post: [['genzo', '……負けた、負けた。これで心置きなく隠居できるわい。', 'emo:smile'], ['mina', 'おじいちゃん、百まで働くって言ったでしょ！', 'emo:angry']] }),
    S({ id: 'sq8', after: 'f2', title: '父と子の一本勝負', boss: 'soichi', track: 'tenryu', mode: 'touge', pace: 1.02, goal: { type: 'win' }, reward: 10000, char: 'soichi',
      scene: [
        { bg: 'tenryu' },
        ['soichi', 'ユウ。約束、覚えてるか。「いつか全部教えてやる」って。', 'right emo:smile'],
        ['soichi', '教えることは、もう何もない。だから——最後に、全部見せる。', 'emo:cool'],
        ['you', '……手加減したら、一生口きかないからな。', 'emo:cool lines'],
        { vs: ['you', 'soichi'] }
      ],
      radio: [{ at: 'close', who: 'soichi', text: 'そうだ……怖いものを、見ろ。' }, { at: 'overtook', who: 'soichi', text: '……そうか。お前はもう、俺の前を走るんだな。' }],
      post: [['soichi', '……いい走りだ。母さんにも見せたかった。', 'emo:smile'], ['you', '見てるよ、きっと。川が光ってたから。', 'emo:smile'], { narr: '——サブストーリー　完。' }] })
  ];
  R.STORIES = R.STORIES || [];
  R.STORIES.unshift({ id: 's1', name: { ja: '本編　天竜の白い亡霊', en: 'Main: The White Ghost of Tenryu' }, hero: 'you', era: '現代', place: '静岡県浜松市・全国の峠とサーキット',
                      desc: { ja: '十年前に消えた父の車で、配達屋のユウが走り出す。父はなぜ消えたのか。「NULL」とは何か。', en: 'A delivery boy drives his vanished father\'s car to find the truth.' },
                      chapters: R.CHAPTERS, events: R.STORY, side: R.SIDE1 });
})();
