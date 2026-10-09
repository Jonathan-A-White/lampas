// src/useReadChecks.ts — the reading check's state, by verse: he holds Read, the phone records (src/audio/recorder.ts), he
// lets go and the clip goes to the mill (src/services/reading.ts), and the answer is kept in Dexie when it comes. One reading
// at a time. Pressing stops any reading aloud (page audio could take the microphone); a buzz says the microphone is live;
// a press under 500 ms is a tap and a hold under 1 s is too short, and neither sends anything; a slide off the button drops it. A reading keeps waiting when he selects
// another verse, and all stop when the screen goes away. The view decides what is read and in which language the mill
// scores it (English, or the Greek in the chosen pronunciation's scoring language); the states returned are those of the
// language shown, a reading in the other one carries on unseen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Verse } from './data/chapter';
import { keepVerseReading, verseRef } from './data/repositories';
import { MicUnavailable, recorderSeam, type HoldRecorder, type Recording } from './audio/recorder';
import { getDeviceKeyBytes } from './services/deviceKey';
import { askVerseRead, buildReadingRequest, readingLang, type ReadingView } from './services/reading';
import { TutorError, type TutorFailure } from './services/tutor';
import { stopReading } from './speech/readAloud';
import { stopSpeaking } from './speech/greek';

/** A press shorter than this is a tap, not a reading. */
export const MIN_READING_MS = 500;
/** A hold shorter than this is too short to hold a verse (the mill cannot score about a second of sound): nothing is sent. */
export const SHORT_READING_MS = 1000;

export const TAP_HINT = 'Hold while you read';
export const SHORT_HINT = 'Hold Read for the whole verse';
export const DROPPED_NOTE = 'Dropped. Hold to try again';

/** What a verse's reading is doing right now. */
export type ReadState =
  | { phase: 'recording' }
  | { phase: 'tap' }
  | { phase: 'short' }
  | { phase: 'dropped' }
  | { phase: 'sending' | 'waiting'; startedAt: number }
  | { phase: 'failed'; failure: TutorFailure | 'mic'; detail: string; recording?: Recording };

type States = Record<number, ReadState | undefined>;
type AllStates = Record<string, ReadState | undefined>;

/** A verse's reading state is kept by verse and language. */
const stateKey = (verse: number, lang: string): string => `${lang}:${verse}`;

export interface UseReadChecks {
  states: States;
  /** the finger is down on Read for this verse */
  press: (verse: Verse) => void;
  /** the finger lifted on the button */
  release: () => void;
  /** the finger slid off, or the browser cancelled the press */
  drop: () => void;
  /** send the recording of a failed reading again */
  retry: (verse: Verse) => void;
}

interface Hold {
  verse: Verse;
  view: ReadingView;
  lang: string;
  recorder: HoldRecorder;
  started: boolean;
  released: boolean;
  dropped: boolean;
  /** the clip was handed on (by the one-minute cap) */
  over: boolean;
}

const buzz = (ms: number) => navigator.vibrate?.(ms);

export function useReadChecks(book: string, chapter: number, title: string, view: ReadingView = 'english', pronunciation?: string): UseReadChecks {
  const [all, setAll] = useState<AllStates>({});
  const lang = readingLang(view, pronunciation);
  // what a press made now reads: the view and language shown
  const shown = useRef({ view, lang });
  useEffect(() => {
    shown.current = { view, lang };
  });
  const states = useMemo(() => {
    const here: States = {};
    const prefix = `${lang}:`;
    for (const [key, state] of Object.entries(all)) if (key.startsWith(prefix)) here[Number(key.slice(prefix.length))] = state;
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

  const set = useCallback((verse: number, language: string, state: ReadState | undefined): void => {
    if (!live.current.signal.aborted) setAll((states) => ({ ...states, [stateKey(verse, language)]: state }));
  }, []);

  const send = useCallback(
    (verse: Verse, readView: ReadingView, language: string, recording: Recording): void => {
      const signal = live.current.signal;
      const startedAt = Date.now();
      set(verse.n, language, { phase: 'sending', startedAt });
      void (async () => {
        try {
          const answer = await askVerseRead(buildReadingRequest(`${title}:${verse.n}`, verse, readView, language), recording, {
            key: getDeviceKeyBytes(),
            signal,
            onSent: () => set(verse.n, language, { phase: 'waiting', startedAt }),
          });
          await keepVerseReading(verseRef(book, chapter, verse.n), answer.verdict, answer.focus_words, answer.note, language);
          set(verse.n, language, undefined);
        } catch (err) {
          if (signal.aborted) return;
          const failure = err instanceof TutorError ? err.failure : 'unreachable';
          set(verse.n, language, { phase: 'failed', failure, detail: err instanceof Error ? err.message : 'Something went wrong.', recording });
        }
      })();
    },
    [book, chapter, title, set],
  );

  // The recording is over (let go, or the one-minute cap): short ones are taps, the rest go to the mill.
  const finish = useCallback(
    (h: Hold, recording: Recording): void => {
      if (hold.current === h) hold.current = null;
      if (recording.durationMs < MIN_READING_MS) set(h.verse.n, h.lang, { phase: 'tap' });
      else if (recording.durationMs < SHORT_READING_MS) set(h.verse.n, h.lang, { phase: 'short' });
      else send(h.verse, h.view, h.lang, recording);
    },
    [send, set],
  );

  const press = useCallback(
    (verse: Verse): void => {
      if (hold.current) return;
      // Page audio can take the microphone: nothing is read aloud while he reads.
      stopReading();
      stopSpeaking();
      const h: Hold = {
        verse,
        view: shown.current.view,
        lang: shown.current.lang,
        // the recorder hands the clip on by itself at the one-minute cap
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
      set(verse.n, h.lang, { phase: 'recording' });
      h.recorder.start().then(
        () => {
          h.started = true;
          if (h.dropped) h.recorder.cancel();
          else if (h.released) void h.recorder.stop().then((recording) => finish(h, recording));
          else buzz(30);
        },
        (err: unknown) => {
          if (hold.current === h) hold.current = null;
          if (h.dropped) return;
          const detail = err instanceof MicUnavailable || err instanceof Error ? err.message : 'The microphone could not be used.';
          set(verse.n, h.lang, { phase: 'failed', failure: 'mic', detail });
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
    if (h.started) h.recorder.cancel();
    set(h.verse.n, h.lang, { phase: 'dropped' });
  }, [set]);

  const retry = useCallback(
    (verse: Verse): void => {
      const state = states[verse.n];
      if (state?.phase === 'failed' && state.recording) send(verse, view, lang, state.recording);
    },
    [states, send, view, lang],
  );

  return { states, press, release, drop, retry };
}
