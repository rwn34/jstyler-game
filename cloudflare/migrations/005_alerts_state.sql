-- Migration 005: alerts_state table for ack/mute workflow
-- Idempotent CREATE

CREATE TABLE IF NOT EXISTS alerts_state (
  alert_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('open', 'acked', 'muted')),
  acked_at INTEGER,
  acked_by TEXT,
  mute_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_alerts_state_status ON alerts_state(status);
CREATE INDEX IF NOT EXISTS idx_alerts_state_mute_until ON alerts_state(mute_until);
