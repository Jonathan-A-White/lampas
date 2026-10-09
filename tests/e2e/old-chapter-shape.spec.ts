import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// mw-5r3p30.112: a heb/7.json kept on the phone from before mw-5r3p30.102 says `s: 1` (the whole chunk supplied), where today's says
// `s: [0]`. Opening Hebrews 7 and tapping English once drew a black page; the verses must show.
test('Hebrews 7 in English shows its verses when its chunks carry the old s: 1', async ({ page }) => {
  const chapter = JSON.parse(readFileSync('public/data/heb/7.json', 'utf8')) as { verses: { e: { s?: unknown }[] }[] };
  let old = 0;
  for (const verse of chapter.verses)
    for (const chunk of verse.e)
      if (chunk.s) {
        chunk.s = 1;
        old += 1;
      }
  expect(old).toBeGreaterThan(0);
  await page.route('**/data/heb/7.json', (route) => route.fulfill({ json: chapter }));
  await openUnlocked(page);
  await page.goto('/#/?b=heb&c=7&view=greek');
  await expect(page.getByRole('heading', { name: 'Hebrews 7', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.locator('[data-verse="1"]').getByText('king', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await shot(page, 'old-chapter-shape');
});
