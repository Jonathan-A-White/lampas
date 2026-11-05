// scripts/data/lxxChapter.ts — the Septuagint's chapters in the chapter shape (src/data/chapter.ts, docs/data.md 'The Septuagint data'; story mw-u2w5klk.10, the epic's R2).
// The pure parts of scripts/data-build-lxx.ts: they take the sources as text and return the chapters, so the tests read fixtures and never the network.
// A book's Greek is Swete's (scripts/lxx/swete.ts: each token as he prints it, brackets and capitals kept), joined by reference with the rows of the MIT annotation file
// (data/lxx/annotations/<book>.tsv: lemma, parsing, layer, confidence) and by line number with the SBL transliteration. The English is Brenton's (LXX2012), which is not
// word-aligned: a Greek verse's English is ONE chunk, and each Greek verse says which verse of Lampas's own Old Testament it is (`ref`, from STEPBible's TVTMS).
import { decodeParse } from '../../src/data/parseCode';
import type { BookInfo, Chapter, EnglishChunk, GreekWord, Verse, VerseRef } from '../../src/data/chapter';
import { bookOf, sweteTokens, type SweteWord } from '../lxx/swete';
import type { UsfmBook } from './lxx2012';
import { carriedAsGreek } from './lxx2012';
import { chapterFingerprint } from './chapterWriter';
import { OT_BOOKS, refOf, type TvtmsMaps } from './tvtms';

// ---------------------------------------------------------------- the books

/** Swete's book codes (lower case, as data/lxx/annotations names a file) of the books Lampas names; the rest of his sixty have no name here until one is shipped. */
const NAMES: ReadonlyArray<readonly [code: string, name: string]> = [
  ['gen', 'Genesis'], ['exo', 'Exodus'], ['lev', 'Leviticus'], ['num', 'Numbers'], ['deu', 'Deuteronomy'], ['jos', 'Joshua'], ['jdg', 'Judges'], ['rut', 'Ruth'],
  ['1sa', '1 Samuel'], ['2sa', '2 Samuel'], ['1ki', '1 Kings'], ['2ki', '2 Kings'], ['1ch', '1 Chronicles'], ['2ch', '2 Chronicles'], ['ezr', 'Ezra'], ['neh', 'Nehemiah'],
  ['est', 'Esther'], ['job', 'Job'], ['psa', 'Psalms'], ['pro', 'Proverbs'], ['ecc', 'Ecclesiastes'], ['sol', 'Song of Solomon'], ['isa', 'Isaiah'], ['jer', 'Jeremiah'],
  ['lam', 'Lamentations'], ['eze', 'Ezekiel'], ['dan', 'Daniel'], ['hos', 'Hosea'], ['joe', 'Joel'], ['amo', 'Amos'], ['oba', 'Obadiah'], ['jon', 'Jonah'],
  ['mic', 'Micah'], ['nah', 'Nahum'], ['hab', 'Habakkuk'], ['zep', 'Zephaniah'], ['hag', 'Haggai'], ['zec', 'Zechariah'], ['mal', 'Malachi'],
  ['1es', '1 Esdras'], ['wis', 'Wisdom of Solomon'], ['sir', 'Sirach'], ['jdt', 'Judith'], ['bar', 'Baruch'], ['epj', 'Epistle of Jeremiah'],
  ['1ma', '1 Maccabees'], ['2ma', '2 Maccabees'], ['3ma', '3 Maccabees'], ['4ma', '4 Maccabees'],
];
const NAME_OF = new Map(NAMES);

/** Where Swete's code for a book is not the code Lampas, TVTMS and LXX2012 use (four books of the Old Testament). */
const AS_LAMPAS: Readonly<Record<string, string>> = { sol: 'sng', joe: 'jol', eze: 'ezk', nah: 'nam' };

/** The code of a Swete book in Lampas's Old Testament, TVTMS and the LXX2012 USFM (`sol` is `sng`); undefined for a book outside the 39 (the Apocrypha, which Lampas has no verse for). */
export function lampasCodeOf(sweteCode: string): string | undefined {
  const code = AS_LAMPAS[sweteCode] ?? sweteCode;
  return OT_BOOKS.includes(code) ? code : undefined;
}

