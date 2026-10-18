// src/hardSounds/useTry.ts — the Try it step's recording (mw-5r3p30.363): he holds, says the word, lets go, and hears his try and then the Greek voice. It
// records with the one recorder Read it aloud uses (src/audio/recorder.ts, through recorderSeam, so a test hands it a fake); this file makes no recorder of its
// own (tests/unit/try-it.test.ts counts them). The clip lives only here, in memory, as a Blob and an object URL: it is never written to the phone's store and never
// sent, and it is let go when he says another word, picks another (the caller keys this hook's component by the word) or the step closes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { MicUnavailable, recorderSeam, type HoldRecorder, type Recording } from '../audio/recorder';
import { speakWord, stopSpeaking, stopWordSaid } from '../speech/greek';

/** A hold shorter than this is a tap, not a try. */
export const MIN_TRY_MS = 500;

/** idle: nothing yet; recording: he is holding; tap: let go too soon; denied: the microphone is refused; try: his clip plays; voice: the Greek voice. */
export type TryPhase = 'idle' | 'recording' | 'tap' | 'denied' | 'try' | 'voice';

interface Hold {
  recorder: HoldRecorder;
  started: boolean;
  released: boolean;
  dropped: boolean;
  over: boolean;
}

interface Kept {
  url: string;
  audio: HTMLAudioElement;
  /** his try is playing and the voice has not followed it yet: its end (or its failing) hands on to the voice once, however many events come */
  playing: boolean;
}

export function useTry(word: string): {
  phase: TryPhase;
  detail: string;
  press(): void;
  release(): void;
  drop(): void;
  again(): void;
} {
  const [phase, setPhase] = useState<TryPhase>('idle');
  const [detail, setDetail] = useState('');
  const hold = useRef<Hold | null>(null);
  const kept = useRef<Kept | null>(null);
  const live = useRef(true);

  const sayVoice = useCallback(
    (next: TryPhase = 'voice'): void => {
      setPhase(next);
      speakWord(word, 'greek');
    },
    [word],
  );

  /** His try is dropped: its sound stopped and its address let go. */
  const letGo = useCallback((): void => {
    const k = kept.current;
    if (!k) return;
    kept.current = null;
    k.audio.onended = null;
    k.audio.onerror = null;
    k.audio.pause();
    URL.revokeObjectURL(k.url);
  }, []);

  const playTry = useCallback(
    (mine: Kept): void => {
      stopSpeaking();
      setPhase('try');
      mine.playing = true;
      mine.audio.currentTime = 0;
      // an older browser's play() gives no promise; a clip that will not play goes on to the voice
      Promise.resolve(mine.audio.play()).catch(() => {
        if (live.current && kept.current === mine && mine.playing) {
          mine.playing = false;
          sayVoice();
        }
      });
    },
    [sayVoice],
  );

  const keep = useCallback(
    (recording: Recording): void => {
      letGo();
      const url = URL.createObjectURL(recording.blob);
      const audio = new Audio(url);
      const mine: Kept = { url, audio, playing: false };
      const over = (): void => {
        if (!live.current || kept.current !== mine || !mine.playing) return;
        mine.playing = false;
        sayVoice();
      };
      audio.onended = over;
      audio.onerror = () => over();
      kept.current = mine;
      playTry(mine);
    },
    [letGo, playTry, sayVoice],
  );

  const finish = useCallback(
    (h: Hold, recording: Recording): void => {
      if (hold.current === h) hold.current = null;
      if (!live.current) return;
      if (recording.durationMs < MIN_TRY_MS) setPhase('tap');
      else keep(recording);
    },
    [keep],
  );

  const press = useCallback((): void => {
    if (hold.current) return;
    // page audio can take the microphone: nothing is spoken or played while he says it
    stopSpeaking();
    stopWordSaid();
    if (kept.current) {
      kept.current.playing = false;
      kept.current.audio.pause();
    }
    const h: Hold = {
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
      (err: unknown) => {
        if (hold.current === h) hold.current = null;
        if (h.dropped || !live.current) return;
        setDetail(err instanceof MicUnavailable || err instanceof Error ? err.message : 'The microphone could not be used.');
        // no microphone: he still hears the Greek voice
        sayVoice('denied');
      },
    );
  }, [finish, sayVoice]);

  const release = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.released = true;
    if (h.started) void h.recorder.stop().then((recording) => finish(h, recording), () => undefined);
  }, [finish]);

  const drop = useCallback((): void => {
    const h = hold.current;
    if (!h || h.over) return;
    h.dropped = true;
    hold.current = null;
    if (h.started) h.recorder.cancel();
    setPhase('idle');
  }, []);

  const again = useCallback((): void => {
    const k = kept.current;
    if (k) playTry(k);
    else sayVoice();
  }, [playTry, sayVoice]);

  // the step closes: the recording is cancelled, his try dropped, the voice stopped
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      const h = hold.current;
      hold.current = null;
      if (h) {
        h.dropped = true;
        if (h.started) h.recorder.cancel();
      }
      letGo();
      stopSpeaking();
    };
  }, [letGo]);

  return { phase, detail, press, release, drop, again };
}
