import { expect, test, type Page } from '@playwright/test';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';
import { holdFor } from '../support/hold';
import { pageTime, tapTwice } from '../support/gesture';
import { SETTLE_MS } from '../../src/ui/settle';

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

// A double tap on the ladder's bar (mw-neuq78.16): the bar stands where it stood, so the second tap of a quick pair lands on the NEXT verse's own button and
// skipped a verse he never saw (this host delivers the second tap 400 ms of real time late, so the first has moved the verse). The bar waits for the new verse to settle (src/ui/settle.ts). 60 ms apart on the page's clock, as a thumb's, by touch.
test.describe('a double tap on the ladder bar moves one verse only', () => {
  test.use({ viewport: VIEWPORT, hasTouch: true });

  async function openLadder(page: Page, answer?: object) {
    const fake = makeFakePostern();
    if (answer) fake.autoReply = { status: 'answered', answer };
    await routePostern(page, fake);
    await honestMic(page);
    await openUnlocked(page);
    await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
    await page.goto('/');
    await page.getByRole('button', { name: 'Greek', exact: true }).click();
    const view = await chooseAction(page, 28, 'Read it aloud');
    const panel = page.getByRole('region', { name: 'Reading check' });
    await panel.getByRole('button', { name: 'Reading ladder', exact: true }).tap();
    await expect(panel).toContainText('Verse 1 of');
    // the verse that opens takes no tap in its first moment: he reads it first
    await pageTime(page, SETTLE_MS + 100);
    return { fake, view, panel };
  }

  test('two quick taps on Skip for now skip one verse', async ({ page }) => {
    const { view, panel } = await openLadder(page);
    await tapTwice(page, panel.getByRole('button', { name: 'Skip for now', exact: true }), 60, { touch: true, lagMs: 400 });
    await expect(panel).toContainText('Verse 2 of');
    await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:19');
    // it stays on Verse 2: nothing is still to land
    await page.clock.runFor(1000);
    await expect(panel).toContainText('Verse 2 of');
    await shot(page, 'reading-ladder-double-skip');
  });

  test('two quick taps on Next verse open the next verse and skip none', async ({ page }) => {
    const { view, panel } = await openLadder(page, WELL_READ_ANSWER);
    await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 1500);
    await expect(panel).toContainText('Well read');
    await pageTime(page, SETTLE_MS + 100);
    await tapTwice(page, panel.getByRole('button', { name: 'Next verse', exact: true }), 60, { touch: true, lagMs: 400 });
    await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:19');
    await page.clock.runFor(1000);
    await expect(panel).toContainText('Verse 2 of');
  });

  test('two quick taps on Try again set the reading aside and skip nothing', async ({ page }) => {
    const { view, panel } = await openLadder(page, {
      verdict: 'some-to-fix',
      focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
      note: 'Nearly there: one word to say again.',
    });
    await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 1500);
    await expect(panel).toContainText('Words to fix');
    await pageTime(page, SETTLE_MS + 100);
    await tapTwice(page, panel.getByRole('button', { name: 'Try again', exact: true }), 60, { touch: true, lagMs: 400 });
    await page.clock.runFor(1000);
    await expect(panel).toContainText('Verse 1 of');
    await expect(view.getByRole('heading', { level: 2 })).toHaveText('1 Thessalonians 5:16');
  });
});

// Try again and Skip for now stay in reach (mw-neuq78.18): after a reading with words to fix, with the speaking bar up over the verse's foot while the verdict is
// read aloud, the ladder's two buttons are whole on the screen, not behind the bar, and the panel needs no scroll to reach them.
test('Try again and Skip for now are inside the viewport and clear of the speaking bar while the verdict is read, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: {
      verdict: 'some-to-fix',
      focus_words: [
        { word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' },
        { word: 'ἀδιαλείπτως', index: 1, chunks: ['ἀ', 'δι', 'α', 'λείπ', 'τως'], tip: 'Say the αλ as ah-lee.' },
        { word: 'προσεύχεσθε', index: 2, chunks: ['προσ', 'εύ', 'χε', 'σθε'], tip: 'The ευ is eff or ev.' },
      ],
      note: 'Nearly there: three words to say again. Take them slowly, one chunk at a time, and then read the whole verse once more.',
    },
  };
  await routePostern(page, fake);
  await honestSpeech(page, { msPerWord: 600 });
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await panel.getByRole('button', { name: 'Reading ladder', exact: true }).click();
  await expect(panel).toContainText('Verse 1 of');
  await pageTime(page, SETTLE_MS + 100);
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 3000);
  await expect(panel).toContainText('Words to fix');
  // the verdict is being read: the speaking bar is up
  const speaking = page.getByRole('region', { name: 'Speaking', exact: true });
  await expect(speaking.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  const viewport = page.viewportSize();
  const height = viewport ? viewport.height : VIEWPORT.height;
  const bar = await speaking.boundingBox();
  for (const name of ['Try again', 'Skip for now']) {
    const button = panel.getByRole('button', { name, exact: true });
    await expect(button).toBeInViewport({ ratio: 1 });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    if (!box || !bar) continue;
    // whole on the screen, and above the speaking bar
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 0.5);
  }
  await expectFitsPhone(page);
  await shot(page, 'reading-ladder-words-to-fix');
});

// Sideways (844x390) the panel shows little, so the ladder's choice is the thing that must not need a scroll: Try again and Skip for now with the speaking bar up,
// and Next verse after a Well read.
test.describe('sideways, the ladder buttons are on the screen without a scroll', () => {
  const SIDEWAYS = { width: 844, height: 390 };
  const FIX = {
    verdict: 'some-to-fix',
    focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
    note: 'Nearly there: one word to say again.',
  };

  async function read(page: Page, answer: object, heading: string) {
    await page.setViewportSize(SIDEWAYS);
    const fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer };
    await routePostern(page, fake);
    await honestSpeech(page, { msPerWord: 600 });
    await honestMic(page);
    await openUnlocked(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Greek', exact: true }).click();
    await chooseAction(page, 28, 'Read it aloud');
    const panel = page.getByRole('region', { name: 'Reading check' });
    await panel.getByRole('button', { name: 'Reading ladder', exact: true }).click();
    await expect(panel).toContainText('Verse 1 of');
    await pageTime(page, SETTLE_MS + 100);
    await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 16', exact: true }), 3000);
    await expect(panel).toContainText(heading);
    return panel;
  }

  test('Try again and Skip for now with the speaking bar up', async ({ page }) => {
    const panel = await read(page, FIX, 'Words to fix');
    await expect(page.getByRole('region', { name: 'Speaking', exact: true }).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    for (const name of ['Try again', 'Skip for now']) await expect(panel.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
    await shot(page, 'reading-ladder-words-to-fix-sideways');
  });

  test('Next verse after a Well read', async ({ page }) => {
    const panel = await read(page, WELL_READ_ANSWER, 'Well read');
    await expect(panel.getByRole('button', { name: 'Next verse', exact: true })).toBeInViewport({ ratio: 1 });
  });
});
