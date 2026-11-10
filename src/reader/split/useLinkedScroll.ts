// src/reader/split/useLinkedScroll.ts — the Link of the Reader's split (docs/design/reader-split.md 'The Link', mw-5r3p30.1130): the passage and the dock's text kept on the same verse as either scrolls.
// The unit is the verse, Lampas's number, which both panes carry (Greek runs longer than English and Hebrew shorter, so a ratio of scroll heights drifts within a chapter). The pane that scrolls leads: when its
// top verse changes the other scrolls, at once, so that verse stands at its top. The follower's own scroll event is told apart from a scroll of his hand by the offset it was moved to (the browser clamps and
// rounds it, so what the box took is what its event will show), so the follower never moves the leader back; and a follower that cannot reach the verse (the end of its box) is not asked to lead for it.
// Pure parts are exported for the unit test. The first verse goes to the top of the box (scrollTop 0), not to its own place, so the heading above it is not scrolled away.
// With Turn pages (mw-fnvjof.17.3) the passage's "top verse" is the first verse with a line on the page shown, and it is brought into view by turning to the page that holds its beginning (`showPage`, the Reader's
// usePages show); a page turned is a scroll of the box sideways, which tells the Link as a scroll of the other kind does.
import { useEffect, useRef } from 'react';

/** A verse whose bottom is less than this far below the box's top is cut at the top, and not the top verse: the verse brought to a few pixels under the top (the Reader's GAP) is the top one. */
export const HALF_LINE = 12;

/** The verse at the top of `box`: the first of its `items` that is Lampas's verse (`numberOf` answers null for one that is not) whose bottom is more than HALF_LINE below the box's top; null where there is none. */
export function topVerse(box: HTMLElement, items: string, numberOf: (el: HTMLElement) => number | null): number | null {
  const top = box.getBoundingClientRect().top;
  for (const el of Array.from(box.querySelectorAll<HTMLElement>(items))) {
    const n = numberOf(el);
    if (n !== null && el.getBoundingClientRect().bottom > top + HALF_LINE) return n;
  }
  return null;
}

/** The verse at the top of the page Turn pages shows in `box`: the first of its `items` that is Lampas's verse (`numberOf`) and has a line on the page (a line of its number or words, wider than nothing, that lies across the box's width; its play button alone does not count; the
 * next page's column starts a gap beyond the box's edge, the last one's ends before it); null where there is none. */
export function firstVerseOnPage(box: HTMLElement, items: string, numberOf: (el: HTMLElement) => number | null): number | null {
  const { left, right } = box.getBoundingClientRect();
  for (const el of Array.from(box.querySelectorAll<HTMLElement>(items))) {
    const n = numberOf(el);
    if (n !== null && wordLines(el).some((r) => r.width > 0 && r.right > left + 1 && r.left < right - 1)) return n;
  }
  return null;
}

/** The lines of a verse's element that hold its number or words: its play button (Hear the verse) wraps onto the next page's top line where the verse ends at a page's foot, and is no mark of the verse there (mw-fnvjof.17.58). */
function wordLines(el: HTMLElement): DOMRect[] {
  if (typeof document.createRange !== 'function') return Array.from(el.getClientRects());
  const lines: DOMRect[] = [];
  const range = document.createRange();
  for (const child of Array.from(el.childNodes)) {
    if (child instanceof HTMLElement && child.matches('[data-verse-play]')) continue;
    range.selectNodeContents(child);
    lines.push(...Array.from(range.getClientRects()));
  }
  return lines;
}

/** Scrolls `box` so that `item` stands at its top (the first item to its very top); answers the offset the box took, or null where it did not move. */
function bring(box: HTMLElement, item: HTMLElement | null, first: boolean): number | null {
  if (!item) return null;
  const before = box.scrollTop;
  box.scrollTop = first ? 0 : before + item.getBoundingClientRect().top - box.getBoundingClientRect().top;
  return box.scrollTop === before ? null : box.scrollTop;
}

/** One pane of the Link: its scroll box, the selector of its verses and the Lampas number of one of them (null for a row with none). */
export interface LinkedPane {
  box: HTMLElement;
  items: string;
  numberOf(el: HTMLElement): number | null;
  /** the element of Lampas's verse `n` in the pane, or null */
  find(n: number): HTMLElement | null;
  /** how far the pane is scrolled, which its own scroll event will show (scrollTop where it is not given) */
  at?(): number;
  /** the pane's top verse (the verse at the top of its box where it is not given) */
  top?(): number | null;
  /** brings `item` to the pane's top (a scroll of the box where it is not given); answers the offset the pane took, or null where it did not move */
  bring?(item: HTMLElement | null, first: boolean): number | null;
}

