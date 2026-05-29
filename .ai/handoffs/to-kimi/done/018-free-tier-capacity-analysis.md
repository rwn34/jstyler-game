# Handoff to Kimi — 018: Free-Tier Capacity Analysis from D1 Behavioral Data

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-29
**Status:** Read-only analysis + report. ~45-60 min. No code changes, no deploys.

User asks: **will the Cloudflare free tier hold up at 100 DAU × 15-30 min playtime each, given how the app currently behaves?**

Current state: <5 DAU, short sessions. We have ~24 hrs of real telemetry at this scale plus everything from earlier testing. Project from real per-player behavior, don't guess from theoretical event rates.

**Note on terminology:** the user said "R2 database" but the project uses **Cloudflare D1** (SQLite) for behavioral data. R2 is object storage and isn't used here. Treat the request as "query D1 for behavioral data."

---

## What to produce

A report at `.ai/reports/free-tier-capacity-analysis-2026-05-29.md` covering:

### 1. Current behavioral baseline (measured, not guessed)

Query D1 directly via `wrangler d1 execute ndj-metrics-db --remote --command "..."` to compute:

- Average events emitted per player per session (broken down by `type`: session_start, heartbeat, level_start, level_complete, level_death, purchase, ui_event, name_set, feedback)
- Average session length per player (`session_start` → last event timestamp)
- Average events per player per day (group by pid + date)
- `/sync/save` and `/sync/load` request rate per player per day (use `sync_history` row count as a proxy for saves; loads are harder to count but estimate from rate-limit telemetry or just multiply by 2-3× saves)
- Median + p95 of all per-player-per-day metrics (avoid being misled by outliers in a small sample)

If sample size is too small to be statistically meaningful (likely; <5 DAU × few days), flag the uncertainty explicitly. **Don't fabricate a confidence interval the data can't support.** State the range and the n.

### 2. Projection to 100 DAU × 15-30 min

Multiply the measured per-player rates by 100. Compute daily totals for:

- **Workers requests/day** (events POSTed + sync calls + cron triggers + dashboard fetches if relevant)
- **Workers CPU-ms/day** (rough estimate: avg ms/request × requests/day). If you don't have CPU timing in the data, use a defensible heuristic (e.g., 5ms median for `/event`, 30ms for `/sync/save`, etc.) and note the assumption.
- **D1 rows read/day**
- **D1 rows written/day**
- **D1 storage growth/day** in MB

Show both 15-min and 30-min variants so the user sees the range.

### 3. Free-tier limits (look up current published values)

