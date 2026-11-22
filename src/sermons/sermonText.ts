// src/sermons/sermonText.ts — the parts of Lampas's own sermon reader that are not drawn (mw-ecpivg5.2, docs/sermons.md 'The reader'): which rows it reads, the sermon it has open, the paragraph stepper, his place kept on the
// device per sermon, the time left, and the shape of what the sermon index's GET /v1/text answers. The sheet is src/sermons/SermonReader.tsx.
import { useSyncExternalStore } from 'react';
import type { LinkRow } from './merge';
import { openedRow } from './merge';
import { videoOf } from './video';

/**
 * The sermon sources the sermon index serves the words of (sermon-index's source.toml `text = "public-domain"`; mw-ecpivg5.1): today Spurgeon's sermons at CCEL. The reader is offered for a row of these only; any other web
 * sermon opens on the web as before. A source listed here that the service does not serve answers 404 and the row opens on the web too (the sheet says so once). PROVISIONAL, the Governor to confirm.
 */
export const TEXT_SOURCES: readonly string[] = ['spurgeon-ccel'];

/** Whether Lampas can read a row aloud: a web row (not Logos) of a source the index serves text for, that is not a video (a video has its own player, src/sermons/player.ts). */
export function readsHere(row: LinkRow): boolean {
  if (row.opensIn !== 'web' || !TEXT_SOURCES.includes(row.source)) return false;
  return videoOf(openedRow(row).open.url) === undefined;
}

/** The sermon open in the reader: the row's own title until the text's has come, and its web address, where it opens if the text cannot be had. */
export interface OpenedText {
  source: string;
  id: string;
  title: string;
  url: string;
}

let current: OpenedText | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** Opens the reader on a row (the sheet draws itself: SermonReaderHost, mounted once in App). */
export function openSermonText(row: LinkRow): void {
  current = { source: row.source, id: row.id, title: row.title, url: row.open.url };
  tell();
}

export function closeSermonText(): void {
  if (current === null) return;
  current = null;
  tell();
}

/** The sermon being read, or null. */
export function useOpenedText(): OpenedText | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
  );
}

/** A sermon's words as the reader holds them. */
export interface SermonText {
  title: string;
  paragraphs: string[];
}

/** What GET /v1/text answered, as a SermonText; undefined when it is not that shape or has no paragraph to read. A paragraph with nothing in it is left out. */
export function parseText(answer: unknown): SermonText | undefined {
  if (typeof answer !== 'object' || answer === null) return undefined;
  const { title, paragraphs } = answer as { title?: unknown; paragraphs?: unknown };
  if (typeof title !== 'string' || !Array.isArray(paragraphs) || !paragraphs.every((p) => typeof p === 'string')) return undefined;
  const kept = (paragraphs as string[]).map((p) => p.trim()).filter((p) => p !== '');
  return kept.length === 0 ? undefined : { title, paragraphs: kept };
}

/** The paragraph one step `by` from `at` in a sermon of `count` paragraphs: it stays at the first going back and at the last going forward. */
export function stepParagraph(at: number, count: number, by: -1 | 1): number {
  return Math.max(0, Math.min(Math.max(0, count - 1), at + by));
}

const PLACE_PREFIX = 'lampas.sermonPlace.';
const placeKey = (source: string, id: string): string => `${PLACE_PREFIX}${source}:${id}`;

/** The paragraph he was at in this sermon (0 is the first), kept on this device; the top where he has none, and a place past the end of the text is its last paragraph. */
export function readPlace(source: string, id: string, count: number): number {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(placeKey(source, id));
  } catch {
    return 0;
  }
  if (saved === null || !/^\d+$/.test(saved)) return 0;
  return Math.min(Number(saved), Math.max(0, count - 1));
}

/** Keeps the paragraph he is at. */
export function keepPlace(source: string, id: string, at: number): void {
  try {
    localStorage.setItem(placeKey(source, id), String(Math.max(0, Math.floor(at))));
  } catch {
    // a phone that will not keep it: the sermon starts at the top next time
  }
}

/** Forgets his place in a sermon: Restart, and a sermon read to its end. */
export function forgetPlace(source: string, id: string): void {
  try {
    localStorage.removeItem(placeKey(source, id));
  } catch {
    // nothing kept, nothing to forget
  }
}

/** How many words a minute the phone's voice says at his speed 1 (an English voice says about 150 to 170). The time left is an estimate, said as 'about'. */
export const WORDS_PER_MINUTE = 160;

const wordsOf = (text: string): number => text.split(/\s+/).filter((w) => w !== '').length;

/** Minutes of reading left from paragraph `at` (the whole of it) to the end, at his speed (1 is normal). */
export function minutesLeft(paragraphs: readonly string[], at: number, rate: number): number {
  const words = paragraphs.slice(Math.max(0, at)).reduce((sum, p) => sum + wordsOf(p), 0);
  return words / (WORDS_PER_MINUTE * (rate > 0 ? rate : 1));
}

/** The time left as the reader says it: 'about 13 min left', 'less than a minute left', or 'finished'. */
export function timeLeftLine(minutes: number): string {
  if (minutes <= 0) return 'finished';
  if (minutes < 0.5) return 'less than a minute left';
  return `about ${Math.max(1, Math.ceil(minutes - 1e-9))} min left`;
}
