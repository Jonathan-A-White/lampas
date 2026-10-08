import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
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

const inReach = async (page: Page, name: string, exact = true) => {
  const button = page.getByRole('button', { name, exact });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  return button;
};

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
  // With the answer, the full parsing and Next showing, the links are still in reach.
  await inReach(page, 'Next step');
  await inReach(page, 'Ask the tutor');
  await inReach(page, 'Talk about it');
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
  await page.getByRole('button', { name: 'Ask the tutor' }).click();
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
