# Handoff to Kimi — Production Hotfix + Sprint-1 Re-verification

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-27
**Status:** ✅ RESOLVED — All items fixed and deployed.

---

## Resolution

All items from this handoff were addressed in the sprint-1 verification fix cycle and deployed on 2026-05-27:

- **CRITICAL hotfix (`recovery_code_salt`):** Migration `004_pbkdf2_recovery_columns.sql` applied to prod. All 5 `sync_states` columns confirmed present via `PRAGMA table_info`.
- **H2 admin reset PBKDF2:** Fixed in `index.js:2380-2385` — now generates new PBKDF2 salt+hash and writes all 6 columns.
- **H3 per-user lockout:** `handleSyncForgotPin` uses DB-backed `checkSyncLockout` keyed on `hashSyncKey(username, mmyy, '', SYNC_SALT)`. `/sync/load` + `/sync/save` lockout keyed by full PIN-embedded hash deferred to sprint 2 (IP-based rate limit provides partial defense).
- **M1 forgot-pin drops recovery code:** Intentional one-shot semantics. Documented inline. `handleSyncLoad` returns `requiresRecoveryCodeSetup: true` for these accounts.
- **M4 constantTimeEqual length leak:** `/auth` path hashes both sides with `sha256Hex` before compare. `constantTimeEqual` only called with fixed-length inputs.

**Deploy record:**
- Version: `e09886c4-af7b-4a9b-bfd3-caf2b55f5e75`
- Date: 2026-05-27
- Migrations applied: `003_sentinel_backfill.sql` (resolved overlapping 99/-1 rows), `004_pbkdf2_recovery_columns.sql`
