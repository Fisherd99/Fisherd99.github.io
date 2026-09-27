const HALF_HOUR_MS = 30 * 60 * 1000
const RECENT_BUCKETS = 48
const DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_DAYS = 60
const DEDUPE_RETENTION_MS = 2 * DAY_MS
const RATE_WINDOW_MS = 60 * 1000
const MAX_TRACKS_PER_WINDOW = 30
const MAX_PATH_LENGTH = 128
const MAX_BODY_BYTES = 1024
const MAX_MAP_POINTS = 48
const ARTICLE_PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\.html)?)?$/

const getAllowedOrigin = (request, env) => {
  const origin = request.headers.get('Origin')
  if (!origin) return null

  const configuredOrigins = String(env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (configuredOrigins.includes(origin)) return origin

  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin
  } catch {
    return null
  }

  return null
}

const responseHeaders = (allowedOrigin) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  }
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin
  return headers
}

const json = (data, status = 200, allowedOrigin = null) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(allowedOrigin)
  })
}

const normalizePath = (rawPath) => {
  if (!rawPath || typeof rawPath !== 'string') return null

  let clean = rawPath.trim().split('#')[0].split('?')[0] || '/'
  if (!clean.startsWith('/')) clean = `/${clean}`
  if (clean.length > 1) clean = clean.replace(/\/+$/, '')

  if (clean.length > MAX_PATH_LENGTH || !ARTICLE_PATH_PATTERN.test(clean)) {
    return null
  }

  return clean.endsWith('.html') ? clean.slice(0, -5) || '/' : clean
}

const bucketNow = () => Math.floor(Date.now() / HALF_HOUR_MS) * HALF_HOUR_MS

const digestHex = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const getVisitorHash = async (request) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const userAgent = (request.headers.get('User-Agent') ?? 'unknown').slice(0, 512)
  return digestHex(`${ip}\n${userAgent}`)
}

const consumeRateLimit = async (env, visitorHash) => {
  const window = Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS
  const hits = await env.DB
    .prepare(`
      INSERT INTO pageview_rate_limits (visitor_hash, window_ts, hits)
      VALUES (?1, ?2, 1)
      ON CONFLICT(visitor_hash, window_ts) DO UPDATE SET
        hits = pageview_rate_limits.hits + 1
      RETURNING hits
    `)
    .bind(visitorHash, window)
    .first('hits')

  return Number(hits ?? MAX_TRACKS_PER_WINDOW + 1) <= MAX_TRACKS_PER_WINDOW
}

const claimPageview = async (env, pagePath, visitorHash, bucket) => {
  const result = await env.DB
    .prepare(`
      INSERT OR IGNORE INTO pageview_dedupe (path, visitor_hash, bucket_ts)
      VALUES (?1, ?2, ?3)
    `)
    .bind(pagePath, visitorHash, bucket)
    .run()

  return Number(result.meta?.changes ?? 0) === 1
}

const getVisitorLocation = (request) => {
  const latitude = Number(request.cf?.latitude)
  const longitude = Number(request.cf?.longitude)
  const countryCode = String(request.cf?.country ?? '').toUpperCase().slice(0, 2)
  if (
    !countryCode
    || !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null
  }

  const roundedLatitude = Math.round(latitude * 10) / 10
  const roundedLongitude = Math.round(longitude * 10) / 10
  const region = String(request.cf?.region ?? '').slice(0, 80)
  const city = String(request.cf?.city ?? '').slice(0, 80)
  return {
    key: `${countryCode}:${roundedLatitude}:${roundedLongitude}`,
    countryCode,
    region,
    city,
    latitude: roundedLatitude,
    longitude: roundedLongitude
  }
}

const incrementPageview = async (request, env, pagePath, bucket) => {
  const ts = Date.now()
  const statements = [
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
  ]

  const location = getVisitorLocation(request)
  if (location) {
    statements.push(
      env.DB
        .prepare(`
          INSERT INTO pageview_locations (
            location_key, country_code, region, city, latitude, longitude, views, updated_at
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)
          ON CONFLICT(location_key) DO UPDATE SET
            views = pageview_locations.views + 1,
            updated_at = excluded.updated_at
        `)
        .bind(
          location.key,
          location.countryCode,
          location.region,
          location.city,
          location.latitude,
          location.longitude,
          ts
        )
    )
  }

  await env.DB.batch(statements)
}

const trackPageview = async (request, env, pagePath) => {
  const bucket = bucketNow()
  const visitorHash = await getVisitorHash(request)
  const rateLimitAllowed = await consumeRateLimit(env, visitorHash)
  if (!rateLimitAllowed) return { counted: false, rateLimited: true }

  const counted = await claimPageview(env, pagePath, visitorHash, bucket)

  if (counted) {
    try {
      await incrementPageview(request, env, pagePath, bucket)
    } catch (error) {
      await env.DB
        .prepare('DELETE FROM pageview_dedupe WHERE path = ?1 AND visitor_hash = ?2 AND bucket_ts = ?3')
        .bind(pagePath, visitorHash, bucket)
        .run()
        .catch(() => undefined)
      throw error
    }
  }

  return { counted, rateLimited: false }
}

