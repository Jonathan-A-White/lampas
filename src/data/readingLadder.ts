// src/data/readingLadder.ts — the reading ladder on the phone (mw-neuq78.4, docs/reading-ladder.md): the lists public/data/ladder/<lang>.json (every verse, easiest to
// pronounce first; loaded when the ladder is first used, never precached: src/sw.ts keeps them with the other /data/ files once fetched), and the place on a list.
// The place is the first verse he has not read well; a verse he skipped for now is passed over and comes back once he has read SKIP_GAP others well. English,
// Greek and Hebrew each have a list and a place. ladderPlace is pure; currentLadderPlace reads the phone.
import { getLadderRow, listWellRead } from './repositories/ladder';

/** The languages that have a list: 'el' is the Modern Greek sounds the Greek view reads in (src/speech/pronunciation.ts scoringLang), 'en' English, 'he' the Israeli Hebrew the Hebrew view reads in. */
export const LADDER_LANGS = ['el', 'en', 'he'] as const;
export type LadderLang = (typeof LADDER_LANGS)[number];

/** What each list is called on screen. */
export const LADDER_NAMES: Record<LadderLang, string> = { el: 'Greek', en: 'English', he: 'Hebrew' };

export const isLadderLang = (lang: string): lang is LadderLang => (LADDER_LANGS as readonly string[]).includes(lang);

/** One verse of a list, as scripts/ladder-shared.ts writes it. */
export interface LadderEntry {
  /** the book's code, chapter and verse: 'jhn.11.35' */
  ref: string;
  score: number;
  why: string[];
}

/** PROVISIONAL (the Governor to confirm): a skipped verse comes back after he has read this many other verses well. */
export const SKIP_GAP = 5;

export interface LadderSkip {
  ref: string;
  at: number;
}

const lists = new Map<LadderLang, Promise<LadderEntry[]>>();

/** Fetches /data/ladder/<lang>.json once; later and concurrent callers share the one request, and a failure is not kept. */
export function loadLadder(lang: LadderLang): Promise<LadderEntry[]> {
  const known = lists.get(lang);
  if (known) return known;
  const request = fetch(`/data/ladder/${lang}.json`).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the ${lang} ladder: ${response.status}`);
    return (await response.json()) as LadderEntry[];
  });
  lists.set(lang, request);
  request.catch(() => {
    if (lists.get(lang) === request) lists.delete(lang);
  });
  return request;
}

/** Drops the lists held in memory (tests). */
export function forgetLadders(): void {
  lists.clear();
}

/** 'jhn.11.35' as the book's code, chapter and verse; undefined for anything else (a passage's 'rom.8.1-11' is not a ladder ref). */
export function refParts(ref: string): { book: string; chapter: number; verse: number } | undefined {
  const match = /^([0-9a-z]+)\.(\d+)\.(\d+)$/.exec(ref);
  return match ? { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) } : undefined;
}

/** Where a verse stands on the list, counting from 1 (the N of 'Number N of M on the ladder'); 0 when it is not on the list. */
export function positionOf(list: readonly LadderEntry[], ref: string): number {
  return list.findIndex((entry) => entry.ref === ref) + 1;
}

/**
 * The verse to read now, or null when every verse is read well: a skipped verse that has waited long enough (the oldest skip first), else the first verse
 * on the list not read well and not skipped, else (nothing else is left) the oldest skipped verse. `wellAt` has every verse he has read well, with the time
 * of the latest such reading; a skip ends when its verse is read well, and a verse read well after the skip counts toward its return.
 */
export function ladderPlace(list: readonly LadderEntry[], wellAt: ReadonlyMap<string, number>, skipped: readonly LadderSkip[]): string | null {
  const onList = new Set(list.map((entry) => entry.ref));
  const waiting = skipped.filter((s) => onList.has(s.ref) && !wellAt.has(s.ref)).sort((a, b) => a.at - b.at);
  const back = waiting.find((s) => [...wellAt.values()].filter((at) => at > s.at).length >= SKIP_GAP);
  if (back) return back.ref;
  const passed = new Set(waiting.map((s) => s.ref));
  const fresh = list.find((entry) => !wellAt.has(entry.ref) && !passed.has(entry.ref));
  if (fresh) return fresh.ref;
  return waiting[0]?.ref ?? null;
}

/** The place on `lang`'s list now, read from the phone: the list, the readings he made well and the verses he skipped. */
export async function currentLadderPlace(lang: LadderLang): Promise<string | null> {
  const [list, wellAt, row] = await Promise.all([loadLadder(lang), listWellRead(lang), getLadderRow(lang)]);
  return ladderPlace(list, wellAt, row.skipped);
}
