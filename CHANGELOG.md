# Changelog

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
