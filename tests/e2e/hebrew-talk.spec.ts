// The Bible talk on Jonah 1:1 (mw-gdcyf98.18) at 390x844: Talk about verse 1 is offered on an Old Testament verse; the request carries the verse's Hebrew and its words and no Greek; a Hebrew word of the
// answer is drawn right to left in the bundled Hebrew face as a thumb-sized tap that opens its word sheet.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 } });

const ANSWER = {
  answer: 'The word here is דָּבָר, "word": דְּבַר־ is its construct form, the word of the LORD.',
  words: [{ greek: 'דְּבַר־', lemma: 'דָּבָר', note: 'noun, masculine singular construct', language: 'he' }],
};

/** The Hebrew dial at Curious, as Settings > How much Hebrew? writes it. */
async function hebrewAtCurious(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['settings'], 'readwrite');
          tx.objectStore('settings').put({ key: 'hebrewInterest', value: '1' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('The talk about verse 1 on Jonah 1 sends the Hebrew and its words, and draws the answer\'s Hebrew word right to left', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await hebrewAtCurious(page);
  await openTalkAbout(page, 1);

  const sheet = page.getByRole('dialog', { name: 'Talk about Jonah 1:1' });
  await expect(sheet).toBeVisible();
  await (await talkField(sheet)).fill('What does the Hebrew word for word mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const words = sheet.locator('[data-talk-words]');
  const word = words.getByRole('button', { name: 'דְּבַר־' });
  await expect(word).toBeVisible();
  await expect(word).toHaveAttribute('lang', 'he');
  await expect(word).toHaveAttribute('dir', 'rtl');
  expect(await word.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Noto Serif Hebrew');
  expect((await word.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

  // what the mill was sent: the verse's Hebrew, pointed, and its words, and no Greek
  expect(fake.received).toHaveLength(1);
  const { input } = fake.received[0];
  expect(input.reference).toBe('Jonah 1:1');
  expect(String(input.hebrew)).toContain('דְּבַר');
  expect((input.hebrew_words as { form: string }[]).some((w) => w.form === 'דְּבַר־')).toBe(true);
  expect('greek' in input || 'greek_words' in input).toBe(false);

  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
  await shot(page, 'hebrew-talk');

  await word.click();
  await expect(page.getByRole('dialog', { name: 'Word' })).toContainText('דְּבַר');
});
