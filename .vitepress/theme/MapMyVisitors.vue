<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  isDark: { type: Boolean, default: false }
})

const container = ref(null)
const mapStage = ref(null)
const mapScale = ref(1)
const mapWidth = ref(0)
let resizeObserver

const fitMap = () => {
  if (!container.value || !mapStage.value || !mapWidth.value) return

  // Scale the complete widget: its raster background and point coordinates
  // must retain the same native dimensions when the card changes width.
  const bounds = container.value.getBoundingClientRect()
  const height = parseFloat(getComputedStyle(mapStage.value).height)
  mapScale.value = Math.min(
    bounds.width / mapWidth.value,
    height > 0 ? bounds.height / height : 1
  )
}

const loadMap = () => {
  if (!mapStage.value || mapWidth.value < 1 || typeof document === 'undefined') return

  const stage = mapStage.value
  stage.replaceChildren()

  const colors = props.isDark
    ? { text: 'e5e7eb', ocean: '1e293b', labels: '94a3b8', high: 'c4b5fd', low: '8b5cf6' }
    : { text: '3c3c43', ocean: 'f1f5f9', labels: '64748b', high: '7e22ce', low: 'a78bfa' }
  const params = new URLSearchParams({
    cl: colors.text,
    w: String(mapWidth.value),
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
    if (mapStage.value === stage) {
      const errorState = document.createElement('span')
      errorState.className = 'map-my-visitors-state'
      errorState.setAttribute('role', 'status')
      errorState.textContent = 'MapMyVisitors 地图暂时无法加载'
      stage.replaceChildren(errorState)
    }
  }
  stage.appendChild(loadingState)
  stage.appendChild(script)
}

onMounted(() => {
  if (!container.value || !mapStage.value) return
  const updateSize = () => {
    if (!mapWidth.value) {
      // Leave space for the widget's page-view label above the map.
      mapWidth.value = Math.max(0, Math.floor(Math.min(
        container.value.clientWidth,
        (container.value.clientHeight - 22) * 2.04
      )))
      if (mapWidth.value > 0) loadMap()
    }
    fitMap()
  }
  if (typeof ResizeObserver === 'undefined') {
    updateSize()
    window.addEventListener('resize', updateSize)
    resizeObserver = { disconnect: () => window.removeEventListener('resize', updateSize) }
    return
  }
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(container.value)
  resizeObserver.observe(mapStage.value)
})
watch(() => props.isDark, loadMap)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mapStage.value?.replaceChildren()
})
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
      <div
        ref="mapStage"
        class="map-my-visitors-stage"
        :style="{ width: mapWidth ? `${mapWidth}px` : '100%', transform: `translate(-50%, -50%) scale(${mapScale})` }"
      >
        <span class="map-my-visitors-state">正在加载第三方地图…</span>
      </div>
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
  position: relative;
  min-height: 0;
  width: 100%;
  flex: 1;
  overflow: hidden;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
}

.map-my-visitors-stage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
}

.map-my-visitors-content :deep(.mapmyvisitors-map) {
  background-repeat: no-repeat;
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
