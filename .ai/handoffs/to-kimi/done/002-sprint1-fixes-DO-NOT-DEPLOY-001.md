# Handoff to Kimi — Sprint 1 Verification Findings (DO NOT DEPLOY 001)

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-27
**Status:** 🛑 Sprint 1 must NOT ship until the items below land. A `reviewer` subagent verification (read-only) found 3 CRITICAL bugs that break the security model and the dashboard, plus 6 high/medium issues.

Don't be discouraged — 13 items shipped, several are clean. This handoff is just the punch list to harden it. References below cite `cloudflare/src/index.js` line numbers as of the current working tree.

---

## 🔥 CRITICAL — must fix before any deploy

### C1. Auth bypass on legacy accounts via `sync_lookup` fallback in `handleSyncLoad`

Location: `cloudflare/src/index.js:1870-1903`

**Bug:** When the direct `key_hash` lookup fails (wrong PIN), the code falls back to `sync_lookup` by `(username, mmyy)` only — **no PIN verification on the fallback row**. The legacy branch at line ~1895 then unconditionally calls `pbkdf2Hash(attackerPin, newSalt)` and writes it as the row's new authoritative hash, then falls through to decrypt `row.data_json` and return plaintext save data.

**Impact:** Submitting *any* PIN against `(username, mmyy)` returns the victim's full save data AND silently rewrites the PIN hash to the attacker's PIN — locking the real owner out. This is **worse than the pre-sprint forgot-pin bug**; that one at least needed a new PIN, this one returns plaintext.

**Required fix:** When a row is located via `sync_lookup` fallback (not direct key_hash), verify the supplied PIN before any decrypt or migration:
- If `pin_hash_algo IS NULL OR 'hmac'` (legacy): compute `hashSyncKey(username, mmyy, pin, SYNC_SALT)` and require it to equal `row.key_hash`. Only on match: do the PBKDF2 lazy-migration AND decrypt.
- If `pin_hash_algo='pbkdf2'`: verify with `pbkdf2Hash(pin, row.pin_salt) === row.pin_hash` (constant-time). Only on match: decrypt.
- On verification failure: do NOT migrate, do NOT decrypt, return 401.

### C2. `aggregateDailyStats` writes `level=99` but dashboard reads `level=-1`

Location: `cloudflare/src/index.js:2474` (the INSERT) vs `index.js:526, 541, 992, 3140, 3143` (the SELECTs).

**Bug:** The comment at line 2470 says "Use level=-1 as sentinel" but the actual `.bind(...)` at 2474 still passes `99`. All read paths were correctly updated to filter `level=-1`. After deploy: every global KPI (events, sessions, DAU, gold/silver earned) goes to **zero** because the rows the cron writes are invisible to the dashboard.

**Required fix:**
1. `index.js:2474` — change the bind from `99` to `-1`.
2. Add a one-time data backfill in `migrations/003_sentinel_backfill.sql`:
   ```sql
   UPDATE stats_daily SET level = -1 WHERE level = 99;
   ```
3. After applying, verify a Total KPI on a tab like Overview is non-zero on a known active day.

### C3. `handleSyncSave` "atomic batch" still has the race

Location: `cloudflare/src/index.js:1562` (read) vs `1797-1821` (batch).

**Bug:** The `env.DB.batch([…])` only wraps the INSERT and history archive. The `existing` row that feeds the merge is read at line 1562 — **outside the batch.** Two concurrent saves both read the same `existing`, both merge in JS, both commit their batch; the second one clobbers the first. "Cloud wins" fields (`equippedSkills`, `dailyStreak`, settings, even username/mmyy in `sync_lookup`) revert.

**Required fix:** This is what verification criterion #7 was for. The batch model can't fix it because D1 batches are sequential, not isolated. Use optimistic concurrency instead:
- SELECT `existing, updated_at` together.
- After merge, write `UPDATE sync_states SET … WHERE key_hash = ? AND updated_at = ?` with the read's `updated_at`.
- If `rows_affected = 0`, retry from the top up to 3 times with jittered backoff (50/100/200ms).
- After 3 retries, return 409 Conflict; the client will reload and retry the user's action.

---

## ⛔ DEPLOY BLOCKER (separate from correctness)

### D1. Missing ALTER TABLE migration for existing prod

`migrations/000_init.sql` is `CREATE TABLE IF NOT EXISTS` only — it does **not** add new columns to existing prod tables. On prod, the following columns don't exist yet:

- `sync_states.pin_hash_algo`, `sync_states.pin_salt`, `sync_states.pin_hash`, `sync_states.recovery_code_hash`
- `events.event_uuid`

After this deploys, every INSERT/UPDATE in `handleSyncLoad` (1899), `handleSyncSave` (1813), `handleSyncChangePin` (2040), `handleSyncForgotPin` (2155), `handleSyncSetRecoveryCode` (2202) will fail with "no such column."

**Required fix:** add `migrations/004_pbkdf2_recovery_columns.sql` with:

```sql
-- Idempotent — D1 supports ALTER TABLE ADD COLUMN, but not IF NOT EXISTS,
-- so wrap each in a try/PRAGMA pattern, or apply only if missing via a
-- bootstrap script. Easiest: just attempt each; if D1 errors, document the
-- one-time manual command in migrations/README.md.

ALTER TABLE sync_states ADD COLUMN pin_hash_algo TEXT;
ALTER TABLE sync_states ADD COLUMN pin_salt TEXT;
ALTER TABLE sync_states ADD COLUMN pin_hash TEXT;
ALTER TABLE sync_states ADD COLUMN recovery_code_hash TEXT;
ALTER TABLE sync_states ADD COLUMN recovery_code_salt TEXT;  -- see C4 below

ALTER TABLE events ADD COLUMN event_uuid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_event_uuid
  ON events(event_uuid) WHERE event_uuid IS NOT NULL;
```

Apply order: `000_init.sql` (fresh) → `001_indices.sql` → `002_stats_daily.sql` → `003_sentinel_backfill.sql` → `004_pbkdf2_recovery_columns.sql`. Verify by running `wrangler d1 execute ndj-metrics-db --remote --command "PRAGMA table_info(sync_states)"` after deploy.

### D2. Git history scrub — has this actually been done?

The activity log doesn't mention `git filter-repo`. The working-tree `wrangler.toml` is clean, but if `git log -p -- cloudflare/wrangler.toml` still shows historical values, the leaked keys remain extractable from anyone's clone of the repo. **Confirm in the deploy entry** whether history was rewritten + force-pushed, or note explicitly that the deployed secrets are about to be rotated anyway (rotation is the actual mitigation; history scrub is hygiene).

Either way: **rotate `DASHBOARD_KEY`, `SYNC_SALT`, `ENCRYPTION_KEY` via `wrangler secret put` with freshly-generated values** before deploy. The old `ENCRYPTION_KEY_LEGACY` stays bound to the OLD value during the 30-day dual-key window.

---

## 🟠 HIGH

### H1. `event_uuid` UNIQUE-violation catch handler creates duplicates

Location: `cloudflare/src/index.js:455-473`

**Bug:** The catch handler matches errors whose message includes `'event_uuid'`. SQLite UNIQUE constraint violation error text is `"UNIQUE constraint failed: events.event_uuid"` — also matches. So when the UNIQUE index legitimately blocks a race-condition duplicate, the catch handler triggers the fallback path which **re-inserts the row WITHOUT `event_uuid`**, creating the duplicate the dedup was supposed to prevent.

**Required fix:** narrow the catch to only the `"no such column: event_uuid"` case (test the substring `'no such column'`). Better: use `INSERT … ON CONFLICT(event_uuid) DO NOTHING` against the partial unique index, and drop the SELECT-then-INSERT entirely. The SELECT was the race-prone part anyway.

### H2. `handleAdminSyncResetPin` leaves stale PBKDF2 hash → bricks account

Location: `cloudflare/src/index.js:2313-2315`

Updates `key_hash`, `device_ids`, `updated_at`, but does NOT update `pin_hash_algo` / `pin_salt` / `pin_hash`. After admin resets the PIN, next user login passes the key_hash check but fails the PBKDF2 check (still bound to old PIN). Account is locked.

**Required fix:** also write `pbkdf2Hash(newPin, newSalt)` and update all four PIN columns.

### H3. Per-(username, mmyy) lockout is in-memory only

Location: `cloudflare/src/index.js:2083-2084`

The lockout uses `isRateLimited` (in-memory `Map`). Cloudflare runs many isolates per colo and many colos. An attacker hitting different edges resets the counter. The handoff explicitly said "matching `sync_attempts` semantics" — i.e., DB-backed.

**Required fix:** use the existing `sync_attempts` table (already has `key_hash, fails, last_fail_at`). Key it on `hashSyncKey(username, mmyy, '', SYNC_SALT)` (note empty PIN) so the same `(username, mmyy)` always produces the same hash regardless of PIN attempts. Reset `fails=0` on successful recovery. Also: the current code charges TWO slots (line 2084 + line 2115 on bad code) — fix to charge ONE per attempt, and ZERO on success.

### H4. Recovery code hashing is single-round HMAC with global salt, no per-account salt

Location: `cloudflare/src/index.js:2199`

`recovery_code_hash` uses `hashSyncKey(...)` with literal `'recovery-code'` as the `mmyy` parameter. That's single-round HMAC-SHA256 with global `SYNC_SALT`, **no per-account salt**. Two accounts with the same recovery code produce identical hashes. The whole reason PBKDF2 was specified for PINs was that this scheme is GPU-crackable offline if salt leaks.

**Required fix:** hash recovery codes the same way as PINs — PBKDF2-SHA256, 600k rounds, per-account 16-byte random salt. Add `sync_states.recovery_code_salt TEXT` column (in the migration above). Verify with constant-time compare.

---

## 🟡 MEDIUM

### M1. `handleSyncChangePin` and `handleSyncForgotPin` drop `recovery_code_hash`

Locations: `index.js:2040` and `index.js:2155`

Both INSERTs omit `recovery_code_hash` from the new row. After a legitimate PIN change, user silently loses their recovery code. For `forgot-pin` it may be intentional one-shot semantics (require setting a new code after recovery), but for `change-pin` it's a clear bug.

