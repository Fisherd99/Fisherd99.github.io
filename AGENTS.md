# VitePress Blog Guide

## Project

- Personal zh-CN VitePress blog deployed to GitHub Pages from `master`.
- Markdown sources are in `md/`; article filenames should use English kebab-case.
- Navigation and the homepage article list are generated from frontmatter.
- The project uses ES modules and Node.js 22 in CI.

## Code Architecture

```
vitepress/
├── .github/
│   └── workflows/                # GitHub Pages deployment
├── .vitepress/
│   ├── config.mts                # Site config (publicDir=../public; source links; llms.txt emit)
│   ├── site-meta.js              # Site-only shared constants (title, categories, raw-MD URLs)
│   ├── site-config.js            # Cross-boundary constants shared with the Worker (analytics)
│   ├── generated/                # Auto-generated build inputs (DO NOT EDIT)
│   │   ├── articles.json         # Homepage article metadata
│   │   ├── llms.txt              # LLM index of raw Markdown URLs (published to /llms.txt)
│   │   ├── soundfont-hashes.mjs   # Generated SHA-256 manifest for bundled soundfonts
│   │   └── nav-config.js         # Navigation and sidebar config
│   ├── theme/                    # Custom layout and styles
│   │   ├── composables/          # Browser integrations (zoom, code lines, busuanzi, stats, title meta)
│   │   ├── custom.css            # Global theme styles
│   │   ├── BilibiliPlayer.vue    # Lazy-loaded Bilibili embed
│   │   ├── ScorePlayer.vue       # Music score page composition
│   │   ├── score-player/         # Playback adapter, lifecycle, shared controls, jianpu/print rendering
│   │   │   ├── alphatab.mjs      # Public alphaTab integration and instrument catalog
│   │   │   ├── useScorePlayer.js # Vue player state, lazy initialization and teardown
│   │   │   └── soundfonts.mjs    # SHA-256 checks, shared downloads, per-player installations
│   │   ├── HomeArticlesAuto.vue  # Homepage article list
│   │   ├── LazyGiscus.vue        # Lazy-loaded comments
│   │   ├── PageViewTrend.vue     # 60-day page-view chart
│   │   ├── CloudflareVisitorMap.vue # Cloudflare geolocation visitor map
│   │   ├── world-map-geo.js      # Simplified Natural Earth lon/lat geometry
│   │   ├── world-map-data.NOTICE.md # Map data source and license
│   │   ├── index.ts              # Theme entry (thin composition root)
│   │   └── MyLayout.vue          # Layout and analytics UI
│   ├── cache/                    # VitePress build cache
│   └── dist/                     # Built site output
├── md/                           # Markdown articles + homepage
├── public/                       # Static assets published at the site root
│   ├── alphatab/                 # Bravura, soundfonts and upstream notices
│   └── scores/                   # Sources and generated playback assets
│       ├── <slug>/
│       │   ├── score.txt         # Hand-authored jianpu source
│       │   ├── score.musicxml    # Generated score for playback/download
│       │   └── score.json        # Generated jianpu layout
│       └── README.md             # Notation syntax reference
├── package.json                  # Dependencies and scripts
├── scripts/
│   ├── content-utils.mjs         # Shared frontmatter/file helpers
│   ├── generate-articles-list.js # Generate homepage article metadata
│   ├── generate-llms-txt.js      # Generate llms.txt raw-Markdown index
│   ├── generate-nav-config.js    # Generate navigation and sidebar config
│   ├── generate-scores.js        # jianpu → MusicXML, with --verify round-trip check
│   ├── score-utils.mjs           # Jianpu parsing / measure validation / MusicXML emit
│   ├── prepare-score-soundfonts.mjs # Extract instrument presets from upstream soundfonts
│   ├── generate-soundfont-hashes.mjs # Hash menu soundfonts for runtime verification
│   ├── score-player.test.mjs     # Playback, notation and real audio regression tests
│   └── score-soundfonts.test.mjs # Shared cache and installation lifecycle tests
├── cloudflare/
│   ├── pageview-worker.js        # Page views, anti-abuse, history, visitor locations
│   ├── schema.sql                # D1 counters, buckets, dedupe, rate limits, locations
│   └── wrangler.toml             # Worker bindings, observability, and Cron trigger
├── UPDATE_LOG.md                 # Unified update changelog
└── AGENTS.md                     # File for AI Agents.
```

