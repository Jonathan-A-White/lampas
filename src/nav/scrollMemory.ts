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
  // a link to a setting (src/settings/link.ts) has a place of its own: Settings opens at that row, not where he last left it
  if (pathOf(hash) === '#/settings') {
    const q = hash.indexOf('?');
    const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
    const setting = params.get('setting');
    if (setting) return `#/settings?setting=${setting}`;
    // so is a link to a section (mw-5r3p30.427): the section scroll is its place, and it does not share (or overwrite) the offset of Settings opened by the gear
    const section = params.get('section');
    return section ? `#/settings?section=${section}` : '#/settings';
  }
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

/** Once the box is at the remembered offset, how long its content must stay unchanged before the restore ends: a row that draws late (Settings' controls read their
 * saved value first) changes the height, and the browser's scroll anchoring then moves the box off the place (mw-8m9dyu.6). */
const QUIET_MS = 400;

function scrollBoxTo(box: HTMLElement, top: number): void {
  box.scrollTop = top;
}

/** The boxes whose saved place is being put back now. */
const restoringBoxes = new WeakSet<HTMLElement>();

/** Whether `box` is having its saved place put back (mw-5r3p30.471). The scroll events that come of it are the app moving the text, not him: a listener
 * that reads scrolling as his hand (src/immersive.ts) leaves them out. His own hand on the box ends the restore. */
export function isRestoringScroll(box: HTMLElement): boolean {
  return restoringBoxes.has(box);
}

/** Forget every remembered position. */
export function forgetScrolls(): void {
  offsets.clear();
  pages.clear();
}

/** With Turn pages (src/reader/usePages.ts) the place is a page, not an offset (mw-5r3p30.608): the page he was on in a chapter, how many pages it had then,
 * and the verse that began on it (else the one that ran across it), so a Reader opened on that chapter again (back from Settings or any screen the Reader
 * gives way to) shows that page; when the pages are cut otherwise (another text size), the page of that verse. Kept per chapter for the page's life. */
export interface KeptPage {
  /** the page, from 0 */
  page: number;
  count: number;
  verse: string | null;
}

const pages = new Map<string, KeptPage>();

/** Keeps the page he is on in `chapter` (a key the Reader names it by). */
export function keepPage(chapter: string, kept: KeptPage): void {
  pages.set(chapter, kept);
}

/** The page he was last on in `chapter`, if he has read it in pages. */
export function keptPage(chapter: string): KeptPage | undefined {
  return pages.get(chapter);
}

/** Forget the positions kept for an address, so a box shown there starts at the top (or wherever the screen puts it). */
export function forgetScrollsAt(hash: string): void {
  const prefix = `${scrollAddress(hash)}#`;
  for (const key of [...offsets.keys()]) if (key.startsWith(prefix)) offsets.delete(key);
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
    if (restoring) restoringBoxes.add(box);
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let quiet: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      restoring = false;
      restoringBoxes.delete(box);
      observer?.disconnect();
      clearTimeout(timer);
      clearTimeout(quiet);
    };
    const restore = () => {
      if (!restoring || target === undefined) return;
      scrollBoxTo(box, target);
      // at the offset: wait for the content to stay put for QUIET_MS (each resize re-places it and restarts the wait) before this is his place to remember
      if (Math.abs(box.scrollTop - target) < 1) {
        clearTimeout(quiet);
        quiet = setTimeout(settle, QUIET_MS);
      }
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
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(restore);
        observer.observe(box.firstElementChild ?? box);
      }
      timer = setTimeout(settle, RESTORE_WAIT_MS);
      restore();
    }

    return () => {
      settle();
      box.removeEventListener('scroll', onScroll);
      for (const type of touches) box.removeEventListener(type, interrupt);
    };
  }, [el, key, address]);

  return setEl;
}
