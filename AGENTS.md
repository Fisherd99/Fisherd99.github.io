# VitePress Blog Guide

## Project

- Personal zh-CN VitePress blog deployed to GitHub Pages from `master`.
- Markdown sources are in `md/`; article filenames should use English kebab-case.
- Navigation and the homepage article list are generated from frontmatter.
- The project uses ES modules and Node.js 22 in CI.

## Main structure
## Code Architecture
```
vitepress/
├── .github/
│   └── workflows/                # GitHub Pages deployment
├── .vitepress/
│   ├── config.mts                # Site configuration
│   ├── generated/                # Auto-generated build inputs (DO NOT EDIT)
│   │   ├── articles.json         # Homepage article metadata
│   │   └── nav-config.js         # Navigation and sidebar config
│   ├── theme/                    # Custom layout and styles
│   │   ├── custom.css            # Global theme styles
│   │   ├── HomeArticlesAuto.vue  # Homepage article list
│   │   ├── LazyGiscus.vue        # Lazy-loaded comments
│   │   ├── PageViewTrend.vue     # 60-day page-view chart
│   │   ├── CloudflareVisitorMap.vue # Cloudflare geolocation visitor map
│   │   ├── index.ts              # Theme entry and browser integrations
│   │   └── MyLayout.vue          # Layout and analytics UI
│   ├── cache/                    # VitePress build cache
│   └── dist/                     # Built site output
├── md/                           # Content source directory
│   ├── public/                   # Static assets (images)
│   └── *.md                      # Markdown articles + homepage
├── package.json                  # Dependencies and scripts
├── scripts/
│   ├── content-utils.mjs         # Shared frontmatter/file helpers
│   ├── generate-articles-list.js # Generate homepage article metadata
│   ├── generate-nav-config.js    # Generate navigation and sidebar config
│   └── pageview-api-server.mjs   # Local page-view API fallback
├── cloudflare/
│   ├── pageview-worker.js        # Page views, anti-abuse, history, visitor locations
│   ├── schema.sql                # D1 counters, buckets, dedupe, rate limits, locations
│   └── wrangler.toml             # Worker bindings, observability, and Cron trigger
├── UPDATE_LOG.md                 # Unified update changelog
└── AGENTS.md                     # File for AI Agents.
```

Do not edit generated files directly:

- `.vitepress/generated/nav-config.js`
- `.vitepress/generated/articles.json`
- `.vitepress/dist/` and `.vitepress/cache/`

## Commands

```bash
npm install
npm run docs:dev
npm run docs:build
npm run docs:preview
npm run generate-nav
npm run generate-articles
npm run pageview:api
npm run cf:pageview:dev
npm run cf:pageview:d1:migrate:local
npm run cf:pageview:d1:migrate
npm run cf:pageview:deploy
```

There is no separate lint or automated test suite. Use `npm run docs:build` as
the baseline verification and exercise Worker endpoints when analytics changes.

## Content

Articles belong in `md/` and require frontmatter like:

```yaml
---
title: Article Title
lang: zh-CN
date: YYYY-MM-DD
author: Fisherd
categories: 物理 # 物理 / 计算机 / 生活
tags:
  - tag
description: Article description
---
```

- Missing frontmatter or `categories` excludes an article from generated lists.
- Prefer optimized WebP previews, retain the original via `data-zoom-src`, and
specify dimensions and lazy loading on raw `<img>` elements.
- KaTeX renders mathematics at build time.

## Analytics invariants

- Cloudflare Worker + D1 is the authoritative page-view source. Counters are
  atomic, keyed by normalized article path, and protected by deduplication and
  rate limiting.
- One page-load POST returns the total, recent reads, trend points, and global
  visitor locations. Keep this single-roundtrip design.
- Visitor geography comes from `request.cf`; coordinates are rounded before D1
  storage and raw IP addresses are never stored.
- Cloudflare Web Analytics is a separate private dashboard source. Do not
  backfill or merge its historical country data into the D1 visitor map.
- Busuanzi is retained only as a clearly labeled third-party reference count.
- Preserve existing D1 totals during schema changes. Apply `schema.sql` before
  deploying Worker code that depends on new tables or columns.
- Production errors must not expose internal details. Logs and traces remain
  enabled through `wrangler.toml`.

## Maintenance

- Update `UPDATE_LOG.md` for user-visible features, architecture changes, or
  deployment changes.
- GitHub Actions deploys pushes to `master`; local edits are not live until the
  site is committed and pushed. Cloudflare Worker deployment is separate.
