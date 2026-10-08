// src/nav/scrollMemory.ts — Back brings him to where he was reading, and so does a reopened app (mw-5r3p30.20,
// as Postern's src/nav/scrollMemory.ts). Each scrolling box keeps its offset, keyed by the screen's address and a
// name for the box, and puts it back when the box is shown again at that address. The offsets of the last 20
// addresses are also written to the phone (src/nav/lastRoute.ts), 250 ms after the last scroll and when the page is
// hidden, so closing the app and opening it again puts him back at the same place.
import { useEffect, useState } from 'react';
import { readAllScrolls, saveScrolls } from './lastRoute';
import { pathOf, readerHash, readerOf, useAddress } from './route';

const offsets = new Map<string, number>();

/** The address a scroll offset is kept under: the reader without its selected verse (tapping a verse number does not
 * move the text, and the place is the same whichever verse is selected). */
export function scrollAddress(hash: string): string {
  if (pathOf(hash) !== '#/') return pathOf(hash);
  return readerHash({ ...readerOf(hash), verse: undefined });
}

/** How long after the last scroll event the offsets are written to the phone. */
const KEEP_AFTER_MS = 250;
let keepTimer: ReturnType<typeof setTimeout> | undefined;
/** The addresses whose offsets moved since they were last written. */
const moved = new Set<string>();

function keepNow(): void {
  clearTimeout(keepTimer);
  keepTimer = undefined;
  for (const address of moved) saveScrolls(offsets, address);
  moved.clear();
}

function keepSoon(address: string): void {
  moved.add(address);
  if (keepTimer === undefined) keepTimer = setTimeout(keepNow, KEEP_AFTER_MS);
}

if (typeof document !== 'undefined') {
  window.addEventListener('pagehide', keepNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') keepNow();
  });
}

/** Called once before the first render: the offsets kept for the addresses he was at, the one the app opens at last. */
export function restoreScrolls(): void {
  for (const [key, top] of readAllScrolls(scrollAddress(window.location.hash))) offsets.set(key, top);
}

/** How long a restore keeps waiting for the content behind it to arrive. */
const RESTORE_WAIT_MS = 2500;

function scrollBoxTo(box: HTMLElement, top: number): void {
  box.scrollTop = top;
}

/** Forget every remembered position. */
export function forgetScrolls(): void {
  offsets.clear();
}

/** Give the returned ref to a scrolling box. `slot` names the box on its screen. The box's first child holds its
 * content (its size changes as the content arrives, which is what a restore waits for). */
export function useScrollMemory(slot: string): (el: HTMLElement | null) => void {
  const address = scrollAddress(useAddress());
  const key = `${address}#${slot}`;
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const box: HTMLElement = el;
    const target = offsets.get(key);
    // Until the box reaches the remembered offset (its content may still be arriving), its own
    // scroll events are not him moving it, so they are not remembered.
    let restoring = target !== undefined;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      restoring = false;
      observer?.disconnect();
      clearTimeout(timer);
    };
    const restore = () => {
      if (!restoring || target === undefined) return;
      scrollBoxTo(box, target);
      if (Math.abs(box.scrollTop - target) < 1) settle();
    };
    const onScroll = () => {
      if (restoring) return;
      offsets.set(key, box.scrollTop);
      keepSoon(address);
    };
    // His own hand on the box ends the restore: where he puts it is where it stays.
    const interrupt = () => settle();

    box.addEventListener('scroll', onScroll, { passive: true });
    const touches = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    for (const type of touches) box.addEventListener(type, interrupt, { passive: true });

    if (restoring) {
      restore();
      if (restoring) {
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(restore);
          observer.observe(box.firstElementChild ?? box);
        }
        timer = setTimeout(settle, RESTORE_WAIT_MS);
      }
    }

    return () => {
      settle();
      box.removeEventListener('scroll', onScroll);
      for (const type of touches) box.removeEventListener(type, interrupt);
    };
  }, [el, key, address]);

  return setEl;
}
