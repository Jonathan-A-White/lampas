// tests/e2e/speed-swipe.spec.ts — a speed he did not set must not change (mw-5r3p30.146): scrolling Settings with a thumb that
// starts on a speed slider moved the thumb to where the finger went down (Chrome moves a range input's thumb at touch-down, before
// it knows the touch is a scroll) and saved it; with the right thumb that is the right end, 1.5. Real touch events through the
// DevTools protocol, at 390x844.
import { expect, test, type Page } from '@playwright/test';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

const saved = (page: Page): Promise<Record<string, string>> =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('lampas');
        open.onsuccess = () => {
          const all = open.result.transaction('settings').objectStore('settings').getAll();
          all.onsuccess = () => {
            const rows = all.result as { key: string; value: string }[];
            resolve(Object.fromEntries(rows.filter((r) => r.key.startsWith('rate.')).map((r) => [r.key, r.value])));
          };
        };
      }),
  );

async function touch(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= steps; i++) {
    const at = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [at] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
}

test('scrolling Settings with a thumb that starts on the Greek speed slider leaves the speed where it was, after a reload too', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const greek = page.getByRole('slider', { name: 'Greek speed' });
  await expect(greek).toBeVisible();
  await greek.focus();
  await page.keyboard.press('Home');
  await expect(greek).toHaveValue('0.5');
  await greek.scrollIntoViewIfNeeded();
  const box = (await greek.boundingBox())!;
  const at = { x: box.x + box.width * 0.92, y: box.y + box.height / 2 };

  // a swipe upward that starts at the slider's right end, and one downward
  await touch(page, at, { x: at.x, y: at.y - 120 }, 10);
  await expect(greek).toHaveValue('0.5');
  await touch(page, at, { x: at.x, y: at.y + 60 }, 10);
  await expect(greek).toHaveValue('0.5');
  expect((await saved(page))['rate.greek']).toBe('0.5');

  await page.reload();
  await expect(page.getByRole('slider', { name: 'Greek speed' })).toHaveValue('0.5');
  expect((await saved(page))['rate.greek']).toBe('0.5');
});

test('a tap on the Greek speed slider still sets the speed, and it is saved', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const greek = page.getByRole('slider', { name: 'Greek speed' });
  await expect(greek).toBeVisible();
  await greek.scrollIntoViewIfNeeded();
  const box = (await greek.boundingBox())!;
  const at = { x: box.x + box.width * 0.9, y: box.y + box.height / 2 };
  await touch(page, at, at, 1);
  await expect.poll(async () => Number(await greek.inputValue())).toBeGreaterThanOrEqual(1.3);
  const value = await greek.inputValue();
  await expect.poll(async () => (await saved(page))['rate.greek']).toBe(value);
});
