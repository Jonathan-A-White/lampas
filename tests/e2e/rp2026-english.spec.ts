// Settings > Reading > English from the 2026 Greek (mw-9ji6ek0.33) at 390x844: Off to start, so Philemon 1:1 reads as the MSB has it, "of Christ Jesus"; On, it reads Lampas's "of Jesus Christ"
// with an 'RP 2026' mark after it, and a tap on the mark opens a sheet with the MSB's English, Lampas's, the Greek of 2018 and 2026, each one's source and licence. Matthew 26:29, where the 2026
// Greek leaves the English alone, has no mark. Shots: shots/rp2026-english-<setting|text|sheet>.png.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const setting = (page: Page) => page.getByRole('group', { name: 'English from the 2026 Greek', exact: true });
const verseText = (page: Page, n: number) => page.locator(`[data-verse="${n}"] [data-text]`);

test('Off to start; On, Philemon 1:1 reads "of Jesus Christ," with an RP 2026 mark whose sheet gives the MSB’s words, Lampas’s, the Greek and each one’s source and licence', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  await setting(page).scrollIntoViewIfNeeded();
  await expect(setting(page).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(setting(page).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'false');
  const box = await setting(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await shot(page, 'rp2026-english-setting');

  // Off: the MSB's own words, no mark
  await page.goto('/#/?b=phm&c=1');
  await expect(verseText(page, 1)).toContainText('of Christ Jesus');
  await expect(page.locator('[data-rp2026-mark]')).toHaveCount(0);

  await page.goto('/#/settings?group=reading');
  await setting(page).getByRole('button', { name: 'On', exact: true }).click();
  await expect(setting(page).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(setting(page).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/#/?b=phm&c=1');
  await expect(verseText(page, 1)).toContainText('of Jesus Christ,');
  await expect(verseText(page, 1)).not.toContainText('of Christ Jesus');
  const mark = verseText(page, 1).locator('[data-rp2026-mark]');
  await expect(mark).toHaveText('RP 2026');
  const target = await mark.boundingBox();
  expect(target && target.width >= 44 && target.height >= 44).toBe(true);
  await shot(page, 'rp2026-english-text');

  await mark.click();
  const sheet = page.getByRole('dialog', { name: 'RP 2026: English from the 2026 Greek' });
  await expect(sheet).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const part = (name: string) => sheet.locator(`[data-rp2026-part="${name}"]`);
  await expect(part('The MSB’s English')).toContainText('of Christ Jesus');
  await expect(part('The MSB’s English')).toContainText('Majority Standard Bible, public domain');
  await expect(part('Lampas’s English')).toContainText('of Jesus Christ');
  await expect(part('Lampas’s English')).toContainText('Lampas rendering, AI-made at build time');
  await expect(part('The Greek, 2018')).toContainText('δέσμιος χριστοῦ Ἰησοῦ καὶ');
  await expect(part('The Greek, 2026')).toContainText('δεσμιος ιησου χριστου και');
  await expect(part('The Greek, 2026')).toContainText('Robinson-Pierpont 2026');
  await expect(part('The Greek, 2026')).toContainText('freely distributed by anyone without any restrictions');
  await shot(page, 'rp2026-english-sheet');

  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});

test('On, Matthew 26:29 has no mark: the 2026 Greek leaves its English alone', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  await setting(page).getByRole('button', { name: 'On', exact: true }).click();
  await expect(setting(page).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=mat&c=26');
  await expect(verseText(page, 29)).toContainText('fruit of the vine');
  await expect(page.locator('[data-rp2026-mark]')).toHaveCount(0);
  await shot(page, 'rp2026-english-matthew');
});
