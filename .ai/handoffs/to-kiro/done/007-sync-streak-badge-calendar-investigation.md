# Handoff to Kiro — Investigate why streak/badge/calendar don't sync

**From:** claude-code (orchestrator)
**To:** kiro-cli
**Date:** 2026-05-29
**Status:** Investigation handoff — diagnostic, not a fix. ~20-30 min. Pair with Kimi 019 (server-side investigation) for triangulation.

User reports: after the v1.2.65 work (handoff 006 added `playDays` + `dailyCollection` + `dailyStats` to cloud sync; server 015/016 added merge rules), **the streak / daily-stage badges / 27-day calendar still don't actually sync across devices.** Something between "we shipped code that should work" and "user observes nothing changed."

We're not going to guess. We're going to triangulate.

---

## What we know is correct in code

Grep-verified in your last completion:

```
src/n3ondashj/03-save.js:432   playDays:load('playDays',[]),
src/n3ondashj/03-save.js:433   dailyCollection:load('dailyCollection',[]),
src/n3ondashj/03-save.js:434   dailyStats:load('dailyStats',{}),
src/n3ondashj/03-save.js:507-509   load branch 1 applies all three
src/n3ondashj/03-save.js:613-615   load branch 2 mirrors branch 1
```

And the corresponding server merge logic is at `cloudflare/src/index.js:1827, 1834, 1850` (verified in handoff 016).

So the code says it should work. Something in the actual round-trip is breaking. Find what.

---

## Investigation steps — each produces a finding to report back

### 1. Confirm which client version is actually running

In the user's actual browser (or a representative one):

- Open DevTools → Console → run `APP_VERSION` — confirm it returns `'v1.2.65'`
- Fetch `/sw.js` directly (Network tab) and confirm `CACHE_NAME` includes `v1.2.65`
- Check `deploy/latest/` was actually uploaded to Cloudflare Pages — if user is testing against an old v1.2.64 PWA cached on iOS, the new payload fields aren't being sent at all

**If client is < v1.2.65 in prod:** this is the answer. Stop here, instruct user to clear PWA cache + reinstall OR force a service-worker update via `navigator.serviceWorker.getRegistration().then(r => r.update())`.

### 2. Verify save payload over the wire

With a v1.2.65 client open:

- Play 3 levels to populate `dailyCollection`/`dailyStats`/`playDays`
- Trigger a cloud-save (via the Sync panel or whatever forces it)
- DevTools Network tab → find the POST to `/sync/save`
- **Decrypt the request body** — it's AES-GCM encrypted, but the `data` object before encryption is what matters. Add a temporary `console.log('payload before encrypt:', JSON.stringify(data))` right before the `aesEncrypt` call (around `03-save.js` line ~470 — wherever the encrypt happens). Reload. Re-trigger save. Read the log.
- Confirm the logged payload includes:
  - `playDays: ['2026-05-29', ...]`
  - `dailyCollection: [{date:'...', name:'...', time:..., rankIdx:...}, ...]`
  - `dailyStats: {day:'...', played:true, completed:true, ...}`
- **Remove the `console.log`** when done — don't leak data in prod.

**Report finding:** which fields are present + their shape. If `dailyCollection` is `[]` because the player hasn't earned any badges yet, that's normal — note it.

### 3. Verify load response → localStorage write

Same browser:

- Forcibly clear localStorage (`localStorage.clear()`) to simulate a fresh device
- Trigger `/sync/load` with valid credentials
- DevTools Network → find the response from `/sync/load`
- Add temporary `console.log('cloud data after decrypt:', JSON.stringify(cloud))` right before the `if(Array.isArray(cloud.playDays))` block (around line 506 in branch 1, or 612 in branch 2)
- Confirm the logged `cloud` object contains `playDays`, `dailyCollection`, `dailyStats` from the server
- Confirm `localStorage.getItem('playDays')` is non-empty after load completes
- Confirm `localStorage.getItem('dailyCollection')` is non-empty
- Confirm `localStorage.getItem('dailyStats')` is non-empty

**Report finding:** what came back from the server. This pinpoints whether the issue is server-not-returning vs client-not-applying.

### 4. Verify UI re-renders after load

After step 3 (with the localStorage populated):

- Without reloading the page, navigate to the streak calendar widget
- Does it show the synced days?
- Does the badges UI show the synced badges?
- Does the daily-stage state reflect `dailyStats.completed`?

