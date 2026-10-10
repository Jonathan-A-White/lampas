// src/speech/barShown.ts — whether the speaking bar is up (src/speech/SpeakingBarSlot.tsx), for a control that must clear it.
import { useSpeech } from 'bsv-kit/speech/react';
import { isWordSpeech } from './greek';

/** Whether the bar is up: something is read aloud (a reading, not a word said alone), playing or paused. */
export function useBarShown(): boolean {
  const speech = useSpeech();
  return speech.status !== 'idle' && !isWordSpeech(speech.key);
}
