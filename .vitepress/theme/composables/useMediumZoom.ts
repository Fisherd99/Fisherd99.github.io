import { nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'

type ZoomInstance = {
  attach: (selector: string) => void
  detach: () => void
}

// 文章插图点击放大（medium-zoom 延迟加载，切换路由后重新挂载）。
export const useMediumZoom = () => {
  const route = useRoute()
  let zoomInstance: ZoomInstance | undefined

  const initZoom = async () => {
    if (!zoomInstance) {
      const { default: mediumZoom } = await import('medium-zoom')
      zoomInstance = mediumZoom('.vp-doc img:not([data-no-zoom])', { background: 'var(--vp-c-bg)' })
      return
    }
    zoomInstance.detach()
    zoomInstance.attach('.vp-doc img:not([data-no-zoom])')
  }

  onMounted(() => {
    void initZoom()
  })

  watch(
    () => route.path,
    () => nextTick(() => {
      void initZoom()
    })
  )
}
