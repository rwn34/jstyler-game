-- Canonical schema for ndj-metrics-db (idempotent — safe to re-run on existing prod)

-- === Events ===
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pid TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL,
  level INTEGER,
  data TEXT,
  client_ts INTEGER NOT NULL,
  server_ts INTEGER NOT NULL,
  offline INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE events ADD COLUMN event_uuid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_event_uuid ON events(event_uuid) WHERE event_uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_server_ts ON events(server_ts);
CREATE INDEX IF NOT EXISTS idx_events_type_server_ts ON events(type, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_pid_server_ts ON events(pid, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_level_type ON events(level, type, server_ts);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name) WHERE name IS NOT NULL;

-- === Sessions ===
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  pid TEXT NOT NULL,
  created_ts INTEGER NOT NULL,
  expires_ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_ts ON sessions(expires_ts);

-- === Sync States ===
CREATE TABLE IF NOT EXISTS sync_states (
  key_hash TEXT PRIMARY KEY,
  pid TEXT,
  data_json TEXT,
  rewards_json TEXT,
  purchase_json TEXT,
  device_ids TEXT,
  updated_at INTEGER NOT NULL,
  pin_hash_algo TEXT,
  pin_salt TEXT,
  pin_hash TEXT,
  recovery_code_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_states_updated_at ON sync_states(updated_at);

-- === Sync Lookup (forgot-pin support) ===
CREATE TABLE IF NOT EXISTS sync_lookup (
  username TEXT NOT NULL,
  mmyy TEXT NOT NULL,
  key_hash TEXT PRIMARY KEY
);
CREATE INDEX IF NOT EXISTS idx_sync_lookup_user_mmyy ON sync_lookup(username, mmyy);

-- === Sync Attempts (lockout tracking) ===
CREATE TABLE IF NOT EXISTS sync_attempts (
  key_hash TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  last_fail_at INTEGER NOT NULL
);

-- === Sync History (versioned backups) ===
CREATE TABLE IF NOT EXISTS sync_history (
  key_hash TEXT NOT NULL,
  version INTEGER NOT NULL,
  data_json TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (key_hash, version)
);

-- === Stats Daily (pre-aggregated) ===
CREATE TABLE IF NOT EXISTS stats_daily (
  date TEXT NOT NULL,
  level INTEGER,
  starts INTEGER NOT NULL DEFAULT 0,
  completes INTEGER NOT NULL DEFAULT 0,
  deaths INTEGER NOT NULL DEFAULT 0,
  unique_players INTEGER NOT NULL DEFAULT 0,
  avg_ms REAL,
  p50_ms REAL,
  p95_ms REAL,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  silver_earned INTEGER NOT NULL DEFAULT 0,
  gold_spent INTEGER NOT NULL DEFAULT 0,
  silver_spent INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  heartbeats INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL,
  PRIMARY KEY (date, level)
);
CREATE INDEX IF NOT EXISTS idx_stats_daily_date ON stats_daily(date);
CREATE INDEX IF NOT EXISTS idx_stats_daily_level ON stats_daily(level, date);

-- === Retention Daily ===
CREATE TABLE IF NOT EXISTS retention_daily (
  cohort_week TEXT PRIMARY KEY,
  cohort_size INTEGER NOT NULL,
  d1_retained INTEGER NOT NULL DEFAULT 0,
  d7_retained INTEGER NOT NULL DEFAULT 0,
  d30_retained INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL
);

-- === Player Flags ===
CREATE TABLE IF NOT EXISTS player_flags (
  pid TEXT PRIMARY KEY,
  flag_type TEXT NOT NULL,
  reason TEXT,
  flagged_by TEXT,
  flagged_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_flags_type ON player_flags(flag_type);

-- === Feedback Status ===
CREATE TABLE IF NOT EXISTS feedback_status (
  event_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL,
  notes TEXT,
  updated_at INTEGER NOT NULL
);
