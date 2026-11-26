// src/timeline/TimelineStrip.tsx — the timeline strip on the page (mw-fnvjof.17.317.2, docs/timeline-design.md 'Touch targets' and 'Rendering'): the picture is one canvas that strip.ts draws and
// moves, and everything read, pressed or announced is real DOM laid over it at rest. Each mark in a lane is a button named by its title and years, the ruler is a button where the ribbon holds
// what found no lane, the chapter's name stands at the side it lies on when its years are out of view, and Zoom out and Zoom in stand at the ruler's end. While the strip moves the buttons
// over the picture are hidden. The strip is a group that takes focus: the arrow keys, + and - and Home move it. A tap on a mark says its name and years (its card is mw-fnvjof.17.317.3's).
import { useEffect, useId, useRef, useState } from 'react';
import { BOOKS } from '../data/books';
import { announce } from '../ui/live';
import { mountStrip, type Strip, type StripHit, type StripRest, type StripRoot } from './strip';
import { loadTimeline } from './timelineData';

const CODES = BOOKS.map((book) => book.code);
const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';
const ZOOM = `h-11 w-11 rounded-xl text-2xl font-medium leading-none text-accent active:bg-line aria-disabled:text-muted aria-disabled:opacity-50 ${RING}`;

export function TimelineStrip({ book, chapter, chapterName, height, onStrip, onRest }: {
  /** Lampas's book code and the chapter the Reader has open */
  book: string;
  chapter: number;
  /** the chapter as the Reader names it: 'Isaiah 1' */
  chapterName: string;
  /** the strip's height in px (src/timeline/design.ts stripHeight) */
  height: number;
  /** the mounted strip, for the dock's row and the Reader's buttons; null when it goes. Must keep its identity between renders. */
  onStrip(strip: Strip | null): void;
  /** where the strip stands, each time it comes to rest. Must keep its identity between renders. */
  onRest(rest: StripRest): void;
}) {
  const [root, setRoot] = useState<StripRoot | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rest, setRest] = useState<StripRest | null>(null);
  const [moving, setMoving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const strip = useRef<Strip | null>(null);
  const said = useRef<string | null>(null);
  const stands = useId();

  useEffect(() => {
    if (!root || !canvas) return;
    const mounted = mountStrip(root, canvas, {
      book,
      chapter,
      chapterName,
      books: CODES,
      load: loadTimeline,
      onRest: (now) => {
        setRest(now);
        setMoving(false);
        onRest(now);
        // where the strip stands is said when he has moved it, not when it opens
        if (said.current !== null && said.current !== now.stands) announce(now.stands);
        said.current = now.stands;
      },
      onMoving: () => setMoving(true),
      onLoaded: () => setLoaded(true),
    });
    strip.current = mounted;
    onStrip(mounted);
    return () => {
      strip.current = null;
      onStrip(null);
      mounted.destroy();
    };
  }, [root, canvas, book, chapter, chapterName, onStrip, onRest]);

  const say = (hit: StripHit) => announce(hit.names.length > 1 ? `${hit.label}: ${hit.names.join('; ')}` : hit.label);
  return (
    <div
      ref={setRoot}
      role="group"
      aria-label="Timeline"
      aria-describedby={stands}
      tabIndex={0}
      data-timeline-strip
      data-timeline-loaded={loaded ? '' : undefined}
      data-timeline-moving={moving ? '' : undefined}
      data-two-finger
      style={{ height }}
      className={`relative touch-pan-y select-none overflow-hidden bg-surface ${RING}`}
    >
      <canvas ref={setCanvas} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      <div data-timeline-hits hidden={moving} className="absolute inset-0">
        {rest?.hits.map((hit) => (
          <button
            key={hit.key}
            type="button"
            data-mark={hit.mark}
            aria-label={hit.label}
            onClick={() => say(hit)}
            style={{ left: hit.x, top: hit.y, width: hit.w, height: hit.h }}
            className={`absolute rounded-[10px] active:bg-fg/10 ${RING}`}
          />
        ))}
      </div>
      {rest?.away ? (
        <button
          type="button"
          data-nopan
          data-timeline-home={rest.away}
          onClick={() => strip.current?.goHome()}
          className={`lp-fade-in absolute top-1 ${rest.away === 'left' ? 'left-2' : 'right-2'} min-h-9 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-accent shadow-md before:absolute before:-inset-1 before:content-[''] active:bg-line ${RING}`}
        >
          {rest.away === 'left' ? `‹ ${chapterName}` : `${chapterName} ›`}
        </button>
      ) : null}
      <div
        role="group"
        aria-label="Zoom"
        data-nopan
        style={{ top: rest?.spine ?? 0 }}
        className={`${rest ? 'flex' : 'hidden'} absolute right-0 bg-[linear-gradient(to_right,transparent,var(--lp-surface)_16px)] pl-4 transition-[top] duration-200 motion-reduce:transition-none`}
      >
        <button type="button" aria-label="Zoom out" aria-disabled={rest?.canZoomOut === false ? true : undefined} data-repeat onClick={() => strip.current?.zoomOut()} className={ZOOM}>
          −
        </button>
        <button type="button" aria-label="Zoom in" aria-disabled={rest?.canZoomIn === false ? true : undefined} data-repeat onClick={() => strip.current?.zoomIn()} className={ZOOM}>
          +
        </button>
      </div>
      <p id={stands} className="sr-only">
        {rest?.stands ?? ''}
      </p>
    </div>
  );
}
