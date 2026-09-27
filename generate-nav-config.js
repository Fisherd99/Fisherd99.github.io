/**
 * 自动从 md 文件的 frontmatter 生成 nav 和 sidebar 配置
 * 运行方式：node generate-nav-config.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAllMarkdownFiles, parseFrontmatter } from './scripts/content-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mdDir = path.join(__dirname, 'md')
const navOutputFile = path.join(__dirname, '.vitepress', 'nav-config.js')

// 分类顺序（可以自定义）
const categoryOrder = ['物理', '计算机', '生活']

// 特殊页面（不放在分类中）
const specialPages = [
  { text: '主页', link: '/' }
]

// 生成 nav 和 sidebar 配置
function generateNavConfig() {
  console.log('📂 扫描 markdown 文件...')

  const mdFiles = getAllMarkdownFiles(mdDir)
  const categoriesMap = new Map()

  // 按分类分组
  for (const filePath of mdFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter || !frontmatter.categories) {
      continue
    }

    const category = frontmatter.categories
    const relativePath = '/' + path.relative(mdDir, filePath).replace(/\.md$/, '')
    const title = frontmatter.title || path.basename(filePath, '.md')

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, [])
    }

    categoriesMap.get(category).push({
      text: title,
      link: relativePath
    })

    console.log(`  ✓ ${title} (${category})`)
  }

  // 生成 nav 配置
  const nav = [
    ...specialPages
  ]

  // 按照指定顺序添加分类
  for (const category of categoryOrder) {
    if (categoriesMap.has(category)) {
      nav.push({
        text: category,
        items: categoriesMap.get(category)
      })
    }
  }

  // 添加未在 categoryOrder 中的分类
  for (const [category, items] of categoriesMap) {
    if (!categoryOrder.includes(category)) {
      nav.push({
        text: category,
        items: items
      })
    }
  }

  // 生成 sidebar 配置
  const sidebar = []

  for (const category of categoryOrder) {
    if (categoriesMap.has(category)) {
      sidebar.push({
        text: category,
        collapsed: false,
        items: categoriesMap.get(category)
      })
    }
  }

  // 添加未在 categoryOrder 中的分类到 sidebar
  for (const [category, items] of categoriesMap) {
    if (!categoryOrder.includes(category)) {
      sidebar.push({
        text: category,
        collapsed: false,
        items: items
      })
    }
  }

  // 生成配置文件
  const configContent = `// 自动生成的 nav 和 sidebar 配置
// 请勿手动编辑此文件，运行 node generate-nav-config.js 重新生成

export const navConfig = ${JSON.stringify(nav, null, 2)}

export const sidebarConfig = ${JSON.stringify(sidebar, null, 2)}
`

  fs.writeFileSync(navOutputFile, configContent, 'utf-8')

  console.log(`\n✅ 已生成导航配置: ${navOutputFile}`)
  console.log(`📊 共 ${categoriesMap.size} 个分类，${mdFiles.length} 个文件`)

  // 输出分类统计
  console.log('\n📋 分类统计:')
  for (const [category, items] of categoriesMap) {
    console.log(`  ${category}: ${items.length} 篇`)
  }

  return { nav, sidebar }
}

// 运行
generateNavConfig()
