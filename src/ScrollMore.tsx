// src/ScrollMore.tsx — how a row that scrolls sideways shows there is more (mw-fnvjof.17.104, the Governor's 2026-11-12 ask: "a subtle and elegant way of knowing they can scroll to get more
// options"). Two quiet signs, no arrows, no text, no bounce: a PEEK (the next item is cut by the edge, never ending on it) and a soft FADE into the background on the side that has more.
// One hook and two parts, shared by every row that scrolls sideways in src/ (tests/unit/scroll-more-sweep.test.ts fails on an overflow-x scroll box that is not wired to them):
//   - useScrollMore(options): the hook; give the first of the pair to the scroller as its ref. It says which sides have more (`start`, `end`) and, with `peek`, keeps the row's spacing such that a door is cut by the edge.
//   - ScrollFades: the two fades, placed over the scroller's wrapper (which is `relative`).
//   - ScrollMore: a wrapper div + scroller + fades for a row that needs no wrapper of its own.
// Peek: the row's gap is `calc(<its own gap> + var(--scroll-more-extra, 0px))`; the hook sets --scroll-more-extra (0 to MAX_EXTRA px) on the scroller, the least that leaves the first door the
// edge cuts with FADE_CLEAR px or more beyond it and a thumb-readable part inside. A row that fits, or that is wrapped (the Verse view's by-hand field), gets neither fade nor spacing.
// The fade runs to var(--color-canvas) unless `from` says otherwise (a row on a card passes var(--color-surface); a box that holds Markdown sets --scroll-more-from), so it follows light, dark, sepia and High contrast.
import { FADE_PX } from './scrollPeek';
import { useScrollMore, type Sides } from './useScrollMore';
import { type CSSProperties, type ElementType, type HTMLAttributes, type ReactNode } from 'react';

/** The fade's colour: the background in force, which a box on a card sets for what is inside it by `--scroll-more-from` (a table of the tutor's Markdown), else the page's. */
const FROM = 'var(--scroll-more-from, var(--color-canvas))';
/** The two fades, over the edges of the scroller's wrapper (which stands `relative`): each only on a side that has more. They take no tap. */
export function ScrollFades({ start, end, from = FROM }: Sides & { from?: string }) {
  const base: CSSProperties = { width: FADE_PX };
  return (
    <>
      {start ? (
        <span aria-hidden="true" data-scroll-fade="start" className="pointer-events-none absolute inset-y-0 left-0 z-1" style={{ ...base, backgroundImage: `linear-gradient(to right, ${from}, transparent)` }} />
      ) : null}
      {end ? (
        <span aria-hidden="true" data-scroll-fade="end" className="pointer-events-none absolute inset-y-0 right-0 z-1" style={{ ...base, backgroundImage: `linear-gradient(to left, ${from}, transparent)` }} />
      ) : null}
    </>
  );
}

type ScrollMoreProps = Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'> & {
  children: ReactNode;
  /** the scroller's own classes: overflow-x-auto, its gap (calc(<gap> + var(--scroll-more-extra, 0px)) when `peek`), its padding */
  className?: string;
  /** the wrapper's classes (it is `relative`) */
  wrapperClassName?: string;
  /** the scroller's element, 'div' unless it is a list */
  as?: ElementType;
  /** the colour the fade runs to: the background the row stands on */
  from?: string;
  /** keep a door cut by the edge (rows of doors); a table or a picture has no doors, so the fade alone */
  peek?: boolean;
};

/** A row that scrolls sideways with its sign that there is more: a wrapper, the scroller (the element that scrolls, with `className` and any other props) and the fades. */
export function ScrollMore({ children, className, wrapperClassName, as: Tag = 'div', from, peek = true, ...rest }: ScrollMoreProps) {
  const [attach, more] = useScrollMore<HTMLElement>({ peek });
  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      <Tag ref={attach} className={className} {...rest}>
        {children}
      </Tag>
      <ScrollFades {...more} from={from} />
    </div>
  );
}
