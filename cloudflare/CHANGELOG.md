# Dashboard / Worker Changelog

## v1.2.55 — May 26, 2026

### Changed
- Tabs now horizontally scrollable with visible thin scrollbar (removed `scroll-snap`, `scrollbar-width:none`, and gradient mask)
- Mobile tables keep real column layout with horizontal scroll instead of card stacking
- Device max raised from 3 to 5 (sync stats reflect this)

### Fixed
- Alerts tab HTTP 500 — `stats_daily` existence check now wrapped in try/catch
- Watchlist tab HTTP 500 — `player_flags` table auto-created before query
- Feedback tab HTTP 500 — `feedback_status` table auto-created before query
- Retention tab skeleton/timeout — batched queries instead of N+1; fast path via `retention_daily`
- Geo tab "ID ID" — now shows country names alongside flags
- Cloud Sync tab — added Username column + Last Sync card
