import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import * as alphaTab from '@coderline/alphatab'
import { INSTRUMENTS, configureScoreScroll, applyScoreInstrument, changeScoreInstrument, createScoreIndex, indexScoreLayout, guardScoreUiEvents } from '../.vitepress/theme/score-player/alphatab.mjs'
import { groupJianpuPrintRows, findJianpuPrintRow } from '../.vitepress/theme/score-player/jianpu-print.mjs'
import soundFontHashes from '../.vitepress/generated/soundfont-hashes.mjs'
import { createSoundFontLoader } from '../.vitepress/theme/score-player/soundfonts.mjs'
import { parseScoreText, parsePitchToken, durationOf, tokenize, buildMeasures, buildDisplay, toMusicXml } from './score-utils.mjs'

function loadScore(settings = new alphaTab.Settings()) {
  return alphaTab.importer.ScoreLoader.loadScoreFromBytes(
    fs.readFileSync(new URL('../public/scores/tabi-no-tochu/score.musicxml', import.meta.url)), settings
  )
}

function makeMidi(score, settings) {
  const midi = new alphaTab.midi.MidiFile()
  new alphaTab.midi.MidiFileGenerator(score, settings, new alphaTab.midi.AlphaSynthMidiFileHandler(midi)).generate()
  return midi
}

test('第三方脚本留下 undefined jQuery 时，真实音源加载事件不会截断后续通知', () => {
  const host = { jQuery: undefined }
  const instance = Object.create(alphaTab.AlphaTabApi.prototype)
  let notifications = 0
  instance.uiFacade = { triggerEvent() {
    if ('jQuery' in host) host.jQuery()
    notifications++
  } }
  assert.throws(() => instance._onSoundFontLoaded(), TypeError)
  guardScoreUiEvents(instance, () => {
    if ('jQuery' in host && typeof host.jQuery !== 'function') delete host.jQuery
  })
  instance._onSoundFontLoaded()
  host.jQuery = undefined // 同一组件存活期间再次被第三方脚本写回。
  instance._onSoundFontLoaded()
  assert.equal(notifications, 2)
})

test('简谱打印将不同高度的音符和反复符号归入同一行，下一行括线不会重复进入上一行', () => {
  const items = [
    { phrase: 'A', box: { top: 100, bottom: 160, height: 60 } },
    { phrase: 'A', box: { top: 110, bottom: 150, height: 40 } },
    { phrase: 'A', box: { top: 174, bottom: 234, height: 60 } },
    { phrase: 'B', box: { top: 174, bottom: 234, height: 60 } }
  ]
  const rows = groupJianpuPrintRows(items)
  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0].elements, items.slice(0, 2))
  // 下一行括线 y=160，落在上一行预留的 SVG 边界内，必须归属下一行。
  assert.equal(findJianpuPrintRow(rows, 160), rows[1])
  assert.equal(findJianpuPrintRow(rows, 94), rows[0])
})

