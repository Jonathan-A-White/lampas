// src/ui/useNarrow.ts — whether the window is narrow in the phone's own text (20 rem or less: a 360 px phone at 130 % text or more, a 390 px one at 160 %; the measure the Verse view's header
// goes to two rows at, mw-cwf538.9), for a piece that must move to
// another place in the tree when it is (the Verse view's tools and row of actions, mw-5r3p30.896: they stand outside the scroll box, where they never move, while the window has the
// room, and join the scrolling flow when it has not). A CSS container query cannot do this: the view's section is the only box that could be the container, and container-type's
// layout containment would trap the fixed sheets its controls open (Memorize's languages, In another book…) inside it. The measure is the view's width over the root font size, read
// again on a resize and when html's style changes (the Text size setting writes --lp-scale there, src/appearance/appearanceSync.ts applyTextSize).
import { useSyncExternalStore } from 'react';

/** The width, in rem, at and under which the window is narrow: the Verse view's own large-text measure (`@max-[20rem]`, the title on a row of its own). Under it the fixed controls
 * left the reading check's Next word card too little room at 130 % text (tests/e2e/next-in-view.spec.ts). */
export const NARROW_REM = 20;

const remPx = (): number => {
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
};

const narrow = (): boolean => typeof window !== 'undefined' && window.innerWidth <= NARROW_REM * remPx();

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener('resize', notify);
  const observer = typeof MutationObserver === 'function' ? new MutationObserver(notify) : null;
  observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => {
    window.removeEventListener('resize', notify);
    observer?.disconnect();
  };
};

/** True while the window is 20 rem wide or less in the phone's own text. Never true where there is no window (a server) and not in a test's jsdom, whose window is 1024 px wide. */
export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, narrow, () => false);
}
