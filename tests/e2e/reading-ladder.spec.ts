import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';
import { holdFor } from '../support/hold';

const VIEWPORT = { width: 390, height: 844 };

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

// holdFor (tests/support/hold.ts) times each hold on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('the Reading ladder in Greek opens the easiest verse, says Verse 1 of M, and offers Next verse after a good reading, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  const view = await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });

  const start = panel.getByRole('button', { name: 'Reading ladder', exact: true });
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await start.click();

  // the easiest verse to say in Greek is the first of public/data/ladder/el.json: 1 Thessalonians 5:16
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:16');
  await expect(panel).toContainText('Verse 1 of');
  await expect(panel.getByRole('button', { name: 'Skip for now', exact: true })).toBeVisible();
  await expect(panel).toBeInViewport();
  await expectFitsPhone(page);
  await shot(page, 'reading-ladder');

  // a good reading offers Next verse, which opens the second verse of the list
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 1500);
  await expect(panel).toContainText('Well read');
  const next = panel.getByRole('button', { name: 'Next verse', exact: true });
  expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await next.click();
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:19');
  await expect(panel).toContainText('Verse 2 of');
  await expectFitsPhone(page);
});

test('the Goal screen has a Reading ladder entry for each language that opens its list on Read it aloud, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/goal');
  const english = page.getByRole('button', { name: 'Reading ladder: English', exact: true });
  await expect(page.getByRole('button', { name: 'Reading ladder: Greek', exact: true })).toBeVisible();
  expect((await english.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await expectFitsPhone(page);
  await english.click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('John 11:35');
  await expect(view.getByRole('button', { name: 'Read it aloud', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Reading check' })).toContainText('Verse 1 of');
});
