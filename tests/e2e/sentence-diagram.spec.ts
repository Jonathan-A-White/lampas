// tests/e2e/sentence-diagram.spec.ts — the Verse view's Diagram action (mw-souyao.3) at phone width, against the fake mill: Colossians 3:1 is drawn as a Reed-Kellogg
// diagram in a box that scrolls sideways (the chapter does not change), a tapped word opens the word sheet, and a second visit of the verse asks the tutor nothing.
// jsdom has no layout, so the row of actions (five actions, Copy link and Share fit two rows of three) and the picture's width are proven here.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
const ENGLISH = (JSON.parse(readFileSync('tests/fixtures/diagrams/col-3-1-english.json', 'utf8')) as { diagram: unknown }).diagram;

async function start(page: Page, options: { share?: boolean; weave?: 'off' | 'solid' } = {}): Promise<FakePostern> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.kindReplies['sentence-diagram'] = { status: 'answered', answer: ENGLISH };
  await routePostern(page, fake);
  await openUnlocked(page);
  if (options.share) await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
  await page.goto(`/#/?b=col&c=3&view=english&weave=${options.weave ?? 'off'}`);
  return fake;
}

const diagramAsks = (fake: FakePostern): number => fake.received.filter((r) => r.grist.kind === 'sentence-diagram').length;

/** The tops of the row's buttons (rounded): each inside the phone and a thumb tall; the Share-and-Copy pair shares a cell, so its two buttons are half as wide. */
async function rowTops(page: Page): Promise<{ count: number; tops: Set<number> }> {
  const row = page.getByRole('region', { name: 'Verse view' }).getByRole('group', { name: 'Actions', exact: true });
  const buttons = await row.getByRole('button').all();
  const tops = new Set<number>();
  for (const button of buttons) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    tops.add(Math.round(b.y));
  }
  return { count: buttons.length, tops };
}

test.use({ viewport: VIEWPORT });

test('Diagram draws Colossians 3:1 in a box that scrolls sideways, a word opens its sheet, and a second visit asks nothing', async ({ page }) => {
  const fake = await start(page);
  const view = await openVerseView(page, 1);
  await expect(view.getByRole('heading', { name: 'Colossians 3:1' })).toBeVisible();

  // the five actions and Copy link: two rows of three
  const row = await rowTops(page);
  expect(row.count).toBe(6);
  expect(row.tops.size).toBe(2);

  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Diagram', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const pane = view.getByRole('region', { name: 'Diagram' });
  const picture = pane.getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' });
  await expect(picture).toBeVisible();
  expect(await picture.locator('line').count()).toBeGreaterThan(10);
  await expect(pane.getByRole('button', { name: 'Christ' })).toHaveCount(2);
  await expect(pane.getByRole('button', { name: 'Redraw', exact: true })).toBeVisible();
  await expect(pane.getByText('Drawn by the tutor; Redraw if a word sits wrong')).toBeVisible();
  expect(diagramAsks(fake)).toBe(1);
  await shot(page, 'sentence-diagram');

  // the box is wider than the phone and scrolls sideways; the page and the chapter stay put
  const box = pane.locator('[data-diagram]');
  const room = await box.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(room.scroll).toBeGreaterThan(room.client);
  await box.hover();
  await page.mouse.wheel(300, 0);
  await expect.poll(() => box.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(view.getByRole('heading', { name: 'Colossians 3:1' })).toBeVisible();
  expect(page.url()).toContain('c=3');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // a word opens the word sheet; Back returns to the diagram, still drawn
  await box.evaluate((el) => (el.scrollLeft = 0));
  await pane.getByRole('button', { name: 'Christ' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-word')).toHaveText(/χριστῷ/i);
  await page.goBack();
  await expect(sheet).toHaveCount(0);
  await expect(picture).toBeVisible();

  // the same verse a second time: the kept diagram, no second grind call and no waiting line
  await view.getByRole('button', { name: /Reader/ }).click();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  const again = await openVerseView(page, 1);
  await expect(again.getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeVisible();
  await expect(again.getByText('Working it out…')).toHaveCount(0);
  expect(diagramAsks(fake)).toBe(1);

  // Redraw asks again
  await again.getByRole('button', { name: 'Redraw', exact: true }).click();
  await expect.poll(() => diagramAsks(fake)).toBe(2);
  await expect(again.getByRole('button', { name: 'Redraw', exact: true })).toBeEnabled();
});

test('On a phone with Share, the five actions, Copy link and Share still fit two rows of three', async ({ page }) => {
  await start(page, { share: true });
  const view = await openVerseView(page, 1);
  await expect(view.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  const row = await rowTops(page);
  expect(row.count).toBe(7);
  expect(row.tops.size).toBe(2);
  await shot(page, 'sentence-diagram-share-row');
});

test('With the Weave on, the diagram draws the words it shows in Greek in Greek, and no word overflows', async ({ page }) => {
  const fake = await start(page, { weave: 'solid' });
  const view = await openVerseView(page, 1);
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  await expect(pane.getByRole('img', { name: 'Sentence diagram of Colossians 3:1, English' })).toBeVisible();

  // Christ is Greek twice (Χριστός is solid); the English words are still English
  await expect(pane.getByRole('button', { name: 'χριστῷ' })).toBeVisible();
  await expect(pane.getByRole('button', { name: 'χριστός' })).toBeVisible();
  await expect(pane.getByRole('button', { name: 'Christ' })).toHaveCount(0);
  await expect(pane.getByRole('button', { name: 'strive' })).toBeVisible();
  const greek = await pane.getByRole('button', { name: 'χριστῷ' }).evaluate((el) => getComputedStyle(el).fontFamily);
  const english = await pane.getByRole('button', { name: 'strive' }).evaluate((el) => getComputedStyle(el).fontFamily);
  expect(greek).not.toBe(english);

  // no label's text is wider than its button, and the page does not scroll sideways
  const overflowing = await pane.locator('[data-diagram] button').evaluateAll((buttons) => buttons.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent));
  expect(overflowing).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'sentence-diagram-weave');

  // the Greek word opens its word sheet
  await pane.getByRole('button', { name: 'χριστῷ' }).click();
  await expect(page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-word')).toHaveText(/χριστῷ/i);
  expect(fake.received.filter((r) => r.grist.kind === 'sentence-diagram')).toHaveLength(1);
});
