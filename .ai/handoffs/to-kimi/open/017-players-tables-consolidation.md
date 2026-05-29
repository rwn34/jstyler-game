# Handoff to Kimi — Players 9-tables → 3-sections consolidation

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-29
**Status:** Last untouched UX audit P1 item. ~1-1.5 hr. Pure frontend, no backend changes. Closes phase 3 of the dashboard refactor cycle.

The Players tab currently renders 9 separate tables in one scroll inside the "All" segment (Recently Active, High Motivation, New, Returning, Champions, Most Active, Top Completers, Wealthiest, plus Watchlist content showing in Flagged/Banned segments). Per the original UX audit at `.ai/reports/dashboard-ux-audit-2026-05-26.md` ("Players tab — 9 tables, no pagination"), the audit recommended *"consolidate into 3-4 with internal segment chips."*

Now's the time.

---

## Goal

Inside the existing top-level "All" segment (the default Players view), replace the 9 stacked tables with **3 thematic sections**, each section containing **one table** whose data + columns switch via a small inline chip-strip.

Existing top-level segments (`All / New / Active / Returning / Champions / 🚩 Flagged / ⛔ Banned`) **stay as-is**. Only the layout INSIDE the "All" segment changes.

---

## Target architecture (inside "All" segment)

| Section | Inline chips | Table contents |
|---|---|---|
| **🏃 Activity** | Recently Active · Most Active · High Motivation | Filtered/sorted by recency, total events, or motivation score |
| **📈 Progression** | New · Returning · Champions · Top Completers | Filtered/sorted by first-seen, return-day rate, champion status, or completion count |
| **💰 Economy** | Wealthiest · Top Earners · Top Spenders | Filtered/sorted by current balance, lifetime earned, or lifetime spent |

Each section header is an `<h2>` followed by the inline chip-strip and one `<Table>`. The chip-strip uses the same `<SubTabs>` pattern from phase 2 (`cloudflare/src/dashboard/components/SubTabs.jsx`) — small pill buttons, ARIA `role="tablist"`, arrow-key nav.

**Default chip per section** = the first one (Recently Active, New, Wealthiest). User selection within a section is **NOT persisted to URL** (sections are local state, unlike the top-level tab + segment which are URL-backed). Rationale: 3 chip selections × 7 top-level segments × range × player would explode the URL combinatorics for marginal benefit; URL deep-link goes only as deep as `#/players?segment=X`.

CSV export on each table reflects the currently-selected chip's data + columns.

---

## Server side — likely no changes needed

The existing `/stats/players` endpoint already returns the data shapes used by all 9 tables (per `tabs/Players.jsx` and `api.js`). If response data is currently structured as one `data` object with 9 named arrays (`recently_active[]`, `champions[]`, etc.), the client just picks which to display based on the chip selection — pure frontend reshuffle.

**Investigation step** (your first task): confirm the existing endpoint shape. If a needed chip combination would require a new query (e.g., "Top Earners" might not exist as a pre-computed list), either:
- (a) compute it client-side from existing arrays, or
- (b) add a minimal new field to the existing `/stats/players` response — flag it in the completion handoff if you go this route

Prefer (a). Avoid scope creep into backend.

---

## Implementation

### File: `cloudflare/src/dashboard/tabs/Players.jsx`

Inside the "All" segment branch, replace the 9-table stack with:

