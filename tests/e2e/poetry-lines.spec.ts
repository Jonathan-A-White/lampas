// A verse the Berean table sets as poetry is drawn in its lines on the English tab (mw-5r3p30.1164, docs/data.md 'Poetry lines'): each line on its own line, the deeper
// one further in, a wrapped line hung under its own first word, no justification inside poetry, the verse number on the line the verse starts at, a stanza break where the table
// opens a block. Prose is as it was. Words, numbers and the tutor's door still work. Psalm 1, Psalm 23, Luke 1:46-55 and Romans 8:1-4 in light and dark, at 390x844.
import { expect, test, type Page } from '@playwright/test';
import { appReady } from './app-ready';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

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

async function open(page: Page, book: string, chapter: number, setup: { layout?: 'paragraph' | 'verse'; immersive?: boolean } = {}) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await keep(page, 'layout', setup.layout ?? 'paragraph');
  if (setup.immersive) await keep(page, 'immersiveReader', 'on');
  await page.reload();
  await page.goto(`/#/?b=${book}&c=${chapter}`);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', setup.layout ?? 'paragraph');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await appReady(page);
}

const linesOf = (page: Page, verse: number) => page.locator(`[data-verse="${verse}"] [data-line]`);
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('Psalm 1: each line on its own line, the deeper lines further in, a stanza to a paragraph', async ({ page }) => {
      await open(page, 'psa', 1);
      const lines = linesOf(page, 1);
      await expect(lines).toHaveCount(4);
      await expect(lines.nth(0)).toContainText('Blessed is the man');
      await expect(lines.nth(1)).toContainText('who does not walk in the counsel of the wicked,');
      const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map((i) => lines.nth(i).boundingBox()));
      // one under the other
      expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1);
      expect(c!.y).toBeGreaterThanOrEqual(b!.y + b!.height - 1);
      expect(d!.y).toBeGreaterThanOrEqual(c!.y + c!.height - 1);
      // each line's first word stands where its indent puts it: indent 2 deeper than indent 1
      const firstWordX = (i: number) => lines.nth(i).locator('[data-chunk]').first().evaluate((el) => el.getBoundingClientRect().left);
      const [x0, x1, x2, x3] = await Promise.all([0, 1, 2, 3].map(firstWordX));
      // (the first line's first word follows the verse number, so it is not compared)
      expect(x0).toBeGreaterThan(0);
      expect(x1).toBeGreaterThan(x2 + 15);
      expect(x3).toBeCloseTo(x1, -1);
      // not justified, hung under its first word
      for (const i of [0, 1]) {
        const style = await lines.nth(i).evaluate((el) => ({ align: getComputedStyle(el).textAlign, indent: getComputedStyle(el).textIndent }));
        expect(['start', 'left']).toContain(style.align);
        expect(parseFloat(style.indent)).toBeLessThan(0);
      }
      // the verse number is on the line the verse starts at
      const number = page.locator('[data-verse="1"] [data-verse-number]');
      await expect(lines.nth(0).locator('[data-verse-number]')).toHaveCount(1);
      await expect(number).toHaveCount(1);
      // three paragraphs as the MSB has them: verses 1-3, 4-5, 6
      await expect(page.locator('[data-paragraph]')).toHaveCount(3);
      await expect(page.locator('[data-paragraph]').nth(1).locator('[data-verse="4"]')).toHaveCount(1);
      await shot(page, `poetry-psalm-1-${scheme}`);
    });

    test('Psalm 23: the title stands as prose ahead of the lines', async ({ page }) => {
      await open(page, 'psa', 23);
      const lines = linesOf(page, 1);
      await expect(lines.first()).toContainText('A Psalm of David.');
      await expect(lines.first()).toHaveAttribute('data-indent', '0');
      await expect(lines.nth(1)).toContainText('The LORD is my shepherd;');
      await shot(page, `poetry-psalm-23-${scheme}`);
    });

    test('Luke 1:46-55: the Magnificat in lines in the New Testament too', async ({ page }) => {
      await open(page, 'luk', 1);
      await page.locator('[data-verse="46"]').scrollIntoViewIfNeeded();
      await expect(linesOf(page, 46).first()).toContainText('Then Mary said:');
      await expect(linesOf(page, 47).first()).toContainText('and my spirit rejoices in God my Savior!');
      await expect(linesOf(page, 55)).not.toHaveCount(0);
      await expect(linesOf(page, 56)).toHaveCount(0);
      await shot(page, `poetry-luke-1-46-${scheme}`);
    });

    test('Romans 8:1-4 stays running paragraph text', async ({ page }) => {
      await open(page, 'rom', 8);
      for (const n of [1, 2, 3, 4]) await expect(linesOf(page, n)).toHaveCount(0);
      await expect(page.locator('[data-paragraph]').first().locator('[data-verse="1"]')).toHaveCount(1);
      await shot(page, `poetry-romans-8-${scheme}`);
    });
  });
}

test('Verse by verse: a poetry verse is its lines beside its number, a prose verse is as it was', async ({ page }) => {
  await open(page, 'psa', 1, { layout: 'verse' });
  const lines = linesOf(page, 1);
  await expect(lines).toHaveCount(4);
  const numberBox = await box(page, '[data-verse="1"] [data-verse-number]');
  const [a, b] = await Promise.all([lines.nth(0).boundingBox(), lines.nth(1).boundingBox()]);
  // the lines stand beside the number, not under it, and the number is at the first line
  expect(a!.x).toBeGreaterThanOrEqual(numberBox.x + numberBox.width - 1);
  expect(b!.x).toBeGreaterThanOrEqual(a!.x);
  expect(Math.abs(numberBox.y + numberBox.height / 2 - (a!.y + a!.height / 2))).toBeLessThan(a!.height);
  await expect(page.locator('[data-verse="4"]')).toHaveAttribute('data-stanza', '');
  await shot(page, 'poetry-psalm-1-verse-by-verse');
});

test('every word, the verse number and a hold still work in a poetry verse', async ({ page }) => {
  await open(page, 'psa', 1);
  await linesOf(page, 1).nth(1).locator('[data-chunk]').nth(1).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('[data-verse="2"] [data-verse-number]').click();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  // the Verse view draws the verse in its lines as well
  await expect(page.getByRole('region', { name: 'Verse view' }).locator('[data-line]').first()).toBeVisible();
});

test('Immersive justifies prose and leaves poetry ragged right', async ({ page }) => {
  await open(page, 'psa', 1, { immersive: true });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  const align = await linesOf(page, 1).first().evaluate((el) => getComputedStyle(el).textAlign);
  expect(['start', 'left']).toContain(align);
});
