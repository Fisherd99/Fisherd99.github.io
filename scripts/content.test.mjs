import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './content-utils.mjs'
import { collectArticles } from './generate-articles-list.js'
import { ARTICLE_PATH_PATTERN, MAX_ARTICLE_PATH_LENGTH } from '../.vitepress/site-config.js'

test('YAML comments, inline tags, multiline descriptions, CRLF and BOM are preserved correctly', () => {
  const data = parseFrontmatter('\uFEFF---\r\ntitle: "Title: quoted"\r\ncategories: 物理 # comment\r\ntags: [BSE, DFT]\r\ndescription: >\r\n  first line\r\n  second line\r\ndate: 2026-10-07\r\n---\r\nBody')
  assert.equal(data.title, 'Title: quoted')
  assert.equal(data.categories, '物理')
  assert.deepEqual(data.tags, ['BSE', 'DFT'])
  assert.equal(data.description, 'first line second line\n')
  assert.equal(data.date, '2026-10-07')
  assert.equal(parseFrontmatter('# No metadata'), null)
  assert.throws(() => parseFrontmatter('---\ntitle: one\ntitle: two\n---'), /unique/i)
})

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vitepress-content-'))
  t.after(() => {
    for (const name of fs.readdirSync(root)) fs.unlinkSync(path.join(root, name))
    fs.rmdirSync(root)
  })
  return { root, write(name, metadata) { fs.writeFileSync(path.join(root, name), `---\n${metadata}\n---\n# Article`) } }
}

test('Content index applies one deterministic date order and excludes uncategorized pages', (t) => {
  const { root, write } = fixture(t)
  write('a.md', 'title: A\ncategories: 物理\ndate: 2026-10-06\ntags: [DFT]')
  write('b.md', 'title: B\ncategories: 音乐\ndate: 2026-10-07')
  write('notes.md', 'title: Notes')
  assert.deepEqual(collectArticles(root).map((a) => a.link), ['/b', '/a'])
  assert.deepEqual(collectArticles(root)[1].tags, ['DFT'])
})

test('Invalid category, tags, calendar date and article path fail with the source filename', (t) => {
  const { root, write } = fixture(t)
  for (const [metadata, pattern] of [
    ['categories: 未知', /Unknown category/],
    ['categories: 物理\ntags: DFT', /tags must/],
    ['categories: 物理\ndate: 2026-02-30', /valid YYYY-MM-DD/]
  ]) {
    write('a.md', metadata)
    assert.throws(() => collectArticles(root), (error) => error.message.includes('a.md') && pattern.test(error.message))
  }
  fs.unlinkSync(path.join(root, 'a.md'))
  write('Upper+name.md', 'categories: 物理')
  assert.throws(() => collectArticles(root), /Invalid article path/)
  fs.unlinkSync(path.join(root, 'Upper+name.md'))
  write('a'.repeat(128) + '.md', 'categories: 物理')
  assert.throws(() => collectArticles(root), /Invalid article path/)
})

test('All repository articles satisfy the shared content contract', () => {
  const articles = collectArticles(fileURLToPath(new URL('../md/', import.meta.url)))
  assert.ok(articles.length > 0)
  for (const article of articles) {
    assert.match(article.link, ARTICLE_PATH_PATTERN)
    assert.ok(article.link.length <= MAX_ARTICLE_PATH_LENGTH)
  }
})

test('Article URLs use single-segment lowercase kebab-case', () => {
  for (const url of ['/berkeleygw-qe', '/article-2026', '/gdb']) assert.match(url, ARTICLE_PATH_PATTERN)
  for (const url of ['/Uppercase', '/with+plus', '/with_underscore', '/music/article', '/double--dash']) {
    assert.equal(ARTICLE_PATH_PATTERN.test(url), false, url)
  }
})
