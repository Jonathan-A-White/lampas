// tests/e2e/share-steady.spec.ts — the Share to Lampas sheet holds still under his thumb (mw-s1dc0n.6), at 390x844 with a touch screen. A control
// in the sheet that changes what it holds ('Page order' | 'Bible order', 'Choose a talk') must not move: the sheet sat at the bottom of the screen,
// so the book names that Bible order adds lifted the switch 108 px and a double tap on it landed on the 'Gen. 1:28' link, which left the share.
import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const WORDS = 'God said (Gen. 1:28 ESV) be fruitful. Later Paul writes in Rom 8:28-30 and 1 John 1:1';

test.use({ viewport: VIEWPORT, hasTouch: true });

// tapTwice (tests/support/gesture.ts) times the two taps on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Puts rows in the phone's database, as the share target and the Talk sheet leave them. */
async function keep(page: Page, rows: { shares?: object[]; talks?: object[] }): Promise<void> {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares', 'talks'], 'readwrite');
          for (const row of rows.shares ?? []) tx.objectStore('shares').add(row);
          for (const row of rows.talks ?? []) tx.objectStore('talks').add(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

/** Opens the sheet on words shared to Lampas, with `talks` past talks to place them in. */
async function openShare(page: Page, text: string, talks = 0): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  const now = Date.now();
  await keep(page, {
    shares: [{ id: 'steady', createdAt: now, text, files: [] }],
    talks: Array.from({ length: talks }, (_, i) => ({ ref: `rom.8.${i + 1}`, q: `Question about verse ${i + 1}?`, a: 'An answer.', words: [], when: now - (i + 1) * 3_600_000 })),
  });
  await page.goto('/#/share?s=steady');
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
}

/** Where `name`'s button is on the screen. */
async function boxOf(page: Page, name: string): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await page.getByRole('dialog', { name: 'Share to Lampas' }).getByRole('button', { name, exact: true }).boundingBox();
  if (!box) throw new Error(`no ${name} button`);
  return box;
}

async function stillOnTheShare(page: Page): Promise<void> {
  await page.waitForTimeout(300);
  expect(new URL(page.url()).hash).toMatch(/^#\/share/);
  await expect(page.getByRole('dialog', { name: 'Share to Lampas' })).toBeVisible();
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
}

test('a double tap on Bible order leaves him on the share, and the switch does not move', async ({ page }) => {
  await openShare(page, WORDS);
  await expect(page.getByRole('heading', { name: 'Bible references (3)' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Page order' })).toHaveAttribute('aria-pressed', 'true');
  const before = await boxOf(page, 'Bible order');

  // two taps at once on the page's clock, as a thumb's double tap
  await tapTwice(page, before, 0, { touch: true });
  await stillOnTheShare(page);
  await expect(page.getByRole('button', { name: 'Bible order' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Genesis', exact: true })).toBeVisible();
  expect((await boxOf(page, 'Bible order')).y).toBeCloseTo(before.y, 0);
  await shot(page, 'share-steady-bible-order');

  // and back: a double tap on Page order stays too
  await tapTwice(page, await boxOf(page, 'Page order'), 0, { touch: true });
  await stillOnTheShare(page);
  expect((await boxOf(page, 'Page order')).y).toBeCloseTo(before.y, 0);
});

test('a double tap on Choose a talk leaves the share unplaced, and the button does not move', async ({ page }) => {
  // words with no reference: a short sheet, which the list of talks would make taller
  await openShare(page, 'A note to keep', 2);
  const before = await boxOf(page, 'Choose a talk');
  // two taps at once on the page's clock, as a thumb's double tap
  await tapTwice(page, before, 0, { touch: true });
  await stillOnTheShare(page);
  expect((await boxOf(page, 'Choose a talk')).y).toBeCloseTo(before.y, 0);
  // both taps found Choose a talk: the list opened and closed again
  await expect(page.getByRole('list', { name: 'Recent talks' })).toHaveCount(0);
});

test('with the sheet scrolled to its end, a double tap that closes Choose a talk acts on nothing above it', async ({ page }) => {
  await openShare(page, WORDS, 3);
  await page.getByRole('button', { name: 'Choose a talk' }).tap();
  await expect(page.getByRole('list', { name: 'Recent talks' })).toBeVisible();
  // the end of the sheet in view: closing the list would leave less to scroll, and the box would slide New talk under the thumb
  const scroller = page.getByRole('dialog', { name: 'Share to Lampas' }).locator('.overflow-y-auto');
  await scroller.evaluate((box) => box.scrollTo({ top: box.scrollHeight }));
  expect(await scroller.evaluate((box) => box.scrollTop)).toBeGreaterThan(0);
  const before = await boxOf(page, 'Choose a talk');
  // two taps at once on the page's clock, as a thumb's double tap
  await tapTwice(page, before, 0, { touch: true });
  await stillOnTheShare(page);
  // both taps found Choose a talk: the list closed and opened again
  await expect(page.getByRole('list', { name: 'Recent talks' })).toBeVisible();
  expect((await boxOf(page, 'Choose a talk')).y).toBeCloseTo(before.y, 0);
  await shot(page, 'share-steady-choose-a-talk');
});