Do not edit generated files directly:

- `.vitepress/generated/soundfont-hashes.mjs`
- `public/scores/*/score.musicxml` and `public/scores/*/score.json`
- `.vitepress/generated/nav-config.js`
- `.vitepress/generated/articles.json`
- `.vitepress/generated/llms.txt`
- `.vitepress/dist/` and `.vitepress/cache/`

Static assets live in the project-root `public/` (published at the site root), not
`md/public/`. VitePress defaults `publicDir` to `<srcDir>/public`, so `config.mts`
overrides it via `vite.publicDir`; reference assets with absolute URLs (`/images/...`).

Two dependency-free modules hold cross-cutting constants; import from them instead
of re-declaring values:

- `.vitepress/site-meta.js` (site-only, browser-safe — no `fs`/`path`, since the
  theme bundles it): `SITE_TITLE`, `SITE_DESCRIPTION`, the `CATEGORIES` model
  (title/id/icon/color) with its derived `CATEGORY_ORDER`, the Busuanzi constants,
  and the raw-Markdown helpers `SOURCE_REPO_BASE` / `rawMarkdownUrl()`.
- `.vitepress/site-config.js` (shared with the Worker — see Analytics invariants):
  the analytics window, the pageview API contract, and `normalizeArticlePath()`.

### Markdown source access for LLMs

- `rawMarkdownUrl()` builds the raw `.md` URL; `config.mts` injects a per-page
  `<link rel="alternate" type="text/markdown">` in `transformPageData`, and the theme
  renders a "跳转源文件" link beside the last-updated line — both point at the raw
  file, not the GitHub HTML view.
- `scripts/generate-llms-txt.js` derives `.vitepress/generated/llms.txt`
  (llmstxt.org format) from `articles.json`; the `vitepress:llms-txt` Vite plugin in
  `config.mts` publishes it to `/llms.txt` (build asset + dev middleware).

## Commands

```bash
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
npm run generate-nav
npm run generate-articles
npm run generate-llms
npm run generate-scores
npm run generate-soundfont-hashes
npm run test:scores
npm run cf:pageview:dev
npm run cf:pageview:d1:migrate:local
npm run cf:pageview:d1:migrate
npm run cf:pageview:deploy
```

Local development must not affect production statistics. `npm run docs:dev`
defaults `PAGEVIEW_API_BASE` to the production Cloudflare Worker, so every page
opened locally is counted in the production D1 database. Disable tracking for
local runs:

```bash
PAGEVIEW_API_BASE= npm run docs:dev
```

## Regression Test

Run `npm run test:scores` after score playback/parser changes or alphaTab/soundfont upgrades.
If score sources or generators changed, run `node scripts/generate-scores.js --verify` first; never hand-edit generated assets.
For substantive bug fixes, add behavior-focused regression coverage; resolve failures without weakening assertions merely to pass.
Run `npm run docs:build` separately (it does not run these tests); verify affected audio, scrolling, and controls in the browser with production tracking disabled.
Unrelated article/style edits need no score tests; exercise Worker endpoints when analytics changes.

## Markdown Content

Articles belong in `md/` and require frontmatter like:

```yaml
---
title: Article Title
lang: zh-CN
date: YYYY-MM-DD
author: Fisherd
categories: 物理 # 物理 / 计算机 / 生活 / 音乐
tags:
  - tag
description: Article description
---
```

- Missing frontmatter or `categories` excludes an article from generated lists.
- Prefer optimized WebP previews, retain the original via `data-zoom-src`, and
specify dimensions and lazy loading on raw `<img>` elements.
- KaTeX renders mathematics at build time.

### Article paths must stay single-segment

