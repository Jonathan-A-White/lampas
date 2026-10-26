// src/maps/MapsSheet.tsx — the Maps sheet (mw-zbjgn3r.2, docs/maps.md): 'Maps for Genesis 10:19' (a verse), 'Maps for Genesis 10:1-19' (a passage) or 'Maps for Genesis 10', the place's maps
// grouped as Events, Regions and Videos (a group is absent when empty), each row 44 px with the title and, under it, the period. No thumbnails: the low-res picture is about 500 KB, so
// nothing is fetched until a map is opened. A map row opens the map in the app (MapView.tsx, over the sheet); a video row is a plain link to its article. The sheet's count and rows
// come from the module's data alone (useMaps). openMaps(ref) opens it; <MapsHost /> (mounted once in App) draws it.
import { useState } from 'react';
import { MapsFrame } from './MapsFrame';
import { MapView } from './MapView';
import { closeMaps, useOpenMaps } from './openMaps';
import { placeName } from './placeName';
import type { MapCard, MapKind, MapRef } from './types';
import { useMaps } from './useMaps';

const ROW = 'flex min-h-11 w-full items-center gap-2 rounded-xl border border-line px-4 py-2 text-left text-base font-medium text-accent active:bg-line';
const GROUPS: readonly { kind: MapKind; title: string }[] = [
  { kind: 'event', title: 'Events' },
  { kind: 'region', title: 'Regions' },
  { kind: 'video', title: 'Videos' },
];

function Row({ card, onOpen }: { card: MapCard; onOpen: (card: MapCard) => void }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span data-map-title className="block break-words">
          {card.title}
        </span>
        {card.period ? (
          <span data-map-period className="block break-words text-sm font-normal text-muted">
            {card.period}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true">{card.kind === 'video' ? '↗' : '›'}</span>
    </>
  );
  // a video is its article, in the browser; a map opens in the app
  return card.kind === 'video' ? (
    <a data-map-row href={card.article} target="_blank" rel="noopener noreferrer" className={ROW}>
      {body}
    </a>
  ) : (
    <button type="button" data-map-row onClick={() => onOpen(card)} className={ROW}>
      {body}
    </button>
  );
}

export function MapsSheet({ mapRef, onClose }: { mapRef: MapRef; onClose: () => void }) {
  const cards = useMaps(mapRef);
  const [map, setMap] = useState<MapCard | null>(null);
  const title = `Maps for ${placeName(mapRef)}`;
  return (
    <>
      <MapsFrame label={title} onClose={onClose} escape={map === null} heading={<h2 className="text-xl font-semibold">{title}</h2>}>
        {cards && cards.length === 0 ? <p role="status" className="py-2 text-base text-muted">No maps here.</p> : null}
        {GROUPS.map(({ kind, title: group }) => {
          const rows = (cards ?? []).filter((c) => c.kind === kind);
          return rows.length === 0 ? null : (
            <div key={kind} role="group" aria-label={group} className="pb-3">
              <h3 className="pb-1 text-base font-semibold text-muted">{group}</h3>
              <div className="flex flex-col gap-2">
                {rows.map((card) => (
                  <Row key={`${card.source}:${card.id}`} card={card} onOpen={setMap} />
                ))}
              </div>
            </div>
          );
        })}
      </MapsFrame>
      {map ? <MapView card={map} mapRef={mapRef} onClose={() => setMap(null)} /> : null}
    </>
  );
}

/** Draws the sheet for the place openMaps was last called with; mounted once, in App. */
export function MapsHost() {
  const ref = useOpenMaps();
  return ref ? <MapsSheet key={placeName(ref)} mapRef={ref} onClose={closeMaps} /> : null;
}
