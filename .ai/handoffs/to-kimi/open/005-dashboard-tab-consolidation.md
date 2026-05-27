# Handoff to Kimi — Dashboard Tab Consolidation (Sprint 2 — Phase 1)

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-27
**Status:** Ready to action. Cloudflare dashboard lives in `cloudflare/src/dashboard/` — your lane. This is the highest-impact UX win from the original audit at `.ai/reports/dashboard-ux-audit-2026-05-26.md` and `.ai/reports/cloudflare-comprehensive-review-2026-05-26.md` (search "P0 fixes" / "P1 structural").

---

## Goal — collapse 15 tabs down to 10 with zero data loss

User-approved approach: **Option A (conservative).** 4 merges, no data removed, every existing URL still resolves via aliasMap. 8 tabs would be the aggressive variant — explicitly rejected for this sprint.

### Target tab list (in this order)

| # | New tab | Source tab(s) being merged | Notes |
|---|---|---|---|
| 1 | Overview | Overview | unchanged |
| 2 | Per Level | Per Level | unchanged |
| 3 | Per Player | Per Player + 🚩 Watchlist | Watchlist becomes a segment chip |
| 4 | Retention | Retention | unchanged |
| 5 | **Activity** | Sessions + Engagement | new merged tab |
| 6 | Economy | Economy | unchanged |
| 7 | 🔥 Daily | DailyStage | unchanged |
| 8 | **Live** | Live Feed + ⚠ Alerts | new merged tab |
| 9 | **Platform** | App Ver + Geo + Cloud Sync | new merged tab with sub-tabs |
| 10 | Feedback | Feedback | unchanged |

Net: −5 tabs (Watchlist, Engagement, Alerts, AppVersion, Geo, Sync removed as standalone; +0 net since merge targets reuse code). 🔥/⚠ emoji that signal time-sensitivity move into the merged tab strip where applicable.

---

## File-level work

### New / merged tabs

| Action | File | Replaces |
|---|---|---|
| New | `cloudflare/src/dashboard/tabs/Activity.jsx` | `Sessions.jsx` + `Engagement.jsx` |
| New | `cloudflare/src/dashboard/tabs/Live.jsx` | `Feed.jsx` + `Alerts.jsx` |
| New | `cloudflare/src/dashboard/tabs/Platform.jsx` | `Geo.jsx` + `AppVersion.jsx` + `Sync.jsx` |
| Modify | `cloudflare/src/dashboard/tabs/Players.jsx` | + Watchlist as a segment chip |
| Delete | `Sessions.jsx`, `Engagement.jsx`, `Feed.jsx`, `Alerts.jsx`, `Geo.jsx`, `AppVersion.jsx`, `Sync.jsx`, `Watchlist.jsx` | 8 files removed |

### New shared component

`cloudflare/src/dashboard/components/SubTabs.jsx` — thin (~40 LOC) sub-tab strip used inside **Platform** (Geo / Versions / Sync) and **Live** (Alerts / Feed). Patterns to follow:
- `role="tablist"`, `aria-selected`, arrow-key nav (mirror `Tabs.jsx`)
- URL hash format: `#platform/geo`, `#platform/versions`, `#platform/sync`, `#live/alerts`, `#live/feed`
- Default sub-tab if none in hash: leftmost (Geo, Alerts)

### Tab registry

`cloudflare/src/dashboard/components/Tabs.jsx` — replace `TABS` array with the 10-tab target list above. Keep emoji prefixes for visual cues.

### URL hash aliasMap

`cloudflare/src/dashboard/lib/url.js` — add a small alias table for backward compat. Required entries:

```js
const TAB_ALIASES = {
  // Old → new
  'watchlist':  'players?segment=flagged',
  'sessions':   'activity',
  'engagement': 'activity',
  'feed':       'live/feed',
  'alerts':     'live/alerts',
  'geo':        'platform/geo',
  'appversion': 'platform/versions',
  'sync':       'platform/sync',
};
```

Apply on `applyHash` read; rewrite the URL in place via `replaceState` so users see the new canonical hash.

---

## Per-merge implementation sketch

### M1. Players + Watchlist

