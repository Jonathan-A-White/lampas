// src/ui/alertInView.ts — one watcher for the whole app (mw-5r3p30.600): an error message (an element of role alert) that is put into a scrolling list or sheet is
// brought into view of that box when it appears, so a failure is never left above or under the fold with only its Retry or Copy showing. The shell starts it once (App,
// useAlertsInView); a screen needs no code of its own. The Talk sheet's conversation box moves for its own failure and its answers (Talk.tsx, a Copy under the message
// and the question above it) and is left alone here. A message in a box that does not scroll, or one already inside its box, moves nothing. A box that changes size after
// the message came (the composer under it takes its question back and grows), or content that loads above it (a list of talks), moves the message again, until he scrolls the box himself or the message goes.
import { useEffect } from 'react';
import { revealFoot } from './keepInView';

const ALERT = '[role="alert"]';

/** The nearest box around `el` that scrolls up and down: the one a message is to be brought into. */
function scrollerOf(el: Element): HTMLElement | null {
  for (let up = el.parentElement; up; up = up.parentElement) {
    const { overflowY } = getComputedStyle(up);
    if (overflowY === 'auto' || overflowY === 'scroll') return up;
  }
  return null;
}

/** The last of the buttons set right under a message (Retry, Try again, Back to the choices), or the message itself when they are inside it or there are none: the foot to show. */
function footOf(alert: HTMLElement): HTMLElement {
  let foot = alert;
  for (let next = alert.nextElementSibling; next instanceof HTMLElement && (next.matches('button, a[href]') || next.querySelector('button, a[href]')); next = next.nextElementSibling) foot = next;
  return foot;
}

/** Moves `box` so `alert` and the buttons under it are whole inside it, when they are not (the message first, when both do not fit). */
function bringInto(box: HTMLElement, alert: HTMLElement): void {
  if (box.scrollHeight <= box.clientHeight) return;
  const foot = footOf(alert);
  const room = box.getBoundingClientRect();
  if (alert.getBoundingClientRect().top >= room.top && foot.getBoundingClientRect().bottom <= room.bottom) return;
  revealFoot(box, foot, alert, true);
}

/** The stop of each box's follower: a box follows one message at a time. */
const followers = new WeakMap<HTMLElement, () => void>();

/** Keeps the message in `box`'s view while the box or what is above the message changes size, until he takes the box in hand (a wheel, a touch, a key) or the message is gone. */
function follow(box: HTMLElement, alert: HTMLElement): void {
  followers.get(box)?.();
  const stop = () => {
    resize.disconnect();
    for (const kind of TAKEN) box.removeEventListener(kind, stop);
    if (followers.get(box) === stop) followers.delete(box);
  };
  const resize = new ResizeObserver(() => (alert.isConnected ? bringInto(box, alert) : stop()));
  // the box itself, and each element between it and the message: what grows above the message (a list that loads after it) moves it down without resizing the box
  for (let el: HTMLElement | null = alert; el && el !== box; el = el.parentElement) resize.observe(el);
  resize.observe(box);
  for (const kind of TAKEN) box.addEventListener(kind, stop, { passive: true });
  followers.set(box, stop);
}

const TAKEN = ['wheel', 'touchstart', 'keydown'];

/** Brings one message into view of its scrolling box, when it is not whole inside it, and keeps it there while the box is resized. */
export function bringAlertIntoView(alert: HTMLElement): void {
  if (alert.closest('[data-talk-list]')) return;
  const box = scrollerOf(alert);
  if (!box) return;
  bringInto(box, alert);
  if (typeof ResizeObserver !== 'undefined') follow(box, alert);
}

/** Starts the watcher; gives the stop. */
export function startAlertWatch(): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      // an element that becomes a message (React keeps the same div when a pending card turns into a failure)
      if (record.type === 'attributes' && record.target instanceof HTMLElement && record.target.matches(ALERT)) bringAlertIntoView(record.target);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        // a message whose words are put into a message already drawn (its title, then its detail) is a message that appeared too
        const around = node.closest<HTMLElement>(ALERT);
        if (around) bringAlertIntoView(around);
        for (const inner of node.querySelectorAll<HTMLElement>(ALERT)) bringAlertIntoView(inner);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['role'] });
  return () => observer.disconnect();
}

/** The shell's one call: the watcher runs while the app is up. */
export function useAlertsInView(): void {
  useEffect(() => startAlertWatch(), []);
}