const getHistory = async (env, pagePath) => {
  const firstDay = Math.floor(Date.now() / DAY_MS) * DAY_MS - (HISTORY_DAYS - 1) * DAY_MS
  const recentStart = bucketNow() - (RECENT_BUCKETS - 1) * HALF_HOUR_MS
  const legacyPath = pagePath === '/' ? pagePath : `${pagePath}.html`
  const [totalResult, historyResult, recentResult, locationsResult] = await env.DB.batch([
    env.DB
      .prepare('SELECT COALESCE(SUM(total), 0) AS total FROM pageview_totals WHERE path IN (?1, ?2)')
      .bind(pagePath, legacyPath),
    env.DB
      .prepare(`
        SELECT
          CAST(bucket_ts / ?3 AS INTEGER) * ?3 AS ts,
          SUM(views) AS value
        FROM pageview_buckets
        WHERE path IN (?1, ?2) AND bucket_ts >= ?4
        GROUP BY CAST(bucket_ts / ?3 AS INTEGER)
        ORDER BY ts ASC
      `)
      .bind(pagePath, legacyPath, DAY_MS, firstDay),
    env.DB
      .prepare(`
        SELECT COALESCE(SUM(views), 0) AS views
        FROM pageview_buckets
        WHERE path IN (?1, ?2) AND bucket_ts >= ?3
      `)
      .bind(pagePath, legacyPath, recentStart),
    env.DB
      .prepare(`
        SELECT country_code, region, city, latitude, longitude, views
        FROM pageview_locations
        ORDER BY views DESC, updated_at DESC
        LIMIT ?1
      `)
      .bind(MAX_MAP_POINTS)
  ])

  const totalRow = totalResult.results?.[0]
  const recentRow = recentResult.results?.[0]
  return {
    path: pagePath,
    total: Number(totalRow?.total ?? 0),
    recent24h: Number(recentRow?.views ?? 0),
    points: (historyResult.results ?? []).map((row) => ({
      ts: Number(row.ts),
      value: Number(row.value)
    })),
    locations: (locationsResult.results ?? []).map((row) => ({
      countryCode: String(row.country_code),
      region: String(row.region),
      city: String(row.city),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      views: Number(row.views)
    }))
  }
}

const validateTrackRequest = (request, allowedOrigin) => {
  if (!allowedOrigin) return { error: 'origin_not_allowed', status: 403 }

  const contentType = request.headers.get('Content-Type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: 'content_type_not_supported', status: 415 }
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: 'request_too_large', status: 413 }
  }

  return null
}

const handleFetch = async (request, env) => {
  const url = new URL(request.url)
  const apiPath = url.pathname
  const allowedOrigin = getAllowedOrigin(request, env)

  if (request.method === 'OPTIONS') {
    return allowedOrigin
      ? new Response(null, { status: 204, headers: responseHeaders(allowedOrigin) })
      : json({ error: 'origin_not_allowed' }, 403)
  }

  if (apiPath === '/health' && request.method === 'GET') {
    return json({ ok: true, service: 'pageview-api' }, 200, allowedOrigin)
  }

  if (apiPath === '/api/pageview/track' && request.method === 'POST') {
    const validationError = validateTrackRequest(request, allowedOrigin)
    if (validationError) {
      return json({ error: validationError.error }, validationError.status, allowedOrigin)
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return json({ error: 'invalid_json' }, 400, allowedOrigin)
    }

    const pagePath = normalizePath(body.path)
    if (!pagePath) {
      return json({ error: 'invalid_path' }, 400, allowedOrigin)
    }

    const { counted, rateLimited } = await trackPageview(request, env, pagePath)
    if (rateLimited) {
      return json({ error: 'rate_limited' }, 429, allowedOrigin)
    }
    const history = await getHistory(env, pagePath)
    return json({ ok: true, counted, ...history }, 200, allowedOrigin)
  }

  if (apiPath === '/api/pageview/history' && request.method === 'GET') {
    const pagePath = normalizePath(url.searchParams.get('path'))
    if (!pagePath) {
      return json({ error: 'invalid_path' }, 400, allowedOrigin)
    }
    const result = await getHistory(env, pagePath)
    return json(result, 200, allowedOrigin)
  }

  return json({ error: 'not_found' }, 404, allowedOrigin)
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID()
    try {
      return await handleFetch(request, env)
    } catch (error) {
      console.error(JSON.stringify({
        event: 'pageview_request_failed',
        requestId,
        method: request.method,
        path: new URL(request.url).pathname,
        error: error instanceof Error ? error.message : String(error)
      }))
      return json({ error: 'internal_error', requestId }, 500, getAllowedOrigin(request, env))
    }
  },

  scheduled(_event, env, ctx) {
    const cutoff = Date.now() - DEDUPE_RETENTION_MS
    ctx.waitUntil(
      env.DB.batch([
        env.DB
          .prepare('DELETE FROM pageview_dedupe WHERE bucket_ts < ?1')
          .bind(cutoff),
        env.DB
          .prepare('DELETE FROM pageview_rate_limits WHERE window_ts < ?1')
          .bind(Date.now() - DAY_MS)
      ])
        .then((results) => {
          console.log(JSON.stringify({
            event: 'pageview_dedupe_cleanup',
            dedupeDeleted: Number(results[0]?.meta?.changes ?? 0),
            rateLimitsDeleted: Number(results[1]?.meta?.changes ?? 0)
          }))
        })
        .catch((error) => {
          console.error(JSON.stringify({
            event: 'pageview_dedupe_cleanup_failed',
            error: error instanceof Error ? error.message : String(error)
          }))
        })
    )
  }
}
