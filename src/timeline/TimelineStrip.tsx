// src/timeline/TimelineStrip.tsx — the timeline strip on the page (mw-fnvjof.17.317.2, docs/timeline-design.md 'Touch targets' and 'Rendering'): the picture is one canvas that strip.ts draws and
// moves, and everything read, pressed or announced is real DOM laid over it at rest. Each mark in a lane is a button named by its title and years, the ruler is a button where the ribbon holds
// what found no lane, the chapter's name stands at the side it lies on when its years are out of view, and Zoom out and Zoom in stand at the ruler's end. While the strip moves the buttons
// over the picture are hidden. The strip is a group that takes focus: the arrow keys, + and - and Home move it. A tap on a mark opens its card at the strip's foot (mw-fnvjof.17.317.3,
// EventCard.tsx): an event's or a life's own, or the list of what the ruler holds there; the strip is told the mark and the card's height (`choose`), so it makes room above the card and
// rings the mark. Close and Escape shut it and give the keys back to the strip. When he turns to another chapter the strip that goes leaves where it stood (follow.ts) and the new
// chapter's strip, made afresh with the Reader, begins there and flies to its own time.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BOOKS, bookOf } from '../data/books';
import { readerOf } from '../nav/route';
import { focusQuietly } from '../ui/focus';
import { announce } from '../ui/live';
import type { View } from './axis';
import type { Card, VerseChip } from './card';
import { cardRoom } from './design';
import { EventCard } from './EventCard';
import { leaveFor, takeFor } from './follow';
import { mountStrip, type Strip, type StripHit, type StripRest, type StripRoot } from './strip';
import { loadTimeline } from './timelineData';

const CODES = BOOKS.map((book) => book.code);
const nameOfBook = (code: string): string => bookOf(code)?.name ?? code;
const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';
const ZOOM = `h-11 w-11 rounded-xl text-2xl font-medium leading-none text-accent active:bg-line aria-disabled:text-muted aria-disabled:opacity-50 ${RING}`;

export function TimelineStrip({ book, chapter, chapterName, height, onStrip, onRest, onVerse }: {
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
  /** a verse chip of a card: move the text to that verse (of the open chapter, or of another chapter or book) */
  onVerse(book: string, chapter: number, verse: number): void;
}) {
  const [root, setRoot] = useState<StripRoot | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [rest, setRest] = useState<StripRest | null>(null);
  const [moving, setMoving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const strip = useRef<Strip | null>(null);
  const [engine, setEngine] = useState<Strip | null>(null);
  // the marks a card is open on: one for an event's or a life's, several for the ruler's list, which is headed `title`
  const [shown, setShown] = useState<{ ids: string[]; title: string } | null>(null);
  const said = useRef<string | null>(null);
  // where the last chapter's strip stood, taken once for this chapter and held until this strip has come to rest (React's strict mode mounts twice)
  const handed = useRef<{ place: string; view: View | null } | null>(null);
  const stands = useId();

  useEffect(() => {
    if (!root || !canvas) return;
    const place = `${book}/${chapter}`;
    if (handed.current?.place !== place) handed.current = { place, view: takeFor(place) };
    const mounted = mountStrip(root, canvas, {
      book,
      chapter,
      chapterName,
      books: CODES,
      load: loadTimeline,
      bookName: nameOfBook,
      from: handed.current.view,
      onRest: (now) => {
        handed.current = { place, view: null };
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
    setEngine(mounted);
    onStrip(mounted);
    return () => {
      // he has turned to another chapter (the address names it as this strip goes): that chapter's strip begins where this one stands
      const named = readerOf(window.location.hash);
      const to = named.chapter === undefined ? place : `${named.book ?? 'rom'}/${named.chapter}`;
      if (to !== place) leaveFor(to, mounted.view);
      strip.current = null;
      setEngine(null);
      setShown(null);
      onStrip(null);
      mounted.destroy();
    };
  }, [root, canvas, book, chapter, chapterName, onStrip, onRest]);

  // what the card says, worked out again each time the strip comes to rest (the other books' files bring more marks: a person gains a line, a life more events)
  const card = useMemo(() => (shown && engine && rest ? engine.cardOf(shown.ids, shown.title) : null), [shown, engine, rest]);
  const laid = useCallback((of: Card, px: number) => engine?.choose(of.id, px), [engine]);
  const openMark = useCallback((id: string) => setShown({ ids: [id], title: '' }), []);
  const shut = useCallback(() => {
    setShown(null);
    engine?.choose(null, 0);
    focusQuietly(root);
  }, [engine, root]);
  const open = (hit: StripHit) => {
    // the mark whose card is open, tapped again, shuts it (its button says it is expanded)
    if (hit.ids.length === 1 && card?.id === hit.ids[0]) return shut();
    setShown({ ids: hit.ids, title: hit.label });
    announce(hit.names.length > 1 ? `${hit.label}: ${hit.names.join('; ')}` : hit.label);
  };
  const toVerse = useCallback((chip: VerseChip) => onVerse(chip.book, chip.chapter, chip.verse), [onVerse]);
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
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !card) return;
        event.stopPropagation();
        shut();
      }}
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
            aria-expanded={hit.mark === 'ribbon' ? undefined : card?.id === hit.mark}
            onClick={() => open(hit)}
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
      {card ? <EventCard card={card} maxHeight={cardRoom(height)} onLaid={laid} onOpen={openMark} onVerse={toVerse} onClose={shut} /> : null}
      <p id={stands} className="sr-only">
        {rest?.stands ?? ''}
      </p>
    </div>
  );
}
