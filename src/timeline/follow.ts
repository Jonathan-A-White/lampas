// src/timeline/follow.ts — the strip follows the chapter (mw-fnvjof.17.317.3, docs/timeline-design.md 'Flights'): the Reader is made afresh for each chapter, and its dock and strip with
// it, so a strip that goes because he turned to another chapter leaves where it stood here, for that chapter's strip to begin from and fly to its own time. It is left only for the
// chapter the address names as the old strip goes (TimelineStrip.tsx), and it is gone once any strip has opened: a dock closed and opened again, or the Reader left and come back to,
// opens at the chapter's time, as the design asks (nothing of where the strip was panned or zoomed is remembered). Nothing is kept past the page.
import type { View } from './axis';

let left: { to: string; view: View } | null = null;

/** The strip of a chapter he has just left stood at `view`; `to` is the chapter he turned to, as 'isa/2'. */
export function leaveFor(to: string, view: View): void {
  left = { to, view: { ...view } };
}

/** Where the last chapter's strip stood, for the strip of `place` ('isa/2') to fly from: once, and only when it was left for this chapter. */
export function takeFor(place: string): View | null {
  const view = left?.to === place ? left.view : null;
  left = null;
  return view;
}
