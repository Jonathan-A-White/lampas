// src/ui/neverShrink.ts — a box that does not get shorter under his thumb while it is on screen (mw-s1dc0n.6, mw-5r3p30.736). Closing a list or switching to a shorter one at the end of a
// scrolled sheet would leave less to scroll, and the browser would slide everything above it down under his thumb: a double tap on the control then lands
// on whatever came down (in the Share to Lampas sheet, 'New talk'). Held at the tallest it has been, the box keeps its scroll, and the control stays put.
// But a box held for good leaves a sheet that opens scrolled over a blank band (the list that was closed, still holding its height): so the hold ends once the
// content has stayed shorter, and he has not touched the box, for SHRINK_HOLD_MS. The box then is as tall as its content and the browser takes the scroll back
// to where there is something to show.
import { useCallback } from 'react';

/** How long a shorter box is held at its old height: past a double tap and the look at what it did, short enough that a blank band is not the sheet he reads. PROVISIONAL */
export const SHRINK_HOLD_MS = 1200;

/** The height the content of `box` has: the end of its last child, as it is laid out whatever min-height the box is held at. */
function contentHeight(box: HTMLElement): number {
  const last = box.lastElementChild;
  if (!last) return 0;
  const style = getComputedStyle(box);
  return last.getBoundingClientRect().bottom - box.getBoundingClientRect().top + (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0);
}

/** A ref callback for the content of a scroll box: its min-height follows the tallest it has been until it is taken off the screen, or until the content has been shorter for SHRINK_HOLD_MS with no touch on the box. */
export function useNeverShrink(): (box: HTMLElement | null) => (() => void) | undefined {
  return useCallback((box: HTMLElement | null) => {
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    let tallest = 0;
    let touching = false;
    let release: ReturnType<typeof setTimeout> | undefined;
    // The min-height is always the height the box has now, so a shrink is held off in the same layout that would make it, before any tap can land.
    const hold = new ResizeObserver(() => {
      const height = box.getBoundingClientRect().height;
      if (height <= tallest) return;
      tallest = height;
      box.style.minHeight = `${height}px`;
    });
    // A change to the content restarts the wait: a shorter box is let go only once its content has been still, and nothing is under his finger.
    const letGo = (): void => {
      release = undefined;
      if (touching) {
        rearm();
        return;
      }
      const height = contentHeight(box);
      if (height <= 0 || height >= tallest - 1) return;
      tallest = height;
      box.style.minHeight = `${height}px`;
    };
    const rearm = (): void => {
      clearTimeout(release);
      release = setTimeout(letGo, SHRINK_HOLD_MS);
    };
    const changes = new MutationObserver(rearm);
    const down = (): void => {
      touching = true;
    };
    const up = (): void => {
      touching = false;
      rearm();
    };
    hold.observe(box);
    changes.observe(box, { childList: true, subtree: true, characterData: true });
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);
    return () => {
      hold.disconnect();
      changes.disconnect();
      clearTimeout(release);
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', up);
    };
  }, []);
}
