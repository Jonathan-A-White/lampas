// src/data/daily/morningRephil.ts — Morning RePhil, Brookfield First's devotional with Pastor Phil (mw-qtu3zvz.15): the episode list bundled from sermon-index's data/morning-rephil.jsonl
// (data/daily/morning-rephil.json, scripts/morning-rephil-build.ts; oldest first; the Subsplash share link opens on Android, iPhone and a desktop browser, and no YouTube address is kept)
// and the PURE choice of the day's episode; online the sermon index service's GET /v1/rephil adds the newest (src/services/rephilFeed.ts, mw-r9xo1pj.24: merged here, by episode, so a new one shows with no app release). The episodes he has heard are kept on the device (dailyStore.ts getHeard); the order is Settings > Daily > Morning RePhil order.
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

/** The episodes bundled with the app, oldest first. */
export const EPISODES: readonly Episode[] = episodes;

const SHARE = /^https:\/\/brookfieldfirst\.subspla\.sh\/([A-Za-z0-9]+)$/;
const VIDEO = /^[A-Za-z0-9_-]{6,}$/;

/** The episodes of GET /v1/rephil's answer (rows of {number, title, date, share, video}; each may be null). A row's id is its share link's code, as the bundled list's is; an episode the church has not yet given a Subsplash link
 *  (the newest, seen first on YouTube) is opened at its YouTube video and its id is 'yt:<video>'. The number is kept only where the title prints it (as the bundled list does). A row that is not that shape, or that has
 *  no way to open it, is left out; anything that is not a list is no episode at all. The video id is kept only to match a YouTube watch history, and only for as long as the day's answer is. */
export function serviceEpisodes(raw: unknown): Episode[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row: unknown): Episode[] => {
    if (typeof row !== 'object' || row === null) return [];
    const { title, date, share, video } = row as Record<string, unknown>;
    if (typeof title !== 'string' || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const code = typeof share === 'string' ? SHARE.exec(share)?.[1] : undefined;
    const youtube = typeof video === 'string' && VIDEO.test(video) ? video : undefined;
    const printed = /#(\d+)/.exec(title)?.[1];
    const number = printed ? Number(printed) : null;
    if (code) return [{ id: code, number, title, date, share: share as string, ...(youtube ? { youtube } : {}) }];
    if (youtube) return [{ id: `yt:${youtube}`, number, title, date, share: `https://www.youtube.com/watch?v=${youtube}`, youtube }];
    return [];
  });
}

/** The bundled list and the service's, as one list oldest first (by date, then number): the newest wins, so a service row replaces the bundled row of the same id, or of the same episode number. A service row with
 *  no Subsplash link never takes the place of a bundled row that has one (it only gives it the video id), so what he has heard stays heard. */
export function mergeEpisodes(bundled: readonly Episode[], service: readonly Episode[]): Episode[] {
  const out = [...bundled];
  for (const row of service) {
    const at = out.findIndex((e) => e.id === row.id || (row.number !== null && e.number === row.number));
    if (at < 0) out.push(row);
    else if (row.id.startsWith('yt:') && !out[at].id.startsWith('yt:')) out[at] = { ...out[at], ...(row.youtube ? { youtube: row.youtube } : {}) };
    else out[at] = row;
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.number ?? 0) - (b.number ?? 0));
}

let live: readonly Episode[] = EPISODES;
const listeners = new Set<() => void>();

/** The episodes now: the bundled list, and the service's newest once rephilFeed.ts has them. Every reader that is given no list takes this one. */
export const currentEpisodes = (): readonly Episode[] => live;

/** Puts the service's episodes in (none puts the bundled list alone) and tells whoever listens (useEpisodes). */
export function setServiceEpisodes(service: readonly Episode[]): void {
  live = service.length === 0 ? EPISODES : mergeEpisodes(EPISODES, service);
  listeners.forEach((l) => l());
}

/** For React's useSyncExternalStore: the list changes when setServiceEpisodes puts new episodes in. */
export function subscribeEpisodes(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The episodes in the order asked for. */
export const orderedEpisodes = (order: EpisodeOrder, list: readonly Episode[] = currentEpisodes()): Episode[] => (order === 'newest' ? [...list].reverse() : [...list]);

/** The first episode in `order` that is not in `heard`; undefined once every one is heard. */
export const nextEpisode = (order: EpisodeOrder, heard: ReadonlySet<string>, list: readonly Episode[] = currentEpisodes()): Episode | undefined => orderedEpisodes(order, list).find((e) => !heard.has(e.id));

/** Whether any episode is still unheard (the test for Random to draw Morning RePhil at all). */
export const hasUnheard = (heard: ReadonlySet<string>, list: readonly Episode[] = currentEpisodes()): boolean => list.some((e) => !heard.has(e.id));

/** The episode Today shows: the one kept for the day (what he played or Another chose) while it is in the list, even though it is heard now; else the next unheard one. */
export function episodeForDay(order: EpisodeOrder, heard: ReadonlySet<string>, kept: string | undefined, list: readonly Episode[] = currentEpisodes()): Episode | undefined {
  return (kept === undefined ? undefined : list.find((e) => e.id === kept)) ?? nextEpisode(order, heard, list);
}

/** Another: the next unheard episode after `current` in `order`, going round to the start, never `current` itself; undefined when no other is unheard. */
export function anotherEpisode(order: EpisodeOrder, heard: ReadonlySet<string>, current: string | undefined, list: readonly Episode[] = currentEpisodes()): Episode | undefined {
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
  /** whether the Logos source is on: Logos is On AND 'Logos devotionals' is On (Settings > Daily > Devotional sources, mw-r9xo1pj.4; src/settings/devotionalSources.ts) */
  logosOn: boolean;
  /** whether Brookfield First is On there; absent reads as On */
  rephilOn?: boolean;
  list?: readonly Episode[];
}

/** The devotional Today shows (mw-r9xo1pj.2): the day's devotional as devotionalForDay draws it, but with Logos Off, or 'Logos devotionals' Off, only Morning RePhil (a Logos book opens nothing then, so none is drawn or shown: undefined);
 *  Morning RePhil with no episode left to see is the backup devotional while Logos is On. A newly published episode in `list` takes over from the backup at once. */
export function devotionalToday({ choice, ticked, date, pick, kept, heard, order, backup, logosOn, rephilOn = true, list = currentEpisodes() }: TodaysDevotionalInput): TodaysDevotional | undefined {
  const devotional = devotionalForDay(choice, ticked, date, pick, hasUnheard(heard, list), { logos: logosOn, rephil: rephilOn });
  if (devotional.kind !== 'rephil') return logosOn ? { devotional } : undefined;
  const episode = episodeForDay(order, heard, kept, list);
  if (episode) return { devotional, episode };
  return logosOn ? { devotional: backupDevotional(backup), backup: true } : { devotional: MORNING_REPHIL };
}
