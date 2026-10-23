// src/services/talkFetch.ts — the text the tutor asks for without stopping the talk (mw-5r3p30.734). An answer may name passages in `fetch` ('Revelation 2:8-11'): the app reads
// them from its own chapter data after the answer is shown (the Greek, and the English the Reader shows), keeps them on the turn (TalkTurn.fetched), and every later request of
// the talk carries them as `held_passages`, newest first, as many as HELD_PASSAGES_BYTES holds. Under the answer one quiet line says what was read: 'Tutor fetched Rev 2:8-11'.
import { bookOf } from '../data/books';
import { loadChapter, markSupplied, type Chapter, type Verse } from '../data/chapter';
import type { HeldPassage } from '../data/db';
import { OSIS, parseReference } from '../nav/links';

export type { HeldPassage };

/** The most references one answer's `fetch` names (the answer schema's maxItems). */
export const MAX_FETCH = 4;
/** The most verses one answer's `fetch` reads in all: a passage that goes over is cut, and those after it are not read. */
export const FETCH_MAX_VERSES = 30;
/** The most a request's `held_passages` weighs, as JSON in UTF-8 (about five verses of Greek and English); one passage read is cut to its first verses that fit it. */
export const HELD_PASSAGES_BYTES = 3000;
/** The most passages a request holds (the input schema's maxItems). */
export const MAX_HELD_PASSAGES = 8;

/** A verse's Greek and English as a request carries them: the words of the text, and the English with the supplied words marked. */
export const verseGreek = (v: Verse): string => v.g.map((w) => w.t).join(' ');
export const verseEnglish = (v: Verse): string => v.e.map(markSupplied).join(' ');

const bytesOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** What a fetch asks to read: a book of the New Testament, a chapter it has, and the verses from `from` to `to`. */
export interface Wanted {
  book: string;
  chapter: number;
  from: number;
  to: number;
}

/** The passages `refs` name that the app could read, in the order named, each once: at most MAX_FETCH references and FETCH_MAX_VERSES verses in all. A chapter named whole is
 * its verses from the first. An Old Testament reference, a book or chapter that does not exist and a range across chapters are left out. */
export function wantedOf(refs: readonly string[]): Wanted[] {
  const wanted: Wanted[] = [];
  let left = FETCH_MAX_VERSES;
  for (const ref of refs.slice(0, MAX_FETCH)) {
    const r = parseReference(ref);
    const book = r && bookOf(r.book);
    if (!r || !book || r.chapter === undefined || r.chapter < 1 || r.chapter > book.chapters || left <= 0) continue;
    const from = r.verse ?? 1;
    const to = Math.min(r.verse === undefined ? from + left - 1 : (r.to ?? r.verse), from + left - 1);
    if (wanted.some((w) => w.book === r.book && w.chapter === r.chapter && w.from === from && w.to === to)) continue;
    wanted.push({ book: r.book, chapter: r.chapter, from, to });
    left -= to - from + 1;
  }
  return wanted;
}

/** 'Revelation 2:8-11', 'Romans 8:28'. */
const referenceOf = (book: string, chapter: number, verses: readonly Verse[]): string => {
  const first = verses[0].n;
  const last = verses[verses.length - 1].to ?? verses[verses.length - 1].n;
  return `${bookOf(book)?.name ?? book} ${chapter}:${first}${last > first ? `-${last}` : ''}`;
};

/** The passage of `verses`, cut to its first verses that fit HELD_PASSAGES_BYTES (always one at least). */
function passageOf(book: string, chapter: number, verses: readonly Verse[]): HeldPassage {
  let kept = verses;
  for (;;) {
    const passage = { reference: referenceOf(book, chapter, kept), greek: kept.map(verseGreek).join(' '), english: kept.map(verseEnglish).join(' ') };
    if (kept.length <= 1 || bytesOf(passage) <= HELD_PASSAGES_BYTES) return passage;
    kept = kept.slice(0, -1);
  }
}

/** Reads the passages an answer's `fetch` names from the app's chapter data (`load`, loadChapter): a chapter that does not load and verses it does not have are left out; it never throws. */
export async function fetchPassages(refs: readonly string[], load: (book: string, chapter: number) => Promise<Chapter> = loadChapter): Promise<HeldPassage[]> {
  const read: HeldPassage[] = [];
  for (const want of wantedOf(refs)) {
    const chapter = await load(want.book, want.chapter).catch(() => undefined);
    const verses = chapter?.verses.filter((v) => v.n >= want.from && v.n <= want.to) ?? [];
    if (verses.length === 0) continue;
    const passage = passageOf(want.book, want.chapter, verses);
    if (!read.some((p) => p.reference === passage.reference)) read.push(passage);
  }
  return read;
}

/** 'Rev 2:8-11', '1 John 1:9': a reference by its book's short name. */
function shortReference(reference: string): string {
  const parts = /^(.+?) (\d+(?::\d+(?:-\d+)?)?)$/.exec(reference);
  const r = parseReference(reference);
  const code = r && OSIS[r.book];
  return parts && code ? `${code.replace(/^(\d)/, '$1 ')} ${parts[2]}` : reference;
}

/** The quiet line under an answer whose fetch was read: 'Tutor fetched Rev 2:8-11, Heb 7:1-3'. */
export const fetchedLine = (passages: readonly HeldPassage[]): string => `Tutor fetched ${passages.map((p) => shortReference(p.reference)).join(', ')}`;

/** The passages a talk holds: those its turns fetched (`turns` oldest first), the newest turn's first, each reference once, as many as HELD_PASSAGES_BYTES holds; an older one that does not fit drops off. */
export function heldPassagesOf(turns: readonly { fetched?: readonly HeldPassage[] }[]): HeldPassage[] {
  const held: HeldPassage[] = [];
  for (const turn of [...turns].reverse()) {
    for (const passage of turn.fetched ?? []) {
      if (held.some((p) => p.reference === passage.reference)) continue;
      if (held.length >= MAX_HELD_PASSAGES || bytesOf([...held, passage]) > HELD_PASSAGES_BYTES) return held;
      held.push({ reference: passage.reference, greek: passage.greek, english: passage.english });
    }
  }
  return held;
}
