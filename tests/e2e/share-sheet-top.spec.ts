// tests/e2e/share-sheet-top.spec.ts — the Share to Lampas sheet opens at its top (mw-5r3p30.736), on a 412x892 phone, with a shared picture whose references
// come back after the sheet is up. His screenshot showed the list scrolled: the first reference cut at the title, the choice buttons out of view above and a
// blank band under the last reference, the sheet holding a height from a taller moment (useNeverShrink) with the scroll left at its bottom.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 412, height: 892 }, hasTouch: true });

const PICTURE = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');
const ANSWER = { references: [{ printed: 'Deut. 7:9', ref: 'Deut.7.9' }, { printed: 'Lam. 3:22-23', ref: 'Lam.3.22' }, { printed: '2 Pet. 3:9', ref: '2Pet.3.9' }] };

/** Puts the picture in the phone's database as the share target leaves them. */
async function keep(page: Page): Promise<void> {
  await page.evaluate(
    (bytes) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'top', createdAt: Date.now(), files: [{ name: 'page.png', type: 'image/png', bytes: new Uint8Array(bytes).buffer }] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    Array.from(PICTURE),
  );
}

/** Where things are in the scroll box, for what he sees. */
async function view(sheet: ReturnType<Page['getByRole']>) {
  return sheet.locator('.overflow-y-auto').evaluate((box) => {
    const room = box.getBoundingClientRect();
    const whole = (el: Element | null): boolean => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= room.top - 0.5 && r.bottom <= room.bottom + 0.5;
    };
    const links = [...box.querySelectorAll('[data-share-ref]')];
    const last = links[links.length - 1]?.getBoundingClientRect();
    return {
      scrollTop: box.scrollTop,
      links: links.length,
      allWhole: links.every(whole),
      buttons: whole(box.querySelector('[data-share-new]')),
      // what the content holds under the last card (the sheet's own empty room under a short content is not a band)
      blankBelow: last && box.firstElementChild ? box.firstElementChild.getBoundingClientRect().bottom - last.bottom : Infinity,
      card: last?.height ?? 0,
    };
  });
}

test('after the references come and the sheet is scrolled and shortened, it settles at its top with its buttons and every reference in view', async ({ page }) => {
  const fake = makeFakePostern();
  fake.kindReplies['find-refs'] = { status: 'answered', answer: ANSWER };
  // the answer is held until the sheet has been up a while: the references arrive after it
  let release = (): void => undefined;
  fake.holds['find-refs'] = new Promise<void>((resolve) => {
    release = resolve;
  });
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await keep(page);
  await page.goto('/#/share?s=top');
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('Finding Bible references...')).toBeVisible();
  release();
  await expect(sheet.getByRole('heading', { name: 'Bible references (3)' })).toBeVisible();

  // Bible order puts a book's name over each reference: the sheet is taller, and he scrolls to the end of it to read them
  await sheet.getByRole('button', { name: 'Bible order' }).tap();
  await expect(sheet.getByRole('group', { name: 'Deuteronomy', exact: true })).toBeVisible();
  const scroller = sheet.locator('.overflow-y-auto');
  await scroller.evaluate((box) => box.scrollTo({ top: box.scrollHeight }));
  expect(await scroller.evaluate((box) => box.scrollTop)).toBeGreaterThan(0);
  // and back to Page order: the content is shorter than the sheet's scroll, and settles
  await sheet.getByRole('button', { name: 'Page order' }).tap();
  await expect(sheet.getByRole('group', { name: 'Deuteronomy', exact: true })).toHaveCount(0);
  await page.waitForTimeout(3000);

  const seen = await view(sheet);
  expect(seen.links).toBe(3);
  expect(seen.scrollTop).toBe(0);
  expect(seen.buttons).toBe(true);
  expect(seen.allWhole).toBe(true);
  expect(seen.blankBelow).toBeLessThanOrEqual(seen.card);
  const title = await sheet.getByRole('heading', { name: 'Share to Lampas' }).boundingBox();
  const sheetBox = await sheet.boundingBox();
  expect(title && sheetBox && title.y >= sheetBox.y).toBe(true);
  await shot(page, 'share-sheet-top');
});
