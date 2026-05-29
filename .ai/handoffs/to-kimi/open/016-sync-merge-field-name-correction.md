# Handoff to Kimi — 016: Amend Sync Merge Rules to Real Field Names

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-29
**Status:** ~30-45 min. Follow-up to 015 because Kiro's 006 discovered the actual field names + shapes differ from what 015 assumed.

The rules at `index.js:1834` (`dailyStageBadges`) and `:1843` (`dailyStageChestClaimedDate`) are **dead code** — the client never sends those keys. The client actually sends `dailyCollection` (array of `{date, name, time, rankIdx}`) and `dailyStats` (single-day object `{day, played, completed, bestTime, deaths, reward}`). `playDays` was correct; leave it.

This handoff renames the rules to match the real keys and adjusts the merge semantics to the actual data shapes.

---

## Three changes

### 1. Replace the `dailyStageBadges` rule with `dailyCollection` (array union by date)

**Current (dead code):**
```js
// Around index.js:1834
if (data.dailyStageBadges && typeof data.dailyStageBadges === 'object' && !Array.isArray(data.dailyStageBadges)) {
  const merged = { ...parsed.dailyStageBadges, ...data.dailyStageBadges };
  const cutoff = new Date(serverTs - 90 * 86400000).toISOString().slice(0, 10);
  mergedData.dailyStageBadges = Object.fromEntries(
    Object.entries(merged).filter(([k]) => typeof k === 'string' && k >= cutoff).slice(0, 90)
  );
}
```

**Replace with:**
```js
// dailyCollection: array of {date, name, time, rankIdx} — union by date, latest write wins on collision, trim to last 90 days
if (Array.isArray(data.dailyCollection)) {
  const cutoff = new Date(serverTs - 90 * 86400000).toISOString().slice(0, 10);
  const byDate = new Map();
  // Incoming first so existing wins on tie — invert if you want incoming-wins
  for (const entry of (Array.isArray(parsed.dailyCollection) ? parsed.dailyCollection : [])) {
    if (entry && typeof entry.date === 'string' && entry.date >= cutoff) byDate.set(entry.date, entry);
  }
  // Then incoming, so incoming wins on date collision (latest device write semantics)
  for (const entry of data.dailyCollection) {
    if (entry && typeof entry.date === 'string' && entry.date >= cutoff) byDate.set(entry.date, entry);
  }
  // Sort by date asc, cap at 90
  mergedData.dailyCollection = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-90);
}
```

Each entry has shape `{date: 'YYYY-MM-DD', name: '...', time: 12345, rankIdx: 3}`. Date is the dedupe key. Incoming write wins on collision (matches "latest device wins" intuition for badge updates).

### 2. Replace the `dailyStageChestClaimedDate` rule with `dailyStats` (single-day object merge)

**Current (dead code):**
```js
// Around index.js:1843
if (typeof data.dailyStageChestClaimedDate === 'string') {
  const existingDate = (typeof parsed.dailyStageChestClaimedDate === 'string' && parsed.dailyStageChestClaimedDate) || '';
  mergedData.dailyStageChestClaimedDate = data.dailyStageChestClaimedDate > existingDate
    ? data.dailyStageChestClaimedDate
    : existingDate;
}
```

**Replace with:**
```js
// dailyStats: {day, played, completed, bestTime, deaths, reward} — single object for the current day
// Merge: compare .day strings; later date wins outright; same day → OR booleans, min bestTime, max deaths, prefer non-null reward
if (data.dailyStats && typeof data.dailyStats === 'object') {
  const cur = (parsed.dailyStats && typeof parsed.dailyStats === 'object') ? parsed.dailyStats : null;
  const incoming = data.dailyStats;
  const incomingDay = typeof incoming.day === 'string' ? incoming.day : '';
  const curDay = cur && typeof cur.day === 'string' ? cur.day : '';
  if (!cur || incomingDay > curDay) {
    // Newer day: incoming replaces wholesale
    mergedData.dailyStats = incoming;
  } else if (incomingDay === curDay && incomingDay) {
    // Same day: OR booleans, min bestTime (lower is better), max deaths, prefer truthy reward
    mergedData.dailyStats = {
      day: curDay,
      played: !!(cur.played || incoming.played),
      completed: !!(cur.completed || incoming.completed),
      bestTime: (() => {
        const a = typeof cur.bestTime === 'number' ? cur.bestTime : null;
        const b = typeof incoming.bestTime === 'number' ? incoming.bestTime : null;
        if (a == null) return b;
        if (b == null) return a;
        return Math.min(a, b);
      })(),
      deaths: Math.max(
        typeof cur.deaths === 'number' ? cur.deaths : 0,
        typeof incoming.deaths === 'number' ? incoming.deaths : 0
      ),
      reward: incoming.reward != null ? incoming.reward : cur.reward,
    };
  }
  // else: incoming.day is stale (older); keep existing untouched (no assignment to mergedData)
}
```

