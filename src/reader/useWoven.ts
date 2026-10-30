// src/reader/useWoven.ts — the chapter's diglot weave (docs/module-map.md R1): each verse's English chunks with the Greek of his words shown in their
// place (src/data/weave.ts), or null while the weave is off, plain English or the Greek view is chosen in the header's switch, or the chapter is not here.
import { useMemo } from 'react';
import { sourceLanguage, type Chapter, type GreekWord } from '../data/chapter';
import { formPasses } from '../data/grammar/formLevel';
import { weaveVerse, withWordRule, wovenInOrder, type WeaveLemmas, type WovenVerse } from '../data/weave';
import type { ReaderSettings } from './useReaderSettings';

const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

/** The weave of every verse of `chapter`, or null when it is not woven: the one rule the Reader's weave and a read-aloud of a passage both follow (mw-9q8wp1.4). `settings` is empty while they load. */
export function wovenOf(chapter: Chapter | null, settings: Partial<ReaderSettings>): WovenVerse[] | null {
  const { view, weave, weaveShown, weaveGrammar, weaveOrder, levels, solid, learning } = settings;
  const weaving = view === 'english' && weaveShown === true && (weave === 'solid' || weave === 'solid+learning');
  const withLearning = weave === 'solid+learning';
  if (!chapter || !weaving) return null;
  // the grammar dial reads the Greek parsing codes (src/data/grammar): an Old Testament chapter's forms are not held to it
  const formOk =
    sourceLanguage(chapter) !== 'grc'
      ? undefined
      : weaveGrammar === undefined || levels === undefined
      ? () => false // the dial is still loading: weave nothing rather than flash a verse that then narrows
      : weaveGrammar === 'any'
        ? undefined
        : (w: GreekWord) => formPasses(w.p, levels, weaveGrammar);
  const lemmas: WeaveLemmas = { solid: solid ?? EMPTY_LEMMAS, learning: withLearning ? learning ?? EMPTY_LEMMAS : undefined, formPasses: formOk };
  // each verse's weave carries the rule for a single Greek word, which a variant chip follows word by word (mw-9ji6ek0.37)
  return chapter.verses.map((v) => withWordRule(wovenInOrder(v, weaveVerse(v, lemmas), weaveOrder ?? 'english'), lemmas));
}

/** The weave of every verse of `chapter`; `settings` is empty while they load. The grammar dial: with it on, a form stays English unless every idea its parsing needs is at that level.
 * The Order: Greek lays each verse out in the Greek word order (src/data/weave.ts chunkOrder), which VerseText draws and read aloud reads. */
export function useWoven(chapter: Chapter | null, settings: Partial<ReaderSettings>) {
  const { view, weave, weaveShown, weaveGrammar, weaveOrder, levels, solid, learning } = settings;
  return useMemo(
    () => wovenOf(chapter, { view, weave, weaveShown, weaveGrammar, weaveOrder, levels, solid, learning }),
    [chapter, view, weave, weaveShown, weaveGrammar, weaveOrder, levels, solid, learning],
  );
}
