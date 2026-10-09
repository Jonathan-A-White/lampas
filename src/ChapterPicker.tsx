// src/ChapterPicker.tsx — the bottom sheet the Reader's title opens (mw-5r3p30.60): the 39 Old Testament books and the 27 New Testament
// books in canonical order in a box of their own with a search field (a long list is a widget, docs/pwa-best-practices.md section 8),
// then, for the book he taps, a grid of its chapters (the counts of the New Testament come from data/index.json). A tap on a New Testament
// chapter opens it in the Reader as a new Back step; the phone's Back, Done, Escape, a swipe down or a tap outside closes the picker
// (src/ui/sheetBack.ts). Lampas has no Old Testament text (mw-5r3p30.71): an Old Testament book is marked 'Logos' and its chapter is a link
// that opens in Logos, in the Bible he chose in Settings (src/resources/logosBible.ts); the open Lampas chapter does not change. With
// Logos off in Settings the books still show; picking one says so and turns Logos on in one tap.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { BOOKS, bookOf } from './data/books';
import { type BookIndex, loadIndex } from './data/chapter';
import type { OpenChapter } from './data/readerChapter';
import { getLogosBible } from './data/repositories';
import { OT_BOOKS, otBookOf } from './data/otBooks';
import { getStudyResources, setResourceOn } from './data/repositories/resources';
import { openReader } from './nav/route';
import { chapterLink } from './resources/logosBible';
import { armFallback } from './resources/openApp';
import { focusOnMount } from './ui/focus';
import { matching } from './ui/listFilter';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

const ITEMS = [...OT_BOOKS, ...BOOKS].map((b) => ({ id: b.code, name: b.name }));

/** The chapter numbers of one book: a grid of 48 px buttons. */
function Chapters({ code, current, onPick }: { code: string; current: OpenChapter; onPick: (chapter: number) => void }) {
  const [index, setIndex] = useState<BookIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadIndex().then(
      (i) => live && (setFailed(false), setIndex(i)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const count = index?.books.find((b) => b.code === code)?.chapters;
  if (failed) {
    return (
      <div role="alert" className="px-1 pt-2">
        <p className="text-base">Could not load the list of chapters.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 min-h-12 rounded-xl bg-accent px-6 text-base font-medium text-accent-fg">
          Try again
        </button>
      </div>
    );
  }
  if (count === undefined) {
    return (
      <p role="status" className="px-1 pt-2 text-muted">
        Loading chapters…
      </p>
    );
  }
  return (
    <div role="group" aria-label={`${bookOf(code)?.name} chapters`} className="grid grid-cols-4 gap-2 px-1 pt-1">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const here = current.book === code && current.chapter === n;
        return (
          <button
            key={n}
            type="button"
            data-chapter={n}
            aria-label={`Chapter ${n}`}
            aria-current={here ? 'true' : undefined}
            onClick={() => onPick(n)}
            className={`min-h-12 rounded-xl border text-lg font-medium ${here ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/** The chapters of an Old Testament book, each a link that opens it in Logos; or, with Logos off, the way to turn it on. */
function LogosChapters({ code }: { code: string }) {
  const resources = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const book = otBookOf(code);
  if (!book || !resources || bible === undefined) return null;
  if (!resources.on.includes('logos')) {
    return (
      <div role="status" className="px-1 pt-2">
        <p className="text-base font-medium">Logos is off</p>
        <p className="pt-1 text-base text-muted">{`${book.name} opens in Logos. Turn Logos on to read it there.`}</p>
        <button
          type="button"
          onClick={() => void setResourceOn('logos', true)}
          className="mt-3 min-h-12 rounded-xl bg-accent px-6 text-base font-medium text-accent-fg"
        >
          Turn on Logos
        </button>
      </div>
    );
  }
  return (
    <div role="group" aria-label={`${book.name} chapters, opening in Logos`} className="grid grid-cols-4 gap-2 px-1 pt-1">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => {
        const link = chapterLink(code, n, bible);
        return link ? (
          <a
            key={n}
            href={link.url}
            data-chapter={n}
            data-fallback={link.fallback}
            aria-label={`Chapter ${n}`}
            onClick={() => armFallback(link.fallback)}
            className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-surface text-lg font-medium"
          >
            {n}
          </a>
        ) : null;
      })}
    </div>
  );
}

export function ChapterPicker({ current, onClose }: { current: OpenChapter; onClose: () => void }) {
  const [book, setBook] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const box = useRef<HTMLDivElement>(null);
  // The list opens with the book he is in at the middle of the box (moving this box and nothing else).
  useEffect(() => {
    const list = box.current;
    const row = list?.querySelector<HTMLElement>(`[data-book="${current.book}"]`);
    if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2);
  }, [current.book]);

  const shown = matching(ITEMS, query);
  const name = book ? (otBookOf(book) ?? bookOf(book))?.name : undefined;
  const pick = (chapter: number) => {
    if (!book) return;
    // The open chapter again is only a close; another is a new Back step (the picker's own entry stays beneath it and Back skips it).
    if (book === current.book && chapter === current.chapter) onClose();
    else openReader({ book, chapter });
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a chapter"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="relative flex h-[85dvh] flex-col rounded-t-2xl border-t border-line bg-surface"
      >
        <div data-testid="sheet-handle" {...handle} className="relative flex shrink-0 touch-none flex-col items-center px-4 pt-2">
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line" />
          <div className="flex min-h-12 w-full items-center gap-2">
            {book ? (
              <button type="button" onClick={() => setBook(null)} className="min-h-11 shrink-0 rounded-lg pr-2 text-base font-medium text-accent">
                ‹ Books
              </button>
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{name ?? 'Choose a book'}</h2>
            <button type="button" ref={focusOnMount} onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        {book ? null : (
          <div className="shrink-0 border-t border-line px-4 pt-2">
            <input
              type="search"
              value={query}
              placeholder="Search 66 books"
              aria-label="Search books"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
            />
          </div>
        )}
        <div
          ref={box}
          data-testid="chapter-picker-box"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-2"
        >
          {book ? (
            otBookOf(book) ? (
              <LogosChapters code={book} />
            ) : (
              <Chapters code={book} current={current} onPick={pick} />
            )
          ) : shown.length === 0 ? (
            <p className="px-1 py-3 text-base text-muted">No book matches</p>
          ) : (
            <div role="group" aria-label="Books" className="rounded-lg border border-line">
              {shown.map((b) => {
                const ot = otBookOf(b.id) !== undefined;
                return (
                  <button
                    key={b.id}
                    type="button"
                    {...(ot ? { 'data-ot-book': b.id } : { 'data-book': b.id })}
                    aria-current={b.id === current.book ? 'true' : undefined}
                    onClick={() => setBook(b.id)}
                    className={`flex min-h-12 w-full items-center justify-between gap-2 border-t border-line px-3 text-left text-lg first:border-t-0 ${b.id === current.book ? 'font-semibold text-accent' : ''}`}
                  >
                    <span data-book-name>{b.name}</span>
                    {ot ? (
                      <span data-in-logos className="shrink-0 rounded-md border border-line px-2 text-sm font-medium text-muted">
                        Opens in Logos ↗
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
