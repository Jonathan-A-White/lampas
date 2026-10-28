// src/ChapterPicker.tsx — the bottom sheet the Reader's title opens (mw-5r3p30.60): the 66 books of the Bible in canonical order (Genesis to Revelation) in a box of their own with a
// search field (a long list is a widget, docs/pwa-best-practices.md section 8), then, for the book he taps, a grid of its chapters (the counts of the New Testament come from
// data/index.json, those of the Old from src/data/books.ts). A tap on a chapter, of either testament, opens it in the Reader as a new Back step; the phone's Back, Done, Escape, a swipe down
// or a tap outside closes the picker (src/ui/sheetBack.ts). An Old Testament chapter is read in English (mw-uqlxea.2, docs/layout/reader.md 'An Old Testament chapter (English only)'); its
// two ways out, Read in Logos and Listen in Audible, are actions on the opened chapter (src/reader/ChapterActions.tsx), not here.
// In choose mode (mw-umv8sp.3: the return sheet's Pick it myself, src/plan/WhereDidYouGetTo.tsx) a tap on any chapter, of either testament, hands it to `onChoose` and
// opens nothing. `heading` names the sheet in that mode ('Where are you starting?', src/plan/StartPlan.tsx).
// With the Reading plan on and a plan started (mw-umv8sp.5) every grid outlines the next chapter (an accent outline, data-next); a chapter done looks like any other, with no ✓ and
// no dimming (his feedback, mw-5r3p30.679: 'They are confusing.'): `marks` is the plan as src/plan/usePlan.ts reads it; `showPlan` false (StartPlan) draws none, as the plan being started has no next yet.
// The search takes a reference as well as a name (mw-5r3p30.622, src/nav/parseReference.ts readPlace, the one reader of a typed place): 'John 18:36' (Enter, or the Go to row)
// opens John 18 in the Reader with verse 36 brought to the top of the reading area (mw-5r3p30.678, not its Verse view), 'Ps 23' opens Psalms 23, 'John 99' says 'John has 21 chapters'; a book's name alone still filters the list.
import { useEffect, useRef, useState } from 'react';
import { BOOKS, bookOf, isHebrewBook } from './data/books';
import type { PlanChapter } from './data/plans';
import { type BookIndex, forgetCanonIndex, loadIndex } from './data/chapter';
import type { OpenChapter } from './data/readerChapter';
import { keyOf } from './data/repositories/readingPlan';
import { bookPart, readPlace, type PlaceRead } from './nav/parseReference';
import { bringVerse, openAtVerse } from './nav/readerRequest';
import { navigate, openReader } from './nav/route';
import { useStillLoading } from './reader/useStillLoading';
import { usePlan, type PlanView } from './plan/usePlan';
import { focusQuietly } from './ui/focus';
import { matching, matchingInOrder } from './ui/listFilter';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

const ITEMS = BOOKS.map((b) => ({ id: b.code, name: b.name }));

/** How a chapter of the plan is marked: only the next one, outlined and said to a screen reader as the button's description. A chapter done is not marked. */
function markOf(marks: PlanView | undefined, code: string, chapter: number): { attrs: Record<string, string>; ring: string; description?: string } {
  if (marks?.next && keyOf(marks.next) === keyOf({ code, chapter })) return { attrs: { 'data-next': '' }, ring: 'ring-2 ring-inset ring-accent', description: 'Next in your plan' };
  return { attrs: {}, ring: '' };
}

/** One chapter number in a grid: 48 px, the chapter he is in filled, the next chapter of the plan outlined. */
function ChapterButton({ code, n, here, marks, onPick }: { code: string; n: number; here?: boolean; marks: PlanView | undefined; onPick: () => void }) {
  const mark = markOf(marks, code, n);
  return (
    <button
      type="button"
      data-chapter={n}
      {...mark.attrs}
      aria-label={`Chapter ${n}`}
      aria-description={mark.description}
      aria-current={here ? 'true' : undefined}
      onClick={onPick}
      className={`min-h-12 rounded-xl border text-lg font-medium ${here ? 'border-accent bg-accent text-accent-fg' : `border-line bg-surface ${mark.ring}`}`}
    >
      {n}
    </button>
  );
}

/** The chapter numbers of one book: a grid of 48 px buttons. */
function Chapters({ code, current, marks, onPick }: { code: string; current: OpenChapter; marks: PlanView | undefined; onPick: (chapter: number) => void }) {
  const [index, setIndex] = useState<BookIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (isHebrewBook(code)) return;
    let live = true;
    loadIndex().then(
      (i) => live && (setFailed(false), setIndex(i)),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt, code]);
  // the Old Testament's counts are in the bundle (src/data/books.ts); the New Testament's come from the index
  const count = isHebrewBook(code) ? bookOf(code)?.chapters : index?.books.find((b) => b.code === code)?.chapters;
  // 'Loading chapters…' that goes on 8 s says so and offers Try again; the fetch itself is given up on at 30 s (mw-5r3p30.846)
  const still = useStillLoading(count === undefined && !failed);
  const tryAgain = () => {
    forgetCanonIndex();
    setAttempt((n) => n + 1);
  };
  if ((failed || still) && count === undefined) {
    return (
      <div role={failed ? 'alert' : 'status'} className="px-1 pt-2">
        <p className="text-base">{failed ? 'Could not load the list of chapters.' : 'Still loading the list of chapters.'}</p>
        <button type="button" onClick={tryAgain} className="mt-3 min-h-12 rounded-xl bg-accent px-6 text-base font-medium text-accent-fg">
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
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <ChapterButton key={n} code={code} n={n} here={current.book === code && current.chapter === n} marks={marks} onPick={() => onPick(n)} />
      ))}
    </div>
  );
}

