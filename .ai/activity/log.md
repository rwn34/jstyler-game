## 2026-05-30 — kimi-cli (Android APK wrapper + Play Store build pipeline)
- **GitHub push:** Committed 20 files (v1.2.65–v1.2.69: cloud sync polish, stage tips, share/profile UX, streak fix, archived cross-CLI handoffs 007/008/017/018/019). Pushed `master` → `origin/master` (`828d0cc..4d2600d`).
- **APK wrapper created (`mobile/`):** Capacitor v7-based Android project wrapping N3ON DashJ for Google Play Store. Design goal: "people will not recognize this is html game anymore."
  - Local asset packaging (all game files in `www/` → `android/app/src/main/assets/public/`). Fully offline play.
  - Immersive sticky fullscreen via `MainActivity.java` (`SYSTEM_UI_FLAG_IMMERSIVE_STICKY` for API <30, `WindowInsetsController` for API 30+). Auto-restores on focus change.
  - WebView configured: scrollbars disabled, overscroll disabled (`OVER_SCROLL_NEVER`), haptic feedback enabled.
  - Native splash screen: AndroidX SplashScreen API with game icon (`icon-512.png`) on `#050510` background, 2.5s duration, fade-out 500ms.
  - App icons replaced across all `mipmap-*` and `drawable-*` densities with game assets.
  - Permissions: `INTERNET`, `VIBRATE`, `ACCESS_NETWORK_STATE`.
  - Dark theme (`#050510`) matching game palette.
- **Keystore created:** `mobile/android/app/my-release-key.jks` (alias `n3ondashj`, 10,000 days validity, owner `CN=rwn34, O=jstylr, C=ID`). Signing config wired into `build.gradle` (release builds auto-sign).
- **Android toolchain installed on system:**
  - Android SDK → `C:\Android\Sdk` (cmdline-tools, platform-tools, platforms/android-35, build-tools/35.0.0, build-tools/34.0.0)
  - OpenJDK 21 JDK → `C:\Android\jdk-21.0.10+7`
  - Env vars set: `ANDROID_HOME`, `JAVA_HOME` (both persisted to User scope)
  - All 7 SDK licenses accepted.
- **Signed release AAB built:** `mobile/android/app/build/outputs/bundle/release/app-release.aab` — **2.87 MB**, versionCode 1269, versionName 1.2.69, targetSdk 35, minSdk 23.
- **Package name changed** per user request from `com.jstylr.n3ondashj` → `com.evefable.jstylr.n3ondashj`. Updated in capacitor.config.json, build.gradle (namespace + applicationId), AndroidManifest.xml activity name, strings.xml (package_name + custom_url_scheme), and Java package path (`com/evefable/jstylr/n3ondashj/MainActivity.java`). Rebuilt AAB successfully.
- **Scripts created:** `mobile/scripts/sync-assets.ps1` (re-copies game files + cap sync), `mobile/scripts/build-release.ps1` (checks SDK/keystore, builds signed AAB).
- **Documentation:** `mobile/README.md` with complete setup guide, Play Store submission checklist, versioning instructions, troubleshooting table.
- **Gitignore:** Updated root `.gitignore` with mobile build artifacts (`mobile/node_modules/`, `mobile/android/app/build/`, `*.jks`, `*.keystore`).
- **Files created/modified:** `mobile/` (entire directory — 40+ files), `.gitignore`, `.ai/activity/log.md` (this entry).

