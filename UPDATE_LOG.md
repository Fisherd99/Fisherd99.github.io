# 更新日志

## 2026-10-04 - 文章页增加 Markdown 源文件入口，便于 LLM 直接读取

- 文章标题下方的更新时间行左侧新增带 GitHub 图标的“跳转源文件”按钮，指向 `raw.githubusercontent.com` 上的原始 Markdown（`.../md/<path>.md`），而非 GitHub 的 HTML 渲染页，LLM/爬虫可拿到纯文本源文件。
- `config.mts` 通过 `transformPageData` 为每页 `<head>` 注入 `<link rel="alternate" type="text/markdown" href="...">`；会解析 `<head>` 的 agent 无需点击即可发现源文件。
- 新增 `scripts/generate-llms-txt.js`，依据 `articles.json` 按分类生成 `.vitepress/generated/llms.txt`（遵循 llmstxt.org 规范）；`config.mts` 中的 `vitepress:llms-txt` Vite 插件把它发布到站点根 `/llms.txt`（构建输出为资源，开发时经中间件提供）。
- 新增共享模块 `.vitepress/site-meta.js`（浏览器安全，不引入 Node 内建模块），集中维护 `SITE_TITLE`、`SITE_DESCRIPTION`、`CATEGORY_ORDER`、`SOURCE_REPO_BASE` 与 `rawMarkdownUrl()`，供 `config.mts`、主题 `index.ts` 与各生成脚本复用，消除重复硬编码。
- `package.json` 的 `docs:dev` / `docs:build` 链入 `generate-llms-txt.js`，并新增 `npm run generate-llms`。
- 静态资源根目录从 `md/public/` 迁至项目根 `public/`：VitePress 默认把 `publicDir` 设为 `<srcDir>/public`，现于 `config.mts` 用 `vite.publicDir` 覆盖，让静态资源与内容源目录分离；资源引用均为绝对路径，URL 不变。
- 退役本地阅读量兜底服务：删除 `scripts/pageview-api-server.mjs`、`npm run pageview:api` 及其数据目录 `public/api/`（其 `db.json` 原本会随新的 `public/` 被发布到线上）。统计完全以 Cloudflare Worker + D1 为准，Busuanzi 为独立第三方参考；同时修正 `DEPLOY_PAGEVIEW_API.md` 中关于 `PAGEVIEW_API_BASE` 未设置行为的描述。

## 2026-09-28 - 首页增加访问统计与访客地图，升级 Wrangler

- 首页在文章分类列表后展示首页累计访问量、最近 24 小时访问量和近 60 天趋势；同时复用 Cloudflare 聚合访客地图与 MapMyVisitors 地图。
- 修正首页地图溢出与统计显示。
- 从旧版 `ibruce.info` 2.3 脚本迁移到官方 v3 API（`cdn.busuanzi.cc/api.php`），按新版接口提交当前页面 URL 与来源，并读取 `busuanzi_page_pv` 计数。
- Busuanzi 数值明确标为“本页参考计数”，公开查询链接独立标为“查看全站统计”。

## 2026-09-28 - 恢复 MapMyVisitors 参考地图

- 恢复 commit `6c395f2` 中的 MapMyVisitors 嵌入，放在 Cloudflare 访客地图右侧。根据博客浅色/深色主题设置地图配色，并在窄屏下与统计图表自适应排列。
- 底图数据源来自 Natural Earth 1:110m 的经纬度轮廓，在 Vue 地图组件中直接按等距圆柱公式绘制。
- 桌面和平板导航栏中的搜索入口改为紧凑宽度，靠右并紧邻导航链接。

## 2026-09-27 - 使用 Cloudflare 访客地图和更精细的阅读量服务

