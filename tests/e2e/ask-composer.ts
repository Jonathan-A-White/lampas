// tests/e2e/ask-composer.ts — drives the Verse view's Ask the tutor composer (voice-kit/composer, src/Ask.tsx) the way a thumb does.
import { expect, type Locator, type Page } from '@playwright/test';

/** The composer at the foot of the Verse view. */
export const composerOf = (page: Page): Locator => page.getByTestId('composer');

/** The one big bar: it says Hold to ask, then Starting the mic… and Release to send while he holds. */
export const askBar = (page: Page): Locator => composerOf(page).getByRole('button', { name: /^(Hold to ask|Tap to ask|Release to send|Starting the mic…|Let go to keep it unsent)$/ });

/** The text box, brought out by Type a question when the bar is showing. */
export async function questionField(page: Page): Promise<Locator> {
  const field = composerOf(page).getByRole('textbox', { name: 'Your question' });
  if (!(await field.isVisible())) await composerOf(page).getByRole('button', { name: 'Type a question', exact: true }).click();
  await expect(field).toBeVisible();
  return field;
}

/** Types a question and sends it: Type a question, the words, Send. */
export async function typeQuestion(page: Page, question: string): Promise<void> {
  const field = await questionField(page);
  await field.fill(question);
  await composerOf(page).getByRole('button', { name: 'Send', exact: true }).click();
}

/** The one Hold to ask bar: Postern's height, nearly the width of the phone, and the lowest thing on the screen; no other hold bar beside it. */
export async function expectOneAskBar(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await expect(composerOf(page)).toHaveCount(1);
  await expect(askBar(page)).toHaveCount(1);
  await expect(askBar(page)).toHaveText('Hold to ask');
  await expect(page.locator('.lp-bar')).toHaveCount(0);
  const box = await askBar(page).boundingBox();
  if (!box) throw new Error('no bar');
  expect(box.height).toBeGreaterThanOrEqual(95.5);
  expect(box.width).toBeGreaterThan(viewport.width - 40);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await expect(page.locator('[data-talk-bar]')).toHaveCount(0);
}

/** The Talk sheet the Verse view's Ask the tutor opens over the view (mw-5r3p30.842): the one tutor's wait, answers and failures are its. */
export const talkSheetOf = (page: Page): Locator => page.getByRole('dialog', { name: /^Talk about / });

/** The turns of the open Talk sheet: his question and the tutor's answer in each. */
export const talkTurnsOf = (page: Page): Locator => talkSheetOf(page).locator('[data-turn]');
