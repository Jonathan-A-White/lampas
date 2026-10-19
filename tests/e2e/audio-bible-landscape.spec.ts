// tests/e2e/audio-bible-landscape.spec.ts — the Audio Bible row of the Verse view's Listen action stays above its Play bar sideways (844x390) and at the largest
// text (mw-5r3p30.468): the 'Listen in Audible' link's box ends above the Play bar's box, and its credit line is not cut by the bar at rest.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ hasTouch: true });

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

/** Luke 15, verse 11 in its Verse view on Listen, the Audio Bible on (Settings > Study resources) and the Text size `percent` of the phone's own. */
async function openListen(page: Page, size: { width: number; height: number }, percent: number): Promise<Locator> {
  await page.setViewportSize(size);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { audioBible: 'word-of-promise', textSize: String(percent) });
  await page.goto('/#/?b=luk&c=15&v=11');
  await page.reload();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await view.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(view.locator('[data-audio-bible]')).toBeVisible();
  return view;
}

/** The link sits above the bar at rest: its box ends at or above the bar's top, and it is whole in the window. */
async function expectLinkAboveBar(view: Locator): Promise<void> {
  const bar = await view.locator('[data-verse-bar]').boundingBox();
  const link = await view.getByRole('link', { name: /^Listen in Audible/ }).boundingBox();
  expect(bar).not.toBeNull();
  expect((link?.y ?? 0) + (link?.height ?? 0), 'the link ends above the Play bar').toBeLessThanOrEqual((bar?.y ?? 0) + 0.5);
  await expect(view.getByRole('link', { name: /^Listen in Audible/ })).toBeInViewport({ ratio: 1 });
}

/** The credit line, the row's last, ends above the bar once the view is scrolled to its end: the bar never covers it. */
async function expectCreditReachable(view: Locator): Promise<void> {
  await view.locator('.screen').evaluate((box) => {
    box.scrollTop = box.scrollHeight;
  });
  const bar = await view.locator('[data-verse-bar]').boundingBox();
  const credit = await view.locator('[data-audio-bible] p').last().boundingBox();
  expect((credit?.y ?? 0) + (credit?.height ?? 0), 'the credit line ends above the Play bar').toBeLessThanOrEqual((bar?.y ?? 0) + 0.5);
}

test('sideways (844x390) the Listen in Audible link ends above the Play bar', async ({ page }) => {
  const view = await openListen(page, { width: 844, height: 390 }, 100);
  await expect(view.getByRole('button', { name: /^Play verse 11/ })).toBeVisible();
  await shot(page, 'audio-bible-landscape');
  await expectLinkAboveBar(view);
  await expectCreditReachable(view);
});

test('at the largest text (390x844) the link is above the Play bar at rest and the credit line is not cut by it', async ({ page }) => {
  const view = await openListen(page, { width: 390, height: 844 }, 160);
  await shot(page, 'audio-bible-largest');
  await expectLinkAboveBar(view);
  await expectCreditReachable(view);
});
