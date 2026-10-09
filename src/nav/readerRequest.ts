// src/nav/readerRequest.ts — how another screen sends him to the Reader to ask the tutor or talk about a verse (the Parsing
// drill's two links). The Reader is not on screen when the request is made, so it goes on the bus (kind 'reader-requested',
// docs/events.md), which keeps the last event of a kind, and the Reader reads it when it opens. A request is taken once: a
// later visit to the Reader does not meet it again.
import { latest, publish, type EventOf } from '../events/bus';
import type { TalkFocus } from '../services/talk';
import { openReader } from './route';

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

/** Opens the Reader on `chapter` of `book` (no verse), with the Talk sheet open on the chapter and a first question sent about the paradigm table `table`,
 * its name, holding the `revealed` forms (src/data/paradigms). */
export function askAboutParadigm(book: string, chapter: number, table: string, revealed: string[]): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'paradigm', book, chapter, table, revealed });
  openReader({ book, chapter });
}

/** Opens the Reader on `verse` of `chapter` of `book`, with the Talk sheet open on that verse and `question` already sent, `focus` with it (the
 * Quick test's Ask the tutor: the word, the question and his answers so far). */
export function askAboutWord(book: string, chapter: number, verse: number, question: string, focus: TalkFocus): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'word', book, chapter, verse, question, focus });
  openReader({ book, chapter, verse });
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
