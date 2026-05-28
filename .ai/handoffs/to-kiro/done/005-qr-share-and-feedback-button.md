# Handoff to Kiro — QR Share + Stage-Select Feedback Button

**From:** claude-code (orchestrator)
**To:** kiro-cli
**Date:** 2026-05-27
**Status:** Two small player-facing features for the next zip bump.

---

## Feature 1 — QR code in the Share popup, with referral tracking

**Player goal:** "I'm sitting next to a friend. Show them a QR code instead of making me open WhatsApp." The QR encodes the game URL with a `?ref=<my-pid>` parameter so we can correlate who shared with who actually opened it. Over time the dashboard learns the social graph of the player base — top referrers, friend-clusters, who really brings people in.

### Client behavior

1. **Add a QR section to the existing `shareGame()` modal** in `src/n3ondashj/04-ui.js:1048` (the SHARE overlay).
   - Generated from `location.origin + location.pathname + '?ref=' + encodeURIComponent(pid)` — fresh per render.
   - Size: ~180px square (big enough to scan reliably from 30-50cm).
   - Caption below: `📷 Scan to play — friends nearby`
   - The URL string itself displayed in monospace below the QR so a copy/paste still works if scanning fails.
   - Render above (or beside) the existing custom-message textarea. Don't push the existing PNG share-card flow off screen — keep both options.

2. **QR encoder: vendor a small one — no npm.**
   - Recommended: a single-file MIT/BSD QR encoder. ~5–10 KB minified. Candidates:
     - `qrcode-svg` (SVG output, ~6 KB) — trivially inlined since SVG embeds cleanly in our markup
     - `qrcodejs` (canvas/SVG, ~10 KB)
     - Or hand-roll a minimal encoder using the QR Code spec — but that's a lot of code for one-time use; vendor is better.
   - Save as `src/n3ondashj/lib/qrcode.js` (mirroring the existing single-file pattern). Add a header comment with the source URL, license, and SHA of the version pulled.
   - Expose one function: `renderQR(targetEl, text, size)` — draws the QR into `targetEl`.
   - **No npm install. No bundler.** Just a vanilla JS file referenced by `<script>` tag from `index.html`.

