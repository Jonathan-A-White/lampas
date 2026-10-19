// tests/e2e/talk-copy-question.spec.ts — a Copy under his own question in the Talk sheet (mw-5r3p30.341): when a long question cannot be sent, the
// Copy is in view at the foot of the failure (beside Retry), without scrolling the sheet, and a tap puts the whole question on the clipboard.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { honestSpeech } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { expectInList, rectOf } from './talk-list';
import { openTalkAbout } from './verse-view';

const LONG = 'Why does Paul say that all things work together for good? '.repeat(10).trim();

test('a question that could not be sent has its Copy in view, and a tap copies all of it', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  fake.licensed = false;
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(LONG);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(sheet.getByRole('alert')).toContainText('No licence');
  const copy = sheet.getByRole('alert').getByRole('button', { name: 'Copy my question' });
  await expect(copy).toBeInViewport({ ratio: 1 });
  expect((await copy.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);

  await copy.click();
  await expect(sheet.locator('[data-talk-pending] [data-copy-text]').getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(LONG);
  await shot(page, 'talk-copy-question');
});

test('a sent question has a Copy under it that copies his words', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const turn = sheet.locator('[data-turn]');
  await expect(turn).toContainText(TALK_ANSWER.answer);
  await turn.getByRole('button', { name: 'Copy my question' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('What does συνεργεῖ mean here?');
});

/** An answered question about verse `n` of the chapter at `url`, the sheet open with the licence on; returns the sheet. */
async function answeredTalk(page: Page, url: string, n: number | null, title: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  // the answer is read aloud slowly, so its speaking bar is up when the next message fails
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto(url);
  if (n === null) await page.getByRole('button', { name: 'Talk', exact: true }).click();
  else await openTalkAbout(page, n);
  const sheet = page.getByRole('dialog', { name: title });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does it mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  return { sheet, fake };
}

/** The sheet's heading shows its whole text (nothing cut or ellipsised, a second line is fine) and New talk and Done are inside the window. */
async function expectTitleWhole(sheet: Locator, text: string): Promise<void> {
  const heading = sheet.getByRole('heading', { name: text, level: 2 });
  await expect(heading).toBeVisible();
  const fit = await heading.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, overflow: getComputedStyle(el).textOverflow, text: el.textContent }));
  expect(fit.text).toBe(text);
  expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  expect(fit.overflow).not.toBe('ellipsis');
  for (const name of ['New talk', 'Done']) {
    const button = sheet.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const box = await rectOf(button);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
}

test('once there is an answer the sheet title is whole and New talk shows (1 John 2:1)', async ({ page }) => {
  const { sheet } = await answeredTalk(page, '/#/?b=1jn&c=2&view=english&weave=off', 1, 'Talk about 1 John 2:1');
  await expectTitleWhole(sheet, 'Talk about 1 John 2:1');
  await shot(page, 'talk-title-1jn');
});

test('after an answer the sheet title is not clipped (Romans 8:28)', async ({ page }) => {
  const { sheet } = await answeredTalk(page, '/', 28, 'Talk about Romans 8:28');
  await expectTitleWhole(sheet, 'Talk about Romans 8:28');
});

test('after an answer and a failed send, the red message and its Copy are inside the conversation box', async ({ page }) => {
  const { sheet, fake } = await answeredTalk(page, '/', null, 'Talk about Romans 8');
  // the answer is being read, so the speaking bar takes its room between the box and the composer
  await sheet.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Speaking', exact: true })).toBeVisible();
  fake.licensed = false;
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(LONG);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const alert = sheet.getByRole('alert');
  await expect(alert).toContainText('No licence');
  await expectInList(sheet, alert.locator('p.text-bad'), 'the red message');
  await expectInList(sheet, alert.getByRole('button', { name: 'Copy my question' }), 'the Copy');
  await shot(page, 'talk-failed-after-answer');
});
