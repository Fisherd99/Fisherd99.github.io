<script setup>
import DefaultTheme from 'vitepress/theme'
import Giscus from "@giscus/vue";
import { useData } from "vitepress";

const { isDark, page } = useData();
const { Layout } = DefaultTheme;

</script>

<template>
  <Layout>
    <template #aside-outline-before>
      导航
    </template>

    <template #doc-after>
      <div style="margin-top: 24px">
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