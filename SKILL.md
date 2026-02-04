---
name: fisherd-vitepress-blog
description: VitePress blog patterns extracted from Fisherd's personal blog
version: 1.1.0
source: local-git-analysis
analyzed_commits: 15
last_updated: 2026-02-04
---

# Fisherd VitePress Blog Patterns

> **🤖 Purpose**: This document is primarily designed for **AI coding assistants** (Claude Code, GitHub Copilot, etc.) to understand project patterns and provide contextually relevant assistance.
>
> **👥 Human readers**: Contributors can also read this to understand the project's automation systems, conventions, and workflows.

## Overview

This is a personal documentation blog built with VitePress, focusing on physics (computational materials science, k-point analysis) and computer science topics. The site is deployed to GitHub Pages.

**Key feature**: Fully automated content management using frontmatter-based metadata extraction.

## Commit Conventions

This project uses **simple present tense** commit messages (English):

- `add` - Adding new content or features
- `update` - Updating existing content
- `fix` - Fixing bugs or errors
- `enable` - Enabling features
- `change` - Making changes to configuration

**Examples:**
- `add gdb note and beyond tda note`
- `update k space LRI`
- `fix photo_gallery date`
- `enable zoom in for figure`

## Code Architecture

```
vitepress/
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Pages deployment
├── .vitepress/
│   ├── config.mts               # VitePress site configuration
│   ├── nav-config.js            # Auto-generated navigation (DO NOT EDIT)
│   ├── theme/
│   │   ├── index.ts             # Theme extension entry point
│   │   ├── MyLayout.vue         # Custom layout with Giscus comments
│   │   ├── HomeArticlesAuto.vue # Auto-generated articles list
│   │   └── custom.css           # Custom styles
│   ├── cache/                   # VitePress build cache
│   └── dist/                    # Built site output
├── md/                          # Content source directory (srcDir)
│   ├── public/
│   │   ├── images/              # Image assets
│   │   └── articles.json        # Auto-generated article list
│   ├── index.md                 # Homepage
│   ├── photo_gallery.md         # Photo gallery page
│   ├── k空间和R空间的LRI矩阵元.md    # Physics article
│   ├── beyond_tda流程.md          # Physics article
│   ├── gdb.md                   # Computer article
│   ├── 服务器备忘录.md              # Computer article
│   └── ABACUS+LibRPA运行BSE计算教程.md  # Tutorial article
├── public/
│   └── articles.json            # Auto-generated article metadata
├── package.json                 # Dependencies and scripts
├── generate-articles-list.js    # Script to generate articles list
├── generate-nav-config.js       # Script to generate nav config
├── UPDATE_LOG.md                # Unified update changelog
└── SKILL.md                    # This file (project patterns)
```

## Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| VitePress | ^2.0.0-alpha.12 | Static site generator |
| @giscus/vue | ^3.1.1 | GitHub Discussions-based comments |
| markdown-it-mathjax3 | ^4.3.2 | Math rendering (LaTeX) |
| markdown-it-anchor | ^9.2.0 | Heading anchors |
| medium-zoom | ^1.1.0 | Image zoom functionality |
| Node.js | ES Modules | Build-time automation scripts |

## Workflows

### Automated Content Management

The site uses **automated systems** for content management:

1. **Article List Auto-Generation** (`generate-articles-list.js`)
   - Scans markdown files for frontmatter
   - Generates `public/articles.json` for homepage
   - Auto-runs on `npm run docs:dev` and `npm run docs:build`

2. **Navigation Auto-Generation** (`generate-nav-config.js`)
   - Generates nav/sidebar from frontmatter `categories`
   - Outputs to `.vitepress/nav-config.js` (auto-imported)
   - Auto-runs with dev server and build

### Adding a New Article

**IMPORTANT**: All articles MUST include frontmatter:

```markdown
---
title: Article Title
lang: zh-CN
date: 2026-02-04
author: "Fisherd"
categories: 物理  # 物理/计算机/生活
tags:
  - tag1
  - tag2
description: Article description
---
```

Steps:
1. Create markdown file in `md/` directory with frontmatter
2. Run `npm run docs:dev` or `npm run docs:build`
3. Article automatically appears in:
   - Homepage (under category)
   - Navigation menu (top)
   - Sidebar (side)

**No manual config updates needed!**

### Deploying to GitHub Pages

Deployment is **automatic** via GitHub Actions:

1. Push changes to `master` branch
2. GitHub Actions workflow triggers (`.github/workflows/deploy.yml`)
3. Build runs on `ubuntu-latest` with Node.js 22
4. Built site in `.vitepress/dist` is deployed to GitHub Pages

**Manual deployment:**
```bash
npm run docs:build    # Build site
npm run docs:preview  # Preview locally
```

### Theme Customization

The site extends the default VitePress theme:

1. **Custom Layout** (`.vitepress/theme/MyLayout.vue`):
   - Wraps default layout
   - Adds Giscus comment component
   - Auto-switches theme based on system preference

2. **Custom Styles** (`.vitepress/theme/custom.css`):
   - Additional CSS overrides
   - Custom component styling

