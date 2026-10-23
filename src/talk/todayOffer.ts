// src/talk/todayOffer.ts — the tutor's offer to open Today (mw-5r3p30.731, docs/ask-tutor.md 'Today'). When the request carried `today` and he asked what is on his drill, the tutor names the items
// and answers `today_offer: true`; the app keeps it only when the request listed items (todayOfferOf), draws 'Open today's drill' (TodayOffer.tsx) and, on his tap or his spoken yes
// (`pending_offer` of kind today, settleOffer), closes the Talk sheet and opens Today (takeTodayOffer). Nothing opens without one of those.
import type { TalkTurn } from '../data/db';
import type { TodayItem } from '../data/learnerToday';
import { markTodayChoice } from '../data/repositories';
import { navigate } from '../nav/route';
import type { TalkAnswer, TalkScope } from '../services/talk';
import { leaveTalk } from './rustyOffer';

/** What the offer's button says. */
export const TODAY_BUTTON = "Open today's drill";

/** Whether the answer's offer to open Today is kept: not when the answer has none, when the request listed no items, in a quiz, when this talk has made one already, or when his words just declined one. */
export function todayOfferOf(answer: TalkAnswer, scope: TalkScope, turns: readonly Pick<TalkTurn, 'todayOffer'>[], today: readonly TodayItem[] | undefined, declinedNow = false): boolean {
  return answer.today_offer === true && !!today && today.length > 0 && !scope.quiz && !declinedNow && !turns.some((t) => t.todayOffer);
}

/** Takes the turn's offer as its button's tap does: the Talk sheet closes and Today opens; the offer is taken (its button stays to open Today again). */
export async function takeTodayOffer(turn: TalkTurn): Promise<void> {
  if (!turn.todayOffer) return;
  if (turn.id !== undefined && !turn.todayChoice) await markTodayChoice(turn.id, 'taken');
  leaveTalk();
  navigate('today');
}
