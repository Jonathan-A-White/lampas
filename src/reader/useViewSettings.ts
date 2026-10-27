// src/reader/useViewSettings.ts — the settings that decide how a verse is drawn (the view, the weave, its grammar dial and order, his solid and learning
// lemmas and the grammar levels, and whether the switch's plain English stands under the Weave, mw-5r3p30.651), read live and told to nobody. useReaderSettings is the Reader's: it also tells the bus and follows the address. A verse shown
// on a card elsewhere (the Review question's reference, mw-5r3p30.652) reads these, so it is drawn as the Reader draws it and a change made at once reaches it.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { sourceLanguage, type Chapter } from '../data/chapter';
import { getInterestLevels, getPlainEnglishUnder, getReaderView, getWeave, getWeaveGrammar, listLearningLemmas, listLevels, listSolidLemmas, type ReaderView, type Weave } from '../data/repositories';
import { weaveOrderSetting } from '../settings/definitions';
import { viewAt, weaveAt } from '../settings/definitions/greekInterest';
import { levelOf, type InterestLevels } from '../settings/definitions/interest';
import { getSetting, useSetting } from '../settings/store';
import { useInterestLevels } from '../settings/useInterestLevels';
import type { ReaderSettings } from './useReaderSettings';

/** The settings a verse is drawn by once the dial of its chapter's language has had its say. */
type ViewSettings = Pick<ReaderSettings, 'view' | 'weave' | 'weaveShown' | 'weaveGrammar' | 'weaveOrder' | 'solid' | 'learning' | 'levels'>;

/** The same, as he saved them and before any dial: the view and weave he chose, the Weave he has plain English under, and both dials' steps. `settingsFor` turns them into ViewSettings for a chapter. */
export type SavedViewSettings = Omit<ViewSettings, 'view' | 'weave' | 'weaveShown'> & { view: ReaderView; weave: Weave; plainUnder: Weave | null; interest: InterestLevels };

/** The settings as they apply to a verse of `chapter` (mw-gdcyf98.3): the dial of the chapter's own language decides, as the Reader does for its own chapter. An Old Testament
 *  chapter ('hbo') is shown in its Hebrew and woven when the Hebrew dial allows it, a Greek chapter by the Greek dial, whatever the other dial stands at. For a card, a list's player or any screen
 *  that draws a verse outside the Reader. */
export function settingsFor(saved: SavedViewSettings, chapter: Pick<Chapter, 'lang'>): ViewSettings {
  const { view: savedView, weave: savedWeave, plainUnder, interest, ...rest } = saved;
  const level = levelOf(sourceLanguage(chapter), interest);
  const weave = weaveAt(level, savedWeave);
  return { ...rest, view: viewAt(level, savedView), weave, weaveShown: weave !== 'off' && plainUnder !== weave };
}

/** The saved view and weave settings, or undefined until every one has loaded. */
export function useViewSettings(): SavedViewSettings | undefined {
  const interest = useInterestLevels();
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const weaveOrder = useSetting(weaveOrderSetting);
  const plainUnder = useLiveQuery(getPlainEnglishUnder, []);
  const levels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  return useMemo(
    () => (interest && view && weave && weaveGrammar && weaveOrder && plainUnder !== undefined && levels && solid && learning ? { view, weave, plainUnder, interest, weaveGrammar, weaveOrder, solid, learning, levels } : undefined),
    [interest, view, weave, plainUnder, weaveGrammar, weaveOrder, levels, solid, learning],
  );
}

/** The same settings as useViewSettings, read once and outside React: what the passage player (src/speech/passagePlayer.ts) reads aloud in, so it follows the language and weave he reads in. */
export async function readViewSettings(): Promise<SavedViewSettings> {
  const [interest, view, weave, weaveGrammar, weaveOrder, plainUnder, levels, solid, learning] = await Promise.all([
    getInterestLevels(),
    getReaderView(),
    getWeave(),
    getWeaveGrammar(),
    getSetting(weaveOrderSetting),
    getPlainEnglishUnder(),
    listLevels(),
    listSolidLemmas(),
    listLearningLemmas(),
  ]);
  return { view, weave, plainUnder, interest, weaveGrammar, weaveOrder, solid, learning, levels };
}
