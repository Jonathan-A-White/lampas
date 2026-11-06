// src/sermons/useSermons.ts — the sermons of a place for a door and its sheet (mw-qtu3zvz.2): `undefined` while sermonsFor answers, then what the place has (nothing where it has none, or every source failed).
// It reads the module's data alone (the bundled sources' book files): nothing leaves the app for a sermon's page until a row is tapped.
import { useEffect, useState } from 'react';
import { sermonsFor, type SermonPlace, type SermonsFound } from './index';

export function useSermons(place: SermonPlace | null): SermonsFound | undefined {
  const key = place ? `${place.book}.${place.chapter}.${place.from ?? ''}.${place.to ?? ''}` : '';
  const [found, setFound] = useState<{ key: string; found: SermonsFound } | undefined>();
  useEffect(() => {
    if (!place) return;
    let alive = true;
    sermonsFor(place).then(
      (answer) => alive && setFound({ key, found: answer }),
      (error: unknown) => {
        console.warn(`could not read the sermons of the place: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setFound({ key, found: { here: [], chapter: [] } });
      },
    );
    return () => {
      alive = false;
    };
    // the place is the key: a new object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return found?.key === key ? found.found : undefined;
}
