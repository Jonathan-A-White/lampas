// src/nav/linkRequest.ts — what a link in the address asked for, handed to the Reader once it opens (the same way src/nav/readerRequest.ts hands it the
// Parsing drill's requests). LinkOpener resolves the link (src/nav/links.ts) and announces it; the address is then replaced by the plain reader address, so
// the link itself is never kept in the trail. The Reader meets the link when it opens: it selects the verse, shows the notice, opens the word sheet.
import { latest, publish, type EventOf } from '../events/bus';

export type LinkOpened = EventOf<'link-opened'>;

let lastId = 0;
let taken = 0;

/** Tells the bus where a link opened the reader; call it before the address is replaced, so the Reader that opens meets it. */
export function announceLink(opened: Omit<LinkOpened, 'kind' | 'id'>): void {
  publish({ kind: 'link-opened', id: ++lastId, ...opened });
}

/** The link the Reader has not met yet for this chapter, if any. It does not take it (see `takeLink`), so it can be called while rendering. */
export function pendingLink(book: string, chapter: number): LinkOpened | undefined {
  const link = latest('link-opened');
  return link && link.id > taken && link.book === book && link.chapter === chapter ? link : undefined;
}

/** Marks a link as met. */
export function takeLink(link: LinkOpened): void {
  taken = Math.max(taken, link.id);
}
