<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  error: Boolean
})

const bucketCount = 60
const dayMs = 24 * 60 * 60 * 1000
const chartContainer = ref(null)
const chartWidth = ref(1)
const chartHeight = 104
const chartVerticalPadding = 10
const hoveredPoint = ref(null)
let chartObserver

watch(chartContainer, (element) => {
  chartObserver?.disconnect()
  chartObserver = undefined
  if (!element) return

  const updateChartWidth = () => {
    const width = element.getBoundingClientRect().width
    if (width > 0) chartWidth.value = width
  }

  updateChartWidth()
  chartObserver = new ResizeObserver(updateChartWidth)
  chartObserver.observe(element)
}, { flush: 'post' })

onBeforeUnmount(() => chartObserver?.disconnect())

const normalizedPoints = computed(() => {
  const latestBucket = Math.floor(Date.now() / dayMs) * dayMs
  const values = new Map()

  for (const point of props.points) {
    const ts = Number(point?.ts)
    const value = Number(point?.value)
    if (!Number.isFinite(ts) || !Number.isFinite(value)) continue
    const day = Math.floor(ts / dayMs) * dayMs
    values.set(day, (values.get(day) ?? 0) + value)
  }

  return Array.from({ length: bucketCount }, (_, index) => {
    const ts = latestBucket - (bucketCount - 1 - index) * dayMs
    return { ts, value: Math.max(0, values.get(ts) ?? 0) }
  })
})

const peakValue = computed(() => Math.max(0, ...normalizedPoints.value.map((point) => point.value)))
const scaleMax = computed(() => Math.max(1, peakValue.value))
const totalReads = computed(() => normalizedPoints.value.reduce((sum, point) => sum + point.value, 0))
const activeBuckets = computed(() => normalizedPoints.value.filter((point) => point.value > 0).length)

const chartPoints = computed(() => {
  const usableHeight = chartHeight - chartVerticalPadding * 2
  const slotWidth = chartWidth.value / bucketCount
  const barWidth = Math.max(1, slotWidth * 0.72)
  return normalizedPoints.value.map((point, index) => {
    const x = (index + 0.5) * slotWidth
    const y = chartHeight - chartVerticalPadding - (point.value / scaleMax.value) * usableHeight
    return { ...point, x, y, slotWidth, barWidth }
  })
})

const tooltipX = computed(() => {
  if (!hoveredPoint.value) return 0
  return Math.min(chartWidth.value - 62, Math.max(62, hoveredPoint.value.x))
})

const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('zh-CN', {
  month: '2-digit',
  day: '2-digit'
})
</script>

<template>
  <section class="pageview-trend" aria-labelledby="pageview-trend-title" :aria-busy="loading">
    <div class="trend-heading">
      <div>
        <div id="pageview-trend-title" class="trend-title" role="heading" aria-level="2">最近 60 天阅读趋势</div>
        <p v-if="!loading && !error" class="trend-summary">
          共 {{ totalReads }} 次阅读，{{ activeBuckets }} 天有访问
        </p>
      </div>
      <span v-if="!loading && !error" class="trend-peak">峰值 {{ peakValue }} 次/天</span>
    </div>

    <div v-if="loading" class="trend-state">正在加载趋势数据…</div>
    <div v-else-if="error" class="trend-state trend-error" role="alert">
      趋势数据暂时不可用，请稍后刷新重试。
    </div>
    <template v-else>
      <div ref="chartContainer" class="trend-chart-container">
        <svg
          class="trend-chart"
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          role="img"
          :aria-label="`最近60天共${totalReads}次阅读，单日峰值${peakValue}次`"
        >
        <line x1="0" y1="94" :x2="chartWidth" y2="94" class="chart-axis" />
        <line x1="0" y1="52" :x2="chartWidth" y2="52" class="chart-grid" />
        <g
          v-for="point in chartPoints"
          :key="point.ts"
          class="chart-bar-target"
          tabindex="0"
          role="img"
          :aria-label="`${formatDate(point.ts)}，${point.value} 次阅读`"
          @mouseenter="hoveredPoint = point"
          @mouseleave="hoveredPoint = null"
          @focus="hoveredPoint = point"
          @blur="hoveredPoint = null"
          @click="hoveredPoint = point"
        >
          <rect
            :x="point.x - point.slotWidth / 2"
            :y="chartVerticalPadding"
            :width="point.slotWidth"
            :height="chartHeight - chartVerticalPadding * 2"
            class="chart-hit-area"
          />
          <rect
            :x="point.x - point.barWidth / 2"
            :y="point.y"
            :width="point.barWidth"
            :height="chartHeight - chartVerticalPadding - point.y"
            rx="1"
            class="chart-bar"
          />
        </g>
        <g v-if="hoveredPoint" class="chart-tooltip" aria-hidden="true">
          <rect :x="tooltipX - 58" :y="Math.max(2, hoveredPoint.y - 32)" width="116" height="24" rx="5" />
          <text :x="tooltipX" :y="Math.max(18, hoveredPoint.y - 16)" text-anchor="middle">
            {{ formatDate(hoveredPoint.ts) }} · {{ hoveredPoint.value }} 次
          </text>
        </g>
        </svg>
      </div>
      <div class="trend-axis-labels" aria-hidden="true">
        <span>{{ formatDate(normalizedPoints[0].ts) }}</span>
        <span>{{ formatDate(normalizedPoints[normalizedPoints.length - 1].ts) }}</span>
      </div>

    </template>
  </section>
</template>

<style scoped>
.pageview-trend {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 220px;
  margin: 18px 0 26px;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}

.trend-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.trend-title {
  margin: 0;
  border: 0;
  padding: 0;
  font-size: 0.95rem;
  line-height: 1.4;
}

.trend-summary,
.trend-peak {
  margin: 3px 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.78rem;
}

.trend-peak {
  flex-shrink: 0;
}

.trend-chart-container {
  flex: 0 0 114px;
  width: 100%;
  min-width: 0;
}

.trend-chart {
  display: block;
  width: 100%;
  height: 104px;
  margin-top: 10px;
  overflow: visible;
}

.chart-axis,
.chart-grid {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.chart-grid {
  stroke-dasharray: 4 5;
}

.chart-hit-area {
  fill: transparent;
  cursor: crosshair;
}

.chart-bar {
  fill: var(--vp-c-brand-1);
  opacity: 0.72;
  pointer-events: none;
}

.chart-bar-target:hover .chart-bar,
.chart-bar-target:focus .chart-bar {
  opacity: 1;
}

.chart-bar-target:focus {
  outline: none;
}

.chart-tooltip {
  pointer-events: none;
}

.chart-tooltip rect {
  fill: var(--vp-c-bg-elv);
  stroke: var(--vp-c-divider);
}

.chart-tooltip text {
  fill: var(--vp-c-text-1);
  font-size: 10px;
}

.trend-axis-labels {
  display: flex;
  justify-content: space-between;
  color: var(--vp-c-text-3);
  font-size: 0.72rem;
}

.trend-state {
  min-height: 104px;
  display: grid;
  place-items: center;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
}

.trend-error {
  color: var(--vp-c-danger-1);
}

@media (max-width: 640px) {
  .trend-heading {
    display: block;
  }

  .trend-peak {
    display: block;
  }
}
</style>
