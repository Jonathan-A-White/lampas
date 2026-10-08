// src/nav/readerRequest.ts — how another screen sends him to the Reader to ask the tutor or talk about a verse (the Parsing
// drill's two links). The Reader is not on screen when the request is made, so it goes on the bus (kind 'reader-requested',
// docs/events.md), which keeps the last event of a kind, and the Reader reads it when it opens. A request is taken once: a
// later visit to the Reader does not meet it again.
import { latest, publish, type EventOf } from '../events/bus';
import { openReader } from './route';

export type ReaderRequest = EventOf<'reader-requested'>;

let lastId = 0;
let taken = 0;

/** Opens the Reader on `verse` of `chapter`, with the Ask box there holding `question` (he sends it himself). */
export function askInReader(chapter: number, verse: number, question: string): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'ask', chapter, verse, question });
  openReader({ chapter, verse });
}

/** Opens the Reader on `verse` of `chapter`, with the Talk sheet open on that verse. */
export function talkInReader(chapter: number, verse: number): void {
  publish({ kind: 'reader-requested', id: ++lastId, action: 'talk', chapter, verse });
  openReader({ chapter, verse });
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
