# VitePress Blog Guide

## Project and architecture

Personal zh-CN VitePress blog. The project uses ES modules and Node.js 22 in CI.
GitHub Pages publishes the site; Cloudflare Worker + D1 supplies page-view statistics.

```text
vitepress/
├── .github/workflows/deploy.yml  # Tests, build and GitHub Pages deployment
├── .vitepress/
│   ├── config.mts                # Site config, KaTeX, raw source links and runtime plugins
│   ├── site-meta.js              # Site title, categories, source URL helpers and Busuanzi constants
│   ├── site-config.js            # Shared analytics contract, time windows and path rules
│   ├── analytics-config.mjs      # Environment defaults and overrides
│   ├── generated/                # Generated build inputs; do not edit
│   │   ├── articles.json         # Validated article index
│   │   ├── nav-config.js         # Navigation and sidebar
│   │   ├── llms.txt              # Raw Markdown index
│   │   └── soundfont-hashes.mjs  # Soundfont SHA-256 manifest
│   └──  theme/
│       ├── index.ts              # Thin theme entry
│       ├── MyLayout.vue          # Page composition
│       ├── custom.css            # Global styles
│       ├── composables/          # Browser integrations (zoom, code lines, busuanzi, Cloudflare, title meta)
│       ├── HomeArticlesAuto.vue  # Homepage article list
│       ├── PageViewDashboard.vue # Statistics composition
│       ├── PageViewTrend.vue     # Trend chart
│       ├── CloudflareVisitorMap.vue
│       ├── world-map-geo.js      # Natural Earth geometry
│       ├── world-map-data.NOTICE.md # Geometry source and license
│       ├── MapMyVisitors.vue     # Third-party reference map
│       ├── LazyGiscus.vue        # Lazy-loaded comments
│       ├── BilibiliPlayer.vue    # Lazy-loaded video embed
│       ├── ScorePlayer.vue       # Thin score composition
│       └── score-player/
│           ├── alphatab.mjs      # Playback adapter and instrument catalog
│           ├── useScorePlayer.js # Vue state and lifecycle
│           ├── soundfonts.mjs    # Downloads, verification and installation
│           ├── ScoreUtil.vue      # Playback controls, progress, speed and instruments
│           └── JianpuView.vue    # Rendering, shared row grouping and printing
├── md/                           # Homepage and articles
├── public/
│   ├── alphatab/                 # Fonts, soundfonts and upstream notices
│   └── scores/
│       ├── README.md             # Notation syntax
│       └── <slug>/
│           ├── score.txt         # Authored jianpu notation
│           ├── score.musicxml    # Generated playback/download score
│           └── score.json        # Generated jianpu layout
├── scripts/
│   ├── content-utils.mjs         # YAML and file helpers
│   ├── generate-content.mjs      # Orchestrate all generated inputs
│   ├── generate-*.js             # Article index, navigation, llms.txt, scores and soundfont hashes
│   ├── score-utils.mjs           # Jianpu parsing, measure validation and MusicXML/display models
│   ├── prepare-score-soundfonts.mjs # Extract instrument presets from upstream soundfonts
│   ├── patch-alphatab.mjs        # Version-checked AudioWorklet lifecycle fix (postinstall)
│   ├── content.test.mjs
│   ├── analytics.test.mjs
│   ├── score-player.test.mjs
│   ├── score-worklet.test.mjs
│   └── score-soundfonts.test.mjs
├── cloudflare/
│   ├── pageview-worker.js        # Page views, anti-abuse, history, visitor locations
│   ├── schema.sql                # D1 counters, buckets, dedupe, rate limits, locations
│   └── wrangler.toml             # Worker bindings, observability, and Cron trigger
├── package.json                  # Dependencies and commands
├── DEPLOY_PAGEVIEW_API.md         # Worker deployment guide
├── UPDATE_LOG.md                 # Unified update changelog
└── AGENTS.md                     # File for AI Agents.
```

Keep shared values in their existing modules. `site-meta.js` and `site-config.js`
are browser-safe and dependency-free: no Node built-ins or framework imports.
Static assets belong in project-root `public/`, not `md/public/`; reference them
with root-relative URLs such as `/images/example.webp`.

### Generated files

Edit sources and run the relevant generator; never hand-edit these outputs:

