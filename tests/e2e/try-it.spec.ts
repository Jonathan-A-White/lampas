// tests/e2e/try-it.spec.ts — the Try it step of a Hard sounds lesson (mw-5r3p30.363) at 390x844: the hold bar is Postern's, reachable on the step's own
// scroll box with the page still, a hold records through the one recorder, and he hears his try, then the Greek voice, with Again. The microphone and the
// sound card are the honest fakes (tests/e2e/fake-media.ts): playing is recorded rather than heard.
import { expect, test } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { fakeMedia, type FakeWindow } from './fake-media';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const POSTERN_BAR_HEIGHT = 96;

test('Try it: hold to say πατήρ, hear the try then the Greek voice, and Again', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize(VIEWPORT);
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await fakeMedia(page, 1.2);
  await openUnlocked(page);
  await page.goto('/#/sounds?l=tapped-r&s=4');
  const lesson = page.getByTestId('sound-lesson');
  await expect(lesson.getByRole('heading', { name: 'Try it', level: 2 })).toBeVisible();

  const bar = lesson.getByRole('button', { name: 'Hold to say πατήρ', exact: true });
  await bar.scrollIntoViewIfNeeded();
  await expect(bar).toHaveClass(/(^|\s)lp-bar(\s|$)/);
  const box = (await bar.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(POSTERN_BAR_HEIGHT - 0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  // the page itself never scrolls
  expect(await page.evaluate(() => [window.scrollX, window.scrollY, document.documentElement.scrollTop])).toEqual([0, 0, 0]);

  await holdFor(page, bar, 1200);
  await expect(lesson.getByTestId('try-status')).toHaveText('Your try');
  await expect.poll(() => page.evaluate(() => (window as unknown as FakeWindow).played.length)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as FakeWindow).played[0])).toMatch(/^blob:/);
  // the clip ends and the Greek voice follows
  await expect(lesson.getByTestId('try-status')).toHaveText('The Greek voice');
  await expect.poll(async () => (await spoken(page)).map((u) => `${u.lang}:${u.text}`)).toContain('el-GR:πατήρ!');
  // said once, though a phone can send more than one event as a clip ends
  expect((await spoken(page)).filter((u) => u.text === 'πατήρ!')).toHaveLength(1);
  await shot(page, 'try-it');

  await lesson.getByRole('button', { name: 'Again', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as FakeWindow).played.length)).toBe(2);
  await expect(lesson.getByTestId('try-status')).toHaveText('The Greek voice');
});
