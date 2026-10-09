// src/ui/longPress.ts — a word he can tap or hold (mw-5r3p30.80): a tap does `onTap`, a finger kept on it for half a second does
// `onLongPress` instead (with a light buzz where the phone has one) and the click that ends the press is dropped. A finger that
// wandered over 10 px is a drag: neither. The element must not select text or raise the phone's callout menu: the hook swallows
// the contextmenu, and the caller adds the classes below (user-select none, -webkit-touch-callout none).
import { type MouseEvent, type PointerEvent, useEffect, useRef } from 'react';

/** How long a finger must stay on a word to say it, and how far it may wander meanwhile. */
export const LONG_PRESS_MS = 500;
export const LONG_PRESS_SLOP_PX = 10;

/** The classes of a word that is held: no text selection and no callout menu on the phone. */
export const NO_SELECT = 'select-none [-webkit-touch-callout:none]';

export interface LongPressHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onClick: () => void;
}

export function useLongPress(onTap: () => void, onLongPress: () => void): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const from = useRef({ x: 0, y: 0 });
  // the press that is going on was a long press or a drag: its click is not a tap
  const notATap = useRef(false);
  const stopTimer = () => clearTimeout(timer.current);
  useEffect(() => stopTimer, []);
  return {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      notATap.current = false;
      from.current = { x: e.clientX, y: e.clientY };
      stopTimer();
      timer.current = setTimeout(() => {
        notATap.current = true;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e) => {
      if (Math.hypot(e.clientX - from.current.x, e.clientY - from.current.y) <= LONG_PRESS_SLOP_PX) return;
      notATap.current = true;
      stopTimer();
    },
    onPointerUp: stopTimer,
    onPointerCancel: stopTimer,
    onContextMenu: (e) => e.preventDefault(),
    onClick: () => {
      if (notATap.current) notATap.current = false;
      else onTap();
    },
  };
}
