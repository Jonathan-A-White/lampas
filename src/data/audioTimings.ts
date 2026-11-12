// src/data/audioTimings.ts: the verse timings of the recorded voice (mw-82lb97i.1), the file both the timing maker (scripts/audio-timings) and the player build to.
// The recording is the publisher's own MP3, played from their server by one audio element and never copied here (docs/data.md 'Recorded audio timings'); what Lampas keeps is
// this small JSON of when each verse starts and ends, served same-origin from public/data/audio/<edition>/:
//   index.json  {"v":1,"edition":"msb-david","voice":"David","books":{"jhn":[1,2,...,21]}}  the chapters of each book that have timings
//   <book>.json {"v":1,"edition":"msb-david","book":"jhn","chapters":{"3":{"audio":"https://...mp3","duration":312.45,"verses":[[1,4.2,12.86],[2,12.86,27.31]]}}}
// The loader never throws: a missing file, a server's index.html answering for one, a file that fails its guard and a failed fetch all give null, and the player then reads in the phone's voice.

/** The voice this edition of the recordings is keyed by: the folder under /data/audio/ and the `edition` of both files. Another voice would be another folder. */
export const TIMINGS_EDITION = 'msb-david';

/** One verse's timing: [verse number, start second, end second], seconds to two decimals. */
export type VerseTiming = [number, number, number];

export interface ChapterTimings {
  /** The publisher's MP3 of the chapter, an https address. */
  audio: string;
  /** The recording's length in seconds. */
  duration: number;
  /** The verses in order: their numbers are those of public/data/<book>/<n>.json, a verse's end is no later than the next one's start, the last end no later than the duration. */
  verses: VerseTiming[];
}

export interface BookTimings {
  v: 1;
  edition: typeof TIMINGS_EDITION;
  /** Lampas's book code ('jhn'). */
  book: string;
  /** By chapter number, as a string key. */
  chapters: Record<string, ChapterTimings>;
}

export interface TimingsIndex {
  v: 1;
  edition: typeof TIMINGS_EDITION;
  voice: string;
  /** Each book that has a timing file, with the chapters in it. Taking a book out turns the recording off for it, with no code change. */
  books: Record<string, number[]>;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isPositiveInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0;
const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function isHttps(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Whether the verses are triples of finite numbers with rising verse numbers, start < end, no verse overlapping the next and the last end within the duration. */
function isVerseList(verses: unknown, duration: number): verses is VerseTiming[] {
  if (!Array.isArray(verses) || verses.length === 0) return false;
  let previousNumber = 0;
  let previousEnd = 0;
  for (const triple of verses) {
    if (!Array.isArray(triple) || triple.length !== 3) return false;
    const [n, start, end] = triple as unknown[];
    if (!isPositiveInteger(n) || !isSeconds(start) || !isSeconds(end)) return false;
    if (n <= previousNumber || start >= end || start < previousEnd) return false;
    previousNumber = n;
    previousEnd = end;
  }
  return previousEnd <= duration;
}

function isChapterTimings(value: unknown): value is ChapterTimings {
  if (!isObject(value)) return false;
  const { audio, duration, verses } = value;
  return isHttps(audio) && typeof duration === 'number' && Number.isFinite(duration) && duration > 0 && isVerseList(verses, duration);
}

/** Whether a parsed file is a book's timings, to the rules of the contract: v 1; every chapter's verses triples of finite numbers; start < end; a verse's end <= the next start; verse numbers rising; the last end <= duration; audio an https address. */
export function isBookTimings(value: unknown): value is BookTimings {
  if (!isObject(value) || value.v !== 1 || value.edition !== TIMINGS_EDITION) return false;
  if (typeof value.book !== 'string' || value.book === '') return false;
  const chapters = value.chapters;
  if (!isObject(chapters)) return false;
  return Object.entries(chapters).every(([key, chapter]) => /^[1-9]\d*$/.test(key) && isChapterTimings(chapter));
}

/** Whether a parsed file is the index: v 1, the voice, and for each book the chapters that have timings, whole numbers rising. */
export function isTimingsIndex(value: unknown): value is TimingsIndex {
  if (!isObject(value) || value.v !== 1 || value.edition !== TIMINGS_EDITION || typeof value.voice !== 'string') return false;
  const books = value.books;
  if (!isObject(books)) return false;
  return Object.values(books).every((chapters) => Array.isArray(chapters) && chapters.every((n, i) => isPositiveInteger(n) && (i === 0 || n > (chapters[i - 1] as number))));
}

export const timingsIndexUrl = (): string => `/data/audio/${TIMINGS_EDITION}/index.json`;
export const bookTimingsUrl = (book: string): string => `/data/audio/${TIMINGS_EDITION}/${book}.json`;

/** What a file is, or null: asked for once and read as JSON; a refusal, a body that is not JSON (an index.html answering for a missing file) and a thrown fetch all give null. `retry` is true only for a thrown fetch. */
async function readJson(url: string): Promise<{ value: unknown; retry: boolean }> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { value: null, retry: true };
  }
  if (!response.ok) return { value: null, retry: false };
  try {
    return { value: (await response.json()) as unknown, retry: false };
  } catch {
    return { value: null, retry: false };
  }
}

