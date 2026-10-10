// src/reader/useWoven.ts — the chapter's diglot weave (docs/module-map.md R1): each verse's English chunks with the Greek of his words shown in their
// place (src/data/weave.ts), or null while the weave is off, the Greek view is open or the chapter is not here.
import { useMemo } from 'react';
import type { Chapter, GreekWord } from '../data/chapter';
import { formPasses } from '../data/grammar/formLevel';
import { weaveVerse } from '../data/weave';
import type { ReaderSettings } from './useReaderSettings';

const EMPTY_LEMMAS: ReadonlySet<string> = new Set();

/** The weave of every verse of `chapter`; `settings` is empty while they load. The grammar dial: with it on, a form stays English unless every idea its parsing needs is at that level. */
export function useWoven(chapter: Chapter | null, settings: Partial<ReaderSettings>) {
  const { view, weave, weaveGrammar, levels, solid, learning } = settings;
  const weaving = view === 'english' && (weave === 'solid' || weave === 'solid+learning');
  const withLearning = weave === 'solid+learning';
  return useMemo(() => {
    if (!chapter || !weaving) return null;
    const formOk =
      weaveGrammar === undefined || levels === undefined
        ? () => false // the dial is still loading: weave nothing rather than flash a verse that then narrows
        : weaveGrammar === 'any'
          ? undefined
          : (w: GreekWord) => formPasses(w.p, levels, weaveGrammar);
    return chapter.verses.map((v) =>
      weaveVerse(v, { solid: solid ?? EMPTY_LEMMAS, learning: withLearning ? learning ?? EMPTY_LEMMAS : undefined, formPasses: formOk }),
    );
  }, [chapter, weaving, withLearning, solid, learning, weaveGrammar, levels]);
}
