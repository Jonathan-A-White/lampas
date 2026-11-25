// src/reader/useReadFrom.ts — how the Reader starts Read aloud (docs/module-map.md R1): the plan (what is read is what is shown: it follows the view and
// the weave), readFrom for the header's Play (Play to) and a verse's play button, and listenTo for a passage.
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { sourceLanguage, type Chapter } from '../data/chapter';
import type { PlayTo, ReaderView } from '../data/repositories';
import { passageVerse, unitId, type Passage } from '../data/passage';
import type { Verse } from '../data/chapter';
import { getReading, isReadingOf, listenKeyOf, pauseReading, planOf, readingEndedWhole, startReading, subscribeReading, useListenCompleted, type PlanVerse, type StartOptions } from '../speech/readAloud';
import { chapterKey, clearPlace, getPlace, savePlace, subscribePlace } from '../speech/passagePlace';
import { titleOf } from '../data/books';
import { bibleVoiceChosen, setBibleVoice } from '../speech/recordedVoice';
import { askAboutData } from '../speech/dataQuestion';
import { markDataQuestionAnswered, decideVoice, TAP_TIMINGS_WAIT_MS, timingsOnTheWay, timingsReady } from '../speech/voiceDecision';
import { writeSetting } from '../settings/registry';
import type { WovenVerse } from '../data/weave';

/** The place the header's Play (a chapter read on, from a verse) is keeping, or null when what is being read is not one (a verse's own button, a Listen, a tutor's answer). Module-wide: the reading goes on
 *  into the next chapter, whose Reader keeps it from there. */
let keeping: string | null = null;
/** Whether the next reading started here is one the header's Play started. */
let continuousStart = false;

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
  // A start tapped before the book's timings arrived (a slow connection: the Reader warms them as the chapter opens) waits for them, up to TAP_TIMINGS_WAIT_MS, and decides then: deciding at once
  // found none and read in the phone's voice with no word, never David and never the data question (mw-zbgo4ep.43). The latest start wins; leaving the screen drops the waiting one.
  const latest = useRef(0);
  useEffect(
    () => () => {
      latest.current = -1;
    },
    [],
  );
  const begin = useCallback(
    (options: Omit<StartOptions, 'recorded' | 'notice'>, read: PlanVerse[], mayAsk = true) => {
      // only the header's Play (a chapter read on, no Listen) keeps a place
      const start = (started: StartOptions) => {
        continuousStart = started.listen === undefined && started.continuous;
        startReading(started);
      };
      const go = () => {
        const say = decideVoice(book, chapter, read, mayAsk);
        if (!say.ask) return start({ ...options, recorded: say.recorded, notice: say.notice });
        askAboutData((choice) => {
          markDataQuestionAnswered();
          if (choice === 'david') {
            // the setting is changed now, so the reading below finds the recording wanted; saved behind it
            setBibleVoice('msb-david');
            void writeSetting('bibleVoice', 'msb-david');
          }
          const after = decideVoice(book, chapter, read, false);
          start({ ...options, recorded: after.recorded, notice: after.notice });
        });
      };
      if (!timingsOnTheWay(book, bibleVoiceChosen())) return go();
      const mine = latest.current >= 0 ? ++latest.current : -1;
      void timingsReady(book, bibleVoiceChosen(), TAP_TIMINGS_WAIT_MS).then(() => {
        if (mine >= 0 && latest.current === mine) go();
      });
    },
    [book, chapter],
  );
  // The header's Play (continuous) goes on to the end of the book or of the Bible, as Play to says; a verse's play button reads that verse only.
  // Each is heard in the recorded voice when the verses it reads can be (src/speech/recordedVoice.ts recordingFor, decided here at the tap with no wait).
  // `mayAsk` false (Hands-free, with no hand free to answer) never asks the data question first.
  const readFrom = useCallback(
    (from: number, continuous: boolean, mayAsk = true) => {
      if (!plan) return;
      begin({ book, chapter: chapterN, plan, from, continuous, span: readSpan }, plan.filter((v) => (continuous ? v.n >= from : v.n === from)), mayAsk);
    },
    [plan, book, chapterN, readSpan, begin],
  );
  // Listen on a passage (a section heading's view, or the place line's whole chapter): its verses only, to the end of the passage and no further, whatever Play to says. On a verse: that verse only.
  // A Listen is paused by an interruption from inside the app and goes on by itself (src/speech/readAloud.ts interruptListen).
  const listenTo = useCallback(
    (passage: Passage) => {
      if (!listenPlan) return;
      const verses = listenPlan.filter((v) => v.n >= passage.first && v.n <= passage.last);
      // the narrator's announcement ('Audio Bible, John chapter one') is for the chapter: a pericope, even one that starts at verse 1, starts at its own second (mw-82lb97i.40);
      // the place line's whole chapter is the chapter
      const wholeChapter = verses.length === listenPlan.length;
      begin(
        {
          inBook: book,
          chapter: chapterN,
          plan: verses,
          from: passage.first,
          continuous: true,
          // the plan is the passage's verses and nothing more: 'chapter' reads to its end and does not stop at a heading inside it (the place line's whole chapter has several)
          span: 'chapter',
          title: wholeChapter,
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
  // Where the header's Play is, kept as the voice reads (src/speech/passagePlace.ts, mw-5r3p30.1239): leaving the screen or a Stop keeps it, the chapter's end forgets it. Opening the chapter again offers Resume there.
  useEffect(() => {
    const key = chapterKey(book, chapterN);
    const follow = () => {
      const now = getReading();
      if (now.status === 'idle') {
        if (keeping !== null && readingEndedWhole()) clearPlace(keeping);
        keeping = null;
        return;
      }
      if (now.answer !== null || now.listen !== null || !continuousStart) return;
      if (now.crossing) {
        // going on into the next chapter: this one was read to its end
        if (keeping !== null) clearPlace(keeping);
        keeping = null;
        return;
      }
      if (now.verse === null || !isReadingOf(book, chapterN)) return;
      keeping = key;
      const title = titleOf(book, chapterN);
      savePlace(key, { heading: title, verse: now.verse, label: `${title}:${now.verse}` });
    };
    follow();
    return subscribeReading(follow);
  }, [book, chapterN]);
  const placeKey = chapterKey(book, chapterN);
  const place = useSyncExternalStore(subscribePlace, () => getPlace(placeKey), () => null);
  const kept = place && place.verse > 1 ? place : null;
  const resumeKept = useCallback(() => {
    const at = getPlace(chapterKey(book, chapterN));
    readFrom(at && at.verse > 1 ? at.verse : 1, true);
  }, [readFrom, book, chapterN]);
  const fromTheStart = useCallback(() => {
    clearPlace(chapterKey(book, chapterN));
    readFrom(1, true);
  }, [readFrom, book, chapterN]);
  const listenedView = useListenCompleted() === viewKey && viewKey !== null;
  return { plan, readFrom, listenTo, listenVerse, listenedView, kept, resumeKept, fromTheStart };
}
