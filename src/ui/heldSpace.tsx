// src/ui/heldSpace.tsx — a control that removes itself on a tap keeps its place empty for a moment (mw-8m9dyu.10). A thumb double-taps: the first tap
// removes the licence tip or the Immersive hint card, the text slides into its place, and the second tap, at the same point, lands on a Greek word and
// opens a sheet he never chose. For HELD_MS the card's place stays as an empty, inert box of the same height, so the second tap lands on nothing; then
// the text moves up (or down) into it. The same idea as src/ui/settle.ts, for a layout that moves instead of a card that is replaced.
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

/** How long a removed card's place stays empty. The Tester's double taps were about 100 ms apart; a deliberate second tap takes longer. PROVISIONAL */
export const HELD_MS = 400;

/**
 * `ref` goes on the element that removes itself; call `hold()` in the same handler that removes it (before the state change draws); render `space`
 * where the element was (it is null when nothing is held).
 */
export function useHeldSpace<T extends HTMLElement>(): { ref: RefObject<T | null>; hold: () => void; space: ReactNode } {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const hold = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const style = getComputedStyle(el);
    setHeight(el.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom));
  }, []);
  useEffect(() => {
    if (height === null) return;
    const timer = setTimeout(() => setHeight(null), HELD_MS);
    return () => clearTimeout(timer);
  }, [height]);
  const space = height === null ? null : <div aria-hidden="true" data-held-space className="shrink-0" style={{ height }} />;
  return { ref, hold, space };
}
