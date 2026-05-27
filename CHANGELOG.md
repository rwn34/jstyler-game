# Changelog

## v1.2.63 — May 27, 2026

### Changed
- **Birthday year dropdown** now spans **1970 to the current year** (was 2000–2099). Updates automatically each year. Affects all year selectors: onboarding, profile birthday edit, name-change prompt, cloud sync register, link-device.

## v1.2.62 — May 27, 2026

### Added
- 🔐 **Recovery code system** — one-time modal after first cloud sync prompts you to save a 16-character recovery code. This is the only way to recover an account if you forget your PIN.
  - 5-second confirmation delay before "Continue" enables (so you actually save the code somewhere safe)
  - Copy-to-clipboard with execCommand fallback for older browsers
  - Stops prompting after 5 dismissals; manual re-trigger button always available in Settings → Cloud Save
- 🔄 **Forgot-PIN with recovery code** — enter username, birthday, new PIN, and your recovery code. Recovery code remains valid through PIN changes (only setting a new code invalidates the old one).
- 🛡️ **Settings → Cloud Save** indicator: "Recovery code: ✓ Set" / "✗ Not set (recommended)" with a button to set or replace the code.

### Changed
- **Device limit raised** from 3 to 5 per cloud sync account
- Every gameplay event now carries a unique ID (`event_uuid`) for server-side deduplication. Prevents double-counting of currency/completions when the network flakes during a retry.
- In-game changelog now shows all historical versions (limit raised from 15 to 100)

### Fixed
- **Multi-device recovery-code indicator** — the "Recovery code: ✓/✗" status now reflects authoritative server state, not just local browser storage. Fixes false-negative warning on freshly-linked devices.
- **Blank page bug** — `src\n3ondashj\index.html` had a leading `?` before `<!DOCTYPE html>` (introduced in v1.2.0), forcing browsers into quirks mode and causing a blank screen on some renderers. Removed the stray character.
- Mobile tables keep real column layout with horizontal scroll instead of card stacking
- Mojibake (garbled Unicode) caused by PowerShell encoding corruption — restored emojis, symbols, and special characters throughout the game UI

## v1.2.53 — May 26, 2026

### Added
- 🎂 **MMYY birthday pickers** — all MMYY inputs replaced with month + year dropdowns
  - Onboarding: name card now followed by birthday card (Month + Year, default Jan 2000)
  - Name-change prompt: inline month/year dropdowns below the name field
  - Profile panel: birthday displayed with **EDIT** button; inline dropdowns to change
  - Cloud Sync Register tab: text input replaced with month/year dropdowns
  - Cloud Sync Link Device tab: text input replaced with month/year dropdowns

### Changed
- **Link Device flow redesigned**:
  - Step 1: Enter username, birthday, PIN → click **Verify Credentials**
  - Step 2: Account preview shown with **Cancel** and **Continue to Link** buttons
  - Step 3: While linking, all unrelated fields hidden; only "Linking..." status shown
  - Old `linkDevice()` button removed; replaced by `confirmLinkDevice()` after verification
- `playerMmyy` changes in profile now trigger `queueSync()` to push to worker

### Fixed
- Build script `zipgame.ps1` — `$currentVersion` no longer overwritten by changelog parsing loop

## v1.2.52 — May 26, 2026

### Added
- 🎲 **Daily stage variety system** — daily stages now have much more day-to-day variety
  - 5 independent hash seeds (was 2) controlling platform count, gap range, height change, moving platforms, and layout type
  - Wider parameter ranges: platforms 18–35, height change 30–139, moving platforms 0–4
  - **7 layout types**: Rolling Hills (wave), Platform Clusters, Stair Steps, Sky Islands, Leap of Faith (wide gaps), Cliffhanger (vertical), Tightrope (dense)
  - ~25% chance for a "special layout" override (gaps/vertical/dense)
  - Layout type shown in daily stage preview UI

