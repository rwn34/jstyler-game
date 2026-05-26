# Dashboard Overhaul Plan — N3ON DashJ Metrics

**Status:** ALL 5 PHASES SHIPPED ✓
**Scope:** ~10 workstreams across `cloudflare/` (worker + dashboard)
**Excluded:** secret management & auth hardening (deferred per user)

## Shipped Changelog

| Phase | Status | Bundle | What shipped |
|-------|--------|--------|--------------|
| **1 — Foundation** | ✓ | 127KB / 45KB gz | Preact + htm + signals + uPlot, esbuild build pipeline, modular tabs in `dashboard/`, D1 indices migration (001), `/stats/search` endpoint, search bar UI, dashboard refactored from single-file SPA |
| **2 — Operator Workflow** | ✓ | 135KB | Sortable + filterable Table component, RFC 4180 CSV export, hash routing (deep-link tabs + range + player), Loading/Empty/Error state components, range comparison toggle (delta cards via `?before=` param) |
| **3 — Missing Analytics** | ✓ | 147KB | 6 new endpoints (retention cohorts, onboarding funnel, death matrix, geo, time-distribution histogram, champion funnel), day-of-week heatmap, new Retention + Geo tabs, Levels tab gets death matrix + per-level histogram drill-down |
| **4 — Real-Time + Alerts** | ✓ | ~155KB | Migration 002 (stats_daily, retention_daily, player_flags, feedback_status tables), `aggregateDailyStats` + extended cron, `POST /admin/aggregate` backfill, fast-path routing for 31d/all ranges, polling-based feed stream (SSE infeasible on free CF plan), event-type filter chips, Pause/Resume on Feed, anomaly detection with Z-score baselines, new Alerts tab |
| **5 — Polish** | ✓ | 165KB | Container-query table-to-card mobile layout, full WCAG/ARIA pass (tabs, tables, search, modal), focus trap + skip link + visible focus rings, `prefers-reduced-motion`, 6 admin endpoints (flag/unflag/ban/unban/feedback-mark-read/flagged-players), banned-PID enforcement in event ingestion, new Watchlist tab, Feedback tab with status filter + inline actions + editable notes |

## User-Selected Tech Decisions (chosen 2026-05-26)
(continued below…)

## User-Selected Tech Decisions

- **Sequencing:** phased waves (4-5 testable releases)
- **Architecture:** lightweight framework — **Preact + htm + @preact/signals**
- **Charts:** **uPlot** (time-series) + custom SVG (cohort heatmap, sankey funnels, matrices)
- **Build:** **esbuild** bundling, output single `dashboard.bundle.js` imported as Text into worker

## Phases

### Phase 1 — Foundation
**Goal:** modular framework in place, baseline UX no worse than today, plus first feature

1. Add `package.json` deps: `preact`, `htm`, `@preact/signals`, `uplot`, `esbuild` (dev)
2. Add `cloudflare/build.mjs` — bundles `src/dashboard/main.jsx` → `src/dashboard.bundle.js`
3. Add npm scripts: `build`, `dev`, `deploy` (build runs before deploy)
4. Worker imports both `dashboard.html` (shell) + `dashboard.bundle.js` (Text)
5. Modular dashboard structure:
   ```
   cloudflare/src/dashboard/
     main.jsx                 # entry, signals state, router
     api.js                   # fetchJson, SSE helpers
     state.js                 # @preact/signals stores
     components/
       Card.jsx               # KPI card
       Tabs.jsx               # tab nav
       BarRow.jsx             # bar chart row
       Heatmap.jsx            # generic heatmap
       Table.jsx              # sortable + filterable table (Phase 2)
       LoadingPane.jsx        # loading skeleton
       EmptyState.jsx
       ErrorState.jsx
       SearchBar.jsx          # cross-cutting PID/name search (Phase 1)
       PlayerModal.jsx
     tabs/
       Overview.jsx
       Levels.jsx
       Players.jsx
       Sessions.jsx
       Engagement.jsx
       Economy.jsx
       DailyStage.jsx
       Feed.jsx
       AppVersion.jsx
       Feedback.jsx
       Sync.jsx
     charts/
       LineChart.jsx          # uPlot wrapper
       AreaChart.jsx
       Heatmap.jsx
   ```
