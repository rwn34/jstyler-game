# Project: RWN Game Platform (jstyler)

## Custom Commands

### `zipgame`
When the user says "zipgame":
1. **Detect game folders**: Scan project root for directories containing an `index.html` file, excluding: `deploy/`, `.ai/`, `.claude/`, `.kimi/`, `.kiro/`, `node_modules/`. the source typically in /src/
2. **Parse game metadata**: For each game folder, read its `index.html` and extract:
   - `id` — folder name (e.g. `n3ondashj`)
   - `title` — from `<title>` tag, strip any ` | jstylr` suffix
   - `desc` — first level's name from the LEVELS array (e.g. first `.name` value), or a fallback like the folder name
   - `diff` — first level's difficulty from the LEVELS array (e.g. first `.diff` value)
   - `theme` — first theme object from the THEMES array, extracting: `skyT`, `skyM`, `skyB`, `grid`, `acc`, `part`
   - `version` — from `GAME_VERSION` variable, or the version string in the HTML (e.g. `v1.0.1`)
3. **Regenerate `index.html`**: Replace the `<!-- ZIPGAME_GAMES -->` placeholder in the root `index.html` template with a JSON **array** of game metadata. IMPORTANT: PowerShell `ConvertTo-Json` unwraps single-element arrays — wrap with `,@(...)` or use `,[System.Object[]]` to force array output: `[{"id":"n3ondashj","title":"N30N DASH J",...}]`
4. **Copy per-game assets**: If `src/<gameid>/` exists, copy all files inside it into the built `<gameid>/` directory. This is required for PWA assets such as `manifest.webmanifest`, `sw.js`, and icons.
5. **Zip**: Create a zip of the regenerated `index.html` and all game folders.
6. **Filename format**: `yyyymmddhhmm.zip` (e.g. `202605052130.zip`).
7. **Place** the zip into `deploy/` (create if needed).

## Project Structure
- `index.html` — Game portal / landing page (template with `<!-- ZIPGAME_GAMES -->` placeholder)
- `directory of the html game name, for example n3ondashj.html, mean you need to create /n3ondashj/ directory
- put the game inside the directory (example: n3ondashj.html), inside the directory, rename it into index.html.
- the output will be a zipped file with these structure (for example): 
   -- index.html
   -- /n3ondashj/
   --- index.html (inside n3ondashj directory)
   --- manifest.webmanifest (optional PWA asset from src/n3ondashj/)
   --- sw.js (optional PWA asset from src/n3ondashj/)
   --- icon.svg (optional PWA asset from src/n3ondashj/)
- `deploy/` — Build artifacts / zips (gitignored)
