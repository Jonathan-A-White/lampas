// src/reader/useReadFrom.ts — how the Reader starts Read aloud (docs/module-map.md R1): the plan (what is read is what is shown: it follows the view and
// the weave), readFrom for the header's Play (Play to) and a verse's play button, and listenTo for a passage.
import { useCallback, useEffect, useMemo } from 'react';
import { sourceLanguage, type Chapter } from '../data/chapter';
import type { PlayTo, ReaderView } from '../data/repositories';
import { passageVerse, unitId, type Passage } from '../data/passage';
import type { Verse } from '../data/chapter';
import { getReading, listenKeyOf, pauseReading, planOf, startReading, useListenCompleted } from '../speech/readAloud';
import type { WovenVerse } from '../data/weave';

/** `sheet` is what the Verse view shows when it is not what the Reader shows (an Old Testament chapter's view stays English for now, mw-5vvlay.1): its Listen reads that. */
export function useReadFrom(book: string, chapterN: number, chapter: Chapter | null, view: ReaderView | undefined, woven: (WovenVerse | null)[] | null, readSpan: PlayTo | undefined, viewUnit?: Verse, sheet?: { view: ReaderView; woven: (WovenVerse | null)[] | null }) {
  const source = chapter ? sourceLanguage(chapter) : 'grc';
  const plan = useMemo(() => (chapter && view ? planOf(chapter.verses, view, woven, source) : null), [chapter, view, woven, source]);
  const sheetView = sheet?.view;
  const sheetWoven = sheet?.woven;
  const listenPlan = useMemo(
    () => (sheetView === undefined ? plan : chapter ? planOf(chapter.verses, sheetView, sheetWoven ?? null, source) : null),
    [plan, chapter, sheetView, sheetWoven, source],
  );
  // The header's Play (continuous) goes on to the end of the book or of the Bible, as Play to says; a verse's play button reads that verse only.
  const readFrom = useCallback(
    (from: number, continuous: boolean) => {
      if (plan) startReading({ book, chapter: chapterN, plan, from, continuous, span: readSpan });
    },
    [plan, book, chapterN, readSpan],
  );
  // Listen on a passage (a section heading's view, or the place line's whole chapter): its verses only, to the end of the passage and no further, whatever Play to says. On a verse: that verse only.
  // A Listen is paused by an interruption from inside the app and goes on by itself (src/speech/readAloud.ts interruptListen).
  const listenTo = useCallback(
    (passage: Passage) => {
      if (listenPlan)
        startReading({
          inBook: book,
          chapter: chapterN,
          plan: listenPlan.filter((v) => v.n >= passage.first && v.n <= passage.last),
          from: passage.first,
          continuous: true,
          // the plan is the passage's verses and nothing more: 'chapter' reads to its end and does not stop at a heading inside it (the place line's whole chapter has several)
          span: 'chapter',
          listen: listenKeyOf(book, chapterN, unitId(passageVerse(passage))),
        });
    },
    [listenPlan, book, chapterN],
  );
  const listenVerse = useCallback(
    (verse: Verse) => {
      if (listenPlan) startReading({ book, chapter: chapterN, plan: listenPlan, from: verse.n, continuous: false, span: 'verse', listen: listenKeyOf(book, chapterN, unitId(verse)) });
    },
    [listenPlan, book, chapterN],
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
