/*
 * content.js — このファイルだけを書き換えれば、サイトの中身が変わります。
 * ---------------------------------------------------------------------
 * 文字列は { ja: "...", en: "..." } の形で書くと言語切替に対応します。
 * 文字列をそのまま書いた場合は、どちらの言語でもその文字列が使われます。
 */
window.CONTENT = {
  /* ---- 基本設定 ------------------------------------------------------ */
  meta: {
    user: 'guest',
    host: 'tui-base',
    version: '1.0.0',
    defaultLang: 'ja',        // 'ja' | 'en'
    defaultTheme: 'midnight', // themes のキー
    title: 'TUI-BASE',
    tagline: {
      ja: 'ブラウザの中の、小さなターミナル。',
      en: 'A small terminal that lives in your browser.'
    }
  },

  /* ---- 起動時に流れるログ（演出） ------------------------------------- */
  boot: [
    'TUI-BASE BIOS v1.0.0 — (c) 2026',
    'CPU ......... WebEngine / single core',
    'MEMORY ...... 640K OK',
    'DISPLAY ..... text mode 80x24',
    'MOUNT ....... /home/guest ... ok',
    'MODULES ..... terminal, router, themes, i18n ... ok',
    'READY.'
  ],

  /* ---- 起動後の挨拶 --------------------------------------------------- */
  welcome: {
    ja: [
      'ようこそ。ここはキーボードで歩けるウェブサイトです。',
      "はじめに {accent:help} と入力して Enter を押してみてください。",
      'メニューはクリック（タップ）でも動きます。'
    ],
    en: [
      'Welcome. This is a website you walk through with a keyboard.',
      'Type {accent:help} and press Enter to get started.',
      'The menu is clickable too.'
    ]
  },

  /* ---- about ---------------------------------------------------------- */
  about: {
    ja: [
      'TUI-BASE は、ターミナル風のウェブサイトを作るための土台です。',
      'ビルド不要・依存ゼロ。index.html を開けばそのまま動きます。',
      '',
      '{dim:設計方針}',
      '  1. 速いこと      — 画像もフレームワークも使わない',
      '  2. 壊れないこと  — JavaScript の外でも文章は読める',
      '  3. 触れること    — 履歴・補完・テーマ・日本語/英語切替',
      '',
      'このページの文章は assets/js/content.js に入っています。',
      '書き換えれば、あなたのサイトになります。'
    ],
    en: [
      'TUI-BASE is a starting point for terminal-flavoured websites.',
      'No build step, no dependencies. Open index.html and it runs.',
      '',
      '{dim:Principles}',
      '  1. Fast     — no images, no framework',
      '  2. Robust   — the text is readable without JavaScript',
      '  3. Tactile  — history, completion, themes, JA/EN',
      '',
      'Everything you are reading lives in assets/js/content.js.',
      'Rewrite it and the site becomes yours.'
    ]
  },

  /* ---- projects ------------------------------------------------------- */
  projects: [
    {
      name: 'tui-base',
      year: '2026',
      tags: ['html', 'css', 'vanilla-js'],
      url: '',
      desc: {
        ja: 'いま見ているこれ。1ファイルから始められるターミナル風サイト。',
        en: 'The thing you are looking at. A terminal-style site in plain HTML.'
      }
    },
    {
      name: 'example-cli',
      year: '2025',
      tags: ['rust', 'cli'],
      url: '',
      desc: {
        ja: 'サンプル項目です。content.js の projects を書き換えてください。',
        en: 'A placeholder. Edit the projects array in content.js.'
      }
    },
    {
      name: 'example-api',
      year: '2024',
      tags: ['go', 'postgres'],
      url: '',
      desc: {
        ja: 'サンプル項目です。url を入れるとリンクとして表示されます。',
        en: 'A placeholder. Add a url and it becomes a link.'
      }
    }
  ],

  /* ---- skills --------------------------------------------------------- */
  skills: [
    { group: { ja: '言語', en: 'Languages' }, items: ['TypeScript', 'Python', 'Go', 'Rust'] },
    { group: { ja: 'フロント', en: 'Frontend' }, items: ['HTML', 'CSS', 'React', 'Vite'] },
    { group: { ja: '基盤', en: 'Infra' }, items: ['Linux', 'Docker', 'Vercel', 'GitHub Actions'] },
    { group: { ja: '道具', en: 'Tools' }, items: ['Neovim', 'tmux', 'ripgrep', 'git'] }
  ],

  /* ---- contact / links ------------------------------------------------ */
  contact: [
    { label: 'email', value: 'you@example.com', url: 'mailto:you@example.com' },
    { label: 'github', value: 'github.com/you', url: 'https://github.com/' },
    { label: 'site', value: 'example.com', url: 'https://example.com' }
  ],

  /* ---- おまけ: fortune で出る一言 ------------------------------------- */
  fortunes: [
    { ja: '早すぎる最適化は諸悪の根源。', en: 'Premature optimization is the root of all evil.' },
    { ja: '単純であることは、簡単であることより難しい。', en: 'Simple is harder than easy.' },
    { ja: '動くコードより、消せるコード。', en: 'Code you can delete beats code that merely works.' },
    { ja: '迷ったら、行を減らす。', en: 'When in doubt, remove a line.' },
    { ja: 'ドキュメントは未来の自分への手紙。', en: 'Docs are letters to your future self.' }
  ]
};
