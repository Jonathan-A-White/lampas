// src/ChapterPicker.tsx — the bottom sheet the Reader's title opens (mw-5r3p30.60): the 39 Old Testament books and the 27 New Testament
// books in canonical order in a box of their own with a search field (a long list is a widget, docs/pwa-best-practices.md section 8),
// then, for the book he taps, a grid of its chapters (the counts of the New Testament come from data/index.json). A tap on a New Testament
// chapter opens it in the Reader as a new Back step; the phone's Back, Done, Escape, a swipe down or a tap outside closes the picker
// (src/ui/sheetBack.ts). Lampas has no Old Testament text (mw-5r3p30.71): an Old Testament book is marked 'Logos' and a tap on its chapter opens no
// app (mw-5r3p30.496): a panel under the grid offers Read in Logos (in the Bible he chose in Settings, src/resources/logosBible.ts) and Listen in
// Audible (The Word of Promise, src/resources/audioBible.ts), each only while its setting is on; the open Lampas chapter does not change. With
// Logos off in Settings the books still show; picking one says so and turns Logos on in one tap, and with the Audio Bible off too it names that setting.
// In choose mode (mw-umv8sp.3: the return sheet's Pick it myself, src/plan/WhereDidYouGetTo.tsx) a tap on any chapter, of either testament, hands it to `onChoose` and
// opens nothing: no Logos panel, no Preface row, no 'Opens in Logos' tag. `heading` names the sheet in that mode ('Where are you starting?', src/plan/StartPlan.tsx).
// With the Reading plan on and a plan started (mw-umv8sp.5) every grid marks the chapters done (a ✓, dimmed, data-done) and the next one (an accent outline, data-next):
// `marks` is the plan as src/plan/usePlan.ts reads it; `showPlan` false (StartPlan) draws none, as the plan being started has no marks yet.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { BOOKS, bookOf } from './data/books';
import type { PlanChapter } from './data/plans';
import { type BookIndex, loadIndex } from './data/chapter';
import type { OpenChapter } from './data/readerChapter';
import { getLogosBible } from './data/repositories';
import { keyOf } from './data/repositories/readingPlan';
import { OT_BOOKS, otBookOf } from './data/otBooks';
import { getStudyResources, setResourceOn } from './data/repositories/resources';
import { navigate, openReader } from './nav/route';
import { SendOff } from './plan/SendOff';
import { usePlan, type PlanView } from './plan/usePlan';
import { useSendOff } from './plan/useSendOff';
import { type AudioBible, audioBibleOf } from './resources/audioBible';
import { oldTestamentChoices } from './resources/oldTestamentChoices';
import { armFallback } from './resources/openApp';
import { audioBibleSetting } from './settings/definitions';
import { useSetting } from './settings/store';
import { focusOnMount } from './ui/focus';
import { matching } from './ui/listFilter';
import { useSheetBack } from './ui/sheetBack';
import { useEscapeToClose, useSheetDrag } from './ui/sheetDrag';

const ITEMS = [...OT_BOOKS, ...BOOKS].map((b) => ({ id: b.code, name: b.name }));

/** How a chapter of the plan is marked: done (dimmed, with a check) or the next one (outlined). Both are also said to a screen reader as the button's description. */
function markOf(marks: PlanView | undefined, code: string, chapter: number): { attrs: Record<string, string>; check: boolean; ring: string; description?: string } {
  if (!marks) return { attrs: {}, check: false, ring: '' };
  const key = keyOf({ code, chapter });
  if (marks.done.has(key)) return { attrs: { 'data-done': '' }, check: true, ring: 'text-muted opacity-70', description: 'Done' };
  if (marks.next && keyOf(marks.next) === key) return { attrs: { 'data-next': '' }, check: false, ring: 'ring-2 ring-inset ring-accent', description: 'Next in your plan' };
  return { attrs: {}, check: false, ring: '' };
}

/** One chapter number in a grid: 48 px, the chapter he is in filled, the plan's marks on top. */
function ChapterButton({ code, n, here, pressed, marks, onPick }: { code: string; n: number; here?: boolean; pressed?: boolean; marks: PlanView | undefined; onPick: () => void }) {
  const mark = markOf(marks, code, n);
  const filled = here || pressed;
  return (
    <button
      type="button"
      data-chapter={n}
      {...mark.attrs}
      aria-label={`Chapter ${n}`}
      aria-description={mark.description}
      aria-current={here ? 'true' : undefined}
      aria-pressed={pressed === undefined ? undefined : pressed}
      onClick={onPick}
      className={`relative min-h-12 rounded-xl border text-lg font-medium ${filled ? 'border-accent bg-accent text-accent-fg' : `border-line bg-surface ${mark.ring}`}`}
    >
      {n}
      {mark.check ? (
        <span aria-hidden="true" className="absolute right-1.5 top-0.5 text-xs font-semibold">
          ✓
        </span>
      ) : null}
    </button>
  );
}

/** The chapter numbers of one book: a grid of 48 px buttons. */
function Chapters({ code, current, marks, onPick }: { code: string; current: OpenChapter; marks: PlanView | undefined; onPick: (chapter: number) => void }) {
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
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <ChapterButton key={n} code={code} n={n} here={current.book === code && current.chapter === n} marks={marks} onPick={() => onPick(n)} />
      ))}
    </div>
  );
}

