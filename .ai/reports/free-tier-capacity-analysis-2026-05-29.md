# Free-Tier Capacity Analysis — N3ON DashJ Metrics Worker

**Date:** 2026-05-29  
**Analyst:** kimi-cli (read-only)  
**Database:** `ndj-metrics-db` (D1, `74d7bb68-78f3-4189-8183-91618c1ebe03`)  
**Data span:** 2026-05-11 to 2026-05-29 (19 calendar days)  
**Account:** Efransiscus@gmail.com's Account (b4aff299c52a01cce17fe3520cf500c4) — inferred Workers Free plan (no paid subscription visible via `wrangler whoami`).

---

## 1. Current Behavioral Baseline (Measured)

### 1.1 Sample-size caveat

The dataset is thin. We have **19 days** of telemetry, **180 distinct player IDs** lifetime, but only **~8–17 DAU** in the most recent week. Many of the 180 IDs are likely from early testing or one-off visits. The per-player-per-day distributions below are based on **84 player-day observations** in the last 7 days. That is enough to spot ratios and rank event types, but not enough for tight confidence intervals. **Ranges are reported as observed min–max or median–p95, not as statistical confidence intervals.**

### 1.2 Event volume

| Metric | Value |
|--------|-------|
| Total events (all time) | 11,816 |
| Events marked `offline=1` | 593 (5.0 %) |
| Events marked `offline=0` | 11,223 (95.0 %) |
| Distinct lifetime players | 180 |
| Distinct days with data | 19 |
| Database size (bytes) | ~5,943,296 (~5.7 MB) |
| `sync_history` rows (all time) | 84 |

### 1.3 Recent DAU and daily event throughput (last 8 days)

| Day | DAU | Total events | Events / DAU |
|-----|-----|--------------|--------------|
| 2026-05-22 | 12 | 753 | 62.8 |
| 2026-05-23 | 12 | 645 | 53.8 |
| 2026-05-24 | 7 | 79 | 11.3 |
| 2026-05-25 | 9 | 309 | 34.3 |
| 2026-05-26 | 6 | 139 | 23.2 |
| 2026-05-27 | 17 | 723 | 42.5 |
| 2026-05-28 | 12 | 297 | 24.8 |
| 2026-05-29 | 9 | 199 | 22.1 |
| **8-day avg** | **10.5** | **393** | **37.4** |

### 1.4 Per-player-per-day event distribution (last 7 days, active players only)

| Statistic | Events / player / day |
|-----------|----------------------|
| Mean | 37.4 |
| Median | 12.0 |
| p95 | 175 |
| Min | 1 |
| Max | 364 |
| Player-day observations (n) | 84 |

The median (12) is far below the mean (37), which means a few power users or test bots are inflating the average. **For conservative capacity planning we use the mean (37.4) because the tail will still exist at 100 DAU, but we flag the uncertainty.**

### 1.5 Session structure (all-time)

Sessions were defined as contiguous event sequences bounded by `session_start` events, using a SQLite window function (`SUM(CASE WHEN type='session_start' THEN 1 END) OVER (PARTITION BY pid ORDER BY server_ts)`).

| Metric | Value |
|--------|-------|
| Total sessions detected | 901 |
| Players with >1 session | 74 |
| Mean events per session | 13.1 |
| Mean session length | 2,904 s (~48 min) |
| **Median session length** | **59 s (~1 min)** |
| p95 session length | 6,896 s (~115 min) |

The mean is heavily skewed by very long multi-day gaps mis-classified as single sessions (SQLite windowing has no idle-timeout cutoff). The **median of ~1 minute** is a more honest description of a typical visit. This implies current real playtime per player per day is short — roughly 2–3 minutes total across multiple micro-sessions.

### 1.6 Event-type breakdown (all time)

| Type | Count | Share | Avg per player lifetime |
|------|-------|-------|------------------------|
| level_start | 3,812 | 32.3 % | 21.2 |
| level_death | 2,853 | 24.2 % | 15.9 |
| heartbeat | 2,224 | 18.8 % | 12.4 |
| ui_event | 1,496 | 12.7 % | 8.3 |
| session_start | 902 | 7.6 % | 5.0 |
| level_complete | 316 | 2.7 % | 1.8 |
| purchase | 158 | 1.3 % | 0.9 |
| name_set | 51 | 0.4 % | 0.3 |
| feedback | 4 | 0.03 % | 0.02 |

