// tests/e2e/today-morning-rephil.spec.ts — Morning RePhil as a devotional (mw-qtu3zvz.15) at 390x844: chosen in Settings > Daily > Which devotional, Today shows one episode with its title and
// date and a Watch link to its Subsplash share link (no Logos link), playing it keeps it heard, and Morning RePhil order offers Oldest first and Newest first.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { turnLogosOn } from './settings-group';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

interface Episode {
  id: string;
  title: string;
  date: string;
  share: string;
}
const EPISODES = JSON.parse(readFileSync('data/daily/morning-rephil.json', 'utf8')) as Episode[];
const oldest = EPISODES[0];
const newest = EPISODES[EPISODES.length - 1];

/** What the app kept under a settings key, as saved. */
async function keptRaw(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate(
    (k) =>
      new Promise<string | undefined>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const get = idb.transaction('settings', 'readonly').objectStore('settings').get(k);
          get.onsuccess = () => {
            idb.close();
            resolve(get.result?.value);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    key,
  );
}

test('choosing Morning RePhil shows its oldest episode on Today, Watch opens the share link and keeps it heard, and the order can be Newest first', async ({ page, context }) => {
  await context.route('https://brookfieldfirst.subspla.sh/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Morning RePhil</title>' }));
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/settings?group=daily');
  const daily = page.locator('section[data-section="daily"]');
  const picker = daily.getByRole('group', { name: 'Which devotional', exact: true });
  const order = daily.getByRole('group', { name: 'Morning RePhil order', exact: true });
  // the order row shows only while Which devotional is Random or Morning RePhil
  await expect(order).toHaveCount(0);
  await picker.getByRole('radio', { name: 'Morning RePhil (Brookfield First)', exact: true }).click();
  await expect(order.getByRole('button', { name: 'Oldest first', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(order.getByRole('button', { name: 'Newest first', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect((await order.getByRole('button', { name: 'Newest first', exact: true }).boundingBox())?.height).toBeGreaterThanOrEqual(43.5);

  await page.goto('/#/today');
  const devotional = page.getByRole('region', { name: 'Devotional', exact: true });
  const watch = devotional.getByRole('link', { name: new RegExp(oldest.title) });
  await expect(watch).toBeVisible();
  await expect(watch).toHaveAttribute('href', oldest.share);
  await expect(watch).toContainText('Watch');
  await expect(devotional.getByText('Open in Logos')).toHaveCount(0);
  expect((await watch.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'today-morning-rephil');

  const [tab] = await Promise.all([context.waitForEvent('page'), watch.click()]);
  await expect(tab).toHaveURL(oldest.share);
  await tab.close();
  await expect.poll(async () => await keptRaw(page, 'morningRephilHeard')).toBe(JSON.stringify([oldest.id]));
  // still the day's episode after a reload, though heard
  await page.reload();
  await expect(devotional.getByRole('link', { name: new RegExp(oldest.title) })).toBeVisible();

  // Newest first: tomorrow's pick would be the newest; the heard one is never offered again
  await page.goto('/#/settings?group=daily');
  await order.getByRole('button', { name: 'Newest first', exact: true }).click();
  await expect(order.getByRole('button', { name: 'Newest first', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await keptRaw(page, 'morningRephilOrder')).toBe('newest');
  expect(newest.id).not.toBe(oldest.id);
});

test('with Logos Off Morning RePhil can be chosen and shows, Seen moves Today to the next episode, and the backup row is there (mw-r9xo1pj.2)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=daily');
  const daily = page.locator('section[data-section="daily"]');
  const picker = daily.getByRole('group', { name: 'Which devotional', exact: true });
  const backup = daily.getByRole('group', { name: 'When all Morning RePhil are seen', exact: true });
  await expect(backup).toHaveCount(0);
  await picker.getByRole('radio', { name: 'Morning RePhil (Brookfield First)', exact: true }).click();
  await expect(backup).toBeVisible();
  await expect(backup.getByRole('radio', { name: /Morning and Evening/ })).toHaveAttribute('aria-checked', 'true');

  await page.goto('/#/today');
  const devotional = page.getByRole('region', { name: 'Devotional', exact: true });
  await expect(devotional.getByRole('link', { name: new RegExp(oldest.title) })).toBeVisible();
  const seen = devotional.getByRole('button', { name: 'Seen', exact: true });
  expect((await seen.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'today-morning-rephil-seen');
  await seen.click();
  await expect(devotional.getByRole('link', { name: new RegExp(EPISODES[1].title) })).toHaveAttribute('href', EPISODES[1].share);
  await expect.poll(async () => await keptRaw(page, 'morningRephilHeard')).toBe(JSON.stringify([oldest.id]));
  // still the next one after a reload: Seen is kept on this phone
  await page.reload();
  await expect(devotional.getByRole('link', { name: new RegExp(EPISODES[1].title) })).toBeVisible();
});
