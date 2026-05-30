# Handoff to Kiro — 008: Fix `dailyStreak` Stale-Memory Bug

**From:** claude-code (orchestrator)
**To:** kiro-cli
**Date:** 2026-05-29
**Status:** Tiny surgical fix. ~5 min. 2 lines.

Kiro 007 static investigation confirmed: `dailyStreak` (`03-save.js:920`) is a module-level variable, but the cloud-load branches at lines 502 and 605 only call `save('dailyStreak', cloud.dailyStreak)` — they never reassign the module var. UI reads `dailyStreak` from module state at 5 sites (1004, 1014, 1710, 1763, 1781). After a sync-load that doesn't trigger `location.reload()`, the streak counter shows stale pre-sync value until next page reload.

Masked by `confirmLinkDevice` flow's "RESTART GAME" prompt → `location.reload()`. Surfaces on auto-sync paths.

**Kimi 019 verified server returns `dailyStreak` correctly — this is purely a client-side render bug.**

---

## The fix

Two identical changes:

### `src/n3ondashj/03-save.js:502`

**Before:**
```js
if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);}
```

**After:**
```js
if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);dailyStreak=cloud.dailyStreak;}
```

### `src/n3ondashj/03-save.js:605`

Same change — identical line pattern.

---

## Mirror the pattern for `playDays` / `dailyCollection`

While you're in there: confirm the existing `:507/:613` (`playDays=trimmed;`) and `:508/:614` (`dailyCollection=cloud.dailyCollection.slice();save(...)`) lines DO update the module vars. They should already — that's Kiro 007's static finding. If for any reason they don't, fix in same commit.

Don't change `dailyStats` or `frozenDays` lines — both are NOT module vars, so save() is sufficient (Kiro 007 confirmed).

---

## Why this isn't bundled with anything else

Kimi 019 verified the server round-trip is correct. The user reported THREE things broken: streak, badges, calendar. This fix addresses ONLY streak. Badges + calendar code paths look correct statically — we need browser evidence to know whether they're broken at render-time or PWA-cache-time. Orchestrator is asking user separately about browser-side evidence for those.

If browser evidence reveals render bugs on the badges/calendar UI, a follow-up Kiro handoff will dispatch those. Don't try to anticipate them in this fix.

---

## Validation

- [ ] Spot-grep confirms 2 sites changed:
   ```bash
   rg -n "save\('dailyStreak'.*dailyStreak=cloud.dailyStreak" src/n3ondashj/03-save.js
   # Expect 2 hits at lines 502 and 605 (or wherever — they shifted, but exactly 2)
   ```
- [ ] No other lines changed in this commit (one-line × 2-site only; no scope creep)
- [ ] Existing `playDays=trimmed;` at `:507/:613` and `dailyCollection=cloud.dailyCollection.slice();` at `:508/:614` UNCHANGED (verify via diff)

---

## Build + ship

- `zipgame.ps1` to build the new zip
- Manual smoke is up to the user (probably not worth a full smoke for a 2-line fix; user can verify by triggering a background sync-load that doesn't reload the page and watching whether the streak counter updates without a reload)
- Commit + push

---

## Self-grep-verify (per AGENTS.md §7)

In your completion handoff at `to-claude/open/008-dailystreak-stale-memory-fix-complete.md`:

```bash
# The two fix sites
rg -n "save\('dailyStreak'.*dailyStreak=cloud" src/n3ondashj/03-save.js

# Verify playDays/dailyCollection patterns unchanged (sanity)
rg -n "playDays=trimmed|dailyCollection=cloud.dailyCollection.slice" src/n3ondashj/03-save.js

# Verify dailyStats/frozenDays NOT changed (no extra module-var assignments added)
rg -n "save\('dailyStats'.*=cloud|save\('frozenDays'.*=cloud" src/n3ondashj/03-save.js
# Expect zero hits — these fields are NOT module vars
```

Standard process: file in `to-claude/open/`, grep snippets, commit + push, build the new zip.

---

## What I'm NOT asking for

- No backend changes — server is verified clean by Kimi 019
- No rework of badges or calendar code paths — those need browser evidence first
- No new tests — this is a 2-line surgical fix
- No PWA-cache clearing logic — orthogonal issue

If during the fix you find that `playDays` or `dailyCollection` module-var updates are somehow broken (contradicting Kiro 007's static finding), STOP and write to `to-claude/open/` before fixing — that would mean Kiro 007's static analysis was wrong, which changes the calendar/badges investigation entirely.

---

## When done

- New v1.2.69 (or whatever the next bump is) zip in `deploy/`
- Commit + push
- Move handoff to `to-kiro/done/`
- Write `to-claude/open/008-dailystreak-stale-memory-fix-complete.md`
- Activity log entry

User can then optionally upload to Pages, or stockpile until the calendar/badges follow-up lands.
