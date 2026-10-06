<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createJianpuPrint } from './jianpu-print.mjs'

const props = defineProps({ layout: Object, activeIndex: Number, canSeek: Boolean, sourceUrl: String })
const emit = defineEmits(['seek'])
const root = ref(null)
let printFrame

async function printJianpu() {
  await document.fonts?.ready
  measureTies()
  await nextTick()
  const wrapper = createJianpuPrint(root.value)
  printFrame?.remove()
  // 在独立文档中打印，不受浏览器弹窗拦截影响，也不带入文章与播放器。
  printFrame = document.createElement('iframe')
  printFrame.title = '简谱打印视图'
  printFrame.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:700px;border:0'
  document.body.append(printFrame)
  const popup = printFrame.contentWindow
  popup.document.title = `${props.layout.title || '简谱'} - 简谱`
  popup.document.body.style.cssText = 'margin:20px;background:#fff;color:#000'
  popup.document.body.append(popup.document.importNode(wrapper, true))
  const style = popup.document.createElement('style')
  style.textContent = '@page { margin: 12mm; } @media print { body { margin: 0 !important; } }'
  popup.document.head.append(style)
  popup.document.fonts.ready.then(() => {
    popup.requestAnimationFrame(() => popup.requestAnimationFrame(() => popup.print()))
  })
}

// 制表位之间的音符作为一个排版单元；连续制表仍保留各自的推进距离。
const sections = computed(() => (props.layout?.sections ?? []).map(section => ({
  ...section,
  phrases: section.phrases.map(phrase => {
    const groups = []
    let tabs = ''
    for (const note of phrase.notes) {
      if (note.kind === 'tab') tabs += '\t'
      else {
        if (!groups.length || tabs) {
          groups.push({ tabs, notes: [] })
          tabs = ''
        }
        groups.at(-1).notes.push(note)
      }
    }
    return { ...phrase, groups }
  })
})))

/** 是不是全曲最后一句 —— 只有那里画终止线。 */
const isFinalPhrase = (sectionIndex, phraseIndex) => {
  const sections = props.layout?.sections ?? []
  if (sectionIndex !== sections.length - 1) return false
  return phraseIndex === (sections[sectionIndex]?.phrases?.length ?? 0) - 1
}
const ties = ref([])
const endings = ref([])
let observer
let frame
let disposed = false

// 使用实际排版后的数字位置，弧线才能跨越小节线、增时线和响应式换行。
function measureTies() {
  if (!root.value) return
  const origin = root.value.getBoundingClientRect()
  const rows = []
  const items = Array.from(root.value.querySelectorAll('.jianpu-group > span'), element => {
    const box = element.getBoundingClientRect()
    const stack = element.querySelector('.jianpu-stack')?.getBoundingClientRect()
    const phrase = element.closest('.jianpu-notes')
    const center = box.top + box.height / 2
    let row = rows.find(row => row.phrase === phrase && Math.abs(row.center - center) < 2)
    if (!row) {
      row = { phrase, center, left: box.left - origin.left, right: box.right - origin.left,
        y: Infinity, top: box.top - origin.top }
      rows.push(row)
    }
    row.right = Math.max(row.right, box.right - origin.left)
    if (stack) row.y = Math.min(row.y, stack.top - origin.top - 3)
    return { element, row, left: box.left - origin.left, right: box.right - origin.left,
      x: stack ? stack.left + stack.width / 2 - origin.left : 0 }
  })
  for (const row of rows) if (!Number.isFinite(row.y)) row.y = row.top - 3
  const notes = items.filter(item => item.element.classList.contains('jianpu-note'))
  const paths = []
  const arc = (from, to, y) => {
    const width = to - from
    if (width <= 0) return
    const height = Math.min(10, width / 3)
    paths.push(`M ${from} ${y} C ${from + width / 3} ${y - height}, ${to - width / 3} ${y - height}, ${to} ${y}`)
  }
  const spanArc = (from, to) => {
    if (from.row === to.row) arc(from.x, to.x, from.row.y)
    else {
      const coveredRows = rows.slice(rows.indexOf(from.row), rows.indexOf(to.row) + 1)
      for (const row of coveredRows) {
        arc(row === from.row ? from.x : Math.max(0, row.left - 3),
          row === to.row ? to.x : row.right + 3, row.y)
      }
    }
  }
  for (let i = 0; i < notes.length - 1; i++) {
    const from = notes[i]
    const to = notes[i + 1]
    if (from.element.dataset.tieStart === 'true' && to.element.dataset.tieStop === 'true') spanArc(from, to)
    // 连续 ^ 画为一条覆盖整组音符的圆滑线，而非每两个音之间的碎弧线。
    if (from.element.dataset.slurStart !== 'true' || from.element.dataset.slurStop === 'true') continue
    let end = i
    while (end < notes.length - 1 && notes[end].element.dataset.slurStart === 'true'
      && notes[end + 1].element.dataset.slurStop === 'true') end++
    if (end > i) spanArc(from, notes[end])
  }
  ties.value = paths

  const groups = new Map()
  for (const item of items) {
    const id = item.element.dataset.endingId
    if (!id) continue
    if (!groups.has(id)) groups.set(id, [])
    groups.get(id).push(item)
  }
  const brackets = []
  for (const group of groups.values()) {
    const first = group[0]
    const last = group.at(-1)
    const segments = new Map()
    for (const item of group) {
      if (!segments.has(item.row)) segments.set(item.row, { left: item.left, right: item.right })
      segments.get(item.row).right = item.right
    }
    for (const [row, segment] of segments) {
      const y = row.y - 17
      const start = row === first.row
      const closed = row === last.row && last.element.classList.contains('jianpu-repeat-end')
      brackets.push({
        path: start ? `M ${segment.left} ${y + 10} V ${y} H ${segment.right}${closed ? ` V ${y + 10}` : ''}`
          : `M ${segment.left} ${y} H ${segment.right}${closed ? ` V ${y + 10}` : ''}`,
        label: start ? `${first.element.dataset.endingNumber}.` : '', x: segment.left + 3, y: y + 12
      })
    }
  }
  endings.value = brackets
}

