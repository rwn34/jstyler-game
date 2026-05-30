# Handoff to Kimi — Server-side investigation: streak/badge/calendar sync

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-29
**Status:** Investigation handoff — diagnostic, not a fix. ~20-30 min. Pair with Kiro 007 (client-side investigation) for triangulation.

User reports: despite 006 (client) + 015 (server schema) + 016 (server field-name correction) shipping, **streak / daily-stage badges / 27-day calendar still don't sync across devices.** Something in the round-trip isn't working in practice.

We're not guessing. Independent triangulation: you confirm what the server is doing, Kiro confirms what the client is doing, orchestrator cross-references the findings.

---

## What we know is correct in code

Per handoff 016 acceptance, verified at `cloudflare/src/index.js`:

```
:1586       SYNC MERGE SCHEMA block comment
:1827       if (Array.isArray(data.playDays)) — union + 31-day trim
:1834       if (Array.isArray(data.dailyCollection)) — array union by .date, ≤90
:1850       if (data.dailyStats && typeof === 'object') — newer-day-wins compound
```

Commit `b3a9586` pushed. Worker `de2209b8-d003-4bad-bcd6-799e15d5b079`. **Assume this is correct in the source; question whether it's the deployed worker behavior the user is hitting.**

---

## Investigation steps — each produces a finding to report back

### 1. Confirm deployed worker version

```
npx wrangler deployments list --name ndj-metrics
```

