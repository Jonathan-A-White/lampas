// tests/e2e/open-tutor.ts — opens the tutor the way the app's door does (src/tutor/door.ts, mw-5r3p30.880): a two-finger tap. WHAT it opens the tutor about is the app's choice, not the spec's: the newest
// thing a screen or sheet registered, so it is the verse when the Verse view is open, the word when a word sheet is, the lesson when an idea sheet is, else the chapter or the screen. A spec that wants a verse
// opens the Verse view first (openVerseView, tests/e2e/verse-view.ts) and then calls this. The features' twin is features/steps/open-tutor.ts; both send the fingers of tests/support/two-finger.ts.
import { expect, type Locator, type Page } from '@playwright/test';
import { guardLeftMs, TWO_FINGERS } from '../support/two-finger';

/** The sheet every tutor talk is: 'Talk about Romans 8', 'Talk about verse 28' and 'Ask the tutor: Words' (src/Talk.tsx). */
export const TALK_SHEET = /^(Talk about |Ask the tutor: |Talk with the tutor)/;

/** Two fingers on the page, lifted together: what the browser sends for a two-finger tap. Works with or without `hasTouch` on the context. */
export async function twoFingers(page: Page, at: { x: number; y: number } = TWO_FINGERS[0]): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    // a page without hasTouch has no touch events until the browser is told to send them
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const points = TWO_FINGERS.map((p, id) => ({ x: p.x - TWO_FINGERS[0].x + at.x, y: p.y - TWO_FINGERS[0].y + at.y, id: id + 1 }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

/**
 * Opens the tutor with a two-finger tap and waits for its Talk sheet (`sheet`, by default any talk). Returns the sheet. The app drops a click that comes within 600 ms of the tap that opened the tutor
 * (the click a phone may send after it), so this also waits that out: the next thing a spec clicks is a click.
 */
export async function openTutor(page: Page, { sheet = TALK_SHEET, at }: { sheet?: string | RegExp; at?: { x: number; y: number } } = {}): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: sheet });
  // the Tutor door setting is read a moment after the app opens: tap again until the tap takes
  let tappedAt = 0;
  await expect(async () => {
    if (!(await dialog.first().isVisible())) {
      await twoFingers(page, at);
      tappedAt = await page.evaluate(() => performance.now());
    }
    await expect(dialog.first()).toBeVisible({ timeout: 1500 }); // a short window on purpose: a tap that came before the door read its setting did nothing, and toPass taps again
  }).toPass();
  const wait = guardLeftMs(tappedAt, await page.evaluate(() => performance.now()));
  if (wait > 0) await page.waitForTimeout(wait);
  return dialog.first();
}
