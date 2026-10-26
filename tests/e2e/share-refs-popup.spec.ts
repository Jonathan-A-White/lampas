// tests/e2e/share-refs-popup.spec.ts — a reference on the Share to Lampas list opens the usual pop-up over the list (mw-5r3p30.697), at 390x844: the
// verses in the mode he reads in (English, Weave or Greek), an Old Testament verse's English card, and Open, which lands on the Reader at the
// verse's chapter with the verse at the top (not the one-verse screen); Back returns to the list.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const PICTURE = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');
const ANSWER = { references: [{ printed: 'Rom. 8:28', ref: 'Rom.8.28' }, { printed: 'John 3:16', ref: 'John.3.16' }, { printed: 'Gen. 1:28', ref: 'Gen.1.28' }] };

/** Puts the picture in the phone's database as the share target leaves it, and opens the sheet on it. */
async function openShare(page: Page): Promise<void> {
  const fake = makeFakePostern();
  fake.kindReplies['find-refs'] = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    (bytes) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'pop', createdAt: Date.now(), files: [{ name: 'page.png', type: 'image/png', bytes: new Uint8Array(bytes).buffer }] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    Array.from(PICTURE),
  );
  await page.goto('/#/share?s=pop');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

test('each reference opens its pop-up over the list, the Old Testament one shows its English, and Open lands on the Reader at the verse', async ({ page }) => {
  await openShare(page);
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  const rom = sheet.getByRole('link', { name: 'Rom. 8:28', exact: true });
  const john = sheet.getByRole('link', { name: 'John 3:16', exact: true });
  const gen = sheet.getByRole('link', { name: 'Gen. 1:28', exact: true });
  await expect(gen).toBeVisible();

  // the first: the pop-up over the list, which stays
  await rom.tap();
  const card = page.getByRole('dialog', { name: 'Romans 8:28', exact: true });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-reference-text]')).toContainText('all things work together');
  await expect(sheet).toBeVisible();
  await expect(john).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  const box = await card.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844).toBe(true);
  await shot(page, 'share-refs-popup');

  // Close, then the second has its own
  await card.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(card).toBeHidden();
  await john.tap();
  const second = page.getByRole('dialog', { name: 'John 3:16', exact: true });
  await expect(second).toBeVisible();
  await expect(second.locator('[data-reference-text]')).toContainText('For God so loved the world');
  await second.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(second).toBeHidden();

  // the Old Testament one
  await gen.tap();
  const old = page.getByRole('dialog', { name: 'Genesis 1:28', exact: true });
  await expect(old.locator('[data-reference-text]')).toContainText('God blessed them and said to them');
  await expect(old.getByRole('button', { name: 'Open', exact: true })).toHaveCount(1);
  await old.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(old).toBeHidden();

  // Open: the Reader on the chapter with the verse in view, not the one-verse screen; Back returns to the list
  await rom.tap();
  await card.getByRole('button', { name: 'Open', exact: true }).tap();
  await expect(card).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  const hash = new URL(page.url()).hash;
  expect(hash).toContain('c=8');
  expect(hash).not.toContain('v=');
  const verse = page.locator('[data-verse="28"]');
  await expect(verse).toBeVisible();
  const main = await page.locator('[data-verse="28"]').evaluate((el) => {
    const box = el.closest('.screen') ?? el.parentElement;
    const at = el.getBoundingClientRect();
    const bounds = (box as HTMLElement).getBoundingClientRect();
    return { top: at.top - bounds.top, height: bounds.height, scrolled: (box as HTMLElement).scrollTop };
  });
  expect(main.top).toBeGreaterThanOrEqual(0);
  expect(main.top).toBeLessThan(main.height / 2);
  // verses above and below are still there to scroll to
  await expect(page.locator('[data-verse="27"]')).toHaveCount(1);
  await expect(page.locator('[data-verse="29"]')).toHaveCount(1);
  await shot(page, 'share-refs-popup-reader');

  await page.goBack();
  await expect(sheet).toBeVisible();
  await expect(john).toBeVisible();
});

test('the pop-up follows the mode he reads in: Greek', async ({ page }) => {
  await openShare(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['settings'], 'readwrite');
          tx.objectStore('settings').put({ key: 'readerView', value: 'greek' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await sheet.getByRole('link', { name: 'Rom. 8:28', exact: true }).tap();
  const card = page.getByRole('dialog', { name: 'Romans 8:28', exact: true });
  const text = card.locator('[data-reference-text]');
  await expect(text).toHaveAttribute('data-view', 'greek');
  await expect(text).toContainText('Οἴδαμεν');
  await shot(page, 'share-refs-popup-greek');
});
