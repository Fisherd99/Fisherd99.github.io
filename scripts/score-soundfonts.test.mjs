import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { createSoundFontCache, createSoundFontLoader } from '../.vitepress/theme/score-player/soundfonts.mjs'

function fontLoaderFixture() {
  const emitter = () => {
    const listeners = new Set()
    return { on: fn => listeners.add(fn), off: fn => listeners.delete(fn),
      trigger: value => [...listeners].forEach(fn => fn(value)), get size() { return listeners.size } }
  }
  const loads = []
  return { loads, soundFontLoaded: emitter(), player: { soundFontLoadFailed: emitter() },
    loadSoundFont: (bytes, append) => loads.push({ bytes, append }) }
}
const nextTask = () => new Promise(resolve => setImmediate(resolve))

test('SHA-256 不匹配的数据不缓存；重试绕过旧 HTTP 缓存并共享验证结果', async () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer
  const hash = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
  const requests = []
  const cache = createSoundFontCache(async (url, options) => {
    requests.push({ url, options })
    return { ok: requests.length !== 1, status: 503, arrayBuffer: async () => requests.length === 2 ? new ArrayBuffer(1) : bytes }
  }, { '/piano.sf2': hash })
  const first = cache('/blog/piano.sf2')
  assert.equal(first, cache('/blog/piano.sf2'))
  await assert.rejects(first, /503/)
  await assert.rejects(cache('/blog/piano.sf2'), /SHA-256 校验失败/)
  const valid = await cache('/blog/piano.sf2')
  assert.equal(valid, bytes)
  assert.equal(await cache('/blog/piano.sf2'), bytes)
  assert.equal(requests.length, 3)
  assert.equal(requests[0].url, `/blog/piano.sf2?v=${hash}`)
  assert.equal(requests[1].options.cache, 'reload')
  await assert.rejects(cache('/unknown.sf2'), /缺少 SHA-256/)
  assert.equal(requests.length, 3)
})

test('两个播放器共享下载但独立安装，收到成功通知前不得认定安装完成', async () => {
  let calls = 0
  const bytes = new Uint8Array([1, 2, 3]).buffer
  const cache = createSoundFontCache(async () => {
    calls++
    return { ok: true, arrayBuffer: async () => bytes }
  })
  const a = fontLoaderFixture(), b = fontLoaderFixture()
  let restored = 0, completed = false
  const loaderA = createSoundFontLoader(a, cache, () => () => restored++)
  const loaderB = createSoundFontLoader(b, cache)
  const first = loaderA.ensure('/piano').then(() => { completed = true })
  const second = loaderB.ensure('/piano')
  await nextTask()
  assert.equal(calls, 1)
  assert.equal(a.loads.length, 1)
  assert.equal(b.loads.length, 1)
  assert.equal(completed, false)
  assert.equal(restored, 0)
  // Transferring one player's buffer must not detach the shared cache.
  structuredClone(a.loads[0].bytes.buffer, { transfer: [a.loads[0].bytes.buffer] })
  assert.equal(bytes.byteLength, 3)
  a.soundFontLoaded.trigger()
  b.soundFontLoaded.trigger()
  await Promise.all([first, second])
  await loaderA.ensure('/piano')
  assert.equal(a.loads.length, 1)
  assert.equal(restored, 1)
  loaderA.dispose()
  loaderB.dispose()
})

test('音源安装串行确认成功，解析失败清除共享数据并重新下载', async () => {
  const api = fontLoaderFixture()
  const downloads = []
  const cache = createSoundFontCache(async url => {
    downloads.push(url)
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(3) }
  })
  const loader = createSoundFontLoader(api, cache)
  const first = loader.ensure('/a')
  const rejected = assert.rejects(first, /解析失败/)
  assert.equal(first, loader.ensure('/a'))
  const second = loader.ensure('/b')
  await nextTask()
  assert.equal(api.loads.length, 1)
  const error = new Error('解析失败')
  api.player.soundFontLoadFailed.trigger(error)
  assert.equal(loader.isLoadError(error), true)
  await rejected
  await nextTask()
  assert.equal(api.loads.length, 2)
  api.soundFontLoaded.trigger()
  await second
  const retry = loader.ensure('/a')
  await nextTask()
  assert.equal(api.loads.length, 3)
  assert.deepEqual(downloads, ['/a', '/b', '/a'])
  api.soundFontLoaded.trigger()
  await retry
  assert.equal(api.soundFontLoaded.size, 0)
  loader.dispose()
})

test('卸载播放器取消安装并移除订阅，不影响下一页面复用共享下载', async () => {
  let calls = 0
  const cache = createSoundFontCache(async () => {
    calls++
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(3) }
  })
  const api = fontLoaderFixture()
  let restored = false
  const loader = createSoundFontLoader(api, cache, () => () => { restored = true })
  const first = loader.ensure('/a')
  const rejected = assert.rejects(first, /关闭/)
  const queued = loader.ensure('/b')
  const queuedRejected = assert.rejects(queued, /关闭/)
  await nextTask()
  loader.dispose()
  await Promise.all([rejected, queuedRejected])
  assert.equal(api.loads.length, 1)
  assert.equal(api.soundFontLoaded.size, 0)
  assert.equal(api.player.soundFontLoadFailed.size, 0)
  assert.equal(restored, false)
  const nextApi = fontLoaderFixture()
  const nextLoader = createSoundFontLoader(nextApi, cache)
  const next = nextLoader.ensure('/a')
  await nextTask()
  nextApi.soundFontLoaded.trigger()
  await next
  assert.equal(calls, 2) // /a and /b, with /a reused by the next page.
  nextLoader.dispose()
})
