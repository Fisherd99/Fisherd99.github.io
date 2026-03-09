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
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf-8')
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
  const intervalMs = 30 * 60 * 1000
  return Math.floor(Date.now() / intervalMs) * intervalMs
}

const toHistoryPoints = (pathData) => {
  const map = pathData?.history ?? {}
  return Object.entries(map)
    .map(([ts, value]) => ({ ts: Number(ts), value: Number(value) }))
    .filter((item) => Number.isFinite(item.ts) && Number.isFinite(item.value))
    .sort((a, b) => a.ts - b.ts)
    .slice(-24)
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
        const db = await readDb()
        const item = db.paths[pagePath] ?? { total: 0, history: {} }
        item.total += 1
        const bucket = nowBucket()
        item.history[bucket] = item.total
        db.paths[pagePath] = item
        await writeDb(db)
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
      const item = db.paths[pagePath] ?? { total: 0, history: {} }
      sendJson(res, 200, {
        path: pagePath,
        total: item.total,
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
