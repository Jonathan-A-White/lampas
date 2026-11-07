// The English line of a Septuagint word's sheet (mw-u2w5klk.274.4) at 390x844: Genesis 1:1 with aligned chunks, a tap on οὐρανόν reads its own chunk ('heaven'), not the whole verse, and a tap on ὁ,
// which has no chunk, reads the whole verse and says so. public/data-lxx ships no aligned chapter in the gate, so Genesis 1's fixture (tests/fixtures/data-lxx) gets verse 1 re-cut the way lxx:align writes it.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

type Word = { e?: number };
type Chunk = { t: string; g: number[]; c: number; y: string };

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8');
    if (path === 'gen/1.json') {
      const chapter = JSON.parse(body) as { verses: { g: Word[]; e: Chunk[] }[] };
      const verse = chapter.verses[0];
      // in English order; ὁ (3) is in no chunk
      verse.e = [
        { t: 'In', g: [0], c: 0.7, y: 'align' },
        { t: 'the beginning', g: [1], c: 0.8, y: 'model' },
        { t: 'God', g: [4], c: 0.85, y: 'align' },
        { t: 'made', g: [2], c: 0.85, y: 'align' },
        { t: 'the', g: [5], c: 0.55, y: 'align' },
        { t: 'heaven', g: [6], c: 0.85, y: 'align' },
        { t: 'and', g: [7], c: 0.85, y: 'align' },
        { t: 'the', g: [8], c: 0.55, y: 'align' },
        { t: 'earth.', g: [9], c: 0.9, y: 'align' },
      ];
      verse.g.forEach((w, i) => {
        delete w.e;
        const at = verse.e.findIndex((c) => c.g.includes(i));
        if (at >= 0) w.e = at;
      });
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
});

test('a tap on οὐρανόν in Genesis 1:1 reads its own chunk, and a word with no chunk reads the whole verse and says so', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();

  const sheet = page.getByRole('dialog', { name: 'Word' });
  await page.locator('[data-verse="1"] [data-word="6"]').click();
  await expect(sheet.getByTestId('sheet-word')).toHaveText('οὐρανὸν');
  await expect(sheet.getByTestId('sheet-english')).toHaveText('heaven');
  await expect(sheet.getByTestId('sheet-english')).not.toContainText('In the beginning');
  await expect(sheet.getByTestId('sheet-english-whole')).toHaveCount(0);
  const box = await sheet.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await shot(page, 'septuagint-word-sheet-english');
  await sheet.getByRole('button', { name: 'Done' }).click();

  await page.locator('[data-verse="1"] [data-word="3"]').click();
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ὁ');
  await expect(sheet.getByTestId('sheet-english')).toContainText('In the beginning God made the heaven and the earth');
  await expect(sheet.getByTestId('sheet-english-whole')).toHaveText('This word has no English of its own: the whole verse.');
});
