# Fisherd99.github.io

Welcome to [Fisherd's blog](https://fisherd99.github.io/)!

If link jump fails, please copy https://fisherd99.github.io

It records my note on physics, computer science, and something interesting.

Created by [VitePress](https://vitepress.dev/zh/)

## 📚 Documentation

- **[AGENTS.md](./AGENTS.md)** - **Project patterns for AI coding assistants**
  - 🤖 **Primary audience**: Claude Code, GitHub Copilot, and other AI programming tools
  - Contains project-specific patterns, conventions, and workflows
  - Enables AI assistants to understand context and provide better suggestions
  - Human contributors: Read this to understand project automation

- **[UPDATE_LOG.md](./UPDATE_LOG.md)** - Changelog and quick reference
  - Feature updates and usage guides
  - Common commands and workflows

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run docs:dev

# Build for production
npm run docs:build
```

See [AGENTS.md](./AGENTS.md) for detailed documentation on adding articles and managing content.

## 快速参考

### 添加新文章的完整步骤

1. **创建文件**: 在 `md/` 目录创建 `.md` 文件

2. **添加 frontmatter**:
```markdown
---
title: 文章标题
lang: zh-CN
date: 2026-02-04
author: "Fisherd"
categories: 物理  # 物理/计算机/生活
tags:
  - 标签1
  - 标签2
description: 文章描述
---
```

3. **运行命令**:
```bash
npm run docs:dev    # 开发模式
npm run docs:build  # 构建部署
```

4. **自动更新**:
   - 文章会自动出现在首页对应分类
   - 导航栏会自动更新

### 可用命令

| 命令 | 说明 |
|------|------|
| `npm run docs:dev` | 启动开发服务器（自动生成配置）|
| `npm run docs:build` | 构建生产版本（自动生成配置）|
| `npm run generate-nav` | 手动生成导航配置 |
| `npm run generate-articles` | 手动生成文章列表 |

### 项目结构

```
vitepress/
├── .github/
│   └── workflows/                # GitHub Pages deployment
├── .vitepress/
│   ├── config.mts                # VitePress site configuration
│   ├── nav-config.js             # Auto-generated navigation (DO NOT EDIT)
│   ├── theme/                    # Custom layout and styles
│       └── HomeArticlesAuto.vue  # Customized home page
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