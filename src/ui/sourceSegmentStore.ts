// src/ui/sourceSegmentStore.ts — where the Greek | Hebrew segment (src/ui/SourceSegment.tsx, mw-gdcyf98.10, PROVISIONAL) is kept: a setting-less localStorage key,
// lampas.sourceSegment. It is no setting, so the tutor does not read it and no dial moves it.
import { useSyncExternalStore } from 'react';
import type { LadderLang } from '../data/grammar/ladders';

/** The key the segment is kept under (no setting of the settings store). */
export const SOURCE_SEGMENT_KEY = 'lampas.sourceSegment';

const listeners = new Set<() => void>();

/** The language the segment is on: Greek until he chooses, and when the key holds anything else. */
export function readSourceSegment(): LadderLang {
  try {
    return window.localStorage.getItem(SOURCE_SEGMENT_KEY) === 'hbo' ? 'hbo' : 'grc';
  } catch {
    return 'grc';
  }
}

/** Moves the segment, for every screen that shows it. */
export function writeSourceSegment(to: LadderLang): void {
  try {
    window.localStorage.setItem(SOURCE_SEGMENT_KEY, to);
  } catch {
    // storage refused: the segment holds for this visit only
  }
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** The segment's language, live. */
export const useSourceSegment = (): LadderLang => useSyncExternalStore(subscribe, readSourceSegment);

