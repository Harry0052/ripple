CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, created_at);

CREATE TABLE metric_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  workflow_id TEXT,
  run_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX metric_events_user_idx ON metric_events (user_id, name, created_at);
