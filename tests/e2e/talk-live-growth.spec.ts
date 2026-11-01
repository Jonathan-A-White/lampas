// tests/e2e/talk-live-growth.spec.ts — a long dictation must not move Hold to talk (mw-5r3p30.931). His words (Postern general, 2026-10-31): "if I talk for a long time ... the button that I'm
// holding ... can move ... it would start scrolling or whatever but the button should stay still". The live words (the kit's .bk-composer__live, and the sheet's own [data-talk-live]
// when the hold began on the Reader's Talk bar) sat in the flow above the bar, so 40 lines of them pushed the bar down under the phone's navigation bar. Now they sit in a bounded
// box that keeps his newest words in view (src/ui/liveFollow.ts, src/index.css). The recogniser is voice-kit's honest fake (tests/support/honest-fakes.ts); a growing transcript is
// fed to its last recognition the way a phone's would arrive, as one interim result that gets longer.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const SIZES = [
  { width: 390, height: 844 },
  { width: 360, height: 780 },
] as const;

/** n numbered words: the first and the last are told apart, and about 6 of them fill a line at 360 px */
const words = (n: number): string => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(' ');
/** about 40 lines at a phone's width */
const LONG = words(240);

/** A recogniser result that carries `transcript`, as the phone's gives interim words. */
const hear = (page: Page, transcript: string): Promise<void> =>
  page.evaluate((heard) => {
    const recognitions = (window as unknown as { __bsvKitTesting: { mic: { recognitions: { onresult: ((e: unknown) => void) | null }[] } } }).__bsvKitTesting.mic.recognitions;
    const held = recognitions[recognitions.length - 1];
    held.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: heard, confidence: 0.9 }], { isFinal: false })] });
  }, transcript);

/** The pointer events that would end a hold, counted on the page. */
const watchHold = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const lost: string[] = [];
    (window as unknown as { __holdLost: string[] }).__holdLost = lost;
    for (const type of ['pointercancel', 'lostpointercapture']) window.addEventListener(type, () => lost.push(type), true);
  });
const holdLost = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __holdLost: string[] }).__holdLost);

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

/** The box's height as lines, and whether the last line of his words is wholly inside it: the newest words are the ones in view. */
const viewOf = (el: Locator): Promise<{ box: number; line: number; newestInView: boolean; oldestOut: boolean }> =>
  el.evaluate((box) => {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
    const last = nodes[nodes.length - 1];
    const range = document.createRange();
    range.selectNodeContents(last);
    const rects = [...range.getClientRects()];
    const edge = box.getBoundingClientRect();
    const end = rects[rects.length - 1];
    const first = rects[0];
    return {
      box: box.clientHeight,
      line: parseFloat(getComputedStyle(box).lineHeight),
      newestInView: end.bottom <= edge.bottom + 1 && end.top >= edge.top - 1,
      oldestOut: rects.length > 4 ? first.bottom <= edge.top + 1 : true,
    };
  });

/** the least space the foot leaves under a pinned bar, in px (var(--lp-bar-inset): the phone's inset with a floor) */
const barInset = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;height:var(--lp-bar-inset);width:1px';
    document.body.append(probe);
    const px = probe.getBoundingClientRect().height;
    probe.remove();
    return px;
  });

async function prepare(page: Page, size: { width: number; height: number }) {
  await page.setViewportSize(size);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  return fake;
}

/** Presses the bar and waits until the kit says the microphone is open. */
async function press(page: Page, bar: Locator): Promise<void> {
  const b = await box(bar);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
}

/** Lets the honest clip's own words finish, so they do not take the place of the ones fed by hand. */
async function clipDone(live: Locator): Promise<void> {
  await expect(live).toContainText('chapter');
}

for (const size of SIZES) {
  test(`the Talk sheet's Hold to talk stays still while 40 lines are dictated, and the live words keep the newest in view (${size.width}x${size.height})`, async ({ page }) => {
    const fake = await prepare(page, size);
    await openUnlocked(page);
    await page.goto('/');
    await openTalkAbout(page, 28);
    const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
    const bar = sheet.getByRole('button', { name: 'Hold to talk', exact: true });
    const inset = await barInset(page);
    await press(page, bar);
    await watchHold(page);
    const live = sheet.getByTestId('live-transcript');
    await clipDone(live);
    await hear(page, words(3));
    await expect(live).toHaveText(words(3));
    const before = await box(sheet.locator('.bk-composer__bar'));
    expect(before.y + before.height, 'the bar is above the foot inset').toBeLessThanOrEqual(size.height - inset + 1);

    for (const n of [12, 40, 80, 160, 240]) {
      await hear(page, words(n));
      await expect(live).toContainText(`word${n}`);
      const now = await box(sheet.locator('.bk-composer__bar'));
      expect(Math.abs(now.y - before.y), `${n} words: the bar has not moved`).toBeLessThanOrEqual(1);
      expect(Math.abs(now.height - before.height), `${n} words: the bar is as tall`).toBeLessThanOrEqual(1);
      expect(now.y + now.height, `${n} words: the bar is above the foot inset`).toBeLessThanOrEqual(size.height - inset + 1);
      // the newest words are the ones in view: the box has scrolled to its end, and is no taller than about four lines
      const view = await viewOf(live);
      expect(view.box, `${n} words: the live words are a bounded box`).toBeLessThanOrEqual(view.line * 4.5);
      expect(view.newestInView, `${n} words: the newest words are in view`).toBe(true);
      expect(view.oldestOut, `${n} words: the oldest have scrolled off above`).toBe(true);
    }
    // the sheet's own foot is still on the screen, whole
    const composer = await box(sheet.getByTestId('composer'));
    expect(composer.y + composer.height).toBeLessThanOrEqual(size.height + 0.5);
    await shot(page, `talk-live-long-${size.width}`);

    expect(await holdLost(page), 'the hold was never broken by the growth').toEqual([]);
    await page.mouse.up();
    // the whole dictation is what was sent
    await expect.poll(() => fake.received.length).toBeGreaterThan(0);
    expect(JSON.stringify(fake.received)).toContain('word240');
    expect(JSON.stringify(fake.received)).toContain('word1 ');
  });
}

test("the Verse view's Hold to ask stays still while 40 lines are dictated", async ({ page }) => {
  const size = SIZES[0];
  await prepare(page, size);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  const bar = view.locator('[data-verse-bar] .bk-composer__bar');
  await expect(bar).toBeVisible();
  await press(page, bar);
  await watchHold(page);
  const live = view.getByTestId('live-transcript');
  await expect(live).toContainText('chapter');
  await hear(page, words(3));
  const before = await box(bar);
  await hear(page, LONG);
  await expect(live).toContainText('word240');
  const now = await box(bar);
  expect(Math.abs(now.y - before.y)).toBeLessThanOrEqual(1);
  expect(now.y + now.height).toBeLessThanOrEqual(size.height);
  const seen = await viewOf(live);
  expect(seen.box).toBeLessThanOrEqual(seen.line * 4.5);
  expect(seen.newestInView).toBe(true);
  expect(await holdLost(page)).toEqual([]);
  await page.mouse.up();
});
