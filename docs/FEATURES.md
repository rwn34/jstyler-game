# N3ON DashJ — Feature & Workflow Documentation

| Field | Value |
|-------|-------|
| **Document Version** | 1.0.0 |
| **Client App Version** | v1.2.47 |
| **Server App Version** | v1.0.0 (ndj-metrics worker) |
| **Last Updated** | 2026-05-25 |

---

## Table of Contents

### Client Features

1. [Boot & Loading](#1-boot--loading)
2. [Player Onboarding](#2-player-onboarding)
3. [Stage Select (Level Select)](#3-stage-select-level-select)
4. [Core Gameplay Mechanics](#4-core-gameplay-mechanics)
5. [Physics System](#5-physics-system)
6. [Platform Types](#6-platform-types)
7. [Hazards](#7-hazards)
8. [Collectibles](#8-collectibles)
9. [Skills](#9-skills)
10. [Consumables](#10-consumables)
11. [Cosmetics](#11-cosmetics)
12. [Weather System](#12-weather-system)
13. [Day/Night Cycle](#13-daynight-cycle)
14. [20 Themed Levels](#14-20-themed-levels)
15. [Champion / Master System](#15-champion--master-system)
16. [Player Rank System](#16-player-rank-system)
17. [Ghost Replay System](#17-ghost-replay-system)
18. [Store / Economy](#18-store--economy)
19. [Daily Rewards](#19-daily-rewards)
20. [Share System](#20-share-system)
21. [Save System](#21-save-system)
22. [Cloud Sync](#22-cloud-sync)
23. [Settings](#23-settings)
24. [Audio & Music](#24-audio--music)
25. [PWA & Offline](#25-pwa--offline)
26. [Score System](#26-score-system)
27. [NPC Advice System](#27-npc-advice-system)
28. [Death & Retry Flow](#28-death--retry-flow)
29. [Level Complete (Win) Flow](#29-level-complete-win-flow)
30. [Orientation & Layout](#30-orientation--layout)

### Server Features (Cloudflare Worker: ndj-metrics)

31. [Session Management](#31-session-management)
32. [Event Ingestion](#32-event-ingestion)
33. [HMAC Anti-Cheat](#33-hmac-anti-cheat)
34. [Rate Limiting](#34-rate-limiting)
35. [Cloud Sync (Server)](#35-cloud-sync-server)
36. [Dashboard](#36-dashboard)
37. [Feedback System](#37-feedback-system)
38. [Cron Cleanup](#38-cron-cleanup)
39. [Security](#39-security)
40. [Database Schema](#40-database-schema)

---

## Client Features

---

## 1. Boot & Loading

### Description

The boot screen is the first visual experience a player encounters when launching N3ON DashJ. It presents an animated, branded loading sequence that communicates the game's cyberpunk/neon aesthetic while providing real-time progress feedback. The boot screen ensures all assets and game state are initialized before transitioning to the main menu.

### How It Works

#### Visual Components

- **Theme-Cycling Background**: The background gradient cycles through the 20 stage themes (each stage has a unique sky gradient). Colors transition smoothly using CSS or canvas interpolation, giving a preview of the game's visual variety.
- **Running Player Dot**: A small animated stickman figure runs across the bottom of the screen, mimicking the core gameplay loop. This dot uses the same rendering logic as the in-game player character.
- **Perspective Grid**: A retro-futuristic grid rendered in perspective (vanishing point at center-top) scrolls forward, reinforcing the "running forward" motif. Grid lines use the current theme's accent color.
- **Progress Ring**: A circular SVG/canvas progress indicator fills from 0% to 100% as initialization tasks complete. The ring uses the current theme's accent color with a glow effect.
- **Particle Burst**: At 100% completion, a burst of 20-30 particles explodes outward from the progress ring center. Particles use the theme's particle color and fade over ~500ms.

#### Initialization Sequence

1. Load saved game state from localStorage (XOR-decrypted)
2. Run data migrations if GAME_VERSION has changed
3. Initialize Web Audio API context (suspended until user interaction)
4. Pre-render stage thumbnail canvases
5. Register Service Worker (non-blocking)
6. Validate daily chest/daily master chip eligibility
7. Check cloud sync status (non-blocking)

#### Timing

- Minimum display time: **2.5 seconds** (even if init completes faster)
- Progress is mapped: 0-80% = actual init tasks, 80-100% = cosmetic fill over remaining time
- Transition: Fade-out over 300ms → stage select screen

### Expected Outcome

- Player sees a visually engaging, branded loading screen with clear progress feedback.
- The boot screen lasts exactly 2.5 seconds minimum, ensuring consistent UX.
- After completion, the player transitions smoothly to the stage select screen (or onboarding if first launch).

### Edge Cases

- **Corrupted save data**: If localStorage read fails or XOR decryption produces invalid JSON, the game resets to fresh state and proceeds to onboarding.
- **Service Worker registration failure**: Boot continues normally; SW features (offline, updates) degrade gracefully.
- **Very slow device**: If init takes >2.5s, the progress ring reflects actual progress and the boot screen stays until complete (no hard timeout).
- **Returning player with pending update**: If a new Service Worker is waiting, the update banner appears after boot completes (not during).

---

## 2. Player Onboarding

### Description

The onboarding flow activates on first launch (or after a data reset) and guides new players through identity setup, control selection, and a brief gameplay tutorial. The goal is to get players into their first game within 30 seconds while ensuring they understand the core loop.

### How It Works

#### First-Launch Detection

The game checks two conditions on boot:
- `playerName` is empty/null/undefined in save data
- `ctrlPicked` is `false` in save data

If either condition is true, the onboarding flow triggers instead of the normal stage select.

#### Step 1: Name Entry

- **Input field**: Text input with real-time validation
- **Constraints**:
  - Minimum 5 characters, maximum 10 characters
  - Alphanumeric only (A-Z, 0-9). No spaces, symbols, or Unicode
  - Auto-converted to UPPERCASE on input
  - Submit button disabled until valid (5+ chars)
- **Storage**: Saved as `playerName` in game state
- **Analytics**: Fires `name_set` event to server with the chosen name

#### Step 2: Control Scheme Selection

Two options presented as large, tappable cards:

| Control Scheme | Description | Default |
|---------------|-------------|---------|
| **Arrow Buttons** | On-screen ← → buttons + dedicated JUMP button | ✓ Yes |
| **Analog Joystick** | Virtual thumbstick (left side) + JUMP button (right side) | No |

- Selection saved as `controls` setting (`'arrows'` or `'joystick'`)
- `ctrlPicked` set to `true`
- Can be changed later in Settings

#### Step 3: How-to-Play Card

A single informational card explaining the core gameplay loop:

1. **Reach the flag** 🏁 — Run right to the green finish platform
2. **Double-jump** ⬆️⬆️ — Tap jump twice for extra height (3s cooldown)
3. **Collect gems** 💎 — Gold gems (permanent) and silver arcs (per-run)
4. **Avoid hazards** ⚠️ — Spikes, lasers, and the void below

Card has a single "GOT IT" button that dismisses and transitions to stage select.

### Expected Outcome

- New players complete identity setup and control selection in under 30 seconds.
- Players understand the four core mechanics before their first run.
- The flow is skipped entirely for returning players with valid save data.

### Edge Cases

- **Name already taken**: No server-side uniqueness check. Names are local identifiers only. Duplicate names across players are acceptable.
- **Player cancels mid-onboarding**: Not possible — there is no back/close button. The flow must be completed.
- **Import overwrites during onboarding**: If a player imports save data during onboarding (not possible in current UI), the import would set playerName and ctrlPicked, skipping remaining steps on next load.
- **Name change later**: Players can purchase a Name Change consumable (50♦) from the store to re-enter a name with the same constraints.

---


## 3. Stage Select (Level Select)

### Description

The stage select screen is the central hub of N3ON DashJ. It displays all 20 stages as swipeable cards, provides access to every game feature (store, settings, daily rewards, sharing), and shows comprehensive progress information. The layout adapts between landscape (two-column) and portrait (vertical stack) orientations.

### How It Works

#### Stage Cards

- **20 swipeable cards**: Each card contains a live canvas thumbnail rendered with the stage's theme colors (sky gradient, grid color, accent color). Thumbnails show a miniature version of the stage layout.
- **Swipe navigation**: Horizontal swipe (touch) or arrow keys (keyboard) to browse stages. Snap-to-card behavior with momentum.
- **Card content**: Stage name, difficulty badge (STARTER/SIMPLE/MODERATE/HARD), physics summary (gravity icon + friction icon).

#### Dot Navigation

20 dots displayed below the card carousel:

| Dot State | Visual | Meaning |
|-----------|--------|---------|
| Unlocked | Filled, theme-colored | Stage available to play |
| Locked | Dim, gray | Stage not yet unlocked |
| Daily Stage | 💎 marker overlay | Today's daily master chip stage |
| Daily Claimed | ✓ checkmark | Daily chip already collected today |
| Current | Enlarged/pulsing | Currently selected stage |

#### Per-Stage Information Panel

Displayed alongside or below the active card:

- Stage name and difficulty tag
- Physics info: gravity value, friction value (with descriptive labels like "Floaty" or "Grippy")
- Best time (mm:ss.ms format, or "—" if unplayed)
- Gold gems collected / total available
- Total matches played on this stage
- Best score achieved

#### Global Stats Strip

A horizontal strip showing aggregate player statistics:

- **Total Matches**: Sum of all stage attempts
- **Time Played**: Cumulative gameplay time (hh:mm format)
- **Clear %**: (Stages cleared at least once / 20) × 100
- **Hazard Deaths**: Total deaths from spikes + lasers + lightning (excludes falls)

#### Player Rank Chip

- Displays current rank tier name and icon (e.g., "⚡ Silver Circuit")
- Clickable → opens popup overlay showing:
  - All 6 rank tiers with score thresholds
  - Current score and progress bar to next tier
  - Score breakdown (gold contribution, silver contribution, clear%, matches)

#### Top Action Buttons

| Button | Label | Action |
|--------|-------|--------|
| 🎁 | Daily Chest | Opens daily chest claim (if available) |
| 🛒 | STORE | Opens store overlay |
| ↗ | Share | Opens share card for current stage (if cleared) |
| ⚙ | Settings | Opens settings panel |

#### Ghost Banner

- Shown if Ghost Rival skill is not yet unlocked
- Text: "Clear stages 1 & 2 to unlock Ghost Rival 👻"
- Disappears permanently once both stages are cleared

#### Character Portrait

- Animated canvas showing the player's stickman running in place
- Renders all equipped cosmetics (hat, cape, glow, trail, body color)
- Cape physics simulated (reacts to run animation)
- Serves as visual confirmation of current loadout

#### Layout Modes

- **Landscape**: Two-column layout. Left column: character portrait + stage card. Right column: stats panel + action buttons.
- **Portrait**: Vertical stack. Top: action buttons. Middle: stage card + dots. Bottom: stats + portrait.

### Expected Outcome

- Player can browse all 20 stages, see their progress at a glance, and access every game feature from one hub screen.
- Unlocked stages are visually distinct from locked ones.
- All navigation is intuitive via swipe/tap with no hidden menus.

### Edge Cases

- **All stages locked except first**: New players see only stage 1 as colored; stages 2-20 are dimmed with lock icons. Tapping a locked stage shows "Clear [prerequisite] to unlock."
- **Daily stage on locked stage**: The 💎 marker still appears on the dot, but the stage cannot be played until unlocked normally.
- **No best time**: Displays "—" instead of 00:00.000. No share button available for uncleared stages.
- **Orientation change while browsing**: Card position and scroll state preserved. Layout re-renders without losing selected stage index.

---

## 4. Core Gameplay Mechanics

### Description

N3ON DashJ is a precision platformer where the player controls a stickman character running and jumping across procedurally-placed platforms to reach a finish flag. The mechanics prioritize responsive controls, frame-rate independence, and satisfying movement physics.

### How It Works

#### Movement

- **Input methods**: On-screen arrow buttons, WASD keys, analog joystick, or touch-region buttons
- **Horizontal speed**: ~5 pixels per frame at dt=1.0 (60fps baseline)
- **Acceleration**: Instant (no ramp-up). Direction change is immediate
- **Deceleration**: Controlled by per-stage friction value. Higher friction = faster stop
- **Air control**: Full horizontal control while airborne (same speed as grounded)
- **Facing direction**: Character faces left or right based on last movement input. Stored as `face` property (1 = right, -1 = left)

#### Jump

- **Single jump**: Initiated by jump button/key press while grounded (or within coyote time)
- **Variable height**: Jump velocity applied on press. Releasing early does NOT cut jump short (fixed impulse model)
- **Jump strength**: Per-stage value ranging from -11 (weak) to -15 (strong). Applied as initial vertical velocity
- **Grounded detection**: Player is grounded when resting on top of a platform (collision from above with vertical velocity ≥ 0)

#### Double Jump

- **Activation**: Press jump while airborne and double-jump is available
- **Cooldown**: 3 seconds (180 frames at 60fps) after use before available again
- **Visual indicator**: Jump button shows cooldown ring/timer. Pulses when ready
- **Velocity**: Same as single jump strength for the current stage
- **Reset conditions**: Landing on any platform resets double-jump availability (but not cooldown timer)
- **State tracking**: `djUsed` boolean tracks if double jump was used this airborne session. `djCool` counter tracks cooldown frames remaining

#### Coyote Time

- **Window**: ~6 frames (100ms at 60fps) after walking off a platform edge
- **Behavior**: Player can still perform a "grounded" jump even though technically airborne
- **Implementation**: `coyoteFrames` counter starts when player leaves platform without jumping. If jump pressed while counter > 0, jump executes as if grounded
- **Does NOT apply**: If player jumped off the platform (only triggers on walk-off/fall-off)

#### Jump Buffer

- **Window**: ~6 frames (100ms at 60fps) before landing
- **Behavior**: If jump is pressed while airborne and within 6 frames of landing, the jump registers immediately upon landing
- **Implementation**: `jumpBuffer` counter set on jump press while airborne. Decrements each frame. On landing, if buffer > 0, jump executes immediately
- **Interaction with double jump**: Buffer only triggers grounded jump. Does not consume double jump

#### Air Dash

- **Requirement**: Air Dash skill equipped (or Reflex Dash for champions)
- **Activation**: Press jump a third time after double jump is used (while still airborne)
- **Effect**: Horizontal burst in facing direction. No vertical component
- **Reset**: Resets on landing. One use per airborne session
- **Interaction**: If both Air Dash and Reflex Dash are available, Reflex Dash takes priority (mutual exclusion in equip)

#### Frame-Rate Independence

- **Delta time (dt)**: Calculated each frame as `(currentTime - lastTime) / 16.667` (normalized so dt=1.0 at 60fps)
- **Application**: All physics values multiplied by dt:
  - `velocityY += gravity * dt`
  - `x += velocityX * dt`
  - `y += velocityY * dt`
  - `friction` applied as `velocityX *= pow(friction, dt)`
- **Cooldown timers**: Decremented by dt rather than fixed 1 per frame
- **Result**: Game feels identical at 30fps, 60fps, 120fps, and 144fps

#### Camera System

- **Follow target**: Player's X position, offset to show more of the path ahead
- **Smoothing**: Exponential interpolation (lerp with frame-rate independent smoothing)
- **Formula**: `camX += (targetX - camX) * (1 - pow(0.92, dt))`
- **Vertical**: Camera Y follows player with similar smoothing, clamped to level bounds
- **Effect**: Smooth, cinematic feel without jarring snaps. Player stays roughly center-left of screen

### Expected Outcome

- Controls feel responsive and precise. No input lag or floaty unresponsiveness.
- Platforming feels identical regardless of device frame rate (30fps phone vs 144fps desktop).
- Coyote time and jump buffer make the game feel "generous" — near-misses register as hits.
- Camera smoothly tracks action without disorienting the player.

### Edge Cases

- **dt spike (tab unfocus/refocus)**: dt is clamped to a maximum of 3.0 to prevent physics explosion after long pauses.
- **Simultaneous left+right input**: Last input wins. No zero-velocity deadlock.
- **Jump at exact frame of landing**: Jump buffer ensures this always works. No frame-perfect timing required.
- **Double jump during coyote time**: Coyote jump counts as grounded jump; double jump remains available.
- **Air dash without double jump skill**: Air dash requires double jump to have been used first. Cannot air dash from single jump.

---


## 5. Physics System

### Description

Each of the 20 stages in N3ON DashJ has a unique physics profile defined by three core parameters: gravity, friction, and jump strength. These values combine to create mechanically distinct experiences — from floaty low-gravity exploration to punishing high-gravity precision runs.

### How It Works

#### Gravity

- **Range**: 0.5 (lightest) to 0.7 (heaviest)
- **Application**: Added to vertical velocity every frame: `velocityY += gravity * dt`
- **Effect on gameplay**:
  - Low gravity (0.5): Longer hang time, higher jumps, more air control time. Stages feel "floaty" and forgiving.
  - High gravity (0.7): Short jumps, fast falls, less reaction time. Stages feel "heavy" and demanding.
- **Notable stages**: Void Walker (0.5, lightest), Starlight (0.5), Solar Flare (0.7, heaviest), Dust Storm (0.7)

#### Friction

- **Range**: 0.75 (most slippery) to 0.92 (grippiest)
- **Application**: Multiplied against horizontal velocity each frame: `velocityX *= pow(friction, dt)`
- **Effect on gameplay**:
  - Low friction (0.75): Player slides after releasing input. Overshooting platforms is common. Requires anticipatory braking.
  - High friction (0.92): Player stops almost immediately. Precise positioning is easy but momentum-based tricks are harder.
- **Notable stages**: Dust Storm (0.75, slipperiest), Frost Byte (0.92, grippiest)

#### Jump Strength

- **Range**: -11 (weakest) to -15 (strongest)
- **Application**: Set as initial vertical velocity on jump: `velocityY = jumpStrength`
- **Negative value**: Upward direction is negative Y in canvas coordinate system
- **Interaction with gravity**: Low gravity + strong jump = extreme height. High gravity + weak jump = minimal clearance.

#### Physics Profiles by Difficulty

| Difficulty | Typical Gravity | Typical Friction | Feel |
|-----------|----------------|-----------------|------|
| STARTER | 0.6 | 0.82-0.85 | Balanced, predictable |
| SIMPLE | 0.5-0.65 | 0.8-0.9 | Varied, exploratory |
| MODERATE | 0.5-0.7 | 0.75-0.92 | Extreme ranges, specialized |
| HARD | 0.5-0.6 | 0.85-0.9 | Tuned for challenge, not extremes |

### Expected Outcome

- Each stage feels mechanically distinct due to its unique physics profile.
- Players must adapt their timing and spacing for each stage's gravity and friction.
- Low-gravity stages reward exploration; high-gravity stages reward precision.
- Friction differences create distinct "feel" even between stages with identical gravity.

### Edge Cases

- **Extreme combinations**: High gravity (0.7) + low friction (0.75) on Dust Storm creates the most punishing physics — short jumps that slide off platforms.
- **Low gravity + high friction**: Void Walker (0.5 gravity, 0.9 friction) creates a "moon walking" feel — high jumps with precise landings.
- **dt interaction**: All physics values scale with dt, so extreme frame rates don't change the effective physics feel.

---

## 6. Platform Types

### Description

Platforms are the primary terrain in N3ON DashJ. Six distinct platform types create varied gameplay challenges, from simple static surfaces to timing-based pulse platforms and momentum-altering bouncy pads.

### How It Works

#### Static Platforms (t:'s')

- **Behavior**: Fixed position, no movement or state changes
- **Frequency**: Most common type. Forms the backbone of every level
- **Visual**: Solid rectangle with stage-themed accent color border
- **Collision**: Standard top-surface collision. Player can pass through sides and bottom

#### Moving Platforms (t:'m')

- **Behavior**: Horizontal oscillation following a sine wave pattern
- **Movement formula**: `x = baseX + amplitude * sin(time * speed)`
- **Count per stage**: Controlled by `lv.move` property (0 = none, 1 = few, 2 = moderate, 3 = many)
- **Placement**: Distributed among regular platforms. Never the first or last platform
- **Player interaction**: Player moves with platform when standing on it (velocity transferred)
- **Visual**: Same as static but with subtle motion trail or arrow indicators

#### Pulse Platforms (pulse:true)

- **Cycle**: 4 seconds visible → 1 second warning flicker → 2 seconds invisible (7s total cycle)
- **Warning phase**: Platform flickers rapidly (opacity oscillates) for 1 second before disappearing
- **Invisible phase**: Platform has no collision. Player falls through
- **Availability by difficulty**:
  - STARTER: 0% (never)
  - SIMPLE: 0% (never)
  - MODERATE: 12% of platforms
  - HARD: 22% of platforms
- **Visual**: Translucent/holographic appearance when visible. Flicker effect during warning

#### Bouncy Platforms (t:'b')

- **Behavior**: Launches player 1.5× higher than normal jump on contact
- **Bonus effect**: Resets double jump availability immediately (even if on cooldown)
- **Visual**: Spring-coil appearance with zigzag pattern. Compresses on player contact with bounce animation
- **Placement**: Strategic positions where extra height is needed to reach distant platforms
- **Sound**: Distinct "boing" SFX on contact

#### Finish Platform (t:'f')

- **Behavior**: Final platform in every level. Touching it triggers the win condition
- **Visual**: Green-colored platform with animated flag (🏁) waving above it
- **Size**: Slightly wider than normal platforms for generous landing
- **Position**: Always the last platform in the level array
- **Trigger**: Any collision (top, side, or bottom) counts as a win

#### Ziplines

- **Behavior**: Auto-slide the player forward between two platforms at constant speed
- **Activation**: Player touches the zipline cable (rendered between platform endpoints)
- **Exit**: Player can jump off at any time to disengage
- **Availability**: Only on stages with `move ≥ 2` (8 stages total)
- **Visual**: Thin cable/wire with small pulley that the player hangs from
- **Speed**: Faster than normal running speed, providing a momentum boost

### Expected Outcome

- Increasing mechanical complexity as difficulty rises.
- Pulse platforms create timing puzzles that require patience and observation.
- Bouncy platforms enable creative routing and recovery from missed jumps.
- Moving platforms add spatial awareness challenges.
- Ziplines provide satisfying speed sections and alternative paths.

### Edge Cases

- **Standing on pulse platform when it disappears**: Player immediately enters falling state. Coyote time does NOT activate (platform disappeared, not walked off).
- **Moving platform at level edge**: Platforms are clamped to level bounds. Cannot move off-screen.
- **Bouncy + double jump**: Bouncy platform resets double jump even if cooldown timer is active. The cooldown timer itself is NOT reset.
- **Zipline + pause**: Player position on zipline is preserved during pause. Resumes from same point.
- **Multiple platform overlap**: Player collision resolves to the topmost platform. Cannot stand on two platforms simultaneously.

---

## 7. Hazards

### Description

Hazards are the primary source of player death in N3ON DashJ. Four distinct hazard types create varied threats — from ever-present void falls to timing-based lasers and weather-dependent lightning strikes. Each hazard has a unique death message and visual identity.

### How It Works

#### Void (Fall Death)

- **Trigger**: Player Y position exceeds `fallLimitY` (calculated as maximum platform Y + 260 pixels)
- **Death message**: "FALLEN"
- **Frequency**: Present in every stage. The most common death type for new players
- **Visual warning**: None — the void is simply empty space below platforms
- **Prevention**: Careful jumping, double jump recovery, Air Dash skill, Platform Bounce skill

#### Spikes

- **Appearance**: Triangular obstacles placed on top of platforms
- **Spawn rate**: 25% chance per eligible platform (platforms index 4 through count-2)
- **Collision**: Hitbox is the triangular area. Contact from any direction = death
- **Death message**: "SPIKED!"
- **Visual**: Bright red/orange triangles with subtle glow. Clearly visible against platform surface
- **Placement rules**: Never on first 4 platforms (safe zone), never on last platform (finish), never on platform index < lv.move (moving platform zone)

#### Lasers

- **Appearance**: Vertical beams extending from platform surface upward
- **Timing cycle**: ON for 100 frames → OFF for 80 frames (repeating)
- **Spawn rate**: 15% chance per eligible platform (same range as spikes)
- **Collision**: Only active during ON phase. Full-width beam hitbox
- **Death message**: "LASERED!"
- **Visual**: Bright beam with pulsing intensity during ON phase. Dim/transparent during OFF phase. Base emitter always visible as warning
- **Interaction with Time Freeze**: Lasers freeze in current state (ON stays ON, OFF stays OFF) for duration

#### Lightning (Storm Weather Only)

- **Trigger condition**: Only active on stages with `weather: 'storm'` (Voltage, Glitch Zone)
- **Strike frequency**: Random interval between 15-25 seconds
- **Strike zone**: Random X position within current camera view
- **Warning**: Brief flash/flicker 0.5s before strike. Lightning bolt visual
- **Death message**: "⚡ STRUCK!"
- **Hitbox**: Narrow vertical column at strike point. Player must be within ~30px horizontally
- **Visual**: Bright white/yellow bolt from top of screen to ground. Screen flash on strike

### Expected Outcome

- Multiple death types create varied challenge requiring different skills.
- Each hazard has a distinct visual warning allowing skilled players to avoid them.
- Spikes test spatial awareness; lasers test timing; lightning tests reaction speed.
- Void deaths punish poor jump execution; hazard deaths punish poor observation.

### Edge Cases

- **Spike + moving platform**: Spikes move with the platform. Hitbox position updates each frame.
- **Laser ON at level start**: Lasers start at a random point in their cycle. Some may be ON immediately.
- **Lightning during invulnerability**: If Clipping skill absorbs a hit, lightning strike during invuln window (0.75s) is ignored.
- **Multiple hazards on same platform**: Possible but rare. Spike and laser can coexist. Player dies to whichever they touch first.
- **Hazard on pulse platform**: Hazard disappears with the platform during invisible phase. No collision during invisible.

---


## 8. Collectibles

### Description

N3ON DashJ features a multi-layered collectible system with four distinct gem types, each serving different economic and progression purposes. Collectibles drive both the in-game economy and long-term engagement through daily rotations and champion-exclusive content.

### How It Works

#### Gold Gems (★)

- **Placement**: On every 3rd platform where `i % 3 === 0`, `i > 2`, and `i >= lv.move`
- **Collection behavior**: First-time collection on a stage = permanent +1 gold added to `totalGoldChipsCollected`
- **Repeat collection**: Already-collected gold gems still appear but are visually dimmed. Collecting again awards no additional gold
- **Score value**: +50 points per gold gem collected (even repeats count for score)
- **Visual**: Bright gold/yellow gem with sparkle animation. Pulsing glow effect
- **Tracking**: Per-stage `bestChips` array records which platform indices have been collected

#### Silver Arc Gems (♦)

- **Placement**: 3 gems arranged in an arc between two platforms where the gap exceeds 80px
- **Collection behavior**: Re-collectable every run. Each gem awards +1 silver to wallet
- **Champion multiplier**: Champions receive ×1.5 silver (rounded down) per gem
- **Score value**: +5 points per silver gem
- **Visual**: Silver/white gems with smaller size than gold. Arc formation follows a parabolic curve between platforms
- **Economy role**: Primary source of silver currency for cosmetics and consumables

#### Master Gems (★★)

- **Visibility**: Only visible to Champion players (all 20 stages cleared)
- **Placement**: Hidden at specific locations within each stage
  - STARTER stages: 1 master gem each (2 total)
  - SIMPLE stages: 1 master gem each (4 total)
  - MODERATE stages: 2 master gems each (16 total)
  - HARD stages: 3 master gems each (18 total)
  - **Grand total**: 40 master gems across all stages
- **Reward**: +2 gold per master gem (permanent, one-time collection)
- **Visual**: Rainbow-colored gem with prismatic shimmer effect. Larger than standard gems
- **Purpose**: Endgame gold source for champions to purchase remaining skills

#### Daily Master Chip (💎)

- **Rotation**: One stage selected per calendar day using deterministic formula: `(dateHash + playerIDHash) % unlockedStageCount`
- **Eligibility**: Stage must be unlocked. One claim per calendar day
- **Reward**:
  - Champions: +5 gold
  - Non-champions: +5 silver
- **Visual**: Diamond-shaped chip with 💎 icon, placed mid-stage on a specific platform
- **Stage select indicator**: 💎 dot overlay on the daily stage. ✓ checkmark after claimed

#### Combo System

- **Trigger**: Collecting multiple gems in quick succession (within ~1.5 seconds between each)
- **Multipliers**: x2 (2 gems), x3 (3 gems), x4 (4+ gems, max)
- **Application**: Multiplier applies to style points only (not currency)
- **Visual feedback**: Multiplier text floats above player with increasing size/glow
- **Reset**: Timer resets to 0 if no gem collected within the window

### Expected Outcome

- Multiple gem types create a layered economy with distinct purposes (gold = skills, silver = cosmetics).
- Master gems provide meaningful endgame content for champions.
- Daily chip creates a daily engagement hook with tangible rewards.
- Combo system rewards skillful routing through gem-dense areas.

### Edge Cases

- **Gold gem on moving platform**: Gem moves with the platform. Collection hitbox updates each frame.
- **Daily chip on uncollected gold gem platform**: Both can coexist. Player collects both independently.
- **Champion demotion (impossible)**: Champion status is permanent once achieved. Master gems remain visible.
- **Silver overflow**: No cap on silver wallet. Players can accumulate indefinitely.
- **Combo across platform types**: Combo timer doesn't care about gem type. Gold + silver in sequence still builds combo.

---

## 9. Skills

### Description

Skills are permanent gameplay modifiers purchased with gold currency. Seven purchasable skills and two free skills provide meaningful mechanical advantages. Players can equip a maximum of 3 purchased skills simultaneously, forcing strategic choices based on stage characteristics.

### How It Works

#### Purchasable Skills (7)

| Skill | Cost | Icon | Effect |
|-------|------|------|--------|
| **Air Dash** | 18g | 💨 | Horizontal burst mid-air after double jump used. One use per airborne session. Resets on landing |
| **Clipping** | 22g | 🌀 | Once per run, ignore first hazard hit (spikes/lasers/lightning). 0.75s invulnerability window after trigger. Falls still kill |
| **Auto Resurrect** | 22g | ❤️ | On death, respawn at last touched platform instead of dying. 2-minute real-time cooldown between uses |
| **Coyote Boost** | 10g | 🐾 | Doubles the coyote time window from ~6 frames to ~12 frames (200ms) |
| **Magnet** | 20g | 🧲 | Auto-pulls nearby gems (silver + gold) within ~100px radius toward player |
| **Platform Bounce** | 22g | 🪝 | Hitting a platform from the side bounces player away with upward velocity. Resets double jump + air dash |
| **Slow Fall** | 30g | 🪶 | While holding jump during descent, downward velocity is halved. Allows precise aerial positioning |

#### Free Skills (2)

| Skill | Unlock Condition | Effect |
|-------|-----------------|--------|
| **Ghost Rival** | Clear stages 1 & 2 | Records best run as ghost data. Translucent rival races alongside on subsequent attempts |
| **Reflex Dash** | Champion status (all 20 cleared) | Air dash available even when double-jump is on cooldown. Includes Air Dash effect. Toggleable on/off |

#### Equip System

- **Slot limit**: Maximum 3 purchased skills equipped at once
- **Free skills**: Do NOT consume equip slots. Always active when unlocked (Ghost Rival toggleable in settings)
- **Mutual exclusion**: Air Dash and Reflex Dash cannot both be equipped (Reflex Dash supersedes Air Dash)
- **Equip/Unequip**: Done in Store → Skills tab. Instant toggle, no cost to change

#### Skill Interactions

- **Clipping + Lightning**: Clipping absorbs the lightning strike. 0.75s invuln prevents immediate re-strike
- **Auto Resurrect + Void**: Auto Resurrect triggers on void death. Player respawns on last platform
- **Platform Bounce + Air Dash**: Platform Bounce resets air dash availability. Can chain: bounce → air dash → double jump
- **Slow Fall + Low Gravity**: Effects stack. Very slow descent on low-gravity stages
- **Magnet + Moving Gems**: Magnet pulls gems even if they're on moving platforms
- **Coyote Boost + Jump Buffer**: Both active simultaneously. Extended coyote + buffer = very forgiving jump timing

### Expected Outcome

- Skills meaningfully change gameplay strategy without making the game trivial.
- Slot limit forces players to choose skills suited to specific stage challenges.
- Free skills reward progression milestones without economic cost.
- Skill interactions create emergent strategies for advanced players.

### Edge Cases

- **Clipping on first frame**: If player spawns into a hazard (shouldn't happen by design), Clipping still activates normally.
- **Auto Resurrect + immediate re-death**: If player respawns into a hazard (e.g., laser ON phase), they die again. Auto Resurrect is on cooldown and won't trigger twice.
- **Reflex Dash without Air Dash purchased**: Reflex Dash is independent. Champions get it free regardless of Air Dash ownership.
- **Unequip mid-run**: Not possible. Skills can only be changed on stage select or in store (not during gameplay).
- **Sell skill while equipped**: Skill is automatically unequipped on sell. Refund = purchase price.

---

## 10. Consumables

### Description

Consumables are temporary power-ups purchased with silver currency. They provide significant tactical advantages for a single stage session. Four types exist, each addressing different gameplay challenges. Consumables persist across retries but are only deducted from inventory on win or exit.

### How It Works

#### Triple Jump (10♦, ⬆️)

- **Effect**: Grants a 3rd jump mid-air (after double jump)
- **Cooldown**: 15 seconds between uses (real-time, not frame-based)
- **Activation**: Automatic — pressing jump a 3rd time while airborne triggers it
- **Interaction with Air Dash**: Triple Jump takes priority over Air Dash on the 3rd press. Air Dash moves to 4th press (if available)
- **Visual**: Third jump has distinct particle effect (upward sparkles)

#### Double Shield (15♦, 🛡️)

- **Effect**: Absorbs up to 2 hazard hits (spikes, lasers, lightning). Does NOT prevent void deaths
- **Grace period**: 0.33 seconds of invulnerability after each hit absorption
- **Visual**: Shield bubble around player. Cracks after first hit. Shatters on second
- **Interaction with Clipping**: Shield absorbs first, then Clipping activates on 3rd hit (if equipped)
- **Stacking**: Only 1 Double Shield active at a time. Cannot stack multiple

#### Time Freeze (12♦, ⏸)

- **Effect**: Freezes all lasers and moving platforms in their current state for 10 seconds
- **Cooldown**: 60 seconds between uses
- **Activation**: Manual — tap the ⏸ button that appears in HUD when consumable is active
- **What freezes**: Lasers (stuck ON or OFF), moving platforms (stop oscillating), pulse platform timers (pause cycle)
- **What doesn't freeze**: Player physics, gravity, enemies (none exist), weather particles
- **Visual**: Blue tint overlay on frozen objects. Timer countdown displayed

#### Name Change (50♦, ✏️)

- **Effect**: Allows player to change their display name
- **Constraints**: Same as onboarding (5-10 chars, alphanumeric, uppercase)
- **Behavior**: Instant use on purchase. Not stored as inventory item
- **Analytics**: Fires `name_set` event with new name
- **Limit**: Can be purchased and used unlimited times

#### Persistence Rules

- Consumables are "activated" at stage start and persist across all retries within that session
- Inventory count is only decremented when:
  - Player **wins** the stage (consumable considered "used")
  - Player **exits to stage select** (consumable considered "used")
- If player force-closes the app mid-run, consumable is NOT consumed (still in inventory on next launch)

### Expected Outcome

- Consumables provide temporary power without permanent investment.
- Each consumable addresses a specific challenge type (platforming, hazards, timing, identity).
- Persistence across retries means consumables aren't wasted on failed attempts.
- Deferred consumption encourages experimentation without fear of waste.

### Edge Cases

- **Triple Jump + Bouncy Platform**: Bouncy resets double jump but NOT triple jump cooldown. Triple jump cooldown is independent.
- **Double Shield + Auto Resurrect**: Shield absorbs first 2 hits. If a 3rd hit occurs and Clipping isn't equipped, Auto Resurrect triggers (if off cooldown). If on cooldown, player dies.
- **Time Freeze at level end**: Frozen state ends immediately on win. No carryover to next stage.
- **Name Change to same name**: Allowed. No validation against current name.
- **Consumable count = 0**: Cannot activate. Button grayed out in Quick Shop.

---


## 11. Cosmetics

### Description

Cosmetics are visual-only items purchased with silver currency. Over 30 items across 8 categories allow players to personalize their stickman character. Cosmetics have no gameplay impact — they are purely aesthetic. A tier system (Common to Master) creates aspirational goals and a sense of rarity.

### How It Works

#### Categories & Items

| Category | Items | Price Range |
|----------|-------|-------------|
| **Hat** | Top Hat (35♦), Horns (90♦), Cat Ears (100♦), Crown (300♦), Halo (250♦), Antenna (600♦) | 35-600♦ |
| **Cape** | White (40♦), Red (80♦), Rainbow (350♦), Fire (700♦) | 40-700♦ |
| **Glow** | Gold (80♦), Pink (80♦), Rainbow (800♦), Champion's Aura (free/champion) | 80-800♦ |
| **Trail** | Cyan (30♦), Fire (40♦), Ice (40♦), Rainbow (300♦), Glitch (1000♦) | 30-1000♦ |
| **Body** | Black (30♦), Gold (100♦), Pink (100♦), Rainbow (900♦) | 30-900♦ |
| **Death** | Pixelate (120♦), Dissolve (150♦), Supernova (400♦), Logo Shatter (1200♦) | 120-1200♦ |
| **Jump** | Sparks (50♦), Lightning (250♦) | 50-250♦ |
| **Platform** | Hologram (1500♦) | 1500♦ |

#### Tier System

| Tier | Price Range | Visual Indicator |
|------|-------------|-----------------|
| Common | 30-50♦ | White border |
| Uncommon | 80-150♦ | Green border |
| Rare | 250-400♦ | Blue border |
| Legendary | 600-1000♦ | Purple border |
| Master | 1200-1500♦ | Gold border with shimmer |

#### Cape Physics

- Capes react to player movement and jump direction
- On jump: cape trails downward (opposite to upward motion)
- On fall: cape billows upward
- On run: cape streams behind player
- Physics simulated per-frame using simple spring model

#### Equip Rules

- One item per category equipped at a time
- Equipping a new item in same category auto-unequips the previous
- All equipped cosmetics render simultaneously (hat + cape + glow + trail + body + jump + platform)
- Death cosmetics only trigger on death event
- Champion's Aura: Free for champions, cannot be purchased

### Expected Outcome

- Visual customization with no gameplay impact ensures fairness.
- Tier system creates aspirational goals that drive silver spending.
- Cape physics adds satisfying visual feedback to movement.
- Character portrait on stage select shows full loadout as preview.

### Edge Cases

- **Sell equipped cosmetic**: Item is unequipped, then sold. Refund = purchase price.
- **Champion's Aura without champion status**: Cannot be equipped. Grayed out in store.
- **Multiple trails**: Only one trail active. New equip replaces old.
- **Death cosmetic + Auto Resurrect**: Death cosmetic does NOT play on Auto Resurrect trigger (player doesn't actually die). Only plays on true death.
- **Platform cosmetic (Hologram)**: Changes visual appearance of all platforms in the stage. Purely visual — no hitbox changes.

---

## 12. Weather System

### Description

Five weather types add visual variety and subtle physics modifications to stages. Weather is fixed per stage (not random) and contributes to each stage's unique identity. Particle effects scale with the player's visual quality setting.

### How It Works

#### Weather Types

| Weather | Visual Effect | Physics Effect | Stages |
|---------|--------------|----------------|--------|
| **Clear** | No particles | Normal physics | Neon Abyss, Magma Core, Void Walker, Solar Flare, Mirror City, Ghost Line, Obsidian, Terminal, Starlight |
| **Rain** | Blue diagonal streaks falling | Friction reduced (slippery) | Cyber Rain, Toxic Swamp, Deep Ocean, Bio Lab |
| **Snow** | White particles drifting down | Friction increased (grippy) | Crystal Spire, Frost Byte, Aurora Veil |
| **Storm** | Rain + lightning flashes + random strikes | Slippery + lightning hazard (15-25s) | Voltage, Glitch Zone |
| **Dust** | Brown/tan particles blowing horizontally | Friction reduced | Rust Belt, Dust Storm |

#### Particle Rendering

- **High quality**: Full particle count (50-100 particles on screen)
- **Medium quality**: 50% particle count
- **Low quality**: 25% particle count (or disabled entirely)
- Particles are canvas-rendered, not DOM elements
- Each particle has: position, velocity, opacity, size, color
- Particles recycle when off-screen (object pooling)

#### Storm Lightning

- Background flashes: Random white screen flash every 8-15 seconds (visual only, no damage)
- Lightning strikes: Damaging bolt every 15-25 seconds (see Hazards section)
- Flash and strike are independent events (flash does not always precede strike)

### Expected Outcome

- Weather adds visual variety and subtle physics changes per stage.
- Storm weather creates unique tension with unpredictable lightning.
- Particle count scaling ensures smooth performance on low-end devices.
- Weather is predictable per stage (not random), allowing players to prepare.

### Edge Cases

- **Storm + Time Freeze**: Lightning strike timer pauses during Time Freeze. No strikes while frozen.
- **Rain/Dust + Slow Fall**: Friction reduction stacks with Slow Fall's velocity halving. Player moves very slowly horizontally while falling.
- **Snow + high friction stage**: Frost Byte (0.92 friction + snow) creates maximum grip. Player stops almost instantly.
- **Particles during pause**: Particles freeze in place during pause. Resume on unpause.

---

## 13. Day/Night Cycle

### Description

Each stage features a dynamic day/night cycle that changes the visual atmosphere during gameplay. The cycle is purely cosmetic — it does not affect physics, hazards, or collectibles. Atmospheric overlays unique to each stage add additional visual depth.

### How It Works

#### Cycle Timing

- **Day duration**: 1 minute (60 seconds)
- **Night duration**: 1 minute (60 seconds)
- **Total cycle**: 2 minutes
- **Start offset**: Random per-stage (deterministic based on stage index). Some stages start at day, others at night
- **Transition**: Smooth gradient interpolation between day and night sky colors over ~5 seconds

#### Visual Elements

- **Sun**: Rendered during day phase. Circular overlay with glow, positioned at top of canvas
- **Moon**: Rendered during night phase. Crescent or full moon with subtle glow
- **Stars**: Only visible during night phase. Twinkling point lights scattered across sky
- **Sky gradient**: Interpolates between stage's day colors and darker night variants

#### Atmospheric Overlays (per-stage)

Each stage has a unique atmospheric effect layered on top of the base rendering:

| Stage(s) | Overlay | Description |
|----------|---------|-------------|
| Magma Core | Embers | Orange particles rising upward |
| Deep Ocean | Bubbles | Translucent circles floating up |
| Aurora Veil | Aurora ribbons | Wavy colored bands across sky |
| Starlight | Shooting stars | Occasional diagonal streaks |
| Glitch Zone | Glitch artifacts | Random rectangular distortion |
| Ghost Line | Wisps | Faint floating orbs |
| Mirror City | Window lights | Rectangular lights in background |
| Bio Lab | Fog | Low-opacity horizontal bands |
| Terminal | Matrix code | Falling green characters |

### Expected Outcome

- Dynamic visual atmosphere that changes during gameplay without affecting mechanics.
- Each stage feels alive and unique due to its atmospheric overlay.
- Night phases create moodier visuals; day phases are brighter and more readable.
- Cycle is slow enough (2 min) that players experience both phases in a typical session.

### Edge Cases

- **Very fast clear (<30s)**: Player may only see one phase. This is acceptable — the cycle is ambient, not gameplay-critical.
- **Pause during transition**: Cycle timer pauses. Transition resumes from exact point on unpause.
- **Low visual quality**: Atmospheric overlays disabled or reduced. Day/night gradient still active.
- **Ghost replay**: Day/night cycle runs independently during replay (not synced to recording time).

---

## 14. 20 Themed Levels

### Description

N3ON DashJ contains 20 handcrafted levels, each with a unique combination of visual theme, physics profile, weather, platform count, and difficulty rating. Levels are grouped into four difficulty tiers that create a progressive challenge curve from tutorial stages to endgame gauntlets.

### How It Works

#### Level Data Table

| # | Name | Difficulty | Weather | Gravity | Friction | Jump | Platforms | Moving | Gap Range |
|---|------|-----------|---------|---------|----------|------|-----------|--------|-----------|
| 1 | Neon Abyss | STARTER | clear | 0.6 | 0.85 | -13 | 20 | 0 | 60-100 |
| 2 | Cyber Rain | STARTER | rain | 0.6 | 0.82 | -13 | 22 | 1 | 60-100 |
| 3 | Crystal Spire | SIMPLE | snow | 0.55 | 0.88 | -13 | 25 | 1 | 70-120 |
| 4 | Magma Core | SIMPLE | clear | 0.65 | 0.8 | -12 | 18 | 1 | 60-110 |
| 5 | Toxic Swamp | SIMPLE | rain | 0.6 | 0.85 | -13 | 24 | 1 | 70-120 |
| 6 | Void Walker | SIMPLE | clear | 0.5 | 0.9 | -14 | 30 | 1 | 80-140 |
| 7 | Solar Flare | MODERATE | clear | 0.7 | 0.78 | -12 | 20 | 1 | 60-100 |
| 8 | Deep Ocean | MODERATE | rain | 0.6 | 0.85 | -13 | 26 | 2 | 70-120 |
| 9 | Voltage | MODERATE | storm | 0.6 | 0.85 | -13 | 20 | 2 | 70-110 |
| 10 | Rust Belt | MODERATE | dust | 0.65 | 0.8 | -12 | 22 | 2 | 60-110 |
| 11 | Frost Byte | MODERATE | snow | 0.5 | 0.92 | -14 | 28 | 2 | 80-130 |
| 12 | Aurora Veil | MODERATE | snow | 0.55 | 0.88 | -13 | 24 | 3 | 70-120 |
| 13 | Bio Lab | MODERATE | rain | 0.6 | 0.85 | -13 | 24 | 2 | 70-120 |
| 14 | Dust Storm | MODERATE | dust | 0.7 | 0.75 | -11 | 18 | 2 | 50-90 |
| 15 | Mirror City | HARD | clear | 0.6 | 0.85 | -13 | 28 | 3 | 80-140 |
| 16 | Glitch Zone | HARD | storm | 0.6 | 0.85 | -13 | 28 | 3 | 80-140 |
| 17 | Starlight | HARD | clear | 0.5 | 0.9 | -15 | 35 | 3 | 90-160 |
| 18 | Ghost Line | HARD | clear | 0.6 | 0.85 | -13 | 32 | 2 | 80-140 |
| 19 | Obsidian | HARD | clear | 0.6 | 0.85 | -13 | 30 | 3 | 80-140 |
| 20 | Terminal | HARD | clear | 0.6 | 0.85 | -13 | 30 | 3 | 80-140 |

#### Difficulty Tiers

| Tier | Stages | Characteristics |
|------|--------|----------------|
| **STARTER** | 1-2 | No pulse platforms, minimal hazards, 0-1 moving platforms, short levels (20-22 platforms) |
| **SIMPLE** | 3-6 | No pulse platforms, moderate hazards, 1 moving platform, medium levels (18-30 platforms) |
| **MODERATE** | 7-14 | 12% pulse platforms, full hazards, 1-3 moving platforms, varied physics extremes |
| **HARD** | 15-20 | 22% pulse platforms, full hazards, 2-3 moving platforms, long levels (28-35 platforms), ziplines |

#### Unlock Progression

- Stage 1: Always unlocked
- Clearing a stage unlocks the next 2 stages
- Example: Clear stage 1 → stages 2 & 3 unlock. Clear stage 2 → stages 3 & 4 unlock
- All 20 stages can be unlocked by clearing stages 1-10 in sequence

#### Per-Stage Visual Identity

Each stage has unique:
- Sky gradient (2-3 color stops for day, darker variants for night)
- Grid color (perspective grid on ground)
- Accent color (platforms, UI elements)
- Particle color (gems, effects)
- Background type (atmospheric overlay)

### Expected Outcome

- Progressive difficulty curve from tutorial (STARTER) to endgame (HARD).
- Each stage feels visually and mechanically distinct.
- Unlock system encourages sequential play while allowing skip-ahead via multi-unlock.
- Physics variety prevents repetitive gameplay across the 20 stages.

### Edge Cases

- **Unlock gap**: If player clears stage 5 but not 3 or 4, stages 6 & 7 still unlock. Unlock is based on any clear, not sequential.
- **All stages already unlocked**: Clearing a stage that would unlock already-unlocked stages has no additional effect.
- **Stage generation determinism**: Platform positions are generated from stage parameters (not random). Same stage always produces same layout.

---


## 15. Champion / Master System

### Description

The Champion system is the endgame milestone of N3ON DashJ. Achieving Champion status requires clearing all 20 stages at least once and unlocks a significant layer of new content, rewards, and gameplay modifiers. It serves as the primary long-term goal for dedicated players.

### How It Works

#### Unlock Condition

- **Requirement**: Complete all 20 stages at least once (any time, any score)
- **Check timing**: Evaluated after every level_complete event
- **Permanence**: Once achieved, Champion status is permanent and cannot be revoked

#### Rewards Granted

| Reward | Type | Description |
|--------|------|-------------|
| ★ MASTER badge | Visual | Displayed on stage select and share cards |
| Champion's Aura | Cosmetic (Glow) | Free glow cosmetic, exclusive to champions |
| Clipping skill | Skill (free) | Granted without gold cost |
| Reflex Dash | Skill (free, no slot) | Does not consume equip slot. Toggleable |
| 1.5× silver multiplier | Economy | All silver arc gem collection yields 50% more |
| Master Gems visible | Content | 40 hidden rainbow gems appear across all stages |
| Daily Master Chip +5 gold | Economy | Daily chip awards gold instead of silver |

#### Champion Ceremony

- **Confetti animation**: 70 DOM-based particles burst from screen center with physics (gravity, random velocity, rotation)
- **Gold-themed share card**: 600×380 PNG generated with career stats
- **Career stats display**: Total time played, total deaths, total matches, stages cleared, gold collected
- **Music**: Victory arpeggio plays (extended version)

### Expected Outcome

- Champion status is a meaningful endgame goal that unlocks significant rewards.
- Master Gems create a new content layer (40 additional collectibles) for champions to pursue.
- Reflex Dash (no slot cost) is a powerful reward that doesn't force skill re-configuration.
- 1.5× silver multiplier accelerates cosmetic acquisition for endgame players.

### Edge Cases

- **Champion on stage 20 first clear**: If player clears stages 1-19 first, then clears 20, champion triggers immediately on stage 20 win.
- **Import data with champion**: Imported save with all stages cleared triggers champion check on load. Ceremony does NOT replay.
- **Reflex Dash + Air Dash**: Mutual exclusion. If Air Dash is equipped when Reflex Dash unlocks, player is notified but no auto-swap occurs.
- **Already own Clipping**: If player purchased Clipping before champion, gold is NOT refunded (skill was already usable).

---

## 16. Player Rank System

### Description

The rank system provides a long-term progression indicator that grows with all player activities. Six tiers from Iron Spark to Cyber Legend give players a sense of advancement beyond individual stage completion.

### How It Works

#### Rank Tiers

| Tier | Icon | Score Threshold | Description |
|------|------|----------------|-------------|
| Iron Spark | ⚡ | 0 | Starting rank for all players |
| Bronze Node | 🔶 | 200 | Early progression milestone |
| Silver Circuit | ⚡ | 800 | Intermediate player |
| Gold Dash | 🥇 | 2,500 | Experienced player |
| Neon Runner | 🏃 | 5,500 | Advanced player |
| Cyber Legend | 👑 | 9,500 | Elite/completionist |

#### Score Formula

```
rankScore = (totalGold × 50) + (silverWallet × 5) + (clearPct × 10) + (matches × 2)
```

Where:
- `totalGold` = bonusGold + totalGoldChipsCollected - goldSpent (effective gold balance)
- `silverWallet` = current silver balance
- `clearPct` = percentage of 20 stages cleared (0-100)
- `matches` = total stage attempts across all stages

#### UI Presentation

- **Stage select chip**: Small badge showing current tier icon + name. Always visible
- **Clickable popup**: Tap chip → overlay showing:
  - All 6 tiers listed with thresholds
  - Current score highlighted with progress bar to next tier
  - Score breakdown showing contribution from each component
  - Percentage progress to next tier

### Expected Outcome

- Players have a persistent sense of progression that grows with all activities.
- Rank is visible at a glance on the main hub screen.
- Score formula rewards diverse play (collecting, clearing, replaying) rather than single-focus grinding.

### Edge Cases

- **Score decrease**: Spending gold/silver reduces rankScore. Player can technically drop a tier. UI updates immediately.
- **Max rank**: Cyber Legend has no upper bound. Score continues accumulating beyond 9,500.
- **New player**: Starts at Iron Spark (0). First few matches quickly push to Bronze Node.
- **Rank during offline**: Rank is calculated client-side from local data. No server validation.

---

## 17. Ghost Replay System

### Description

The Ghost Replay system records the player's best run on each stage and plays it back as a translucent rival during subsequent attempts. This creates a self-competition mechanic where players race against their own previous performance.

### How It Works

#### Recording

- **Data captured per frame**: `{x, y, face, at, djU}` (position, facing direction, airtime, double-jump used)
- **Storage**: Saved in localStorage under per-stage ghost key
- **Save conditions**: Ghost data is saved when:
  - Player wins with a new best time (faster than previous recording)
  - Player wins and no previous recording exists for that stage
- **Size management**: Ghost data can be large for long runs. Replay inflation fix migration handles oversized data

#### Playback

- **Visual**: Translucent stickman (50% opacity) with same proportions as player character
- **Rendering**: Ghost renders all cosmetics that were equipped during the recording
- **Behavior**: Follows recorded frame data exactly. Does not interact with platforms or hazards
- **Pause interaction**: Ghost freezes in place during pause. Resumes from same frame on unpause
- **Toggle**: 👻 button in gameplay HUD hides/shows ghost mid-run

#### Watch Replay Mode

- **Activation**: "WATCH" button on level complete overlay
- **Behavior**: Camera follows ghost data playback without player input
- **Restrictions**: No scoring, no analytics events fired, no gem collection
- **Exit**: Auto-returns to stage select when replay completes. Can exit early via back button

#### Settings

- **Global toggle**: Ghost Replay can be disabled entirely in Settings
- **Per-stage**: Ghost only appears on stages where a recording exists
- **Unlock requirement**: Ghost Rival skill must be unlocked (clear stages 1 & 2)

### Expected Outcome

- Players can visually compare their current run against their best performance.
- Ghost creates motivation to improve times without external leaderboards.
- Watch Replay allows players to study their best routes.
- Toggle ensures ghost doesn't distract players who prefer clean runs.

### Edge Cases

- **Ghost faster than player**: Ghost reaches finish and disappears. No special behavior.
- **Ghost on modified stage**: If stage generation changes (version update), old ghost data may not align with new platform positions. Ghost still plays but may appear to float/clip.
- **Export/Import ghost data**: Export dialog offers optional ghost data inclusion. Large ghost data significantly increases export file size.
- **Multiple devices**: Ghost data is local only. Cloud sync does NOT include ghost recordings.

---

## 18. Store / Economy

### Description

The store is the central marketplace for purchasing skills, cosmetics, and consumables. It uses a dual-currency system where gold (scarce) buys permanent skills and silver (abundant) buys cosmetics and consumables.

### How It Works

#### Currencies

| Currency | Symbol | Sources | Uses |
|----------|--------|---------|------|
| **Gold** (★) | g | Gold gems (first-time), Master gems (+2), Daily chip (champions: +5), Daily chest (30% chance: 2-5) | Skills (10-30g each) |
| **Silver** (♦) | ♦ | Silver arc gems (every run), Daily chip (non-champions: +5), Daily chest (70% chance: 15-40) | Cosmetics (30-1500♦), Consumables (10-50♦) |

#### Gold Balance Calculation

```
effectiveGold = bonusGold + totalGoldChipsCollected - goldSpent
```

- `bonusGold`: Gold from master gems, daily chips, daily chest
- `totalGoldChipsCollected`: Permanent count of unique gold gems collected
- `goldSpent`: Cumulative gold spent on skills

#### Store Tabs

| Tab | Currency | Contents |
|-----|----------|----------|
| Consumables | Silver | Triple Jump, Double Shield, Time Freeze, Name Change |
| Cosmetics | Silver | 30+ items across 8 categories with tier badges |
| Skills | Gold | 7 purchasable skills with equip/unequip toggles |

#### Shopkeeper NPC

- Animated character displayed in store header
- Displays one of 50 random tips/quips on each store visit
- Tips rotate on tab switch or store re-open
- Purely cosmetic/entertainment — no gameplay function

#### Buy/Sell/Equip Mechanics

- **Buy**: Deducts currency, adds item to inventory. Immediate
- **Sell**: Returns full purchase price. Item removed from inventory and unequipped if active
- **Equip**: Toggle on. For skills: checks 3-slot limit. For cosmetics: auto-unequips same category
- **Unequip**: Toggle off. No cost

#### Quick Shop

- Accessible from pause menu during gameplay
- Shows consumables only (not cosmetics or skills)
- Allows purchasing and activating consumables mid-session
- Consumable activation follows same persistence rules (consumed on win/exit)

### Expected Outcome

- Gold scarcity makes skill purchases meaningful decisions.
- Silver abundance allows cosmetic experimentation without anxiety.
- Shopkeeper NPC adds personality to the store experience.
- Quick Shop enables tactical consumable use without leaving a run.

### Edge Cases

- **Buy skill with exactly enough gold**: Purchase succeeds. Balance goes to 0. No negative balance possible.
- **Sell last equipped skill**: Skill unequipped and sold. Equip slot freed.
- **Quick Shop during Time Freeze**: Time Freeze countdown pauses during pause menu (including Quick Shop).
- **Store while consumable active**: Consumable inventory shows current count minus activated ones.

---

## 19. Daily Rewards

### Description

Two daily reward systems create recurring engagement hooks: the Daily Chest (random rewards once per 24 hours) and the Daily Master Chip (a collectible gem on a rotating stage). Both reset on calendar day boundaries.

### How It Works

#### Daily Chest

- **Availability**: Once per 24-hour period (tracked by last claim timestamp)
- **UI**: 🎁 button on stage select. Glows/pulses when available. Dimmed when claimed
- **Reward table**:

| Roll | Probability | Reward |
|------|-------------|--------|
| Gold | 30% | 2-5 gold (random within range) |
| Silver | 70% | 15-40 silver (random within range) |
| Consumable bonus | 15% (additional roll) | +1 random consumable (Triple Jump, Double Shield, or Time Freeze) |

- **Animation**: Chest open animation with reward reveal. Particles match reward type color
- **Claim**: Single tap to open. Reward added to wallet immediately

#### Daily Master Chip

- **Stage selection formula**: `(dateHash + playerIDHash) % unlockedStageCount`
  - `dateHash`: Deterministic hash of current calendar date (YYYY-MM-DD)
  - `playerIDHash`: Hash of player's PID
  - Result: Same player sees same daily stage each day. Different players may see different stages
- **Placement**: Mid-stage on a specific platform (deterministic position)
- **Visual**: Diamond-shaped 💎 chip with glow effect. Distinct from regular gems
- **Reward on collection**:
  - Champions: +5 gold
  - Non-champions: +5 silver
- **Stage select indicator**: 💎 overlay on the daily stage's dot. ✓ checkmark after claimed
- **Eligibility**: Stage must be unlocked. Cannot collect on locked stages

### Expected Outcome

- Daily Chest creates a simple "log in and claim" habit loop.
- Daily Master Chip encourages playing a specific stage each day, adding variety.
- Combined daily rewards provide meaningful currency income for regular players.
- Deterministic rotation ensures fairness (not purely random).

### Edge Cases

- **Timezone handling**: Daily reset based on local device clock (midnight local time).
- **Clock manipulation**: No server-side validation of daily chest timing. Client-trusted.
- **Daily chip on already-mastered stage**: Chip still appears and can be collected for daily reward regardless of stage completion history.
- **All stages locked except 1**: Daily chip always appears on stage 1 (only unlocked stage).
- **Chest + chip same day**: Both can be claimed independently. No interaction between them.

---

## 20. Share System

### Description

The share system generates personalized PNG images that players can share on social media or messaging apps. Two share card types exist: stage clear cards (per-stage) and champion cards (one-time achievement).

### How It Works

#### Stage Clear Share Card

- **Dimensions**: 600×400 pixels (PNG)
- **Content**:
  - Player's stickman character with equipped cosmetics (rendered on canvas)
  - Stage name and difficulty badge
  - Completion time (mm:ss.ms)
  - Score achieved
  - Gold gems collected on this run
  - Game branding/logo
  - Stage theme colors as background
- **Generation**: Canvas API renders all elements, then `toDataURL('image/png')` exports

#### Champion Share Card

- **Dimensions**: 600×380 pixels (PNG)
- **Content**:
  - Gold-themed background with particle effects
  - ★ MASTER badge prominently displayed
  - Career stats: total time, total deaths, total matches, stages cleared
  - Player name
  - Game branding
- **Trigger**: Generated once on champion ceremony. Can be re-shared from stage select

#### Sharing Flow

1. Player taps ↗ Share button (stage select) or share prompt (win/champion overlay)
2. Custom message textarea appears with pre-filled default text
3. Player can edit message or keep default
4. Share executes via:
   - **Primary**: Web Share API (`navigator.share()`) with file attachment (PNG blob)
   - **Fallback** (if Web Share unavailable): Message copied to clipboard + PNG downloaded as file

### Expected Outcome

- Personalized share images drive organic social growth.
- Character cosmetics in share cards incentivize cosmetic purchases (social display).
- Web Share API provides native sharing UX on mobile devices.
- Fallback ensures sharing works on all platforms (desktop browsers without Web Share).

### Edge Cases

- **Share uncleared stage**: Share button hidden/disabled for stages without a completion.
- **Web Share API rejection**: If user cancels native share dialog, no error shown. Silent fail.
- **Very long player name**: Name is always 5-10 chars (enforced at input), so layout is consistent.
- **Share without cosmetics**: Default stickman (no cosmetics) renders cleanly on share card.

---


## 21. Save System

### Description

N3ON DashJ persists all player progress in the browser's localStorage using XOR encryption. A versioned migration system ensures backward compatibility as the game evolves. Export/import functionality enables device transfer without cloud accounts.

### How It Works

#### Storage Format

- **Location**: `localStorage` with key prefix `ndj_*`
- **Encryption**: XOR cipher with key `'n3j8x2qf'` applied to the JSON string before storage
- **Versioning**: `GAME_VERSION` integer stored alongside data. Incremented on breaking changes
- **Decryption on load**: Read raw string → XOR decrypt → JSON.parse → validate structure

#### Data Migrations

On load, if stored `GAME_VERSION` < current `GAME_VERSION`, migrations run sequentially:

| Migration | Purpose |
|-----------|---------|
| Reflex Dash refund | Removes old reflex dash purchase, refunds gold if applicable |
| Shield/TimeFreeze removal | Removes deprecated consumable types from inventory |
| Ghost Rival refund | Refunds gold if Ghost Rival was previously purchased (now free) |
| bestChips packing | Converts per-stage chip arrays from sparse to packed format |
| Replay inflation fix | Trims oversized ghost replay data that accumulated from a bug |
| Bonus gold credit | Credits bonus gold for master gems/daily chips collected before tracking was added |

#### Export

- **Format**: JSON blob containing full game state
- **Integrity**: SHA-256 hash of the data appended as checksum
- **Ghost data**: Optional inclusion toggle (ghost recordings can be very large)
- **Delivery**: Downloaded as `.json` file via blob URL

#### Import

- **Input methods**: File picker (browse for .json) or paste raw JSON into textarea
- **Validation**: Hash checksum verified before applying
- **Migration**: Imported data runs through all applicable migrations
- **Application**: Full state replacement → page reload to reinitialize

### Expected Outcome

- Progress persists across browser sessions without any server dependency.
- Export/import enables device transfer and backup without cloud accounts.
- Migrations ensure players never lose progress due to game updates.
- XOR encryption prevents casual tampering (not cryptographically secure, but sufficient for deterrence).

### Edge Cases

- **Corrupted localStorage**: If XOR decryption fails or JSON.parse throws, game resets to fresh state with onboarding.
- **Import with higher GAME_VERSION**: If imported data has a version higher than current app, import is rejected with error message.
- **Export without ghost data**: Significantly smaller file size. Ghost data can be 10-100× larger than game state.
- **Browser storage quota**: If localStorage is full, save silently fails. No user-facing error (rare edge case).
- **Incognito/private mode**: localStorage works but is cleared on session end. Player warned if detected.

---

## 22. Cloud Sync

### Description

Cloud sync enables cross-device progress sharing without traditional email/password accounts. Players authenticate using a combination of username, birth month/year, and a 4-digit PIN. Data is encrypted at rest and merged intelligently to handle conflicts between devices.

### How It Works

#### Authentication

- **Credentials**: Username + birth month/year (mmyy format) + 4-digit PIN
- **Key derivation**: `HMAC-SHA256(username + mmyy, pin)` → produces a unique key hash
- **No account creation step**: First sync/save with a new key hash implicitly creates the account
- **Device registration**: Each device gets a unique device ID. Max 3 devices per account

#### Sync Triggers

- Auto-sync fires on significant events (level complete, purchase, daily claim)
- Debounced: minimum 30 seconds between sync attempts
- Manual sync available in settings

#### Merge Strategy

When loading data from cloud that differs from local:

| Data Type | Strategy | Rationale |
|-----------|----------|-----------|
| Best scores | max(local, cloud) | Keep highest achievement |
| Best times | min(local, cloud) | Keep fastest time |
| Unlocked stages | union(local, cloud) | Never lose progress |
| Stats (matches, deaths) | max(local, cloud) | Monotonically increasing |
| Silver wallet | max(local, cloud) | Prevent loss from spending on another device |
| Skills owned | union(local, cloud) | Never lose purchases |
| Cosmetics owned | union(local, cloud) | Never lose purchases |

#### Pending Purchases

- If a purchase is made offline, it's queued as a "pending purchase"
- On next sync, server validates the purchase (sufficient currency at time of sync)
- If invalid (e.g., currency spent on another device), purchase is rolled back locally

### Expected Outcome

- Seamless cross-device progress without email/password friction.
- Merge strategy ensures players never lose progress regardless of which device they play on.
- Device limit (3) prevents abuse while accommodating phone + tablet + desktop.
- Encryption at rest protects player data on the server.

### Edge Cases

- **Forgotten PIN**: POST /sync/change-pin endpoint allows PIN change with correct username + mmyy.
- **Device limit reached**: 4th device sync attempt rejected. Player must clear devices (change PIN clears all device IDs).
- **Simultaneous edits**: Last-write-wins for non-mergeable fields. Merge strategy handles most conflicts.
- **Offline for extended period**: Large divergence between local and cloud. Merge still applies field-by-field.
- **Lockout**: 10 failed authentication attempts → 1 hour lockout on that key hash.

---

## 23. Settings

### Description

N3ON DashJ provides comprehensive settings accessible from two contexts: the stage select screen (full settings) and the in-game pause menu (gameplay-relevant subset). Per-orientation control layouts are saved independently.

### How It Works

#### Stage-Select Settings

| Setting | Options | Default |
|---------|---------|---------|
| SFX | On / Off | On |
| Music | On / Off | On |
| Visual Quality | High / Medium / Low | High |
| Show FPS | On / Off | Off |
| Ghost Replay | On / Off | On |
| Controls | Arrows / Joystick | Arrows |
| Vibration | On / Off | On |
| Orientation | Auto / Landscape / Portrait | Auto |
| Auto-retry | None / Instant / 0.5s / 1s / 2s | None |
| Export | — | Triggers export flow |
| Import | — | Triggers import flow |
| Reset | — | Clears all data (with confirmation) |
| Restart | — | Reloads the app |

#### In-Game Pause Settings

| Setting | Options | Notes |
|---------|---------|-------|
| Visual Quality | High / Medium / Low | Immediate effect |
| Show FPS | On / Off | Toggle overlay |
| Orientation | Auto / Landscape / Portrait | May trigger layout change |
| Vibration | On / Off | Immediate |
| Controls | Arrows / Joystick | Changes control scheme |
| Auto-retry | None / Instant / 0.5s / 1s / 2s | For next death |
| Adjust Layout | Drag mode | Drag control elements to reposition |
| Quick Shop | — | Opens consumable purchase |
| Retry Level | — | Restarts current stage |

#### Per-Orientation Layouts

- Control element positions (buttons, joystick) saved separately for portrait and landscape
- Switching orientation loads the corresponding layout
- "Adjust Layout" mode allows free-drag repositioning of all control elements
- Positions stored as percentage offsets (responsive to screen size changes)

### Expected Outcome

- Full customization of audio, visual, and control preferences.
- In-game settings allow adjustments without returning to stage select.
- Per-orientation layouts ensure optimal control placement regardless of how the device is held.
- Adjust Layout provides accessibility for players with different hand sizes or grip styles.

### Edge Cases

- **Reset during cloud sync**: Reset clears local data. Cloud data remains. Next sync would restore cloud data unless player also changes PIN.
- **Quality change mid-run**: Particle count adjusts immediately. No frame skip or stutter.
- **Orientation lock + device rotation**: If orientation is locked to landscape, portrait rotation is ignored.
- **Auto-retry + Auto Resurrect**: Auto Resurrect triggers first. If it's on cooldown and player dies, auto-retry timer starts.

---

## 24. Audio & Music

### Description

All audio in N3ON DashJ is procedurally generated using the Web Audio API — no audio files are loaded. This keeps the app size minimal while providing responsive, dynamic sound effects and per-stage music that adapts to gameplay.

### How It Works

#### Sound Effects (SFX)

| Event | Waveform | Frequency Sweep | Duration |
|-------|----------|----------------|----------|
| Jump | Square | 440 → 880 Hz | ~100ms |
| Land | Sine | 200 → 50 Hz | ~80ms |
| Die | Sawtooth | 100 → 20 Hz | ~300ms |
| Win | Arpeggio | Multi-note sequence | ~500ms |
| Coin (gem) | Sine | 1000 → 1800 Hz | ~100ms |

- All SFX use `OscillatorNode` + `GainNode` with exponential ramp
- Volume controlled by global SFX toggle
- Web Audio context created on first user interaction (browser autoplay policy)

#### Vibration Patterns

| Event | Pattern (ms) | Description |
|-------|-------------|-------------|
| Jump | 15 | Single short pulse |
| Double Jump | 10 | Lighter pulse |
| Gold gem | 20 | Medium pulse |
| Silver gem | 10 | Light pulse |
| Death | [30, 30, 60] | Staccato burst |
| Win | [50, 50, 50, 50, 100] | Celebratory sequence |

- Uses `navigator.vibrate()` API
- Disabled on devices without vibration support
- Controlled by Vibration toggle in settings

#### Procedural Music

- **Structure**: 5 musical scales × 5 tempos × 5 synth types
- **Per-stage selection**: `SCALES[curLvl % 5]` determines the scale for each stage
- **Menu music**: Ambient sine wave pad (low volume, slow modulation)
- **Gameplay music**:
  - Kick drum on every 4th beat (low-frequency sine burst)
  - Melodic notes selected from stage's scale with probabilistic skipping
  - Tempo tied to stage difficulty (faster = harder stages)
  - Synth type rotates per stage group
- **Transitions**: Crossfade between menu and gameplay music over ~500ms

### Expected Outcome

- Responsive audio feedback for every player action.
- Unique musical feel per stage without loading audio files.
- Vibration adds tactile feedback on supported devices.
- Zero audio file downloads — entire audio system is <2KB of code.

### Edge Cases

- **Web Audio suspended**: Context starts suspended on mobile. First tap/click resumes it. SFX before first interaction are silently dropped.
- **Background tab**: Audio context may be suspended by browser when tab is backgrounded. Resumes on focus.
- **Vibration on desktop**: `navigator.vibrate()` returns false or is undefined. No error thrown.
- **Music + SFX off**: Both can be independently toggled. Music off = no procedural music. SFX off = no oscillator triggers.

---

## 25. PWA & Offline

### Description

N3ON DashJ is a Progressive Web App that can be installed to the home screen and played fully offline after the initial load. A Service Worker manages caching, updates, and offline fallback.

### How It Works

#### Web App Manifest

- **File**: `manifest.webmanifest`
- **Display mode**: `standalone` (no browser chrome)
- **Orientation**: `landscape` (preferred)
- **Theme color**: Matches game's primary neon color
- **Icons**: Multiple sizes for various device requirements

#### Service Worker Strategy

| Resource Type | Strategy | Rationale |
|--------------|----------|-----------|
| HTML (index.html) | Network-first | Always get latest version if online |
| JS/CSS assets | Cache-first | Immutable once versioned |
| Manifest/icons | Cache-first | Rarely change |
| API calls (analytics) | Network-only | No caching for events |

#### Cache Versioning

- **Cache name**: `n3ondashj-v1.2.47` (includes app version)
- **On update**: New SW installs with new cache name. Old cache deleted on activation
- **Precache**: All critical assets cached on SW install

#### Update Flow

1. Browser detects new Service Worker (different content hash)
2. New SW installs in background (downloads new assets)
3. New SW enters "waiting" state
4. Game detects waiting SW → shows update banner: "Update available! Tap to refresh"
5. Player taps banner → `skipWaiting()` + page reload
6. Old cache cleaned up by new SW's activate event

#### Install Prompt

- `beforeinstallprompt` event captured on load
- INSTALL button shown in Settings when prompt is available
- Tapping INSTALL triggers the native browser install dialog
- After install, button hidden (app is installed)

### Expected Outcome

- Full offline play after first load — no internet required for gameplay.
- Automatic updates when online — player always gets latest version on next launch.
- Install to home screen provides native app experience.
- Cache-first strategy ensures instant load times for returning players.

### Edge Cases

- **SW registration failure**: Game works normally without SW. No offline support, no update detection.
- **Cache storage full**: Old caches may fail to delete. SW handles gracefully with try/catch.
- **Multiple tabs**: Only one tab controls the SW. Update applies to all tabs on next navigation.
- **iOS Safari**: Limited SW support. Cache works but no install prompt (use "Add to Home Screen" manually).

---


## 26. Score System

### Description

The score system rewards players for speed, collection, and skillful play. A composite formula combines multiple performance metrics into a single score per run, creating replayability as players optimize their approach.

### How It Works

#### Score Formula

```
score = distance/10 + (gold × 50) + (silver × 10) + (style × 5) - (deaths × 10) + max(0, floor(300 - runTime/1000))
```

| Component | Calculation | Incentive |
|-----------|-------------|-----------|
| Distance | Total pixels traveled / 10 | Rewards progress even on failed runs |
| Gold gems | Count × 50 | Rewards exploration and collection |
| Silver gems | Count × 10 | Rewards arc gem routing |
| Style points | Total × 5 | Rewards skillful play (combos, edge landings) |
| Death penalty | Deaths × -10 | Penalizes careless play |
| Time bonus | max(0, 300 - seconds) | Rewards fast completion (bonus disappears after 5 min) |

#### Style Points

Style points are earned through skillful actions during gameplay:

| Action | Points | Trigger |
|--------|--------|---------|
| Combo x2 | +10 | 2 gems in quick succession |
| Combo x3 | +20 | 3 gems in quick succession |
| Combo x4 | +40 | 4+ gems in quick succession |
| Edge landing ("EDGE!") | +15 | Landing within 5px of platform edge |
| Close call ("CLOSE!") | +10 | Passing within 10px of a hazard without dying |

#### Score Persistence

- Best score per stage saved in `bestScores` array
- Score displayed on level complete overlay
- Score contributes to rank calculation
- Score shown on stage select info panel

### Expected Outcome

- Score rewards speed, collection, and skillful play simultaneously.
- Time bonus creates urgency without being punishing (caps at 5 minutes).
- Style points reward risk-taking (edge landings, close calls).
- Death penalty discourages reckless play without being devastating.

### Edge Cases

- **Negative score**: Theoretically possible with many deaths and no collection. Clamped to 0 minimum on display.
- **Score on retry**: Each retry within a session calculates independently. Best score across all retries is saved.
- **Watch Replay mode**: No score calculated. Score display hidden.
- **Time bonus at exactly 300s**: Bonus = max(0, 300 - 300) = 0. No bonus, no penalty.

---

## 27. NPC Advice System

### Description

Context-sensitive tips appear at the start of each level, providing guidance tailored to the stage's specific challenges. Tips help new players understand stage-specific mechanics without requiring external documentation.

### How It Works

#### Tip Triggers

| Condition | Tip Content | Stages |
|-----------|-------------|--------|
| First 2 stages | Tutorial tip (basic controls reminder) | 1, 2 |
| High gravity (≥0.7) | "Heavy gravity here — time your jumps carefully!" | Solar Flare, Dust Storm |
| Low gravity (≤0.5) | "Low gravity — you'll float higher and longer!" | Void Walker, Frost Byte, Starlight |
| Low friction (≤0.78) | "Slippery surfaces — watch your momentum!" | Solar Flare, Dust Storm |
| Storm weather | "⚡ Storm warning — watch for lightning strikes!" | Voltage, Glitch Zone |
| Dust weather | "Dusty conditions — reduced visibility and grip!" | Rust Belt, Dust Storm |

#### Display Behavior

- **Position**: Top-center of screen, overlaid on gameplay
- **Timing**: Appears at level start (after countdown if any)
- **Duration**: Auto-dismisses after 4.5 seconds
- **Animation**: Fade-in over 300ms, fade-out over 300ms
- **Interaction**: Does not block gameplay. Player can move while tip is visible
- **Frequency**: Shows every time the stage is started (not just first time)

### Expected Outcome

- Players receive contextual guidance for challenging stage conditions.
- Tips are non-intrusive — they don't block gameplay or require dismissal.
- New players learn about physics variations without trial-and-error frustration.

### Edge Cases

- **Multiple conditions met**: Only one tip shown (highest priority: storm > dust > high gravity > low gravity > low friction > tutorial).
- **Auto-retry**: Tip does NOT re-show on auto-retry (only on fresh stage start from select).
- **Very fast player**: Tip may still be visible when player reaches mid-stage. Fades normally regardless of progress.

---

## 28. Death & Retry Flow

### Description

The death and retry flow is designed to minimize frustration and maximize time-in-game. A quick, informative death sequence leads to configurable retry options that get players back into action as fast as they prefer.

### How It Works

#### Death Sequence

1. **Death trigger**: Player contacts hazard or falls below `fallLimitY`
2. **Visual feedback**:
   - Screen flash (white, 100ms)
   - Screen shake (5px amplitude, 300ms duration)
   - Death cosmetic animation plays (if equipped)
   - Player character disappears
3. **Audio feedback**: Death SFX (sawtooth 100→20Hz) + vibration pattern [30, 30, 60]
4. **Stats update**:
   - `attempts` counter incremented for current stage
   - Cause-specific counter incremented (`fallDeaths`, `spikeDeaths`, `laserDeaths`, `lightningDeaths`)

#### Auto Resurrect Check

- If Auto Resurrect skill is equipped AND cooldown is not active:
  - Player respawns at last touched platform
  - 2-minute cooldown timer starts
  - No death overlay shown
  - Run continues (timer, score, gems all preserved)
- If Auto Resurrect is on cooldown or not equipped: proceed to death overlay

#### Death Overlay

- **Content**:
  - Death cause message ("FALLEN", "SPIKED!", "LASERED!", "⚡ STRUCK!")
  - Current attempt count for this session
  - Buttons: RETRY (restart stage), BACK (return to stage select)
- **Consumable persistence**: Active consumables remain active for retry

#### Auto-Retry

- **Configurable delay**: None (manual only), Instant (0ms), 0.5s, 1s, 2s
- **Behavior**: After configured delay, stage automatically restarts without showing death overlay
- **Setting location**: Stage-select settings or in-game pause settings
- **Interaction with Auto Resurrect**: Auto Resurrect triggers first. Only if it doesn't activate does auto-retry apply

### Expected Outcome

- Quick retry loop minimizes frustration and keeps players engaged.
- Configurable auto-retry lets players choose their preferred pacing.
- Death stats provide feedback on which hazards are most challenging.
- Consumable persistence across retries prevents waste on failed attempts.

### Edge Cases

- **Death on first frame**: Possible if spawning near a laser in ON phase (shouldn't happen by level design). Normal death flow applies.
- **Auto-retry + pause**: If player pauses during auto-retry countdown, countdown pauses. Resumes on unpause.
- **Rapid deaths with Auto Resurrect**: First death → resurrect. Second death within 2 min → normal death (cooldown active).
- **Exit during auto-retry countdown**: BACK button still accessible during countdown. Cancels auto-retry.

---

## 29. Level Complete (Win) Flow

### Description

The level complete flow triggers when the player touches the finish platform. It handles score computation, progress saving, unlocks, and presents a comprehensive results overlay with multiple continuation options.

### How It Works

#### Win Trigger

- Player collides with finish platform (t:'f') from any direction
- Immediate: gameplay freezes, timer stops, win state set

#### Processing Sequence

1. **Score computation**: Apply score formula (distance + gems + style - deaths + time bonus)
2. **Gem wallet credit**: Silver gems added to wallet (×1.5 if champion). Gold gems tracked in bestChips
3. **Save best records**:
   - If score > bestScore for this stage → update bestScore
   - If time < bestTime for this stage → update bestTime
   - Update bestChips with any newly collected gold gem indices
4. **Stats update**: Increment stage clear count, total clears, update time played
5. **Ghost recording**: If new best time (or first recording), save frame data to ghost storage
6. **Unlock next stages**: Unlock stage index + 1 and stage index + 2 (if not already unlocked)
7. **Champion check**: If all 20 stages now cleared → trigger champion ceremony
8. **Analytics**: Fire `level_complete` event to server with time, score, gems, verified flag

#### Win Overlay

- **Content**:
  - Stage name + "COMPLETE!" header
  - Score breakdown (each component listed)
  - Completion time (mm:ss.ms)
  - Gold gems collected this run / total available
  - Silver gems collected this run
  - New unlocks notification (if any stages unlocked)
  - New best time badge (if applicable)
- **Buttons**:
  - NEXT → advance to next stage (if unlocked)
  - RETRY → replay same stage
  - WATCH → enter Watch Replay mode (plays ghost data)
  - SHARE → generate and share stage clear card

#### Audio/Visual

- Win SFX: Arpeggio sequence (~500ms)
- Vibration: [50, 50, 50, 50, 100] celebratory pattern
- Confetti particles (lighter version than champion ceremony)

### Expected Outcome

- Satisfying completion with clear progression feedback.
- Players immediately see what they unlocked and how they performed.
- Multiple continuation options (next, retry, watch, share) cater to different player goals.
- Ghost recording enables future self-competition.

### Edge Cases

- **Win with 0 gems**: Valid. Score still calculated from distance + time bonus. No gem credit.
- **Win unlocks already-unlocked stages**: No duplicate notification. Silent no-op.
- **Champion trigger on win**: Champion ceremony overlays on top of win overlay. Win overlay dismissed first.
- **Win during Time Freeze**: Freeze ends immediately. No carryover.
- **NEXT button on stage 20**: Shows "BACK TO SELECT" instead (no stage 21).

---

## 30. Orientation & Layout

### Description

N3ON DashJ supports both landscape and portrait orientations with distinct layouts optimized for each. The game prefers landscape for gameplay but adapts gracefully to portrait mode, ensuring playability on any device in any orientation.

### How It Works

#### Orientation Detection & Lock

- **Screen Orientation API**: Used to lock orientation when supported (`screen.orientation.lock('landscape')`)
- **Fullscreen API**: Entering fullscreen enables orientation lock on mobile browsers
- **Fallback**: If APIs unavailable, game adapts to current orientation without locking
- **Setting**: Player can choose Auto (follow device), Landscape (lock), or Portrait (lock)

#### Landscape Layout

- **Gameplay**: Full-width canvas. Controls positioned at bottom corners
- **Stage select**: Two-column layout. Left: character portrait + stage card. Right: stats + buttons
- **Compact mode**: For short-height phones (< 400px viewport height), UI elements shrink and stack tighter

#### Portrait Layout

- **Gameplay**: Canvas fills width, reduced height. Controls below canvas
- **Stage select**: Vertical stack. Top: buttons. Middle: card + dots. Bottom: stats + portrait
- **Touch targets**: Enlarged for thumb-friendly interaction in portrait grip

#### Per-Orientation Control Layouts

- Button positions saved independently for portrait and landscape
- Switching orientation loads the corresponding saved layout
- "Adjust Layout" mode: All control elements become draggable
- Positions stored as percentage offsets from viewport edges (responsive to screen size)
- Reset option restores default positions for current orientation

### Expected Outcome

- Optimal layout regardless of device orientation.
- Players can customize control positions for their specific device and grip style.
- Landscape provides the best gameplay experience; portrait remains fully playable.
- Orientation changes don't lose game state or UI position.

### Edge Cases

- **Orientation change mid-gameplay**: Game pauses briefly, re-renders layout, resumes. No state loss.
- **Orientation lock on desktop**: No-op. Desktop browsers don't support orientation lock.
- **Very narrow viewport (< 320px)**: Minimum width enforced. Horizontal scroll may appear.
- **Foldable devices**: Treated as standard viewport. Layout adapts to current fold state dimensions.

---


## Server Features (Cloudflare Worker: ndj-metrics)

---

## 31. Session Management

### Description

The session system provides each game client with a unique, time-limited token used for HMAC event signing. Sessions are created on game launch and expire after 1 hour, requiring periodic renewal.

### How It Works

#### Session Creation

- **Endpoint**: `POST /session`
- **Request body**: `{ pid, ts, v }`
  - `pid`: Player ID (unique per device, generated client-side)
  - `ts`: Client timestamp (Unix ms)
  - `v`: App version string
- **Validation**:
  - PID format check (must be valid identifier format)
  - Clock skew tolerance: client `ts` must be within ±5 minutes of server time
  - Rate limit: 10 session creates per 5 minutes per IP
- **Response**: `{ token }` — 32 hex character session token
- **Storage**: Token inserted into D1 `sessions` table with `created_ts` and `expires_ts` (created + 3600s)

#### Token Lifecycle

- **TTL**: 1 hour from creation
- **Renewal**: Client creates a new session when the old one expires (detected via 401 response)
- **Cleanup**: Expired sessions deleted by hourly cron job

### Expected Outcome

- Each client gets a unique session for HMAC signing of events.
- Clock skew validation prevents replay attacks with stale timestamps.
- Rate limiting prevents session flooding from malicious clients.

### Edge Cases

- **Clock skew > 5 minutes**: Session creation rejected with 400 error. Client must fix device clock.
- **Expired token used**: Server returns 401. Client creates new session and retries.
- **Multiple tabs**: Each tab creates its own session. No conflict.
- **Offline launch**: Session creation fails silently. Events queued locally until online.

---

## 32. Event Ingestion

### Description

The event ingestion system receives gameplay telemetry from clients. It supports both single-event submission and batch uploads (for offline queue flushing). Events are geo-augmented using Cloudflare headers and stored in D1 for analytics.

### How It Works

#### Endpoints

| Endpoint | Method | Purpose | Limit |
|----------|--------|---------|-------|
| `/event` | POST | Single event submission | 1 event per request |
| `/events/batch` | POST | Batch upload (offline flush) | Up to 500 events per request |

#### Event Types

| Type | Trigger | Key Data Fields |
|------|---------|----------------|
| `session_start` | Game boot | version, device info |
| `heartbeat` | Every 60s during gameplay | current stage, play state |
| `level_start` | Stage begins | level index, equipped skills |
| `level_complete` | Stage cleared | time, score, gems, verified flag |
| `level_death` | Player dies | cause, position, attempt count |
| `purchase` | Item bought/sold | item type, currency, amount |
| `ui_event` | UI interaction | element clicked, screen |
| `name_set` | Name chosen/changed | new name |

#### Geo Augmentation

- **Source**: Cloudflare request headers (cf-ipcountry, cf-region, cf-city, cf-timezone)
- **Storage**: Country, region, city, timezone stored with each event
- **Privacy**: No IP address stored. Only geographic metadata from Cloudflare edge

#### Event Schema (stored in D1)

```
{
  pid: string,
  name: string (player name),
  type: string (event type),
  level: integer (stage index, nullable),
  data: JSON string (event-specific payload),
  client_ts: integer (client Unix timestamp),
  server_ts: integer (server Unix timestamp),
  offline: boolean (was event queued offline?),
  verified: boolean (HMAC signature valid?)
}
```

### Expected Outcome

- All player actions tracked anonymously with geographic context.
- Batch endpoint enables reliable offline-to-online event delivery.
- Geo augmentation provides regional analytics without privacy invasion.
- Event types cover the full player lifecycle from boot to purchase.

### Edge Cases

- **Batch with >500 events**: Request rejected with 400 error. Client must split into smaller batches.
- **Duplicate events**: No deduplication. Client should avoid re-sending confirmed events.
- **Invalid event type**: Stored anyway (type field is freeform). Dashboard filters known types.
- **Missing geo headers**: Fields stored as null. Happens with non-Cloudflare requests (local dev).

---

## 33. HMAC Anti-Cheat

### Description

The HMAC system provides lightweight anti-cheat verification for gameplay events, particularly level completions. Clients sign events with their session token, and the server validates signatures to distinguish legitimate play from tampered submissions.

### How It Works

#### Client-Side Signing

```
signature = HMAC-SHA256(sessionToken, JSON.stringify(data) + timestamp)
```

- `sessionToken`: The 32-char hex token from session creation
- `data`: The event payload object
- `timestamp`: Current Unix timestamp (ms)
- Signature sent as `sig` field alongside event data

#### Server-Side Validation

1. Look up session token in D1 → verify it exists and is not expired
2. Verify PID in event matches PID that created the session
3. Recompute HMAC using stored token + received data + received timestamp
4. Compare computed signature with received signature

#### Level Complete Verification

Additional checks for `level_complete` events:

| Check | Threshold | Purpose |
|-------|-----------|---------|
| Minimum time | ≥ 5000ms (5 seconds) | No stage can be completed in under 5s legitimately |
| Server delta | claimedTime ± (1s to 30s) | Server-measured time should roughly match client claim |

- **Verified flag**: Events passing all checks get `verified = 1`
- **Unverified events**: Still stored with `verified = 0`. Counted in stats but flagged

### Expected Outcome

- Cheated completions are flagged and distinguishable from legitimate play.
- Legitimate players are never falsely flagged (generous thresholds).
- Unverified events still contribute to aggregate stats (no data loss).
- Session-based signing prevents cross-player event injection.

### Edge Cases

- **Network latency**: 30-second tolerance on server delta accommodates slow connections.
- **Tab backgrounding**: Browser may throttle timers, causing time discrepancy. 30s tolerance handles this.
- **Expired session mid-event**: Event stored as unverified. Client gets 401, creates new session.
- **Replay attack**: Same signature + timestamp rejected if session has expired (1-hour window).

---

## 34. Rate Limiting

### Description

In-memory rate limiting protects the worker from abuse without requiring external state stores. Limits are applied per-isolate (not globally distributed), providing approximate protection that's sufficient for the game's scale.

### How It Works

#### Rate Limit Tiers

| Scope | Limit | Window | Applies To |
|-------|-------|--------|------------|
| IP (general) | 600 requests | 5 minutes | All endpoints |
| IP (session create) | 10 requests | 5 minutes | POST /session only |
| PID (general) | 300 requests | 5 minutes | All authenticated endpoints |
| IP (sync save) | 5 requests | 1 minute | POST /sync/save |
| IP (sync load) | 10 requests | 1 minute | POST /sync/load |
| IP (feedback) | 5 requests | 5 minutes | POST /feedback |

#### Implementation

- **Storage**: In-memory Map per worker isolate
- **Key**: IP address or PID (depending on tier)
- **Value**: Array of timestamps for recent requests
- **Cleanup**: Entries older than window are pruned on each check
- **Response**: 429 Too Many Requests with `Retry-After` header when exceeded

#### Limitations

- Per-isolate: Different Cloudflare edge locations have independent counters
- Not globally consistent: A determined attacker could distribute across edges
- Sufficient for: Preventing accidental floods, basic bot protection, cost control

### Expected Outcome

- Abuse prevention without impacting normal play patterns.
- Normal gameplay generates ~1-2 requests/minute (well under all limits).
- Sync operations have tighter limits to prevent data store abuse.
- Feedback rate limit prevents spam submissions.

### Edge Cases

- **Shared IP (NAT)**: Multiple players behind same IP share the IP limit. 600/5min is generous enough for typical NAT scenarios.
- **Isolate restart**: Rate limit state lost. Attacker gets fresh window. Acceptable tradeoff for simplicity.
- **Batch events**: Single batch request counts as 1 request regardless of event count inside.
- **Rate limit + offline queue**: Client queues events locally. On reconnect, batch endpoint handles bulk upload within single request.

---

## 35. Cloud Sync (Server)

### Description

The server-side cloud sync system stores encrypted player progress, handles multi-device merge conflicts, enforces device limits, and provides brute-force protection. Data is encrypted with AES-256-GCM at rest.

### How It Works

#### Save Endpoint

- **Endpoint**: `POST /sync/save`
- **Authentication**: Key hash derived from username + mmyy + PIN via HMAC-SHA256
- **Request body**: `{ key_hash, device_id, data, rewards, purchases }`
- **Processing**:
  1. Validate key hash format
  2. Check lockout status (10 fails → 1 hour block)
  3. Load existing sync state (if any)
  4. Verify device ID is registered (or register if < 3 devices)
  5. Apply merge strategy to incoming data vs stored data
  6. Encrypt merged data with AES-256-GCM
  7. Store in `sync_states` table
  8. Save previous version to `sync_history` (keep last 5)
- **Rate limit**: 5 saves per minute per IP

#### Load Endpoint

- **Endpoint**: `POST /sync/load`
- **Authentication**: Same key hash
- **Response**: Decrypted merged data + rewards + purchases
- **Device registration**: If device_id is new and < 3 registered, auto-register
- **Rate limit**: 10 loads per minute per IP

#### Change PIN Endpoint

- **Endpoint**: `POST /sync/change-pin`
- **Authentication**: Old key hash + new key hash
- **Effect**: Moves all data from old key to new key. Clears all device IDs (forces re-registration)
- **Use case**: Forgotten PIN recovery, security rotation

#### Merge Strategy (Server-Side)

| Field | Strategy | Implementation |
|-------|----------|---------------|
| Best scores | max(existing, incoming) | Per-stage comparison |
| Best times | min(existing, incoming) | Per-stage comparison |
| Unlocked stages | union(existing, incoming) | Bitwise OR or array merge |
| Stats | max(existing, incoming) | Per-field comparison |
| Silver wallet | max(existing, incoming) | Single value comparison |
| Skills owned | union(existing, incoming) | Array merge |
| Cosmetics owned | union(existing, incoming) | Array merge |

#### Encryption at Rest

- **Algorithm**: AES-256-GCM
- **Key**: Derived from worker environment secret
- **IV**: Random 12 bytes per encryption operation
- **Stored format**: `iv:ciphertext:tag` (base64 encoded)

#### History Versioning

- Last 5 versions of sync data kept in `sync_history` table
- Each save creates a new history entry
- Enables rollback if merge produces unexpected results (manual intervention)

### Expected Outcome

- Secure cross-device sync with conflict resolution and brute-force protection.
- AES-256-GCM encryption ensures data privacy even if database is compromised.
- Device limit prevents unlimited account sharing.
- History versioning provides safety net for data corruption.

### Edge Cases

- **First save (no existing data)**: Creates new sync_states entry. No merge needed.
- **Device limit reached**: 4th device rejected with 403. Player must change PIN to clear devices.
- **Lockout active**: All sync operations return 423 Locked for 1 hour after 10 failed attempts.
- **Concurrent saves from 2 devices**: Last write wins for non-mergeable fields. Merge strategy handles most conflicts.
- **Corrupted encrypted data**: Decryption failure returns 500. History version can be restored manually.

---

## 36. Dashboard

### Description

The analytics dashboard provides a password-protected web interface for the game operator to monitor player behavior, engagement metrics, economy health, and system status. It's served directly from the Cloudflare Worker with cookie-based authentication.

### How It Works

#### Authentication

- **Method**: Password-based login with HMAC-signed cookie
- **Login page**: Served at `/` or `/dashboard` when unauthenticated
- **Cookie**: HMAC-SHA256 signed, 7-day TTL, HttpOnly, Secure, SameSite=Strict
- **Key source**: `DASH_KEY` environment variable. If not set, dashboard is inaccessible (fail-closed)

#### Stat Endpoints

| Endpoint | Data Provided |
|----------|---------------|
| `GET /stats` | Overview: total events, unique players, currently online, avg engagement time, win/death ratio |
| `GET /stats/levels` | Per-level: starts, completes, deaths, avg time, median time, completion rate, death causes breakdown, stuck players |
| `GET /stats/players` | Leaderboards: most active, top completers, top diers, champions, perseverance (most retries before clear) |
| `GET /stats/sessions` | Funnel analysis, hourly heatmap, daily breakdown, device types, session duration distribution |
| `GET /stats/ui` | Display mode distribution, PWA support %, click tracking, install funnel conversion |
| `GET /stats/economy` | Gold/silver earned vs spent time-series, top purchased items, top spenders |
| `GET /stats/dailystage` | Daily stage participation rates, completion rates per daily rotation |
| `GET /stats/appversion` | Version distribution pie chart, adoption time-series |
| `GET /stats/feed` | Real-time event feed (last 100 events, newest first) |
| `GET /stats/feedback` | Player feedback submissions with metadata |
| `GET /stats/sync` | Cloud sync account count, active devices, sync frequency |
| `GET /stats/player?pid=X` | Individual player deep profile: all events, progression, economy history |

#### Query Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `?range=` | 1d, 2d, 3d, 7d, 14d, 31d, all | Time range filter for all stat queries |
| `?force=1` | 1 | Bypass 5-minute cache, query D1 directly |

#### Caching

- **Strategy**: 5-minute in-memory cache per isolate
- **Key**: Endpoint path + range parameter
- **Invalidation**: Automatic after 5 minutes. Manual via `?force=1`
- **Purpose**: Reduce D1 read load for frequently-accessed dashboard

### Expected Outcome

- Complete analytics visibility for the game operator.
- All metrics accessible from a single authenticated web interface.
- 5-minute cache prevents excessive database queries during active monitoring.
- Range parameter enables both real-time monitoring and historical analysis.

### Edge Cases

- **No DASH_KEY set**: Dashboard returns 403 for all requests. Fail-closed security.
- **Cookie expired**: Redirects to login page. No data leakage.
- **Large date range (all)**: Queries may be slow on large datasets. Cache helps on repeated access.
- **Multiple operators**: Single shared password. No per-user access control.
- **Isolate-local cache**: Different edge locations have independent caches. Slight inconsistency acceptable.

---

## 37. Feedback System

### Description

The feedback system allows players to submit bug reports, suggestions, and general feedback directly from within the game. Submissions are stored as events and viewable on the dashboard.

### How It Works

#### Endpoint

- **URL**: `POST /feedback`
- **Rate limit**: 5 submissions per 5 minutes per IP
- **Request body**:

| Field | Type | Constraints |
|-------|------|-------------|
| `pid` | string | Player ID (required) |
| `name` | string | Player name (required) |
| `subject` | string | Feedback category/subject |
| `email` | string | Optional contact email |
| `content` | string | Feedback text (3-2000 characters) |

#### Storage

- Stored as an event with type `'feedback'` in the events table
- All standard event fields apply (server_ts, geo augmentation)
- Content stored in the `data` JSON field

#### Dashboard Access

- Viewable at `GET /stats/feedback`
- Sorted by submission time (newest first)
- Includes player name, subject, content, timestamp, and geo info

### Expected Outcome

- Players can submit feedback directly from the game without external tools.
- Feedback is stored alongside other analytics for unified operator view.
- Rate limiting prevents spam while allowing legitimate multi-submission.

### Edge Cases

- **Content < 3 chars**: Rejected with 400 error. Minimum length enforced.
- **Content > 2000 chars**: Truncated or rejected (server-side validation).
- **No email provided**: Stored as null. Operator cannot respond directly.
- **Rate limited**: Returns 429. Client shows "Please wait before submitting again."

---

## 38. Cron Cleanup

### Description

An hourly scheduled task maintains database hygiene by removing expired sessions and logging system health metrics. This prevents unbounded table growth and ensures the sessions table remains performant.

### How It Works

#### Schedule

- **Trigger**: Cloudflare Cron Trigger at `0 * * * *` (top of every hour)
- **Execution**: Runs in worker context with full D1 access

#### Operations

1. **Delete expired sessions**: `DELETE FROM sessions WHERE expires_ts < NOW()`
2. **Log remaining sessions**: Count of active (non-expired) sessions
3. **Log total events**: Count of all events in events table
4. **Log old events**: Count of events older than 90 days (informational, not deleted)

#### Logging

- All operations logged to worker console (visible in Cloudflare dashboard logs)
- No automatic deletion of old events (manual decision by operator)
- Execution time logged for performance monitoring

### Expected Outcome

- Database stays clean with expired tokens removed automatically.
- Session table remains small and fast to query.
- Operator has visibility into database growth trends.
- No data loss — only expired sessions are deleted, never events.

### Edge Cases

- **Cron fails to fire**: Sessions accumulate but don't cause errors (just wasted space). Next successful run cleans up.
- **Very large session table**: DELETE operation may be slow. D1 handles gracefully with internal pagination.
- **Concurrent cron + request**: D1 handles concurrent access. No locking issues.

---

## 39. Security

### Description

The ndj-metrics worker implements defense-in-depth security across authentication, data protection, and privacy. Multiple cryptographic primitives protect different aspects of the system.

### How It Works

#### Cryptographic Primitives

| Primitive | Algorithm | Use Case |
|-----------|-----------|----------|
| Event signing | HMAC-SHA256 | Client signs events with session token |
| Session tokens | Crypto.randomUUID / random hex | 32-char unique identifiers |
| Dashboard auth | HMAC-SHA256 | Cookie signing and verification |
| Sync key derivation | HMAC-SHA256 | username + mmyy + pin → key hash |
| Data encryption | AES-256-GCM | Sync data encrypted at rest |

#### Privacy Measures

- **No IP storage**: IP addresses used only for rate limiting (in-memory). Never written to D1.
- **Geo only**: Country, region, city, timezone from Cloudflare headers. Sufficient for analytics without identifying individuals.
- **No PII in events**: Player names are self-chosen handles, not real names. No email required.

#### HTTP Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| Referrer-Policy | strict-origin-when-cross-origin | Limit referrer leakage |

#### CORS Configuration

- Public endpoints (event, session, sync, feedback): Permissive CORS for game client access
- Dashboard endpoints: No CORS (same-origin only, served from worker)

#### Fail-Closed Design

- Dashboard without `DASH_KEY`: Returns 403 (not 200 with empty data)
- Sync without valid key hash: Returns 401 (not partial data)
- Invalid HMAC signature: Event stored as unverified (not rejected entirely — preserves analytics)

### Expected Outcome

- Defense in depth: multiple layers protect against different attack vectors.
- Privacy-preserving analytics: useful insights without storing identifying information.
- Fail-closed defaults: misconfiguration results in denied access, not data exposure.
- Standard security headers prevent common web vulnerabilities.

### Edge Cases

- **HMAC key rotation**: Changing worker secrets invalidates all existing dashboard cookies and sync key hashes. Requires coordinated update.
- **AES key compromise**: All sync data at rest is readable. Mitigation: rotate key + re-encrypt (manual process).
- **Cloudflare geo unavailable**: Headers may be missing in development or edge cases. Fields stored as null.

---

## 40. Database Schema

### Description

The ndj-metrics worker uses Cloudflare D1 (SQLite-based) as its persistent data store. Five tables support session management, event storage, cloud sync, and brute-force protection.

### How It Works

#### Tables

##### sessions

| Column | Type | Description |
|--------|------|-------------|
| `token` | TEXT PRIMARY KEY | 32-char hex session token |
| `pid` | TEXT | Player ID that created the session |
| `created_ts` | INTEGER | Unix timestamp of creation |
| `expires_ts` | INTEGER | Unix timestamp of expiration (created + 3600) |

##### events

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unique event ID |
| `pid` | TEXT | Player ID |
| `name` | TEXT | Player display name |
| `type` | TEXT | Event type (session_start, level_complete, etc.) |
| `level` | INTEGER | Stage index (nullable, for non-level events) |
| `data` | TEXT | JSON-encoded event payload |
| `client_ts` | INTEGER | Client-reported Unix timestamp |
| `server_ts` | INTEGER | Server-recorded Unix timestamp |
| `offline` | INTEGER | 1 if event was queued offline, 0 otherwise |
| `verified` | INTEGER | 1 if HMAC signature valid, 0 otherwise |
| `country` | TEXT | Country code from Cloudflare geo |
| `region` | TEXT | Region from Cloudflare geo |
| `city` | TEXT | City from Cloudflare geo |
| `timezone` | TEXT | Timezone from Cloudflare geo |

##### sync_states

| Column | Type | Description |
|--------|------|-------------|
| `key_hash` | TEXT PRIMARY KEY | HMAC-SHA256 of username+mmyy+pin |
| `pid` | TEXT | Player ID (for reference) |
| `data_json` | TEXT | AES-256-GCM encrypted game state |
| `rewards_json` | TEXT | AES-256-GCM encrypted rewards data |
| `purchase_json` | TEXT | AES-256-GCM encrypted purchase history |
| `device_ids` | TEXT | JSON array of registered device IDs (max 3) |
| `updated_at` | INTEGER | Last update Unix timestamp |

##### sync_attempts

| Column | Type | Description |
|--------|------|-------------|
| `key_hash` | TEXT PRIMARY KEY | Same key hash as sync_states |
| `fails` | INTEGER | Consecutive failed authentication attempts |
| `last_fail_at` | INTEGER | Unix timestamp of last failure |

##### sync_history

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | History entry ID |
| `key_hash` | TEXT | Reference to sync_states |
| `version` | INTEGER | Incrementing version number per account |
| `data_json` | TEXT | AES-256-GCM encrypted snapshot |
| `created_at` | INTEGER | Unix timestamp of snapshot creation |

#### Indexes

- `events`: Index on `(type, server_ts)` for dashboard queries
- `events`: Index on `(pid, server_ts)` for player profile queries
- `sync_history`: Index on `(key_hash, version)` for version lookup
- `sessions`: Index on `(expires_ts)` for cron cleanup

#### Data Retention

- **Sessions**: Deleted hourly when expired (1-hour TTL)
- **Events**: Retained indefinitely (operator decision to archive/delete)
- **Sync states**: Retained until player changes PIN or data is manually purged
- **Sync history**: Last 5 versions per account. Older versions overwritten

### Expected Outcome

- Normalized schema supporting all analytics and sync operations.
- Efficient queries via targeted indexes on common access patterns.
- Clear separation between transient data (sessions) and permanent data (events, sync).
- History table enables data recovery without full backup infrastructure.

### Edge Cases

- **D1 size limits**: Cloudflare D1 has per-database size limits. Events table grows unbounded — operator must monitor.
- **Concurrent writes**: D1 handles SQLite WAL mode internally. No application-level locking needed.
- **Schema migrations**: No automated migration system. Schema changes require manual D1 commands.
- **NULL handling**: Nullable fields (level, geo columns) handled with COALESCE in queries.

---
