// tests/e2e/passage-view.spec.ts — a section heading opens the Verse view for its passage (mw-5r3p30.73), at phone width: the heading and range at
// the top, the passage big, the same one row of actions on one line, the one hold bar at the foot, a heading that is one 44 px target and still looks
// as it did. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const BAR_HEIGHT = 96;
const HEADING = 'Walking by the Spirit';

async function start(page: Page, hash = '/#/?c=8&view=english&weave=solid'): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto(hash);
}

test('the heading is one 44 px button over its whole width and sits where the heading sat', async ({ page }) => {
  await start(page);
  const heading = page.locator('[data-heading]', { hasText: HEADING });
  await expect(heading).toBeVisible();
  const h = await heading.boundingBox();
  const b = await heading.getByRole('button').boundingBox();
  if (!h || !b) throw new Error('no boxes');
  // the button covers the heading's whole width and is a thumb tall; the heading itself keeps the height of its text (about one line)
  expect(b.width).toBeGreaterThanOrEqual(h.width - 0.5);
  expect(b.height).toBeGreaterThanOrEqual(43.5);
  expect(h.height).toBeLessThan(40);
  expect(await heading.evaluate((el) => getComputedStyle(el).fontSize)).toBe('18px');
});

test('Listen: the heading and range at the top, the passage big, the row of actions on one line, the one bar', async ({ page }) => {
  await start(page);
  await page.locator('[data-heading]', { hasText: HEADING }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  const title = view.getByRole('heading', { name: `${HEADING}, Romans 8:1-11` });
  await expect(title).toBeVisible();
  // the title keeps to the header: inside the phone, at most two lines
  const t = await title.boundingBox();
  if (!t) throw new Error('no title box');
  expect(t.x).toBeGreaterThanOrEqual(0);
  expect(t.x + t.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(t.height).toBeLessThanOrEqual(90);
  // the range is never cut: its own line shows whole
  const range = title.getByText('Romans 8:1-11', { exact: true });
  expect(await range.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);

  const text = view.locator('[data-sheet-verse]');
  expect(await text.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(20);
  await expect(view.locator('[data-passage-verse]')).toHaveCount(11);

  const row = view.getByRole('group', { name: 'Actions' });
  const tops = new Set<number>();
  for (const button of await row.getByRole('button').all()) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    tops.add(Math.round(b.y));
  }
  expect(tops.size).toBe(1);

  // the passage is longer than the screen: it scrolls in a box of its own, and the row of actions is in sight under it
  const box = view.locator('[data-passage-box]');
  const boxSize = await box.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight }));
  expect(boxSize.scroll).toBeGreaterThan(boxSize.client);
  expect(boxSize.client).toBeLessThanOrEqual(VIEWPORT.height * 0.4 + 1);
  const rowBox = await row.boundingBox();
  if (!rowBox) throw new Error('no row box');
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(VIEWPORT.height - BAR_HEIGHT);

  const bars = page.locator('[data-hold-bar]');
  await expect(bars).toHaveCount(1);
  await expect(bars.first()).toHaveAttribute('aria-label', 'Hold to listen to verses 1-11');
  const bar = await bars.first().boundingBox();
  if (!bar) throw new Error('no bar');
  expect(bar.height).toBeGreaterThanOrEqual(BAR_HEIGHT - 0.5);
  expect(bar.y + bar.height).toBeLessThanOrEqual(VIEWPORT.height);
  await expect(page.locator('[data-talk-bar]')).toHaveCount(0);

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
  await shot(page, 'passage-view-listen');

  // the passage scrolls inside the view, the bar stays; Back returns to the Reader
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(bars.first()).toHaveAttribute('aria-label', 'Hold to ask');
  await shot(page, 'passage-view-ask');
  await page.goBack();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Talk', exact: true })).toBeVisible();
});

test('Read it aloud: the reading check for the passage above the one bar', async ({ page }) => {
  await start(page, '/#/?c=8&view=greek&weave=off');
  await page.locator('[data-heading]', { hasText: 'Heirs with Christ' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: 'Heirs with Christ, Romans 8:12-17' })).toBeVisible();
  await view.getByRole('button', { name: 'Read it aloud', exact: true }).click();
  await expect(view.getByRole('region', { name: 'Reading check' })).toBeVisible();
  await expect(page.locator('[data-hold-bar]')).toHaveCount(1);
  await expect(page.locator('[data-hold-bar]').first()).toHaveAttribute('aria-label', 'Hold to read verses 12-17');
  await shot(page, 'passage-view-read');
});
