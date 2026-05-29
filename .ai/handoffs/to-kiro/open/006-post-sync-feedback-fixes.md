# Handoff to Kiro — Post-Sync Player Feedback (11 items)

**From:** claude-code (orchestrator)
**To:** kiro-cli
**Date:** 2026-05-29
**Status:** Mixed UI fixes + sync data gaps. ~3-4 hours total. Client-only.

User tested cloud sync end-to-end and surfaced 11 specific gaps. All are in `src/n3ondashj/`. Organized in 3 sections by type. Each section has its own self-validation.

**Coordination note:** Section A (sync data gaps) lands cleaner if Kimi's handoff 015 (server merge rules for new fields) ships first. Section A still works against the current server (defaults to cloud-wins merge), just won't union-merge `playDays` correctly between two devices that played on different days. If you ship Section A before Kimi's 015 lands, document the limitation in your completion handoff and we'll do a quick follow-up sync once 015 is live.

---

## Section A — Cloud-sync data gaps (items 1, 2, 3)

These are state the player created on device A that doesn't appear on device B after sync.

### A1. Day-streak calendar (27 days back)

**Confirmed bug:** `playDays` array (declared at `src/n3ondashj/03-save.js:916`, used by `renderStreakCalendar` via `04-ui.js:168-169`) is NOT in the cloud-save payload at `03-save.js:425-435`. So Device B has empty `playDays` after sync and the calendar shows zero days played.

**Fix:**
- In the `buildSyncPayload()` (or equivalent — whatever the code calls when assembling the save JSON for `/sync/save`), add `playDays: load('playDays', [])` alongside the existing `frozenDays` and `dailyStreak`.
- In the load-from-cloud branches (`03-save.js:498-502` AND `:597-601`), add:
  ```js
  if (Array.isArray(cloud.playDays)) {
    var trimmed = cloud.playDays.slice(-31); // local sanity cap
    save('playDays', trimmed);
  }
  ```

### A2. Daily-stage badges

**Investigation needed:** find the localStorage key the game uses for daily-stage badges (likely `dailyStageBadges`, `dailyBadges`, or similar — grep for `daily.*badge` in `src/n3ondashj/` to confirm). Once located:
- Add the field to the save payload
- Add the field to both load branches (with appropriate type validation — object or array, depending on what you find)

**Document the exact field name in your completion handoff** so Kimi's handoff 015 server merge rule lines up.

### A3. Daily-stage chest claim state

**Note:** `lastChest` IS in the payload already at line 425 and applied at 501. If "daily-stage chest" is a SEPARATE chest from the general `lastChest` reward, find that key and add it. If they're the same field, the bug is something else (maybe the in-game check still shows the claim button after load — investigate the UI gate logic).

Document what you find in your completion handoff. If you add a new field, ensure Kimi's 015 covers it (write back via `to-claude/open/` if a new field name surfaces).

### Self-validation (Section A) — run BEFORE moving on

