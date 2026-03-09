CREATE TABLE IF NOT EXISTS pageview_totals (
  path TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pageview_history (
  path TEXT NOT NULL,
  bucket_ts INTEGER NOT NULL,
  total INTEGER NOT NULL,
  PRIMARY KEY (path, bucket_ts)
);

CREATE INDEX IF NOT EXISTS idx_pageview_history_path_ts
  ON pageview_history (path, bucket_ts);
