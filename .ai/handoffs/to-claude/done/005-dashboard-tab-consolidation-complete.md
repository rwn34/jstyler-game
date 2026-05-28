# Handoff: Dashboard Tab Consolidation Complete (RESOLVED)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-27 (handoff header says 2026-05-16 — typo)
**Resolved:** 2026-05-27 by claude-code orchestrator
**Live deploy:** Worker version `af11600f-e103-4b71-96bd-dd16278683fc`

---

## Verdict: ✅ Sprint 2 phase 1 accepted with 5 documented deviations + 1 validation gap.

All structural goals hit. Deviations are reasonable. The validation gap is real and warrants a follow-up before we close the book.

---

## What Kimi delivered

15 → 10 tabs, ship-ready and live:
- New: `Activity.jsx` (Sessions+Engagement), `Live.jsx` (Feed+Alerts), `Platform.jsx` (Geo+AppVer+Sync)
- New shared: `SubTabs.jsx` with `role="tablist"` + arrow-key nav
- Players gained 7 segment chips (All / New / Active / Returning / Champions / 🚩 Flagged / ⛔ Banned)
- 8 old tab files deleted (`Alerts`, `AppVersion`, `Engagement`, `Feed`, `Geo`, `Sessions`, `Sync`, `Watchlist`)
- URL aliasMap with backward-compat redirects for all 8 old hashes
- Commit `08e9e09` (30 files, +1473/-844), pushed to master, deployed.

Build + auth + API smoke (`/stats/players`) all passed.

---

## Deviations from spec — acceptance decisions

### D1. Bundle size didn't shrink ⚠️ ACCEPTED
Spec target was ≤165 KB (ideally ~150 KB). Actual: 1091 KB raw / ~363 KB gzip (≈ +3 KB vs prior).

**My mistake on the target.** The "165 KB minified" baseline I cited came from the original 5-phase dashboard overhaul activity log entry — before the ~12 admin endpoints + recovery-code UI + matrix drilldown + retention slow-path were added. By the time I wrote handoff 005, the real baseline was already ~360 KB gzip; my target was based on stale info.

Kimi correctly chose NOT to scope-creep into bundle optimization (which would require code-splitting / lazy-loading sub-tabs / shared-logic extraction — all real work, all out of this sprint).

**Future sprint:** if bundle size becomes a perceived load-time issue, add a separate "dashboard bundle slimming" sprint with concrete targets based on real measurements. Not now.

### D2. Players segment chips show/hide instead of unified filter list ✅ ACCEPTED
`/stats/players` returns pre-segmented tables (Recently Active, New, Returning, Champions, etc.). The unified-list filter pattern I imagined would require a backend change — explicitly out of scope.

Flagged/Banned segments correctly fetch `/stats/flagged-players` separately and inline the old Watchlist UI. Functional parity preserved.

### D3. Sub-tab state not in URL ⚠️ ACCEPTED with follow-up tracker
My spec said `#platform/geo`, `#live/feed`. Kimi kept main tab in URL but sub-tab is internal state. Old-hash aliases (`#geo` → Platform tab) still work, but they always land on the default sub-tab — operators who bookmarked "Platform → Versions" specifically lose deep-linkability.

**Tracker for follow-up sprint:** add hash-sub-route parsing so `#platform/versions` is honored on first load and reflected on sub-tab clicks. Estimated effort: ~30 min. Low priority — bookmarks of specific sub-tabs are an edge case.

### D4. Activity CSV exports only Sessions-derived data ✅ ACCEPTED
Engagement-derived visuals (PWA funnel, button-click distribution) were chart-only in the old Engagement tab too. No regression.

### D5. Compare-period toggle only on Sessions section ✅ ACCEPTED
Same as D4 — matches pre-refactor behavior. The original audit flagged this inconsistency as a P1 item ("extend Compare to Levels, Geo, Engagement") — it's a separate piece of work, not scope-creep into this refactor.

---

## ⚠️ Validation gap — needs follow-up

> "End-to-end browser validation of hash aliases, sub-tab navigation, segment chips, and data parity was **not run** — requires manual browser testing or Playwright. The API-level smoke test confirms the backend endpoints still respond correctly."

The new dashboard is **deployed live** but we don't actually know if:
1. The URL aliasMap redirects work in a real browser (could be a typo causing `#sync` to land on Live instead of Platform)
2. SubTabs renders without console errors
3. Segment chips actually filter the tables
4. Data parity holds (top-5 countries on new Platform tab match top-5 on old Geo tab for the same range)
5. Live tab Feed polling still works after the merge
6. Activity tab compare-period toggle still produces sensible deltas

Two paths to close this:

**Option A — spawn an `e2e-tester` (Playwright)**: walks all 10 tabs, every sub-tab, every chip, captures screenshots, checks no console errors. ~5 minutes of agent time. Saves a baseline for future regression detection.

**Option B — manual click-through by user**: open `https://ndj-metrics.jstylr.workers.dev/dashboard`, paste the cookie or log in, walk the tabs. ~10 minutes of human time.

**Recommend Option A.** The Playwright baseline pays for itself the next time someone refactors the dashboard.

---

## Acknowledgements

- Clean execution on the structural goals (SubTabs component, aliasMap, 8 files deleted, commit pushed).
- Transparent up-front reporting of all 5 deviations — exactly the format we want.
- API smoke as a gating check before deploy was the right call.
- Documented file-by-file change list makes review easy.

---

## What's open

- **Validation gap** (above) — needs Option A or B before we can call sprint 2 phase 1 *closed*.
- **D3 sub-tab URL state** — tracker for a future polish sprint.
- **Sprint 2 phase 2 candidates** (not blocking this sprint):
  - `/admin/referrals` endpoint + Per Player referrals widget (depends on Kiro's QR-share work landing first — `to-kiro/open/005-qr-share-and-feedback-button.md`)
  - Cross-tab drilldown (click country → filter all tabs)
  - Global filter bar (country / version / named)
  - Alerts acknowledge/mute/jump-to-source workflow
  - Players 9-tables → 3-tables consolidation
  - Overview "health verdict" badge
  - Data-freshness indicator per tab
  - O1 from sprint 1: extend per-(username, mmyy) lockout to `/sync/load` and `/sync/save`

This handoff is resolved subject to the validation gap being closed.
