# Handoff 007 Acceptance — Sync Investigation (Static, Kiro)

**From:** kiro-cli
**To:** claude-code (orchestrator)
**Date:** 2026-05-29
**Resolved:** 2026-05-29 by claude-code

---

## Verdict: ✅ Investigation accepted. One bug confirmed via static analysis. Browser-side steps remain pending an e2e agent or user evidence.

Process discipline: file in `to-claude/open/`, grep snippets present, no source code changes, no temporary `console.log` left behind, hypothesis grid filled. Clean delivery.

---

## Key finding — `dailyStreak` stale-memory bug (confirmed)

```
src/n3ondashj/03-save.js:502   if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);}
src/n3ondashj/03-save.js:605   if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);}
src/n3ondashj/03-save.js:920   var dailyStreak = load('dailyStreak', 0);  // module var
```

Both load branches write `cloud.dailyStreak` to localStorage but don't reassign the module-level `dailyStreak`. UI reads from module var at 5 sites (1004, 1014, 1710, 1763, 1781). Masked by `confirmLinkDevice` → `restartGame()` → `location.reload()` (`04-ui.js:813, 817-820`). Surfaces on background / auto-sync paths.

**One-line fix when authorized:**
```js
// Line 502 + 605: same shape
if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);dailyStreak=cloud.dailyStreak;}
```

---

## Hypothesis grid — orchestrator updates

Kiro's grid had "PWA still cached on v1.2.64" as the leading hypothesis. **User confirmation in the next-turn message refutes it**: v1.2.68 is live on Pages. Updating:

| Hypothesis | Static evidence | Verdict |
|---|---|---|
| PWA cached on v1.2.64 | n/a | **REFUTED** — user confirmed v1.2.68 live |
| Client doesn't send fields on save | Fields present at `:430-434` | REFUTED statically |
| Server returns empty for fields | Cannot verify statically | **PENDING Kimi 019** |
| Client receives but doesn't write localStorage | `save()` correctly called at `:507-509, :613-615` | REFUTED statically |
| Client writes localStorage but UI reads stale memory | `dailyStreak`: CONFIRMED bug. `playDays`/`dailyCollection`: module-var IS updated. `dailyStats`/`frozenDays`: no module var, read fresh. | **CONFIRMED for `dailyStreak` only** |
| `dailyStats` line 509 doesn't update module var | `dailyStats` is NOT a module-level var | NOT A BUG |
| `dailyStreak`/`frozenDays` were never syncing | `dailyStreak` partial (module-var bug). `frozenDays` no bug. | `dailyStreak` partial |

---

## Field-by-field code path map (verified)

| Field | Module var? | In payload? | Load updates var? | UI reads from | Verdict |
|---|---|---|---|---|---|
| `playDays` | ✅ `:929` | ✅ `:432` | ✅ `:507`, `:613` (`playDays=trimmed`) | module var | OK |
| `dailyCollection` | ✅ `:930` | ✅ `:433` | ✅ `:508`, `:614` (`dailyCollection=cloud.dailyCollection.slice()`) | module var | OK |
| `dailyStats` | ❌ no module var | ✅ `:434` | save() only at `:509`, `:615` | localStorage via `getDailyStats()` | OK |
| **`dailyStreak`** | ✅ `:920` | ✅ `:431` | ❌ save() only at `:502`, `:605` | **module var** | **BUG** |
| `frozenDays` | ❌ no module var | ✅ `:430` | save() only at `:504`, `:607` | localStorage | OK |

---

## What still requires browser evidence (cannot be done from CLI)

Steps 1-3 of the original handoff need a real browser:

1. Confirm `APP_VERSION === 'v1.2.68'` in user's actual browser (now likely confirmed by user, but a manual `APP_VERSION` console check provides certainty)
2. Add temp `console.log` of save payload before AES encrypt → capture raw JSON of what's actually going to the server
3. Add temp `console.log` of `cloud` object after decrypt → capture raw JSON of what's coming back

For `playDays` and `dailyCollection` — if static analysis is correct AND server is returning them correctly, those should work. If user STILL observes them not syncing, then either:
- Server's not returning them (Kimi 019 confirms or refutes)
- There's a render-timing bug (UI not refreshing post-load — likely needs Playwright/e2e to repro)
- A localStorage write isn't sticking (PWA quirks; rare)

---

## Outstanding work after this acceptance

1. **Wait for Kimi 019 server-side investigation report** to triangulate
2. **Decide on `dailyStreak` fix:** ship now as a tiny standalone Kiro fix (1-line × 2 sites), OR bundle with whatever else Kimi 019 surfaces
3. **Browser evidence for calendar + badges:** if Kimi 019 confirms server returns the fields correctly, spawn an e2e-tester to run steps 1-3 against a known test account, OR ask user to do the DevTools capture themselves

---

## Process scorecard

| Check | Status |
|---|---|
| File in `to-claude/open/` (not `done/`) | ✅ |
| Grep snippets present | ✅ |
| No source code changes | ✅ |
| No temporary `console.log` left behind | ✅ |
| Hypothesis grid filled in | ✅ |
| Self-rated honesty (browser steps explicitly NOT executed) | ✅ |
| Refrained from shipping the fix | ✅ |

Clean process. Same bar Kimi has been hitting for the last 5 deliveries.

---

This handoff is resolved. `dailyStreak` fix queued pending Kimi 019 report.
