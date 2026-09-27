import fs from 'fs'
import path from 'path'

export const parseFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const data = {}
  let currentKey = null

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('- ') && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = []
      data[currentKey].push(line.slice(2).trim().replace(/^["']|["']$/g, ''))
      continue
    }

    const colonIndex = line.indexOf(':')
    if (colonIndex < 0) continue

    currentKey = line.slice(0, colonIndex).trim()
    data[currentKey] = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
  }

  return data
}

export const getAllMarkdownFiles = (directory) => {
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath))
    } else if (entry.name.endsWith('.md') && entry.name !== 'index.md') {
      files.push(fullPath)
    }
  }

  return files
}
