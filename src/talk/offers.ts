// src/talk/offers.ts — the offers a tutor answer holds for his tap (Send this to the makers, a setting change, the quiz goal) and what his
// spoken or typed yes, no or 'read it back' does to the newest one (mw-5r3p30.186). The decision is the grind's (`offer_reply` in the answer);
// the app only carries the offer to it (`pending_offer`) and does exactly what the tap does when the reply is confirm. The bridge (mw-1vuvq6.5) is one more: its
// button is Take me there, and what it does is open the idea's sheet over the talk. The Greek offer (mw-yrmkdf.4, greekOffer.ts) is the last: its tap opens the Greek word or
// the Greek view, and a no is written to the memory index.
import { useSyncExternalStore } from 'react';
import { liveBridge } from '../data/grammar/bridge';
import { levelsOf } from '../data/grammar/goalProgress';
import { ideaOf } from '../data/grammar/ladder';
import type { Level } from '../data/grammar/needs';
import { getTurn, listLevels, listTurnPictures, markBridgeChoice, markFeedbackSent, markGreekChoice, markFeedbackWithdrawn, markQuizGoalChoice, markRustyChoice, markSettingChoice, markTodayChoice, setQuizGoal, type TalkTurn } from '../data/repositories';
import type { Bridge } from '../data/db';
import { noteGreekNo } from '../data/repositories/memory';
import { RUSTY_BUTTON } from '../data/rusty';
import { takeGreekOffer } from './greekOffer';
import { takeRustyOffer } from './rustyOffer';
import { TODAY_BUTTON, takeTodayOffer } from './todayOffer';
import { sendToMakers } from './makers';
import { scopeTitle, type OfferReply, type PendingOffer, type TalkScope } from '../services/talk';
import { offeredChange, type ChangeResult } from '../settings/registry';
import { changeSettings } from '../tutor/registry';

/** What the bridge's button says: 'Take me there: Pairs of vowels', the idea it opens (the device's lowest unmet need, src/data/grammar/bridge.ts resolveBridge). */
export const bridgeButtonText = (bridge: Bridge): string => `Take me there: ${ideaOf(bridge.next).title}`;

/** The bridge a turn offers now: with `levels` (his grammar levels now), the ideas he has since taken up are left out, and none left means no offer (liveBridge, mw-1vuvq6.11);
 * without them, the bridge as the answer came. */
const bridgeOf = (turn: TalkTurn, levels?: ReadonlyMap<string, Level>): Bridge | undefined => (turn.bridge && levels ? liveBridge(turn.bridge, levels) : turn.bridge);

/** The offer a turn holds that no tap or word has settled, or undefined. A turn holds at most one that counts: the makers' first, then the setting, then the quiz goal, then the bridge, then the Greek (mw-yrmkdf.4), then the rust (mw-1vuvq6.6), then Today (mw-5r3p30.731).
 * With `levels`, a bridge to ideas he has taken up since is not one. */
export function offerOfTurn(turn: TalkTurn, levels?: ReadonlyMap<string, Level>): PendingOffer | undefined {
  if (turn.feedbackOffer && !turn.feedbackSent && !turn.feedbackWithdrawn) return { kind: 'feedback', text: turn.feedbackOffer };
  if (turn.settingOffer && !turn.settingChoice) {
    const change = offeredChange(turn.settingOffer);
    if (change) return { kind: 'setting', text: change.text };
  }
  if (turn.quizGoalOffer && !turn.quizGoalChoice) return { kind: 'quiz-goal', text: turn.quizGoalOffer };
  const bridge = bridgeOf(turn, levels);
  if (bridge && !turn.bridgeChoice) return { kind: 'bridge', text: bridgeButtonText(bridge) };
  if (turn.greekOffer && !turn.greekChoice) return { kind: 'greek', text: turn.greekOffer.text };
  if (turn.rustyOffer && !turn.rustyChoice) return { kind: 'rusty', text: RUSTY_BUTTON };
  if (turn.todayOffer && !turn.todayChoice) return { kind: 'today', text: TODAY_BUTTON };
  return undefined;
}

