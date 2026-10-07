import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAnalyticsConfig } from '../.vitepress/analytics-config.mjs'
import { createRequestLifecycle } from '../.vitepress/theme/composables/request-lifecycle.mjs'

test('Development tracking is opt-in; production and explicit overrides are independent', () => {
  assert.deepEqual(resolveAnalyticsConfig(false, {}), { apiBase: '', beacon: false })
  assert.ok(resolveAnalyticsConfig(true, {}).apiBase.startsWith('https://'))
  assert.equal(resolveAnalyticsConfig(true, {}).beacon, true)
  assert.deepEqual(resolveAnalyticsConfig(true, { PAGEVIEW_API_BASE: '', CLOUDFLARE_ANALYTICS_ENABLED: 'false' }), { apiBase: '', beacon: false })
  assert.deepEqual(resolveAnalyticsConfig(false, { PAGEVIEW_API_BASE: 'http://localhost:8787/', CLOUDFLARE_ANALYTICS_ENABLED: 'true' }), { apiBase: 'http://localhost:8787', beacon: true })
})

test('A superseded request is aborted and cannot publish a late response', async () => {
  const lifecycle = createRequestLifecycle()
  let signal, resolveOld
  const old = lifecycle.run((s) => { signal = s; return new Promise((resolve) => { resolveOld = resolve }) })
  await Promise.resolve()
  const latest = lifecycle.run(async () => 'new')
  assert.equal(signal.aborted, true)
  resolveOld('old')
  assert.equal((await old).status, 'cancelled')
  assert.deepEqual(await latest, { status: 'success', value: 'new' })
  lifecycle.dispose()
})

test('Timeout ends a hanging body read; the next request can succeed', async () => {
  const lifecycle = createRequestLifecycle(10)
  let signal
  const result = await lifecycle.run(async (s) => { signal = s; return new Promise(() => {}) })
  assert.equal(result.status, 'timeout')
  assert.equal(signal.aborted, true)
  assert.deepEqual(await lifecycle.run(async () => 42), { status: 'success', value: 42 })
  lifecycle.dispose()
})

test('Unmount cancels pending work and prevents queued requests from starting', async () => {
  const lifecycle = createRequestLifecycle()
  let signal
  const pending = lifecycle.run(async (s) => { signal = s; return new Promise(() => {}) })
  await Promise.resolve()
  lifecycle.dispose()
  assert.equal(signal.aborted, true)
  assert.equal((await pending).status, 'cancelled')
  assert.equal((await lifecycle.run(() => { throw new Error('Must not start') })).status, 'cancelled')
})

test('Network failures return an error state and do not block retries', async () => {
  const lifecycle = createRequestLifecycle()
  assert.equal((await lifecycle.run(async () => { throw new Error('Network failed') })).status, 'error')
  assert.equal((await lifecycle.run(async () => 'ok')).status, 'success')
  lifecycle.dispose()
})

test('Disposal before the task microtask prevents fetch from starting', async () => {
  const lifecycle = createRequestLifecycle()
  let started = false
  const pending = lifecycle.run(() => { started = true; return 1 })
  lifecycle.dispose()
  assert.equal((await pending).status, 'cancelled')
  assert.equal(started, false)
})
