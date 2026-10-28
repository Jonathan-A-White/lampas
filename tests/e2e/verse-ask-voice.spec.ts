// tests/e2e/verse-ask-voice.spec.ts — the Verse view's Ask the tutor composer (voice-kit/composer, mw-jtzpw0.3; the voice half is mw-5r3p30.121): his words show as he speaks, in
// the composer above its Hold to ask bar, and after he lets go his question stays shown above 'Waiting for the tutor…' until the answer comes. Every other
// push-to-talk place in Lampas does this (docs/pwa-best-practices.md section 12, 'In every push-to-talk place, he sees his words where he is looking').
// Phone width 412 x 915. The microphone is voice-kit's honest one: the recogniser sends the clip's words one by one as interim results while the bar is held.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { clips, honestMic } from '../support/honest-fakes';
import { askBar, composerOf, talkSheetOf, talkTurnsOf } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const VIEWPORT = { width: 412, height: 915 };
const SAID = 'what does called mean';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function box(el: Locator): Promise<Box> {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Inside the window, and clear of the bar. */
async function expectShownAboveBar(page: Page, el: Locator): Promise<void> {
  const b = await box(el);
  const bar = await box(askBar(page));
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(VIEWPORT.height);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(overlaps(b, bar)).toBe(false);
}

async function start(page: Page, fake: FakePostern): Promise<Locator> {
  await page.setViewportSize(VIEWPORT);
  await routePostern(page, fake);
  await honestMic(page, { clip: { ...clips.english, transcript: SAID } });
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  return chooseAction(page, 28, 'Ask the tutor');
}

async function pressBar(page: Page): Promise<void> {
  const b = await box(askBar(page));
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
}

test('Hold to ask: his words show as he speaks, above the bar, then his question stays above Waiting until the answer', async ({ page }) => {
  const fake = makeFakePostern();
  await start(page, fake);
  const live = composerOf(page).getByTestId('live-transcript');

  await pressBar(page);
  // the first words arrive in the composer itself, in view above the bar
  await expect(live).toHaveText(/^what/);
  const partial = (await live.textContent()) ?? '';
  expect(SAID.startsWith(partial)).toBe(true);
  await expectShownAboveBar(page, live);
  await expect(live).toHaveText(SAID, { timeout: 15_000 });
  await expectShownAboveBar(page, live);
  await shot(page, 'verse-ask-holding');

  await page.mouse.up();
  // the question goes to the Talk sheet (mw-5r3p30.842), which shows it above its Waiting line
  const sheet = talkSheetOf(page);
  await expect(sheet).toContainText(SAID);
  const waiting = sheet.getByText(/Waiting for the tutor…/);
  await expect(waiting).toBeVisible();
  // the question is shown above the Waiting line
  expect((await box(sheet.getByText(SAID, { exact: true }).first())).y).toBeLessThan((await box(waiting)).y);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe(SAID);
  await shot(page, 'verse-ask-waiting');

  // it stays until the answer comes; then the answer shows in the sheet
  await page.waitForTimeout(1500);
  await expect(sheet).toContainText(SAID);
  await fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
  await expect(talkTurnsOf(page)).toContainText(SYNERGEI_ANSWER.answer);
  await expect(sheet.getByText(/Waiting for the tutor…/)).toHaveCount(0);
});

test('a failed send shows No licence in the Talk sheet with Retry, and Retry asks the same question again', async ({ page }) => {
  const fake = makeFakePostern();
  fake.licensed = false;
  await start(page, fake);

  await pressBar(page);
  await expect(composerOf(page).getByTestId('live-transcript')).toHaveText(SAID, { timeout: 15_000 });
  await page.mouse.up();
  const sheet = talkSheetOf(page);
  await expect(sheet.getByRole('alert')).toContainText('No licence');
  await expect(sheet.getByText(/Waiting for the tutor…/)).toHaveCount(0);

  fake.licensed = true;
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await sheet.getByRole('button', { name: 'Retry' }).click();
  await expect(talkTurnsOf(page)).toContainText(SYNERGEI_ANSWER.answer);
  expect(fake.received.at(-1)?.input.question).toBe(SAID);
});
