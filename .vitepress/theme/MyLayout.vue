<script setup>
import DefaultTheme from 'vitepress/theme'
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import LazyGiscus from './LazyGiscus.vue'
import PageViewDashboard from './PageViewDashboard.vue'
import { useData, useRoute } from 'vitepress'
import { useCloudflareStats } from './composables/useCloudflareStats'

const { isDark } = useData()
const route = useRoute()
const { Layout } = DefaultTheme

const {
  pageViews: cfPageViews,
  recentReads: cfRecentReads,
  status: cfStatus,
  historyPoints: cfHistoryPoints,
  visitorLocations: cfVisitorLocations,
  loading: cfLoading,
  error: cfError
} = useCloudflareStats()
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
