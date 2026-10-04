# Pageview API 线上部署（Cloudflare 推荐）

已为仓库集成 Cloudflare Workers + D1 部署配置（免费层稳定、无冷启动、运维简单）。

## 为什么推荐 Cloudflare

- 对这种小型统计 API：免费额度长期可用
- Worker 边缘运行：响应快、无 Render 免费层冷启动
- D1 持久化：适合阅读量时间序列

## 1) 一次性登录

```bash
npx wrangler login
```

## 2) 创建 D1 数据库

```bash
npm run cf:pageview:d1:create
```

命令输出里会有 `database_id`，复制它。

## 3) 填写 `cloudflare/wrangler.toml`

把：

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

替换成上一步拿到的真实 ID。

## 4) 初始化表结构

```bash
npm run cf:pageview:d1:migrate
```

> 该命令已固定使用：`--config cloudflare/wrangler.toml --remote`。
>
> 如果你看到 `Resource location: local` 或 `Couldn't find a D1 DB with the name or binding`，通常是：
> - 没走到 `cloudflare/wrangler.toml`；
> - 或数据库 ID 还没填对。

可先验证绑定是否可见：

```bash
npm run cf:pageview:d1:info
```

> `d1 info` 不需要 `--remote`，它本身就是查询云端 D1 信息。

本地测试数据库（非线上）可用：

```bash
npm run cf:pageview:d1:migrate:local
```

## 5) 部署 API

```bash
npm run cf:pageview:deploy
```

部署后会得到一个 Worker URL（例如 `https://fisherd-pageview-api.fisherd.workers.dev`）。

## 6) 让前端指向线上 API

构建站点前设置环境变量：

```bash
PAGEVIEW_API_BASE=https://fisherd-pageview-api.fisherd.workers.dev npm run docs:build
```

`config.mts` 已支持通过 `PAGEVIEW_API_BASE` 注入：

- `${PAGEVIEW_API_BASE}/api/pageview/track`
- `${PAGEVIEW_API_BASE}/api/pageview/history`

### GitHub Pages 自动化（已配置）

仓库的 `.github/workflows/deploy.yml` 已设置：

```yaml
env:
  PAGEVIEW_API_BASE: https://fisherd-pageview-api.fisherd.workers.dev
```

因此后续 push 到 `master` 的构建会自动注入线上 API。

> `config.mts` 未设置 `PAGEVIEW_API_BASE` 时会默认指向线上 Worker。若要在本地禁用统计，请用空值覆盖：`PAGEVIEW_API_BASE= npm run docs:dev`，此时不注入任何 API meta，页面回退为“获取失败”。

## 7) 健康检查

- `GET /health`
- `GET /api/pageview/history?path=/gdb`

## 说明

- 统计数据的权威来源是 Cloudflare Worker + D1；Busuanzi 为独立的第三方参考计数。
- 前端已实现服务端优先 + 本地回退，不会因为 API 临时不可用而白屏。
