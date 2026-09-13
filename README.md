# TUI-BASE

ブラウザの中で動く、ターミナル風のウェブサイトです。
ビルド不要・依存ゼロ。HTML / CSS / JavaScript だけでできています。

```
guest@tui-base:~$ help
```

## できること

- **コマンド入力** — `help` `about` `projects` `skills` `contact` など
- **仮想ファイルシステム** — `ls` `cd` `cat` `tree` `pwd`
- **入力補助** — Tab 補完、`↑`/`↓` で履歴、`→` で候補の確定、打ち間違いの候補提示
- **テーマ 5 種** — `theme midnight | amber | matrix | synth | paper`（選択は保存されます）
- **日本語 / 英語の切り替え** — `lang ja` / `lang en`
- **CRT 風の効果** — `crt on` / `crt off`
- **メニュー操作** — 左（スマートフォンでは上）のメニューはクリックでも動きます
- **ゲーム 3 種** — `rogue`（ローグライク）、`guess`（数当て）、`ttt`（三目並べ）
- **おまけ** — `neofetch` `fortune` `matrix` `sudo` など
- JavaScript が無効でも、主要な文章は `<noscript>` で読めます

キー操作: `Tab` 補完 / `↑` `↓` 履歴 / `Ctrl+L` 画面消去 / `Ctrl+C` 入力取消 / `Ctrl+U` 行削除

## 遊ぶ

`games` で一覧が出ます。記録はブラウザに保存されます。

### rogue — ローグライク

自動生成される迷宮を潜り、地下 8 階の護符を持ち帰るゲームです。
視界（影の落ち方）、モンスターの追跡、レベルアップ、装備と薬を備えた
本格的なターン制ローグライクで、キー入力はゲーム側が直接受け取ります。

```
移動      矢印キー または hjkl
斜め移動  y u b n
待つ      .
薬を飲む  p
やめる    q
```

スマートフォンでは画面内に方向キーが出ます。
`@` があなた、`#` が壁、`>` が下り階段、`!` が薬、`$` が金貨、`)` `[` が装備、
`*` が護符です。アルファベットの文字はすべてモンスターで、深く潜るほど強くなります。

### guess — 数当て

1〜100 の数を当てます。範囲がバーで表示され、最少手数が記録に残ります。

### ttt — 三目並べ

`ttt easy` / `ttt normal` / `ttt hard` で難易度を選べます。
`hard` の CPU は minimax で最善手を打つため、勝つことはできません（引き分けが最高）。

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
assets/js/games.js      ゲーム 3 種（rogue / guess / ttt）
assets/js/app.js        起動処理、メニュー、ステータスバー
```

## 対応環境

モダンブラウザ（Chrome / Firefox / Safari / Edge の現行版）で動作します。
画像もフォントも外部から読み込まないため、オフラインでも動きます。
`prefers-reduced-motion` を有効にしている場合、起動演出とアニメーションは省略されます。