6. **D1 indices migration** — `migrations/001_indices.sql` with:
   - `events(server_ts)`
   - `events(type, server_ts)`
   - `events(pid, server_ts)`
   - `events(level, type, server_ts)`
   - `sync_states(updated_at)`
7. **Search feature** — new `GET /stats/search?q=` endpoint (PID + name fuzzy), wire to top-bar `<SearchBar />`

**Success criteria:** dashboard renders identical-or-better; search bar finds player by partial name/PID.

### Phase 2 — Operator Workflow
1. Sortable tables (`<Table />` component with header click → sort signal)
2. Filter input on every table (client-side)
3. CSV export button per table (utility: `exportCsv(rows, columns, filename)`)
4. Deep-link tabs: hash routing (`#/players?range=7d`), restore on load
5. Loading/empty/error states across all tabs (no more bare "Loading…")
6. Range comparison toggle (this period vs previous period, side-by-side cards)

### Phase 3 — Missing Analytics
1. `GET /stats/retention?range=` — D1/D7/D30 cohort table per cohort week
2. `GET /stats/funnel?stage=onboarding` — session_start → name_set → level_1_start → level_1_complete → next-day return
3. `GET /stats/death-matrix` — death cause × level matrix (already collected, just new aggregation)
4. `GET /stats/geo` — country aggregation: players, sessions, completion rate, retention
5. Day-of-week × hour heatmap for Sessions tab
6. `GET /stats/time-distribution?level=N` — completion-time histogram per level
7. `GET /stats/champion-funnel` — what % of D1 retained → champion, time-to-champion
8. New tab "Retention" surfacing 1+2+7

### Phase 4 — Real-Time + Alerts
1. `GET /stats/feed/stream` — Server-Sent Events endpoint, polls events table every 2s
2. Event-type filter chips on Feed tab
3. `GET /stats/anomalies` — Z-score detection on:
   - Per-level completion rate sudden drop
   - Per-level death rate sudden spike
   - Per-stage avg time anomalies
   - Verified % drop (cheating spike)
4. New tab "Alerts" with anomaly stream
5. **Pre-aggregated daily summary** — new table `stats_daily` populated by cron:
   - `(date, level, starts, completes, deaths, avg_ms, p50_ms, p95_ms, gold_earned, silver_earned)`
   - Endpoints query summary table for `range=all` and `range≥31d` (avoids full event scans)
   - Cron job runs hourly to upsert today + yesterday

### Phase 5 — Polish
1. Mobile-responsive: tables → cards via CSS container queries below 640px
2. Accessibility pass: ARIA labels on charts, keyboard nav for tabs/tables, modal focus trap, ESC to close
3. WCAG AA contrast fixes (lighten gray labels)
4. `POST /admin/flag-player` — flag for review
5. `POST /admin/ban-pid` — soft-ban (record event, optionally reject future events with that PID)
6. Watchlist UI surfaces flagged players + flag/ban buttons
7. `POST /admin/feedback/mark-read` — mark feedback as handled
8. Reduced motion (`prefers-reduced-motion`) — dial back animations

## Deployment Notes

- Each phase is independently deployable (worker + bundle)
- D1 migrations run via `npx wrangler d1 execute ndj-metrics-db --remote --file=migrations/001_indices.sql`
- Build pipeline: `npm run build` produces `src/dashboard.bundle.js` (gitignored), then `wrangler deploy`
- Bundle size budget: target <150KB gzipped (Preact ~3KB + htm ~1KB + uPlot ~30KB + app code)

## Out of scope (per user)
- Secrets relocation
- Auth hardening / brute-force protection
- Login UI improvement

These remain documented as P0 in initial review and should be done before any production deploy.
