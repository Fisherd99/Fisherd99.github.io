// 站点级共享常量与纯函数（config、theme、构建脚本共用，避免多处硬编码）。
// 注意：本模块会被打入客户端 bundle，禁止引入 Node 内建模块（fs/path 等）。
// 与边缘 Worker 共享的统计口径/契约见 ./site-config.js。

export const SITE_TITLE = "卷心菜农场 —— Fisherd's blog"
export const SITE_DESCRIPTION = 'Cabbage Farm'

// 分类模型：标题 / 锚点 id / 首页图标 / 主题色，作为唯一数据源。
export const CATEGORIES = [
  { title: '物理', id: 'physics', icon: '📚', color: '#3b82f6' },
  { title: '计算机', id: 'computer', icon: '💻', color: '#14b8a6' },
  { title: '生活', id: 'life', icon: '🌟', color: '#f97316' }
]

// 分类展示顺序（由 CATEGORIES 派生）。
export const CATEGORY_ORDER = CATEGORIES.map((category) => category.title)

// 原始 Markdown 地址：raw.githubusercontent.com 以 text/plain 返回纯源文件，
// 便于 LLM / 爬虫直接读取，无需经过 GitHub 的 HTML 渲染页面。
export const SOURCE_REPO_BASE = 'https://raw.githubusercontent.com/Fisherd99/Fisherd99.github.io/master/md/'

// 由站点相对路径（如 "/BerkeleyGW+qe"）解析出对应原始 Markdown 的绝对地址。
export const rawMarkdownUrl = (link) => {
  const relative = `${link.replace(/^\//, '').replace(/\.md$/, '')}.md`
  return `${SOURCE_REPO_BASE}${encodeURI(relative)}`
}

// Busuanzi 第三方参考计数（与 Cloudflare 统计相互独立）。
export const BUSUANZI_API = 'https://cdn.busuanzi.cc/api.php'
export const BUSUANZI_PAGE_PV_ID = 'busuanzi_page_pv'
export const BUSUANZI_STATS_URL = 'https://www.busuanzi.cc/count.php?search=fisherd99.github.io'