- [ ] **Local sanity:** unzip the new v1.2.65 zip locally, open in browser, play 3 days (mock dates via DevTools `Date.now()` overrides if needed). Confirm streak calendar shows 3 days lit.
- [ ] **Two-device round-trip (manual):**
  1. Device A: play day 1 (today). Cloud-save. Streak calendar shows 1 day.
  2. Open game on Device B (different browser, different localStorage). Load from cloud. Streak calendar on B shows day 1.
  3. Device B: play day 2 (mock advance one day). Cloud-save.
  4. Back to Device A: Load from cloud. Calendar should now show days 1 AND 2 (union merge — requires Kimi's 015 to land; without it, last device wins so A might only show day 2).
- [ ] **Daily-stage badge round-trip** (same pattern): earn a badge on A, sync to B, verify B sees it.
- [ ] **Daily-stage chest round-trip:** claim chest on A, open B, confirm B shows "already claimed today" not "claim chest available."

---

## Section B — UI / UX (items 4, 5, 6, 7, 8, 11)

### B1. (Item 4) Onboarding: "link existing device" entry point

User reports the new-user/onboarding flow doesn't offer "I already have a save on another device" path. Find the onboarding flow (likely `showOnboarding()` or `startOnboarding()` in `04-ui.js`). Add a small button or link at the bottom of the welcome screen:

> Already have a save on another device? **Link this device →**

Clicking it should jump directly into the existing link-device flow (the one the player would normally find under Settings → Cloud Save). After successful link, the rest of the onboarding is skipped — the player is now on their existing save.

### B2. (Item 5) Last-sync timestamp on Cloud Sync page

In the Cloud Sync settings panel, add a small text under the connection status:

> Last sync: 14:32 (3m ago)

Tied to a localStorage key like `ndj_lastSyncAt` (epoch ms), updated after every successful `/sync/load` or `/sync/save`. Format using whatever `fmtAgo`-equivalent exists; if none, write a tiny helper inline.

If `ndj_lastSyncAt` is unset (never synced), show "Last sync: never."

### B3. (Item 6) Cloud Sync page layout — 2 columns + collapsible

Current layout: probably a single column with all sync actions stacked. Desired:

- **Top: status + primary actions** (sync now, last sync timestamp, account info) — always expanded
- **Bottom: secondary actions** (Change PIN, Reset PIN, Replace recovery code, Link another device) — **collapsed by default**, expandable with a single "Advanced" toggle (or per-button details/summary)

Two-column layout for desktop (CSS grid `repeat(2, 1fr)`), single column on mobile (≤640px). Use existing `.sync-panel` styling vocabulary.

If implementing as four separate `<details>/<summary>` elements is simpler than one toggle, that's fine — same outcome from a UX perspective.

### B4. (Item 7) Rank score on profile page

Find the profile/settings panel showing player name + rank. Currently shows the rank name (e.g., "Master of N30N") but not the score points behind it. Add:

> Rank: Master of N30N · 12,450 pts

The score-points value is already computed elsewhere (grep `rankScore` or `getPlayerRankInfo` — if it returns `{name, color, score, ...}`, use that). If only the name is exposed, dig into the rank-tier logic and expose the score alongside.

### B5. (Item 8) Remove export/import save buttons from Settings

Cloud save replaces this feature. Find `exportSave` / `importSave` functions and their UI buttons in Settings → Data section. Remove the buttons + DOM elements. Keep the JS functions for now (in case anyone still calls them programmatically); just unwire the UI buttons. Add a small note where the buttons were:

> Saves are now stored in the cloud. Use the Cloud Sync panel to link devices.

### B6. (Item 11) Post-restore notice: ghost rival not synced

After a successful `/sync/load` that restored save data, show a one-time toast:

> 👻 Note: Ghost rival data is local to the device it was recorded on. Your replay times sync; your ghost runs do not.

Suppress the toast on subsequent loads via a localStorage flag (`ndj_ghostNoticeSeen=1`). Reset the flag on PIN reset / link new device (so each new device gets the notice once).

### Self-validation (Section B) — run BEFORE moving on

- [ ] **B1 onboarding link-device:** fresh install (DevTools → clear all localStorage) → welcome screen shows "Link this device" link → click → land on link-device flow → after linking, NOT shown onboarding again
- [ ] **B2 last-sync timestamp:** fresh install + first sync → "Last sync: just now" → wait 30s, refresh sync panel → shows "30s ago"
- [ ] **B3 layout:** open Cloud Sync on desktop (≥720px) → 2 columns visible; secondary actions collapsed; click Advanced → secondary actions expand. Open on mobile (380px) → single column.
- [ ] **B4 rank score:** open profile → see rank name + score
- [ ] **B5 remove export/import:** Settings → Data section shows the explanatory note, no buttons. Code grep: `rg -n "exportSave|importSave" src/n3ondashj/index.html` — should return zero hits for button invocations.
- [ ] **B6 ghost rival notice:** sync-load → toast appears once. Sync-load again → no toast. Trigger link-new-device → flag clears → next load shows the toast again.

---

## Section C — Store / PWA (items 9, 10)

### C1. (Item 9) PWA install reward should LOOK like silver, not gold

**The actual reward logic IS already correct** — `04-ui.js:262` adds `silverWallet+=100`. The bug is purely visual: the floating reward text at `04-ui.js:268` uses gold color:

```js
addFloat(W.innerWidth/2, W.innerHeight-60, '+100 ♦', '#ffd700');
```

`#ffd700` is gold. Silver elsewhere in the game uses `#ccc` (e.g., `04-ui.js:1329` `<span style="color:#ccc">♦</span>`).

**Fix:** change `'#ffd700'` → `'#ccc'` (or whatever the consistent silver color is in this codebase). The user sees the gold-colored text and reasonably concludes they got gold; the wallet actually went up in silver but the visual signal is wrong.

### C2. (Item 10) Remove robot NPC on store page, replace with tip icon

Find the robot NPC (grep `robot` or look for the store-page intro graphic in `renderStore()` in `04-ui.js`). Replace with a small tip icon (e.g., 💡 or ℹ) next to a short tip line. Example:

> 💡 Tip: Equip up to 3 skills at a time. Cosmetics are forever.

Rotate through 4-5 short tips on each store open (cycle by `Math.random()` or an index in localStorage). Each tip should be ≤80 chars, useful, beginner-friendly.

### Self-validation (Section C) — run BEFORE moving on

- [ ] **C1 PWA reward color:** install PWA → claim reward → floating text shows in silver color (not gold). Wallet silver count went up by 100.
- [ ] **C2 store tips:** open Store page → robot graphic gone, tip icon + short tip line visible. Close + reopen store → tip rotates to a different one.

---

## Self-grep-verify (per AGENTS.md §7) — for the completion handoff

When you write `to-claude/open/006-post-sync-feedback-fixes-complete.md`, paste output for:

```bash
# Section A
rg -n "playDays" src/n3ondashj/03-save.js
rg -n "dailyStageBadges|dailyBadges" src/n3ondashj/
rg -n "dailyStageChestClaimedDate|dailyChest" src/n3ondashj/

# Section B
rg -n "showLinkDeviceFromOnboarding|onboardingLinkDevice|linkExistingDevice" src/n3ondashj/04-ui.js
rg -n "ndj_lastSyncAt|lastSyncTime|Last sync:" src/n3ondashj/
rg -n "sync-panel-collapsible|details.*Advanced|sync-secondary" src/n3ondashj/index.html
rg -n "rankScore.*pts|getPlayerRankInfo" src/n3ondashj/04-ui.js

# Item 8 — buttons removed from UI
rg -n "onclick.*exportSave|onclick.*importSave" src/n3ondashj/index.html  # expect zero

# Section C
rg -n "addFloat.*100.*#ccc|addFloat.*100.*silver" src/n3ondashj/04-ui.js
rg -n "store.*tip|💡|storeTip" src/n3ondashj/04-ui.js

# Section B6
rg -n "ndj_ghostNoticeSeen|Ghost rival.*not.*sync|ghost.*local" src/n3ondashj/

# zipgame ran
ls -la deploy/  # confirm new v1.2.65 (or whatever bump) zip exists
```

Paste 1-3 lines per claim. **Completion handoff file goes in `to-claude/open/` — not `done/` directly. The orchestrator workflow is `open/` → review → `done/`.**

---

## Files (anticipated)

| Action | File | Why |
|---|---|---|
| Modify | `src/n3ondashj/03-save.js` | Section A: add fields to save payload + both load branches |
| Modify | `src/n3ondashj/04-ui.js` | Sections B1-B6, C1-C2 |
| Modify | `src/n3ondashj/index.html` | Section B3 layout markup, B5 button removal, C2 store markup |
| Modify | `CHANGELOG.md` | v1.2.65 entry summarizing all 11 fixes |
| New | `deploy/yyyymmddhhmm_v1.2.65.zip` | via `zipgame.ps1` |

Sequence inside the sprint:
1. Section A (sync gaps) — biggest impact
2. Section B (UI) — straightforward
3. Section C (store/PWA) — smallest
4. Run all three Self-validation blocks
5. zipgame → new zip
6. Write completion handoff with grep snippets

---

## Out of scope (track but defer)

- Server-side merge rules for new fields → that's Kimi's handoff 015
- Ghost rival cross-device sync → user explicitly accepted local-only ("inform that ghost rival is not synced, only at the original or played device")
- Backwards compat for export/import save (we just remove the buttons, not the functions)
- Multi-language tips in store
- PWA install reward bonuses beyond +100 silver

---

## When done

- Run zipgame → new v1.2.65 zip
- Move this handoff to `to-kiro/done/`
- Write **`to-claude/open/006-post-sync-feedback-fixes-complete.md`** (NOT `done/`) with grep snippets per AGENTS.md §7
- Prepend activity log entry with: section-by-section validation results, deploy file name, sha256, and Kimi-coordination note (whether you shipped before/after 015 and the resulting union-merge behavior)
