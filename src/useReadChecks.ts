// src/useReadChecks.ts — the reading check's state, by verse: he holds Read, the phone records (src/audio/recorder.ts), he
// lets go and the clip goes to the mill (src/services/reading.ts), and the answer is kept in Dexie when it comes. One reading
// at a time. Pressing stops any reading aloud (page audio could take the microphone); a buzz says the microphone is live;
// a press under 500 ms is a tap and a hold under 1 s is too short, and neither sends anything; a slide off the button drops it. A reading keeps waiting when he selects
// another verse, and all stop when the screen goes away. The view decides what is read and in which language the mill
// scores it (English, the Greek in the chosen pronunciation's scoring language, or the Hebrew in the chosen Hebrew scheme's); the states returned are those of the
// language shown, a reading in the other one carries on unseen. With the weave on and some of the verse shown in Greek (mw-5r3p30.411) he reads it as shown, the Greek
// words in Greek and the English in English: the request carries its pieces in order, each with its language (services/reading.ts wovenReading), and the answer is kept
// as a reading of its own (WOVEN_LANG) with the text it was scored against.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Chapter, Verse } from './data/chapter';
import { unitId, unitReference } from './data/passage';
import { getGreekPronunciation, keepVerseReading, reachOf, verseRef } from './data/repositories';
import { isHebrewBook } from './data/books';
import { clipOf } from './audio/clip';
import { MicUnavailable, recorderSeam, type HoldRecorder, type Recording } from './audio/recorder';
import { answerDrawn } from './services/clientTiming';
import { getDeviceKeyBytes } from './services/deviceKey';
import { learnerGrammar } from './data/grammar/learnerGrammar';
import { learnerMemory } from './data/learnerMemory';
import { learnerProfile } from './data/learnerProfile';
import { learnerSummary } from './data/learnerSummary';
import { askVerseRead, buildReadingRequest, cutNote, readingLang, wordsOfText, WOVEN_LANG, type ReadingView, type VerseReadAnswer, type WovenReading } from './services/reading';
import type { Resend } from './services/mill';
import { TutorError, type TutorFailure } from './services/tutor';
import { interruptListen, stopReading } from './speech/readAloud';
import { stopSpeaking, stopWordSaid } from './speech/greek';

/** A press shorter than this is a tap, not a reading. */
export const MIN_READING_MS = 500;
/** A hold shorter than this is too short to hold a verse (the mill cannot score about a second of sound): nothing is sent. */
export const SHORT_READING_MS = 1000;

export const TAP_HINT = 'Hold while you read';
export const SHORT_HINT = 'Hold the bar for the whole verse';
export const DROPPED_NOTE = 'Dropped. Hold to try again';

/** What a verse's reading is doing right now. */
export type ReadState =
  | { phase: 'recording' }
  | { phase: 'tap' }
  | { phase: 'short' }
  | { phase: 'dropped' }
  | { phase: 'sending' | 'waiting'; startedAt: number }
  | { phase: 'failed'; failure: TutorFailure | 'mic'; detail: string; recording?: Recording; weave?: WovenReading | null; resend?: Resend };

type States = Record<string, ReadState | undefined>;
type AllStates = Record<string, ReadState | undefined>;

/** A verse's reading state is kept by verse and language. */
const stateKey = (verse: string, lang: string): string => `${lang}:${verse}`;

export interface UseReadChecks {
  states: States;
  /** the finger is down on Read for this verse; `weave` is the verse as the weave shows it to be read, when some of it is shown in Greek (services/reading.ts wovenReading) */
  press: (verse: Verse, weave?: WovenReading | null) => void;
  /** the finger lifted on the button */
  release: () => void;
  /** the finger slid off, or the browser cancelled the press */
  drop: () => void;
  /** send the recording of a failed reading again: the same grist, when the backend may hold the first (TutorError.resend) */
  retry: (verse: Verse) => void;
}

