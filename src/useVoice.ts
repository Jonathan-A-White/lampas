// src/useVoice.ts — push-to-talk for the Bible talk. press() starts the phone's recogniser (src/services/listen.ts) and
// stops any reading aloud; his words so far are `transcript`, live; release() waits for the last words and hands them to
// `onSend` as the turn; abort() drops them. Errors come back as a `notice` worded for him, never a dead button. A phone
// with no recogniser says so and asks the sheet to focus its typed field (`typing` counts those asks).
import { useCallback, useEffect, useRef, useState } from 'react';
import { isListenSupported, startListening, type ListenErrorKind, type ListenSession } from './services/listen';
import { stopReading } from './speech/readAloud';

export interface VoiceNotice {
  kind: ListenErrorKind | 'empty';
  message: string;
}

export interface Voice {
  /** the finger is down and the recogniser is listening (or starting to) */
  listening: boolean;
  /** the recogniser has said the microphone is open */
  ready: boolean;
  /** his words so far, while he holds */
  transcript: string;
  notice: VoiceNotice | undefined;
  /** how many times a phone with no recogniser has sent him to the typed field */
  typing: number;
  press: () => void;
  release: () => Promise<void>;
  abort: () => void;
  clearNotice: () => void;
}

const buzz = (ms: number) => navigator.vibrate?.(ms);

export function useVoice(onSend: (text: string) => void): Voice {
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [notice, setNotice] = useState<VoiceNotice | undefined>(undefined);
  const [typing, setTyping] = useState(0);
  const session = useRef<ListenSession | null>(null);
  // the hold that is going on: a late word from an earlier one is ignored
  const hold = useRef<object | null>(null);
  const send = useRef(onSend);
  useEffect(() => {
    send.current = onSend;
  });

  const drop = useCallback(() => {
    hold.current = null;
    session.current?.abort();
    session.current = null;
    setListening(false);
    setReady(false);
    setTranscript('');
  }, []);
  useEffect(() => drop, [drop]);

  const press = useCallback(() => {
    if (session.current) return;
    // Page audio can take the microphone from the recogniser: nothing is read aloud while he talks.
    stopReading();
    setNotice(undefined);
    if (!isListenSupported()) {
      setNotice({ kind: 'not-supported', message: 'This phone cannot turn speech into text. Type your question instead.' });
      setTyping((n) => n + 1);
      return;
    }
    const thisHold = {};
    hold.current = thisHold;
    const started = startListening({
      lang: 'en-US',
      onInterim: (text) => hold.current === thisHold && setTranscript(text),
      onStart: () => hold.current === thisHold && setReady(true),
      // The recogniser failed while he is still holding: the hold is over, and he is told why.
      onError: (error) => {
        if (hold.current !== thisHold) return;
        drop();
        setNotice({ kind: error.kind, message: error.message });
      },
    });
    if (!started.ok) {
      hold.current = null;
      setNotice({ kind: started.error.kind, message: started.error.message });
      if (started.error.kind === 'not-supported') setTyping((n) => n + 1);
      return;
    }
    session.current = started.session;
    buzz(30);
    setListening(true);
    setReady(false);
    setTranscript('');
  }, [drop]);

  const release = useCallback(async () => {
    const open = session.current;
    if (!open) return;
    const thisHold = hold.current;
    session.current = null;
    buzz(15);
    const result = await open.stop();
    // Dropped while the last words were awaited (the sheet closed): nothing is sent. Pressed again meanwhile: the new hold
    // owns the screen, and these words, which he released, still go.
    if (hold.current === null) return;
    if (hold.current === thisHold) {
      hold.current = null;
      setListening(false);
      setReady(false);
      setTranscript('');
    }
    const text = result.text.trim();
    if (!text) {
      if (hold.current === null) setNotice({ kind: result.ok ? 'empty' : result.error.kind, message: result.ok ? 'No speech was heard.' : result.error.message });
      return;
    }
    send.current(text);
  }, []);

  return { listening, ready, transcript, notice, typing, press, release, abort: drop, clearNotice: () => setNotice(undefined) };
}