/** The code the LXX2012 file of a Swete book is named by (`gen`, `sng`). */
export const usfmCodeOf = (sweteCode: string): string => AS_LAMPAS[sweteCode] ?? sweteCode;

// ---------------------------------------------------------------- the annotation file

export interface AnnotationRow {
  ref: string;
  lemma: string;
  parsing: string;
  /** '1', '2', '2a' or '3' */
  layer: string;
  confidence: number;
}

const ANNOTATION_COLUMNS = ['ref', 'lemma', 'parsing', 'layer', 'confidence'];

/** A book's annotation file (docs/lxx-derivation.md 'The annotation file'): comment lines (`# shipped chapters: 1-6 of 50`), a header row, then `ref lemma parsing layer confidence notes`. A row given twice, or a header that is not the file's, stops the build. */
export function parseAnnotations(text: string, book: string): Map<string, AnnotationRow> {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l !== '' && !l.startsWith('#'));
  const header = (lines.shift() ?? '').split('\t');
  if (ANNOTATION_COLUMNS.some((name, i) => header[i] !== name)) throw new Error(`${book}: the annotation file's header row is not ${ANNOTATION_COLUMNS.join(', ')}, ...`);
  const rows = new Map<string, AnnotationRow>();
  lines.forEach((line, i) => {
    const [ref, lemma, parsing, layer, confidence] = line.split('\t');
    const where = `${book}: annotation line ${i + 2}`;
    if (!ref || !lemma || !parsing || !layer) throw new Error(`${where} lacks a column`);
    if (!/^(1|2|2a|3)$/.test(layer)) throw new Error(`${where}: ${ref} has the layer ${JSON.stringify(layer)}`);
    const c = Number(confidence);
    if (!Number.isFinite(c) || c < 0 || c > 1) throw new Error(`${where}: ${ref} has the confidence ${JSON.stringify(confidence)}`);
    if (rows.has(ref)) throw new Error(`${book}: the annotation file has ${ref} twice`);
    rows.set(ref, { ref, lemma: lemma.normalize('NFC'), parsing, layer, confidence: c });
  });
  return rows;
}

const SHIPPED_LINE = /^# shipped chapters: (?:all (\d+)|(\d+(?:-\d+)?(?:, \d+(?:-\d+)?)*) of (\d+))$/m;

/** Chapter numbers as ranges: [1, 2, 3, 5] is '1-3, 5' (ascending numbers). */
export function chapterRanges(chapters: readonly number[]): string {
  const out: string[] = [];
  for (let i = 0; i < chapters.length; ) {
    let j = i;
    while (j + 1 < chapters.length && chapters[j + 1] === chapters[j] + 1) j++;
    out.push(j > i ? `${chapters[i]}-${chapters[j]}` : String(chapters[i]));
    i = j + 1;
  }
  return out.join(', ');
}

