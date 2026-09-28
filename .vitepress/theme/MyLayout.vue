<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import LazyGiscus from './LazyGiscus.vue'
import PageViewDashboard from './PageViewDashboard.vue'
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
  let clean = (rawPath ?? '/').split('#')[0].split('?')[0] || '/'
  if (!clean.startsWith('/')) clean = `/${clean}`
  if (clean.length > 1) clean = clean.replace(/\/+$/, '')
  return clean.endsWith('.html') ? clean.slice(0, -5) || '/' : clean
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
      <div class="home-analytics">
        <PageViewDashboard
          :page-views="cfPageViews"
          :recent-views="cfRecentReads"
          :status="cfStatus"
          :points="cfHistoryPoints"
          :locations="cfVisitorLocations"
          :loading="cfLoading"
          :error="cfError"
          :is-dark="isDark"
          is-home
        />
      </div>
    </template>

    <template #doc-after>
      <div style="margin-top: 24px">
        <PageViewDashboard
          :page-views="cfPageViews"
          :recent-views="cfRecentReads"
          :status="cfStatus"
          :points="cfHistoryPoints"
          :locations="cfVisitorLocations"
          :loading="cfLoading"
          :error="cfError"
          :is-dark="isDark"
        />
        <LazyGiscus :key="route.path" :theme="isDark ? 'dark' : 'light'" />
      </div>
    </template>
  </Layout>
</template>

<style scoped>
.home-analytics {
  box-sizing: border-box;
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 0 24px 24px;
}

@media (max-width: 768px) {
  .home-analytics {
    padding: 0 16px 24px;
  }
}

</style>
