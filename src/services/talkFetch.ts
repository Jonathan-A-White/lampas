// src/services/talkFetch.ts — the text the tutor asks for without stopping the talk (mw-5r3p30.734). An answer may name passages in `fetch` ('Revelation 2:8-11'): the app reads
// them from its own chapter data after the answer is shown (the Greek, and the English the Reader shows), keeps them on the turn (TalkTurn.fetched), and every later request of
// the talk carries them as `held_passages`, newest first, as many as HELD_PASSAGES_BYTES holds. Under the answer one quiet line says what was read: 'Tutor fetched Rev 2:8-11'.
import { bookOf } from '../data/books';
import { loadChapter, markSupplied, sourceLanguage, type Chapter, type SourceLanguage, type Verse } from '../data/chapter';
import type { HeldPassage } from '../data/db';
import { osisOf, parseCanonReference } from '../nav/links';
import { hebrewPointedForm } from '../speech/hebrewPronunciation';
import type { HebrewLevel } from '../settings/definitions/hebrewInterest';

export type { HeldPassage };

/** The most references one answer's `fetch` names (the answer schema's maxItems). */
export const MAX_FETCH = 4;
/** The most verses one answer's `fetch` reads in all: a passage that goes over is cut, and those after it are not read. */
export const FETCH_MAX_VERSES = 30;
/** The most a request's `held_passages` weighs, as JSON in UTF-8 (about five verses of Greek and English); one passage read is cut to its first verses that fit it. */
export const HELD_PASSAGES_BYTES = 3000;
/** The most passages a request holds (the input schema's maxItems). */
export const MAX_HELD_PASSAGES = 8;

/** A verse's text in the chapter's own language as a request carries it (under `greek`, or under `hebrew` for a chapter of `lang` 'hbo'): the Greek words as they stand, or the Hebrew pointed, the cantillation
 * off (the form the Verse view's `hebrew` is, src/services/tutor.ts). The English is the verse's with the supplied words marked. */
export const verseSource = (chapter: Pick<Chapter, 'lang'>, v: Verse): string => v.g.map((w) => (sourceLanguage(chapter) === 'grc' ? w.t : hebrewPointedForm(w.t))).join(' ');
export const verseEnglish = (v: Verse): string => v.e.map(markSupplied).join(' ');

const bytesOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** What a fetch asks to read: a book of either Testament (never the Apocrypha, which Lampas holds no text of), a chapter it has, and the verses from `from` to `to`. */
export interface Wanted {
  book: string;
  chapter: number;
  from: number;
  to: number;
}

/** The passages `refs` name that the app could read, in the order named, each once: at most MAX_FETCH references and FETCH_MAX_VERSES verses in all. A chapter named whole is
 * its verses from the first. A reference of either Testament is read (mw-fnvjof.17.314: an Old Testament one was left out, which shut the way to the rest of a chapter talk's chapter); an Apocrypha
 * reference, a book or chapter that does not exist and a range across chapters are left out. */
