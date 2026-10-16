// src/ChapterPicker.tsx — the bottom sheet the Reader's title opens (mw-5r3p30.60): the 39 Old Testament books and the 27 New Testament
// books in canonical order in a box of their own with a search field (a long list is a widget, docs/pwa-best-practices.md section 8),
// then, for the book he taps, a grid of its chapters (the counts of the New Testament come from data/index.json). A tap on a New Testament
// chapter opens it in the Reader as a new Back step; the phone's Back, Done, Escape, a swipe down or a tap outside closes the picker
// (src/ui/sheetBack.ts). Lampas has no Old Testament text (mw-5r3p30.71): an Old Testament book is marked 'Logos' and a tap on its chapter opens no
// app (mw-5r3p30.496): a panel under the grid offers Read in Logos (in the Bible he chose in Settings, src/resources/logosBible.ts) and Listen in
// Audible (The Word of Promise, src/resources/audioBible.ts), each only while its setting is on; the open Lampas chapter does not change. With
// Logos off in Settings the books still show; picking one says so and turns Logos on in one tap, and with the Audio Bible off too it names that setting.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { BOOKS, bookOf } from './data/books';
import { type BookIndex, loadIndex } from './data/chapter';
import type { OpenChapter } from './data/readerChapter';
import { getLogosBible } from './data/repositories';
import { OT_BOOKS, otBookOf } from './data/otBooks';
import { getStudyResources, setResourceOn } from './data/repositories/resources';
import { navigate, openReader } from './nav/route';
import { type AudioBible, audibleListen, audioBibleOf } from './resources/audioBible';
import { oldTestamentChoices } from './resources/oldTestamentChoices';
import { armFallback } from './resources/openApp';
import { audioBibleSetting } from './settings/definitions';
import { useSetting } from './settings/store';
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
            onClick={(e) => {
              // Audible wants the link stamped with the time of the tap: make it again as the tap lands, before the phone follows it
              const listen = audibleListen(audio, code, chapter);
              e.currentTarget.href = listen.href;
              if (listen.fallback !== undefined) armFallback(listen.fallback);
            }}
            className={rowClass}
          >
            Listen in Audible
          </a>
          <p className="px-1 pt-2 text-base">{`In Audible: Chapters > ${audible.label}`}</p>
          <p className="px-1 pt-1 text-sm text-muted">{audio.credit}</p>
        </div>
      ) : null}
    </div>
  );
}

/** The chapters of an Old Testament book. A tap on one opens no app: it shows what the chapter offers (Read in Logos, Listen in Audible) under the grid. */
function OtChapters({ code }: { code: string }) {
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
          <button
            key={n}
            type="button"
            data-chapter={n}
            aria-label={`Chapter ${n}`}
            aria-pressed={chosen === n}
            onClick={() => setChosen(n)}
            className={`min-h-12 rounded-xl border text-lg font-medium ${chosen === n ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-surface'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {chosen === null ? null : <ChapterChoice name={book.name} code={code} chapter={chosen} logosOn={logosOn} bible={bible} audio={audio} />}
    </>
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
  const preface = matching([{ id: 'preface', name: 'Preface' }], query).length > 0;
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
              <OtChapters code={book} />
            ) : (
              <Chapters code={book} current={current} onPick={pick} />
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
