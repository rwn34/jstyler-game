# Handoff to Kimi — Sprint 2 Phase 2: Referrals Endpoint + PlayerModal Widget

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Sprint 2 phase 1 closed. Kiro's v1.2.64 client is emitting `referral_open` ui_events with the referrer PID in `meta`. Time to surface that signal in the dashboard.

User asked to start now (vs waiting for more data to accumulate) — that's fine. Build against the event shape we already know; if real data turns up anything weird in 24 hours, we patch.

---

## Goal

Two deliverables in `cloudflare/`:

1. **New `/admin/referrals` endpoint** — aggregates `ui_event` rows where `action='referral_open'`. Auth-gated. Two query modes:
   - **Summary mode** (no `pid` param): top referrers, totals, time-series.
   - **Detail mode** (`?pid=p_xxx`): who referred this player, and who this player referred.

2. **PlayerModal referrals section** — surface incoming + outgoing referrals on each player's detail view. Both lists clickable to jump to the referrer/referee's modal.

Plus a small **"Top Referrers" widget** on the Per Player tab (alongside the existing player tables).

No client work. No new event shape. Just consume what `referral_open` events already write.

---

## Event shape (already flowing)

From Kiro's v1.2.64 `03-save.js:44`:
```js
sendMetric('ui_event', { action: 'referral_open', meta: ref });
```

Where:
- The row's `pid` column = the NEW player (the receiver who scanned the QR)
- `JSON_EXTRACT(data, '$.action') = 'referral_open'`
- `JSON_EXTRACT(data, '$.meta') = <referrer's PID>` (the player who shared)
- `data._v` = client version when the event fired

So:
- **"Who referred Bob?"** → `SELECT JSON_EXTRACT(data, '$.meta') FROM events WHERE pid = <bob_pid> AND type = 'ui_event' AND JSON_EXTRACT(data, '$.action') = 'referral_open' LIMIT 1`
- **"Who did Alice refer?"** → `SELECT pid FROM events WHERE type = 'ui_event' AND JSON_EXTRACT(data, '$.action') = 'referral_open' AND JSON_EXTRACT(data, '$.meta') = <alice_pid>`

JSON_EXTRACT is slow at scale (flagged in the original review). For sprint 2 phase 2, query on-demand; phase 2.5 can promote `referrer_pid` to an indexed column. Don't optimize prematurely — data volume is small for now.

---

## Backend: `/admin/referrals` endpoint

File: `cloudflare/src/index.js`

Add a new `handleAdminReferrals(env, url)` function alongside `handleAdminFlagPlayer` (line 2279). Route under `/admin/referrals` in the router (around line 3372 where other admin routes live).

### Auth

Reuse `isAuthed(request, env)` — same as `handleStatsPlayers` and other admin endpoints. Return 401 if not authed.

### Two modes

**Summary mode** — no `pid` param:
```
GET /admin/referrals?range=30d
```
Response:
```json
{
  "ok": true,
  "data": {
    "summary": {
      "total_referral_opens": 42,
      "unique_referrers": 12,
      "unique_referees": 38
    },
    "top_referrers": [
      { "pid": "p_xxx", "name": "BOB", "referrals": 8, "last_referral_ts": 1716000000000 },
      ...
    ],
    "timeseries": [
      { "date": "2026-05-27", "count": 5 },
      ...
    ]
  }
}
```

- `range`: existing `parseRange` helper. Default 30d.
- `top_referrers`: ORDER BY `count(*) DESC, last_referral_ts DESC` LIMIT 20.
- `unique_referees` may be less than `total_referral_opens` if the same player somehow opened the same referral link from multiple devices — that's fine, surface both.
- `name`: LEFT JOIN against the `events.name` column for the most recent non-null name for that pid (matches how `handleStatsPlayers` enriches names).

**Detail mode** — `?pid=p_xxx`:
```
GET /admin/referrals?pid=p_xxx
```
Response:
```json
{
  "ok": true,
  "data": {
    "pid": "p_xxx",
    "referred_by": { "pid": "p_yyy", "name": "ALICE", "ts": 1716000000000 },
    "referred": [
      { "pid": "p_zzz", "name": "CAROL", "ts": 1716000000000 },
      ...
    ]
  }
}
```

- `referred_by`: SELECT the `JSON_EXTRACT(data, '$.meta')` from the player's own `referral_open` event (limit 1, most recent). Then enrich with the referrer's name. Null if the player wasn't referred (organic arrival or pre-v1.2.64 player).
- `referred`: all players whose `referral_open.meta` equals the queried pid. Enrich each with name + ts.
- Validate `pid` matches `PID_REGEX` (already defined in index.js) before query.