/** The chapter numbers of an Old Testament book in choose mode: the same grid, and a tap hands the chapter over. */
function ChooseChapters({ code, marks, onPick }: { code: string; marks: PlanView | undefined; onPick: (chapter: number) => void }) {
  const book = otBookOf(code);
  if (!book) return null;
  return (
    <div role="group" aria-label={`${book.name} chapters`} className="grid grid-cols-4 gap-2 px-1 pt-1">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
        <ChapterButton key={n} code={code} n={n} marks={marks} onPick={() => onPick(n)} />
      ))}
    </div>
  );
}

/** The prompt for Logos being off: one tap turns it on. With the Audio Bible off too, a line names where to turn that on. */
function LogosOff({ name, audioOff }: { name: string; audioOff: boolean }) {
  return (
    <div role="status" className="px-1 pt-2">
      <p className="text-base font-medium">Logos is off</p>
      <p className="pt-1 text-base text-muted">{`${name} opens in Logos. Turn Logos on to read it there.`}</p>
      {audioOff ? <p className="pt-1 text-base text-muted">Or choose an Audio Bible in Settings to listen to it in Audible.</p> : null}
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

/** What one Old Testament chapter offers, under the grid: Read in Logos and Listen in Audible, each only while it is on. Nothing leaves the app until he taps one. */
function ChapterChoice({ name, code, chapter, logosOn, bible, audio }: { name: string; code: string; chapter: number; logosOn: boolean; bible: string; audio: AudioBible | undefined }) {
  const { logos, audible } = oldTestamentChoices(code, chapter, { logosOn, logosBible: bible, audio });
  const sendOff = useSendOff();
  const rowClass = 'flex min-h-12 items-center rounded-lg bg-surface px-3 text-base font-medium text-accent active:bg-line';
  return (
    <div
      role="group"
      data-ot-choice
      aria-label={`${name} ${chapter}: read or listen`}
      className="sticky bottom-0 z-10 mt-3 flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-lg"
    >
      <p className="px-1 text-lg font-semibold">{`${name} ${chapter}`}</p>
      {logos ? (
        <a href={logos.href} data-fallback={logos.fallback} onClick={() => armFallback(logos.fallback)} className={rowClass}>
          Read in Logos
        </a>
      ) : null}
      {audio && audible ? (
        <div>
          <a
            href={audible.href}
            aria-label={`Listen in Audible: ${audio.name}, ${audible.label}`}
            onClick={(e) => sendOff.tap(e, { audio, code, chapter })}
            className={rowClass}
          >
            Listen in Audible
          </a>
          <p className="px-1 pt-2 text-base">{`In Audible: Chapters > ${audible.label}`}</p>
          <p className="px-1 pt-1 text-sm text-muted">{audio.credit}</p>
          <SendOff send={sendOff} />
        </div>
      ) : null}
    </div>
  );
}

/** The chapters of an Old Testament book. A tap on one opens no app: it shows what the chapter offers (Read in Logos, Listen in Audible) under the grid. */
function OtChapters({ code, marks }: { code: string; marks: PlanView | undefined }) {
  const resources = useLiveQuery(getStudyResources, []);
  const bible = useLiveQuery(getLogosBible, []);
  const audioId = useSetting(audioBibleSetting);
  const [chosen, setChosen] = useState<number | null>(null);
  const book = otBookOf(code);
  if (!book || !resources || bible === undefined || audioId === undefined) return null;
  const logosOn = resources.on.includes('logos');
  const audio = audioBibleOf(audioId);
  if (!logosOn && !audio) return <LogosOff name={book.name} audioOff />;
  return (
    <>
      {logosOn ? null : <LogosOff name={book.name} audioOff={false} />}
      <div role="group" aria-label={`${book.name} chapters`} className="grid grid-cols-4 gap-2 px-1 pt-1">
        {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
          <ChapterButton key={n} code={code} n={n} pressed={chosen === n} marks={marks} onPick={() => setChosen(n)} />
        ))}
      </div>
      {chosen === null ? null : <ChapterChoice name={book.name} code={code} chapter={chosen} logosOn={logosOn} bible={bible} audio={audio} />}
    </>
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
  // The list opens with the book he is in at the middle of the box (moving this box and nothing else).
  useEffect(() => {
    const list = box.current;
    const row = list?.querySelector<HTMLElement>(`[data-book="${current.book}"]`);
    if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2);
  }, [current.book]);

  const shown = matching(ITEMS, query);
  const preface = !onChoose && matching([{ id: 'preface', name: 'Preface' }], query).length > 0;
  const name = book ? (otBookOf(book) ?? bookOf(book))?.name : undefined;
  const pick = (chapter: number) => {
    if (!book) return;
    if (onChoose) return onChoose({ code: book, chapter });
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
            <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">{name ?? heading ?? 'Choose a book'}</h2>
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
              onChoose ? (
                <ChooseChapters code={book} marks={marks} onPick={pick} />
              ) : (
                <OtChapters code={book} marks={marks} />
              )
            ) : (
              <Chapters code={book} current={current} marks={marks} onPick={pick} />
            )
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
              {shown.length === 0 ? (
                preface ? null : <p className="px-1 py-3 text-base text-muted">No book matches</p>
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
                        {ot && !onChoose ? (
                          <span data-in-logos className="shrink-0 rounded-md border border-line px-2 text-sm font-medium text-muted">
                            Opens in Logos ↗
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
