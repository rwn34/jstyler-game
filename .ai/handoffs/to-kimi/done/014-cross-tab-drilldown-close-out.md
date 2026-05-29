# Handoff to Kimi — 014: Close Out Cross-Tab Drilldown (Feature 2 from 011)

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Close-out for the partial completion in 011. ~1-1.5 hours. Worker + dashboard.

Handoff 011 wired the URL filter taxonomy (`cc`/`level`/`version`/`named`), the `currentFilters` signal, the `FilterStrip` chip UI, and the hash↔signal sync. **But:** users currently see filter chips with no way to set them (except the alert jump-to-source path), and even if filters are in the URL, none of the tab queries respect them. 014 makes the drilldown actually functional.

---

## Three deliverables

### 1. Server-side filter predicates in `handleStats*` endpoints

Add a shared helper `buildFilterClause(url)` in `index.js` that reads query params and returns `{whereClause, binds}`:

```js
function buildFilterClause(url) {
  const clauses = [];
  const binds = [];
  const cc = url.searchParams.get('cc');
  const level = url.searchParams.get('level');
  const version = url.searchParams.get('version');
  const named = url.searchParams.get('named');

  if (cc && /^[A-Z]{2}$/.test(cc)) {
    clauses.push("JSON_EXTRACT(data, '$._cc') = ?");
    binds.push(cc);
  }
  if (level !== null && level !== '' && /^\d{1,2}$/.test(level)) {
    clauses.push("level = ?");
    binds.push(parseInt(level, 10));
  }
  if (version && version.length < 16 && /^[\w.\-]+$/.test(version)) {
    clauses.push("JSON_EXTRACT(data, '$._v') = ?");
    binds.push(version);
  }
  if (named === '1') {
    clauses.push("name IS NOT NULL AND name != ''");
  }
  // Returns SQL fragment ready to append after an existing WHERE clause:
  return {
    whereClause: clauses.length ? ' AND ' + clauses.join(' AND ') : '',
    binds,
  };
}
```

**Validate input rigorously** — bad filter values from URL should be silently ignored (not throw 400) so a stale bookmark doesn't break the dashboard. The regex checks above are the input gates.

**Apply to these endpoints:**
- `handleStats` (Overview)
- `handleStatsLevels` (Per Level)
- `handleStatsPlayers` (Per Player)
- `handleStatsSessions` (Sessions / Activity)
- `handleStatsEconomy` (Economy)
- `handleStatsFeed` (Live → Feed sub-tab)
- `handleAnomalies` (Live → Alerts sub-tab — already partially affected via alert jump-to-source)

**Do NOT apply** to (intentional — `<FilterIgnoredNotice />` shows when filters are active):
- `handleStatsRetention` — cohort math doesn't make sense filtered mid-stream
- `handleStatsDaily` — daily stage is a singleton; filtering by level is meaningless
- `handleStatsFeedback` — qualitative content; filters don't help

Each affected endpoint:
1. Calls `buildFilterClause(url)` after parsing range/before main queries
2. Concatenates `whereClause` into its WHERE construction (after the existing range filter)
3. Spreads `binds` into the `.bind()` call

### 2. Client-side: clickable filter origins

Make rows in three tables filter-setters. Each click sets the corresponding signal in `currentFilters` (which auto-syncs to URL via main.jsx).

| Origin | Click target | Filter set |
|---|---|---|
| **Platform → Geo** | Country row (the `<tr>` or just the country cell) | `cc=XX` |
| **Platform → Versions** | Version row | `version=<v>` |
| **Per Level** | Level row | `level=<n>` |

UX requirements:
- `cursor: pointer` on the clickable element
- `:hover` state (border highlight or background tint — match existing row hover style if present)
- `title="Filter all tabs by this country"` (or appropriate label) for tooltip
- Click stops propagation if the row already has another click handler (e.g., opening a modal)
- If the clicked filter is already active, clicking removes it (toggle semantics) — small polish, prevents users from being stuck with a filter they can't undo from the origin

### 3. Client-side: pass filters in tab fetch URLs

Add helper to `cloudflare/src/dashboard/api.js`:

```js
import { currentFilters } from './state.js';

export function withFilters(path) {
  const f = currentFilters.value;
  const params = [];
  if (f.cc) params.push('cc=' + encodeURIComponent(f.cc));
  if (f.level) params.push('level=' + encodeURIComponent(f.level));
  if (f.version) params.push('version=' + encodeURIComponent(f.version));
  if (f.named) params.push('named=' + encodeURIComponent(f.named));
  if (params.length === 0) return path;
  return path + (path.includes('?') ? '&' : '?') + params.join('&');
}
```

Each tab that respects filters:
1. Wraps its fetch URL with `withFilters(...)`
2. Subscribes to `currentFilters.value` in its `useEffect` deps (so it re-fetches when filters change)

For tabs that don't respect filters (Retention, Daily, Feedback), do NOT call `withFilters`. Instead, render `<FilterIgnoredNotice />` when any filter is active:

```jsx
// components/FilterIgnoredNotice.jsx (new)
import { currentFilters } from '../state.js';
export function FilterIgnoredNotice() {
  const f = currentFilters.value;
  const hasAny = f.cc || f.level || f.version || f.named;
  if (!hasAny) return null;
  return (
    <div class="filter-ignored-notice">
      ⓘ This tab ignores the active filter(s). Cohort/qualitative data isn't filterable.
    </div>
  );
}
```

Mount at the top of Retention/Daily/Feedback tabs, below the tab header.

---

## Validation plan

### A. Server-side filter behavior

- [ ] `GET /stats/players?range=7d&cc=US` returns rows where event `_cc='US'`. Compare row count to unfiltered call — should be a subset.
- [ ] `GET /stats/levels?level=5` returns only level=5 stats.
- [ ] `GET /stats/players?cc=invalid` returns same as unfiltered (silent ignore, no 400).
- [ ] Combining filters (`?cc=US&level=5&version=1.2.64`) AND-combines correctly.
- [ ] `EXPLAIN QUERY PLAN` on filtered queries — confirm they still use `idx_events_type_server_ts`. Paste output in completion handoff.

### B. Client click-to-filter

- [ ] Click US row in Platform → Geo → URL becomes `…?cc=US`, FilterStrip chip "🌎 US ×" appears
- [ ] Switch to Per Player tab → table refetches with `?cc=US`, shows fewer rows
- [ ] Switch to Per Level → same pattern, level data filtered to US events
- [ ] Click US again → filter toggles off, URL clears, chip removed
- [ ] Click level 5 in Per Level → `?level=5`, chip "🎯 Level 5 ×" appears, other tabs filter accordingly
- [ ] Click clear-all in FilterStrip → all chips gone, URL clears, all tabs refetch unfiltered

### C. FilterIgnoredNotice

- [ ] Apply any filter → switch to Retention → `<FilterIgnoredNotice />` visible at top
- [ ] Clear all filters → notice disappears
- [ ] Same for Daily and Feedback tabs

### D. Bookmark survival

- [ ] Bookmark `https://ndj-metrics.jstylr.workers.dev/dashboard#/players?cc=US&level=5` → reload from cold → both filters applied on first render, no flicker

### E. Performance

- [ ] Overview with filter (`?cc=US`): response <500ms
- [ ] Per Player with filter (`?cc=US`): response <800ms
- [ ] Per Level with filter (`?version=1.2.64`): response <800ms
- [ ] If any blow the budget, flag in completion handoff — phase 2.5 column promotion may be needed

### F. Playwright

- [ ] New test 30: click country row in Platform → Geo → URL has `cc=XX`, FilterStrip chip visible
- [ ] New test 31: filter persists across tab switch → switch tabs, assert filter still in URL and chip still shown
- [ ] New test 32: clear-all wipes filters → all chips gone, URL clean
- [ ] New test 33: FilterIgnoredNotice shows on Retention when filter active
- [ ] All existing 29 tests still pass
- [ ] Regenerate baselines for any tabs whose layout changed (FilterStrip render — most tabs)

---

## Self-grep-verify (REQUIRED per AGENTS.md §7)

Include in your completion handoff at **`to-claude/open/014-...-complete.md`** (not done/ — see process note below):