Add a segment chip strip above the existing 9 player tables:
```
All · New · Active · Returning · Champions · 🚩 Flagged · ⛔ Banned
```
- Each chip filters the player list by `flag` (use existing `/admin/flag-list` data — already joined in PlayerModal).
- "All" segment shows current Players-tab content unchanged.
- "🚩 Flagged" / "⛔ Banned" segments show what Watchlist.jsx currently shows.
- URL hash: `#players` (default = All) or `#players?segment=flagged`.
- Watchlist actions (Flag/Ban/Unflag/Unban) stay attached to the player row regardless of segment — they're already in PlayerModal.

### M2. Activity (Sessions + Engagement)

Single tab, two card rows + heatmaps:
- **Top row — Lifecycle:** total sessions (range), p50/p95 session length, sessions/player avg, sessions hourly heatmap (24h), DOW × hour heatmap. Pulled from current `Sessions.jsx`.
- **Bottom row — Quality:** heartbeats/session avg, PWA install rate + funnel, return-day rate, time-on-app distribution. Pulled from current `Engagement.jsx`.
- Single shared `range` filter applies to both rows.
- Single CSV export combining both datasets (offer separate export buttons too).

Fix the **UTC vs UTC+7 caption inconsistency** while you're in there (Sessions.jsx had one label as UTC, another as UTC+7 — the original UX audit flagged it). Unify to UTC+7 since the footer already commits to it.

### M3. Platform (Geo + AppVersion + Sync)

Three sub-tabs via the new `<SubTabs />` component:
- **Geo** — country/region table + map (whatever Geo.jsx does today)
- **Versions** — adoption time-series, lagging count, version-specific player count
- **Sync** — sync health, device-cap stats, sync_attempts failure rate, recovery-code adoption %

URL: `#platform/{geo|versions|sync}`. Default sub-tab: Geo.

### M4. Live (Feed + Alerts)

Single tab; Alerts at top as cards (one per active anomaly, acknowledgable); Feed below with chip filters. Selecting an alert sets a filter on the feed below ("show events matching this anomaly's signature"). Pause toggle is global. Polling cadence is whichever Feed currently uses (~2-5s).

---

## Validation plan — Kimi runs this BEFORE deploy

Each item must pass. Mark a checkbox in your completion handoff back to claude.

### A. URL hash compatibility

- [ ] Open `https://ndj-metrics.jstylr.workers.dev/dashboard#watchlist` → loads Players tab, "🚩 Flagged" chip preselected, URL silently rewrites to `#players?segment=flagged`.
- [ ] Same test for `#sessions`, `#engagement`, `#feed`, `#alerts`, `#geo`, `#appversion`, `#sync` — each lands on the correct new tab/sub-tab with URL rewrite.
- [ ] Bookmark each old hash; reload; still works (no broken bookmarks).

### B. Data parity

For each merged tab, compare KPI numbers against a known-good period (e.g. last 7d) BEFORE and AFTER:

- [ ] **Activity:** sessions count, p50 session length, heartbeats/session, PWA install rate — each number on the new tab matches the corresponding old-tab number to the digit.
- [ ] **Platform → Geo:** top-5 countries identical to old Geo tab.
- [ ] **Platform → Versions:** version adoption percentages identical to old AppVer tab.
- [ ] **Platform → Sync:** device-cap stats identical to old Sync tab.
- [ ] **Live → Alerts:** alert count + severity distribution identical to old Alerts tab.
- [ ] **Live → Feed:** event stream identical to old Feed tab (modulo natural drift from polling).
- [ ] **Players → 🚩 Flagged chip:** rows match old Watchlist tab.

### C. Admin actions still work

- [ ] Flag a test player from Per Player (🚩 Flagged chip view) → player moves to Flagged segment, network call hits `/admin/flag-player` with same payload as before.
- [ ] Unflag → player moves back to All.
- [ ] Ban → moves to ⛔ Banned segment.
- [ ] Unban from ⛔ Banned segment.
- [ ] All four work identically from the inline row and from PlayerModal.

### D. CSV export

- [ ] Activity CSV exports both lifecycle + quality columns.
- [ ] Platform CSV exports each sub-tab independently (or one combined — your call, document which).
- [ ] Live → Alerts CSV unchanged.
- [ ] Per Player CSV filtered by current segment.

### E. Compare-period toggle

- [ ] Where it worked before (Overview, Sessions, Economy), it still works on the merged Activity tab.
- [ ] Disabled gracefully on tabs/sub-tabs that didn't support it (Platform → Sync, etc.) — show the "Compare unavailable" hint per the original audit recommendation if you want a bonus polish item.

### F. Accessibility

