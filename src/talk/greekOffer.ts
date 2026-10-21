// src/talk/greekOffer.ts — the tutor's gentle offer of the Greek (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'). To a reader whose Reader is in English and who is not
// learning the Greek the tutor answers in English and, on real interest in the original, leaves ONE `greek_offer` {kind word | view, text, lemma?}: a button that opens the
// Greek word's sheet or switches the Reader to Greek. The grind asks for at most one a talk and none after his no; the app keeps to that too (greekOfferOf), so a tutor that
// forgets still offers once, and once only. His no is written to the memory index by settleOffer (src/talk/offers.ts); `greek_asked` clears it (src/talk/memoryUpdate.ts).
import { findGreekWord } from '../data/answerWord';
import type { GreekOffer, TalkTurn } from '../data/db';
import { markGreekChoice, raiseGreekInterest, setReaderView, setWeave } from '../data/repositories';
import { hasGreekNo } from '../data/repositories/memory';
import type { TalkAnswer, TalkScope } from '../services/talk';

/** The offer of an answer that the app keeps, or undefined: none when the answer has none, when this talk has made one already (the history shows it), when his no is in the
 * memory index (or is this very answer's `offer_reply`), or for a word the text of this talk does not have (a button that could not open its sheet). */
export function greekOfferOf(answer: TalkAnswer, scope: TalkScope, turns: readonly Pick<TalkTurn, 'greekOffer'>[], indexText: string | undefined, declinedNow = false): GreekOffer | undefined {
  const offer = answer.greek_offer;
  // an offer belongs to a talk about the text, for a reader whose Reader the request named: not a quiz, not a talk from a screen; the welcome (mw-yrmkdf.3) is the one
  // talk from a screen that may make it, once, for a reader who says he is here to learn the Greek
  if (!offer || scope.quiz || (scope.screen && !scope.welcome)) return undefined;
  if (scope.welcome && offer.kind !== 'view') return undefined;
  if (declinedNow || turns.some((t) => t.greekOffer) || hasGreekNo(indexText ?? '')) return undefined;
  if (offer.kind === 'word' && !(offer.lemma && findGreekWord(scope, { greek: offer.lemma, lemma: offer.lemma, note: '' }))) return undefined;
  // in the welcome, taking the Greek view also turns the Weave on
  return scope.welcome ? { ...offer, weave: true } : offer;
}

// The Talk sheet that is open opens the Greek word a tap or a spoken yes asked for. Module state, not a component's, because the two paths do not know of each other
// nor of the sheet's word sheet: the sheet registers how to open a word (registerGreekWordOpener) and the offer calls it.
let opener: ((lemma: string) => void) | undefined;

/** Registers how the open Talk sheet opens a word's sheet; returns what takes it back (the sheet closing). */
export function registerGreekWordOpener(open: (lemma: string) => void): () => void {
  opener = open;
  return () => {
    if (opener === open) opener = undefined;
  };
}

/** Asks the open Talk sheet to open the word's sheet; nothing when no sheet is open. */
export const requestGreekWord = (lemma: string): void => opener?.(lemma);

/** Takes the turn's offer as its button's tap does: a view offer switches the Reader to Greek, a word offer asks the Talk sheet to open the word; the offer is taken. */
export async function takeGreekOffer(turn: TalkTurn): Promise<void> {
  const offer = turn.greekOffer;
  if (!offer) return;
  // his tap is his yes to the Greek: the Greek dial rises to the step that shows what the offer opens (Curious for the Greek view or a word, Dipping a toe with the Weave)
  if (offer.kind === 'view') {
    await raiseGreekInterest(offer.weave ? 2 : 1);
    await setReaderView('greek');
    if (offer.weave) await setWeave('solid+learning');
  } else if (offer.lemma) {
    await raiseGreekInterest(1);
    requestGreekWord(offer.lemma);
  }
  if (turn.id !== undefined && !turn.greekChoice) await markGreekChoice(turn.id, 'taken');
}