### Performance bounds

- Cap `referred` array at 200 entries with a "more" indicator if exceeded.
- Cap `top_referrers` at 20.
- Use the same `events` table; you already have `idx_events_type_server_ts`. The `WHERE type='ui_event' AND JSON_EXTRACT(...) ='referral_open'` predicate filters first by the indexed type column, then JSON-extracts on the much smaller subset. Should be acceptable for now.

---

## Dashboard: PlayerModal referrals section

File: `cloudflare/src/dashboard/components/PlayerModal.jsx`

In PlayerModal, fetch `/admin/referrals?pid=<currentPid>` on mount alongside the existing player-detail fetches. Add a new section "Referrals" between Identity/Actions and the first KPI Cards row (per the original UX audit's recommendation: actions and referrals are operator-facing, KPIs are analytical).

Layout sketch:
```
┌─── Referrals ──────────────────────────────────────────┐
│ Referred by:  ALICE  (p_yyy)  · 2 days ago             │
│                                                        │
│ Referred 4 players:                                    │
│   · CAROL (p_zzz) — 1 day ago                          │
│   · DAVE (p_aaa) — 1 day ago                           │
│   · EVE (p_bbb) — 3 hours ago                          │
│   · FRANK (p_ccc) — 1 hour ago                         │
└────────────────────────────────────────────────────────┘
```

- Each PID is a clickable link that opens the player's own modal (replace current modal; PlayerModal already supports being re-opened with a different pid via the existing route).
- `referred_by: null` → render "Referred by: organic (no QR scan)".
- Empty `referred` → render "No referrals yet".
- Use `fmtAgo()` helper from `format.js` for timestamps.

### Top Referrers widget on Per Player tab

File: `cloudflare/src/dashboard/tabs/Players.jsx`

Add a new table card "Top Referrers" using existing `<Table>` component, similar pattern to the existing player tables. Fetch `/admin/referrals` (summary mode) on tab mount. Columns:

| Player | Referrals | Last referral |
|---|---|---|
| BOB (p_xxx) | 8 | 2 hours ago |
| ALICE (p_yyy) | 5 | 1 day ago |
| ... |

- Visible in segment "All" (default segment).
- Should NOT be visible in 🚩 Flagged or ⛔ Banned segments (those are operations-focused, not analytics).
- Click a row → opens PlayerModal for that pid.
- CSV export via existing `<Table>` mechanism.

---

## Files

| Action | File | Purpose |
|---|---|---|
| Modify | `cloudflare/src/index.js` | Add `handleAdminReferrals`, wire into router around line 3372 |
| Modify | `cloudflare/src/dashboard/components/PlayerModal.jsx` | Fetch + render referrals section |
| Modify | `cloudflare/src/dashboard/tabs/Players.jsx` | Top Referrers card (visible in "All" segment) |
| Modify | `cloudflare/src/dashboard/api.js` (or wherever endpoint URLs are centralized) | Add `getReferrals(pid?)` helper |

No new files. No new components. No schema migration.

---

## Validation plan — Kimi runs this BEFORE deploy

### A. Endpoint smoke (use curl or the existing `smoke_test.js` pattern)

- [ ] `GET /admin/referrals` without auth cookie → 401
- [ ] `GET /admin/referrals` with auth → 200, returns summary shape per spec above (even if all counts are 0 because new data)
- [ ] `GET /admin/referrals?pid=<a known v1.2.64 player pid>` → 200, returns detail shape
- [ ] `GET /admin/referrals?pid=invalid` → 400 (PID regex rejection)
- [ ] Synthetic test: manually `INSERT` two `referral_open` events into the prod D1 (or a local D1) with known PIDs, query the endpoint, verify both appear with correct linkage. Then DELETE the synthetic rows.

### B. Dashboard

- [ ] Open PlayerModal for any pid. Referrals section appears between identity/actions and KPIs.
- [ ] For a pid known to have been referred (synthetic test data is fine), "Referred by:" shows the referrer's name with `fmtAgo` timestamp.
- [ ] Click the referrer's PID → PlayerModal re-opens for that pid.
- [ ] For the referrer in that pair, "Referred N players:" lists the referee. Click → opens referee's modal.
- [ ] Per Player tab, "All" segment shows the "Top Referrers" table at the bottom (or wherever it logically fits).
- [ ] Switch to "🚩 Flagged" segment → Top Referrers table is NOT visible.
- [ ] CSV export from Top Referrers works.

### C. Performance

- [ ] Hit `/admin/referrals` (summary) → response under 500ms in prod.
- [ ] Hit `/admin/referrals?pid=<pid>` → response under 300ms.
- [ ] Run `EXPLAIN QUERY PLAN` on the summary query in `wrangler d1 execute` and confirm it uses `idx_events_type_server_ts` (or similar) — paste output in the completion handoff.

### D. Playwright

- [ ] Add a test to `cloudflare/tests/dashboard.spec.js`: open PlayerModal, assert Referrals section is present (text "Referred by:" or "No referrals yet"), assert the Top Referrers table on Per Player exists.
- [ ] All 19+ existing tests still pass (no regression).
- [ ] Regenerate the affected screenshot baselines (PlayerModal, Per Player) since UI changed.

### E. Empty-state polish

- [ ] Brand new player (no referrals, never referred): renders "Referred by: organic (no QR scan)" + "No referrals yet" cleanly.
- [ ] Top Referrers table with zero rows: shows EmptyState ("No referrals yet").

---

## Self-grep-verify protocol (REQUIRED — per AGENTS.md §7)

This handoff is the second one issued after the rule landed. The completion handoff MUST include grep snippets next to every claim. Concretely, when you write `to-claude/open/008-referrals-complete.md`, for each item below, paste 1-3 lines of grep output proving it:

```bash
# Endpoint exists + is routed
rg -n "handleAdminReferrals" cloudflare/src/index.js
rg -n "/admin/referrals" cloudflare/src/index.js

# Two-mode query handling
rg -n "url\\.searchParams.*pid" cloudflare/src/index.js | rg -n "referral"  # detail-mode pid param
rg -n "top_referrers|referred_by|referred:" cloudflare/src/index.js

# PlayerModal section
rg -n "Referrals|referred_by|referred:" cloudflare/src/dashboard/components/PlayerModal.jsx

# Players tab widget
rg -n "Top Referrers|referrals" cloudflare/src/dashboard/tabs/Players.jsx

# Auth-gated
rg -n "isAuthed" cloudflare/src/index.js -A 1 | rg -n "referrals"

# Playwright test added
rg -n "referrals|Referrals" cloudflare/tests/dashboard.spec.js
```

If any grep returns nothing where you expected output, the claim is wrong — fix the code, don't fudge the handoff. **This is your first explicit grep-verify completion handoff; previous one (007) skipped the step as a transition courtesy. Skipping again gets the handoff rejected on submission.**

---

## What I'm NOT asking for

- Anti-fraud filtering (sprint 2.5 — flag if one referrer has >N referrals all from same country/IP/short-session). Just surface raw counts for now.
- Referral tree (recursive — who referred Alice, who referred them, who referred them). Just one hop in each direction. Sprint 3 candidate.
- Promote `referrer_pid` from JSON to indexed column. Phase 2.5 if performance bites.
- Conversion tracking (did the referred player actually complete level 0? Return D1?). Different sprint.
- Dashboard "Referrals" tab as a top-level navigation. The Per Player widget + PlayerModal section are enough for v1.

---

## Sequencing

1. Backend endpoint first — write `handleAdminReferrals`, wire route, run synthetic-data test
2. PlayerModal section — fetch + render
3. Top Referrers widget on Per Player tab
4. Playwright test added; baselines regenerated for the two affected tabs
5. Run all validations A-E; record results with grep snippets in completion handoff
6. `npm run deploy`
7. Smoke against prod with a real `?pid=<known v1.2.64 player>` query
8. Move handoff to `to-kimi/done/`
9. Prepend completion entry to `.ai/activity/log.md` (with deploy version ID)
10. Write `to-claude/open/008-referrals-complete.md` with grep snippets

---

## When done

Sprint 2 phase 2 complete. Backlog left:
- **D3 close-out:** consume `subTab` in Platform/Live components (~30 min)
- **O1 from sprint 1:** extend per-(username, mmyy) lockout to `/sync/load` and `/sync/save`
- **Sprint 2 phase 2.5:** anti-fraud signals on referrals if real data shows abuse patterns
- **Sprint 2 phase 3:** original UX audit P1 items (Alerts ack/mute/jump, cross-tab drilldown, global filter bar, Overview health verdict, Players 9-tables consolidation, data-freshness indicator)

I'll write phase 3 handoff when you signal ready.
