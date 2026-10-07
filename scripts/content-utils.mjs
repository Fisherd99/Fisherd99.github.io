import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'
export const parseFrontmatter = (content) => {
  const match = content.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return null
  const data = parse(match[1], { uniqueKeys: true })
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be a YAML mapping')
  return data
}
export const getAllMarkdownFiles = (directory) => {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...getAllMarkdownFiles(fullPath))
    else if (entry.name.endsWith('.md') && entry.name !== 'index.md') files.push(fullPath)
  }
  return files
}
