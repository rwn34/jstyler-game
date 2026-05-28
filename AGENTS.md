# AGENTS.md — RWN Game Platform (jstyler)

> This file is for AI coding agents. It assumes you know nothing about this project.
> For KimiGraph-specific tooling guidance, see `.kimi/AGENTS.md`.

---

## 1. Project Overview

`rwn-game-jstyler` is a **static games portal**. Every game is a self-contained single-file HTML/JS application with **zero build dependencies, zero frameworks, and zero npm packages** inside the game code.

- **Live game**: **N3ON DashJ** (formerly N30N DASH J) — a neon-themed canvas platformer with 20 themed levels, progression, cosmetics store, daily rewards, ghost replay, and champion/master unlock system.
- **Deployment**: The site ships as a zip of static assets uploaded to **Cloudflare Pages**.
- **Analytics**: A separate **Cloudflare Worker** (`cloudflare/`) collects anonymous game metrics, stores them in **D1 SQLite**, and serves a password-protected dashboard.

---

## 2. Technology Stack

| Layer | Tech |
|-------|------|
| Games | Vanilla HTML5, CSS3, JavaScript (Canvas 2D API) |
| Portal | Static HTML/JS template (`src/index.html`) |
| PWA | `manifest.webmanifest` + Service Worker (`sw.js`) for offline play |
| Build | PowerShell (`zipgame.ps1`) — no bundler |
| Hosting | Cloudflare Pages (static zip upload) |
| Analytics backend | Cloudflare Worker (`cloudflare/src/index.js`) |
| Analytics database | Cloudflare D1 SQLite (`ndj-metrics-db`) |
| Worker tooling | `wrangler` CLI (dev dependency only) |

---

## 3. Project Structure

```
repo-root/
├── src/
│   ├── index.html              # Portal/landing page TEMPLATE.
│   │                           #   Contains "<!-- ZIPGAME_GAMES -->" placeholder
│   │                           #   that gets replaced with game metadata JSON at build time.
│   ├── n3ondashj.html          # Game source: N3ON DashJ (single-file HTML/JS/CSS)
│   └── n3ondashj/              # PWA assets for this game
│       ├── manifest.webmanifest
│       ├── sw.js
│       ├── icon.svg
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-maskable.png
│
├── cloudflare/
│   ├── src/
│   │   ├── index.js            # Metrics worker: sessions, events, stats APIs, dashboard
│   │   └── dashboard.html      # (imported as raw text into index.js)
│   ├── wrangler.toml           # Worker config: D1 binding, cron triggers, vars
│   └── package.json            # Only devDependency: wrangler
│
├── deploy/                     # Build artifacts (zips). GITIGNORED — do not commit.
├── zipgame.ps1                 # Build script — see "Build & Deploy"
├── PROJECT.md                  # Authoritative spec for the zipgame build command
├── CHANGELOG.md                # Per-version game/platform release notes
├── CLAUDE.md                   # Claude Code-specific conventions and write boundaries
└── .gitignore                  # Ignores: deploy/
```

**Important:** There is no `backend/`, `frontend/`, `tests/`, or `infra/` directory. Do not fabricate that scaffolding.

---

## 4. Build & Deploy

### The `zipgame` command

`zipgame.ps1` is the entire build system. It can be run via:
```powershell
.\zipgame.ps1              # auto-bumps patch version
.\zipgame.ps1 -Version 1.2.3   # override version
```

**What it does:**
1. **Detect current version** from the boot-screen `<span>` inside `src/n3ondashj.html`.
2. **Bump version** (patch +1) unless `-Version` is provided.
3. **Update 3 places** with the new version:
   - Boot screen HTML (`<span>vX.Y.Z</span>`)
   - Settings panel text (`vX.Y.Z | Updated: ...`)
   - Service Worker `CACHE_NAME` (`n3ondashj-vX.Y.Z`)
4. **Parse game metadata** from the game HTML: `title`, `desc` (first level's `.name`), `diff` (first level's `.diff`), `theme` (first `THEMES` object: `skyT`, `skyM`, `skyB`, `grid`, `acc`, `part`), `version`.
5. **Inject metadata** into `src/index.html` by replacing `<!-- ZIPGAME_GAMES -->` with a JSON array.
   - ⚠️ **PowerShell gotcha**: `ConvertTo-Json` unwraps single-element arrays. The script assembles JSON manually to avoid this bug.
6. **Copy per-game assets** from `src/<gameid>/` into the build directory.
7. **Create zip** at `deploy/yyyymmddHHmmss_vX.Y.Z.zip` with layout:
   ```
   index.html              # regenerated portal
   n3ondashj/
     ├── index.html        # game file renamed from n3ondashj.html
     ├── manifest.webmanifest
     ├── sw.js
     └── icons...
   ```
8. **Forward slashes** enforced in zip entry paths for cross-platform compatibility.
9. **UTF-8 no-BOM** encoding for all text files.

### Versioning rules
- Format: `vMAJOR.MINOR.PATCH` (the script handles `x.y.z`).
- Patch bumps automatically on every `zipgame` run.
- The three version locations (boot span, settings panel, SW cache name) must always stay in sync.

### Deploy target
- The generated zip is uploaded to **Cloudflare Pages** manually (or via CI if configured).
- Cloudflare Pages uses directory routing: game links are `'/' + g.id + '/'`.

---

## 5. Code Conventions

### Frame-rate independence
All game logic must be frame-rate independent:
- `loop()` computes `dt` from `performance.now()` (normalized so `dt == 1.0` at 60fps).
- **All** velocity, gravity, friction, cooldowns, and particle updates multiply by `dt`.
- Camera smoothing: `camX += (tcx - camX) * (1 - Math.pow(0.92, dt))`.
- Never hardcode per-frame deltas (e.g., `x += 5` without `* dt`).

