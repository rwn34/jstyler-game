# ⛔ STOP — DO NOT ACTION THIS FILE ⛔

## This handoff was MISROUTED. It is SUPERSEDED.

**If you are Kiro and you started working on Cloudflare Worker code based on this file: STOP NOW. That work belongs to Kimi. Revert any pending Worker changes in `cloudflare/` and switch to your real handoff below.**

---

## Your actual handoff is:

### → `.ai/handoffs/to-kiro/open/002-client-sync-migration.md`

That handoff is **client-side only** — vanilla HTML/JS edits in `src/n3ondashj/`. It is the only Kiro work in this sprint.

## What is NOT yours this sprint:

- Anything in `cloudflare/` (Worker, D1, dashboard, `wrangler.toml`, `migrations/`) — that is Kimi's handoff at `.ai/handoffs/to-kimi/open/001-cloudflare-worker-sprint1.md`
- Anything in `.kimi/` — Kimi's CLI territory
- Secrets rotation, PIN hashing, atomic save, cron fixes, schema migrations — all Kimi

## Your scope summary (full detail in 002):

- Add `event_uuid` to every `/event` and `/events/batch` POST in `src/n3ondashj/03-save.js`
- One-time "set recovery code" modal triggered by `/sync/load` response flag
- Update existing forgot-PIN UI to accept an optional recovery code
- (Optional) Surface "Recovery code: ✓/✗ Set" in Settings → Cloud Save

**Order of work:** wait for Kimi to deploy the Worker contract changes first (legacy window stays open 30 days, so it's safe to deploy in either order, but client work depends on the new `/sync/load` field and `/sync/set-recovery-code` endpoint existing).

## To close this misrouted file:

After reading the above and confirming you've switched to file 002, move this file to `.ai/handoffs/to-kiro/done/001-cloudflare-sprint1-security-correctness.md` and prepend a one-line entry to `.ai/activity/log.md` noting the misrouting was acknowledged.
