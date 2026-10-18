import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { SETTLE_MS } from '../../src/ui/settle';
import { openUnlocked } from './unlocked';

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

const inReach = async (page: Page, name: string, exact = true, scroll = false) => {
  const button = page.getByRole('button', { name, exact });
  await expect(button).toBeVisible();
  // after an answer only Next is pinned (src/ui/NextBar.tsx); the links under it are at the end of the screen's box, which a full parsing that wraps pushes below the fold
  if (scroll) await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  return button;
};

// tapTwice (tests/support/gesture.ts) times the two taps on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('a Parsing drill question shows the verse, four choices and both links in reach at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  await page.getByRole('button', { name: 'Parsing drill: Romans 8' }).click();
  await expect(page.getByRole('heading', { name: 'Parsing drill', level: 1 })).toBeVisible();
  const word = page.getByTestId('drill-word');
  await expect(word).toBeVisible();
  await expect(page.getByTestId('drill-step')).toHaveAttribute('data-step-id', 'pos');

  const options = page.locator('[data-option]');
  await expect(options).toHaveCount(4);
  for (const box of await options.all()) expect((await box.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await inReach(page, 'Ask the tutor');
  await inReach(page, 'Talk about it');

  await options.first().click();
  await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
  // With the answer and the full parsing showing, Next stays in reach where it is and the links are a scroll of the screen's box away (mw-5r3p30.377 pinned Next).
  await inReach(page, 'Next step');
  await inReach(page, 'Ask the tutor', true, true);
  await inReach(page, 'Talk about it', true, true);
  await expectFitsPhone(page);
  await shot(page, 'drill-question');
});

test('a Parsing drill round ends with N of 10 and the words missed at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/drill');
  for (let i = 0; i < 10; i += 1) {
    for (;;) {
      await page.locator('[data-option]').first().click();
      const next = page.getByTestId('next');
      const label = await next.textContent();
      await next.click();
      if (label !== 'Next step') break;
    }
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);
  await expect(page.getByRole('button', { name: 'Another round' })).toBeVisible();
  await expectFitsPhone(page);
  await shot(page, 'drill-result');
});

test('Ask the tutor leaves for the Reader with the question in the box, and Back picks the drill up where it was', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/drill');
  const word = page.getByTestId('drill-word');
  const verse = await word.getAttribute('data-verse');
  const form = (await word.textContent()) ?? '';
  await page.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Your question' });
  await expect(field).toBeVisible();
  await expect(field).toHaveValue(new RegExp(`^Parse ${form} in Romans 8:${verse}: why is it .+\\?$`));
  await expect(field).toBeInViewport();
  await expectFitsPhone(page);
  await page.goBack();
  await expect(page.getByTestId('drill-word')).toHaveAttribute('data-verse', verse ?? '');
  await expect(page.getByTestId('drill-step')).toHaveAttribute('data-step-id', 'pos');
});

test('a drill left half done is offered again after a reload, and Resume goes on at the same step', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/drill');
  const verse = await page.getByTestId('drill-word').getAttribute('data-verse');
  await page.locator('[data-option]').first().click();
  await page.getByTestId('next').click();
  await expect(page.getByTestId('drill-step')).not.toHaveAttribute('data-step-id', 'pos');
  const step = await page.getByTestId('drill-step').getAttribute('data-step-id');
  await page.reload();
  await expect(page.getByText('Round left unfinished')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByTestId('drill-word')).toHaveAttribute('data-verse', verse ?? '');
  await expect(page.getByTestId('drill-step')).toHaveAttribute('data-step-id', step ?? '');
});

// The sweep (mw-5r3p30.430): when the next step is drawn, Ask the tutor | Talk about it move up under the top edge of where Next stood (when the full
// parsing line under a miss goes too), so a double tap on Next near its top left the drill for the Reader. A new step's links wait for it to settle
// (src/ui/settle.ts). The overlap depends on his answer, so the double tap is made near Next's top, left and right, step after step until one lands on a link.
test('a double tap near the top of Next step stays in the drill, though Ask the tutor or Talk about it now stands there', async ({ page }) => {
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
  await page.goto('/#/drill');
  await expect(page.getByTestId('drill-step')).toHaveAttribute('data-step-id', 'pos');
  let landed = 0;
  for (let k = 0; k < 12 && landed === 0; k += 1) {
    const subtitle = await page.getByRole('heading', { name: 'Parsing drill', level: 1 }).locator('xpath=..').textContent();
    await page.waitForTimeout(SETTLE_MS + 100);
    await page.locator('[data-option]').first().click();
    const box = (await page.getByTestId('next').boundingBox())!;
    const x = box.x + box.width * (k % 2 === 0 ? 0.25 : 0.75);
    const y = box.y + 2;
    // 120 ms apart on the page's clock; before the second tap, does it land on the tutor's button that stands where Next was?
    await tapTwice(page, { x, y }, 120, {
      between: async () => {
        landed += await page.evaluate(([px, py]) => (document.elementFromPoint(px, py)?.closest('button')?.textContent?.match(/^(Ask the tutor|Talk about it)$/) ? 1 : 0), [x, y]);
      },
    });
    await expect(page.getByTestId('next'), `step ${k + 1}`).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Parsing drill', level: 1 }), `step ${k + 1}`).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Parsing drill', level: 1 }).locator('xpath=..')).not.toHaveText(subtitle ?? '');
    await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  // the second tap did land on a link at least once, so the guard was tried
  expect(landed).toBeGreaterThan(0);
  // a link he taps after reading the step still leaves for the Reader
  await page.waitForTimeout(SETTLE_MS + 100);
  await page.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Parsing drill', level: 1 })).toHaveCount(0);
});
