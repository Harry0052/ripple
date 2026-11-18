CREATE TABLE workflow_versions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  permissions_json TEXT NOT NULL,
  prerequisites TEXT NOT NULL,
  success_criteria TEXT NOT NULL,
  risks TEXT NOT NULL,
  test_status TEXT NOT NULL CHECK (test_status IN ('untested', 'passed', 'failed')),
  published_at TEXT,
  last_verified_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (workflow_id, version)
);

CREATE INDEX workflow_versions_workflow_idx ON workflow_versions (workflow_id);

CREATE TABLE workflow_steps (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES workflow_versions(id),
  ordinal INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  title TEXT NOT NULL,
  config_json TEXT NOT NULL,
  UNIQUE (version_id, ordinal)
);

CREATE INDEX workflow_steps_version_idx ON workflow_steps (version_id);
