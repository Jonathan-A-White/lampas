// src/speech/barShown.ts — whether the speaking bar is up (src/speech/SpeakingBarSlot.tsx), for a control that must clear it.
import { useSpeech } from 'voice-kit/speech/react';
import { isWordSpeech } from './greek';
import { useReading } from './readAloud';

/** Whether a recorded reading is going or paused: its bar is RecordedBar's, not the package's. */
export function useRecordedShown(): boolean {
  const reading = useReading();
  return reading.recorded && reading.status !== 'idle';
}

/** Whether the bar is up: something is read aloud (a reading, not a word said alone), playing or paused; a recorded reading has the bar from the first second to its end,
 * a word said beside it included. */
export function useBarShown(): boolean {
  const speech = useSpeech();
  const recorded = useRecordedShown();
  return recorded || (speech.status !== 'idle' && !isWordSpeech(speech.key));
}
