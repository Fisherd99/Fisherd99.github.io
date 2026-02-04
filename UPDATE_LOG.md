# 更新日志

## 2026-02-04 - 导航栏自动更新

### 新增功能
- **导航栏自动更新**: 根据 markdown 文件的 frontmatter 自动生成 nav 和 sidebar 配置
- **新脚本**: `generate-nav-config.js` - 扫描 frontmatter 并生成配置
- **自动分类**: 根据 `categories` 字段自动组织文章

### 使用方法
在文章 frontmatter 中添加 `categories` 字段：

```markdown
---
title: 文章标题
categories: 物理  # 可选：物理、计算机、生活
---
```

运行命令：
```bash
npm run generate-nav  # 手动生成导航配置
npm run docs:dev      # 自动生成后启动
```

### 文件变更
- 新增: `generate-nav-config.js`
- 新增: `.vitepress/nav-config.js` (自动生成)
- 更新: `package.json` - 构建时自动生成导航
- 更新: `.vitepress/config.mts` - 导入自动生成的配置

---

## 2026-02-04 - 文章列表自动化系统

### 新增功能
- **首页自动展示**: 双栏网格展示，按分类组织文章
- **自动文章列表**: 从 frontmatter 提取元数据生成 `articles.json`
- **响应式设计**: 移动端自适应

### 使用方法
在文章开头添加 frontmatter：

```markdown
---
title: 文章标题
lang: zh-CN
date: 2026-02-04
author: "Fisherd"
categories: 物理
tags:
  - BSE
  - GW
description: 文章描述
---
```

运行命令：
```bash
npm run docs:dev    # 自动生成并启动
npm run docs:build  # 自动生成并构建
```

### 文件变更
- 新增: `generate-articles-list.js` - 文章列表生成脚本
- 新增: `.vitepress/theme/HomeArticlesAuto.vue` - 首页组件
- 更新: `package.json` - 添加自动生成脚本

---

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

### 分类说明

- **物理** - 凝聚态物理、BSE、GW 计算相关
- **计算机** - 编程、服务器、工具使用
- **生活** - 相册、日常记录

### 项目结构

```
vitepress/
├── md/                          # 文章目录
│   └── *.md                     # markdown 文件（需包含 frontmatter）
├── .vitepress/
│   ├── nav-config.js            # 自动生成的导航配置
│   └── theme/
│       └── HomeArticlesAuto.vue # 首页组件
├── public/
│   └── articles.json            # 自动生成的文章列表
├── generate-nav-config.js       # 导航生成脚本
├── generate-articles-list.js    # 文章列表生成脚本
└── package.json
```

---

**维护者**: Fisherd
**最后更新**: 2026-02-04
