// tests/e2e/share-reference-card.spec.ts — the reference card of a shared reference keeps its foot (Open) on the phone's visible screen (mw-5r3p30.872): 1 Peter 4:11, a
// long verse, opened from the Share to Lampas list at 390x844 and at 390x560. The phone's navigation bar covers the bottom 48 px of the page whether or not it reports it
// (tests/e2e/bottom-reach.spec.ts), and the visible area can be shorter than window.innerHeight, so Open must lie wholly above both.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ isMobile: true, hasTouch: true });

const NAV_BAR = 48;
const WORDS = 'If anyone speaks, as one who speaks oracles of God (1 Peter 4:11).';

/** Puts a share in the phone's database, as the share target leaves it, and opens the sheet on it. */
async function openShare(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    (text) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'peter', createdAt: Date.now(), text, files: [] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    WORDS,
  );
  await page.goto('/#/share?s=peter');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

for (const height of [844, 560]) {
  test.describe(`at 390x${height}`, () => {
    test.use({ viewport: { width: 390, height } });

    test('the card of 1 Peter 4:11 shows Open above the navigation bar, and Open opens 1 Peter 4 at verse 11', async ({ page }) => {
      await openShare(page);
      await page.getByRole('link', { name: '1 Peter 4:11', exact: true }).tap();
      const card = page.getByRole('dialog', { name: '1 Peter 4:11', exact: true });
      await expect(card).toBeVisible();
      await expect(card.locator('[data-reference-text]')).toContainText('God');
      const open = card.getByRole('button', { name: 'Open', exact: true });
      await expect(open).toBeVisible();
      // the card is placed again when its chapter arrives: wait for the foot to settle above the bar
      await expect
        .poll(async () => {
          const seen = await page.evaluate(() => ({ inner: window.innerHeight, visible: window.visualViewport ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight }));
          const box = await open.boundingBox();
          return box ? Math.min(seen.inner, seen.visible) - NAV_BAR - (box.y + box.height) : -Infinity;
        })
        .toBeGreaterThanOrEqual(-0.5);
      await shot(page, `share-reference-card-${height}`);

      await open.tap();
      await expect(card).toBeHidden();
      await expect(page.getByRole('heading', { name: '1 Peter 4', level: 1 })).toBeVisible();
      expect(new URL(page.url()).hash).toContain('c=4');
      const top = await page.locator('[data-verse="11"]').evaluate((el) => {
        const scroller = el.closest('.screen') ?? el.parentElement;
        return el.getBoundingClientRect().top - (scroller as HTMLElement).getBoundingClientRect().top;
      });
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(height / 2);
    });
  });
}