```bash
# Server filter helper exists and is applied
rg -n "buildFilterClause" cloudflare/src/index.js

# Each endpoint that should respect filters now calls it
rg -n "buildFilterClause\\(url\\)" cloudflare/src/index.js | wc -l  # expect 7 (or list each)

# Client withFilters helper
rg -n "withFilters" cloudflare/src/dashboard/api.js
rg -n "withFilters\\(" cloudflare/src/dashboard/tabs/

# Clickable origins
rg -n "currentFilters\\.value.*cc\\s*=|setFilter\\(.*cc" cloudflare/src/dashboard/tabs/Platform.jsx
rg -n "currentFilters\\.value.*level\\s*=|setFilter\\(.*level" cloudflare/src/dashboard/tabs/Levels.jsx

# FilterIgnoredNotice mounted
rg -n "FilterIgnoredNotice" cloudflare/src/dashboard/

# Playwright tests for filter behavior
rg -n "cc=US|level=5|FilterIgnoredNotice|filter.*persist" cloudflare/tests/dashboard.spec.js
```

---

## Process notes — both apply

1. **Completion handoff goes to `to-claude/open/`**, not directly to `done/`. The workflow is: write to `open/` → I read + verify + append review → I move to `done/`. Handoffs 010 and 013 went straight to `done/`, which means I almost missed them. 011 and 012 hit the right directory this batch — please match that for 014.

2. **AGENTS.md §7** still in force: grep snippets next to each claim. Substance has been good lately; the trajectory is converging. Keep it up.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/src/index.js` (buildFilterClause helper + ~7 endpoints apply it) |
| Modify | `cloudflare/src/dashboard/api.js` (withFilters helper) |
| Modify | `cloudflare/src/dashboard/tabs/Platform.jsx` (clickable Geo + Versions rows) |
| Modify | `cloudflare/src/dashboard/tabs/Levels.jsx` (clickable level rows) |
| Modify | `cloudflare/src/dashboard/tabs/{Overview,Players,Sessions,Activity,Economy,Live}.jsx` (use withFilters in fetches; add `currentFilters.value` to useEffect deps) |
| Modify | `cloudflare/src/dashboard/tabs/{Retention,DailyStage,Feedback}.jsx` (mount FilterIgnoredNotice) |
| New | `cloudflare/src/dashboard/components/FilterIgnoredNotice.jsx` |
| Modify | `cloudflare/src/dashboard/dashboard.css` (.filter-ignored-notice, clickable-row hover state) |
| Modify | `cloudflare/tests/dashboard.spec.js` (+4 tests minimum) |

No new migration, no new schema. JSON_EXTRACT predicates use existing data shape.

---

## Out of scope (track but defer)

- **Column promotion** of `_cc` / `_v` from JSON to indexed columns — only do if validation E shows perf >800ms. That's phase 2.5.
- **OR filters** — only AND combinations in v1.
- **`named` filter UI** — the server-side predicate exists; the client UI (e.g., a toggle in Per Player) can wait if other items take longer. Just ensure URL bookmark `?named=1` works.
- **Filter analytics** — which filters are most-used. Different sprint.
- **Filter-aware CSV exports** — CSVs export whatever the current table shows, so filters naturally apply. Don't add per-tab export-filtering logic.

---

## Sequencing

1. `buildFilterClause` helper + apply to one endpoint (say Per Level) — prove the pattern
2. `withFilters` API helper + wire one tab fetch (say Per Level reads `level` filter into URL)
3. Click-to-filter on Per Level rows — full round-trip working for one origin/target
4. Apply pattern to remaining 6 endpoints + 5-6 affected tabs
5. FilterIgnoredNotice component + mount on Retention/Daily/Feedback
6. Run Playwright (existing 29 should pass; add new 30-33)
7. Perf check via EXPLAIN QUERY PLAN
8. Deploy
9. Move handoff to `to-kimi/done/`, write completion handoff to **`to-claude/open/`** with grep snippets

---

## After 014 lands

Sprint 2 phase 3 is essentially complete. Remaining backlog:
- **Players 9-tables → 3-tables consolidation** (original UX audit P1)
- **Phase 2.5 anti-fraud referrals** (waits for real data)
- **Phase 2.5 column promotion** (if perf in 014 validation E pushes it)
- **Filter chip CSS polish** (minor)
- **Git history scrub** (parked)

I'll write the Players consolidation handoff if you want phase 3 fully closed. Otherwise, this might be a natural stopping point for the dashboard refactor cycle — let real users drive the next batch.
