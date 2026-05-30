# Handoff 018 Acceptance — Free-Tier Capacity Analysis (RESOLVED)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-29
**Resolved:** 2026-05-29 by claude-code

---

## Verdict: ✅ ACCEPTED.

Headline: **Yes — Cloudflare free tier holds 100 DAU × 15-30 min with caveats.** All 6 dimensions rate 🟢, but D1 rows written reaches ~39% of cap at the 30-min end. Three concrete mitigations would expand headroom to 200-250 DAU comfortably.

Spot-checked the report file (`.ai/reports/free-tier-capacity-analysis-2026-05-29.md`, 419 lines). Section 1.1 leads with statistical-honesty caveat (19 days, 180 lifetime PIDs, only 8-17 DAU in the recent week, 84 player-day observations). Reports observed ranges, not fabricated confidence intervals. Exactly the integrity the analysis needed.

---

## Headroom summary

| Resource | ~10 DAU now | 100 DAU × 15 min | 100 DAU × 30 min | Free cap | Headroom |
|---|---|---|---|---|---|
| Workers req/day | ~410 | ~19,900 | ~38,800 | 100,000 | 🟢 20-39% |
| Workers CPU-ms/day | ~1,200 | ~55,000 | ~105,000 | 1,000,000 | 🟢 6-11% |
| D1 rows read/day | ~160,000 | ~1.62 M | ~1.64 M | 5 M | 🟢 32% |
| D1 rows written/day | ~394 | ~19,800 | ~38,700 | 100,000 | 🟢 20-39% |
| D1 storage/day | ~0.12 MB | ~6.2 MB | ~12 MB | 500 MB/db | 🟢 <1% |
| Cron/day | 24 | 24 | 24 | scheduled | 🟢 |

### Hidden budget consumer
Dashboard `/stats` reads chew ~32% of the D1 read budget. The cache mitigation alone could drop that to ~5%.

---

## Three concrete mitigations (Kimi's recommendations)

| # | Change | File | Effort | Impact |
|---|---|---|---|---|
| 1 | Batch online events in a 5-second buffer via `/events/batch` | `src/n3ondashj/02-data.js` | 1-2 hr | -5-10× requests |
| 2 | Heartbeat 90s → 180s (or 300s) | `src/n3ondashj/02-data.js` | 5 min | -50% (or -70%) heartbeat volume |
| 3 | 60-second in-memory cache for `/stats` | `cloudflare/src/index.js` | 30 min | -80-90% dashboard-driven D1 reads |

**Break-even for $5/mo Workers Paid plan:** ~250-500 DAU depending on which mitigations land.

---

## Verification

- ✅ Report exists with 10 sections (current baseline, projection, free-tier limits, headroom analysis, event-type dominance, summary table, edge cases, mitigations, break-even DAU, one-line answer)
- ✅ 4 authoritative Cloudflare docs URLs cited (workers/pricing, workers/limits, d1/pricing, d1/limits)
- ✅ 8 distinct `wrangler d1 execute` queries documented in the completion handoff
- ✅ Mitigation proposals are concrete (file + change + estimate), not vague
- ✅ Sample-size caveat clearly stated; ranges used instead of CIs
- ✅ Edge cases section addresses bot defense + sync storm risks

---

## Edge cases worth user attention

From the report's §7:
- **Bot/abuse traffic** could eat the free budget faster than legitimate growth. Per-pid rate-limit was already on the future-work backlog; this is one more reason to prioritize it before scaling beyond ~100 DAU.
- **Sync storms** — many devices waking up around the same time (e.g., morning commute) could spike `/sync/save` rate beyond steady-state averages. Heartbeat reduction (mitigation #2) blunts this somewhat; explicit jitter on client-side sync cadence would be a small follow-up if observed.

---

## What this unblocks

User now has a defensible answer for scaling planning. The dashboard refactor cycle is complete (017), the multi-device sync work is complete (016), and the free-tier capacity analysis (this) provides the cost-side context for whether the current architecture supports the growth target.

Natural stopping point. Real player activity on v1.2.65 should inform what comes next better than continuing to push on synthetic audit items.

---

This handoff is resolved.
