// src/maps/useMaps.ts — the maps of a place for a door (mw-zbjgn3r.2): `undefined` while mapsFor answers, then the cards (none where the place has no maps, or a source failed).
// It reads the module's data alone (src/maps/index.ts mapsFor): no picture is asked for here, nothing leaves the app until the sheet shows one.
import { useEffect, useState } from 'react';
import { mapsFor, type MapCard, type MapRef } from './index';

export function useMaps(ref: MapRef | null): MapCard[] | undefined {
  const key = ref ? `${ref.book}.${ref.chapter}.${ref.from ?? ''}.${ref.to ?? ''}` : '';
  const [found, setFound] = useState<{ key: string; cards: MapCard[] } | undefined>();
  useEffect(() => {
    if (!ref) return;
    let alive = true;
    mapsFor(ref).then(
      (cards) => alive && setFound({ key, cards }),
      (error: unknown) => {
        console.error('could not read the maps of the place', error);
        if (alive) setFound({ key, cards: [] });
      },
    );
    return () => {
      alive = false;
    };
    // the place is the key: a new ref object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return found?.key === key ? found.cards : undefined;
}