function scheduleTies() {
  if (disposed) return
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measureTies)
}

watch(() => props.layout, async () => {
  await nextTick()
  if (disposed) return
  observer?.disconnect()
  if (root.value) observer?.observe(root.value)
  scheduleTies()
}, { flush: 'post' })

onMounted(() => {
  observer = new ResizeObserver(scheduleTies)
  if (root.value) observer.observe(root.value)
  scheduleTies()
  document.fonts?.ready.then(scheduleTies)
})

onBeforeUnmount(() => {
  printFrame?.remove()
  disposed = true
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div v-if="layout" ref="root" class="jianpu">
    <svg class="jianpu-ties" aria-hidden="true">
      <path v-for="(path, i) in ties" :key="i" :d="path" />
      <g v-for="(ending, i) in endings" :key="`ending-${i}`" class="jianpu-ending-bracket">
        <path :d="ending.path" />
        <text v-if="ending.label" :x="ending.x" :y="ending.y">{{ ending.label }}</text>
      </g>
    </svg>
    <!-- 简谱规范的开头标注。1=C 是本记谱法的基准（本谱用绝对音高记法，不随调号移动），
         与谱面的 4 个升号（E 大调）无关。 -->
    <p class="jianpu-meta">
      <span>1 = C5</span>
      <span v-if="layout.time">{{ layout.time }}</span>
      <span v-if="layout.tempo">♩ = {{ layout.tempo }}</span>
      <span class="jianpu-actions">
        <a :href="sourceUrl" target="_blank" rel="noopener noreferrer">下载简谱</a>
        <button type="button" @click="printJianpu">打印/另存为 PDF</button>
      </span>
    </p>
    <div v-for="(section, si) in sections" :key="si" class="jianpu-section">
      <p v-if="section.name" class="jianpu-section-name">{{ section.name }}</p>
      <div class="jianpu-notes">
        <template v-for="(phrase, pi) in section.phrases" :key="pi">
          <br v-if="pi > 0 && !phrase.lyric">
          <span v-if="phrase.lyric" class="jianpu-lyric">{{ phrase.lyric }}</span>
          <!-- 反复记号与音符同在一个序列里，按它在一行中的实际位置渲染，
               因此可以出现在行中间 —— 换行因而纯粹表示乐句分隔。 -->
          <template v-for="(group, gi) in phrase.groups" :key="gi">
            <span v-if="group.tabs" class="jianpu-tab" aria-hidden="true">{{ group.tabs }}</span>
            <span class="jianpu-group">
          <template v-for="(note, ni) in group.notes" :key="ni">
            <span v-if="note.kind === 'repeatStart'" :data-ending-id="note.endingId" class="jianpu-repeat" title="反复开始">‖:</span>
            <span v-else-if="note.kind === 'repeatEnd'" :data-ending-id="note.endingId" class="jianpu-repeat jianpu-repeat-end" title="反复结束">
              :‖<em class="jianpu-repeat-times">×{{ note.times }}</em>
            </span>
            <span v-else-if="note.kind === 'bar'" :data-ending-id="note.endingId" class="jianpu-bar"
              :class="{ 'jianpu-final': isFinalPhrase(si, pi) && gi === phrase.groups.length - 1 && ni === group.notes.length - 1 }"
              :title="isFinalPhrase(si, pi) && gi === phrase.groups.length - 1 && ni === group.notes.length - 1 ? '终止线' : '小节线'"
            >{{ isFinalPhrase(si, pi) && gi === phrase.groups.length - 1 && ni === group.notes.length - 1 ? '' : '|' }}</span>
            <span v-else-if="note.kind === 'breath'" :data-ending-id="note.endingId" class="jianpu-breath" title="换气">v</span>
            <span v-else-if="note.kind === 'endingStart'" class="jianpu-ending" :data-ending-id="note.endingId"
              :data-ending-number="note.number" :title="`第 ${note.number} 结尾`" :aria-label="`第 ${note.number} 结尾`" />
            <span
              v-else
              class="jianpu-note"
              :class="{
                'is-active': note.index === activeIndex,
                'is-rest': note.rest,
                'has-accidental': note.sharp || note.flat,
                'is-clickable': canSeek
              }"
              :data-note-index="note.index"
              :data-ending-id="note.endingId"
              :data-tie-start="note.tieStart"
              :data-tie-stop="note.tieStop"
              :data-slur-start="note.slurStart"
              :data-slur-stop="note.slurStop"
              :title="canSeek ? '点击跳到此音' : null"
              @click="canSeek && emit('seek', note.index)"
            >
              <!-- 八度点的两格必须常驻（无点时渲染空串），否则网格只剩一格，
                   数字会掉进第一行而不是中间行，整行数字就都偏高了。 -->
              <span
                class="jianpu-stack"
                :style="note.underlines ? { '--u': note.underlines } : null"
              >
                <span class="jianpu-oct jianpu-oct-high"><i v-for="dot in Math.max(0, note.octave || 0)" :key="dot" /></span>
                <span
                  class="jianpu-num"
                ><em v-if="note.sharp" aria-label="升号">♯</em><em v-else-if="note.flat" aria-label="降号">♭</em>{{ note.rest ? '0' : note.degree }}</span>
                <span class="jianpu-oct jianpu-oct-low"><i v-for="dot in Math.max(0, -(note.octave || 0))" :key="dot" /></span>
              </span>
              <span v-if="note.dotted" class="jianpu-dot">·</span>
              <span v-for="d in note.dashes" :key="d" class="jianpu-dash" />
            </span>
          </template>
          <!-- 终止线：全曲结束用细线+粗线的双纵线 -->
          <span
            v-if="isFinalPhrase(si, pi) && gi === phrase.groups.length - 1 && !['bar', 'repeatEnd'].includes(group.notes.at(-1)?.kind)"
            class="jianpu-bar jianpu-final"
            title="终止线"
          />
            </span>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 简谱视图 ────────────────────────────────────────────── */
.jianpu {
  position: relative;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--c-border-light);
}

