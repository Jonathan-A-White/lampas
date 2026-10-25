// src/talk/useSendToMakers.ts — the state of 'Send to the makers' (mw-5r3p30.760, SendToMakers.tsx draws it): the Composer holds its words and files itself and hands them
// on only through its Send, so the action presses that Send with a mark on it; the Composer's onSend, given to `dispatch`, reads the mark and files the request
// (sendToMakers, src/talk/makers.ts) in place of asking the tutor. Nothing is sent without the tap.
import { useEffect, useRef, useState } from 'react';
import type { ComposerMessage } from 'voice-kit/composer';

const NOTHING_YET = 'Say or type what the makers should know, or add a picture, then tap Send to the makers.';
/** The Composer's own Send buttons: beside the text box, and the arrow beside the bar. */
const SEND_BUTTONS = 'button.bk-composer__send, button.bk-composer__bar-send';

export type Phase = 'sending' | 'sent' | undefined;

export interface MakersAction {
  phase: Phase;
  /** a line that says why the tap sent nothing */
  note: string | undefined;
  /** the tap: presses the Composer's Send, marked */
  start: (host: HTMLElement | null) => void;
  /** The Composer's onSend: a send marked by `start` goes to the makers (`toMakers`), any other is the Composer's own (`toTutor`). */
  dispatch: (
    message: ComposerMessage,
    toMakers: (message: ComposerMessage) => Promise<void>,
    toTutor: (message: ComposerMessage) => Promise<boolean | void> | boolean | void,
  ) => Promise<boolean | void> | boolean | void;
}

export function useSendToMakers(): MakersAction {
  const marked = useRef(false);
  const mounted = useRef(true);
  const [phase, setPhase] = useState<Phase>();
  const [note, setNote] = useState<string>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const start = (host: HTMLElement | null): void => {
    setNote(undefined);
    const send = host?.querySelector<HTMLButtonElement>(SEND_BUTTONS);
    if (!send || send.disabled || phase === 'sending') {
      if (phase !== 'sending') setNote(NOTHING_YET);
      return;
    }
    // the Composer calls onSend inside this click, before anything waits: the mark is read there and put down at once
    marked.current = true;
    try {
      send.click();
    } finally {
      marked.current = false;
    }
  };
  const dispatch: MakersAction['dispatch'] = (message, toMakers, toTutor) => {
    if (!marked.current) return toTutor(message);
    marked.current = false;
    return (async () => {
      setPhase('sending');
      try {
        await toMakers(message);
      } catch (err) {
        if (mounted.current) setPhase(undefined);
        throw err;
      }
      if (mounted.current) setPhase('sent');
      return true;
    })();
  };
  return { phase, note, start, dispatch };
}
