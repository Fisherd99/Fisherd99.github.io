import DefaultTheme from 'vitepress/theme'
import MyLayout from './MyLayout.vue'
import './custom.css';
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import mediumZoom from 'medium-zoom'

declare global {
  interface Window {
    busuanzi?: {
      fetch?: () => void
    }
    clustrmaps?: {
      [key: string]: unknown
    }
  }
}

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: MyLayout,

  setup() {
    const route = useRoute()
    let busuanziScriptLoaded = false
    let clustrmapsScriptLoaded = false

    const initZoom = () => {
      // 为所有图片增加缩放功能
      mediumZoom('.main img', { background: 'var(--vp-c-bg)' })
    }

    const ensureBusuanziScript = () => {
      if (typeof window === 'undefined' || busuanziScriptLoaded) {
        return
      }
      const script = document.createElement('script')
      script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
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

    const ensureClustrmapsScript = () => {
      if (typeof window === 'undefined' || clustrmapsScriptLoaded) {
        return
      }
      const container = document.getElementById('clustrmaps-widget')
      if (!container) {
        return
      }
      if (container.querySelector('#mapmyvisitors')) {
        clustrmapsScriptLoaded = true
        return
      }
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.id = 'mapmyvisitors'
      script.src = 'https://mapmyvisitors.com/map.js?cl=ffffff&w=a&t=tt&d=vI6kFKqVuy9qV_ohB4mdDaJhBxJn0m-VmrLLdRa1IHA'
      container.innerHTML = ''
      container.appendChild(script)
      clustrmapsScriptLoaded = true
    }

    onMounted(() => {
      ensureBusuanziScript()
      initZoom()
      refreshBusuanzi()
      nextTick(() => {
        ensureClustrmapsScript()
      })
    })
    watch(
      () => route.path,
      () => nextTick(() => {
        initZoom()
        refreshBusuanzi()
        ensureClustrmapsScript()
      })
    )
  }
}
