// src/talk/makers.ts — the one way anything in a tutor talk reaches the makers (mw-5r3p30.760): the tutor's own offer (offers.ts sendMakersOffer, taken by his tap or his yes)
// calls sendToMakers, which is submitFeedback with a tutor-ask request (src/services/feedback.ts) and the pictures as the grist's files. There is no standing button (mw-5r3p30.844).
import { buildTutorAskRequest, submitFeedback, type FeedbackFact } from '../services/feedback';
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

/** Sends the request through the one sender and keeps it in Your requests. Throws a TutorError. */
export async function sendToMakers(ask: MakersSend): Promise<void> {
  const { pictures = [], ...request } = ask;
  await submitFeedback(buildTutorAskRequest(request), { files: filesOf([...pictures]) });
}
