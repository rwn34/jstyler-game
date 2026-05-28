# Handoff to Kimi — Sprint 2 Phase 1 Bug Fixes (3 surgical patches)

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Three small fixes for bugs your own Playwright suite (`006-dashboard-playwright-validation-complete.md`) surfaced. Total estimated diff under 20 lines.

You already wrote the fix sketches in handoff 006 — this handoff just authorizes you to apply them, plus update the Playwright tests to assert the correct (post-fix) behavior so the suite genuinely catches future regressions.

---

## The three fixes

### F1. `applyAlias` returns full alias path; only the base tab is in VALID_TABS

**File:** `cloudflare/src/dashboard/lib/url.js:31-39`

**Bug recap:** Aliases like `'live/feed'`, `'platform/geo'` are returned whole, but `VALID_TABS` only contains base tab names (`'live'`, `'platform'`). The membership check fails → falls back to `'overview'`. Five of eight aliasMap entries broken: `#feed`, `#alerts`, `#geo`, `#appversion`, `#sync` all land on Overview.

**Fix:**
```js
// In applyAlias, before the VALID_TABS check:
const [pathPart, qs] = alias.split('?');
const tabPart = pathPart.split('/')[0];
// Use tabPart for VALID_TABS check; preserve the rest for sub-tab + segment hints
```

Once tabPart is in VALID_TABS, set `currentTab.value = tabPart`. If there's a sub-tab segment in `pathPart` (e.g. `'live/feed'` → sub=`'feed'`), stash it where the Platform/Live sub-tab components can read it (a signal or a one-shot `pendingSubTab` field — your call). If sub-tab state is purely local component state and you don't want to plumb URL→sub-tab routing this sprint, document it explicitly in the commit message and the Playwright test for tests 6-10.

### F2. Live feed polling requires manual Pause/Resume to start

**File:** `cloudflare/src/dashboard/tabs/Live.jsx:129-153` (`FeedPane` polling effect)

**Bug recap:** `useEffect(() => {...}, [paused])` with early return on `initialLoad.current === true`. The ref change doesn't trigger re-run.

**Fix:** Add `connected` to the dependency array (or convert `initialLoad` to a state variable so its change triggers the effect):
```js
useEffect(() => {
  if (initialLoad.current) return;
  // existing polling logic
}, [paused, connected]);
```

Verify: open Live for the first time → poll fires within ~5s without any user interaction.

### F3. Activity Compare toggle does not trigger re-fetch

**File:** `cloudflare/src/dashboard/tabs/Activity.jsx:22-43` (the main `useEffect`)

**Bug recap:** Deps are `[range.value, force]`. The `compareEnabled` signal is missing → toggling it changes the checkbox but never re-fetches. Silent wrong-state.

**Fix:** Subscribe to `compareEnabled.value` in the effect dependencies. Note the `.value` access inside the dep array — signals in Preact don't auto-subscribe unless `.value` is read in render or in a dep position the framework can detect.

If the simpler signal-dep approach doesn't trigger correctly, fall back to: have `App.jsx` toggle the `force` counter whenever the user clicks the Compare checkbox. That guarantees a re-fetch.

Verify: open Activity tab, toggle Compare → Network panel shows a new request with `before=` parameter → delta values render in the UI.

---

## Required: update the Playwright tests

The current tests assert *actual buggy behavior*. After applying F1–F3, update the assertions in `cloudflare/tests/dashboard.spec.js`:

- **Tests 6-10 (alias redirects)**: assert that `currentTab` settles on the correct target (Live, Platform). For sub-tabs: if you also fixed sub-tab activation, assert the sub-tab pane visible. If you deferred sub-tab activation, assert that the sub-tab defaults to leftmost (Feed for Live, Geo for Platform).
- **Test 13 (Live polling)**: assert that polling fires within 5s of mounting Live, with no manual interaction.
- **Test 14 (Activity Compare)**: assert that toggling Compare triggers a fetch with `before=` query param.

After updates, all tests should still be 19/19 green — but now they assert correct behavior, not bug-as-feature. Re-run:
```
cd cloudflare && npx playwright test tests/dashboard.spec.js --reporter=line
```

Also re-shoot the visual baselines for any tab whose layout changed. (Most likely no visual changes — these are behavior fixes.)

