// features/steps/start-quiz.ts — the one step 'he starts the quiz on the passage' (mw-indx1x6.38), shared by study-way and quiz-goal: a tap on the passage's heading, the Verse view's
// Practise, Quiz and Start the quiz, and the wait for the Quiz sheet. A role query over the Reader (for a button of the Verse view, or for a dialog on `screen`) works out the
// name of every element behind it, ~1 s a call at load 17, so the step took 3.4 to 4.6 s; every look here is a plain query on a label or an attribute (tests/support/find-button.ts,
// open-tutor.ts queryTalkSheet). tests/unit/step-quiz-start.test.ts holds the step files to it.
import { waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { findButton } from '../../tests/support/find-button';
import { talkSheet } from './open-tutor';

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** The Quiz sheet of a passage ('Quiz on Romans 8:1-11'); throws while none is open, so a waitFor around a read of it waits for the sheet. */
export const quizSheet = (): HTMLElement => talkSheet(/^Quiz on /);

/** He taps the passage heading `heading` of the open chapter, then Practise, Quiz and Start the quiz in its Verse view, and the Quiz sheet is up. */
export async function startQuiz(user: UserEvent, heading: string): Promise<HTMLElement> {
  const h = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((x) => squash(x.textContent) === heading);
  if (!h) throw new Error(`no heading ${heading}`);
  // a heading holds one button: a role query inside it is small
  await user.click(within(h).getByRole('button'));
  await waitFor(() => {
    if (!document.querySelector('[data-verse-view]')) throw new Error('the Verse view is not open');
  });
  for (const name of ['Practise', 'Quiz', 'Start the quiz']) await user.click(await findButton(name));
  return waitFor(() => quizSheet());
}
