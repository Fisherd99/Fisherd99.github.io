import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'public', 'api', 'pageview')
const dbFile = path.join(dataDir, 'db.json')
const port = Number(process.env.PAGEVIEW_API_PORT ?? 8787)
const halfHourMs = 30 * 60 * 1000
const recentBuckets = 48
const dayMs = 24 * 60 * 60 * 1000
const historyDays = 60
let mutationQueue = Promise.resolve()

const ensureDb = async () => {
  await fs.mkdir(dataDir, { recursive: true })
  try {
    await fs.access(dbFile)
  } catch {
    await fs.writeFile(dbFile, JSON.stringify({ paths: {} }, null, 2), 'utf-8')
  }
}

const readDb = async () => {
  const raw = await fs.readFile(dbFile, 'utf-8')
  const parsed = JSON.parse(raw)
  if (!parsed.paths || typeof parsed.paths !== 'object') {
    return { paths: {} }
  }
  return parsed
}

const writeDb = async (db) => {
  const temporaryFile = `${dbFile}.tmp`
  await fs.writeFile(temporaryFile, JSON.stringify(db, null, 2), 'utf-8')
  await fs.rename(temporaryFile, dbFile)
}

const withMutationLock = (task) => {
  const result = mutationQueue.then(task, task)
  mutationQueue = result.then(() => undefined, () => undefined)
  return result
}

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

const normalizePath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') {
    return '/'
  }
  const clean = rawPath.trim().split('#')[0].split('?')[0] || '/'
  return clean.startsWith('/') ? clean : `/${clean}`
}

const nowBucket = () => {
  return Math.floor(Date.now() / halfHourMs) * halfHourMs
}

const toHistoryPoints = (pathData) => {
  const map = pathData?.buckets ?? {}
  const firstDay = Math.floor(Date.now() / dayMs) * dayMs - (historyDays - 1) * dayMs
  const daily = new Map()

  for (const [rawTs, rawValue] of Object.entries(map)) {
    const ts = Number(rawTs)
    const value = Number(rawValue)
    if (!Number.isFinite(ts) || !Number.isFinite(value) || ts < firstDay) continue
    const day = Math.floor(ts / dayMs) * dayMs
    daily.set(day, (daily.get(day) ?? 0) + value)
  }

  return Array.from(daily, ([ts, value]) => ({ ts, value }))
    .sort((a, b) => a.ts - b.ts)
}

const getRecentReads = (pathData) => {
  const start = nowBucket() - (recentBuckets - 1) * halfHourMs
  return Object.entries(pathData?.buckets ?? {}).reduce((sum, [ts, views]) => {
    return Number(ts) >= start ? sum + Number(views) : sum
  }, 0)
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'bad request' })
    return
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true })
    return
  }

  const url = new URL(req.url, `http://localhost:${port}`)
  const apiPath = url.pathname

  if (apiPath === '/api/pageview/track' && req.method === 'POST') {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', async () => {
      try {
        const bodyRaw = Buffer.concat(chunks).toString('utf-8')
        const body = bodyRaw ? JSON.parse(bodyRaw) : {}
        const pagePath = normalizePath(body.path ?? url.searchParams.get('path') ?? '/')
        const item = await withMutationLock(async () => {
          const db = await readDb()
          const current = db.paths[pagePath] ?? { total: 0, buckets: {} }
          current.buckets ??= {}
          current.total += 1
          const bucket = nowBucket()
          current.buckets[bucket] = Number(current.buckets[bucket] ?? 0) + 1
          db.paths[pagePath] = current
          await writeDb(db)
          return current
        })
        sendJson(res, 200, { ok: true, path: pagePath, total: item.total })
      } catch (error) {
        sendJson(res, 500, { error: String(error) })
      }
    })
    return
  }

  if (apiPath === '/api/pageview/history' && req.method === 'GET') {
    try {
      const pagePath = normalizePath(url.searchParams.get('path') ?? '/')
      const db = await readDb()
      const item = db.paths[pagePath] ?? { total: 0, buckets: {} }
      sendJson(res, 200, {
        path: pagePath,
        total: item.total,
        recent24h: getRecentReads(item),
        points: toHistoryPoints(item)
      })
    } catch (error) {
      sendJson(res, 500, { error: String(error) })
    }
    return
  }

  sendJson(res, 404, { error: 'not found' })
})

await ensureDb()
server.listen(port, () => {
  console.log(`[pageview-api] listening on http://localhost:${port}`)
  console.log('[pageview-api] GET  /api/pageview/history?path=/your-page')
  console.log('[pageview-api] POST /api/pageview/track  {"path":"/your-page"}')
})
