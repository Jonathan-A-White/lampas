// The tutor's `go` (mw-5r3p30.172) answered to the round Ask button of any screen but the Reader (mw-5r3p30.198): the Reader opens on the chapter with the
// notice 'Opened <chapter>' and Back returns to the screen he asked from; a go the app cannot open moves nothing and the answer says so.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const CONTROL = 'Ask the tutor about this screen';

/** Opens `path` unlocked, with the fake mill answering every talk with `go`; asks `question` from the round button's sheet. */
async function askFrom(page: Page, path: string, screen: string, go: { book: string; chapter: number }, question: string) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...TALK_ANSWER, answer: `Taking you to ${go.book} ${go.chapter}.`, go } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto(path);
  await expect(page.getByRole('heading', { name: screen, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: CONTROL }).click();
  const sheet = page.getByRole('dialog', { name: `Ask the tutor: ${screen}` });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Your message').fill(question);
  await sheet.getByRole('button', { name: 'Send' }).click();
  return sheet;
}

for (const { screen, path } of [
  { screen: 'Settings', path: '/#/settings' },
  { screen: 'Words', path: '/#/words' },
]) {
  test(`from ${screen}: a go for Colossians 1 opens the Reader there, and Back returns to ${screen}`, async ({ page }) => {
    await askFrom(page, path, screen, { book: 'Colossians', chapter: 1 }, 'take me to Colossians 1');
    await expect(page.getByRole('heading', { name: 'Colossians 1', level: 1 })).toBeVisible();
    await expect(page.getByText('Opened Colossians 1')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await shot(page, `ask-tutor-go-${screen.toLowerCase()}`);
    await page.goBack();
    await expect(page.getByRole('heading', { name: screen, level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('from Settings: a go for Psalm 23 moves nothing and the answer says it could not open it', async ({ page }) => {
  const sheet = await askFrom(page, '/#/settings', 'Settings', { book: 'Psalms', chapter: 23 }, 'take me to Psalm 23');
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  await expect(sheet.getByText('Could not open Psalms 23')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(page.url()).toContain('#/settings');
});
