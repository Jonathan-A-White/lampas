// tests/e2e/verse-view.spec.ts — the Verse view (mw-5r3p30.79) at phone width: the verse big, one row of actions, ONE hold bar at the foot, a shot of
// each action selected, and Back returning to the Reader where it was. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { composerOf, expectOneAskBar } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
/** Postern's bar: h-24 */
const BAR_HEIGHT = 96;

async function expectFitsPhone(page: Page): Promise<void> {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

async function start(page: Page, hash = '/#/?c=8&view=english&weave=off'): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await routePostern(page, fake);
  // the composer shows its Hold to ask bar on a phone that can recognise speech
  await honestMic(page);
  await openUnlocked(page);
  await page.goto(hash);
}

/** The one hold bar: the lowest thing on the screen, Postern's height, the width of the phone less its padding. */
async function expectOneBar(page: Page, label: string): Promise<void> {
  const bars = page.locator('[data-hold-bar]');
  await expect(bars).toHaveCount(1);
  await expect(bars.first()).toHaveAttribute('aria-label', label);
  const box = await bars.first().boundingBox();
  if (!box) throw new Error('no bar');
  expect(box.height).toBeGreaterThanOrEqual(BAR_HEIGHT - 0.5);
  expect(box.width).toBeGreaterThan(VIEWPORT.width - 40);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  await expect(page.locator('[data-talk-bar]')).toHaveCount(0);
}

/** Listen's foot: one Play button the size and place of the hold bars, and no hold bar. */
async function expectPlay(page: Page, label: string): Promise<void> {
  await expect(page.locator('[data-hold-bar]')).toHaveCount(0);
  const play = page.locator('[data-verse-bar]').getByRole('button', { name: label, exact: true });
  await expect(play).toHaveCount(1);
  const box = await play.boundingBox();
  if (!box) throw new Error('no Play button');
  expect(box.height).toBeGreaterThanOrEqual(BAR_HEIGHT - 0.5);
  expect(box.width).toBeGreaterThan(VIEWPORT.width - 40);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  await expect(page.locator('[data-talk-bar]')).toHaveCount(0);
}

test('Listen: the verse big, one row of actions on one line, and the one Play button', async ({ page }) => {
  await start(page, '/#/?c=8&view=english&weave=solid');
  const line = page.locator('[data-verse="11"] [data-text]');
  const lineSize = await line.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const view = await openVerseView(page, 11);
  await expect(view.getByRole('heading', { name: 'Romans 8:11' })).toBeVisible();
  const verse = view.locator('[data-sheet-verse]');
  expect(await verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(lineSize);

  // the row of actions: every button inside the phone, on one line (or at most the height of two when the text size is large)
  const row = view.getByRole('group', { name: 'Actions' });
  const buttons = await row.getByRole('button').all();
  expect(buttons.length).toBeGreaterThanOrEqual(4);
  const tops = new Set<number>();
  for (const button of buttons) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    tops.add(Math.round(b.y));
  }
  expect(tops.size).toBe(1);
  await expect(view.getByRole('button', { name: 'Quiz me', exact: true })).toHaveCount(1);

  await expect(view.getByRole('button', { name: 'Listen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectPlay(page, 'Play verse 11');
  await expectFitsPhone(page);
  await shot(page, 'verse-view-listen');
});

test('Read it aloud: the reading check above the one bar Hold to read verse 11', async ({ page }) => {
  await start(page);
  const view = await openVerseView(page, 11);
  await view.getByRole('button', { name: 'Read it aloud', exact: true }).click();
  await expect(view.getByRole('region', { name: 'Reading check' })).toBeVisible();
  await expectOneBar(page, 'Hold to read verse 11');
  await expectFitsPhone(page);
  await shot(page, 'verse-view-read');
});

test('Ask the tutor: the one composer, Hold to ask over Type a question, and Talk about the verse', async ({ page }) => {
  await start(page);
  const view = await openVerseView(page, 11);
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(view.getByRole('region', { name: 'Ask the tutor' })).toBeVisible();
  await expectOneAskBar(page, VIEWPORT);
  await expect(composerOf(page).getByRole('button', { name: 'Type a question', exact: true })).toBeVisible();
  await expect(view.getByRole('button', { name: 'Ask', exact: true })).toHaveCount(0);
  await expect(view.getByRole('button', { name: 'Talk about verse 11', exact: true })).toBeVisible();
  await expectFitsPhone(page);
  await shot(page, 'verse-view-ask');
});

test('the chosen action is kept for the next verse, the arrows move through the chapter, and Back returns to the Reader at the same place', async ({ page }) => {
  await start(page);
  const reader = page.locator('[data-reader]');
  const view = await openVerseView(page, 20);
  // the Reader stays where it was, under the view (tapping scrolled verse 20 into reach first)
  const left = await reader.evaluate((el) => el.scrollTop);
  expect(left).toBeGreaterThan(300);
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await view.getByRole('button', { name: 'Next verse', exact: true }).click();
  await expect(view.getByRole('heading', { name: 'Romans 8:21' })).toBeVisible();
  await expectOneAskBar(page, VIEWPORT);
  await view.getByRole('button', { name: 'Previous verse', exact: true }).click();
  await expect(view.getByRole('heading', { name: 'Romans 8:20' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  expect(await reader.evaluate((el) => el.scrollTop)).toBe(left);
  await expect(page.getByRole('button', { name: 'Talk', exact: true })).toBeVisible();
});

test('across a chapter end the arrows go from Romans 8:39 to 9:1 and back', async ({ page }) => {
  await start(page);
  await page.locator('[data-verse="39"]').scrollIntoViewIfNeeded();
  const view = await openVerseView(page, 39);
  await view.getByRole('button', { name: 'Next verse', exact: true }).click();
  await expect(view.getByRole('heading', { name: 'Romans 9:1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeAttached();
  await view.getByRole('button', { name: 'Previous verse', exact: true }).click();
  await expect(view.getByRole('heading', { name: 'Romans 8:39' })).toBeVisible();
  await shot(page, 'verse-view-chapter-end');
});
