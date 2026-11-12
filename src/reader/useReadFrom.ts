// src/reader/useReadFrom.ts — how the Reader starts Read aloud (docs/module-map.md R1): the plan (what is read is what is shown: it follows the view and
// the weave), readFrom for the header's Play (Play to) and a verse's play button, and listenTo for a passage.
import { useCallback, useEffect, useMemo } from 'react';
import { sourceLanguage, type Chapter } from '../data/chapter';
import type { PlayTo, ReaderView } from '../data/repositories';
import { passageVerse, unitId, type Passage } from '../data/passage';
import type { Verse } from '../data/chapter';
import { getReading, listenKeyOf, pauseReading, planOf, startReading, useListenCompleted, type PlanVerse, type StartOptions } from '../speech/readAloud';
import { setBibleVoice } from '../speech/recordedVoice';
import { askAboutData } from '../speech/dataQuestion';
import { markDataQuestionAnswered, decideVoice } from '../speech/voiceDecision';
import { writeSetting } from '../settings/registry';
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
  // Every start goes through the one decision (src/speech/voiceDecision.ts decideVoice, mw-zbgo4ep.30): David where he can be, the phone's voice with the line that says why, or, on
  // mobile data with Recording on Wi-Fi only, ONE question first. The answer's buttons start the reading, so it plays from a tap.
  const begin = useCallback(
    (options: Omit<StartOptions, 'recorded' | 'notice'>, read: PlanVerse[]) => {
      const say = decideVoice(book, chapter, read, true);
      if (!say.ask) return startReading({ ...options, recorded: say.recorded, notice: say.notice });
      askAboutData((choice) => {
        markDataQuestionAnswered();
        if (choice === 'david') {
          // the setting is changed now, so the reading below finds the recording wanted; saved behind it
          setBibleVoice('msb-david');
          void writeSetting('bibleVoice', 'msb-david');
        }
        const after = decideVoice(book, chapter, read, false);
        startReading({ ...options, recorded: after.recorded, notice: after.notice });
      });
    },
    [book, chapter],
  );
  // The header's Play (continuous) goes on to the end of the book or of the Bible, as Play to says; a verse's play button reads that verse only.
  // Each is heard in the recorded voice when the verses it reads can be (src/speech/recordedVoice.ts recordingFor, decided here at the tap with no wait).
  const readFrom = useCallback(
    (from: number, continuous: boolean) => {
      if (!plan) return;
      begin({ book, chapter: chapterN, plan, from, continuous, span: readSpan }, plan.filter((v) => (continuous ? v.n >= from : v.n === from)));
    },
    [plan, book, chapterN, readSpan, begin],
  );
  // Listen on a passage (a section heading's view, or the place line's whole chapter): its verses only, to the end of the passage and no further, whatever Play to says. On a verse: that verse only.
  // A Listen is paused by an interruption from inside the app and goes on by itself (src/speech/readAloud.ts interruptListen).
  const listenTo = useCallback(
    (passage: Passage) => {
      if (!listenPlan) return;
      const verses = listenPlan.filter((v) => v.n >= passage.first && v.n <= passage.last);
      begin(
        {
          inBook: book,
          chapter: chapterN,
          plan: verses,
          from: passage.first,
          continuous: true,
          // the plan is the passage's verses and nothing more: 'chapter' reads to its end and does not stop at a heading inside it (the place line's whole chapter has several)
          span: 'chapter',
          listen: listenKeyOf(book, chapterN, unitId(passageVerse(passage))),
        },
        verses,
      );
    },
    [listenPlan, book, chapterN, begin],
  );
  const listenVerse = useCallback(
    (verse: Verse) => {
      if (!listenPlan) return;
      begin({ book, chapter: chapterN, plan: listenPlan, from: verse.n, continuous: false, span: 'verse', listen: listenKeyOf(book, chapterN, unitId(verse)) }, listenPlan.filter((v) => v.n === verse.n));
    },
    [listenPlan, book, chapterN, begin],
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
