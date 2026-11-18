ALTER TABLE workflows ADD COLUMN draft_version_id TEXT;

ALTER TABLE workflow_versions ADD COLUMN definition_hash TEXT;
ALTER TABLE workflow_versions ADD COLUMN sample_inputs_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE workflow_versions ADD COLUMN intended_visibility TEXT NOT NULL DEFAULT 'private';
