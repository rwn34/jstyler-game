# Changelog

## v1.2.0 — May 18, 2026 — Daily Stage, Collection, Share Cards & More

### Added
- **Daily Stage** — fresh procedurally-generated stage every day (5 AM UTC+7 reset). Mix-and-match themes, reversed difficulty, rank-scaled
- **Daily Stage Collection** — completed dailies become collectible badges (date, time, rank). Replay any past daily for practice — exact same stage, no gems, no deaths tracked
- **Streak System** — Duolingo-style week-grid calendar, 2 free Streak Freezes at start, buy extras for 15 ♦
- **Share Cards** — stage-themed visual cards for menu share, win screen, champion screen, and daily. Competitive "Can you beat this?" text
- **Daily preview panel** — see difficulty, streak, and best time before playing
- **Daily rewards** — random roll on completion (gold, silver, consumables, streak freeze)
- **75 random tips** in non-blocking top bar
- **Dashboard "🔥 Daily" tab** — analytics for daily stage attempts, completions, death causes
- Security hardening: rate limiting, server-side validation, CORS restrictions, security headers

### Changed
- Master gems increased in normal stages (2/3/4 for Easy/Moderate/Hard), removed from daily stages
- Daily stages only have persistent silver gems (collected ones don't respawn on retry)
- Streak calendar: horizontal strip → CSS week grid
- Streak Freeze price: 10 ♦ → 15 ♦
- Share cards no longer show death count or attempt count

## v1.1.49 — May 18, 2026 — Daily Stage Collection

### Added
- **Daily Stage Collection** — every completed daily stage is saved as a collectible badge with date, time, and rank index
- **Replay past daily stages** — each collected badge has a replay button that recreates the exact same procedural stage (same seed + rank). Replay mode has:
  - No gems (no gold, no silver, no master gems)
  - No death tracking in stats
  - No ghost recording
  - No rewards or streak updates
  - Simple "✓ Replay Complete" overlay with time
- Collection list rendered on the daily win screen, sorted by date descending (newest first)
- Date formatted as "26May23" style in the collection list

### Changed
- `generateDailyLevel()` now accepts optional `dateKey` and `forcedRankIdx` parameters for replay generation
- `goHome()` now resets `isDailyReplay` flag

## v1.1.46 — May 18, 2026 — Free Streak Freezes

### Added
- **All players receive 2 free Streak Freezes** — one-time migration bumps existing players with fewer than 2 up to the max

## v1.1.43 — May 18, 2026 — Daily Stage Gems + Calendar Grid

### Added
- **Daily stage silver gem persistence** — collected silver gems in daily stages are saved per-day and don't respawn on retry
- Week-based streak calendar grid layout (7 columns × 4 rows + 3 days)

### Changed
- **Daily stages no longer spawn gold gems** — removes excessive gold income from daily farming
- **Daily stages no longer spawn master gems** — master gems are normal-stage only
- **Master gem count increased** in normal stages: Easy 1→2, Moderate 2→3, Hard 3→4
- **Streak Freeze price**: 10 ♦ → 15 ♦ (buying both default slots costs 30 ♦)
- Streak calendar: horizontal strip → CSS grid with week day headers (M T W T F S S)

## v1.1.41 — May 18, 2026 — Share Stats Cleanup

### Changed
- All share cards no longer display **death count** or **attempt/match count**
- Rank remains visible on all share cards (menu, win, champion, daily)
- Share text templates updated to remove deaths/attempts references

## v1.1.40 — May 18, 2026 — Result Share Redesign

### Added
- **In-game result shares** now generate visual cards for all three result types:
  - **Win screen** (`shareResult`): 400px canvas with stage theme, "💥 CAN YOU BEAT THIS? 💥" challenge text, best score, attempts, larger character
  - **Champion screen** (`shareChampionResult`): 400px gold canvas with "💥 CAN YOU MATCH THIS? 💥" challenge text, larger character
  - **Daily stage** (`shareDailyResult`): now generates an image card (was text-only) using the daily's mixed theme, streak, reward, and "💥 CAN YOU BEAT TODAY? 💥" text
- All result share text messages now include competitive hooks ("Think you can beat my time?")

### Changed
- `shareResult` canvas height 340 → 400px for consistent layout with menu share card
- `shareChampionResult` canvas height 380 → 400px, character scale 1.8 → 2.4

## v1.1.39 — May 18, 2026 — Share Card Redesign

### Added
- **Stage-specific share cards** — the SHARE button on stage select now generates a visual card themed to the currently selected stage
  - Background gradient uses the stage's sky colors (top/mid/bottom)
  - Grid overlay in the stage's grid color
  - Stage name in accent color, player name + rank, best time, score, deaths, style, attempts
  - Character rendered with all equipped cosmetics
  - "💥 CAN YOU BEAT THIS? 💥" challenge text
  - Share text template now includes stage name, best time, score, and competitive hook

### Changed
- Default share textarea message: "Think you can beat my time? 💥" (was "Hey! Try this game with me — it's wild.")

## v1.1.33 — May 18, 2026 — Overlay & Timer Fixes

### Fixed
- Missing `#dailyPreview` and `#streakCalendar` HTML in `index.html` causing blank overlays
- Daily chest timer now uses UTC+7 day boundaries (5 AM cutoff) instead of raw 24h diff
- Removed old "daily master chip" mechanic from normal stages — daily gem lives exclusively in daily stage (`lvl === -1`)

## v1.1.30–v1.1.32 — May 17–18, 2026 — Syntax Fixes

### Fixed
- Brace duplication (`}},10);`) from module boundary corruption when `00-pwa.js` was reconstructed

## v1.1.29 — May 17, 2026 — Build Script

### Changed
- `zipgame.ps1` now outputs `deploy/latest/` unzipped folder for instant local testing

## v1.1.28 — May 17, 2026 — QoL Polish

### Added
- Chest countdown timer on stage select (hours until next UTC+7 5 AM reset)
- 75 random tips in non-blocking top bar (`#npcAdvice`) on stage select

### Changed
- Pause/exit tooltip auto-hides after 20 matches
- TIPS array expanded to 75 entries

## v1.1.27 — May 17, 2026 — Streak Calendar + Daily Preview

### Added
- **Streak calendar overlay** (`#streakCalendar`) — 31-day Duolingo-style strip showing play days, streak count, freeze inventory
- Streak freeze purchasable from calendar (10♦, max 2)
- **Daily preview panel** (`#dailyPreview`) — shows difficulty, streak, best time, PLAY/CLOSE buttons

## v1.1.26 — May 17, 2026 — Boot Crash Fix

### Fixed
- Missing `updateLsDailyBtn()` was aborting `initLevelSelect()`, breaking portrait animation, thumbnail init, dot nav, and achievement rendering
- Changelog overlay now has sticky close button
- Daily stage launch flow properly hides level select

## v1.1.25 — May 17, 2026 — Dashboard Analytics

### Added
- Worker `/stats/dailystage` endpoint with 11 SQL queries for daily stage analytics
- Dashboard **🔥 Daily** tab: attempts, unique players, completions, completion rate, deaths, avg time, best time, death causes chart, difficulty table, daily trend

## v1.1.22 — May 17, 2026 — Daily Stage + Streak System

### Added
- **Daily Stage** — a procedurally generated stage every day, same for everyone at the same rank
  - Mix-and-match theme system: sky from one theme, grid/particles from another, physics/weather from a third
  - Inverted sky gradient + reversed difficulty curve (hard start, easier finish)
  - 7 base templates × 20 themes × 6 rank modifiers = effectively infinite variety
  - UTC+7 reset at 5 AM
- **Streak system** — Duolingo-style daily streak, updated when playing any mode
  - 2 streak freeze slots by default (protects against missed days)
  - Streak Freeze buyable from store for 10 silver (max 2)
- **Daily gem** moved from normal stages to the daily stage
- **Daily completion rewards** — random roll: gold, silver, consumables, or streak freeze
- **Daily share** — share your daily completion time and streak to friends
- **Fire indicator** on stage select: dim = streak alive but not played today, bright = played

### Changed
- No ghost rival recording on daily stages (fair competition)
- Gems collected during daily stage are kept even on death

## v1.1.21 — May 16, 2026 — Security Hardening

### Security
- Metrics worker: server-side name validation (`NAME_REGEX`) prevents XSS via crafted API requests
- Metrics worker: per-IP (600/5min) and per-player-ID (300/5min) rate limiting on ingestion endpoints
- Metrics worker: auth changed from fail-open to fail-closed (no `DASHBOARD_KEY` = no access)
- Metrics worker: dashboard `Cache-Control` changed from `public, max-age=300` to `no-store`
- Metrics worker: CORS `*` restricted to public ingestion endpoints only (`/session`, `/event`, `/events/batch`)
- Metrics worker: security headers added (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- Metrics worker: raw user agent stripped from player profile API response
- Dashboard: HTML-escape function added; all player name renders now escaped before `innerHTML`
- Game: save import error display now escapes `<` and `>` before `innerHTML`
- Game: name input value attribute now escapes quotes (defense in depth)
- Cloudflare Pages: `_headers` file adds security headers to static assets

### Added
- In-game Privacy Policy accessible from Settings panel

## v1.1.1 — May 13, 2026

### Changed
- Game name: **N3on DashJ** (was N30N DASH J) — applied to title, boot screen, HUD title, share text, share images
- Stage select play button: "Play DashJ" (was "ENTER DASH J")
- Pause exit button: "BACK TO STAGE SELECTION" (was "EXIT TO HOME")
- Top stage-select buttons reordered: 🛒 STORE / 🎁 daily chest / ↗ share / ⚙ settings (left to right). The 🎁/share/settings cluster now anchored on the right edge as requested.
- Store cosmetics now sorted by category: hat → cape → glow → trail → body → death → jump → platform; within category by tier (common → master) then cost
- Player Rank popup now uses two columns in landscape: rank tiers + progress on left, how to earn points on right
- "Body: White" replaced with **"Body: Black"** — existing owners auto-migrated. Adds real contrast since the default body is already light cyan
- Removed `[YYYYMMDD]` date prefixes from in-game changelog entries (kept only on v1.0.0). Detailed dated history lives here in `CHANGELOG.md`
- Compact pause-settings spacing: tighter gaps, smaller fonts, action buttons (Apply | Exit) horizontal in landscape — fits short screens without scrolling
- Removed the orange "DAILY CHEST READY" banner from stage select (the pulsing 🎁 icon is enough)
- Stage card simplified ghost status to icon-only "👻 🚫" when no recording (was "🚫 no ghost yet (replay to record)")
- Orientation setting "Auto (No Lock)" removed. Default Landscape. Existing "Auto" setting auto-migrated to Landscape on next launch
- Orientation setting now also available in main Settings panel (was only in pause)

### Added
- "Show FPS" toggle added to in-game pause Settings (was only in main settings)
- Keyboard hint: when desktop/laptop with mouse detected, the home tooltip shows extra line "⌨ ← → move • SPACE jump • ESC pause"
- First-two-stages double-jump hint via existing NPC advice banner: "TIP: Tap jump twice in mid-air for a double-jump (3-second cooldown)"

### Fixed
- Settings & pause panels appearing as locked overlay when rotating phone — CSS grid was being applied without `.active` class check
- Share dialog showing duplicate URL on apps like WhatsApp (URL was both in `text` and `url` fields)
- Encoding issues from previous build (mojibake/double-encoded UTF-8) restored

## v1.1.0 — May 13, 2026 — Master Update

### Added
- ★ Champion of N3on system: clearing all 20 stages unlocks the **★ MASTER** badge (next to player name), **Champion's Aura** cosmetic (gold pulsing halo + ascending sparks), **Phase Dash** skill (one free hazard pass per run), and a permanent **1.5× silver multiplier**. Includes end-of-game ceremony with confetti and a dedicated gold-themed share card
- 🌀 Pulse Platforms: new mechanic on Moderate and Hard tiers — platforms cycle through visible (4s) → warning flicker (0.5s) → invisible (2s)
- 🎬 Replay system: every run records a ghost; "👻 ghost ready ▶" inline link on stage select, **WATCH** button on the win screen
- 💎 Gem escrow: collected gems persist across deaths/retries within the same stage session. Wallet credit only on completion. Exit-to-home loses all uncashed gems (anti-fraud)
- 🔄 UPDATED tag on stage cards when stage gameplay content changes — preserves achievement
- 🎨 Visual Quality setting (Low/Med/High), live FPS counter, auto-recommend lower quality on sustained low FPS
- 👻 Ghost Replay toggle (disable ghost feature entirely for performance)
- 📐 Mobile landscape redesign: stage select two-column layout, store two-column grid, settings/pause panels two-column, top buttons compacted
- 🎁 Daily Chest moved from store to stage select with pulsing icon button
- ⭐ Player rank chip moved next to player name (with click-to-popup)
- 🛒 Store labeled pill button (was "★" icon)
- 📁 Save export → file download, save import → file picker (paste fallback retained); optional ghost-data inclusion in export
- 🌌 NPC advice on fresh stage entry (high gravity / low gravity / slippery / storm / dust)
- 🎮 Per-orientation control layouts (joystick/button positions saved separately for portrait vs landscape, swap on rotation)
- 🦸 Cape physics: trails down on jump, up on falling
- 📤 Personalized share dialog: textarea for custom message + auto-template preview

### Changed
- Default control scheme: **Arrow Buttons** (was Joystick); switch in settings anytime
- Onboarding picker now shows BUTTONS first as recommended

### Fixed
- Void Walker white-screen bug (3-character hex `#000` caused gradient NaN crash)
- Home button leak to game (pointer-events on level select disabled briefly after `goHome()` to block touch→click double-fire)
- Replay no longer counts as game completion or attempt
- Cosmetic store preview overhaul (body color now actually applies; hat/cape positioning matches in-game)
- `normalizeLevelStat` was stripping `contentVersion` (UPDATED tag wasn't appearing)
- HUD chip count was showing 0 on retry instead of preserved gem count
- Champion ceremony share previously showed "Neon Abyss" — now uses dedicated Master share card
- Edge-landing effect simplified to text only (no particle ring)

## v1.0.25 — May 10, 2026

### Changed
- Versioning scheme renamed: `x.y.0` → `x.0.y` (e.g. `v1.24.0` → `v1.0.24`)
- HUD now shows human-readable physics (LOW G • SLIPPERY • RAIN) instead of raw G/S values
- Pause-menu shop activates consumables immediately in current run if not already in use

### Fixed
- Fixed [i] info icon in store not displaying (modal `display:none` override bug)
- Fixed home button needing two taps to exit after death (z-index overlap)

## v1.0.2 (patch) — May 7, 2026

### Added
- Real PWA assets for N30N DASH J: `manifest.webmanifest`, `sw.js`, and `icon.svg` for installable offline play after first online load.

### Changed
- Hardened save loading/import normalization and migrated per-level `falls` stats to clearer `hazards`.
- Clamped analog and arrow touch controls so large pad settings stay inside small landscape viewports.
- Made settings overlays scroll-safe on short screens.
- Updated the Controls option label to "Arrow Buttons".

### Removed
- Dead orientation-lock UI/state and unused overlay action/state counters.

## v1.0.2 — May 7, 2026

### Added
- **Arrow button controls** — New "Controls" setting: Analog (joystick) or Arrow Buttons (left/right grouped on left, jump on right)
- **Vibration feedback** — `vib()` helper added to SFX; vibrates on jump (15ms), double jump (10ms), gold coin (20ms), silver coin (10ms), death [30,30,60], win [50,50,50,50,100]. Toggleable in Controls.
- **In-game Controls panel** (`#gameSettings`) — Fullscreen, Vibrate, Controls mode, Joy Size/X/Y. Opens on pause. Apply & Resume buttons.
- **Stage Select Settings panel** (`#settings`) — SFX, Music, Particles, Export/Import, Reset. No controls here.
- **Canvas thumbnails on portal** — Root index.html renders mini game previews using theme colors (sky gradient, grid, platforms, player dot, particles).
- **Auto-detect game folders** — `zipgame` now scans `src/` for game HTML files, creates proper directory structure in zip.
- **Delta time physics** — `loop()` uses `performance.now()` to calculate `dt` (1.0 at 60fps). All velocity, gravity, friction, cooldowns, particles multiply by `dt`. Game speed now frame-rate independent.
- **Death cause differentiation** — `lastDeathType` tracked; showDie shows "FALLEN" (#f05), "SPIKED!" (#f80), or "LASERED!" (#f00).
- **Unlock notification on win** — showWin lists newly unlocked sector names with 🔓 icon.
- **First-time tutorial** — One-time overlay on first launch explaining controls, double jump, goal, gems. Stores `tutorialDone` flag.
- **Difficulty badge styling** — `.diff-easy` (#0f8), `.diff-med` (#fa0), `.diff-hard` (#f05) with colored text and border.
- **50 updated tips** — Rewritten to cover arrow controls, vibration, pad mirroring, fullscreen toggle, export/import, frame-rate independence, player rank.

### Changed
- **Auto-fullscreen default** — Changed from `'off'` to `'on'`.
- **Joy Pad X/Y mirrors both sides** — `applyJoySettings()` now sets `jBtn` right/bottom and `arrowControls` padding/bottom to mirror left-side joystick position.
- **Carousel cards halved** — `carouselWrap` 400→220px, active card 640→320px / 360→180px tall, inactive 140→70px, gaps 20→10px.
- **Portal links** — `a.href = '/' + g.id + '/'` for Cloudflare Pages directory routing.
- **Keyboard input always works** — `joy.dx` checked first regardless of ctrlMode, then arrow touch overrides if pressed.
- **Camera smoothing** — `camX += (tcx-camX) * (1-Math.pow(0.92,dt))` for frame-rate independence.

### Removed
- **Orientation lock screen buttons** — "Force Fullscreen" and "Ignore" buttons removed from `#orientLock`.
- **`checkOrient()` body** — Now only sets `bootFinished=true` and calls `initLevelSelect()`. No orientation checking.
- **Duplicate code block (~255 lines)** — First definitions of `handleDeath`, `shatterPlayer`, `spawnP`, `draw`, `drawPlat`, `drawSpike`, `drawPlayerSprite` removed. Second (correct) versions kept.
- **Duplicate `loop()`** — Was defined twice, second shadowed first. Single dt-aware version remains.
- **Old `setOrient`, `setCtrl`, `setJSize`, `setPadX`, `setPadY`** — Removed from stage-select settings. Moved to in-game `#gameSettings`.
- **Old `updateSettingsDisplay` + event listeners** — Cleaned up (references removed elements).

### Fixed
- **Death flash frame-rate dependent** — `deathFlash -= 0.04*dt` instead of `-= 0.04`.
- **PowerShell array serialization** — `ConvertTo-Json` unwraps single-element arrays; manual `[]` wrapping added.
- **Zip file naming** — `index.built.html` → proper `index.html` via temp directory build.

## v1.0.1 — May 6, 2026

### Added
- Root `index.html` portal template with `<!-- ZIPGAME_GAMES -->` placeholder.
- `zipgame` custom command in PROJECT.md.

### Changed
- Project restructured: `index.html` + `ne3ondashj/` → `src/index.html` + `src/n3ondashj.html`.

## v1.0.0 — May 5, 2026

- Initial game: N30N DASH J (single-file platformer, 20 themed levels).
