// tests/e2e/open-tutor.spec.ts — the Playwright openTutor() (tests/e2e/open-tutor.ts, mw-5r3p30.881): a two-finger tap opens the tutor about the chapter, the verse the Verse view shows and the word on an open
// word sheet, with or without hasTouch on the context, and the click right after it is a click (the app's 600 ms guard is waited out).
import { expect, test } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openTutor } from './open-tutor';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

async function openReader(page: import('@playwright/test').Page) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

test('a two-finger tap on the chapter opens the Talk sheet about the chapter, and the next click lands', async ({ page }) => {
  await openReader(page);
  const sheet = await openTutor(page);
  await expect(sheet).toHaveAccessibleName('Talk about Romans 8');
  // the click right after the tap is a click (the guard is waited out): the Back button of the sheet works
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});

test('a two-finger tap with the Verse view open opens the Talk sheet about that verse', async ({ page }) => {
  await openReader(page);
  await openVerseView(page, 28);
  const sheet = await openTutor(page);
  await expect(sheet).toHaveAccessibleName('Talk about Romans 8:28');
});

test('a two-finger tap on an open word sheet opens the tutor about the word', async ({ page }) => {
  await openReader(page);
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  const sheet = await openTutor(page);
  await expect(sheet).toBeVisible();
  // it is about the word (its lemma and parsing), not the chapter
  await expect(sheet).toContainText('Tell me about the word συνεργεῖ (lemma συνεργέω');
});
