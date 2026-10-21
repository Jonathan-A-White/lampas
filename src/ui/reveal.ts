// src/ui/reveal.ts — brings a box into view by moving its own scroll box, never the document: scrollIntoView
// scrolls every ancestor (docs/pwa-best-practices.md section 7).

/** Scrolls the nearest scrolling ancestor just far enough that the bottom of `el` is visible (and its top is not hidden).
 * `keep`, when given, is an element above `el` whose top must not be scrolled out of sight to do it: the reader shows a
 * verse's panel (its heading and the verse) and the Ask box under it, and when both do not fit the heading wins. */
export function revealInScrollBox(el: HTMLElement | null, keep?: HTMLElement | null): void {
  const box = el?.closest<HTMLElement>('.screen');
  if (!el || !box) return;
  const inner = el.getBoundingClientRect();
  const outer = box.getBoundingClientRect();
  const past = inner.bottom - outer.bottom;
  const limit = (keep ?? el).getBoundingClientRect().top - outer.top;
  if (past > 0) box.scrollTop += Math.min(past + 8, Math.max(0, limit));
}

/** Scrolls the nearest scrolling ancestor so the top of `el` sits at the top of the box (as far as the content allows), so its first lines show: a tutor's
 * answer arriving under a long passage. Like revealInScrollBox it moves the box and never the document. */
export function revealTop(el: HTMLElement | null): void {
  const box = el?.closest<HTMLElement>('.screen');
  if (!el || !box) return;
  box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
}

/** Brings `el` into view in the nearest scrolling ancestor: left where it is when the whole of it shows, else scrolled to the middle of the box (as far as the content allows): a cell he was sent to,
 * with the screen's own top (the word it is the cell of) kept when it needs no scroll. Like revealInScrollBox it moves the box and never the document. */
export function bringIntoScrollBox(el: HTMLElement | null): void {
  const box = el?.closest<HTMLElement>('.screen');
  if (!el || !box) return;
  const inner = el.getBoundingClientRect();
  const outer = box.getBoundingClientRect();
  if (inner.top >= outer.top && inner.bottom <= outer.bottom) return;
  box.scrollTop += inner.top + inner.height / 2 - (outer.top + outer.height / 2);
}

/** The top of what is drawn over the foot of `box`'s scroll content: the sticky NextBar (src/ui/NextBar.tsx), when the box has one, else the box's own bottom.
 * The speaking bar and the hold bar are outside the box, so the box's bottom is already above them. */
function stackTopOf(box: HTMLElement): number {
  const bottom = box.getBoundingClientRect().bottom;
  const bars = [...box.querySelectorAll<HTMLElement>('[data-next-bar]')].map((bar) => bar.getBoundingClientRect().top);
  return Math.min(bottom, ...bars);
}

/** Scrolls the box so the whole of `el` sits above the stack drawn over its foot (a sticky Try again / Skip for now bar, a Next bar), by `gap`; when `el`
 * is taller than the room, its top stays in view (the heading wins) and the rest is a scroll away. Moves the box and never the document. Returns whether
 * `el` was already where it should be. */
export function revealAboveStack(el: HTMLElement | null, gap = 8): boolean {
  const box = el?.closest<HTMLElement>('.screen');
  if (!el || !box) return true;
  for (let pass = 0; pass < 3; pass += 1) {
    const inner = el.getBoundingClientRect();
    const past = inner.bottom + gap - stackTopOf(box);
    if (past <= 0.5) return pass === 0;
    const room = inner.top - box.getBoundingClientRect().top - gap;
    const by = Math.min(past, Math.max(0, room));
    if (by <= 0) return false;
    box.scrollTop += by;
  }
  return false;
}

/** Keeps `el()` above the stack while the screen settles around it: a result arrives, then the speaking bar appears under the box and shrinks it, a
 * font loads. Follows the box's size until he touches, scrolls or types in it (his scroll is his), or `ms` pass. Call the returned function to stop. */
export function keepAboveStack(el: () => HTMLElement | null, ms = 3000): () => void {
  const first = el();
  const box = first?.closest<HTMLElement>('.screen');
  if (!first || !box) return () => undefined;
  const run = () => revealAboveStack(el());
  run();
  const watcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(run);
  watcher?.observe(box);
  const around = first.closest('section');
  if (around) watcher?.observe(around);
  const timer = window.setTimeout(stop, ms);
  const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
  events.forEach((name) => box.addEventListener(name, stop, { passive: true }));
  function stop() {
    watcher?.disconnect();
    window.clearTimeout(timer);
    events.forEach((name) => box?.removeEventListener(name, stop));
  }
  return stop;
}
