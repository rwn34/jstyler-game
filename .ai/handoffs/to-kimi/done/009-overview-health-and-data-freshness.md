# Handoff to Kimi — Sprint 2 Phase 3 (first pair): Overview Health Verdict + Data-Freshness Indicator

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Two small dashboard P0 items from the original UX audit (`.ai/reports/dashboard-ux-audit-2026-05-26.md`). Cheap, high-leverage, ship together.

Both are pure frontend — no worker code changes, no migrations, no client changes. ~30-45 min total.

---

## Goal

Two operator-facing signals the dashboard is currently missing:

1. **Overview health verdict** — a single banner at the top of Overview that answers "is the game healthy right now?" Currently Overview has 20+ KPI cards but no synoptic answer; the operator has to read every card to form a verdict, and the active-alert count lives on a separate tab.

2. **Data-freshness indicator** — per-tab cache age display. Each tab caches data 4 min. Today the operator has no visual cue when staring at stale data; a 14:32 wall-clock timestamp in the footer doesn't tell them the dashboard is showing 14:29 numbers.

---

## Feature 1 — Overview Health Verdict

### Behavior

A single banner card at the top of the Overview tab (above the existing KPI grid), color-coded by state:

| State | Color / icon | Trigger |
|---|---|---|
| 🟢 Healthy | green | no high alerts AND no medium alerts AND no DAU collapse |
| 🟡 Attention | amber | medium alerts > 0, OR DAU dropped >30% vs 7d trailing avg |
| 🔴 Alert | red | any high alerts active |

Banner content:
- Big colored dot/icon
- One-line headline: `All systems normal` / `2 anomalies need attention` / `1 active alert`
- Smaller subtitle: `Last checked: 14:32 (1m ago)` (mirrors data-freshness from Feature 2)
- Click-target: opens the Live tab with Alerts sub-tab selected (if state != healthy) OR no-op when healthy

### Implementation sketch

New component `cloudflare/src/dashboard/components/HealthVerdict.jsx`:

```jsx
// Pseudo-shape
function HealthVerdict({ alerts, dau7d, dauToday }) {
  const high = alerts?.high ?? 0;
  const medium = alerts?.medium ?? 0;
  const dauDrop = dau7d > 0 ? (dau7d - dauToday) / dau7d : 0;

  let state, headline;
  if (high > 0) {
    state = 'alert';
    headline = high === 1 ? '1 active alert' : `${high} active alerts`;
  } else if (medium > 0 || dauDrop > 0.30) {
    state = 'attention';
    const bits = [];
    if (medium > 0) bits.push(`${medium} anomal${medium === 1 ? 'y' : 'ies'} need attention`);
    if (dauDrop > 0.30) bits.push(`DAU down ${Math.round(dauDrop * 100)}% vs 7d avg`);
    headline = bits.join(' · ');
  } else {
    state = 'healthy';
    headline = 'All systems normal';
  }
  // render banner with appropriate class + click handler
}
```

Wire it into `cloudflare/src/dashboard/tabs/Overview.jsx` at the very top of the rendered output, above the existing card grid.

Fetch alerts data via the existing `/stats/alerts` (or whatever the Live tab uses) — share the API call. DAU data is already on Overview; reuse.

CSS classes: extend the existing `.card.live` (green), `.card.warn` (amber), `.card.bad` (red) palette in `dashboard.css`. Don't invent a new color system.

### What I'm NOT asking for

