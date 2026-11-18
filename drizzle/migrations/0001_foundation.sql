CREATE TABLE users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('guest', 'member', 'demo')),
  created_at TEXT NOT NULL
);

CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  estimated_minutes INTEGER NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('demo_seed', 'user')),
  published_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX workflows_explore_idx ON workflows (visibility, category, updated_at);
