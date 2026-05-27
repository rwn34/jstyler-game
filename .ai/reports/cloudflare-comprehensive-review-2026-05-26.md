# Cloudflare Service — Comprehensive Review

**Date:** 2026-05-26  
**Scope:** `cloudflare/` Worker + Preact dashboard + D1 schema + ops, plus player-facing context from https://rwn34.itch.io/n3ondashj  
**Reviewers (parallel subagents):**
- `reviewer` — Worker code correctness/quality
- `security-auditor` — secrets, auth, crypto, injection, rate-limit, PII
- `product` (dashboard UX) — IA, workflow, accessibility, mobile, actionability
- `product` (data analyst) — schema, event taxonomy, aggregations, retention math, scale

This document synthesizes all four reports plus orchestrator observations.

Companion reports:
- `.ai/reports/cloudflare-security-audit-2026-05-26.md` (security-auditor full)

---

## TL;DR

The system is functionally rich and recently overhauled (v1.2.51, +12 endpoints, 32 dashboard modules, 165KB bundle). The dashboard is genuinely strong: hash-deep-linkable, CSV-exporting, accessibility-wired, real admin actions. But there are **non-negotiable security fixes** that need to ship before this scales any further, plus a cluster of correctness bugs in aggregations that are silently producing wrong numbers right now.

**Top 5 must-fix this week:**

1. **Rotate `ENCRYPTION_KEY`, `DASHBOARD_KEY`, `SYNC_SALT`** — all three plaintext in `wrangler.toml`, the encryption key matches the placeholder pattern. Move to `wrangler secret put`.
2. **Gate or remove `/sync/forgot-pin`** — one-factor account takeover (username + 4-digit mmyy), plus 500-row decrypt fallback that's both unreachable beyond row 500 AND a CPU-DoS amplifier.
3. **Fix `/admin/sync/reset-pin`** — selects column `username` from `sync_states` which doesn't exist. Path is dead on arrival (throws D1 error before decrypt).
4. **Fix the silent "31d/all totals dip every hour" bug** — cron writes partial today-totals into `stats_daily` keyed by `(date, level=99)`; dashboard fast-path treats them as authoritative.
5. **Materialize the schema.** Core tables (`events`, `sessions`, `sync_states`, `sync_lookup`, `sync_attempts`, `sync_history`) have zero source-controlled DDL — they exist only in production, recreated by inline `CREATE TABLE IF NOT EXISTS` fallbacks scattered across 11 locations in `index.js`.

---

## 1. Security — Critical

### S1. Plaintext secrets in `wrangler.toml`
File: `cloudflare/wrangler.toml:6-10`, committed since 8b6b0cf (v1.1.14) and 67aa7c9 (v1.2.51).
```
DASHBOARD_KEY  = "qwepoi123098"
SYNC_SALT      = "ndj-sync-v1-salt"
ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```
The `ENCRYPTION_KEY` value is the placeholder pattern from the comment above it — likely never replaced before deploy. Anyone with repo/git access can:
- Decrypt every cloud save (`sync_states.data_json`)
- Forge dashboard/admin auth (key is also the HMAC secret — see S5)
- Offline-crack every PIN (see S3)

**Fix:** `wrangler secret put DASHBOARD_KEY`, `wrangler secret put SYNC_SALT`, `wrangler secret put ENCRYPTION_KEY`. Rotate the encryption key — accepting save loss (or re-encrypt batch in cron). Rotate the dashboard password. Remove from `wrangler.toml` and git history (`git filter-repo`).

### S2. `/sync/forgot-pin` is one-factor account takeover
File: `cloudflare/src/index.js:1926-2037`
- Inputs: `{username, mmyy, newPin}` — no email verify, no security question, no per-account lockout.
- mmyy is a 4-digit birth month/year (≈100 plausible combos, ~150-200 max). Username is often public.
- Only gate: 3 attempts/min per IP. Defeat: residential proxy.
- Side oracle: `console.log` on `/sync/check` failures leaks `username+mmyy` pairs into Cloudflare logs.
- `sync_lookup` stores username and mmyy in plaintext, enabling enumeration.

