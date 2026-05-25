CREATE INDEX IF NOT EXISTS idx_events_server_ts ON events(server_ts);
CREATE INDEX IF NOT EXISTS idx_events_type_server_ts ON events(type, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_pid_server_ts ON events(pid, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_level_type ON events(level, type, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_ts ON sessions(expires_ts);
CREATE INDEX IF NOT EXISTS idx_sync_states_updated_at ON sync_states(updated_at);
