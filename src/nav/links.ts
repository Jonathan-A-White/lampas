// src/nav/links.ts — Lampas takes links in, as Logos does (mw-5r3p30.65): https://lampas.allmymind.org/#/?ref=Rom.8.28 opens the reader on a
// verse, #/?word=G3551 (or the lemma) opens a word's sheet, and the browser's web+lampas: scheme (the manifest's protocol_handlers) lands on the
// same ref. This file is the pure part: reading the text of a link, finding the place or the word it names (against the book index and the
// lexicon, handed in), and writing the https form of a link. docs/links.md lists every form it accepts.
import { BOOKS, bookOf, titleOf } from '../data/books';
import type { BookIndex, Chapter } from '../data/chapter';
import type { Lookup } from '../WordSheet';
import type { LemmaEntry, LemmaLexicon } from '../data/lexicon';
import { OT_BOOKS, otBookOf } from '../data/otBooks';
import type { OpenChapter } from '../data/readerChapter';
import { LINK_ORIGIN } from '../config';
import { pathOf } from './route';

/** Each book's OSIS code, which the links Lampas writes use: 'Rom', '1John'. */
export const OSIS: Readonly<Record<string, string>> = {
  mat: 'Matt', mrk: 'Mark', luk: 'Luke', jhn: 'John', act: 'Acts', rom: 'Rom', '1co': '1Cor', '2co': '2Cor', gal: 'Gal', eph: 'Eph',
  php: 'Phil', col: 'Col', '1th': '1Thess', '2th': '2Thess', '1ti': '1Tim', '2ti': '2Tim', tit: 'Titus', phm: 'Phlm', heb: 'Heb', jas: 'Jas',
  '1pe': '1Pet', '2pe': '2Pet', '1jn': '1John', '2jn': '2John', '3jn': '3John', jud: 'Jude', rev: 'Rev',
};

/** The Old Testament books' OSIS codes, for the links to a reference outside the New Testament ('Gen.1.28'; data/otBooks.ts has the names). */
export const OT_OSIS: Readonly<Record<string, string>> = {
  gen: 'Gen', exo: 'Exod', lev: 'Lev', num: 'Num', deu: 'Deut', jos: 'Josh', jdg: 'Judg', rut: 'Ruth', '1sa': '1Sam', '2sa': '2Sam', '1ki': '1Kgs',
  '2ki': '2Kgs', '1ch': '1Chr', '2ch': '2Chr', ezr: 'Ezra', neh: 'Neh', est: 'Esth', job: 'Job', psa: 'Ps', pro: 'Prov', ecc: 'Eccl', sng: 'Song',
  isa: 'Isa', jer: 'Jer', lam: 'Lam', ezk: 'Ezek', dan: 'Dan', hos: 'Hos', jol: 'Joel', amo: 'Amos', oba: 'Obad', jon: 'Jonah', mic: 'Mic',
  nam: 'Nah', hab: 'Hab', zep: 'Zeph', hag: 'Hag', zec: 'Zech', mal: 'Mal',
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
  /** the last verse of a range ('Heb 7:1-3'), when it is after `verse` */
  to?: number;
}

/** The scheme the browser puts in front of a web+lampas: link it hands over. */
const SCHEME = /^web[+ ]lampas:\/*/i;

/** A reference as people write it ('Rom.8.28', 'Rom 8:28', 'Romans 8:28', '1 John 1:9', '1Jn.1.9', 'Rom 8', 'Romans'), or null when it names no
 * book Lampas could hold. A verse range keeps its first verse in `verse` and its last in `to`. */
export function parseReference(text: string): Reference | null {
  const named = /^([1-3]?)\s*([a-z]+)\.?\s*(.*)$/i.exec(text.trim().replace(SCHEME, '').replace(/\+/g, ' '));
  if (!named) return null;
  const book = BOOK_BY_NAME.get(squash(`${named[1]}${named[2]}`));
  if (!book) return null;
  return numbersOf(book, named[3].trim());
}

/** The chapter and verse that follow a book's name ('' for none, '8:28', '8 28', '8.28', '8:28-30' keeps the first verse and the last in `to`), or null for anything else. */
function numbersOf(book: string, rest: string): Reference | null {
  if (rest === '') return { book };
  const numbers = /^(\d+)(?:(?:\s*[.:]\s*|\s+)(\d+))?(?:\s*[-–]\s*(\d+))?$/.exec(rest);
  if (!numbers) return null;
  const reference: Reference = { book, chapter: Number(numbers[1]) };
  if (numbers[2] !== undefined) reference.verse = Number(numbers[2]);
  if (reference.verse !== undefined && numbers[3] !== undefined && Number(numbers[3]) > reference.verse) reference.to = Number(numbers[3]);
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
  /** the last verse of a range the link named ('Heb 7:1-3'): the Verse view opens on verses `verse` to `to` */
  to?: number;
  notice: string | null;
  /** set for a place in the Old Testament, which Lampas does not hold yet: where a Bible app can open it (the notice then offers that) */
  elsewhere?: { book: string; chapter: number; verse?: number };
}

