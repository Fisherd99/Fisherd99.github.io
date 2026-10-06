<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  bvid: {
    type: String,
    required: true,
    validator: (value) => /^BV[0-9A-Za-z]+$/.test(value)
  },
  title: {
    type: String,
    default: 'B 站视频'
  },
  autoplay: {
    type: Boolean,
    default: false
  },
  danmaku: {
    type: Boolean,
    default: false
  }
})

// 与 LazyGiscus.vue 同款：滚动到附近才挂 iframe，避免首屏就去拉 B 站的一整套脚本和埋点。
const container = ref(null)
const shouldLoad = ref(false)
let observer

const src = computed(() => {
  const params = new URLSearchParams({
    bvid: props.bvid,
    page: '1',
    autoplay: props.autoplay ? '1' : '0',
    danmaku: props.danmaku ? '1' : '0',
    high_quality: '1'
  })
  return `https://player.bilibili.com/player.html?${params}`
})

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    shouldLoad.value = true
    return
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        shouldLoad.value = true
        observer?.disconnect()
      }
    },
    { rootMargin: '400px 0px' }
  )

  observer.observe(container.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="container" class="bilibili-player">
    <!-- 不要加 sandbox：会禁掉 B 站播放器自身的脚本。 -->
    <iframe
      v-if="shouldLoad"
      class="bilibili-frame"
      :src="src"
      :title="title"
      frameborder="0"
      scrolling="no"
      allowfullscreen
      allow="fullscreen; picture-in-picture"
    />
    <div v-else class="bilibili-placeholder">
      <span class="bilibili-placeholder-icon" aria-hidden="true">▶</span>
      <span class="bilibili-placeholder-title">{{ title }}</span>
      <span class="bilibili-placeholder-hint">滚动到此处时加载 B 站播放器</span>
    </div>
  </div>
</template>

<style scoped>
.bilibili-player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  margin: var(--spacing-lg) 0;
  overflow: hidden;
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-md);
}

.bilibili-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

.bilibili-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  color: var(--c-text-muted);
}

.bilibili-placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: var(--spacing-xs);
  color: #fff;
  font-size: 1.1rem;
  background: #fb7299; /* B 站品牌粉 */
  border-radius: 50%;
}

.bilibili-placeholder-title {
  color: var(--c-text-secondary);
  font-weight: 600;
}

.bilibili-placeholder-hint {
  font-size: 0.8125rem;
}
</style>
