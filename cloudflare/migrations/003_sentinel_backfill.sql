-- Backfill: migrate old level=99 sentinel rows to level=-1
UPDATE stats_daily SET level = -1 WHERE level = 99;