/** An offer whose button stays on screen after his tap (the bridge, the Greek, the rust, Today: a tap opens it again), so a yes to it does what the tap does (mw-1vuvq6.8). */
function takenOfferOf(turn: TalkTurn, levels?: ReadonlyMap<string, Level>): PendingOffer | undefined {
  const bridge = bridgeOf(turn, levels);
  if (bridge && turn.bridgeChoice === 'taken') return { kind: 'bridge', text: bridgeButtonText(bridge) };
  if (turn.greekOffer && turn.greekChoice === 'taken') return { kind: 'greek', text: turn.greekOffer.text };
  if (turn.rustyOffer && turn.rustyChoice === 'taken') return { kind: 'rusty', text: RUSTY_BUTTON };
  if (turn.todayOffer && turn.todayChoice === 'taken') return { kind: 'today', text: TODAY_BUTTON };
  return undefined;
}

/** True while `kind` is still the offer `turn` holds for a tap or a word: waiting, or taken with its button still there to open again. */
function stillOffered(turn: TalkTurn, kind: PendingOffer['kind']): boolean {
  return offerOfTurn(turn)?.kind === kind || takenOfferOf(turn)?.kind === kind;
}

/** The newest turn of a talk with an offer still waiting, with that offer. When none waits, the newest turn's offer he already took counts, if its button is
 * still there to open again (takenOfferOf). */
