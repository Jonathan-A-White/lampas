// src/talk/makers.ts — the one way anything in a tutor talk reaches the makers (mw-5r3p30.760): the tutor's own offer (offers.ts sendMakersOffer) and the
// 'Send to the makers' action he can take at any time, in the Talk sheet and in the Verse view's Ask, all call sendToMakers, which is submitFeedback with a
// tutor-ask request (src/services/feedback.ts) and the pictures as the grist's files.
import { buildTutorAskRequest, MAX_SUMMARY, submitFeedback, type FeedbackFact } from '../services/feedback';
import { FAILURE_TITLES, TutorError } from '../services/tutor';
import { filesOf, type OutgoingPicture } from './pictures';

/** What goes to the makers from a tutor talk: his words, a one-line summary, the screen he is on, what the talk is about, what the screen showed and the pictures he attached. */
export interface MakersSend {
  text: string;
  summary: string;
  screen: string;
  reference: string;
  facts?: FeedbackFact[];
  pictures?: readonly OutgoingPicture[];
}

/** The action's name on the screen. */
export const SEND_TO_MAKERS = 'Send to the makers';

/** A failed send as the Composer shows it (it shows an Error's message and keeps the words and pictures in the box). */
export function failureLine(err: unknown): string {
  if (err instanceof TutorError) return `${FAILURE_TITLES[err.failure]}: ${err.message}`;
  return err instanceof Error ? err.message : 'Something went wrong.';
}

/** What he sends with pictures alone says. */
export const PICTURES_FOR_THE_MAKERS = 'See the pictures.';

/** The line Your requests keeps for a request he sent himself: the talk's kept summary when it has one, else his words, cut to a line the request allows. */
export function makersSummary(words: string, kept?: string): string {
  const line = (kept?.trim() || words).replace(/\s+/g, ' ').trim() || PICTURES_FOR_THE_MAKERS;
  return line.length <= MAX_SUMMARY ? line : `${line.slice(0, MAX_SUMMARY - 1).trimEnd()}…`;
}

/** Sends the request through the one sender and keeps it in Your requests. Throws a TutorError. */
export async function sendToMakers(ask: MakersSend): Promise<void> {
  const { pictures = [], ...request } = ask;
  await submitFeedback(buildTutorAskRequest(request), { files: filesOf([...pictures]) });
}
