-- Phase 4: Pre-aggregated daily stats, retention, player flags, feedback status

CREATE TABLE IF NOT EXISTS stats_daily (
  date TEXT NOT NULL,           -- YYYY-MM-DD UTC
  level INTEGER,                -- nullable for global rows
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

CREATE TABLE IF NOT EXISTS retention_daily (
  cohort_week TEXT NOT NULL,    -- ISO week of cohort
  cohort_size INTEGER NOT NULL,
  d1_retained INTEGER NOT NULL DEFAULT 0,
  d7_retained INTEGER NOT NULL DEFAULT 0,
  d30_retained INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL,
  PRIMARY KEY (cohort_week)
);

CREATE TABLE IF NOT EXISTS player_flags (
  pid TEXT PRIMARY KEY,
  flag_type TEXT NOT NULL,      -- 'review' | 'banned'
  reason TEXT,
  flagged_by TEXT,              -- operator identifier (currently 'dashboard')
  flagged_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_flags_type ON player_flags(flag_type);

CREATE TABLE IF NOT EXISTS feedback_status (
  event_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL,         -- 'open' | 'read' | 'resolved'
  notes TEXT,
  updated_at INTEGER NOT NULL
);
