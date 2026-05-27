# Handoff to Kiro — Client-Side Sync Migration

## ⚠️ READ THIS FIRST ⚠️

**This handoff is CLIENT-SIDE ONLY.** You edit files in `src/n3ondashj/` (HTML/JS for the N30N DASH J game). You do **NOT** touch:

- `cloudflare/**` — that's Kimi's territory this sprint
- `wrangler.toml`, `migrations/**`, the Worker, the D1 schema, the Preact dashboard
- Anything in `.kimi/`

If you previously started on Worker code from a misrouted handoff, **stop, revert those changes**, and only act on what's in this file.

---

**From:** claude-code
**To:** kiro-cli
**Date:** 2026-05-26
**Scope:** Client-only changes in `src/n3ondashj/` (the N30N DASH J game). Server-side coordination is being handled by kimi in parallel — see `.ai/handoffs/to-kimi/open/001-cloudflare-worker-sprint1.md` for the matching Worker work. **Do not action the Kimi handoff yourself — read it only to understand the API contract.**

**Context:** Comprehensive review of `cloudflare/` complete (full findings in `.ai/reports/cloudflare-comprehensive-review-2026-05-26.md`). Server-side sprint 1 fixes critical security and correctness bugs (plaintext secrets, one-factor PIN takeover, broken admin endpoint, wrong analytics math). Two of those server changes need matching client work, plus one small client-only addition. **No game features are being removed.**

---

## What I need you to ship — client-side only

### 1. Add `event_uuid` to every event POST

Files:
- `src/n3ondashj/03-save.js` and any other file that posts to `/event` or `/events/batch`
- Grep `METRIC_URL.*event` to find every call site

**Problem today:** flaky-network retries duplicate events server-side → currency and completion counts get double-counted in the dashboard.

**Fix:** generate a UUID per event at the moment of creation and attach it to the POST body:

```js
function genEventUuid(){
  // Modern path
  if (self.crypto && typeof self.crypto.randomUUID === 'function') return self.crypto.randomUUID();
  // Fallback for old browsers (acceptable: NOT cryptographically strong but fine for dedupe)
  return ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c){
    var r = Math.random()*16 | 0, v = c === 'x' ? r : (r&0x3 | 0x8);
    return v.toString(16);
  });
}
```

On every event payload:
```js
payload.event_uuid = genEventUuid();
```

Persist the UUID alongside the event in the in-memory pending queue so retries reuse the **same** UUID — that's the whole point. Don't regenerate on retry.

Server will add a UNIQUE constraint on `events.event_uuid` and silently ignore duplicate inserts. NULL is allowed during a 30-day legacy window so old client builds keep working.

### 2. One-time "set recovery code" modal

Files:
- `src/n3ondashj/03-save.js:596` (the `/sync/load` callback)
- Wherever the settings / cloud-sync UI lives

**Background:** the server's `/sync/forgot-pin` endpoint today is a one-factor account takeover (anyone with `username + 4-digit mmyy` can reset any PIN). Kimi is gating it behind a server-issued recovery code, with a 30-day legacy window during which the old flow still works for accounts that haven't set a code yet. Your client work backfills the recovery code for existing users.

**New server contract (Kimi delivers in parallel):**
- `/sync/load` response gains a field: `requiresRecoveryCodeSetup: boolean`. Set to `true` when the user's account has `recovery_code_hash IS NULL` on the server.
- New endpoint `/sync/set-recovery-code` accepts `{username, mmyy, pin, recoveryCode}` and returns `{ok: true}` on success or `{ok: false, error: '…'}` on PIN mismatch / lockout.

**Client behavior:**
1. After a successful `/sync/load` that returns `requiresRecoveryCodeSetup: true`, show a one-time modal:
   - Title: "Set a recovery code"
   - Body: "Save this code somewhere safe. If you forget your PIN, this is the ONLY way to recover your account. We can't show it to you again."
   - Generate the code client-side: 16 chars, base32 (no I/O/0/1 to avoid confusion), grouped `XXXX-XXXX-XXXX-XXXX`.
   - Two buttons: "Copy" (copies to clipboard) and "I've saved it, continue".
   - Continue button is **disabled for 5 seconds** so the user actually reads the warning. Then it sends `/sync/set-recovery-code` with the user's current PIN + the new code.
   - On success: store a localStorage flag `ndj_recoveryCodeSet=1` so we don't show again.
   - On failure (PIN mismatch / network): keep the modal open, show inline error, retry button.
