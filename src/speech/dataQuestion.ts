// src/speech/dataQuestion.ts — the question of mw-zbgo4ep.30 held between the tap that raised it and the answer: one pending question at a time, the Reader draws it
// (src/speech/DataVoiceQuestion.tsx). `answer` runs straight from the button's tap, so the audio element plays from a tap (docs/pwa-best-practices.md section 12).
import { useSyncExternalStore } from 'react';

export type DataAnswer = 'david' | 'phone';

let pending: ((answer: DataAnswer) => void) | null = null;
const listeners = new Set<() => void>();
const changed = (): void => listeners.forEach((l) => l());

/** Raises the question; `answer` starts the reading the tap asked for. A question already up is replaced. */
export function askAboutData(answer: (choice: DataAnswer) => void): void {
  pending = answer;
  changed();
}

/** Takes the question down without answering it. */
export function dropDataQuestion(): void {
  if (pending === null) return;
  pending = null;
  changed();
}

/** He answered: the reading starts. */
export function answerDataQuestion(choice: DataAnswer): void {
  const run = pending;
  pending = null;
  changed();
  run?.(choice);
}

export function useDataQuestion(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending !== null,
    () => false,
  );
}