```jsx
{segment === 'all' && (
  <>
    <PlayersSection
      title="🏃 Activity"
      chips={[
        { id: 'recent', label: 'Recently Active', data: d.recently_active, columns: recentCols },
        { id: 'most',   label: 'Most Active',     data: d.most_active,     columns: mostCols   },
        { id: 'motiv',  label: 'High Motivation', data: d.high_motivation, columns: motivCols  },
      ]}
      exportFilenamePrefix="ndj-activity"
    />
    <PlayersSection
      title="📈 Progression"
      chips={[
        { id: 'new',        label: 'New',           data: d.new_players,    columns: newCols       },
        { id: 'returning',  label: 'Returning',     data: d.returning,      columns: returningCols },
        { id: 'champions',  label: 'Champions',     data: d.champions,      columns: championCols  },
        { id: 'completers', label: 'Top Completers',data: d.top_completers, columns: completerCols },
      ]}
      exportFilenamePrefix="ndj-progression"
    />
    <PlayersSection
      title="💰 Economy"
      chips={[
        { id: 'wealthy', label: 'Wealthiest',  data: d.wealthiest,    columns: wealthyCols },
        { id: 'earners', label: 'Top Earners', data: d.top_earners,   columns: earnerCols  },
        { id: 'spenders',label: 'Top Spenders',data: d.top_spenders,  columns: spenderCols },
      ]}
      exportFilenamePrefix="ndj-economy"
    />
  </>
)}
```

### Component: `cloudflare/src/dashboard/components/PlayersSection.jsx` (new)

