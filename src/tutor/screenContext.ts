// src/tutor/screenContext.ts — the one place the screen on show leaves its facts for the Ask the tutor control (mw-5r3p30.91). A screen calls
// useReportScreen(context) while it is mounted; the control reads useScreenContext(). Not the bus: the usage log counts every bus event.
import { useEffect, useSyncExternalStore } from 'react';
import type { ScreenContext } from './screen';

let current: ScreenContext | null = null;
const listeners = new Set<() => void>();

/** Leaves `context` as the facts of the screen on show; the returned function takes them away again, unless a later screen has reported since. */
export function reportScreen(context: ScreenContext): () => void {
  current = context;
  listeners.forEach((l) => l());
  return () => {
    if (current !== context) return;
    current = null;
    listeners.forEach((l) => l());
  };
}

/** What the screen on show reported, or null. */
export const screenContextNow = (): ScreenContext | null => current;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The facts the screen on show reported, live. */
export const useScreenContext = (): ScreenContext | null => useSyncExternalStore(subscribe, screenContextNow);

/** Reports `context` while the calling screen is mounted; a context with the same name and facts is not reported again. */
export function useReportScreen(context: ScreenContext): void {
  const key = JSON.stringify(context);
  useEffect(() => reportScreen(JSON.parse(key) as ScreenContext), [key]);
}
