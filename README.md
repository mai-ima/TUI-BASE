# TUI-BASE

ブラウザの中で動く、ターミナル風のウェブサイトです。
ビルド不要・依存ゼロ。HTML / CSS / JavaScript だけでできています。

```
guest@tui-base:~$ help
```

## できること

- **コマンド入力** — `help` `about` `projects` `skills` `contact` など
- **使い方の早見表** — `manual` で全コマンドの書式・使用例・別名・キー操作をまとめて表示
- **仮想ファイルシステム** — `ls` `cd` `cat` `tree` `pwd`
- **入力補助** — Tab 補完、`↑`/`↓` で履歴、`→` で候補の確定、打ち間違いの候補提示
- **テーマ 5 種** — `theme midnight | amber | matrix | synth | paper`（選択は保存されます）
- **日本語 / 英語の切り替え** — `lang ja` / `lang en`
- **CRT 風の効果** — `crt on` / `crt off`
- **メニュー操作** — 左（スマートフォンでは上）のメニューはクリックでも動きます
- **ゲーム 12 種** — `tetris` `rogue` `snake` `2048` `mine` `sokoban` ほか（`games` で一覧）
- **コマンド 136 個** — Unix 風・コマンドプロンプト風・文字を扱うもの・お遊びまで
- **おまけ** — `neofetch` `fortune` `matrix` `cowsay` `figlet` `clock` など
- JavaScript が無効でも、主要な文章は `<noscript>` で読めます

キー操作: `Tab` 補完 / `↑` `↓` 履歴 / `Ctrl+L` 画面消去 / `Ctrl+C` 入力取消 / `Ctrl+U` 行削除

`help` は名前と一行説明の一覧、`manual` は書式（`<必須>` `[省略可]` `a|b`）と使用例まで含む
全コマンドの説明です。1 つだけ読みたいときは `man <名前>` または `manual <名前>`。

## 遊ぶ

`games` で一覧と自己記録が出ます。記録はブラウザに保存されます。

### キーで直接操作するもの

| コマンド | 内容 |
| --- | --- |
| `tetris` | テトリス。7 種バッグ・ホールド・ゴースト・ハードドロップ・レベル上昇 |
| `rogue` | ローグライク。自動生成の迷宮を潜り、地下 8 階の護符を持ち帰る |
| `snake` | スネーク。食べるほど伸びて速くなる |
| `2048` | 2048。同じ数を合わせて大きくする |
| `mine` | マインスイーパ。`mine easy` / `normal` / `hard` |
| `sokoban` | 倉庫番。全 8 面。`u` で一手戻す |

操作は共通で、矢印キー（または `hjkl`）で動かし、`q` でやめます。
テトリスは `↑` 回転・スペースでハードドロップ・`c` でホールド・`p` で一時停止、
ローグライクは `y u b n` で斜め移動・`p` で薬・`.` で待機です。
スマートフォンでは画面の中に方向キーが出ます。

ローグライクの記号は `@` あなた、`#` 壁、`>` 下り階段、`!` 薬、`$` 金貨、
`)` `[` 装備、`*` 護符。アルファベットはすべてモンスターで、深いほど強くなります。

### 1 行ずつ入力して遊ぶもの

| コマンド | 内容 |
| --- | --- |
| `guess` | 数当て。残りの範囲がバーで出る |
| `ttt` | 三目並べ。`easy` / `normal` / `hard`（hard は最善手なので引き分けが最高） |
| `rps` | じゃんけん。`r` `s` `p` または「ぐー」「ちょき」「ぱー」 |
| `hangman` | 言葉当て。1 文字ずつ、または単語まるごと |
| `blackjack` | ブラックジャック。`h` で引く、`s` で止める |
| `quiz` | コマンドの豆知識クイズ。`quiz 12` で問題数を指定 |

## 動かし方

動作環境は 2 通りあります。どちらでも同じように動きます。

### 1. HTML としてそのまま開く

`index.html` をブラウザで開くだけです（`file://` でも動きます）。

ローカルサーバで見たい場合:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

### 2. Vercel に置く

このリポジトリをそのまま Vercel にインポートすれば静的サイトとして公開されます。
ビルド設定は不要です（Framework Preset は **Other**、ビルドコマンドは空のままで構いません）。

CLI から公開する場合:

