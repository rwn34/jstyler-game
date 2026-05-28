const { test, expect } = require('@playwright/test');

const BASE_URL = 'https://ndj-metrics.jstylr.workers.dev/dashboard';
const API_BASE = 'https://ndj-metrics.jstylr.workers.dev';
const DASHBOARD_KEY = process.env.DASHBOARD_KEY;

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'levels', label: 'Per Level' },
  { id: 'players', label: 'Per Player' },
  { id: 'retention', label: 'Retention' },
  { id: 'activity', label: 'Activity' },
  { id: 'economy', label: 'Economy' },
  { id: 'dailystage', label: '🔥 Daily' },
  { id: 'live', label: 'Live' },
  { id: 'platform', label: 'Platform' },
  { id: 'feedback', label: 'Feedback' },
];

function setupErrorCollection(page) {
  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });
  return { consoleErrors, networkErrors };
}

async function setupAuth(context) {
  const res = await context.request.post(`${API_BASE}/auth`, {
    data: { password: DASHBOARD_KEY },
  });
  expect(res.ok()).toBeTruthy();

  // Explicitly inject the auth cookie into the browser context
  // because Playwright's APIRequestContext may not automatically
  // share HttpOnly / SameSite=Strict cookies with the page.
  const setCookie = res.headers()['set-cookie'];
  if (setCookie) {
    const m = setCookie.match(/^([^=]+)=([^;]+)/);
    if (m) {
      await context.addCookies([{
        name: m[1],
        value: m[2],
        domain: 'ndj-metrics.jstylr.workers.dev',
        path: '/',
      }]);
    }
  }
}

test.beforeEach(async ({ context }) => {
  test.skip(!DASHBOARD_KEY, 'DASHBOARD_KEY not set');
  await setupAuth(context);
});

