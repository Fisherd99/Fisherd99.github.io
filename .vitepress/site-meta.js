// 站点级共享常量与纯函数（config、theme、构建脚本共用，避免多处硬编码）。
// 注意：本模块会被打入客户端 bundle，禁止引入 Node 内建模块（fs/path 等）。

export const SITE_TITLE = "卷心菜农场 —— Fisherd's blog"
export const SITE_DESCRIPTION = 'Cabbage Farm'

// 文章分类的展示顺序；未列出的分类按原顺序追加。
export const CATEGORY_ORDER = ['物理', '计算机', '生活']

// 原始 Markdown 地址：raw.githubusercontent.com 以 text/plain 返回纯源文件，
// 便于 LLM / 爬虫直接读取，无需经过 GitHub 的 HTML 渲染页面。
export const SOURCE_REPO_BASE = 'https://raw.githubusercontent.com/Fisherd99/Fisherd99.github.io/master/md/'

// 由站点相对路径（如 "/BerkeleyGW+qe"）解析出对应原始 Markdown 的绝对地址。
export const rawMarkdownUrl = (link) => {
  const relative = `${link.replace(/^\//, '').replace(/\.md$/, '')}.md`
  return `${SOURCE_REPO_BASE}${encodeURI(relative)}`
}
