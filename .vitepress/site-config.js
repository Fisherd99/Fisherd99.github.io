// 站点与边缘 Worker 共享的、依赖无关的常量与纯函数。
// 由 .vitepress/*（Vite 打包）与 cloudflare/pageview-worker.js（wrangler 打包）共同引用，
// 因此禁止 import 任何 Node 内建模块（fs/path/process）或框架代码。

// —— 统计时间口径（客户端图表与 Worker 查询必须保持一致）——
export const DAY_MS = 24 * 60 * 60 * 1000
export const TREND_DAYS = 60
export const HALF_HOUR_MS = 30 * 60 * 1000
export const RECENT_BUCKETS = 48

// —— Pageview API 契约 ——
export const PAGEVIEW_DEFAULT_API_BASE = 'https://fisherd-pageview-api.fisherd.workers.dev'
export const PAGEVIEW_TRACK_PATH = '/api/pageview/track'
export const PAGEVIEW_HISTORY_PATH = '/api/pageview/history'
export const PAGEVIEW_TRACK_META = 'pageview-track-api'

export const ARTICLE_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/
export const MAX_ARTICLE_PATH_LENGTH = 128

// 将任意文章 URL 归一到无 `.html` 后缀的规范化路径（站点与 Worker 同源）。
// 仅做规范化，不做合法性校验；非法路径的判定由 Worker 侧另行处理。
export const normalizeArticlePath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return '/'

  let clean = rawPath.trim().split('#')[0].split('?')[0] || '/'
  if (!clean.startsWith('/')) clean = `/${clean}`
  if (clean.length > 1) clean = clean.replace(/\/+$/, '')

  return clean.endsWith('.html') ? clean.slice(0, -5) || '/' : clean
}
