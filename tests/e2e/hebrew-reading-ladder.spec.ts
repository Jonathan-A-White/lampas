// The Hebrew Reading ladder (mw-gdcyf98.14) at 390x844: from the Hebrew view of Jonah 1, Read it aloud offers the Reading ladder; it opens the easiest Old Testament verse to say
// (Exodus 20:14, the first of public/data/ladder/he.json) in Hebrew, right to left, on Read it aloud; a reading is sent scored in Hebrew; Next verse opens the second.
import { expect, test, type Page } from '@playwright/test';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

test('the Reading ladder in Hebrew opens the easiest Old Testament verse in Hebrew and sends the reading scored in he, at phone width', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  await routePostern(page, fake);
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await choice(page, 'Hebrew').click();
  const view = await chooseAction(page, 1, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await expect(panel).toContainText('Read verse 1 aloud in Hebrew');

  const start = panel.getByRole('button', { name: 'Reading ladder', exact: true });
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await start.click();

  // the easiest verse to say in Hebrew is the first of public/data/ladder/he.json: Exodus 20:14
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('Exodus 20:14');
  const verse = view.locator('[data-sheet-verse]');
  await expect(verse).toHaveAttribute('lang', 'he');
  await expect(verse).toHaveAttribute('dir', 'rtl');
  await expect(panel).toContainText('Reading ladder, Hebrew: Number 1 of 23144 on the ladder');
  await expect(panel.getByRole('button', { name: 'Skip for now', exact: true })).toBeVisible();
  await expect(panel).toBeInViewport();
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
  await shot(page, 'hebrew-reading-ladder');

  // a reading is scored in Hebrew and carries no Greek word
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 14', exact: true }), 1500);
  await expect(panel).toContainText('Well read');
  expect(fake.received.at(-1)?.input).toMatchObject({ lang: 'he', reference: 'Exodus 20:14' });
  expect(fake.received.at(-1)?.input.greek_words).toBeUndefined();
  await panel.getByRole('button', { name: 'Next verse', exact: true }).click();
  await expect(view.getByRole('heading', { level: 2 })).toHaveText('Exodus 20:15');
  await expect(panel).toContainText('Number 2 of 23144');
});
