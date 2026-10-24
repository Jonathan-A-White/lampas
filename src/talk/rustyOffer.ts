// src/talk/rustyOffer.ts — the tutor's offer to move the rust back to Frontier (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'). When the request carried `rusty` and it fits the talk, the
// tutor says so once and answers with `rusty_offer`; the app keeps only the items it listed itself (rustyOfferOf), draws 'Move back to Frontier and practise' (RustyOffer.tsx) and,
// on his tap or his spoken yes (`pending_offer` of kind rusty), moves them to Frontier and opens their practice in Review (takeRustyOffer). Nothing moves without one of those.
import type { RustyOffer, TalkTurn } from '../data/db';
import { markRustyChoice } from '../data/repositories';
import type { RustyItem } from '../data/rusty';
import type { TalkAnswer, TalkScope } from '../services/talk';
import { bibleTalkRegistry } from '../tutor/registry';

export { leaveTalk, registerTalkLeave } from './leave';

/** The offer of an answer that the app keeps, or undefined: none when the answer has none, in a quiz, when this talk has made one already (the tutor names rust once a talk), when his
 * words just declined one, or when it names nothing the request listed. The items are the request's own, in its order (worst first), with its titles; the tutor never adds one. */
export function rustyOfferOf(answer: TalkAnswer, scope: TalkScope, turns: readonly Pick<TalkTurn, 'rustyOffer'>[], rusty: readonly RustyItem[] | undefined, declinedNow = false): RustyOffer | undefined {
  const offer = answer.rusty_offer;
  if (!offer || !rusty || scope.quiz || declinedNow || turns.some((t) => t.rustyOffer)) return undefined;
  const items = rusty.filter((r) => offer.items.some((i) => i.kind === r.kind && i.id === r.id)).map(({ kind, id, title }) => ({ kind, id, title }));
  return items.length > 0 ? { items } : undefined;
}

/** Takes the turn's offer as its button's tap does: the start-review command (src/tutor/registry.ts) moves the items that are still solid to Frontier, closes the sheet and opens a round of just those in Review; the offer is taken. */
export async function takeRustyOffer(turn: TalkTurn): Promise<void> {
  const offer = turn.rustyOffer;
  if (!offer) return;
  const ran = await bibleTalkRegistry().run('start-review', { items: offer.items.map(({ kind, id }) => ({ kind, id })) });
  if (!ran.ok) throw new Error(ran.why);
  if (turn.id !== undefined && !turn.rustyChoice) await markRustyChoice(turn.id, 'taken');
}
