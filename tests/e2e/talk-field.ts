// tests/e2e/talk-field.ts — the Talk sheet's typed field (mw-06ggew.15). The sheet's input is voice-kit's Composer, as in Ask the tutor: it opens on the Hold to talk bar, and
// 'Type a message' brings the text box out. A spec that types a message gets the box here; one that already has words in it (a draft, a shared text) finds it out.
import type { Locator } from '@playwright/test';

/** The sheet's 'Your message' text box, brought out if the bar is showing. */
export async function talkField(sheet: Locator): Promise<Locator> {
  const field = sheet.getByRole('textbox', { name: 'Your message' });
  const bar = sheet.getByRole('button', { name: 'Type a message' });
  // isVisible() answers at once: a sheet still opening has neither yet, and a draft's box is drawn after it, so wait for whichever the sheet shows first.
  await field.or(bar).first().waitFor();
  if (!(await field.isVisible())) await bar.click();
  return field;
}

/** The kit's picture picker (Attach a picture opens it): a hidden file input with no label of its own. */
export const pictureInput = (sheet: Locator): Locator => sheet.locator('input[type="file"]:not([capture])');
