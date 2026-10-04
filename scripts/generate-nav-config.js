/**
 * 自动从 md 文件的 frontmatter 生成 nav 和 sidebar 配置
 * 运行方式：node scripts/generate-nav-config.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAllMarkdownFiles, parseFrontmatter } from './content-utils.mjs'
import { CATEGORY_ORDER } from '../.vitepress/site-meta.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const mdDir = path.join(projectRoot, 'md')
const navOutputFile = path.join(projectRoot, '.vitepress', 'generated', 'nav-config.js')
const specialPages = [{ text: '主页', link: '/' }]

function generateNavConfig() {
  console.log('📂 扫描 markdown 文件...')

  const mdFiles = getAllMarkdownFiles(mdDir)
  const categoriesMap = new Map()

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
    categoriesMap.get(category).push({ text: title, link: relativePath })
    console.log(`  ✓ ${title} (${category})`)
  }

  const nav = [...specialPages]
  const sidebar = []

  for (const category of CATEGORY_ORDER) {
    const items = categoriesMap.get(category)
    if (!items) continue
    nav.push({ text: category, items })
    sidebar.push({ text: category, collapsed: false, items })
  }

  for (const [category, items] of categoriesMap) {
    if (CATEGORY_ORDER.includes(category)) continue
    nav.push({ text: category, items })
    sidebar.push({ text: category, collapsed: false, items })
  }

  const configContent = `// 自动生成的 nav 和 sidebar 配置
// 请勿手动编辑此文件，运行 node scripts/generate-nav-config.js 重新生成

export const navConfig = ${JSON.stringify(nav, null, 2)}

export const sidebarConfig = ${JSON.stringify(sidebar, null, 2)}
`

  fs.mkdirSync(path.dirname(navOutputFile), { recursive: true })
  fs.writeFileSync(navOutputFile, configContent, 'utf-8')

  console.log(`\n✅ 已生成导航配置: ${navOutputFile}`)
  console.log(`📊 共 ${categoriesMap.size} 个分类，${mdFiles.length} 个文件`)
  console.log('\n📋 分类统计:')
  for (const [category, items] of categoriesMap) {
    console.log(`  ${category}: ${items.length} 篇`)
  }
}

generateNavConfig()