If localStorage has the data but the UI is empty, that's a re-render bug — the UI is reading from in-memory state that wasn't updated. Check that the load branches (`:507-509` and `:613-615`) update **in-memory variables** too, not just localStorage:

- `:507` does `playDays=trimmed;` ✅
- `:508` does `dailyCollection=cloud.dailyCollection.slice();save(...)` ✅
- `:509` does ONLY `save('dailyStats',cloud.dailyStats);` — **does NOT update an in-memory `dailyStats` variable.** Grep to confirm: `rg -n "^var dailyStats" src/n3ondashj/`. If `dailyStats` is held as a module-level variable that the UI reads, this is the bug. If `dailyStats` is read from localStorage every render via `load('dailyStats', ...)`, the save call is sufficient.

**Report finding:** which fields read from localStorage every render vs which hold module-level state. List any that hold module state and aren't being updated post-load.

### 5. Verify dailyStreak (integer) and frozenDays (array)

These were supposed to sync before v1.2.65 (sprint 1 work). If the user reports streak counter doesn't sync either, the bug isn't new — it's been there for weeks. Triple-check:

```bash
rg -n "dailyStreak" src/n3ondashj/03-save.js
```

Confirm:
- `dailyStreak` IS in the save payload (around line 430)
- The load branches apply `cloud.dailyStreak` (lines 498 / ~597)
- After load, `localStorage.getItem('dailyStreak')` matches the server value

Same for `frozenDays`.

---

## Hypothesis grid — fill in after investigation

| Hypothesis | Step that confirms/refutes | Finding |
|---|---|---|
| User's PWA still cached on v1.2.64 | Step 1 | |
| v1.2.65 client doesn't send fields on save | Step 2 | |
| Server returns empty for the fields | Step 3 | |
| Client receives but doesn't write to localStorage | Step 3 | |
| Client writes localStorage but UI reads stale memory | Step 4 | |
| `dailyStats` line 509 doesn't update module var | Step 4 | |
| `dailyStreak`/`frozenDays` were never syncing | Step 5 | |

---

## Don't try to fix during investigation

Resist the urge to ship a fix as part of this handoff. The triangulation is the deliverable. Once we know which leg of the round-trip is broken, the fix is usually 1-2 lines and can be a separate small handoff.

If during investigation you spot the bug obviously (e.g., `dailyStats` not updating module var), document the bug in your completion handoff WITHOUT fixing it. Orchestrator decides whether to spawn a fix handoff to Kiro (you), Kimi, or both.

---

## Self-validation before writing the completion handoff

- [ ] Step 1 has a definitive answer: which client version is running in prod
- [ ] Step 2 has a payload trace (raw JSON, not paraphrased)
- [ ] Step 3 has a load-response trace (raw JSON, not paraphrased)
- [ ] Step 4 has a yes/no per field for whether UI updates
- [ ] Step 5 has a yes/no per field for whether dailyStreak/frozenDays sync today
- [ ] Hypothesis grid is filled in
- [ ] All temporary `console.log`s are removed from the client code
- [ ] No code changes are committed (this is read/diagnostic only)

---

## Self-grep-verify for the completion handoff (per AGENTS.md §7)

Modest because this isn't a code-shipping handoff. Paste:

```bash
# Module-level dailyStats declaration (if any)
rg -n "^var dailyStats\b|^let dailyStats\b|^const dailyStats\b" src/n3ondashj/

# Confirm load branches still match what I think they do
rg -n "cloud\.playDays|cloud\.dailyCollection|cloud\.dailyStats" src/n3ondashj/03-save.js

# Confirm no temporary console.logs left behind
rg -n "console\.log.*payload before encrypt|cloud data after decrypt" src/n3ondashj/
# Expect zero hits after cleanup
```

Plus paste the raw payload JSON from step 2 + raw load response JSON from step 3 verbatim in the handoff. Those are the load-bearing evidence.

---

## When done

- Write completion handoff at `to-claude/open/007-sync-streak-badge-calendar-investigation-complete.md`
- Include the hypothesis grid filled in
- Include payload + response JSON traces
- Move this handoff to `to-kiro/done/`
- Activity log entry
- **No code changes pushed.** If you discover a bug obviously fixable in 1 line, document it; orchestrator decides whether to dispatch a fix handoff.

## Coordinating with Kimi 019

Kimi is running a parallel server-side investigation (verify worker version, confirm `/sync/save` body parsing, query D1 for stored data_json contents). Both reports come back, we cross-reference, then write fix handoffs to whoever owns the actual breaking site. Don't coordinate live — independent observations are more useful than agreed-upon observations.
