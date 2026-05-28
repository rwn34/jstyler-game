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
- Action: Replaced getYearOptions in 04-ui.js with auto-current-year range (1970..currentYear). Uses windowed 2-digit convention (yy 00-69 = 2000s, yy 70-99 = 1900s); no migration needed for existing accounts since mmyy hashes remain literal-string-based. Affects all year selectors: onboarding, profile, name-change, cloud sync register, link-device. Bumped v1.2.62 → v1.2.63 via auto-detect (source changed branch).
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
- Sequencing: SubTabs first, then aliasMap, then merges in size order, then Tabs registry, then delete olds, then validate, then deploy.

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
- Files: CHANGELOG.md, src/n3ondashj/index.html (regenerated changelog HTML), deploy/20260527182654_v1.2.60.zip, deploy/latest/
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
- **Git hygiene**: committed 41 files, pushed to master
- **Cleanup**: deleted temp test files, updated .gitignore, swept handoff stubs
- **Handoffs**: all Claude/Kimi stubs moved to done, Kiro handoff updated with correct deploy version


## 2026-05-16 — Kimi CLI

- **Diagnosed and fixed prod 500 errors** on /sync/set-recovery-code and /sync/change-pin
  - Root cause: stale deploy with 600,000 PBKDF2 iterations (Workers limit = 100,000)
  - Redeployed Worker → version c22d9ad9-603d-40c6-969c-92c6a5a7cde7
  - Added defensive try/catch around 3× DELETE FROM sync_lookup statements
  - Full prod smoke test: **17/17 passing**
- **Git hygiene**: committed 41 files (+3,401/-394), pushed to master
- **Cleanup**: deleted temp test files, updated .gitignore, moved handoffs to done/
- **Handoffs**: wrote 04-pbkdf2-deploy-and-smoke-test.md to Claude

# Cross-CLI Activity Log

Newest entries at the top. Prepend after substantive work.

## 2026-05-26 04:30 — kiro-cli
- Action: Shipped 5-phase dashboard overhaul of `cloudflare/` worker + SPA. All phases delivered via coder subagent. Plan tracked at `.ai/research/dashboard-overhaul-plan.md`.
- Files: `cloudflare/src/index.js` (extended with ~12 new endpoints + cron + ban check + admin actions), `cloudflare/src/dashboard/` (32 new modular files: Preact + htm + signals + uPlot), `cloudflare/migrations/001_indices.sql`, `cloudflare/migrations/002_stats_daily.sql`, `cloudflare/build.mjs`, `cloudflare/package.json`, `cloudflare/wrangler.toml`, `cloudflare/src/dashboard.html` (now a shell)
- Decisions: User chose phased waves (b), Preact+htm framework (c), uPlot charts (b). Polling fallback for live feed instead of SSE (Cloudflare free plan 30s response limit). Banned-PID enforcement uses 60s per-isolate cache. Excluded from scope: secret relocation + auth hardening (user explicitly deferred). Final dashboard bundle: 165KB minified.
