// src/timeline/useTimelineDock.ts — what the Reader holds of the timeline in its dock (mw-fnvjof.17.317.2): the mounted strip and where it last came to rest, turned into what the dock's handle
// row shows (its name, and Whole Bible where a text has Link: a pressed button) and what the Reader's buttons for a gesture do (Earlier and Later, src/ReaderControls.tsx).
import { useCallback, useState } from 'react';
import type { DockLink } from '../reader/split/Dock';
import type { TimelineControls } from '../ReaderControls';
import type { Strip, StripRest } from './strip';

export interface TimelineDockState {
  /** the handle row's name: 'Timeline', or 'No dates for 3 John' for a book with no dated event */
  title: string;
  /** the name says there is nothing of the book's own to show */
  quiet: boolean;
  /** Whole Bible, where a text has Link */
  whole: DockLink;
  /** the drag left and right, as buttons; null until the strip is drawn */
  controls: TimelineControls | null;
  onStrip(strip: Strip | null): void;
  onRest(rest: StripRest): void;
}

/** `place` is the open chapter ('isa/1'): what an earlier chapter's strip said is not this one's. `bookName` as the Reader writes it. */
export function useTimelineDock(place: string, bookName: string): TimelineDockState {
  const [strip, setStrip] = useState<Strip | null>(null);
  const [rested, setRested] = useState<{ at: string; rest: StripRest } | null>(null);
  const onRest = useCallback((rest: StripRest) => setRested({ at: place, rest }), [place]);
  const rest = rested?.at === place ? rested.rest : null;
  const undated = rest !== null && !rest.dated;
  return {
    title: undated ? `No dates for ${bookName}` : 'Timeline',
    quiet: undated,
    whole: { label: 'Whole Bible', on: rest?.whole ?? false, toggle: () => strip?.toggleWhole() },
    controls: strip ? { earlier: strip.earlier, later: strip.later } : null,
    onStrip: setStrip,
    onRest,
  };
}
