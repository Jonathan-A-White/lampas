// src/talk/GreekOfferButton.tsx — the tutor's one offer of the Greek on screen (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'): under an English answer, one line as a button.
// A tap opens the Greek word's sheet over the talk or switches the Reader to Greek (src/talk/greekOffer.ts takeGreekOffer, the function a spoken yes calls too). After his no
// there is nothing here: the tutor remembers it.
import type { TalkTurn } from '../data/db';
import { takeGreekOffer } from './greekOffer';

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
    </div>
  );
}