/** The Greek chapters a partly shipped book's file names in its `# shipped chapters:` line (`1-2, 4-6 of 50` is 1, 2, 4, 5, 6; `all 50` is 'all') and the book's chapter count; undefined where the file has no such line. */
export function shippedChaptersLine(text: string): { chapters: number[] | 'all'; of: number } | undefined {
  const m = SHIPPED_LINE.exec(text);
  if (!m) return undefined;
  if (m[1]) return { chapters: 'all', of: Number(m[1]) };
  const chapters = m[2].split(', ').flatMap((part) => {
    const [from, to = from] = part.split('-').map(Number);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
  return { chapters, of: Number(m[3]) };
}

/** Below this confidence the word is a guess, whatever layer found it. */
export const GUESS_BELOW = 0.5;

/** The `y` a word carries: its layer, or 'g' for a guess. */
export const layerKey = (row: AnnotationRow): string => (row.confidence < GUESS_BELOW ? 'g' : row.layer);

// ---------------------------------------------------------------- the transliteration

/** The SBL transliteration file: 'line\ttext', the line of the word file it belongs to (an editor's sign has an empty one). */
export function parseTranslit(text: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const n = Number(line.slice(0, tab));
    if (Number.isInteger(n) && n > 0) out.set(n, line.slice(tab + 1).trim());
  }
  return out;
}

// ---------------------------------------------------------------- the English

/** A Psalm's title as LXX2012 has it, "(23) A Psalm of David.": without the number of the Psalm in the numbering it is not in (the chunk is the title's words). */
const titleWords = (title: string): string => title.replace(/^\(\d+\)\s*/, '');

interface Segment {
  text: string;
  supplied: number[];
}

/**
 * The English of each Greek verse of a book, by the Greek reference ('psa 22:2'): LXX2012's verses (and a Psalm's title, which the Greek counts as verse 1) walked through
 * TVTMS from the USFM's numbers to the Greek's. A Brenton verse that answers several Greek verses stands at the first; one that answers a Greek verse of no
 * Swete book (its reference is not one of the Greek's verses) is in `unplaced`.
 */
export function englishByGreekVerse(book: UsfmBook, maps: TvtmsMaps): { byGreek: Map<string, Segment[]>; placedAt: Map<string, string> } {
  const byGreek = new Map<string, Segment[]>();
  const placedAt = new Map<string, string>();
  const put = (usfm: string, greek: readonly string[], segment: Segment): void => {
    if (greek.length === 0) return;
    placedAt.set(usfm, greek[0]);
    const list = byGreek.get(greek[0]);
    if (list) list.push(segment);
    else byGreek.set(greek[0], [segment]);
  };
  for (const chapter of book.chapters) {
    if (chapter.title !== undefined) {
      const ref = refOf(book.code, chapter.chapter, 'T');
      put(ref, maps.lxx2012ToGreek(ref).refs, { text: titleWords(chapter.title), supplied: [] });
    }
    for (const verse of chapter.verses) {
      const last = verse.through ?? verse.verse;
      const greek: string[] = [];
      for (let v = verse.verse; v <= last; v++) {
        const g = carriedAsGreek(book.code, verse.chapter, v);
        for (const ref of maps.lxx2012ToGreek(refOf(book.code, g.chapter, g.verse)).refs) if (!greek.includes(ref)) greek.push(ref);
      }
      put(refOf(book.code, verse.chapter, verse.verse), greek, { text: verse.text, supplied: verse.supplied });
    }
  }
  return { byGreek, placedAt };
}

/** The segments of one Greek verse as one chunk: their texts joined by a space, the supplied positions moved on by the words before. */
function oneChunk(segments: readonly Segment[], wordCount: number): EnglishChunk | undefined {
  const parts = segments.filter((s) => s.text !== '');
  if (parts.length === 0) return undefined;
  const supplied: number[] = [];
  let offset = 0;
  for (const part of parts) {
    for (const i of part.supplied) supplied.push(i + offset);
    offset += part.text.split(/\s+/).filter(Boolean).length;
  }
  const chunk: EnglishChunk = { t: parts.map((s) => s.text).join(' '), g: Array.from({ length: wordCount }, (_, i) => i) };
  if (supplied.length) chunk.s = supplied;
  return chunk;
}

// ---------------------------------------------------------------- the verse map

/** Lampas's verse counts by book code (public/data/index.json): a Greek verse is a Lampas verse only where Lampas has one. */
export type LampasVerses = Readonly<Record<string, readonly number[]>>;

const parseRef = (ref: string): VerseRef | undefined => {
  const m = /^(\S+) (\d+):(\d+)$/.exec(ref);
  return m ? { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) } : undefined;
};

/** The Lampas verse(s) of a Greek verse: `none` for a book Lampas lacks, a verse TVTMS gives no counterpart, or (when the counts are given) a verse beyond the chapter's end. */
export function lampasRefs(sweteCode: string, chapter: number, verse: number, maps: TvtmsMaps, counts?: LampasVerses): VerseRef[] {
  const code = lampasCodeOf(sweteCode);
  if (!code) return [];
  const mapped = maps.toLampas(refOf(code, chapter, verse));
  if (mapped.state === 'none') return [];
  return mapped.refs.flatMap((r) => {
    const ref = parseRef(r);
    if (!ref || !OT_BOOKS.includes(ref.book)) return [];
    if (counts && (counts[ref.book]?.[ref.chapter - 1] ?? 0) < ref.verse) return [];
    return [ref];
  });
}

// ---------------------------------------------------------------- a book