## 2026-05-29 — kiro-cli (handoff 008 — v1.2.69 dailyStreak stale-memory fix)
- Action: 2-line surgical fix per handoff 008 (which itself was dispatched from Kiro 007's static finding). Appended `;dailyStreak=cloud.dailyStreak;` inside the existing `if(typeof cloud.dailyStreak==='number')` block at `03-save.js:502` (mergeSyncData) and `:605` (replaceSyncData), matching the pre-existing module-var-update pattern of `playDays=trimmed;` (line 507/613) and `dailyCollection=cloud.dailyCollection.slice()` (line 508/614). Pre-existing assignments unchanged. `dailyStats` and `frozenDays` confirmed still localStorage-direct (not module vars). Bumped v1.2.68 → v1.2.69 via auto-detect (source-change branch). Zip: `deploy/20260529231708_v1.2.69.zip` (199.2KB, sha256 013a403d…26f8f892d2ecae).
- Files: src/n3ondashj/03-save.js, src/n3ondashj/index.html (auto), src/n3ondashj/sw.js (auto), CHANGELOG.md, deploy/20260529231708_v1.2.69.zip, deploy/latest/, .zipgame-last-build-hash, .ai/handoffs/to-claude/open/008-dailystreak-stale-memory-fix-complete.md (NEW)
- Deviation from handoff: skipped "commit + push" step per standing session rule (no git commits unless user explicitly authorizes).
- Out of scope (per handoff): no badges/calendar render code touched, no PWA cache investigation, no backend changes (Kimi 019 verified server is clean).

## 2026-05-29 — claude-code (019 ACCEPTED — server clean; dispatched Kiro 008 streak fix; asked user about browser evidence)
- Read Kimi's `to-claude/open/019-...-complete.md`. Cleanest investigation report of the sequence. **Server verified clean** — all 7 hypotheses refuted with concrete evidence.
- Key proofs: deployed worker `82e784bc-...` (after 016); synthetic save+load returns all 3 fields with exact shape; two-device round-trip 11/11 (playDays union, dailyCollection union-by-date, dailyStats newer-day-wins all fire); real user blob grew 848→10,476 bytes at version 12 — strong signal new fields ARE persisting for real prod users. DEBUG01 + temp test files cleaned up post-investigation.
- **Triangulation result:**
  - Streak bug: confirmed client-side `dailyStreak` module-var stale at 03-save.js:502, 605 (Kiro 007)
  - Calendar (playDays) + Badges (dailyCollection): server returns correctly, client module-var pattern correct statically → if user observes broken, it's render-timing OR PWA cache staleness — needs browser evidence to distinguish
- **Dispatched Kiro 008** (`to-kiro/open/008-dailystreak-stale-memory-fix.md`): 1-line × 2-site fix at lines 502+605 — add `dailyStreak=cloud.dailyStreak;` after the existing save(). Confirms playDays/dailyCollection lines unchanged. No tests, no backend changes. Estimated 5 min.
- **Asked user (in chat, not handoff)** for preference on calendar+badges browser evidence: (a) manual DevTools capture by user (~3 min); (b) e2e-tester subagent with Playwright (~10 min); (c) test in incognito to rule out PWA cache. Recommended (a). Not dispatching anything for calendar/badges until user picks.
- Standard process: completion handoffs to to-claude/open/, grep snippets, commit+push for 008.

## 2026-05-29 — claude-code (007 investigation accepted; awaiting Kimi 019 before dispatching fixes)
- Read Kiro's `to-claude/open/007-...-complete.md`. Clean static investigation — file in correct directory, grep snippets, hypothesis grid, no fix shipped per spec, no leftover console.logs.
- **One concrete bug confirmed via grep:** `dailyStreak` module-var stale-memory at `03-save.js:502` and `:605`. Both load branches call `save('dailyStreak', cloud.dailyStreak)` but never reassign the module-level `dailyStreak` variable. UI reads from module var at 5 sites (1004, 1014, 1710, 1763, 1781). Masked by `confirmLinkDevice` → `location.reload()`; surfaces on auto-sync paths. One-line fix queued: `if(typeof cloud.dailyStreak==='number'){save('dailyStreak',cloud.dailyStreak);dailyStreak=cloud.dailyStreak;}` at both sites.
- **`playDays` and `dailyCollection` code paths verified correct:** module vars at :929/:930, in payload at :432/:433, reassigned on load at :507/:613 and :508/:614. Same pattern that works correctly. So if user observes calendar/badges not syncing, it's NOT a client module-var bug.
- **`dailyStats` and `frozenDays` no bugs:** neither is held as module state; read fresh from localStorage each access; save() at load-time is sufficient.
- **Kiro's leading hypothesis (PWA still v1.2.64 cached) was refuted by user's prior turn confirming v1.2.68 is live on Pages.** Updated the hypothesis grid in the acceptance doc.
- **Decision: don't dispatch the `dailyStreak` fix yet.** Wait for Kimi 019 server-side investigation. Either (a) bundle dailyStreak fix with whatever Kimi surfaces in one round, or (b) if Kimi confirms server is fine, dispatch dailyStreak fix + spawn e2e-tester for browser evidence on calendar/badges. The 1-line fix only addresses streak counter; calendar + badges still mystery until server side reports.
- Pending: (1) Kimi 019 completion handoff, (2) browser DevTools evidence for save payload + load response (steps 1-3 of 007 require real browser; either user does them or e2e-tester is spawned).

## 2026-05-29 — kiro-cli (handoff 007 — sync investigation, static findings)
- Action: Read-only static investigation per handoff 007. Browser-based steps (1–3) not executable from CLI; flagged in completion handoff for user/e2e-tester. Static findings: `playDays` (module var line 929), `dailyCollection` (module var line 930), and `frozenDays` / `dailyStats` (NOT module vars — read fresh from localStorage each access) all have correct sync code paths. **One concrete bug found: `dailyStreak` (module var line 920) is reassigned in payload + load branches at lines 502/605 only via save() to localStorage; the module variable is never reassigned, so UI reads stale value until page reload.** This is masked in the `confirmLinkDevice` flow which triggers `location.reload()` via the RESTART GAME prompt (`04-ui.js:813,817-820`), but background/auto sync would surface it. Most likely user-visible cause: v1.2.65–v1.2.68 builds have not been confirmed uploaded to Cloudflare Pages — production may still be v1.2.64, in which case none of the new payload fields exist on the wire. No code changed; no console.log added; no fix shipped per handoff explicit instruction. Hypothesis grid filled in.
- Files: `.ai/handoffs/to-claude/open/007-sync-streak-badge-calendar-investigation-complete.md` (NEW), `.ai/handoffs/to-kiro/done/007-sync-streak-badge-calendar-investigation.md` (moved from open/ — pending orchestrator file move)
- Coordination: pairs with Kimi 019 server-side investigation. Cross-reference both findings before dispatching any fix.

## 2026-05-29 — claude-code (handoffs 007 to Kiro + 019 to Kimi — triangulation: streak/badge/calendar still not syncing in practice)
- User reports: despite 006 (client payload) + 015 (server merge schema) + 016 (field-name correction) all shipping, streak / daily-stage badges / 27-day calendar still don't sync across devices. Something in actual round-trip isn't working despite code reviews verifying both sides should work.
- Approach: independent triangulation. Don't guess; observe both legs in parallel.
- **Kiro 007** (`to-kiro/open/007-sync-streak-badge-calendar-investigation.md`): client-side diagnostic. Step 1 confirm actual deployed v1.2.65 (vs cached v1.2.64 PWA on iOS); Step 2 temporary console.log of payload before AES encrypt to verify shape on the wire; Step 3 console.log of cloud object after decrypt to verify what comes back; Step 4 check whether UI re-renders post-load (suspicion: `dailyStats` may not have an in-memory variable update at 03-save.js:509 if it's held as module state — needs grep verification); Step 5 verify dailyStreak/frozenDays which were supposed to sync since sprint 1. Hypothesis grid included. NO fix during investigation; remove all temporary console.logs.
- **Kimi 019** (`to-kimi/open/019-sync-streak-badge-calendar-server-investigation.md`): server-side diagnostic. Step 1 confirm deployed worker is `de2209b8-...` or later; Step 2 curl /sync/save with synthetic payload, capture raw response; Step 3 curl /sync/load same account, verify response contains all three fields; Step 4 two-device round-trip via smoke_test pattern (Device A saves day-27, Device B loads + saves day-28, Device A loads → assert union); Step 5 spot-check real prod row data_json length stability (statistical signal of stuck blobs); Step 6 optional wrangler tail during user's live session. Hypothesis grid included. Test account DEBUG01 must be cleaned up.
- Both handoffs explicitly forbid fixes during investigation — observations only. Reports come back independently; orchestrator cross-references findings to identify which leg of round-trip is broken; targeted fix handoff dispatched after.
- Most likely cause (educated guess only): user is testing against a still-cached v1.2.64 PWA. Second most likely: `dailyStats` line 509 client-side doesn't update module-level state. Server is most likely fine since 016 had 36/36 synthetic tests including same-day compound merge.
- Self-grep-verify reduced to "evidence preserved" since neither is a code-shipping handoff. Both require completion handoffs in `to-claude/open/` with raw payload/response JSON verbatim.

## 2026-05-29 — claude-code (017 + 018 ACCEPTED — dashboard refactor cycle complete; free-tier validated)
- **017 (Players consolidation) ✅ ACCEPTED.** Worker `82e784bc-f71f-4491-b012-f7a59dcb8963` live, commit `828d0cc`, 39/39 Playwright. PlayersSection.jsx mounted in Players.jsx with 3 thematic sections (🏃 Activity / 📈 Progression / 💰 Economy). ARIA `role=tablist` + arrow-key nav. Two minor scope notes flagged honestly: (1) Top Referrers widget removed from All segment (still reachable via PlayerModal per-player); (2) "Top Spenders" chip deferred — requires backend `SUM(cost)` aggregation. Both acceptable; can be follow-ups if real need surfaces.
- **018 (free-tier capacity analysis) ✅ ACCEPTED.** Report `.ai/reports/free-tier-capacity-analysis-2026-05-29.md` (419 lines). Headline: yes-with-caveats — 100 DAU × 15-30 min holds 🟢 across all 6 dimensions; D1 rows written hits ~39% of cap at 30-min end. Hidden budget consumer: dashboard `/stats` reads (~32% of D1 read budget). Three concrete mitigations: (a) client batch via `/events/batch` saves 5-10× requests, (b) heartbeat 90s→180s saves 50%, (c) 60s `/stats` cache saves 80-90% of dashboard reads. Break-even for $5 paid: ~250-500 DAU. Statistical honesty exemplary — Section 1.1 leads with sample caveat (19 days, 180 PIDs, 84 player-day observations), reports ranges not CIs. 4 authoritative Cloudflare docs URLs cited.
- **Dashboard refactor cycle complete.** Sprint 2 phases 1+2+3 done. Remaining: phase 2.5 items (anti-fraud referrals, column promotion) data-dependent; git history scrub parked; Top Spenders + Top Referrers reinstatement optional. Natural stopping point — real v1.2.65 player activity should inform next priorities.



## 2026-05-29 — claude-code (handoff 018 dispatched — free-tier capacity analysis)
- Wrote `.ai/handoffs/to-kimi/open/018-free-tier-capacity-analysis.md`. User wants to know if Cloudflare free tier will hold at 100 DAU × 15-30 min playtime each, given current ~5 DAU short-session behavior.
- Terminology clarification baked in: user said "R2 database" but project uses **D1** for behavioral data (R2 is object storage, not used here).
- Scope: read-only analysis. Measure current per-player baseline from D1 via `wrangler d1 execute` (events/session by type, session length, sync calls/day). Project to 100 DAU for both 15-min and 30-min playtime variants. Look up authoritative Cloudflare free-tier limits (Workers req/day, CPU-ms, D1 reads/writes/storage, cron). Compute headroom per dimension (🟢<40% / 🟡 40-80% / 🔴 >80%). Propose concrete mitigations for any 🟡 or 🔴: batch events (confirm `/events/batch` actually used by client), reduce heartbeat frequency, rate-limit per-pid bot defense, paid-plan break-even DAU.
- Bonus: per-event-type budget share (heartbeat likely dominates; easiest knob), top-3 mitigation recommendations, one-line "will we fit?" answer.
- Constraints: read-only DB queries, no code mutations, no deploys. If a free-tier-saving change is worth making, propose via follow-up handoff to claude-code — don't ship inside the analysis.
- Self-validation includes statistical honesty: if sample size is too small (<5 DAU likely is) say so; don't fabricate confidence intervals. Cite Cloudflare docs URLs for every cited limit so user can re-verify if Cloudflare adjusts.
- Output: `.ai/reports/free-tier-capacity-analysis-2026-05-29.md` (≤600 lines). Headroom summary table is the deliverable.
- Estimate: ~45-60 min.

## 2026-05-29 — claude-code (handoff 017 dispatched — Players 9-tables → 3-sections consolidation)
- Wrote `.ai/handoffs/to-kimi/open/017-players-tables-consolidation.md`. Last untouched UX audit P1 item; ~1-1.5 hr; closes the dashboard refactor cycle.
- Scope: inside the existing "All" top-level segment on Players, replace 9 stacked tables with 3 thematic sections (🏃 Activity / 📈 Progression / 💰 Economy), each with a chip-strip switching the table's data+columns. New tiny `PlayersSection.jsx` component (~50 LOC). Top-level segments (Flagged/Banned etc.) unchanged.
- Default-chip-per-section, local state (no URL persistence — keeps URL combinatorics manageable since deep-link only goes to top-level segment).
- Server side: investigation step first — confirm `/stats/players` endpoint already returns shapes for all 9 source tables. If a new chip (e.g., Top Earners) needs a field that doesn't exist, prefer client-side derivation over a new endpoint; flag if pushed to backend.
- Validation A-E baked in: behavior parity, row-count + CSV parity per source table, accessibility (role=tablist, arrow-key nav, focus-visible), mobile 380px, +2 Playwright tests (34, 34m) with screenshot baselines regenerated.
- Explicit scope guardrails: no backend changes, no URL-state for chips, no column rework, no Watchlist rework, no PlayerModal changes, no new visual style. Stop + ask if any guardrail starts to bind.
- Self-grep-verify required per AGENTS.md §7; standard reminders (open/ not done/, commit + push, Playwright against deployed build).
- After 017 lands: dashboard refactor cycle fully complete. Remaining backlog (phase 2.5 anti-fraud referrals, phase 2.5 column promotion, git history scrub) all data-dependent or explicitly parked. Natural stopping point.

## 2026-05-29 — claude-code (016 ACCEPTED — multi-device sync end-to-end correct)
- Read `to-claude/open/016-sync-merge-field-name-correction-complete.md`. Verdict: ✅ ACCEPTED.
- Worker `de2209b8-d003-4bad-bcd6-799e15d5b079` live, commit `b3a9586` pushed (range `0d8b2a6..b3a9586`).
- Spot-checked all cited lines: dead code (`dailyStageBadges`/`dailyStageChestClaimedDate`) fully purged; new `dailyCollection` rule at index.js:1834 (Map-based union by .date key, sorted, ≤90); new `dailyStats` rule at :1850 (newer-day-wins, same-day OR/min/max compound, stale-day no-op); SYNC MERGE SCHEMA comment updated at :1600-1601.
- 36/36 synthetic smoke tests passing (was 18/18 in 015, doubled for the dailyStats edge cases). Smoke test added `assertEq` helper + 62s rate-limit cooldowns. All 6 acceptance criteria met (playDays regression, array union by date, newer-day-wins, same-day compound, stale no-op, bounds defense).
- Three consecutive Kimi deliveries (014, 015, 016) under full protocol: file in `open/`, grep snippets, committed + pushed. The rule is genuinely internalized.
- **Sprint 3 cloud-sync feedback work is COMPLETE pending two user actions:** (1) manual smoke of v1.2.65 (two-device round-trip, fresh-install onboarding link path, mobile 380px Cloud Sync, PWA reward color); (2) Cloudflare Pages upload of `deploy/20260529125659_v1.2.65.zip`. Server fully ready. Client fully ready. Multi-device users will now see consistent state on playDays/dailyCollection/dailyStats/lastChest regardless of sync order.

## 2026-05-29 — claude-code (006 + 015 ACCEPTED; field-name mismatch caught → 016 follow-up dispatched)
- **Kiro 006 ✅ ACCEPTED.** All 11 v1.2.65 items shipped clean. Spot-checked: 03-save.js:432-434 (payload), :507-509 + :613-615 (load branches), 04-ui.js:268 (#ccc PWA color fix). Process disciplined — file in correct `open/`, grep snippets present, coordination notes for Kimi 015 explicit, build verification (boot span, SW CACHE_NAME, zip sha256) all aligned. v1.2.65 = `deploy/20260529125659_v1.2.65.zip` (196KB).
- **Kimi 015 ✅ Work accepted.** Cleanest delivery to date: file in `open/`, grep snippets, **committed + pushed** (`0d8b2a6` on master — explicitly addressing the 014 uncommitted-deploy mistake). 18/18 synthetic merge tests passed. Smoke test fixed during run (wrong /api/sync/ paths corrected + 62s cooldown for rate limit).
- **⚠️ Field-name mismatch detected.** Server has rules for `dailyStageBadges` + `dailyStageChestClaimedDate` (DEAD CODE — client never sends those names). Client (Kiro 006) actually sends `dailyCollection` (array of `{date, name, time, rankIdx}`) and `dailyStats` (single-day object `{day, played, completed, bestTime, deaths, reward}`). Plus data-shape differences (array-of-objects vs object, single-day-object vs date-keyed map). `playDays` works correctly (name matches). This was a parallel-shipping coordination gap, not a discipline failure — both handoffs explicitly flagged the risk; Kimi shipped before reading Kiro's completion handoff.
- **Wrote follow-up 016** (`to-kimi/open/016-sync-merge-field-name-correction.md`): rename `dailyStageBadges` rule → `dailyCollection` with array-union-by-date semantics; rename `dailyStageChestClaimedDate` rule → `dailyStats` with newer-day-wins + same-day OR/min/max compound merge; update SYNC MERGE SCHEMA block comment. Includes 6 validation cases. ~30-45 min estimate.
- **Interim state** (until 016 lands): `dailyCollection` and `dailyStats` fall to cloud-wins default. Single-device users unaffected. Multi-device users may lose badges if devices sync out of order. Acceptable bridge state.
- **Process scorecard:** both 006 and 015 followed the protocol fully. Trajectory now: 007 skip → 008 gold → 009 skip → 010 done-miss → 011/012 ✓ → 013 done-miss → 014 model → 015 cleaner-than-model → 016 next. The rule is genuinely internalized.

## 2026-05-29 — kiro-cli (handoff 006 — v1.2.65 post-sync feedback fixes, 11 items)
- Action: Executed handoff 006 end-to-end. **Section A (sync gaps):** added `playDays` (with 31-day trim defense), `dailyCollection`, and `dailyStats` to cloud-save payload + both load branches in 03-save.js. **Field-name discoveries that affect Kimi 015:** the badges field is `dailyCollection` (not `dailyStageBadges`); the chest/completion state is `dailyStats` (not `dailyStageChestClaimedDate`); `playDays` matched the spec. **Section B (UI):** B1 onboarding "Link this device" entry → openSyncLinkPanel, B2 last-sync timestamp via `ndj_lastSyncAt` localStorage + relative-time helper, B3 Cloud Sync 2-col + collapsible via `<details>/<summary>` (mobile 1-col under 640px), B4 rank score with thousands-separator on profile, B5 export/import buttons removed (functions retained), B6 post-restore ghost-rival toast guarded by `ndj_ghostNoticeSeen` (cleared on link-device, PIN change, PIN reset). **Section C:** C1 PWA reward float color #ffd700 → #ccc to match silver convention, C2 store robot 🤖 → rotating 💡 tip icon (5 tips, sequential via `ndj_storeTipIdx`). All 13 self-grep-verify checks passed. Built v1.2.64 → v1.2.65 via auto-detect (source-change branch). Bundle size 196KB (+1.5KB from v1.2.64).
- Files: src/n3ondashj/03-save.js, src/n3ondashj/04-ui.js, src/n3ondashj/index.html, src/n3ondashj/sw.js, CHANGELOG.md, deploy/20260529125659_v1.2.65.zip (sha256 CF69CA55…7847700), deploy/latest/, .zipgame-last-build-hash, .ai/handoffs/to-claude/open/006-post-sync-feedback-fixes-complete.md (NEW), .ai/handoffs/to-kiro/done/006-post-sync-feedback-fixes.md (moved from open/)
- Kimi 015 coordination: shipping client BEFORE 015. Interim behavior is cloud-wins for new fields (acceptable, not data-losing for single-device users). Once 015 lands with union-merge, multi-device behavior becomes correct. Field-name corrections passed to claude-code via the completion handoff for Kimi 015 amendment.
- Coder process note: a mid-iteration version over-bump was rolled back via `.zipgame-last-build-hash` deletion. Final state correct; flagged informationally.
- Deferred: browser smoke (two-device round-trip, fresh-install onboarding link path, mobile 380px sync layout, PWA reward visual). User will smoke before Pages upload.

## 2026-05-29 — claude-code (handoffs 015 to Kimi + 006 to Kiro — post-cloud-sync test feedback)
- User tested cloud sync on multiple devices, surfaced 11 specific gaps. Wrote one handoff per CLI with self-validation built in.
- **Kimi handoff 015** (`to-kimi/open/015-sync-merge-schema-and-new-fields.md`): server merge-rule prep. Document existing merge schema as a block comment in handleSyncSave + add explicit rules for 3 new fields Kiro will start sending (playDays = union+31-day trim, dailyStageBadges = union-by-date, dailyStageChestClaimedDate = max date string). Bounds defenses against unbounded array growth. Smoke-test merge cases (A1-A4) before deploy. Note: deploying uncommitted code = the 014 mistake, must commit before completion handoff.
- **Kiro handoff 006** (`to-kiro/open/006-post-sync-feedback-fixes.md`): 11 items organized in 3 sections, each with own self-validation block.
  - **Section A (sync data):** A1 confirmed bug — `playDays` (the 27-day calendar) declared at 03-save.js:916, used by renderStreakCalendar, NOT in cloud payload at :425-435. Add to payload + both load branches. A2/A3 investigation needed for dailyStageBadges + dailyStageChestClaimedDate field names; if differ from 015's assumed names, write back to claude.
  - **Section B (UI):** B1 onboarding link-device entry, B2 last-sync timestamp on Cloud Sync, B3 2-col + collapsible advanced actions, B4 rank score on profile, B5 remove export/import save buttons (replace with cloud-save note), B6 post-restore "ghost rival not synced" toast.
  - **Section C (store/PWA):** C1 confirmed — claimPwaReward at 04-ui.js:262 already adds silver but addFloat at :268 uses gold color `#ffd700` instead of silver `#ccc` — fix the color. C2 robot NPC in store → replace with tip-rotation (💡 + short helpful tip).
- Coordination: ideal sequence is Kimi 015 first, then Kiro 006. If Kiro ships first, new fields fall to cloud-wins default — no data loss, just suboptimal union behavior on playDays.
- Both handoffs explicitly cite AGENTS.md §7 + reminder about open/ vs done/ placement (010/013 misplacements still recent memory). Each section in 006 has its own checkboxed self-validation Kiro completes before the completion handoff.

## 2026-05-29 — claude-code (014 ACCEPTED — cross-tab drilldown fully functional)
- Read `to-claude/open/014-cross-tab-drilldown-close-out.md` from Kimi. Resolved → `done/`.
- **Verdict: ✅ ACCEPTED. Cleanest completion handoff of the sequence.** Worker `3eb32509-dd98-4e59-b667-a6a3054df654` live.
- Independent spot-check confirmed: `index.js:203` buildFilterClause; `api.js:5` withFilters; `Platform.jsx:95,136,158,190` toggleCc/toggleVersion + onRowClick; `Levels.jsx:76` toggleLevel; `compare.js:24` bonus integration (filters propagate to compare-period fetches too — a nice organic catch).
- Perf validation E paste included: no full table scans. JSON_EXTRACT predicates use `idx_events_server_ts` range seeks; level uses covering `idx_events_level_type`; named scans `idx_events_pid_server_ts`. All acceptable; column promotion deferred to phase 2.5.
- Two bugs self-caught during deploy: FilterStrip `writeHashFromSignals` typo + handleStatsSessions:963 unterminated string literal. Both fixed in the same patch.
- **Process scorecard: this was the model handoff** under the AGENTS.md §7 protocol — file in `open/`, snippets present, perf paste, transparent self-bugs, no surprises. Trajectory: 007 skip → 008 gold → 009 skip → 010 done/-miss → 011/012 ✓ → 013 done/-miss → 014 ✓. Discipline now stable when not regressing.
- ⚠️ Two housekeeping items Kimi flagged honestly: (1) **uncommitted** — 014 code is live in prod but not in git; needs `git add cloudflare/ && git commit` (kimi terminal). (2) Playwright not run against the new deployed build; needs `npx playwright test` from cloudflare/ to confirm 37/37 (29 pre-existing + 8 new). Neither blocks acceptance but both should close before next sprint.
- Sprint 2 phase 3 SUBSTANTIALLY COMPLETE. Remaining backlog: Players 9-tables consolidation (last P1), phase 2.5 anti-fraud (waits for data), phase 2.5 column promotion (only if perf bites), git history scrub (parked).

## 2026-05-28 — claude-code (kimi handoff 014: cross-tab drilldown close-out)
- Wrote `.ai/handoffs/to-kimi/open/014-cross-tab-drilldown-close-out.md`. Closes the partial completion from 011 Feature 2.
- Scope: three deliverables. (1) Server-side `buildFilterClause(url)` helper in index.js, applied to handleStats / handleStatsLevels / handleStatsPlayers / handleStatsSessions / handleStatsEconomy / handleStatsFeed / handleAnomalies — each appends WHERE clauses from `cc`/`level`/`version`/`named` URL params with regex input validation (silent ignore on bad values). (2) Client `withFilters(path)` helper in api.js; each filter-respecting tab wraps fetches and subscribes to `currentFilters.value` for re-fetch on change. (3) Clickable filter origins: Platform→Geo rows (cc), Platform→Versions rows (version), Per Level rows (level) — with toggle semantics (click active filter removes it).
- New: `FilterIgnoredNotice.jsx` mounted on Retention/Daily/Feedback (tabs that intentionally don't filter — cohort/qualitative/singleton).
- Validation plan A-F: server filter behavior + bookmark survival + perf budgets (Overview <500ms, Per Player/Per Level <800ms with `EXPLAIN QUERY PLAN` paste) + 4 new Playwright tests (30-33).
- Out of scope (deferred): column promotion to indexed `events.country`/`events.app_version` (phase 2.5 if perf E fails), OR filter combinators, named-filter UI control, filter analytics.
- Self-grep-verify required; reminder to land completion handoff in `to-claude/open/` not `done/` (010/013 misplacements flagged).
- After 014 lands: only Players 9-tables consolidation + phase 2.5 items left. Natural stopping point for the dashboard refactor cycle if user wants to pause.

## 2026-05-28 — claude-code (011/012/013 batch review — accepted with one partial)
- **011 (alerts workflow + cross-tab drilldown):** ✅ Feature 1 ACCEPTED (ack/mute/jump/unack live, migration 005 applied, stable sha256 alert_id, LEFT JOIN merges status, auto-expire mute, 29/29 Playwright). ⚠️ **Feature 2 INFRASTRUCTURE-ONLY** — URL taxonomy + FilterStrip wired, BUT clickable filter origins on Geo/PerLevel rows and server-side `JSON_EXTRACT` predicates DEFERRED. Practical impact: cross-tab drilldown not user-functional yet beyond the alert→Levels jump path. Will write handoff 014 to close Feature 2 when signaled. Worker `1b062b61-d66c-4174-87d7-f82676508f71`, commit `76f0a27`.
- **012 (sync lockout extension):** ✅ ACCEPTED. Per-user `userLockKey` lockout uniformly applied on /sync/load + /sync/save + /sync/forgot-pin. `SYNC_LOCKOUT_THRESHOLD` brought 10→5 (sprint-1 spec). 20/20 smoke tests including new LOCK<ts> case with auto-cleanup. Worker `c6875421-a3bb-4f49-93de-1392ba4fe16f`, commit `f97ba87`. Sprint-1 O1 carry-over OFFICIALLY CLOSED.
- **013 (mock-based PlayerModal test):** ✅ ACCEPTED — **AND caught a real production bug**. The mock test exposed that `PlayerDetail` referenced `referrals` but it was never passed as a prop, so the Referrals section never rendered for real users from launch (handoff 008's "coverage triangle" of synthetic API + manual + visual missed this — the visual snapshot was Top Referrers on Players tab, NOT the modal's inner Referrals section). Bug fix: pass `referrals={referrals}` to PlayerDetail. 29/29 Playwright + 5 consecutive clean runs. Worker `90708148-906c-4fbd-8923-7857e7cadaf3`, commit `be683b9`. **This single catch retroactively justifies the entire mock-test pattern.**
- **Process trajectory:** 010→done/(miss), 011→open/✓, 012→open/✓, 013→done/(miss). 2/3 correct directory placement this batch vs 0/2 previously. Discipline converging but not fully internalized — 013 reverted to direct done/ placement.

## 2026-05-28 — 011: Alerts workflow + cross-tab drilldown (URL filters, FilterStrip, ack/mute/jump)
- Migration `005_alerts_state.sql` + `handleAdminAlertsAck/Mute/Unack` endpoints in worker
- `handleAnomalies` LEFT JOINs `alerts_state`, surfaces status/acked_at/mute_until, auto-hides muted, auto-deletes expired mutes
- Dashboard `Live.jsx` ack/mute buttons, optimistic UI, "Show muted" toggle, acked-row graying, unack, jump-to-source
- URL filter taxonomy: `cc`, `level`, `version`, `named` in `parseHash`/`writeHash`
- New `currentFilters` signal + `FilterStrip` component with chip removal + clear-all
- Bidirectional hash↔signal sync in `main.jsx`; `SubTabs` preserves filters on navigation
- Alert jump-to-source routes per-level → `#/levels?level=N`, DAU → Overview, geo → Platform/Geo
- Deferred: clickable filter origins on Geo/Level table rows; server-side `handleStats*` filter predicates
- Playwright: 29/29 passing
- Deployed `1b062b61-d66c-4174-87d7-f82676508f71`
- Commit: `76f0a2775702bb22f2939b83f60d9185e63f86a6`

## 2026-05-28 — 012: Extend per-user lockout to /sync/load and /sync/save
- Extended DB-backed per-(username, mmyy) lockout from forgot-pin to sync/load + sync/save
- Both endpoints now check `userLockKey = hashSyncKey(username, mmyy, '', SYNC_SALT)` before PIN verification
- `SYNC_LOCKOUT_THRESHOLD` changed from 10 to 5 per handoff spec
- Per-keyHash lockout preserved as defense-in-depth layer
- Smoke test: 20/20 passing (including new per-user lockout test with automatic cleanup)
- Deployed `c6875421-a3bb-4f49-93de-1392ba4fe16f`
- Commit: `f97ba87`

## 2026-05-28 — 013: Mock-based PlayerModal Referrals test + referrals prop fix
- Added deterministic Playwright tests 18/18m for PlayerModal Referrals section
- Mocked /stats/players, /stats/player, /admin/referrals to control test data
- Discovered and fixed bug: PlayerDetail referenced `referrals` out of scope (not passed as prop)
- Deployed `90708148-906c-4fbd-8923-7857e7cadaf3`
- Playwright: 29/29 passing, player-modal screenshots generated
- Commit: `be683b9`

## 2026-05-28 — claude-code (010 D3 close-out ACCEPTED)
- Read `to-claude/done/010-d3-subtab-url-consumption-complete.md` (Kimi wrote it but placed directly in done/ rather than open/ — minor process variance, flagged in the review notes I appended).
- **Work verdict: ✅ ACCEPTED.** Sub-tab URL routing fully wired. Worker `6cd5bcfc-e8c1-42d8-b302-d9a6f730d724` live, commit `8073a48`, 27/27 Playwright.
- Independent spot-check confirmed line numbers: `lib/url.js:17,19,22,24` (parseHash splits on '/', writeHash signature/conditional append); `Platform.jsx:24` + `Live.jsx:32` (consume subTab from parseHash on mount); `HealthVerdict.jsx:33` (writeHash('live', 'alerts', ...) — closes the 009 deep-link deviation in passing).
- All 8 alias hashes (#geo, #appversion, #sync, #feed, #alerts, #watchlist, #sessions, #engagement) now land on correct sub-tab. Browser back-button works for sub-tab nav.
- **Process note:** completion handoff landed in `to-claude/done/` instead of `open/` first. Substance is right and snippets are present (better than 009's no-handoff-at-all). Going forward: file goes in `open/`, I move to `done/` after verification with my review appended.
- Trajectory under the new rule: 007 no-snippets → 008 gold → 009 no-handoff → 010 snippets present + done/ misplacement. Discipline converging. 011 will be the meaningful test.

## 2026-05-28 — 010: D3 sub-tab URL consumption
- parseHash/writeHash now round-trip subTab segment
- Platform/Live components consume subTab from URL on mount
- SubTabs click updates URL hash via writeHash
- HealthVerdict deep-links to #/live/alerts in alert state
- All aliases (#geo, #appversion, #sync, #feed, #alerts) land on correct sub-tab
- Deployed `6cd5bcfc-e8c1-42d8-b302-d9a6f730d724`
- Playwright: 27/27 passing
- Commit: `8073a48`

## 2026-05-28 — claude-code (kimi handoffs 010-013 batch dispatched)
- Wrote 4 handoffs at user request (backlog items 1, 2, 3, 5). All Kimi's lane (cloudflare/). Kimi sequences as they see fit; only 011 has a soft dependency on 010.
- **010 — D3 close-out** (`to-kimi/open/010-d3-subtab-url-consumption.md`): ~30 min. Extend parseHash/writeHash to round-trip subTab path segment, wire Platform/Live to consume on mount, SubTabs writeHash on click. Bonus: HealthVerdict can deep-link to `live/alerts` cleanly (closes the 009 small deviation).
- **011 — Alerts workflow + cross-tab drilldown** (`to-kimi/open/011-alerts-workflow-and-cross-tab-drilldown.md`): ~2-3 hrs, bigger. Two features bundled because they share URL-state infrastructure. Server: new `alerts_state` table + `/admin/alerts/ack|mute|unack` endpoints + LEFT JOIN in handleAnomalies. Dashboard: per-alert Ack/Mute UI + Jump-to-source links + global FilterStrip wired to URL hash (cc/level/version/named filter params propagated across tabs). Soft dep on 010 for URL routing. Explicit scope guardrails listed; instructed to write back via to-claude/open/ before expanding scope.
- **012 — O1 sync_load/sync_save per-user lockout** (`to-kimi/open/012-sync-lockout-extension.md`): ~1 hr, security. Extend per-(username, mmyy) lockout (already on forgot-pin) to sync/load + sync/save failure paths via `userLockKey = hashSyncKey(u, m, '', SYNC_SALT)`. Keep per-keyHash lockout layer alongside. Add smoke_test.js case. Both layers cleared on success.
- **013 — Mock-based PlayerModal Playwright** (`to-kimi/open/013-playermodal-mock-test.md`): ~30 min. Closes the 008 deviation. `page.route()` mocks `/stats/players` + `/admin/referrals` + `/stats/player/<pid>`, deterministic synthetic PID, assert Referrals section renders. Visual baseline added.
- All four explicitly cite AGENTS.md §7 tightened protocol: completion handoff file REQUIRED in `to-claude/open/NNN-...-complete.md`, grep snippets REQUIRED inside, missing either = rejected at submission.
- Activity log entry alone is NOT sufficient. Going forward, no more orchestrator-authored close-outs to cover for missing handoffs.

## 2026-05-28 — claude-code (sprint 2 phase 3 first-pair ACCEPTED + process tightening)
- Read + resolved Kimi's `to-claude/open/009-overview-health-and-data-freshness-complete.md`. Worker `3fddfbd3-f4b7-459a-8a4c-0dd5e9e31550` live, commit `880d067`, 25/25 Playwright passing.
- **Work verdict: ✅ ACCEPTED.** Cleanest code of any sprint this week. Worker `3fddfbd3-f4b7-459a-8a4c-0dd5e9e31550` live, commit `880d067`, 25/25 Playwright passing.
  - HealthVerdict (`components/HealthVerdict.jsx:4-51`): 3 states correctly thresholded, ARIA `role=alert|status` + `aria-live=polite`, click→Live only when non-healthy, color+icon+text triple signal, reuses `.live/.warn/.bad` palette.
  - DataFreshness wired via `state.js:9 agoTick = signal(0)` + 30s tick in App.jsx, mounted in header bar at App.jsx:47. Stale-threshold polish present (amber past TTL, red past 10min).
  - Bonus: Kimi optimized `handleAnomalies` ~5s → ~1s when their HealthVerdict mount exposed the slow query. Caught + fixed in same commit. Good discipline.
- **Process verdict: ⚠️ REGRESSED.** Sequence: 007 skipped grep rule (accepted as transition courtesy), 008 gold standard, 009 skipped the entire handoff doc (only activity log entry, no `to-claude/open/` file). Two-of-three skips means the rule isn't internalized.
- **Tightened AGENTS.md §7:** completion handoff file is REQUIRED; activity log alone is NOT sufficient. Grep snippets REQUIRED inside the file. Enforcement: next skip gets rejected at submission, no verification work performed.
- Wrote orchestrator-authored close-out at `.ai/handoffs/to-claude/done/009-overview-health-and-data-freshness-complete.md` with grep snippets supplied (modeling what Kimi should have written).
- One small deviation accepted: HealthVerdict click navigates to Live tab but doesn't deep-link to Alerts sub-tab — same D3 limitation as before. Track.

## 2026-05-28 — 009: Overview health verdict + data-freshness indicator
- Added HealthVerdict banner to Overview tab (healthy/attention/alert states)
- Added DataFreshness indicator to header bar with stale color thresholds
- Optimized handleAnomalies queries (~5s → ~1s) to fix Playwright timeouts
- Deployed `3fddfbd3-f4b7-459a-8a4c-0dd5e9e31550`
- Playwright: 25/25 passing, screenshots regenerated
- Commit: `880d067`

## 2026-05-28 — claude-code (kimi handoff 009: sprint 2 phase 3 first-pair — Overview health verdict + data-freshness)
- Wrote `.ai/handoffs/to-kimi/open/009-overview-health-and-data-freshness.md`.
- Two small dashboard P0 items from the original UX audit, packaged together (~30-45 min total Kimi time): Overview health verdict banner (🟢/🟡/🔴 derived from alerts + DAU collapse) at top of Overview tab; per-tab data-freshness indicator ("Data: 3m ago") tied to existing `loadedAt` signal, mounted in App.jsx header bar.
- Both pure frontend. No worker code changes, no migrations, no client changes.
- Validation plan A-E baked in (health states + verdict click→Live, freshness updates + tab-switch behavior + CHECK NOW reset, mobile reflow, ARIA roles, perf, two new Playwright tests 22 + 23 with mobile variants, Overview screenshot baselines regenerated).
- Self-grep-verify required per AGENTS.md §7. Handoff lists 6 explicit `rg` commands. Third handoff under the rule; expectation is now baseline.
- Explicit deferrals: alerts ack/mute/jump-to-source (separate phase 3 handoff), cross-tab drilldown, global filter bar, Players 9-tables consolidation, D3 close-out, O1 sync_load/save lockout, phase 2.5 anti-fraud.

## 2026-05-28 — claude-code (sprint 2 phase 1 ACCEPTED — referrals shipped)
- Read + resolved Kimi's `to-claude/open/008-referrals-complete.md`. Worker `fc582831-4138-447d-9a12-2375127521a2` live, commit `9a14e71`.
- **Self-grep-verify protocol applied successfully for the first time.** Kimi's handoff included 7 organized snippet blocks with rg output next to each claim. Independent spot-check confirmed line numbers (handleAdminReferrals:2352, router:3510-3511, ReferralsSection:139+234, Top Referrers:248, Playwright tests:281+330). Verification took ~2 min vs 15-20 min for pre-rule handoffs. Rule stays.
- Accepted one deviation: PlayerModal Playwright tests 18/18m attempted then removed due to data-dependent PID flakiness in Recently Active table. Coverage preserved via (1) synthetic API smoke with 3 inserted+queried+deleted rows, (2) manual dashboard verification, (3) visual snapshot of Players tab containing the widget. Future improvement: mock /stats/players to control the clicked PID — tracked.
- Perf met: summary 180ms (<500ms target), detail 120ms (<300ms target). EmptyState wired for organic players + zero-referrals widget. Segment-aware visibility (All only) confirmed by Playwright test 17.
- Sprint 2 phase 2 OFFICIALLY CLOSED. Backlog: D3 close-out (~30 min subTab consumption), O1 (sync_load/save lockout extension), phase 2.5 anti-fraud (data-dependent), phase 3 UX audit P1 items.

## 2026-05-28 — 008: Referrals endpoint + widget
- Built `/admin/referrals` backend endpoint (summary + detail modes)
- Added PlayerModal referrals section (referred_by + referred list)
- Added Top Referrers widget to Per Player tab
- Synthetic smoke test passed; deployed `fc582831-4138-447d-9a12-2375127521a2`
- Playwright: 21/21 passing, 20 screenshots regenerated
- Commit: `9a14e71`

## 2026-05-28 — claude-code (kimi handoff 008: referrals endpoint + PlayerModal widget — sprint 2 phase 2)
- Wrote `.ai/handoffs/to-kimi/open/008-referrals-endpoint-and-widget.md`.
- Scope: new `/admin/referrals` endpoint (auth-gated, two modes: summary + detail-by-pid) + PlayerModal "Referrals" section showing incoming + outgoing referrals with clickable PIDs + "Top Referrers" widget on Per Player tab (All segment only).
- Reads from existing `referral_open` ui_events that Kiro's v1.2.64 already emits — no new event shape, no client work, no schema migration. JSON_EXTRACT on `idx_events_type_server_ts` for now; column promotion deferred to phase 2.5 if perf bites.
- Validation plan A-E baked in: endpoint smoke (auth, summary, detail, PID validation, synthetic insert), dashboard render (referred_by/referred lists, clickable navigation, segment-aware widget), perf (<500ms summary, <300ms detail, EXPLAIN QUERY PLAN paste), Playwright test added + screenshots regenerated, empty-state polish.
- **Self-grep-verify required** per AGENTS.md §7. Handoff lists 6 explicit `rg` commands Kimi must run + paste output for each claim. Noted: 007 skipped this as a transition courtesy; 008 skipping gets rejected on submission.
- Explicit deferrals: anti-fraud filtering (2.5), referral tree recursive view (3), column promotion (2.5), conversion tracking (later), top-level Referrals tab (v1 lives inside Per Player + Modal).
- User chose to start now vs waiting 24-48h for data accumulation. Data will populate as v1.2.64 reaches more players; endpoint works against empty + populated states.

## 2026-05-28 — claude-code (sprint 2 phase 1 OFFICIALLY CLOSED)
- Read + resolved Kimi's `to-claude/open/007-dashboard-sprint2p1-bug-fixes-complete.md`. Worker `962e5813-26bb-41c8-8e66-46e3d4a0c95e` live, commit `65f1f17`.
- **Self-grep-verified all 3 fixes against the working tree** (Kimi's handoff skipped this step — first completion since the rule landed; doing it for them as a transitional courtesy):
  - F1 ✅ `lib/url.js:36-39` — `applyAlias` splits on `?` then `/`, returns `{tab, segment, subTab}`. Bonus: `subTab` extractable (partial D3 groundwork).
  - F2 ✅ `Live.jsx:110, 129, 153` — `connected` state added, useEffect deps `[paused, connected]`. Polling autostarts.
  - F3 ✅ `Activity.jsx:26, 46` — `compareEnabled.value` in deps. Toggle re-fetches with `before=`.
- 19/19 Playwright still passing with corrected (post-fix) assertions. 20 screenshots regenerated.
- D3 sub-tab URL deep-link still partial — `applyAlias` exposes `subTab` but Platform/Live don't consume it. Tracked.
- **Process reminder logged:** future Kimi completion handoffs MUST include grep-verified snippets per `AGENTS.md` §7; this one slid as a transition courtesy. Next skip gets rejected on submission.
- Sprint 2 phase 1 backlog now: phase 2 (referrals endpoint, waits ~24-48h for Kiro v1.2.64 data) or phase 3 (dashboard polish from original UX audit).

## 2026-05-16 — Sprint 2 phase 1 bug fixes deployed

- F1: applyAlias split-on-/ fix for sub-tab aliases
- F2: Live feed polling auto-start via connected dep
- F3: Activity compare toggle re-fetch with cache invalidation
- Playwright suite: 19/19 passing, 20 screenshots regenerated
- Deploy version: 962e5813-26bb-41c8-8e66-46e3d4a0c95e

## 2026-05-28 — claude-code (new standing rule: self-grep-verify in completion handoffs)
- Added a project-wide rule: before any CLI writes a completion handoff to `to-<other>/open/`, every concrete claim must be grep-verified against the working tree with 1-3 matching lines pasted next to the claim. Applies to claude-code, kimi-cli, kiro-cli equally. Motivation: across the last week multiple defects landed because handoff claims drifted from the tree ("wrapped 3 sites" when 2 were wrapped at line 2105; "all 5 sync_states columns added" when only events.event_uuid had ALTER). Adds ~3 min per completion, eliminates a recurring defect class.
- Codified in: `AGENTS.md` §7 (full rule), `CLAUDE.md` §Multi-CLI (pointer to AGENTS.md), `.ai/handoffs/to-kimi/open/007-dashboard-sprint2p1-bug-fixes.md` (concrete grep commands for the F1/F2/F3 work).
- Enforcement: completion handoffs without grep-verified snippets get reviewed at the same skepticism level as if no claims were made.

## 2026-05-28 — claude-code (sprint 2 phase 1 — validation accepted, 3 bug patches dispatched)
- Read + resolved Kimi's `to-claude/open/006-dashboard-playwright-validation-complete.md`. 19/19 tests pass, 20 visual baselines committed at `cloudflare/tests/dashboard/visual/*.png`, zero console/network errors. Commit `20428f6`. Smart approach: tests assert actual behavior; bugs documented in handoff rather than silently fixed.
- 3 bugs surfaced (real defects in sprint 2 phase 1 code, not test issues):
  - **Bug 1 (high, user-facing):** `lib/url.js:31-39 applyAlias` returns full alias like `'live/feed'`; VALID_TABS only contains base tab names, so 5/8 aliasMap entries (`#feed`, `#alerts`, `#geo`, `#appversion`, `#sync`) all silently land on Overview.
  - **Bug 2 (medium, recoverable):** `tabs/Live.jsx:129-153` polling effect dep `[paused]` + early return on ref `initialLoad.current` → polling needs manual pause/resume to start.
  - **Bug 3 (high, silent wrong-state):** `tabs/Activity.jsx:22-43` useEffect deps `[range.value, force]` — `compareEnabled` signal missing; toggle changes checkbox but never fetches. Users think comparison is on when it isn't.
- Dispatched fixes via `to-kimi/open/007-dashboard-sprint2p1-bug-fixes.md`: F1/F2/F3 with file:line refs + Kimi's own fix sketches from handoff 006. Required updates to Playwright tests 6-10, 13, 14 to assert correct (post-fix) behavior. Sub-tab URL routing (D3 follow-up) called out as optional; can be closed in same patch or deferred.
- Sprint 2 phase 1 officially closes when handoff 007 lands.

## 2026-05-16 — Dashboard Playwright validation complete

- Playwright e2e suite: 19/19 tests passing
- 20 screenshots committed as visual baseline
- 3 real bugs surfaced and documented in handoff 006
- Commit: 20428f6

## 2026-05-27 — kiro-cli (handoff 005 — v1.2.64 QR share + feedback button)
- Action: Vendored a 15.5KB minimal QR encoder at src/n3ondashj/lib/qrcode.js (algorithm based on qrcode-generator by Kazuhiko Arase, MIT, custom-written by coder since web_fetch unavailable). Added QR + URL display to share modal; share URLs now include `?ref=<pid>` for referral tracking. Painted 100×100 QR onto bottom-right of PNG share-card via drawQRToCanvas. Added stage-select 📝 feedback button (.fb-btn class, positioned 96px below fullscreen toggle) wired to openFeedbackFromStageSelect → openFeedbackPanel; differentiated entry-point telemetry (meta=stage_select | pause_menu). Boot-time `?ref=` capture in 03-save.js: validates PID format `^p_[a-z0-9]+$`, blocks self-referral, fires `referral_open` once per device (localStorage `ndj_referrer_pid`), shows one-time CSS-only "Welcomed via friend" toast, strips URL via history.replaceState. Updated zipgame.ps1 to copy lib/ directory into both deploy zip and deploy/latest/. Bumped v1.2.63 → v1.2.64 via auto-detect (source change branch). Bundle delta: +7KB. New zip: deploy/20260527214435_v1.2.64.zip (194.5KB, sha256 9F3B9842…D21FA5F).
- Files: src/n3ondashj/lib/qrcode.js (new), src/n3ondashj/index.html, src/n3ondashj/04-ui.js, src/n3ondashj/03-save.js, zipgame.ps1, CHANGELOG.md, deploy/20260527214435_v1.2.64.zip, deploy/latest/, .zipgame-last-build-hash
- Server side: NO changes needed. Existing /event endpoint accepts the new ui_event actions (`referral_open`, `share_qr_shown`, `feedback_panel_opened`) transparently. Sprint-2-phase-2 referral analytics endpoint is a separate Kimi handoff once data flows.
- Deferred: end-to-end browser smoke (QR scan from real phone, referral fires from incognito, toast displays, feedback button positioning on 380px viewport) — user will smoke before Pages upload.

## 2026-05-27 — claude-code (kimi handoff 006: dashboard Playwright validation)
- Wrote `.ai/handoffs/to-kimi/open/006-dashboard-playwright-validation.md` to close the validation gap from sprint 2 phase 1 acceptance.
- Scope: Playwright suite at `cloudflare/tests/dashboard.spec.js`. 16 checks + mobile pass (380px). Tests live URL `https://ndj-metrics.jstylr.workers.dev/dashboard`. Auth via env var `DASHBOARD_KEY` → POST /auth → cookie. No code mods — pure validation. `@playwright/test` is already in `cloudflare/package.json`.
- Coverage: tab-strip count = 10, aliasMap for all 8 old hashes (#watchlist, #sessions, #engagement, #feed, #alerts, #geo, #appversion, #sync), SubTabs render on Platform + Live, Players segment chip filters fire correct API call, Live feed polling + pause toggle, Activity compare-period `before=` param, console errors = 0, network 4xx/5xx = 0, fullPage screenshots per tab committed as baseline.
- Explicit instruction: failures should be reported, NOT silently fixed. Orchestrator decides coder-spawn vs rollback.
- Estimated effort: 30-60 min. Output: completion handoff to `to-claude/open/006-...md` with test results table + screenshots paths.

## 2026-05-27 — claude-code (sprint 2 phase 1 acceptance)
- Read + resolved `to-claude/open/005-dashboard-tab-consolidation-complete.md` from Kimi. Sprint 2 phase 1 (15→10 tabs, SubTabs component, aliasMap, segment chips, 8 files deleted) shipped live as Worker `af11600f-e103-4b71-96bd-dd16278683fc`, commit `08e9e09`.
- Accepted 5 documented deviations: (D1) bundle didn't shrink — my target was stale baseline; (D2) Players chips show/hide instead of unified-list filter — backend would need a change, out of scope; (D3) sub-tab state not in URL — accepted with follow-up tracker for `#platform/versions` deep-link support; (D4) Activity CSV inherits pre-refactor scope; (D5) compare-period toggle inherits pre-refactor scope.
- ⚠️ Flagged validation gap: Kimi's API smoke confirmed backend works, but the new UI was NOT walked in browser. Aliases, sub-tabs, segment chips, data parity all untested in-app — but deployed live. Recommended `e2e-tester` (Playwright) walkthrough to close the gap before declaring sprint 2 phase 1 closed. Option B: manual user click-through.
- Full assessment + deviation analysis: `.ai/handoffs/to-claude/done/005-dashboard-tab-consolidation-complete.md`.

## 2026-05-27 — claude-code (kiro handoff 005: QR share + feedback button)
- Wrote `.ai/handoffs/to-kiro/open/005-qr-share-and-feedback-button.md`.
- Feature 1: QR code in Share popup encoding `location.href + ?ref=<pid>`. Vendored QR encoder (`src/n3ondashj/lib/qrcode.js`, ~10 KB, no npm). On boot, parse `?ref=`, fire one-time `referral_open` ui_event with `meta:<ref_pid>`, persist `ndj_referrer_pid` to dedupe, strip URL via replaceState, show "Welcomed via friend" toast. Self-referral blocked (pid===ref short-circuit). Privacy: only anonymous PID exposed, never username/mmyy.
- Feature 2: Icon-only 📝 button on stage-select directly under the existing ⛶ fullscreen button, same `fs-btn ls-ui` style. Wires to existing `openFeedbackPanel()` at 04-ui.js:2444. Add `feedback_panel_opened` ui_event with `meta:'stage_select'|'pause_menu'` to differentiate entry points.
- Server contract: NO changes needed — existing `/event` ui_event accepts arbitrary data. Sprint-2-phase-2 will add `/admin/referrals` endpoint + Per Player referrals widget once 24-48h of data has accumulated. Deferred to a future Kimi handoff.
- Validation plan A-H baked in: QR generates, scan opens game with `?ref=`, replaceState strips URL, one-time dedupe via localStorage, self-referral block, offline QR via PWA, PNG share-card bonus, feedback button click-through, ARIA, mobile 380px, bundle delta ~+10KB.
- CHANGELOG hint provided. Target: zipgame v1.2.64.

## 2026-05-16 — Kimi CLI

- **Dashboard tab consolidation deployed**
  - 15 tabs → 10 tabs: Activity (Sessions+Engagement), Live (Feed+Alerts), Platform (Geo+AppVer+Sync)
  - Players tab: added segment chips (All/New/Active/Returning/Champions/🚩Flagged/🚫Banned)
  - New SubTabs component with a11y support
  - URL aliasMap for backward compatibility (#watchlist → #/players?segment=flagged, etc.)
  - Deleted 8 old tab files
  - Build + deploy: version `af11600f-e103-4b71-96bd-dd16278683fc`
  - Commit: 8e9e09 (30 files changed, +1,473/-844)

## 2026-05-27 — kiro-cli (v1.2.63 birthday year range 1970-current)
- Action: Replaced getYearOptions in 04-ui.js with auto-current-year range (1970..currentYear). Uses windowed 2-digit convention (yy 00-69 = 2000s, yy 70-99 = 1900s); no migration needed for existing accounts since mmyy hashes remain literal-string-based. Affects all year selectors: onboarding, profile, name-change, cloud sync register, link-device. Bumped v1.2.62 → v1.2.63 via auto-detect (source change branch).
- Files: src/n3ondashj/04-ui.js, CHANGELOG.md, src/n3ondashj/index.html, src/n3ondashj/sw.js, src/n3ondashj/03-save.js, deploy/20260527205247_v1.2.63.zip, deploy/latest/, .zipgame-last-build-hash


## 2026-05-27 — kiro-cli (consolidate v1.2.54-v1.2.61 into v1.2.62)
- Action: Merged 7 entries (v1.2.61, v1.2.58, v1.2.57, v1.2.56, v1.2.55, v1.2.54 — v1.2.59 and v1.2.60 had been rolled forward into v1.2.61 in earlier sessions) into a single consolidated v1.2.62 entry with proper Added/Changed/Fixed sections. Built v1.2.62 zip via auto-detect. Source hash unchanged; only CHANGELOG.md edited. Deleted Build placeholders for v1.2.56/v1.2.57.
- Files: CHANGELOG.md, src/n3ondashj/index.html, src/n3ondashj/sw.js, src/n3ondashj/03-save.js, deploy/20260527201656_v1.2.62.zip, deploy/latest/, .zipgame-last-build-hash


## 2026-05-27 — claude-code (sprint 2 phase 1 handoff)
- Wrote `.ai/handoffs/to-kimi/open/005-dashboard-tab-consolidation.md` for the dashboard 15→10 tab merge.
- Scope: Option A (conservative) — 4 merges (Players+Watchlist; Sessions+Engagement→Activity; Geo+AppVer+Sync→Platform; Feed+Alerts→Live), zero data loss, URL aliasMap preserves all old hashes. Backend untouched. Reuse existing UI primitives.
- New: `Activity.jsx`, `Live.jsx`, `Platform.jsx`, `SubTabs.jsx` component. Modified: `Players.jsx` (+ segment chip), `Tabs.jsx`, `lib/url.js`. Deleted: 8 tab files. Bundle should drop from 165KB → ~150KB.
- Validation plan baked in: URL alias roundtrip, data parity (KPI digits match old tabs), admin actions still work, CSV export, compare-period, ARIA + keyboard nav, mobile reflow, optional Playwright snapshots, wrangler-dev smoke walkthrough. 10 sections (A-J) each with explicit checkboxes Kimi must report.
- Explicitly deferred to later sprints: cross-tab drilldown, global filters bar, Alerts ack workflow, Players 9-tables consolidation, Overview health verdict, data-freshness indicator.

## 2026-05-27 — kiro-cli (build v1.2.61)
- Action: Ran .\zipgame.ps1 (default). Auto-detect saw matching source hash, auto-applied -RollForward. v1.2.60 → v1.2.61 with same merged changelog content (recovery-code flow + multi-device fix + event_uuid dedup + in-game-changelog limit + mojibake fix). v1.2.60 entry removed from CHANGELOG.md (rolled forward).
- Output: deploy/20260527195627_v1.2.61.zip (size: 191343 bytes, sha256: 7F1902A5BB1189D10743E20788CFF70B5C7C150846B9AEF93CB457BA326F7493)
- Files: CHANGELOG.md, src/n3ondashj/index.html, src/n3ondashj/sw.js, src/n3ondashj/03-save.js, deploy/20260527195627_v1.2.61.zip, deploy/latest/, .zipgame-last-build-hash

## 2026-05-27 — kiro-cli (zipgame.ps1 auto-detect)
- Action: Added hash-based auto-detection to zipgame.ps1 default flow. SHA-256 of game JS modules + shell HTML (version-strings and changelog-viewer region normalized out) + sw.js (CACHE_NAME normalized) + manifest stored in .zipgame-last-build-hash at repo root. Default invocation: matching hash -> auto-RollForward; differing hash -> normal bump with placeholder-rejection enforcement. Explicit flags (-RollForward, -NoBump, -AllowPlaceholder, -Version) override auto-detection.
- Files: zipgame.ps1, .gitignore (+ .zipgame-last-build-hash), .zipgame-last-build-hash (created/updated by build)
- Verification: real test run with hash matching auto-applied -RollForward; cleanup restored repo to v1.2.60 baseline.

## 2026-05-27 — kiro-cli (zipgame.ps1 hardening)
- Action: Added -RollForward and -AllowPlaceholder flags to zipgame.ps1. Default invocation now refuses to ship a zip if CHANGELOG.md still has only the `- Build` placeholder for the new version (exit 2 with remediation hints). -RollForward renames the most recent changelog entry to the new version (rolling-forward rule). -AllowPlaceholder is the escape hatch.
- Files: zipgame.ps1
- Combinations: -NoBump -RollForward valid (idempotent if already rolled), -RollForward -AllowPlaceholder rejected as contradictory.

## 2026-05-27 — kiro-cli (changelog merge + -NoBump rebuild)
- Action: Applied rolling-forward rule for v1.2.60. Merged v1.2.59's content (in-game changelog limit raise + mojibake follow-up) into v1.2.60 entry, deleted v1.2.59 entry. Added recovery-code system + event_uuid dedup + multi-device indicator fix from handoffs 002+003 to v1.2.60 entry. Added `-NoBump` flag to zipgame.ps1. Regenerated v1.2.60 zip with corrected in-game changelog. Removed stale pre-merge v1.2.60 zip.
- Files: CHANGELOG.md, src/n3ondashj/index.html, src/n3ondashj/sw.js, src/n3ondashj/03-save.js, deploy/20260527182654_v1.2.60.zip, deploy/latest/
- Removed: deploy/20260527163137_v1.2.60.zip (pre-merge stale)


## 2026-05-27 — kiro-cli (smoke test v1.2.60)
- Action: Ran smoke_test.js against live worker (https://ndj-metrics.jstylr.workers.dev). 17/17 API contracts verified. Set-recovery-code, forgot-pin with code, multi-device merge, rapid-save race — all pass.
- Report: .ai/reports/e2e-recovery-code-smoke-2026-05-27.md
- Coverage gap: API-level only. Browser/UI flow (modal trigger via `requiresRecoveryCodeSetup` server field, 5s countdown, copy-to-clipboard, Settings indicator refresh) was NOT exercised by this run — deferred to manual smoke or later automation.
- Test pollution: account `SMOKE4654` created in production D1; can be purged via `DELETE FROM sync_states` where key_hash matches SMOKE4654/1225/111111.

## 2026-05-27 — kiro-cli (handoff 004 — build v1.2.60)
- Action: Ran zipgame.ps1, auto-bumped v1.2.59 → v1.2.60. Server (Kimi sprint-1) is live and stable, client recovery-code flow + event_uuid dedup + multi-device indicator fix from handoffs 002 + 003 are now packaged.
- Output: deploy/20260527163137_v1.2.60.zip (size: 191240 bytes, sha256: A3247AC3D8772F232116E2CC1DE02F62313738F69E406E89D3F4365298B04C40)
- Source updates: src/n3ondashj/index.html (boot span + settings panel), src/n3ondashj/sw.js (CACHE_NAME)
- Smoke test: end-to-end browser verification + Cloudflare Pages upload deferred to user (production actions need confirmation).
- Files: src/n3ondashj/index.html, src/n3ondashj/sw.js, src/index.html (portal metadata injection), deploy/20260527163137_v1.2.60.zip
## 2026-05-16 — Kimi CLI

- **Diagnosed and fixed prod 500 errors** on /sync/set-recovery-code and /sync/change-pin
  - Root cause: stale deploy with 600,000 PBKDF2 iterations (Workers Web Crypto limit = 100,000)
  - Redeployed Worker `c22d9ad9-603d-40c6-969c-92c6a5a7cde7`
  - Added defensive try/catch around 3× DELETE FROM sync_lookup statements
  - Full prod smoke test: **17/17 passing**
  - Git hygiene: committed 41 files, pushed to master
  - Cleanup: deleted temp test files, updated .gitignore, swept handoff stubs
  - Handoffs: all Claude/Kimi stubs moved to done, Kiro handoff updated with correct deploy version


## 2026-05-16 — Kimi CLI

- **Diagnosed and fixed prod 500 errors** on /sync/set-recovery-code and /sync/change-pin
  - Root cause: stale deploy with 600,000 PBKDF2 iterations (Workers limit = 100,000)
  - Redeployed Worker → version c22d9ad9-603d-40c6-969c-92c6a5a7cde7
  - Added defensive try/catch around 3× DELETE FROM sync_lookup statements
  - Full prod smoke test: **17/17 passing**
  - Git hygiene: committed 41 files (+3,401/-394), pushed to master
  - Cleanup: deleted temp test files, updated .gitignore, moved handoffs to done/
  - Handoffs: all Claude/Kimi stubs moved to done, Kiro handoff updated with correct deploy version


# Cross-CLI Activity Log

Newest entries at the top. Prepend after substantive work.

## 2026-05-26 04:30 — kiro-cli
- Action: Shipped 5-phase dashboard overhaul of `cloudflare/` worker + SPA. All phases delivered via coder subagent. Plan tracked at `.ai/research/dashboard-overhaul-plan.md`.
- Files: `cloudflare/src/index.js` (extended with ~12 new endpoints + cron + ban check + admin actions), `cloudflare/src/dashboard/` (32 new modular files: Preact + htm + signals + uPlot), `cloudflare/migrations/001_indices.sql`, `cloudflare/migrations/002_stats_daily.sql`, `cloudflare/build.mjs`, `cloudflare/package.json`, `cloudflare/wrangler.toml`, `cloudflare/src/dashboard.html` (now a shell)
- Decisions: User chose phased waves (b), Preact+htm framework (c), uPlot charts (b). Polling fallback for live feed instead of SSE (Cloudflare free plan 30s response limit). Banned-PID enforcement uses 60s per-isolate cache. Excluded from scope: secret relocation + auth hardening (user explicitly deferred). Final dashboard bundle: 165KB minified.
