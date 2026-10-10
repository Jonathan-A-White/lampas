// src/speech/tutorVoice.ts — the tutor's responses read aloud by themselves (mw-5r3p30.93, docs/read-aloud.md 'The tutor's responses'). Settings >
// Read the tutor's responses aloud (the 'readTutor' setting, On by default) decides whether a response is spoken the moment it arrives: the
// reading check's verdict and the answers of the Verse view's Ask the tutor, the Talk sheet and Ask the tutor from any screen. They go through the
// one engine of src/speech/readAloud.ts startAnswer, so a new question, leaving the screen or a tap on the response stops them (stopAnswer).
// The speaker on an answer (Talk's 'Hear the answer') is his own tap and ignores the setting.
import type { MouseEvent } from 'react';
import { getReadTutor } from '../data/repositories';
import { plainQuotes } from '../services/reading';
import { answerRuns } from './answerRuns';
import { startAnswer, stopAnswer, type Run } from './readAloud';

/** The id the reading check's verdict is spoken under (reading.answer): below zero, so no stored answer's id can be it. */
export const VERDICT_ID = -1;

/** The id the Verse view's stored answer `id` is spoken under: below zero too, and never VERDICT_ID (a Talk turn keeps its own, positive, id). */
export const askAnswerId = (id: number): number => -id - 1;

/** Speaks `runs` as the answer `id` if the setting is On. `stillWanted` is asked again once the saved choice is read, so a response whose screen
 * has gone away meanwhile is not spoken. */
export function speakTutor(id: number, runs: Run[], stillWanted: () => boolean = () => true): void {
  void getReadTutor().then((choice) => {
    if (choice === 'on' && runs.length > 0 && stillWanted()) startAnswer(id, runs);
  });
}

/** The verdict of a reading check as it is spoken: the heading, the note, and each word to fix with its tip, in full. The verse and the
 * chunks are for him to read, and are not spoken. */
export function verdictRuns(heading: string, note: string, words: readonly { word: string; tip: string }[]): Run[] {
  return [heading, note, ...words.map((w) => `${w.word}: ${w.tip}`)].flatMap((piece) => answerRuns(plainQuotes(piece)));
}

/** A tap on a response (not on a button or link in it) stops its speech at once. A tap in a sheet the response opened (a portal, such as the
 * Hebrew guide) bubbles here through React's tree though it is not in the response's DOM: it is the sheet's, and the answer waits paused. */
export function stopOnTap(event: MouseEvent): void {
  const target = event.target as Element;
  if (!event.currentTarget.contains(target)) return;
  if (!target.closest('button, a')) stopAnswer();
}