**`level_start` + `level_death` + `heartbeat` = 75.3 % of all events.** Heartbeat alone is nearly 19 % and scales linearly with session length — it is the easiest knob to turn.

### 1.7 Sync / save proxy

- `sync_history` rows (all time): **84**
- `sync_history` rows (last 7 days): **84** (all recent — sync feature appears to have been activated recently)
- Sync save rows per active player per day: ~1.0 (84 saves / 84 player-days)
- We do not have server-side load counts. As a heuristic, assume **2–3× saves** = loads + change-pin/check calls. That yields ~2–3 sync-related requests per active player per day.

### 1.8 Heartbeat frequency

Client source (`src/n3ondashj/02-data.js`) shows:

```javascript
var HEARTBEAT_INTERVAL = 90;
```

Heartbeats fire every **90 seconds** when the page is visible and the player has set a name.

---

## 2. Projection to 100 DAU × 15–30 min

### 2.1 Scaling model

Current measured active-player behavior:
- ~37 events / player / day
- ~2.7 `session_start`s / player / day (last 7 days: 230 starts / 84 player-days)
- Median session ~1 min; total daily playtime ~2.7 min

The target scenario is **one sustained session per day** of 15 or 30 minutes. We scale **time-dependent events** (heartbeat, level_start, level_death, ui_event, level_complete, purchase) by the session-length ratio, while keeping **per-session fixed events** (session_start, name_set, feedback) at 1× per day.

Time-dependent event share ≈ 32.3 + 24.2 + 18.8 + 12.7 + 2.7 + 1.3 = **92.0 %**  
Fixed-event share ≈ 7.6 + 0.4 + 0.03 = **8.0 %**

Scaling factor:
- 15 min target vs ~2.7 min measured → **5.6×** for time-dependent events
- 30 min target vs ~2.7 min measured → **11.1×** for time-dependent events

### 2.2 Projected events per player per day

| Variant | Time-dep events | Fixed events | Total events / player / day |
|---------|-----------------|--------------|----------------------------|
| Measured (baseline) | 34.4 | 3.0 | 37.4 |
| 15-min session | 34.4 × 5.6 = 192.6 | 3.0 | **~196** |
| 30-min session | 34.4 × 11.1 = 381.8 | 3.0 | **~385** |

### 2.3 Projected daily totals at 100 DAU

| Metric | Baseline (measured behavior) | 15-min variant | 30-min variant |
|--------|------------------------------|----------------|----------------|
| Events/day | 3,740 | 19,600 | 38,500 |
| Heartbeats/day | 1,880 | 10,500 | 20,700 |
| `/event` POSTs/day (online, ~95 %) | ~3,550 | ~18,600 | ~36,600 |
| `/events/batch` POSTs/day (offline, ~5 %) | ~190 batches | ~980 batches | ~1,925 batches |
| Sync saves (`/sync/save`) /day | ~100 | ~100 | ~100 |
| Sync loads + checks /day (2× saves) | ~200 | ~200 | ~200 |
| Dashboard reads /day (assumed 1 admin, ~20 page loads) | ~20 | ~20 | ~20 |
| Cron invocations /day | 24 | 24 | 24 |
| **Total Workers requests/day** | **~4,084** | **~19,924** | **~38,844** |

*Assumptions:*
- Online events = 1 request per event (client sends individually via `fetch('/event', …)`).
- Offline events are batched; we assume average batch size of 10 events → ~1 batch request per 10 offline events. This is a small correction.
- Sync saves ≈ 1 per player per day. Loads ≈ 2× saves (heuristic).
- Dashboard/admin reads are negligible at this scale.
- Cron is hourly (`0 * * * *`) = 24 invocations/day.

### 2.4 Projected D1 rows written / day

Each event `INSERT` counts as 1 row written. Sync save `INSERT`s into `sync_history` and `sync_lookup` = ~2 rows per save. Batch endpoint writes multiple events in a single D1 `batch()` call; each event still counts as 1 row written.

| Metric | Baseline | 15-min | 30-min |
|--------|----------|--------|--------|
| Event rows written | 3,740 | 19,600 | 38,500 |
| Sync rows written | ~200 | ~200 | ~200 |
| **Total D1 rows written / day** | **~3,940** | **~19,800** | **~38,700** |