- [ ] `<SubTabs />` has `role="tablist"`, each sub-tab has `aria-selected` and arrow-key nav (matches existing `Tabs.jsx` behavior).
- [ ] Focus-visible outlines preserved on the new tab buttons.
- [ ] `aria-pressed` on the Players segment chips.
- [ ] Skip link still skips into main content (verify with Tab from the URL bar).
- [ ] Run a quick a11y check: in Chrome DevTools → Lighthouse → Accessibility. Should stay ≥ the current score.

### G. Mobile (narrow viewport)

- [ ] Open on a 380px-wide viewport (Chrome DevTools device toolbar). Tab bar horizontally scrolls (already works); the 10-tab list should still need scroll on phones but less than 15.
- [ ] Platform sub-tabs reflow correctly under main tab bar.
- [ ] No tab text wraps or clips.

### H. Polling / cache

- [ ] `CHECK NOW` button on Live still works.
- [ ] Activity tab data freshness indicator (if you ship one) shows correctly.
- [ ] Pause toggle on Live pauses both alerts refresh AND feed polling.

### I. Visual regression (optional but cheap)

If you have time: spin up a one-shot Playwright snapshot per new tab + each sub-tab. Save under `tests/cloudflare/dashboard/visual/{tabname}.png`. Future regressions caught for free.

### J. Smoke against staging-equivalent

If `wrangler dev` works locally with prod D1 (read-only):
- [ ] `cd cloudflare && npm run dev` → open `http://localhost:8787/dashboard`
- [ ] Walk through all 10 tabs, every sub-tab, every chip → no console errors, no 4xx/5xx in network panel.
- [ ] Same walk-through on prod after deploy (no D1 mutations needed — read-only).

---

## Constraints

- **Backend untouched.** No new endpoints, no D1 changes. This is pure frontend refactor.
- **Same data, same UI primitives.** Reuse existing `<Card>`, `<Table>`, `<Heatmap>`, `<Funnel>`, `<LineChart>`, `<AreaChart>`, `<EmptyState>`, `<LoadingPane>`, `<ErrorState>`. The point of the merge is to reduce navigation, not to redesign components.
- **Bundle size.** Current dashboard bundle is 165KB minified. After the merge it should be **smaller** (fewer top-level routes, more shared loading/empty/error state). Run `npm run build` and report new size in your handoff back — should be ≤ 165KB, ideally ~150KB.
- **No new dependencies.** Stay on Preact + htm + signals + uPlot.

---

## Deferred — NOT in scope this sprint

- Cross-tab drilldown (click a country → filter all tabs by country). That's a separate larger feature.
- Global filters bar (country/version/named). Same — separate sprint.
- Alerts acknowledge/mute/jump-to-source workflow. Separate.
- Players-tab consolidation from 9 tables to 3. Separate.
- Overview "health verdict" badge. Separate.
- Data-freshness indicator per tab. Separate.

These were all in the audit P1 list — they're real, just bigger pieces. This sprint is **purely the tab-count reduction** so we can land a small, reviewable, reversible refactor first.

---

## Sequencing inside the sprint

Suggested order:
1. `SubTabs.jsx` component (foundation for M3 + M4)
2. `lib/url.js` aliasMap (so links don't break mid-refactor)
3. M1 Players + Watchlist (smallest, validates segment-chip pattern)
4. M3 Platform (uses SubTabs, three sub-tabs)
5. M4 Live (uses SubTabs, two sub-tabs)
6. M2 Activity (no SubTabs, just card consolidation)
7. Tabs.jsx update (registry to new 10-tab list)
8. Delete old `.jsx` files
9. Local validation walkthrough (sections A–J above)
10. `npm run build` → confirm bundle size delta → deploy

Land each merge as its own commit so reverts are surgical.

---

## When you're done

1. Run the validation plan; record results in the handoff back.
2. Report final bundle size.
3. Prepend a build entry to `.ai/activity/log.md`.
4. Write a completion handoff to `.ai/handoffs/to-claude/open/005-dashboard-tab-consolidation-complete.md` with: validation checklist results, files added/removed/modified, any deviations from this spec and why, screenshots if visual regression was run.
5. Move this handoff to `.ai/handoffs/to-kimi/done/`.

I'll re-verify against the live dashboard and the working tree (read-only) before approving as "sprint 2 phase 1 done."

If anything in this spec doesn't fit reality (e.g., a data dependency between two old tabs that I missed), write to `to-claude/open/` BEFORE refactoring — better to align than to redo.