On reset, the device list is rotated, kicking the real owner out.

**Fix (minimum):** require the old PIN OR a server-issued recovery code generated at signup. Apply per-`(username, mmyy)` lockout matching `sync_attempts`. Stop logging the pair.

### S3. PIN "hashing" is single HMAC-SHA256 with global salt
6-digit PIN space = 10^6. Single HMAC-SHA256 round = a GPU cracks the whole space in seconds *offline* if `SYNC_SALT` leaks (and it has — see S1).

**Fix:** PBKDF2 (>=600k rounds) or Argon2id with a **per-account random salt** stored alongside the hash. Migration: lazy on next login.

### S4. Forgot-PIN 500-row fallback
File: `cloudflare/src/index.js:1964-1986`
On `sync_lookup` miss, the code does `SELECT key_hash, data_json FROM sync_states LIMIT 500` (no `ORDER BY`) and AES-decrypts each, comparing `parsed.playerName === username`.
- Accounts beyond implementation-defined row 500 are **permanently unreachable** via forgot-PIN.
- 500 AES-GCM decrypts per call → CPU-burns toward the 50ms budget. Trivial DoS amplifier.
- Combined with S2, brute-forces (username, mmyy) without sending any keys.

**Fix:** delete the fallback. `sync_lookup` migrate-on-load already exists (line 1810); legacy rows backfill organically.

### S5. Non-constant-time secret comparisons
`/auth`, cookie verify, and event HMAC verify use `===`. Worker JS-level timing attacks are weaker than network-level ones, but on a cold isolate the difference is measurable.

**Fix:** constant-time compare helper (XOR each char, OR into accumulator).

### S6. `handleSyncSave` race — double-spend possible
File: `cloudflare/src/index.js:1493-1727`. Reads `existing`, merges in JS, then UPSERTs. No transaction. Two parallel saves from two devices: both read same `existing`, both add purchases, second clobbers first OR both succeed and balance check passes twice on the same gold.

**Fix:** wrap reads + write in `env.DB.batch([...])`, OR stamp `updated_at` on read and use optimistic concurrency (`WHERE updated_at = ?`) with retry.

### S7. Per-isolate rate limit is effectively unlimited
File: `cloudflare/src/index.js:114-139`. `_rateLimit` Map and `_bannedPids` cache live in module state — each Cloudflare isolate (multiple per colo, many colos) has its own. Advertised 600/5min becomes 600× isolate count.

**Fix:** Durable Objects for true global rate limit, or the Cloudflare Rate Limiting API; document the limitation explicitly otherwise.

### S8. IN-list SQL string interpolation
Geo and retention slow-path build `IN (?,?,…)` placeholder strings via template literal. Safe today because counts are derived server-side, but the pattern invites a future regression where an unvalidated count flows in.

**Fix:** centralize an `inClause(n)` helper; assert `n > 0 && Number.isSafeInteger(n)`.

### S9. `/sync/check` has no rate limit
And it returns decrypted summary fields. Enumeration target.

### S10. Dashboard cookie auth weak
File: `cloudflare/src/index.js:190-205`. HMAC over `expiresAt` only — no nonce, no user binding, no revocation list. Anyone with a captured cookie has 7 days of access. Also reuses `DASHBOARD_KEY` as HMAC secret.

**Fix:** add random nonce stored in a small KV table for revocation; separate the HMAC secret from the login password.

---

## 2. Correctness bugs (silent wrong data right now)

### B1. `/admin/sync/reset-pin` is broken
File: `cloudflare/src/index.js:2122`
```js
const row = await env.DB.prepare('SELECT username FROM sync_states WHERE key_hash = ?')…
…
const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
```
`sync_states` has no `username` column. Throws D1 error on first call.
**Fix:** `SELECT data_json FROM sync_states WHERE key_hash = ?`.

