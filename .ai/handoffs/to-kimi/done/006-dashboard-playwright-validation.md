# Handoff to Kimi — Dashboard Playwright Validation (sprint 2 phase 1 closeout)

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-27
**Status:** Small follow-up to close the validation gap from `to-claude/done/005-dashboard-tab-consolidation-complete.md`. Sprint 2 phase 1 is shipped live (`af11600f-...`) but the new UI was only API-smoke-tested, not actually walked in a browser. This handoff closes that gap.

Playwright is already set up in `cloudflare/package.json` (`"@playwright/test": "^1.60.0"` in devDependencies). You should be able to write + run tests directly from `cloudflare/`.

---

## Goal

Produce a Playwright test file + screenshot baseline that proves the live dashboard works end-to-end. After this lands, sprint 2 phase 1 is officially closed.

---

## What to build

Add a test file at `cloudflare/tests/dashboard.spec.js` (create the `tests/` directory if it doesn't exist). One file, one suite, the checks below.

### Setup

- Target: `https://ndj-metrics.jstylr.workers.dev/dashboard`
- Auth: POST to `/auth` with `{ password: <DASHBOARD_KEY> }` first, capture the cookie, pass it into the page context. Read `DASHBOARD_KEY` from `process.env.DASHBOARD_KEY` so the test doesn't hardcode it.
  - If you want to keep this CI-friendly, gate on `process.env.DASHBOARD_KEY` being set; skip the suite if missing.
- Set viewport: 1280×800 for the desktop run.

### Checks (one Playwright test per row)

| # | Test | Assert |
|---|------|--------|
| 1 | Landing | Dashboard loads, no console errors, no 4xx/5xx in network |
| 2 | Tab strip has exactly 10 tabs | `[role="tab"]` count === 10. Tab labels match `Overview, Per Level, Per Player, Retention, Activity, Economy, 🔥 Daily, Live, Platform, Feedback` (or your real registry) |
| 3 | `#watchlist` aliases to Players + Flagged segment | Navigate to `#watchlist`, wait for hash to settle, assert `location.hash` matches `players` (any form) AND the Flagged chip is visually selected. |
| 4 | `#sessions` aliases to Activity | Hash rewrites; Activity tab is selected. |
| 5 | `#engagement` aliases to Activity | Same. |
| 6 | `#feed` lands on Live (Feed sub-tab active) | Live tab selected; verify the Feed sub-area visible. |
| 7 | `#alerts` lands on Live (Alerts sub-tab active) | Live selected; Alerts area visible. |
| 8 | `#geo` → Platform | Platform tab selected; Geo sub-area visible. |
| 9 | `#appversion` → Platform | Platform; Versions sub-area visible. |
| 10 | `#sync` → Platform | Platform; Sync sub-area visible. |
| 11 | SubTabs render | On Platform, three sub-tabs present with `role="tab"` and arrow-key nav reachable. On Live, two sub-tabs. |
| 12 | Segment chips filter | On Players: click "Flagged" chip → API call to `/stats/flagged-players` fires (intercept via `page.route`) AND the visible table contains only flagged rows. Same for "Banned" with /stats/flagged-players ban filter. |
| 13 | Live feed polling | Open Live → confirm a poll-fetch to `/stats/feed/stream` (or whatever the endpoint is) fires within 5s. Pause toggle → next interval doesn't fire. |
| 14 | Activity compare toggle | Open Activity, enable Compare → API call includes `before=` param → previous-period delta renders without throwing |
| 15 | No console errors on full walk | Walk all 10 tabs sequentially; `page.on('console')` collects errors; assert 0 errors |
| 16 | Visual snapshot per tab | For each main tab (and sub-tab), `await page.screenshot({ path: 'tests/dashboard/visual/<tab>.png', fullPage: true })`. Commit these screenshots as the baseline — future runs can diff against them. |

### Mobile pass (one test, 380px viewport)

Repeat checks 1, 2, and 16 (screenshot per tab) at 380×800 to confirm mobile reflow.

### What NOT to test (out of scope for this validation)

- Data parity (KPI digits matching pre-refactor) — that needs historical snapshots we don't have. Skip.
- Cross-browser (Chromium only is fine).
- E2E auth flow other than the cookie set.
- Performance metrics — separate concern.

---

## How to run

From `cloudflare/`:
```
export DASHBOARD_KEY="<actual value>"
npx playwright install --with-deps chromium    # first time only
npx playwright test tests/dashboard.spec.js --reporter=line
```

If you want a UI to debug failures: `npx playwright test --ui`.

Add `tests/dashboard/visual/*.png` to git so the screenshots live in the repo as a regression baseline. They're small (~50-100 KB each, ~16 screenshots = ~1.5 MB max).

---

## Reporting back

After the run, write a completion handoff to `.ai/handoffs/to-claude/open/006-dashboard-playwright-validation-complete.md` containing:

1. **Test results table:** which of the 16 + mobile checks passed/failed, with one-line root cause for each fail.
2. **Console errors captured** (if any) during the walk.
3. **Network 4xx/5xx** captured (if any).
4. **Screenshots:** list paths (e.g. `cloudflare/tests/dashboard/visual/overview.png`) so I can pull them up.
5. **Any deviations** from this spec (e.g., "no Sub-tab arrow-key nav, fell back to click-only — fine for now").
6. **Files added/modified.**

If a test fails because of a real bug in the deployed dashboard, **do NOT silently fix the code and re-run** — write the failure into the handoff and let me decide whether to spawn `coder` for the fix vs roll back the deploy. The point of the validation is to surface issues, not to paper over them.

---

## Time budget

Estimated 30-60 min total (most of it is Playwright authoring + first-run debugging; the actual run is fast). If you're past 90 min and still wrestling with Playwright setup, write a partial-completion handoff back with what worked and what didn't — I can help unstuck it.

---

## Sequencing

1. Create `cloudflare/tests/dashboard.spec.js`, write the 16 checks
2. Wire auth-cookie setup (read DASHBOARD_KEY from env, POST /auth, capture cookie)
3. Run desktop pass; capture screenshots
4. Run mobile pass (380px viewport)
5. Review failures (if any); document not auto-fix
6. Commit `cloudflare/tests/dashboard.spec.js` + `cloudflare/tests/dashboard/visual/*.png`
7. Write completion handoff to `to-claude/open/006-...md`
8. Move this file to `to-kimi/done/`
9. Prepend entry to `.ai/activity/log.md`

If anything in this spec is misaligned with how Playwright is configured in the project, write back via `to-claude/open/` before starting — we can adjust the targets/selectors.
