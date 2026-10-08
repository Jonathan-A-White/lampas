// src/ui/reveal.ts — brings a box into view by moving its own scroll box, never the document: scrollIntoView
// scrolls every ancestor (docs/pwa-best-practices.md section 7).

/** Scrolls the nearest scrolling ancestor just far enough that the bottom of `el` is visible (and its top is not hidden). */
export function revealInScrollBox(el: HTMLElement | null): void {
  const box = el?.closest<HTMLElement>('.screen');
  if (!el || !box) return;
  const inner = el.getBoundingClientRect();
  const outer = box.getBoundingClientRect();
  const past = inner.bottom - outer.bottom;
  if (past > 0) box.scrollTop += Math.min(past + 8, Math.max(0, inner.top - outer.top));
}
