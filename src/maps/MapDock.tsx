// src/maps/MapDock.tsx — the body of the map in the Reader's dock (mw-5r3p30.1129.2, docs/maps.md 'Split'): the dock's body is the map's own body (MapView's MapBody: the picture in its zooming box, the credit, the links) and its title
// is the map's. Which map is the setting `splitMap` (src/maps/splitMap.ts), so a reload brings the same map back; its card is found again from the chapter it was opened from (mapsFor, as the Maps sheet reads it).
import type { ReactNode } from 'react';
import { MapBody } from './MapView';
import type { DockedMap } from './useDockedMap';

export function MapDockBody({ docked }: { docked: DockedMap }): ReactNode {
  if (docked.card === undefined) {
    return (
      <p role="status" className="px-4 py-3 text-base text-muted">
        Loading the map…
      </p>
    );
  }
  // a chapter with no map: the handle row says so (dockedTitle) and the body is empty; no picture is asked for
  if (docked.card === null) return null;
  return (
    <div key={`${docked.card.source}:${docked.card.id}`} className="px-4 pt-2">
      <MapBody card={docked.card} mapRef={docked.ref} docked />
    </div>
  );
}
