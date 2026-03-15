<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Giscus from "@giscus/vue";
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import { useData, useRoute } from "vitepress";

const { isDark, page, frontmatter } = useData();
const route = useRoute()
const { Layout } = DefaultTheme;

// 只在首页显示文章列表
const showHomeArticles = computed(() => {
  return page.value.frontmatter.layout === 'home'
})

const cfPageViews = ref('加载中...')
const cfRecentReads = ref('加载中...')
const cfStatus = ref('')

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
  const pagePath = normalizePath(route.path)
  const trackUrl = resolveApiUrl('pageview-track-api')
  const historyUrl = resolveApiUrl('pageview-history-api')

  if (!trackUrl || !historyUrl || typeof window === 'undefined') {
    cfPageViews.value = '未配置'
    cfRecentReads.value = '未配置'
    cfStatus.value = 'Cloudflare API 未配置'
    return
  }

  cfStatus.value = 'Cloudflare 统计同步中...'

  try {
    await fetch(trackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pagePath, ts: Date.now() }),
      keepalive: true
    })

    const url = new URL(historyUrl)
    url.searchParams.set('path', pagePath)

    const response = await fetch(url.toString(), { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const payload = await response.json()
    const total = Number(payload?.total ?? 0)
    const points = Array.isArray(payload?.points) ? payload.points : []
    const first = points.length > 0 ? Number(points[0]?.value ?? total) : total
    const last = points.length > 0 ? Number(points[points.length - 1]?.value ?? total) : total
    const recentReads = Math.max(0, last - first)

    cfPageViews.value = String(total)
    cfRecentReads.value = Number.isFinite(recentReads) ? String(recentReads) : '0'
    cfStatus.value = `Cloudflare 统计已更新（更新时间：${formatUpdateTime(Date.now())}）`
  } catch {
    cfPageViews.value = '获取失败'
    cfRecentReads.value = '获取失败'
    cfStatus.value = 'Cloudflare 请求失败（请检查 Worker / 网络）'
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
          <span id="busuanzi_container_site_pv">
            [Busuanzi] 站点访问总量：<span id="busuanzi_value_site_pv">0</span>
          </span>
          <span id="busuanzi_container_page_pv">
            [Busuanzi] 本页阅读量：<span id="busuanzi_value_page_pv">0</span>
          </span>
          <span>
            [Cloudflare] 本页阅读量：<strong>{{ cfPageViews }}</strong>
          </span>
          <span>
            [Cloudflare] 最近12小时阅读量：<strong>{{ cfRecentReads }}</strong>
          </span>
        </div>
        <div class="pageview-status">{{ cfStatus }}</div>
        <div id="clustrmaps-widget" class="clustrmaps-widget" />
        <Giscus
          repo="Fisherd99/Fisherd99.github.io"
          repo-id="R_kgDOJmvFtA"
          category="Announcements"
          category-id="DIC_kwDOJmvFtM4CwLXf"
          mapping="pathname"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="top"
          :theme="isDark ? 'dark' : 'light'"
          lang="zh-CN"
        />
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

.clustrmaps-widget {
  margin: 14px 0 18px;
  min-height: 24px;
}
</style>
