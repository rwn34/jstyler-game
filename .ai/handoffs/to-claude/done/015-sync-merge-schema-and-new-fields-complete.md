# Handoff 015 Acceptance — Sync Merge Schema (RESOLVED with follow-up)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-29 (handoff said 2026-05-16 — recurring typo)
**Resolved:** 2026-05-29 by claude-code
**Live worker:** `7c04eace-afd4-425d-a8e5-80297c37dc3d`
**Commit:** `0d8b2a6` (pushed to master)

---

## Verdict: ✅ Work accepted. ⚠️ Follow-up required (handoff 016) for field-name correction.

Spot-checked all grep snippets:
```
cloudflare/src/index.js:1586  // SYNC MERGE SCHEMA block comment
cloudflare/src/index.js:1599  // Union (dedupe): unlocked[], ownedSkills[], ownedCosmetics[], playDays[]
cloudflare/src/index.js:1827  if (Array.isArray(data.playDays)) {       ← LIVE (name matches client)
cloudflare/src/index.js:1834  if (data.dailyStageBadges && ...)         ← DEAD CODE
cloudflare/src/index.js:1843  if (typeof data.dailyStageChestClaimedDate === 'string')  ← DEAD CODE
```

All line numbers match the tree. Implementation matches spec. Bounds defenses present (`slice(0, 31)`, `Object.entries(...).slice(0, 90)`). 18/18 synthetic merge tests passing per Kimi's smoke run.

## Process improvements this cycle

- ✅ Completion handoff landed in `to-claude/open/` (correct directory)
- ✅ Grep snippets present in the file
- ✅ **Committed + pushed** (commit `0d8b2a6`) — explicitly addressing the 014 uncommitted-deploy mistake
- ✅ Smoke test file (`smoke_test.js`) caught and self-fixed: wrong endpoint paths (`/api/sync/*` → `/sync/*`) + 62s cooldown for rate limit
- ✅ EXPLAIN check on D was correctly skipped with reasoning ("new fields are bounded in code, no schema change needed")

This is the cleanest delivery yet. The protocol is now genuinely internalized.

---

## ⚠️ The dead-code situation

Kimi shipped 015 in parallel with Kiro's 006. Kiro discovered the codebase uses different field names than my handoff assumed:

| 015's rule | Kiro's actual field | Type difference |
|---|---|---|
| `playDays[]` | `playDays[]` | ✅ name matches → works |
| `dailyStageBadges{}` | `dailyCollection[]` | ❌ wrong name AND object-vs-array |
| `dailyStageChestClaimedDate` (string) | `dailyStats` (single-day object) | ❌ wrong name AND string-vs-object |

So Kimi's rules at `index.js:1834` and `:1843` are dead code — the client never sends those keys. The unknown-fields-fall-to-cloud-wins default catches `dailyCollection` and `dailyStats`, which is functionally OK for now but loses the union-merge benefit.

This was the documented risk in both 015 and 006 handoffs ("if field names diverge, send a follow-up"). It's a parallel-shipping coordination gap, not a process failure on Kimi's part.

---

## Follow-up: handoff 016

Writing `.ai/handoffs/to-kimi/open/016-sync-merge-field-name-correction.md` to:
1. Rename `dailyStageBadges` rule → `dailyCollection` (and convert to array-of-objects merge with date-key dedupe)
2. Rename `dailyStageChestClaimedDate` rule → `dailyStats` (object with `.day` field; same-day merges OR booleans, min bestTime, max deaths)
3. Update the SYNC MERGE SCHEMA block comment to reflect the corrected names + shapes
4. Re-run the smoke tests (will need rewritten payloads for the new shapes)
5. Keep playDays unchanged — that one's correct

Estimated ~30-45 min. Low complexity (rename + reshape merge code).

---

## What's now in place

- ✅ `SYNC MERGE SCHEMA` block comment documents all the rules in one location at top of `handleSyncSave`
- ✅ `playDays` correctly union-merges across devices, trim-to-31
- ⚠️ `dailyCollection` and `dailyStats` currently cloud-wins (pending 016)
- ✅ Bounds defenses present (caps at 31 / 90)
- ✅ Smoke test infrastructure exists in `cloudflare/smoke_test.js` (need payload-shape updates for 016)

---

This handoff is resolved with a follow-up tracker (016).
