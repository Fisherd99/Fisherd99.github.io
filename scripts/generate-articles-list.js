/**
 * 自动从 md 文件生成文章列表 JSON 文件
 * 运行方式：node scripts/generate-articles-list.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAllMarkdownFiles, parseFrontmatter } from './content-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const mdDir = path.join(projectRoot, 'md')
const outputFile = path.join(projectRoot, '.vitepress', 'generated', 'articles.json')

function generateArticlesList() {
  console.log('📂 扫描 markdown 文件...')

  const mdFiles = getAllMarkdownFiles(mdDir)
  const articles = []

  for (const filePath of mdFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const frontmatter = parseFrontmatter(content)

    if (!frontmatter || !frontmatter.categories) {
      continue
    }

    const relativePath = '/' + path.relative(mdDir, filePath).replace(/\.md$/, '')

    articles.push({
      title: frontmatter.title || path.basename(filePath, '.md'),
      link: relativePath,
      description: frontmatter.description || '',
      tags: frontmatter.tags || [],
      date: frontmatter.date || '',
      category: frontmatter.categories
    })

    console.log(`  ✓ ${frontmatter.title} (${frontmatter.categories})`)
  }

  articles.sort((a, b) => new Date(b.date) - new Date(a.date))
  fs.mkdirSync(path.dirname(outputFile), { recursive: true })
  fs.writeFileSync(outputFile, JSON.stringify(articles, null, 2), 'utf-8')

  console.log(`\n✅ 已生成文章列表: ${outputFile}`)
  console.log(`📊 共 ${articles.length} 篇文章`)
}

generateArticlesList()
