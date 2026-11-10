// src/sermons/useThemes.ts — the Themes line and 'On the same theme' for the Sermons sheet (mw-qtu3zvz.4, docs/sermons.md 'The themes'): `undefined` while they are read, then what the place has. They come after the
// sermons of the passage, and a failure leaves them empty: the sheet's own rows never wait on a theme file.
import { useEffect, useState } from 'react';
import { themesFor, type Theme } from '../themes';
import { directThemeRows, sameThemeFor, type SameTheme, type SermonPlace, type SermonsFound, type ThemeRow } from './index';

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

/**
 * The sermons on the same theme as the verse or passage, once `found` (the passage's own sermons) is known: they leave out what `found` lists. The bundled sources' rows come first, as ever; then, once the service has
 * answered the sheet (`online`: Sermons sheet's 'Latest from the index'), it is asked for the sermons linked from their notes to a topic of the place (directThemeRows) and, if it gives any, the list is made again with them.
 * Offline, with no service, or when the call fails, it stays as it was, and no line says so.
 */
export function useSameTheme(place: SermonPlace, found: SermonsFound | undefined, online = false): SameTheme<ThemeRow> | undefined {
  const key = keyOf(place);
  const [same, setSame] = useState<{ key: string; same: SameTheme<ThemeRow> } | undefined>();
  useEffect(() => {
    if (!found) return;
    let alive = true;
    (async () => {
      let answer: SameTheme<ThemeRow> = { groups: [], more: 0 };
      try {
        answer = await sameThemeFor(place, found);
      } catch (error) {
        console.warn(`could not read the sermons on the same theme: ${error instanceof Error ? error.message : String(error)}`);
      }
      // online, the list stays as it was until the service's rows are in: it is not drawn twice
      if (online) {
        try {
          const direct = await directThemeRows(place);
          if (direct.length > 0) answer = await sameThemeFor(place, found, direct);
        } catch (error) {
          // the sheet stays as it was: no new status line
          console.warn(`could not read the sermons linked from their notes: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (alive) setSame({ key, same: answer });
    })();
    return () => {
      alive = false;
    };
    // the place, the passage's answer and whether the service answered are the key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, found, online]);
  return same?.key === key ? same.same : undefined;
}
