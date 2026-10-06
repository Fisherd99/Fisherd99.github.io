<script setup>
import { computed } from 'vue'
import { INSTRUMENTS } from './alphatab.mjs'
const props = defineProps({ speed: Number, program: Number, compact: Boolean })
const emit = defineEmits(['update:speed', 'update:program'])
const speedModel = computed({ get: () => props.speed, set: value => emit('update:speed', value) })
const programModel = computed({ get: () => props.program, set: value => emit('update:program', value) })
const speeds = [0.5, 0.75, 1, 1.25, 1.5]
</script>

<template>
  <div class="score-settings" :class="{ 'is-compact': compact }">
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
</template>

<style scoped>
.score-settings { display: flex; align-items: center; gap: var(--spacing-sm); }
.score-field { display: flex; align-items: center; gap: 4px; color: var(--c-text-secondary); font-size: 0.75rem; white-space: nowrap; }
.score-select { position: relative; display: inline-flex; }
select {
  appearance: none;
  padding: 2px 22px 2px 4px;
  color: var(--c-text-primary);
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-sm);
}
svg { position: absolute; right: 5px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.5; pointer-events: none; }
.is-compact { gap: 4px; }
.is-compact select { height: 30px; }
</style>