### B2. Hourly cron writes partial "today" totals → 31d/all dashboard dips after every tick
File: `cloudflare/src/index.js:2397-2403`. `aggregateDailyStats(env, 0)` runs hourly, computes partial today data, UPSERTs into `stats_daily` with `(date, level=99)` sentinel. Fast-path in `handleStats` (~454) and `handleStatsEconomy` (~920) treats partial rows as authoritative.

**Fix:** exclude today from fast path (`date < today`) and live-query today's bucket, OR skip aggregating today entirely until the UTC day rolls over.

### B3. `stats_daily` "level=99" global-row sentinel collides with real level 99
File: `cloudflare/src/index.js:2300-2310`. PK `(date, level)` can't accept NULL, so code stamps `level=99` for the global row. Comment even admits the collision risk. Game currently has 20 levels; safe today, breaks if expanded.

**Fix:** separate `stats_daily_global` table OR use `level=-1`.

### B4. `AVG(avg_ms)` rollup across days = average-of-averages
File: `cloudflare/src/index.js:635` and similar. When daily sample sizes differ (they always do), the average of daily averages ≠ overall average. Median times in the dashboard are subtly wrong.

**Fix:** `SUM(total_time)/SUM(count)`. Add `total_ms` and `total_starts` columns to `stats_daily`.

### B5. Fast-path multi-day `SUM(unique_players)` double-counts
A player active on Mon and Tue counts as 2 unique players over 2 days. The "last 7 days players" KPI is inflated.

**Fix:** maintain `distinct_pids_set` is impractical; store rolling 7d/30d distinct counts as a separate table that's recomputed by cron with a proper `COUNT(DISTINCT pid)` over the window.

### B6. `FIRST_SESSION_WINDOW` declared but never applied
File: `cloudflare/src/index.js` — `handleStatsFunnel`. The 30-min "first session" gate is dead code. A player who completes level 0 a week after `name_set` counts as funnel-passing. The funnel doesn't actually measure first-session conversion.

**Fix:** apply the window in the WHERE clause.

### B7. Retention week-bucketing uses naïve year-day math, not real ISO-8601
File: `cloudflare/src/index.js` retention computation. `Math.ceil((day + jan1.getDay() + 1)/7)`. Wrong on year boundaries; week-52 vs week-53 edge cases.

**Fix:** use proper ISO-8601 (Thursday-of-week algorithm) — or switch to calendar-day-since-install instead of ISO weeks.

### B8. Inconsistent retention windows
D1 = `[+24h, +48h)` (1-day window), D7 = `[+6d, +8d)` (2-day window), D30 = `[+29d, +31d)` (2-day window). Mixing widths inflates D7/D30 vs D1.

**Fix:** pick one definition (industry standard: active on calendar day +1/+7/+30) and apply uniformly.

### B9. UTC vs UTC+7 caption mismatch in Sessions tab
File: `cloudflare/src/dashboard/tabs/Sessions.jsx` lines ~76 and ~82 — one heatmap labeled "UTC+7", the other "UTC". Operators reading both will get wrong conclusions.

**Fix:** pick one timezone for display, label everywhere consistently. Aggregation queries should stay UTC; display can shift.

### B10. `purchase` events have no server-side validation
`level_complete` has anti-cheat (online delta check, `verified=0` for impossible scores). `purchase` events accept anything client-side. An attacker POSTs `{type:'purchase', data:{cost:1, currency:'gold', itemId:'champion-skin'}}` and it enters economy aggregates.

The only check is in `handleSyncSave` (line 1689-1696) which uses an *approximation* (`gold = sum(scores)/50 + bonus`) — a heuristic that drifts from the event stream.

**Fix:** require purchase events to reference a server-validated session token + a server-computed running balance.

