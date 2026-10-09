// src/nav/links.ts — Lampas takes links in, as Logos does (mw-5r3p30.65): https://lampas.allmymind.org/#/?ref=Rom.8.28 opens the reader on a
// verse, #/?word=G3551 (or the lemma) opens a word's sheet, and the browser's web+lampas: scheme (the manifest's protocol_handlers) lands on the
// same ref. This file is the pure part: reading the text of a link, finding the place or the word it names (against the book index and the
// lexicon, handed in), and writing the https form of a link. docs/links.md lists every form it accepts.
import { BOOKS, titleOf } from '../data/books';
import type { BookIndex, Chapter } from '../data/chapter';
import type { Lookup } from '../WordSheet';
import type { LemmaEntry, LemmaLexicon } from '../data/lexicon';
import { OT_BOOKS } from '../data/otBooks';
import type { OpenChapter } from '../data/readerChapter';
import { LINK_ORIGIN } from '../config';
import { pathOf } from './route';

/** Each book's OSIS code, which the links Lampas writes use: 'Rom', '1John'. */
export const OSIS: Readonly<Record<string, string>> = {
  mat: 'Matt', mrk: 'Mark', luk: 'Luke', jhn: 'John', act: 'Acts', rom: 'Rom', '1co': '1Cor', '2co': '2Cor', gal: 'Gal', eph: 'Eph',
  php: 'Phil', col: 'Col', '1th': '1Thess', '2th': '2Thess', '1ti': '1Tim', '2ti': '2Tim', tit: 'Titus', phm: 'Phlm', heb: 'Heb', jas: 'Jas',
  '1pe': '1Pet', '2pe': '2Pet', '1jn': '1John', '2jn': '2John', '3jn': '3John', jud: 'Jude', rev: 'Rev',
};

/** Other common short forms, beside the code, the OSIS code and the full name (all of those are added below). */
const EXTRA_NAMES: Readonly<Record<string, readonly string[]>> = {
  mat: ['mt'], mrk: ['mk', 'mr'], luk: ['lk'], jhn: ['jn'], act: ['ac'], rom: ['ro', 'rm'], gal: ['ga'], php: ['pp', 'philip'],
  '1th': ['1thes'], '2th': ['2thes'], phm: ['philem', 'pm'], jas: ['jam'], '1pe': ['1pt'], '2pe': ['2pt'], '1jn': ['1jhn', '1jo'],
  '2jn': ['2jhn', '2jo'], '3jn': ['3jhn', '3jo'], rev: ['re', 'revelations', 'apocalypse'],
};

/** A name as the matcher compares it: lower case, no spaces or dots ('1 John' -> '1john'). */
const squash = (name: string): string => name.toLowerCase().replace(/[\s.]/g, '');

const BOOK_BY_NAME: ReadonlyMap<string, string> = new Map(
  BOOKS.flatMap(({ code, name }) => [code, OSIS[code], name, ...(EXTRA_NAMES[code] ?? [])].map((n): [string, string] => [squash(n), code])),
);

/** What a reference says: the book's code, and the chapter and verse when it gives them. */
export interface Reference {
  book: string;
  chapter?: number;
  verse?: number;
}

/** The scheme the browser puts in front of a web+lampas: link it hands over. */
const SCHEME = /^web[+ ]lampas:\/*/i;

/** A reference as people write it ('Rom.8.28', 'Rom 8:28', 'Romans 8:28', '1 John 1:9', '1Jn.1.9', 'Rom 8', 'Romans'), or null when it names no
 * book Lampas could hold. A verse range keeps its first verse. */
export function parseReference(text: string): Reference | null {
  const named = /^([1-3]?)\s*([a-z]+)\.?\s*(.*)$/i.exec(text.trim().replace(SCHEME, '').replace(/\+/g, ' '));
  if (!named) return null;
  const book = BOOK_BY_NAME.get(squash(`${named[1]}${named[2]}`));
  if (!book) return null;
  return numbersOf(book, named[3].trim());
}

/** The chapter and verse that follow a book's name ('' for none, '8:28', '8 28', '8.28', '8:28-30' keeps the first verse), or null for anything else. */
function numbersOf(book: string, rest: string): Reference | null {
  if (rest === '') return { book };
  const numbers = /^(\d+)(?:(?:\s*[.:]\s*|\s+)(\d+))?(?:\s*[-–]\s*\d+)?$/.exec(rest);
  if (!numbers) return null;
  const reference: Reference = { book, chapter: Number(numbers[1]) };
  if (numbers[2] !== undefined) reference.verse = Number(numbers[2]);
  return reference;
}