- No ack/mute workflow on the banner itself (that's a separate phase 3 item, deferred)
- No per-alert breakdown in the banner (just the count + verdict)
- No animation/pulsing for the alert state (avoid the "always blinking" UX problem; rely on color + count)
- No persistence of "I've acknowledged this verdict" state — banner reflects raw current state

---

## Feature 2 — Data-Freshness Indicator

### Behavior

A small text indicator visible somewhere in the always-on dashboard chrome (header bar / status line) that shows:

`Data: 3m ago` or `Data: just now`

Tied to the current tab's cache. When the user switches tabs, the indicator reflects the new tab's freshness. When the user clicks `CHECK NOW`, the indicator resets to "just now". When the cache expires and refetches automatically, the indicator resets.

### Implementation sketch

The existing per-tab cache lives in a `loadedAt` signal (verify via `rg "loadedAt" cloudflare/src/dashboard/`). Add a derived signal or component that reads `loadedAt.value[currentTab.value]` and renders via existing `fmtAgo()` helper.

`fmtAgo()` is a static formatter — to make the display tick, add a 30-second interval signal that bumps a counter:

```jsx
// In App.jsx or a new small DataFreshness.jsx component
useEffect(() => {
  const interval = setInterval(() => agoTick.value++, 30000);
  return () => clearInterval(interval);
}, []);

function DataFreshness() {
  agoTick.value; // dep-subscribe
  const ts = loadedAt.value[currentTab.value];
  if (!ts) return null; // tab hasn't loaded yet
  return <span class="data-fresh">Data: {fmtAgo(ts)}</span>;
}
```

Place in App.jsx header bar next to the existing `fmtTime(Date.now())` wall-clock display. The two are siblings: wall clock + data freshness.

Add a `.data-fresh` style in `dashboard.css` matching the existing footer/header font size + muted color.

### Visual emphasis at stale thresholds

Optional polish: if `Date.now() - ts > 4*60*1000` (past the 4-min cache window), color the indicator amber. If > 10 min for any reason, color red. Helps the operator notice when polling has stalled.

### What I'm NOT asking for

- No per-card freshness (only one indicator for the current tab)
- No "auto-refetch when stale" — that's already wired via the cache TTL; this is just visibility
- No "last successful poll" vs "last attempted poll" distinction — simplest version uses successful-load timestamp only

---

## Validation plan — Kimi runs this BEFORE deploy

### A. Health verdict states

- [ ] No alerts + DAU normal → 🟢 "All systems normal"
- [ ] Inject a high alert via `/admin/test-alert` (if it exists, or temporarily POST a synthetic alert event) → banner flips 🔴 "1 active alert"
- [ ] Inject a medium alert → banner flips 🟡 "1 anomaly needs attention"
- [ ] Simulate DAU drop (range=1d while DAU is artificially low) → banner flips 🟡 "DAU down N% vs 7d avg"
- [ ] Click banner in non-healthy state → navigates to Live tab, Alerts sub-tab visible
- [ ] Click banner in healthy state → no navigation (or harmless no-op)

### B. Data-freshness indicator

- [ ] Land on Overview → indicator reads "Data: just now"
- [ ] Wait 30s without interaction → indicator updates to "Data: 30s ago" (or "<1m ago", whatever fmtAgo produces)
- [ ] Switch to Per Player tab → indicator reflects Per Player's loadedAt (likely also "just now" if cache fresh, or older value if you've been here before)
- [ ] Click CHECK NOW → indicator resets to "just now"
- [ ] Wait past the 4-min cache window (or simulate by manipulating `loadedAt`) → indicator switches to amber (optional polish, if implemented)

### C. Integration

- [ ] Both features visible simultaneously on Overview — no layout conflict
- [ ] Mobile (380px viewport) — health verdict reflows cleanly, data-freshness stays in header
- [ ] No console errors, no network 4xx/5xx
- [ ] Existing 21/21 Playwright tests still pass
- [ ] Add new Playwright tests: test 22 (health verdict text present on Overview), test 23 (data-freshness text matches "Data: " pattern). Both desktop + mobile variants.
- [ ] Regenerate screenshot baselines for Overview (desktop + mobile) since the banner is a visible addition. Header bar may need new baselines too if data-freshness adds visible chrome.

### D. Accessibility

- [ ] Banner has appropriate `role="status"` or `role="alert"` depending on state (banner with `aria-live="polite"` so screen readers announce state changes without interrupting)
- [ ] Color is NOT the only signal — icon glyph + text count both convey state
- [ ] Banner click-target large enough on mobile (≥44px tap area)
- [ ] Data-freshness indicator has no interactivity; doesn't need aria attributes beyond default

### E. Performance

- [ ] HealthVerdict fetches alerts once on Overview mount; shares with Live tab if possible
- [ ] DataFreshness interval is a single 30s timer at App.jsx level — not per-tab or per-component
- [ ] No measurable bundle size increase beyond ~1-2 KB

