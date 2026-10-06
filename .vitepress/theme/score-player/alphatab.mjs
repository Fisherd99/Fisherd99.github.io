// alphaTab 1.8.4 的默认处理器在 Continuous → Off 时可能残留。
// 用公开扩展点阻止强制滚动（包括暂停时的 scrollToCursor），不修改库的私有状态。
const disabledScrollHandler = {
  forceScrollTo() {},
  onBeatCursorUpdating() {},
  [Symbol.dispose]() {}
}

// 在 UI 事件边界清理第三方脚本留下的无效 jQuery，避免截断后续播放器通知。
export function guardScoreUiEvents(instance, cleanBrokenJQuery) {
  const triggerEvent = instance.uiFacade.triggerEvent.bind(instance.uiFacade)
  instance.uiFacade.triggerEvent = (...args) => {
    cleanBrokenJQuery()
    triggerEvent(...args)
  }
}

export function configureScoreScroll(instance, module, enabled, viewportHeight) {
  const player = instance.settings.player
  // 使用 alphaTab 自己的动画，关闭跟随时才能通过 stopScrolling 立即取消。
  player.nativeBrowserSmoothScroll = false
  instance.customScrollHandler = enabled ? undefined : disabledScrollHandler
  if (!enabled) {
    const scroll = instance.uiFacade.getScrollContainer()
    instance.uiFacade.stopScrolling(scroll)
  }
  player.scrollMode = enabled ? module.ScrollMode.Continuous : module.ScrollMode.Off
  player.scrollOffsetY = enabled ? -Math.round(viewportHeight * 0.5) : 0
  instance.updateSettings()
}

// 统一乐器选择覆盖轨道默认音色及谱中音色自动化。
// alphaTab 导入时会在首拍自动创建 Instrument automation；只改轨道默认值
// 会生成「新音色 → 首拍旧音色」两条指令，播放时立刻切回原乐器。
export function applyScoreInstrument(track, gmProgram, module) {
  const program = gmProgram - 1 // UI / MusicXML 使用 1-based，alphaTab 使用 0-based。
  track.playbackInfo.program = program
  track.playbackInfo.bank = 0
  for (const staff of track.staves) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          for (const automation of beat.automations) {
            if (automation.type === module.model.AutomationType.Instrument) {
              automation.value = program
            }
          }
        }
      }
    }
  }
}

export function changeScoreInstrument(instance, gmProgram, module, playback) {
  const position = playback?.position ?? instance.timePosition
  const playing = playback?.playing ?? (instance.playerState === module.synth.PlayerState.Playing)
  applyScoreInstrument(instance.score.tracks[0], gmProgram, module)
  // 合成器 Worker 顺序处理 load → seek → play；seek 在加载后的归零之后执行。
  // 时间来自展开后的播放时间轴，保留反复位置且避免 tick/ms 反复换算舍入。
  instance.loadMidiForScore()
  instance.timePosition = position
  if (playing) instance.play()
}

/** 写谱音序与含反复的播放时间轴之间的索引。 */
export function createScoreIndex(instance) {
  const lookup = instance.tickCache
  const trackSet = new Set([0])
  const beatIndices = new Map()
  const ticksByIndex = []
  const beatTicks = new Map()
  const bars = instance.score?.tracks[0]?.staves[0]?.bars ?? []
  for (const bar of bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) beatIndices.set(beat, beatIndices.size)
    }
  }
  for (const bar of lookup?.masterBars ?? []) {
    for (let beat = bar.firstBeat; beat; beat = beat.nextBeat) {
      for (const item of beat.highlightedBeats ?? []) {
        if (item.beat && !beatTicks.has(item.beat)) beatTicks.set(item.beat, bar.start + beat.start)
      }
    }
  }
  for (const [beat, index] of beatIndices) ticksByIndex[index] = beatTicks.get(beat)
  return {
    count: beatIndices.size,
    valid: beatIndices.size > 0 && ticksByIndex.every(tick => tick !== undefined),
    indexAt(tick) {
      const beat = lookup?.findBeat(trackSet, tick)?.beat
      return beatIndices.get(beat) ?? -1
    },
    tickAt(index) { return ticksByIndex[index] }
  }
}

export function indexScoreLayout(data) {
  let count = 0
  for (const section of data.sections ?? []) {
    for (const phrase of section.phrases ?? []) {
      for (const note of phrase.notes ?? []) {
        if (note.kind === 'note') note.index = count++
      }
    }
  }
  return count
}

export function applyThemeColors(module, settings, dark) {
  const { Color } = module.model
  const resources = settings.display.resources
  resources.mainGlyphColor = Color.fromJson(dark ? '#f1f5f9' : '#0f172a')
  resources.secondaryGlyphColor = Color.fromJson(dark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)')
  resources.staffLineColor = Color.fromJson(dark ? '#64748b' : '#94a3b8')
  resources.barSeparatorColor = Color.fromJson(dark ? '#64748b' : '#94a3b8')
  resources.barNumberColor = Color.fromJson(dark ? '#94a3b8' : '#64748b')
  resources.scoreInfoColor = Color.fromJson(dark ? '#94a3b8' : '#64748b')
}


// General MIDI 音色编号表（1–128）：https://www.cs.cmu.edu/~music/cmp/archives/cmsip/readings/GMSpecs_Patches.htm
// 音色来源：https://github.com/musescore/MuseScore/blob/main/share/sound/MS%20Basic.sf3
// 钢琴和口琴使用 alphaTab 自带 Sonivox 的独立预设，避免覆盖其他音色。
// 本表 program 从 1 开始；传给 alphaTab/MIDI 时减 1，转换为 0–127。
export const INSTRUMENTS = [
  { program: 23, name: '口琴' },
  { program: 25, name: '吉他(尼龙弦)' },
  { program: 26, name: '吉他(钢弦)' },
  { program: 29, name: '吉他(闷音)' },
  { program: 30, name: '吉他(过载)' },
  { program: 80, name: '陶笛' },
  { program: 74, name: '长笛' },
  { program: 73, name: '短笛' },
  { program: 11, name: '八音盒' },
  { program: 41, name: '小提琴' },
  { program: 1, name: '钢琴' }
].map(instrument => {
  const sonivox = [1, 23].includes(instrument.program)
  const source = sonivox ? 'sonivox' : 'ms-basic'
  const extension = sonivox ? 'sf2' : 'sf3'
  return { ...instrument, soundFont: `/alphatab/soundfont/${source}-${instrument.program}.${extension}` }
})

export const formatTime = (ms) => {
  const total = Math.max(0, Math.round((ms || 0) / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}


export function createScoreSettings(module, props, dark) {
  const settings = new module.Settings()
  settings.core.engine = 'svg'
  // alphaTab 用 new alphaTabUrl('./alphaTab.worker.mjs', import.meta.url) 构造 worker，
  // 这种包装 Vite 无法静态解析、打包后必然 404。单声部口琴谱的渲染量可忽略，
  // 直接关掉 worker 在主线程渲染。
  settings.core.useWorkers = false
  settings.core.fontDirectory = props.fontDirectory
  applyThemeColors(module, settings, dark)
  settings.player.playerMode = module.PlayerMode.EnabledSynthesizer
  settings.player.soundFont = '' // Downloads and installation belong to soundfonts.mjs.
  settings.player.enableCursor = true
  settings.player.enableAnimatedBeatCursor = true
  // 文档页里整页自动滚动很难受，默认关闭，交给"跟随滚动"开关。
  settings.player.scrollMode = module.ScrollMode.Off
  settings.player.nativeBrowserSmoothScroll = false

  return settings
}
