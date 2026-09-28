<script setup>
import PageViewTrend from './PageViewTrend.vue'
import CloudflareVisitorMap from './CloudflareVisitorMap.vue'
import MapMyVisitors from './MapMyVisitors.vue'

defineProps({
  pageViews: { type: String, default: '加载中…' },
  recentViews: { type: String, default: '加载中…' },
  status: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  locations: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  isDark: { type: Boolean, default: false },
  isHome: { type: Boolean, default: false }
})
</script>

<template>
  <section class="pageview-dashboard" :aria-label="isHome ? '首页访问统计' : '文章阅读统计'">
    <div class="pageview-stats">
      <span>
        {{ isHome ? '首页累计访问量' : '本文阅读量' }}：<strong>{{ pageViews }}</strong>
      </span>
      <span>
        最近 24 小时{{ isHome ? '首页访问量' : '阅读量' }}：<strong>{{ recentViews }}</strong>
      </span>
      <span class="reference-pageview">
        Busuanzi 本页参考计数：<strong id="busuanzi_page_pv">未获取</strong>
        （<a
          class="reference-pageview-link"
          href="https://www.busuanzi.cc/count.php?search=fisherd99.github.io"
          target="_blank"
          rel="noopener noreferrer"
          title="打开 Busuanzi 官方全站统计页（本页参考计数为单页 PV）"
        >查看全站统计</a>）
      </span>
    </div>
    <div class="pageview-status" role="status" aria-live="polite">{{ status }}</div>
    <div class="analytics-row">
      <PageViewTrend
        :points="points"
        :loading="loading"
        :error="error"
        :title="isHome ? '最近 60 天首页访问趋势' : '最近 60 天阅读趋势'"
        :unit="isHome ? '访问' : '阅读'"
      />
      <CloudflareVisitorMap
        :locations="locations"
        :loading="loading"
        :error="error"
      />
      <MapMyVisitors :is-dark="isDark" />
    </div>
  </section>
</template>

<style scoped>
.pageview-dashboard {
  min-width: 0;
  container-name: pageview-dashboard;
  container-type: inline-size;
}

.pageview-stats {
  margin-bottom: 16px;
  color: var(--vp-c-text-2);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 0.9rem;
}

.pageview-status {
  min-height: 1.25em;
  margin: -6px 0 10px;
  color: var(--vp-c-text-3);
  font-size: 0.78rem;
}

.reference-pageview {
  display: inline !important;
  color: var(--vp-c-text-3);
}

.reference-pageview-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 2px;
}

.reference-pageview-link:hover,
.reference-pageview-link:focus-visible {
  color: var(--vp-c-brand-1);
  text-decoration-color: currentColor;
}

.analytics-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: 16px;
}

.analytics-row :deep(.pageview-trend) {
  min-width: 0;
}

@container pageview-dashboard (width < 600px) {
  .analytics-row :deep(.visitor-map),
  .analytics-row :deep(.map-my-visitors) {
    margin-top: -10px;
  }
}

/* Use the actual content width: article sidebars can consume most of a wide viewport. */
@container pageview-dashboard (width >= 600px) {
  .analytics-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-row :deep(.pageview-trend) {
    grid-column: 1 / -1;
  }
}

@container pageview-dashboard (width >= 900px) {
  .analytics-row {
    grid-template-columns: minmax(340px, 1.3fr) repeat(2, minmax(260px, 1fr));
  }

  .analytics-row :deep(.pageview-trend) {
    grid-column: auto;
  }
}
</style>
