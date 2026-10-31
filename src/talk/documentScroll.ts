// src/talk/documentScroll.ts — while the Talk sheet is open, the PAGE scrolls the conversation (mw-5r3p30.930). The conversation is a scroll box of its own
// (overflow-y-auto, [data-talk-list]), and the phone's scroll capture (Android's, Samsung's) scrolls the page: finding nothing to scroll, its synthetic swipe
// landed on Hold to talk. So the sheet makes the page tall by what the conversation has below its fold (a 1 px invisible spacer, absolute in the page, which the fixed
// sheet cannot do) and keeps the two in step: window.scrollBy / scrollTo moves the conversation, and the conversation's own scroll (his thumb, a new answer
// kept in view) moves the page. The header and the Hold to talk bar are in the fixed sheet, so they stay where they are. The box stays the scroller the sheet's own
// code and tests use. src/index.css `html.lp-talk-scroll` lets the page scroll (it clips otherwise: docs/pwa-best-practices.md section 7), only while the sheet is open.
import { useEffect, type RefObject } from 'react';

/** The class on <html> while a sheet's conversation is the page's scroll. */
export const DOCUMENT_SCROLL_CLASS = 'lp-talk-scroll';
/** What counts as the same place, in px (a scroll offset can be fractional). */
const SAME_PX = 1.5;

/** How tall the page must be for window.scrollY to run as far as the box's scrollTop does: the window, and what the box has below its fold. */
export function pageHeightFor(boxScrollHeight: number, boxClientHeight: number, windowHeight: number): number {
  return Math.max(0, boxScrollHeight - boxClientHeight) + windowHeight;
}

/** The box whose scroll is the page's now, if any (one Talk sheet is open at a time). */
let active: HTMLElement | undefined;

/** Whether a conversation is the page's scroll just now (src/ui/scrollGuard.ts leaves the document alone then). */
export const documentScrollActive = (): boolean => active !== undefined;

/** Puts the page back in step with the conversation, where something (a keyboard, a focus) moved it. */
export function settleDocumentScroll(): void {
  if (active && Math.abs(window.scrollY - active.scrollTop) > SAME_PX) window.scrollTo(0, active.scrollTop);
}

/** Makes `list`'s scroll the page's for as long as the caller is mounted. Returns nothing: the page is put back as it was on unmount. */
export function useDocumentScroll(list: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const box = list.current;
    if (!box) return;
    const root = document.documentElement;
    root.classList.add(DOCUMENT_SCROLL_CLASS);
    active = box;
    const spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.setAttribute('data-talk-page-spacer', '');
    spacer.style.cssText = 'position:absolute;top:0;left:0;width:1px;visibility:hidden;pointer-events:none;';
    document.body.appendChild(spacer);
    const measure = (): void => {
      spacer.style.height = `${pageHeightFor(box.scrollHeight, box.clientHeight, window.innerHeight)}px`;
    };
    // The place each side was last told to go to: its own scroll event, coming back, is no news (a smooth scroll of the box would be cut short by it).
    let toldPage: number | null = null;
    let toldBox: number | null = null;
    const fromBox = (): void => {
      measure();
      if (toldBox !== null && Math.abs(box.scrollTop - toldBox) <= SAME_PX) {
        toldBox = null;
        return;
      }
      if (Math.abs(window.scrollY - box.scrollTop) <= SAME_PX) return;
      toldPage = box.scrollTop;
      window.scrollTo(0, box.scrollTop);
    };
    const fromPage = (): void => {
      if (toldPage !== null && Math.abs(window.scrollY - toldPage) <= SAME_PX) {
        toldPage = null;
        return;
      }
      if (Math.abs(window.scrollY - box.scrollTop) <= SAME_PX) return;
      toldBox = window.scrollY;
      box.scrollTop = window.scrollY;
    };
    measure();
    box.addEventListener('scroll', fromBox, { passive: true });
    window.addEventListener('scroll', fromPage, { passive: true });
    window.addEventListener('resize', measure);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    resize?.observe(box);
    // what the box holds grows and shrinks (an answer lands, a talk is cleared) without the box itself changing size
    const content = new MutationObserver(measure);
    content.observe(box, { childList: true, subtree: true, characterData: true });
    return () => {
      box.removeEventListener('scroll', fromBox);
      window.removeEventListener('scroll', fromPage);
      window.removeEventListener('resize', measure);
      resize?.disconnect();
      content.disconnect();
      spacer.remove();
      root.classList.remove(DOCUMENT_SCROLL_CLASS);
      if (active === box) active = undefined;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
  }, [list]);
}