/** Other common short forms of the Old Testament books, beside the code, the full name and Logos' abbreviation (data/otBooks.ts). */
const EXTRA_OT_NAMES: Readonly<Record<string, readonly string[]>> = {
  gen: ['gn'], exo: ['exod', 'exo'], lev: ['lv'], num: ['nm', 'nb'], deu: ['deut', 'dt'], jos: ['josh'], jdg: ['judg', 'jg'],
  '1sa': ['1sam'], '2sa': ['2sam'], '1ki': ['1kgs', '1kg', '1kin'], '2ki': ['2kgs', '2kg', '2kin'], '1ch': ['1chr', '1chron'], '2ch': ['2chr', '2chron'],
  neh: ['nehe'], est: ['esth'], psa: ['psalm', 'psalms', 'pss', 'psl'], pro: ['prov', 'prv'], ecc: ['eccl', 'eccles', 'qoh', 'qoheleth'],
  sng: ['song', 'sos', 'songofsongs', 'songofsolomon', 'canticles', 'sg'], isa: ['is'], jer: ['jr'], lam: ['lm'], ezk: ['ezek', 'eze'], dan: ['dn'],
  hos: ['hs'], jol: ['jl'], amo: ['amos'], oba: ['obad', 'ob'], jon: ['jnh'], mic: ['mc'], nam: ['nah'], hab: ['hb'], zep: ['zeph'], zec: ['zech'], mal: ['ml'],
};

/** The Old Testament's names, as the matcher compares them. A name the New Testament already uses stays the New Testament's (BOOK_BY_NAME is asked first). */
const OT_BY_NAME: ReadonlyMap<string, string> = new Map(
  OT_BOOKS.flatMap(({ code, name, logos }) => [code, name, logos, ...(EXTRA_OT_NAMES[code] ?? [])].map((n): [string, string] => [squash(n), code])),
);

/** A reference to any book of the Bible: `testament` says which list names the book (data/books.ts for the New, data/otBooks.ts for the Old). Lampas holds only
 *  the New Testament's text, so only a 'nt' reference can open the Reader. */
export interface CanonReference extends Reference {
  testament: 'nt' | 'ot';
}

/** `parseReference`, and the 39 books of the Old Testament as well ('Isaiah 53:5', 'Gen 15:6', 'Psalm 23', '1 Samuel 3:4', 'Song of Solomon 2:1'); null for a
 *  book of neither. Used for the references the tutor names; the links Lampas takes in (resolveReference) still know only the New Testament. */
export function parseCanonReference(text: string): CanonReference | null {
  const nt = parseReference(text);
  if (nt) return { testament: 'nt', ...nt };
  const named = /^((?:[1-3]\s*)?[a-z][a-z .]*?)\s*((?:\d.*)?)$/i.exec(text.trim().replace(SCHEME, '').replace(/\+/g, ' '));
  const book = named && OT_BY_NAME.get(squash(named[1]));
  const numbers = book && numbersOf(book, named[2].trim());
  return numbers ? { testament: 'ot', ...numbers } : null;
}

/** Where a reference opens the reader. `notice` is set when what was asked for is not what is shown. */
export interface Opened {
  book: string;
  chapter: number;
  /** the verse to select, or null for none */
  verse: number | null;
  notice: string | null;
}

/** The sentence that says what was asked for and what is shown instead. */
export const notHeld = (asked: string, shown: string): string => `“${asked}” is not in Lampas; showing ${shown}.`;

/** Where `text` opens the reader. A book or number Lampas does not hold opens the nearest it does (the last chapter or verse; chapter 0 and verse 0 the
 * first), a book it does not hold the chapter in `fallback`; either way with a notice. `index` null (the index could not be loaded) leaves the numbers
 * as written. */
export function resolveReference(text: string, index: BookIndex | null, fallback: OpenChapter): Opened {
  const asked = text.trim().replace(SCHEME, '');
  const parsed = parseReference(asked);
  const info = parsed && (index === null ? { chapters: Infinity, verses: [] as number[] } : index.books.find((b) => b.code === parsed.book));
  if (!parsed || !info) return { book: fallback.book, chapter: fallback.chapter, verse: null, notice: notHeld(asked, fallback.title) };
  const { book } = parsed;
  const wanted = parsed.chapter ?? 1;
  const chapter = Math.min(Math.max(wanted, 1), info.chapters);
  if (chapter !== wanted) return { book, chapter, verse: null, notice: notHeld(asked, titleOf(book, chapter)) };
  if (parsed.verse === undefined) return { book, chapter, verse: null, notice: null };
  const last = info.verses[chapter - 1];
  const verse = last === undefined ? Math.max(parsed.verse, 1) : Math.min(Math.max(parsed.verse, 1), last);
  return { book, chapter, verse, notice: verse === parsed.verse ? null : notHeld(asked, `${titleOf(book, chapter)}:${verse}`) };
}