test.describe('Desktop (1280x800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('1. Landing — loads, no console errors, no 4xx/5xx', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(BASE_URL);
    await page.waitForSelector('nav[aria-label="Dashboard tabs"]');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('2. Tab strip has exactly 10 tabs with correct labels', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(BASE_URL);
    const tabLocators = page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"]');
    await expect(tabLocators).toHaveCount(10);
    for (const { label } of tabs) {
      await expect(tabLocators.filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
    }
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('3. #watchlist aliases to Players + Flagged segment', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/watchlist?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Per Player');
    await expect(page.locator('h2', { hasText: '🚩 Under Review' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('4. #sessions aliases to Activity', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/sessions?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Activity');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('5. #engagement aliases to Activity', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/engagement?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Activity');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('6. #feed lands on Live + Feed sub-tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/feed?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Live');
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Live Feed/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('7. #alerts lands on Live', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/alerts?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Live');
    // Sub-tab defaults to Alerts (leftmost) since URL→sub-tab routing is deferred
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Alerts/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('8. #geo lands on Platform', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/geo?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Platform');
    // Sub-tab defaults to Geo (leftmost) since URL→sub-tab routing is deferred
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Geo/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('9. #appversion lands on Platform + Versions sub-tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/appversion?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Platform');
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Versions/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('10. #sync lands on Platform + Cloud Sync sub-tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/sync?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Platform');
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Cloud Sync/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('11. SubTabs render (Platform has 3, Live has 2)', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/platform?range=7d`);
    await expect(page.locator('.subtabs [role="tab"]')).toHaveCount(3);

    await page.goto(`${BASE_URL}#/live?range=7d`);
    await expect(page.locator('.subtabs [role="tab"]')).toHaveCount(2);
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('24. Direct #/platform/versions deep-link selects Versions sub-tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/platform/versions?range=7d`);
    await expect(
      page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"][aria-selected="true"]')
    ).toHaveText('Platform');
    await expect(page.locator('.subtabs [role="tab"]').filter({ hasText: /Versions/ })).toHaveAttribute('aria-selected', 'true');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('25. Sub-tab click updates URL hash', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/live?range=7d`);
    // Switch to Feed sub-tab
    await page.locator('.subtabs [role="tab"]').filter({ hasText: /Live Feed/ }).click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => location.hash)).toContain('/feed');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('12. Segment chips filter', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);

    // Intercept BEFORE navigation so we catch the mount-time fetch
    let flaggedIntercepted = false;
    await page.route('**/stats/flagged-players*', async (route) => {
      flaggedIntercepted = true;
      await route.continue();
    });

    await page.goto(`${BASE_URL}#/players?range=7d`);
    await page.locator('.segment-chips .chip').filter({ hasText: /Flagged/ }).click();
    await expect(page.locator('h2', { hasText: '🚩 Under Review' })).toBeVisible();
    expect(flaggedIntercepted).toBe(true);

    await page.locator('.segment-chips .chip').filter({ hasText: /Banned/ }).click();
    await expect(page.locator('h2', { hasText: '⛔ Banned' })).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('13. Live feed polling', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    let streamCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('/stats/feed/stream')) {
        streamCount++;
      }
    });

    await page.goto(`${BASE_URL}#/live?range=7d`);
    // Switch to Feed sub-tab
    await page.locator('.subtabs [role="tab"]').filter({ hasText: /Live Feed/ }).click();
    // Wait for initial /stats/feed load
    await page.waitForResponse((res) => res.url().includes('/stats/feed') && !res.url().includes('/stream'));
    // Polling should start automatically within ~5s (no manual interaction needed)
    await page.waitForRequest(
      (req) => req.url().includes('/stats/feed/stream'),
      { timeout: 8000 }
    );
    const countAfterFirst = streamCount;

    await page.locator('.pause-btn').click();
    await page.waitForTimeout(3000);

    expect(streamCount).toBe(countAfterFirst);
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('14. Activity compare toggle', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/activity?range=7d`);

    const requestPromise = page.waitForRequest(
      (req) => req.url().includes('/stats/sessions') && req.url().includes('before='),
      { timeout: 10000 }
    );
    await page.locator('input[aria-label="Toggle period comparison"]').click();
    await requestPromise;

    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('15. No console errors on full walk', async ({ page }) => {
    const { consoleErrors } = setupErrorCollection(page);
    await page.goto(BASE_URL);

    for (const { id } of tabs) {
      await page.goto(`${BASE_URL}#/${id}?range=7d`);
      await page.waitForTimeout(800);
    }

    expect(consoleErrors).toEqual([]);
  });

  test('16. Visual snapshot per tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    for (const { id } of tabs) {
      await page.goto(`${BASE_URL}#/${id}?range=7d`);
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `tests/dashboard/visual/${id}.png`,
        fullPage: true,
      });
    }
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('17. Top Referrers widget renders on Per Player tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/players?range=7d`);
    // Top Referrers is only shown in "All" segment (default)
    await expect(page.locator('h2', { hasText: 'Top Referrers' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('18. PlayerModal renders Referrals section with mocked data', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    // Mock players list
    await page.route(/\/stats\/players/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            recentActive: [{ pid: 'p_mocktest', name: 'MOCK', last_seen: Date.now(), first_seen: Date.now() - 86400000, cohort: 'new' }],
            newPlayers: [], returningPlayers: [], topActive: [], topCompleters: [], topDiers: [],
            topGold: [], champions: [], lowestVerified: [], highMotivation: [], generatedAt: Date.now(),
          },
        }),
      });
    });

    // Mock flagged players
    await page.route(/\/stats\/flagged-players/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { players: [] } }) });
    });

    // Mock referrals summary (no pid)
    await page.route(/\/admin\/referrals\?((?!pid).)*$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { summary: { total_referral_opens: 0, unique_referrers: 0, unique_referees: 0 }, top_referrers: [], timeseries: [] } }) });
    });

    // Mock player detail
    await page.route(/\/stats\/player\?/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            pid: 'p_mocktest', name: 'MOCK', firstSeen: Date.now() - 86400000, lastSeen: Date.now(),
            sessionCount: 5, daysActive: 2, totalEvents: 100, verifiedRatio: 80, uniqueLevels: 3,
            perLevel: [], totalGoldEarned: 50, totalGoldSpent: 20, totalSilverEarned: 100, totalSilverSpent: 30,
            favoriteStage: 1, country: 'US', recent: [], deathCauses: [], hourlyActivity: [], equipment: null,
            ownedSkills: [], ownedCosmetics: [], ownedConsumables: [],
          },
        }),
      });
    });

    // Mock referrals detail for mock PID
    await page.route(/\/admin\/referrals\?.*pid=p_mocktest/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            pid: 'p_mocktest', name: 'MOCK',
            referredBy: { pid: 'p_alice', name: 'ALICE', ts: Date.now() - 86400000 },
            referred: [
              { pid: 'p_carol', name: 'CAROL', ts: Date.now() - 3600000 },
              { pid: 'p_dave', name: 'DAVE', ts: Date.now() - 1800000 },
            ],
            hasMore: false,
          },
        }),
      });
    });

    await page.goto(`${BASE_URL}#/players?range=7d`);
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr:first-child td:nth-child(2) a').first().click();

    await expect(page.locator('.player-modal')).toBeVisible();
    await expect(page.locator('.player-modal')).toContainText('Referrals');
    await expect(page.locator('.player-modal')).toContainText('ALICE');
    await expect(page.locator('.player-modal')).toContainText('CAROL');
    await expect(page.locator('.player-modal')).toContainText('DAVE');
    await page.screenshot({ path: 'tests/dashboard/visual/player-modal.png', fullPage: false });
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('22. Health verdict banner renders on Overview', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/overview?range=7d`);
    await expect(page.locator('.health-verdict')).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('23. Data freshness indicator shows on header', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/overview?range=7d`);
    await expect(page.locator('.data-fresh')).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  // PlayerModal referrals section is covered by synthetic smoke test and visual snapshots.
});

