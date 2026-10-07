<script setup>
import { computed } from 'vue'
import { formatTime, INSTRUMENTS } from './alphatab.mjs'

const props = defineProps({
  mode: { type: String, default: 'transport' },
  isPlaying: Boolean, position: Number, duration: Number, floating: Boolean,
  speed: Number, program: Number, compact: Boolean
})
const emit = defineEmits(['toggle', 'seek-by', 'seek', 'update:speed', 'update:program'])
const progressPercent = computed(() => props.duration ? Math.min(100, props.position / props.duration * 100) : 0)
const speedModel = computed({ get: () => props.speed, set: value => emit('update:speed', value) })
const programModel = computed({ get: () => props.program, set: value => emit('update:program', value) })
const speeds = [0.5, 0.75, 1, 1.25, 1.5]
</script>

<template>
  <div v-if="mode === 'settings'" class="score-settings" :class="{ 'is-compact': compact }">
    <label class="score-field">
      <span v-if="!compact">速度</span>
      <span class="score-select">
        <select v-model.number="speedModel" aria-label="速度" title="速度">
          <option v-for="value in speeds" :key="value" :value="value">{{ value === 1 ? '1.0' : value }}×</option>
        </select>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </span>
    </label>
    <label class="score-field">
      <span v-if="!compact">音色</span>
      <span class="score-select">
        <select v-model.number="programModel" aria-label="音色" title="音色">
          <option v-for="item in INSTRUMENTS" :key="item.program" :value="item.program">{{ item.name }}</option>
        </select>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </span>
    </label>
  </div>

  <div v-else class="score-transport" :class="{ 'is-floating': floating }">
    <div class="score-transport-row">
      <div class="score-hud-buttons">
        <button class="score-hud-btn" type="button" title="后退 5 秒" aria-label="后退 5 秒" @click="emit('seek-by', -5000)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
          <span class="score-hud-num">5s</span>
        </button>

        <button
          class="score-hud-btn score-hud-play"
          type="button"
          :title="isPlaying ? '暂停' : '播放'"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="emit('toggle')"
        >
          <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6.75 5.25h4.5v13.5h-4.5zM12.75 5.25h4.5v13.5h-4.5z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653z" />
          </svg>
        </button>

        <button class="score-hud-btn" type="button" title="前进 5 秒" aria-label="前进 5 秒" @click="emit('seek-by', 5000)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
          <span class="score-hud-num">5s</span>
        </button>
      </div>

      <ScoreUtil v-if="floating" mode="settings" compact v-model:speed="speedModel" v-model:program="programModel" />
      <p class="score-hud-time">
        <span>{{ formatTime(position) }}</span>
        <span class="score-hud-sep">/</span>
        <span>{{ formatTime(duration) }}</span>
      </p>
    </div>

    <!-- 面板下边缘的可交互进度条 -->
    <div class="score-hud-track">
      <div class="score-hud-fill" :style="{ width: `${progressPercent}%` }" />
      <input
        class="score-hud-range"
        type="range"
        min="0"
        :max="duration || 1"
        step="10"
        :value="position"
        aria-label="播放进度"
        @input="emit('seek', Number($event.target.value))"
      />
    </div>
  </div>
</template>

<style scoped>
.score-hud-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  gap: 4px;
  flex-shrink: 0;
}

.score-hud-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--c-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.score-hud-btn:hover {
  color: var(--vp-c-brand-1);
  background: var(--c-bg-soft);
}

.score-hud-btn svg {
  width: 18px;
  height: 18px;
}

/* 中间的是主操作，给足强调 */
.score-hud-play {
  color: #fff;
  background: var(--vp-c-brand-1);
}

.score-hud-play:hover {
  color: #fff;
  background: var(--vp-c-brand-1);
  filter: brightness(1.1);
}

/* 前进/后退图标角上的 “5” */
.score-hud-num {
  position: absolute;
  right: 2px;
  bottom: 0;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.score-hud-time {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin: 0;
  order: 2;
  flex-shrink: 0;
  white-space: nowrap;
  color: var(--c-text-primary);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.score-hud-sep {
  color: var(--c-text-muted);
}

/* 面板下边缘的进度条 */
.score-hud-track {
  position: relative;
  height: 6px;
  margin: 0;
  flex: 1 1 120px;
  min-width: 60px;
  border-radius: 3px;
  background: var(--c-border-light);
}

.score-hud-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 3px;
  background: var(--vp-c-brand-1);
  pointer-events: none;
}

.score-hud-range {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 18px;
  margin: 0;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

/* 原生轨道必须也透明，否则会盖住下面的填充层 */
.score-hud-range::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: transparent;
  border: 0;
}

.score-hud-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -3px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  border: 2px solid var(--c-bg-card);
}

.score-hud-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-brand-1);
  border: 2px solid var(--c-bg-card);
}

.score-hud-range::-moz-range-track {
  height: 6px;
  background: transparent;
}


.score-transport {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex: 1 1 280px;
  min-width: 0;
}
.score-transport-row { display: contents; }
.is-floating { flex-direction: column; gap: 0; }
.is-floating .score-transport-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px 10px; }
.is-floating .score-hud-btn { width: 30px; height: 30px; }
.is-floating .score-hud-time { order: initial; margin-left: auto; font-size: 0.75rem; gap: 2px; }
.is-floating .score-hud-track { flex: none; align-self: stretch; margin: 0 10px 9px; }
@media (max-width: 380px) {
  .is-floating .score-transport-row { gap: 4px; padding-inline: 6px; }
  .is-floating .score-hud-buttons { gap: 2px; }
  .is-floating .score-hud-btn { width: 26px; }
}

@media (max-width: 640px) {
  .score-transport:not(.is-floating) { flex-wrap: wrap; }
}

.score-settings { display: flex; align-items: center; gap: var(--spacing-sm); }
.score-field { display: flex; align-items: center; gap: 4px; color: var(--c-text-secondary); font-size: 0.75rem; white-space: nowrap; }
.score-select { position: relative; display: inline-flex; }
.score-select select {
  appearance: none;
  padding: 2px 22px 2px 4px;
  color: var(--c-text-primary);
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-sm);
}
.score-select svg { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.5; pointer-events: none; }
.is-compact { gap: 4px; }
.is-compact select { height: 30px; }
</style>
