# WORKFLOW.md — N3ON DashJ

> This document describes every player-facing and backend workflow in the game. When adding or changing any flow, update the relevant section here so future agents understand the full picture.

---

## Table of Contents

1. [Player Onboarding](#1-player-onboarding)
2. [Stage Select](#2-stage-select)
3. [Gameplay Loop](#3-gameplay-loop)
4. [Death & Retry](#4-death--retry)
5. [Level Complete (Win)](#5-level-complete-win)
6. [Ghost Replay](#6-ghost-replay)
7. [Store / Shop](#7-store--shop)
8. [Settings](#8-settings)
9. [Daily Rewards](#9-daily-rewards)
10. [Champion Ceremony](#10-champion-ceremony)
11. [Save Export / Import](#11-save-export--import)
12. [Share](#12-share)
13. [Backend Metrics Pipeline](#13-backend-metrics-pipeline)
14. [Build & Deploy](#14-build--deploy)

---

## 1. Player Onboarding

**Trigger:** First launch (no `playerName`, or `ctrlPicked` false, or `tutorialDone` false).

**Flow:**
1. Boot screen shows animated particles + progress bar.
2. `showOnboard()` displays `#onboard` overlay.
3. Player enters name (5–10 chars, alphanumeric).
4. Player picks control scheme: **Arrow Buttons** (default) or **Joystick**.
5. "How to Play" card explains: reach flag, double-jump, collect gems, avoid hazards.
6. `finishOnboard()` saves `playerName`, `ctrlPicked=true`, `tutorialDone=true`.
7. `initLevelSelect()` renders the stage select screen.
8. First-time players see the tutorial overlay (`#tutorial`) before first level.

**Cross-dependencies:**
- Name is required before metrics events fire (`sendMetric` defers until `playerName` is set).
- Control choice affects `joy` object behavior + HUD button visibility.

---

## 2. Stage Select

**Trigger:** Boot completes, or `goHome()` after game/replay.

**Flow:**
1. `initLevelSelect()` shows `#levelSelect`.
2. Thumbnail canvas renders a mini preview of the active stage with theme colors.
3. Dot navigation (20 dots) shows unlocked/locked/daily status.
4. Stats strip shows global: matches, time played, clear %, total deaths (by cause).
5. Player rank chip next to name (clickable → rank popup).
6. Top buttons: 🎁 Daily Chest, 🛒 STORE, ↗ Share, ⚙ Settings.
7. Swipe left/right or tap dots to change stage.
8. Ghost banner shows unlock progress (0/2 → 2/2 → hidden).
9. "Play DashJ" button starts the level.

**Cross-dependencies:**
- Carousel reads `unlocked[]`, `bestTimes[]`, `bestChips[]`, `levelStats[]`, `ghostData[]`.
- Daily dot indicator reads `dailyMaster` save data.

---

## 3. Gameplay Loop

**Trigger:** `startGame(lvl)` or `startReplay(lvl)`.

**Flow:**
1. Hide stage select, show canvas + HUD.
2. Apply control layout (joystick zone + jump button, or arrow buttons).
3. `startLvl(lvl)`:
   - Reset player state, camera, particles.
   - `genLvl(lv)` procedurally generates platforms, spikes, lasers, ziplines, chips.
   - Place master gems (champions only) and daily gem (if today).
   - Restore session-persistent chips if retrying same stage.
   - Start background music (theme-specific scale).
4. `loop()` runs via `requestAnimationFrame`:
   - Compute `dt` from `performance.now()`.
   - Call `update()` → physics, collision, input, death checks.
   - Call `draw()` → background, platforms, player, particles, HUD.
   - Record ghost frame (if enabled).
5. Input: keyboard (arrows/WASD/space/ESC) OR touch (joystick + jump button) OR arrow buttons.

**Cross-dependencies:**
- `update()` reads `equippedSkills[]` to apply skill effects.
- `draw()` reads `equippedCosmetics` to render visual customizations.
- Music scale changes per level (`SCALES[curLvl % SCALES.length]`).

---

## 4. Death & Retry

**Trigger:** Player falls below `fallLimitY`, hits spike, or touches active laser.

**Flow:**
1. `showDie()` sets `player.dead=true`.
2. Death cause tracked: `fall` → "FALLEN", `spike` → "SPIKED!", `laser` → "LASERED!", `storm` → "⚡ STRUCK!".
3. Death flash + screen shake.
4. Update stats: `attempts++`, `deadFall/deadSpike/deadLaser++`.
5. If `resurrect` skill equipped and off cooldown → auto-resurrect at last platform.
6. Otherwise, show death overlay with:
   - "SECTOR FAILED" + cause
   - Stats: time, distance, gems collected this run
   - Buttons: RETRY / BACK TO STAGE SELECTION
7. Auto-retry timer fires if setting enabled (after configurable delay).
8. `startLvl()` resets run state but preserves session chips if retrying same stage.

**Cross-dependencies:**
- Consumables persist across retries (shield hits, triple jump, time freeze).
- Only WIN or EXIT consumes inventory items (`finalizeRunConsumables`).
- Ghost recording stops on death (not saved).

---

## 5. Level Complete (Win)

**Trigger:** Player reaches the finish platform (`t:'f'`) and `player.x >= goalX`.

**Flow:**
1. `showWin()` sets `player.won=true`.
2. Compute score: `distance/10 + gold*50 + silver*10 + style*5 - deaths*10 + timeBonus`.
3. Credit gems to wallet: `silverWallet += runSilver`, gold from chips already counted via `bestChips`.
4. Save `bestTimes`, `bestChips`, `bestScores`, `levelStats`, `globalData`.
5. Save ghost recording if new best time or first recording.
6. Unlock next 2 stages (if any).
7. Check champion status (all 20 cleared → trigger ceremony).
8. Show overlay: "SECTOR CLEARED!" + score + time + unlocks.
9. Buttons: NEXT LEVEL / 🔄 RETRY / 👻 WATCH (if replay exists) / 📷 SHARE.

**Cross-dependencies:**
- Score formula affects rank progression.
- Ghost data affects stage select "👻 watch replay" link.
- Unlocking stages updates `unlocked[]` and saves.

---

## 6. Ghost Replay

**Trigger:** Player clears Stage 1 & 2 → Ghost Rival auto-unlocked. Toggle via 👻 button or "WATCH" on win screen.

**Flow:**
1. Ghost recording: every run captures player position/state at ~60fps into `ghostFrames[]`.
2. On win with new best time: `ghostData[lvl] = ghostFrames` saved to storage.
3. Playing with ghost: `currentGhost` replays alongside player as translucent stickman.
4. Watching replay: `startReplay(lvl)` plays ghost data without player input.
   - No controls shown, no HUD scoring, no analytics events.
   - Ends → returns to stage select automatically.
5. Ghost can be disabled globally in Settings for performance.

**Cross-dependencies:**
- Ghost data format must match player physics state (x, y, face, at, djU).
- Pause-aware: ghost freezes during pause.

---

## 7. Store / Shop

**Trigger:** Tap 🛒 STORE on stage select.

**Flow:**
1. `openStore()` shows `#store` with 3 tabs: Consumables / Cosmetics / Skills.
2. **Consumables**: Triple Jump, Double Shield, Time Freeze, Name Change. Bought with ♦ silver.
3. **Cosmetics**: Hats, Capes, Glows, Trails, Bodies, Death effects, Jump effects, Platform skins. Bought with ♦ silver. Sorted by category → tier → cost.
4. **Skills**: Air Dash, Clipping, Auto Resurrect, Coyote Boost, Magnet, Platform Bounce, Slow Fall. Bought with ★ gold. Max 3 equipped slots.
5. Free skills (don't use slots): Ghost Rival (unlock after S1&S2), Reflex Dash (champion-only, toggleable).
6. Champion-locked cosmetics show 🔒 until all 20 stages cleared.
7. Shopkeeper NPC shows random tip from `TIPS` array (50 tips).
8. Buy/Sell/Equip/Unequip updates `ownedSkills`, `equippedSkills`, `ownedCosmetics`, `equippedCosmetics`, `consumableInv`, `goldSpent`, `silverWallet`.

**Cross-dependencies:**
- Gold balance = `bonusGold + (total gold chips collected) - goldSpent`.
- Skills affect physics in `update()`.
- Cosmetics affect rendering in `drawPlayerSprite()`.

---

## 8. Settings

**Two separate panels:**

### Stage-Select Settings (`#settings`)
- SFX on/off
- Music on/off
- Particles (High/Med/Low/Off) — affects `partMult`, `qStarMult`, `qBgMult`
- Visual Quality (High/Med/Low) — affects atmosphere, ghost replays
- Show FPS on/off
- Ghost Replay toggle
- Export Save → file download (JSON with optional ghost data)
- Import Save → file picker + paste fallback
- Reset Progress → confirm → wipe all `ndj_*` keys
- Restart button → forces page reload for SW updates

### In-Game Pause Settings (`#gameSettings`)
- Visual Quality picker
- Show FPS toggle
- Orientation (Landscape/Portrait)
- Vibration on/off
- Controls (Arrow Buttons / Analog Joystick)
- Auto-retry on death (No auto / Instant / 0.5s / 1s / 2s)
- ⊞ Adjust Layout → drag joystick/jump button positions
- Quick Shop → buy consumables mid-run
- Apply & Resume / 🔄 Retry Level / Back to Stage Selection

**Cross-dependencies:**
- Quality setting affects rendering performance and ghost availability.
- Orientation change triggers fullscreen + lock.
- Layout adjustments saved per-orientation separately.

---

## 9. Daily Rewards

### Daily Chest
**Trigger:** Tap 🎁 on stage select (once per 24h).

**Flow:**
1. `canClaimChest()` checks `Date.now() - lastChestClaim >= 86400000`.
2. Rewards: 30% chance ★ gold (2–5), 70% chance ♦ silver (15–40), 15% chance consumable drop.
3. Updates `lastChestClaim`, `goldSpent`/`silverWallet`, `consumableInv`.
4. Button changes to ✅ CLAIMED with half opacity until next day.

### Daily Master Chip
**Trigger:** Play today's designated daily stage.

**Flow:**
1. `getDailyMasterStage()` deterministically picks a stage from unlocked pool based on calendar date.
2. A 💎 diamond chip spawns mid-stage.
3. Collecting it: champions get +5 gold, non-champions get +5 silver.
4. `dailyMaster` save tracks `day` + `collected` flag.
5. Dot nav shows 💎 marker on today's stage.

---

## 10. Champion Ceremony

**Trigger:** Clear all 20 stages for the first time.

**Flow:**
1. `checkChampionStatus()` detects all completions on boot or win.
2. If newly championed:
   - `championStatus.unlocked = true`
   - Auto-own `glow_champion` cosmetic, auto-equip to glow slot.
   - Backfill: existing all-clear players get rewards on next launch.
3. Win overlay replaced with ceremony:
   - "★ MASTER OF N30N ★" title
   - Confetti animation (DOM-based, 70 pieces)
   - Reward list: MASTER badge, Champion's Aura, Clipping skill, 1.5× silver multiplier
   - Career stats: clears, attempts, deaths, time, gold chips
4. Share button generates gold-themed PNG card.

**Cross-dependencies:**
- Clipping skill auto-available in store (free, equips a slot).
- Reflex Dash auto-unlocked (champion-only, toggleable, no slot).
- Silver multiplier affects all future `silverGainAmt()` calls.

---

## 11. Save Export / Import

### Export
**Trigger:** Settings → Export Save.

**Flow:**
1. Gather all `ndj_*` localStorage keys into an object.
2. Optionally include `ghostData` (default off, checkbox toggle).
3. Generate JSON blob with a simple hash checksum.
4. Trigger file download: `n3ondashj-save-<date>.json`.

### Import
**Trigger:** Settings → Import Save.

**Flow:**
1. File picker opens (fallback to paste textarea).
2. Parse JSON, verify hash checksum.
3. Reject if `parsed.v > GAME_VERSION` (future save).
4. Run `normalizeLevelStats()` migration.
5. Write all keys back to `localStorage`.
6. Reload page to apply.

**Cross-dependencies:**
- Migration runs on import (e.g., `bestChips` integer→boolean-array packing).
- Ghost data can be excluded to keep file small.

---

## 12. Share

### Stage Clear Share
**Trigger:** Win overlay → 📷 SHARE, or stage select ↗ Share.

**Flow:**
1. Build text template with player name, rank, cleared count, URL.
2. Optional custom message textarea.
3. Generate 600×400 PNG with character portrait + stats + branding.
4. Use Web Share API with file attachment (falls back to clipboard copy + download).

### Champion Share
**Trigger:** Champion ceremony → SHARE.

**Flow:**
1. Generate 600×380 gold-themed PNG with career stats.
2. Same share pipeline as stage clear.

---

## 13. Backend Metrics Pipeline

**Architecture:** Cloudflare Worker (`cloudflare/src/index.js`) + D1 SQLite.

### Event Types
- `session_start` — player begins session (deferred until name set)
- `heartbeat` — every 90s while page visible and named
- `level_start` — level begins
- `level_complete` — level finished (server-side time validation)
- `level_death` — player died
- `purchase` — store transaction
- `ui_event` — button clicks (share, store, settings, etc.)
- `name_set` — player picked/changed name

### Flow
1. Client requests `/session` → worker returns token + expiry.
2. Client signs events with HMAC-SHA256(token, data + ts).
3. Client POSTs to `/event` or `/events/batch` (offline queue flush).
4. Worker validates: token active, HMAC matches, clock skew reasonable.
5. Worker inserts into D1: `sessions`, `events`, `players` tables.
6. Dashboard at `/dashboard` shows aggregated stats (password-protected).

### Anti-cheat
- `level_complete`: claimed time must be ≥5000ms. Server delta must be within `claimedTime-1s` to `claimedTime+30s`.
- HMAC-signed events prevent spoofing.

---

## 14. Build & Deploy

**Trigger:** Run `zipgame.ps1` manually or via CI.

### Dev Workflow
1. Edit JS modules in `src/n3ondashj/`.
2. Open `src/dev.html` in browser for rapid iteration (modules load individually).
3. Test in browser: gameplay, store, settings, share, save/load.

### Build Workflow
1. Run `.\zipgame.ps1` in PowerShell.
2. Script auto-bumps patch version.
3. Updates 3 version locations in `src/n3ondashj/index.html`.
4. Concatenates `##-*.js` → injects before `</body>`.
5. Parses metadata from JS for portal injection.
6. Copies non-JS PWA assets.
7. Creates zip in `deploy/` with timestamp+version filename.

### Deploy Workflow
1. Upload zip to Cloudflare Pages (drag-drop or wrangler).
2. Pages extracts: `index.html` (portal) + `n3ondashj/` (game).
3. First visit online caches assets via SW. Subsequent visits work offline.
4. New version triggers SW update → "Update available!" banner → user refreshes.

---

## Workflow Change Log

| Date | Change |
|------|--------|
| 2026-05-16 | Added modular build workflow (v1.1.20 restructure) |
