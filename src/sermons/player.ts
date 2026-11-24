// src/sermons/player.ts — the one way to play a sermon in the app (mw-qtu3zvz.83, docs/sermons.md 'The player'): openSermon(row) from a row of the sheet, openSermon(row, { auto: true }) from Lampas itself (a voice ask),
// which starts the video with no tap. The sheet is drawn by <SermonPlayerHost /> (src/sermons/SermonPlayer.tsx, mounted once in App).
import { useSyncExternalStore } from 'react';
import { openedRow, type LinkRow } from './merge';
import { videoOf, type Video } from './video';

export interface OpenedSermon {
  title: string;
  video: Video;
  /** Lampas opened it itself: start it with no tap. */
  auto: boolean;
}

let current: OpenedSermon | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** The video a row plays in the app (its Subsplash address where it has one, as the sheet opens it; else, where its own address is no video, the YouTube video its `alt` names: Life Bible Ministry's page links back
 *  and its video plays here, mw-qtu3zvz.280.3), or undefined: the row opens on the web. The row's link stays its page. */
export const videoOfRow = (row: LinkRow): Video | undefined => {
  if (row.opensIn === 'logos') return undefined;
  const own = videoOf(openedRow(row).open.url);
  if (own !== undefined || row.alt === undefined) return own;
  const alt = videoOf(row.alt);
  return alt?.kind === 'youtube' ? alt : undefined;
};

/** Plays a row's video in the player sheet. False, and nothing opened, for a row that is no video the app plays. */
export function openSermon(row: LinkRow, options: { auto?: boolean } = {}): boolean {
  const video = videoOfRow(row);
  if (video === undefined) return false;
  current = { title: row.title, video, auto: options.auto === true };
  tell();
  return true;
}

/** The sermon a spoken or typed ask chose (the tutor's play-sermon, src/tutor/registry.ts): held until the answer that names it has been said, then started with no tap by playQueuedSermon. */
let queued: LinkRow | null = null;

/** Holds `row` to play as the answer ends (the latest one wins). False, and nothing held, for a row that is no video the app plays. */
export function queueSermon(row: LinkRow): boolean {
  if (videoOfRow(row) === undefined) return false;
  queued = row;
  return true;
}

/** Plays the held sermon, started with no tap (openSermon's auto), and forgets it. False when none was held. */
export function playQueuedSermon(): boolean {
  const row = queued;
  queued = null;
  return row !== null && openSermon(row, { auto: true });
}

/** Forgets the held sermon without playing it (the answer was cut short, or another one came). */
export function dropQueuedSermon(): void {
  queued = null;
}

/** Whether a sermon is held to play (tests). */
export const hasQueuedSermon = (): boolean => queued !== null;

export function closeSermon(): void {
  if (current === null) return;
  current = null;
  tell();
}

/** The sermon being played, or null. */
export function useOpenedSermon(): OpenedSermon | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
  );
}
