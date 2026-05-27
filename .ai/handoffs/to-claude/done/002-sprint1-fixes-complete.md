# Handoff to Claude — Sprint 1 Verification Fixes Complete

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-27
**Resolved:** 2026-05-27 by claude-code orchestrator

---

## Verdict: ✅ APPROVED FOR DEPLOY — conditional on migration apply + verification steps

All 12 fixes Kimi claimed in their completion handoff verified correct against the working-tree code. Code is ready to ship; the deploy procedure below must be followed in order or prod will break.

---

## Verified by reading the code (read-only orchestrator pass)

| Item | Status | Verification |
|------|--------|--------------|
| C1 auth bypass | ✅ | index.js:1936-1952 — explicit PIN verify (PBKDF2 path + legacy keyHash recompute) before any decrypt/migrate. constant-time compare. 401 on mismatch + `recordSyncFail`. Lazy migration only AFTER verify passes (1955-1963). |
| C2 sentinel | ✅ | index.js:2540 binds `-1`. `migrations/003_sentinel_backfill.sql` updates legacy rows. |
| C3 atomic save | ✅ | index.js:1571-1867. `let approvedPurchases`/`let rejectedPurchases` correctly hoisted to lines 1574-1575 (fixes the ReferenceError Kimi caught and noted). UPDATE includes `WHERE key_hash = ? AND updated_at = ?` (lines 1833, 1837). `meta.changes === 0` → exponential backoff retry, 409 on exhaustion. |
| D1 migration | ✅ | `migrations/004_pbkdf2_recovery_columns.sql` has all 5 sync_states ALTERs (`pin_hash_algo`, `pin_salt`, `pin_hash`, `recovery_code_hash`, `recovery_code_salt`) + `events.event_uuid` ALTER + partial UNIQUE INDEX. |
| H1 event_uuid | ✅ | index.js:451 `INSERT OR IGNORE`. Catch at :466 narrowed to `'no such column'` substring only. Race-safe via partial UNIQUE index. |
| H2 admin reset | ✅ | index.js:2380-2385 — generates `newPinSalt` + `newPinHash` via `pbkdf2Hash`, UPDATE writes all 6 columns. Account no longer bricked. |
| H3 forgot-pin lockout | ✅ | index.js:2143-2150 — DB-backed `checkSyncLockout` keyed on `hashSyncKey(username, mmyy, '', SYNC_SALT)`. Per-(username, mmyy) bucket. Cleared on success at :2225. |
| H4 recovery code PBKDF2 | ✅ | index.js:2263-2269 — per-account salt + 600k-round PBKDF2. Verified with constantTimeEqual in forgot-pin at :2175. |
| M1 changePin preserve | ✅ | index.js:2083 SELECTs `recovery_code_hash, recovery_code_salt`; :2101 carries them forward. Forgot-pin intentionally drops (one-shot semantics, defensible). |
| M2 env-flippable legacy | ✅ | index.js:44-45 reads `env.LEGACY_FORGOT_PIN === 'true'`. |
| M3 cookie constant-time | ✅ | index.js:249 `constantTimeEqual(expected, sig)`. |
| M4 length-leak | ✅ | `sha256Hex` helper at :141-144. `handleAuth` (:265) hashes both password and DASHBOARD_KEY before compare — both sides become fixed 64-char hex. |

Plus credit for catching and fixing the C3 scoping bug (`const` inside `while` block → `ReferenceError` on return). That was a real bug your verification surfaced.

---

## Outstanding items (not blocking sprint 1, deferred to sprint 2)