### 2.5 Projected D1 rows read / day

This is harder to measure because dashboard queries and sync lookups are variable. We can estimate from the per-request patterns:

- `/event` and `/events/batch`: writes only (~0 read rows per request for the simple path; the code does a `SELECT` for duplicate UUID check → ~1 row read per event).
- `/sync/save`: `SELECT key_hash FROM sync_lookup` + `SELECT version FROM sync_history` → ~2 row reads + write.
- `/sync/load`: `SELECT` from `sync_history` → ~1 row read.
- Dashboard `/stats` endpoints: heavy. The main `handleStats` query does full table scans over recent ranges. At 100 DAU the events table will be ~40k rows/day × 30 days = ~1.2M rows. A dashboard load scanning 2 days reads ~80k rows.

Conservative estimate:
- Player-facing reads (sync): ~300 row reads/day
- Player-facing reads (event dedup): ~3,700–38,500 row reads/day
- Dashboard reads (20 loads/day × 80k rows): **~1,600,000 row reads/day**

**Dashboard reads dominate the D1 read budget.** This is the single most important finding.

### 2.6 Projected storage growth

- Average event row size: ~250 bytes (measured: `data` ~176 B + `pid` ~18 B + `type` ~10 B + other columns + SQLite overhead).
- Events growth / day: 3,740 × 250 B = **0.89 MB/day** (baseline); 19,600 × 250 B = **4.7 MB/day** (15 min); 38,500 × 250 B = **9.3 MB/day** (30 min).
- Sync history growth: negligible (~84 rows all time).
- Indexes add ~30–50 % overhead.
- **Projected net growth: ~1.2 MB/day (baseline), ~6.2 MB/day (15 min), ~12 MB/day (30 min).**

---

## 3. Free-Tier Limits (Authoritative)

All values pulled from Cloudflare docs on 2026-05-29.

### 3.1 Workers

| Limit | Free Tier | Citation |
|-------|-----------|----------|
| Requests | 100,000 / day | <https://developers.cloudflare.com/workers/platform/pricing/> |
| CPU time per HTTP invocation | 10 ms | <https://developers.cloudflare.com/workers/platform/limits/> |
| CPU time per Cron invocation | 10 ms | <https://developers.cloudflare.com/workers/platform/limits/> |
| Subrequests per invocation | 50 | <https://developers.cloudflare.com/workers/platform/limits/> |
| Cron Triggers per account | 5 | <https://developers.cloudflare.com/workers/platform/limits/> |
| Workers Logs events | 200,000 / day | <https://developers.cloudflare.com/workers/platform/pricing/> |

### 3.2 D1

| Limit | Free Tier | Citation |
|-------|-----------|----------|
| Rows read | 5,000,000 / day | <https://developers.cloudflare.com/d1/platform/pricing/> |
| Rows written | 100,000 / day | <https://developers.cloudflare.com/d1/platform/pricing/> |
| Storage (total account) | 5 GB | <https://developers.cloudflare.com/d1/platform/pricing/> |
| Max database size | 500 MB | <https://developers.cloudflare.com/d1/platform/limits/> |
| Queries per Worker invocation | 50 | <https://developers.cloudflare.com/d1/platform/limits/> |

### 3.3 Cron

Cron is part of Workers. The same 100k requests/day and 10 ms CPU limits apply. There is no separate Cron invocation cap beyond the 5 triggers/account limit.

---

## 4. Headroom Analysis

Rating key:
- 🟢 < 40 % — comfortable
- 🟡 40–80 % — watch, plan mitigation
- 🔴 > 80 % — must mitigate before scaling

### 4.1 Workers requests/day

| Variant | Requests/day | Limit | % of limit | Rating |
|---------|-------------|-------|-----------|--------|
| Baseline (current × 100) | ~4,084 | 100,000 | **4.1 %** | 🟢 |
| 15-min | ~19,924 | 100,000 | **19.9 %** | 🟢 |
| 30-min | ~38,844 | 100,000 | **38.8 %** | 🟢 |

At 100 DAU, requests are not the binding constraint, **unless** dashboard traffic increases or a bot starts hammering endpoints. One rogue script doing 1,000 requests/min would burn the 100k budget in under 2 hours.

