import { readFileSync, readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The English font (Settings > Appearance > Font, mw-5r3p30.311): the computed font-family of English verse text changes with the choice, the Greek's
// does not, the type size is the same, the choice survives a reload, the face really loads, and every woff2 is in the built worker's precache list.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const familyOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
const sizeOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontSize);
const ENGLISH = '[data-verse="1"][lang="en"], [data-verse="1"] [lang="en"]';
const GREEK = '[data-verse="1"][lang="el"], [data-verse="1"] [lang="el"]';

async function openReader(page: Page, hash = '') {
  await openUnlocked(page);
  await page.goto(`/${hash}`);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]').first()).toBeVisible();
}

async function chooseFont(page: Page, name: RegExp) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const group = page.getByRole('group', { name: 'Font', exact: true });
  await group.getByRole('button', { name }).click();
  await expect(group.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
}

test('a Font changes the face of the English text and leaves the Greek and the size alone', async ({ page }) => {
  await openReader(page);
  const englishBefore = await familyOf(page, ENGLISH);
  const englishSize = await sizeOf(page, ENGLISH);
  expect(englishBefore).not.toContain('Atkinson Hyperlegible');

  await chooseFont(page, /^Atkinson Hyperlegible/);
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="1"]').first()).toBeVisible();
  expect(await familyOf(page, ENGLISH)).toContain('Atkinson Hyperlegible');
  expect(await sizeOf(page, ENGLISH)).toBe(englishSize);
  // the face is really bundled: it loads from the app, not the phone
  await page.evaluate(() => document.fonts.load('16px "Atkinson Hyperlegible"'));
  expect(await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible"'))).toBe(true);
  await shot(page, 'font-atkinson-english');

  // the Greek keeps Gentium Plus
  await page.goto('/#/?b=rom&c=8&view=greek');
  await expect(page.locator('[data-verse="1"]').first()).toBeVisible();
  const greek = await familyOf(page, GREEK);
  expect(greek).toContain('Gentium Plus');
  expect(greek).not.toContain('Atkinson Hyperlegible');
  await shot(page, 'font-atkinson-greek');
});

test('the Greek family is the same with every font, and the choice outlives a reload', async ({ page }) => {
  await openReader(page, '#/?b=rom&c=8&view=greek');
  const greekBefore = await familyOf(page, GREEK);
  for (const [name, face] of [[/^Literata/, 'Literata'], [/^Lexend/, 'Lexend']] as const) {
    await chooseFont(page, name);
    await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
    expect(await familyOf(page, GREEK)).toBe(greekBefore);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(face);
  }
  await page.reload();
  await expect(page.locator('[data-verse="1"]').first()).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Lexend');
  expect(await familyOf(page, GREEK)).toBe(greekBefore);
});

test('the Font row names each face with who it suits, at a thumb’s height', async ({ page }) => {
  await openReader(page);
  await chooseFont(page, /^Lexend/);
  const group = page.getByRole('group', { name: 'Font', exact: true });
  for (const [name, who] of [
    [/^The phone's own/, /everyone/],
    [/^Literata/, /book face for long reading/],
    [/^Atkinson Hyperlegible/, /low vision/],
    [/^Lexend/, /reading ease/],
  ] as const) {
    const button = group.getByRole('button', { name });
    await expect(button).toContainText(who);
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'settings-font');
});

test('every bundled woff2 of the English fonts is in the built worker’s precache list', async () => {
  const worker = readFileSync('dist/sw.js', 'utf8');
  const built = readdirSync('dist/assets').filter((f) => /^(literata|atkinson-hyperlegible|lexend)-latin-(400|700)-normal-.*\.woff2$/.test(f));
  expect(built).toHaveLength(6);
  for (const file of built) expect(worker, file).toContain(`assets/${file}`);
});
