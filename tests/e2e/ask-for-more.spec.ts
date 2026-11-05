// tests/e2e/ask-for-more.spec.ts — Settings > Ask for more (mw-hqd5bz.37) at phone width: Ask the tutor is the first thing on the page and a thumb
// tall, nothing scrolls sideways, there is no 'Or fill in a form' and no form (mw-5r3p30.726), and Ask the tutor opens the talk with
// "I'd like Lampas to have " in the composer. Ends with a shot of the page and the talk.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';

test('Ask for more leads with Ask the tutor, and has no form and fits the phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  await page.getByRole('button', { name: 'Ask for more' }).click();
  await expect(page.getByRole('heading', { name: 'Ask for more', level: 1 })).toBeVisible();

  const ask = page.getByRole('main').getByRole('button', { name: 'Ask the tutor', exact: true });
  const box = await ask.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  expect(box && box.x + box.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('heading', { name: 'Or fill in a form' })).toHaveCount(0);
  await expect(page.getByRole('form')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(1);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(sideways).toBe(false);
  await shot(page, 'ask-for-more');

  await ask.scrollIntoViewIfNeeded();
  await ask.click();
  const talk = page.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
  await expect((await talkField(talk))).toHaveValue("I'd like Lampas to have ");
  await shot(page, 'ask-for-more-talk');
});
