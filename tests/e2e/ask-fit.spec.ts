// tests/e2e/ask-fit.spec.ts — Ask the tutor in the Verse view fits the phone (mw-5r3p30.170): at 844 x 390 (landscape) the whole composer, Type a question included, is inside the window, with
// the text box closed and open; and Type a question is a 44 px thumb target. jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { composerOf } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openAsk(
  page: Page,
  viewport: { width: number; height: number },
  answer: { answer: string; words: { greek: string; lemma: string; note: string }[] } = SYNERGEI_ANSWER,
): Promise<{ view: Locator; fake: ReturnType<typeof makeFakePostern> }> {
  await page.setViewportSize(viewport);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  await routePostern(page, fake);
  await honestMic(page);
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: 'Walking by the Spirit, Romans 8:1-11' })).toBeVisible();
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(composerOf(page)).toBeVisible();
  return { view, fake };
}

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

test('844 x 390: the whole composer is inside the window, with the text box closed and open', async ({ page }) => {
  await openAsk(page, { width: 844, height: 390 });
  const typeInstead = composerOf(page).getByRole('button', { name: 'Type a question', exact: true });
  await expect(typeInstead).toBeVisible();
  const inside = async () => {
    const c = await box(composerOf(page));
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + c.height).toBeLessThanOrEqual(390);
  };
  await inside();
  const t = await box(typeInstead);
  expect(t.y + t.height).toBeLessThanOrEqual(390);
  await shot(page, 'ask-fit-landscape');
  await typeInstead.click();
  await expect(composerOf(page).getByRole('textbox', { name: 'Your question' })).toBeVisible();
  await inside();
  await shot(page, 'ask-fit-landscape-typing');
});

test('Type a question is a 44 px target', async ({ page }) => {
  await openAsk(page, { width: 390, height: 844 });
  const t = await box(composerOf(page).getByRole('button', { name: 'Type a question', exact: true }));
  expect(t.height).toBeGreaterThanOrEqual(43.5);
});