### Changed
- `generateDailyLevel()` now returns `layoutType` field consumed by `genLvl()` for geometry branching

## v1.2.51 — May 25, 2026

### Added
- 🔍 **Cloud Sync credential verification** — `/sync/check` endpoint returns account summary without side effects (no lockout, no data changes)
- **Link Device flow improvements**:
  - "Verify Credentials" button shows account preview (levels cleared, silver/gold, devices linked) before committing
  - Successful link shows "All data received!" panel with **Restart Game** button (reloads page)
- Cloud Sync UI moved from Settings panel to **Profile panel**

### Fixed
- Client error callback bug — forgot-PIN failure now shows actual error string instead of `[object Object]`
- Worker `handleSyncSave` globalData merge gap — server-side deep merge now correctly handles `globalData` keys

## v1.2.50 — May 25, 2026

### Added
- 🔑 Forgot PIN reset — registered users can reset their PIN from the **Manage** tab without needing the old PIN
  - Verifies identity via username + MMYY birthday stored locally
  - Clears all linked devices on reset
  - Rate limited to 3 attempts per minute per IP

### Fixed (Worker)
- `sync_lookup` table now properly maintained across all PIN-change paths
  - `handleSyncChangePin` — deletes old lookup row, inserts new one
  - `handleSyncForgotPin` — deletes old lookup row, inserts new one
  - `handleAdminSyncResetPin` — deletes old lookup row, inserts new one
  - Without this fix, forgot-PIN lookup would break after any PIN change
## v1.2.49 — May 25, 2026

### Added
- 🔗 Link Device entry points — added "Link device" hyperlinks in:
  - First-time onboarding modal (below the name input)
  - Name-change prompt overlay (below the input field)
  - Clicking opens Cloud Sync panel focused on the **Link Device** tab
  - Onboarding/overlay temporarily hidden while sync panel is open, restored on close
## v1.2.48 — May 26, 2026

### Fixed (Worker)
- **CRITICAL: Server-side deep merge bug** — `handleSyncSave` was using shallow spread `mergedData = { ...parsed, ...data }` which caused entire sub-objects (`scores`, `times`, `stats`, `chips`, etc.) to be overwritten when a device sent partial data. Now iterates ALL keys from BOTH cloud and incoming data, applying per-key rules (max/min/union/OR) so no data is lost across devices.
- **`deviceIds` now returned in load response** — `handleSyncLoad` includes `deviceIds` array so client can verify multi-device state.
- **Rate limiting added to PIN change** — `handleSyncChangePin` now has IP-based rate limiting (same window as save).

### Fixed (Client)
- **PWA banner dismissal not persisted** — `dismissPwaBanner()` saved `pwaBannerDismissed=true` but `showPwaInstallBanner()` never checked it, causing the banner to reappear every time the player returned to stage select.
- **PWA banner hidden on iOS** — The banner required `deferredPrompt` to be truthy, but iOS Safari never fires `beforeinstallprompt`. Removed the `deferredPrompt` gate from banner visibility so iOS users see the install helper too.

## v1.2.47 — May 25, 2026

### Added
- 🔗 Link Device full-replace mode — linking a device now completely replaces local progress with cloud data (instead of merging)
- ⚠️ Confirmation dialog warns before overwriting existing local progress
- `replaceSyncData()` client helper for full-replace sync load
## v1.2.46 — May 25, 2026

### Changed
- Build
## v1.2.45 — May 25, 2026

### Fixed
- Client-worker compatibility — sync load response now handles both old and new field names
## v1.2.44 — May 25, 2026

