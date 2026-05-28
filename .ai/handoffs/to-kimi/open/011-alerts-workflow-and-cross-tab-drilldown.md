# Handoff to Kimi — Sprint 2 Phase 3 Pair: Alerts Workflow + Cross-Tab Drilldown

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Bigger handoff — ~2-3 hours, split into two related features. Worker + dashboard.

Two original UX-audit P1 items that share infrastructure (URL-state for filters). Bundling because the second needs the first's URL routing pattern.

**Soft dependency on 010** (sub-tab URL consumption) — if 010 isn't landed first, the cross-tab drilldown filter strip won't survive a sub-tab change cleanly. Land 010 before this if at all possible. If you must do this first, document the limitation in your completion handoff and we'll close it in a follow-up.

---

## Feature 1 — Alerts ack/mute/jump-to-source

Today's Alerts is a passive list. Operators see anomalies but can't acknowledge, snooze, or navigate to the affected metric. Make it a workflow.

### Server side

New table `alerts_state`:

```sql
CREATE TABLE IF NOT EXISTS alerts_state (
  alert_id TEXT PRIMARY KEY,         -- stable hash of the anomaly signature: type|level|date
  status TEXT NOT NULL,              -- 'open' | 'acked' | 'muted'
  acked_at INTEGER,
  acked_by TEXT,                     -- DASHBOARD_KEY-authed admin; for now hardcode 'dashboard'
  mute_until INTEGER                 -- epoch ms; NULL if not muted
);
```

`migrations/005_alerts_state.sql` adds it. Idempotent CREATE.

New endpoints (admin, auth-gated like the rest of `/admin/`):
- `POST /admin/alerts/ack` body `{alert_id}` → status='acked', acked_at=now
- `POST /admin/alerts/mute` body `{alert_id, days}` → status='muted', mute_until=now+days*86400e3
- `POST /admin/alerts/unack` body `{alert_id}` → DELETE the row (returns to open)

Modify `handleAnomalies` (or `handleStatsAlerts` — whichever the dashboard calls) to LEFT JOIN `alerts_state` and:
- Include `status`, `mute_until`, `acked_at` in each alert row's response shape
- Filter out alerts where `status='muted' AND mute_until > now()`
- Auto-unmute (DELETE) expired mute rows in the same query OR in a tiny cron task

**Alert ID stability:** the alert_id needs to be deterministic from the anomaly's identity, not random. Suggested: `sha256(date + '|' + type + '|' + level + '|' + threshold_kind).slice(0,16)`. Whatever you pick, paste the formula in your completion handoff.

### Dashboard side

In the Alerts sub-tab of Live (`tabs/Live.jsx` likely contains it):

- Each alert row gets two buttons: `✓ Ack` and `🔕 Mute (24h)` (default; consider a small dropdown for 1h/24h/7d if trivial).
- On ack/mute: optimistic UI updates the row immediately, fires the POST, on failure reverts with an error toast.
- Acked alerts: grayed out + show a small "Acked 5m ago" caption. Sorted to bottom.
- Muted alerts: hidden from the default list. A toggle "Show N muted" reveals them at the bottom.
- Add an "Unack" button on acked rows for reversing a misclick.

### Jump-to-source

Each alert is about an affected metric — e.g., "Death rate spike on level 5" or "DAU collapse on 2026-05-27." Add a small `🔗 Jump` button per alert that navigates to the appropriate tab + filter:

| Alert kind | Destination |
|---|---|
| Per-level anomaly (deaths, completes, time) | Per Level tab with `level` filter applied |
| DAU/MAU/session anomaly | Overview with `range` set to the alert's window |
| Geo anomaly (sudden region) | Platform → Geo with `cc` filter |
| Version anomaly | Platform → Versions with `version` filter |
| Economy anomaly | Economy tab with relevant range |
| Player-specific (e.g., banned player still active) | Per Player with that PID's modal open |

Use the `writeHash` pattern (post-010) including filter params.

---

## Feature 2 — Cross-tab drilldown via URL filter state

Today, clicking a row in Geo doesn't filter anything elsewhere. Make rows clickable filter-setters with URL-state persistence.

### Filter taxonomy (start small)

Six URL filter params:
- `cc` (country code, 2 letters)
- `level` (0-19 or 'daily')
- `version` (app version string)
- `named` (1/0 — players who set a display name)
- `range` (already exists)
- `pid` (already exists for modal)

Filter state lives in the URL hash via `parseHash` / `writeHash`. Signal-backed: when URL changes, signals update; when signals change, URL updates.

### Filter strip

When any filter (except range, which has its own selector) is active, render a strip at the top of the dashboard (just below the tab strip):

```
Filters:  [🌎 US ×]  [🎯 Level 5 ×]  [Clear all]
```

Each chip has an `×` to remove that filter. "Clear all" wipes them. The chip's label includes the human-readable value.

### Clickable filter origins

Make these clickable to push a filter:
- Geo table row → `?cc=XX` filter, navigates to Overview (or stays on current tab if you want; document)
- Per Level row → `?level=N`
- App Ver row → `?version=...`
- Players segment chip → `?segment=...` (already wired post-sprint-2-phase-1)

