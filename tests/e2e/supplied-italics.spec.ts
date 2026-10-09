import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Hebrews 7:1 (mw-5r3p30.102): the translators supplied 'was' and 'and'; 'king' and 'priest' are upright.
test('Hebrews 7:1 draws only the supplied words in italics', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=heb&c=7');
  await expect(page.getByRole('heading', { name: 'Hebrews 7', level: 1 })).toBeVisible();
  const verse = page.locator('[data-verse="1"]');
  await expect(verse).toBeVisible();
  const style = (text: string) => verse.getByText(text, { exact: true }).first().evaluate((el) => getComputedStyle(el).fontStyle);
  expect(await style('was')).toBe('italic');
  expect(await style('and')).toBe('italic');
  const upright = async (chunk: string, word: string) =>
    verse.locator(`[data-chunk]:has-text("${chunk}")`).first().evaluate((el, w) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const at = (n.textContent ?? '').indexOf(w);
        if (at >= 0) {
          return getComputedStyle((n.parentElement as HTMLElement)).fontStyle;
        }
      }
      return 'missing';
    }, word);
  expect(await upright('was king', 'king')).toBe('normal');
  expect(await upright('and priest', 'priest')).toBe('normal');
  await shot(page, 'supplied-italics');
});
