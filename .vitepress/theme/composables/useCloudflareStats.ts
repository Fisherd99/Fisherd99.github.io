import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'
import { normalizeArticlePath, PAGEVIEW_TRACK_META } from '../../site-config.js'

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
  let requestId = 0

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
    const currentRequestId = ++requestId
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
    status.value = 'Cloudflare 统计同步中...'

    try {
      const trackResponse = await fetch(trackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pagePath }),
        keepalive: true
      })
      if (!trackResponse.ok) {
        throw new Error(`Track HTTP ${trackResponse.status}`)
      }

      const payload = await trackResponse.json()
      if (currentRequestId !== requestId) {
        return
      }
      const total = Number(payload?.total ?? 0)
      const recent = Number(payload?.recent24h ?? 0)

      pageViews.value = String(total)
      recentReads.value = Number.isFinite(recent) ? String(recent) : '0'
      historyPoints.value = Array.isArray(payload?.points) ? payload.points : []
      visitorLocations.value = Array.isArray(payload?.locations) ? payload.locations : []
      status.value = `Cloudflare 统计已更新（更新时间：${formatUpdateTime(Date.now())}）`
    } catch {
      if (currentRequestId !== requestId) {
        return
      }
      pageViews.value = '获取失败'
      recentReads.value = '获取失败'
      historyPoints.value = []
      visitorLocations.value = []
      error.value = true
      status.value = 'Cloudflare 请求失败（请检查 Worker / 网络）'
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  onMounted(() => {
    void sync()
  })

  watch(
    () => route.path,
    () => nextTick(() => {
      void sync()
    })
  )

  return { pageViews, recentReads, status, historyPoints, visitorLocations, loading, error }
}
