// src/talk/TodayOffer.tsx — the tutor's offer to open Today, on screen (mw-5r3p30.731, docs/ask-tutor.md 'Today'): under an answer that named the day's drill, the button
// 'Open today's drill'. A tap is takeTodayOffer, what a spoken yes does too. After his no there is nothing here.
import type { TalkTurn } from '../data/db';
import { TODAY_BUTTON, takeTodayOffer } from './todayOffer';

export function TodayOffer({ turn }: { turn: TalkTurn }) {
  if (!turn.todayOffer || turn.todayChoice === 'declined') return null;
  return (
    <div data-today-offer className="mt-2 border-t border-line pt-2">
      <button
        type="button"
        onClick={() => void takeTodayOffer(turn)}
        className="min-h-11 rounded-lg border border-accent px-4 text-left text-base font-medium text-accent active:bg-line"
      >
        {TODAY_BUTTON}
      </button>
    </div>
  );
}