### B11. No idempotency on `/event` or `/events/batch`
File: `cloudflare/src/index.js`. Flaky network retries → duplicate rows → double-counted currency, sessions, completions.

**Fix:** client-generated `event_uuid`, UNIQUE index on it, ignore-on-conflict.

### B12. Validation catches silently swallow errors
File: `cloudflare/src/index.js:318-330, 437-440`. `try { … } catch {}` with no log. Violates user's coding-standards.md ("every catch must log or re-throw").

**Fix:** at minimum `console.warn({pid, type, reason})` so malformed-event rates become a debuggable signal.

---

## 3. Scaling cliffs (will bite within months)

### P1. JSON_EXTRACT-heavy hot paths
68 occurrences. Every dashboard tab beyond Overview does full-range JSON scans on `events`. No expression index can help SQLite efficiently.

**Fix path:** promote hot fields to columns at ingest time:
- `events.is_daily INTEGER`
- `events.country TEXT` (was `data.$._cc`)
- `events.app_version TEXT` (was `data.$._v`)
- `events.cause TEXT` (death cause)
- `events.cost INTEGER` + `events.currency TEXT` for purchases

Then add indexes on `(country, server_ts)`, `(app_version, server_ts)`, `(is_daily, server_ts)`. Backfill via a one-shot SQL script.

### P2. Retention/funnel N+1 queries hit Worker subrequest limit
File: `cloudflare/src/index.js:2347-2360` (`computeRetention`), 2563-2570, 2748-2754, 2759-2764, 2776-2782 (champion + onboarding funnel).

One query per cohort member. Free plan: 50 subrequests/request. At 100+ new players in cohort → cron + dashboard tabs fail.

**Fix:** batched `IN (?,?,...)` pattern is already implemented in `handleStatsRetention` slow-path (line 2476). Apply that same pattern everywhere else.

### P3. No event retention DELETE
File: `cloudflare/src/index.js:2374-2395`. Cron *counts* `ninetyDaysAgo` events but never deletes. `events` grows unbounded; every `COUNT(*) FROM events` gets slower.

**Fix:** chunked delete (`DELETE … WHERE id IN (SELECT id FROM events WHERE server_ts < ? LIMIT 5000)`) in a loop until rows < threshold. Run nightly.

### P4. Several aggregates lack `WHERE server_ts > ?` and full-scan
e.g. `topVerified`, `topChampions` in `handleStatsPlayers` (~line 759). At 1M+ events this dominates wall-clock.

### P5. `events.pid` queries lack covering index
Common predicate `WHERE pid=? AND type='X' AND level=?` (used in anti-cheat at line 351 and per-player drilldown). Add `events(pid, type, level, server_ts)`.

### P6. `sync_lookup` has no `(username, mmyy)` index
File: `cloudflare/src/index.js:1735` etc. `handleSyncForgotPin`'s `WHERE username=? AND mmyy=?` is a full table scan.

**Fix:** `CREATE INDEX idx_sync_lookup_user_mmyy ON sync_lookup(username, mmyy)`.

---

## 4. Schema hygiene

### H1. Core tables not in migrations
`events`, `sessions`, `sync_states`, `sync_lookup`, `sync_attempts`, `sync_history` — DDL exists only as inline `CREATE TABLE IF NOT EXISTS` at 11 locations in `index.js`. Reproducibility risk; a fresh D1 instance bootstraps from whichever code path runs first.

**Fix:** `migrations/000_init.sql` capturing all core schemas. Then remove inline CREATEs. Add `migrations/003_canonical_secondary.sql` for `player_flags`, `feedback_status`.

### H2. `events.name` denormalization
Player handle stored on every row. Renaming a player ⇒ inconsistent history. Should be FK to a `players` dimension table that also stores first-seen, last-seen, country, app_version (materialized).

