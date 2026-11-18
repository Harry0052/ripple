CREATE TABLE rate_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows (id),
  reporter_id TEXT NOT NULL REFERENCES users (id),
  reason TEXT NOT NULL CHECK (reason IN ('misleading', 'unsafe', 'spam', 'other')),
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX reports_workflow_idx ON reports (workflow_id, created_at);
