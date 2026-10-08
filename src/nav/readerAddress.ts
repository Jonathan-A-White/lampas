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

/** Starts writing the reader's chapter, verse, view and weave into the address; returns the stop. */
export function startReaderAddressSync(): () => void {
  const stops = [
    subscribe('verse-selected', ({ chapter, verse }) =>
      verse === null ? update({ chapter }, ['verse']) : update({ chapter, verse }),
    ),
    subscribe('view-changed', ({ view }) => update({ view })),
    subscribe('weave-changed', ({ weave }) => update({ weave })),
  ];
  return () => stops.forEach((stop) => stop());
}