### H3. No `players` table
Many N+1 patterns evaporate if `players(pid, first_seen, last_seen, total_events, country, app_version)` exists and is upserted at ingest.

### H4. Money fields as REAL
Violates user's coding-standards.md ("money is BIGINT"). Low-stakes for soft currency but easy to fix.

---

## 5. Dashboard UX

### Strengths
- Hash-based deep linking, refresh-safe
- Per-tab 4-min cache + `CHECK NOW` invalidator
- Compare-period toggle with delta rendering (Amplitude-class)
- CSV export everywhere with RFC-4180 escaping
- Real admin actions (flag/ban/feedback) — not just a viewer
- Accessibility: skip link, ARIA tabs/sort/live, focus trap on modal, reduced-motion respect
- Chart-to-data mapping is correct (Funnel for conversion, Matrix+drilldown for cause analysis, etc.)

### P0 fixes (this sprint)
1. **Surface alerts on Overview.** Top-level "Health: OK / X alerts" badge. Currently buried on its own tab.
2. **Data-freshness indicator per tab.** `Last updated: 14:32 (3m ago)`, tied to `loadedAt[tab]`.
3. **PlayerModal action reorder.** Ban/Unban/Flag immediately under identity, not below 12 KPI cards.
4. **Compare toggle disabled state when `range=all`** instead of silent skip.
5. **Unify UTC vs UTC+7** captions across all heatmaps (B9).
6. **Paginate Players tab** — 9 tables, none paginated. `Table.jsx` already supports `pageSize`.
7. **Hide developer events from Overview** (`heartbeat`, `ui_event`) or put behind a toggle.

### P1 (this month)
8. **Group 15 tabs into 4 sections:** Today (Overview, Live Feed, Alerts) / People (Players, Watchlist, Retention, Feedback) / Game (Per Level, Daily, Sessions, Engagement, Economy) / Platform (Geo, App Ver, Cloud Sync).
9. **Make Alerts actionable.** Acknowledge / Mute(24h) / Jump-to-source. Persist ack state. Track new-since-last-view.
10. **Global filters:** country, app version, named/anon. Persist in URL hash.
11. **Cross-tab drilldown:** click level → filter Players/Sessions/Feed by that level.
12. **Extend Compare to Levels, Geo, Engagement** (currently only on Overview, Sessions, Economy).
13. **Feed: exponential backoff** on failure, default 5s with Fast/Slow chip, "N new since paused" badge.
14. **Mobile heatmap collapse** to 4-hour buckets under 600px.

### P2 (next quarter)
15. **Game selector** for the multi-game future (currently hardcoded to ndj).
16. **Saved views** (localStorage-backed named bookmarks).
17. **Chart annotations** for release events and high alerts.
18. **In-app session expiry warning** with silent refresh attempt.
19. **Consolidate Players tab** from 9 tables to 3 with segment chips.
20. **Playwright visual-regression baseline** (one snapshot per tab — cheap insurance against CSS regressions).

---

## 6. Worker engineering

### E1. Single 2839-LOC `index.js`
Router `if (path === ...)` chain at lines 3009-3163 is hard to scan. esbuild is already in use; cost-free to split:
```
src/index.js         (router entry)
src/routes/sync.js
src/routes/stats.js
src/routes/admin.js
src/routes/event.js
src/cron.js
src/lib/crypto.js
src/lib/d1.js
```

### E2. Error responses leak D1 messages
File: `cloudflare/src/index.js:3165`. `errResponse(err.message || 'server error', 500)` returns "SQLITE_ERROR: no such column: username" verbatim. Mild info disclosure. Log server-side, return generic to client.

### E3. Response envelope inconsistency
Mixes `{ok, data}`, `{ok:true, data:{}}`, direct Response objects. User's coding-standards.md prescribes `{success, data, error}`. Pick one; document in `docs/standards/` (which doesn't exist yet — create it).

