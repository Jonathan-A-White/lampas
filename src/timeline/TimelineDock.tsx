// src/timeline/TimelineDock.tsx — the body of the Reader's dock when it holds the timeline (mw-fnvjof.17.317.2, docs/timeline-design.md 'Layout'): the strip, then the credit line Theographic's
// data asks for wherever it is shown, then the link to Bible Mapper's own timeline, opened at the year in the middle of the strip. The body scrolls up and down as a map's does. The strip's
// height is worked out from the body's and the credit's (stripHeight, decision D2): it keeps its five lanes while the body has them and grows with a taller dock, so the credit is in view
// whole from a 350 px body up and one small scroll down on the installed phone at Half. The design's sums are of the room under the handle row (Half at 390x844 is 374 px: the 44 px row and
// 330 px), and the dock's own 1 px top border is part of that room: it is counted with the body's height, so the installed phone's body (281 px inside the border) still has its five lanes.
import { useCallback, useLayoutEffect, useState } from 'react';
import { LAYOUT, stripHeight } from './design';
import type { Strip, StripRest } from './strip';
import { TIMELINE_CREDIT } from './types';
import { TimelineStrip } from './TimelineStrip';

/** Bible Mapper's own timeline, which takes a year (negative BC) as `?date=` (src/maps/sources/biblemapper.ts). */
const BIBLE_MAPPER_TIMELINE = 'https://biblemapper.com/timeline/';
const LINK = 'inline-flex min-h-11 items-center text-base font-medium text-accent underline underline-offset-4';

export function TimelineDock({ book, chapter, chapterName, box, onStrip, onRest }: {
  book: string;
  chapter: number;
  /** the chapter as the Reader names it: 'Isaiah 1' */
  chapterName: string;
  /** the dock's scroll box (the body), whose height the strip's is worked out from */
  box: HTMLElement | null;
  onStrip(strip: Strip | null): void;
  onRest(rest: StripRest): void;
}) {
  const [credit, setCredit] = useState<HTMLElement | null>(null);
  const [room, setRoom] = useState<{ body: number; credit: number } | null>(null);
  const [year, setYear] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!box || !credit) return;
    const measure = () => {
      // the room under the handle row: the body, and the dock's top border above the row (none side by side, where the border is at the dock's left)
      const body = box.clientHeight + (box.closest<HTMLElement>('[data-dock]')?.clientTop ?? 0);
      setRoom((was) => (was && was.body === body && was.credit === credit.offsetHeight ? was : { body, credit: credit.offsetHeight }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(measure);
    watch.observe(box);
    watch.observe(credit);
    return () => watch.disconnect();
  }, [box, credit]);
  const rested = useCallback(
    (rest: StripRest) => {
      setYear(rest.year);
      onRest(rest);
    },
    [onRest],
  );
  return (
    <div data-timeline-dock>
      <TimelineStrip book={book} chapter={chapter} chapterName={chapterName} height={room ? stripHeight(room.body, room.credit) : LAYOUT.STRIP_FULL} onStrip={onStrip} onRest={rested} />
      <p ref={setCredit} data-timeline-credit className="px-3 py-1 text-sm text-muted">
        {TIMELINE_CREDIT}
      </p>
      <div className="px-3 pb-2">
        <a href={year === null ? BIBLE_MAPPER_TIMELINE : `${BIBLE_MAPPER_TIMELINE}?date=${year}`} target="_blank" rel="noopener noreferrer" className={LINK}>
          Timeline at Bible Mapper
        </a>
      </div>
    </div>
  );
}
