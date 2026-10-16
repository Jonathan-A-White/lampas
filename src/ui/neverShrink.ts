// src/ui/neverShrink.ts — a box that never gets shorter while it is on screen (mw-s1dc0n.6). Closing a list or switching to a shorter one at the end of a
// scrolled sheet would leave less to scroll, and the browser would slide everything above it down under his thumb: a double tap on the control then lands
// on whatever came down (in the Share to Lampas sheet, 'New talk'). Held at the tallest it has been, the box keeps its scroll, and the control stays put.
import { useCallback } from 'react';

/** A ref callback for the content of a scroll box: its min-height follows the tallest it has been until it is taken off the screen. */
export function useNeverShrink(): (box: HTMLElement | null) => (() => void) | undefined {
  return useCallback((box: HTMLElement | null) => {
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    let tallest = 0;
    // The min-height is always the height the box has now, so a shrink is held off in the same layout that would make it, before any tap can land.
    const hold = new ResizeObserver(() => {
      const height = box.getBoundingClientRect().height;
      if (height <= tallest) return;
      tallest = height;
      box.style.minHeight = `${height}px`;
    });
    hold.observe(box);
    return () => hold.disconnect();
  }, []);
}
