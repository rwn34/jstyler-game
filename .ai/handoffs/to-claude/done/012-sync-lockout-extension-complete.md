# Handoff to Claude — 012: Sync Lockout Extension (RESOLVED)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-28
**Resolved:** 2026-05-28 by claude-code orchestrator
**Live worker:** `c6875421-a3bb-4f49-93de-1392ba4fe16f`
**Commit:** `f97ba87`

---

## Verdict: ✅ ACCEPTED. Sprint-1 O1 carry-over OFFICIALLY CLOSED.

All cited line numbers verified against the tree:

```
cloudflare/src/index.js:34    const SYNC_LOCKOUT_THRESHOLD = 5;
cloudflare/src/index.js:1560  const userLockKey = await hashSyncKey(username, mmyy, '', env.SYNC_SALT);  [handleSyncSave]
cloudflare/src/index.js:1561  const userLockout = await checkSyncLockout(userLockKey, env);
cloudflare/src/index.js:1598  await recordSyncFail(userLockKey, env);
cloudflare/src/index.js:1906  await clearSyncFails(userLockKey, env);                                   [save success]
cloudflare/src/index.js:1928  const userLockKey = ... (same pattern)                                    [handleSyncLoad]
cloudflare/src/index.js:1929  const userLockout = await checkSyncLockout(...)
cloudflare/src/index.js:1964  await recordSyncFail(userLockKey, env);                                   [pbkdf2 fail]
cloudflare/src/index.js:1974  await recordSyncFail(userLockKey, env);                                   [legacy fail]
cloudflare/src/index.js:1982  await recordSyncFail(userLockKey, env);                                   [row missing]
cloudflare/src/index.js:2027  await clearSyncFails(userLockKey, env);                                   [load success]
cloudflare/src/index.js:2178  const userLockKey = ...                                                   [handleSyncForgotPin — pre-existing baseline]
cloudflare/src/index.js:2262  await clearSyncFails(userLockKey, env);
```

20/20 smoke tests passing including the new per-user lockout case (5 wrong PINs → 6th attempt 429 even with correct PIN, auto-cleanup of LOCK<ts> test account).

---

## Note: `SYNC_LOCKOUT_THRESHOLD` change 10 → 5

This is a real behavioral change for ALL endpoints that check the constant (handleSyncSave, handleSyncLoad, handleSyncForgotPin). The original handoff 002 spec from sprint 1 said "5 attempts, 1-hour cooldown matching `sync_attempts` semantics." The constant was stuck at 10 from earlier code; Kimi brought it back to spec.

Practical impact:
- `/sync/forgot-pin`: now locks out at 5 attempts (was 10). Tighter, safer.
- `/sync/load` + `/sync/save`: new lockout was supposed to be at 5 per the handoff spec; constant is shared, so this is consistent.

No legitimate user lockout regression risk — 5 wrong PINs in 1 hour is well outside normal misclick rate. The forgot-pin escape hatch (via recovery code) still exists.

---

## What's now closed

- **Sprint-1 O1 carry-over** (per-user lockout extension to login + save paths): done. The only remaining sprint-1 deferred item was git-history scrub of `wrangler.toml`, which is still parked (decision: skip; secrets rotation was the actual mitigation).
- **Defense layers:**
  - Per-keyHash lockout: catches "same wrong PIN repeated against same account" (~useless attack vector but defense-in-depth)
  - Per-user (`hashSyncKey(u,m,'',salt)`) lockout: catches the real attack — varying PINs against same username. Now wired on /sync/load + /sync/save + /sync/forgot-pin uniformly.

---

## Smoke test artifacts

Per Kimi's handoff:
- New test creates `LOCK<ts>` account, sends 5 wrong PINs (5 × 401), then correct PIN → 429.
- Auto-cleanup via `wrangler d1 execute` deletes from sync_history/sync_states/sync_lookup/sync_attempts.
- If cleanup ever fails, manual SQL pattern in the handoff (filter by `username LIKE 'LOCK%'`).

20/20 pass including 12 baseline tests + new lockout case + cleanup verification.

---

This handoff is resolved.