test('切换音色保留反复内播放 tick 和播放/暂停状态，安装期间不启动音频输出', async () => {
  let starts = 0
  const output = {
    sampleRate: 44100,
    ready: { on() {} }, sampleRequest: { on() {} }, samplesPlayed: { on() {} },
    open() {}, pause() {}, play() { starts++ }, activate() {}, resetSamples() {}
  }
  const synth = new alphaTab.synth.AlphaSynth(output, 100)
  const settings = new alphaTab.Settings()
  const score = loadScore(settings)
  const queue = []
  const instance = {
    score, player: synth,
    get timePosition() { return synth.timePosition },
    set timePosition(position) { queue.push(() => { synth.timePosition = position }) },
    set tickPosition(tick) { queue.push(() => { synth.tickPosition = tick }) },
    get playerState() { return synth.state },
    loadMidiForScore() {
      const midi = makeMidi(score, settings)
      queue.push(() => synth.loadMidiFile(midi))
    },
    play() { queue.push(() => synth.play()) },
    pause() { queue.push(() => synth.pause()) }
  }
  async function acknowledged(change) {
    let settled = false
    const result = change.finally(() => { settled = true })
    for (let turn = 0; !settled && turn < 100; turn++) {
      while (queue.length) queue.shift()()
      await new Promise(resolve => setImmediate(resolve))
    }
    assert.ok(settled, 'Worker acknowledgement must complete the instrument change')
    await result
  }
  synth.loadMidiFile(makeMidi(score, settings))
  for (const playing of [false, true]) {
    synth.tickPosition = 80000
    const originalTick = synth.tickPosition
    const originalTime = synth.timePosition
    if (playing) synth.play()
    for (const program of [1, 74, 23]) await acknowledged(changeScoreInstrument(instance, program, alphaTab))
    assert.equal(synth.tickPosition, originalTick)
    assert.equal(synth.timePosition, originalTime)
    assert.equal(synth.state, playing ? alphaTab.synth.PlayerState.Playing : alphaTab.synth.PlayerState.Paused)
    assert.deepEqual([...synth.sequencer.instrumentPrograms], [22])
  }
  // SoundFont completion can precede the Worker's restored-playing notification.
  // Preserve the explicit playback intent even while the API still reports Paused.
  const playback = { position: synth.timePosition, playing: true }
  synth.pause()
  await acknowledged(changeScoreInstrument(instance, 25, alphaTab, playback))
  assert.equal(synth.timePosition, playback.position)
  assert.equal(synth.state, alphaTab.synth.PlayerState.Playing)

  synth.playbackSpeed = 1.25
  const saved = { position: synth.timePosition, playing: true, tick: 81000 }
  synth.pause()
  const bytes = fs.readFileSync(new URL('../public/alphatab/soundfont/sonivox-1.sf2', import.meta.url))
  const fonts = createSoundFontLoader({
    soundFontLoaded: synth.soundFontLoaded, player: synth,
    loadSoundFont(data, append) { synth.loadSoundFont(data, append) }
  }, async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  const before = starts
  await fonts.ensure('/piano')
  assert.equal(starts, before, '加载完成不得中途启动 AudioWorklet')
  await acknowledged(changeScoreInstrument(instance, 1, alphaTab, saved))
  assert.equal(starts, before + 1, '整次切换仅在最终恢复时启动一次')
  assert.equal(synth.timePosition, synth.sequencer.mainTickPositionToTimePosition(saved.tick))
  assert.equal(synth.playbackSpeed, 1.25)
  const play = instance.play
  instance.play = () => { play(); saved.playing = false }
  await acknowledged(changeScoreInstrument(instance, 23, alphaTab, saved))
  assert.equal(synth.state, alphaTab.synth.PlayerState.Paused, '恢复播放确认前按暂停仍应最终暂停')
  instance.play = play
  saved.playing = true
  const superseded = starts
  await acknowledged(changeScoreInstrument(instance, 23, alphaTab, saved, () => false))
  assert.equal(starts, superseded, '旧选择收到 MIDI 确认后不能恢复播放')
  const abort = new AbortController()
  const cancelled = changeScoreInstrument(instance, 1, alphaTab, saved, () => true, abort.signal)
  abort.abort()
  await acknowledged(cancelled)
  assert.equal(starts, superseded, '卸载取消确认等待，不留下后续播放')
  fonts.dispose()
})

test('简谱索引覆盖所有音符和休止，反复中的高亮映射回写谱音序', () => {
  const settings = new alphaTab.Settings()
  const score = loadScore(settings)
  const generator = new alphaTab.midi.MidiFileGenerator(score, settings,
    new alphaTab.midi.AlphaSynthMidiFileHandler(new alphaTab.midi.MidiFile()))
  generator.generate()
  const index = createScoreIndex({ score, tickCache: generator.tickLookup })
  const data = JSON.parse(fs.readFileSync(new URL('../public/scores/tabi-no-tochu/score.json', import.meta.url)))
  assert.equal(index.valid, true)
  assert.equal(indexScoreLayout(data), index.count)
  for (let i = 0; i < index.count; i++) assert.equal(index.indexAt(index.tickAt(i)), i)
  for (const bar of generator.tickLookup.masterBars) {
    for (let beat = bar.firstBeat; beat; beat = beat.nextBeat) {
      const tick = bar.start + beat.start
      const written = index.indexAt(tick)
      assert.ok(written >= 0)
      assert.equal(index.indexAt(index.tickAt(written)), written)
    }
  }
})

test('实际曲谱切换乐器后，MIDI 全程使用所选音色而不会被首拍自动化覆盖', () => {
  const settings = new alphaTab.Settings()
  const score = loadScore(settings)
  const track = score.tracks[0]
  const firstBeat = track.staves[0].bars[0].voices[0].beats[0]
  assert.equal(firstBeat.getAutomation(alphaTab.model.AutomationType.Instrument).value, 22)

  // 同一模型连续切换全部可选乐器，覆盖初始化、换乐器以及切回口琴。
  for (const { program, bank = 0 } of INSTRUMENTS) {
    applyScoreInstrument(track, program, alphaTab)
    assert.equal(track.playbackInfo.bank, bank)
    const midi = makeMidi(score, settings)
    const changes = midi.tracks.flatMap(t => t.events).filter(event => event instanceof alphaTab.midi.ProgramChangeEvent)
    assert.ok(changes.length > 0)
    assert.deepEqual([...new Set(changes.map(event => event.program))], [program - 1])
    assert.deepEqual([...new Set(changes.map(event => event.channel))].sort(),
      [track.playbackInfo.primaryChannel, track.playbackInfo.secondaryChannel].sort())
  }
})

test('菜单中的 MS Basic 与 Sonivox 音色能够独立及叠加加载，声音非静音且各不相同', () => {
  // 替换音频设备，MIDI 生成与 SoundFont 合成都使用 alphaTab 的真实实现。
  const output = {
    sampleRate: 44100,
    ready: { on() {} }, sampleRequest: { on() {} }, samplesPlayed: { on() {} },
    open() {}
  }
  const synth = new alphaTab.synth.AlphaSynth(output, 100)
  const settings = new alphaTab.Settings()
  const score = loadScore(settings)
  const fonts = INSTRUMENTS.map(({ soundFont }) => {
    const bytes = fs.readFileSync(new URL(`../public${soundFont}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), soundFontHashes[soundFont])
    return bytes
  })
  const fingerprints = []
  for (const [index, { program }] of INSTRUMENTS.entries()) {
    applyScoreInstrument(score.tracks[0], program, alphaTab)
    const midi = makeMidi(score, settings)
    const options = new alphaTab.synth.AudioExportOptions()
    options.soundFonts = [fonts[index]]
    const samples = synth.exportAudio(options, midi, [], new Map()).render(2500).samples
    assert.ok(samples.some(value => Math.abs(value) > 0.001), `音色 ${program} 必须有声音`)
    assert.ok(samples.every(Number.isFinite), `音色 ${program} 不得包含无效音频采样`)
    if (program === 1 || program === 23) {
      options.soundFonts = [fs.readFileSync(new URL('../node_modules/@coderline/alphatab/dist/soundfont/sonivox.sf2', import.meta.url))]
      assert.deepEqual(samples, synth.exportAudio(options, midi, [], new Map()).render(2500).samples,
        `提取后的音色 ${program} 必须与原始 Sonivox 完全一致`)
    }
    fingerprints.push(createHash('sha256').update(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)).digest('hex'))
    options.soundFonts = fonts
    const original = synth.exportAudio(options, midi, [], new Map()).render(2500).samples
    assert.deepEqual(samples, original, '叠加加载其他音色不得改变当前音色')
  }
  assert.equal(new Set(fingerprints).size, INSTRUMENTS.length)
})

// 执行已安装 alphaTab 的真实滚动/暂停逻辑；只替换 DOM 和音频边界。
// 私有字段仅用于构造测试夹具，产品代码只用公开 API。
function createScrollFixture() {
  const instance = Object.create(alphaTab.AlphaTabApi.prototype)
  const scrolls = []
  let cancellations = 0
  const scroll = {}
  instance.settings = new alphaTab.Settings()
  instance._scrollHandlerMode = alphaTab.ScrollMode.Off
  instance._scrollHandlerVertical = true
  instance._currentBeatBounds = { barBounds: { masterBarBounds: { realBounds: { y: 1600 } } } }
  instance._currentBeat = { beat: {} }
  instance._tickCache = { getBeatStart: () => 960 }
  instance._player = { tickPosition: 0 }
  instance.uiFacade = {
    getScrollContainer: () => scroll,
    getOffset: () => ({ y: 100 }),
    scrollToY: (_scroll, y) => scrolls.push(y),
    stopScrolling: () => { cancellations++ },
    triggerEvent() {}
  }
  instance.updateSettings = () => instance._updateScrollHandler()
  const pause = () => instance._onPlayerStateChanged({ state: alphaTab.synth.PlayerState.Paused, stopped: false })
  return { instance, scrolls, pause, cancellations: () => cancellations }
}

test('关闭跟随后暂停和显式 scrollToCursor 都不滚动，反复开关仍可跟随', () => {
  const { instance, scrolls, pause, cancellations } = createScrollFixture()
  configureScoreScroll(instance, alphaTab, false, 800)
  pause()
  assert.deepEqual(scrolls, [])
  for (let i = 0; i < 3; i++) {
    configureScoreScroll(instance, alphaTab, true, 800)
    instance.scrollToCursor()
    assert.equal(scrolls.at(-1), 1300)
    const before = scrolls.length
    const beforeCancellations = cancellations()
    configureScoreScroll(instance, alphaTab, false, 800)
    assert.ok(cancellations() > beforeCancellations)
    pause()
    instance.scrollToCursor()
    assert.equal(scrolls.length, before)
    assert.equal(instance.settings.player.nativeBrowserSmoothScroll, false)
  }
})

test('头部行内注释不会进入拍号、速度和音色值', () => {
  const { meta, body } = parseScoreText('time: 4/4 // 拍号\ntempo: 75 // 速度\nprogram: 23 // 口琴\n---\n1 2 3 4 |')
  assert.deepEqual(meta, { time: '4/4', tempo: '75', program: '23' })
  assert.deepEqual(buildMeasures(tokenize(body), meta).errors, [])
})

test('简谱保留降号，连续三音延音的中间音同时发出 stop 和 start', () => {
  const meta = { time: '4/4' }
  const tokens = tokenize('b3~ b3~ b3 0 |')
  const built = buildMeasures(tokens, meta)
  assert.deepEqual(built.errors, [])
  assert.equal(buildDisplay(tokens, meta)[0].phrases[0].notes[0].flat, true)
  const xml = toMusicXml(built, meta)
  assert.ok(xml.includes('<notations><tied type="stop"/><tied type="start"/></notations>'))
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(xml), new alphaTab.Settings())
  const notes = score.tracks[0].staves[0].bars[0].voices[0].beats.map(beat => beat.notes[0])
  assert.equal(notes[0].realValue, 75)
  assert.equal(notes[1].isTieDestination, true)
  assert.equal(notes[2].isTieDestination, true)
})

test('简谱保留原位的分段反复标记，跨小节/乐句/段落的连音终点不改变音序', () => {
  const tokens = tokenize('[A]\n|: 1~ |\n1~\n[B]\n1 :| |1. 2 | |2. 3 | |3. 4 |')
  const sections = buildDisplay(tokens, { divisions: 4 })
  const items = sections.flatMap(section => section.phrases.flatMap(phrase => phrase.notes))
  assert.deepEqual(items.filter(item => item.kind === 'endingStart').map(item => item.number), [1, 2, 3])
  assert.deepEqual(items.slice(-8).map(item => item.kind),
    ['note', 'bar', 'endingStart', 'note', 'bar', 'endingStart', 'note', 'bar'])
  assert.equal(indexScoreLayout({ sections }), 6)
  const notes = items.filter(item => item.kind === 'note')
  assert.deepEqual(notes.map(note => note.index), [0, 1, 2, 3, 4, 5])
  assert.deepEqual(notes.slice(0, 3).map(note => [note.tieStart, note.tieStop]),
    [[true, false], [true, true], [false, true]])
  assert.ok(notes.slice(3).every(note => !note.tieStop))
})

test('圆滑线终点与 MusicXML 一致，跨乐句/段落的连续圆滑线保留中间音', () => {
  const tokens = tokenize('[A]\n1^\n2^\n[B]\n3 0 |')
  const built = buildMeasures(tokens, { time: '4/4' })
  assert.deepEqual(built.errors, [])
  const sections = buildDisplay(tokens, {})
  const notes = sections.flatMap(s => s.phrases.flatMap(p => p.notes.filter(n => n.kind === 'note')))
  assert.deepEqual(notes.map(n => [n.slurStart, n.slurStop]),
    [[true, false], [true, true], [false, true], [false, false]])
  assert.deepEqual(notes.map(n => n.slurStop), built.measures[0].events.map(n => Boolean(n.slurStop)))
  assert.equal(indexScoreLayout({ sections }), 4)
})

test('反复结尾范围跨乐句，止于反复结束、下个结尾和段落边界', () => {
  const sections = buildDisplay(tokenize('[A]\n|1. 1 |\n2 :| 3 |2. 4 |\n5 |3. 6 |\n[B]\n7 |'), {})
  const items = sections.flatMap(s => s.phrases.flatMap(p => p.notes))
  const notes = items.filter(n => n.kind === 'note')
  assert.deepEqual(notes.map(n => n.endingId ?? null), [1, 1, null, 2, 2, 3, null])
  assert.deepEqual(items.filter(n => n.endingLast).map(n => n.kind), ['repeatEnd', 'note', 'bar'])
  assert.equal(indexScoreLayout({ sections }), 7)
})

test('制表指令仅改变简谱排版，紧贴音符或连续使用不改变乐谱与索引', () => {
  const plain = tokenize('1~ 1 2 3 |\n4 5 6 7 |')
  const tabs = tokenize('1~\\t1 \\t\\t2 3 |\n4 5 6 7 |')
  const meta = { time: '4/4' }
  const built = buildMeasures(tabs, meta)
  assert.deepEqual(built.errors, [])
  assert.equal(toMusicXml(built, meta), toMusicXml(buildMeasures(plain, meta), meta))
  const sections = buildDisplay(tabs, meta)
  assert.equal(sections[0].phrases.length, 2)
  assert.equal(sections[0].phrases[0].notes.filter(n => n.kind === 'tab').length, 3)
  assert.equal(indexScoreLayout({ sections }), 8)
  assert.equal(sections[0].phrases[0].notes.filter(n => n.kind === 'note')[1].tieStop, true)
})

test('增时线禁止混用附点/减时线，复杂时值用延音线且正常附点保持不变', () => {
  for (const token of ['1.-', '1-.', '1--.', '1_.-', '0.-', '1_-']) {
    assert.match(parsePitchToken(token, 8).error, /不能.*混用/)
    assert.ok(Number.isNaN(durationOf(token.slice(1), 8)))
  }
  for (const [token, quarters] of [['1.', 1.5], ['1_.', 0.75], ['1__.', 0.375], ['1--', 3], ['1---', 4], ['1.~', 1.5]]) {
    assert.equal(parsePitchToken(token, 8).duration, quarters * 8)
  }
  const tokens = tokenize('1-~ 1_ |')
  const built = buildMeasures(tokens, { time: '5/8', divisions: 8 })
  assert.deepEqual(built.errors, [])
  assert.equal(built.measures[0].events.reduce((sum, note) => sum + note.duration, 0), 20)
  assert.equal(built.measures[0].events[1].tieStop, true)
  const xml = toMusicXml(built, {})
  const score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new TextEncoder().encode(xml), new alphaTab.Settings())
  const imported = score.tracks[0].staves[0].bars[0].voices[0].beats.map(beat => beat.notes[0])
  assert.equal(imported[1].isTieDestination, true)
  const notes = buildDisplay(tokens, { divisions: 8 })[0].phrases[0].notes.filter(n => n.kind === 'note')
  assert.deepEqual(notes.map(n => [n.dashes, n.underlines, n.dotted, n.tieStart, n.tieStop]),
    [[1, 0, false, true, false], [0, 1, false, false, true]])
})