/** A word as the lexicon has it. */
export interface FoundWord {
  lemma: string;
  entry: LemmaEntry;
}

/** A Greek word with its accents, breathings and capitals taken off, for matching a lemma typed without them. */
const bare = (word: string): string =>
  word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');

const indexes = new WeakMap<LemmaLexicon, { byStrongs: Map<string, string>; byBare: Map<string, string> }>();

function indexOf(lexicon: LemmaLexicon) {
  let held = indexes.get(lexicon);
  if (!held) {
    held = { byStrongs: new Map(), byBare: new Map() };
    for (const [lemma, entry] of Object.entries(lexicon)) {
      if (!held.byStrongs.has(entry.s)) held.byStrongs.set(entry.s, lemma);
      if (!held.byBare.has(bare(lemma))) held.byBare.set(bare(lemma), lemma);
    }
    indexes.set(lexicon, held);
  }
  return held;
}

/** The word a link names: a Strong's number ('G3551', 'g3551', '3551') or a lemma (accents optional), or undefined when the text never uses it. */
export function findWord(text: string, lexicon: LemmaLexicon): FoundWord | undefined {
  const wanted = text.trim();
  if (wanted === '') return undefined;
  const { byStrongs, byBare } = indexOf(lexicon);
  const number = /^[gG]?0*(\d+)$/.exec(wanted);
  const lemma = number ? byStrongs.get(`G${number[1]}`) : Object.hasOwn(lexicon, wanted.normalize('NFC')) ? wanted.normalize('NFC') : byBare.get(bare(wanted));
  return lemma === undefined ? undefined : { lemma, entry: lexicon[lemma] };
}

/** A link in the address: a reference to open the reader on, or a word to open the sheet of. */
export interface Link {
  kind: 'reference' | 'word';
  text: string;
}

/** The link an address carries, or null. The browser's web+lampas: form arrives as `ref=web+lampas:Rom.8.28`, and `web+lampas:word:G3551`
 * (or `word/G3551`) names a word. */
export function linkOf(hash: string): Link | null {
  if (pathOf(hash) !== '#/') return null;
  const q = hash.indexOf('?');
  const params = new URLSearchParams(q < 0 ? '' : hash.slice(q + 1));
  const ref = params.get('ref')?.trim().replace(SCHEME, '').trim();
  if (ref) {
    const word = /^(?:word|strongs)[:/]\s*(.+)$/i.exec(ref);
    return word ? { kind: 'word', text: word[1].trim() } : { kind: 'reference', text: ref };
  }
  const word = params.get('word')?.trim();
  return word ? { kind: 'word', text: word } : null;
}

/** The https link of a verse, a chapter (no verse) or a book's chapter, as Copy link gives it. */
export function referenceUrl(book: string, chapter: number, verse?: number): string {
  return `${LINK_ORIGIN}/#/?ref=${OSIS[book] ?? book}.${chapter}${verse === undefined ? '' : `.${verse}`}`;
}

/** The https link of a passage, a verse range as Logos writes it: '#/?ref=Rom.8.1-11' (parseReference keeps the first verse, so it opens the reader there). */
export function passageUrl(book: string, chapter: number, first: number, last: number): string {
  return `${LINK_ORIGIN}/#/?ref=${OSIS[book] ?? book}.${chapter}.${first}-${last}`;
}

/** The https link of a word, by its Strong's number. */
export function wordUrl(strongs: string): string {
  return `${LINK_ORIGIN}/#/?word=${encodeURIComponent(strongs)}`;
}

/** What the word sheet needs to show a word by itself, with no chapter around it: the word as its lemma stands (no parsing, no verse, so no Parsing row,
 * no Help with this word), its gloss and its Strong's number. */
export function lemmaSheet(word: { lemma: string; strongs: string; gloss: string }): { chapter: Chapter; lookup: Lookup } {
  const chapter: Chapter = {
    book: '',
    code: '',
    chapter: 0,
    lex: { [word.strongs]: { g: word.gloss, d: '' } },
    parse: {},
    verses: [],
  };
  return { chapter, lookup: { words: [{ t: word.lemma, tr: '', s: word.strongs, l: word.lemma, p: '' }], fromEnglish: false } };
}
