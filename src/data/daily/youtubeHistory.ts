// src/data/daily/youtubeHistory.ts — the YouTube history import (mw-r9xo1pj.3): a Google Takeout 'YouTube and YouTube Music > history' watch-history.json is read here, on the phone, and the
// Morning RePhil episodes it lists are marked Seen (dailyStore.ts markManySeen, the device's own heard set). An entry is {title: 'Watched <title>', titleUrl: 'https://www.youtube.com/watch?v=<id>'}.
// An episode is matched by its YouTube video id where the list has one (Episode.youtube), else by its exact title. The file is never stored and never sent: only the matched episodes' ids are kept.
import { getHeard, localDate, markManySeen } from './dailyStore';
import { currentEpisodes, type Episode } from './morningRephil';

export interface WatchEntry {
  /** the video's id from the entry's address, when it has one */
  videoId?: string;
  /** the entry's title without Takeout's 'Watched ' */
  title?: string;
}

export interface ImportResult {
  /** episodes newly marked Seen */
  marked: number;
  /** episodes the file lists that were already Seen */
  already: number;
}

/** The file is not a Takeout watch history (not JSON, or not a list). */
export class NotWatchHistory extends Error {
  constructor() {
    super('This is not a YouTube watch-history.json. Choose the file from Google Takeout.');
  }
}

const WATCHED = /^Watched\s+/;

/** The video id in a YouTube address: its v= parameter, or the path of a youtu.be link; undefined for any other address. */
export function videoIdOf(address: unknown): string | undefined {
  if (typeof address !== 'string') return undefined;
  try {
    const url = new URL(address);
    const host = url.hostname.toLowerCase();
    if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || undefined;
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) return url.searchParams.get('v') || undefined;
  } catch {
    // not an address
  }
  return undefined;
}

/** The entries of a watch-history.json's text; throws NotWatchHistory for anything that is not a list of objects. */
export function readWatchHistory(text: string): WatchEntry[] {
  let kept: unknown;
  try {
    kept = JSON.parse(text);
  } catch {
    throw new NotWatchHistory();
  }
  if (!Array.isArray(kept)) throw new NotWatchHistory();
  return kept.flatMap((entry): WatchEntry[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { title, titleUrl } = entry as { title?: unknown; titleUrl?: unknown };
    const videoId = videoIdOf(titleUrl);
    return [{ ...(videoId ? { videoId } : {}), ...(typeof title === 'string' ? { title: title.replace(WATCHED, '') } : {}) }];
  });
}

/** The episodes of `list` that `entries` watched: by video id where the episode has one, else by exact title (an entry whose id no episode has still matches by its title). */
export function watchedEpisodes(entries: readonly WatchEntry[], list: readonly Episode[] = currentEpisodes()): Episode[] {
  const byId = new Map(list.filter((e) => e.youtube).map((e) => [e.youtube as string, e]));
  const byTitle = new Map(list.map((e) => [e.title, e]));
  const found = new Set<Episode>();
  for (const { videoId, title } of entries) {
    const episode = (videoId ? byId.get(videoId) : undefined) ?? (title ? byTitle.get(title) : undefined);
    if (episode) found.add(episode);
  }
  return [...found];
}

/** Marks the episodes of `list` that the watch-history.json `text` lists as Seen. Rejects with NotWatchHistory for a file that is not one. */
export async function importWatchHistory(text: string, list: readonly Episode[] = currentEpisodes()): Promise<ImportResult> {
  const matched = watchedEpisodes(readWatchHistory(text), list);
  const heard = await getHeard();
  const marked = await markManySeen(localDate(new Date()), matched.filter((e) => !heard.has(e.id)).map((e) => e.id));
  return { marked: marked.length, already: matched.length - marked.length };
}

/** 'N marked seen, M already seen'; when the file listed no Morning RePhil episode at all, says so instead of two zeros. */
export const importMessage = ({ marked, already }: ImportResult): string =>
  marked === 0 && already === 0 ? 'No Morning RePhil episode was found in this file.' : `${marked} marked seen, ${already} already seen`;
