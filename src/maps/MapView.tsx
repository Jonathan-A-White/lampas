// src/maps/MapView.tsx — a map opened in the app (mw-zbjgn3r.2, docs/maps.md): its title and period, the low-res picture at full width in a box that zooms (a tap on it toggles the width of the box
// and twice the width, panned by scrolling the box; pinch where the phone allows it, the page itself locks zoom), under it the credit Bible Mapper asks with biblemapper.com a link back to the
// site (on every map), 'About this map', 'Full size' (the article, where the large picture is) and the source's page of every map of the chapter. The picture is shown from the source, never
// copied; while it fails to load (offline) its place says 'The map needs the internet' and every link stays. Back (useSheetBack, in MapsFrame) returns to the sheet.
// On the Reader a Split button stands beside Close: the map goes to the Reader's dock below the passage (docs/maps.md 'Split', mw-5r3p30.1129.2); the same body (MapBody) is what the dock draws.
import { useRef, useState } from 'react';
import { sourceOf } from './index';
import { MapsFrame } from './MapsFrame';
import { placeName } from './placeName';
import { listFact } from '../tutor/sheetTalk';
import { closeVerse, readerOf, routeOf } from '../nav/route';
import { afterSheetEntryGone } from '../ui/sheetBack';
import { keepVerseBeside, openSplitWithMap } from '../reader/split/splitSettings';
import { closeMaps } from './openMaps';
import { encodeSplitMap } from './splitMap';
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

/** The map's picture in its zooming box, the credit and the links, the body of the map sheet and of the Reader's dock (`docked`: the box is not capped to the sheet's height, and zoomed it keeps the height it had, so the picture pans inside it and the dock's own scroll is for what is under it). */
export function MapBody({ card, mapRef, docked = false }: { card: MapCard; mapRef: MapRef; docked?: boolean }) {
  const source = sourceOf(card);
  const picture = source?.imageUrl(card, 'low') ?? null;
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  // the box's height at fit, held while the picture is zoomed in a dock
  const [fitHeight, setFitHeight] = useState<number | null>(null);
  const chapter = placeName({ book: mapRef.book, chapter: mapRef.chapter });
  const all = source?.allMapsUrl?.(mapRef) ?? null;
  const zoom = () => {
    if (docked && !zoomed) setFitHeight(box.current?.offsetHeight ?? null);
    setZoomed((z) => !z);
  };
  return (
    <>
      {picture === null ? null : failed ? (
        <p role="status" data-map-offline className="rounded-xl border border-line px-4 py-6 text-center text-base text-muted">
          The map needs the internet
        </p>
      ) : (
        // a box that scrolls both ways; the picture inside is the box's width, or twice it
        <div
          ref={box}
          data-map-box
          data-two-finger
          style={docked && zoomed && fitHeight !== null ? { height: fitHeight } : undefined}
          className={`${docked ? '' : 'max-h-[55dvh] '}overflow-auto overscroll-contain rounded-xl border border-line [touch-action:pan-x_pan-y_pinch-zoom]`}
        >
          <button
            type="button"
            data-map-zoom={zoomed ? 'in' : 'fit'}
            aria-label={zoomed ? 'Fit the map to the width' : 'Zoom the map in'}
            onClick={zoom}
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
    </>
  );
}

const SPLIT = 'min-h-11 rounded-lg px-3 text-base font-medium text-accent';

/**
 * Split: the map goes to the Reader's dock below the passage. It closes the map, the Maps sheet under it and the Verse view under that (all three are Back steps: the sheets take theirs off as
 * they close, and the Verse view's is taken once those have gone, afterSheetEntryGone), and the Reader shows with the passage at the verse and the map in the dock.
 */
function dockMap(card: MapCard, mapRef: MapRef): void {
  const here = readerOf(window.location.hash);
  const verseOpen = here.verse !== undefined || here.passage !== undefined;
  const verse = here.verse ?? here.passage;
  if (verse !== undefined) keepVerseBeside(verse);
  void openSplitWithMap(encodeSplitMap(card, mapRef));
  closeMaps();
  if (verseOpen) afterSheetEntryGone(closeVerse);
}

export function MapView({ card, mapRef, onClose }: { card: MapCard; mapRef: MapRef; onClose: () => void }) {
  // a Split needs a Reader beneath it (the Maps sheet is also opened from the tutor, over other screens)
  const onReader = routeOf(window.location.hash) === 'home';
  return (
    <MapsFrame
      label={card.title}
      onClose={onClose}
      action={
        onReader ? (
          <button type="button" onClick={() => dockMap(card, mapRef)} className={SPLIT}>
            Split
          </button>
        ) : undefined
      }
      talk={{
        name: 'Map',
        facts: [
          { label: 'Map', value: card.title },
          { label: 'Period', value: card.period },
          { label: 'Passage', value: placeName(mapRef) },
          listFact('Places on the map', card.places),
        ],
        suggestions: ['What does this map show?', 'How does this map help me read this passage?'],
      }}
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
      <MapBody card={card} mapRef={mapRef} />
    </MapsFrame>
  );
}
