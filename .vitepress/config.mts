import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { navConfig, sidebarConfig } from './generated/nav-config.js'
import { SITE_TITLE, SITE_DESCRIPTION, rawMarkdownUrl } from './site-meta.js'

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

const pageviewApiBase = (process.env.PAGEVIEW_API_BASE ?? 'https://fisherd-pageview-api.fisherd.workers.dev').replace(/\/$/, '')
const pageviewHead = pageviewApiBase
  ? [
      ['meta', { name: 'pageview-track-api', content: `${pageviewApiBase}/api/pageview/track` }],
      ['meta', { name: 'pageview-history-api', content: `${pageviewApiBase}/api/pageview/history` }]
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
    plugins: [llmsTxtPlugin]
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
