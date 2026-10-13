import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { makeFakePostern, WELL_READ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

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

// This host's wall clock can step back about 1.4 s while a hold is going on, and the recorder times a hold with Date.now(): a hold shorter than about 2.5 s sometimes reads as a tap.
const HOLD_MS = 2800;

async function holdFor(page: Page, button: ReturnType<Page['getByRole']>, ms: number): Promise<void> {
  const box = await button.boundingBox();
  if (!box) throw new Error('the button is not on the page');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

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