/** Puts `to` on the top verse of `from`; answers the verse, and the offset `to` took when it moved. */
export function followTop(from: LinkedPane, to: LinkedPane): { verse: number | null; moved: number | null } {
  const verse = from.top ? from.top() : topVerse(from.box, from.items, from.numberOf);
  if (verse === null) return { verse, moved: null };
  const target = to.find(verse);
  const firstOfTo = Array.from(to.box.querySelectorAll<HTMLElement>(to.items)).find((el) => to.numberOf(el) !== null);
  const first = target !== null && target === firstOfTo;
  return { verse, moved: to.bring ? to.bring(target, first) : bring(to.box, target, first) };
}

/** How the passage's verses are numbered against Lampas's: a Septuagint passage's `data-verse` is the Greek verse, whose Lampas verse is its `ref` (src/reader/septuagint.ts lampasNumber); any other passage is Lampas's own. */
export interface PassageNumbers {
  toLampas(dataVerse: number): number | null;
  fromLampas(lampas: number): number | null;
}

export const OWN_NUMBERS: PassageNumbers = { toLampas: (n) => n, fromLampas: (n) => n };

const asNumber = (value: string | undefined): number | null => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isInteger(n) ? n : null;
};

/**
 * Keeps the passage's box and the dock's box on the same verse while `linked`. `ready` is false until both hold their verses; `place` is whatever should start it afresh (the text, the chapter): the dock is
 * then put on the passage's top verse. Pressing Link again (linked turning true) does the same: the passage leads at that moment. The passage's verses are `[data-verse]`, the dock's `[data-dock-verse]`
 * (Lampas's number, absent on a row with none).
 */
export function useLinkedScroll({ passageBox, dockBox, numbers = OWN_NUMBERS, linked, ready, place, showPage = null }: { passageBox: HTMLElement | null; dockBox: HTMLElement | null; numbers?: PassageNumbers; linked: boolean; ready: boolean; place: string; showPage?: ((el: Element) => void) | null }): void {
  // Turn pages: the passage turns to a verse's page by the Reader's own `show`, kept in a ref so a new function does not start the Link afresh
  const turn = useRef(showPage);
  useEffect(() => {
    turn.current = showPage;
  });
  const paged = showPage !== null;
  useEffect(() => {
    if (!passageBox || !dockBox || !linked || !ready) return;
    const passage: LinkedPane = {
      box: passageBox,
      items: '[data-verse]',
      numberOf: (el) => {
        const n = asNumber(el.dataset.verse);
        return n === null ? null : numbers.toLampas(n);
      },
      find: (lampas) => {
        const n = numbers.fromLampas(lampas);
        return n === null ? null : passageBox.querySelector<HTMLElement>(`[data-verse="${n}"]`);
      },
    };
    if (paged) {
      passage.at = () => passageBox.scrollLeft;
      passage.top = () => firstVerseOnPage(passageBox, passage.items, passage.numberOf);
      passage.bring = (item) => {
        const before = passageBox.scrollLeft;
        if (item) turn.current?.(item);
        return passageBox.scrollLeft === before ? null : passageBox.scrollLeft;
      };
    }
    const dock: LinkedPane = {
      box: dockBox,
      items: '[data-dock-verse]',
      numberOf: (el) => asNumber(el.dataset.dockVerse),
      find: (lampas) => dockBox.querySelector<HTMLElement>(`[data-dock-verse="${lampas}"]`),
    };
    // the offset each box was last moved to by this hook: its next scroll event is ours, not his
    const moved = new WeakMap<HTMLElement, number>();
    let last: number | null = null;
    const lead = (from: LinkedPane, to: LinkedPane) => () => {
      const ours = moved.get(from.box);
      if (ours !== undefined) {
        moved.delete(from.box);
        if (Math.abs((from.at ? from.at() : from.box.scrollTop) - ours) < 1.5) return;
      }
      const verse = from.top ? from.top() : topVerse(from.box, from.items, from.numberOf);
      if (verse === null || verse === last) return;
      last = verse;
      const took = followTop(from, to).moved;
      if (took !== null) moved.set(to.box, took);
    };
    // the dock starts on the passage's top verse
    const start = followTop(passage, dock);
    last = start.verse;
    if (start.moved !== null) moved.set(dockBox, start.moved);
    const fromPassage = lead(passage, dock);
    const fromDock = lead(dock, passage);
    passageBox.addEventListener('scroll', fromPassage, { passive: true });
    dockBox.addEventListener('scroll', fromDock, { passive: true });
    // Turn pages cut afresh when the box changes size (the divider dragged, the phone turned): the page shown may begin on another verse without the box having scrolled, and the dock follows it
    let frame = 0;
    const watch = paged && typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const verse = passage.top ? passage.top() : null;
        if (verse === null || verse === last) return;
        last = verse;
        const took = followTop(passage, dock).moved;
        if (took !== null) moved.set(dockBox, took);
      });
    }) : null;
    watch?.observe(passageBox);
    return () => {
      cancelAnimationFrame(frame);
      watch?.disconnect();
      passageBox.removeEventListener('scroll', fromPassage);
      dockBox.removeEventListener('scroll', fromDock);
    };
    // `numbers` is made again with each chapter, and `place` says so
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageBox, dockBox, linked, ready, place, paged]);
}
