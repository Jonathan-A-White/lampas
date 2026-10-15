import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlicensed } from './unlocked';

// The licence tip (mw-8m9dyu.6): a free reader is told once, on the third visit, what a licence adds, in one quiet line at the foot of the Reader;
// Learn more opens the Licence page and Back returns; a Settings row's Needs a licence does the same and Back returns to that row.

/** A phone that has opened Lampas on `earlier` different days already; src/main.tsx counts today as one more. Only the first load sets it. */
async function onVisit(page: Page, visit: number): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlicensed(page);
  await page.addInitScript((earlier) => {
    if (earlier > 0 && !window.localStorage.getItem('lampas.visits')) window.localStorage.setItem('lampas.visits', JSON.stringify({ count: earlier, last: '2020-01-01' }));
  }, visit - 1);
}

const tip = (page: Page) => page.getByRole('note', { name: 'About a licence' });

test('the first and second visit show no tip', async ({ page }) => {
  await onVisit(page, 1);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  const second = await page.context().newPage();
  await onVisit(second, 2);
  await second.goto('/');
  await expect(second.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(second)).toHaveCount(0);
});

test('the third visit shows the tip at the foot; Learn more opens the Licence page and Back returns to the Reader', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/#/?c=8&view=greek');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toBeVisible();
  await expect(tip(page)).toContainText('Lampas is free to read. A licence adds a tutor you can ask about any word or verse, and Read it aloud.');
  // at the foot, above the phone's bar, and a thumb's size to tap
  const box = (await tip(page).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.y).toBeGreaterThan(844 / 2);
  for (const name of ['Learn more', 'Close']) {
    const b = (await tip(page).getByRole('button', { name }).boundingBox())!;
    expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
  }
  await shot(page, 'licence-tip');

  await tip(page).getByRole('button', { name: 'Learn more' }).click();
  await expect(page.getByRole('heading', { name: 'Licence', level: 1 })).toBeVisible();
  await expect(page.getByTestId('how-to-licence')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  await shot(page, 'licence-page-from-tip');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  expect(page.url()).toContain('view=greek');
  await expect(tip(page)).toHaveCount(0);

  // never again: not on a reload either
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

test('closing the tip ends it for good', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/');
  await tip(page).getByRole('button', { name: 'Close' }).click();
  await expect(tip(page)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

test('a Settings row’s Needs a licence opens the Licence page and Back returns to that row', async ({ page }) => {
  await onVisit(page, 1);
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const rows = page.getByRole('button', { name: 'Needs a licence' });
  await expect(rows.first()).toBeVisible();
  const last = rows.last();
  await last.scrollIntoViewIfNeeded();
  const before = (await last.boundingBox())!;
  await last.click();
  await expect(page.getByRole('heading', { name: 'Licence', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(last).toBeInViewport();
  await expect.poll(async () => Math.abs(((await last.boundingBox())?.y ?? -999) - before.y)).toBeLessThan(2);
});

test('the Licence page’s own back button returns to where it was opened from', async ({ page }) => {
  await onVisit(page, 3);
  await page.goto('/');
  await tip(page).getByRole('button', { name: 'Learn more' }).click();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
});
