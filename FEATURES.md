# FEATURES.md — N3ON DashJ

> Complete catalog of every mechanic, system, and feature in the game. When adding or modifying anything, update the relevant section so future agents know what's available and how it interacts with other systems.

---

## Table of Contents

1. [Core Gameplay](#1-core-gameplay)
2. [Platform Types](#2-platform-types)
3. [Hazards](#3-hazards)
4. [Collectibles](#4-collectibles)
5. [Skills](#5-skills)
6. [Consumables](#6-consumables)
7. [Cosmetics](#7-cosmetics)
8. [Weather System](#8-weather-system)
9. [Day/Night Cycle](#9-daynight-cycle)
10. [Backgrounds & Themes](#10-backgrounds--themes)
11. [Champion / Master System](#11-champion--master-system)
12. [Player Rank System](#12-player-rank-system)
13. [Ghost Replay System](#13-ghost-replay-system)
14. [Store / Economy](#14-store--economy)
15. [Daily Rewards](#15-daily-rewards)
16. [Share System](#16-share-system)
17. [Save System](#17-save-system)
18. [Settings](#18-settings)
19. [Audio & Music](#19-audio--music)
20. [PWA & Offline](#20-pwa--offline)
21. [Telemetry & Metrics](#21-telemetry--metrics)

---

## 1. Core Gameplay

### Movement
- **Left/Right**: Arrow keys, WASD, joystick, or on-screen arrow buttons.
- **Jump**: Space, Up arrow, W, or on-screen jump button.
- **Double Jump**: Tap jump again in mid-air. 3-second cooldown (shown as circular indicator).
- **Air Dash**: After double jump, tap jump again for horizontal burst (requires Air Dash skill).
- **Coyote Time**: Brief window after running off a ledge where jump still works. Doubled with Coyote Boost skill.
- **Jump Buffer**: Press jump a few frames before landing — it registers on landing.

### Physics (frame-rate independent)
- `dt` computed from `performance.now()`, normalized to 1.0 at 60fps.
- Gravity, friction, velocity all multiply by `dt`.
- Per-stage gravity: 0.5 (low) to 0.7 (heavy).
- Per-stage friction: 0.75 (slippery) to 0.92 (grippy).
- Per-stage jump strength: -11 (weak) to -15 (strong).

### Player State
- `player` object: `{x, y, w:22, h:48, vx, vy, og (onGround), face, at (animTick), dead, won, djU (doubleJumpUsed), djCD, djMax:180}`
- Cape physics: `capeAng`, `capeVel` — trails behind player, reacts to movement.
- Player trail (`pTrail`): recent positions for cosmetic trail rendering.

### Score Formula
```
runScore = distance/10 + (runGold * 50) + (earnedSilver * 10)
           + (stylePoints * 5) - (deaths * 10)
           + max(0, floor(300 - runTime/1000))
```

### Style Points
- **Combo**: Collect gems in quick succession → x2, x3, x4 multiplier.
- **Edge Landing**: Land on platform edge → "EDGE!" + 1 style point.
- **Close Call**: Near-miss spike/laser → "CLOSE!" + 1 style point.

---

## 2. Platform Types

| Type | Code | Behavior |
|------|------|----------|
| **Static** | `t:'s'` | Fixed position. Most common. |
| **Moving** | `t:'m'` | Oscillates horizontally (`ox + sin(t)*amp`). Spawn count controlled by `lv.move`. |
| **Pulse** | `pulse:true` | Cycles: visible (4s) → warning flicker (1s) → invisible (2s). Only on Moderate (~12%) and Hard (~22%) stages. |
| **Bouncy** | `t:'b'` | Launch player 1.5× higher, resets double jump. Spring-coil visual. |
| **Finish** | `t:'f'` | Green flag platform at end of stage. Touching it wins the level. |

### Ziplines
- Spawn between platforms on stages with `lv.move >= 2`.
- Auto-slide player forward. Press jump to hop off early.
- Positioned above platform gaps.

---

## 3. Hazards

| Hazard | Death Message | Behavior |
|--------|---------------|----------|
| **Void (fall)** | "FALLEN" | Fall below `fallLimitY` (platform max Y + 260). |
| **Spikes** | "SPIKED!" | Triangular obstacles on platforms. 25% spawn rate (i>3, i<cnt-2). |
| **Lasers** | "LASERED!" | Vertical beams with timed on/off cycle (`on:100, off:80`). 15% spawn rate. |
| **Lightning** | "⚡ STRUCK!" | Storm weather only. Random strikes after 15–25s interval. |

---

## 4. Collectibles

### Gold Gems (★)
- Platform-top gems. One every 3rd platform (i%3===0).
- Limited per stage (counted by `goldChipOrdinal`).
- First collection per stage = +1 to `bestChips[]` (permanent).
- Worth +50 score each.

### Silver Arc Gems (♦)
- Arc between platforms (3 gems per arc at gap > 80px).
- Re-collectable every run.
- Worth +1 silver (×1.5 for champions) and +5 score.
- Guide optimal jump path.

### Master Gems (★★)
- **Champions only.** Hidden rainbow gems above platforms.
- 1 per Starter/Simple, 2 per Moderate, 3 per Hard stage (40 total).
- Worth +2 gold each. Tracked separately via `masterGems` in level stats.

### Daily Master Chip (💎)
- Rotates daily to one unlocked stage.
- Champions: +5 gold. Non-champions: +5 silver.
- One per calendar day. Resets at midnight local time.

---

## 5. Skills

Skills are **permanent** purchases (★ gold). Max **3 equipped slots**.

| Skill | ID | Cost | Icon | Effect |
|-------|-----|------|------|--------|
| **Air Dash** | `airdash` | 18g | 💨 | After double jump, tap jump for horizontal burst. Resets on landing. |
| **Clipping** | `phasedash` | 22g | 🌀 | Once per run, ignore first hazard hit. 0.75s invuln. Falls still kill. |
| **Auto Resurrect** | `resurrect` | 22g | ❤️ | On death, respawn at last platform. 2min real-time cooldown. |
| **Coyote Boost** | `coyote` | 10g | 🐾 | Doubles coyote time (ledge-jump forgiveness). |
| **Magnet** | `magnet` | 20g | 🧲 | Auto-pulls nearby gems (silver + gold). Range ~100px. |
| **Platform Bounce** | `wallslide` | 22g | 🪝 | Hit platform side → bounce away with upward velocity. Resets double jump + air dash. |
| **Slow Fall** | `slowfall` | 30g | 🪶 | Hold jump while falling → halve downward velocity. Most expensive. |

### Free Skills (no slot cost)
| Skill | Unlock Condition | Effect |
|-------|-----------------|--------|
| **Ghost Rival** | Clear Stage 1 & 2 | Records best run, races alongside you. Toggle visibility. |
| **Reflex Dash** | Champion (all 20 cleared) | Dash even when double-jump on cooldown. Includes full Air Dash effect. Toggleable in store. |

### Skill Interactions
- Equipping Air Dash → Reflex Dash auto-disables (redundant).
- Selling Air Dash → Reflex Dash auto-disables.
- Manually enabling Reflex Dash → unequips Air Dash (mutual exclusion).

---

## 6. Consumables

Consumables are **single-run** items (♦ silver). Bought from store, stored in inventory.

| Item | ID | Cost | Icon | Effect |
|------|-----|------|------|--------|
| **Triple Jump** | `triplejump` | 10♦ | ⬆️ | 3rd jump mid-air. 15s cooldown. |
| **Double Shield** | `dblshield` | 15♦ | 🛡️ | Absorbs 2 hits. 0.33s grace after each hit. |
| **Time Freeze** | `timefreeze` | 12♦ | ⏸ | Freezes lasers + moving platforms for 10s. 60s cooldown. Tap ⏸ button. |
| **Name Change** | `namechange` | 50♦ | ✏️ | Change player name (5–10 chars). Instant, not stored as item. |

### Consumable Rules
- Persist across retries within same stage session.
- Only consumed from inventory if **actually used** this run.
- Only **WIN or EXIT TO STAGE SELECTION** finalizes consumption.
- Buying mid-run activates immediately if none active.

---

## 7. Cosmetics

Cosmetics are **permanent** purchases (♦ silver). Equipped per category.

### Categories
| Category | Slot | Examples |
|----------|------|----------|
| **Hat** | `hat` | Crown, Horns, Halo |
| **Cape** | `cape` | Fire, Ice, Shadow |
| **Glow** | `glow` | Gold, Pink, Rainbow, Champion's Aura |
| **Trail** | `trail` | Cyan, Fire, Ice, Rainbow, Glitch |
| **Body** | `body` | Black |
| **Death** | `death` | Pixelate, Dissolve, Supernova, N3ON Logo |
| **Jump** | `jump` | Sparks, Lightning |
| **Platform** | `platform` | Hologram |

### Tiers
| Tier | Visual Indicator | Cost Range |
|------|-----------------|------------|
| Common | — | 30–50 ♦ |
| Uncommon | — | 80–150 ♦ |
| Rare | — | 250–400 ♦ |
| Legendary | — | 800–1000 ♦ |
| Master | ★ | Free (champion unlock) |

### Special Cosmetics
- **Champion's Aura** (`glow_champion`): Gold pulsing halo + ascending sparks. Auto-unlocked on champion. Auto-equipped.
- **Black Body** (`body_black`): Suppresses default theme glow halo for true black look.

---

## 8. Weather System

Per-stage weather affects visuals and (indirectly) gameplay feel:

| Weather | Visual | Gameplay Effect |
|---------|--------|-----------------|
| **Clear** | None | Normal |
| **Rain** | Blue streaks | Friction reduced (slippery) |
| **Snow** | White particles | Friction increased (grippy) |
| **Storm** | Rain + lightning flashes + random strikes | Slippery + lightning hazard |
| **Dust** | Brown particles | Friction reduced |

- Weather particle count scales with visual quality setting.
- Lightning in storm: random strike every 15–25s, kills player.

---

## 9. Day/Night Cycle

- 1 minute day + 1 minute night, random per-stage start offset.
- Sun/moon overlay rendered on canvas.
- Stars only visible at night (and only on star-themed stages).
- Atmospheric overlays per stage: embers, bubbles, fog, shooting stars, aurora ribbons, matrix code, glitch artifacts, wisps, window lights.

---

## 10. Backgrounds & Themes

20 unique themes, each with:
- Sky gradient (`skyT`, `skyM`, `skyB`)
- Grid color (`grid`)
- Building color (`build`)
- Accent color (`acc`)
- Particle color (`part`)
- Background shape type (`bg`): city, spire, mirror, star, ocean, aurora, magma, swamp, bio, void, obsidian, sun, rust, dust, storm, glitch, ice, ghost, terminal

| # | Name | Difficulty | Weather | BG |
|---|------|-----------|---------|-----|
| 1 | Neon Abyss | STARTER | clear | city |
| 2 | Cyber Rain | STARTER | rain | city |
| 3 | Crystal Spire | SIMPLE | snow | spire |
| 4 | Magma Core | SIMPLE | clear | magma |
| 5 | Toxic Swamp | SIMPLE | rain | swamp |
| 6 | Void Walker | SIMPLE | clear | void |
| 7 | Solar Flare | MODERATE | clear | sun |
| 8 | Deep Ocean | MODERATE | rain | ocean |
| 9 | Voltage | MODERATE | storm | storm |
| 10 | Rust Belt | MODERATE | dust | rust |
| 11 | Frost Byte | MODERATE | snow | ice |
| 12 | Aurora Veil | MODERATE | snow | aurora |
| 13 | Bio Lab | MODERATE | rain | bio |
| 14 | Dust Storm | MODERATE | dust | dust |
| 15 | Mirror City | HARD | clear | mirror |
| 16 | Glitch Zone | HARD | storm | glitch |
| 17 | Starlight | HARD | clear | star |
| 18 | Ghost Line | HARD | clear | ghost |
| 19 | Obsidian | HARD | clear | obsidian |
| 20 | Terminal | HARD | clear | terminal |

---

## 11. Champion / Master System

**Condition:** Clear all 20 stages.

### Rewards
1. **★ MASTER badge** — prefixed to player name everywhere.
2. **Champion's Aura** — gold pulsing halo + ascending sparks (glow cosmetic).
3. **Clipping skill** — free, equips a slot. Once per run, ignore one hazard.
4. **Reflex Dash** — free, no slot. Dash even when double-jump on cooldown.
5. **1.5× Silver Multiplier** — all silver gem pickups give 1.5× (rounded).
6. **Master Gems** — 40 hidden rainbow gems visible only to champions (+2 gold each).
7. **Daily Master +5 Gold** — daily chip gives champions +5 gold instead of +5 silver.

### Ceremony
- End-of-game confetti animation (70 DOM particles).
- Dedicated gold-themed share card.
- Career stats display.
- Backfill: existing all-clear players get ceremony + rewards on next boot.

---

## 12. Player Rank System

### Rank Tiers
| Rank | Min Score | Color |
|------|-----------|-------|
| Newbie | 0 | #888 |
| Runner | 200 | #0f8 |
| Jumper | 500 | #0ff |
| Dasher | 1000 | #08f |
| Pro | 2000 | #a0f |
| Elite | 3500 | #f0f |
| Legend | 5000 | #ffd700 |
| Neon God | 7500 | #ff8c00 |

### Score Formula
```
score = (totalGold * 50) + (silverWallet * 5) + (clearPct * 10) + (globalData.matches * 2)
```

### UI
- Rank chip next to player name on stage select.
- Click → popup with tier list + progress bar + "how to earn points" breakdown.

---

## 13. Ghost Replay System

### Recording
- Captures every frame: `{x, y, face, at, djU}`.
- Only saves on win with **new best time** OR first recording.
- Stored in `ghostData[lvl]` (localStorage).

### Playback (Ghost Rival)
- Translucent stickman runs alongside player.
- Uses same run/in-air poses as player.
- Freezes during pause.
- Toggle visibility with 👻 button.

### Watch Replay
- Plays ghost data without player input.
- No controls, no scoring, no analytics.
- Auto-ends → returns to stage select.

### Settings
- Can disable globally in Settings for performance.
- Disabling clears `ghostData` display but keeps saved data.

---

## 14. Store / Economy

### Currencies
| Currency | Source | Spent On |
|----------|--------|----------|
| **Gold** (★) | Gold gems (first collect), Master gems (+2), Daily Master (+5), Daily Chest (30% chance) | Skills |
| **Silver** (♦) | Silver arc gems (re-collectable), Daily Chest (70% chance), Daily Master (non-champion) | Cosmetics, Consumables |

### Gold Balance
```
getGoldBalance() = bonusGold + totalGoldChipsCollected - goldSpent
```
- `bonusGold`: accumulated from master gems + daily champion bonus.
- `goldSpent`: net gold spent on skills (refunds subtract).

### Store Tabs
1. **Consumables** — Triple Jump, Double Shield, Time Freeze, Name Change.
2. **Cosmetics** — 8 categories, sorted by category → tier → cost.
3. **Skills** — 7 purchasable + Ghost Rival (free) + Reflex Dash (champion).

---

## 15. Daily Rewards

### Daily Chest
- Once per 24 hours.
- 30% chance: 2–5 ★ gold.
- 70% chance: 15–40 ♦ silver.
- 15% chance: +1 consumable (Triple Jump or Double Shield).

### Daily Master Chip
- Deterministic daily stage based on calendar date + player ID hash.
- Picks from **unlocked** stages only.
- 💎 diamond chip spawns mid-stage.
- Champions: +5 gold. Others: +5 silver.

---

## 16. Share System

### Stage Clear Share
- Canvas-generated 600×400 PNG with character portrait + stats + branding.
- Custom message textarea.
- Uses Web Share API with file attachment.
- Fallback: clipboard copy + PNG download.

### Champion Share
- Canvas-generated 600×380 gold-themed PNG with career stats.
- Same share pipeline.

---

## 17. Save System

### Storage
- `localStorage` with XOR encryption (`_sk='n3j8x2qf'`).
- Prefix: `ndj_*`.
- Keys: `v2`, `playerId`, `playerName`, `ctrl`, `ctrlPicked`, `tutorialDone`, `lastPlayed`, `unlocked`, `stats`, `times`, `scores`, `chips`, `ghostData`, `goldSpent`, `bonusGold`, `ownedSkills`, `equippedSkills`, `ownedCosmetics`, `equippedCosmetics`, `consumableInv`, `silver`, `lastChest`, `dailyMaster`, `championStatus`, `reflexDashEnabled`, `hintsSeen`, `globalData`, `settings`, `joySettings`, `btnSettings`, `layout_*`.

### Migration
- `GAME_VERSION` integer in code.
- Reject saves where `parsed.v > GAME_VERSION`.
- Migrate older formats explicitly (e.g., `bestChips` integer→boolean-array packing).
- Auto-migrations run on load for: reflex dash refund, shield/timefreeze removal, ghost rival refund.

### Export / Import
- Export: JSON blob with hash checksum. Optional ghost data inclusion.
- Import: file picker or paste. Verify hash. Migrate. Reload page.

---

## 18. Settings

### Stage-Select Settings
- SFX on/off
- Music on/off
- Particles (High/Med/Low/Off)
- Visual Quality (High/Med/Low) — affects atmosphere + auto-disables ghost on Low
- Show FPS
- Ghost Replay toggle
- Export/Import Save
- Reset Progress
- Restart (page reload for SW update)

### In-Game Pause Settings
- Visual Quality picker
- Show FPS toggle
- Orientation (Landscape/Portrait)
- Vibration on/off
- Controls (Arrow Buttons / Joystick)
- Auto-retry on death (No auto / Instant / 0.5s / 1s / 2s)
- ⊞ Adjust Layout (drag positions)
- Quick Shop (buy consumables mid-run)

### Per-Orientation Layouts
- Joystick size, X/Y position saved separately for portrait vs landscape.
- Arrow button size/position also saved separately.
- Swaps automatically on rotation.

---

## 19. Audio & Music

### SFX (Web Audio API)
| Event | Sound |
|-------|-------|
| Jump | Square wave 440→880Hz, 150ms |
| Land | Sine 200→50Hz, 100ms |
| Die | Sawtooth 100→20Hz, 500ms |
| Win | Square arpeggio 523→659→784Hz, 400ms |
| Coin | Sine 1000→1800Hz, 150ms |

### Vibration
- Jump: 15ms
- Double jump: 10ms
- Gold coin: 20ms
- Silver coin: 10ms
- Death: [30, 30, 60]
- Win: [50, 50, 50, 50, 100]

### Music
- 5 scales × 5 tempos × 5 synth types.
- Level music: `SCALES[curLvl % 5]`, `TEMPOS[curLvl % 5]`, `SYNTHS[curLvl % 5]`.
- Menu music: ambient sine scale, slower tempo.
- Kick drum on every 4th beat during gameplay.
- Probabilistic note skipping for variation.

---

## 20. PWA & Offline

### Manifest
- `manifest.webmanifest`: standalone display, landscape orientation.
- Icons: SVG + PNG 192/512 + maskable.

### Service Worker
- `sw.js`: caches shell + assets.
- `CACHE_NAME` includes version (`n3ondashj-vX.Y.Z`).
- Update detection: new SW → "Update available!" banner → user refreshes.

### Install
- `beforeinstallprompt` captured → "INSTALL" button on boot screen.
- PWA installs to home screen, plays offline after first load.

---

## 21. Telemetry & Metrics

### Event Types
- `session_start` — deferred until name set
- `heartbeat` — every 90s
- `level_start` — level begins
- `level_complete` — level finished (server-validated time)
- `level_death` — player died
- `purchase` — store transaction
- `ui_event` — button clicks
- `name_set` — name chosen/changed

### Client-Side
- `playerId` persisted in localStorage (`p_` + random + timestamp).
- Session token from `/session` endpoint (1h TTL).
- HMAC-SHA256 signing with token.
- Offline queue (`ndj_mq`) flushed on `online` event.

### Server-Side (Cloudflare Worker)
- D1 SQLite: `sessions`, `events`, `players` tables.
- Anti-cheat: time validation, HMAC verification.
- Dashboard: password-protected (`/dashboard`), cookie auth.

---

## Feature Change Log

| Date | Change |
|------|--------|
| 2026-05-16 | Added FEATURES.md with complete catalog of all game systems |
