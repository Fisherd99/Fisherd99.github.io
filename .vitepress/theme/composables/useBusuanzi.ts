import { onMounted, watch } from 'vue'
import { useRoute } from 'vitepress'
import { BUSUANZI_API, BUSUANZI_PAGE_PV_ID } from '../../site-meta.js'

// Busuanzi 第三方参考计数：独立于 Cloudflare 统计，失败时显示“暂不可用”。
export const useBusuanzi = () => {
  const route = useRoute()
  let lastPageUrl = ''
  let requestId = 0

  const refreshBusuanzi = async () => {
    if (typeof window === 'undefined' || !document.getElementById(BUSUANZI_PAGE_PV_ID)) {
      return
    }
    if (import.meta.env.DEV && import.meta.env.VITE_REFERENCE_ANALYTICS_ENABLED !== 'true') {
      document.getElementById(BUSUANZI_PAGE_PV_ID)!.textContent = '本地开发已关闭'
      return
    }

    const currentRequestId = ++requestId
    const pageUrl = window.location.href
    const referrer = lastPageUrl || document.referrer
    lastPageUrl = pageUrl

    try {
      const response = await fetch(BUSUANZI_API, {
        method: 'POST',
        body: JSON.stringify({ url: pageUrl, referrer }),
        keepalive: true
      })
      if (!response.ok) throw new Error(`Busuanzi HTTP ${response.status}`)

      const values = await response.json()
      if (currentRequestId !== requestId) return
      for (const [id, value] of Object.entries(values)) {
        const counter = document.getElementById(id)
        if (counter) counter.textContent = String(value)
      }
    } catch {
      if (currentRequestId === requestId) {
        const counter = document.getElementById(BUSUANZI_PAGE_PV_ID)
        if (counter) counter.textContent = '暂不可用'
      }
    }
  }

  onMounted(() => {
    void refreshBusuanzi()
  })

  watch(() => route.path, () => {
    void refreshBusuanzi()
  })
}