`cloudflare/pageview-worker.js` only accepts single-segment lowercase kebab paths
(`ARTICLE_PATH_PATTERN`). An article at `/music/foo` returns `400 invalid_path`
and that page's analytics silently stop working. Keep landing pages at the top
level (`/tabi-no-tochu`); express grouping through `categories` and the nav, not
through the URL.

### Music section

- Edit only `public/scores/<slug>/score.txt`; syntax is in `public/scores/README.md`. Generate `score.musicxml`/`score.json` in the same folder; do not hand-edit outputs. Build verifies beat counts, pitches, programs and repeats without auto-padding.
- Keep `ScorePlayer.vue` thin: `useScorePlayer.js` owns lifecycle/state; `alphatab.mjs` owns integration; shared transport/settings and jianpu/print components own their views.
- Resources load near the viewport. `soundfonts.mjs` verifies SHA-256 before sharing download bytes across routes, evicts failures, and serializes per-player installations until acknowledgement; never abort shared downloads on unmount.
- Rebuild instrument subsets with `prepare-score-soundfonts.mjs <upstream.sf2/sf3>`, then run `npm run generate-soundfont-hashes` (also in dev/build). Preserve samples/licenses; never load full Sonivox alongside MS Basic.
- Change programs AND Instrument automations, then issue ordered MIDI load → seek → optional play; retain expanded playback position and intent across Worker notifications. Avoid timer-based restoration.
- Use public `customScrollHandler`/`stopScrolling` for follow mode; index public `tickCache` on `midiLoad`. Avoid private internals and the recursive `midiLoaded` getter in alphaTab 1.8.4.
- Keep both alphaTab build/dev Worker plugins and the invalid-jQuery guard. Check playback on dev or a plain static server, rather than `docs:preview`.

## Analytics invariants

- Cloudflare Worker + D1 is the authoritative page-view source. Counters are
  atomic, keyed by normalized article path, and protected by deduplication and
  rate limiting.
- The analytics window (`TREND_DAYS`, `RECENT_BUCKETS`, half-hour buckets), the
  pageview API contract (`PAGEVIEW_*_PATH`, the `pageview-track-api` meta name),
  and `normalizeArticlePath()` live in `.vitepress/site-config.js`, imported by both
  the site and `cloudflare/pageview-worker.js`; change them in one place only.
- Article URLs and new page-view writes use extensionless paths (for example,
  `/gdb`). `.html` requests normalize to that same key for compatibility, and
  history reads include previously stored `.html` rows.
- One page-load POST returns the total, recent reads, trend points, and global
  visitor locations. Keep this single-roundtrip design.
- Visitor geography comes from `request.cf`; coordinates are rounded before D1
  storage. Raw IPs are excluded from D1 and client responses; a structured
  Workers Log records the IP only when a page view is counted. Cloudflare Logs
  retention is short (3 days on Free, 7 days on Paid); restrict dashboard access.
- The Cloudflare map uses local Natural Earth longitude/latitude geometry and
  projects it directly in `CloudflareVisitorMap.vue` with the equirectangular
  formula. Land outlines and `request.cf` coordinates share the antimeridian
  seam and the -90° to 90° latitude range. Cloudflare city coordinates are
  approximate and can fall just offshore, especially after coordinate
  rounding; do not shift a point to land because that would misrepresent it.
  MapMyVisitors remains an optional third-party reference map loaded separately.
- Cloudflare Web Analytics is a separate private dashboard source. Do not
  backfill or merge its historical country data into the D1 visitor map.
- Busuanzi is retained only as a clearly labeled third-party reference count.
  It uses the official v3 API (`cdn.busuanzi.cc/api.php`) and the
  `busuanzi_page_pv` element; its counts are separate from Cloudflare's.
- Preserve existing D1 totals during schema changes. Apply `schema.sql` before
  deploying Worker code that depends on new tables or columns.
- Production errors must not expose internal details. Logs and traces remain
  enabled through `wrangler.toml`.

## Maintenance

- Update `UPDATE_LOG.md` for user-visible features, architecture changes, or
  deployment changes.
- GitHub Actions deploys pushes to `master`; local edits are not live until the
  site is committed and pushed. Cloudflare Worker deployment is separate.
