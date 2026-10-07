// 每次只允许最新请求提交结果；超时覆盖 fetch 和正文解析的整个生命周期。
export function createRequestLifecycle(timeoutMs = 10000) {
  let active = null
  let generation = 0
  let disposed = false
  const cancel = () => {
    generation++
    active?.abort()
    active = null
  }
  return {
    cancel,
    dispose() { disposed = true; cancel() },
    async run(task) {
      cancel()
      if (disposed) return { status: 'cancelled' }
      const current = generation
      const controller = new AbortController()
      active = controller
      let timedOut = false
      let rejectAbort
      const aborted = new Promise((_, reject) => { rejectAbort = reject })
      const onAbort = () => rejectAbort(new Error(timedOut ? 'Request timed out' : 'Request cancelled'))
      controller.signal.addEventListener('abort', onAbort, { once: true })
      const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
      try {
        const value = await Promise.race([Promise.resolve().then(() => {
          if (controller.signal.aborted) throw new Error('Request cancelled')
          return task(controller.signal)
        }), aborted])
        return current === generation ? { status: 'success', value } : { status: 'cancelled' }
      } catch (error) {
        return current === generation ? { status: timedOut ? 'timeout' : 'error', error } : { status: 'cancelled' }
      } finally {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', onAbort)
        if (active === controller) active = null
      }
    }
  }
}
