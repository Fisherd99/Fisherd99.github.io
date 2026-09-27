<script setup>
import { computed } from 'vue'
import { worldMapGeometries } from './world-map-geo.js'

const MAP_IMAGE_WIDTH = 1000
const MAP_MAX_LATITUDE = 90
const MAP_MIN_LATITUDE = -90
const MAP_HEIGHT = MAP_IMAGE_WIDTH / 2
const MAP_WESTERN_EDGE = -180

const projectCoordinate = ([longitude, latitude]) => ({
  x: ((longitude - MAP_WESTERN_EDGE) / 360) * MAP_IMAGE_WIDTH,
  y: ((MAP_MAX_LATITUDE - latitude) / 360) * MAP_IMAGE_WIDTH
})

const ringToPath = (ring) => {
  const [first, ...rest] = ring.map(projectCoordinate)
  return `M${first.x},${first.y} ${rest.map(({ x, y }) => `L${x},${y}`).join(' ')} Z`
}

const polygonToPath = (polygon) => polygon.map(ringToPath).join(' ')

const worldMapPaths = computed(() =>
  worldMapGeometries.flatMap((feature) => feature.coordinates.map(polygonToPath))
)

const pointInRing = ([longitude, latitude], ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = (yi > latitude) !== (yj > latitude)
      && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

const worldMapDetailPaths = computed(() => {
  const taiwan = worldMapGeometries.find((feature) => feature.name === 'Taiwan')
  const china = worldMapGeometries.find((feature) => feature.name === 'China')
  const hainan = china?.coordinates.find((polygon) => pointInRing([109.7, 19.2], polygon[0]))
  return [
    ...(taiwan?.coordinates.map(polygonToPath) ?? []),
    ...(hainan ? [polygonToPath(hainan)] : [])
  ]
})

const props = defineProps({
  locations: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: Boolean, default: false }
})

const projectEquirectangular = (latitude, longitude) => {
  let wrappedLongitude = longitude

  // Keep the map seam at the antimeridian and use a linear lon/lat projection.
  if (wrappedLongitude < MAP_WESTERN_EDGE) wrappedLongitude += 360
  if (wrappedLongitude >= MAP_WESTERN_EDGE + 360) wrappedLongitude -= 360
  if (latitude < MAP_MIN_LATITUDE || latitude > MAP_MAX_LATITUDE) return null

  return {
    x: ((wrappedLongitude - MAP_WESTERN_EDGE) / 360) * MAP_IMAGE_WIDTH,
    y: ((MAP_MAX_LATITUDE - latitude) / 360) * MAP_IMAGE_WIDTH
  }
}

const points = computed(() => {
  const maximum = Math.max(1, ...props.locations.map((location) => Number(location.views) || 0))
  return props.locations
    .map((location) => {
      const latitude = Number(location.latitude)
      const longitude = Number(location.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
      const position = projectEquirectangular(latitude, longitude)
      if (!position) return null
      return {
        ...location,
        ...position,
        radius: 3 + Math.sqrt((Number(location.views) || 1) / maximum) * 5
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
      <span class="visitor-map-source">边缘定位·隐私聚合</span>
    </div>
    <div v-if="loading" class="visitor-map-state">正在加载访客分布…</div>
    <div v-else-if="error" class="visitor-map-state">访客地图暂时不可用</div>
    <div v-else-if="points.length === 0" class="visitor-map-state">尚无地理位置数据</div>
    <svg
      v-else
      class="visitor-map-canvas"
      :viewBox="`0 0 ${MAP_IMAGE_WIDTH} ${MAP_HEIGHT}`"
      role="img"
      aria-label="由 Cloudflare 边缘定位生成的访客分布地图"
    >
      <rect class="map-ocean" x="0" y="0" :width="MAP_IMAGE_WIDTH" :height="MAP_HEIGHT" />
      <g class="map-land" fill-rule="evenodd" aria-hidden="true">
        <path v-for="(path, index) in worldMapPaths" :key="index" :d="path" />
      </g>
      <g class="map-island-details" fill-rule="evenodd" aria-hidden="true">
        <path v-for="(path, index) in worldMapDetailPaths" :key="index" :d="path" />
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

.map-land {
  fill: var(--vp-c-default-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 1.3;
  stroke-linejoin: round;
  stroke-linecap: round;
  pointer-events: none;
}

.map-island-details {
  fill: var(--vp-c-default-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 2.6;
  stroke-linejoin: round;
  stroke-linecap: round;
  pointer-events: none;
}

.map-points circle {
  fill: var(--vp-c-brand-1);
  fill-opacity: 0.78;
  stroke: var(--vp-c-bg);
  stroke-width: 3.3;
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
