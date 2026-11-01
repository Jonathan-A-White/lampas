// tests/support/composer.ts — finds the parts of voice-kit's Composer (the Talk sheet's foot; the Verse view's Ask the tutor is gone, mw-5r3p30.882) the way a person does: by what they say.
import { within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { openTutor } from '../../features/steps/open-tutor';

/** Every word the bar can show: its name changes with the hold. */
const BAR_NAME = /^(Hold to ask|Release to send|Starting the mic…|Let go to keep it unsent)$/;

export const composerIn = (root: HTMLElement): HTMLElement => within(root).getByTestId('composer');
export const holdBarIn = (root: HTMLElement): HTMLElement => within(composerIn(root)).getByRole('button', { name: BAR_NAME });
export const holdBarsIn = (root: HTMLElement): HTMLElement[] => within(root).queryAllByRole('button', { name: BAR_NAME });

/** The Talk sheet over the screen: the one already open, else the one the floating ? (the tutor's one door) opens about what is on screen (the Verse view's verse when it is open). */
async function talkSheet(): Promise<HTMLElement> {
  const open = document.querySelector<HTMLElement>('[role="dialog"][aria-label^="Talk about "], [role="dialog"][aria-labelledby]');
  const existing = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find((d) => /^Talk about /.test(d.getAttribute('aria-label') ?? d.textContent?.slice(0, 40) ?? ''));
  if (existing ?? open) {
    if (existing) return existing;
  }
  return openTutor({ sheet: /^Talk about / });
}

/** Types a question the way he does: the floating ?, Type a message, the words, Send. */
export async function typeQuestion(user: UserEvent, _root: HTMLElement, question: string): Promise<void> {
  const sheet = await talkSheet();
  await user.type(await messageBox(user, sheet), question);
  await user.click(within(composerIn(sheet)).getByRole('button', { name: 'Send' }));
}

/** The Talk sheet's text box (mw-06ggew.15: its input is the same Composer, opening on the bar), brought out by Type a message when the bar is showing. */
export async function messageBox(user: UserEvent, sheet: HTMLElement): Promise<HTMLTextAreaElement> {
  const open = within(sheet).queryByRole('textbox', { name: 'Your message' });
  if (open) return open as HTMLTextAreaElement;
  await user.click(within(sheet).getByRole('button', { name: 'Type a message' }));
  return within(sheet).getByRole('textbox', { name: 'Your message' }) as HTMLTextAreaElement;
}