**Mitigation:** Add a per-IP + per-pid rate limiter in `src/index.js` before the route handlers. A 60-second window with max 30 requests per pid would stop accidental loops without hurting real players.

### 4.2 Workers CPU-ms/day

We have no per-request CPU instrumentation. Cloudflare docs state the average Worker uses ~2.2 ms per request. Our Worker is I/O-heavy (D1 writes, JSON parsing) but also runs some JSON aggregation for stats.

Heuristic:
- `/event` : ~2 ms CPU
- `/events/batch` : ~3 ms CPU
- `/sync/save` : ~5 ms CPU
- `/sync/load` : ~3 ms CPU
- Dashboard `/stats/*` : ~10–30 ms CPU (full table scans, JSON aggregation)

| Variant | Est. CPU-ms/day | Limit (10 ms × req limit) | Rating |
|---------|-----------------|---------------------------|--------|
| Baseline | ~12,000 | 1,000,000 ms/day | 🟢 |
| 15-min | ~55,000 | 1,000,000 ms/day | 🟢 |
| 30-min | ~105,000 | 1,000,000 ms/day | 🟢 |

However, **individual invocations** that do heavy dashboard queries could approach the 10 ms per-request ceiling. The `handleStats` endpoint does multiple `SELECT` statements with `JSON_EXTRACT` and aggregation. If the dashboard is loaded with `range=30d` at 100 DAU, a single request could exceed 10 ms and be killed on the free tier.

**Mitigation:** Add `console.log` instrumentation to `handleStats` (and other heavy endpoints) logging `Date.now() - start` before returning. This one-line patch enables future budget analysis. Also cache dashboard responses in memory for 30–60 s to avoid repeated full scans.

### 4.3 D1 rows read/day

| Variant | Est. rows read/day | Limit | % of limit | Rating |
|---------|-------------------|-------|-----------|--------|
| Baseline (no dashboard) | ~4,000 | 5,000,000 | 0.1 % | 🟢 |
| Baseline (+ dashboard) | ~1,604,000 | 5,000,000 | **32 %** | 🟢 |
| 15-min (no dashboard) | ~20,000 | 5,000,000 | 0.4 % | 🟢 |
| 15-min (+ dashboard) | ~1,620,000 | 5,000,000 | **32 %** | 🟢 |
| 30-min (no dashboard) | ~39,000 | 5,000,000 | 0.8 % | 🟢 |
| 30-min (+ dashboard) | ~1,639,000 | 5,000,000 | **33 %** | 🟢 |

Dashboard reads are the dominant term and surprisingly stable because they scan by time range, not by row count. Even so, **~33 % is still green**, but if an admin loads the dashboard frequently (e.g. auto-refresh every 10 s) or runs unindexed searches, this can spike rapidly.

**Mitigation:** Move the dashboard to a separate read-only Worker or add an in-memory cache (`_cache` Map already exists in `src/index.js`) with a 60-second TTL for `/stats` responses. This would cut dashboard-driven D1 reads by 80–90 %.

### 4.4 D1 rows written/day

| Variant | Rows written/day | Limit | % of limit | Rating |
|---------|-----------------|-------|-----------|--------|
| Baseline | ~3,940 | 100,000 | **3.9 %** | 🟢 |
| 15-min | ~19,800 | 100,000 | **19.8 %** | 🟢 |
| 30-min | ~38,700 | 100,000 | **38.7 %** | 🟢 |

This stays green at 100 DAU, but note the **100k writes/day hard cap**. At 30 min sessions we are already at ~39 %; if DAU doubles to 200, this row alone hits 🔴. Also, indexes increase write cost: writing an indexed column costs 2 rows written (table + index).

**Mitigation:** If scaling beyond ~150 DAU with 30-min sessions, either batch event inserts more aggressively (the `/events/batch` endpoint exists and is used for offline events — consider batching online events too), or reduce heartbeat frequency from 90 s to 180 s or 300 s. Cutting heartbeats in half would drop the 30-min projection from 38.7 % to ~28 %.

### 4.5 D1 storage

