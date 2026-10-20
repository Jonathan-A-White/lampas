// src/reader/useViewSettings.ts — the settings that decide how a verse is drawn (the view, the weave, its grammar dial and order, his solid and learning
// lemmas and the grammar levels), read live and told to nobody. useReaderSettings is the Reader's: it also tells the bus and follows the address. A verse shown
// on a card elsewhere (the Review question's reference, mw-5r3p30.652) reads these, so it is drawn as the Reader draws it and a change made at once reaches it.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getReaderView, getWeave, getWeaveGrammar, listLearningLemmas, listLevels, listSolidLemmas } from '../data/repositories';
import { weaveOrderSetting } from '../settings/definitions';
import { useSetting } from '../settings/store';
import type { ReaderSettings } from './useReaderSettings';

/** The view and weave settings, or undefined until every one has loaded. */
export function useViewSettings(): Pick<ReaderSettings, 'view' | 'weave' | 'weaveGrammar' | 'weaveOrder' | 'solid' | 'learning' | 'levels'> | undefined {
  const view = useLiveQuery(getReaderView, []);
  const weave = useLiveQuery(getWeave, []);
  const weaveGrammar = useLiveQuery(getWeaveGrammar, []);
  const weaveOrder = useSetting(weaveOrderSetting);
  const levels = useLiveQuery(listLevels, []);
  const solid = useLiveQuery(listSolidLemmas, []);
  const learning = useLiveQuery(listLearningLemmas, []);
  return useMemo(
    () => (view && weave && weaveGrammar && weaveOrder && levels && solid && learning ? { view, weave, weaveGrammar, weaveOrder, solid, learning, levels } : undefined),
    [view, weave, weaveGrammar, weaveOrder, levels, solid, learning],
  );
}