### Tabs that respect filters

Every tab fetching `/stats/*` data should include the current filter values as query params. Server (`handleStats*` family in `index.js`) needs new `cc`/`level`/`version`/`named` query-param handling.

Approach for scope control: filter affects the WHERE clause of the tab's main queries via predicates like `JSON_EXTRACT(data,'$._cc') = ?`. JSON_EXTRACT performance again — track as phase 2.5 if it bites.

**Minimum viable subset:** only Overview, Per Level, Players, Sessions, Economy, Activity, Live need filter support. Daily/Retention/Feedback can ignore filters with a `<FilterIgnoredNotice />` mini-banner explaining why. Document which tabs respect which filters.

---

## Validation

### Alerts workflow

- [ ] Ack an alert → row grays out, "Acked Xs ago" caption appears
- [ ] Reload page → still acked (state persisted in `alerts_state`)
- [ ] Unack → row returns to active state
- [ ] Mute 24h → row hidden from default view; toggle "Show muted" reveals
- [ ] Wait 24h+1m (or manually expire `mute_until` via D1) → row reappears as active
- [ ] Jump-to-source on a per-level alert → URL becomes `#/levels?level=5` (or wherever the level tab lives), Per Level tab opens with row 5 highlighted

### Cross-tab drilldown

- [ ] Click a country in Geo → URL gains `cc=XX`, current tab refetches with filter, filter strip appears
- [ ] Switch tabs → filter persists (URL-state), each tab re-fetches with the filter applied
- [ ] Clear single filter (chip ×) → URL drops it, tabs refetch
- [ ] Clear all → strip disappears, all filters cleared, tabs return to unfiltered view
- [ ] Bookmark `?cc=US&level=5` → on reload, both filters reapply

### Tests

- [ ] All 25+ existing Playwright tests still pass
- [ ] New tests: ack persistence, mute hide/show, filter chip clear, cross-tab filter persistence

---

## Self-grep-verify (REQUIRED — AGENTS.md §7)

```bash
rg -n "alerts_state|handleAdminAlertsAck|handleAdminAlertsMute" cloudflare/src/index.js
rg -n "alert_id|mute_until" cloudflare/migrations/005_alerts_state.sql
rg -n "Ack|Mute|Jump|status.*'acked'" cloudflare/src/dashboard/tabs/Live.jsx
rg -n "cc=|level=|version=|named=" cloudflare/src/dashboard/lib/url.js
rg -n "FilterStrip|filter-chip|currentFilters" cloudflare/src/dashboard/
rg -n "filter persists|ack persistence|mute hide" cloudflare/tests/dashboard.spec.js
```

Same enforcement as 010. Completion handoff file + grep snippets are both required.

---

## Files

| Action | File |
|---|---|
| New | `cloudflare/migrations/005_alerts_state.sql` |
| Modify | `cloudflare/src/index.js` (3 new endpoints + LEFT JOIN in handleAnomalies + filter params in handleStats*) |
| Modify | `cloudflare/src/dashboard/lib/url.js` (filter params in parse/write hash) |
| Modify | `cloudflare/src/dashboard/state.js` (filter signals) |
| Modify | `cloudflare/src/dashboard/App.jsx` (FilterStrip render) |
| New | `cloudflare/src/dashboard/components/FilterStrip.jsx` |
| Modify | `cloudflare/src/dashboard/tabs/Live.jsx` (ack/mute UI + jump links) |
| Modify | `cloudflare/src/dashboard/tabs/Geo.jsx` (clickable rows — wait, this was deleted in sprint-2-phase-1 — apply to `Platform.jsx` Geo sub-tab instead) |
| Modify | Other tabs that respect filters (Overview, Per Level, Players, Sessions, Economy, Activity, Live) |
| Modify | `cloudflare/tests/dashboard.spec.js` |

---

## Scope guardrails (out of scope — explicit defer)

- Filter combinations beyond AND (no OR filters in v1)
- Server-side filter validation beyond basic type checks
- Filter analytics ("which filters are most-used") — separate
- Mute durations beyond 1h/24h/7d — separate
- Email/webhook notifications on alerts — separate
- Re-triage of historical alerts after a definition change — separate
- Column promotion of `_cc`/`_v` from JSON to indexed columns — flagged as phase 2.5 if perf bites

If you find the filter scope expanding (e.g., "I need to add OR support to make Per Level work properly") — STOP and write to `to-claude/open/` before expanding. Stay surgical.

---

## Sequencing

1. Migration 005 + alert state endpoints
2. Modify handleAnomalies to JOIN/filter
3. Alerts UI: ack/mute buttons + persistence
4. Jump-to-source for one alert kind (per-level) — prove the pattern
5. Repeat for remaining alert kinds
6. URL filter taxonomy + FilterStrip component
7. Wire clickable filter origins (start with Geo + Per Level)
8. Modify tab queries to respect filters (one tab at a time)
9. Playwright tests
10. Deploy + smoke + completion handoff with grep snippets

If 2-3 hours feels too tight, ship in two PRs: Feature 1 (Alerts workflow) first, Feature 2 (cross-tab drilldown) second. Each is a coherent unit.
