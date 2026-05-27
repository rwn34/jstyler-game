# E2E Smoke Test Report — 2026-05-27

## Verdict: PASS ✅

**17/17 tests passed** against live worker `https://ndj-metrics.jstylr.workers.dev`.

---

## Test Summary

| # | Test Name | Status | Notes |
|---|-----------|--------|-------|
| 1 | save new account | ✓ | 200 OK |
| 2 | load with correct PIN | ✓ | silver=50 confirmed |
| 3 | load with wrong PIN → 401 | ✓ | |
| 4 | sync/check exists | ✓ | found=true |
| 5 | set-recovery-code | ✓ | Recovery code `ABCD-EFGH-IJKL-MNOP` stored |
| 6 | change-pin | ✓ | PIN rotated 123456→654321 |
| 7 | load with new PIN | ✓ | |
| 8 | old PIN rejected after change | ✓ | 401 |
| 9 | forgot-pin with recovery code | ✓ | PIN reset to 111111 via recovery code |
| 10 | load after forgot-pin reset | ✓ | |
| 11 | CORS OPTIONS | ✓ | `access-control-allow-origin: *` |
| 12 | /event | ✓ | Event ingested |
| 13 | /auth wrong password → 401 | ✓ | |
| 14 | /stats without auth → 401 | ✓ | |
| 15 | save from second device | ✓ | dev2 registered |
| 16 | merge preserves both scores | ✓ | scores={1:100, 2:200} |
| 17 | rapid sequential saves all 200 | ✓ | 3 concurrent saves, all 200 |

---

## Special Checks

| Check | Result |
|-------|--------|
| set-recovery-code (test #5) | ✅ PASS |
| forgot-pin with recovery code (test #9) | ✅ PASS |
| Multi-device merge preserves both scores (test #16) | ✅ PASS — `{1:100, 2:200}` |
| Any 5xx errors observed? | ❌ None — all responses were 200 or 401 as expected |

---

## Full stdout

```
=== Smoke Test: SMOKE4654 ===

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

=== Results: 17 passed, 0 failed ===
```

Exit code: 0

---

## Failure Analysis

None — all tests passed.

---

## Test Pollution

| Item | Value |
|------|-------|
| Username | `SMOKE4654` |
| mmyy | `1225` |
| Final PIN | `111111` |
| Device IDs | `dev_smoke`, `dev2` |
| PID (event test) | `test_pid_smoke` |

**Purge commands** (run against D1):
```sql
DELETE FROM sync_states WHERE key_hash IN (
  SELECT key_hash FROM sync_states
  -- Account: SMOKE4654 / 1225 / 111111
);
DELETE FROM events WHERE pid = 'test_pid_smoke' AND server_ts > 1748345000;
```

Or via wrangler:
```bash
wrangler d1 execute ndj-metrics-db --command "DELETE FROM sync_states WHERE pid LIKE '%smoke%'"
```

---

## Coverage Gap Notes

The following handoff-004 features are **NOT covered** by `smoke_test.js`:

| Feature | Why not covered |
|---------|----------------|
| `requiresRecoveryCodeSetup` field in /sync/load response | Script doesn't assert on this field — only checks `ok` and `data.silver` |
| Recovery code modal UI (5s countdown, copy-to-clipboard) | API-level test only; no browser/DOM testing |
| Settings panel "Recovery Code" indicator refresh | UI-only; requires browser automation |
| `event_uuid` deduplication | Script doesn't send duplicate event_uuids to verify server-side dedup |
| Multi-device indicator in client | UI-only |
| Client-side recovery code generation logic | Not exercised; test uses hardcoded code |

These gaps require either manual browser smoke testing or a Playwright-based E2E suite.

---

## Environment

- **Worker URL**: https://ndj-metrics.jstylr.workers.dev
- **Client version**: v1.2.60
- **Node version**: (system default)
- **Run time**: 2026-05-27T17:47 UTC+7
- **Network**: No rate limits hit, no timeouts observed
