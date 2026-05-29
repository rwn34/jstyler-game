# Handoff to Claude — 011: Alerts Workflow + Cross-Tab Drilldown (RESOLVED)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-28
**Resolved:** 2026-05-28 by claude-code orchestrator
**Live worker:** `1b062b61-d66c-4174-87d7-f82676508f71`
**Commit:** `76f0a27`

---

## Verdict: ✅ Feature 1 ACCEPTED. ⚠️ Feature 2 INFRASTRUCTURE-ONLY (partial completion).

### Feature 1 (Alerts workflow): COMPLETE ✅
- Migration `005_alerts_state.sql` applied — verified (file present, `CHECK(status IN ('open', 'acked', 'muted'))`, index on status + mute_until)
- 3 admin endpoints: `handleAdminAlertsAck` at index.js:2556 (Kimi cited 2554 — off by 2, minor), `handleAdminAlertsMute` at 2567, `handleAdminAlertsUnack` at 2580
- Stable alert_id via `makeAlertId(type, severity, message, since)` at index.js:3280 — uses `sha256Hex(type|severity|message|since).slice(0,16)`
- LEFT JOIN merges status/acked_at/mute_until into anomaly response
- Auto-DELETE expired mute rows in same query path (line 3474)
- Dashboard `Live.jsx` AlertsPane: ackAlert(62), unackAlert(75), muteAlert(88), jumpToSource(101), showMuted toggle (116)
- Optimistic UI with revert-on-failure ✓

### Feature 2 (Cross-tab drilldown): PARTIAL — infrastructure only ⚠️
- URL filter taxonomy wired: `cc`, `level`, `version`, `named` in parseHash/writeHash ✓ (lib/url.js:20-23, 30-33)
- `currentFilters` signal in state.js ✓
- `FilterStrip.jsx` component renders chips + remove + clear-all ✓ (App.jsx:71)
- Bidirectional hash↔signal sync ✓
- Alert jump-to-source DOES push filter into URL → Levels tab with `?level=N` ✓

**But explicitly deferred:**
1. Clickable filter origins on Geo/Per Level table rows — user can't yet click a country to filter
2. Server-side `JSON_EXTRACT` filter predicates in `handleStats*` endpoints — filters in URL don't actually filter the data
3. Tabs beyond Levels/Overview don't pass filter params in their fetch URLs

**Practical impact:** The infrastructure is real but cross-tab drilldown isn't user-functional yet. A user with `?cc=US` in their URL sees the FilterStrip chip but sees identical data on every tab — the chip is decoration.

The alert jump-to-source path DOES work (push level filter → navigate to Levels) because that's the one wired-up flow. Everything else is preview.

---

## Process check

Trajectory under the new rule continues to converge:
| # | File in `to-claude/open/`? | Grep snippets? |
|---|---|---|
| 007 | ✅ | ❌ |
| 008 | ✅ | ✅ gold |
| 009 | ❌ | ❌ |
| 010 | ❌ (done/) | ✅ |
| **011** | **✅** | **✅** |
| 012 | ✅ | ✅ |
| 013 | ❌ (done/) | ✅ |

011 and 012 finally land cleanly. 013 still hops to done/. Two of three this batch are protocol-correct — better than the 0-of-2 previously.

---

## Acceptance decision

I'm accepting the partial because:
1. Kimi explicitly bundled the deferral up-front in the handoff (no surprise; no fudging)
2. Feature 1 is fully shipped, the higher-value half (the alerts workflow IS the operator productivity win)
3. Feature 2 infrastructure is real — the URL taxonomy and FilterStrip are reusable foundation
4. The 2-3 hour estimate was tight for both features; expanding scope would have meant rushing both

**But:** "Feature 2 deferred" needs a follow-up handoff to actually close it. I'll write 014 (clickable origins + server filter predicates) when you signal ready. Estimate: ~1-1.5 hr for clickable origins on Geo/PerLevel + server filter clause helper + applying to 3-4 hot endpoints.

---

## Outstanding (this handoff)

- **Feature 2 close-out (handoff 014 candidate):** clickable filter origins + server-side predicates in handleStatsPlayers/Sessions/Levels/Economy
- **Polish:** filter chip CSS, filter-affecting tabs need a `<FilterIgnoredNotice />` for tabs that explicitly ignore filters

---

This handoff is resolved. Sprint 2 phase 3 Feature 1 (alerts workflow) shipped. Feature 2 needs a follow-up to become useful.
