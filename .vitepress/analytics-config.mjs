import { PAGEVIEW_DEFAULT_API_BASE } from './site-config.js'

export function resolveAnalyticsConfig(production, env = process.env) {
  return {
    apiBase: (env.PAGEVIEW_API_BASE ?? (production ? PAGEVIEW_DEFAULT_API_BASE : '')).replace(/\/$/, ''),
    beacon: env.CLOUDFLARE_ANALYTICS_ENABLED == null ? production : env.CLOUDFLARE_ANALYTICS_ENABLED === 'true'
  }
}