export function pendingOfferOf(turns: readonly TalkTurn[], levels?: ReadonlyMap<string, Level>): { turn: TalkTurn; offer: PendingOffer } | undefined {
  for (let i = turns.length - 1; i >= 0; i--) {
    const offer = offerOfTurn(turns[i], levels);
    if (offer) return { turn: turns[i], offer };
  }
  const newest = turns[turns.length - 1];
  const offer = newest && takenOfferOf(newest, levels);
  return offer ? { turn: newest, offer } : undefined;
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
 * A second call for the same turn while the first is in flight joins it: one grist, and both callers see how it ended; one after it
 * finished, or after he said no, finds the turn Sent or Not sent in the store and sends nothing. */
export function sendMakersOffer(turn: TalkTurn, scope: TalkScope): Promise<void> {
  const id = turn.id;
  if (!turn.feedbackOffer || id === undefined) return Promise.resolve();
  const running = sending.get(id);
  if (running) return running;
  const summary = turn.feedbackOffer;
  const send = (async () => {
    // The turn as kept now, not as the caller saw it: a spoken yes carries the turn it waited on when it was sent, and its answer may land after the tap's
    // send finished (mw-5r3p30.286). One offer reaches the makers once.
    const kept = await getTurn(id);
    if (kept?.feedbackSent || kept?.feedbackWithdrawn) return;
    // the pictures he attached in the talk go with it, as the kept turn holds them (mw-5r3p30.759)
    const pictures = await listTurnPictures(id);
    await sendToMakers({
      text: turn.q,
      summary,
      screen: scope.screen?.name ?? 'Reader',
      reference: scopeTitle(scope),
      facts: scope.screen?.facts,
      pictures: pictures.map((p) => ({ bytes: new Uint8Array(p.bytes), mime: p.mime, name: p.name })),
    });
    await markFeedbackSent(id);
  })().finally(() => {
    sending.delete(id);
    sendingChanged();
  });
  sending.set(id, send);
  sendingChanged();
  return send;
}

/** Makes the offered setting change as a tap on its button would: the set-setting command (src/tutor/registry.ts) checks and writes it, and the offer is taken only when it was applied. */
export async function takeSettingOffer(turn: TalkTurn): Promise<ChangeResult> {
  const result = await changeSettings(turn.settingOffer ? [turn.settingOffer] : []);
  if (turn.id !== undefined && result.applied.length > 0) await markSettingChoice(turn.id, 'taken');
  return result;
}

/** Which screen's host draws the idea sheet a bridge opened: the Talk sheet's, or the Verse view's answer cards. */
export type BridgeOwner = 'talk' | 'ask';
/** The idea sheet a bridge has open. Module state, not a component's, for the same reason as `sending`: his tap and his spoken yes do not know of each other, and the
 * second of them finds the sheet open and opens nothing more (mw-5r3p30.209). */
let bridgeOpen: { ideaId: string; owner: BridgeOwner } | undefined;
const bridgeListeners = new Set<() => void>();
const subscribeBridge = (listener: () => void): (() => void) => {
  bridgeListeners.add(listener);
  return () => bridgeListeners.delete(listener);
};

/** Opens the idea's sheet over the screen of `owner`; the idea already open there stays the one sheet. */
export function openBridgeIdea(ideaId: string, owner: BridgeOwner): void {
  if (bridgeOpen?.ideaId === ideaId && bridgeOpen.owner === owner) return;
  bridgeOpen = { ideaId, owner };
  bridgeListeners.forEach((listener) => listener());
}

/** Closes the bridge's idea sheet: Done, Back, or its screen going away (then only the sheet that screen drew: `owner`). */
export function closeBridgeIdea(owner?: BridgeOwner): void {
  if (!bridgeOpen || (owner && bridgeOpen.owner !== owner)) return;
  bridgeOpen = undefined;
  bridgeListeners.forEach((listener) => listener());
}

/** The id of the idea whose sheet the bridge has open over `owner`'s screen, or undefined. */
export function useBridgeIdea(owner: BridgeOwner): string | undefined {
  const open = useSyncExternalStore(subscribeBridge, () => bridgeOpen);
  return open?.owner === owner ? open.ideaId : undefined;
}

/** Takes the turn's bridge as its button's tap does: the sheet of the idea it names opens over the talk, and the offer is taken (it stays on screen to open again). */
export async function takeBridgeOffer(turn: TalkTurn): Promise<void> {
  // the idea it opens is the one the button names now (liveBridge): not one he has learned since; none left, nothing to open
  const bridge = turn.bridge && liveBridge(turn.bridge, levelsOf(await listLevels()));
  if (!bridge) return;
  openBridgeIdea(bridge.next, 'talk');
  if (turn.id !== undefined && !turn.bridgeChoice) await markBridgeChoice(turn.id, 'taken');
}

/** What the spoken reply did, for the turn that carried it: the setting changes it made and the sentences for what could not be done. */
export interface OfferOutcome {
  applied: ChangeResult['applied'];
  refused: string[];
}

/** Does what `reply` says to the waiting offer: confirm does what its tap does, decline withdraws it and sends nothing, read_back changes nothing (the tutor's answer
 * speaks the text and the offer stays). A step that cannot be done is said in `refused` and the offer stays, so its button is still there. */
export async function settleOffer(reply: OfferReply | undefined, waiting: { turn: TalkTurn; offer: PendingOffer } | undefined, scope: TalkScope, when: number = Date.now()): Promise<OfferOutcome> {
  const outcome: OfferOutcome = { applied: [], refused: [] };
  if (!reply || !waiting || reply === 'read_back') return outcome;
  const { offer } = waiting;
  const id = waiting.turn.id;
  if (id === undefined) return outcome;
  // The turn as kept now, not as it was when his words were sent: his tap on the button may have settled the offer while the reply was on its way (mw-5r3p30.328),
  // and then the reply does nothing a second time and withdraws nothing he took. A feedback offer being sent right now is still open here, and joins that send.
  const turn = await getTurn(id);
  if (!turn || !stillOffered(turn, offer.kind)) return outcome;
  if (reply === 'decline') {
    if (offer.kind === 'feedback') await markFeedbackWithdrawn(id);
    else if (offer.kind === 'setting') await markSettingChoice(id, 'declined');
    else if (offer.kind === 'bridge') await markBridgeChoice(id, 'declined');
    else if (offer.kind === 'rusty') await markRustyChoice(id, 'declined');
    else if (offer.kind === 'today') await markTodayChoice(id, 'declined');
    else if (offer.kind === 'greek') {
      // his no is kept in the index so the tutor offers the Greek no more until he asks for it himself
      await markGreekChoice(id, 'declined');
      await noteGreekNo(when);
    }
    else await markQuizGoalChoice(id, 'declined');
    return outcome;
  }
  try {
    if (offer.kind === 'feedback') await sendMakersOffer(turn, scope);
    else if (offer.kind === 'setting') Object.assign(outcome, await takeSettingOffer(turn));
    else if (offer.kind === 'bridge') await takeBridgeOffer(turn);
    else if (offer.kind === 'greek') await takeGreekOffer(turn);
    else if (offer.kind === 'rusty') await takeRustyOffer(turn);
    else if (offer.kind === 'today') await takeTodayOffer(turn);
    else {
      await setQuizGoal(offer.text);
      await markQuizGoalChoice(id, 'kept');
    }
  } catch (err) {
    outcome.refused.push(`${offer.text} was not done: ${err instanceof Error ? err.message : 'something went wrong'}. The button is still there.`);
  }
  return outcome;
}