- Confirm the most recent active deployment is `de2209b8-...` or later (016's worker)
- If a newer one exists, note its ID and what commit it corresponds to
- If the active deployment is older than 016, **that's the answer** — the merge logic isn't live yet. Report finding and stop.

### 2. Confirm the live source matches the expected merge logic

```bash
npx wrangler tail ndj-metrics --format json
```

In a separate terminal, trigger a `/sync/save` against the live worker with a known payload containing all three fields. Look at the tail output for any unexpected errors or warnings.

Then:
```bash
curl -X POST https://ndj-metrics.jstylr.workers.dev/sync/save \
  -H "Content-Type: application/json" \
  -d '{"username":"DEBUG01","mmyy":"0100","pin":"111111","deviceId":"d_dbg","data":{"playerName":"DEBUG01","playerMmyy":"0100","playDays":["2026-05-29"],"dailyCollection":[{"date":"2026-05-29","name":"X","time":1234,"rankIdx":1}],"dailyStats":{"day":"2026-05-29","played":true,"completed":true,"bestTime":1234,"deaths":0,"reward":50}}}'
```

(Adjust to whatever signed/encrypted payload your endpoint actually expects — match the smoke_test.js setup if easier.)

**Report finding:** does the server actually accept and parse the payload? Any errors in the tail?

### 3. Query D1 directly for what's stored

After the synthetic save above:

```bash
npx wrangler d1 execute ndj-metrics-db --remote --command "
SELECT key_hash, length(data_json), substr(data_json, 1, 200) as data_preview
FROM sync_states
WHERE key_hash = (SELECT key_hash FROM sync_lookup WHERE username = 'DEBUG01' AND mmyy = '0100')
"
```

The `data_json` is AES-encrypted, so you can't grep it as plaintext. Instead, hit your own `/sync/load` for `DEBUG01` and check the response — the server decrypts, applies merge, returns plaintext.

```bash
curl -X POST https://ndj-metrics.jstylr.workers.dev/sync/load \
  -H "Content-Type: application/json" \
  -d '{"username":"DEBUG01","mmyy":"0100","pin":"111111","deviceId":"d_dbg"}'
```

**Report finding:** does the response from `/sync/load` contain `playDays`, `dailyCollection`, `dailyStats`? Same shape as what you saved?

### 4. Two-device round-trip via smoke_test.js pattern

Adapt the existing 36-test `smoke_test.js` to add a single "user reality" test:

- Device A: save with `playDays:['2026-05-27']`, `dailyCollection:[{date:'2026-05-27',...}]`, `dailyStats:{day:'2026-05-27',played:true,completed:true,...}`
- Device B: load (no prior data) → assert all three fields come back with the May-27 entries
- Device B: save with `playDays:['2026-05-28']`, `dailyCollection:[{date:'2026-05-28',...}]`, `dailyStats:{day:'2026-05-28',played:true,...}`
- Device A: load → assert:
  - `playDays` contains BOTH `2026-05-27` AND `2026-05-28` (union)
  - `dailyCollection` contains BOTH entries (union by date)
  - `dailyStats.day === '2026-05-28'` (newer wins)

If any assertion fails, you've reproduced the user's report. Report which leg fails.

Cleanup the test account (DELETE from sync_states/sync_lookup/sync_history) after.

### 5. Spot-check a real prod row

Pick any actually-active prod account (you can identify recent ones via `SELECT MAX(updated_at), key_hash FROM sync_states ORDER BY updated_at DESC LIMIT 5`).

Without decrypting their data (privacy), check:
- `length(data_json)` — is it growing between saves? If a real user has been playing across devices, the encrypted blob should be larger than a fresh account's blob.
- `updated_at` history via `SELECT version, length(data_json), created_at FROM sync_history WHERE key_hash = ? ORDER BY version DESC LIMIT 5` — has the blob length been stable around the same value, suggesting nothing's being added?

This is statistical, not definitive — but if data_json is rock-steady at 800 bytes across 20 saves from a multi-device user, that's a strong "the new fields aren't getting through" signal.

### 6. Worker tail during the user's actual session (optional)

If the user can reproduce live:
```bash
npx wrangler tail ndj-metrics --format pretty
```

Have them trigger a save + load while you watch. Any 500s, 400s, or noteworthy log lines? The existing code might be silently failing on a malformed payload.

---

## Hypothesis grid — fill in after investigation

| Hypothesis | Step that confirms/refutes | Finding |
|---|---|---|
| Deployed worker isn't the 016 version | Step 1 | |
| Save endpoint rejects the new payload shape | Step 2 | |
| Save accepts but merge code never fires | Step 3 (load shows empty) | |
| Merge fires but result isn't persisted | Step 3 (length stays same) | |
| Load returns the data but client doesn't apply | Step 3 (server returns OK; Kiro 007 reports client issue) |
| Round-trip works for synthetic, fails for real users | Step 4 vs Step 5 | |
| Silent error during save (caught + swallowed) | Step 6 | |

---

## Don't fix during investigation

Same rule as Kiro's handoff: this is read/diagnostic only. If you discover a bug obviously fixable in 1-2 lines, document it; orchestrator decides whether to spawn a fix handoff.

**Exception:** if you find an actively-corrupting bug (e.g., data loss on every save), STOP the investigation and write to `to-claude/open/` immediately. Don't sit on a live regression while finishing the report.

---

## Self-validation before writing the completion handoff

- [ ] Step 1 has the deployed worker version ID
- [ ] Step 2 has raw curl request + response captured
- [ ] Step 3 has the load-response JSON verbatim
- [ ] Step 4 reports which round-trip assertion (if any) fails
- [ ] Step 5 has the SELECT MAX(updated_at) result + length distribution
- [ ] Hypothesis grid is filled in
- [ ] Test account `DEBUG01` is cleaned up (no synthetic data left in prod D1)
- [ ] No source code changes pushed

---

## Self-grep-verify for the completion handoff (per AGENTS.md §7)

```bash
# Live worker version
npx wrangler deployments list --name ndj-metrics | head -5

# Confirm merge code still matches expected shape
rg -n "data\.playDays|data\.dailyCollection|data\.dailyStats" cloudflare/src/index.js

# Smoke test extension (if you added the round-trip test)
rg -n "two-device round-trip|user reality|DEBUG01" cloudflare/smoke_test.js
```

Plus paste raw curl request/response JSON verbatim. Those are the load-bearing evidence.

---

## When done

- Write completion handoff at `to-claude/open/019-sync-streak-badge-calendar-server-investigation-complete.md`
- Include the hypothesis grid filled in
- Include raw curl + smoke_test traces
- Move this handoff to `to-kimi/done/`
- Activity log entry
- **No source code changes pushed unless emergency**

## Coordinating with Kiro 007

Kiro is running a parallel client-side investigation (verify v1.2.65 actually loaded in prod, decrypt+inspect the save payload before encrypt, inspect the load response before applying, verify UI re-renders post-load). Don't coordinate live with Kiro — independent observations are more useful than agreed-upon observations. Both reports come back, orchestrator cross-references, then we know exactly which leg of the round-trip is broken and write a targeted fix handoff.
