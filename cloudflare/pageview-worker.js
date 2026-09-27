const HALF_HOUR_MS = 30 * 60 * 1000
const RECENT_BUCKETS = 48
const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 60

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

const json = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders
    }
  })
}

const normalizePath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') {
    return '/'
  }
  const clean = rawPath.trim().split('#')[0].split('?')[0] || '/'
  return clean.startsWith('/') ? clean : `/${clean}`
}

const bucketNow = () => Math.floor(Date.now() / HALF_HOUR_MS) * HALF_HOUR_MS

const trackPageview = async (env, pagePath) => {
  const ts = Date.now()
  const bucket = bucketNow()

  // D1 executes a batch transactionally. Incrementing inside SQL prevents
  // concurrent requests from overwriting each other's counts.
  await env.DB.batch([
    env.DB
      .prepare(`
        INSERT INTO pageview_totals (path, total, updated_at)
        VALUES (?1, 1, ?2)
        ON CONFLICT(path) DO UPDATE SET
          total = pageview_totals.total + 1,
          updated_at = excluded.updated_at
      `)
      .bind(pagePath, ts),
    env.DB
      .prepare(`
        INSERT INTO pageview_buckets (path, bucket_ts, views)
        VALUES (?1, ?2, 1)
        ON CONFLICT(path, bucket_ts) DO UPDATE SET
          views = pageview_buckets.views + 1
      `)
      .bind(pagePath, bucket)
  ])

  return { path: pagePath }
}

const getHistory = async (env, pagePath) => {
  const totalRow = await env.DB
    .prepare('SELECT total FROM pageview_totals WHERE path = ?1')
    .bind(pagePath)
    .first()

  const rows = await env.DB
    .prepare(`
      SELECT
        CAST(bucket_ts / ?2 AS INTEGER) * ?2 AS ts,
        SUM(views) AS value
      FROM pageview_buckets
      WHERE path = ?1 AND bucket_ts >= ?3
      GROUP BY CAST(bucket_ts / ?2 AS INTEGER)
      ORDER BY ts ASC
    `)
    .bind(pagePath, DAY_MS, Math.floor(Date.now() / DAY_MS) * DAY_MS - (HISTORY_DAYS - 1) * DAY_MS)
    .all()

  const recentStart = bucketNow() - (RECENT_BUCKETS - 1) * HALF_HOUR_MS
  const recentRow = await env.DB
    .prepare(`
      SELECT COALESCE(SUM(views), 0) AS views
      FROM pageview_buckets
      WHERE path = ?1 AND bucket_ts >= ?2
    `)
    .bind(pagePath, recentStart)
    .first()

  return {
    path: pagePath,
    total: Number(totalRow?.total ?? 0),
    recent24h: Number(recentRow?.views ?? 0),
    points: (rows.results ?? []).map((row) => ({
      ts: Number(row.ts),
      value: Number(row.value)
    }))
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      const apiPath = url.pathname

      if (request.method === 'OPTIONS') {
        return json({ ok: true })
      }

      if (apiPath === '/health') {
        return json({ ok: true, service: 'pageview-api' })
      }

      if (apiPath === '/api/pageview/track' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') ?? ''
        let rawPath = url.searchParams.get('path')
        if (contentType.includes('application/json')) {
          const body = await request.json().catch(() => ({}))
          rawPath = body.path ?? rawPath
        }
        const pagePath = normalizePath(rawPath)
        const result = await trackPageview(env, pagePath)
        return json({ ok: true, ...result })
      }

      if (apiPath === '/api/pageview/history' && request.method === 'GET') {
        const pagePath = normalizePath(url.searchParams.get('path'))
        const result = await getHistory(env, pagePath)
        return json(result)
      }

      return json({ error: 'not found' }, 404)
    } catch (error) {
      return json({ error: String(error) }, 500)
    }
  }
}
