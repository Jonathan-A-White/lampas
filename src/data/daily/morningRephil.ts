// src/data/daily/morningRephil.ts — Morning RePhil, Brookfield First's devotional with Pastor Phil (mw-qtu3zvz.15): the episode list bundled from sermon-index's data/morning-rephil.jsonl
// (data/daily/morning-rephil.json, scripts/morning-rephil-build.ts; oldest first; the Subsplash share link opens on Android, iPhone and a desktop browser, and no YouTube address is kept)
// and the PURE choice of the day's episode. The episodes he has heard are kept on the device (dailyStore.ts getHeard); the order is Settings > Daily > Morning RePhil order.
import episodes from '../../../data/daily/morning-rephil.json';
import { MORNING_REPHIL, backupDevotional, devotionalForDay, type Devotional } from './devotionals';

export interface Episode {
  /** the share link's code: how the device remembers it was heard */
  id: string;
  /** the number the church's title prints; null where the title prints none */
  number: number | null;
  title: string;
  /** the day it was posted, 'YYYY-MM-DD' */
  date: string;
  /** the Subsplash share link, the episode's one address */
  share: string;
  /** the episode's YouTube video id where the list knows it (mw-r9xo1pj.1); only the YouTube history import reads it, to match a watched video */
  youtube?: string;
}

/** Which episode is the next: the oldest one he has not heard (from the first), or the newest one. */
export type EpisodeOrder = 'oldest' | 'newest';

export const DEFAULT_ORDER: EpisodeOrder = 'oldest';

/** The episodes, oldest first. */
export const EPISODES: readonly Episode[] = episodes;

/** The episodes in the order asked for. */
export const orderedEpisodes = (order: EpisodeOrder, list: readonly Episode[] = EPISODES): Episode[] => (order === 'newest' ? [...list].reverse() : [...list]);

/** The first episode in `order` that is not in `heard`; undefined once every one is heard. */
export const nextEpisode = (order: EpisodeOrder, heard: ReadonlySet<string>, list: readonly Episode[] = EPISODES): Episode | undefined => orderedEpisodes(order, list).find((e) => !heard.has(e.id));

/** Whether any episode is still unheard (the test for Random to draw Morning RePhil at all). */
export const hasUnheard = (heard: ReadonlySet<string>, list: readonly Episode[] = EPISODES): boolean => list.some((e) => !heard.has(e.id));

/** The episode Today shows: the one kept for the day (what he played or Another chose) while it is in the list, even though it is heard now; else the next unheard one. */
export function episodeForDay(order: EpisodeOrder, heard: ReadonlySet<string>, kept: string | undefined, list: readonly Episode[] = EPISODES): Episode | undefined {
  return (kept === undefined ? undefined : list.find((e) => e.id === kept)) ?? nextEpisode(order, heard, list);
}

/** Another: the next unheard episode after `current` in `order`, going round to the start, never `current` itself; undefined when no other is unheard. */
export function anotherEpisode(order: EpisodeOrder, heard: ReadonlySet<string>, current: string | undefined, list: readonly Episode[] = EPISODES): Episode | undefined {
  const ordered = orderedEpisodes(order, list);
  const at = ordered.findIndex((e) => e.id === current);
  for (let step = 1; step <= ordered.length; step++) {
    const e = ordered[(at + step + ordered.length) % ordered.length];
    if (e.id !== current && !heard.has(e.id)) return e;
  }
  return undefined;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** 'November 13, 2026' for '2026-11-13': read from the text, so no zone moves the day. */
export function episodeDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** What Today's devotional piece is: `devotional` is the one shown; `episode` is the Morning RePhil episode when it is Morning RePhil and one is left to see; `backup` is true when every episode is
 *  seen and `devotional` is the backup devotional in its place (the piece keeps a way to start again). Morning RePhil with every episode seen and no backup to open (Logos Off) is Morning RePhil with no episode. */
export interface TodaysDevotional {
  devotional: Devotional;
  episode?: Episode;
  backup?: true;
}

export interface TodaysDevotionalInput {
  choice: string;
  ticked: readonly string[];
  date: Date;
  /** what Another drew for the day, while Which devotional is Random */
  pick?: string;
  /** the episode kept for the day (played, or Another's choice) */
  kept?: string;
  heard: ReadonlySet<string>;
  order: EpisodeOrder;
  /** Settings > Daily > When all Morning RePhil are seen: a Logos devotional's id */
  backup: string;
  logosOn: boolean;
  list?: readonly Episode[];
}

/** The devotional Today shows (mw-r9xo1pj.2): the day's devotional as devotionalForDay draws it, but with Logos Off only Morning RePhil (a Logos book opens nothing then, so none is drawn or shown: undefined);
 *  Morning RePhil with no episode left to see is the backup devotional while Logos is On. A newly published episode in `list` takes over from the backup at once. */
export function devotionalToday({ choice, ticked, date, pick, kept, heard, order, backup, logosOn, list = EPISODES }: TodaysDevotionalInput): TodaysDevotional | undefined {
  const devotional = devotionalForDay(choice, logosOn ? ticked : [], date, pick, hasUnheard(heard, list));
  if (devotional.kind !== 'rephil') return logosOn ? { devotional } : undefined;
  const episode = episodeForDay(order, heard, kept, list);
  if (episode) return { devotional, episode };
  return logosOn ? { devotional: backupDevotional(backup), backup: true } : { devotional: MORNING_REPHIL };
}
