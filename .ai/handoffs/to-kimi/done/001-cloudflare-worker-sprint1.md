# Handoff to Kimi — Cloudflare Worker Sprint 1 (Security + Correctness)

**From:** claude-code
**To:** kimi-cli
**Date:** 2026-05-26
**Scope:** `cloudflare/` Worker + D1 only. Client-side coordination is being handled by kiro in parallel — see `.ai/handoffs/to-kiro/open/002-client-sync-migration.md` for the matching client work.

**Context:** Comprehensive read-only review of `cloudflare/` complete. Four subagents (reviewer, security-auditor, dashboard UX, data analyst) returned. Findings synthesized in:
- `.ai/reports/cloudflare-comprehensive-review-2026-05-26.md`
- `.ai/reports/cloudflare-security-audit-2026-05-26.md`

Secret rotation + auth hardening were explicitly deferred during the v1.2.51 dashboard overhaul sprint. Sprint 1 unblocks them.

---

## What I need you to ship — server-side only

### Critical security

**1. Move all three secrets out of `wrangler.toml`.**
File: `cloudflare/wrangler.toml:6-10`. The `ENCRYPTION_KEY` value literally matches the placeholder pattern from the comment above it (`0123456789abcdef…cdef` repeated). If this is the deployed value, every cloud save is decryptable by anyone with repo access.
- `wrangler secret put DASHBOARD_KEY` (generate fresh)
- `wrangler secret put SYNC_SALT` (generate fresh)
- `wrangler secret put ENCRYPTION_KEY` (generate fresh 32-byte hex)
- Delete the `[vars]` lines from `wrangler.toml`
- **Dual-key window for save migration:** keep old key as `ENCRYPTION_KEY_LEGACY`. In `handleSyncLoad`, try the new key first; on AES failure fall back to `ENCRYPTION_KEY_LEGACY`. On `handleSyncSave`, always re-encrypt with the new key. After 30 days drop the legacy path.
- `git filter-repo --invert-paths --path cloudflare/wrangler.toml` (or BFG) to scrub history; force-push; rotate any deploy keys/CI tokens that used the old `DASHBOARD_KEY`.

**2. Gate `/sync/forgot-pin` and delete the 500-row decrypt fallback.**
File: `cloudflare/src/index.js:1926-2037` and `1964-1986`.
- Current flow: anyone who knows `username + mmyy` (4-digit birth month/year ≈ 100 combos) can reset any PIN. Only gate is 3/min per IP — bypassable via residential proxy.
- Fallback decrypts up to 500 random rows per call; accounts beyond row 500 are permanently unreachable AND it's a CPU-DoS amplifier.
- **Required new behavior:** require either `oldPin` OR `recoveryCode` in the request body. Apply per-`(username, mmyy)` lockout matching `sync_attempts` semantics (5 attempts, 1-hour cooldown).
- **30-day legacy window:** while a server flag `LEGACY_FORGOT_PIN = true` is set, also accept the bare `(username, mmyy)` flow for accounts where `recovery_code_hash IS NULL`. After 30 days flip the flag off. Coordinate the timing with kiro (handoff 002 ships the client prompt that backfills `recovery_code_hash`).
- New endpoint `/sync/set-recovery-code`: takes `{username, mmyy, pin, recoveryCode}`, validates PIN, stores hashed recovery code on the account.

**3. PBKDF2/Argon2id PIN hashing with per-account salt.**
Today: single HMAC-SHA256 with global `SYNC_SALT`. GPU cracks 6-digit PIN space in seconds offline once salt leaks (and it has via wrangler.toml).
- Schema additions on `sync_states` (or wherever PIN hash lives): `pin_salt TEXT`, `pin_hash_algo TEXT` ('hmac' | 'pbkdf2').
- Lazy migrate: on next successful login validated against the legacy `hmac` hash, recompute with PBKDF2 (≥600k rounds, per-account 16-byte random salt) and write back. Set `pin_hash_algo='pbkdf2'`.
- New accounts: PBKDF2 from day one.
- Web Crypto API supports PBKDF2 in the Workers runtime — no extra dep needed.

**4. Make `handleSyncSave` atomic.**
File: `cloudflare/src/index.js:1493-1727`. Reads `existing`, merges in JS, then UPSERTs — no transaction. Two devices saving in parallel race; "cloud wins" fields (`equippedSkills`, `dailyStreak`, settings) can revert.
- Option A (recommended): wrap reads + write in `env.DB.batch([…])` so D1 executes them as a single statement group.
- Option B: stamp `updated_at` on the read, add `WHERE updated_at = ?` to the UPSERT, retry on conflict (optimistic concurrency, max 3 retries with jittered backoff).
- Either works; A is simpler.

**5. Constant-time secret comparisons.**
File: `cloudflare/src/index.js` at `/auth` handler, cookie-verify path, event HMAC verify. Replace `===` and `===`-equivalent string compares with a constant-time helper (XOR-accumulate over equal-length strings; return true only if accumulator===0). Trivial 6-line helper.

### Critical correctness

**6. Fix `/admin/sync/reset-pin` — selects column that doesn't exist.**
File: `cloudflare/src/index.js:2122`.
```js
// Currently:
const row = await env.DB.prepare('SELECT username FROM sync_states WHERE key_hash = ?')…
const decrypted = await aesDecrypt(row.data_json, env.ENCRYPTION_KEY);
// sync_states has no `username` column. `row.data_json` is undefined.

// Fix:
const row = await env.DB.prepare('SELECT data_json FROM sync_states WHERE key_hash = ?')…
```
This endpoint has been broken since it was written; throws D1 error on first row read.

