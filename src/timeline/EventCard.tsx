// src/timeline/EventCard.tsx — the timeline's card (mw-fnvjof.17.317.3, docs/timeline-design.md 'The card'): a tap on a mark of the strip raises it from the strip's foot, inside the dock, in
// CARD_MS (the sheets' own rise of 24 px; at once under reduced motion). An event's card has its title, when it was and for how long, its verses as chips and its people; a life's has
// the name, the years and the events the person takes part in, as rows that open them; the ruler's list has a row for each mark that found no lane. A verse chip moves the text
// (`onVerse`: the chip whose range holds the open chapter is tinted and aria-current); a person the data dates is a quiet chip that opens the life, one with no year is plain words. The
// card is ordinary page text and takes the Text size setting whole; it is never taller than `maxHeight` (design.ts cardRoom) and scrolls inside itself past that, its head staying; the
// chips wrap, so nothing in it scrolls sideways. It tells its height each time it is laid out (`onLaid`), which is the room the strip makes above it. Close shuts it (Escape is the strip's).
import { useId, useLayoutEffect, useRef } from 'react';
import type { Card, VerseChip } from './card';
import { MOTION } from './design';

const RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent';
const CHIP = `min-h-11 whitespace-nowrap rounded-xl border px-3.5 text-base font-medium active:bg-line ${RING}`;
const ROW = `flex min-h-11 w-full items-center justify-between gap-3 border-t border-line text-start text-base text-fg active:bg-line ${RING}`;

export function EventCard({ card, maxHeight, onLaid, onOpen, onVerse, onClose }: {
  card: Card;
  /** the most of the strip the card may take, px */
  maxHeight: number;
  /** the card is laid out, this many px tall. Must keep its identity between renders. */
  onLaid(card: Card, height: number): void;
  /** a row or a person's chip: open that mark's card */
  onOpen(id: string): void;
  onVerse(chip: VerseChip): void;
  onClose(): void;
}) {
  const box = useRef<HTMLElement | null>(null);
  const title = useId();
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const tell = () => onLaid(card, el.offsetHeight);
    tell();
    if (typeof ResizeObserver === 'undefined') return;
    // the chips wrap again when a face arrives or the dock is turned on its side: the strip is told the new height
    const watch = new ResizeObserver(tell);
    watch.observe(el);
    return () => watch.disconnect();
  }, [card, maxHeight, onLaid]);
  return (
    <section
      ref={box}
      data-timeline-card={card.kind}
      data-nopan
      aria-labelledby={title}
      style={{ maxHeight, animationDuration: `${MOTION.CARD_MS}ms` }}
      className="lp-sheet-in absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain rounded-t-2xl border-t border-line bg-surface px-3 pb-2 text-base text-fg shadow-[0_-8px_20px_rgb(0_0_0/0.12)]"
    >
      <div className="sticky top-0 flex min-h-11 items-start justify-between gap-3 bg-surface">
        <h2 id={title} className="py-2.5 text-lg font-semibold leading-6">
          {card.title}
        </h2>
        <button type="button" onClick={onClose} className={`min-h-11 shrink-0 rounded-xl pl-3 pr-1 text-base font-medium text-accent active:bg-line ${RING}`}>
          Close
        </button>
      </div>
      {card.kind === 'list' ? null : (
        <p data-card-when className="mb-1 text-muted">
          {card.when}
        </p>
      )}
      {card.kind === 'event' ? (
        <>
          {card.verses.length > 0 ? (
            <div role="group" aria-label="Verses" className="flex flex-wrap gap-2">
              {card.verses.map((chip) => (
                <button
                  key={`${chip.book} ${chip.label}`}
                  type="button"
                  data-card-verse={`${chip.book}/${chip.chapter}/${chip.verse}`}
                  aria-current={chip.here ? 'true' : undefined}
                  onClick={() => onVerse(chip)}
                  className={`${CHIP} text-accent ${chip.here ? 'border-transparent bg-accent/15' : 'border-line'}`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          ) : null}
          {card.people.length > 0 ? (
            <div role="group" aria-label="People" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {card.people.map(({ name, id }) =>
                id === null ? (
                  <span key={name} data-card-person className="inline-flex min-h-11 items-center px-0.5">
                    {name}
                  </span>
                ) : (
                  <button key={id} type="button" data-card-person={id} onClick={() => onOpen(id)} className={`${CHIP} border-line text-fg`}>
                    {name}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div>
          {card.rows.map((row) => (
            <button key={row.id} type="button" data-card-row={row.id} onClick={() => onOpen(row.id)} className={ROW}>
              <span>{row.title}</span>
              <span className="shrink-0 text-sm text-muted">{row.when}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
