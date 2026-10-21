// src/talk/useTalkHold.ts — a hold-to-talk of the Talk sheet, the Talk bar, a verse number, Welcome and the letter drill: voice-kit/composer's useTalk with
// Lampas's settings (src/talkSettings.ts: Settings > Talk; a bar that is also tapped, with holdDelayMs, stays a hold) and the recogniser Lampas listens with (speech/askTranscriber.ts: the reading is paused while he holds, a Listen
// goes on by itself when the hold is over, and the words are noted as spoken), so every bar listens through a pause the way Ask the tutor's Composer does.
// `onWords` is what he said, once he lets go; the words of a hold that ends any other way (a slide off, the phone taking the touch, the recogniser failing, the app
// hidden) are not sent: they go to `onKept`, by default into the open Talk sheet's field (talk/keptWords.ts), so nothing he said is lost. The bar is the kit's TalkBar (talk/Bars.tsx draws it). What is added to the kit's hold is what the
// screens ask of it: `abort` (the sheet closed while he held), `clearNotice`, `ready` (the microphone is open), `typing` (counts the holds a phone
// with no recogniser sent to the typed field), `failure` (why the last hold could not go on) and `pressBegan` / `endsAHold` (the click that ends a hold is not a tap).
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTalk, type ListenErrorKind, type Transcriber } from 'voice-kit/composer';
import { askTranscriber } from '../speech/askTranscriber';
import { holdBegan, holdEnded } from './holding';
import { keepWords } from './keptWords';
import { useTalkSettings } from '../talkSettings';

/** How long a press on something that is also tapped (the Reader's Talk bar, a verse number) lasts before it is a hold: the half second a hold has always been. */
export const HOLD_AFTER_MS = 500;

export interface TalkHoldOptions {
  /** a hold begins (after `holdDelayMs`), before the microphone opens */
  onBegin?: () => void;
  /** the words of a hold that did not end in a release (how it ended: 'cancel' a slide off, 'error', 'ended' the recogniser gave up, 'hidden', 'release' a release that settled blank); the default puts them in the open sheet's field */
  onKept?: (text: string, ended: string) => void;
  /** how long a press waits before it is a hold (a press let go sooner is a tap); none: a hold from the first touch, so the first words are kept */
  holdDelayMs?: number;
}

export type TalkHold = ReturnType<typeof useTalkHold>;

export function useTalkHold(onWords: (text: string) => void, { onBegin, onKept = keepWords, holdDelayMs }: TalkHoldOptions = {}) {
  const [typing, setTyping] = useState(0);
  const [failure, setFailure] = useState<ListenErrorKind | undefined>(undefined);
  // the kind of the last failure, read when the hold ends (the state above is for the screen)
  const lastFailure = useRef<ListenErrorKind | undefined>(undefined);
  const held = useRef(false);
  const pressBegan = useCallback(() => {
    held.current = false;
  }, []);
  const endsAHold = useCallback(() => {
    const was = held.current;
    held.current = false;
    return was;
  }, []);
  const failed = useCallback((kind: ListenErrorKind) => {
    lastFailure.current = kind;
    setFailure(kind);
  }, []);
  const transcriber = useMemo<Transcriber>(
    () => ({
      supported: askTranscriber.supported,
      start(options) {
        const started = askTranscriber.start({
          ...options,
          onError: (error) => {
            failed(error.kind);
            options.onError?.(error);
          },
        });
        if (!started.ok) failed(started.error.kind);
        return started;
      },
    }),
    [failed],
  );
  // a bar that is also tapped (the Reader's Talk bar, a verse number: holdDelayMs) stays a hold whatever Talk says: Tap would begin listening at the first touch, and its tap already means something else
  const settings = useTalkSettings();
  const talk = useTalk(holdDelayMs === undefined ? settings : { ...settings, talk: 'hold' }, {
    transcriber,
    lang: 'en-US',
    appName: 'Lampas',
    holdDelayMs,
    onWords: (text, words) => {
      if (!text) return;
      if (words.status === 'heard') onWords(text);
      else onKept(text, words.ended);
    },
    onHoldStart: () => {
      holdBegan();
      held.current = true;
      lastFailure.current = undefined;
      setFailure(undefined);
      onBegin?.();
    },
    onHoldEnd: ({ cancelled }) => {
      holdEnded();
      // a phone with no recogniser asks the sheet to focus its typed field
      if (cancelled && lastFailure.current === 'not-supported') setTyping((n) => n + 1);
    },
  });
  const { bar, setNotice } = talk;
  // the hold is dropped as a finger slides off the bar is: nothing is sent
  const abort = useCallback(() => bar.onPointerCancel(), [bar]);
  const clearNotice = useCallback(() => setNotice(undefined), [setNotice]);
  return { ...talk, ready: talk.mic === 'ready', typing, failure, pressBegan, endsAHold, abort, clearNotice };
}
