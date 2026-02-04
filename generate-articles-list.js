/**
 * 自动从 md 文件生成文章列表 JSON 文件
 * 运行方式：node generate-articles-list.js
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mdDir = path.join(__dirname, 'md')
const outputFile = path.join(__dirname, 'public', 'articles.json')

// 解析 frontmatter
function parseFrontmatter(content) {
  // 兼容 Windows (\r\n) 和 Unix (\n) 换行符
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const data = {}
  const lines = match[1].split('\n')

  let currentKey = null
  let inArray = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    if (!trimmedLine) continue

    // 处理键值对
    if (trimmedLine.startsWith('- ')) {
      // 数组项
      if (!currentKey) continue

      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = []
      }
      const value = trimmedLine.substring(1).trim().replace(/^["']|["']$/g, '')
      data[currentKey].push(value)
      inArray = true
    } else if (trimmedLine.includes(':')) {
      // 新的键值对
      const colonIndex = trimmedLine.indexOf(':')
      const key = trimmedLine.substring(0, colonIndex).trim()
      let value = trimmedLine.substring(colonIndex + 1).trim()

      // 移除引号
      value = value.replace(/^["']|["']$/g, '')

      // 即使值为空，也要设置 key（用于多行数组）
      data[key] = value
      currentKey = key
      inArray = false
    } else if (currentKey && inArray) {
      // 继续数组
      const value = trimmedLine.replace(/^["']|["']$/g, '')
      data[currentKey].push(value)
    }
  }

  return data
}

// 获取所有 md 文件
function getAllMdFiles(dir) {
  const files = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllMdFiles(fullPath))
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      files.push(fullPath)
    }
  }

  return files
}

// 生成文章列表
function generateArticlesList() {
  console.log('📂 扫描 markdown 文件...')

  const mdFiles = getAllMdFiles(mdDir)
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
