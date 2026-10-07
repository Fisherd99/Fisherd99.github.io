/**
 * 从统一文章索引生成 nav 和 sidebar 配置
 * 运行方式：node scripts/generate-nav-config.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateArticlesList } from './generate-articles-list.js'
import { ROOT_CATEGORIES, getCategoryChildren } from '../.vitepress/site-meta.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const navOutputFile = path.join(projectRoot, '.vitepress', 'generated', 'nav-config.js')
const specialPages = [{ text: '主页', link: '/' }]

// 某分类的直属文章（categoriesMap 中存的已是 { text, link }）。
const ownItems = (categoriesMap, title) => categoriesMap.get(title) || []

// sidebar 分组：VitePress 的 sidebar item 支持任意深度的 items，故写成递归。
function buildSidebarGroup(categoriesMap, title) {
  const children = getCategoryChildren(title)
    .map((child) => buildSidebarGroup(categoriesMap, child.title))
    .filter(Boolean)

  const items = [...ownItems(categoriesMap, title), ...children]
  return items.length ? { text: title, collapsed: false, items } : null
}

// nav 分组：VitePress 的 nav 只支持两层，子分类作为嵌套的 { text, items }。
// 另外 NavItemWithLink 上 items 是 never，所以父分类只能当容器、不能自身带链接。
function buildNavGroup(categoriesMap, title) {
  const children = getCategoryChildren(title)
    .map((child) => ({ text: child.title, items: ownItems(categoriesMap, child.title) }))
    .filter((child) => child.items.length > 0)

  const items = [...ownItems(categoriesMap, title), ...children]
  return items.length ? { text: title, items } : null
}

export function generateNavConfig(articles) {
  console.log('📂 读取校验后的文章索引...')

  const categoriesMap = new Map()
  for (const article of articles) {
    if (!categoriesMap.has(article.category)) categoriesMap.set(article.category, [])
    categoriesMap.get(article.category).push({ text: article.title, link: article.link })
  }

  const nav = [...specialPages]
  const sidebar = []

  // 先按 CATEGORIES 的树输出，二级分类自然嵌在父分类之下。
  for (const category of ROOT_CATEGORIES) {
    const navGroup = buildNavGroup(categoriesMap, category.title)
    const sidebarGroup = buildSidebarGroup(categoriesMap, category.title)
    if (navGroup) nav.push(navGroup)
    if (sidebarGroup) sidebar.push(sidebarGroup)
  }

  const configContent = `// 自动生成的 nav 和 sidebar 配置
// 请勿手动编辑此文件，运行 node scripts/generate-nav-config.js 重新生成

export const navConfig = ${JSON.stringify(nav, null, 2)}

export const sidebarConfig = ${JSON.stringify(sidebar, null, 2)}
`

  fs.mkdirSync(path.dirname(navOutputFile), { recursive: true })
  fs.writeFileSync(navOutputFile, configContent, 'utf-8')

  console.log(`\n✅ 已生成导航配置: ${navOutputFile}`)
  console.log(`📊 共 ${articles.length} 个文件，${categoriesMap.size} 个分类`)
  console.log('\n📋 分类统计:')
  for (const [category, items] of categoriesMap) {
    console.log(`  ${category}: ${items.length} 篇`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateNavConfig(generateArticlesList())
}
