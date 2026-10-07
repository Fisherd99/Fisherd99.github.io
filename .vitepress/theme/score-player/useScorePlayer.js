import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { withBase } from 'vitepress'
import { createSoundFontLoader } from './soundfonts.mjs'
import {
  INSTRUMENTS, applyThemeColors, configureScoreScroll, applyScoreInstrument,
  changeScoreInstrument, createScoreIndex, indexScoreLayout, createScoreSettings, guardScoreUiEvents
} from './alphatab.mjs'

export function useScorePlayer(props) {
  // alphaTab 按可见性动态导入；实例用 shallowRef，避免代理库的庞大对象图。
  const api = shallowRef(null)
  let alphaTab = null

  const toolbar = ref(null)
  const container = ref(null)
  const shouldLoad = ref(false)
  // 播放器整体是否在视野内 —— 决定悬浮按钮要不要出现
  const playerInView = ref(true)
  const loaded = ref(false)
  const renderError = ref('')
  const soundFontState = ref('idle')
  const isPlaying = ref(false)
  const position = ref(0)
  const duration = ref(0)
  const speed = ref(1)
  // GM 音色号（1-based，和 MusicXML 一致）；按需加载 MS Basic，钢琴和口琴使用 Sonivox。
  const program = ref(INSTRUMENTS[0].program)
  const volume = ref(1)
  const followScroll = ref(false)
  // 简谱：布局模型 + 当前播放到的第几个音（与 MusicXML 的音序一一对应）
  const layout = ref(null)
  const activeIndex = ref(-1)
  const highlightOk = ref(false)

  const layoutUrl = computed(() => props.layout || props.src.replace(/\.musicxml$/, '.json'))

  let observer
  let themeObserver
  let viewObserver
  let jqTimer
  let disposed = false
  const layoutAbort = new AbortController()
  const playbackAbort = new AbortController()
  let soundFonts
  let instrumentRequest = 0
  let instrumentPlayback = null
  let instrumentChanges = Promise.resolve()
  const instrumentError = ref('')
  const extraFontLoading = ref(false)
  const canRetrySoundFont = computed(() => !extraFontLoading.value && soundFontState.value !== 'loading'
    && (soundFontState.value === 'failed' || Boolean(instrumentError.value)))

  const statusText = computed(() => {
    if (renderError.value) return renderError.value
    if (instrumentError.value) return instrumentError.value
    if (!shouldLoad.value) return '滚动到此处时加载乐谱'
    if (!loaded.value) return '正在加载乐谱…'
    if (soundFontState.value === 'loading' || extraFontLoading.value) return '音色加载中…'
    if (soundFontState.value === 'failed') return '音色加载失败：谱面可看，但播放无声'
    return ''
  })

  // 包一层：alphaTab 在构造函数里就会创建音频输出设备，一旦那儿抛异常，
  // Promise 会静默 reject、状态永远停在"正在加载乐谱…"，很难查。显式捕获并报出来。
  async function init() {
    try {
      await createPlayer()
    } catch (error) {
      if (disposed) return
      api.value?.destroy()
      api.value = null
      renderError.value = `乐谱播放器初始化失败：${error?.message ?? error}`
      console.error('[ScorePlayer] 初始化失败', error?.stack ?? error)
    }
  }

  const isDarkMode = () => document.documentElement.classList.contains('dark')

  // MapMyVisitors 的 noConflict 可能留下 undefined jQuery；alphaTab 只检查键是否存在。
  // 在模块导入和 UI 事件边界清理；定时清理覆盖模块求值前的异步加载间隙。
  const cleanBrokenJQuery = () => {
    if ('jQuery' in window && typeof window.jQuery !== 'function') {
      try {
        delete window.jQuery
      } catch {
        /* 属性不可删除时只能放弃，不该因此影响播放器 */
      }
    }
  }

  /** 加载简谱布局，并给每个音编上全局序号（供高亮定位）。 */
  async function loadLayout() {
    try {
      const response = await fetch(layoutUrl.value, { signal: layoutAbort.signal })
      if (!response.ok) return
      const data = await response.json()
      layoutCount = indexScoreLayout(data)
      updateHighlightValidity()
      if (!disposed) layout.value = data
    } catch (error) {
      if (disposed) return
      console.warn('[ScorePlayer] 简谱布局加载失败', error)
    }
  }

  // 索引与布局任意一方先到达都重新校验，避免加载顺序影响高亮。
  let scoreIndex = null
  let layoutCount = null
  function updateHighlightValidity() {
    highlightOk.value = Boolean(scoreIndex?.valid && layoutCount === scoreIndex.count)
  }

  async function createPlayer() {
    // 模块求值阶段 alphaTab 也会做同样的 jQuery 判断，先清一次。
    cleanBrokenJQuery()

    const module = await import('@coderline/alphatab')
    if (disposed) return
    alphaTab = module

    const settings = createScoreSettings(module, props, isDarkMode())

    const instance = new module.AlphaTabApi(container.value, settings)
    // 统计脚本可能在定时清理的间隔内留下 undefined jQuery。
    // 在公开 UI 事件边界清理，防止音源加载通知被 jQuery 分发异常截断。
    guardScoreUiEvents(instance, cleanBrokenJQuery)
    api.value = instance
    configureScoreScroll(instance, module, followScroll.value, window.innerHeight)
    instance.playbackSpeed = speed.value
    instance.masterVolume = volume.value
    soundFonts = createSoundFontLoader(instance)

    // alphaTab 的事件并非都在 AlphaTabApi 上（例如 soundFontLoadFailed 只在内部的 AlphaSynth
    // 上有，API 实例上是 undefined）。逐个硬订阅会让一个缺失的事件把整个组件打挂，
    // 所以统一走这个容错订阅。
    const subscribe = (emitter, handler) => {
      if (typeof emitter?.on === 'function') emitter.on(handler)
    }

    subscribe(instance.scoreLoaded, () => {
      // scoreLoaded 在 MIDI 生成前触发，可在这里应用用户选好的音色。
      applyScoreInstrument(instance.score.tracks[0], program.value, module)
      if (INSTRUMENTS.find(item => item.program === program.value)?.soundFont !== props.soundFont) void selectInstrument(program.value)
    })
    // midiLoad 在 tickCache 已生成、MIDI 交给合成器前触发，供谱面高亮建立索引。
    // 切换音色另用 player.midiLoaded 等待合成器确认完成加载。
    subscribe(instance.midiLoad, () => {
      scoreIndex = createScoreIndex(instance)
      updateHighlightValidity()
    })
    subscribe(instance.playerStateChanged, (args) => {
      if (instrumentPlayback) return
      // PlayerState 不在 alphaTab 顶层导出，它在 synth 命名空间下。
      isPlaying.value = args.state === module.synth.PlayerState.Playing
    })
    subscribe(instance.renderFinished, () => {
      loaded.value = true
    })
    subscribe(instance.playerPositionChanged, (args) => {
      if (instrumentPlayback) return
      position.value = args.currentTime
      duration.value = args.endTime
      if (highlightOk.value) activeIndex.value = scoreIndex.indexAt(args.currentTick)
    })
    subscribe(instance.error, (error) => {
      // alphaTab emits its generic error before soundFontLoadFailed. Defer until
      // the loader identifies that exact error; unrelated score errors remain visible.
      queueMicrotask(() => {
        if (disposed || soundFonts?.isLoadError(error)) return
        renderError.value = `乐谱加载失败：${error?.message ?? error}`
        console.error('[ScorePlayer] 渲染出错', error)
      })
    })

    instance.load(props.src)
    void loadBaseSoundFont().catch(() => {})
  }

  async function loadBaseSoundFont() {
    soundFontState.value = 'loading'
    try {
      await soundFonts.ensure(withBase(props.soundFont))
      if (!disposed) soundFontState.value = 'ready'
    } catch (error) {
      if (!disposed) soundFontState.value = 'failed'
      throw error
    }
  }

  onMounted(() => {
    cleanBrokenJQuery()
    jqTimer = window.setInterval(cleanBrokenJQuery, 250)
    void loadLayout()

    // 站点切换深浅色时，alphaTab 已渲染的 SVG 不会自己变色，需要改配色后重绘。
    themeObserver = new MutationObserver(() => {
      if (!api.value || !alphaTab || !loaded.value) return
      applyThemeColors(alphaTab, api.value.settings, isDarkMode())
      api.value.render()
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    if (!('IntersectionObserver' in window)) {
      shouldLoad.value = true
      void init()
      return
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          shouldLoad.value = true
          observer?.disconnect()
          void init()
        }
      },
      { rootMargin: '400px 0px' }
    )

    observer.observe(container.value)
  })

  onBeforeUnmount(() => {
    disposed = true
    soundFonts?.dispose()
    playbackAbort.abort()
    layoutAbort.abort()
    observer?.disconnect()
    themeObserver?.disconnect()
    viewObserver?.disconnect()
    window.clearInterval(jqTimer)
    api.value?.destroy()
    api.value = null
  })

  watch(speed, (value) => {
    if (api.value) api.value.playbackSpeed = value
  })

  watch(volume, (value) => {
    if (api.value) api.value.masterVolume = value
  })

  // 工具栏（播放按钮所在的那条）看不见时，才让悬浮按钮出现。
  // 不能监听整个播放器：它可能有几千像素高，在视口里的可见比例永远很小，
  // 那样悬浮按钮会一直显示。
  // flush: 'post' —— 工具栏是 v-if="loaded" 渲染的，默认的 pre 时机会在它挂载前触发，
  // 那时 toolbar.value 还是 null，观察器就绑不上了。
  watch(
    toolbar,
    (element) => {
      viewObserver?.disconnect()
      if (!element || !('IntersectionObserver' in window)) return
      viewObserver = new IntersectionObserver(([entry]) => {
        playerInView.value = entry.isIntersecting
      })
      viewObserver.observe(element)
    },
    { flush: 'post' }
  )

  async function selectInstrument(value) {
    const request = ++instrumentRequest
    if (!api.value?.score?.tracks?.length) return
    instrumentError.value = ''
    const instrument = INSTRUMENTS.find(item => item.program === value)
    const isCurrent = () => !disposed && request === instrumentRequest
    // Pause once for the entire change, including consecutive selections. Loading a font
    // pauses AlphaSynth too; resuming there would race its asynchronous AudioWorklet startup
    // with the subsequent MIDI reload/stop. Only the final selection resumes playback.
    if (!instrumentPlayback) {
      instrumentPlayback = { position: position.value, playing: isPlaying.value }
      api.value.pause()
    }
    try {
      extraFontLoading.value = true
      await loadBaseSoundFont()
      if (!isCurrent()) return
      if (instrument?.soundFont) await soundFonts.ensure(withBase(instrument.soundFont))
      // Keep notifications suppressed until the Worker has acknowledged MIDI, seek and play.
      // Serialized changes cannot mistake an earlier MIDI acknowledgement for their own.
      if (isCurrent()) {
        instrumentChanges = instrumentChanges.catch(() => {}).then(() => {
          if (isCurrent()) return changeScoreInstrument(api.value, value, alphaTab,
            instrumentPlayback, isCurrent, playbackAbort.signal)
        })
        await instrumentChanges
      }
    } catch (error) {
      if (!isCurrent()) return
      instrumentError.value = `音源加载失败：${error.message}；请重新加载或选择其他音色`
      if (instrumentPlayback.tick !== undefined) api.value.tickPosition = instrumentPlayback.tick
      else api.value.timePosition = instrumentPlayback.position
      if (instrumentPlayback.playing) api.value.play()
    } finally {
      if (isCurrent()) {
        // Includes a note/tick seek requested while changing instruments, even when paused.
        position.value = api.value.timePosition
        isPlaying.value = instrumentPlayback.playing
        instrumentPlayback = null
        extraFontLoading.value = false
      }
    }
  }
  watch(program, selectInstrument)
  const retrySoundFont = () => selectInstrument(program.value)

  watch(followScroll, (value) => {
    if (!api.value || !alphaTab) return
    configureScoreScroll(api.value, alphaTab, value, window.innerHeight)
  })

  const togglePlay = () => {
    if (instrumentPlayback) {
      instrumentPlayback.playing = !instrumentPlayback.playing
      isPlaying.value = instrumentPlayback.playing
    } else if (soundFontState.value !== 'ready' && api.value?.score?.tracks?.length) {
      // Rendering can finish before the initial font. Keep the first play request
      // instead of letting that installation silently pause it.
      isPlaying.value = true
      void selectInstrument(program.value)
    } else if (api.value) {
      // Publish intent before the Worker's acknowledgement so an immediate instrument
      // selection cannot capture the old paused state and cancel the play request.
      isPlaying.value = !isPlaying.value
      if (isPlaying.value) api.value.play()
      else api.value.pause()
    }
  }

  /** 悬浮面板的前进/后退：按毫秒平移播放位置，两端做边界限制。 */
  const seekBy = (delta) => {
    const instance = api.value
    if (!instance || !duration.value) return
    const next = Math.max(0, Math.min(duration.value, position.value + delta))
    if (instrumentPlayback) {
      instrumentPlayback.position = next
      delete instrumentPlayback.tick
    }
    else instance.timePosition = next
    position.value = next // 立即回显，不等位置事件
  }

  /** 点简谱上的数字：把播放位置跳到那个音。 */
  const seekToNote = (index) => {
    const instance = api.value
    if (!instance || !loaded.value || !highlightOk.value) return
    const tick = scoreIndex?.tickAt(index)
    if (tick === undefined) return
    if (instrumentPlayback) instrumentPlayback.tick = tick
    else instance.tickPosition = tick
    // seek 不会触发位置事件，这里直接落位，避免"跳了但高亮不动"。
    activeIndex.value = index
  }

  const onSeek = (target) => {
    if (!api.value || !duration.value) return
    const value = Math.max(0, Math.min(duration.value, Number(target)))
    if (instrumentPlayback) {
      instrumentPlayback.position = value
      delete instrumentPlayback.tick
    }
    else api.value.timePosition = value
    position.value = value
  }

  // api.print() 会打开 A4 排版的打印视图并调起浏览器打印对话框，用户在对话框里选"另存为 PDF"。
  // 必须在点击的同步调用栈里触发（否则被弹窗拦截），所以 api 是"可见即初始化"而不是点了才建。
  const onPrint = () => api.value?.print(undefined, {
    // 打印视图默认白底；单独覆盖谱面颜色，避免沿用暗色主题或灰色谱线。
    display: { resources: {
      mainGlyphColor: '#000', secondaryGlyphColor: '#000', staffLineColor: '#000',
      barSeparatorColor: '#000', barNumberColor: '#000', scoreInfoColor: '#000'
    } }
  })

  return {
    container, toolbar, playerInView, loaded, statusText, canRetrySoundFont, retrySoundFont,
    isPlaying, position, duration, speed, program, volume, followScroll,
    layout, activeIndex, highlightOk, togglePlay, seekBy, seekToNote, onSeek, onPrint
  }
}
