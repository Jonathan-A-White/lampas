// A hold on the Reader header's last language button (Hebrew in an Old Testament book, Greek once the Septuagint is on) flips Settings > Old Testament in Greek (Septuagint) from where he reads and says so
// in a status toast (mw-u2w5klk.293): the header then reads Greek, the chapter and the verse on top stay, a New Testament book changes nothing. At 390x844 and 360x740. The Septuagint's files are the
// fixtures in tests/fixtures/data-lxx (Genesis 1 and Greek Psalm 22), answered to the page by route as tests/e2e/septuagint.spec.ts does.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8') });
  });
});

const HOLD_MS = 650;
const language = (page: Page) => page.getByRole('group', { name: 'Language', exact: true });

/** How far below the top edge of the reading box (the verse's nearest scrolling ancestor) the verse's top stands. */
const belowHeader = (page: Page, verse: number): Promise<number> =>
  page.evaluate((n) => {
    const el = document.querySelector(`[data-verse="${n}"]`);
    let box = el?.parentElement ?? null;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!el || !box) return Number.NaN;
    return el.getBoundingClientRect().top - box.getBoundingClientRect().top;
  }, verse);

/** The verse on top of the reading box: the first whose top is at or below the box's top. */
const topVerse = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const first = document.querySelector('[data-verse]');
    let box = first?.parentElement ?? null;
    while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
    if (!box) return Number.NaN;
    const top = box.getBoundingClientRect().top;
    for (const el of box.querySelectorAll<HTMLElement>('[data-verse]')) if (el.getBoundingClientRect().top >= top - 1) return Number(el.dataset.verse);
    return Number.NaN;
  });

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
] as const) {
  test.describe(`at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('a hold on Hebrew in Genesis turns the Septuagint on, the header reads Greek and verse 20 stays on top; a hold on Greek comes back', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=gen&c=1');
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Hebrew']);
      await page.locator('[data-verse="20"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(() => belowHeader(page, 20)).toBeLessThan(40);

      await holdFor(page, language(page).getByRole('button', { name: 'Hebrew', exact: true }), HOLD_MS);
      await expect(page.getByRole('status').filter({ hasText: 'Septuagint on' })).toBeVisible();
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Genesis 1');
      await expect(page.locator('[data-reader-subtitle]')).toBeVisible();
      await expect.poll(async () => Math.abs(await belowHeader(page, 20))).toBeLessThan(40);
      await shot(page, `septuagint-hold-flip-on-${size.width}`);

      await holdFor(page, language(page).getByRole('button', { name: 'Greek', exact: true }), HOLD_MS);
      await expect(page.getByRole('status').filter({ hasText: 'Hebrew text on' })).toBeVisible();
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Hebrew']);
      await expect(page.locator('[data-reader-subtitle]')).toHaveCount(0);
      await expect.poll(async () => Math.abs(await belowHeader(page, 20))).toBeLessThan(40);
    });

    test('a chapter reopened at the offset kept for it keeps its top verse across the flip', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=gen&c=1');
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Hebrew']);
      // in the source view (Hebrew, then Swete's Greek), whose verses stand at other heights than the English ones do
      await language(page).getByRole('button', { name: 'Hebrew', exact: true }).click();
      await page.locator('[data-verse="14"]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await expect.poll(() => belowHeader(page, 14)).toBeLessThan(40);
      await page.reload();
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Hebrew']);
      await expect.poll(() => topVerse(page)).toBeGreaterThan(10);
      const before = await topVerse(page);
      await holdFor(page, language(page).getByRole('button', { name: 'Hebrew', exact: true }), HOLD_MS);
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
      // brought to the top as a verse asked for is: GAP (8 px) under the box's top edge
      await expect.poll(async () => Math.abs((await belowHeader(page, before)) - 8)).toBeLessThanOrEqual(2);
    });

    test('a hold on Hebrew in Psalm 23 opens Greek Psalm 22, and a tap on the button still chooses the view', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=psa&c=23');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23');
      await language(page).getByRole('button', { name: 'Hebrew', exact: true }).click();
      await expect(language(page).getByRole('button', { name: 'Hebrew', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23');
      await holdFor(page, language(page).getByRole('button', { name: 'Hebrew', exact: true }), HOLD_MS);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23 (Greek 22)');
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
      await holdFor(page, language(page).getByRole('button', { name: 'Greek', exact: true }), HOLD_MS);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23');
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Hebrew']);
    });

    test('a hold in Matthew changes nothing and says why', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=mat&c=1');
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
      await holdFor(page, language(page).getByRole('button', { name: 'Greek', exact: true }), HOLD_MS);
      await expect(page.getByRole('status').filter({ hasText: 'Only an Old Testament book has a Septuagint' })).toBeVisible();
      await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
      await shot(page, `septuagint-hold-flip-matthew-${size.width}`);
    });
  });
}
