/**
 * 自动从 md 文件生成文章列表 JSON 文件
 * 运行方式：node generate-articles-list.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAllMarkdownFiles, parseFrontmatter } from './scripts/content-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mdDir = path.join(__dirname, 'md')
const outputFile = path.join(__dirname, 'public', 'articles.json')

// 生成文章列表
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

  // 按日期排序（最新在前）
  articles.sort((a, b) => new Date(b.date) - new Date(a.date))

  // 写入 JSON 文件
  fs.writeFileSync(outputFile, JSON.stringify(articles, null, 2), 'utf-8')

  console.log(`\n✅ 已生成文章列表: ${outputFile}`)
  console.log(`📊 共 ${articles.length} 篇文章`)

  return articles
}

// 运行
generateArticlesList()
