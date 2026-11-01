// features/steps/open-tutor.ts — opens the tutor in a step the way the app's one door does (src/tutor/door.ts, mw-5r3p30.880): a tap on the floating ?. WHAT it opens the tutor about is the app's choice, not
// the step's: the newest thing a screen or sheet registered (the verse when the Verse view is open, the word when a word sheet is, the lesson when an idea sheet is, else the chapter or the screen). A step that
// wants a verse opens the Verse view first and then calls this. The Playwright twin is tests/e2e/open-tutor.ts. A two-finger tap opens nothing (mw-5r3p30.882: it goes in and out of immersive reading);
// twoFingerTap is here for the steps that prove it.
import { act, fireEvent, waitFor } from '@testing-library/react';
import { TWO_FINGERS } from '../../tests/support/two-finger';

/** The sheet every tutor talk is: 'Talk about Romans 8', 'Talk about Romans 8:28' and 'Ask the tutor: Words' (src/Talk.tsx). */
export const TALK_SHEET = /^(Talk about |Ask the tutor: |Talk with the tutor)/;

/** The floating ? (src/AskTutor.tsx FloatingTutor), the tutor's one door; null while it is not drawn (nothing to ask about, a Talk sheet open, or no licence). */
export const floatingTutor = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-floating-tutor]');

/** One touch event, as a browser sends it: `fingers` are the points now touching. */
function touch(type: 'touchstart' | 'touchend', fingers: ReadonlyArray<{ x: number; y: number }>, target: EventTarget): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: fingers.map((p) => ({ clientX: p.x, clientY: p.y })) });
  act(() => void target.dispatchEvent(event));
}

/** Two fingers landing together and lifting together on `on` (the document by default). */
export function twoFingerTap(on: EventTarget = document): void {
  touch('touchstart', TWO_FINGERS, on);
  touch('touchend', [], on);
}

/** The open dialog named `name`, found beside its own markup: a role query on `screen` walks every word of the chapter (5 s on a loaded host, mw-5r3p30.555). Null when none is on screen. */
function dialogNamed(name: RegExp | string): HTMLElement | null {
  const matches = (text: string) => (typeof name === 'string' ? text === name : name.test(text));
  for (const dialog of document.querySelectorAll<HTMLElement>('[role="dialog"]')) {
    if (dialog.closest('[aria-hidden="true"]')) continue;
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const text = dialog.getAttribute('aria-label') ?? (labelledBy ? document.getElementById(labelledBy)?.textContent : null) ?? '';
    if (matches(text.trim())) return dialog;
  }
  return null;
}

/**
 * Opens the tutor with a tap on the floating ? and waits for its Talk sheet (`sheet`, by default any talk). Returns the sheet.
 */
export async function openTutor({ sheet = TALK_SHEET }: { sheet?: RegExp | string; on?: EventTarget } = {}): Promise<HTMLElement> {
  // the licence and the Hand are read a moment after the app opens: the ? is drawn once they are
  const door = await waitFor(() => {
    const found = floatingTutor();
    if (!found) throw new Error('the floating ? is not drawn');
    return found;
  });
  act(() => void fireEvent.click(door));
  return waitFor(() => {
    const now = dialogNamed(sheet);
    if (!now) throw new Error('the tutor did not open');
    return now;
  });
}
