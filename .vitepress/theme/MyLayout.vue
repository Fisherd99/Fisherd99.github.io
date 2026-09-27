<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import LazyGiscus from './LazyGiscus.vue'
import PageViewTrend from './PageViewTrend.vue'
import CloudflareVisitorMap from './CloudflareVisitorMap.vue'
import { useData, useRoute } from 'vitepress'

const { isDark } = useData()
const route = useRoute()
const { Layout } = DefaultTheme

const cfPageViews = ref('加载中...')
const cfRecentReads = ref('加载中...')
const cfStatus = ref('')
const cfHistoryPoints = ref([])
const cfVisitorLocations = ref([])
const cfLoading = ref(true)
const cfError = ref(false)
let statsRequestId = 0

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

  if (!trackUrl || typeof window === 'undefined') {
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

    const payload = await trackResponse.json()
    if (requestId !== statsRequestId) {
      return
    }
    const total = Number(payload?.total ?? 0)
    const recentReads = Number(payload?.recent24h ?? 0)

    cfPageViews.value = String(total)
    cfRecentReads.value = Number.isFinite(recentReads) ? String(recentReads) : '0'
    cfHistoryPoints.value = Array.isArray(payload?.points) ? payload.points : []
    cfVisitorLocations.value = Array.isArray(payload?.locations) ? payload.locations : []
    cfStatus.value = `Cloudflare 统计已更新（更新时间：${formatUpdateTime(Date.now())}）`
  } catch {
    if (requestId !== statsRequestId) {
      return
    }
    cfPageViews.value = '获取失败'
    cfRecentReads.value = '获取失败'
    cfHistoryPoints.value = []
    cfVisitorLocations.value = []
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
})

watch(
  () => route.path,
  () => {
    nextTick(() => {
      void syncCloudflareStats()
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
          <CloudflareVisitorMap
            :locations="cfVisitorLocations"
            :loading="cfLoading"
            :error="cfError"
          />
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

@media (max-width: 700px) {
  .analytics-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .analytics-row :deep(.visitor-map) {
    margin-top: -10px;
  }
}

</style>
