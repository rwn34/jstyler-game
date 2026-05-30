# Handoff 019 Acceptance — Server-side Sync Investigation (Kimi)

**From:** kimi-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-29
**Resolved:** 2026-05-29 by claude-code

---

## Verdict: ✅ ACCEPTED. Server is verified clean — not the broken leg.

All 7 hypotheses refuted with concrete evidence. Process discipline: file in `to-claude/open/`, raw curl JSON + D1 query results preserved as evidence, DEBUG01 cleaned up post-investigation, temporary test files removed, no source code changes.

This is the cleanest investigation report of the sequence — direct curls + D1 SELECTs are the load-bearing artifacts and Kimi captured them verbatim.

---

## Key findings — verified

```
Deployed worker:    82e784bc-f71f-4491-b012-f7a59dcb8963 (created 2026-05-29T08:54:36)
After 016 deploy:   de2209b8-... (created 2026-05-29T08:09:15)
```

### Synthetic save round-trip
- Save: `{"ok":true,"approvedPurchases":[],"rejectedPurchases":[],"serverTs":1780065848288}`
- Load: returns `playDays:["2026-05-29"]`, `dailyCollection:[{date:"2026-05-29",...}]`, `dailyStats:{day:"2026-05-29",...}` with **exact shape preserved**

### Two-device round-trip (11/11)
- Device A saves May-27 → B loads (gets all 3 fields with May-27) → B saves May-28 → A loads → asserts:
  - `playDays` contains BOTH May-27 AND May-28 (union ✓)
  - `dailyCollection` contains both A and B entries (union by date ✓)
  - `dailyStats.day` is May-28 (newer wins ✓)

### Real user persistence signal
- Account `36a51...69` history versions 9, 10, 11 = 848 bytes each (pre-schema-upgrade era)
- Version 12 = **10,476 bytes** (12× jump). Strong evidence the new fields ARE persisting for real users once they upgrade their client.

---

## Cleanup confirmed

- DEBUG01 deleted from sync_states, sync_lookup, sync_history (verified via D1 query: 0 rows; load returns "invalid credentials")
- Temp files removed: `cloudflare/smoke_test_019.js`, `cloudflare/smoke_test.js.bak`
- `smoke_test.js` verified at original state (no git diff)

---

## What this means for the user-reported symptoms

| Symptom | Server returns it? | Client receives it? | UI shows it post-sync? |
|---|---|---|---|
| Streak | ✅ (verified) | ✅ via save() | ❌ module-var stale until reload (Kiro 007 bug) |
| Calendar (`playDays`) | ✅ (verified) | ✅ module var + save() | ❓ NEEDS BROWSER EVIDENCE |
| Badges (`dailyCollection`) | ✅ (verified) | ✅ module var + save() | ❓ NEEDS BROWSER EVIDENCE |
| Daily stats | ✅ (verified) | ✅ localStorage only (no module var, correct) | ❓ NEEDS BROWSER EVIDENCE |
| Frozen days | ✅ (verified pre-006) | ✅ localStorage only | n/a |

The streak failure is fully explained by Kiro's static finding. Calendar + badges are mysteries that static analysis + server analysis cannot solve. Need real-browser evidence: payload-on-wire, response-on-wire, localStorage post-load, UI render timing.

---

## Outstanding work

1. **Dispatch Kiro 008** — 1-line × 2-site `dailyStreak` fix (queued)
2. **Browser evidence for calendar + badges** — user choice between:
   - (a) Manual DevTools capture by user (~3 min)
   - (b) e2e-tester subagent with Playwright (~10 min, needs test account credentials)
   - (c) Test in incognito to rule out PWA cache staleness

Orchestrator is asking user for preference (a/b/c) in the next message.

---

This handoff is resolved.
