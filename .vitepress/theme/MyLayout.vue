<script setup>
import { computed } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Giscus from "@giscus/vue";
import HomeArticlesAuto from './HomeArticlesAuto.vue'
import PageViewTrend from './PageViewTrend.vue'
import { useData } from "vitepress";

const { isDark, page, frontmatter } = useData();
const { Layout } = DefaultTheme;

// 只在首页显示文章列表
const showHomeArticles = computed(() => {
  return page.value.frontmatter.layout === 'home'
})
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
            历史总访问量：<span id="busuanzi_value_site_pv">0</span>
          </span>
          <span id="busuanzi_container_page_pv">
            本页阅读量：<span id="busuanzi_value_page_pv">0</span>
          </span>
        </div>
        <PageViewTrend />
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
</style>
