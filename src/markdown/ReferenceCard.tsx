// src/markdown/ReferenceCard.tsx — a Bible reference in the tutor's answer (mw-5r3p30.133), the pop-up Logos gives a verse: a tap on the link opens a small card
// under it with the reference as its heading, the passage as the Reader draws it now (English, the Weave with his weave settings, or Greek, mw-5r3p30.697) and Open,
// which opens the Reader on the verse's chapter with the verse brought to the top and the rest above and below it (never the Verse view). A whole chapter shows its first verse. Lampas holds no Old Testament text, so that card says 'Not in Lampas yet' and has no Open: with Logos linked in Settings it has 'Open in Logos' instead, at that
// verse (a whole chapter at its first) in the Bible he chose there (src/resources/logosBible.ts), and with no Bible app linked a link to Settings where he links Logos. A tap outside the
// card (not on the reference itself: a second tap there changes nothing, mw-5r3p30.429), Close, Escape or Back closes it and nothing moves (it is a sheet for Back, src/ui/sheetBack.ts). The card sits below the reference, or above it when
// there is no room below, so it never covers what was tapped.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadChapter, type Chapter, type Verse } from '../data/chapter';
import { getLogosBible, getStudyResources } from '../data/repositories';
import { openAtVerse } from '../nav/readerRequest';
import { openSettingsSection } from '../settings/link';
import { verseLink } from '../resources/logosBible';
import { armFallback } from '../resources/openApp';
import { useSheetBack } from '../ui/sheetBack';
import { VerseText } from '../reader/VerseText';
import { useViewSettings } from '../reader/useViewSettings';
import { useWoven } from '../reader/useWoven';
import { textClass } from '../reader/textClass';
import { langOf } from '../script/greekLang';
import { cardOf, elsewhereOf, referenceHash, type HeldPlace, type ReferenceCard as Card } from './verseLinks';

/** The translation the reader's English is, and the edition its Greek follows. */
const TRANSLATION = 'Majority Standard Bible';
const GREEK_TEXT = 'Robinson-Pierpont Greek';

const MARGIN = 8;
const GAP = 6;
const WIDTH = 340;

/** `null` while the chapter loads, `'failed'` when it cannot be had. */
type Passage = Chapter | 'failed' | null;

/** The indices of the Greek words of `verse` that are `form`: the first one, which a card marks (a form that stands twice in a verse is marked at its first place). */
const markedIn = (verse: Verse, form: string): ReadonlySet<number> => {
  const at = verse.g.findIndex((w) => w.t === form);
  return new Set(at < 0 ? [] : [at]);
};

/** The passage as the Reader would draw it, in his view and Weave, with the Greek word `mark` marked when there is one (mw-5r3p30.652). The words are plain text: a tap on a card opens nothing. */
function MarkedPassage({ chapter, held, mark }: { chapter: Chapter; held: HeldPlace; mark?: string }) {
  const settings = useViewSettings();
  const woven = useWoven(chapter, settings ?? {});
  if (!settings) return <p role="status" className="py-1 text-base text-muted">Loading…</p>;
  const inRange = chapter.verses.map((v, i) => ({ v, i })).filter(({ v }) => v.n >= held.first && v.n <= held.last);
  return (
    <p data-reference-text data-view={settings.view} {...langOf(settings.view === 'greek')} className={`break-words leading-snug ${textClass(settings.view)}`}>
      {inRange.map(({ v, i }, k) => (
        <span key={v.n}>
          {inRange.length > 1 ? <sup className="mr-0.5 font-sans text-xs text-muted">{v.n}</sup> : null}
          <VerseText verse={v} view={settings.view} woven={woven?.[i] ?? null} onLook={() => undefined} marked={mark === undefined ? undefined : markedIn(v, mark)} still />
          {k < inRange.length - 1 ? ' ' : ''}
        </span>
      ))}
    </p>
  );
}

/** Settings, scrolled to the Study resources, where Logos is linked. */
const LINK_LOGOS_HASH = '#/settings?section=resources';

/** An Old Testament place, for a link to a Bible app: the book's code, the chapter and the verse (none for a whole chapter). */
export interface ElsewherePlace {
  book: string;
  chapter: number;
  verse?: number;
}

/** What an Old Testament card says under its heading: that Lampas lacks it and where to read it instead. `onSettings` opens Settings. `said` is false where the
 *  words 'Not in Lampas yet' are already said above it (the notice a link leaves under the header). */
export function ElsewhereLine({ place, said = true, onSettings }: { place: ElsewherePlace | null; said?: boolean; onSettings: () => void }) {
  const resources = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const not = said ? 'Not in Lampas yet' : null;
  if (!resources || bible === undefined) return not ? <p className="py-1 text-lg text-muted">{not}</p> : null;
  const link = resources.on.includes('logos') && place ? verseLink(place.book, place.chapter, place.verse ?? 1, bible) : undefined;
  if (!link) {
    return (
      <p className="py-1 text-lg text-muted">
        {not ? `${not}. ` : null}
        <a href={LINK_LOGOS_HASH} onClick={(e) => { e.preventDefault(); onSettings(); }} className="text-accent underline">Link Logos in Settings</a> to open it there.
      </p>
    );
  }
  return (
    <>
      {not ? <p className="py-1 text-lg text-muted">{not}</p> : null}
      <a
        href={link.url}
        data-fallback={link.fallback}
        onClick={() => armFallback(link.fallback)}
        className="mb-1 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 text-base font-medium text-accent-fg"
      >
        Open in Logos<span aria-hidden="true"> ↗</span>
      </a>
    </>
  );
}

