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
  }
}

export default {
  extends: DefaultTheme,
  // 使用注入插槽的包装组件覆盖 Layout
  Layout: MyLayout,

  setup() {
    const route = useRoute()
    let busuanziScriptLoaded = false

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

    onMounted(() => {
      ensureBusuanziScript()
      initZoom()
      refreshBusuanzi()
    })
    watch(
      () => route.path,
      () => nextTick(() => {
        initZoom()
        refreshBusuanzi()
      })
    )
  }
}
