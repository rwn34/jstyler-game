# Project: RWN Game Platform (jstyler)

## Custom Commands

### `zipgame`
When the user says "zipgame":
1. **Detect game folders**: Scan project root for directories containing an `index.html` file, excluding: `deploy/`, `.ai/`, `.claude/`, `.kimi/`, `.kiro/`, `node_modules/`.
2. **Parse game metadata**: For each game folder, read its `index.html` and extract:
   - `id` — folder name (e.g. `n3ondashj`)
   - `title` — from `<title>` tag, strip any ` | jstylr` suffix
   - `desc` — first level's name from the LEVELS array (e.g. first `.name` value), or a fallback like the folder name
   - `diff` — first level's difficulty from the LEVELS array (e.g. first `.diff` value)
   - `theme` — first theme object from the THEMES array, extracting: `skyT`, `skyM`, `skyB`, `grid`, `acc`, `part`
   - `version` — from `GAME_VERSION` variable, or the version string in the HTML (e.g. `v1.0.1`)
3. **Regenerate `index.html`**: Replace the `<!-- ZIPGAME_GAMES -->` placeholder in the root `index.html` template with a JSON **array** of game metadata. IMPORTANT: PowerShell `ConvertTo-Json` unwraps single-element arrays — wrap with `,@(...)` or use `,[System.Object[]]` to force array output: `[{"id":"n3ondashj","title":"N30N DASH J",...}]`
4. **Zip**: Create a zip of the regenerated `index.html` and all game folders.
5. **Filename format**: `yyyymmddhhmm-v<version>.zip` (e.g. `202605052130-v1.zip`).
6. **Place** the zip into `deploy/` (create if needed).

## Project Structure
- `index.html` — Game portal / landing page (template with `<!-- ZIPGAME_GAMES -->` placeholder)
- `n3ondashj/index.html` — First game (N30N DASH J)
- `deploy/` — Build artifacts / zips (gitignored)
