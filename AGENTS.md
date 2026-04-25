# AGENTS.md
# Repository guidance for agentic coding tools

## Project Overview
- VitePress-based personal blog with automated content management.
- Source content lives in `md/` (configured as VitePress srcDir).
- Navigation and article lists are auto-generated from frontmatter.
- Primary language is zh-CN; keep filenames English for clean URLs.

## Code Architecture
```
vitepress/
├── .github/
│   └── workflows/                # GitHub Pages deployment
├── .vitepress/
│   ├── config.mts                # VitePress site configuration
│   ├── nav-config.js             # Auto-generated navigation (DO NOT EDIT)
│   ├── theme/                    # Custom layout and styles
│   │   └── custom.css            # Color styles
│   │   └── HomeArticlesAuto.vue  # Customized home page
│   │   └── index.ts              # Theme entry
│   │   └── MyLayout.vue          # Layout wrapper
│   ├── cache/                    # VitePress build cache
│   └── dist/                     # Built site output
├── md/                           # Content source directory
│   ├── public/                   # Static assets (images, articles.json)
│   └── *.md                      # Markdown articles + homepage
├── public/
│   └── articles.json             # Auto-generated article metadata
├── package.json                  # Dependencies and scripts
├── generate-articles-list.js     # Script to generate articles list
├── generate-nav-config.js        # Script to generate nav config
├── UPDATE_LOG.md                 # Unified update changelog
└── AGENTS.md                     # File for AI Agents.
```

## Key Paths
- `md/` content sources (Markdown articles, images under `md/public/`).
- `.vitepress/config.mts` site configuration (ESM/TypeScript).
- `.vitepress/nav-config.js` auto-generated nav/sidebar (DO NOT EDIT).
- `public/articles.json` auto-generated article metadata (DO NOT EDIT).
- `generate-articles-list.js` and `generate-nav-config.js` generation scripts.
- `.vitepress/theme/` custom theme components and styles.

## Build Dependencies
The VitePress site uses:
- VitePress ^2.0.0-alpha.12
- Markdown extensions for math (markdown-it-mathjax3)
- Medium-zoom for image zooming
- Giscus for comments

## Build / Dev / Preview Commands
- Install deps: `npm install`
- Dev server: `npm run docs:dev`
- Build: `npm run docs:build`
- Preview build: `npm run docs:preview`
- Generate nav only: `npm run generate-nav`
- Generate articles only: `npm run generate-articles`

## Lint / Test Commands
- No linting scripts configured in `package.json`.
- No automated test suite in this repo.
- Single-test execution: not applicable (no test runner configured).

## Automation Rules (Do Not Edit Generated Files)
- `.vitepress/nav-config.js` is generated. Edit source frontmatter and re-run.
- `public/articles.json` is generated. Edit source frontmatter and re-run.
- Running `npm run docs:dev` or `npm run docs:build` regenerates both.
- `.vitepress/dist` is build output; never edit by hand.

## Content Authoring Guidelines
- All Markdown articles must include frontmatter (see Frontmatter Reference).
- Put articles in `md/` (not `md/public/`).
- Keep filenames in English (kebab-case preferred) for clean URLs.
- Images go to `md/public/images/` and referenced via relative paths.

## Code Style Guidelines

### General
- Prefer clarity and minimalism; follow existing patterns.
- Use ES Modules ("type": "module" in `package.json`).
- Keep changes focused; avoid reformatting unrelated code.

### JavaScript / TypeScript
- Match existing formatting (2-space indentation in JS/JSON files).
- Use `const` by default; `let` only when reassignment is required.
- Prefer explicit, descriptive names (`generate-articles-list.js` style).
- Avoid introducing new dependencies unless necessary.
- Use standard Node ESM imports (`import ... from ...`).

### VitePress / Theme
- `config.mts` and theme files use VitePress defaults plus small extensions.
- Do not edit `.vitepress/nav-config.js` directly.
- For UI changes, check `.vitepress/theme/index.ts`, `MyLayout.vue`, and
  `custom.css` for extension points.

### Markdown
- Keep headings and content in zh-CN, matching existing articles.
- Use fenced code blocks with language hints (e.g., `bash`, `ts`).
- LaTeX math is enabled via MathJax3 (`$$...$$` for blocks, `$...$` inline).

## Naming Conventions
- Filenames: English, kebab-case (e.g., `server-notes.md`).
- Frontmatter `categories`: one of `物理`, `计算机`, `生活`.
- Tags: short, human-readable, consistent with existing posts.

## Git / Workflow Notes
- No commit hooks defined in this repo.
- Commit messages use simple present tense (add/update/fix/etc.).
- Deployment runs via GitHub Actions on `master` branch.

## Quick Checklist for Agents
- Update only source Markdown and configs; regenerate nav/articles via scripts.
- Keep filenames English; titles can stay Chinese.

---

# Fisherd VitePress Blog Patterns

## Overview

This is a personal documentation blog built with VitePress, focusing on
physics (computational materials science, k-point analysis) and computer
science topics. The site is deployed to GitHub Pages.

Key feature: Fully automated content management using frontmatter-based
metadata extraction.

## Workflows

### Automated Content Management

1. Article List Auto-Generation (`generate-articles-list.js`)
   - Scans markdown files for frontmatter
   - Generates `public/articles.json` for homepage
   - Auto-runs on `npm run docs:dev` and `npm run docs:build`

2. Navigation Auto-Generation (`generate-nav-config.js`)
   - Generates nav/sidebar from frontmatter `categories`
   - Outputs to `.vitepress/nav-config.js` (auto-imported)
   - Auto-runs with dev server and build

### Adding a New Article

Steps:
1. Create markdown file in `md/` with frontmatter
2. Run `npm run docs:dev` or `npm run docs:build`
3. Article will automatically appears in nav + homepage

### Update and Deploying to GitHub Pages

- Trigger: push to `master` (GitHub Actions)
- Build uses Node.js 22 on `ubuntu-latest`
- Update Log `vitepress/UPDATE_LOG.md` in these formats in Chinese and English:
  ```markdown
  # 更新日志

  ## YYYY-MM-DD - Feature Name

  ### 新增功能
  - Feature 1
  - Feature 2

  ### 文件变更
  - 新增: file.js
  - 更新: file2.js
  - 删除: old_file.js
  ```
- When git commit, follow these **commit conventions** in English:
  ```markdown
  - `add` - Adding new content or features
  - `update` - Updating existing content
  - `fix` - Fixing bugs or errors
  - `enable` - Enabling features
  - `change` - Making changes to configuration

  Examples:
  - `add gdb note and beyond tda note`
  - `update k-r-space-LRI`
  ```

## Frontmatter Requirements

All articles MUST include frontmatter with these fields:

  ```markdown
  ---
  title: Article Title
  lang: zh-CN
  date: YYYY-MM-DD
  author: "Fisherd"
  categories: 物理  # 物理/计算机/生活
  tags:
    - tag1
    - tag2
  description: Article description
  ---
  ```
Missing frontmatter or categories = article excluded from nav/homepage.

**Categories**:
- `物理` - Physics, condensed matter, BSE, GW calculations
- `计算机` - Programming, servers, tools
- `生活` - Photo gallery, daily life

## Implementation Notes
- Parser handles both Windows (`\r\n`) and Unix (`\n`) line endings
- Multi-line arrays supported (tags field)
- Missing frontmatter or categories = article excluded from nav/homepage
- `index.md` automatically excluded from article lists
