// src/talk/offers.ts — the offers a tutor answer holds for his tap (Send this to the makers, a setting change, the quiz goal) and what his
// spoken or typed yes, no or 'read it back' does to the newest one (mw-5r3p30.186). The decision is the grind's (`offer_reply` in the answer);
// the app only carries the offer to it (`pending_offer`) and does exactly what the tap does when the reply is confirm.
import { useSyncExternalStore } from 'react';
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

/** The turns whose feedback offer is being sent right now, by either path (the tap or a spoken yes), with the one send each. Module state, not a component's,
 * because the two paths do not know of each other (mw-5r3p30.209). */
const sending = new Map<number, Promise<void>>();
const sendingListeners = new Set<() => void>();
let sendingTurns: readonly number[] = [];
function sendingChanged(): void {
  sendingTurns = Array.from(sending.keys());
  sendingListeners.forEach((listener) => listener());
}
const subscribeSending = (listener: () => void): (() => void) => {
  sendingListeners.add(listener);
  return () => sendingListeners.delete(listener);
};

/** True while the turn's feedback offer is being sent, by his tap or his spoken yes: its button is then off. */
export function useOfferSending(turnId: number | undefined): boolean {
  const turns = useSyncExternalStore(subscribeSending, () => sendingTurns);
  return turnId !== undefined && turns.includes(turnId);
}

/** Sends the turn's feedback offer through the one sender and marks it Sent. Shared by the button's tap and a spoken yes. Throws a TutorError.
 * A second call for the same turn while the first is in flight joins it: one grist, and both callers see how it ended. */
export function sendMakersOffer(turn: TalkTurn, scope: TalkScope): Promise<void> {
  const id = turn.id;
  if (!turn.feedbackOffer || id === undefined) return Promise.resolve();
  const running = sending.get(id);
  if (running) return running;
  const summary = turn.feedbackOffer;
  const send = (async () => {
    await submitFeedback(
      buildTutorAskRequest({ text: turn.q, summary, screen: scope.screen?.name ?? 'Reader', reference: scopeTitle(scope), facts: scope.screen?.facts }),
    );
    await markFeedbackSent(id);
  })().finally(() => {
    sending.delete(id);
    sendingChanged();
  });
  sending.set(id, send);
  sendingChanged();
  return send;
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
