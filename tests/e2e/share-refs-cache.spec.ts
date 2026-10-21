// tests/e2e/share-refs-cache.spec.ts — the references found in a shared picture are kept by the picture's fingerprint (mw-5r3p30.695), at 390x844: share a
// picture, see its references, open one, come back to the share (and again after a reload): the references show at once and the find-refs grind, which is
// stubbed, was asked exactly once.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const PICTURE = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');
const ANSWER = { references: [{ printed: 'Rom. 8:28', ref: 'Rom.8.28' }, { printed: 'John 3:16', ref: 'John.3.16' }] };

/** Puts the picture in the phone's database as the share target leaves it, and opens the sheet on it. */
async function openShare(page: Page): Promise<void> {
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
          tx.objectStore('shares').add({ id: 'pic', createdAt: Date.now(), files: [{ name: 'page.png', type: 'image/png', bytes: new Uint8Array(bytes).buffer }] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    Array.from(PICTURE),
  );
  await page.goto('/#/share?s=pic');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

test('a picture is read once: opening a reference and coming back (or reloading) shows its references with no second grist', async ({ page }) => {
  const fake = makeFakePostern();
  fake.kindReplies['find-refs'] = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  const asked = () => fake.received.filter((g) => g.grist.kind === 'find-refs').length;

  await openShare(page);
  const sheet = page.getByRole('dialog', { name: 'Share to Lampas' });
  await expect(sheet.getByRole('link', { name: 'Rom. 8:28', exact: true })).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'John 3:16', exact: true })).toBeVisible();
  expect(asked()).toBe(1);

  // read the verse, then back to the share for the next one
  await sheet.getByRole('link', { name: 'Rom. 8:28', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Romans 8:28', exact: true }).getByRole('button', { name: 'Open', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.goto('/#/share?s=pic');
  await expect(sheet.getByRole('link', { name: 'John 3:16', exact: true })).toBeVisible();
  await expect(sheet.getByText('Finding Bible references...')).toHaveCount(0);
  expect(asked()).toBe(1);
  await shot(page, 'share-refs-cache');

  // and after the phone's page is loaded afresh
  await page.reload();
  await expect(sheet.getByRole('link', { name: 'Rom. 8:28', exact: true })).toBeVisible();
  expect(asked()).toBe(1);
});