3. **Theme Entry** (`.vitepress/theme/index.ts`):
   - Extends DefaultTheme
   - Initializes medium-zoom for images
   - Watches route changes for zoom re-initialization

### Site Configuration

Key settings in `.vitepress/config.mts`:

- **Language**: `zh-CN` (Chinese content)
- **Source Directory**: `./md`
- **Math**: Enabled via MathJax3
- **Search**: Local search with Chinese tokenization
- **Edit Link**: Points to GitHub repository
- **Last Updated**: Shows full date and time

## Content Guidelines

### File Naming

- Use descriptive names: `gdb.md`, `photo_gallery.md`
- Chinese filenames are supported: `k空间和R空间的LRI矩阵元.md`
- No date prefixes in filenames (use frontmatter or Git history)

### Markdown Features

- **Math**: Use LaTeX syntax `$$...$$` for blocks, `$...$` for inline
- **Images**: Place in `md/public/images/`, reference with relative path
- **Code blocks**: Line numbers enabled by default
- **Images**: Lazy loading enabled
- **Zoom**: All images zoomable via medium-zoom

### Navigation Structure

```typescript
// Three main categories:
// - 物理 (Physics): k-space analysis, BSE diagonalization
// - 计算机 (Computer): Server notes, gdb
// - 生活 (Life): Photo gallery
```

## Development Commands

```bash
# Install dependencies
npm install

# Development server (with articles list generation)
npm run docs:dev

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview

# Generate navigation config (if using auto-generation)
npm run generate-nav

# Generate articles list
npm run generate-articles
```

## Deployment Configuration

**GitHub Actions Settings:**
- Trigger: Push to `master` branch
- Node version: 22
- Cache: npm
- Build output: `.vitepress/dist`
- Concurrency: Only one deployment at a time

**Repository Settings Required:**
- GitHub Pages enabled
- Source: GitHub Actions
- Base URL: `/` (or custom domain)

## Image Management

- **Location**: `md/public/images/`
- **Format**: Prefer `.jpg` for photos (examples: `250908_lunar_eclipse_30s.jpg`)
- **Naming**: `YYMMDD_description_duration.jpg` pattern for event photos
- **Sizing**: Optimize before adding (no automated optimization)

## Giscus Comments Integration

Comments are powered by [Giscus](https://giscus.app/) (GitHub Discussions):

- Theme automatically switches with site theme
- Configured in `MyLayout.vue`
- Requires GitHub repository with Discussions enabled

## Search Configuration

Local search with **Chinese tokenization**:

```javascript
tokenize: (text) => {
  // Splits alphanumeric words while preserving
  // Chinese characters for better matching
  return text.match(/[A-Za-z0-9]+|./g)?.filter(Boolean) ?? [];
}
```

## Common Patterns

### Updating an Article

1. Edit the `.md` file in `md/` (with proper frontmatter)
2. Run `npm run docs:build` to regenerate configs
3. Commit with `update <topic>` message
4. Push to `master` for auto-deployment

### Adding Images to Gallery

1. Add images to `md/public/images/`
2. Update `md/photo_gallery.md` with new entries
3. Commit with `update photo_gallery` or `add photos to gallery`

### Fixing Typos/Errors

1. Edit the file
2. Commit with `fix <description>` message

## Update Logging Convention

**File**: `UPDATE_LOG.md`

**Format**: Reverse chronological order (newest first)

```markdown
# 更新日志

## YYYY-MM-DD - Feature Name

### 新增功能
- Feature 1
- Feature 2

### 使用方法
```bash
command example
```

### 文件变更
- 新增: file.js
- 更新: file2.js
- 删除: old_file.js

---

## Quick Reference
[Common usage patterns]
```

**Rules**:
1. One unified `UPDATE_LOG.md` file (no date-stamped versions)
2. Simplified entries: focus on what changed and how to use it
3. Include "快速参考" section at the end for common tasks
4. Document both feature additions and breaking changes

## Frontmatter Reference

**Required Fields**:
```yaml
title: Article Title        # Display title
categories: 物理             # 物理学/计算机/生活
```

**Optional Fields**:
```yaml
lang: zh-CN                # Language (default: zh-CN)
date: YYYY-MM-DD           # Publication date
author: "Fisherd"          # Author name
tags:                      # Array of tags
  - BSE
  - GW
description: Text         # Short description
```

**Categories**:
- `物理` - Physics, condensed matter, BSE, GW calculations
- `计算机` - Programming, servers, tools
- `生活` - Photo gallery, daily life

**Implementation Notes**:
- Parser handles both Windows (`\r\n`) and Unix (`\n`) line endings
- Multi-line arrays supported (tags field)
- Missing frontmatter or categories = article excluded from nav/homepage
- `index.md` automatically excluded from article lists

## Notes

- **No test suite** - This is a static documentation site
- **Chinese-first** - Primary language is Chinese (zh-CN)
- **Academic focus** - Physics and computational materials science content
- **Personal blog** - Owned and maintained by Fisherd (guanzq)