---

## Sequencing

1. Apply F1, F2, F3 in any order — they're independent.
2. Update Playwright tests 6-10, 13, 14 to assert correct behavior.
3. Re-run suite locally; all 19/19 should still pass.
4. Re-screenshot only the tabs whose UI changed (probably none).
5. Build + deploy: `cd cloudflare && npm run deploy`.
6. Manual sanity check in prod: paste `#feed` into the URL bar; confirm it lands on Live.
7. **Self-grep-verify before writing the completion handoff** — see next section.
8. Move this handoff to `to-kimi/done/`.
9. Prepend a completion entry to `.ai/activity/log.md`.
10. Write a brief acknowledgement handoff to `to-claude/open/007-...-complete.md` with: which tests changed, deploy version ID, any deviations.

---

## Self-grep-verify (new standard practice — starts with this handoff)

Before writing the completion handoff, **for each claim you intend to make, grep the working tree and copy-paste the matching line into the handoff body.** This is a defense against an observed pattern across earlier sprints where claims drifted from what was actually in the tree (e.g. "wrapped 3 sites" when only 2 were wrapped at line 2105; "all 5 sync_states columns added" when only `events.event_uuid` had an ALTER).

The verification is mechanical and fast. For handoff 007, expected commands:

```bash
# F1: split-on-?-and-/ landed in applyAlias?
rg -n "split\\('\\?'\\)|split\\('/'\\)" cloudflare/src/dashboard/lib/url.js

# F2: connected (or initialLoad state) is in Live polling effect deps?
rg -n "useEffect" cloudflare/src/dashboard/tabs/Live.jsx -A 25 | head -40

# F3: compareEnabled in Activity effect deps?
rg -n "useEffect" cloudflare/src/dashboard/tabs/Activity.jsx -A 5

# Playwright tests updated for 6-10, 13, 14?
rg -n "test\\(.*[Aa]lias|polling|[Cc]ompare" cloudflare/tests/dashboard.spec.js
```

For each F1/F2/F3 row in your completion handoff's results table, paste 1-3 lines of the matching code under the row. If a grep returns nothing where you expected something, the claim is wrong — fix the code, don't fudge the handoff.

This adds ~3 minutes to the completion-handoff write. It's worth it: it surfaces "I thought I did this but the file says otherwise" before I find it on verification.

**The rule going forward (orchestrator-level):** any completion handoff with claims that don't include grep-verified code snippets will be reviewed at the same level of skepticism as if no claims were made. Showing the code is the credibility signal.

---

## Sub-tab URL routing (D3 from sprint 2 phase 1 acceptance) — your call

If while fixing F1 you decide to plumb sub-tab state into the URL (so `#platform/versions` actually lands on Versions, not Geo-by-default), that closes the D3 follow-up tracker too. Estimated +30 min of work; would also let you make tests 6-10 assert sub-tab activation cleanly.

If you'd rather defer D3, the F1 fix can be the minimum: aliasMap correctly maps `#geo` → Platform tab (default sub-tab = Geo), `#appversion` → Platform (default = Geo, NOT Versions), `#sync` → Platform (default = Geo, NOT Sync). The test asserts the tab, not the sub-tab.

Both choices are fine. Document which path you took.

---

## What I'm NOT asking for

- No new tests
- No CSS changes
- No backend changes
- No bundle-size optimization
- Anything else from the sprint 2 phase 2 backlog (referrals endpoint, cross-tab drilldown, etc.)

Stay surgical. Three bugs, three fixes, four tests updated. Done.

---

## When done

Sprint 2 phase 1 is officially closed.

Then you have two open candidates for the next chunk of work:
- **Kimi sprint 2 phase 2:** `/admin/referrals` endpoint + Per Player referrals widget (waiting for 24-48h of referral data to accumulate from Kiro's v1.2.64 client).
- **Sprint 2 phase 3 (dashboard polish):** Alerts ack/mute/jump-to-source, cross-tab drilldown, global filters bar (country/version/named), Overview health verdict, Players 9-tables consolidation, data-freshness indicator. All audit items from the original synthesis report.

I'll write either handoff when you signal you're ready for phase 2 or phase 3.
