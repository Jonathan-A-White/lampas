import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A Review round survives a reload, or the phone dropping the page while he is in another app (mw-86e9r1.32): Review carries on at the next question.

/** Answers the question on screen, as a flashcard or as multiple choice, without tapping Next. */
async function answer(page: Page): Promise<void> {
  const show = page.getByRole('button', { name: 'Show', exact: true });
  if (await show.isVisible()) {
    await show.click();
    await page.getByRole('button', { name: 'I knew it' }).click();
  } else {
    await page.locator('[data-option]').first().click();
  }
}

async function openRound(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
}

test('a reload after answering and tapping Next carries on at the next question of the same round', async ({ page }) => {
  await openRound(page);
  await expect(page.getByText('1 of 10')).toBeVisible();
  await answer(page);
  await page.getByTestId('next').click();
  await expect(page.getByText('2 of 10')).toBeVisible();
  const second = await page.getByTestId('prompt').innerText();

  await page.reload();

  await expect(page.getByTestId('prompt')).toBeVisible();
  await expect(page.getByText('2 of 10')).toBeVisible();
  await expect(page.getByTestId('prompt')).toHaveText(second);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0);
  await expect(page.getByText('1 of 10')).toHaveCount(0);
  await shot(page, 'review-resume');
});

test('a reload after answering, before Next, does not ask the answered question again', async ({ page }) => {
  await openRound(page);
  await answer(page);
  await page.reload();

  await expect(page.getByTestId('prompt')).toBeVisible();
  await expect(page.getByText('2 of 10')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0);
});

test('after Finish a reload shows Start again', async ({ page }) => {
  await openRound(page);
  for (let i = 0; i < 10; i += 1) {
    await answer(page);
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toBeVisible();

  await page.reload();

  await expect(page.getByTestId('due-today')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.getByTestId('prompt')).toHaveCount(0);
});