interface Hold {
  verse: Verse;
  view: ReadingView;
  lang: string;
  /** the verse as the weave showed it as he pressed */
  weave?: WovenReading | null;
  recorder: HoldRecorder;
  started: boolean;
  released: boolean;
  dropped: boolean;
  /** the clip was handed on (by the ten-minute cap) */
  over: boolean;
  /** goes on with the Listen this hold paused, once the recording is over */
  giveBack: (() => void) | null;
}

const buzz = (ms: number) => navigator.vibrate?.(ms);

/** Where an answer goes instead of the reading history: the reading drill (src/ReadingDrill.tsx) reads words that are not verses and keeps nothing of them there. */
export type KeepAnswer = (unit: Verse, answer: VerseReadAnswer, language: string) => void | Promise<void>;

export function useReadChecks(book: string, chapter: number, title: string, readerView: ReadingView = 'english', pronunciation?: string, keep?: KeepAnswer, data?: Chapter | null): UseReadChecks {
  const [all, setAll] = useState<AllStates>({});
  // the source view of an Old Testament chapter is its Hebrew (mw-gdcyf98.14): the Reader says 'greek', the reading is 'hebrew' and is scored in the Hebrew scheme's language
  const view: ReadingView = readerView === 'greek' && isHebrewBook(book) ? 'hebrew' : readerView;
  const keepRef = useRef(keep);
  useEffect(() => {
    keepRef.current = keep;
  });
  // the chapter's data (lemma, gloss and parse of each word) is read when the request is built, so a chapter that arrives later is not a new `send`
  const chapterData = useRef(data);
  useEffect(() => {
    chapterData.current = data;
  });
  const lang = readingLang(view, pronunciation);
  // what a press made now reads: the view and language shown
  const shown = useRef({ view, lang });
  useEffect(() => {
    shown.current = { view, lang };
  });
  const states = useMemo(() => {
    const here: States = {};
    const prefix = `${lang}:`;
    for (const [key, state] of Object.entries(all)) if (key.startsWith(prefix)) here[key.slice(prefix.length)] = state;
    return here;
  }, [all, lang]);
  const live = useRef<AbortController>(new AbortController());
  const hold = useRef<Hold | null>(null);

  useEffect(() => {
    // React strict mode runs the effect twice: the controller made while the screen was away is replaced here.
    if (live.current.signal.aborted) live.current = new AbortController();
    const controller = live.current;
    return () => {
      controller.abort();
      hold.current?.recorder.cancel();
      hold.current = null;
    };
  }, []);

  const set = useCallback((verse: string, language: string, state: ReadState | undefined): void => {
    if (!live.current.signal.aborted) setAll((states) => ({ ...states, [stateKey(verse, language)]: state }));
  }, []);

  const send = useCallback(
    (verse: Verse, readView: ReadingView, language: string, recording: Recording, weave?: WovenReading | null, resend?: Resend): void => {
      const signal = live.current.signal;
      const startedAt = Date.now();
      set(unitId(verse), language, { phase: 'sending', startedAt });
      void (async () => {
        try {
          // the profile, the words and the grammar are the tutor's context: a failure to read one sends the reading without it
          const [profile, learner, grammar, chosen, memory] = await Promise.all([learnerProfile().catch(() => undefined), learnerSummary().catch(() => undefined), learnerGrammar().catch(() => undefined), getGreekPronunciation(), learnerMemory(unitReference(title, verse)).catch(() => undefined)]);
          const request = buildReadingRequest(unitReference(title, verse), verse, readView, language, profile, learner, grammar, chosen, memory, chapterData.current ?? undefined, weave);
          let sentAs: string | undefined;
          const heard = await askVerseRead(request, recording, {
            key: getDeviceKeyBytes(),
            signal,
            // the recording ended as he let go: that is his tap
            tapAt: startedAt,
            // a reading the backend may already hold is sent again as itself, so its answer is found and no second reading is made (mw-5r3p30.302)
            resend,
            onSent: (txid) => {
              sentAs = txid;
              set(unitId(verse), language, { phase: 'waiting', startedAt });
            },
          });
          // a reading the cap ended says so first in its note, with the last word heard: never a silent partial (mw-5r3p30.684)
          const answer = recording.capped ? { ...heard, note: `${cutNote(heard, request.target_text)} ${heard.note}` } : heard;
          // a woven reading is kept as one of its own: its words stand where the weave put them, which a plain English reading's do not
          const kept = request.segments ? WOVEN_LANG : language;
          if (keepRef.current) await keepRef.current(verse, answer, kept);
          else {
            // the clip is kept with the result so he can hear himself (src/audio/clip.ts); a result is kept even if the clip cannot be
            const clip = await clipOf(recording).catch(() => undefined);
            const reach = reachOf(answer.verdict, wordsOfText(request.target_text).length, answer.reached === undefined ? undefined : { reached: answer.reached, next: answer.next_word });
            await keepVerseReading(verseRef(book, chapter, unitId(verse)), answer.verdict, answer.focus_words, answer.note, kept, Date.now(), clip, reach, request.segments ? request.target_text : undefined);
          }
          set(unitId(verse), language, undefined);
          void answerDrawn(sentAs);
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set(unitId(verse), language, { phase: 'failed', failure, detail: err instanceof Error ? err.message : 'Something went wrong.', recording, weave, resend: err instanceof TutorError ? err.resend : undefined });
        }
      })();
    },
    [book, chapter, title, set],
  );

  // The recording is over (let go, or the ten-minute cap): short ones are taps, the rest go to the mill.
  const finish = useCallback(
    (h: Hold, recording: Recording): void => {
      if (hold.current === h) hold.current = null;
      h.giveBack?.();
      if (recording.durationMs < MIN_READING_MS) set(unitId(h.verse), h.lang, { phase: 'tap' });
      else if (recording.durationMs < SHORT_READING_MS) set(unitId(h.verse), h.lang, { phase: 'short' });
      else send(h.verse, h.view, h.lang, recording, h.weave);
    },
    [send, set],
  );

  const press = useCallback(
    (verse: Verse, weave?: WovenReading | null): void => {
      if (hold.current) return;
      // Page audio can take the microphone: nothing is read aloud while he reads. A Listen is paused, not ended, and goes on when the recording is over.
      const giveBack = interruptListen();
      if (giveBack) stopWordSaid();
      else {
        stopReading();
        stopSpeaking();
      }
      const h: Hold = {
        giveBack,
        verse,
        view: shown.current.view,
        lang: shown.current.lang,
        weave,
        // the recorder hands the clip on by itself at the ten-minute cap
        recorder: recorderSeam.make((recording) => {
          h.over = true;
          buzz(15);
          finish(h, recording);
        }),
        started: false,
        released: false,
        dropped: false,
        over: false,
      };
      hold.current = h;
      set(unitId(verse), h.lang, { phase: 'recording' });
      h.recorder.start().then(
        () => {
          h.started = true;
          if (h.dropped) h.recorder.cancel();
          else if (h.released) void h.recorder.stop().then((recording) => finish(h, recording));
          else buzz(30);
        },
        (err: unknown) => {
          if (hold.current === h) hold.current = null;
          h.giveBack?.();
          if (h.dropped) return;
          const detail = err instanceof MicUnavailable || err instanceof Error ? err.message : 'The microphone could not be used.';
          set(unitId(verse), h.lang, { phase: 'failed', failure: 'mic', detail });
        },
      );
    },
    [finish, set],
  );

  const release = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.released = true;
    buzz(15);
    // A stop() that finds the cap already stopped it fails: the cap hands that clip on, so there is nothing to do here.
    if (h.started) void h.recorder.stop().then((recording) => finish(h, recording), () => undefined);
  }, [finish]);

  const drop = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.dropped = true;
    hold.current = null;
    h.giveBack?.();
    if (h.started) h.recorder.cancel();
    set(unitId(h.verse), h.lang, { phase: 'dropped' });
  }, [set]);

  const retry = useCallback(
    (verse: Verse): void => {
      const state = states[unitId(verse)];
      if (state?.phase === 'failed' && state.recording) send(verse, view, lang, state.recording, state.weave, state.resend);
    },
    [states, send, view, lang],
  );

  return { states, press, release, drop, retry };
}