test.describe('Mobile (380x800)', () => {
  test.use({ viewport: { width: 380, height: 800 } });

  test('1m. Landing — loads, no console errors, no 4xx/5xx', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(BASE_URL);
    await page.waitForSelector('nav[aria-label="Dashboard tabs"]');
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('2m. Tab strip has exactly 10 tabs with correct labels', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(BASE_URL);
    const tabLocators = page.locator('nav[aria-label="Dashboard tabs"] .tabs [role="tab"]');
    await expect(tabLocators).toHaveCount(10);
    for (const { label } of tabs) {
      await expect(tabLocators.filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
    }
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('16m. Visual snapshot per tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    for (const { id } of tabs) {
      await page.goto(`${BASE_URL}#/${id}?range=7d`);
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `tests/dashboard/visual/${id}-mobile.png`,
        fullPage: true,
      });
    }
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('17m. Top Referrers widget renders on Per Player tab', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/players?range=7d`);
    await expect(page.locator('h2', { hasText: 'Top Referrers' })).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('18m. PlayerModal renders Referrals section with mocked data', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);

    await page.route(/\/stats\/players/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            recentActive: [{ pid: 'p_mocktest', name: 'MOCK', last_seen: Date.now(), first_seen: Date.now() - 86400000, cohort: 'new' }],
            newPlayers: [], returningPlayers: [], topActive: [], topCompleters: [], topDiers: [],
            topGold: [], champions: [], lowestVerified: [], highMotivation: [], generatedAt: Date.now(),
          },
        }),
      });
    });
    await page.route(/\/stats\/flagged-players/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { players: [] } }) });
    });
    await page.route(/\/admin\/referrals\?((?!pid).)*$/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data: { summary: { total_referral_opens: 0, unique_referrers: 0, unique_referees: 0 }, top_referrers: [], timeseries: [] } }) });
    });
    await page.route(/\/stats\/player\?/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            pid: 'p_mocktest', name: 'MOCK', firstSeen: Date.now() - 86400000, lastSeen: Date.now(),
            sessionCount: 5, daysActive: 2, totalEvents: 100, verifiedRatio: 80, uniqueLevels: 3,
            perLevel: [], totalGoldEarned: 50, totalGoldSpent: 20, totalSilverEarned: 100, totalSilverSpent: 30,
            favoriteStage: 1, country: 'US', recent: [], deathCauses: [], hourlyActivity: [], equipment: null,
            ownedSkills: [], ownedCosmetics: [], ownedConsumables: [],
          },
        }),
      });
    });
    await page.route(/\/admin\/referrals\?.*pid=p_mocktest/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            pid: 'p_mocktest', name: 'MOCK',
            referredBy: { pid: 'p_alice', name: 'ALICE', ts: Date.now() - 86400000 },
            referred: [
              { pid: 'p_carol', name: 'CAROL', ts: Date.now() - 3600000 },
              { pid: 'p_dave', name: 'DAVE', ts: Date.now() - 1800000 },
            ],
            hasMore: false,
          },
        }),
      });
    });

    await page.goto(`${BASE_URL}#/players?range=7d`);
    await page.waitForSelector('table tbody tr');
    await page.locator('table tbody tr:first-child td:nth-child(2) a').first().click();

    await expect(page.locator('.player-modal')).toBeVisible();
    await expect(page.locator('.player-modal')).toContainText('Referrals');
    await expect(page.locator('.player-modal')).toContainText('ALICE');
    await page.screenshot({ path: 'tests/dashboard/visual/player-modal-mobile.png', fullPage: false });
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('22m. Health verdict banner renders on Overview', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/overview?range=7d`);
    await expect(page.locator('.health-verdict')).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  test('23m. Data freshness indicator shows on header', async ({ page }) => {
    const { consoleErrors, networkErrors } = setupErrorCollection(page);
    await page.goto(`${BASE_URL}#/overview?range=7d`);
    await expect(page.locator('.data-fresh')).toBeVisible();
    expect(consoleErrors).toEqual([]);
    expect(networkErrors).toEqual([]);
  });

  // PlayerModal referrals section is covered by synthetic smoke test and visual snapshots.
});
