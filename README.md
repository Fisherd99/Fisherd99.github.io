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

| Comand | Notation |
|------|------|
| `npm install` | Install dependencies |
| `npm run docs:dev` | Start development server |
| `npm run docs:build` | Build for production |
| `npm run generate-nav` | Generate Navigation |
| `npm run generate-articles` | Generate Articles List for home page |

See [AGENTS.md](./AGENTS.md) for detailed documentation on adding articles and managing content.


## 导航自动更新机制

**为文章添加 frontmatter**:
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
运行构建命令`npm run docs:dev`或`npm run docs:build`后:
- 文章会自动出现在首页对应分类
- 导航栏会自动更新