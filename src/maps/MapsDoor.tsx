// src/maps/MapsDoor.tsx — the quiet door 'Maps · N' (mw-zbjgn3r.2, docs/maps.md): a 44 px button that opens the Maps sheet for a place, drawn only while the place has maps. N is the number of cards
// (src/maps/useMaps.ts); nothing but the module's own data is read to know it. It sits on the Verse view and at the foot of a chapter, never in the verse text.
import { openMaps } from './openMaps';
import type { MapRef } from './types';
import { useMaps } from './useMaps';

const DOOR = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-4 text-base font-medium text-accent active:bg-line';
/** The quiet look of the Verse view's tools line (mw-5r3p30.896): accent words with no border. */
const QUIET_DOOR = 'inline-flex min-h-11 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-accent active:bg-line';

export function MapsDoor({ mapRef, className = '', quiet = false }: { mapRef: MapRef; className?: string; quiet?: boolean }) {
  const cards = useMaps(mapRef);
  if (!cards || cards.length === 0) return null;
  return (
    <button type="button" aria-haspopup="dialog" data-maps-door onClick={() => openMaps(mapRef)} className={`${quiet ? QUIET_DOOR : DOOR} ${className}`}>
      {`Maps · ${cards.length}`}
    </button>
  );
}
