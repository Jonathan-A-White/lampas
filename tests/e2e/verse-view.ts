// tests/e2e/verse-view.ts — drives the Verse view (src/VerseView.tsx) the way a thumb does, for the specs that start from a verse.
import { expect, type Locator, type Page } from '@playwright/test';
import { openTutor } from './open-tutor';
import { talkField } from './talk-field';

/** Taps the number of verse `n`: the Verse view opens. Returns it. */
export async function openVerseView(page: Page, n: number): Promise<Locator> {
  await page.getByRole('button', { name: `Verse ${n}`, exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  return view;
}

/** Opens the Verse view of verse `n` and chooses one of its actions ('Listen', 'Read it aloud'). */
export async function chooseAction(page: Page, n: number, action: 'Listen' | 'Read it aloud'): Promise<Locator> {
  const view = await openVerseView(page, n);
  await view.getByRole('button', { name: action, exact: true }).click();
  return view;
}

/** Opens the Bible talk about verse `n`: its Verse view open, a two-finger tap (openTutor, tests/e2e/open-tutor.ts) opens the tutor about the verse the view shows. */
export async function openTalkAbout(page: Page, n: number): Promise<void> {
  await openVerseView(page, n);
  await openTutor(page, { sheet: /^Talk about / });
}

/** Opens the Bible talk about verse `n` (openTalkAbout), types `question` and sends it. Returns the Talk sheet. */
export async function askAboutVerse(page: Page, n: number, question: string): Promise<Locator> {
  await openTalkAbout(page, n);
  const sheet = page.getByRole('dialog', { name: /^Talk about / });
  await (await talkField(sheet)).fill(question);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  return sheet;
}
