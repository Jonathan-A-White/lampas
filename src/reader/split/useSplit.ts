// src/reader/split/useSplit.ts — the Reader split's state: whether the dock is open, how big it is, and what moves it (docs/design/reader-split.md D4 as the Governor changed it: no three
// sizes, the divider rests wherever he lets go). The box is the Reader's own (the passage and the dock in a column, or side by side sideways and wide); the size is kept as a share of it
// (splitSettings.ts) and worked out in px from the box as it is now, so turning the phone or the Immersive bars going away keep the share. The maths is splitSize.ts; this is the hook around it.
import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { announce } from '../../ui/live';
import { closeSplit, keepSplitSize, useSplitFraction, useSplitOpen } from './splitSettings';
import { boundsOf, CLOSE_DISTANCE, clampSize, dragTo, FIRST_FRACTION, fractionOf, keyedSize, sizeOf, stepSize, type Axis, type Bounds } from './splitSize';

/** Side by side when the window is short (a phone on its side) or wide (a tablet, a desktop window): the same two queries as the short: variant and the 768 px breakpoint of src/index.css. */
const SIDE_BY_SIDE = '(max-height: 500px), (min-width: 768px)';
const query = (): MediaQueryList | null => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(SIDE_BY_SIDE) : null);
const subscribe = (notify: () => void): (() => void) => {
  const list = query();
  list?.addEventListener('change', notify);
  return () => list?.removeEventListener('change', notify);
};
const useSideBySide = (): boolean => useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false);

export interface SplitHandle {
  onPointerDown(e: React.PointerEvent<HTMLElement>): void;
  onPointerMove(e: React.PointerEvent<HTMLElement>): void;
  onPointerUp(e: React.PointerEvent<HTMLElement>): void;
  onPointerCancel(e: React.PointerEvent<HTMLElement>): void;
}

export interface Split {
  open: boolean;
  axis: Axis;
  /** the Reader's box: the element holding the passage and the dock */
  setBox(el: HTMLElement | null): void;
  /** the dock's foot, whose height is the room the phone's bar keeps clear (--lp-bar-inset) */
  setFoot(el: HTMLElement | null): void;
  /** the dock's length along the box's axis in px, as it is drawn now (null until the box has been measured) */
  size: number | null;
  bounds: Bounds;
  /** the divider is dragged past the smallest size by the close distance: letting go closes */
  closing: boolean;
  dragging: boolean;
  handle: SplitHandle;
  onKeyDown(e: React.KeyboardEvent<HTMLElement>): void;
  larger(): void;
  smaller(): void;
  close(): void;
}

/** `body`: the least the dock's body needs, in px (default two text lines; a map passes its credit row's). */
export function useSplit({ body }: { body?: number } = {}): Split {
  const open = useSplitOpen();
  const saved = useSplitFraction();
  // the share he left it at, held here from the moment he lets go so the dock does not jump back to the saved one while the save lands
  const [left, setLeft] = useState<number | null>(null);
  const fraction = left ?? saved ?? FIRST_FRACTION;
  const axis: Axis = useSideBySide() ? 'row' : 'column';
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);
  const [foot, setFootPx] = useState(0);
  // the drag: where the finger came down (its place along the axis and the size then), and the size it asks for now
  const [grip, setGrip] = useState<{ at: number; size: number } | null>(null);
  const [live, setLive] = useState<number | null>(null);
  // the box and the foot are elements held in state, so the effects below watch whichever the Reader has drawn now
  const [boxEl, setBox] = useState<HTMLElement | null>(null);
  const [footEl, setFoot] = useState<HTMLElement | null>(null);

  // the box is read when it is drawn (it was not a box while the dock was shut), when it changes size and when the window turns
  useLayoutEffect(() => {
    if (!boxEl) return;
    const measure = () => setDims((was) => (was && was.width === boxEl.clientWidth && was.height === boxEl.clientHeight ? was : { width: boxEl.clientWidth, height: boxEl.clientHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(boxEl);
    return () => watch.disconnect();
  }, [boxEl, open, axis]);
  useLayoutEffect(() => {
    if (!footEl) return;
    const measure = () => setFootPx(footEl.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(footEl);
    return () => watch.disconnect();
  }, [footEl]);

  const box = dims ? (axis === 'column' ? dims.height : dims.width) : 0;
  const bounds = boundsOf({ box, body, foot: axis === 'column' ? foot : 0 });
  const resting = box > 0 ? sizeOf(fraction, box, bounds) : null;
  const size = live !== null ? clampSize(live, { min: bounds.min - CLOSE_DISTANCE, max: bounds.max }) : resting;
  const closing = live !== null && bounds.min - live >= CLOSE_DISTANCE;

  const keep = useCallback(
    (next: number) => {
      const fractionNow = fractionOf(next, box);
      setLeft(fractionNow);
      void keepSplitSize(next, box);
      announce(`The split is ${Math.round(fractionNow * 100)} percent`);
    },
    [box],
  );
  const along = (e: React.PointerEvent) => (axis === 'column' ? e.clientY : e.clientX);
  const finish = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!grip) return;
    const moved = live !== null;
    setGrip(null);
    setLive(null);
    if (!moved) return;
    const { size: rests, close } = dragTo(grip.size + grip.at - along(e), bounds);
    if (close) void closeSplit();
    else keep(rests);
  };
  const handle: SplitHandle = {
    onPointerDown: (e) => {
      if (resting === null || (e.target as HTMLElement).closest('button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setGrip({ at: along(e), size: resting });
    },
    onPointerMove: (e) => {
      if (grip) setLive(grip.size + grip.at - along(e));
    },
    onPointerUp: finish,
    onPointerCancel: finish,
  };

  const step = (by: 1 | -1) => {
    if (resting !== null) keep(stepSize(resting, box, bounds, by));
  };
  return {
    open,
    axis,
    setBox,
    setFoot,
    size,
    bounds,
    closing,
    dragging: live !== null,
    handle,
    onKeyDown: (e) => {
      if (resting === null) return;
      const next = keyedSize(e.key, resting, box, bounds, axis);
      if (next === null) return;
      e.preventDefault();
      keep(next);
    },
    larger: () => step(1),
    smaller: () => step(-1),
    close: () => void closeSplit(),
  };
}
