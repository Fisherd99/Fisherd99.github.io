<script setup>
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  theme: {
    type: String,
    default: 'light'
  }
})

const Giscus = defineAsyncComponent(() => import('@giscus/vue').then((module) => module.default))
const container = ref(null)
const shouldLoad = ref(false)
let observer

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    shouldLoad.value = true
    return
  }

  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      shouldLoad.value = true
      observer?.disconnect()
    }
  }, { rootMargin: '400px 0px' })

  observer.observe(container.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="container" class="comments-container">
    <Giscus
      v-if="shouldLoad"
      repo="Fisherd99/Fisherd99.github.io"
      repo-id="R_kgDOJmvFtA"
      category="Announcements"
      category-id="DIC_kwDOJmvFtM4CwLXf"
      mapping="pathname"
      strict="0"
      reactions-enabled="1"
      emit-metadata="0"
      input-position="top"
      :theme="theme"
      lang="zh-CN"
    />
    <p v-else class="comments-placeholder">评论将在滚动到此处时加载</p>
  </div>
</template>

<style scoped>
.comments-container {
  min-height: 120px;
}

.comments-placeholder {
  margin: 0;
  padding: 28px 0;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
  text-align: center;
}
</style>
