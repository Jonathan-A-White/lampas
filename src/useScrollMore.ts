// src/useScrollMore.ts — the hook of src/ScrollMore.tsx: which sides of a sideways scroller have more, and the spacing that makes a door peek past the edge (mw-fnvjof.17.104).
import { useEffect, useState } from 'react';
import { SLOP, peekExtra } from './scrollPeek';

export const ITEMS = 'button, a[href], [data-scroll-item]';

/** The doors of the row, left to right: the buttons, links and marked boxes that are drawn (the innermost are not taken twice). */
function itemsOf(row: HTMLElement): Element[] {
  const all = [...row.querySelectorAll(ITEMS)].filter((el) => el.getBoundingClientRect().width > 0);
  const chosen = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  return chosen.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
}

export type Sides = { start: boolean; end: boolean };
type Options = { peek?: boolean };

/** Which sides of a sideways scroller have more, and (with `peek`, the default) the spacing that makes a door peek past the edge. Pass the first of the pair as the scroller's ref. */
export function useScrollMore<T extends HTMLElement = HTMLDivElement>({ peek = true }: Options = {}): readonly [(el: T | null) => void, Sides] {
  const [row, setRow] = useState<T | null>(null);
  const [sides, setSides] = useState<Sides>({ start: false, end: false });
  useEffect(() => {
    if (!row) return;
    const sidesNow = () => {
      const max = row.scrollWidth - row.clientWidth;
      const overflowing = max > SLOP;
      const next = { start: overflowing && row.scrollLeft > SLOP, end: overflowing && row.scrollLeft < max - SLOP };
      setSides((was) => (was.start === next.start && was.end === next.end ? was : next));
    };
    const measure = () => {
      if (peek) {
        const current = parseFloat(row.style.getPropertyValue('--scroll-more-extra')) || 0;
        const items = itemsOf(row);
        // the row as it would stand with no extra gap: each of the doors' gaps gives back `current`
        const overflowsBare = row.scrollWidth - row.clientWidth - current * Math.max(0, items.length - 1) > SLOP;
        let extra = 0;
        if (overflowsBare && row.clientWidth > 0) {
          const origin = row.getBoundingClientRect().left - row.scrollLeft;
          const lefts = items.map((el, i) => el.getBoundingClientRect().left - origin - i * current);
          const rights = items.map((el, i) => el.getBoundingClientRect().right - origin - i * current);
          extra = peekExtra(lefts, rights, row.clientWidth);
        }
        if (extra !== current) row.style.setProperty('--scroll-more-extra', `${extra}px`);
      }
      sidesNow();
    };
    measure();
    row.addEventListener('scroll', sidesNow, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(row);
    const watch = () => {
      if (!resize) return;
      for (const child of row.querySelectorAll(ITEMS)) resize.observe(child);
    };
    watch();
    const mutate = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
      watch();
      measure();
    });
    mutate?.observe(row, { childList: true, subtree: true, characterData: true });
    return () => {
      row.removeEventListener('scroll', sidesNow);
      resize?.disconnect();
      mutate?.disconnect();
    };
  }, [row, peek]);
  return [setRow, sides];
}