### Cloudflare 访客地图
- 移除 MapMyVisitors 第三方脚本，改用 Cloudflare Worker 的边缘地理位置数据生成访客地图。
- 地理坐标写入 D1 前保留一位小数，访客 IP 只在 Cloudflare Workers Logs 中暂存 3 天。
- 地图数据复用阅读量上报响应，不增加网络往返。
- 新增自适应 SVG 世界地图，支持亮色、暗色、移动端、悬停提示和键盘焦点，不再加载第三方地图资源。
- Cloudflare Web Analytics 的历史国家数据采用不同统计口径，不回填 D1；访客地图从新版 Worker 部署后开始积累。

### 功能调整：阅读量统计
- 将 VitePress 站内文章链接统一为无 `.html` 后缀；统计写入无后缀路径，`.html` 请求归一到同一计数键，并继续读取既有两种路径的历史数据。
- 按规范化文章路径独立计数，同一访客在同一文章的半小时窗口内只计一次。
- 每个访客每分钟最多提交 30 次计数，并定时清理短期去重与限流数据。
- 限制跨域来源、请求体大小和路径格式，拒绝非法统计请求。
- 合并计数与历史数据读取，页面加载由两次网络往返减少为一次。
- 生产错误仅返回请求 ID，详细错误写入结构化 Worker 日志。

### Cloudflare 配置
- 启用 Workers Logs（100% 采样）与 Traces（1% 采样）。
- 新增每日 Cron，自动清理过期去重记录和限流数据。
- D1 数据库 ID：`9929fe86-780b-4b68-bdb4-25f03526c7ef`。
- 已完成远端 D1 migration；线上 Worker 版本 ID：`d6b04bf3-7819-4afc-aa20-ffc52bd3d42f`。
- 将 Wrangler 精确固定为 `4.142.0`。

### 其他
- 收紧文章标题下方 `lastUpdated` 与正文首个分割线之间的间距。
- 移除右侧文章目录中重复的英文 “On this page” 标题，保留中文“导航”标签和目录链接。
- 精简 `AGENTS.md`，删除重复教程和通用编码约束，仅保留项目特有边界、命令与统计口径。
- 将文章列表和导航生成器归入 `scripts/`，生成结果统一迁移至 `.vitepress/generated/`，避免将仅供构建使用的 `articles.json` 作为公共静态资源发布。


## 2026-09-27 - 修正博客统计与页面性能

### 功能修正
- 使用 Cloudflare Worker + D1 作为正式阅读量来源；保留 Busuanzi 并明确标记为“第三方参考计数”。
- 总阅读量与24小时统计桶改为数据库原子递增，避免并发访问丢失计数。
- 全站注入 Cloudflare Web Analytics beacon，并启用 SPA 路由浏览统计。
- 使用 KaTeX 替换 MathJax，并为现有文章保留 `\\bm`、`\\braket`、`\\xlongequal` 等公式宏兼容。
- 移除当前网络无法访问的 ClustrMaps，改用 MapMyVisitors 官方 JavaScript 访客地图。
- 清理首页无效状态和重复页脚，分类折叠按钮支持键盘和辅助技术。
- 评论、图片缩放和第三方参考计数改为延迟加载，减少首屏 JavaScript 与外部请求。
- 所有 Markdown 围栏代码块默认按容器宽度自动换行，长代码不再依赖横向滚动查看。
- 图片改用 WebP 预览图，点击缩放时仍加载原图；补全图片尺寸和延迟解码属性，降低首屏传输与布局偏移。
- 抽取文章列表与导航生成脚本共用的 frontmatter/文件扫描工具，并移除未使用的 `markdown-it-anchor` 依赖和旧版阅读历史 JSON。
- 更新时间移至文章标题下方并右对齐，不再依赖VitePress页脚节点，而是根据当前路由页面元数据在标题下独立渲染。关闭 “Edit this page”。
- 阅读历史由折线图改为近 60 天柱状图，保留悬停与键盘查看每日数据。

### 部署提示
- 已完成 D1 migration 的环境无需再次迁移；本次 Worker 查询优化需重新执行 `npm run cf:pageview:deploy`，其余改动随站点部署生效。


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
**最后更新**: 2026-10-04
