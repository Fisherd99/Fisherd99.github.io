# 更新日志

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
**最后更新**: 2026-02-26