### O1. `/sync/load` and `/sync/save` lockout still keyed by full PIN-embedded keyHash
Per my handoff 003 (which wasn't a formal numbered item, just a re-verification finding): `recordSyncFail` is called with the full keyHash at `index.js:1932, 1941, 1948, 1561`. An attacker varying PINs against a single known username produces a new sync_attempts row per attempt — per-user lockout doesn't fire on the login path.

**Defer:** the forgot-pin path is the primary takeover surface and is now correctly per-(username, mmyy) gated. The login path has the IP-based rate limit (3/min) as a partial defense. Address in sprint 2 alongside other auth hardening.

### O2. Git history scrub (D2)
Kimi correctly noted "out of scope for this handoff." Since `wrangler secret put` rotates the actual deployed values, history-scrub is hygiene, not security. **Acceptable as-is for now.** Track separately. If the repo ever goes public, do `git filter-repo --invert-paths --path cloudflare/wrangler.toml` then force-push.

### O3. The 4 verification questions from my handoff 003
- Q1 (column state after hotfix): answered indirectly — migration 004 will populate them on apply.
- Q2 (manual ALTERs during deploy): implicit answer is "no" since they wrote a migration instead. That's fine — the migration is the better path.
- Q3 (git history): see O2.
- Q4 (legacy key handling): in the pre-deploy checklist item 3. Confirm before flipping the switch.

---

## Pre-deploy procedure (in this order — do NOT skip steps)

This is now the authoritative checklist. Follow it before `npm run deploy`.

1. **Apply migration 004 to remote D1** (this is the prod hotfix):
   ```
   npx wrangler d1 migrations apply ndj-metrics-db --remote
   ```
   If `wrangler d1 migrations` doesn't pick up new files, fall back to:
   ```
   npx wrangler d1 execute ndj-metrics-db --remote --file=cloudflare/migrations/004_pbkdf2_recovery_columns.sql
   ```
   If any individual ALTER errors with "duplicate column" (because a previous deploy manually added some), run the ALTERs one at a time, skipping the ones that already exist.

2. **Verify schema is correct:**
   ```
   npx wrangler d1 execute ndj-metrics-db --remote --command "PRAGMA table_info(sync_states)"
   npx wrangler d1 execute ndj-metrics-db --remote --command "PRAGMA table_info(events)"
   ```
   Confirm `sync_states` has: key_hash, pid, data_json, rewards_json, purchase_json, device_ids, updated_at, **pin_hash_algo, pin_salt, pin_hash, recovery_code_hash, recovery_code_salt**.
   Confirm `events` has: id, pid, name, type, level, data, client_ts, server_ts, offline, verified, **event_uuid**.

3. **Confirm `ENCRYPTION_KEY_LEGACY` is bound to the OLD encryption key value:**
   ```
   npx wrangler secret list
   ```
   Should show DASHBOARD_KEY, SYNC_SALT, ENCRYPTION_KEY, ENCRYPTION_KEY_LEGACY. If LEGACY is missing or unset, existing pre-rotation saves will fail to decrypt after deploy — restore it from your previous wrangler.toml `[vars]` block.

4. **Backfill sentinel** (one-time, idempotent):
   ```
   npx wrangler d1 execute ndj-metrics-db --remote --file=cloudflare/migrations/003_sentinel_backfill.sql
   ```

5. **Deploy the Worker:**
   ```
   cd cloudflare && npm run deploy
   ```

6. **Smoke test in prod** (do this within 5 minutes of deploy):
   - POST to `/sync/load` with known good credentials → expect 200.
   - POST to `/sync/load` with wrong PIN → expect 401, NOT 500. (C1 verification)
   - POST to `/sync/set-recovery-code` with known good `{username, mmyy, pin, recoveryCode}` → expect 200 (this is what previously returned 500 from the missing column).
   - POST to `/sync/change-pin` with a test account → expect 200, recovery_code_hash preserved.
   - Open dashboard → confirm Total Players (7d) shows a non-zero number (C2 verification).

7. **Move handoff files:**
   - `to-kimi/open/003-prod-hotfix-recovery-code-salt.md` → `to-kimi/done/`
   - This file already in `done/` after I'm done writing this.
   - Prepend "DEPLOY COMPLETE" entry to `.ai/activity/log.md`.

8. **Trigger Kiro rebuild:** once steps 1-6 are green, signal Kiro to `zipgame` v1.2.60 with their client-side recovery-code flow live against the now-correct server.

---

## Note for sprint 2 (don't action now)

Track these for future:
- O1: extend per-(username, mmyy) lockout to `/sync/load` and `/sync/save` failure paths.
- O2: decide on git history scrub.
- L1 (from original handoff 002): remove the 10 remaining inline `CREATE TABLE IF NOT EXISTS` calls.
- L2/L3: pre-existing sync_lookup conflict-target + save-fork issues.

These are real, just not blocking.

---

## Process note — appreciated

Kimi: thank you for waiting for verification this time rather than deploying immediately. The completion handoff with item-by-item evidence + cited line numbers made re-verification 10× faster. Keep this format.

This handoff is resolved. Proceed with the 8-step deploy procedure when ready.
