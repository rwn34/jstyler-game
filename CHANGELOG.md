# Changelog

## v1.2.1 — May 7, 2026

### Added
- Real PWA assets for N30N DASH J: `manifest.webmanifest`, `sw.js`, and `icon.svg` for installable offline play after first online load.

### Changed
- Hardened save loading/import normalization and migrated per-level `falls` stats to clearer `hazards`.
- Clamped analog and arrow touch controls so large pad settings stay inside small landscape viewports.
- Made settings overlays scroll-safe on short screens.
- Updated the Controls option label to "Arrow Buttons".

### Removed
- Dead orientation-lock UI/state and unused overlay action/state counters.

## v1.2.0 — May 7, 2026

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

## v1.1.0 — May 6, 2026

### Added
- Root `index.html` portal template with `<!-- ZIPGAME_GAMES -->` placeholder.
- `zipgame` custom command in PROJECT.md.

### Changed
- Project restructured: `index.html` + `ne3ondashj/` → `src/index.html` + `src/n3ondashj.html`.

## v1.0.1 — May 5, 2026

- Initial game: N30N DASH J (single-file platformer, 20 themed levels).
