<script setup>
import { computed } from 'vue'

const props = defineProps({
  locations: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false }
})

const points = computed(() => {
  const maximum = Math.max(1, ...props.locations.map((location) => Number(location.views) || 0))
  return props.locations
    .map((location) => {
      const latitude = Number(location.latitude)
      const longitude = Number(location.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
      return {
        ...location,
        x: ((longitude + 180) / 360) * 360,
        y: ((90 - latitude) / 180) * 180,
        radius: 2.5 + Math.sqrt((Number(location.views) || 1) / maximum) * 5
      }
    })
    .filter(Boolean)
})

const locationLabel = (point) => {
  const place = [point.city, point.region, point.countryCode].filter(Boolean).join(' · ')
  return `${place || '未知地区'}：${point.views} 次访问`
}
</script>

<template>
  <section class="visitor-map" aria-labelledby="visitor-map-title">
    <div class="visitor-map-header">
      <div id="visitor-map-title" class="visitor-map-title" role="heading" aria-level="2">
        Cloudflare 访客地图
      </div>
      <span class="visitor-map-source">边缘定位 · 隐私聚合</span>
    </div>
    <div v-if="loading" class="visitor-map-state">正在加载访客分布…</div>
    <div v-else-if="error" class="visitor-map-state">访客地图暂时不可用</div>
    <div v-else-if="points.length === 0" class="visitor-map-state">尚无地理位置数据</div>
    <svg
      v-else
      class="visitor-map-canvas"
      viewBox="0 0 360 180"
      role="img"
      aria-label="由 Cloudflare 边缘定位生成的访客分布地图"
    >
      <rect class="map-ocean" width="360" height="180" rx="8" />
      <g class="map-grid" aria-hidden="true">
        <path d="M0 45H360M0 90H360M0 135H360M90 0V180M180 0V180M270 0V180" />
      </g>
      <g class="map-land" aria-hidden="true">
        <path d="M20 35 37 22 67 19 93 30 105 44 91 56 75 55 67 69 52 70 42 57 25 53Z" />
        <path d="m85 73 18 9 13 21-5 32-16 28-11-21 2-24-10-19Z" />
        <path d="m157 36 18-12 26 5 13 10 24-8 40 5 35 19-8 18-27 5-18 19-22-5-15-17-21-3-11-16-25-4Z" />
        <path d="m178 72 25 4 17 20-6 35-19 25-18-23-10-34Z" />
        <path d="m285 118 25-12 27 12-3 22-27 10-20-13Z" />
        <path d="m122 25 12-13 19 5-7 17Z" />
      </g>
      <g class="map-points">
        <circle
          v-for="point in points"
          :key="`${point.countryCode}-${point.latitude}-${point.longitude}`"
          :cx="point.x"
          :cy="point.y"
          :r="point.radius"
          tabindex="0"
        >
          <title>{{ locationLabel(point) }}</title>
        </circle>
      </g>
    </svg>
  </section>
</template>

<style scoped>
.visitor-map {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 220px;
  margin: 18px 0 26px;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.visitor-map-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.visitor-map-title {
  font-size: 0.95rem;
  line-height: 1.4;
}

.visitor-map-source {
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  white-space: nowrap;
}

.visitor-map-state {
  display: grid;
  flex: 1;
  place-items: center;
  color: var(--vp-c-text-3);
  font-size: 0.82rem;
}

.visitor-map-canvas {
  width: 100%;
  min-height: 0;
  flex: 1;
}

.map-ocean {
  fill: var(--vp-c-bg);
}

.map-grid path {
  fill: none;
  stroke: var(--vp-c-divider);
  stroke-width: 0.6;
}

.map-land path {
  fill: var(--vp-c-default-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 0.8;
}

.map-points circle {
  fill: var(--vp-c-brand-1);
  fill-opacity: 0.78;
  stroke: var(--vp-c-bg);
  stroke-width: 1.2;
  transform-box: fill-box;
  transform-origin: center;
  transition: fill-opacity 150ms ease, transform 150ms ease;
}

.map-points circle:hover,
.map-points circle:focus-visible {
  fill-opacity: 1;
  outline: none;
  transform: scale(1.25);
}
</style>
