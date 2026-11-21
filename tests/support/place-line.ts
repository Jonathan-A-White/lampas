// tests/support/place-line.ts — the Reader's place line, found by waiting and tapped without a clock (mw-indx1x6.125).
// The line is drawn a moment after the chapter (it slides in with the bars), so a step that looks for it once fails on a loaded host. And it is a long-press button (src/ui/longPress.ts): a finger kept down
// 500 ms is a hold that copies the chapter, not a tap, so a user-event click (pointer down, a task of the event loop, pointer up) that a starved host stretches past 500 ms never opens the chapter. A tap here
// is the click alone, which is what a tap ends in and which has no hold to outrun; a step that means a hold keeps user.pointer (copy-format.steps.tsx holdOn).
import { fireEvent, waitFor } from '@testing-library/react';

/** The place line's button, waited for. */
export function placeLineButton(): Promise<HTMLElement> {
  return waitFor(() => {
    const line = document.querySelector<HTMLElement>('button[data-place-line]');
    if (!line) throw new Error('no place line');
    return line;
  });
}

/** Taps the place line: waits for it, then clicks it. */
export async function tapPlaceLine(): Promise<void> {
  fireEvent.click(await placeLineButton());
}