export function wantedOf(refs: readonly string[]): Wanted[] {
  const wanted: Wanted[] = [];
  let left = FETCH_MAX_VERSES;
  for (const ref of refs.slice(0, MAX_FETCH)) {
    const r = parseCanonReference(ref);
    const book = r && r.testament !== 'ap' ? bookOf(r.book) : undefined;
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

/** The passage of `verses` (of a chapter in `lang`), cut to its first verses that fit HELD_PASSAGES_BYTES (always one at least). An Old Testament passage carries its Hebrew only while `hebrewOn`
 * (the Hebrew dial at Curious or above, as the request's own text does, src/services/talk.ts): at Just English it holds the English alone (mw-fnvjof.17.333). */
export function passageOf(book: string, chapter: number, verses: readonly Verse[], lang: SourceLanguage = 'grc', hebrewOn = true): HeldPassage {
  let kept = verses;
  for (;;) {
    const text = kept.map((v) => verseSource({ lang }, v)).join(' ');
    const source = lang === 'grc' ? { greek: text } : hebrewOn ? { hebrew: text } : {};
    const passage = { reference: referenceOf(book, chapter, kept), ...source, english: kept.map(verseEnglish).join(' ') };
    if (kept.length <= 1 || bytesOf(passage) <= HELD_PASSAGES_BYTES) return passage;
    kept = kept.slice(0, -1);
  }
}

/** What a fetch came to (mw-5r3p30.825): the passages read, and the references of the answer that gave nothing, written as the tutor named them. */
export interface FetchOutcome {
  read: HeldPassage[];
  unread: string[];
}

/** 'Revelation 6:2-7' -> its book's name, chapter and first verse; null for a reference in no such form. */
const startOf = (reference: string): string | null => {
  const m = /^(.+) (\d+):(\d+)/.exec(reference);
  return m ? `${m[1]} ${m[2]}:${Number(m[3])}` : null;
};

/** Reads the passages an answer's `fetch` names from the app's chapter data (`load`, loadChapter): a chapter that does not load and verses it does not have are left out, each reference left out is
 * returned in `unread`; it never throws. `hebrewLevel` is the Hebrew dial (`settings.hebrewInterest` as the request read it): an Old Testament passage is read with its Hebrew from step 1 up and
 * with the English alone at 0 (mw-fnvjof.17.333). */
export async function fetchOutcome(refs: readonly string[], load: (book: string, chapter: number) => Promise<Chapter> = loadChapter, hebrewLevel: HebrewLevel = 1): Promise<FetchOutcome> {
  const read: HeldPassage[] = [];
  for (const want of wantedOf(refs)) {
    const chapter = await load(want.book, want.chapter).catch(() => undefined);
    const verses = chapter?.verses.filter((v) => v.n >= want.from && v.n <= want.to) ?? [];
    if (verses.length === 0) continue;
    const passage = passageOf(want.book, want.chapter, verses, sourceLanguage({ lang: chapter?.lang }), hebrewLevel >= 1);
    if (!read.some((p) => p.reference === passage.reference)) read.push(passage);
  }
  const got = new Set(read.map((p) => startOf(p.reference)));
  const unread: string[] = [];
  for (const ref of refs.slice(0, MAX_FETCH)) {
    const want = wantedOf([ref])[0];
    const start = want ? startOf(`${bookOf(want.book)?.name ?? want.book} ${want.chapter}:${want.from}`) : null;
    const name = ref.trim();
    if (!(start && got.has(start)) && !unread.includes(name)) unread.push(name);
  }
  return { read, unread };
}

/** The passages `fetchOutcome` read. */
export const fetchPassages = async (refs: readonly string[], load?: (book: string, chapter: number) => Promise<Chapter>, hebrewLevel?: HebrewLevel): Promise<HeldPassage[]> => (await fetchOutcome(refs, load, hebrewLevel)).read;

/** 'Rev 2:8-11', '1 John 1:9': a reference by its book's short name. */
function shortReference(reference: string): string {
  const parts = /^(.+?) (\d+(?::\d+(?:-\d+)?)?)$/.exec(reference);
  const r = parseCanonReference(reference);
  const code = r && r.testament !== 'ap' ? osisOf(r.book) : undefined;
  return parts && code ? `${code.replace(/^(\d)/, '$1 ')} ${parts[2]}` : reference;
}

/** The quiet line under an answer whose fetch read nothing, or not all: 'Could not read Isaiah 53:5'. */
export const unreadLine = (references: readonly string[]): string => `Could not read ${references.join(', ')}`;

/** The quiet line under an answer whose fetch was read: 'Tutor fetched Rev 2:8-11, Heb 7:1-3'. */
export const fetchedLine = (passages: readonly HeldPassage[]): string => `Tutor fetched ${passages.map((p) => shortReference(p.reference)).join(', ')}`;

/** The passages a talk holds: those its turns fetched (`turns` oldest first), the newest turn's first, each reference once, as many as HELD_PASSAGES_BYTES holds; an older one that does not fit drops off. */
export function heldPassagesOf(turns: readonly { fetched?: readonly HeldPassage[] }[]): HeldPassage[] {
  const held: HeldPassage[] = [];
  for (const turn of [...turns].reverse()) {
    for (const passage of turn.fetched ?? []) {
      if (held.some((p) => p.reference === passage.reference)) continue;
      if (held.length >= MAX_HELD_PASSAGES || bytesOf([...held, passage]) > HELD_PASSAGES_BYTES) return held;
      held.push({ reference: passage.reference, ...(passage.hebrew !== undefined ? { hebrew: passage.hebrew } : passage.greek !== undefined ? { greek: passage.greek } : {}), english: passage.english });
    }
  }
  return held;
}
