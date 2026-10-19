// src/ui/alertInView.ts — one watcher for the whole app (mw-5r3p30.600): an error message (an element of role alert) that is put into a scrolling list or sheet is
// brought into view of that box when it appears, so a failure is never left above or under the fold with only its Retry or Copy showing. The shell starts it once (App,
// useAlertsInView); a screen needs no code of its own. The Talk sheet's conversation box moves for its own failure and its answers (Talk.tsx, a Copy under the message
// and the question above it) and is left alone here. A message in a box that does not scroll, or one already inside its box, moves nothing.
import { useEffect } from 'react';
import { revealFoot } from './keepInView';

const ALERT = '[role="alert"]';

/** The nearest box around `el` that scrolls up and down: the one a message is to be brought into. */
function scrollerOf(el: Element): HTMLElement | null {
  for (let up = el.parentElement; up; up = up.parentElement) {
    const { overflowY } = getComputedStyle(up);
    if ((overflowY === 'auto' || overflowY === 'scroll') && up.scrollHeight > up.clientHeight) return up;
  }
  return null;
}

/** Brings one message into view of its scrolling box, when it is not whole inside it. */
export function bringAlertIntoView(alert: HTMLElement): void {
  if (alert.closest('[data-talk-list]')) return;
  const box = scrollerOf(alert);
  if (!box) return;
  const room = box.getBoundingClientRect();
  const at = alert.getBoundingClientRect();
  if (at.top >= room.top && at.bottom <= room.bottom) return;
  revealFoot(box, alert, alert, true);
}

/** Starts the watcher; gives the stop. */
export function startAlertWatch(): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(ALERT)) bringAlertIntoView(node as HTMLElement);
        for (const inner of node.querySelectorAll<HTMLElement>(ALERT)) bringAlertIntoView(inner);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/** The shell's one call: the watcher runs while the app is up. */
export function useAlertsInView(): void {
  useEffect(() => startAlertWatch(), []);
}
