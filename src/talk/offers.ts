// src/talk/offers.ts — the offers a tutor answer holds for his tap (Send this to the makers, a setting change, the quiz goal) and what his
// spoken or typed yes, no or 'read it back' does to the newest one (mw-5r3p30.186). The decision is the grind's (`offer_reply` in the answer);
// the app only carries the offer to it (`pending_offer`) and does exactly what the tap does when the reply is confirm.
import { markFeedbackSent, markFeedbackWithdrawn, markQuizGoalChoice, markSettingChoice, setQuizGoal, type TalkTurn } from '../data/repositories';
import { buildTutorAskRequest, submitFeedback } from '../services/feedback';
import { scopeTitle, type OfferReply, type PendingOffer, type TalkScope } from '../services/talk';
import { applyChanges, offeredChange, type ChangeResult } from '../settings/registry';

/** The offer a turn holds that no tap or word has settled, or undefined. A turn holds at most one that counts: the makers' first, then the setting, then the quiz goal. */
export function offerOfTurn(turn: TalkTurn): PendingOffer | undefined {
  if (turn.feedbackOffer && !turn.feedbackSent && !turn.feedbackWithdrawn) return { kind: 'feedback', text: turn.feedbackOffer };
  if (turn.settingOffer && !turn.settingChoice) {
    const change = offeredChange(turn.settingOffer);
    if (change) return { kind: 'setting', text: change.text };
  }
  if (turn.quizGoalOffer && !turn.quizGoalChoice) return { kind: 'quiz-goal', text: turn.quizGoalOffer };
  return undefined;
}

/** The newest turn of a talk with an offer still waiting, with that offer. */
export function pendingOfferOf(turns: readonly TalkTurn[]): { turn: TalkTurn; offer: PendingOffer } | undefined {
  for (let i = turns.length - 1; i >= 0; i--) {
    const offer = offerOfTurn(turns[i]);
    if (offer) return { turn: turns[i], offer };
  }
  return undefined;
}

/** Sends the turn's feedback offer through the one sender and marks it Sent. Shared by the button's tap and a spoken yes. Throws a TutorError. */
export async function sendMakersOffer(turn: TalkTurn, scope: TalkScope): Promise<void> {
  if (!turn.feedbackOffer || turn.id === undefined) return;
  await submitFeedback(
    buildTutorAskRequest({ text: turn.q, summary: turn.feedbackOffer, screen: scope.screen?.name ?? 'Reader', reference: scopeTitle(scope), facts: scope.screen?.facts }),
  );
  await markFeedbackSent(turn.id);
}

/** Makes the offered setting change as a tap on its button would: the registry checks and writes it, and the offer is taken only when it was applied. */
export async function takeSettingOffer(turn: TalkTurn): Promise<ChangeResult> {
  const result = await applyChanges(turn.settingOffer ? [turn.settingOffer] : []);
  if (turn.id !== undefined && result.applied.length > 0) await markSettingChoice(turn.id, 'taken');
  return result;
}

/** What the spoken reply did, for the turn that carried it: the setting changes it made and the sentences for what could not be done. */
export interface OfferOutcome {
  applied: ChangeResult['applied'];
  refused: string[];
}

/** Does what `reply` says to the waiting offer: confirm does what its tap does, decline withdraws it and sends nothing, read_back changes nothing (the tutor's answer
 * speaks the text and the offer stays). A step that cannot be done is said in `refused` and the offer stays, so its button is still there. */
export async function settleOffer(reply: OfferReply | undefined, waiting: { turn: TalkTurn; offer: PendingOffer } | undefined, scope: TalkScope): Promise<OfferOutcome> {
  const outcome: OfferOutcome = { applied: [], refused: [] };
  if (!reply || !waiting || reply === 'read_back') return outcome;
  const { turn, offer } = waiting;
  const id = turn.id;
  if (id === undefined) return outcome;
  if (reply === 'decline') {
    if (offer.kind === 'feedback') await markFeedbackWithdrawn(id);
    else if (offer.kind === 'setting') await markSettingChoice(id, 'declined');
    else await markQuizGoalChoice(id, 'declined');
    return outcome;
  }
  try {
    if (offer.kind === 'feedback') await sendMakersOffer(turn, scope);
    else if (offer.kind === 'setting') Object.assign(outcome, await takeSettingOffer(turn));
    else {
      await setQuizGoal(offer.text);
      await markQuizGoalChoice(id, 'kept');
    }
  } catch (err) {
    outcome.refused.push(`${offer.text} was not done: ${err instanceof Error ? err.message : 'something went wrong'}. The button is still there.`);
  }
  return outcome;
}
