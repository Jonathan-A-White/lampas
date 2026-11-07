// A chapter he has read before opens at the verse he was last on in it (mw-5r3p30.1148); a place with a verse wins. 390x844.
// The app also keeps a scroll offset per address (src/nav/scrollMemory.ts); the kept offsets are cleared at every load here, so what puts the verse back is the remembered verse.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** How far the verse's top is below the top of the reading area. */
const below = (page: Page, verse: number) =>
  page.locator('[data-reader]').evaluate((box, n) => {
    const el = box.querySelector(`[data-verse="${n}"]`);
    return el ? el.getBoundingClientRect().top - box.getBoundingClientRect().top : Number.NaN;
  }, verse);

async function goTo(page: Page, title: string, query: string): Promise<void> {
  await page.locator('h1').getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  const search = picker.getByRole('searchbox', { name: 'Search books' });
  await search.fill(query);
  await search.press('Enter');
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

async function putOnTop(page: Page, verse: number): Promise<void> {
  await page.locator(`[data-verse="${verse}"]`).first().waitFor();
  await page.locator('[data-reader]').evaluate((box, n) => {
    const el = box.querySelector(`[data-verse="${n}"]`) as HTMLElement;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
  }, verse);
}

for (const { book, title, verse } of [
  { book: 'gen', title: 'Genesis 1', verse: 20 },
  { book: 'psa', title: 'Psalms 119', verse: 40 },
]) {
  test(`${title} opens at verse ${verse}, where he was last in it, and a typed verse wins`, async ({ page }) => {
    // the kept scroll offsets are forgotten at every load, so a reload leaves only the remembered verse
    await page.addInitScript(() => window.localStorage.removeItem('lampas.scrolls'));
    await openUnlocked(page);
    await page.goto(`/#/?b=${book}&c=${title.split(' ')[1]}`);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    // never read before: the top
    expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
    await putOnTop(page, verse);
    await expect.poll(() => page.evaluate((key) => JSON.parse(window.localStorage.getItem('lampas.lastVerses') ?? '{}')[key], `${book}/${title.split(' ')[1]}`)).toBe(verse);

    await goTo(page, 'Exodus 1', 'Exo 1');
    // it survives a reload
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Exodus 1', level: 1 })).toBeVisible();
    expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);

    await goTo(page, title, title);
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-restored-verse', String(verse));
    await expect.poll(() => below(page, verse)).toBeLessThan(80);
    expect(await below(page, verse)).toBeGreaterThanOrEqual(-1);
    await shot(page, `reader-last-place-${book}`);

    // a verse he types wins over the remembered one
    await goTo(page, 'Exodus 1', 'Exo 1');
    await goTo(page, title, `${title}:3`);
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '3');
    await expect(page.locator('[data-reader]')).not.toHaveAttribute('data-restored-verse', /.*/);
    await expect.poll(() => below(page, 3)).toBeLessThan(80);
  });
}

test('a chapter left at its top opens at its top', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('lampas.scrolls'));
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.getByRole('heading', { name: 'Genesis 1', level: 1 })).toBeVisible();
  await putOnTop(page, 20);
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('lampas.lastVerses') ?? '{}')['gen/1'])).toBe(20);
  await page.locator('[data-reader]').evaluate((box) => {
    box.scrollTop = 0;
  });
  await expect.poll(() => page.evaluate(() => JSON.parse(window.localStorage.getItem('lampas.lastVerses') ?? '{}')['gen/1'])).toBeUndefined();
  await goTo(page, 'Exodus 1', 'Exo 1');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exodus 1', level: 1 })).toBeVisible();
  await goTo(page, 'Genesis 1', 'Gen 1');
  expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
});
