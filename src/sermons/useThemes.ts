// src/sermons/useThemes.ts — the Themes line and 'On the same theme' for the Sermons sheet (mw-qtu3zvz.4, docs/sermons.md 'The themes'): `undefined` while they are read, then what the place has. They come after the
// sermons of the passage, and a failure leaves them empty: the sheet's own rows never wait on a theme file.
import { useEffect, useState } from 'react';
import { themesFor, type Theme } from '../themes';
import { sameThemeFor, type SameTheme, type SermonPlace, type SermonsFound } from './index';

const keyOf = (place: SermonPlace): string => `${place.book}.${place.chapter}.${place.from ?? ''}.${place.to ?? ''}`;

/** The topics of the verse or passage (none for a whole chapter), in the order the Themes line names them. */
export function useThemes(place: SermonPlace): Theme[] | undefined {
  const key = keyOf(place);
  const [themes, setThemes] = useState<{ key: string; themes: Theme[] } | undefined>();
  useEffect(() => {
    let alive = true;
    themesFor(place).then(
      (answer) => alive && setThemes({ key, themes: answer }),
      (error: unknown) => {
        console.warn(`could not read the themes of the place: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setThemes({ key, themes: [] });
      },
    );
    return () => {
      alive = false;
    };
    // the place is the key: a new object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return themes?.key === key ? themes.themes : undefined;
}

/** The sermons on the same theme as the verse or passage, once `found` (the passage's own sermons) is known: they leave out what `found` lists. */
export function useSameTheme(place: SermonPlace, found: SermonsFound | undefined): SameTheme | undefined {
  const key = keyOf(place);
  const [same, setSame] = useState<{ key: string; same: SameTheme } | undefined>();
  useEffect(() => {
    if (!found) return;
    let alive = true;
    sameThemeFor(place, found).then(
      (answer) => alive && setSame({ key, same: answer }),
      (error: unknown) => {
        console.warn(`could not read the sermons on the same theme: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setSame({ key, same: { groups: [], more: 0 } });
      },
    );
    return () => {
      alive = false;
    };
    // the place and the passage's answer are the key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, found]);
  return same?.key === key ? same.same : undefined;
}
