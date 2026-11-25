// tests/e2e/today-morning-rephil.spec.ts — Morning RePhil as a devotional (mw-qtu3zvz.15) at 390x844: chosen in Settings > Daily > Which devotional, Today shows one episode with its title and
// date and a Watch link to its Subsplash share link (no Logos link), playing it keeps it heard, and Morning RePhil order offers Oldest first and Newest first. Watch plays the episode in Lampas's own
// sermon player sheet (Subsplash's embed in a frame), opening no new page (mw-r9xo1pj.28).
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

test('choosing Morning RePhil shows its oldest episode on Today, Watch plays it in the app and keeps it heard, and the order can be Newest first', async ({ page, context }) => {
  // Subsplash is faked: the frame's page is this, and nothing leaves the machine
  const framed: string[] = [];
  await context.route('https://subsplash.com/**', (route) => {
    framed.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body style="margin:0;background:#222;color:#fff">Morning RePhil</body>' });
  });
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
  // the Import button is drawn below the order's help line, not between the choices and it (mw-r9xo1pj.15)
  const helpLine = daily.getByText('Oldest or newest episode first.');
  const importButton = daily.getByRole('button', { name: 'Import YouTube history', exact: true });
  await expect(helpLine).toBeVisible();
  await expect(importButton).toBeVisible();
  const helpBox = await helpLine.boundingBox();
  const importBox = await importButton.boundingBox();
  expect(helpBox?.y).toBeLessThan(importBox?.y ?? 0);

  await page.goto('/#/today');
  const devotional = page.getByRole('region', { name: 'Devotional', exact: true });
  const watch = devotional.getByRole('link', { name: new RegExp(oldest.title) });
  await expect(watch).toBeVisible();
  await expect(watch).toHaveAttribute('href', oldest.share);
  await expect(watch).toContainText('Watch');
  await expect(devotional.getByText('Open in Logos')).toHaveCount(0);
  expect((await watch.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'today-morning-rephil');

  const opened: Page[] = [];
  context.on('page', (p) => opened.push(p));
  await watch.click();
  const player = page.getByRole('dialog', { name: oldest.title, exact: true });
  await expect(player).toBeVisible();
  const embed = `https://subsplash.com/u/brookfieldfirst/media/embed/d/${oldest.id}`;
  await expect(player.locator('iframe')).toHaveAttribute('src', embed);
  await expect.poll(() => framed).toEqual([embed]);
  // the frame is a 16:9 video across the sheet, and Close is reachable
  const frame = await player.locator('iframe').boundingBox();
  expect(frame?.width).toBeGreaterThan(340);
  expect((frame?.height ?? 0) / (frame?.width ?? 1)).toBeCloseTo(9 / 16, 1);
  await expect(player.getByRole('link', { name: 'Open on subsplash.com ›', exact: true })).toBeVisible();
  const close = player.getByRole('button', { name: 'Close', exact: true });
  expect((await close.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'today-morning-rephil-player');
  await close.click();
  await expect(player).toHaveCount(0);
  await expect(page).toHaveURL(/#\/today$/);
  await expect(watch).toBeVisible();
  // the one page is the app's: no tab was opened
  expect(opened).toEqual([]);
  expect(context.pages()).toHaveLength(1);
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

test('with Logos Off Morning RePhil can be chosen and shows, Seen moves Today to the next episode, and the backup row is not there, for Today shows no backup with Logos Off (mw-r9xo1pj.2, mw-r9xo1pj.11)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=daily');
  const daily = page.locator('section[data-section="daily"]');
  const picker = daily.getByRole('group', { name: 'Which devotional', exact: true });
  const backup = daily.getByRole('group', { name: 'When all Morning RePhil are seen', exact: true });
  await expect(backup).toHaveCount(0);
  await picker.getByRole('radio', { name: 'Morning RePhil (Brookfield First)', exact: true }).click();
  await expect(picker.getByRole('radio', { name: 'Morning RePhil (Brookfield First)', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(backup).toHaveCount(0);

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