Use `wrangler whoami` or the Cloudflare dashboard to confirm the account is on the free plan. Then table the relevant limits as of today (publish authoritative values, not from memory — check Cloudflare's docs page). Probable values to verify:

- Workers: requests/day, CPU-ms/request, subrequests/request
- D1: rows read/day, rows written/day, storage cap
- Cron: invocations/day
- Logs: ingestion limit (Logpush etc.)

If any limit changed recently or has a "neutered free tier" caveat (Cloudflare has been adjusting limits), surface it.

### 4. Headroom analysis

For each dimension, compute: `projected_usage / free_tier_limit × 100%`.

- 🟢 **<40%** — comfortable, no action
- 🟡 **40-80%** — watch, plan mitigation
- 🔴 **>80%** — must mitigate before scaling

For any 🔴 or 🟡 row, propose concrete mitigations:

- Batch events client-side (we already have `/events/batch` — confirm the client actually uses it; if not, flag as a quick win)
- Reduce heartbeat frequency (currently 60s? could be 120s or 300s with minimal analytics loss)
- Move dashboard reads to a separate Worker so they don't count against player ingestion budget
- Add basic rate limiting per pid to defend against bot traffic that would otherwise eat budget
- Move to paid plan ($5/mo Workers Paid + D1 paid) — break-even calc: at what DAU does paid become necessary?

### 5. Bonus: which event types dominate the budget

Group events by `type` and show the count + share of total. If `heartbeat` is 70% of events (likely), call it out — it's the easiest knob to turn.

Also flag if any specific endpoint dominates CPU time. If we don't have per-endpoint timing instrumented, recommend a one-line `console.log` budget patch that future iterations can use.

### 6. Headroom summary table (one screen)

```
| Resource              | Current (5 DAU) | Projected (100 DAU, 15min) | Projected (100 DAU, 30min) | Free tier | Headroom |
|-----------------------|-----------------|-----------------------------|-----------------------------|-----------|----------|
| Workers requests/day  |                 |                             |                             |           |          |
| Workers CPU-ms/day    |                 |                             |                             |           |          |
| D1 rows read/day      |                 |                             |                             |           |          |
| D1 rows written/day   |                 |                             |                             |           |          |
| D1 storage growth/day |                 |                             |                             |           |          |
| Cron invocations/day  |                 |                             |                             |           |          |
```

---

## Constraints

- **Read-only queries** against prod D1. No writes, no schema changes.
- **No code mutations** to `cloudflare/src/`. If you find a free-tier-saving change worth making (e.g., `/events/batch` not used despite being available), write a follow-up handoff to claude-code with the proposal — don't ship it as part of this analysis.
- **No deploys** — pure analysis.
- **Don't pad numbers.** If sample size is too small, say so. Cloudflare's docs are authoritative for limits — cite the URL you pulled them from.

---

## Self-validation (run before writing the completion handoff)

- [ ] Report file exists at `.ai/reports/free-tier-capacity-analysis-2026-05-29.md`
- [ ] All six sections from "What to produce" are present
- [ ] Headroom table is filled with numbers (or "uncertain — n=X" if data is too thin)
- [ ] Each free-tier limit is cited with a Cloudflare docs URL (so the user can re-verify if limits change)
- [ ] Mitigation proposals are concrete (file + function + 1-2 sentence change), not vague ("optimize queries")
- [ ] You ran at least 5 distinct `wrangler d1 execute` queries to gather the data
- [ ] Edge cases noted: bot traffic possibility, sync storms (every device on resume), cron schedule (hourly currently — does that count against /req budget?)

---

## Self-grep-verify for the completion handoff (per AGENTS.md §7)

```bash
# Report exists with expected sections
rg -n "^## " .ai/reports/free-tier-capacity-analysis-2026-05-29.md

# Cited Cloudflare docs URLs
rg -n "developers.cloudflare.com|cloudflare.com/docs" .ai/reports/free-tier-capacity-analysis-2026-05-29.md

# Has actual measured numbers (not just "TBD")
rg -n "events/day|requests/day|MB/day|rows/day" .ai/reports/free-tier-capacity-analysis-2026-05-29.md

# Mitigation proposals (concrete files/functions)
rg -n "cloudflare/src/index.js|src/n3ondashj|HEARTBEAT|/events/batch" .ai/reports/free-tier-capacity-analysis-2026-05-29.md
```

Paste output next to each claim in your completion handoff at **`to-claude/open/018-free-tier-capacity-analysis-complete.md`**.

---

## When done

- Report committed to git (it's just a markdown file)
- Move this handoff to `to-kimi/done/`
- Write completion handoff at `to-claude/open/018-free-tier-capacity-analysis-complete.md` with:
  - The headroom summary table copy-pasted into the handoff body
  - Top 3 mitigation recommendations
  - One-line answer: "Will we fit?" (yes / yes-with-caveats / no-need-paid-plan)
  - Grep snippets per AGENTS.md §7
- Prepend activity log entry with the one-line answer

If during the analysis you realize Cloudflare's published limits are actually being calculated by something other than what we've been assuming (e.g., CPU time on the free plan was 10ms then bumped to 30s with the standard plan changes), flag it loudly — that's the kind of nuance that changes the recommendation.

---

## What I'm NOT asking for

- A full load test (would need synthetic traffic generator)
- Optimization work (separate handoff if findings warrant)
- Per-region breakdown (single Cloudflare account, no need)
- Forecasting beyond 100 DAU (single target, single horizon)
- Cost projection for paid plans beyond a single "break-even DAU" number

Keep the report tight — under 600 lines. The headroom table is the deliverable; everything else is supporting evidence.
