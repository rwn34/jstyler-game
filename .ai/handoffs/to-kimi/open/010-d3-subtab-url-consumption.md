# Handoff to Kimi — D3 Close-Out: Sub-Tab URL Consumption

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Small loose-end. ~30 min. Pure frontend.

This finishes the D3 tracker that's been open since sprint 2 phase 1 acceptance. Handoff 007 (F1) already made `applyAlias` return a `subTab` field — but Platform/Live components don't yet consume it. Without this fix, `#platform/versions` lands on Platform with the leftmost sub-tab (Geo) active, NOT Versions. Same for `#live/alerts` landing on the default Feed sub-tab.

Side benefit: closes a deviation from 009 — HealthVerdict in red state currently navigates to `currentTab.value = 'live'` but doesn't pick the Alerts sub-tab. With this in place, it can deep-link to `live/alerts` cleanly.

---

## Scope

1. **Extend `parseHash` / `writeHash`** in `lib/url.js` to round-trip the sub-tab segment of the path.
2. **Platform.jsx + Live.jsx**: read `subTab` from `applyAlias` return (or from `parseHash` directly) on mount; set local sub-tab state accordingly. Default to leftmost only if no sub-tab specified.
3. **SubTabs.jsx**: on sub-tab click, call `writeHash(currentTab, subTab, ...)` so the URL updates. Browser back-button now works for sub-tab nav.
4. **HealthVerdict.jsx**: in alert state, navigate via `writeHash('live', 'alerts')` instead of bare `currentTab.value = 'live'`.

No backend changes. No new state, no new components — just wire the existing `subTab` field through the routing layer.

---

## Sketch

`lib/url.js`:
```js
// parseHash already splits on '?' — also split path on '/'
const [tab, subTab] = (path || '').split('/');
return { tab: tab || '', subTab: subTab || '', range, player, segment };

// writeHash gains a subTab param
export function writeHash(tab, subTab, range, player, segment) {
  let hash = '#/' + (tab || '');
  if (subTab) hash += '/' + subTab;
  // ... rest of query string assembly unchanged
}
```

Then in Platform.jsx and Live.jsx, on mount:
```js
const { subTab } = parseHash();
const [activeSub, setActiveSub] = useState(subTab || DEFAULT_SUB);
```

And the SubTabs component's onClick should call `writeHash` to keep URL in sync. Existing aliasMap still works because `applyAlias` already returns `{tab, subTab}` — just feed `subTab` into the initial render.

For HealthVerdict.jsx, replace the bare assignment with `writeHash('live', 'alerts')`.

---

## Validation

- [ ] Direct visit to `https://ndj-metrics.jstylr.workers.dev/dashboard#/platform/versions` → Platform tab + Versions sub-tab active on first render (no flicker through Geo)
- [ ] Same for `#/live/alerts` and `#/live/feed`
- [ ] Click Platform → Versions sub-tab → URL hash updates to `#/platform/versions`
- [ ] Browser Back after a sub-tab click → returns to previous sub-tab
- [ ] HealthVerdict in red state → click → URL becomes `#/live/alerts` AND Alerts sub-tab is active
- [ ] All 25 existing Playwright tests still pass
- [ ] Add 2 new tests: visit `#/platform/versions` directly → assert Versions content visible; click Live tab while on Feed sub-tab → assert URL has `/feed` segment

---

## Self-grep-verify (REQUIRED — AGENTS.md §7)

Run + paste in your completion handoff at `to-claude/open/010-d3-subtab-url-consumption-complete.md`:

```bash
rg -n "subTab" cloudflare/src/dashboard/lib/url.js
rg -n "subTab|parseHash" cloudflare/src/dashboard/tabs/Platform.jsx
rg -n "subTab|parseHash" cloudflare/src/dashboard/tabs/Live.jsx
rg -n "writeHash.*subTab|writeHash\\(.*,.*,.*\\)" cloudflare/src/dashboard/components/SubTabs.jsx
rg -n "writeHash\\('live'" cloudflare/src/dashboard/components/HealthVerdict.jsx
rg -n "platform/versions|live/alerts" cloudflare/tests/dashboard.spec.js
```

**Reminder per AGENTS.md §7 (now tightened):** completion handoff file is REQUIRED; activity log entry alone is NOT sufficient. Grep snippets REQUIRED inside the file. Skip either → rejected at submission, no verification work performed.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/src/dashboard/lib/url.js` (parseHash + writeHash sub-tab support) |
| Modify | `cloudflare/src/dashboard/tabs/Platform.jsx` (consume subTab on mount) |
| Modify | `cloudflare/src/dashboard/tabs/Live.jsx` (same) |
| Modify | `cloudflare/src/dashboard/components/SubTabs.jsx` (writeHash on click) |
| Modify | `cloudflare/src/dashboard/components/HealthVerdict.jsx` (use writeHash) |
| Modify | `cloudflare/tests/dashboard.spec.js` (+2 deep-link tests) |

No new files. No backend, no migrations.

---

This handoff unblocks the cross-tab drilldown work in handoff 011 (where URL-based filter state will follow the same pattern). Land 010 first if you can.
