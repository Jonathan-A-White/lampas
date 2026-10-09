// src/useNewWords.ts — the new words of the open chapter, for the 'New words: N' strip and the teach sheet (mw-bsf54t.4): the frontier
// picker (src/data/frontier.ts) over the chapter and what he has, without the words he said Not now to today (src/data/skipped.ts),
// at most PACE of them. Nothing until the chapter and the word counts have loaded; a word list that cannot load offers none.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import type { Chapter } from './data/chapter';
import { PACE, pickFrontier, type Candidate } from './data/frontier';
import { loadFrequency, type FrequencyEntry } from './data/frequency';
import { listDroppedLemmas } from './data/repositories';
import { useSkipped } from './data/skipped';

const NONE: readonly Candidate[] = [];

/** `solid` and `learning` are the lemma sets the Reader already holds (listSolidLemmas, listLearningLemmas); undefined while they load. */
export function useNewWords(
  chapter: Chapter | null,
  solid: ReadonlySet<string> | undefined,
  learning: ReadonlySet<string> | undefined,
): readonly Candidate[] | undefined {
  const [frequency, setFrequency] = useState<FrequencyEntry[] | 'failed' | null>(null);
  useEffect(() => {
    let alive = true;
    loadFrequency().then(
      (entries) => alive && setFrequency(entries),
      () => alive && setFrequency('failed'),
    );
    return () => {
      alive = false;
    };
  }, []);
  const dropped = useLiveQuery(listDroppedLemmas, []);
  const skipped = useSkipped();
  return useMemo(() => {
    if (!chapter || !solid || !learning || !dropped || frequency === null) return undefined;
    if (frequency === 'failed') return NONE;
    // a skipped word is still picked, then left out: ask for enough to fill the pace after them
    return pickFrontier(chapter, { solid, learning, dropped }, frequency, PACE + skipped.size)
      .filter((c) => !skipped.has(c.lemma))
      .slice(0, PACE);
  }, [chapter, solid, learning, dropped, frequency, skipped]);
}