### Save system & migration
- `GAME_VERSION` is an integer constant embedded in the game file.
- Saves are stored in `localStorage` with per-game prefixes (`ndj_*` for N3ON DashJ).
- On load: reject saves where `parsed.v > GAME_VERSION` (newer save = incompatible).
- Migrate older save formats explicitly when `parsed.v < GAME_VERSION`.

### Settings architecture
- **Stage-select settings panel** (`#settings`): audio, particles, data (export/import/reset).
- **In-game pause settings panel** (`#gameSettings`): controls (fullscreen, vibrate, control mode, joystick size/position).
- Do **not** mix these two categories.

### Naming & style
- Least-code wins. No abbreviations.
- Return early. No dead code.
- Every `catch` block must either log or rethrow.
- No duplicate function definitions. Search for shadowed declarations before adding new ones.

### Adding a new game (future)
1. Create `src/<gameid>.html` as a single self-contained HTML file.
2. Create `src/<gameid>/` folder for PWA assets (manifest, SW, icons) if desired.
3. Update `zipgame.ps1` to detect and parse the new game file (currently it hardcodes `n3ondashj.html`).
4. Ensure `localStorage` keys use a new prefix (not `ndj_*`).

---

## 6. Testing

- **There is no test suite.** No unit tests, no integration tests, no linting, no transpilation.
- The "build" is `zipgame`. The verification is manual playtesting.
- If you add new logic, verify it in a browser by opening the built zip contents.

---

## 7. Multi-CLI / Orchestrator Context

This repository runs three AI CLI tools side-by-side:
- **Claude Code** → `.claude/`
- **Kimi** → `.kimi/`
- **Kiro** → `.kiro/`

Shared cross-CLI state lives in `.ai/`.

**Write boundaries for the orchestrator/root agent:**
- Direct edits are OK in: `.ai/**`, `.claude/**`, `CLAUDE.md`, `AGENTS.md`, repo root.
- `.kimi/**` and `.kiro/**` are **read-only** (other CLIs' homes).
- Cross-CLI changes go through `.ai/handoffs/to-<kimi|kiro>/open/NNN-slug.md`.
- All project source mutations (`src/**`, `deploy/**`, `PROJECT.md`, `CHANGELOG.md`) must be delegated to a specialist subagent — never edit them directly from the orchestrator.

**Activity logging:** After substantive work, prepend a short entry to `.ai/activity/log.md` with your CLI identity.

**Self-grep-verify before writing a completion handoff (standing rule):** Before declaring work "done" via a handoff in `to-<other>/open/`, for every concrete claim you intend to make (e.g. "added X to file Y at line Z", "wrapped N sites in try/catch", "deps array now includes signal S"), run `rg` against the working tree and paste the matching 1-3 lines into the handoff body next to the claim. If a grep returns nothing where you expected something, fix the code first — don't fudge the handoff. Adds ~3 minutes; eliminates the "claims don't match the tree" defect class. Applies to all CLIs (claude-code, kimi-cli, kiro-cli). Completion handoffs without grep-verified snippets get reviewed at the same skepticism level as if no claims were made.

---

## 8. Security Considerations

- **No secrets in git.** The only secret-like value visible in config is `DASHBOARD_KEY` in `wrangler.toml`, which is a lightweight access password for the metrics dashboard.
- **Metrics anti-cheat:** The worker validates events with HMAC-SHA256 (`sig` field). Session tokens expire after 1 hour.
- **Server-side sanity checks** for `level_complete`:
  - Minimum claimed time: 5000 ms.
  - Server delta between `level_start` and `level_complete` must be within `claimedTime - 1s` to `claimedTime + 30s`.
- **Privacy:** The worker stores only Cloudflare-provided geo info (`country`, `region`, `city`, `timezone`). No IP addresses are stored.
- **Dashboard auth:** Cookie-based HMAC-signed auth with 7-day TTL. Falls open if `DASHBOARD_KEY` is unset.

---

## 9. What NOT to Do

- **Do NOT** introduce npm/node dependencies, bundlers (webpack, vite, rollup), or frontend frameworks (React, Vue, Svelte) into the game code. Games are deliberately zero-dependency single files.
- **Do NOT** edit `index.html` at the repo root — that file does not exist anymore. The portal template is `src/index.html`.
- **Do NOT** create `backend/`, `frontend/`, `tests/`, or `infra/` directories. Per-domain content goes in `src/`, build output in `deploy/`, framework state in `.ai/`, `.claude/`, `.kimi/`, `.kiro/`.
- **Do NOT** commit anything inside `deploy/`.
- **Do NOT** run a traditional build/test/lint command — there isn't one.
- **Do NOT** modify `src/n3ondashj.html` or `src/index.html` directly from the orchestrator if you are acting under the orchestrator pattern; delegate to a specialist subagent.

---

## 10. Quick Reference

| Task | How |
|------|-----|
| Build deploy zip | `.\zipgame.ps1` (PowerShell) |
| Deploy | Upload `deploy/*.zip` to Cloudflare Pages |
| View analytics dashboard | Worker URL + `/dashboard` (password = `DASHBOARD_KEY`) |
| Add a new game | Create `src/<gameid>.html` + `src/<gameid>/` assets, then update `zipgame.ps1` |
| Bump version | Automatic via `zipgame.ps1`, or manual `-Version x.y.z` |
| Clean deploy folder | `Remove-Item deploy\* -Force` (everything in `deploy/` is gitignored) |