.jianpu .jianpu-section-name {
  margin: 0 0 2px;
  color: var(--c-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  line-height: 1.1;
}

.jianpu-section + .jianpu-section { margin-top: 8px; }

.jianpu-tab { white-space: pre-wrap; tab-size: 4em; }

.jianpu-group {
  display: inline-block;
  width: max-content;
  max-width: 100%;
  vertical-align: middle;
  /* 只有单个乐句比整行还宽时才允许句内折行，避免窄屏溢出。 */
  white-space: normal;
}

.jianpu-lyric {
  display: block;
  line-height: 1.4;
  margin: 0 0 3px;
  color: var(--c-text-secondary);
  font-size: 0.8125rem;
}

.jianpu-notes {
  /* 行内排版使用浏览器原生制表位，制表距离相对于当前行起点。 */
  display: block;
  padding-top: 4px;
  margin: 0;
  font-size: 1.05rem;
  line-height: 4.45;
}

.jianpu-group > span {
  vertical-align: middle;
  margin-right: var(--spacing-sm);
  line-height: 1.1;
}

.jianpu-note {
  position: relative; /* 连音线绝对定位的参照 */
  display: inline-flex;
  align-items: center;
  gap: 1px;
  /* 顶部多留一点空间，连音线弧线才不会被上一行压住 */
  padding: 6px 3px 2px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.jianpu-note.is-active {
  color: var(--vp-c-brand-1);
  background: rgba(126, 34, 206, 0.16);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}

.jianpu-note.is-rest {
  color: var(--c-text-muted);
}

.jianpu-note.has-accidental { padding-left: 0.65em; }

/* 点数字跳转：可点的才给手型和悬停反馈 */
.jianpu-note.is-clickable {
  cursor: pointer;
}

.jianpu-note.is-clickable:hover {
  background: rgba(126, 34, 206, 0.14);
}

/* 当前音若同时可点，保留高亮背景，只把悬停加深一点 */
.jianpu-note.is-clickable.is-active:hover {
  background: rgba(126, 34, 206, 0.26);
}

/* 数字的盒子高度固定：三行网格常驻，八度点有没有都占位。
   否则带点/不带点的数字会高低不齐，整行看起来歪歪扭扭。 */
.jianpu-stack {
  position: relative;
  display: grid;
  /* 数字基线固定，底部预留减时线和竖排低八度点的空间。 */
  grid-template-rows: 0.75em 1.05em 1.35em;
  justify-items: center;
  align-items: center;
}

.jianpu-oct {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  align-self: start;
}

.jianpu-oct i { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
.jianpu-oct-high { align-self: end; margin-bottom: 2px; }
.jianpu-oct-low { margin-top: calc(var(--u, 0) * 3px + 4px); }

.jianpu-num {
  position: relative;
  line-height: 1;
}

/* 减时线紧贴数字下方，低八度点在全部减时线下方。 */
.jianpu-num::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  height: calc(var(--u, 0) * 3px);
  background-image: repeating-linear-gradient(to top, currentColor 0 1px, transparent 1px 3px);
}

.jianpu-num em {
  font-style: normal;
  font-family: 'Segoe UI Symbol', 'Noto Music', serif;
  font-size: 0.9em;
  line-height: 1;
  position: absolute;
  right: calc(100% + 1px);
  top: 50%;
  transform: translateY(-50%);
}

/* 增时线画成居中的横线。用全角连字符的话字形偏下，看起来像下划线 */
.jianpu-dash {
  display: inline-block;
  width: 0.85em;
  height: 1.5px;
  margin-left: 2px;
  border-radius: 1px;
  background: currentColor;
  /* 八度占位上下分别为 0.75em / 1.35em，数字中心比整格中心高 0.3em。 */
  transform: translateY(-0.3em);
}

.jianpu-dot {
  margin-left: 1px;
}

/* SVG 覆盖层不参与布局，也不阻挡音符点击。 */
.jianpu-ties {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.jianpu-ties path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
  stroke-linecap: round;
}

.jianpu-ending {
  display: inline-block;
  width: 1em;
  height: 2.55em;
  flex-shrink: 0;
}

.jianpu-ending-bracket text { fill: currentColor; font-size: 12px; }

.jianpu-repeat {
  /* 与 .jianpu-stack 同高（0.75 + 1.05 + 0.75），文字才能和数字落在同一条中心线上。
     只给一行文字的高度的话，flex 居中的是各自的盒子中心，不是文字中心。 */
  display: inline-flex;
  align-items: center;
  height: 2.55em;
  line-height: 1;
  color: inherit; /* 与数字同色：深色下白、浅色下黑 */
  font-weight: 700;
  letter-spacing: -1px;
  user-select: none;
}

.jianpu-repeat-times {
  margin-left: 2px;
  font-size: 0.75em;
  font-style: normal;
  letter-spacing: 0;
}

/* 小节线：画出来才能看出「换行 ≠ 换小节」。
   刻意比数字淡一些 —— `|` 和数字 `1` 太像，同等强调会看混。 */
/* 开头标注：1=C / 拍号 / 速度 */
.jianpu-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-md, 1rem);
  margin: 0 0 var(--spacing-md, 1rem);
  padding-bottom: var(--spacing-sm, 0.5rem);
  border-bottom: 1px solid var(--c-border-light);
  color: var(--c-text-secondary);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.jianpu-actions { display: inline-flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
.jianpu-actions button, .jianpu-actions a {
  text-decoration: none;
  font-weight: inherit;
  padding: 4px 8px;
  background: transparent;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border-light);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  cursor: pointer;
}
.jianpu-actions button:hover, .jianpu-actions a:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
@media print { .jianpu-actions { display: none !important; } }

/* 终止线：左细右粗，示意全曲结束 */
.jianpu-final {
  position: relative;
  width: 7px;
  flex-shrink: 0;
}

.jianpu-final::before, .jianpu-final::after {
  content: '';
  position: absolute;
  top: 0.75em;
  height: 1.3em;
  background: currentColor;
}
.jianpu-final::before { left: 0; width: 1px; }
.jianpu-final::after { right: 0; width: 3px; }

/* 换气记号：与数字同高、比数字淡，避免和音符混淆 */
.jianpu-breath {
  display: inline-flex;
  align-items: center;
  height: 2.55em;
  color: var(--c-text-muted);
  font-size: 0.8em;
  font-style: italic;
  font-weight: 700;
  user-select: none;
}

.jianpu-bar {
  display: inline-flex;
  align-items: center;
  height: 2.55em; /* 与 .jianpu-stack 同高，才和数字同中心线 */
  color: var(--c-text-muted);
  font-weight: 300;
  user-select: none;
}

</style>
