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

test('the Reader shows Due: N, which opens Review; a round ends with what comes back tomorrow', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  // his learning words are due on the first open
  const badge = page.getByRole('button', { name: /^Due: \d+$/ });
  await expect(badge).toBeVisible();
  expect((await badge.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expectFitsPhone(page);
  const due = Number((await badge.innerText()).replace('Due: ', ''));

  await badge.click();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
  await expect(page.getByTestId('due-today')).toHaveText(`Due today: ${due} ${due === 1 ? 'word' : 'words'}`);
  const start = page.getByRole('button', { name: 'Start' });
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await start.click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    await page.locator('[data-option]').first().click();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);
  await expect(page.getByTestId('comes-back')).toHaveText(/^\d+ comes? back tomorrow, \d+ later$/);
  const back = page.getByRole('button', { name: 'Back to reading' });
  await expect(back).toBeVisible();
  const box = await back.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  await expectFitsPhone(page);

  await shot(page, 'review');
});

test('the Due: N strip fits the Reader at 360 px and leaves the header as it was', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await openUnlocked(page);
  await page.goto('/');
  const badge = page.getByRole('button', { name: /^Due: \d+$/ });
  await expect(badge).toBeVisible();
  const box = await badge.boundingBox();
  expect(box && box.x + box.width).toBeLessThanOrEqual(360);
  expect(box?.height).toBeGreaterThanOrEqual(48);
  // the strip sits under the header, so the header's own buttons keep their room
  expect((await page.getByRole('button', { name: 'Settings' }).boundingBox())?.width).toBeGreaterThanOrEqual(48);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expectFitsPhone(page);
  await context.close();
});

test('Review is reached from Settings and a reload keeps him on it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
});
