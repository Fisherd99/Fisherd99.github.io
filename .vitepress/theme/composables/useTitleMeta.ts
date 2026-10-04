import { nextTick, onMounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import { rawMarkdownUrl } from '../../site-meta.js'

// 文章标题下方的元信息行：左侧“跳转源文件”（指向原始 Markdown），右侧更新时间。
// 只能插到 h1 之后：VitePress 没有 “after h1” 的插槽，doc-before 在 h1 之前，
// 因此这里继续用 DOM 插入，但把逻辑收敛到本 composable，保持 index.ts 为薄装配层。
const GITHUB_ICON_PATH = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'

export const useTitleMeta = () => {
  const route = useRoute()
  const { page } = useData()

  const buildSourceLink = (relativePath: string) => {
    const sourceLink = document.createElement('a')
    sourceLink.className = 'title-source-link'
    sourceLink.href = rawMarkdownUrl(relativePath)
    sourceLink.target = '_blank'
    sourceLink.rel = 'noopener noreferrer'
    sourceLink.title = '查看原始 Markdown 源文件'

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    icon.setAttribute('viewBox', '0 0 24 24')
    icon.setAttribute('aria-hidden', 'true')
    icon.classList.add('title-source-link-icon')
    const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    iconPath.setAttribute('d', GITHUB_ICON_PATH)
    icon.appendChild(iconPath)

    sourceLink.appendChild(icon)
    sourceLink.append('跳转源文件')
    return sourceLink
  }

  const renderTitleMeta = () => {
    const title = document.querySelector('.VPDoc .vp-doc h1')
    const existing = document.querySelector('.title-last-updated')
    existing?.remove()

    const timestamp = Number(page.value.lastUpdated)
    if (!title || !Number.isFinite(timestamp)) return

    const lastUpdated = document.createElement('p')
    lastUpdated.className = 'title-last-updated'

    const relativePath = page.value.relativePath
    if (relativePath) {
      lastUpdated.appendChild(buildSourceLink(relativePath))
    }

    const updatedMeta = document.createElement('span')
    updatedMeta.className = 'title-last-updated-meta'
    const time = document.createElement('time')
    updatedMeta.append('更新于: ')
    time.dateTime = new Date(timestamp).toISOString()
    time.textContent = new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(timestamp)
    updatedMeta.appendChild(time)
    lastUpdated.appendChild(updatedMeta)

    title.insertAdjacentElement('afterend', lastUpdated)
  }

  onMounted(renderTitleMeta)

  watch(() => route.path, () => nextTick(renderTitleMeta))
  watch(() => page.value.lastUpdated, () => nextTick(renderTitleMeta))
}