2. Don't block gameplay on this — if the user dismisses (Esc / X), don't show again this session but show on next launch. After 5 dismissals, stop nagging (telemetry the dismissals via a `ui_event` so we can see drop-off).
3. Add a "Show recovery code reminder" option in Settings → Cloud Save so users can re-trigger the flow if they need to. (The server won't echo the code back — you'd issue a *new* code via the same endpoint, replacing the old hash.)

### 3. Update the existing forgot-PIN flow

File: `src/n3ondashj/03-save.js:612-631` (current `forgotSyncPin` function)

Today the function posts `{username, mmyy, newPin}`. After the server change, the body should optionally include `recoveryCode`.

**Updated UI flow on the forgot-PIN screen:**
- Add a "Recovery code (optional during transition)" input. Placeholder text: "16-character code from when you signed up. Leave blank if you don't have one yet."
- If the input is non-empty, post `{username, mmyy, newPin, recoveryCode}`.
- If empty, post the old payload — server still accepts it for accounts in the 30-day legacy window.
- Show a banner above the form: "After [date 30 days from kimi's deploy], a recovery code will be required. Set one up in Settings → Cloud Save."
- Read server response carefully: `error: 'recovery_code_required'` → show "Your account is past the legacy window. Enter a recovery code." `error: 'locked_out'` → show "Too many attempts. Try again in 1 hour."

### 4. (Optional, recommended) Surface "Cloud save protected" status

Small UX win: in Settings → Cloud Save, show:
- "Recovery code: ✓ Set" or "Recovery code: ✗ Not set (recommended)"
- A "Set / replace recovery code" button that triggers the same modal from #2

This makes the migration discoverable for users who Esc-out of the one-time prompt.

---

## What does NOT change in the client

Explicitly: no removal of features, no breaking changes for the player. The following all keep working unchanged:

- Cloud save / load (transparent re-encryption on the server side; no client change)
- Daily stage, streaks, leaderboards
- Cosmetics, skills, store, purchases
- PWA, offline play, ghost replay
- Existing PINs (just rehashed server-side on next login)
- The existing `/sync/check`, `/sync/load`, `/sync/save`, `/sync/change-pin` endpoints — payload shapes unchanged

The purchase flow specifically does NOT need a rewrite. The dashboard's "purchases have no server-side validation" finding is about analytics being spoofable, not the actual game economy. The real currency state lives in the encrypted save blob and is already reconciled in `handleSyncSave` server-side. Server is fixing that independently; no client change needed.

---

## Coordination notes

**Order of deploys matters:**
1. Kimi deploys the server changes (Worker accepts both old and new request shapes thanks to the 30-day legacy window).
2. Then you deploy the client. Old clients keep working — they just don't get the recovery-code prompt or send `event_uuid`. New clients get the prompt and send UUIDs.
3. After 30 days, kimi flips `LEGACY_FORGOT_PIN=false` and removes legacy paths. By that point most users should have a recovery code (track via `ui_event` recovery_code_set count in the dashboard).

**Test cases to cover before merging:**
- Fresh user (no localStorage): syncs successfully, gets the modal on first `/sync/load`, sets a code, never sees it again.
- Existing user with PIN already set: same — modal appears once.
- User who dismisses 5 times: stop showing until they manually trigger via Settings.
- Forgot-PIN with no recovery code on a legacy-window account: still works.
- Forgot-PIN with no recovery code post-window: rejected with friendly error.
- Forgot-PIN with wrong recovery code: per-account lockout after 5 tries (server enforces; client shows the message).
- Offline `/sync/save` retry: same `event_uuid`s sent, server dedupes, no duplicate currency.

---

## Files to read first

- `.ai/reports/cloudflare-comprehensive-review-2026-05-26.md` (the synthesis)
- `.ai/handoffs/to-kimi/open/001-cloudflare-worker-sprint1.md` (your server-side counterpart — read this so you know what shape Kimi is shipping)
- `src/n3ondashj/03-save.js` lines 500-700 (existing sync code: save, check, load, forgot-pin, change-pin)
- `src/n3ondashj/04-ui.js` (find the settings panel that hosts cloud-sync UI)
- `src/n3ondashj/index.html` (where the modal will mount)

Remember the project's coding rule: this game is single-file HTML/JS, **no build system, no npm, no framework**. The modal goes in the existing HTML structure with vanilla JS + the existing CSS conventions. Mirror the style of the existing settings panels.

When complete, prepend an entry to `.ai/activity/log.md` and move this handoff to `.ai/handoffs/to-kiro/done/`.

Questions / scope disagreements: write back via `.ai/handoffs/to-claude/open/`.
