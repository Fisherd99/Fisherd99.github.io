import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'
import { alphaTab as alphaTabVitePlugins } from '@coderline/alphatab-vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { navConfig, sidebarConfig } from './generated/nav-config.js'
import { SITE_TITLE, SITE_DESCRIPTION, rawMarkdownUrl } from './site-meta.js'
import { PAGEVIEW_DEFAULT_API_BASE, PAGEVIEW_TRACK_PATH, PAGEVIEW_TRACK_META } from './site-config.js'

// llms.txt 由 scripts/generate-llms-txt.js 生成到 .vitepress/generated/，此处再把它
// 发布到站点根：构建时作为资源输出，开发时经中间件直接提供。
const llmsTxtFile = fileURLToPath(new URL('./generated/llms.txt', import.meta.url))
const llmsTxtPlugin = {
  name: 'vitepress:llms-txt',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url?.split('?')[0] !== '/llms.txt') return next()
      fs.readFile(llmsTxtFile, (err, data) => {
        if (err) return next()
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(data)
      })
    })
  },
  generateBundle(this: any) {
    if (!fs.existsSync(llmsTxtFile)) return
    this.emitFile({
      type: 'asset',
      fileName: 'llms.txt',
      source: fs.readFileSync(llmsTxtFile, 'utf-8')
    })
  }
}

// alphaTab 的合成器 Worker 由 `new URL("./alphaTab.worker.mjs", import.meta.url)` 构造，
// 生产构建由官方 Vite 插件重写并输出该文件；开发模式下没有这一步，浏览器的请求会落到
// SPA 兜底 HTML，Worker 把 HTML 当模块解析会失败 —— 而 `new Worker()` 对坏 URL 不抛错，
// 症状是"静默无声"。这里在开发服务器上按请求路径补上这两个文件。
// Worker 自身 `import "./alphaTab.core.mjs"`，所以两个都要给。
const alphaTabDistDir = fileURLToPath(
  new URL('../node_modules/@coderline/alphatab/dist/', import.meta.url)
)
const alphaTabRuntimeFiles = ['alphaTab.worker.mjs', 'alphaTab.core.mjs', 'alphaTab.worklet.mjs']

const alphaTabRuntimePlugin = {
  name: 'vitepress:alphatab-runtime',
  apply: 'serve' as const,
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const pathname = (req.url ?? '').split('?')[0]
      const name = alphaTabRuntimeFiles.find((file) => pathname.endsWith(`/${file}`))
      if (!name) return next()
      fs.readFile(path.join(alphaTabDistDir, name), (err, data) => {
        if (err) return next()
        res.setHeader('Content-Type', 'text/javascript')
        res.end(data)
      })
    })
  }
}

const pageviewApiBase = (process.env.PAGEVIEW_API_BASE ?? PAGEVIEW_DEFAULT_API_BASE).replace(/\/$/, '')
const pageviewHead = pageviewApiBase
  ? [
      ['meta', { name: PAGEVIEW_TRACK_META, content: `${pageviewApiBase}${PAGEVIEW_TRACK_PATH}` }]
    ]
  : []

const cloudflareAnalyticsHead = [
  ['script', {
    type: 'module',
    src: 'https://static.cloudflareinsights.com/beacon.min.js',
    'data-cf-beacon': JSON.stringify({
      token: '118cd19b16644741a95d21b7611180c7',
      spa: true
    })
  }]
]

// Render equations at build time with KaTeX and project-specific compatibility macros.

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "./md",
  base: "/",
  cleanUrls: true,
  lang: "zh-CN",
  head: [...pageviewHead, ...cloudflareAnalyticsHead],

  vite: {
    // 默认 publicDir 是 <srcDir>/public（即 md/public）；改为项目根的 public/，
    // 让静态资源与内容源目录分离。使用绝对路径以免相对 root(=srcDir) 解析。
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    plugins: [
      llmsTxtPlugin,
      alphaTabRuntimePlugin,
      // alphaTab 的合成器始终跑在 Web Worker 里（没有设置项能关掉），Worker 由
      // `new URL("./alphaTab.worker.mjs", import.meta.url)` 构造 —— 打包后这个相对路径
      // 指向 assets/chunks/，而 Vite 不会输出该文件，也不输出它 import 的 alphaTab.core.mjs。
      // `new Worker()` 对坏 URL 不会同步抛错，所以症状是"静默无声"而不是报错。
      // 官方插件负责把这两个文件补到正确位置，并重写相关的 import.meta.url。
      // assetOutputDir:false —— 乐谱字体与音源音色由我们自己放在 public/alphatab/ 统一管理。
      ...alphaTabVitePlugins({ assetOutputDir: false })
    ]
  },

  // 每页注入指向原始 Markdown 的关联链接，供 LLM / 爬虫在无需点击的情况下发现纯文本源文件。
  // https://llmstxt.org/
  transformPageData(pageData) {
    const relativePath = pageData.relativePath
    if (!relativePath) return
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push([
      'link',
      {
        rel: 'alternate',
        type: 'text/markdown',
        href: rawMarkdownUrl(relativePath),
        title: 'Markdown source'
      }
    ])
  },
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,

  markdown: {
    lineNumbers: true,
    image: {lazyLoading: true},
    // KaTeX keeps formula-heavy article chunks compact without client-side rendering.
    config: (md) => {
      md.use(katex, {
        throwOnError: false,
        strict: 'warn'
      })
    },
    // @mdit-vue/plugin-toc 的选项
    // https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-toc#options
    toc: { level: [1, 2] },
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [2,3],
    logo: {
      dark: 'icon_white.webp',
      light: 'icon_black.webp'
    },
    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },
    nav: navConfig,

    sidebar: sidebarConfig,

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Fisherd99' },
      { icon: 'zhihu', link: 'https://www.zhihu.com/people/guan-zi-qing-37' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-2026 Fisherd'
    },
    // VitePress 自带的检索全文功能。
    // See: https://vitepress.dev/zh/reference/default-theme-search
    search: {
      provider: "local",
      options: {
        miniSearch: {
          options: {
            // `tokenize`: 对备索引内容的分词器。
            // `text`: 备索引内容，由 `extractField` 提供。
            tokenize: (text) => {
              // 这种拆分方式可以在遇到英数字时以单词拆分，
              // 这样做是为了更全面地匹配非英数字的内容，
              // 同时避免单字母或单数字拆分造成的无意义匹配。
              return text.match(/[A-Za-z0-9]+|./g)?.filter(Boolean) ?? [];
            },
          },
          searchOptions: {
            // 完整匹配检索关键字（避免检索单词时出现单字内容）。
            combineWith: "AND",
          },
        },
        // 一些本地化的字符串
        translations: {
          button: {
            buttonText: "搜索文档",
            buttonAriaLabel: "搜索文档",
          },
          modal: {
            displayDetails: "显示详细搜索结果",
            resetButtonTitle: "清空搜索关键字",
            backButtonTitle: "返回",
            noResultsText: "无法找到",
            footer: {
              selectText: "选择",
              selectKeyAriaLabel: "Enter 键",
              navigateText: "切换",
              navigateUpKeyAriaLabel: "向上箭头",
              navigateDownKeyAriaLabel: "向下箭头",
              closeText: "关闭",
              closeKeyAriaLabel: "Esc 键",
            },
          },
        },
      },
    },

  }
})