interface Spot {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** Where the card goes: below the reference when it fits, else above it, else on the roomier side with its text scrolling. `floor` is the top of the layer it is placed in
 * (the foot of the shell's bars, mw-5r3p30.644): the card does not go above it, and its `top` is counted from it. */
function spotFor(anchor: DOMRect, natural: number, floor: number): Spot {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(WIDTH, vw - 2 * MARGIN);
  const left = Math.min(Math.max(anchor.left, MARGIN), vw - width - MARGIN);
  const below = vh - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - floor - GAP - MARGIN;
  if (natural <= below || (natural > above && below >= above)) return { top: anchor.bottom + GAP - floor, left, width, maxHeight: Math.max(below, 0) };
  const height = Math.min(natural, above);
  return { top: anchor.top - GAP - height - floor, left, width, maxHeight: Math.max(above, 0) };
}

/** True when a tap at (x, y) is on the reference that opened the card: the backdrop covers it, but a second tap there is not one outside the card. */
function onReference(reference: HTMLElement | null, x: number, y: number): boolean {
  return [...(reference?.getClientRects() ?? [])].some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
}

function ReferenceCardView({ card, place, mark, anchor, onClose, onOpen, onSettings }: { card: Card; place: ElsewherePlace | null; mark?: string; anchor: RefObject<HTMLElement | null>; onClose: () => void; onOpen: () => void; onSettings: () => void }) {
  useSheetBack(onClose);
  const { held } = card;
  const [passage, setPassage] = useState<Passage>(null);
  const view = useViewSettings()?.view;
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    if (!held) return;
    let live = true;
    loadChapter(held.book, held.chapter).then(
      (loaded) => live && setPassage(loaded),
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
      if (anchor.current && box.current && layer.current) setSpot(spotFor(anchor.current.getBoundingClientRect(), box.current.scrollHeight, layer.current.getBoundingClientRect().top));
    };
    place();
    window.addEventListener('resize', place);
    // the layer starts below the bars: it is resized when a bar comes or goes
    const watch = typeof ResizeObserver === 'undefined' || !layer.current ? undefined : new ResizeObserver(place);
    if (watch && layer.current) watch.observe(layer.current);
    return () => {
      window.removeEventListener('resize', place);
      watch?.disconnect();
    };
  }, [anchor, passage]);

  return createPortal(
    <div ref={layer} data-reference-backdrop className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); if (!onReference(anchor.current, e.clientX, e.clientY)) onClose(); }}>
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
            <ElsewhereLine place={place} onSettings={onSettings} />
          ) : passage === null ? (
            <p role="status" className="py-1 text-base text-muted">Loading…</p>
          ) : passage === 'failed' ? (
            <p role="status" className="py-1 text-base text-muted">This passage is not on this phone yet, and you are offline.</p>
          ) : (
            <MarkedPassage chapter={passage} held={held} mark={mark} />
          )}
        </div>
        {held ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2">
            <span className="text-sm text-muted">{view === 'greek' ? GREEK_TEXT : TRANSLATION}</span>
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

/** Runs `then` once the history entry of the card, which closing it takes off with a step Back (src/ui/sheetBack.ts), has gone, or at the latest a moment later. */
function afterSheetEntryGone(then: () => void): void {
  let done = false;
  const run = (): void => {
    if (done) return;
    done = true;
    window.removeEventListener('popstate', run);
    clearTimeout(timer);
    then();
  };
  const timer = setTimeout(run, 400);
  window.addEventListener('popstate', run);
}

/** A reference link in an answer: the words stay where they are; a tap opens the card. With `mark` (a Greek form, as a Review question gives it) the card shows
 *  the passage as the Reader draws it, in his view and Weave, with that word marked, instead of the plain English (mw-5r3p30.652). `onLeave` is called before Open opens the reader (the Talk sheet closes there). `replacing`: Open puts the Reader in the place of the screen's own entry rather than after it (the Share to Lampas list, whose
 *  entries Back must find again: src/nav/route.ts replaceReader).
 *  A reference found by name rather than written for the tutor's `cardOf` (Share to Lampas lists 'Song of Solomon 2:1', 'Gen. 1:28' with their book known) gives
 *  its `old` Testament place and `heading`, or, for the New Testament, its `found` card (what `referencesIn` gives), and a `className`, `href` (what a long press has) and `data` of its own. */
export function ReferenceLink({ written, onLeave, replacing, old, found, mark, className, href, data, children }: { written: string; onLeave?: () => void; replacing?: boolean; mark?: string; old?: { heading: string; place: ElsewherePlace }; found?: Card; className?: string; href?: string; data?: Record<string, string>; children: ReactNode }) {
  const card = useMemo(() => (old ? { heading: old.heading, held: null } : found ?? cardOf(written)), [written, old, found]);
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  if (!card) return <>{children}</>;
  const held = card.held;
  return (
    <>
      <a
        ref={anchor}
        href={href ?? referenceHash(written)}
        aria-haspopup="dialog"
        className={className}
        {...data}
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
          place={old ? old.place : found ? null : elsewhereOf(written)}
          mark={mark}
          anchor={anchor}
          onClose={() => setOpen(false)}
          onOpen={() => {
            if (!held) return;
            onLeave?.();
            setOpen(false);
            if (replacing) afterSheetEntryGone(() => openAtVerse(held.book, held.chapter, held.first, true));
            else openAtVerse(held.book, held.chapter, held.first);
          }}
          onSettings={() => {
            onLeave?.();
            setOpen(false);
            openSettingsSection('resources');
          }}
        />
      ) : null}
    </>
  );
}
