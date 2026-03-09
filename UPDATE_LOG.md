# 更新日志

## 2026-03-09 - 历史浏览量统计与可视化

### 功能概述
- 每篇文章底部展示**历史浏览量折线图**（SVG，宽度自适应，高度 72px）
- 横轴：日期+时间；纵轴：访问次数刻度+网格线
- 页面顶部显示站点总访问量 + 本页阅读量（Busuanzi）
- 数据优先从服务端 API 获取，失败时自动回退本地 localStorage 快照

### 技术架构
- **前端组件**: `.vitepress/theme/PageViewTrend.vue` — SVG 折线图 + HTML 文字覆盖层
- **布局挂载**: `.vitepress/theme/MyLayout.vue` — 浏览量文字 + 折线图
- **Busuanzi 注入**: `.vitepress/theme/index.ts` — 脚本加载 + 路由切换刷新
- **服务端 API**: Cloudflare Workers + D1（`cloudflare/` 目录）
  - `pageview-worker.js` — track（记录访问）+ history（查询历史）接口
  - `schema.sql` — D1 表结构（pageviews + daily_stats）
  - `wrangler.toml` — Workers 配置，D1 绑定
- **本地开发 API**: `scripts/pageview-api-server.mjs`（Node，JSON 文件持久化）
- **构建注入**: `.vitepress/config.mts` 通过 `PAGEVIEW_API_BASE` 环境变量注入 API 地址
- **CI/CD**: `.github/workflows/deploy.yml` 构建时设置环境变量指向线上 API

### 部署信息
- Worker URL: `https://fisherd.fisherd.workers.dev`
- D1 数据库 ID: `9929fe86-780b-4b68-bdb4-25f03526c7ef`（APAC）

### 相关命令
```bash
npm run cf:pageview:deploy    # 部署 Worker
npm run cf:pageview:d1:init   # 初始化 D1 表结构
npm run cf:pageview:d1:info   # 查看 D1 数据库信息
npm run cf:pageview:dev       # 本地 Workers 开发
npm run pageview-server       # 本地 Node API 服务器
```


## 2026-02-26 - 英文URL与Agent规范
- 将 `md/` 下中文 Markdown 文件名改为英文（kebab-case），站点 URL 全英文
- 用 `AGENTS.md` 统一 AI agent 规则与项目指南，并合并替代 `SKILL.md`

## 2026-02-04 - 导航栏自动更新

### 新增功能
- **首页自动展示**: 双栏网格展示，按分类组织文章
- **自动文章列表**: 从 frontmatter 提取元数据生成 `articles.json`
- **导航栏自动更新**: 根据 markdown 文件的 frontmatter 自动生成 nav 和 sidebar 配置
- **自动分类**: 根据 `categories` 字段自动组织文章
- **响应式设计**: 移动端自适应

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
- 新增: `generate-articles-list.js` - 文章列表生成脚本
- 新增: `.vitepress/theme/HomeArticlesAuto.vue` - 首页组件
- 更新: `package.json` - 添加自动生成脚本

---

**维护者**: Fisherd
**最后更新**: 2026-03-09
