// src/memorize/useRecallHold.ts — Lampas hears a recall (mw-fu7dqf.7, docs/layout/memorize.md): the hold a Memorize session takes his words through, by the language the recall is in.
//   'en'     voice-kit's dictation in en-US, through useTalkHold (the bar every other screen draws, talk/Bars.tsx HeldTalkBar): the words reach `onHeard` once, on release.
//   'el'     the same in el-GR with strictLang: Greek is heard as Greek or not at all, never walked on to English (which would turn his Greek into English words). A phone that cannot
//            hear Greek says so (`onUnavailable('no-greek-dictation')`), the speech service out of reach says 'offline': the session then lets him grade himself.
//   'he'     the same in he-IL with strictLang (mw-gdcyf98.15): Hebrew is heard as Hebrew or not at all ('no-hebrew-dictation' when the phone cannot).
//   'weave'  no dictation: one recogniser hears one language and a Weave verse has two. The hold records him (audio/recorder.ts, through recorderSeam as the reading check and the Try it step do)
//            and the Recording goes to `onRecording`, for sendWeave.ts to send to the mill's verse-read.
// Both are always made (hooks cannot be conditional); the screen draws `talk` for 'en' and 'el' and `record` (a RecordBar's props) for 'weave'.
import { useCallback, useEffect, useRef, useState } from 'react';
import { recorderSeam, type HoldRecorder, type Recording } from '../audio/recorder';
import { stopSpeaking, stopWordSaid } from '../speech/greek';
import { interruptListen, stopReading } from '../speech/readAloud';
import { useTalkHold, type TalkHold } from '../talk/useTalkHold';
import { SHORT_READING_MS } from '../useReadChecks';
import type { MemorizeLang } from './languages';

/** Why a recall cannot be heard on this phone, so the session grades itself: Greek (or Hebrew) is not available to dictate, English is not either, the speech service cannot be reached, or the microphone is refused. */
export type RecallUnavailable = 'no-greek-dictation' | 'no-hebrew-dictation' | 'no-dictation' | 'offline' | 'no-microphone';

/** The language the phone is asked to hear for a recall, and whether it hears that or nothing. */
export const DICTATION: Record<'en' | 'el' | 'he', { lang: string; strictLang: boolean }> = {
  en: { lang: 'en-US', strictLang: false },
  el: { lang: 'el-GR', strictLang: true },
  he: { lang: 'he-IL', strictLang: true },
};

/** What the recording is doing: nothing, being made, too short to score (under a second), dropped by a slide off. */
export type RecordPhase = 'idle' | 'recording' | 'short' | 'dropped';

/** A RecordBar's props for a Weave recall. */
export interface RecallRecord {
  listening: boolean;
  phase: RecordPhase;
  press(): void;
  release(): void;
  drop(): void;
}

export interface RecallHold {
  talk: TalkHold;
  record: RecallRecord;
}

export interface RecallHoldOptions {
  lang: MemorizeLang;
  /** what he said, as the phone's dictation wrote it, once he let go */
  onHeard(words: string): void;
  /** the Weave recall: his recording, once he let go (a hold under a second is not sent) */
  onRecording(recording: Recording): void;
  /** the recall cannot be heard here: the session grades itself */
  onUnavailable(reason: RecallUnavailable): void;
}

interface Hold {
  recorder: HoldRecorder;
  started: boolean;
  released: boolean;
  dropped: boolean;
  /** the clip was handed on by the ten-minute cap */
  over: boolean;
  giveBack: (() => void) | null;
}

export function useRecallHold({ lang, onHeard, onRecording, onUnavailable }: RecallHoldOptions): RecallHold {
  const dictation = DICTATION[lang === 'el' || lang === 'he' ? lang : 'en'];
  const latest = useRef({ onHeard, onRecording, onUnavailable });
  useEffect(() => {
    latest.current = { onHeard, onRecording, onUnavailable };
  });
  const talk = useTalkHold((words) => latest.current.onHeard(words), dictation);

  // a phone that cannot dictate this language, cannot reach its speech service or may not use the microphone: said once for the hold that failed
  const failed = talk.failure?.kind ?? talk.failureKind;
  useEffect(() => {
    if (lang === 'weave' || !failed) return;
    const reason: RecallUnavailable | null =
      failed === 'language-not-supported' || failed === 'not-supported'
        ? lang === 'el'
          ? 'no-greek-dictation'
          : lang === 'he'
            ? 'no-hebrew-dictation'
            : 'no-dictation'
        : failed === 'network'
          ? 'offline'
          : failed === 'permission-denied' || failed === 'no-microphone'
            ? 'no-microphone'
            : null;
    if (reason) latest.current.onUnavailable(reason);
  }, [failed, lang]);

  const [phase, setPhase] = useState<RecordPhase>('idle');
  const hold = useRef<Hold | null>(null);
  const live = useRef(true);

  const finish = useCallback((h: Hold, recording: Recording): void => {
    if (hold.current === h) hold.current = null;
    h.giveBack?.();
    if (!live.current) return;
    if (recording.durationMs < SHORT_READING_MS) setPhase('short');
    else {
      setPhase('idle');
      latest.current.onRecording(recording);
    }
  }, []);

  const press = useCallback((): void => {
    if (hold.current) return;
    // page audio can take the microphone: a Listen is paused (and goes on when the recording is over), anything else stops
    const giveBack = interruptListen();
    if (giveBack) stopWordSaid();
    else {
      stopReading();
      stopSpeaking();
    }
    const h: Hold = {
      giveBack,
      recorder: recorderSeam.make((recording) => {
        h.over = true;
        finish(h, recording);
      }),
      started: false,
      released: false,
      dropped: false,
      over: false,
    };
    hold.current = h;
    setPhase('recording');
    h.recorder.start().then(
      () => {
        h.started = true;
        if (h.dropped) h.recorder.cancel();
        else if (h.released) void h.recorder.stop().then((recording) => finish(h, recording));
      },
      () => {
        if (hold.current === h) hold.current = null;
        h.giveBack?.();
        if (h.dropped || !live.current) return;
        setPhase('idle');
        // the microphone is refused (or the browser cannot record): said as a recall that cannot be heard
        latest.current.onUnavailable('no-microphone');
      },
    );
  }, [finish]);

  const release = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.released = true;
    // a stop() that finds the cap already stopped it fails: the cap hands that clip on
    if (h.started) void h.recorder.stop().then((recording) => finish(h, recording), () => undefined);
  }, [finish]);

  const drop = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.dropped = true;
    hold.current = null;
    h.giveBack?.();
    if (h.started) h.recorder.cancel();
    setPhase('dropped');
  }, []);

  // the session closes: a recording still going is cancelled
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      const h = hold.current;
      hold.current = null;
      if (h) {
        h.dropped = true;
        h.giveBack?.();
        if (h.started) h.recorder.cancel();
      }
    };
  }, []);

  return { talk, record: { listening: phase === 'recording', phase, press, release, drop } };
}
