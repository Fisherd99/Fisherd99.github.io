import DefaultTheme from 'vitepress/theme'
import MyLayout from './MyLayout.vue'
import './custom.css';
import 'katex/dist/katex.min.css'
import { onMounted, watch, nextTick } from 'vue'
import { useData, useRoute } from 'vitepress'

declare global {
  interface Window {
    busuanzi?: {
      fetch?: () => void
    }
  }
}

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: MyLayout,

  setup() {
    const route = useRoute()
    const { page } = useData()
    let busuanziScriptLoaded = false
    let zoomInstance: {
      attach: (selector: string) => void
      detach: () => void
    } | undefined

    const initZoom = async () => {
      if (!zoomInstance) {
        const { default: mediumZoom } = await import('medium-zoom')
        zoomInstance = mediumZoom('.vp-doc img:not([data-no-zoom])', { background: 'var(--vp-c-bg)' })
        return
      }
      zoomInstance.detach()
      zoomInstance.attach('.vp-doc img:not([data-no-zoom])')
    }

    const renderLastUpdatedBelowTitle = () => {
      const title = document.querySelector('.VPDoc .vp-doc h1')
      const existing = document.querySelector('.title-last-updated')
      existing?.remove()

      const timestamp = Number(page.value.lastUpdated)
      if (!title || !Number.isFinite(timestamp)) return

      const lastUpdated = document.createElement('p')
      const time = document.createElement('time')
      lastUpdated.className = 'title-last-updated'
      lastUpdated.append('更新于: ')
      time.dateTime = new Date(timestamp).toISOString()
      time.textContent = new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'full',
        timeStyle: 'medium'
      }).format(timestamp)
      lastUpdated.appendChild(time)
      title.insertAdjacentElement('afterend', lastUpdated)
    }

    const syncWrappedLineNumbers = () => {
      document.querySelectorAll('.vp-doc .line-numbers-mode code').forEach((code) => {
        const lines = code.querySelectorAll(':scope > .line')
        const block = code.closest<HTMLElement>('.line-numbers-mode')
        const digitCount = Math.max(1, String(lines.length).length)
        block?.style.setProperty('--code-line-number-digits', String(digitCount))

        lines.forEach((line, index) => {
          line.setAttribute('data-line-number', String(index + 1))
        })
      })
    }

    const ensureBusuanziScript = () => {
      if (typeof window === 'undefined' || busuanziScriptLoaded) {
        return
      }
      const script = document.createElement('script')
      script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
      script.async = true
      document.head.appendChild(script)
      busuanziScriptLoaded = true
    }

    const refreshBusuanzi = () => {
      if (typeof window === 'undefined') {
        return
      }
      window.setTimeout(() => {
        window.busuanzi?.fetch?.()
      }, 80)
    }

    onMounted(() => {
      window.setTimeout(ensureBusuanziScript, 1200)
      void initZoom()
      syncWrappedLineNumbers()
      renderLastUpdatedBelowTitle()
    })
    watch(
      () => route.path,
      () => nextTick(() => {
        void initZoom()
        syncWrappedLineNumbers()
        renderLastUpdatedBelowTitle()
        refreshBusuanzi()
      })
    )
    watch(
      () => page.value.lastUpdated,
      () => nextTick(renderLastUpdatedBelowTitle)
    )
  }
}
