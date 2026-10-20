// tests/e2e/ask-for-more.spec.ts — Settings > Ask for more (mw-hqd5bz.37) at phone width: Ask the tutor is the first thing on the page and a thumb
// tall, the four kinds sit under 'Or fill in a form', an open form's fields and Send fit inside the phone with nothing scrolling sideways, and Ask the
// tutor opens the talk with "I'd like Lampas to have " in the composer. Ends with a shot of the page, the open form and the talk.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('Ask for more leads with Ask the tutor, and a form fits the phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Ask for more' }).click();
  await expect(page.getByRole('heading', { name: 'Ask for more', level: 1 })).toBeVisible();

  const ask = page.getByRole('main').getByRole('button', { name: 'Ask the tutor', exact: true });
  const box = await ask.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  expect(box && box.x + box.width).toBeLessThanOrEqual(390);
  for (const kind of ['An approach or programme', 'A study resource', 'A text', 'A translation']) await expect(page.getByRole('button', { name: kind })).toBeVisible();
  await shot(page, 'ask-for-more');

  await page.getByRole('button', { name: 'A translation' }).click();
  const form = page.getByRole('form', { name: 'A translation' });
  await form.getByRole('textbox').first().fill('The ESV');
  const send = form.getByRole('button', { name: 'Send', exact: true });
  await send.scrollIntoViewIfNeeded();
  await expect(send).toBeEnabled();
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(sideways).toBe(false);
  await shot(page, 'ask-for-more-form');

  await ask.scrollIntoViewIfNeeded();
  await ask.click();
  const talk = page.getByRole('dialog', { name: 'Ask the tutor: Ask for more' });
  await expect(talk.getByRole('textbox', { name: 'Your message' })).toHaveValue("I'd like Lampas to have ");
  await shot(page, 'ask-for-more-talk');
});
