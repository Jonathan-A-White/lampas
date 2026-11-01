// tests/e2e/diagram-by-sentence.spec.ts — Diagram by sentence (mw-5r3p30.897) at phone width, against the fake mill (it answers a flat tree of whatever words it is sent, tests/support/flat-diagram.ts):
// Diagram on Ephesians 1:5 opens the diagram of 1:3-14 with the caption naming the range, in a box that scrolls sideways; a verse of two sentences (John 2:4) gives two diagrams stacked; a verse of one
// sentence (John 11:35) has no caption. jsdom has no layout, so the stacking and the width are proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { flatDiagram } from '../support/flat-diagram';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

async function start(page: Page, chapter: string): Promise<FakePostern> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.replyFor = (input, kind) => (kind === 'sentence-diagram' ? { status: 'answered', answer: flatDiagram(input) } : undefined);
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.setItem('lampas.diagram-lesson.invite', 'dismissed'));
  await page.goto(`/#/?${chapter}&view=english&weave=off`);
  return fake;
}

const asks = (fake: FakePostern): { ref: string }[] => fake.received.filter((r) => r.grist.kind === 'sentence-diagram').map((r) => r.input as { ref: string });

test.use({ viewport: VIEWPORT });

test('Diagram on Ephesians 1:5 opens the diagram of 1:3-14 and names the range', async ({ page }) => {
  const fake = await start(page, 'b=eph&c=1');
  const view = await openVerseView(page, 5);
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  await expect(pane.getByText('Ephesians 1:3-14, one sentence')).toBeVisible();
  const picture = pane.getByRole('img', { name: 'Sentence diagram of Ephesians 1:3-14, one sentence, English' });
  await expect(picture).toBeVisible();
  expect(asks(fake).map((a) => a.ref)).toEqual(['Ephesians 1:3-14']);

  // a long sentence scrolls sideways inside its own box; the page does not
  const box = pane.locator('[data-diagram]');
  const room = await box.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(room.scroll).toBeGreaterThan(room.client);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'diagram-by-sentence');
});

test('a verse of two sentences, John 2:4, gives two diagrams stacked, each with its caption and Redraw', async ({ page }) => {
  const fake = await start(page, 'b=jhn&c=2');
  const view = await openVerseView(page, 4);
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  const first = pane.getByText('John 2:4, one sentence (1 of 2 in verse 4)');
  const second = pane.getByText('John 2:4, one sentence (2 of 2 in verse 4)');
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(pane.getByRole('img')).toHaveCount(2);
  await expect(pane.getByRole('button', { name: 'Redraw', exact: true })).toHaveCount(2);
  const a = await first.boundingBox();
  const b = await second.boundingBox();
  expect(a && b && b.y > a.y).toBe(true);
  expect(new Set(asks(fake).map((x) => x.ref)).size).toBe(2);
  await shot(page, 'diagram-by-sentence-two');
});

test('a verse that is one sentence, John 11:35, has no caption', async ({ page }) => {
  await start(page, 'b=jhn&c=11');
  const view = await openVerseView(page, 35);
  await view.getByRole('button', { name: 'Diagram', exact: true }).click();
  const pane = view.getByRole('region', { name: 'Diagram' });
  await expect(pane.getByRole('img', { name: 'Sentence diagram of John 11:35, English' })).toBeVisible();
  await expect(pane.locator('[data-diagram-caption]')).toHaveCount(0);
});
