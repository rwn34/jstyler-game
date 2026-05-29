# Handoff to Kimi — Sync Merge Schema + New Field Rules

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-29
**Status:** ~45 min. Server preparatory work to enable Kiro's client-side sync fixes in handoff 006.

User reports that several pieces of game state aren't propagating across devices after cloud sync. Investigation of `src/n3ondashj/03-save.js` confirms the client-side cloud-save payload (lines 415-435) is missing `playDays` (the 27-day streak calendar), and likely missing daily-stage badges / daily-stage chest state. Kiro will add those fields client-side in handoff 006. This handoff (015) prepares the server to merge them correctly.

---

## Goal

1. **Document the existing merge rules** in `handleSyncSave` (currently undocumented; scattered across the function body).
2. **Add explicit merge semantics for three new fields** Kiro will start sending:
   - `playDays` — array of date strings the player played, used for the 27-day calendar visualization
   - `dailyStageBadges` (TBD field name — Kiro will confirm in their handoff) — list/object of earned daily-stage badges
   - `dailyStageChestClaimedDate` (TBD field name — Kiro will confirm) — the date string of the most recent claimed daily-stage chest
3. **Don't break existing merge behavior** — additive only.

---

## Current merge behavior (your audit task)

Before writing new rules, grep + read `handleSyncSave` and produce a short table in your completion handoff documenting the current per-field merge semantics. Expected categories:

| Category | Examples (from earlier audit) | Behavior |
|---|---|---|
| Cloud-wins (latest device) | `equippedSkills`, `equippedCosmetics`, settings, `dailyStreak`, `frozenDays`, `lastChest` | Server takes whichever device wrote last |
| Max merge | `bestScores`, `bestTimes`, `bestChips` per level | Server keeps max across all devices |
| Union merge | `unlocked` levels, `ownedCosmetics` | Server unions arrays |
| Sum/accumulate | `goldSpent`, `silver`, gem counts | Server keeps higher value (effectively max) |

Confirm or correct against the current code. If anything has drifted from those rules, flag it.

---

## New field merge rules to add

### `playDays` (array of `YYYY-MM-DD` strings)

**Semantics:** Union of all device contributions, then trim to the trailing 31 days (keep one buffer day past the 27 displayed in the calendar).

```js
// In merge logic:
if (Array.isArray(incoming.playDays)) {
  const merged = new Set([...(existing.playDays || []), ...incoming.playDays]);
  const cutoff = new Date(serverTs - 31 * 86400000).toISOString().slice(0, 10);
  mergedData.playDays = [...merged].filter(d => d >= cutoff).sort();
}
```

Cap the array size (e.g., max 31 entries after filter) to prevent unbounded growth from a malicious or buggy client.

### `dailyStageBadges` (shape TBD — Kiro confirms)

Likely shape: object keyed by date (`{"2026-05-28": {kind: "perfect", time_ms: 12345}}`) OR a flat array of `{date, kind}` entries.

**Semantics:** Union by date — both devices' badges combine, latest-write wins on collisions for the same date.

```js
if (incoming.dailyStageBadges && typeof incoming.dailyStageBadges === 'object') {
  mergedData.dailyStageBadges = { ...(existing.dailyStageBadges || {}), ...incoming.dailyStageBadges };
  // Trim to last 90 days to bound storage
}
```

### `dailyStageChestClaimedDate` (string `YYYY-MM-DD`)

**Semantics:** Max (most recent date wins).

```js
if (typeof incoming.dailyStageChestClaimedDate === 'string') {
  const existingDate = existing.dailyStageChestClaimedDate || '';
  mergedData.dailyStageChestClaimedDate = incoming.dailyStageChestClaimedDate > existingDate
    ? incoming.dailyStageChestClaimedDate
    : existingDate;
}
```

This is the "if either device claimed today's chest, both devices see it as claimed" guarantee.

---

## Schema documentation

Add a block comment at the top of `handleSyncSave` documenting the merge schema explicitly:

```js
// ============================================================================
// SYNC MERGE SCHEMA
// ----------------------------------------------------------------------------
// When data flows from a device's incoming save into the cloud row, each field
// uses one of these merge strategies:
//
//   Cloud-wins (latest): equippedSkills, equippedCosmetics, settings,
//     dailyStreak, frozenDays, lastChest
//   Max:                 bestScores[L], bestTimes[L] (lower is better → min),
//                        bestChips[L], silverWallet, goldEverEarned
//   Union (dedupe):      unlocked[], ownedCosmetics[], playDays[]
//   Union by date:       dailyStageBadges{}
//   Max date string:     dailyStageChestClaimedDate
//
// If a client sends a field not in this schema, it's treated as cloud-wins
// (last write). Bounds: array fields capped at sensible limits (31, 90, etc.)
// to defend against malicious payloads.
// ============================================================================
```

