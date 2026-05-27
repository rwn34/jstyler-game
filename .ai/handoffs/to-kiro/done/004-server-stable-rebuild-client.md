# Handoff to Kiro — Server Stable, Rebuild Client Zip v1.2.60

**From:** kimi-cli (server side)
**To:** kiro-cli (client side)
**Date:** 2026-05-27
**Status:** 🟢 **GO — server is live and stable. You are cleared to `zipgame` v1.2.60.**

---

## Server state

- **Worker deployed:** `ndj-metrics` Version `c22d9ad9-603d-40c6-969c-92c6a5a7cde7`
- **URL:** `https://ndj-metrics.jstylr.workers.dev`
- **Migrations applied:**
  - `004_pbkdf2_recovery_columns.sql` — all new columns live (`sync_states.pin_hash_algo`, `pin_salt`, `pin_hash`, `recovery_code_hash`, `recovery_code_salt`; `events.event_uuid`)
  - `003_sentinel_backfill.sql` — global KPI sentinel rows normalized to `level=-1`
- **Secrets confirmed:** DASHBOARD_KEY (fresh), SYNC_SALT (old), ENCRYPTION_KEY (fresh), ENCRYPTION_KEY_LEGACY (old) — dual-key window active.
- **C1 auth bypass:** CLOSED — wrong PIN returns 401, no decrypt, no hash mutation.
- **Recovery code flow:** UNBLOCKED — `/sync/set-recovery-code` and `/sync/forgot-pin` no longer 500 on missing column.

## What this means for your client

Your client-side changes from handoff 003 (multi-device recovery-code indicator fix) are the last remaining client work. The server now supports everything your code expects:

- `requiresRecoveryCodeSetup` field in `/sync/load` response → triggers your modal
- `/sync/set-recovery-code` endpoint → stores PBKDF2-hashed recovery code
- `/sync/forgot-pin` with `recoveryCode` → validates and resets PIN
- `event_uuid` on `/event` POST → deduplicated server-side via partial UNIQUE index
- `LEGACY_FORGOT_PIN` env flag is `true` during 30-day window → your legacy banner shows correctly

## Action for you

1. Run `zipgame.ps1` to build v1.2.60.
2. Smoke test the recovery-code flow end-to-end:
   - Fresh account → play → save cloud → recovery code modal triggers → set code → confirm
   - Log out → forgot PIN → enter recovery code → reset PIN → log in with new PIN
   - Change PIN → verify recovery code still works for forgot-PIN
3. Upload the zip to Cloudflare Pages (or however you ship the client).
4. Move `.ai/handoffs/to-kiro/open/003-recovery-indicator-multidevice-fix.md` to `done/`.
5. Move this file to `done/`.
6. Prepend to `.ai/activity/log.md`.

No blockers on the server side. Go when ready.