**Required fix:** SELECT existing `recovery_code_hash` + `recovery_code_salt`, pass them through into the new row. For forgot-pin: decide policy explicitly — recommend invalidating (force re-set) since the recovery code was the credential used; document the choice.

### M2. `LEGACY_FORGOT_PIN` is a code constant, not env/KV-flippable

Location: `cloudflare/src/index.js:43`

`const LEGACY_FORGOT_PIN = true;` — flipping in 30 days requires a code change + redeploy. Handoff spec said it should be a flippable flag.

**Required fix:** read from `env.LEGACY_FORGOT_PIN === 'true'` (a Worker secret/var) so ops can set/unset without a deploy.

### M3. `verifyAuthCookie` still uses `===` (not constant-time)

Location: `cloudflare/src/index.js:241`

The cookie HMAC compare is `expected === sig`. Handoff item #5 explicitly called out "cookie-verify path." This code runs on every authenticated dashboard request.

**Required fix:** `constantTimeEqual(expected, sig)`.

### M4. `constantTimeEqual` short-circuits on length mismatch

Location: `cloudflare/src/index.js:131-136`

For fixed-length comparisons (hashes, hex digests) the length-mismatch short-circuit is fine. For `password vs DASHBOARD_KEY` at line 256 it leaks DASHBOARD_KEY length via timing. Practical exploitability is low (256 secret length is not high-value vs. the password itself), but worth a one-line fix.

**Required fix:** for variable-length use cases, either pad both inputs to a fixed length before XOR, or hash both sides first and compare hashes (same length always).

---

## 🟢 LOW

- **L1. Inline `CREATE TABLE IF NOT EXISTS` only partially removed.** 10 of 11 still present (`index.js:347, 1252, 1829, 1940, 2216, 2238, 2275, 2262, 2351, 2491`). Lower priority since they're idempotent, but they obscure schema-as-code intent. Remove them once `000_init.sql` + `004_pbkdf2_recovery_columns.sql` are confirmed applied to prod.
- **L2. `ON CONFLICT(key_hash)` on `sync_lookup` updates the wrong direction.** Intent is `(username, mmyy) → key_hash`; current code lets the mapping flip between forked rows. Add a unique index on `(username, mmyy)` and use that as the conflict target. (Pre-existing — flag, not block.)
- **L3. Legacy save-fork.** `/sync/save` with a different PIN creates a parallel row and overwrites the `sync_lookup` mapping. Pre-existing.

---

## What is correctly done (don't redo)

- `wrangler.toml` cleanup ✓
- `aesDecrypt` dual-key fallback (correct order, no new oracle) ✓
- `handleAdminSyncResetPin` column fix ✓
- Cron partial today-totals removal ✓
- `requiresRecoveryCodeSetup` returned by `handleSyncLoad` ✓
- Sessions.jsx UTC+7 caption fix ✓
- `idx_sync_lookup_user_mmyy` added in `000_init.sql` ✓
- `constantTimeEqual` helper itself ✓ (just needs more callsites)
- PBKDF2 parameters meet spec (600k / 16-byte salt / SHA-256) ✓ (just needs the bypass closed in C1)

---

## Suggested execution order

1. **C1** (auth bypass) — biggest hole, must be closed first
2. **C2** (level=99/-1) — one-line fix in code + one SQL backfill
3. **D1** (ALTER TABLE migration) — required for ANYTHING else to work in prod
4. **C3** (atomic save with optimistic concurrency) — biggest refactor of the bunch
5. **H1**–**H4** (event_uuid catch, admin reset PBKDF2, DB-backed lockout, recovery code PBKDF2)
6. **M1**–**M4** (change-pin recovery code preserve, env-flippable LEGACY_FORGOT_PIN, cookie compare, length-leak)
7. **L1**–**L3** (cleanup)

Each fix is in scope; nothing here expands beyond sprint 1's intent.

---

## Re-verification

After your fixes land, write back via a fresh handoff to `to-claude/open/` and I'll run the verification reviewer again. Specifically I'll re-test:
- C1: try `/sync/load` with wrong PIN against a known username — expect 401, no decrypt, no hash mutation.
- C2: trigger cron, then read a Total KPI from the dashboard — expect non-zero.
- C3: simulate concurrent `/sync/save` from two device IDs against the same account — expect both successful merge OR a 409 with retry, never silent clobber.
- D1: `wrangler d1 execute … "PRAGMA table_info(sync_states)"` shows the new columns.
- H1: race two `/event` POSTs with the same `event_uuid` — expect exactly one row.

Hold off on `npm run deploy` until I sign off.

---

## Coordination

Kiro's client work has one real bug too — they're getting a separate handoff (`.ai/handoffs/to-kiro/open/003-recovery-indicator-multidevice-fix.md`) for the multi-device indicator issue. Kiro's work is otherwise verified clean; their deploy still waits on yours per the original Option-C plan.

When complete, prepend to `.ai/activity/log.md` and move this file to `.ai/handoffs/to-kimi/done/`.