**7. Stop the hourly cron from writing partial today-totals.**
File: `cloudflare/src/index.js:2397-2403`. `aggregateDailyStats(env, 0)` writes partial today data into `stats_daily` keyed by `(date, level=99)`. Dashboard fast-path in `handleStats` (~454) and `handleStatsEconomy` (~920) treats it as authoritative. Visible symptom: 31d/all KPIs **dip** every hour right after cron runs, climb back over the hour.
- Recommended fix: stop aggregating today entirely; only aggregate completed UTC days. Remove the `aggregateDailyStats(env, 0)` call from the hourly cron; keep the yesterday + days-2-7 paths.
- Alternative: exclude today from fast path (`date < today`) and live-query today's bucket on every dashboard call.

**8. Fix `stats_daily` global-row sentinel collision.**
File: `cloudflare/src/index.js:2300-2310`. PK `(date, level)` with `level=99` collides if levels expand past 19. Comment in code admits the risk.
- Recommend: switch to `level=-1` for the global row. Negative sentinel can't collide with real levels. One-line change in `aggregateDailyStats` plus a backfill of existing `level=99` rows.

**9. Materialize the schema as `migrations/000_init.sql`.**
Core tables — `events`, `sessions`, `sync_states`, `sync_lookup`, `sync_attempts`, `sync_history` — have **zero source-controlled DDL**. They live only in production via 11 inline `CREATE TABLE IF NOT EXISTS` fallbacks across `index.js` (lines 310, 1183, 1735, 1815, 1954, 2046, 2068, 2092, 2105, 2181, 2321 per grep).
- Dump current production schema: `wrangler d1 execute ndj-metrics-db --remote --command ".schema"`
- Write `migrations/000_init.sql` with the canonical DDL — `CREATE TABLE IF NOT EXISTS` so re-running is safe on existing prod.
- Remove the 11 inline fallback CREATEs once 000 is applied to prod.
- **Also add:** `CREATE INDEX idx_sync_lookup_user_mmyy ON sync_lookup(username, mmyy)`. Currently `handleSyncForgotPin`'s `WHERE username=? AND mmyy=?` is a full table scan.

**10. UTC vs UTC+7 caption mismatch.**
File: `cloudflare/src/dashboard/tabs/Sessions.jsx`, lines ~76 and ~82. One heatmap labels "UTC+7", the other "UTC". Pick UTC+7 (footer already commits to it), update both labels. Aggregation queries should stay in UTC; only the display label changes.

---

## Coordination with kiro (client side)

Kiro's handoff (`.ai/handoffs/to-kiro/open/002-client-sync-migration.md`) covers the matching client work:

- Client adds an `event_uuid` field on every `/event` and `/events/batch` POST. **Server should add a UNIQUE constraint** on `events.event_uuid` and silently ignore duplicates. Treat NULL `event_uuid` as legacy (allow during the same 30-day window).
- Client shows a one-time "set recovery code" modal after `/sync/load` returns `requiresRecoveryCodeSetup: true`. **Server should add that field to `/sync/load` response** when `sync_states.recovery_code_hash IS NULL`.
- Client expects new endpoint `/sync/set-recovery-code` (see #2 above).
- Client expects `/sync/forgot-pin` to accept an optional `recoveryCode` field. Server validates against stored hash before accepting `newPin`.

These contracts need to land in your sprint so kiro's client work can integrate. If you change endpoint shapes from what I described, update the kiro handoff before they start.

---

## What I'm explicitly NOT asking for in this sprint

These are real findings but deferred to sprint 2+:

- JSON_EXTRACT → real columns migration (events.is_daily, country, app_version, cause, cost)
- Retention math rewrites (D1/D7/D30 windows, ISO-week algorithm, FIRST_SESSION_WINDOW enforcement)
- DAU/WAU/MAU proper time-series
- `players` dimension table
- Splitting `index.js` into `routes/`
- Dashboard P0/P1 UX fixes (group tabs, alerts on overview, player modal action reorder)
- GDPR export/delete endpoints
- 90-day event TTL deletion in cron
- Server-side `purchase` event validation against `sync_states` balance

---

## Verification criteria

After your sprint-1 PRs land, expected state:

1. `wrangler.toml` has zero `[vars]` entries (except non-secret config); secrets only in `wrangler secret list`.
2. `git log -p -- cloudflare/wrangler.toml` no longer shows historical key values.
3. POST `/admin/sync/reset-pin` with a known `key_hash` returns 200 (or sensible 404), not 500.
4. `/sync/forgot-pin` without `recoveryCode` and within the 30-day legacy window: works once, then locks out per-(username, mmyy) after 5 attempts. After window ends: requires `recoveryCode`.
5. Dashboard "Total Players (30d)" KPI stays monotonic across an hourly cron tick (no visible dip).
6. `cloudflare/migrations/000_init.sql` exists; `wrangler d1 migrations apply` on a fresh local DB produces the same schema as prod.
7. Two parallel `/sync/save` calls from two devices — both succeed; final state has both devices' changes merged (no clobber).
8. POSTing the same `event_uuid` twice inserts one row, not two.

---

## Files for you to read first

- `.ai/reports/cloudflare-comprehensive-review-2026-05-26.md` (synthesis — start here)
- `.ai/reports/cloudflare-security-audit-2026-05-26.md` (security-auditor full detail)
- `cloudflare/src/index.js` (line refs above)
- `cloudflare/wrangler.toml` (secrets to rotate)
- `cloudflare/migrations/*.sql` (existing migration style)

When complete, prepend an entry to `.ai/activity/log.md` and move this handoff to `.ai/handoffs/to-kimi/done/`.

Questions / scope disagreements: write back via `.ai/handoffs/to-claude/open/`.
