import { defineConfig } from 'vitepress'
import markdownItAnchor from 'markdown-it-anchor'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "../md",
  base: "/",
  lang: "zh-CN",
  title: "卷心菜农场 —— Fisherd's blog",
  description: "Cabbage Farm",

  markdown: {
    math: true,
    lineNumbers: true,
    image: {lazyLoading: true},
    // markdown-it-anchor 的选项
    // https://github.com/valeriangalliat/markdown-it-anchor#usage
    // anchor: {
    //   permalink: markdownItAnchor.permalink.headerLink()
    // },
    // @mdit-vue/plugin-toc 的选项
    // https://github.com/mdit-vue/mdit-vue/tree/main/packages/plugin-toc#options
    toc: { level: [1, 2] },
    },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [2,3],
    logo: {
      dark: 'icon_white.png',
      light: 'icon_black.png'
    },
    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: '物理', link: '/k空间和R空间的LRI矩阵元' },
      { text: '计算机', link: '/服务器备忘录' },
      { text: '生活', link: '/photo_gallery' }
    ],

    sidebar: [
      {
        text: '物理',
        collapsed: false,
        items: [
          { text: 'k空间和R空间的LRI矩阵元', link: '/k空间和R空间的LRI矩阵元' },
        ]
      },
      {
        text: '计算机',
        collapsed: false,
        items: [
          { text: '服务器备忘录', link: '/服务器备忘录' },
        ],
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Fisherd99' },
      { icon: 'zhihu', link: 'https://www.zhihu.com/people/guan-zi-qing-37' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Fisherd'
    },
    editLink: {
      pattern: 'https://github.com/Fisherd99/Fisherd99.github.io/edit/master/md/:path'
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