// src/ui/sheetDrag.ts — what every bottom sheet shares: Escape closes it, and a swipe down on its handle closes it.
import { useEffect, useRef, useState } from 'react';

/** A swipe down of at least this many pixels closes the sheet. */
const CLOSE_DISTANCE = 80;

/** Calls `onClose` on Escape while `enabled` (a sheet above this one is open when it is not). */
export function useEscapeToClose(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, enabled]);
}

/** The drag of a sheet's handle: `drag` is how far the sheet is pulled down now (px), `handle` the touch handlers for the
 * handle element; letting go past CLOSE_DISTANCE calls `onClose`. */
export function useSheetDrag(onClose: () => void): {
  drag: number;
  handle: Pick<React.DOMAttributes<HTMLElement>, 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel'>;
} {
  const [drag, setDrag] = useState(0);
  const touch = useRef<{ startY: number; dy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { startY: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return;
    touch.current.dy = Math.max(0, e.touches[0].clientY - touch.current.startY);
    setDrag(touch.current.dy);
  };
  const onTouchEnd = () => {
    const dy = touch.current?.dy ?? 0;
    touch.current = null;
    setDrag(0);
    if (dy >= CLOSE_DISTANCE) onClose();
  };
  return { drag, handle: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd } };
}
