// src/nav/readerRequest.ts — how another screen sends him to the Reader to ask the tutor or talk about a verse (the Parsing
// drill's two links). The Reader is not on screen when the request is made, so it goes on the bus (kind 'reader-requested',
// docs/events.md), which keeps the last event of a kind, and the Reader reads it when it opens. A request is taken once: a
// later visit to the Reader does not meet it again.
import { latest, publish, type EventOf } from '../events/bus';
import type { TalkFocus } from '../services/talk';
import { openReader, readerHash, replaceReader } from './route';
import { forgetScroll } from './scrollMemory';

export type ReaderRequest = EventOf<'reader-requested'>;

let lastId = 0;
let taken = 0;

/** Opens the Reader on `verse` of `chapter` of `book`, with the Ask box there holding `question` (he sends it himself). */
export function askInReader(book: string, chapter: number, verse: number, question: string): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'ask', book, chapter, verse, question });
  openReader({ book, chapter, verse });
}

/** Opens the Reader on `verse` of `chapter` of `book`, with the Talk sheet open on that verse. */
export function talkInReader(book: string, chapter: number, verse: number): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'talk', book, chapter, verse });
  openReader({ book, chapter, verse });
}

/** Opens the Reader on `verse` of `chapter` of `book`, with the Talk sheet open on that verse and `question` already sent, `focus` with it (the
 * Quick test's Ask the tutor: the word, the question and his answers so far). */
export function askAboutWord(book: string, chapter: number, verse: number, question: string, focus: TalkFocus): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'word', book, chapter, verse, question, focus });
  openReader({ book, chapter, verse });
}

/** The tutor takes him to `chapter` of `book` (the Bible talk answer's `go`, mw-5r3p30.172): the Reader opens there as a new Back step, with the notice 'Opened <title>'. */
export function openedByTutor(book: string, chapter: number): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'opened', book, chapter });
  openReader({ book, chapter }, { tutor: true });
}

/** Asks the Reader to bring `verse` of `chapter` of `book` to the top of its reading area (mw-5r3p30.678: Choose a book's Go to John 18:2): the whole chapter is there above and
 * below it and no verse is selected, so no Verse view opens. A place the Reader remembered for that chapter is forgotten, so this one wins. For the chapter the Reader is on. */
export function bringVerse(book: string, chapter: number, verse: number): void {
  forgetScroll(readerHash({ book, chapter }), 'reader');
  publish({ kind: 'reader-requested', id: ++lastId, action: 'verse', book, chapter, verse });
}

/** Opens the Reader on `chapter` of `book` as a new Back step with `verse` brought to the top (see `bringVerse`). With `replacing` the Reader takes the place of the entry he is on
 * instead (see `replaceReader`): the screen he leaves was a sheet that Back should find again, not step over. */
export function openAtVerse(book: string, chapter: number, verse: number, replacing = false): void {
  bringVerse(book, chapter, verse);
  if (replacing) replaceReader({ book, chapter });
  else openReader({ book, chapter });
}

/** The request the Reader has not met yet, if any. It does not take it (see `takeRequest`), so it can be called while rendering. */
export function pendingRequest(): ReaderRequest | undefined {
  const request = latest('reader-requested');
  return request && request.id > taken ? request : undefined;
}

/** Marks a request as met. */
export function takeRequest(request: ReaderRequest): void {
  taken = Math.max(taken, request.id);
}

/** A Talk sheet to open again on a chapter of the Reader (mw-t3xu9a.4): the tutor took him from it to another place, and Back has brought him to the chapter he was on, where the sheet was open
 * (src/ui/sheetBack.ts leaveSheetForTutor). `about` is what the sheet was about: a verse's number, or null for the chapter. The Reader is made afresh for each chapter, so this is not
 * the state of one Reader: a Reader that opens finds it (`pendingReturn`), and one already open is told (`watchReturn`). It is good for a moment, no longer. */
export interface SheetReturn {
  book: string;
  chapter: number;
  about: number | null;
  at: number;
}

const RETURN_MS = 2000;
let returning: SheetReturn | null = null;
const returnWatchers = new Set<(back: SheetReturn) => void>();

/** Asks for the Talk sheet of `chapter` of `book` to open again on `about`. */
export function reopenTalk(book: string, chapter: number, about: number | null): void {
  const back = { book, chapter, about, at: Date.now() };
  returning = back;
  returnWatchers.forEach((watcher) => watcher(back));
}

/** The sheet waiting to open again on this chapter, if one is. It does not take it (see `takeReturn`). */
export function pendingReturn(book: string, chapter: number): SheetReturn | undefined {
  return returning && returning.book === book && returning.chapter === chapter && Date.now() - returning.at < RETURN_MS ? returning : undefined;
}

/** Marks a return as met. */
export function takeReturn(back: SheetReturn): void {
  if (returning === back) returning = null;
}

/** Calls `watcher` when a sheet is asked to open again; the returned function stops it. */
export function watchReturn(watcher: (back: SheetReturn) => void): () => void {
  returnWatchers.add(watcher);
  return () => void returnWatchers.delete(watcher);
}
