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
