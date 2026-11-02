// src/memorize/useKeyboardUp.ts — whether a phone's on-screen keyboard is up while Memorize's box is open (mw-5r3p30.983, docs/layout/memorize.md 'Typing'). The viewport meta says interactive-widget=resizes-content, so the
// keyboard shows as the window losing height: it is up when the window is a keyboard's height shorter than the tallest it has been since this hook mounted (the box mounts before the keyboard comes up). The
// phone's bar floor (--lp-bar-inset, 48 px) then has no use under the foot, because the window ends where the keyboard begins; with the keyboard down, or hidden with Back, the window grows again and the floor is back.
// The box's focus is not read: a tap on Say it instead or Check takes the focus off the box, and a foot that moved between the press and the release would miss the button.
import { useEffect, useState } from 'react';

/** The least a window must lose for it to be a keyboard: no phone keyboard is shorter (px). */
const KEYBOARD_MIN = 120;

export function useKeyboardUp(): boolean {
  const [shrunk, setShrunk] = useState(false);
  useEffect(() => {
    let tallest = window.innerHeight;
    const read = (): void => {
      tallest = Math.max(tallest, window.innerHeight);
      setShrunk(tallest - window.innerHeight >= KEYBOARD_MIN);
    };
    window.addEventListener('resize', read);
    window.visualViewport?.addEventListener('resize', read);
    return () => {
      window.removeEventListener('resize', read);
      window.visualViewport?.removeEventListener('resize', read);
    };
  }, []);
  return shrunk;
}
