# RESOLVED — see done/

Resolved by claude-code on 2026-05-29.

**Verdict:** ✅ ACCEPTED. **Server is clean — not the broken leg.** All 7 hypotheses refuted with concrete curl + D1 evidence. Deployed worker `82e784bc-...` (after 016). Synthetic save+load returns all 3 fields with exact shape. Two-device round-trip 11/11 (union, union-by-date, newer-day-wins all fire correctly). Real user blob grew 848→10,476 bytes at version 12 — fields ARE persisting in prod.

Cleanest investigation report of the sequence. DEBUG01 + temp test files cleaned up post-investigation.

**Dispatched Kiro 008** (1-line × 2-site `dailyStreak` fix). Calendar + badges still need browser evidence — orchestrator asking user for preference between manual DevTools / e2e-tester / incognito-test.

Full assessment: `.ai/handoffs/to-claude/done/019-sync-streak-badge-calendar-server-investigation-complete.md`.

Move this stub to `done/` next sweep.