export function ChapterPicker({
  current,
  onClose,
  onChoose,
  heading,
  showPlan = true,
}: {
  current: OpenChapter;
  onClose: () => void;
  onChoose?: (chapter: PlanChapter) => void;
  heading?: string;
  showPlan?: boolean;
}) {
  const plan = usePlan();
  const marks = showPlan ? plan?.started : undefined;
  const [book, setBook] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const { drag, handle } = useSheetDrag(onClose);
  useEscapeToClose(onClose);
  useSheetBack(onClose);
  const box = useRef<HTMLDivElement>(null);
  // The search field has the focus when the sheet opens and when the books come back from a chapter grid, so the keyboard is up and ready to type (mw-5r3p30.711).
  // Not a ref callback: useSheetBack, above, moves focus to the heading once the sheet has mounted, and this effect runs after it, still inside the tap that opened the sheet.
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!book) focusQuietly(search.current);
  }, [book]);
  // The list opens with the book he is in at the middle of the box (moving this box and nothing else).
  useEffect(() => {
    const list = box.current;
    const row = list?.querySelector<HTMLElement>(`[data-book="${current.book}"]`);
    if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2);
  }, [current.book]);

  const typed = readPlace(query);
  // a name filters by its letters in order, names that start with it first; a start that fits more than one book ('J 3') is no place and lists the books it fits
  const shown = matchingInOrder(ITEMS, typed.kind === 'none' ? bookPart(query) : query);
  const preface = !onChoose && matching([{ id: 'preface', name: 'Preface' }], query).length > 0;
  const name = book ? bookOf(book)?.name : undefined;
  const pick = (chapter: number) => {
    if (!book) return;
    if (onChoose) return onChoose({ code: book, chapter });
    // The open chapter again is only a close; another is a new Back step (the picker's own entry stays beneath it and Back skips it).
    if (book === current.book && chapter === current.chapter) onClose();
    else openReader({ book, chapter });
  };
  // What he typed is a place: a chapter of the New Testament opens in the Reader (a verse, or a range, brought to the top, src/reader/useBringVerse.ts), one of the Old
  // opens its book with the chapter chosen; in choose mode the chapter is handed over.
  const goTo = (place: Extract<PlaceRead, { kind: 'place' }>) => {
    if (onChoose) return onChoose({ code: place.book, chapter: place.chapter });
    const { book: code, chapter, verse } = place;
    const here = code === current.book && chapter === current.chapter;
    if (verse === undefined) return here ? onClose() : openReader({ book: code, chapter });
    // a verse (or a range, which starts at its first verse) is a place in the Bible, not a request for its Verse view (mw-5r3p30.678): the Reader opens on the chapter
    // with the verse brought to the top and the rest above and below it. The chapter he is in is not opened again, so the picker is closed by hand.
    if (here) {
      onClose();
      bringVerse(code, chapter, verse);
    } else openAtVerse(code, chapter, verse);
  };
  const placeName = (place: Extract<PlaceRead, { kind: 'place' }>): string => {
    const named = bookOf(place.book)?.name ?? place.book;
    return `${named} ${place.chapter}${place.verse === undefined ? '' : `:${place.verse}`}`;
  };

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end">
      <div data-testid="sheet-backdrop" aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading ?? 'Choose a chapter'}
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
            <h2 className="min-w-0 flex-1 break-words text-xl font-semibold">{name ?? heading ?? 'Choose a book'}</h2>
            <button type="button" onClick={onClose} className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-base font-medium text-accent">
              Done
            </button>
          </div>
        </div>
        {book ? null : (
          <form
            className="shrink-0 border-t border-line px-4 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.kind === 'place') goTo(typed);
            }}
          >
            <input
              type="search"
              ref={search}
              value={query}
              placeholder="Search 66 books or type John 18:36"
              aria-label="Search books"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-12 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg"
            />
          </form>
        )}
        <div
          ref={box}
          data-testid="chapter-picker-box"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+var(--lp-end-inset))] pt-2"
        >
          {book ? (
            <Chapters code={book} current={current} marks={marks} onPick={pick} />
          ) : (
            <>
              {preface ? (
                <button
                  type="button"
                  data-preface
                  aria-label="Preface"
                  onClick={() => navigate('preface')}
                  className="mb-3 flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-line px-3 text-left text-lg"
                >
                  <span>Preface</span>
                  <span className="shrink-0 text-sm font-medium text-muted">About the text</span>
                </button>
              ) : null}
              {typed.kind === 'place' ? (
                <button
                  type="button"
                  data-go-to
                  onClick={() => goTo(typed)}
                  className="mb-3 flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-accent px-3 text-left text-lg font-medium text-accent"
                >
                  <span>{`Go to ${placeName(typed)}`}</span>
                </button>
              ) : null}
              {typed.kind === 'bad' ? (
                <p role="status" className="px-1 py-3 text-base">
                  {typed.message}
                </p>
              ) : null}
              {shown.length === 0 ? (
                preface || typed.kind !== 'none' ? null : <p className="px-1 py-3 text-base text-muted">No book matches</p>
              ) : (
                <div role="group" aria-label="Books" className="rounded-lg border border-line">
                  {shown.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      data-book={b.id}
                      aria-current={b.id === current.book ? 'true' : undefined}
                      onClick={() => setBook(b.id)}
                      className={`flex min-h-12 w-full flex-wrap items-center justify-between gap-x-2 py-1 border-t border-line px-3 text-left text-lg first:border-t-0 ${b.id === current.book ? 'font-semibold text-accent' : ''}`}
                    >
                      <span data-book-name>{b.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
