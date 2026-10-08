// src/nav/readerAddress.ts — the reader's state is part of the address (src/nav/route.ts), so the address says where
// he is and reopening can put it back. The reader tells the bus what changed (src/events/bus.ts); this listens and
// writes it into the address of the entry he is on (replaceState: a tap on a verse number is not a Back step).
import { subscribe } from '../events/bus';
import { readerHash, readerOf, replaceHash, routeOf, type ReaderAddress } from './route';

function update(patch: ReaderAddress, without: (keyof ReaderAddress)[] = []): void {
  // Only the reader's own entry carries its state; an event heard while another screen is open is not written there.
  if (routeOf(window.location.hash) !== 'home') return;
  const next = { ...readerOf(window.location.hash), ...patch };
  for (const key of without) delete next[key];
  replaceHash(readerHash(next));
}

/** Starts writing the reader's book, chapter, verse, view and weave into the address; returns the stop. */
export function startReaderAddressSync(): () => void {
  const stops = [
    // A Reader on its way out (another chapter was chosen) tells the bus its verse is gone after the address already names the new
    // chapter: it must not write its own chapter back.
    subscribe('verse-selected', ({ chapter, verse }) => {
      const named = readerOf(window.location.hash).chapter;
      if (named !== undefined && named !== chapter) return;
      if (verse === null) update({ chapter }, ['verse']);
      else update({ chapter, verse });
    }),
    // The Reader says which book it shows, so a bare open (no address) comes to name it.
    subscribe('chapter-opened', ({ book, chapter }) => update({ book, chapter })),
    subscribe('view-changed', ({ view }) => update({ view })),
    subscribe('weave-changed', ({ weave }) => update({ weave })),
  ];
  return () => stops.forEach((stop) => stop());
}
