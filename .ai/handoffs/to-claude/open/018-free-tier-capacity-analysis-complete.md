# Handoff Completion — 018: Free-Tier Capacity Analysis

**From:** kimi-cli  
**To:** claude-code (orchestrator)  
**Date:** 2026-05-29  
**Status:** Complete — read-only analysis, no code changes, no deploys.

---

## One-line answer

**Yes — with caveats.** All dimensions rate 🟢 at 100 DAU, but D1 rows written reaches ~39 % of the free cap at the 30-minute end, leaving limited room for growth. Dashboard reads are the hidden budget consumer (~32 % of D1 reads). Apply the three mitigations below and the free tier will comfortably hold 100 DAU with margin to grow toward 200–250 DAU before a $5 paid plan is required.

---

## Headroom Summary Table (copy-pasted from report)

| Resource | Current (~10 DAU) | Projected (100 DAU, 15 min) | Projected (100 DAU, 30 min) | Free tier | Headroom |
|----------|-------------------|-----------------------------|-----------------------------|-----------|----------|
| Workers requests/day | ~410 | ~19,900 | ~38,800 | 100,000/day | 🟢 20–39 % |
| Workers CPU-ms/day (est.) | ~1,200 | ~55,000 | ~105,000 | 1,000,000/day | 🟢 6–11 % |
| D1 rows read/day (est.) | ~160,000 | ~1,620,000 | ~1,640,000 | 5,000,000/day | 🟢 32 % |
| D1 rows written/day | ~394 | ~19,800 | ~38,700 | 100,000/day | 🟢 20–39 % |
| D1 storage growth/day | ~0.12 MB | ~6.2 MB | ~12 MB | 500 MB/db (5 GB acct) | 🟢 0.2–0.7 % of account cap |
| Cron invocations/day | 24 | 24 | 24 | 24 (scheduled) / 100k req | 🟢 0.02 % |

---

## Top 3 Mitigation Recommendations

1. **Batch online events via `/events/batch`**  
   File: `src/n3ondashj/02-data.js`  
   Change: Accumulate events in a 5-second buffer and flush via `/events/batch`. Cuts request count by 5–10×. Effort: 1–2 hours.

2. **Raise heartbeat interval from 90 s to 180 s (or 300 s)**  
   File: `src/n3ondashj/02-data.js`  
   Change: `var HEARTBEAT_INTERVAL = 180;`  
   Impact: Reduces heartbeat volume by 50 % (or 70 % at 300 s), directly lowering Workers requests and D1 writes.

3. **Add a 60-second in-memory cache to `/stats`**  
   File: `cloudflare/src/index.js`  
   Change: Check `_cache.get('stats:' + range + ':' + before)` before querying D1; store with 60 s TTL.  
   Impact: Cuts dashboard-driven D1 reads by 80–90 %.

---

## Self-grep-verify (per AGENTS.md §7)

### Report exists with expected sections
```
## 1. Current Behavioral Baseline (Measured)
## 2. Projection to 100 DAU × 15–30 min
## 3. Free-Tier Limits (Authoritative)
## 4. Headroom Analysis
## 5. Event Type Dominance
## 6. Headroom Summary Table
## 7. Edge Cases & Risks
## 8. Top 3 Mitigation Recommendations
## 9. Break-Even DAU for Paid Plan
## 10. One-Line Answer
```

### Cited Cloudflare docs URLs
```
<https://developers.cloudflare.com/workers/platform/pricing/>
<https://developers.cloudflare.com/workers/platform/limits/>
<https://developers.cloudflare.com/d1/platform/pricing/>
<https://developers.cloudflare.com/d1/platform/limits/>
```

### Has actual measured numbers
```
| Events/day | 3,740 | 19,600 | 38,500 |
| **Total Workers requests/day** | **~4,084** | **~19,924** | **~38,844** |
| Events growth / day: 3,740 × 250 B = **0.89 MB/day**
| **Projected net growth: ~1.2 MB/day (baseline), ~6.2 MB/day (15 min), ~12 MB/day (30 min).**
```

### Mitigation proposals (concrete files/functions)
```
File: `src/n3ondashj/02-data.js`
File: `cloudflare/src/index.js`
var HEARTBEAT_INTERVAL = 90;
`/events/batch`
```

---

## Queries executed (≥ 5 distinct)

1. `SELECT COUNT(*) as total_events FROM events;`
2. `SELECT type, COUNT(*) as count, ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM events), 2) as pct FROM events GROUP BY type ORDER BY count DESC;`
3. `SELECT MIN(datetime(server_ts / 1000, 'unixepoch')) as earliest, MAX(datetime(server_ts / 1000, 'unixepoch')) as latest, COUNT(DISTINCT date(server_ts / 1000, 'unixepoch')) as distinct_days FROM events;`
4. `WITH sessions AS (SELECT pid, server_ts, type, SUM(CASE WHEN type = 'session_start' THEN 1 ELSE 0 END) OVER (PARTITION BY pid ORDER BY server_ts) as session_num FROM events) SELECT COUNT(*) as total_sessions, ROUND(AVG(session_length_sec), 2) as avg_session_sec, ROUND(AVG(events_in_session), 2) as avg_events_per_session FROM (SELECT pid, session_num, COUNT(*) as events_in_session, (MAX(server_ts) - MIN(server_ts)) / 1000.0 as session_length_sec FROM sessions GROUP BY pid, session_num HAVING session_num > 0);`
5. `SELECT date(server_ts / 1000, 'unixepoch') as day, COUNT(DISTINCT pid) as dau, COUNT(*) as total_events, ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT pid), 2) as events_per_dau FROM events WHERE date(server_ts / 1000, 'unixepoch') >= date('now', '-7 days') GROUP BY day ORDER BY day;`
6. `SELECT SUM(CASE WHEN offline = 1 THEN 1 ELSE 0 END) as offline_events, SUM(CASE WHEN offline = 0 THEN 1 ELSE 0 END) as online_events, COUNT(*) as total FROM events;`
7. `SELECT COUNT(*) as sync_rows FROM sync_history;`
8. `SELECT AVG(LENGTH(data)) as avg_data_len, AVG(LENGTH(pid)) as avg_pid_len, AVG(LENGTH(type)) as avg_type_len FROM events;`

Total: **8 distinct queries** against prod D1.

---

## Files touched

- `.ai/reports/free-tier-capacity-analysis-2026-05-29.md` (created, 419 lines)
- `.ai/handoffs/to-claude/open/018-free-tier-capacity-analysis-complete.md` (created)
- `.ai/handoffs/to-kimi/open/018-free-tier-capacity-analysis.md` → moved to `.ai/handoffs/to-kimi/done/` (pending)

No code changes in `cloudflare/src/`.

---

## Activity log entry (prepend)

```markdown
- **2026-05-29** — `018-free-tier-capacity-analysis` complete. Answer: **yes — with caveats**. Free tier holds 100 DAU × 15–30 min (🟢 across all dimensions), but D1 rows written hits ~39 % at 30 min. Three mitigations identified: batch online events, raise heartbeat to 180 s, cache `/stats` for 60 s. Break-even for paid plan: ~250–500 DAU depending on mitigations.
```
