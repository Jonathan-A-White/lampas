// src/talk/RustyOffer.tsx — the tutor's offer to move the rust back, on screen (mw-1vuvq6.6, docs/ask-tutor.md 'Rust'): under an answer that names what has gone rusty, the items
// with the titles the app gave them and the button 'Move back to Frontier and practise'. A tap is takeRustyOffer, what a spoken yes does too. After his no there is nothing here.
import type { TalkTurn } from '../data/db';
import { RUSTY_BUTTON } from '../data/rusty';
import { takeRustyOffer } from './rustyOffer';

export function RustyOffer({ turn }: { turn: TalkTurn }) {
  if (!turn.rustyOffer || turn.rustyChoice === 'declined') return null;
  return (
    <div data-rusty-offer className="mt-2 border-t border-line pt-2">
      <ul data-rusty-items className="flex flex-wrap items-baseline gap-x-4 text-lg">
        {turn.rustyOffer.items.map((item) => (
          <li key={`${item.kind}:${item.id}`} lang={item.kind === 'word' ? 'grc' : undefined} className={item.kind === 'word' ? 'font-greek text-[length:var(--lp-greek-size)]' : undefined}>
            {item.title}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void takeRustyOffer(turn)}
        className="mt-1 min-h-11 rounded-lg border border-accent px-4 text-left text-base font-medium text-accent active:bg-line"
      >
        {RUSTY_BUTTON}
      </button>
    </div>
  );
}
