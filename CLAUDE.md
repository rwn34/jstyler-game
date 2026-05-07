# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`rwn-game-jstyler` is a **static games portal**. Every game is a self-contained
single-file HTML/JS app (no build system, no framework, no npm). The repo ships
as a zip uploaded to Cloudflare Pages.

- `src/index.html` — portal/landing page template. Renders a grid of game cards
  with per-game canvas thumbnails painted from each game's theme colors. Contains
  the `<!-- ZIPGAME_GAMES -->` placeholder that the build replaces with a JSON
  array of game metadata.
- `src/<gameid>.html` — one file per game (currently `src/n3ondashj.html`,
  N30N DASH J). Each game embeds its own LEVELS/THEMES arrays and a
  `GAME_VERSION` constant used for save-file migration via `localStorage` keyed
  by game prefix (e.g. `ndj_`).
- `deploy/` — build artifacts (`yyyymmddhhmm.zip`), gitignored.
- `PROJECT.md` — authoritative spec for the `zipgame` build command.
- `CHANGELOG.md` — per-version game/platform notes.

There is no `backend/`, `frontend/`, `tests/`, or `infra/` directory in this
project — the global `~/.claude/rules/project-structure.md` layout does **not**
apply here. This is a static-asset repo. Don't fabricate that scaffolding.

## The `zipgame` build command

When the user says "zipgame", produce a deployable zip. Spec is in `PROJECT.md`;
key invariants:

1. **Auto-detect games**: scan `src/` for `<gameid>.html` files (each becomes
   `<gameid>/index.html` inside the zip).
2. **Parse metadata** from each game's HTML: `id` (folder/filename), `title`
   (`<title>` minus ` | jstylr` suffix), `desc` + `diff` (first LEVELS entry's
   `name` and `diff`), `theme` (first THEMES entry — `skyT/skyM/skyB/grid/acc/part`),
   `version` (`GAME_VERSION` constant or version string).
3. **Inject** the metadata array into `src/index.html` by replacing
   `<!-- ZIPGAME_GAMES -->`. PowerShell gotcha: `ConvertTo-Json` unwraps
   single-element arrays — force array output (`,@(...)` or
   `,[System.Object[]]`) or assemble JSON manually. This bug bit v1.2.0; do not
   reintroduce it.
4. **Zip layout**:
   ```
   index.html              <- regenerated portal
   <gameid>/index.html     <- one dir per game, file renamed to index.html
   ```
5. **Output**: `deploy/yyyymmddhhmm.zip`. Create `deploy/` if missing.
6. Cloudflare Pages directory routing requires the per-game subdirectories —
   portal links use `'/' + g.id + '/'`.

## Conventions inside game files

Single-file games (e.g. `src/n3ondashj.html`) follow a few patterns worth
preserving when editing:

- **Frame-rate independence**: `loop()` computes `dt` from `performance.now()`
  (1.0 at 60fps). All velocity/gravity/friction/cooldowns/particles multiply
  by `dt`. Camera smoothing uses `1 - Math.pow(0.92, dt)`. New per-frame
  logic must follow this — do not hardcode per-frame deltas.
- **Save migration**: `GAME_VERSION` integer is stamped into saves. On load,
  reject saves where `parsed.v > GAME_VERSION`; migrate older formats (see the
  `bestChips` integer→boolean-array migration in `n3ondashj.html`).
- **Storage namespace**: `localStorage` keys are prefixed per-game (`ndj_*`
  for N30N DASH J). Use a new prefix for new games.
- **Settings split**: stage-select panel = audio/particles/data
  (export/import/reset). In-game pause panel = controls (fullscreen, vibrate,
  control mode, joystick size/position). Don't mix them.
- **No duplicate definitions**: v1.2.0 deleted ~255 lines of duplicate
  `handleDeath`/`shatterPlayer`/`spawnP`/`draw*`/`loop` definitions. When
  editing, search for shadowed function declarations before adding new ones.

## Multi-CLI / orchestrator setup

This repo runs three CLIs side-by-side: Claude Code (`.claude/`), Kimi
(`.kimi/`), Kiro (`.kiro/`). Shared state lives in `.ai/`. The orchestrator
pattern is enforced — see `.claude/agents/` (13 agents) and
`.claude/skills/orchestrator-pattern/SKILL.md`.

**Write boundaries for the orchestrator (this agent):**
- Direct edits OK in: `.ai/**`, `.claude/**`, `CLAUDE.md`, `AGENTS.md`, repo root.
- `.kimi/**` and `.kiro/**` are read-only — those are the other CLIs' homes.
  Cross-CLI changes go through `.ai/handoffs/to-<kimi|kiro>/open/NNN-slug.md`.
- All project source mutations (`src/**`, `deploy/**`, `PROJECT.md`,
  `CHANGELOG.md`) must be delegated to a specialist subagent — never
  Edit/Write them directly. Pick from `.claude/agents/` (`coder`, `ui-engineer`,
  `doc-writer`, `release-engineer`, etc.).

**Hooks** (`.claude/settings.json`):
- `PreToolUse Write|Edit` → `pretool-write-edit.sh` enforces the write scope.
- `PreToolUse Bash` → `pretool-bash.sh` (command guardrails).
- `SessionStart` → injects git status.
- `UserPromptSubmit` → injects top of `.ai/activity/log.md` so cross-CLI
  history is always visible.

**Activity log**: prepend a short entry to `.ai/activity/log.md` after
substantive work. Identity: `claude-code`.

## Global user rules that DO apply here

From `~/.claude/rules/`:
- **orchestrator.md** — delegation flow (triage → specialist → review → summarize).
- **coding-standards.md** — least-code wins, no abbreviations, return early,
  no dead code, every catch logs or rethrows. Applies inside game files.
- **security-standards.md** — no secrets in git, validate input, parameterized
  queries (n/a here — no backend, but the principle holds for any future code).

## Things to avoid

- Do not run a build/test/lint command — there isn't one. The "build" is
  `zipgame` (see above). There is no test suite.
- Do not introduce npm/node dependencies or a bundler. Games are deliberately
  zero-dependency single files.
- Do not edit `index.html` at the repo root — it's deleted. The portal
  template lives at `src/index.html`.
- Do not commit anything in `deploy/`.
- Do not create files at repo root other than what's already there. Per-domain
  content goes in `src/`, build output in `deploy/`, framework state in
  `.ai/` `.claude/` `.kimi/` `.kiro/`.