---

## Self-grep-verify protocol (REQUIRED — per AGENTS.md §7)

This is the third handoff under the rule. **Skipping the grep step in the completion handoff gets it rejected on submission.** Concretely, when you write `to-claude/open/009-overview-health-and-data-freshness-complete.md`, run and paste output for:

```bash
# HealthVerdict component exists + imported on Overview
rg -n "HealthVerdict" cloudflare/src/dashboard/

# DataFreshness component exists + mounted in App
rg -n "DataFreshness|data-fresh|agoTick" cloudflare/src/dashboard/

# Banner click navigates to Live → Alerts
rg -n "currentTab\\.value\\s*=\\s*'live'" cloudflare/src/dashboard/components/HealthVerdict.jsx

# Verdict thresholds wired
rg -n "dauDrop|high.*alert|medium.*alert" cloudflare/src/dashboard/components/HealthVerdict.jsx

# Stale threshold (optional polish)
rg -n "4\\s*\\*\\s*60" cloudflare/src/dashboard/

# Playwright tests added
rg -n "health verdict|data freshness|Data: " cloudflare/tests/dashboard.spec.js
```

For each claim in the completion handoff's results table, paste 1-3 lines under it.

---

## Files

| Action | File | Purpose |
|---|---|---|
| New | `cloudflare/src/dashboard/components/HealthVerdict.jsx` | Banner component |
| New | `cloudflare/src/dashboard/components/DataFreshness.jsx` (or inline in App.jsx if trivial) | Freshness display |
| Modify | `cloudflare/src/dashboard/tabs/Overview.jsx` | Mount HealthVerdict at top |
| Modify | `cloudflare/src/dashboard/App.jsx` | Mount DataFreshness in header, add `agoTick` interval |
| Modify | `cloudflare/src/dashboard/dashboard.css` | `.health-verdict.live/.warn/.bad`, `.data-fresh` styles |
| Modify | `cloudflare/tests/dashboard.spec.js` | New tests 22 + 22m (health verdict), 23 + 23m (data freshness) |
| Regenerate | `cloudflare/tests/dashboard/visual/overview.png`, `overview-mobile.png` | Banner adds visible content |

No new endpoints. No backend changes.

---

## Sequencing

1. `HealthVerdict.jsx` component — render against mock data first to nail the visual
2. Wire it into `Overview.jsx` with the real alerts fetch (share Live's data path)
3. `DataFreshness.jsx` (or inline) + `agoTick` signal + 30s interval
4. Mount DataFreshness in App.jsx header
5. CSS styles for both components
6. New Playwright tests + screenshot baselines
7. Run validations A-E
8. `npm run deploy`
9. Smoke-check on prod
10. Move handoff to `to-kimi/done/`, prepend completion entry to activity log
11. Write `to-claude/open/009-...-complete.md` with grep snippets per item

---

## What's NOT in scope (track but defer)

- **Alerts ack/mute/jump-to-source workflow** — bigger piece, separate phase 3 handoff once this lands
- **Cross-tab drilldown** (click country → filter everywhere) — separate handoff
- **Global filter bar** (country / version / named) — separate handoff
- **Players 9-tables → 3-tables consolidation** — separate handoff
- **D3 close-out** (subTab consumption in Platform/Live) — 30 min loose-end, separate
- **O1** (sync_load/save per-user lockout) — security item, separate

If during implementation you realize one of these is required for Health Verdict or Data-Freshness to work cleanly, write back via `to-claude/open/` BEFORE expanding scope. Stay surgical.

---

## When done

Sprint 2 phase 3 first-pair complete. Backlog ranked:
1. Phase 3 next pair: Alerts ack/mute/jump-to-source + cross-tab drilldown
2. Phase 3 third pair: global filter bar + Players consolidation
3. D3 close-out (cheap loose end)
4. O1 sync_load/save lockout (security hardening)
5. Phase 2.5 anti-fraud referrals (waits for data)
6. Future test: mock-based PlayerModal Playwright

I'll write whichever you signal ready for after 009 lands.