3. **Referral capture on boot** — in `src/n3ondashj/03-save.js` (the early-init path or a new `00-referral.js`):
   - On first load, parse `location.search` for `?ref=<pid>`.
   - If present AND the local player has never been credited a referral source AND `pid !== currentPlayerPid` (don't self-refer):
     - Send `sendMetric('ui_event', { action: 'referral_open', meta: ref });`
     - Persist `localStorage.setItem('ndj_referrer_pid', ref)` so we never double-count this player.
     - Show a small one-time toast: "Welcomed via friend" (no name disclosure — we don't want PID-as-stalk-vector; just acknowledge).
   - **Strip the `?ref=` from the URL after handling** via `history.replaceState(null, '', location.origin + location.pathname)` so refresh doesn't re-trigger and the player can't accidentally share the welcome-toast URL.

4. **Track share-with-QR event:**
   - On QR-modal open, fire `sendMetric('ui_event', { action: 'share_qr_shown' });`.
   - The existing `share_clicked` event stays — that's the user invoking the share modal regardless of channel.
   - If the user uses `navigator.share` from inside the modal AFTER QR is shown, the existing `share_clicked` / native-share path is the conversion signal.

5. **PNG share-card enhancement (optional but recommended):** Embed the QR in the bottom-right corner of the existing PNG share card (`shareGame()` line 1072-1119). 100×100 px QR painted onto the same canvas. Then a friend can screenshot/snapshot just the card and still get a scannable link.

### Privacy

- The player's PID is visible to anyone who scans the QR — that's already true: PIDs are sent in every event, they're not secret.
- Do NOT include username, playerName, mmyy, or any other PII in the URL. **Only the PID.**
- The toast says "Welcomed via friend" — never reveal the referrer's name to the receiver. (We have the link server-side via `data.ref` on the `ui_event`; we don't need to surface it in the UI.)

### Server contract — NO changes needed

The existing `/event` and `/events/batch` endpoints accept arbitrary `data` payloads for `type='ui_event'`. The new `action='referral_open'` and `action='share_qr_shown'` events fit cleanly into the existing model. The `meta: ref` field is captured in the `events.data` JSON column — Kimi's worker doesn't need a change for this sprint.

**Sprint-2-phase-2 server work** (separate handoff to Kimi, not this one): build a `/admin/referrals` endpoint that joins `events WHERE type='ui_event' AND JSON_EXTRACT(data,'$.action')='referral_open'` against the players table to produce a top-referrers table. Then a dashboard widget surfaces it. Not in this sprint — we need the data flowing first.

---

## Feature 2 — Feedback icon button on the stage-select screen

**Player goal:** Friction-free way to send feedback without hunting through menus.

### Client behavior

1. **Add a new `<button>` immediately below the existing fullscreen button** in `src/n3ondashj/index.html:602`.
   - Existing: `<button class="fs-btn ls-ui" type="button" onclick="toggleFullscreen()" aria-label="Fullscreen" title="Toggle Fullscreen">⛶</button>`
   - New (immediately after it, before the next sibling):
     ```html
     <button class="fs-btn ls-ui" type="button" onclick="openFeedbackPanel()" aria-label="Send feedback" title="Send feedback" style="top:calc(/* whatever offset puts it below the fs button */);">📝</button>
     ```
   - **Match the existing `fs-btn ls-ui` styling exactly** — icon-only, same size, same visual weight. The only difference is vertical position (stacked below the fullscreen icon) and the icon glyph.
   - Suggested icon: `📝` (writing pad — matches the existing "📝 Send Feedback" string at line 682 in the in-game pause panel for consistency). Alternative: `💬` (speech bubble).

2. **Click handler** wires to the existing `openFeedbackPanel()` function (already defined at `src/n3ondashj/04-ui.js:2444`). No new feedback flow needed — just a new entry point.

3. **Telemetry:** the existing feedback path already emits events. Add a tiny one-liner at the top of the new button's handler (or just before opening the panel from this entry point) to differentiate stage-select-entry vs pause-menu-entry:
   ```js
   sendMetric('ui_event', { action: 'feedback_panel_opened', meta: 'stage_select' });
   ```
   And in the existing pause-menu entry (line 682's button), mirror it with `meta: 'pause_menu'`. Tracking the entry point informs whether the new button is actually being used.

### Positioning

The fullscreen button currently sits where its CSS class `.fs-btn.ls-ui` says — find that class in the existing stylesheet (likely in `index.html` `<style>` or in `dashboard.css`-equivalent for the game) and stack the new button directly below with the same `right` offset and a `top` offset = old top + button-height + small gap (e.g., +44px or +48px). Keep tap targets ≥ 40px square per accessibility.

### Don't

- Don't change the existing in-pause feedback button at line 682. That entry stays for users already in a stage.
- Don't make the feedback button appear during gameplay (only on stage-select). Wrap with `ls-ui` class which I assume gates visibility to the lobby/stage-select state — verify by reading the existing CSS.

---

## File-level changes

| Action | File | Purpose |
|---|---|---|
| New | `src/n3ondashj/lib/qrcode.js` | Vendored QR encoder (~10 KB) — single file, vanilla JS, no npm |
| Modify | `src/n3ondashj/index.html` | Add `<script src="lib/qrcode.js"></script>` + new feedback button after line 602 + QR mount point inside the share modal markup |
| Modify | `src/n3ondashj/04-ui.js` | Extend `shareGame()` to render the QR into the modal; add `share_qr_shown` event; differentiate `feedback_panel_opened` entry points |
| Modify | `src/n3ondashj/03-save.js` | On boot: parse `?ref=`, fire `referral_open` event once, persist `ndj_referrer_pid`, strip URL via `replaceState`, show one-time toast |
| Modify | `CHANGELOG.md` | New "Added" entries for the QR share + feedback shortcut |

No backend changes. No new server endpoints. No migration.

---

## Validation plan — Kiro runs this before zipgame v1.2.64

### A. QR generation

- [ ] Open game in browser, click Share. QR appears in the modal at ~180px.
- [ ] Scan with a phone camera → opens the game URL with `?ref=<your-pid>` appended.
- [ ] Open the scanned URL in an incognito tab → `referral_open` event fires (check Network panel or the live worker dashboard's Live Feed).
- [ ] After load, URL bar shows `?ref=` stripped (replaceState worked).
- [ ] Refresh the incognito tab → no second `referral_open` event (localStorage flag prevents duplicate).
- [ ] One-time "Welcomed via friend" toast shows on first arrival, NOT on refresh.

### B. Self-referral block

- [ ] Generate a QR from your own session, scan it on the same device/PID. → no `referral_open` event sent (pid === ref short-circuit), no toast.

### C. QR encoder offline

- [ ] Disconnect network. Reload as PWA. Open Share modal. → QR still renders (vendor file is local; no API call to api.qrserver.com or similar).

### D. PNG share-card enhancement (if you do the bonus)

- [ ] Tap the SHARE button in the modal → existing PNG share card generates → QR visible in bottom-right corner of the PNG → scannable from a phone camera held up to a laptop screen.

### E. Feedback button on stage select

- [ ] On stage select, the new 📝 button appears directly under the ⛶ fullscreen button, same size, same right-edge alignment.
- [ ] Tap → opens the existing feedback panel.
- [ ] `feedback_panel_opened` event fires with `meta: 'stage_select'`.
- [ ] Tap the in-pause "📝 Send Feedback" button (existing) → same panel opens with `meta: 'pause_menu'`.
- [ ] The new button is NOT visible during gameplay (only on stage select). Confirm by entering a stage and checking it disappears.

### F. Accessibility

- [ ] New feedback button has `aria-label="Send feedback"` and `title="Send feedback"`.
- [ ] QR section in share modal has alt text or accessible caption ("QR code linking to game with referral").
- [ ] Tab order: fullscreen → feedback → other UI in expected sequence.

### G. Mobile (380 px viewport)

- [ ] Share modal still readable; QR doesn't overflow.
- [ ] Feedback button doesn't clip with fullscreen button or with the on-screen joystick area.

### H. Bundle size sanity

- [ ] After adding `lib/qrcode.js`, run `zipgame.ps1` and verify the new zip size. Should be ~+10 KB from the QR vendor, not +100 KB. If it's larger, you grabbed the wrong (bloated) QR library.
- [ ] Source-map any change to v1.2.63 → v1.2.64 in CHANGELOG.

---

## Constraints (per `CLAUDE.md`)

- **No npm / no build system / no framework.** Vanilla HTML/JS only.
- **Vendor the QR encoder file** with a header comment citing source + license + SHA.
- **Frame-rate independence** doesn't apply (this is UI, not gameplay).
- **localStorage key** for referral tracking: `ndj_referrer_pid` (follow existing `ndj_*` namespace).
- **Storage:** the referrer PID is purely local. The server already has the linkage via the `referral_open` event. No need to send it back on every save.
- **No duplicate definitions:** before adding `openFeedbackPanel` calls in two new spots, confirm the function exists once (already verified — line 2444 in `04-ui.js`).

---

## CHANGELOG entry for v1.2.64

Suggest something like:

```
## v1.2.64 — 2026-05-28

### Added
- **QR share** — Share popup now shows a scannable QR code with the game URL.
  Hand your phone to a friend nearby instead of opening WhatsApp.
- **Feedback shortcut** — New 📝 icon button on the stage-select screen
  (right edge, under the fullscreen toggle).

### Changed
- Share URLs include a referral tag so we can see which shares actually bring
  new players in (anonymous PID only; no personal data exposed).
```

---

## Sequencing

1. Vendor `lib/qrcode.js` first; smoke-test it renders a QR with a known string.
2. Wire the QR into `shareGame()` modal markup.
3. Add referral boot-time handler in `03-save.js`.
4. Add feedback button in `index.html` (1 line, easy).
5. Add `feedback_panel_opened` telemetry on both entry points.
6. Run validation A–H.
7. `zipgame.ps1` (auto-detect should trigger fresh bump since source hash changes).
8. Move this file to `to-kiro/done/` and prepend a build entry to `.ai/activity/log.md`.

---

## Follow-up sprint (NOT this handoff)

Once referral events are flowing in prod for 24-48 hours, a separate handoff to Kimi (server side) will add:
- `/admin/referrals` endpoint surfacing top referrers + referral-tree depth
- A "Referrals" sub-section in the Per Player tab (or under Sprint-2-phase-1's new "Players" view): shows per-player "X referred N friends" badge
- An "incoming referrals today" KPI on Overview

That's data-analytics work that depends on this client work landing first. I'll write that handoff when we have a week of referral data to validate against.

If anything in this spec doesn't fit reality, ping back via `to-claude/open/` BEFORE coding.
