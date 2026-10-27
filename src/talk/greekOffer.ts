// src/talk/greekOffer.ts — the tutor's gentle offer of the original, the Greek or (mw-gdcyf98.17) the Hebrew (mw-yrmkdf.4, docs/ask-tutor.md 'The Greek offer'). The offer's `lang` ('grc', the default, 'he', or 'both' in the welcome)
// names the dial it raises: the chapter's language picks it (Hebrew on an Old Testament chapter, Greek on a New Testament one). The request carries the Greek dial (greek_interest, mw-3ased2.3):
// at Just English the tutor offers nothing unless asked, and on real interest in the original he leaves ONE `greek_offer` {kind word | view, text, lemma?}: a button that raises the
// dial ONE step (greekOfferOf stamps the step it names as `to`), a word offer then opening the Greek word's sheet. The grind asks for at most one a talk and none after his no; the app keeps to that too (greekOfferOf), so a tutor that
// forgets still offers once, and once only. His no is written to the memory index by settleOffer (src/talk/offers.ts); `greek_asked` clears it (src/talk/memoryUpdate.ts).
import { findGreekWord } from '../data/answerWord';
import { sourceLanguage } from '../data/chapter';
import type { GreekOffer, OfferLang, TalkTurn } from '../data/db';
import { getGreekInterest, getHebrewInterest, markGreekChoice, raiseGreekInterest, raiseHebrewInterest } from '../data/repositories';
import { hasOfferNo, type NoLang } from '../data/repositories/memory';
import { GREEK_TOP, greekLevelOf, type GreekLevel } from '../settings/definitions/greekInterest';
import { hebrewLevelOf } from '../settings/definitions/hebrewInterest';
import type { TalkAnswer, TalkScope } from '../services/talk';

/** The language an offer is of: 'grc' when it names none (every answer from before the Hebrew dial). */
export const offerLangOf = (offer: Partial<GreekOffer>): OfferLang => offer.lang ?? 'grc';

/** The language of the dial a chapter's offer may raise: Hebrew on an Old Testament chapter, Greek on a New Testament one (and in a talk with no chapter). */
export const chapterOfferLang = (scope: Pick<TalkScope, 'chapter'>): NoLang => (sourceLanguage(scope.chapter) === 'hbo' ? 'he' : 'grc');

/** The languages whose remembered no an offer of `lang` is held against ('both' by either). */
export const noLangsOf = (lang: OfferLang): NoLang[] => (lang === 'both' ? ['grc', 'he'] : [lang]);

/** The offer of an answer that the app keeps, or undefined: none when the answer has none, when this talk has made one already (the history shows it), when his no is in the
 * memory index (or is this very answer's `offer_reply`), when the dial the request carried (`level`: the dial of the chapter's language) already stands at All in, or for an offer of the other language than the chapter's, or for a word the text of this talk does not have
 * (a button that could not open its sheet). The kept offer names the one step above `level` as `to`. */
export function greekOfferOf(answer: TalkAnswer, scope: TalkScope, turns: readonly Pick<TalkTurn, 'greekOffer'>[], indexText: string | undefined, declinedNow = false, level?: GreekLevel): GreekOffer | undefined {
  const offer = answer.greek_offer;
  // an offer belongs to a talk about the text, for a reader whose Reader the request named: not a quiz, not a talk from a screen; the welcome (mw-yrmkdf.3) is the one
  // talk from a screen that may make it, once, for a reader who says he is here to learn the Greek
  if (!offer || scope.quiz || (scope.screen && !scope.welcome)) return undefined;
  if (scope.welcome && offer.kind !== 'view') return undefined;
  const lang = offerLangOf(offer);
  // outside the welcome the chapter's language picks the dial: an offer of the other one, or of both, is not kept
  if (!scope.welcome && lang !== chapterOfferLang(scope)) return undefined;
  if (declinedNow || turns.some((t) => t.greekOffer) || noLangsOf(lang).some((l) => hasOfferNo(indexText ?? '', l))) return undefined;
  if (offer.kind === 'word' && !(offer.lemma && findGreekWord(scope, { greek: offer.lemma, lemma: offer.lemma, note: '' }))) return undefined;
  // in the welcome, a reader who came to learn the Greek is taken to Dipping a toe (the Weave); anywhere else the offer is one step above where the dial stands
  if (scope.welcome) return { ...offer, to: 2 };
  if (level === undefined) return offer;
  if (level >= GREEK_TOP) return undefined;
  return { ...offer, to: lang === 'he' ? hebrewLevelOf(level + 1) : greekLevelOf(level + 1) };
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

/** Takes the turn's offer as its button's tap does: the dial of the offer's language rises to the step the offer named (one above where it stood; one above where it stands now when the offer names
 * none), through the dial's own function, which brings in what that step brings: the Greek dial, the Hebrew one, or in the welcome both; a word offer then asks the Talk sheet to open the word. The offer is taken. */
export async function takeGreekOffer(turn: TalkTurn): Promise<void> {
  const offer = turn.greekOffer;
  if (!offer) return;
  const lang = offerLangOf(offer);
  if (lang !== 'he') await raiseGreekInterest(offer.to ?? greekLevelOf(lang === 'both' ? 2 : Math.min((await getGreekInterest()) + 1, GREEK_TOP)));
  if (lang !== 'grc') await raiseHebrewInterest(offer.to ?? hebrewLevelOf(lang === 'both' ? 2 : Math.min((await getHebrewInterest()) + 1, GREEK_TOP)));
  if (offer.kind === 'word' && offer.lemma) requestGreekWord(offer.lemma);
  if (turn.id !== undefined && !turn.greekChoice) await markGreekChoice(turn.id, 'taken');
}
