const BUCKET_MS = 30 * 60 * 1000

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

const bucketNow = () => Math.floor(Date.now() / BUCKET_MS) * BUCKET_MS

const trackPageview = async (env, pagePath) => {
  const ts = Date.now()
  const bucket = bucketNow()

  const current = await env.DB
    .prepare('SELECT total FROM pageview_totals WHERE path = ?1')
    .bind(pagePath)
    .first()

  const nextTotal = Number(current?.total ?? 0) + 1

  await env.DB.batch([
    env.DB
      .prepare(`
        INSERT INTO pageview_totals (path, total, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(path) DO UPDATE SET
          total = excluded.total,
          updated_at = excluded.updated_at
      `)
      .bind(pagePath, nextTotal, ts),
    env.DB
      .prepare(`
        INSERT INTO pageview_history (path, bucket_ts, total)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(path, bucket_ts) DO UPDATE SET
          total = excluded.total
      `)
      .bind(pagePath, bucket, nextTotal)
  ])

  return { path: pagePath, total: nextTotal }
}

const getHistory = async (env, pagePath) => {
  const totalRow = await env.DB
    .prepare('SELECT total FROM pageview_totals WHERE path = ?1')
    .bind(pagePath)
    .first()

  const rows = await env.DB
    .prepare(`
      SELECT ts, value FROM (
        SELECT bucket_ts AS ts, total AS value
        FROM pageview_history
        WHERE path = ?1
        ORDER BY bucket_ts DESC
        LIMIT 24
      ) AS recent
      ORDER BY ts ASC
    `)
    .bind(pagePath)
    .all()

  return {
    path: pagePath,
    total: Number(totalRow?.total ?? 0),
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
