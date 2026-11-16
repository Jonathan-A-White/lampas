// A verse of poetry in the Weave and in the Hebrew tab (mw-5r3p30.1165, docs/data.md 'Poetry lines'): the Weave draws it in the lines of the English tab, its Hebrew words standing where their English was; the Hebrew tab
// breaks it into lines at its major accents (oleh-weyored and atnach in the Psalms, the atnach and a long half's zaqef elsewhere), right to left and hung, never justified. Genesis 1 stays running text.
// Psalm 1 and Psalm 23 in the Weave and in Hebrew, Isaiah 40:1-5 in Hebrew, in light and dark, at 390x844.
import { expect, test, type Page } from '@playwright/test';
import { appReady } from './app-ready';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** Hebrew words of his, solid, written into the app's own store the moment it is first made (the pattern of tests/e2e/hebrew-reader.spec.ts). */
async function giveHebrewWords(page: Page, lemmas: string[]): Promise<void> {
  const now = Date.now();
  const words = lemmas.map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid', since: now }));
  await page.addInitScript((words) => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
      const request = version === undefined ? open.call(this, name) : open.call(this, name, version);
      if (name !== 'lampas') return request;
      let created = false;
      request.addEventListener('upgradeneeded', (event) => {
        if ((event as IDBVersionChangeEvent).oldVersion === 0) created = true;
      });
      request.addEventListener('success', () => {
        if (!created) return;
        const tx = request.result.transaction(['words'], 'readwrite');
        for (const word of words) tx.objectStore('words').put(word);
      });
      return request;
    } as typeof IDBFactory.prototype.open;
  }, words);
}

const WORDS = ['אִישׁ', 'הָלַךְ', 'עָמַד', 'יָשַׁב', 'לֹא', 'כִּי', 'יְהֹוָה', 'שֵׁם', 'נֶ֫פֶשׁ'];

async function open(page: Page, query: string) {
  await giveHebrewWords(page, WORDS);
  await openUnlocked(page);
  await page.goto(`/#/?${query.replace('&view=greek', '')}`);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await appReady(page, query.includes('weave=solid') ? { reader: { weave: 'solid' } } : {});
  if (query.includes('view=greek')) {
    const hebrew = page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true });
    await hebrew.click();
    await expect(hebrew).toHaveAttribute('aria-pressed', 'true');
  }
}

