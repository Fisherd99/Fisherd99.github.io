<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  isDark: { type: Boolean, default: false }
})

const container = ref(null)

const loadMap = () => {
  if (!container.value || typeof document === 'undefined') return

  container.value.replaceChildren()

  const colors = props.isDark
    ? { text: 'e5e7eb', ocean: '1e293b', labels: '94a3b8', high: 'c4b5fd', low: '8b5cf6' }
    : { text: '3c3c43', ocean: 'f1f5f9', labels: '64748b', high: '7e22ce', low: 'a78bfa' }
  const params = new URLSearchParams({
    cl: colors.text,
    w: 'a',
    t: 'tt',
    d: 'vI6kFKqVuy9qV_ohB4mdDaJhBxJn0m-VmrLLdRa1IHA',
    co: colors.ocean,
    ct: colors.labels,
    cmo: colors.high,
    cmn: colors.low
  })
  const script = document.createElement('script')
  script.id = 'mapmyvisitors'
  script.type = 'text/javascript'
  script.async = true
  script.src = `https://mapmyvisitors.com/map.js?${params}`
  const loadingState = document.createElement('span')
  loadingState.className = 'map-my-visitors-state'
  loadingState.setAttribute('role', 'status')
  loadingState.textContent = '正在加载第三方地图…'
  script.onload = () => loadingState.remove()
  script.onerror = () => {
    if (container.value) {
      const errorState = document.createElement('span')
      errorState.className = 'map-my-visitors-state'
      errorState.setAttribute('role', 'status')
      errorState.textContent = 'MapMyVisitors 地图暂时无法加载'
      container.value.replaceChildren(errorState)
    }
  }
  container.value.appendChild(loadingState)
  container.value.appendChild(script)
}

onMounted(loadMap)
watch(() => props.isDark, loadMap)
onBeforeUnmount(() => container.value?.replaceChildren())
</script>

<template>
  <section class="map-my-visitors" aria-labelledby="map-my-visitors-title">
    <div class="map-my-visitors-header">
      <div id="map-my-visitors-title" class="map-my-visitors-title" role="heading" aria-level="2">
        MapMyVisitors
      </div>
      <span class="map-my-visitors-source">第三方参考地图</span>
    </div>
    <div ref="container" class="map-my-visitors-content" aria-label="MapMyVisitors 访客地图">
      <span class="map-my-visitors-state">正在加载第三方地图…</span>
    </div>
  </section>
</template>

<style scoped>
.map-my-visitors {
  box-sizing: border-box;
  display: flex;
  min-width: 0;
  height: 220px;
  flex-direction: column;
  margin: 18px 0 26px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.map-my-visitors-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.map-my-visitors-title {
  font-size: 0.95rem;
  line-height: 1.4;
}

.map-my-visitors-source {
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  white-space: nowrap;
}

.map-my-visitors-content {
  display: flex;
  min-height: 0;
  width: 100%;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
}

.map-my-visitors-content :deep(#mapmyvisitors-widget),
.map-my-visitors-content :deep(iframe) {
  max-width: 100%;
}

.map-my-visitors-state:only-child {
  text-align: center;
}

@media (max-width: 700px) {
  .map-my-visitors {
    margin-top: -10px;
  }
}
</style>
