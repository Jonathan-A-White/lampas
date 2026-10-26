// src/maps/MapsSheet.tsx — the Maps sheet (mw-zbjgn3r.2, docs/maps.md): 'Maps for Genesis 10:19' (a verse), 'Maps for Genesis 10:1-19' (a passage) or 'Maps for Genesis 10', the place's maps
// grouped as Events, Regions and Videos (a group is absent when empty), each row 44 px with the title and, under it, the period. On a verse or a passage the maps that show a place
// it names come first under 'For this verse' / 'For these verses', each with those places after its period, and the rest under 'In this chapter' with the groups inside (mw-zbjgn3r.3). No thumbnails: the low-res picture is about 500 KB, so
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

function Row({ card, onOpen, shows = false }: { card: MapCard; onOpen: (card: MapCard) => void; /** the places the map shows are named under its title (the maps for this verse) */ shows?: boolean }) {
  const matched = shows ? (card.matched ?? []) : [];
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span data-map-title className="block break-words">
          {card.title}
        </span>
        {card.period || matched.length > 0 ? (
          <span className="block break-words text-sm font-normal text-muted">
            {card.period ? <span data-map-period>{card.period}</span> : null}
            {card.period && matched.length > 0 ? ' · ' : null}
            {matched.length > 0 ? <span data-map-matched>{matched.join(', ')}</span> : null}
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
  const forVerse = (cards ?? []).filter((c) => (c.matched?.length ?? 0) > 0);
  const rest = forVerse.length === 0 ? (cards ?? []) : (cards ?? []).filter((c) => (c.matched?.length ?? 0) === 0);
  const passage = mapRef.from !== undefined && mapRef.to !== undefined && mapRef.to !== mapRef.from;
  // under 'In this chapter' the groups' headings are a level lower
  const Level = forVerse.length === 0 ? 'h3' : 'h4';
  return (
    <>
      <MapsFrame label={title} onClose={onClose} escape={map === null} heading={<h2 className="text-xl font-semibold">{title}</h2>}>
        {cards && cards.length === 0 ? <p role="status" className="py-2 text-base text-muted">No maps here.</p> : null}
        {forVerse.length > 0 ? (
          <div data-maps-part="verse" className="pb-3">
            <h3 className="pb-1 text-base font-semibold">{passage ? 'For these verses' : 'For this verse'}</h3>
            <div className="flex flex-col gap-2">
              {forVerse.map((card) => (
                <Row key={`${card.source}:${card.id}`} card={card} onOpen={setMap} shows />
              ))}
            </div>
          </div>
        ) : null}
        <div data-maps-part={forVerse.length > 0 ? 'chapter' : undefined}>
          {forVerse.length > 0 && rest.length > 0 ? <h3 className="pb-1 text-base font-semibold">In this chapter</h3> : null}
          {GROUPS.map(({ kind, title: group }) => {
            const rows = rest.filter((c) => c.kind === kind);
            return rows.length === 0 ? null : (
              <div key={kind} role="group" aria-label={group} className="pb-3">
                <Level className="pb-1 text-base font-semibold text-muted">{group}</Level>
                <div className="flex flex-col gap-2">
                  {rows.map((card) => (
                    <Row key={`${card.source}:${card.id}`} card={card} onOpen={setMap} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
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