const linesOf = (page: Page, verse: number) => page.locator(`[data-verse="${verse}"] [data-line]`);
const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('Psalm 1 in the Weave: the lines of the English, Hebrew words in the places of their English', async ({ page }) => {
      await open(page, 'b=psa&c=1&view=english&weave=solid');
      await expect(page.locator('[data-reader]')).toBeVisible();
      const lines = linesOf(page, 1);
      await expect(lines).toHaveCount(4);
      await expect(lines.nth(0)).toContainText('Blessed');
      await expect(lines.nth(0).locator('[data-woven]')).toHaveCount(1);
      await expect(lines.nth(0)).toContainText('הָאִ֗ישׁ');
      await expect(lines.nth(1)).toContainText('לֹ֥א הָלַךְ֮');
      const [a, b, c] = await Promise.all([0, 1, 2].map((i) => lines.nth(i).boundingBox()));
      expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1);
      expect(c!.y).toBeGreaterThanOrEqual(b!.y + b!.height - 1);
      expect(await page.locator('[data-verse="1"]').getAttribute('dir')).not.toBe('rtl');
      await noSideways(page);
      await shot(page, `poetry-weave-psalm-1-${scheme}`);
    });

    test('Psalm 23 in the Weave: the title ahead of the lines', async ({ page }) => {
      await open(page, 'b=psa&c=23&view=english&weave=solid');
      const lines = linesOf(page, 1);
      await expect(lines.first()).toHaveAttribute('data-indent', '0');
      await expect(lines.first()).toContainText('A Psalm');
      await expect(lines).toHaveCount(3);
      await noSideways(page);
      await shot(page, `poetry-weave-psalm-23-${scheme}`);
    });

    test('Psalm 1 in Hebrew: verse 1 in three lines at its oleh-weyored and atnach, right to left, hung, not justified', async ({ page }) => {
      await open(page, 'b=psa&c=1&view=greek');
      const row = page.locator('[data-verse="1"]');
      await expect(row).toHaveAttribute('dir', 'rtl');
      const lines = linesOf(page, 1);
      await expect(lines).toHaveCount(3);
      await expect(lines.nth(0).locator('[data-word]')).toHaveCount(7);
      await expect(lines.nth(1).locator('[data-word]')).toHaveCount(4);
      await expect(lines.nth(2).locator('[data-word]')).toHaveCount(4);
      const [a, b, c] = await Promise.all([0, 1, 2].map((i) => lines.nth(i).boundingBox()));
      expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1);
      expect(c!.y).toBeGreaterThanOrEqual(b!.y + b!.height - 1);
      for (const i of [0, 1, 2]) {
        const style = await lines.nth(i).evaluate((el) => ({ align: getComputedStyle(el).textAlign, indent: getComputedStyle(el).textIndent, dir: getComputedStyle(el).direction }));
        expect(['start', 'right']).toContain(style.align);
        expect(style.dir).toBe('rtl');
        expect(parseFloat(style.indent)).toBeLessThan(0);
      }
      // each line starts at the right edge: a hanging line's first word is the rightmost of it
      const right = (i: number) => lines.nth(i).locator('[data-word]').first().evaluate((el) => el.getBoundingClientRect().right);
      const [r1, r2] = await Promise.all([right(1), right(2)]);
      expect(Math.abs(r1 - r2)).toBeLessThan(4);
      await noSideways(page);
      await shot(page, `poetry-hebrew-psalm-1-${scheme}`);
    });

    test('Psalm 23 in Hebrew: each verse in its lines at the atnach', async ({ page }) => {
      await open(page, 'b=psa&c=23&view=greek');
      for (const n of [1, 2, 3, 4]) await expect(linesOf(page, n)).toHaveCount(2);
      await expect(linesOf(page, 1).first().locator('[data-word]')).toHaveCount(2);
      await noSideways(page);
      await shot(page, `poetry-hebrew-psalm-23-${scheme}`);
    });

    test('Isaiah 40:1-5 in Hebrew: the atnach, and a long half at its zaqef', async ({ page }) => {
      await open(page, 'b=isa&c=40&view=greek');
      await expect(linesOf(page, 1)).toHaveCount(2);
      await expect(linesOf(page, 2)).toHaveCount(4);
      await expect(linesOf(page, 3)).toHaveCount(2);
      await noSideways(page);
      await shot(page, `poetry-hebrew-isaiah-40-${scheme}`);
    });

    test('Genesis 1 in Hebrew: a prose verse stays running text (verse 27, the English has lines for, is broken at its atnach)', async ({ page }) => {
      await open(page, 'b=gen&c=1&view=greek');
      await expect(page.locator('[data-verse="1"] [data-line]')).toHaveCount(0);
      await expect(page.locator('[data-verse="2"] [data-line]')).toHaveCount(0);
      await expect(page.locator('[data-verse="1"] [data-word]')).toHaveCount(7);
      await shot(page, `poetry-hebrew-genesis-1-${scheme}`);
    });
  });
}

test('a tap on a Hebrew word in a poetry line opens its sheet, in the Hebrew tab and in the Weave', async ({ page }) => {
  await open(page, 'b=psa&c=1&view=greek');
  await linesOf(page, 1).nth(1).locator('[data-word]').nth(1).click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a tap on a woven word in a poetry line of the Weave opens its sheet', async ({ page }) => {
  await open(page, 'b=psa&c=1&view=english&weave=solid');
  await linesOf(page, 1).nth(0).locator('[data-woven]').first().click();
  await expect(page.getByRole('dialog').first()).toBeVisible();
});