/** A reference named in words, never as the code it was written in ('Gen.1.28' -> 'Genesis 1:28', 'Rom.8.99' -> 'Romans 8:99'); text that names no book of the
 *  Bible (a word, a Strong's number, 'Tobit 3:1') is returned as it was asked. */
export function inWords(asked: string): string {
  const parsed = parseCanonReference(asked);
  if (!parsed) return asked;
  const name = (parsed.testament === 'nt' ? bookOf(parsed.book)?.name : otBookOf(parsed.book)?.name) ?? parsed.book;
  if (parsed.chapter === undefined) return name;
  return `${name} ${parsed.chapter}${parsed.verse === undefined ? '' : `:${parsed.verse}`}`;
}

/** What a notice calls a reference: the words the sheet printed it in ('Gen. 1:28') when the link carries them, else in words (`inWords`). */
const namedAs = (asked: string, printed?: string): string => printed?.trim() || inWords(asked);

/** The sentence that says what was asked for and what is shown instead. A reference asked for is named as it was printed, when known, else in words (`inWords`). */
export const notHeld = (asked: string, shown: string, printed?: string): string => `“${namedAs(asked, printed)}” is not in Lampas; showing ${shown}.`;

/** Where `text` opens the reader. A book or number Lampas does not hold opens the nearest it does (the last chapter or verse; chapter 0 and verse 0 the
 * first), a book it does not hold the chapter in `fallback`; either way with a notice. `index` null (the index could not be loaded) leaves the numbers
 * as written. `printed` is the words the reference was printed in where it was found (Link.printed); the notice names it so. */
export function resolveReference(text: string, index: BookIndex | null, fallback: OpenChapter, printed?: string): Opened {
  const asked = text.trim().replace(SCHEME, '');
  const parsed = parseReference(asked);
  const old = parsed ? null : parseCanonReference(asked);
  if (old && old.testament === 'ot' && old.chapter !== undefined) {
    const { book, chapter, verse } = old;
    return {
      book: fallback.book,
      chapter: fallback.chapter,
      verse: null,
      notice: `“${namedAs(asked, printed)}” is not in Lampas yet; showing ${fallback.title}.`,
      elsewhere: { book, chapter, ...(verse === undefined ? {} : { verse }) },
    };
  }
  const info = parsed && (index === null ? { chapters: Infinity, verses: [] as number[] } : index.books.find((b) => b.code === parsed.book));
  if (!parsed || !info) return { book: fallback.book, chapter: fallback.chapter, verse: null, notice: notHeld(asked, fallback.title, printed) };
  const { book } = parsed;
  const wanted = parsed.chapter ?? 1;
  const chapter = Math.min(Math.max(wanted, 1), info.chapters);
  if (chapter !== wanted) return { book, chapter, verse: null, notice: notHeld(asked, titleOf(book, chapter), printed) };
  if (parsed.verse === undefined) return { book, chapter, verse: null, notice: null };
  const last = info.verses[chapter - 1];
  const verse = last === undefined ? Math.max(parsed.verse, 1) : Math.min(Math.max(parsed.verse, 1), last);
  if (verse !== parsed.verse) return { book, chapter, verse, notice: notHeld(asked, `${titleOf(book, chapter)}:${verse}`, printed) };
  const to = parsed.to === undefined ? undefined : Math.min(parsed.to, last ?? parsed.to);
  return { book, chapter, verse, ...(to !== undefined && to > verse ? { to } : {}), notice: null };
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
  /** a reference's words as the sheet printed them ('Gen. 1:28', `as=`), which a notice names it by */
  printed?: string;
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
    if (word) return { kind: 'word', text: word[1].trim() };
    const printed = params.get('as')?.trim();
    return printed ? { kind: 'reference', text: ref, printed } : { kind: 'reference', text: ref };
  }
  const word = params.get('word')?.trim();
  return word ? { kind: 'word', text: word } : null;
}

/** A book's OSIS code, from our own code ('1jn' -> '1John', 'psa' -> 'Ps'). */
export const osisOf = (book: string): string => OSIS[book] ?? OT_OSIS[book] ?? book;

/** The https link of a verse, a chapter (no verse) or a book's chapter, as Copy link gives it. `printed` adds the words it was printed in (`as=`). */
export function referenceUrl(book: string, chapter: number, verse?: number, printed?: string): string {
  const as = printed ? `&as=${encodeURIComponent(printed)}` : '';
  return `${LINK_ORIGIN}/#/?ref=${osisOf(book)}.${chapter}${verse === undefined ? '' : `.${verse}`}${as}`;
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