| Output | Source / generator |
| --- | --- |
| `.vitepress/generated/articles.json` | `md/` → `generate-articles-list.js` |
| `.vitepress/generated/nav-config.js`, `llms.txt` | Validated article index → navigation / llms generators |
| `.vitepress/generated/soundfont-hashes.mjs` | Bundled soundfonts → `generate-scores.js` |
| `public/scores/*/score.musicxml`, `score.json` | `score.txt` → `generate-scores.js` |
| `.vitepress/dist/`, `.vitepress/cache/` | VitePress build output and cache |

## Commands and environments

| Command | Purpose |
| --- | --- |
| `npm install` / `npm ci` | Install dependencies / reproduce the lockfile (CI) |
| `npm run docs:dev` | Generate inputs and start development server |
| `npm run docs:build` | Generate inputs, verify scores and build; does not run tests |
| `npm run docs:preview` | Preview built site; use dev or a plain static server for playback checks |
| `npm run generate-content` | Generate soundfont hashes, scores, articles, navigation and llms.txt; scan Markdown once |
| `npm run generate-articles` | Regenerate article index |
| `npm run generate-nav` / `npm run generate-llms` | Refresh article index, then generate the selected output |
| `npm run generate-scores` | Generate soundfont hashes, MusicXML and jianpu layout |
| `node scripts/generate-scores.js --verify` | Generate and verify score round trips |
| `npm test` | Run site and score regression suites |
| `npm run test:site` / `npm run test:scores` | Run content/analytics lifecycle tests / playback, notation and soundfont tests |
| `npm run cf:pageview:dev` | Start local Worker |
| `npm run cf:pageview:d1:create` / `npm run cf:pageview:d1:info` | Create / inspect D1 database |
| `npm run cf:pageview:d1:migrate:local` / `npm run cf:pageview:d1:migrate` | Apply schema locally / remotely |
| `npm run cf:pageview:deploy` | Deploy Worker separately from the site |

`generate-content` only generates inputs and does not forward verification options.
`docs:build` runs `generate-scores.js --verify` separately before automatic generation.

### Statistics during local work

Local work must not affect production statistics. Prefer `docs:dev` for browser checks.

| Setting | Development default | Production-build default |
| --- | --- | --- |
| `PAGEVIEW_API_BASE` | No API tracking | Production Worker URL |
| `CLOUDFLARE_ANALYTICS_ENABLED` | Beacon disabled | Beacon enabled |
| `VITE_REFERENCE_ANALYTICS_ENABLED` | Busuanzi/MapMyVisitors disabled unless `true` | Reference counters enabled; this override only applies in dev |

Set `PAGEVIEW_API_BASE=http://localhost:8787` to exercise a local Worker.
Explicitly setting the API base to an empty string disables API tracking;
`CLOUDFLARE_ANALYTICS_ENABLED=false` independently disables the beacon.
These two settings do not disable reference counters in a production build.

## Content and source discovery

Articles belong directly in `md/`. Standard YAML frontmatter supports comments,
inline arrays and multiline strings. Use the following authoring convention:

```yaml
---
title: Article Title
lang: zh-CN
date: YYYY-MM-DD
author: Fisherd
categories: 物理 # 物理 / 计算机 / 生活 / 音乐
tags: [tag]
description: Article description
---
```

- `content-utils.mjs` parses YAML; `generate-articles-list.js` validates metadata and
  paths, then sorts articles by descending date with a deterministic path tie-break.
- Files without frontmatter or a nonempty category are excluded from the index;
  `index.md` is reserved for the homepage. Unknown categories, invalid tag types,
  dates or paths fail generation with the source filename. Titles and descriptions
  must be strings when supplied; missing values have generator defaults.
- Declare categories in `site-meta.js`: music is a child of life. Group through
  categories/navigation rather than URL folders. Homepage, navigation and llms.txt
  share the same validated article index; the homepage reads `articles.json`.
- Prefer WebP previews with `data-zoom-src` for originals. Give raw `<img>`
  elements dimensions and lazy loading. KaTeX renders mathematics at build time.
- `rawMarkdownUrl()` powers per-page Markdown alternate links and the theme's
  “跳转源文件” link. The llms generator lists raw Markdown URLs; the config plugin
  serves/publishes the index at `/llms.txt`.

### Article paths

Use a single lowercase kebab-case segment, for example `/berkeleygw-qe`.
`ARTICLE_PATH_PATTERN` permits ASCII letters, digits and single separating
hyphens, plus `/` for the homepage. Nested paths such as `/music/foo` are invalid.
Content generation rejects invalid article paths; Worker requests return
`400 invalid_path`.

The kebab-case rule and 128-character normalized-path limit
(`MAX_ARTICLE_PATH_LENGTH`, including the leading `/`) are project-defined,
not Cloudflare or VitePress requirements. They live in `site-config.js` and are
shared by content validation and the Worker; the length limit predates this sharing.

