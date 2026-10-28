// scripts/data/bereanTable.ts — the reader of the Majority Standard Bible and Berean Standard Bible word tables (msb_nt_tables.tsv, bsb_tables.tsv),
// shared by the New Testament build (scripts/data-build.ts) and the Old Testament build (scripts/data-build-ot.ts). Both tables are tab separated,
// one row per source word, the same columns; a row carries the word, its parsing and Strong's number, and the English words aligned to it.
// The table is read line by line (readLines): the Old Testament's is 85 MB and is never held whole.
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/** Where each cell of a row is. The same in both tables; the Strong's number and the parsing differ (the NT build reads columns 8 and 11, the OT build 8, 9 and 10). */
export const COLUMNS = {
  sourceSort: 1, // 'Greek Sort' in the NT table; the OT table's 'Heb Sort' is column 0
  hebSort: 0,
  englishSort: 2,
  group: 3,
  language: 4,
  text: 6,
  translit: 7,
  parse: 8,
  parseLong: 9,
  strongsHeb: 10,
  strongsGrk: 11,
  verseId: 12,
  heading: 13,
  paragraph: 15,
  begQ: 17,
  english: 18,
  pnc: 19,
  endQ: 20,
  footnotes: 21, // the MSB's footnote on this word (HTML: <i>…</i>); the Old Testament build does not read it
  endText: 22,
} as const;

/** One word of the source text with the English aligned to it, as a row has it (the NT build and the OT build each fill `strongs` their way). */
export interface TableWord {
  sourceSort: number;
  englishSort: number;
  /** the word as the table has it, NFC */
  text: string;
  translit: string;
  parse: string;
  strongs: string; // 'G686' or 'H7225', or '' when the table lost it
  english: string;
  begQ: string;
  tail: string; // pnc + endQ + endText
  par: string; // the table's paragraph markup on this word, '' when none
  note: string; // the table's footnote on this word as the cell has it (HTML), '' when none
}

export interface TableVerse {
  book: string;
  chapter: number;
  n: number;
  words: TableWord[];
  heading: string; // the section heading that comes before this verse, '' when none
}

/** The rows of one verse group: the table puts the words of a verse under one group number. */
export interface TableGroup {
  id: string;
  ref: string;
  heading: string;
  rows: string[][];
}

/** Stops the build when a column is not named as it was when the build was written: the column, the name expected and the name found. */
export function checkHeader(header: readonly string[], expected: Readonly<Record<number, string>>, table: string): void {
  for (const [col, name] of Object.entries(expected)) {
    if (header[Number(col)] !== name) throw new Error(`${table}: column ${col} should be ${JSON.stringify(name)}, is ${JSON.stringify(header[Number(col)])}`);
  }
}

/** The lines of a file, one at a time, without the byte-order mark and the line ending. The file is never held whole. */
export async function* readLines(path: string): AsyncGenerator<string> {
  const lines = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let first = true;
  for await (const line of lines) {
    yield first ? line.replace(/^\uFEFF/, '') : line;
    first = false;
  }
}

// In the table's English [square brackets] mark words supplied for the English, and {curly braces} words moved
// here from another place; the marks come off, and the chunk's `s` keeps which of its words were in [square brackets].
// A <span class="reftext"> is the number of a verse in the middle of a group (a Psalm's title is part of verse 1: the 1 stands before the verse's own first word): it is not text.
const stripTags = (s: string): string => s.replace(/<span class=\|reftext\|>.*?<\/span>/g, '').replace(/<[^>]*>/g, '');
export const spaced = (s: string): string => stripTags(s).replace(/[[\]{}]/g, '');
// While a chunk is put together its supplied words stay marked, by two private-use characters in place of [ and ].
const OPEN = '';
const CLOSE = '';
export const marked = (s: string): string => stripTags(s).replace(/\[/g, OPEN).replace(/\]/g, CLOSE).replace(/[{}]/g, '');
export const unmarked = (s: string): string => s.replace(/[]/g, '');
// A verse starts a paragraph when the table puts a paragraph tag that opens one (prose, or the first line of an
// indented block) on its first word. The indented lines inside a poetry block (indent1, indent2) do not.
export const PARAGRAPH_OPENER = /^<p class=\|(?:reg|red|(?:indent|tab|list)1stline(?:red)?)\|>/;
/** A heading cell as text: the tags off (a paragraph tag or a line break is a space: 'Your Word Is a Lamp' and the letter after it are two words), a numeric character reference (the Hebrew letter that heads a section of Psalm 119) written out. */
export const headingOf = (cell: string): string =>
  stripTags(cell.replace(/<(?:p|br)\b[^>]*>/gi, ' '))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
export const tidy = (s: string): string => spaced(s).replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

/**
 * The positions, among the white-space separated words of a chunk's English, of the words the table put in [brackets].
 * `text` is the chunk with OPEN and CLOSE where the brackets were. A word counts as supplied when it has a letter or digit
 * and every one of them is inside the brackets; punctuation alone is never supplied.
 */
export function suppliedWords(text: string): number[] {
  const out: number[] = [];
  let inside = false;
  let index = 0;
  for (const token of text.split(/\s+/)) {
    let inner = 0;
    let outer = 0;
    for (const ch of token) {
      if (ch === OPEN) inside = true;
      else if (ch === CLOSE) inside = false;
      else if (/[\p{L}\p{N}]/u.test(ch)) {
        if (inside) inner++;
        else outer++;
      }
    }
    if (unmarked(token) === '') continue;
    if (inner > 0 && outer === 0) out.push(index);
    index++;
  }
  return out;
}

/** Takes one row into its verse group: the reference (on one row of the group), the first heading, and the rows that have a word. */
export function addRow(group: TableGroup, f: readonly string[]): void {
  if (f[COLUMNS.verseId]) {
    if (group.ref) throw new Error(`Table: verse group ${group.id} has two references`);
    group.ref = f[COLUMNS.verseId];
  }
  if (f[COLUMNS.heading] && !group.heading) group.heading = headingOf(f[COLUMNS.heading]);
  if (f[COLUMNS.text]) group.rows.push([...f]);
}

/** 'Genesis 1:1' -> its book name, chapter and verse. */
export function splitReference(group: TableGroup): { book: string; chapter: number; n: number } {
  const m = /^(.+) (\d+):(\d+)$/.exec(group.ref);
  if (!m) throw new Error(`Table: verse group ${group.id} has no usable reference (${JSON.stringify(group.ref)})`);
  return { book: m[1], chapter: Number(m[2]), n: Number(m[3]) };
}

/** The English side of a row as a TableWord field set; `strongs`, `translit` and `text` are the caller's, as the two tables differ in them. */
export function wordOf(f: readonly string[], sourceSort: number, fields: Pick<TableWord, 'text' | 'translit' | 'strongs'>): TableWord {
  return {
    sourceSort,
    englishSort: Number(f[COLUMNS.englishSort]),
    text: fields.text,
    translit: fields.translit,
    parse: f[COLUMNS.parse],
    strongs: fields.strongs,
    english: f[COLUMNS.english],
    begQ: f[COLUMNS.begQ],
    tail: f[COLUMNS.pnc] + f[COLUMNS.endQ] + f[COLUMNS.endText],
    par: f[COLUMNS.paragraph],
    note: f[COLUMNS.footnotes] ?? '',
  };
}