### Added
- ☁️ Cloud Sync — multi-device save synchronization
  - Identity: username + MMYY birthday + 6-digit PIN → HMAC-SHA256 key hash
  - AES-256-GCM encryption for all sync data stored in D1
  - Auto-sync triggers after: level complete, purchases, daily chest, settings save, name change, PWA reward, champion ceremony
  - Device limit: max 3 devices per account
  - PIN change with automatic device ID reset
  - Server-side purchase validation against canonical earned-vs-spent balance
  - Rejected purchases trigger client-side refund
  - Brute-force protection: 10 failed loads = 1-hour lockout
  - Rate limiting: 5 saves/min, 10 loads/min per IP
  - Daily reward deduplication via `rewardsLog` JSON
- 🔗 Link Device on fresh devices — new phone can link an existing cloud account directly from the sync panel
  - Full replacement mode: local progress is completely replaced with cloud data (not merged)
  - Confirmation dialog warns before overwriting existing local progress
- `APP_VERSION` tracking — every metric event now tags build version (`data._v`)
- Build script (`zipgame.ps1`) auto-bumps `APP_VERSION` in `03-save.js`

### Fixed
- Cloud Sync status text now updates correctly when opening Settings panel
- PWA install banner no longer blocked by aggressive CSS `!important` rule
- PIN and birthday inputs now use `inputmode="numeric"` for mobile numeric keypad

### Worker
- New endpoints: `POST /sync/save`, `POST /sync/load`, `POST /sync/change-pin`
- New dashboard endpoints: `GET /stats/appversion`, `GET /stats/feedback`, `GET /stats/sync`
- Dashboard tabs: App Version (adoption chart), Feedback (recent messages), Cloud Sync (accounts & devices)
- Admin endpoint: `POST /admin/sync/reset-pin` (dashboard auth required)
- D1 tables: `sync_states`, `sync_history`, `sync_attempts`

## v1.2.40–v1.2.43 — May 23–25, 2026

### Added
- 📝 Send Feedback panel in Settings — POSTs to `/feedback` worker endpoint with rate limiting
- ✉️ Contact Us button — mailto:xterzd@gmail.com

### Changed
- Stage completion screen redesigned
  - Shows best score alongside current score
  - Shows time improvement `(-X.XXs)` in green when new best
  - Removed inaccurate "FIRST TRY!" text
  - `st.first` flag no longer set on completion
## v1.2.39 — May 23, 2026

### Changed
- Build
## v1.2.38 — May 23, 2026

### Changed
- Build
## v1.2.37 — May 23, 2026

### Changed
- Build
## v1.2.36 — May 22, 2026

### Fixed
- PWA install button now shows fallback message when `beforeinstallprompt` isn't available (Android non-Chrome)
- PWA banner/button visibility now correctly tied to viewport mode — only one shows at a time
- Streak display consistency: `updateLsStreakBtn()` now uses same visual streak calculation as calendar
- HUD vertical alignment: `hudCenter`, `hudLeft`, and `hudRight` all now at `top: 64px`

## v1.2.35 — May 22, 2026

### Changed
- iOS PWA reward now requires 60+ seconds of play after tapping install (anti-gaming)
- Landscape narrow mode: install button moved from floating banner to under `lsGlobalStats` in right column, centered

## v1.2.34 — May 22, 2026

### Added
- PWA install incentive banner on stage select — "📲 INSTALL APP — 100♦" appears when PWA is supported and not yet installed
- iOS users must play 60+ seconds after tapping install to claim reward; Android users get reward only after accepting install
- Dismissible banner (✕) with persistent state
- Stage-select random tip — same `homeTooltip` style/behavior as in-game tips, shows for 3s when opening stage select

## v1.2.33 — May 22, 2026

### Fixed
- PWA install button was hidden on iOS because Safari doesn't fire `beforeinstallprompt`
- iOS users now see "📱 ADD TO HOME SCREEN" button with step-by-step Safari instructions
- Android/Chrome behavior unchanged: button appears when `beforeinstallprompt` fires

## v1.2.32 — May 22, 2026

### Changed
- In-game tooltip (`homeTooltip`) lowered 20px (60px → 80px) to avoid HUD overlap
- Stage-select hint tags (`btnHints`) lowered 20px (56px → 76px)
- Boot screen now shows a random tip from the 50-tip pool during loading

