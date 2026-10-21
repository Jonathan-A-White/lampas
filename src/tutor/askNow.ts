// src/tutor/askNow.ts — a screen's own Ask the tutor button (mw-irpgqi.3: the Paradigms list and tables): the round control's sheet (src/AskTutor.tsx) is the only tutor
// entry a full screen has, so a button the screen draws itself asks that sheet to open, with the first question to send when the talk it opens has no turn yet. Not the bus: the
// usage log counts every bus event. The screen reports its facts (screenContext.ts) and, for a talk of its own, the key it is kept under.
import { useSyncExternalStore } from 'react';
import type { TalkFocus } from '../services/talk';

/** The first question of a talk a screen opens: sent only when the talk has none yet, so reopening it shows what was said. */
export interface FirstAsk {
  question: string;
  focus?: TalkFocus;
}

/** One request to open the sheet; `id` tells a new request from one the sheet has met. */
export interface AskRequest {
  id: number;
  first?: FirstAsk;
}

let current: AskRequest | null = null;
let lastId = 0;
const listeners = new Set<() => void>();

/** Asks the round control's sheet to open on the screen on show, with `first` as its first question when the talk is empty. */
export function askTheTutor(first?: FirstAsk): void {
  current = { id: ++lastId, first };
  listeners.forEach((l) => l());
}

/** The newest request, or null before any. */
export const askRequestNow = (): AskRequest | null => current;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The newest request to open the sheet, live. */
export const useAskRequest = (): AskRequest | null => useSyncExternalStore(subscribe, askRequestNow);
