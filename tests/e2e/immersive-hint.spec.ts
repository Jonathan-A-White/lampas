import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Immersive reader's hint card (src/ImmersiveHint.tsx) at 390x844: with Immersive reader On the Reader opens with a card above the text that
// says how it works, with two big buttons, and it never covers the round Ask button. A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keep(page: Page, key: string, value: string) {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );
}

async function openReader(page: Page, immersive: 'on' | 'off') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, 'immersiveReader', immersive);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const card = (page: Page) => page.locator('[data-immersive-hint]');

test('the card says how it works, in large type, and does not cover the Ask button', async ({ page }) => {
  await openReader(page, 'on');
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText('Scroll down and the bars slide away.');
  await expect(card(page)).toContainText('Tap with two fingers to bring them back or put them away.');
  await expect(card(page)).toContainText('To leave immersive reading: Settings > Immersive reader.');

  const got = card(page).getByRole('button', { name: 'Got it' });
  const never = card(page).getByRole('button', { name: "Don't show this again" });
  for (const button of [got, never]) {
    const at = await button.boundingBox();
    expect(at?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(at?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  // the card fits the screen's width, and its text is big
  const box = await card(page).boundingBox();
  expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  const size = await card(page).locator('p').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(16);
  // it is above the round Ask button, not over it
  const ask = await page.locator('[data-ask-tutor]').boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(ask?.y ?? 0);
  await shot(page, 'immersive-hint');
});

test('Got it closes the card and it comes back when the app opens again', async ({ page }) => {
  await openReader(page, 'on');
  await card(page).getByRole('button', { name: 'Got it' }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(card(page)).toBeVisible();
});

test("Don't show this again closes the card for good", async ({ page }) => {
  await openReader(page, 'on');
  await card(page).getByRole('button', { name: "Don't show this again" }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(card(page)).toHaveCount(0);
});

test('with Immersive reader Off there is no card', async ({ page }) => {
  await openReader(page, 'off');
  await page.waitForTimeout(500);
  await expect(card(page)).toHaveCount(0);
});

// A quick double tap (mw-8m9dyu.10): the card leaves on the first tap and the text slides up into its place; the second tap, at the same point, must not
// land on a word and open its sheet.
for (const name of ['Got it', "Don't show this again"]) {
  test(`two quick taps on ${name} close the card and open no word sheet`, async ({ page }) => {
    await openReader(page, 'on');
    await page.goto('/#/?c=8&view=greek');
    await expect(card(page)).toBeVisible();
    const box = (await card(page).getByRole('button', { name }).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
    await expect(card(page)).toHaveCount(0);
    await page.waitForTimeout(600);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