**Semantics rationale:**
- If today is May 29 and one device synced May 28's stats while the other already updated to May 29 — the May 29 device wins (newer day takes over)
- Same-day collisions OR the booleans (if EITHER device played or completed today, both see it)
- `bestTime` takes the lower (lower = better in this game)
- `deaths` takes the higher (cumulative across devices for today)
- `reward` prefers incoming if it set one, else keeps existing — avoids dropping a claim

### 3. Update the SYNC MERGE SCHEMA block comment

Find the comment block at `index.js:1586` and update lines 1599-1601:

**Old:**
```
//   Union (dedupe):      unlocked[], ownedSkills[], ownedCosmetics[], playDays[]
//   Union by date:       dailyStageBadges{}
//   Max date string:     dailyStageChestClaimedDate
```

**New:**
```
//   Union (dedupe):      unlocked[], ownedSkills[], ownedCosmetics[], playDays[]
//   Union by .date key:  dailyCollection[]   (array of {date, name, time, rankIdx})
//   Compound merge:      dailyStats{}        (single-day object; newer-day wins, same-day OR/min/max)
```

---

## Validation

### Synthetic merge tests (curl, modeled on the existing smoke_test.js)

1. **`dailyCollection` array union by date**
   - Device A saves `dailyCollection: [{date:'2026-05-27',name:'Alpha',time:1000,rankIdx:1}]`
   - Device B saves `dailyCollection: [{date:'2026-05-28',name:'Beta',time:900,rankIdx:2}]`
   - Load → assert array contains both entries in date order, length 2
   - Device A saves `dailyCollection: [{date:'2026-05-28',name:'BetaFromA',time:1100,rankIdx:5}]` (collision on 5-28)
   - Load → assert May-28 entry now has `name:'BetaFromA'` (incoming wins on date collision)

2. **`dailyCollection` 90-day cap**
   - Save with `dailyCollection` containing 200 distinct dates ranging back to 2024
   - Load → length ≤ 90, all kept entries have `date >= cutoff`

3. **`dailyStats` newer-day-wins**
   - Device A: `dailyStats: {day:'2026-05-27', played:true, completed:true, bestTime:1234, deaths:2, reward:50}`
   - Device B: `dailyStats: {day:'2026-05-28', played:true, completed:false, bestTime:null, deaths:0, reward:null}`
   - Load → entire B object wins (newer day)

4. **`dailyStats` same-day OR/min/max merge**
   - Device A: `dailyStats: {day:'2026-05-28', played:true, completed:false, bestTime:1500, deaths:3, reward:null}`
   - Device B: `dailyStats: {day:'2026-05-28', played:true, completed:true, bestTime:1300, deaths:5, reward:50}`
   - Load → assert merged `{day:'2026-05-28', played:true, completed:true, bestTime:1300, deaths:5, reward:50}`

5. **`dailyStats` stale day → no change**
   - Existing has `dailyStats: {day:'2026-05-28', ...}`
   - Incoming has `dailyStats: {day:'2026-05-27', ...}` (stale)
   - Load → existing object unchanged, NOT replaced by stale

6. **Regression: `playDays` still union+trim** (it should still work — confirm)

### Smoke test runs

Update `cloudflare/smoke_test.js` if it has the wrong field names from 015's run. Validate against deploy.

---

## Self-grep-verify (per AGENTS.md §7)

Include in `to-claude/open/016-sync-merge-field-name-correction-complete.md`:

```bash
# Old dead rules removed
rg -n "dailyStageBadges|dailyStageChestClaimedDate" cloudflare/src/index.js  # expect zero (or only in deleted-comment archaeology)

# New rules in place
rg -n "data.dailyCollection|data.dailyStats" cloudflare/src/index.js
rg -n "mergedData.dailyCollection|mergedData.dailyStats" cloudflare/src/index.js

# Block comment updated
rg -n "Union by .date key|Compound merge|dailyCollection\\[\\]|dailyStats\\{\\}" cloudflare/src/index.js

# Smoke test updated
rg -n "dailyCollection|dailyStats" cloudflare/smoke_test.js
```

Paste 1-3 lines per claim.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/src/index.js` — replace two merge rules + update schema comment |
| Modify | `cloudflare/smoke_test.js` — update payloads + assertions for the new names/shapes |

No new endpoint, no migration. Pure rename + reshape.

---

## Process reminders

- **Completion handoff to `to-claude/open/`** — not `done/`
- **Grep snippets next to claims** per AGENTS.md §7
- **Commit + push** — don't repeat the 014 uncommitted-deploy pattern (015 got this right; keep it up)
- The smoke run from 015 explicitly noted "no existing smoke_test.js suite to run; the new file is additive only" — by now there IS a `smoke_test.js` so existing tests need to keep passing after the field-name changes

---

## When done

- `npm.cmd run build && npx.cmd wrangler deploy`
- Run the 6 validation cases above
- Commit + push to master
- Move this handoff to `to-kimi/done/`
- Write completion handoff at `to-claude/open/016-sync-merge-field-name-correction-complete.md`

After 016 lands, multi-device sync of badges and daily stats will work correctly. Until then, both fall to cloud-wins default (acceptable interim, no data loss for single-device users).
