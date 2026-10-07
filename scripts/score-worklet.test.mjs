import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import * as alphaTab from '@coderline/alphatab'
import { patchAudioWorklet } from './patch-alphatab.mjs'

const nextTask = () => new Promise(resolve => setImmediate(resolve))
function fixture(t) {
  let complete, fail
  const registration = new Promise((resolve, reject) => { complete = resolve; fail = reject })
  const sources = [], nodes = [], registrations = []
  const context = {
    sampleRate: 48000, state: 'running', destination: {},
    createBuffer() { return {} },
    createBufferSource() {
      const source = {
        started: false, stopped: false, connected: false,
        connect() { this.connected = true },
        disconnect() { this.connected = false },
        start() { assert.equal(this.started, false); this.started = true },
        stop() { assert.equal(this.started, true, 'Never stop an unstarted source'); this.stopped = true }
      }
      sources.push(source)
      return source
    },
    close() { this.state = 'closed'; return Promise.resolve() }
  }
  class WorkletNode {
    constructor() {
      this.messages = []
      this.connected = false
      this.listeners = new Set()
      this.port = {
        addEventListener: (_, fn) => this.listeners.add(fn),
        removeEventListener: (_, fn) => this.listeners.delete(fn),
        start() {}, close() {},
        postMessage: message => this.messages.push(message)
      }
      nodes.push(this)
    }
    connect() { this.connected = true }
    disconnect() { this.connected = false }
  }
  const previous = globalThis.AudioWorkletNode
  globalThis.AudioWorkletNode = WorkletNode
  t.after(() => { globalThis.AudioWorkletNode = previous })
  alphaTab.Environment.initializeMain(() => {}, ctx => {
    registrations.push(ctx)
    return registration
  })
  const output = new alphaTab.synth.AlphaSynthAudioWorkletOutput(new alphaTab.Settings())
  output.context = context
  // These browser event APIs are the only DOM boundary used by destroy().
  const previousDocument = globalThis.document
  globalThis.document = { body: { removeEventListener() {} } }
  t.after(() => { globalThis.document = previousDocument })
  return { output, context, sources, nodes, registrations, complete, fail }
}

test('AudioWorklet 连续启动只保留最后一轮，旧消息不会推进播放时间', async t => {
  const f = fixture(t)
  let played = 0
  f.output.samplesPlayed.on(samples => { played += samples })
  f.output.play()
  f.output.pause()
  f.output.play()
  f.output.addSamples(new Float32Array([1, 2]))
  await nextTask()
  assert.equal(f.registrations.length, 1)
  f.complete()
  await nextTask()
  assert.equal(f.nodes.length, 1)
  assert.equal(f.sources[0].started, false)
  assert.equal(f.sources[1].started, true)
  assert.equal(f.nodes[0].messages[0].cmd, 'alphaSynth.output.addSamples')
  const staleHandler = [...f.nodes[0].listeners][0]
  staleHandler({ data: { cmd: 'alphaSynth.output.samplesPlayed', samples: 128 } })
  assert.equal(played, 128)
  f.output.play()
  staleHandler({ data: { cmd: 'alphaSynth.output.samplesPlayed', samples: 128 } })
  await nextTask()
  assert.equal(played, 128)
  assert.equal(f.registrations.length, 1)
  assert.equal(f.nodes.filter(node => node.connected).length, 1)
  assert.equal(f.sources[1].stopped, true)
  f.output.pause()
  f.output.pause()
  assert.equal(f.nodes.filter(node => node.connected).length, 0)
})

test('AudioWorklet 在模块加载期间暂停或销毁，加载完成后不会再启动', async t => {
  for (const action of ['pause', 'destroy']) {
    await t.test(action, async sub => {
      const f = fixture(sub)
      f.output.play()
      await nextTask()
      f.output[action]()
      f.complete()
      await nextTask()
      assert.equal(f.nodes.length, 0)
      assert.equal(f.sources[0].started, false)
      assert.equal(f.sources[0].connected, false)
    })
  }
})

test('AudioWorklet 注册失败可重试，补丁重复应用不变且版本漂移必须审查', async t => {
  const f = fixture(t)
  f.output.play()
  await nextTask()
  f.fail(new Error('module unavailable'))
  await nextTask()
  assert.equal(f.output.source, null)
  alphaTab.Environment.initializeMain(() => {}, () => Promise.resolve())
  f.output.play()
  await nextTask()
  assert.equal(f.nodes.length, 1)
  f.output.destroy()
  const patched = fs.readFileSync(new URL('../node_modules/@coderline/alphatab/dist/alphaTab.core.mjs', import.meta.url), 'utf8')
  assert.equal(patchAudioWorklet(patched, '1.8.4'), patched)
  const player = Object.create(alphaTab.synth.AlphaSynthWebWorkerApi.prototype)
  const info = { currentTime: 0, endTime: 1000 }
  player._loadedMidiInfo = info
  assert.equal(player.loadedMidiInfo, info, '公开 MIDI 确认订阅不得读取递归 getter')
  assert.throws(() => patchAudioWorklet(patched, '1.8.5'), /Review/)
  assert.throws(() => patchAudioWorklet(patched.replace('this._playback = null;', 'this._playback = 0;'), '1.8.4'), /patch has changed/)
})