```bash
npx vercel        # プレビュー環境
npx vercel --prod # 本番環境
```

`vercel.json` にはキャッシュとセキュリティヘッダだけを書いてあります。

## コマンド

`help` で一覧、`manual` で全 136 個の使い方（書式・例・別名）が読めます。
分類は次のとおりです。

| 分類 | 例 |
| --- | --- |
| 内容 | `about` `projects` `skills` `contact` `help` `manual` |
| ファイル | `ls` `cd` `cat` `pwd` `tree` |
| ゲーム | `tetris` `rogue` `snake` `2048` `mine` `sokoban` `quiz` ほか |
| コマンドプロンプト風 | `dir` `type` `ver` `vol` `ipconfig` `ping` `tracert` `tasklist` `title` `color` `pause` `set` `chkdsk` ほか |
| Unix 風 | `uname` `uptime` `ps` `top` `df` `free` `du` `find` `grep` `head` `tail` `wc` `sort` `uniq` `stat` `which` `alias` `apropos` `cal` `seq` `sleep` `sl` ほか |
| 文字を扱う | `calc` `figlet` `base64` `rot13` `morse` `nato` `hash` `uuid` `password` `lorem` `upper` `rev` ほか |
| お遊び | `cowsay` `8ball` `roll` `flip` `choose` `joke` `weather` `coffee` `clock` |
| 設定・その他 | `theme` `lang` `crt` `banner` `neofetch` `history` `open` `fortune` `clear` |

`grep` `head` `tail` `wc` `sort` `find` `du` `stat` は、この中の仮想ファイルを
本当に読んで動きます。`calc` は `eval` を使わない自前の式解釈で計算します。
`title` はウィンドウ名を、`color 0a` のような DOS の色コードはテーマを実際に変えます。

いっぽう `ipconfig` `ping` `tracert` `netstat` `ps` `df` `tasklist` などは、
本物の機械やネットワークを覗いているわけではなく、それらしい表示を返すだけです
（`manual` の説明にも「演出」と書いてあります）。

## 中身を書き換える

サイトの文章・項目は **`assets/js/content.js` の 1 ファイルにまとまっています**。
ここを書き換えれば自分のサイトになります。

```js
projects: [
  {
    name: 'my-project',
    year: '2026',
    tags: ['rust', 'cli'],
    url: 'https://example.com',
    desc: { ja: '日本語の説明', en: 'English description' }
  }
]
```

- 文字列は `{ ja: '…', en: '…' }` と書くと言語切替に対応します。ただの文字列でも構いません。
- `{accent:強調したい文字}` と書くと色が付きます（`accent` `accent-2` `dim` `warn` `err` `bold` `inv`）。
- URL は自動でリンクになります。
- `contact` と `projects` に `url` を入れると `open <名前>` で開けます。

テーマの色は `assets/css/tui.css` の先頭、`[data-theme="..."]` にまとまっています。
コマンドを足したいときは `assets/js/commands.js` の `def('名前', { ... })` を真似してください。
`help` の一覧には自動で載ります。

## ファイル構成

```
index.html              画面の骨組みと、JavaScript 無効時の代替表示
vercel.json             Vercel 用の設定（静的配信・ヘッダ）
assets/css/tui.css      テーマ、レイアウト、CRT 効果
assets/js/content.js    サイトの中身（ここだけ編集すれば OK）
assets/js/fs.js         言語・保存まわりと仮想ファイルシステム
assets/js/term.js       画面描画と入力（履歴・補完・カーソル）
assets/js/commands.js   コマンドの定義
assets/js/games.js      rogue / guess / ttt と games 一覧
assets/js/gamekit.js    ゲームの共通部品（枠・入力・記録）
assets/js/games-arcade.js  tetris / snake / 2048 / mine / sokoban
assets/js/games-mini.js    rps / hangman / blackjack / quiz
assets/js/commands-extra.js  追加コマンド（DOS 風・Unix 風・文字・お遊び）
assets/js/app.js        起動処理、メニュー、ステータスバー
```

## 対応環境

モダンブラウザ（Chrome / Firefox / Safari / Edge の現行版）で動作します。
画像もフォントも外部から読み込まないため、オフラインでも動きます。
`prefers-reduced-motion` を有効にしている場合、起動演出とアニメーションは省略されます。
