<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

interface Snapshot {
  ts: number
  value: number
}

type HistoryMap = Record<string, Snapshot[]>

const STORAGE_KEY = 'fisherd_pageview_history_v1'
const MAX_POINTS = 24
const SAME_VALUE_MIN_INTERVAL = 30 * 1000
const SVG_WIDTH = 380
const SVG_HEIGHT = 108
const PADDING_LEFT = 36
const PADDING_RIGHT = 10
const PADDING_TOP = 10
const PADDING_BOTTOM = 14

const route = useRoute()
const snapshots = ref<Snapshot[]>([])
let periodicTimer: number | null = null

const normalizedPath = computed(() => route.path.split('#')[0].split('?')[0] || '/')

const readHistory = (): HistoryMap => {
  if (typeof window === 'undefined') {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as HistoryMap
    return parsed ?? {}
  } catch {
    return {}
  }
}

const writeHistory = (history: HistoryMap) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

const loadSnapshots = () => {
  const history = readHistory()
  snapshots.value = history[normalizedPath.value] ?? []
}

const readCurrentPageViews = () => {
  if (typeof document === 'undefined') {
    return null
  }
  const node = document.getElementById('busuanzi_value_page_pv')
  if (!node) {
    return null
  }
  const valueText = (node.textContent ?? '').replace(/,/g, '').trim()
  if (!valueText) {
    return null
  }
  const numeric = Number.parseInt(valueText, 10)
  return Number.isFinite(numeric) ? numeric : null
}

const saveSnapshot = (value: number) => {
  const history = readHistory()
  const list = history[normalizedPath.value] ?? []
  const last = list[list.length - 1]
  if (last?.value === value && Date.now() - last.ts < SAME_VALUE_MIN_INTERVAL) {
    snapshots.value = list
    return
  }
  const updated = [...list, { ts: Date.now(), value }].slice(-MAX_POINTS)
  history[normalizedPath.value] = updated
  writeHistory(history)
  snapshots.value = updated
}

const captureWithRetry = (maxRetry = 10) => {
  let retry = 0
  const tick = () => {
    const value = readCurrentPageViews()
    if (value !== null) {
      saveSnapshot(value)
      return
    }
    retry += 1
    if (retry < maxRetry) {
      window.setTimeout(tick, 400)
    }
  }
  tick()
}

const stopPeriodicCapture = () => {
  if (periodicTimer !== null) {
    window.clearInterval(periodicTimer)
    periodicTimer = null
  }
}

const startPeriodicCapture = () => {
  if (typeof window === 'undefined') {
    return
  }
  stopPeriodicCapture()
  periodicTimer = window.setInterval(() => {
    captureWithRetry(2)
  }, SAME_VALUE_MIN_INTERVAL)
}