// Each file is fetched once a session and remembered. The one answer not remembered is a fetch that threw (the phone had no network just then): the next call asks again.
let indexRequest: Promise<TimingsIndex | null> | undefined;
const bookRequests = new Map<string, Promise<BookTimings | null>>();
const loaded = new Map<string, BookTimings>();
let loadedIndex: TimingsIndex | null = null;

/** Forgets everything loaded (a test's). */
export function forgetTimings(): void {
  indexRequest = undefined;
  loadedIndex = null;
  bookRequests.clear();
  loaded.clear();
}

/** The index of the recordings that have timings, or null when there is none (no file, not JSON, fails its guard, no network). Fetched once a session. */
export function loadTimingsIndex(): Promise<TimingsIndex | null> {
  if (indexRequest) return indexRequest;
  const request = readJson(timingsIndexUrl()).then(({ value, retry }): TimingsIndex | null => {
    if (retry && indexRequest === request) indexRequest = undefined;
    if (!isTimingsIndex(value)) return null;
    loadedIndex = value;
    return value;
  });
  indexRequest = request;
  return request;
}

/** One try at a book's file: its timings or null, and whether the null is worth asking for again (the index or the file was lost to a thrown fetch). */
async function fetchBook(book: string): Promise<{ value: BookTimings | null; again: boolean }> {
  const index = await loadTimingsIndex();
  if (!index) return { value: null, again: true }; // the index is remembered, a lost one asks again by itself: this book asks the index again too
  if (!Object.hasOwn(index.books, book)) return { value: null, again: false };
  const { value, retry } = await readJson(bookTimingsUrl(book));
  if (!isBookTimings(value) || value.book !== book) return { value: null, again: retry };
  loaded.set(book, value);
  return { value, again: false };
}

/** A book's timings, or null: the index does not list the book (then its file is not fetched), the file is missing, not JSON, fails its guard, is another book's, or the fetch failed. Fetched once a session. */
export function loadBookTimings(book: string): Promise<BookTimings | null> {
  const known = bookRequests.get(book);
  if (known) return known;
  const request = fetchBook(book).then(({ value, again }) => {
    if (again && bookRequests.get(book) === request) bookRequests.delete(book);
    return value;
  });
  bookRequests.set(book, request);
  return request;
}

/** Whether the index (once loaded) lists this chapter as timed: true or false, or null while the index is not in (no wait, no guess). voiceDecision.ts says 'David has not recorded it yet' only on a false. */
export function chapterListedNow(book: string, chapter: number): boolean | null {
  if (!loadedIndex) return null;
  return Object.hasOwn(loadedIndex.books, book) && loadedIndex.books[book].includes(chapter);
}

/** What is ALREADY loaded of a chapter, with no wait, or null: the player decides at the tap and may not wait for a fetch. Call loadBookTimings beforehand (on opening the chapter) to have it ready. */
export function chapterTimingsNow(book: string, chapter: number): ChapterTimings | null {
  const timings = loaded.get(book);
  if (!timings) return null;
  const key = String(chapter);
  return Object.hasOwn(timings.chapters, key) ? timings.chapters[key] : null;
}

/** The verse being read at this second of the recording: null before the first verse starts (the narrator's chapter title); a verse from its start until the next verse's start (a gap keeps the verse before it); the last verse after its end. */
export function verseAt(timings: ChapterTimings, seconds: number): number | null {
  if (!Number.isFinite(seconds)) return null;
  let found: number | null = null;
  for (const [n, start] of timings.verses) {
    if (start > seconds) break;
    found = n;
  }
  return found;
}

/** Where a verse starts and ends in the recording, or null when the file has no such verse. */
export function spanOf(timings: ChapterTimings, verse: number): { start: number; end: number } | null {
  const found = timings.verses.find(([n]) => n === verse);
  return found ? { start: found[1], end: found[2] } : null;
}