A small (~50 LOC) reusable component:
- Renders `<h2>{title}</h2>`
- Renders the chip-strip via existing `<SubTabs />` (or a tiny inline equivalent if SubTabs isn't a fit)
- Renders one `<Table>` for the selected chip's `{data, columns}`
- Local `useState` for the active chip ID (default = chips[0].id)
- CSV export uses `${exportFilenamePrefix}-${activeChipId}-${range.value}-${today}.csv`

Empty state per chip uses existing `<EmptyState />` if `data?.length === 0`.

### CSS additions (if needed)

Add `.players-section { margin-bottom: 24px; }` + a small `.players-section > h2 { display:flex; align-items:center; gap:8px; }` if the title/icon spacing needs tightening. Reuse existing `.subtabs` class for the chip-strip — no new colors.

### Files NOT in scope

- `cloudflare/src/index.js` — no backend changes unless the endpoint shape needs a new field (flag if so)
- `cloudflare/src/dashboard/components/PlayerModal.jsx` — unchanged (modal is opened from any row click, same behavior)
- Other tabs — unchanged

---

## Validation plan

### A. Behavior parity

- [ ] Open Players → "All" segment shows 3 sections (Activity / Progression / Economy) instead of 9 stacked tables
- [ ] First chip in each section is selected by default
- [ ] Click "Most Active" chip in Activity section → table updates to show Most Active data + columns
- [ ] Click a row in any section → PlayerModal opens (unchanged behavior)
- [ ] Switch top-level segment to "🚩 Flagged" → 3-section layout hides, existing Flagged table shows (unchanged from sprint 2 phase 1)
- [ ] Switch back to "All" → 3-section layout returns, previously-selected chips inside each section reset to defaults (local state, no persistence)

### B. Data parity (no rows lost)

For each of the 9 source datasets (Recently Active, Most Active, High Motivation, New, Returning, Champions, Top Completers, Wealthiest, plus Top Earners + Top Spenders if you derived those client-side):
- [ ] Row count in the new chip-driven table matches what the old standalone table showed for the same range
- [ ] CSV export from chip → row count and columns match the pre-refactor CSV

### C. Accessibility

- [ ] Each section's chip-strip has `role="tablist"`
- [ ] Each chip has `role="tab"` + `aria-selected`
- [ ] Arrow-key nav within a chip-strip (Left/Right) moves selection
- [ ] Focus visible on chips matches existing `.subtab:focus-visible` style
- [ ] Section `<h2>` is in heading order (no skipped h-levels)

### D. Mobile (380px viewport)

- [ ] 3 sections stack vertically (no horizontal scroll on the section itself)
- [ ] Chip-strip inside each section horizontally scrolls if needed (existing SubTabs behavior)
- [ ] Tables horizontally scroll as they do today

### E. Playwright

- [ ] Add test 34: "All segment shows 3 sections, each with chip-strip and one table"
- [ ] Add test 34m: mobile variant
- [ ] All existing tests (37 after 014) still pass
- [ ] Regenerate screenshot baselines for `players.png` and `players-mobile.png`

---

## Self-grep-verify (per AGENTS.md §7)

In your completion handoff at `to-claude/open/017-players-tables-consolidation-complete.md`, paste output for:

```bash
# New section component exists
rg -n "function PlayersSection|export function PlayersSection" cloudflare/src/dashboard/components/PlayersSection.jsx

# Sections mounted in Players tab
rg -n "PlayersSection|🏃 Activity|📈 Progression|💰 Economy" cloudflare/src/dashboard/tabs/Players.jsx

# Chip-strip uses SubTabs (or local equivalent)
rg -n "SubTabs|role=\"tablist\"" cloudflare/src/dashboard/components/PlayersSection.jsx

# Old 9-table stack removed (in the All segment branch)
rg -n "Recently Active|Most Active|High Motivation|Top Completers|Wealthiest" cloudflare/src/dashboard/tabs/Players.jsx
# Expect these to appear ONLY inside the chips array(s), NOT as standalone <h2> + <Table> blocks

# Playwright test added
rg -n "PlayersSection|3 sections" cloudflare/tests/dashboard.spec.js
```

Plus the standard process discipline:
- ✅ Completion handoff in `to-claude/open/` (NOT `done/`)
- ✅ Commit + push to master with sensible message
- ✅ Run Playwright suite against deployed build; report pass/fail count

---

## What I'm NOT asking for

- **No backend endpoint changes** — if a derivation requires server-side, flag and defer to a follow-up
- **No URL-state persistence of chip selection** — sections stay local-state only
- **No column rework** — reuse the column definitions that already exist for each table
- **No Watchlist rework** — that's a separate top-level segment and stays as-is
- **No PlayerModal changes**
- **No CSV format change** beyond the per-chip filename
- **No new visual style** — reuse existing `.card`, `.subtabs`, `.table` classes

If during implementation you find that one of these constraints is making the refactor awkward (e.g., a chip's data shape doesn't fit the existing `<Table>` columns prop), STOP and write a quick question handoff to `to-claude/open/` before expanding scope.

---

## Files

| Action | File |
|---|---|
| New | `cloudflare/src/dashboard/components/PlayersSection.jsx` (~50 LOC) |
| Modify | `cloudflare/src/dashboard/tabs/Players.jsx` (replace 9-table stack inside "All" segment with 3 PlayersSection mounts) |
| Modify | `cloudflare/src/dashboard/dashboard.css` (small `.players-section` style if needed) |
| Modify | `cloudflare/tests/dashboard.spec.js` (+2 tests: 34, 34m) |
| Regenerate | `cloudflare/tests/dashboard/visual/players.png`, `players-mobile.png` |

Net LOC: should be roughly neutral or slightly negative (3 sections + 1 new component vs 9 inline table blocks).

---

## After 017 lands

Sprint 3 / dashboard refactor cycle is **fully complete**. Remaining backlog after this:

- **Phase 2.5 anti-fraud referrals** — wait for ~1 week of real referral traffic to inform what's worth detecting
- **Phase 2.5 column promotion** of `events._cc`/`_v` to indexed columns — only if `range=all` queries blow budgets in real use
- **Git history scrub** — parked; secret rotation was the actual mitigation

All of those are either data-dependent or explicitly parked. 017 is the natural last item before stopping the dashboard refactor cycle and letting real user telemetry drive what's next.

---

## When done

- `npm.cmd run build && npx.cmd wrangler deploy`
- Run Playwright suite (~37 tests + 2 new) against the deployed build
- Commit + push to master (don't repeat the 014 mistake)
- Move this handoff to `to-kimi/done/`
- Write completion handoff at **`to-claude/open/017-players-tables-consolidation-complete.md`** with grep snippets
- Prepend activity log entry
