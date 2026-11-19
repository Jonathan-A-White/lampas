// tests/e2e/memorize-bar-inset.spec.ts — the hold-to-say-it bar of a Memorize spoken step stands wholly above the phone's navigation area and is as wide as the verse's column (mw-5r3p30.1202).
// The Governor's screenshot (Android, three-button navigation): the yellow bar showed only its top half, the rest behind the navigation bar, and ran from the left margin to four fifths of the width,
// a 72 px gutter kept on its right for the floating ? (which he hides with a double tap). Installed app at 412x915, once with the phone reporting no inset (the 48 px floor of src/layout/barFloor.ts)
// and once reporting 48 px itself.
import { expect, test, type Page } from '@playwright/test';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { asInstalledApp, setReportedInset } from './installed';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ isMobile: true, hasTouch: true, viewport: { width: 412, height: 915 } });

/** Puts Romans 8:28 on the schedule at step 2 (half the words gone), due, as Memorize wrote it (tests/e2e/memorize-session.spec.ts). */
async function seedVerse(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: 'en:Rom.8.28', step: 2, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

for (const inset of [0, 48]) {
  test(`the hold bar is whole above the navigation area and as wide as the column (phone reports ${inset} px)`, async ({ page }) => {
    await asInstalledApp(page);
    await setReportedInset(page, inset);
    await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
    await honestMic(page);
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.locator('[data-verse]').first()).toBeVisible();
    await seedVerse(page);
    await page.goto('/#/memorize/Rom.8.28/en');
    await expect(page.getByText('English · Half the words gone · step 3 of 7')).toBeVisible();

    const bar = page.getByRole('button', { name: 'Hold to say it' });
    await expect(bar).toBeVisible();
    const box = (await bar.boundingBox())!;
    const column = (await page.getByTestId('memorize-verse').locator('xpath=ancestor::main').boundingBox())!;
    const { height, styles } = await page.evaluate(() => {
      const main = document.querySelector('main')!;
      const cs = getComputedStyle(main);
      return { height: window.innerHeight, styles: { left: parseFloat(cs.paddingLeft), right: parseFloat(cs.paddingRight) } };
    });

    // the installed app on a phone that reports nothing keeps the 48 px floor; one that reports 48 px has the same
    expect(box.y + box.height, 'the bar ends above the navigation area').toBeLessThanOrEqual(height - 48 + 0.5);
    expect(box.height, 'the bar is its full height').toBeGreaterThanOrEqual(48);
    // as wide as the content column (the screen's padding either side), not 72 px short of it
    expect(box.x).toBeCloseTo(column.x + styles.left, 0);
    expect(box.width).toBeCloseTo(column.width - styles.left - styles.right, 0);
    await shot(page, `memorize-bar-inset-${inset}`);
  });
}