/** What the build holds of one Swete book. */
export interface LxxBookSource {
  /** Swete's code, lower case: `gen` */
  code: string;
  words: readonly SweteWord[];
  /** the SBL transliteration by line of the word file */
  translit: ReadonlyMap<number, string>;
  annotations: ReadonlyMap<string, AnnotationRow>;
  /** the LXX2012 book, when there is one */
  english?: UsfmBook;
}

export interface BuiltLxxChapter {
  /** `gen/1.json` */
  path: string;
  chapter: Chapter;
}

/** One book of public/data-lxx/index.json. */
export interface LxxBookInfo extends BookInfo {
  /** the code of the book in Lampas's own Old Testament (`sng` for Swete's `sol`); absent for a book Lampas has none of */
  lampas?: string;
  /** per Greek chapter, the chapter(s) of Lampas's Old Testament its verses are in, ascending; empty where none of them is a Lampas verse, and for a chapter not shipped, and for a Lampas chapter some of whose verses are in a Greek chapter not shipped */
  lampasChapters: number[][];
  /** the Greek chapters shipped, ascending (mw-u2w5klk.265: a book ships chapter by chapter); `chapters` is the book's count, shipped or not */
  shipped: number[];
}

export interface BuiltLxxBook {
  chapters: BuiltLxxChapter[];
  info: LxxBookInfo;
  /** every distinct lemma of the book, in order of first use */
  lemmas: string[];
  /** the verses of LXX2012 with no Greek verse of the book to stand at */
  unplaced: string[];
}

/**
 * One book as chapters. It stops, naming the reference, at an annotation row for a word Swete's text lacks and at a word with no row; a word with no
 * transliteration, or a parsing code Lampas cannot put in words, stops it too.
 */
