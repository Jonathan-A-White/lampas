// src/talk/rustyOffer.ts — the tutor's offer to move the rust back to Frontier (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'). When the request carried `rusty` and it fits the talk, the
// tutor says so once and answers with `rusty_offer`; the app keeps only the items it listed itself (rustyOfferOf), draws 'Move back to Frontier and practise' (RustyOffer.tsx) and,
// on his tap or his spoken yes (`pending_offer` of kind rusty), moves them to Frontier and opens their practice in Review (takeRustyOffer). Nothing moves without one of those.
import type { RustyOffer, TalkTurn } from '../data/db';
import { markRustyChoice, moveToFrontier } from '../data/repositories';
import type { RustyItem } from '../data/rusty';
import { navigate } from '../nav/route';
import { setPractise } from '../review/practise';
import type { TalkAnswer, TalkScope } from '../services/talk';

/** The offer of an answer that the app keeps, or undefined: none when the answer has none, in a quiz, when this talk has made one already (the tutor names rust once a talk), when his
 * words just declined one, or when it names nothing the request listed. The items are the request's own, in its order (worst first), with its titles; the tutor never adds one. */
export function rustyOfferOf(answer: TalkAnswer, scope: TalkScope, turns: readonly Pick<TalkTurn, 'rustyOffer'>[], rusty: readonly RustyItem[] | undefined, declinedNow = false): RustyOffer | undefined {
  const offer = answer.rusty_offer;
  if (!offer || !rusty || scope.quiz || declinedNow || turns.some((t) => t.rustyOffer)) return undefined;
  const items = rusty.filter((r) => offer.items.some((i) => i.kind === r.kind && i.id === r.id)).map(({ kind, id, title }) => ({ kind, id, title }));
  return items.length > 0 ? { items } : undefined;
}

// The Talk sheet that is open closes itself when the offer is taken, by a tap or a spoken yes: Review opens beneath it. Module state, because the spoken yes does not know the sheet.
let leave: (() => void) | undefined;

/** Registers how the open Talk sheet closes; returns what takes it back (the sheet closing). */
export function registerTalkLeave(close: () => void): () => void {
  leave = close;
  return () => {
    if (leave === close) leave = undefined;
  };
}

/** Closes the open Talk sheet, if one registered how: an offer taken from a talk opens a screen beneath it. */
export function leaveTalk(): void {
  leave?.();
}

/** Takes the turn's offer as its button's tap does: the items that are still solid move to Frontier, the sheet closes and Review opens a round of just those; the offer is taken. */
export async function takeRustyOffer(turn: TalkTurn): Promise<void> {
  const offer = turn.rustyOffer;
  if (!offer) return;
  const items = offer.items.map(({ kind, id }) => ({ kind, id }));
  await moveToFrontier(items);
  if (turn.id !== undefined && !turn.rustyChoice) await markRustyChoice(turn.id, 'taken');
  setPractise(items);
  leave?.();
  navigate('review');
}
