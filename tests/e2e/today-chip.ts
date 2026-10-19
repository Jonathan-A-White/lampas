// tests/e2e/today-chip.ts — the Reader's Today chip (src/today/TodayChip.tsx, mw-1fwagb.6) replaced the Due and Plan chips, so a spec reaches Review and the plan through Today.
import { expect, type Page } from '@playwright/test';

export const todayChip = (page: Page) => page.getByTestId('today-chip');

/** Today's Review piece, while Today is open. */
export const reviewPiece = (page: Page) => page.getByRole('region', { name: 'Review', exact: true });

/** From the Reader: taps the Today chip and waits for Today. */
export async function openToday(page: Page): Promise<void> {
  await todayChip(page).click();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

/** From the Reader: opens Today and waits until Review says words are due (the first open leaves his learning words due once it has seeded the schedule); returns how many. Today is left open. */
export async function dueOnToday(page: Page): Promise<number> {
  await openToday(page);
  const button = reviewPiece(page).getByRole('button', { name: /^[1-9]\d* due/ });
  await expect(button).toBeVisible();
  return Number(((await button.innerText()) ?? '').match(/^(\d+) due/)?.[1]);
}

/** From the Reader: waits for the first open's schedule through Today and comes back to the Reader. */
export async function waitForDue(page: Page): Promise<void> {
  await dueOnToday(page);
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(todayChip(page)).toBeVisible();
}

/** From the Reader: Today, then Review's own button. */
export async function openReviewFromToday(page: Page): Promise<void> {
  await openToday(page);
  await reviewPiece(page).getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
}