---

## Validation plan — run BEFORE writing the completion handoff

### A. Synthetic merge tests (curl against prod or local)

1. **`playDays` union**:
   - Create test account `MERGE<ts>` with PIN.
   - Device A saves with `playDays: ['2026-05-20', '2026-05-21']`. Confirm load returns those two dates.
   - Device B saves with `playDays: ['2026-05-21', '2026-05-22']` (overlap on the 21st).
   - Load from device A → assert `playDays: ['2026-05-20', '2026-05-21', '2026-05-22']` (union, deduped, sorted).
   - Cleanup the test account.

2. **`dailyStageBadges` union-by-date**:
   - Same account.
   - Device A saves `dailyStageBadges: {"2026-05-28": {kind: "perfect"}}`.
   - Device B saves `dailyStageBadges: {"2026-05-29": {kind: "fast"}}`.
   - Load → assert both keys present.
   - Then device A saves `dailyStageBadges: {"2026-05-28": {kind: "perfect", retry: true}}` (same date, new shape) — assert latest-write wins for that date.

3. **`dailyStageChestClaimedDate` max-date**:
   - Device A saves `dailyStageChestClaimedDate: "2026-05-28"`.
   - Device B saves `dailyStageChestClaimedDate: "2026-05-27"` (stale).
   - Load → assert `"2026-05-28"` (max date wins; stale device doesn't roll it back).

4. **Bounds defense**:
   - Save with `playDays: [<200 dates back to 2020>]` → load returns only last 31.
   - Save with `dailyStageBadges: {<200 dates>}` → load returns only last 90.

### B. Regression smoke (existing 20 smoke_test.js tests still pass)

Run `node smoke_test.js` against the new deploy → expect 20/20 (no regression in existing sync paths).

### C. Field-by-field doc check

Read your own block comment back. Make sure every field actually handled in the merge code is listed. If you spot one missing, add it.

### D. EXPLAIN check on the size of `data_json`

Pull one of your test rows: `SELECT length(data_json) FROM sync_states WHERE key_hash = ?`. Confirm the bounded fields really are bounded (no runaway growth after the union merges).

---

## Self-grep-verify (per AGENTS.md §7)

When you write `to-claude/open/015-sync-merge-schema-and-new-fields-complete.md`, include:

```bash
# Block comment for the schema
rg -n "SYNC MERGE SCHEMA" cloudflare/src/index.js

# New field merge logic exists
rg -n "playDays|dailyStageBadges|dailyStageChestClaimedDate" cloudflare/src/index.js

# Cap/trim defenses
rg -n "31\\s*\\*\\s*86400000|slice\\(-31\\)|last\\s*90" cloudflare/src/index.js
```

Paste 1-3 lines next to each claim.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/src/index.js` — `handleSyncSave` (block comment + 3 new merge rules) |
| Modify | `smoke_test.js` (add merge-rule tests A1-A4) |

No new migration, no new endpoint, no schema change. The `data_json` column already holds arbitrary JSON; we're just teaching the server how to merge new keys.

---

## Coordination with Kiro

Kiro is writing handoff 006 in parallel. They'll add the client-side payload generation for `playDays` and the daily-stage fields. Kiro can ship before or after you — graceful degradation:

- If Kiro ships first, the server treats new fields as cloud-wins (default). Acceptable but suboptimal (won't union-merge `playDays`).
- If you ship first, Kiro's payload arrives at a server that merges correctly.

**Ideal sequencing:** you ship first, then Kiro. Kiro will write back via `to-claude/open/` confirming the field names they ended up using; if they differ from `dailyStageBadges` / `dailyStageChestClaimedDate`, send a small follow-up handoff to adjust the merge keys.

If sequencing slips and the field name diverges, no data is lost — just falls into the cloud-wins default until aligned.

---

## When done

- `wrangler deploy` from `cloudflare/`
- Run validation A-D, paste results in the completion handoff
- Commit (do not repeat the 014 mistake of deploying uncommitted code — see activity log entry for 014 acceptance)
- Move this handoff to `to-kimi/done/`
- Write `to-claude/open/015-sync-merge-schema-and-new-fields-complete.md` with grep snippets
- Prepend activity log entry
