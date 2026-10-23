// src/reader/useViewSettings.ts — the settings that decide how a verse is drawn (the view, the weave, its grammar dial and order, his solid and learning
// lemmas and the grammar levels, and whether the switch's plain English stands under the Weave, mw-5r3p30.651), read live and told to nobody. useReaderSettings is the Reader's: it also tells the bus and follows the address. A verse shown
// on a card elsewhere (the Review question's reference, mw-5r3p30.652) reads these, so it is drawn as the Reader draws it and a change made at once reaches it.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getGreekInterest, getPlainEnglishUnder, getReaderView, getWeave, getWeaveGrammar, listLearningLemmas, listLevels, listSolidLemmas } from '../data/repositories';
import { weaveOrderSetting } from '../settings/definitions';
import { viewAt, weaveAt } from '../settings/definitions/greekInterest';
import { getSetting, useSetting } from '../settings/store';
import { useGreekInterest } from '../settings/useGreekInterest';
import type { ReaderSettings } from './useReaderSettings';

/** The view and weave settings, or undefined until every one has loaded. */
export function useViewSettings(): Pick<ReaderSettings, 'view' | 'weave' | 'weaveShown' | 'weaveGrammar' | 'weaveOrder' | 'solid' | 'learning' | 'levels'> | undefined {
  // the Greek dial (mw-3ased2.2): what it hides is not drawn
  const level = useGreekInterest();
  const savedView = useLiveQuery(getReaderView, []);
  const savedWeave = useLiveQuery(getWeave, []);
  const view = savedView && level !== undefined ? viewAt(level, savedView) : undefined;
  const weave = savedWeave && level !== undefined ? weaveAt(level, savedWeave) : undefined;
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const weaveOrder = useSetting(weaveOrderSetting);
  const plainUnder = useLiveQuery(getPlainEnglishUnder, []);
  const levels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  return useMemo(
    () => (view && weave && weaveGrammar && weaveOrder && plainUnder !== undefined && levels && solid && learning ? { view, weave, weaveShown: weave !== 'off' && plainUnder !== weave, weaveGrammar, weaveOrder, solid, learning, levels } : undefined),
    [view, weave, plainUnder, weaveGrammar, weaveOrder, levels, solid, learning],
  );
}

/** The same settings as useViewSettings, read once and outside React: what the passage player (src/speech/passagePlayer.ts) reads aloud in, so it follows the language and weave he reads in. */
export async function readViewSettings(): Promise<NonNullable<ReturnType<typeof useViewSettings>>> {
  const [level, savedView, savedWeave, weaveGrammar, weaveOrder, plainUnder, levels, solid, learning] = await Promise.all([
    getGreekInterest(),
    getReaderView(),
    getWeave(),
    getWeaveGrammar(),
    getSetting(weaveOrderSetting),
    getPlainEnglishUnder(),
    listLevels(),
    listSolidLemmas(),
    listLearningLemmas(),
  ]);
  const weave = weaveAt(level, savedWeave);
  return { view: viewAt(level, savedView), weave, weaveShown: weave !== 'off' && plainUnder !== weave, weaveGrammar, weaveOrder, solid, learning, levels };
}
