// src/talk/GreekOfferButton.tsx — the tutor's one offer of the Greek on screen (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'): under an English answer, one line as a button.
// A tap raises the Greek dial one step and, for a word offer, opens the Greek word's sheet over the talk (src/talk/greekOffer.ts takeGreekOffer, the function a spoken yes calls too). After his no
// there is nothing here: the tutor remembers it.
import type { GreekOffer, TalkTurn } from '../data/db';
import { GREEK_LEVELS } from '../settings/definitions/greekInterest';
import { takeGreekOffer } from './greekOffer';

/** What the sheet says after the tap: the step the dial now stands at, and for a word offer that its sheet opened. */
const confirmation = (offer: GreekOffer): string => {
  const step = offer.to === undefined ? 'The Greek dial is up one step.' : `The Greek dial is now ${GREEK_LEVELS[offer.to].name}.`;
  return offer.kind === 'word' ? `${step} Opened the Greek word.` : step;
};

export function GreekOfferButton({ turn }: { turn: TalkTurn }) {
  if (!turn.greekOffer || turn.greekChoice === 'declined') return null;
  return (
    <div data-greek-offer className="mt-2 border-t border-line pt-2">
      <button
        type="button"
        onClick={() => void takeGreekOffer(turn)}
        className="min-h-11 rounded-lg border border-accent px-4 text-left text-base font-medium text-accent active:bg-line"
      >
        {turn.greekOffer.text}
      </button>
      {turn.greekChoice === 'taken' && (
        <p role="status" aria-label="Greek offer" className="mt-2 text-sm text-muted">
          {confirmation(turn.greekOffer)}
        </p>
      )}
    </div>
  );
}
