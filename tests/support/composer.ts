// tests/support/composer.ts — finds the parts of bsv-kit's Composer (the Verse view's Ask the tutor) the way a person does: by what they say.
import { within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Every word the bar can show: its name changes with the hold. */
const BAR_NAME = /^(Hold to ask|Release to send|Starting the mic…|Let go to keep it unsent)$/;

export const composerIn = (root: HTMLElement): HTMLElement => within(root).getByTestId('composer');
export const holdBarIn = (root: HTMLElement): HTMLElement => within(composerIn(root)).getByRole('button', { name: BAR_NAME });
export const holdBarsIn = (root: HTMLElement): HTMLElement[] => within(root).queryAllByRole('button', { name: BAR_NAME });

/** The text box of the composer, brought out by Type a question when the bar is showing. */
export async function questionField(user: UserEvent, root: HTMLElement): Promise<HTMLElement> {
  const composer = composerIn(root);
  const open = within(composer).queryByRole('textbox', { name: 'Your question' });
  if (open) return open;
  await user.click(within(composer).getByRole('button', { name: 'Type a question' }));
  return within(composer).getByRole('textbox', { name: 'Your question' });
}

/** Types a question the way he does: Type a question, the words, Send. */
export async function typeQuestion(user: UserEvent, root: HTMLElement, question: string): Promise<void> {
  const field = await questionField(user, root);
  await user.type(field, question);
  await user.click(within(composerIn(root)).getByRole('button', { name: 'Send' }));
}
