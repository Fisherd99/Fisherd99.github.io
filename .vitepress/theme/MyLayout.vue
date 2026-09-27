<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import LazyGiscus from './LazyGiscus.vue'
import PageViewTrend from './PageViewTrend.vue'
import { useData, useRoute } from 'vitepress'

const { isDark } = useData()
const route = useRoute()
const { Layout } = DefaultTheme

const cfPageViews = ref('加载中...')
const cfRecentReads = ref('加载中...')
const cfStatus = ref('')
const cfHistoryPoints = ref([])
const cfLoading = ref(true)
const cfError = ref(false)
const mapContainer = ref(null)
let statsRequestId = 0

const loadMapMyVisitors = () => {
  if (!mapContainer.value || document.getElementById('mapmyvisitors')) return

  const script = document.createElement('script')
  script.id = 'mapmyvisitors'
  script.type = 'text/javascript'
  script.src = 'https://mapmyvisitors.com/map.js?cl=0e1633&w=a&t=tt&d=vI6kFKqVuy9qV_ohB4mdDaJhBxJn0m-VmrLLdRa1IHA&co=0b4975&ct=cdd4d9&cmo=3acc3a&cmn=ff5353'
  script.async = true
  mapContainer.value.appendChild(script)
}

const normalizePath = (rawPath) => {
  const clean = (rawPath ?? '/').split('#')[0].split('?')[0] || '/'
  return clean.startsWith('/') ? clean : `/${clean}`
}

const formatUpdateTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const resolveApiUrl = (metaName) => {
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

const syncCloudflareStats = async () => {
  const requestId = ++statsRequestId
  const pagePath = normalizePath(route.path)
  const trackUrl = resolveApiUrl('pageview-track-api')
  const historyUrl = resolveApiUrl('pageview-history-api')

  if (!trackUrl || !historyUrl || typeof window === 'undefined') {
    cfPageViews.value = '未配置'
    cfRecentReads.value = '未配置'
    cfStatus.value = 'Cloudflare API 未配置'
    cfLoading.value = false
    cfError.value = true
    return
  }

  cfLoading.value = true
  cfError.value = false
  cfStatus.value = 'Cloudflare 统计同步中...'

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

    const url = new URL(historyUrl)
    url.searchParams.set('path', pagePath)

    const response = await fetch(url.toString(), { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = await response.json()
    if (requestId !== statsRequestId) {
      return
    }
    const total = Number(payload?.total ?? 0)
    const recentReads = Number(payload?.recent24h ?? 0)

    cfPageViews.value = String(total)
    cfRecentReads.value = Number.isFinite(recentReads) ? String(recentReads) : '0'
    cfHistoryPoints.value = Array.isArray(payload?.points) ? payload.points : []
    cfStatus.value = `Cloudflare 统计已更新（更新时间：${formatUpdateTime(Date.now())}）`
  } catch {
    if (requestId !== statsRequestId) {
      return
    }
    cfPageViews.value = '获取失败'
    cfRecentReads.value = '获取失败'
    cfHistoryPoints.value = []
    cfError.value = true
    cfStatus.value = 'Cloudflare 请求失败（请检查 Worker / 网络）'
  } finally {
    if (requestId === statsRequestId) {
      cfLoading.value = false
    }
  }
}

onMounted(() => {
  void syncCloudflareStats()
  loadMapMyVisitors()
})

watch(
  () => route.path,
  () => {
    nextTick(() => {
      void syncCloudflareStats()
      loadMapMyVisitors()
    })
  }
)
</script>

<template>
  <Layout>
    <template #aside-outline-before>
      导航
    </template>

    <template #home-hero-after>
      <HomeArticlesAuto />
    </template>

    <template #doc-after>
      <div style="margin-top: 24px">
        <div class="pageview-stats">
          <span>
            本文阅读量：<strong>{{ cfPageViews }}</strong>
          </span>
          <span>
            最近 24 小时阅读量：<strong>{{ cfRecentReads }}</strong>
          </span>
          <span id="busuanzi_container_page_pv" class="reference-pageview" style="display: none">
            Busuanzi参考计数：<strong id="busuanzi_value_page_pv">0</strong>
          </span>
        </div>
        <div class="pageview-status">{{ cfStatus }}</div>
        <div class="analytics-row">
          <PageViewTrend
            :points="cfHistoryPoints"
            :loading="cfLoading"
            :error="cfError"
          />
          <section class="visitor-map" aria-labelledby="visitor-map-title">
            <div id="visitor-map-title" class="visitor-map-title" role="heading" aria-level="2">
              访客地图
            </div>
            <div
              ref="mapContainer"
              class="visitor-map-content"
              aria-label="MapMyVisitors 访客地图"
            ></div>
          </section>
        </div>
        <LazyGiscus :key="route.path" :theme="isDark ? 'dark' : 'light'" />
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.pageview-stats {
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.pageview-status {
  margin: -6px 0 10px;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.reference-pageview {
  color: var(--vp-c-text-3);
}

.analytics-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 280px);
  gap: 16px;
  align-items: stretch;
}

.analytics-row :deep(.pageview-trend) {
  min-width: 0;
}

.visitor-map {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  height: 220px;
  margin: 18px 0 26px;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.visitor-map-title {
  align-self: flex-start;
  font-size: 0.95rem;
  line-height: 1.4;
}

.visitor-map-content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

.visitor-map-content :deep(#mapmyvisitors-widget) {
  max-width: 100%;
}

@media (max-width: 700px) {
  .analytics-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .visitor-map {
    margin-top: -10px;
  }
}

</style>