export function buildLxxBook(src: LxxBookSource, maps: TvtmsMaps, counts?: LampasVerses): BuiltLxxBook {
  const name = NAME_OF.get(src.code);
  if (!name) throw new Error(`${src.code}: no book name for this Swete book in scripts/data/lxxChapter.ts`);
  const here = new Set(src.words.map((w) => w.ref));
  for (const ref of src.annotations.keys()) if (!here.has(ref)) throw new Error(`${src.code}: the annotation file has a row for ${ref}, which Swete's text lacks`);

  const english = src.english ? englishByGreekVerse(src.english, maps) : undefined;
  const usfm = usfmCodeOf(src.code);
  const lemmas = new Set<string>();
  const used = new Set<string>();

  // chapter -> verse -> words, in Swete's order
  const chapters = new Map<number, Map<number, SweteWord[]>>();
  for (const w of src.words) {
    const m = /^[^.]+\.(\d+):(\d+)$/.exec(w.verse);
    if (!m) throw new Error(`${src.code}: ${w.ref} is not a reference like Gen.1:20#13`);
    const chapter = chapters.get(Number(m[1])) ?? new Map<number, SweteWord[]>();
    chapters.set(Number(m[1]), chapter);
    chapter.set(Number(m[2]), [...(chapter.get(Number(m[2])) ?? []), w]);
  }

  // A Greek chapter ships when the annotation file has rows for it (lxx:release writes the rows of the shippable chapters only, mw-u2w5klk.265); a chapter with some of its rows only stops the build
  const rowChapters = new Set([...src.annotations.keys()].map((ref) => Number(/^[^.]+\.(\d+):/.exec(ref)![1])));
  const shipped = new Set([...chapters.keys()].filter((n) => rowChapters.has(n)));
  for (const w of src.words) {
    if (shipped.has(Number(/^[^.]+\.(\d+):/.exec(w.ref)![1])) && !src.annotations.has(w.ref)) throw new Error(`${src.code}: ${w.ref} has no row in the annotation file`);
  }
  if (shipped.size === 0) throw new Error(`${src.code}: ${src.words[0]?.ref} has no row in the annotation file`);

  const lampas = lampasCodeOf(src.code);
  const refsOf = new Map<string, VerseRef[]>();
  // which Greek chapters each Lampas chapter's verses are in, over the whole book: a Lampas chapter is opened from the Septuagint only when every one of them is shipped
  const insideGreek = new Map<number, Set<number>>();
  for (const [n, verseMap] of chapters) {
    for (const v of verseMap.keys()) {
      const refs = lampasRefs(src.code, n, v, maps, counts);
      refsOf.set(`${n}:${v}`, refs);
      for (const r of refs) {
        if (r.book !== lampas) continue;
        const set = insideGreek.get(r.chapter) ?? new Set<number>();
        insideGreek.set(r.chapter, set.add(n));
      }
    }
  }
  const ready = (lampasChapter: number): boolean => [...(insideGreek.get(lampasChapter) ?? [])].every((n) => shipped.has(n));

  const built: BuiltLxxChapter[] = [];
  const info: LxxBookInfo = { code: src.code, name, chapters: Math.max(...chapters.keys()), verses: [], fingerprints: [], lang: 'grc', lampasChapters: [], shipped: [...shipped].sort((a, b) => a - b) };
  if (lampas) info.lampas = lampas;

  for (const [n, verseMap] of [...chapters].sort(([a], [b]) => a - b)) {
    if (!shipped.has(n)) continue;
    const parses = new Map<string, string>();
    const verses: Verse[] = [];
    const lampasHere = new Set<number>();
    for (const [v, words] of [...verseMap].sort(([a], [b]) => a - b)) {
      const greekRef = refOf(usfm, n, v);
      used.add(greekRef);
      const chunk = english ? oneChunk(english.byGreek.get(greekRef) ?? [], words.length) : undefined;
      const g: GreekWord[] = words.map((w) => {
        const row = src.annotations.get(w.ref)!;
        const translit = src.translit.get(w.line);
        if (translit === undefined || translit === '') throw new Error(`${src.code}: ${w.ref} has no transliteration (line ${w.line})`);
        if (!parses.has(row.parsing)) {
          try {
            parses.set(row.parsing, decodeParse(row.parsing));
          } catch {
            throw new Error(`${src.code}: ${w.ref} has the parsing ${JSON.stringify(row.parsing)}, which Lampas cannot put in words`);
          }
        }
        lemmas.add(row.lemma);
        return { t: w.display.normalize('NFC'), tr: translit.normalize('NFC'), s: '', l: row.lemma, p: row.parsing, y: layerKey(row), c: row.confidence, ...(chunk ? { e: 0 } : {}) };
      });
      const refs = refsOf.get(`${n}:${v}`) ?? [];
      refs.forEach((r) => r.book === lampas && ready(r.chapter) && lampasHere.add(r.chapter));
      verses.push({
        n: v,
        ref: refs.length === 0 ? 'none' : refs[0],
        ...(refs.length > 1 ? { refs } : {}),
        g,
        e: chunk ? [chunk] : [],
      });
    }
    const chapter: Chapter = {
      book: name,
      code: src.code,
      chapter: n,
      lang: 'grc',
      translation: 'lxx2012',
      edition: 'swete',
      lex: {},
      parse: Object.fromEntries([...parses].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
      verses,
    };
    built.push({ path: `${src.code}/${n}.json`, chapter });
    info.verses[n - 1] = verses.length;
    info.fingerprints[n - 1] = chapterFingerprint(chapter);
    info.lampasChapters[n - 1] = [...lampasHere].sort((a, b) => a - b);
  }
  // a chapter number Swete's text does not have (a gap), and a chapter not shipped (yet), is 0 verses with no fingerprint and no Lampas chapter
  for (let i = 0; i < info.chapters; i++) {
    info.verses[i] ??= 0;
    info.fingerprints[i] ??= '';
    info.lampasChapters[i] ??= [];
  }
  const unplaced = english ? [...english.placedAt].filter(([, greek]) => !used.has(greek)).map(([usfmRef]) => usfmRef) : [];
  return { chapters: built, info, lemmas: [...lemmas], unplaced };
}

/** The books of Swete's file by code (lower case), each with its tokens; the text a run reads is all of it once. */
export function sweteBooks(versification: string, wordFile: string): Map<string, SweteWord[]> {
  const books = new Map<string, SweteWord[]>();
  for (const w of sweteTokens(versification, wordFile).words) {
    const code = bookOf(w.verse).toLowerCase();
    const list = books.get(code);
    if (list) list.push(w);
    else books.set(code, [w]);
  }
  return books;
}
