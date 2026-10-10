// tests/e2e/ask-composer.spec.ts — Ask the tutor on Romans 8:1-11 is the shared composer (bsv-kit/composer, mw-jtzpw0.3) at 412 x 915: one big gold Hold to ask bar,
// Type a question quietly under it, no Ask button, no attach or camera (the tutor takes no file), no second bar. jsdom has no layout, so the look is proven here.
import { expect, test } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { askBar, composerOf, expectOneAskBar, questionField } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 412, height: 915 };

test('Romans 8:1-11, Ask the tutor: one composer with a gold Hold to ask bar and Type a question beneath it', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: 'Walking by the Spirit, Romans 8:1-11' })).toBeVisible();
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();

  await expectOneAskBar(page, VIEWPORT);
  const typeInstead = composerOf(page).getByRole('button', { name: 'Type a question', exact: true });
  await expect(typeInstead).toBeVisible();
  // below the bar, quiet
  expect((await typeInstead.boundingBox())!.y).toBeGreaterThan((await askBar(page).boundingBox())!.y);
  await expect(view.getByRole('button', { name: 'Ask', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Attach files' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Take a photo' })).toHaveCount(0);
  // Lampas's gold, not the package's blue
  const colour = await askBar(page).evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(colour).not.toBe('rgb(37, 99, 235)');
  // the passage and its scrolling are untouched: the passage box still scrolls in a box of its own
  const passage = view.locator('[data-passage-box]');
  const size = await passage.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
  expect(size.scroll).toBeGreaterThan(size.client);
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
  await shot(page, 'ask-composer');

  // Type a question brings out the field with a thumb-sized Send once there are words
  const field = await questionField(page);
  await field.fill('What is the Spirit’s work here?');
  const send = composerOf(page).getByRole('button', { name: 'Send', exact: true });
  const sendBox = await send.boundingBox();
  expect(sendBox!.height).toBeGreaterThanOrEqual(43.5);
  expect(parseFloat(await field.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await shot(page, 'ask-composer-typing');
  await send.click();
  await expect(view.locator('[data-answer]')).toContainText(SYNERGEI_ANSWER.answer);
  expect(fake.received[0].input.reference).toBe('Romans 8:1-11');
});