const chartPoints = computed(() => {
  const list = snapshots.value
  if (list.length === 0) {
    return ''
  }
  const values = list.map((item) => item.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const plotWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const plotHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM

  return list
    .map((item, index) => {
      const x = PADDING_LEFT + (plotWidth * index) / Math.max(1, list.length - 1)
      const y = PADDING_TOP + plotHeight - ((item.value - min) / range) * plotHeight
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})

const latestValue = computed(() => snapshots.value[snapshots.value.length - 1]?.value ?? 0)
const earliestValue = computed(() => snapshots.value[0]?.value ?? 0)
const trendDelta = computed(() => latestValue.value - earliestValue.value)

const formatTickTime = (timestamp: number) => {
  const d = new Date(timestamp)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hh}:${mm}`
}

const yAxisTicks = computed(() => {
  const list = snapshots.value
  if (list.length === 0) {
    return [] as Array<{ value: number, y: number, key: string }>
  }
  const values = list.map((item) => item.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const plotHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const candidates = [max, Math.round((max + min) / 2), min]

  return candidates.map((value, index) => {
    const y = PADDING_TOP + plotHeight - ((value - min) / range) * plotHeight
    return {
      value,
      y,
      key: `y-${index}-${value}`
    }
  })
})

const axisBottomY = computed(() => SVG_HEIGHT - PADDING_BOTTOM)

const yAxisLabelPositions = computed(() => {
  return yAxisTicks.value.map((tick) => ({
    value: tick.value,
    key: `label-${tick.key}`,
    top: `${((tick.y / SVG_HEIGHT) * 100).toFixed(2)}%`
  }))
})

const xAxisTicks = computed(() => {
  const list = snapshots.value
  if (list.length === 0) {
    return [] as Array<{ label: string, key: string }>
  }
  if (list.length === 1) {
    const only = list[0]
    return [{ label: formatTickTime(only.ts), key: `single-${only.ts}` }]
  }
  const start = list[0]
  const mid = list[Math.floor((list.length - 1) / 2)]
  const end = list[list.length - 1]
  return [
    { label: formatTickTime(start.ts), key: `start-${start.ts}` },
    { label: formatTickTime(mid.ts), key: `mid-${mid.ts}` },
    { label: formatTickTime(end.ts), key: `end-${end.ts}` }
  ]
})

onMounted(() => {
  loadSnapshots()
  captureWithRetry()
  startPeriodicCapture()
})

watch(
  () => route.path,
  () => {
    nextTick(() => {
      loadSnapshots()
      captureWithRetry()
      startPeriodicCapture()
    })
  }
)
</script>

<template>
  <section class="pv-trend-wrap">
    <div class="pv-trend-head">
      <strong>阅读量趋势</strong>
      <span>最近 {{ snapshots.length }} 次记录，累计变化 {{ trendDelta >= 0 ? '+' : '' }}{{ trendDelta }}</span>
    </div>
    <div v-if="snapshots.length >= 2" class="pv-chart-shell">
      <svg
        class="pv-trend-chart"
        :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="页面阅读量趋势折线图"
      >
        <g>
          <line
            v-for="tick in yAxisTicks"
            :key="`${tick.key}-line`"
            class="pv-trend-grid"
            :x1="PADDING_LEFT"
            :y1="tick.y"
            :x2="SVG_WIDTH - PADDING_RIGHT"
            :y2="tick.y"
          />
          <line
            class="pv-trend-axis"
            :x1="PADDING_LEFT"
            :y1="axisBottomY"
            :x2="SVG_WIDTH - PADDING_RIGHT"
            :y2="axisBottomY"
          />
        </g>
        <polyline class="pv-trend-line" :points="chartPoints" />
      </svg>
      <div class="pv-trend-y-axis" aria-hidden="true">
        <span
          v-for="label in yAxisLabelPositions"
          :key="label.key"
          class="pv-trend-y-label"
          :style="{ top: label.top }"
        >
          {{ label.value }}
        </span>
      </div>
    </div>
    <div v-else class="pv-trend-empty">数据点不足，稍后刷新页面会自动补充。</div>
    <div v-if="xAxisTicks.length" class="pv-trend-x-axis">
      <span v-for="tick in xAxisTicks" :key="tick.key">{{ tick.label }}</span>
    </div>
    <div class="pv-trend-note">说明：该图按浏览器本地历史快照生成，用于展示阅读量变化趋势。</div>
  </section>
</template>

<style scoped>
.pv-trend-wrap {
  margin: 10px 0 18px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 55%, transparent);
}

.pv-trend-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  margin-bottom: 8px;
}

.pv-trend-chart {
  width: 100%;
  height: 72px;
  display: block;
}

.pv-chart-shell {
  position: relative;
}

.pv-trend-line {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pv-trend-grid {
  stroke: color-mix(in srgb, var(--vp-c-divider) 80%, transparent);
  stroke-width: 1;
  stroke-dasharray: 3 2;
}

.pv-trend-axis {
  stroke: var(--vp-c-divider);
  stroke-width: 1;
}

.pv-trend-y-axis {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pv-trend-y-label {
  position: absolute;
  left: 0;
  transform: translateY(-50%);
  color: var(--vp-c-text-3);
  font-size: 0.68rem;
  line-height: 1;
}

.pv-trend-empty,
.pv-trend-note {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.pv-trend-x-axis {
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.01em;
}

.pv-trend-note {
  margin-top: 6px;
}
</style>
