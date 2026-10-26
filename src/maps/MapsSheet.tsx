// src/maps/MapsSheet.tsx — the Maps sheet (mw-zbjgn3r.2, docs/maps.md): 'Maps for Genesis 10:19' (a verse), 'Maps for Genesis 10:1-19' (a passage) or 'Maps for Genesis 10', the place's maps
// grouped as Events, Regions and Videos (a group is absent when empty), each row 44 px with the title and, under it, the period. On a verse or a passage the maps that show a place
// it names come first under 'For this verse' / 'For these verses', each with those places after its period, and the rest under 'In this chapter' with the groups inside (mw-zbjgn3r.3). No thumbnails: the low-res picture is about 500 KB, so
// nothing is fetched until a map is opened. A map row opens the map in the app (MapView.tsx, over the sheet); a video row is a plain link to its article. The sheet's count and rows
// come from the module's data alone (useMaps). openMaps(ref) opens it; <MapsHost /> (mounted once in App) draws it.
import { useState } from 'react';
import { armFallback } from '../resources/openApp';
import { sourceOf } from './index';
import { MapsFrame } from './MapsFrame';
import { MapView } from './MapView';
import { closeMaps, useOpenMapCard, useOpenMaps } from './openMaps';
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

/** A card of a link-only source (mw-zbjgn3r.6): a row that opens `open` elsewhere, an app link with its https fallback armed or an https address alone, and never the map view. */
function LinkRow({ card }: { card: MapCard & { open: NonNullable<MapCard['open']> } }) {
  const { url, fallback } = card.open;
  return (
    <a
      data-map-row
      data-map-link
      href={url}
      data-fallback={fallback}
      onClick={fallback ? () => armFallback(fallback) : undefined}
      {...(url.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={ROW}
    >
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
      <span aria-hidden="true">↗</span>
    </a>
  );
}

const isLink = (card: MapCard): card is MapCard & { open: NonNullable<MapCard['open']> } => card.open !== undefined;

/** The maps of one source that open in the app: on a verse or a passage the maps that show a place it names first (For this verse), the rest by kind (Events, Regions, Videos). */
function MapBlock({ cards, mapRef, onOpen }: { cards: MapCard[]; mapRef: MapRef; onOpen: (card: MapCard) => void }) {
  const forVerse = cards.filter((c) => (c.matched?.length ?? 0) > 0);
  const rest = forVerse.length === 0 ? cards : cards.filter((c) => (c.matched?.length ?? 0) === 0);
  const passage = mapRef.from !== undefined && mapRef.to !== undefined && mapRef.to !== mapRef.from;
  // under 'In this chapter' the groups' headings are a level lower
  const Level = forVerse.length === 0 ? 'h3' : 'h4';
  return (
    <>
      {forVerse.length > 0 ? (
        <div data-maps-part="verse" className="pb-3">
          <h3 className="pb-1 text-base font-semibold">{passage ? 'For these verses' : 'For this verse'}</h3>
          <div className="flex flex-col gap-2">
            {forVerse.map((card) => (
              <Row key={`${card.source}:${card.id}`} card={card} onOpen={onOpen} shows />
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
                  <Row key={`${card.source}:${card.id}`} card={card} onOpen={onOpen} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** `openCard` is the id of a card to open over the sheet at once (the tutor's map link): found among the place's maps, opened once, and Back returns to the sheet. */
export function MapsSheet({ mapRef, onClose, openCard }: { mapRef: MapRef; onClose: () => void; openCard?: string | null }) {
  const cards = useMaps(mapRef);
  const [picked, setPicked] = useState<MapCard | null>(null);
  // the card asked for stays open until Back, once
  const [backed, setBacked] = useState(false);
  const asked = !backed && openCard ? cards?.find((c) => c.id === openCard && c.kind !== 'video' && !isLink(c)) : undefined;
  const map = picked ?? asked ?? null;
  const title = `Maps for ${placeName(mapRef)}`;
  // one block per source that answered cards, in mapsFor's order: a source's maps that open in the app as ever (Bible Mapper's, unheaded while it stands alone), a link-only source's rows under its name
  const sources = [...new Set((cards ?? []).map((c) => c.source))];
  const blocks = sources.map((source) => ({ source, cards: (cards ?? []).filter((c) => c.source === source) }));
  return (
    <>
      <MapsFrame label={title} onClose={onClose} escape={map === null} heading={<h2 className="text-xl font-semibold">{title}</h2>}>
        {cards && cards.length === 0 ? <p role="status" className="py-2 text-base text-muted">No maps here.</p> : null}
        {blocks.map(({ source, cards: own }) => {
          const links = own.filter(isLink);
          if (links.length === 0) return <MapBlock key={source} cards={own} mapRef={mapRef} onOpen={setPicked} />;
          const name = sourceOf(own[0])?.name ?? source;
          return (
            <div key={source} data-maps-source={source} role="group" aria-label={name} className="pb-3">
              <h3 className="pb-1 text-base font-semibold">{name}</h3>
              <div className="flex flex-col gap-2">
                {links.map((card) => (
                  <LinkRow key={card.id} card={card} />
                ))}
              </div>
            </div>
          );
        })}
      </MapsFrame>
      {map ? <MapView card={map} mapRef={mapRef} onClose={() => {
          setPicked(null);
          setBacked(true);
        }} /> : null}
    </>
  );
}

/** Draws the sheet for the place openMaps was last called with; mounted once, in App. */
export function MapsHost() {
  const ref = useOpenMaps();
  const card = useOpenMapCard();
  return ref ? <MapsSheet key={`${placeName(ref)}:${card ?? ''}`} mapRef={ref} onClose={closeMaps} openCard={card} /> : null;
}
