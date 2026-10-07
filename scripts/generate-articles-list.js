import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAllMarkdownFiles, parseFrontmatter } from './content-utils.mjs'
import { CATEGORY_ORDER } from '../.vitepress/site-meta.js'
import { ARTICLE_PATH_PATTERN, MAX_ARTICLE_PATH_LENGTH } from '../.vitepress/site-config.js'

export function collectArticles(mdDir) {
  return getAllMarkdownFiles(mdDir).flatMap((file) => {
    try {
      const data = parseFrontmatter(fs.readFileSync(file, 'utf8'))
      if (data?.categories == null || data.categories === '') return []
      const relative = path.relative(mdDir, file).split(path.sep).join('/')
      const link = '/' + relative.replace(/\.md$/, '')
      if (link.length > MAX_ARTICLE_PATH_LENGTH || !ARTICLE_PATH_PATTERN.test(link)) throw new Error(`Invalid article path: ${link}; use top-level lowercase kebab-case within ${MAX_ARTICLE_PATH_LENGTH} characters`)
      if (!CATEGORY_ORDER.includes(data.categories)) throw new Error(`Unknown category: ${data.categories}`)
      for (const key of ['title', 'description']) {
        if (data[key] != null && typeof data[key] !== 'string') throw new Error(`${key} must be a string`)
      }
      if (data.tags != null && (!Array.isArray(data.tags) || data.tags.some((tag) => typeof tag !== 'string'))) throw new Error('tags must be an array of strings')
      const date = data.date ?? ''
      if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('date must be a valid YYYY-MM-DD')
      return [{ title: data.title || path.basename(file, '.md'), link, description: data.description || '', tags: data.tags || [], date, category: data.categories }]
    } catch (error) {
      throw new Error(`${file}: ${error.message}`, { cause: error })
    }
  }).sort((a, b) => b.date.localeCompare(a.date) || a.link.localeCompare(b.link, 'en'))
}

export function generateArticlesList() {
  const articles = collectArticles(fileURLToPath(new URL('../md/', import.meta.url)))
  const output = new URL('../.vitepress/generated/articles.json', import.meta.url)
  fs.mkdirSync(new URL('.', output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(articles, null, 2) + '\n')
  console.log('Generated ' + articles.length + ' validated articles')
  return articles
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateArticlesList()
}
