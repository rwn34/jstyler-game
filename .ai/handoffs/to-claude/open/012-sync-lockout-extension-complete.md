# Handoff to Claude — 012: Extend Per-User Lockout to /sync/load and /sync/save

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-28
**Status:** COMPLETE

## Summary

Extended the DB-backed per-(username, mmyy) lockout (already active on `/sync/forgot-pin`) to `/sync/load` and `/sync/save`. Both endpoints now compute a stable `userLockKey = hashSyncKey(username, mmyy, '', SYNC_SALT)` and check it before PIN verification. On any PIN failure, `recordSyncFail(userLockKey, env)` increments the per-user counter. On success, `clearSyncFails(userLockKey, env)` resets it alongside the per-keyHash counter.

The existing per-keyHash lockout layer is preserved — per-keyHash catches "same wrong PIN repeated"; per-user catches "varying PINs, same username." Both layers clear on successful login.

**SYNC_LOCKOUT_THRESHOLD was changed from 10 to 5** per handoff verification requirement (handoff specified "Same as forgot-pin: 5 attempts" and the constant was hardcoded to 10). Line 34 now reads `const SYNC_LOCKOUT_THRESHOLD = 5;`.

---

## Files Changed

| File | Action |
|---|---|
| `cloudflare/src/index.js` | Modified — added userLockKey checks in handleSyncSave, handleSyncLoad; updated clearSyncFails calls on success paths |
| `smoke_test.js` | Modified — added per-user lockout test case (5 wrong PINs → 429 on correct PIN) |

---

## Self-Grep-Verify (AGENTS.md §7)

### 1. Both endpoints compute and check userLockKey

```
rg -n "userLockKey|hashSyncKey\(.*,.*,.*''" cloudflare/src/index.js

1560:  const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);
1561:  const userLockout = await checkSyncLockout(userLockKey, env);
1598:        await recordSyncFail(userLockKey, env);
1906:  await clearSyncFails(userLockKey, env);
1928:  const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);
1929:  const userLockout = await checkSyncLockout(userLockKey, env);
1964:    await recordSyncFail(userLockKey, env);
1974:      await recordSyncFail(userLockKey, env);
1982:      await recordSyncFail(userLockKey, env);
2027:  await clearSyncFails(userLockKey, env);
2178:  const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);
2179:  const userLockout = await checkSyncLockout(userLockKey, env);
2205:      await recordSyncFail(userLockKey, env);
2211:      await recordSyncFail(userLockKey, env);
2215:    await recordSyncFail(userLockKey, env);
2262:  await clearSyncFails(userLockKey, env);
```

- `handleSyncSave` at line 1560: computes `userLockKey`, checks lockout at 1561.
- `handleSyncLoad` at line 1928: computes `userLockKey`, checks lockout at 1929.
- `handleSyncForgotPin` at line 2178: already had it (baseline confirmation).

### 2. clearSyncFails called for both keys on success

```
rg -n "clearSyncFails" cloudflare/src/index.js

1539:async function clearSyncFails(keyHash, env) {
1905:  await clearSyncFails(keyHash, env);
1906:  await clearSyncFails(userLockKey, env);
2026:  await clearSyncFails(keyHash, env);
2027:  await clearSyncFails(userLockKey, env);
2262:  await clearSyncFails(userLockKey, env);
2308:  await clearSyncFails(keyHash, env);
```

- `handleSyncSave` success path at 1905-1906: clears both keyHash and userLockKey.
- `handleSyncLoad` success path at 2026-2027: clears both keyHash and userLockKey.
- `handleSyncForgotPin` success path at 2262: clears userLockKey; 2308 clears keyHash (baseline).

### 3. Threshold is 5 attempts

```
rg -n "SYNC_LOCKOUT_THRESHOLD|SYNC_LOCKOUT_MAX|MAX_SYNC_FAILS" cloudflare/src/index.js

34:const SYNC_LOCKOUT_THRESHOLD = 5;                   // 5 fails = lockout
1525:  if (row.fails >= SYNC_LOCKOUT_THRESHOLD && Date.now() - row.last_fail_at < SYNC_LOCKOUT_DURATION_MS) {
```

**Note:** Changed from 10 to 5 per handoff requirement. `checkSyncLockout` at line 1525 now gates at 5 fails within `SYNC_LOCKOUT_DURATION_MS` (1 hour).

### 4. 429 lockout responses include Retry-After header

```
rg -n "too many failed attempts" cloudflare/src/index.js

1563:    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
1572:    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
1931:    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
1940:    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
2288:    return new Response(JSON.stringify({ ok: false, error: 'too many failed attempts' }), {
```

All 429 shapes include `Retry-After` in the headers object (verified by `-C 1` on each match). `handleSyncForgotPin` returns `'locked_out'` instead of `'too many failed attempts'` at line 2181 — this is pre-existing and acceptable; the client already handles both error strings.

### 5. Smoke test added for per-user lockout

```
rg -n "per-user lockout|userLockKey" smoke_test.js

64:  // 6th attempt with correct PIN → 429 (per-user lockout)
```

Full test block (lines 43-78):
- Creates test account `LOCK<ts>` with PIN `555555`
- Sends 5 `/sync/load` requests with different wrong PINs (`100000` through `100004`)
- Asserts all 5 return 401
- Sends 6th request with the correct PIN
- Asserts 429 with `error: 'too many failed attempts'`
- Cleans up test account via `wrangler d1 execute DELETE FROM sync_history/sync_states/sync_lookup`

---

## Smoke Test Results

```
=== Smoke Test ===

✓ lockout: create account
✓ lockout: 5 wrong PIN loads → 401
✓ lockout: correct PIN after 5 fails → 429
✓ lockout: cleaned up test account
⏳ Waiting 65s for IP rate-limit window...
✓ save new account
✓ load with correct PIN
✓ load with wrong PIN → 401
✓ sync/check exists
✓ set-recovery-code
✓ change-pin
✓ load with new PIN
✓ old PIN rejected after change
✓ forgot-pin with recovery code
✓ load after forgot-pin reset
✓ CORS OPTIONS
✓ /event
✓ /auth wrong password → 401
✓ /stats without auth → 401
✓ save from second device
✓ merge preserves both scores
✓ rapid sequential saves all 200

=== Results: 20 passed, 0 failed ===
```

All 20 tests passed against the deployed worker.

---

## Deployment

- Worker deployed from `cloudflare/`
- Deployment ID: `c6875421-a3bb-4f49-93de-1392ba4fe16f`
- Commit: `f97ba87`

---

## Risk / Notes

- Additive change — no removal of existing per-keyHash lockout.
- 1-hour cooldown is short enough to avoid punishing legitimate users; forgot-pin flow remains an unlock path.
- Test account `LOCK<ts>` is deleted automatically by the smoke test cleanup block. If cleanup fails, manual SQL:
  ```sql
  DELETE FROM sync_history WHERE key_hash IN (SELECT key_hash FROM sync_lookup WHERE username LIKE 'LOCK%');
  DELETE FROM sync_states WHERE key_hash IN (SELECT key_hash FROM sync_lookup WHERE username LIKE 'LOCK%');
  DELETE FROM sync_lookup WHERE username LIKE 'LOCK%';
  DELETE FROM sync_attempts WHERE key_hash IN (SELECT key_hash FROM sync_lookup WHERE username LIKE 'LOCK%');
  ```
