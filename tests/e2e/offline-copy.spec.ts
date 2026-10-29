import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading > Keep on this phone (mw-lcv9z3g.2): three choices with their sizes; choosing New Testament runs the whole offline copy against the built app, all 260 chapters of the
// real index.json, and the row counts 'N of 260 chapters' and ends 'Up to date · checked <time>'. The 34 MB full run took 32 s here, too near the 60 s test budget on a loaded host, so each
// chapter file is answered with a 20 KB stand-in (the index, the addresses and the fetching are the real ones). Service workers are blocked in e2e, so nothing is kept in the cache:
// the count and the row's states are what is proved here. A phone-width layout claim: the long choices wrap inside the frame at 390x844.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('Keep on this phone offers three choices with their sizes, counts the New Testament to 260 and says Up to date', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  const row = page.getByRole('group', { name: 'Keep on this phone', exact: true });
  await expect(row.getByRole('button', { name: 'Nothing extra', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(row.getByRole('button', { name: 'New Testament (34 MB)', exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Whole Bible (113 MB)', exact: true })).toBeVisible();
  const box = await row.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);

  // set only now: the Reader would choke on a stand-in chapter
  await page.route(/\/data\/[0-9a-z]+\/\d+\.json\?v=[0-9a-f]{12}$/, (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ filler: 'x'.repeat(20_000) }) }));
  const status = page.locator('[data-setting="offlineCopy"] [data-offline-status]');
  await row.getByRole('button', { name: 'New Testament (34 MB)', exact: true }).click();
  await expect(row.getByRole('button', { name: 'New Testament (34 MB)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText(/\d+ of 260 chapters/);
  await expect(status).toContainText('Keep the app open');
  await shot(page, 'offline-copy-running');

  await expect(status).toContainText(/Up to date · checked \S/, { timeout: 30_000 });
  await expect(status).not.toContainText('Keep the app open');
  await shot(page, 'offline-copy');

  await page.reload();
  const again = page.getByRole('group', { name: 'Keep on this phone', exact: true });
  await expect(again.getByRole('button', { name: 'New Testament (34 MB)', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
