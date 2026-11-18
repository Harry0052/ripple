ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;

CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE email IS NOT NULL;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES workflow_versions (id),
  initiated_by TEXT NOT NULL REFERENCES users (id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'needs_approval', 'succeeded', 'failed', 'cancelled')),
  purpose TEXT NOT NULL CHECK (purpose IN ('user', 'dry_run')),
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  inputs_json TEXT NOT NULL,
  context_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  cancelled_at TEXT,
  UNIQUE (initiated_by, idempotency_key)
);

CREATE INDEX runs_owner_idx ON runs (initiated_by, started_at);
CREATE INDEX runs_version_idx ON runs (version_id, status);

CREATE TABLE run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs (id),
  step_id TEXT NOT NULL REFERENCES workflow_steps (id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'needs_approval', 'succeeded', 'failed', 'cancelled')),
  safe_result_json TEXT,
  error TEXT,
  attempt INTEGER NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  UNIQUE (run_id, step_id)
);

CREATE INDEX run_steps_run_idx ON run_steps (run_id);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs (id),
  step_id TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users (id),
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'approve_effect', 'deny')),
  consent_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX approvals_run_idx ON approvals (run_id);

CREATE TABLE demo_submissions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs (id),
  user_id TEXT NOT NULL REFERENCES users (id),
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
