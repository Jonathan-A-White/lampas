// src/ChapterPicker.tsx — the bottom sheet the Reader's title opens (mw-5r3p30.60): the 27 books in canonical order in a box of their
// own with a search field (a long list is a widget, docs/pwa-best-practices.md section 8), then, for the book he taps, a grid of its
// chapters (the counts come from data/index.json). A tap on a chapter opens it in the Reader as a new Back step; the phone's Back,
// Done, Escape, a swipe down or a tap outside closes the picker (src/ui/sheetBack.ts).
import { useEffect, useRef, useState } from 'react';
import { BOOKS, bookOf } from './data/books';
import { type BookIndex, loadIndex } from './data/chapter';
import type { OpenChapter } from './data/readerChapter';
import { openReader } from './nav/route';
import { focusOnMount } from './ui/focus';
import { matching } from './ui/listFilter';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

const ITEMS = BOOKS.map((b) => ({ id: b.code, name: b.name }));

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
  const name = book ? bookOf(book)?.name : undefined;
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
              placeholder="Search 27 books"
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
            <Chapters code={book} current={current} onPick={pick} />
          ) : shown.length === 0 ? (
            <p className="px-1 py-3 text-base text-muted">No book matches</p>
          ) : (
            <div role="group" aria-label="Books" className="rounded-lg border border-line">
              {shown.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  data-book={b.id}
                  aria-current={b.id === current.book ? 'true' : undefined}
                  onClick={() => setBook(b.id)}
                  className={`flex min-h-12 w-full items-center border-t border-line px-3 text-left text-lg first:border-t-0 ${b.id === current.book ? 'font-semibold text-accent' : ''}`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