## Music playback

- Author only `public/scores/<slug>/score.txt`; notation syntax is in
  `public/scores/README.md`. Generation checks measure beats; round-trip
  verification checks pitches, programs and repeats without auto-padding.
- Keep `ScorePlayer.vue` thin. `useScorePlayer.js` owns state/lifecycle,
  `alphatab.mjs` owns integration, and dedicated components own controls,
  jianpu rendering and printing. Keep screen/print row grouping unified in
  `JianpuView.vue`. Load resources near the viewport.
- `soundfonts.mjs` verifies SHA-256, shares downloads across routes, evicts
  failed data and serializes per-player installations in request order until
  acknowledgement. Unmount must not abort shared downloads.
- Prepare instrument subsets with
  `node scripts/prepare-score-soundfonts.mjs <upstream.sf2/sf3>`, then regenerate
  hashes. Preserve samples and licenses; do not load full Sonivox alongside MS Basic.
- Instrument changes update both programs and Instrument automations. Pause once,
  retain playback position/intent across rapid selections and Worker notifications,
  then serialize MIDI load → seek → optional play for the final selection,
  awaiting public player acknowledgements; cancel waits on unmount.
  Do not restore playback with timers.
- alphaTab 1.8.4 uses main-thread score rendering, Worker synthesis and AudioWorklet
  output. `patch-alphatab.mjs` applies a version/source-checked lifecycle fix on
  postinstall; review or remove it on upgrades. Preserve build/dev runtime plugins
  and the invalid-jQuery guard until an upgrade is verified.
- Use public `customScrollHandler`/`stopScrolling` for follow mode and index
  public `tickCache` on `midiLoad`. Avoid private internals; the dependency patch
  also repairs 1.8.4's recursive MIDI getter needed for acknowledgement subscriptions.

## Analytics invariants

- Worker + D1 is authoritative. Normalize extensionless keys before writes;
  `.html` requests normalize to the same key and history includes pre-existing
  `.html` rows. Keep atomic counter updates, deduplication and rate limiting.
- Share API paths/meta names and time windows through `site-config.js`:
  60-day trends, half-hour buckets and 48 buckets for recent reads.
  One tracking POST returns totals, recent reads, trend points and global locations.
- `useCloudflareStats.ts` delegates timeout/cancellation to
  `request-lifecycle.mjs`: 10-second timeout across fetch/body parsing, abort on
  navigation/unmount and discard stale results. Cancellation cannot undo a POST
  already counted by the Worker.
- Geography comes from `request.cf`; round coordinates before D1 storage.
  Do not store raw IPs in D1 or return them to clients. Counted visits log the IP
  in structured Workers Logs; restrict access and account for log retention.
- `CloudflareVisitorMap.vue` projects local Natural Earth longitude/latitude
  geometry (`world-map-geo.js`, license in `world-map-data.NOTICE.md`) using an
  equirectangular projection, antimeridian seam and −90° to 90° latitude range.
  Approximate city points may lie offshore; never move them onto land.
- Cloudflare Web Analytics is a separate private dashboard; do not merge its
  country history into D1. Busuanzi v3 (`cdn.busuanzi.cc/api.php`,
  `busuanzi_page_pv`) and MapMyVisitors are separately labeled reference sources.
- Preserve D1 totals during schema changes; apply `schema.sql` before deploying
  code dependent on new tables/columns. Do not expose internal errors to clients.
  Keep logs, traces and scheduled cleanup configured in `wrangler.toml`.

## Verification and delivery

- Run `test:site` for content generation, path rules, analytics configuration or
  request-lifecycle changes; exercise local Worker endpoints for analytics changes.
- Run `test:scores` for playback/parser changes or alphaTab/soundfont upgrades.
  If score sources/generators changed, run `generate-scores.js --verify` first.
- Add behavior-focused regression coverage for substantive fixes; do not weaken
  assertions to pass. Unrelated article/style edits need no score tests.
- Run `docs:build` separately from tests. Check affected audio, scrolling and
  controls in the browser with production tracking disabled.
- CI runs `npm ci`, `npm test` and the build for master pushes, PRs targeting
  master and manual runs. PRs do not deploy; master pushes/manual runs publish
  Pages after checks pass. Local commits alone do not publish the site.
- Update `UPDATE_LOG.md` for user-visible features, architecture or deployment
  changes. Worker deployment is separate; see `DEPLOY_PAGEVIEW_API.md`.
