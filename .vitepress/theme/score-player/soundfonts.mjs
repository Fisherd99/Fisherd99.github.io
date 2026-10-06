import soundFontHashes from '../../generated/soundfont-hashes.mjs'

// Shared across player instances and VitePress route changes; decoded presets stay per player.
export function createSoundFontCache(fetchFont = (...args) => fetch(...args), hashes = null) {
  const downloads = new Map()
  const reload = new Set()
  const get = url => {
    if (!downloads.has(url)) {
      const hash = hashes && Object.entries(hashes).find(([path]) => url.split(/[?#]/)[0].endsWith(path))?.[1]
      const download = Promise.resolve().then(() => {
        if (hashes && !hash) throw new Error('音源缺少 SHA-256 校验信息')
        const versionedUrl = hash ? `${url}${url.includes('?') ? '&' : '?'}v=${hash}` : url
        return fetchFont(versionedUrl, reload.has(url) ? { cache: 'reload' } : undefined)
      }).then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.arrayBuffer()
        if (hash) {
          const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
          const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
          if (actual !== hash) throw new Error('音源 SHA-256 校验失败')
        }
        reload.delete(url)
        return data
      }).catch(error => {
        downloads.delete(url)
        reload.add(url)
        throw error
      })
      downloads.set(url, download)
    }
    return downloads.get(url)
  }
  get.invalidate = url => { downloads.delete(url); reload.add(url) }
  return get
}

export const getSoundFont = createSoundFontCache(undefined, soundFontHashes)

// SoundFont events carry no URL: serialize installations to associate each acknowledgement
// with its request. A failed installation never becomes an installed cache entry.
export function createSoundFontLoader(api, download = getSoundFont, beforeLoad = () => () => {}) {
  const installed = new Set()
  const pending = new Map()
  let queue = Promise.resolve()
  let disposed = false
  let cancelInstallation
  let lastFailure
  function installFont(url, data) {
    if (disposed) throw new Error('播放器已关闭')
    return new Promise((resolve, reject) => {
      let restore = () => {}
      let finished = false
      const finish = error => {
        if (finished) return
        finished = true
        api.soundFontLoaded.off(success)
        api.player.soundFontLoadFailed.off(failure)
        cancelInstallation = undefined
        if (!disposed) {
          try { restore() } catch (restoreError) { error ??= restoreError }
        }
        if (error) {
          if (!disposed) download.invalidate?.(url)
          reject(error)
        }
        else { installed.add(url); resolve() }
      }
      const success = () => finish()
      const failure = error => {
        lastFailure = error
        finish(error instanceof Error ? error : new Error(String(error)))
      }
      api.soundFontLoaded.on(success)
      api.player.soundFontLoadFailed.on(failure)
      cancelInstallation = () => finish(new Error('播放器已关闭'))
      try {
        restore = beforeLoad()
        // Keep shared bytes intact even if a future Worker implementation transfers its buffer.
        api.loadSoundFont(new Uint8Array(data.slice(0)), true)
      } catch (error) { failure(error) }
    })
  }

  function ensure(url) {
    if (disposed) return Promise.reject(new Error('播放器已关闭'))
    // Even cached selections must wait for an in-flight installation to finish pausing/restoring.
    if (installed.has(url)) return queue.then(() => {})
    if (pending.has(url)) return pending.get(url)
    const operation = (async () => {
      const data = await download(url)
      const install = queue.then(() => installFont(url, data))
      queue = install.catch(() => {})
      await install
    })().finally(() => { pending.delete(url) })
    pending.set(url, operation)
    return operation
  }
  return {
    ensure,
    isLoadError: error => error === lastFailure,
    dispose() {
      disposed = true
      cancelInstallation?.()
      installed.clear()
    }
  }
}
