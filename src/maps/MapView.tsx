// src/maps/MapView.tsx — a map opened in the app (mw-zbjgn3r.2, docs/maps.md): its title and period, the low-res picture at full width in a box that zooms (a tap on it toggles the width of the box
// and twice the width, panned by scrolling the box; pinch where the phone allows it, the page itself locks zoom), under it the credit Bible Mapper asks with biblemapper.com a link back to the
// site (on every map), 'About this map', 'Full size' (the article, where the large picture is) and the source's page of every map of the chapter. The picture is shown from the source, never
// copied; while it fails to load (offline) its place says 'The map needs the internet' and every link stays. Back (useSheetBack, in MapsFrame) returns to the sheet.
import { useState } from 'react';
import { sourceOf } from './index';
import { MapsFrame } from './MapsFrame';
import { placeName } from './placeName';
import type { MapCard, MapRef, MapSource } from './types';

const LINK = 'inline-flex min-h-11 items-center text-base font-medium text-accent underline underline-offset-4';

/** The credit line with the source's host (biblemapper.com) as a link back to its homepage; a credit that does not name the host is followed by the link. */
function Credit({ source }: { source: MapSource }) {
  const host = new URL(source.homepage).host;
  const at = source.credit.lastIndexOf(host);
  const link = (
    <a href={source.homepage} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
      {host}
    </a>
  );
  return (
    <p data-map-credit className="text-sm text-muted">
      {at < 0 ? (
        <>
          {source.credit} {link}
        </>
      ) : (
        <>
          {source.credit.slice(0, at)}
          {link}
          {source.credit.slice(at + host.length)}
        </>
      )}
    </p>
  );
}

export function MapView({ card, mapRef, onClose }: { card: MapCard; mapRef: MapRef; onClose: () => void }) {
  const source = sourceOf(card);
  const picture = source?.imageUrl(card, 'low') ?? null;
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const chapter = placeName({ book: mapRef.book, chapter: mapRef.chapter });
  const all = source?.allMapsUrl?.(mapRef) ?? null;
  return (
    <MapsFrame
      label={card.title}
      onClose={onClose}
      heading={
        <>
          <h2 className="text-xl font-semibold">{card.title}</h2>
          {card.period ? (
            <p data-map-period className="text-base text-muted">
              {card.period}
            </p>
          ) : null}
        </>
      }
    >
      {picture === null ? null : failed ? (
        <p role="status" data-map-offline className="rounded-xl border border-line px-4 py-6 text-center text-base text-muted">
          The map needs the internet
        </p>
      ) : (
        // a box that scrolls both ways; the picture inside is the box's width, or twice it
        <div data-map-box className="max-h-[55dvh] overflow-auto overscroll-contain rounded-xl border border-line [touch-action:pan-x_pan-y_pinch-zoom]">
          <button
            type="button"
            data-map-zoom={zoomed ? 'in' : 'fit'}
            aria-label={zoomed ? 'Fit the map to the width' : 'Zoom the map in'}
            onClick={() => setZoomed((z) => !z)}
            style={{ width: zoomed ? '200%' : '100%' }}
            className="block"
          >
            <img src={picture} alt={`Map: ${card.title}`} onError={() => setFailed(true)} draggable={false} className="block w-full max-w-none" />
          </button>
        </div>
      )}
      {source ? (
        <div className="mt-2">
          <Credit source={source} />
        </div>
      ) : null}
      <div className="flex flex-col pb-2 pt-1">
        <a href={card.article} target="_blank" rel="noopener noreferrer" className={LINK}>
          About this map
        </a>
        <a href={card.article} target="_blank" rel="noopener noreferrer" className={LINK}>
          Full size
        </a>
        {all && source ? (
          <a href={all} target="_blank" rel="noopener noreferrer" className={LINK}>
            {`All maps for ${chapter} at ${source.name}`}
          </a>
        ) : null}
      </div>
    </MapsFrame>
  );
}