## v1.2.31 — May 22, 2026

### Added
- Day rollover detection via `visibilitychange` — streak, daily stage, and chest UI refresh automatically when app becomes visible after 5 AM UTC+7

### Changed
- Control layout independence — jump button now has separate position (`jumpX`/`jumpY`) and size (`jumpSize`) from movement controls
- Streak calendar visuals — active streak days in yellow/orange, frozen days in ice blue, missing days hollow
- Streak time tracking now accumulates across retries (`sessionRunTime`) — dying and retrying multiple times still counts toward the 60s play threshold

## v1.2.30 — May 22, 2026

### Changed
- HUD transparency halved (rgba 0.1 → 0.05) on all three panels
- In-game changelog consolidated: v1.2.12–v1.2.29 merged into single v1.2.30 entry
- Past dailies are collectible badge grid (no replay)
- Build pipeline restored: always auto-bump

## v1.2.29 — May 22, 2026

### Changed
- Build script restored: default is always auto-bump (no change → don't run zipgame)
- Past dailies displayed as collectible badge grid instead of replay list
- Removed daily replay feature — past dailies are badges only
## v1.2.28 — May 22, 2026

### Changed
- Build script default changed: no-bump on plain build, use `-Bump` to release
- Past daily stages now shown as badge grid (date only, no replay)
- Removed daily replay feature entirely — past dailies are collectible badges only
- Daily replay race condition fixes from v1.2.26–v1.2.27
## v1.2.27 — May 22, 2026

### Fixed
- Daily replay now actually starts the game — `replayDailyStage` was referencing `$('hud')` which doesn't exist in the HTML, causing a `TypeError` that halted execution before `startLvl()` could run
## v1.2.26 — May 22, 2026

### Fixed
- Daily replay race condition: stale `setTimeout(showWin,1000)` from a previous win no longer fires during a new daily replay, which was causing the replay complete screen to appear immediately instead of letting the player actually play
## v1.2.25 — May 22, 2026

### Changed
- Removed `body.force-landscape` CSS — stage select now follows natural device orientation (portrait layout in portrait, landscape in landscape)
- Gameplay still locks to landscape via `attemptFullscreenAndLock()` when Play is tapped
## v1.2.23 — May 22, 2026

### Changed
- Settings orientation option restored — portrait choice is back, boot still defaults to landscape
- `force-landscape` CSS class now follows saved orientation preference instead of always-on
- `currentLayoutKey()` restored to actual device-dimension logic
- Build script auto-changelog fixed: uses `[regex]::Replace` with count=1, no more duplicate insertions

## v1.2.17 — May 21, 2026 — Portrait Removed & Fullscreen Button Fixed

### Fixed
- Fullscreen button no longer overlaps settings gear in compact landscape (now uses dedicated `.fs-btn` class)

### Changed
- **Portrait mode completely removed** — game is now landscape-only. Orientation setting reduced to "Landscape" only
- `currentLayoutKey()` always returns `'landscape'`
- `attemptFullscreenAndLock()` always locks to `'landscape'` regardless of previous setting
- `body.force-landscape` always applied for CSS fallback when browser can't lock orientation

## v1.2.16 — May 21, 2026 — Build Pipeline Verification

### Changed
- Build pipeline verified: auto-bump working correctly from v1.2.15 to v1.2.16

## v1.2.15 — May 21, 2026 — Build System Verified

### Changed
- Build pipeline verified: auto-bump working correctly, service worker cache updates with each build

## v1.2.14 — May 21, 2026 — Landscape Default, Viewport Fix & Fullscreen Button

### Fixed
- Game canvas now sizes to `visualViewport` (actual visible area) instead of `window.innerHeight`, preventing scroll when browser address bar / notification bar is present
- `window.visualViewport` resize listener added so canvas updates when browser chrome shows/hides

### Changed
- **Landscape is now enforced by default** — even first-time users see onboarding, home screen, and stage select in landscape layout. Only users who explicitly set "Portrait" in settings get portrait mode
- `currentLayoutKey()` now always returns `'landscape'` when `orient !== 'portrait'`
- Body class `.force-landscape` added when landscape is enforced; CSS overrides apply landscape stage-select layout even if device is physically held in portrait
- **Fullscreen button added to home screen** — ⛶ icon below the settings gear toggles fullscreen mode

## v1.2.13 — May 21, 2026 — HUD Polish & Build Pipeline Fix

### Fixed
- Service worker cache name now correctly bumps with each build, preventing stale cached HTML
- In-game HUD background transparency actually works: `backdrop-filter: blur(10px)` + `rgba(0,0,0,0.1)` on all panels

### Changed
- **HUD backgrounds**: `hudLeft`, `hudCenter`, `hudRight` all changed to `rgba(0,0,0,0.1)` with blur kept
- **Ghost button removed from `hudCenter`**: redundant since ghost status is already shown in `hudLeft` skill icons
- **Ghost rival replay button** moved inside stage thumbnail (`cardWrap`) at bottom center
- **Stage select tooltips**: `lsTags` shows level details on click; `lsBottomBar` shows progress + champion rewards

## v1.2.12 — May 20, 2026 — Stage Select & Store UI Polish

### Fixed
- Store portrait in landscape mode now sized 90×60 px with 5 px top margin (was 120×80 px at 44 px top) to avoid crowding header row
- Stage select tooltip now uses DOM-based `showStageTooltip()` instead of canvas `addFloat()`, which failed because the game draw loop isn't active in stage select

### Changed
- **Stage select portrait layout**: Reduced top padding, moved logo/header up to eliminate large empty gaps; `lsName` centered; `lsBottomBar` height set to 6 px
- **Landscape narrow stage select**: `cardWrap` vertically centered via `margin: auto 0`, height `70vh` / `max-height: 380px`; `lsDetails` gap loosened; global stats pills compacted
- **`lsGlobalStats` redesign**: Replaced pill tags with two clean inline rows (`gs-row`) of `emoji value label` triplets. No backgrounds/borders. Emoji gets colored `drop-shadow`. Hover: `opacity: 0.7`
- **Store header compact**: Single row layout — gems left, `★ STORE` center, `🤖` icon + index + `▶` + inline tip right
- **Shopkeeper message orientation**: Portrait shows full tip centered below header; landscape narrow shows truncated tip inline next to the `🤖` icon
- **Store item spacing**: Landscape `.store-item` padding reduced `12px` → `8px`, margin-bottom `8px` → `4px`

## v1.2.11 — May 20, 2026 — Daily Stage Fixes & UI Polish

### Fixed
- Daily stage canvas no longer renders at ~1/10 size on first play — `startDailyStage()` and `replayDailyStage()` were missing `resize()` / `initStars()` / `applyJoySettings()` / `applyBtnSize()` calls that `startGame()` has
- `generateDailyLevel()` `mdy` date parameter was corrupted: `today.slice(2, 4)` grabbed the last-two digits of the year instead of the day, producing `05262026` instead of `05202026` for mmddyyyy seed
- Daily stage platform layout was not rank-dependent — `genLvl()` used `getGameDayKey() + 'layout'` without rank, so players of different ranks on the same day got identical platform positions. Now uses `(dateKey || getGameDayKey()) + 'layout' + rankIdx`
- Ghost rival recording, button, and rendering now disabled during daily stages and daily replays (ghost skill passive still works)
- `dailyCollection` defensive check: `Array.isArray()` guard before push/iterate to prevent crashes on corrupted save data

### Added
- **Past Dailies in preview** — `#dailyPreview` now shows up to 5 previous completed daily stages with replay buttons, so users can browse collection without completing today's stage first
- **Date + theme mix display** in daily preview — shows current game date and the mood/energy/feel theme names to surface daily variety
- **Stage select progress bar** — animated cyan bar above global stats strip showing cleared count / 20 stages
- `dateKey` and `rankIdx` stored on `dailyLevelObj` so replayed dailies use the exact original layout seed

### Changed
- Profile page (`#profile`) redesigned as 2-column grid: left = RANK tiers + progress, right = GLOBAL STATS + HAZARD BREAKDOWN. Container widened from 360px to 560px
- Streak calendar (`#streakCalendar`) redesigned as 2-column grid: left = streak count + freeze controls, right = week calendar grid. Container widened from 380px to 560px
- Daily stage button (`#lsDailyBtn`) now shows "DAILY STAGE" text label alongside icon instead of just the icon
- `buildDailyTheme()` now returns `moodName`, `energyName`, `feelName` for UI display

## v1.2.10 — May 19, 2026 — Stage Badge & Portrait Cleanup

### Changed
- Difficulty badge (`#lsTags`) now displays gravity, friction, weather, and ghost rival status in a single compact line
- Removed separate `#lsPhysics` descriptor row — all stage conditions merged into the badge
- Character portrait animation hidden for layout testing (canvas set to `display: none`)

## v1.2.9 — May 19, 2026 — Stage Select Layout Rework

### Changed
- Dot navigation moved inside stage thumbnail bottom edge, scaled to fit within card bounds
- Stage records (best time, matches, gems, silver) consolidated into thumbnail overlay; removed separate stat card row below stage info
- Character preview is now a transparent floating avatar positioned beside player info (rank / name / gems) — no card border or background
- Streak, Daily Stage, and Daily Chest buttons stacked vertically below the Settings button, aligned to the right edge in both portrait and landscape
- Landscape info panel narrowed (48vw → 40vw) to prevent overlap with the vertical resource button stack

## v1.2.8 — May 18, 2026 — UI/UX Polish (Round 2)

### Fixed
- Landscape stage title missing: `updateCarousel()` now resets `scrollTop` so `#lsName` is never scrolled out of view
- Resource buttons no longer overlap level card in landscape (raised from 48px to 38px, levelSelect padding increased to 86px)
- Avatar no longer visually collides with card in landscape (10px gap via padding)
- Breakdown text no longer wraps awkwardly in portrait (`white-space: nowrap` + ellipsis)
- Time stat stays on single line in both orientations (`white-space: nowrap`)
- Level number "1" no longer clipped by card corner (`left: 18px` instead of 14px)
- Username badge has more horizontal padding (4px 6px → 4px 10px)
- "watch replay" is now a standalone button below physics text, not inline with bullets
- Stage badge simplified to difficulty only (removed redundant stage name)
- Progress bar locked segments more visible (0.08 → 0.12 alpha)
- Card mini-stats have more bottom/side padding (12px → 14px/16px)
- Global stats use consistent `space-between` padding in both orientations

## v1.2.2 — May 18, 2026 — UI/UX Polish

### Changed
- Stage select visual overhaul: dot navigation replaced with thin segmented progress bar
- Top bar consolidated: store button is now icon-only, resource buttons centered below logo
- Thumbnail stats now have clear labels (Matches, Clears, Gems, Silver)
- Timer displayed in readable pill badge
- Stat grid uses tabular numerals for consistent visual weight
- Global stats icons and values enlarged for readability
- "LOG »" renamed to "💀 BREAKDOWN"
- Ghost replay link styled as a proper secondary button
- Landscape layout: avatar is compact (60px) instead of sidebar, info panel widened to 48vw
- Avatar is always a small top-left badge in both orientations
- Cross-orientation consistency for resource buttons and global stats layout
- In-game grid lines visibility increased (alpha 0.08 → 0.18)
- "CLEAR" weather label rendered in cyan to avoid clashing with title glow
- Terminology: "gold chip" → "gold gem" in champion ceremony text

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
