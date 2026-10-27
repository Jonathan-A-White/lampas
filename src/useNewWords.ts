// src/useNewWords.ts — the new words of the open chapter, for the 'New words: N' strip and the teach sheet (mw-bsf54t.4): the frontier
// picker (src/data/frontier.ts) over the chapter and what he has, without the words he said Not now to today (src/data/skipped.ts),
// at most `pace` of them (src/usePace.ts). Nothing until the chapter and the word counts have loaded; a word list that cannot load offers none.
// An Old Testament chapter takes the Hebrew word counts and only his Hebrew words (mw-gdcyf98.19): a chapter's new words are of its own language and never mix.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { sourceLanguage, type Chapter } from './data/chapter';
import { pickFrontier, type Candidate } from './data/frontier';
import { loadFrequency, type FrequencyEntry } from './data/frequency';
import { listDroppedLemmas, listLearningLemmas, listSolidLemmas } from './data/repositories';
import { useSkipped } from './data/skipped';

const NONE: readonly Candidate[] = [];

/** The new words of `chapter` in its own language, at most `pace`; the pace is the one the dial of that language gives (usePace). */
export function useNewWords(chapter: Chapter | null, pace: number | undefined): readonly Candidate[] | undefined {
  const lang = chapter ? sourceLanguage(chapter) : 'grc';
  const [counted, setFrequency] = useState<{ lang: typeof lang; entries: FrequencyEntry[] | 'failed' } | null>(null);
  useEffect(() => {
    let alive = true;
    loadFrequency(lang).then(
      (entries) => alive && setFrequency({ lang, entries }),
      () => alive && setFrequency({ lang, entries: 'failed' }),
    );
    return () => {
      alive = false;
    };
  }, [lang]);
  // the counts of the chapter's language: those of another one, still held while the next loads, are not used
  const frequency = counted?.lang === lang ? counted.entries : null;
  const solid = useLiveQuery(() => listSolidLemmas(lang), [lang]);
  const learning = useLiveQuery(() => listLearningLemmas(lang), [lang]);
  const dropped = useLiveQuery(() => listDroppedLemmas(lang), [lang]);
  const skipped = useSkipped();
  return useMemo(() => {
    if (!chapter || !solid || !learning || !dropped || pace === undefined || frequency === null) return undefined;
    if (pace <= 0) return NONE;
    if (frequency === 'failed') return NONE;
    // a skipped word is still picked, then left out: ask for enough to fill the pace after them
    return pickFrontier(chapter, { solid, learning, dropped }, frequency, pace + skipped.size)
      .filter((c) => !skipped.has(c.lemma))
      .slice(0, pace);
  }, [chapter, solid, learning, dropped, pace, frequency, skipped]);
}
