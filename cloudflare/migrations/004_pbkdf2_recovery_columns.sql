-- Idempotent ALTER TABLE additions for existing prod tables
-- Apply after 000_init.sql → 001_indices.sql → 002_stats_daily.sql → 003_sentinel_backfill.sql
--
-- D1 supports ALTER TABLE ADD COLUMN but not IF NOT EXISTS.
-- If any column already exists, D1 will error. Run each individually
-- or skip already-applied columns via a bootstrap script.

ALTER TABLE sync_states ADD COLUMN pin_hash_algo TEXT;
ALTER TABLE sync_states ADD COLUMN pin_salt TEXT;
ALTER TABLE sync_states ADD COLUMN pin_hash TEXT;
ALTER TABLE sync_states ADD COLUMN recovery_code_hash TEXT;
ALTER TABLE sync_states ADD COLUMN recovery_code_salt TEXT;

ALTER TABLE events ADD COLUMN event_uuid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_event_uuid ON events(event_uuid) WHERE event_uuid IS NOT NULL;
