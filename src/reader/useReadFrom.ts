// src/reader/useReadFrom.ts — how the Reader starts Read aloud (docs/module-map.md R1): the plan (what is read is what is shown: it follows the view and
// the weave), readFrom for the header's Play and a verse's play button, and listenTo for a passage.
import { useCallback, useEffect, useMemo } from 'react';
import type { Chapter } from '../data/chapter';
import type { ReaderView, ReadSpan } from '../data/repositories';
import { passageVerse, unitId, type Passage } from '../data/passage';
import type { Verse } from '../data/chapter';
import { getReading, listenKeyOf, pauseReading, planOf, startReading, useListenCompleted } from '../speech/readAloud';
import type { Woven } from '../data/weave';

export function useReadFrom(book: string, chapterN: number, chapter: Chapter | null, view: ReaderView | undefined, woven: (Woven[] | null)[] | null, readSpan: ReadSpan | undefined, viewUnit?: Verse) {
  const plan = useMemo(() => (chapter && view ? planOf(chapter.verses, view, woven) : null), [chapter, view, woven]);
  const readFrom = useCallback(
    (from: number, continuous: boolean) => {
      if (plan) startReading({ book, chapter: chapterN, plan, from, continuous, span: readSpan });
    },
    [plan, book, chapterN, readSpan],
  );
  // Listen on a passage: its verses only, to the end of the passage and no further, whatever Settings > Read aloud says. On a verse: that verse only.
  // A Listen is paused by an interruption from inside the app and goes on by itself (src/speech/readAloud.ts interruptListen).
  const listenTo = useCallback(
    (passage: Passage) => {
      if (plan)
        startReading({
          inBook: book,
          chapter: chapterN,
          plan: plan.filter((v) => v.n >= passage.first && v.n <= passage.last),
          from: passage.first,
          continuous: true,
          span: 'passage',
          listen: listenKeyOf(book, chapterN, unitId(passageVerse(passage))),
        });
    },
    [plan, book, chapterN],
  );
  const listenVerse = useCallback(
    (verse: Verse) => {
      if (plan) startReading({ book, chapter: chapterN, plan, from: verse.n, continuous: false, span: readSpan, listen: listenKeyOf(book, chapterN, unitId(verse)) });
    },
    [plan, book, chapterN, readSpan],
  );
  // The key of the Listen the Verse view offers; leaving the verse or passage (Back, an arrow) pauses it: the speaking bar then offers Resume at the same verse.
  const viewKey = viewUnit ? listenKeyOf(book, chapterN, unitId(viewUnit)) : null;
  useEffect(() => {
    if (viewKey === null) return;
    return () => {
      const now = getReading();
      if (now.listen === viewKey && now.status === 'reading') pauseReading();
    };
  }, [viewKey]);
  const listenedView = useListenCompleted() === viewKey && viewKey !== null;
  return { plan, readFrom, listenTo, listenVerse, listenedView };
}
