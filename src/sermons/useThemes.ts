// src/sermons/useThemes.ts — the Themes line and 'On the same theme' for the Sermons sheet (mw-qtu3zvz.4, docs/sermons.md 'The themes'): `undefined` while they are read, then what the place has. They come after the
// sermons of the passage, and a failure leaves them empty: the sheet's own rows never wait on a theme file.
import { useEffect, useState } from 'react';
import { subscribe } from '../events/bus';
import { themesFor, type Theme } from '../themes';
import { themeKey } from '../themes/themesFor';
import { directThemeRows, sameThemeFor, sermonsOnTheme, type SameTheme, type SermonPlace, type SermonsFound, type ThemeRow } from './index';
import type { LinkRow } from './merge';

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

/** A theme of the Themes line that has sermons: its name as the line says it ('Love-Hatred: Of God'), the topic's own (`label`, 'Love-Hatred') and the sermons it lists, a name once however many lists give it. */
export interface ThemeChip {
  text: string;
  label: string;
  /** the theme lists (their source ids) that name it, for the credits */
  sources: string[];
  rows: LinkRow[];
}

/** The chips of the themes that have at least one sermon, in the line's order; a theme two lists name (themeKey) has the rows of both, a sermon once. */
export function chipsOf(themes: readonly Theme[], lists: ReadonlyMap<string, readonly LinkRow[]>): ThemeChip[] {
  const chips = new Map<string, ThemeChip>();
  for (const theme of themes) {
    const rows = lists.get(`${theme.source}:${theme.topic}`) ?? [];
    if (rows.length === 0) continue;
    // a name two lists write two ways (case, punctuation) is one theme: the first list's words stand (mw-qtu3zvz.90)
    const key = themeKey(theme.label);
    const held = chips.get(key);
    if (!held) chips.set(key, { text: theme.text, label: theme.label, sources: [theme.source], rows: [...rows] });
    else if (!held.sources.includes(theme.source)) held.sources.push(theme.source);
    if (held) for (const row of rows) if (!held.rows.some((r) => r.source === row.source && r.id === row.id)) held.rows.push(row);
  }
  return [...chips.values()];
}

/**
 * The Themes line's chips (mw-qtu3zvz.81, docs/sermons.md 'The Themes line'): only the themes of the place that have at least one sermon in a source that is On. `undefined` while they are read. The bundled index answers first; `online`
 * (the service has answered the sheet) it is asked for each theme's sermons in the same sources and may add themes and sermons, never take one away. It asks again when a sermon source, a theme list or Logos is switched.
 * A theme whose sermons could not be read is left out, as the search's is (mw-qtu3zvz.65).
 */
export function useThemeChips(themes: readonly Theme[] | undefined, online: boolean): ThemeChip[] | undefined {
  const [switches, setSwitches] = useState(0);
  useEffect(
    () => subscribe('setting-changed', (event) => (event.key.startsWith('sermons.') || event.key.startsWith('themes.') || event.key === 'resource.logos') && setSwitches((n) => n + 1)),
    [],
  );
  const [held, setHeld] = useState<{ themes: readonly Theme[]; online: boolean; switches: number; chips: ThemeChip[] } | undefined>();
  useEffect(() => {
    if (themes === undefined) return;
    let alive = true;
    (async () => {
      const lists = new Map<string, LinkRow[]>();
      for (const theme of themes) {
        try {
          lists.set(`${theme.source}:${theme.topic}`, await sermonsOnTheme(theme, online));
        } catch (error) {
          console.warn(`could not read the sermons of a theme: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (alive) setHeld({ themes, online, switches, chips: chipsOf(themes, lists) });
    })();
    return () => {
      alive = false;
    };
  }, [themes, online, switches]);
  // while the service's answer is awaited the bundled one stands: it is shown again for the same themes, never a blank
  const fresh = held && held.themes === themes && held.switches === switches;
  if (!fresh) return themes !== undefined && themes.length === 0 ? [] : undefined;
  return held.chips;
}
