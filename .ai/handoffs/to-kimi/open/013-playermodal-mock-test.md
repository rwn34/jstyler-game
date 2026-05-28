# Handoff to Kimi — Mock-Based PlayerModal Playwright Test

**From:** claude-code (orchestrator)
**To:** kimi-cli
**Date:** 2026-05-28
**Status:** Test infrastructure follow-up. ~30 min. Closes the 008 deviation.

Background: in handoff 008 you attempted Playwright tests 18 / 18m for the PlayerModal Referrals section, then removed them because the test clicked a row from the Recently Active table and the resolved PID varied with prod data → flaky. You suggested the right fix in your 008 handoff: "mock the entire `/stats/players` response to control the clicked PID."

Do that now.

---

## Scope

Add two Playwright tests (desktop + mobile) that:

1. Intercept `/stats/players` (or whatever the Per Player tab fetches) via `page.route()`
2. Return a synthetic JSON payload containing one known PID (e.g. `p_mocktest123`)
3. Intercept `/admin/referrals?pid=p_mocktest123` and return synthetic referral data (one incoming, two outgoing)
4. Navigate to Per Player tab
5. Click the row with the known PID
6. Assert PlayerModal opens
7. Assert Referrals section visible with expected names ("Referred by: ALICE", "Referred 2 players")
8. Assert clicking a referee name navigates to that player's modal (mock that route too)

---

## Implementation sketch

```js
test('18. PlayerModal renders Referrals section with mocked data', async ({ page }) => {
  // Mock the players endpoint
  await page.route('**/stats/players*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          recently_active: [{ pid: 'p_mocktest', name: 'MOCK', last_seen: Date.now(), ... }],
          // ... other sections empty
        },
      }),
    })
  );

  // Mock the referrals endpoint for the mock PID
  await page.route('**/admin/referrals*', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('pid') === 'p_mocktest') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            pid: 'p_mocktest',
            referred_by: { pid: 'p_alice', name: 'ALICE', ts: Date.now() - 86400000 },
            referred: [
              { pid: 'p_carol', name: 'CAROL', ts: Date.now() - 3600000 },
              { pid: 'p_dave', name: 'DAVE', ts: Date.now() - 1800000 },
            ],
          },
        }),
      });
    }
    // Summary mode — return minimal valid shape
    return route.fulfill({ /* summary shape */ });
  });

  // Mock stats/player/<pid> for the modal detail fetch
  await page.route('**/stats/player/p_mocktest', (route) =>
    route.fulfill({ /* whatever shape PlayerModal expects */ })
  );

  await loginAndGoto(page, '/dashboard');
  await page.locator('[role="tab"]:has-text("Per Player")').click();
  await page.locator('tr:has-text("MOCK")').first().click();

  await expect(page.locator('h2:has-text("Referrals")')).toBeVisible();
  await expect(page.locator('text=ALICE')).toBeVisible();
  await expect(page.locator('text=Referred 2 players')).toBeVisible();
  await expect(page.locator('text=CAROL')).toBeVisible();

  // Click CAROL → re-mock /stats/player/p_carol if you want to test navigation
  // OR just assert the click event fires; full re-render test optional.
});

test('18m. PlayerModal Referrals on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  // Same as above; mobile screenshot
});
```

Pin the exact shape against the real endpoint response (run `curl` against prod with auth cookie + a real PID, copy that shape, replace data with synthetic). This guards against shape-drift if the API changes.

---

## What this gives us

- Modal rendering is no longer dependent on prod data — fully deterministic
- Future changes to PlayerModal layout get caught even if there are zero referrals in prod
- Pattern is reusable: same `page.route()` mocking can lock down other modal tests later

---

## Validation

- [ ] `npx playwright test --grep "PlayerModal"` runs both 18 and 18m → both pass
- [ ] All 25+ pre-existing tests still pass
- [ ] Run 5 times in a row → no flakes (the whole point of going to mocks)
- [ ] Visual snapshot of the mocked-modal state added to baseline (e.g. `tests/dashboard/visual/player-modal.png`)

---

## Self-grep-verify (REQUIRED — AGENTS.md §7)

```bash
# Mock routes wired
rg -n "page\\.route.*stats/players|page\\.route.*admin/referrals" cloudflare/tests/dashboard.spec.js

# Modal test exists
rg -n "PlayerModal renders Referrals|test\\('18\\." cloudflare/tests/dashboard.spec.js

# Mock PID used
rg -n "p_mocktest" cloudflare/tests/dashboard.spec.js
```

Completion handoff at `to-claude/open/013-playermodal-mock-test-complete.md` with these snippets per AGENTS.md §7.

---

## Files

| Action | File |
|---|---|
| Modify | `cloudflare/tests/dashboard.spec.js` (+2 tests, ~80 lines) |
| New (optional) | `cloudflare/tests/fixtures/players.json` if you'd rather externalize the mock payload |
| New | `cloudflare/tests/dashboard/visual/player-modal.png` (and -mobile variant) |

No source code changes. No deploy. Tests only.

---

## When done

- Run the new tests + full suite locally
- Commit: `test(dashboard): mock-based PlayerModal Referrals test`
- Move handoff to `to-kimi/done/`
- Activity log entry
- Completion handoff in `to-claude/open/013-...-complete.md`

After this, the only remaining "deferred-deviation" tracker is closed.
