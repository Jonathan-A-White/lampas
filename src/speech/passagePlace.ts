// src/speech/passagePlace.ts — where a passage reading was left (mw-5r3p30.1236): the passage player (passagePlayer.ts) keeps, as the voice reads, the reference and the verse it is at,
// under a key: one per verse list (Play all) and one per reference (a card's Play). It is on the device (localStorage), so it stays across leaving the screen and closing the app; the end
// of the list or reference clears it, and 'From the start' does. Leaving the screen or a Stop keeps it.
export interface Place {
  /** the reference being read, as the player heads it ('1 Samuel 12-17'): how the list finds it again */
  heading: string;
  /** the verse in the reading's plan (a later chapter of a reference read through is stepped by 1000, passagePlayer.ts CHAPTER_STEP); 0 is the reference's start */
  verse: number;
  /** the place in words: '1 Samuel 14:6' */
  label: string;
}

const STORE = 'lampas.passagePlaces';
/** the plan's verse numbers of a later chapter are stepped by this (passagePlayer.ts) */
export const CHAPTER_STEP = 1000;

export const listKey = (id: number): string => `list:${id}`;
export const refKey = (heading: string): string => `ref:${heading}`;
/** the Reader's own Play of a chapter (src/reader/useReadFrom.ts, mw-5r3p30.1239) */
export const chapterKey = (book: string, chapter: number): string => `chapter:${book}.${chapter}`;

let raw: string | null | undefined;
let cache: Record<string, Place> = {};
const listeners = new Set<() => void>();

function read(): Record<string, Place> {
  let now: string | null = null;
  try {
    now = localStorage.getItem(STORE);
  } catch {
    now = null;
  }
  if (now === raw) return cache;
  raw = now;
  try {
    const parsed: unknown = now ? JSON.parse(now) : {};
    cache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, Place>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: Record<string, Place>): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(next));
  } catch {
    // storage full or refused: the place is kept for this visit only
    raw = undefined;
    cache = next;
  }
  listeners.forEach((l) => l());
}

/** The place kept under `key`, or null. The same object while nothing changed (for useSyncExternalStore). */
export function getPlace(key: string): Place | null {
  return read()[key] ?? null;
}

export function savePlace(key: string, place: Place): void {
  const now = read()[key];
  if (now && now.heading === place.heading && now.verse === place.verse && now.label === place.label) return;
  write({ ...read(), [key]: place });
}

export function clearPlace(key: string): void {
  if (!read()[key]) return;
  const next = { ...read() };
  delete next[key];
  write(next);
}

export function subscribePlace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A place in words: the book of `heading` with the chapter and verse that plan number `verse` is, for a reference whose first chapter is `chapter` (`through`: read as chapters, so stepped). Verse 0 is the heading itself.
 * `lampasChapter` is the Lampas chapter the verse is in when that is known (a Septuagint verse of one Greek chapter can be the next Lampas chapter's: Greek 9:22 is Psalm 10:1); it is used in place of counting chapters from `chapter`. */
export function labelOf(heading: string, chapter: number, through: boolean, verse: number, lampasChapter?: number): string {
  if (verse <= 0) return heading;
  const book = heading.replace(/\s+\d[\d:–-]*$/, '');
  const step = through ? Math.floor(verse / CHAPTER_STEP) : 0;
  return `${book} ${lampasChapter ?? chapter + step}:${verse - step * CHAPTER_STEP}`;
}

/** Where in `headings` (the references of a list, in order) a kept place is, or -1 when there is nothing to resume: no place, a reference the list no longer holds, or the very start of the first (what Play all does anyway). */
export function resumeIndex(place: Place | null, headings: readonly string[]): number {
  if (!place) return -1;
  const at = headings.indexOf(place.heading);
  return at < 0 || (at === 0 && place.verse <= 0) ? -1 : at;
}
