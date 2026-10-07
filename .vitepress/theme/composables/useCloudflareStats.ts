import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { normalizeArticlePath, PAGEVIEW_TRACK_META } from '../../site-config.js'
import { createRequestLifecycle } from './request-lifecycle.mjs'

type HistoryPoint = { ts: number; value: number }
type VisitorLocation = {
  countryCode: string
  region: string
  city: string
  latitude: number
  longitude: number
  views: number
}

// Cloudflare Worker 阅读量：一次 POST 同时返回总量、最近 24h、趋势点与访客分布。
// API 地址由 config.mts 注入的 meta 标签提供；未配置时进入“未配置”回退态。
export const useCloudflareStats = () => {
  const route = useRoute()
  const pageViews = ref('加载中...')
  const recentReads = ref('加载中...')
  const status = ref('')
  const historyPoints = ref<HistoryPoint[]>([])
  const visitorLocations = ref<VisitorLocation[]>([])
  const loading = ref(true)
  const error = ref(false)
  const requests = createRequestLifecycle()
  let disposed = false

  const formatUpdateTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  const resolveApiUrl = (metaName: string) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return null
    }
    const meta = document.querySelector(`meta[name="${metaName}"]`)
    const rawUrl = meta?.getAttribute('content')?.trim()
    if (!rawUrl) {
      return null
    }
    try {
      return new URL(rawUrl, window.location.origin).toString()
    } catch {
      return null
    }
  }

  const sync = async () => {
    if (disposed) return
    requests.cancel()
    historyPoints.value = []
    visitorLocations.value = []
    const pagePath = normalizeArticlePath(route.path)
    const trackUrl = resolveApiUrl(PAGEVIEW_TRACK_META)

    if (!trackUrl || typeof window === 'undefined') {
      pageViews.value = '未配置'
      recentReads.value = '未配置'
      status.value = 'Cloudflare API 未配置'
      loading.value = false
      error.value = true
      return
    }

    loading.value = true
    error.value = false
    pageViews.value = '加载中...'
    recentReads.value = '加载中...'
    status.value = 'Cloudflare 统计同步中...'

    const result = await requests.run(async (signal: AbortSignal) => {
      const trackResponse = await fetch(trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pagePath }),
        signal
      })
      if (!trackResponse.ok) {
        throw new Error(`Track HTTP ${trackResponse.status}`)
      }

      return trackResponse.json()
    })
    if (result.status === 'cancelled' || disposed) return
    if (result.status === 'success') {
      const payload = result.value
      const total = Number(payload?.total ?? 0)
      const recent = Number(payload?.recent24h ?? 0)

      pageViews.value = Number.isFinite(total) ? String(total) : '0'
      recentReads.value = Number.isFinite(recent) ? String(recent) : '0'
      historyPoints.value = Array.isArray(payload?.points) ? payload.points : []
      visitorLocations.value = Array.isArray(payload?.locations) ? payload.locations : []
      status.value = `Cloudflare 统计已更新（更新时间：${formatUpdateTime(Date.now())}）`
    } else {
      pageViews.value = '获取失败'
      recentReads.value = '获取失败'
      historyPoints.value = []
      visitorLocations.value = []
      error.value = true
      status.value = result.status === 'timeout' ? 'Cloudflare 请求超时，请稍后重试' : 'Cloudflare 请求失败（请检查 Worker / 网络）'
    }
    loading.value = false
  }

  onMounted(() => {
    void sync()
  })

  onBeforeUnmount(() => {
    disposed = true
    requests.dispose()
  })

  watch(
    () => route.path,
    () => {
      requests.cancel()
      void nextTick(sync)
    }
  )

  return { pageViews, recentReads, status, historyPoints, visitorLocations, loading, error }
}
