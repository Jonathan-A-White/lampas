// features/steps/ask-verse.ts — the one step 'he asks the tutor about verse 28' (mw-indx1x6.30), shared by the features whose tutor answers with links (tutor-links, tutor-works,
// tutor-copy): a tap on the verse's number, the Verse view, the floating ?, the question, Send, and the wait for the answered turn. vitest-cucumber gives the step one 20 s test, and a
// step failed by that timeout goes on running into the steps after it, so everything here waits on the Talk sheet's own state and looks for the sheet beside its own markup: no role query
// on `screen` (it works out the role and name of every element of the Reader behind the sheet, seconds a call under load) and no key-by-key typing (a render of the sheet for each key).
// tests/unit/step-ask-about-verse.test.ts holds the step files to it.
import { waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { findButton } from '../../tests/support/find-button';
import { openTutor, queryTalkSheet, talkSheet } from './open-tutor';

/** The Talk sheet of a verse or a chapter ('Talk about Romans 8:28'), as its title names it. */
const TALK_ABOUT = /^Talk about /;

/** The open Talk sheet about a verse or chapter; throws while none is open, so a waitFor around a read of it waits for the sheet. */
export const verseTalk = (): HTMLElement => talkSheet(TALK_ABOUT);

/** True while a Talk sheet about a verse or chapter is open. */
export const verseTalkOpen = (): boolean => queryTalkSheet(TALK_ABOUT) !== null;

/**
 * The newest answered turn of the open Talk sheet, once the sheet has settled: throws while no sheet is open, while the question is still shown waiting for its answer
 * (src/Talk.tsx data-talk-pending) and while no turn with an answer is kept, so `waitFor(() => answeredTurn())` waits for the answer and a read inside a waitFor never sees half a sheet.
 */
export function answeredTurn(): HTMLElement {
  const sheet = verseTalk();
  if (sheet.querySelector('[data-talk-pending]')) throw new Error('the question is still waiting for its answer');
  const turn = [...sheet.querySelectorAll<HTMLElement>('[data-turn]')].pop();
  if (!turn?.querySelector('[data-talk-a]')) throw new Error('the Talk sheet holds no answered turn');
  return turn;
}

/**
 * He taps verse `n` of the open chapter, opens the tutor from its Verse view, puts `text` in and sends it. Resolves with the answered turn, once the sheet has settled on it.
 */
export async function askAboutVerse(user: UserEvent, n: number, text: string): Promise<HTMLElement> {
  // findButton, not a role query: a role query walks every word of the chapter (1.6 s calm, a multiple under load; mw-yrz5b8z)
  await user.click(await findButton(`Verse ${n}`));
  // the ? asks about what is open, so the Verse view must be up first (a plain query on its own attribute)
  await waitFor(() => {
    if (!document.querySelector('[data-verse-view]')) throw new Error('the Verse view is not open');
  });
  // openTutor waits for the Verse view's ? and for the Talk sheet and returns it (mw-lcv9z3g.13)
  const talk = await openTutor();
  // the sheet's own field, looked for inside the sheet alone and waited for: the sheet can be up a moment before its composer is drawn
  const message = await within(talk).findByRole('textbox', { name: 'Your message' });
  // one paste, not a render per key
  await user.click(message);
  await user.paste(text);
  await user.click(within(talk).getByRole('button', { name: 'Send' }));
  return waitFor(() => answeredTurn());
}
