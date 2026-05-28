# Handoff to Kimi — O1: Extend Per-(Username, MMYY) Lockout to /sync/load and /sync/save

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Security hardening. ~1 hour. Worker only.

This was O1 from the sprint-1 post-deploy review: handoff 002 fixed the forgot-pin lockout to use DB-backed `sync_attempts` keyed by `(username, mmyy)`, but `/sync/load` and `/sync/save` still call `recordSyncFail(keyHash, env)` with the full `keyHash` — which embeds the PIN. An attacker varying PINs against one username creates a new `sync_attempts` row each attempt (`fails=1`), never tripping the 5-attempt lockout.

Net effect: `/sync/forgot-pin` is now properly gated, but `/sync/load` brute-force on PIN remains unbucketed-per-user.

---

## Scope

Two failure paths in `index.js`:

1. **`handleSyncLoad`** — currently around line 1932/1941/1948 (verify with grep). On every PIN verification failure, also call `recordSyncFail(userLockKey, env)` where:
   ```js
   const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);
   ```
   This produces a stable per-(username, mmyy) key regardless of the attempted PIN. Same key is already used by `handleSyncForgotPin` (line ~2143 per recent grep).

2. **`handleSyncSave`** — same pattern. Currently at line ~1561 the keyHash check + lockout uses full keyHash; extend to also check + record under userLockKey.

### Lockout check order

Before attempting PIN verification:
```js
const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);
const userLockout = await checkSyncLockout(userLockKey, env);
if (userLockout.locked) {
  return errResponse('too many failed attempts', 429);  // existing 429 shape
}
// proceed with existing per-keyHash lockout check + PIN verify
```

### Clearing on success

On successful login (current `clearSyncFails(keyHash, env)` call), also clear the per-user counter:
```js
await clearSyncFails(keyHash, env);
await clearSyncFails(userLockKey, env);
```

Both must clear, so a legitimate login resets both buckets.

### Threshold

Same as forgot-pin: 5 attempts, 1-hour cooldown. (Verify the existing `checkSyncLockout`'s default thresholds match — adjust if it's hardcoded to a different value.)

### Rate-limit headers

Return the existing `Retry-After: <seconds>` header on 429. The shape should match what `handleSyncForgotPin` returns today so clients can handle uniformly.

---

## Validation

### Synthetic test via `smoke_test.js` (already present at project root)

Add a new test case (e.g. `test('per-user lockout on /sync/load')`):

```js
// 1. Create a test account with a known PIN
// 2. Hit /sync/load with 5 wrong PINs (different PINs each time)
// 3. Assert each returns 401 'invalid credentials'
// 4. Hit /sync/load with the CORRECT PIN
// 5. Assert it returns 429 'too many failed attempts' (lockout fires)
// 6. Wait > 1h OR manually clear sync_attempts in D1
// 7. Hit /sync/load with correct PIN → 200 + decrypt
// 8. Cleanup: delete test account
```

Document the cleanup in your completion handoff so the test account doesn't linger in prod D1.

### Manual D1 inspection

After running the synthetic test, `SELECT * FROM sync_attempts WHERE key_hash = <userLockKey>` should show fails=5 + last_fail_at timestamp. Paste the row in the completion handoff.

### Same for /sync/save

5 wrong-PIN saves → 6th save attempt (even with correct PIN) → 429.

---

## What NOT to do

- Don't remove the existing per-keyHash lockout. Keep both. Per-keyHash catches "same wrong PIN repeated"; per-user catches "varying PINs same username." Both layers reasonable.
- Don't increase the threshold beyond 5/hour. Genuine forgot-PIN flow handles legit users.
- Don't add IP-based lockout — IP isn't stored, and IP-based blocks have collateral damage. Per-user is the right axis.

---

## Self-grep-verify (REQUIRED — AGENTS.md §7)

```bash
# Both endpoints now compute and check userLockKey
rg -n "userLockKey|hashSyncKey\\(.*,.*,.*''" cloudflare/src/index.js

# clearSyncFails called for both keys on success
rg -n "clearSyncFails" cloudflare/src/index.js

# Threshold still 5 attempts (or whatever existing value — confirm it's not changed accidentally)
rg -n "SYNC_LOCKOUT_MAX|MAX_SYNC_FAILS|5\\s*attempts" cloudflare/src/index.js

# Smoke test added
rg -n "per-user lockout|userLockKey" smoke_test.js
```

Completion handoff at `to-claude/open/012-sync-lockout-extension-complete.md` MUST include these snippets per the tightened AGENTS.md §7.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/src/index.js` (handleSyncLoad + handleSyncSave failure + success paths) |
| Modify | `smoke_test.js` (new per-user lockout test case) |

No new migration, no new endpoints, no dashboard changes.

---

## Risk

Low. The change is additive — both layers of lockout exist; old behavior preserved; new layer adds defense-in-depth. The only real risk is breaking a legitimate user who somehow lands above the 5-attempt threshold by accident. Mitigation: 1-hour cooldown is short enough to not be punitive, and the existing forgot-pin flow remains an unlock path.

Pre-deploy: verify on a throwaway test account, then ship. If anything misbehaves you can revert by removing the `userLockKey` extension calls — no data migration needed.

---

## When done

- `wrangler deploy` from cloudflare/
- Run `node smoke_test.js` against prod (or the new lockout test in isolation)
- Move to `to-kimi/done/`
- Write completion handoff at `to-claude/open/012-sync-lockout-extension-complete.md` with grep snippets per AGENTS.md §7
- Prepend activity log entry

After this, the only remaining sprint-1 carry-over is the git-history scrub of old `wrangler.toml` (decision still: skip; secrets rotation was the actual mitigation).
