/**
 * 生成 llms.txt（规范见 https://llmstxt.org/），列出各页面的原始 Markdown 地址，
 * 便于 LLM / 爬虫直接获取纯文本内容，而无需解析前端渲染后的 HTML。
 * 依赖 .vitepress/generated/articles.json（由 generate-articles-list.js 生成）。
 * 生成结果由 config.mts 中的 Vite 插件输出到站点根 /llms.txt。
 * 运行方式：node scripts/generate-llms-txt.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SITE_TITLE, SITE_DESCRIPTION, CATEGORY_ORDER, rawMarkdownUrl } from '../.vitepress/site-meta.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const articlesFile = path.join(projectRoot, '.vitepress', 'generated', 'articles.json')
const outputFile = path.join(projectRoot, '.vitepress', 'generated', 'llms.txt')

function generateLlmsTxt() {
  const articles = JSON.parse(fs.readFileSync(articlesFile, 'utf-8'))

  const groups = new Map()
  for (const article of articles) {
    const category = article.category || '其他'
    if (!groups.has(category)) groups.set(category, [])
    groups.get(category).push(article)
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => groups.has(category)),
    ...[...groups.keys()].filter((category) => !CATEGORY_ORDER.includes(category))
  ]

  const lines = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION} —— 记录物理、计算机与生活的个人博客`,
    '',
    '本文件列出各页面的原始 Markdown 源文件地址，便于直接读取纯文本内容。',
    '',
    `- [主页](${rawMarkdownUrl('/index.md')})`,
    ''
  ]

  for (const category of orderedCategories) {
    lines.push(`## ${category}`, '')
    for (const article of groups.get(category)) {
      const description = article.description ? `: ${article.description}` : ''
      lines.push(`- [${article.title}](${rawMarkdownUrl(article.link)})${description}`)
    }
    lines.push('')
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true })
  fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8')

  console.log(`✅ 已生成 llms.txt: ${outputFile}`)
  console.log(`📊 共 ${articles.length} 篇文章，${orderedCategories.length} 个分类`)
}

generateLlmsTxt()
