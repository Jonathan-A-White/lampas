// src/speech/tutorWaiting.ts — a tutor response that came while the page was hidden (he was in another app) waits here instead of being spoken
// (mw-5r3p30.270, docs/read-aloud.md 'The tutor's responses'). The bar at the top of the app (TutorWaitingBar.tsx) says 'The tutor answered: tap to
// play' when he is back and plays it on his tap. Nothing is sent outside the app. Kept apart from tutorVoice.ts and readAloud.ts so both may use it.
import { useSyncExternalStore } from 'react';
import type { Run } from './readAloud';

export interface WaitingAnswer {
  id: number;
  runs: Run[];
}

let waiting: WaitingAnswer | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether the page is in another app or behind the phone's lock (document.visibilityState 'hidden'). */
export const pageHidden = (): boolean => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Holds a response for his return; a newer one replaces it. */
export function holdAnswer(id: number, runs: Run[]): void {
  waiting = { id, runs };
  emit();
}

/** The response that waits, or null. */
export const waitingAnswer = (): WaitingAnswer | null => waiting;

/** Drops the waiting response (a new question, leaving the screen, a tap on the bar). */
export function dropWaiting(): void {
  if (waiting === null) return;
  waiting = null;
  emit();
}

export function useWaitingAnswer(): WaitingAnswer | null {
  return useSyncExternalStore(subscribe, () => waiting, () => null);
}
