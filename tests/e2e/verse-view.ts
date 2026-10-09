// tests/e2e/verse-view.ts — drives the Verse view (src/VerseView.tsx) the way a thumb does, for the specs that start from a verse.
import { expect, type Locator, type Page } from '@playwright/test';

/** Taps the number of verse `n`: the Verse view opens. Returns it. */
export async function openVerseView(page: Page, n: number): Promise<Locator> {
  await page.getByRole('button', { name: `Verse ${n}`, exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  return view;
}

/** Opens the Verse view of verse `n` and chooses one of its actions ('Listen', 'Read it aloud', 'Ask the tutor'). */
export async function chooseAction(page: Page, n: number, action: 'Listen' | 'Read it aloud' | 'Ask the tutor'): Promise<Locator> {
  const view = await openVerseView(page, n);
  await view.getByRole('button', { name: action, exact: true }).click();
  return view;
}

/** Opens the Bible talk about verse `n` from its Verse view (Ask the tutor > Talk about verse N). */
export async function openTalkAbout(page: Page, n: number): Promise<void> {
  const view = await chooseAction(page, n, 'Ask the tutor');
  await view.getByRole('button', { name: `Talk about verse ${n}`, exact: true }).click();
}