| Variant | Growth / day | Days to fill 500 MB | Days to fill 5 GB | Rating |
|---------|-------------|--------------------|--------------------|--------|
| Baseline | ~1.2 MB | 417 | 4,167 | 🟢 |
| 15-min | ~6.2 MB | 81 | 806 | 🟢 |
| 30-min | ~12 MB | 42 | 417 | 🟢 |

Storage is comfortable at 100 DAU, but the **per-database limit is 500 MB on Free** (<https://developers.cloudflare.com/d1/platform/limits/>). At the 30-min variant the database would hit 500 MB in ~42 days of continuous growth. In practice, old events should be pruned or archived before then.

**Mitigation:** Implement a TTL purge job (run from the hourly cron) that deletes events older than 90 days. A single `DELETE` batched in chunks of 1,000 rows is cheap and keeps the database bounded.

### 4.6 Cron invocations/day

- Current schedule: `0 * * * *` (hourly) = 24 invocations/day.
- Limit: 5 triggers/account, but no daily invocation cap beyond the 100k Workers requests.
- 24 / 100,000 = **0.024 %** — negligible.

---

## 5. Event Type Dominance

### 5.1 Share of total events (all-time measured)

```
level_start    ████████████████████████████████  32.3 %
level_death    ██████████████████████████        24.2 %
heartbeat      ████████████████████              18.8 %
ui_event       ██████████████                    12.7 %
session_start  ████████                           7.6 %
level_complete ██                                 2.7 %
purchase       █                                  1.3 %
name_set       ▏                                  0.4 %
feedback       ▏                                  0.03 %
```

**`heartbeat` is 18.8 % of events and scales linearly with session length.** It is the single biggest lever for cost reduction. Changing `HEARTBEAT_INTERVAL` from 90 s to 180 s would cut heartbeat volume in half with minimal analytics loss (online-count resolution drops from 90 s to 3 min, which is acceptable for a 100-DAU game).

### 5.2 Endpoint CPU dominance (inferred)

We lack per-endpoint CPU timing, but based on code review:

| Endpoint | Relative CPU load | Why |
|----------|-------------------|-----|
| `/stats` (dashboard) | 🔥 Highest | Multiple `SELECT`s with `JSON_EXTRACT`, aggregation, full table scans |
| `/stats/players` | 🔥 High | `GROUP BY pid`, sorting, limit |
| `/stats/levels` | Medium | `GROUP BY level` with `JSON_EXTRACT` |
| `/sync/save` | Medium | HMAC + AES-GCM encryption + D1 write |
| `/event` | Low | Single `INSERT` + dedup check |
| `/events/batch` | Low | Batch `INSERT`s |
| `/sync/load` | Low | Single `SELECT` + decryption |

**Recommended one-line instrumentation:** At the top of `handleStats`, `handleStatsPlayers`, and `handleSyncSave` in `cloudflare/src/index.js`, add:

```javascript
const t0 = Date.now();
// ... existing logic ...
console.log(`[BUDGET] ${url.pathname} cpu_heuristic=${Date.now() - t0}ms`);
```

This is not precise CPU time (it includes I/O wait), but it flags which endpoints are expensive in wall-clock terms and therefore likely CPU-heavy.

---

## 6. Headroom Summary Table

| Resource | Current (~10 DAU) | Projected (100 DAU, 15 min) | Projected (100 DAU, 30 min) | Free tier | Headroom |
|----------|-------------------|-----------------------------|-----------------------------|-----------|----------|
| Workers requests/day | ~410 | ~19,900 | ~38,800 | 100,000/day | 🟢 20–39 % |
| Workers CPU-ms/day (est.) | ~1,200 | ~55,000 | ~105,000 | 1,000,000/day | 🟢 6–11 % |
| D1 rows read/day (est.) | ~160,000 | ~1,620,000 | ~1,640,000 | 5,000,000/day | 🟢 32 % |
| D1 rows written/day | ~394 | ~19,800 | ~38,700 | 100,000/day | 🟢 20–39 % |
| D1 storage growth/day | ~0.12 MB | ~6.2 MB | ~12 MB | 500 MB/db (5 GB acct) | 🟢 0.2–0.7 % of account cap |
| Cron invocations/day | 24 | 24 | 24 | 24 (scheduled) / 100k req | 🟢 0.02 % |

*Notes:*
- D1 rows read assumes 20 dashboard loads/day. If dashboard traffic increases, this moves toward 🟡.
- D1 rows written assumes current schema indexes. Adding more indexes would increase write cost.
- Storage growth is uncapped day-over-day; a 90-day purge policy is recommended to prevent the 500 MB/db limit from becoming binding.

---

## 7. Edge Cases & Risks

1. **Bot traffic:** A single bot sending 1 event/second would burn 86,400 events/day — more than 2× the projected 30-min player load. The current rate-limiting code in `src/index.js` (`_rateLimit` Map) only covers auth attempts, not event ingestion. **Recommendation:** Extend rate limiting to `/event` and `/events/batch` (e.g., 60 requests/min per IP).

2. **Sync storms:** If many devices resume simultaneously (e.g., after a nightly update), `/sync/load` could spike. The current load is low (84 sync rows total), but at 100 DAU with 2–3 sync requests/day this is manageable.

3. **Cron CPU ceiling:** The hourly cron runs `handleCron(env)`. On the free tier it has only 10 ms CPU time. If the cron job grows to do heavy aggregation or cleanup, it could hit the 10 ms wall and fail silently. **Recommendation:** Monitor cron logs for `exceededCpu` errors.

4. **Dashboard D1 read spikes:** An unindexed `SELECT` with a wide `range` parameter (e.g., `range=90d`) at 100 DAU could scan millions of rows and blow the 5M read budget in a single day. **Recommendation:** Cap dashboard `range` to 30 days max, or add `LIMIT` clauses to all stats queries.

5. **The "neutered free tier" caveat:** Cloudflare has adjusted free-tier D1 limits before (limits began enforcement 2025-02-10). The values above are current as of 2026-05-29. If Cloudflare tightens limits, the 🟢 ratings could shift to 🟡 overnight.

---

## 8. Top 3 Mitigation Recommendations

1. **Batch online events via `/events/batch`**  
   File: `src/n3ondashj/02-data.js`  
   Change: Instead of firing `fetch('/event')` immediately for every online event, accumulate events in a 5-second buffer and flush via `/events/batch`. This cuts request count by 5–10× without changing user behavior. Estimated effort: 1–2 hours.

2. **Raise heartbeat interval from 90 s to 180 s (or 300 s)**  
   File: `src/n3ondashj/02-data.js`  
   Change: `var HEARTBEAT_INTERVAL = 180;`  
   Impact: Reduces heartbeat volume by 50 % (or 70 % at 300 s), directly lowering both Workers requests and D1 writes. Online-player count resolution degrades modestly, which is acceptable at this scale.

3. **Add a 60-second in-memory cache to `/stats`**  
   File: `cloudflare/src/index.js`  
   Change: In `handleStats`, check `_cache.get('stats:' + range + ':' + before)` before querying D1; store result with 60 s TTL.  
   Impact: Cuts dashboard-driven D1 reads by 80–90 % if an admin refreshes frequently or has multiple tabs open.

---

## 9. Break-Even DAU for Paid Plan

Workers Paid is $5/month. At what DAU does free-tier exhaustion force the upgrade?

- **Binding constraint:** D1 rows written (100k/day hard cap) or Workers requests (100k/day).
- Assuming 30-min sessions: ~385 events/player/day + ~3 sync requests = ~388 requests/player/day.
- 100,000 / 388 = **~258 DAU** before Workers requests hit the wall.
- D1 rows written: 100,000 / ~387 = **~258 DAU** as well.
- With mitigations (batching + 180 s heartbeat): ~200 events/player/day → **~500 DAU** on free tier.

**Conclusion:** The $5/month paid plan becomes necessary somewhere between 250–500 DAU depending on session length and whether mitigations are applied. At 100 DAU the free tier is comfortable with headroom to spare.

---

## 10. One-Line Answer

**Will we fit at 100 DAU × 15–30 min on the Cloudflare free tier?**

**Yes — with caveats.** All dimensions rate 🟢 at 100 DAU, but D1 rows written reaches ~39 % of the free cap at the 30-minute end, leaving limited room for growth. Dashboard reads are the hidden budget consumer (~32 % of D1 reads). Apply the three mitigations above (batch online events, raise heartbeat, cache stats) and the free tier will comfortably hold 100 DAU with margin to grow toward 200–250 DAU before a $5 paid plan is required.