### E4. `recordSyncFail` does two queries when one would do
File: `cloudflare/src/index.js:1452-1458`. `INSERT … ON CONFLICT DO UPDATE SET fails=fails+1` is one round-trip and atomic.

### E5. Cron logs unstructured
`console.log('cron ok', …)` instead of JSON. Cloudflare Logpush ingests both but filtering is easier with structured.

---

## 7. Player-facing context (from itch.io)

- Free HTML5, "neon precision platformer," 20 stages, 7 skills, 30+ cosmetics, ghost-replay, procedural synthwave, PIN cloud save, PWA, AI-assisted
- Tags: casual, jumping, neon, side-scroller, stickman
- Updated 1 day ago

**Storefront UX gaps (orthogonal to dashboard):**
- No gameplay GIF — static screenshots don't sell momentum
- Vague skill descriptions
- No difficulty indicator across stages

These are low-effort wins on the itch.io page itself; not in scope for the cloudflare/ stack but worth a separate ticket.

---

## 8. Prioritized roadmap

### Sprint 1 (this week — security + correctness emergencies)
- S1: rotate all three secrets via `wrangler secret put`; remove from `wrangler.toml`; rewrite git history
- S2: gate `/sync/forgot-pin` behind old-PIN-or-recovery-code; add per-account lockout
- S4: delete the 500-row decrypt fallback
- B1: fix `/admin/sync/reset-pin` column name
- B2: stop the hourly cron from writing partial today-totals
- B9: unify UTC captions
- H1: write `migrations/000_init.sql` capturing existing DDL

### Sprint 2 (this month — structural)
- S3: PBKDF2/Argon2id PIN hashing with per-account salt (lazy migrate)
- S6: atomic `handleSyncSave` (D1 batch or optimistic concurrency)
- S7: move rate limit to Durable Object
- B4, B5, B6, B7, B8: correctness fixes in aggregations + retention math + funnel
- B10, B11: server-side purchase validation; client event UUIDs for idempotency
- P3: 90-day event TTL DELETE in cron
- Dashboard P0 fixes (alerts on Overview, freshness indicator, paginate Players, modal action order, compare disabled state)

### Sprint 3 (next month — scaling + polish)
- P1: promote hot JSON fields to columns; backfill; add indexes
- P2: batch all retention/funnel queries
- H3: `players` dimension table
- E1: split `index.js` into routes/
- Dashboard P1 fixes (tab grouping, global filters, Alerts actionable, cross-tab drilldown)

### Sprint 4+ (quarter — strategic)
- GDPR export/delete endpoints
- Server-validated leaderboards + score signing
- Game selector for multi-game future
- Saved views, chart annotations, scheduled exports
- Playwright visual regression baseline
- Move dashboard auth cookie to nonce-based with KV revocation

---

## 9. What's working well (don't refactor)

- Build pipeline: esbuild + `wrangler dev` + raw-text imports for HTML/CSS/JS bundles. Clean.
- Hash routing in dashboard is well-modeled.
- CSV export with RFC-4180 + per-column overrides — quietly excellent.
- Accessibility primitives — skip link, ARIA, focus trap, reduced-motion. Better than most internal tooling.
- The chart selections (LineChart / AreaChart / Funnel / Heatmap / Matrix / Histogram) are correct fits for the data.
- Migration to Preact + htm + signals + uPlot was the right call for a 165KB bundle that runs natively from a Cloudflare Worker.

---

## Appendix — files touched

Reviewers read all of:
- `cloudflare/src/index.js` (2839 LOC)
- `cloudflare/src/dashboard/**` (32 files)
- `cloudflare/migrations/*.sql`
- `cloudflare/wrangler.toml`, `package.json`, `build.mjs`
- `cloudflare/CHANGELOG.md`
- https://rwn34.itch.io/n3ondashj (player-facing)

Full security report: `.ai/reports/cloudflare-security-audit-2026-05-26.md`.
