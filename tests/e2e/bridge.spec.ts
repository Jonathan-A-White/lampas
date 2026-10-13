// The bridge (mw-1vuvq6.5) at phone width: asked about the genitive with no grammar yet, the tutor's answer lists the ideas it rests on and a thumb-sized
// 'Take me there: <title>'; the tap opens that idea's sheet over the talk and Done brings the talk back. Ends with a shot of each.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const ANSWER = {
  answer: 'Briefly: the genitive is the case that says "of". You are missing quite a bit for this; start with the Greek alphabet.',
  words: [],
  bridge: { missing: ['alphabet', 'diphthongs', 'consonant-pairs'], next: 'alphabet', why: 'Everything in Greek starts with its letters.' },
};

test('a question he is not ready for is bridged to the idea he lacks and Take me there opens its sheet', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Words' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Why is the genitive used here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const take = sheet.getByRole('button', { name: 'Take me there: The Greek alphabet' });
  await expect(take).toBeVisible();
  const box = await take.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  await expect(sheet.locator('[data-bridge-missing] li')).toHaveCount(3);
  await expect(sheet.locator('[data-bridge-offer]')).toContainText('quite a bit');
  await shot(page, 'bridge-offer');

  await take.click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  await expect(idea.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'bridge-idea');

  await idea.getByRole('button', { name: 'Done' }).click();
  await expect(idea).toHaveCount(0);
  await expect(sheet.getByRole('button', { name: 'Take me there: The Greek alphabet' })).toBeVisible();
  expect(fake.received[0].input).toMatchObject({ missing_foundations: { topic: 'The genitive case' } });
});
