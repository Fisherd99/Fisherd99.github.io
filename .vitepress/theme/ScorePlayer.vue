<script setup>
import { useScorePlayer } from './score-player/useScorePlayer.js'
import { INSTRUMENTS } from './score-player/alphatab.mjs'
import ScoreUtil from './score-player/ScoreUtil.vue'
import JianpuView from './score-player/JianpuView.vue'
import { rawScoreUrl } from '../site-meta.js'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  // 简谱布局 JSON，由同一份源文件生成（音符顺序与 MusicXML 一一对应）。
  // 默认按 src 同名的 .json 推导。
  layout: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: '乐谱'
  },
  soundFont: {
    type: String,
    default: INSTRUMENTS[0].soundFont
  },
  fontDirectory: {
    type: String,
    default: '/alphatab/font/'
  }
})
const {
  container, toolbar, playerInView, loaded, statusText, canRetrySoundFont, retrySoundFont,
  isPlaying, position, duration, speed, program, volume, followScroll,
  layout, activeIndex, highlightOk, togglePlay, seekBy, seekToNote, onSeek, onPrint
} = useScorePlayer(props)
</script>

<template>
  <div class="score-player">
    <div class="score-header">
      <span class="score-title">{{ title }}</span>
      <div class="score-header-right">
        <ScoreUtil mode="settings" v-model:speed="speed" v-model:program="program" />

        <a class="score-action" :href="src" download>下载 MusicXML</a>
        <button class="score-action" type="button" :disabled="!loaded" @click="onPrint">
          打印/另存为 PDF
        </button>
      </div>
    </div>

    <div v-if="loaded" ref="toolbar" class="score-toolbar">
      <ScoreUtil
        :is-playing="isPlaying" :position="position" :duration="duration"
        @toggle="togglePlay" @seek-by="seekBy" @seek="onSeek"
      />

      <label class="score-field">
        音量
        <input v-model.number="volume" type="range" min="0" max="1" step="0.05" aria-label="音量" />
      </label>

      <label class="score-field score-field-check">
        <input v-model="followScroll" type="checkbox" />
        跟随滚动
      </label>
    </div>

    <div ref="container" class="score-surface" />

    <JianpuView
      v-if="layout" :layout="layout" :active-index="activeIndex" :source-url="rawScoreUrl(src)"
      :can-seek="loaded && highlightOk" @seek="seekToNote"
    />

    <p v-if="statusText" class="score-status">{{ statusText }}</p>
    <button v-if="canRetrySoundFont" class="score-action" type="button" @click="retrySoundFont">重新加载音源</button>
  </div>

  <!-- 悬浮控制面板：播放器滚出视野后才出现，这样它不挡内容、又随时能控制。
       Teleport 到 body，避免被祖先元素的 transform 影响 fixed 定位。 -->
  <Teleport to="body">
    <div v-if="loaded && !playerInView" class="score-hud">
      <ScoreUtil
        floating v-model:speed="speed" v-model:program="program" :is-playing="isPlaying" :position="position" :duration="duration"
        @toggle="togglePlay" @seek-by="seekBy" @seek="onSeek"
      />
    </div>
  </Teleport>
</template>

<style scoped>

.score-player {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-md);
}

.score-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.score-title {
  font-weight: 600;
  color: var(--c-text-primary);
}

.score-actions {
  display: flex;
  gap: var(--spacing-xs);
}

/* 标题行右侧：速度 / 音色 / 下载 / 打印 排成一行 */
.score-header-right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.score-action {
  padding: 4px var(--spacing-sm);
  color: var(--c-text-secondary);
  font-size: 0.8125rem;
  background: transparent;
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition-fast);
}

.score-action:hover:not(:disabled) {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  text-decoration: none;
}

.score-action:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.score-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-top: 1px solid var(--c-border-light);
}

.score-field {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--c-text-secondary);
  font-size: 0.75rem;
  white-space: nowrap;
}

.score-field-check {
  cursor: pointer;
}

.score-surface {
  min-height: 96px;
  /* alphaTab 排版后的宽度可能比容器略宽，溢出会在底部生出一条横向滚动条。
     这里直接裁掉：谱面本身由 alphaTab 按容器宽度排版，不需要横向滚动。 */
  overflow-x: hidden;
}

/* alphaTab 只负责给光标定位，颜色必须由宿主页面提供，否则光标是全透明的。
   下面这组是 alphaTab 官方文档的默认配色。 */
.score-surface :deep(.at-cursor-bar) {
  background: rgba(255, 217, 0, 0.25);
}

.score-surface :deep(.at-cursor-beat) {
  background: rgba(64, 64, 255, 0.75);
}

.score-surface :deep(.at-selection div) {
  background: rgba(64, 64, 255, 0.1);
}

.score-status {
  margin: var(--spacing-sm) 0 0;
  color: var(--c-text-muted);
  font-size: 0.8125rem;
  text-align: center;
}

@media (max-width: 640px) {
  .score-toolbar {
    gap: var(--spacing-xs);
  }
}

/* ── 悬浮控制面板 ────────────────────────────────────────── */
.score-hud {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 40;
  width: max-content;
  max-width: calc(100vw - 40px);
  background: var(--c-bg-card);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg, 0 10px 24px rgb(0 0 0 / 0.22));
  overflow: hidden;
}

@media (max-width: 640px) {
  .score-hud {
    right: 12px;
    bottom: 12px;
    max-width: calc(100vw - 24px);
  }
}

@media print {
  .score-hud {
    display: none !important;
  }
}
</style>
