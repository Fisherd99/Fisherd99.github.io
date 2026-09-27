CREATE TABLE IF NOT EXISTS pageview_totals (
  path TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Incremental reads per 30-minute bucket. `views` is the number of reads in
-- this interval, rather than the cumulative snapshot used by the legacy table.
CREATE TABLE IF NOT EXISTS pageview_buckets (
  path TEXT NOT NULL,
  bucket_ts INTEGER NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (path, bucket_ts)
);

CREATE INDEX IF NOT EXISTS idx_pageview_buckets_path_ts
  ON pageview_buckets (path, bucket_ts);

-- A visitor is counted at most once per article and half-hour bucket. The
-- visitor hash is derived from request metadata; raw IP addresses are not kept.
CREATE TABLE IF NOT EXISTS pageview_dedupe (
  path TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  bucket_ts INTEGER NOT NULL,
  PRIMARY KEY (path, visitor_hash, bucket_ts)
);

CREATE INDEX IF NOT EXISTS idx_pageview_dedupe_bucket_ts
  ON pageview_dedupe (bucket_ts);

CREATE TABLE IF NOT EXISTS pageview_rate_limits (
  visitor_hash TEXT NOT NULL,
  window_ts INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (visitor_hash, window_ts)
);

CREATE INDEX IF NOT EXISTS idx_pageview_rate_limits_window_ts
  ON pageview_rate_limits (window_ts);

-- Privacy-preserving visitor geography supplied by Cloudflare's edge. Exact
-- IP addresses are never stored and coordinates are rounded before writing.
CREATE TABLE IF NOT EXISTS pageview_locations (
  location_key TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pageview_locations_views
  ON pageview_locations (views DESC);
