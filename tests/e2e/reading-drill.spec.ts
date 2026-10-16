import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { SETTLE_MS } from '../../src/ui/settle';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';
import { holdFor } from '../support/hold';

const VIEWPORT = { width: 390, height: 844 };

// An ου word to fix, so each reading adds a miss of the sound to the tally.
const OU_WORD_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'οὐρανοῦ', index: 0, chunks: ['οὐ', 'ρα', 'νοῦ'], tip: 'The ου is one sound, oo.' }],
  note: 'Nearly there: one word to say again.',
};

async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

// Well over the reading's one second (SHORT_READING_MS): on the page's clock the hold is exactly this long.
const HOLD_MS = 2800;

// holdFor (tests/support/hold.ts) times each hold on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('two misses of ου offer Drill this sound, which shows the rule and reads five words, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OU_WORD_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });

  // one miss: no drill
  await holdFor(page, bar, HOLD_MS);
  await expect(panel).toContainText('Words to fix');
  await expect(panel.getByRole('button', { name: 'Drill this sound', exact: true })).toHaveCount(0);

  // the second reading that misses ου offers it
  await holdFor(page, bar, HOLD_MS);
  const offer = panel.getByRole('button', { name: 'Drill this sound', exact: true });
  await expect(offer).toBeVisible();
  expect((await offer.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await offer.click();

  const drill = page.getByRole('dialog', { name: 'Reading drill' });
  await expect(drill).toContainText('ου says oo');
  await expect(drill.getByRole('button', { name: 'Hear ου', exact: true })).toBeVisible();
  await expectFitsPhone(page);
  await drill.getByRole('button', { name: 'Start the drill', exact: true }).click();

  // five words, each read aloud, the mill answers each
  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  for (let i = 0; i < 5; i++) {
    await expect(drill).toContainText(`Word ${i + 1} of 5`);
    const word = drill.getByRole('button', { name: /^Hold to read / });
    expect((await word.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    await holdFor(page, word, HOLD_MS);
    await expect(drill).toContainText('Well read');
    if (i === 0) {
      // the card, the verdict and the bar fit on the phone
      await expect(drill).toBeInViewport();
      await expectFitsPhone(page);
      await shot(page, 'reading-drill');
    }
    await drill.getByRole('button', { name: i === 4 ? 'Finish' : 'Next word', exact: true }).click();
  }
  await expect(drill).toContainText('Drilled ου');
  await drill.getByRole('button', { name: 'Back to the ladder', exact: true }).click();
  await expect(drill).toHaveCount(0);
});

// The sweep (mw-5r3p30.430): the next word's Skip this word is the button Next word was, so a double tap on Next word skipped a word unread; it
// waits for the new word to settle (src/ui/settle.ts). Back to the ladder on the end card does not stand where Finish was: the end card stays.
test('a double tap on Next word skips no word, and one on Finish leaves the end card on screen', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OU_WORD_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/');
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  const bar = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await holdFor(page, bar, HOLD_MS);
  await expect(panel).toContainText('Words to fix');
  await holdFor(page, bar, HOLD_MS);
  await panel.getByRole('button', { name: 'Drill this sound', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Reading drill' });
  await drill.getByRole('button', { name: 'Start the drill', exact: true }).click();

  fake.autoReply = { status: 'answered', answer: WELL_READ_ANSWER };
  const twice = async (name: string) => {
    const box = (await drill.getByRole('button', { name, exact: true }).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(120);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  };
  for (let i = 0; i < 5; i++) {
    await expect(drill).toContainText(`Word ${i + 1} of 5`);
    await holdFor(page, drill.getByRole('button', { name: /^Hold to read / }), HOLD_MS);
    await expect(drill).toContainText('Well read');
    await twice(i === 4 ? 'Finish' : 'Next word');
    if (i < 4) {
      // the next word is up, not skipped: the double tap moved on one word
      await expect(drill).toContainText(`Word ${i + 2} of 5`);
      await expect(drill.getByRole('button', { name: 'Skip this word', exact: true })).toBeVisible();
    }
  }
  await expect(drill).toContainText('Drilled ου');
  await expect(drill.getByRole('button', { name: 'Back to the ladder', exact: true })).toBeVisible();
});
