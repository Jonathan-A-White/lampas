import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { talkField } from './talk-field';

// A reference that leans on the book named before it is a link, and a name across a full stop is not (mw-5r3p30.927): his top-five answer on 'Talk about Revelation 10', at 390x844.
const ANSWER =
  'Here is a top five, ordered by how much light each throws on Revelation. 1. Daniel, above all chapters 2, 7 and 10 to 12: the statue and kingdoms, the Son of Man. 2. Ezekiel, for the temple, as in 10 and 11.';

test('chapters that lean on Daniel are links, and Revelation. 1 across the full stop is not', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: ANSWER, words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('Which five books should I read to understand Revelation?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const range = sheet.getByRole('link', { name: '10 to 12', exact: true });
  await expect(range).toBeVisible();
  await expect(sheet.getByRole('link', { name: '2', exact: true })).toBeVisible();
  await expect(sheet.getByRole('link', { name: '7', exact: true })).toBeVisible();
  await expect(sheet.getByRole('link').filter({ hasText: 'Revelation' })).toHaveCount(0);
  await expect(sheet.getByRole('link').filter({ hasText: 'Daniel' })).toHaveCount(0);

  // The range opens a card that names all of it.
  await range.click();
  const card = page.getByRole('dialog', { name: 'Daniel 10-12', exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  await shot(page, 'reference-context');
});
