# Handoff to Kiro — Recovery-Code Indicator Multi-Device Fix

**From:** claude-code (orchestrator)
**To:** kiro-cli
**Date:** 2026-05-27
**Status:** Small follow-up to handoff 002. A read-only `reviewer` verification on your sprint-1 client work came back essentially clean — one real correctness bug + a few polish items. This handoff is the punch list.

**Good news first:** event_uuid generation/persistence/reuse is correct, recovery-code modal is spec-perfect (16-char base32 alphabet excluding I/O/0/1, 5-second visible countdown, copy-to-clipboard with fallback, settings-panel placement correct, no npm/build added, ndj_* namespace honored, graceful 404 degradation). Reviewer's verdict: "essentially complete and faithful to the handoff."

---

## ⚠️ Real fix needed — "Recovery code: ✓/✗" indicator is wrong on second devices

Location: `src/n3ondashj/04-ui.js:2533-2537`

```js
var hasCode = (function(){
  try { return localStorage.getItem('ndj_recoveryCodeSet') === '1'; }
  catch(e){ return false; }
})();
```

**Bug:** indicator reads only the local `ndj_recoveryCodeSet` flag. On a freshly-linked second device — or any device where localStorage was cleared — the user is server-side protected (`recovery_code_hash` is set), but localStorage is empty, so the indicator shows "✗ Not set (recommended)" forever.

The modal-trigger logic at `03-save.js:612` correctly does NOT fire the modal in this case (server returns `requiresRecoveryCodeSetup: false`), so the user sees no prompt — but the Settings panel still nags them. They may click "Set / replace recovery code", rotating the hash and **invalidating the recovery code they had already safely written down somewhere**.

### Required fix

In the `loadSync` success branch (around `src/n3ondashj/03-save.js:609-619`, just after the `requiresRecoveryCodeSetup` check), persist the local flag based on the authoritative server signal:

```js
// In loadSync success branch:
if (d.requiresRecoveryCodeSetup === false) {
  // Server explicitly says recovery code IS set — sync the local flag
  try { localStorage.setItem('ndj_recoveryCodeSet','1'); } catch(e){}
} else if (d.requiresRecoveryCodeSetup === true) {
  // Server explicitly says NOT set — clear the local flag too
  // (covers the case where user reset their account or server lost the hash)
  try { localStorage.removeItem('ndj_recoveryCodeSet'); } catch(e){}
}
// If d.requiresRecoveryCodeSetup is undefined (pre-deploy server), don't touch the flag.
```

Use the **explicit `=== true` / `=== false`** check — don't truthy/falsy it — because `undefined` means "server hasn't shipped the field yet" and that case should leave the local flag alone (graceful degradation rule from handoff 002).

After this fix, on any login the indicator will self-correct from the server's authoritative answer. Multi-device users stop getting the misleading nag, and accidental re-issuance is prevented.

---

## Polish items (optional but recommended)

These were flagged by the reviewer but aren't blocking. Do them in the same PR if it's fast.

### P1. Esc-keydown handler leak in `showRecoveryCodeModal`

Location: `04-ui.js:2814-2817`

The `document.addEventListener('keydown', escHandler)` is added every time `showRecoveryCodeModal()` runs. The handler removes itself only when dismissed via Esc — but on Copy → Continue → success (line 2789) or Dismiss-button click (line 2813), it stays attached. Manual re-triggers from Settings accumulate dead listeners.

**Fix:** define `escHandler` once outside, OR call `document.removeEventListener('keydown', escHandler)` from every modal-close branch (success, X, dismiss). Easiest: a helper `closeModal()` that does both `display:none` and `removeEventListener`, called from every close path.

### P2. In-panel status text doesn't refresh after successful set

Location: success path of `setRecoveryCode` callback in `04-ui.js`

After "Continue" → server returns ok → modal hides → but the "Recovery code: ✗ Not set" text below the button in Settings still says ✗ until the user closes and reopens the sync panel.

**Fix:** in the `setRecoveryCode` success branch, before hiding the modal, find the `#recoveryCodeStatus` element (or whatever ID `04-ui.js:2533-2537` produces) and update its text/icon to "✓ Set". Or call whatever function regenerates that section of the panel.

### P3. `.backup` files committed to source tree

Files: `src/n3ondashj/03-save.js.backup`, `src/n3ondashj/index.html.backup`

These got committed alongside the changes. They'll ship in the next `zipgame` if not excluded.

**Fix:** delete them. Add `*.backup` to `.gitignore` (project root). The zipgame build should already glob `*.html` not `*.html.backup`, but the .gitignore prevents future commits of editor backups.

### P4. `window._recoveryCodeShownThisSession` ad-hoc global

Location: `04-ui.js:2738, 2806`

Minor style drift — the codebase mostly uses bare `var` at file top. Functionally fine. Lowest priority; leave it if touching the file again feels noisy.

---

## What you do NOT need to redo

Per the reviewer (read-only verification of all 6 items in your handoff 002):

- ✅ `event_uuid` generated once per event, persisted via object reference into the queue, reused on retry. Both POST sites (`/event`, `/events/batch`) honor it.
- ✅ `/sync/set-recovery-code` helper with 404 → `not_supported` graceful no-op.
- ✅ `forgotSyncPin` accepts optional `recoveryCode`; error codes `recovery_code_required` and `locked_out` mapped to friendly user messages.
- ✅ Recovery code format: 16 chars base32, `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` alphabet, grouped XXXX-XXXX-XXXX-XXXX, `crypto.getRandomValues` with Math.random fallback, generated client-side only.
- ✅ Copy-to-clipboard with textarea/execCommand fallback, 1.5s "Copied!" feedback.
- ✅ 5-second confirm delay is a real visible countdown ("Continue (5)", "(4)", … then "I've saved it, continue").
- ✅ Manual re-trigger button bypasses the 5-dismissal cap (correct — manual should always work).
- ✅ Graceful degradation when server is pre-deploy: 404 no-op, missing `requiresRecoveryCodeSetup` doesn't trigger modal.
- ✅ Settings panel placement correct (cloud-save in stage-select panel, not pause menu).
- ✅ Storage namespace `ndj_*` honored.
- ✅ No frame-rate-dependent timers (uses setInterval, not loop dt).
- ✅ No npm/build/framework added.

---

## Coordination

**Hold off on the next `zipgame` rebuild until:**
1. You land this indicator fix + (optionally) the polish items.
2. Kimi finishes their sprint-1 hardening (separate handoff `to-kimi/open/002-sprint1-fixes-...`). Their server is not deploy-ready — the read I just did found 3 CRITICAL bugs (auth bypass, cron KPI mismatch, broken atomic save). Your client work is still correct and gracefully degrades, so it's safe to keep your branch ready, but **don't ship v1.2.60 yet** because the matching server isn't going up.

When the indicator fix lands, prepend to `.ai/activity/log.md` and move this file to `.ai/handoffs/to-kiro/done/`.
