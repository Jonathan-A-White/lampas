// tests/e2e/talk-list-answer.spec.ts — an answer with a list is drawn as a list (mw-5r3p30.928): at 390 x 844 a numbered top five is five lines one under another in the Talk
// sheet, not run into a paragraph, and the references in it (the book in full at first, then 'chapters 2, 7 and 10 to 12') are links. jsdom has no layout, so it is proven here.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';
import { shot } from './shot';

const ANSWER = [
  'Here is a top five, ordered by how much light each throws on Revelation.',
  '',
  '1. **Daniel**, above all chapters 2, 7 and 10 to 12: the statue and the kingdoms, the Son of Man.',
  '2. **Ezekiel**, chapters 1 and 10, and 37 to 48: the throne, the scroll and the new temple.',
  '3. **Isaiah**, chapters 24 to 27 and 65: the new heavens and the new earth.',
  '4. **Zechariah**, chapter 4: the lampstand and the two olive trees.',
  '5. **Exodus**, chapters 7 to 12: the plagues and the Passover lamb.',
].join('\n');

test('a numbered top five is drawn as five lines of a list with its references tappable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.replyFor = () => ({ status: 'answered', answer: { answer: ANSWER, words: [] } });
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  await (await talkField(sheet)).fill('What are the top five books to read to understand Revelation?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const items = sheet.locator('[data-turn] .markdown ol > li');
  await expect(items).toHaveCount(5);
  const intro = await sheet.locator('[data-turn] .markdown > p').first().boundingBox();
  const boxes = [];
  for (let n = 0; n < 5; n++) {
    const box = await items.nth(n).boundingBox();
    if (!box) throw new Error(`no box for item ${n + 1}`);
    boxes.push(box);
  }
  // each item starts below the one before, none beside it, and all of them below the sentence that introduces them
  expect(intro).not.toBeNull();
  expect(boxes[0].y).toBeGreaterThanOrEqual((intro?.y ?? 0) + (intro?.height ?? 0) - 0.5);
  for (let n = 1; n < 5; n++) expect(boxes[n].y).toBeGreaterThanOrEqual(boxes[n - 1].y + boxes[n - 1].height - 0.5);
  // inside the sheet's width, so nothing runs off the phone
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390.5);
  }
  // the lead words are bold, and the numbers are drawn as the list's own marks
  await expect(items.first().locator('strong')).toHaveText('Daniel');
  await expect(sheet.locator('[data-turn] .markdown ol')).toHaveCSS('list-style-type', 'decimal');
  // 'chapters 2, 7 and 10 to 12' leans on Daniel: it is tappable
  await expect(items.first().getByRole('link').first()).toBeVisible();
  await shot(page, 'talk-list-answer');
});
