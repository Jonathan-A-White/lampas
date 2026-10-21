// tests/e2e/tutor-waiting-bar.spec.ts — 'The tutor answered: tap to play' above the full-screen views he asks from (mw-5r3p30.322), at 390x844 and sideways.
// He asks in the Verse view or the Talk sheet, goes to another app (the page's own visibilitychange to hidden), the answer arrives, and he comes back: the bar
// is on the screen, it is the thing under its own centre (no view or backdrop over it), and a tap on it speaks the answer and leaves the view or sheet open.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { honestMic, honestSpeech, spoken } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { typeQuestion } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction, openTalkAbout } from './verse-view';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const BAR = 'The tutor answered: tap to play';

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
    Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

async function start(page: Page): Promise<FakePostern> {
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await honestMic(page);
  await honestSpeech(page);
  await openUnlocked(page);
  await page.goto('/');
  return fake;
}

/** He leaves, the answer arrives while he is away, and he comes back. */
async function awayAndBack(page: Page, fake: FakePostern, answer: typeof SYNERGEI_ANSWER | typeof TALK_ANSWER): Promise<void> {
  await expect.poll(() => fake.received.length).toBe(1);
  await setVisibility(page, 'hidden');
  fake.endAll({ status: 'answered', answer });
  await expect(page.locator('[data-tutor-waiting]')).toHaveCount(1);
  await setVisibility(page, 'visible');
}

/** The bar is on the screen and is what a tap at its centre lands on. */
async function expectBarOnTop(page: Page): Promise<void> {
  const bar = page.getByRole('button', { name: BAR, exact: true });
  await expect(bar).toBeInViewport({ ratio: 1 });
  const box = await bar.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const hit = await bar.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
  });
  expect(hit).toBe(true);
}

for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`the bar is above the Verse view and a tap on it plays the answer, at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    const fake = await start(page);
    const view = await chooseAction(page, 28, 'Ask the tutor');
    await typeQuestion(page, 'What does συνεργεῖ mean here?');
    await awayAndBack(page, fake, SYNERGEI_ANSWER);
    await expect(page.getByRole('button', { name: BAR, exact: true })).toBeVisible();
    await expectBarOnTop(page);
    expect(await spoken(page)).toHaveLength(0);
    await shot(page, `tutor-waiting-view-${size.width}`);

    await page.getByRole('button', { name: BAR, exact: true }).click();
    await expect(page.getByRole('button', { name: BAR, exact: true })).toHaveCount(0);
    await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
    await expect(view).toBeVisible();
  });
}

test('the bar is above the Talk sheet and its backdrop, and a tap on it plays the answer without closing the sheet', async ({ page }) => {
  const fake = await start(page);
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await awayAndBack(page, fake, TALK_ANSWER);
  await expectBarOnTop(page);
  expect(await spoken(page)).toHaveLength(0);

  await page.getByRole('button', { name: BAR, exact: true }).click();
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  await expect(sheet).toBeVisible();
  await shot(page, 'tutor-waiting-talk');
});

// Leaving the screen he asked from keeps the answer that waits: the bar stays over the Reader and plays it on his tap (mw-5r3p30.323).
test('the phone\'s Back out of the Verse view keeps the bar over the Reader, and a tap on it plays the answer', async ({ page }) => {
  const fake = await start(page);
  const view = await chooseAction(page, 28, 'Ask the tutor');
  await typeQuestion(page, 'What does συνεργεῖ mean here?');
  await awayAndBack(page, fake, SYNERGEI_ANSWER);
  // the phone's Back is one way out of the Verse view (its '‹ Reader' is below the bar since mw-5r3p30.636)
  await page.goBack();
  await expect(view).toHaveCount(0);
  await expectBarOnTop(page);
  expect(await spoken(page)).toHaveLength(0);
  await shot(page, 'tutor-waiting-reader');

  await page.getByRole('button', { name: BAR, exact: true }).click();
  await expect(page.getByRole('button', { name: BAR, exact: true })).toHaveCount(0);
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
});

test('the phone\'s Back out of the Talk sheet keeps the bar, and a tap on it plays the answer', async ({ page }) => {
  const fake = await start(page);
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await awayAndBack(page, fake, TALK_ANSWER);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expectBarOnTop(page);
  expect(await spoken(page)).toHaveLength(0);

  await page.getByRole('button', { name: BAR, exact: true }).click();
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
});
