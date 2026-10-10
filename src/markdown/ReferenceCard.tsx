// src/markdown/ReferenceCard.tsx — a Bible reference in the tutor's answer (mw-5r3p30.133), the pop-up Logos gives a verse: a tap on the link opens a small card
// under it with the reference as its heading, the passage's English (the Majority Standard Bible, the only English in the reader) and Open, which opens the reader
// on the verse. A whole chapter shows its first verse. Lampas holds no Old Testament text, so that card says 'Not in Lampas yet' and has no Open. A tap outside the
// card, Close, Escape or Back closes it and nothing moves (it is a sheet for Back, src/ui/sheetBack.ts). The card sits below the reference, or above it when
// there is no room below, so it never covers what was tapped.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { loadChapter, type Chapter } from '../data/chapter';
import { openVerseAt } from '../nav/route';
import { useSheetBack } from '../ui/sheetBack';
import { cardOf, referenceHash, type HeldPlace, type ReferenceCard as Card } from './verseLinks';

/** The translation the reader's English is. */
const TRANSLATION = 'Majority Standard Bible';

const MARGIN = 8;
const GAP = 6;
const WIDTH = 340;

/** One verse of the passage, with its English as the chapter file has it. */
interface PassageVerse {
  n: number;
  text: string;
}

/** `null` while the chapter loads, `'failed'` when it cannot be had. */
type Passage = PassageVerse[] | 'failed' | null;

const passageOf = (chapter: Chapter, held: HeldPlace): PassageVerse[] =>
  chapter.verses
    .filter((v) => v.n >= held.first && v.n <= held.last)
    .map((v) => ({ n: v.n, text: v.e.map((c) => c.t.trim()).join(' ') }));

interface Spot {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** Where the card goes: below the reference when it fits, else above it, else on the roomier side with its text scrolling. */
function spotFor(anchor: DOMRect, natural: number): Spot {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(WIDTH, vw - 2 * MARGIN);
  const left = Math.min(Math.max(anchor.left, MARGIN), vw - width - MARGIN);
  const below = vh - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - GAP - MARGIN;
  if (natural <= below || (natural > above && below >= above)) return { top: anchor.bottom + GAP, left, width, maxHeight: Math.max(below, 0) };
  const height = Math.min(natural, above);
  return { top: anchor.top - GAP - height, left, width, maxHeight: Math.max(above, 0) };
}

function ReferenceCardView({ card, anchor, onClose, onOpen }: { card: Card; anchor: RefObject<HTMLElement | null>; onClose: () => void; onOpen: () => void }) {
  useSheetBack(onClose);
  const { held } = card;
  const [passage, setPassage] = useState<Passage>(null);
  const box = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    if (!held) return;
    let live = true;
    loadChapter(held.book, held.chapter).then(
      (chapter) => live && setPassage(passageOf(chapter, held)),
      () => live && setPassage('failed'),
    );
    return () => {
      live = false;
    };
  }, [held]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Placed once drawn, and again when its text arrives or the screen turns (the card's own height is read from its content).
  useLayoutEffect(() => {
    const place = (): void => {
      if (anchor.current && box.current) setSpot(spotFor(anchor.current.getBoundingClientRect(), box.current.scrollHeight));
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, passage]);

  return createPortal(
    <div data-reference-backdrop className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div
        ref={box}
        role="dialog"
        aria-label={card.heading}
        data-reference-card
        onClick={(e) => e.stopPropagation()}
        style={spot ? { top: spot.top, left: spot.left, width: spot.width, maxHeight: spot.maxHeight } : { top: 0, left: MARGIN, width: Math.min(WIDTH, window.innerWidth - 2 * MARGIN), visibility: 'hidden' }}
        className="absolute flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-fg shadow-lg"
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-2">
          <h2 className="text-lg font-semibold">{card.heading}</h2>
          <button type="button" onClick={onClose} className="-mr-2 min-h-11 min-w-11 rounded-lg px-2 text-base text-muted">
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {!held ? (
            <p className="py-1 text-lg text-muted">Not in Lampas yet</p>
          ) : passage === null ? (
            <p role="status" className="py-1 text-base text-muted">Loading…</p>
          ) : passage === 'failed' ? (
            <p role="status" className="py-1 text-base text-muted">This passage is not on this phone yet, and you are offline.</p>
          ) : (
            <p data-reference-text className="text-lg leading-snug">
              {passage.map((v, i) => (
                <span key={v.n}>
                  {passage.length > 1 ? <sup className="mr-0.5 text-xs text-muted">{v.n}</sup> : null}
                  {v.text}
                  {i < passage.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>
        {held ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
            <span className="text-sm text-muted">{TRANSLATION}</span>
            <button type="button" onClick={onOpen} className="min-h-11 rounded-lg bg-accent px-5 text-base font-medium text-accent-fg">
              Open<span aria-hidden="true"> ›</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** A reference link in an answer: the words stay where they are; a tap opens the card. `onLeave` is called before Open opens the reader (the Talk sheet closes there). */
export function ReferenceLink({ written, onLeave, children }: { written: string; onLeave?: () => void; children: ReactNode }) {
  const card = useMemo(() => cardOf(written), [written]);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  if (!card) return <>{children}</>;
  const held = card.held;
  return (
    <>
      <a
        ref={anchor}
        href={referenceHash(written)}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {open ? (
        <ReferenceCardView
          card={card}
          anchor={anchor}
          onClose={() => setOpen(false)}
          onOpen={() => {
            if (!held) return;
            onLeave?.();
            setOpen(false);
            openVerseAt({ book: held.book, chapter: held.chapter, verse: held.first });
          }}
        />
      ) : null}
    </>
  );
}
