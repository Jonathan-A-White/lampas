// src/library/parseExport.ts — reads a Logos library export (Library > Save as Spreadsheet; docs/design/library-at-scale.md 5.1 and 5.2), pure and on the phone: `parseCsv` is RFC 4180
// (CRLF or LF line ends, quoted cells with commas, doubled quotes and newlines inside, a BOM dropped) and takes a raw tab as cell text, because the export's last cell,
// ReferenceSupersets, holds tabs unquoted; `readExport` turns the rows into `ExportRow`s by the header. scripts/logos-catalogue.ts reads exports with these same functions.
import { BOOKS, NT_BOOKS, OT_BOOKS, ntBookOf } from '../data/books.ts';
import type { LogosPart } from '../resources/types.ts';

/** RFC 4180: CRLF or LF line ends, quoted cells with commas, doubled quotes and newlines inside. A raw tab is cell text (the export's last cell holds them, unquoted), and a BOM is dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let started = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === '') {
      quoted = true;
      started = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
      started = true;
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      if (started || cell !== '') {
        row.push(cell);
        rows.push(row);
      }
      row = [];
      cell = '';
      started = false;
    } else {
      cell += c;
      started = true;
    }
  }
  if (started || cell !== '') {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** One row of a Logos export. `supersets` is the ReferenceSupersets cell as it is: tokens like `bible.64.1-64.21.25`, separated by raw tabs. */
export interface ExportRow {
  resource: string;
  type: string;
  abbreviated: string;
  title: string;
  series: string;
  languages: string;
  supersets: string;
}

const COLUMNS = ['ResourceId', 'Type', 'AbbreviatedTitle', 'Title', 'Series', 'Languages', 'ReferenceSupersets'];

/** The one line a file that is not a Logos list is refused with. */
export const NOT_A_LIST = 'This is not a Logos list: its first line has no ResourceId column. Use Library > Save as Spreadsheet in Logos on your computer.';

/** The rows of an export, by its header (the columns may come in any order, and only ResourceId is needed; a column that is missing reads as empty); throws an Error with the one plain line
 *  NOT_A_LIST when there is no ResourceId column. A row with no Resource ID is dropped. */
export function readExport(text: string): ExportRow[] {
  const [header = [], ...rows] = parseCsv(text);
  const at = COLUMNS.map((name) => header.indexOf(name));
  if (at[0] < 0) throw new Error(NOT_A_LIST);
  const cell = (c: string[], i: number): string => (at[i] < 0 ? '' : (c[at[i]] ?? ''));
  return rows
    .map((c) => ({ resource: cell(c, 0), type: cell(c, 1), abbreviated: cell(c, 2), title: cell(c, 3), series: cell(c, 4), languages: cell(c, 5), supersets: cell(c, 6) }))
    .filter((x) => x.resource !== '');
}

/** Logos numbers the Old Testament's 39 books 1 (Genesis) to 39 (Malachi) and the New Testament's 27 books 61 (Matthew) to 87 (Revelation), with the Apocrypha between; our codes follow the canon (src/data/books.ts),
 *  so the Old Testament's are the first 39 and the New's the 27 after them. */
const FIRST_OT_BOOK = 1;
const FIRST_NT_BOOK = 61;
const FIRST_APOCRYPHA_BOOK = 40;
const LAST_APOCRYPHA_BOOK = FIRST_NT_BOOK - 1;
const PART_ORDER: readonly LogosPart[] = ['nt', 'ot', 'apocrypha'];
const LAST_NT_BOOK = FIRST_NT_BOOK + NT_BOOKS.length - 1;

/** The code of the book Logos numbers `n`: undefined for the Apocrypha, which Lampas does not hold. */
function codeOfLogosBook(n: number): string | undefined {
  if (n >= FIRST_OT_BOOK && n < FIRST_OT_BOOK + OT_BOOKS.length) return OT_BOOKS[n - FIRST_OT_BOOK].code;
  if (n >= FIRST_NT_BOOK && n <= LAST_NT_BOOK) return NT_BOOKS[n - FIRST_NT_BOOK].code;
  return undefined;
}

/** The books of the Bible a ReferenceSupersets cell covers, as our codes in canon order: each `bible` token (`bible.64.1-64.21.25`, `bible+esv.61-87`) is a range from its first book number to its last;
 *  a token of any other type (`dayofyear`, `cicr`), and the Apocrypha, cover none. */
export function coversOfSupersets(supersets: string): string[] {
  const covered = new Set<string>();
  for (const token of supersets.split('\t')) {
    const m = /^bible(?:\+[a-z0-9]+)?\.(\d+)(?:[.\d]*)(?:-(\d+)[.\d]*)?$/.exec(token.trim());
    if (!m) continue;
    const [from, to] = [Number(m[1]), Number(m[2] ?? m[1])];
    for (let n = from; n <= Math.min(to, LAST_NT_BOOK); n++) {
      const code = codeOfLogosBook(n);
      if (code) covered.add(code);
    }
  }
  return BOOKS.filter((b) => covered.has(b.code)).map((b) => b.code);
}

/** The parts of the canon a ReferenceSupersets cell holds a Bible in, in the order New Testament, Old Testament, Apocrypha (Logos numbers the Apocrypha 40 to 60). A range that begins or ends inside the Apocrypha
 *  holds it (`bible+lxx2.1.1.1-58.14.46`: Old Testament and Apocrypha); a range that runs from the Old Testament across to the New says nothing of the Apocrypha, as a Bible without it and a Bible with it
 *  are written alike (`bible+nrsv.1.1.1-87.22.21`, `bible+niv.1.1.1-87.22.21`), so the rules file says it. A range that ends before it begins (`52` to `51`) stands for the book it begins at. */
export function partsOfSupersets(supersets: string): LogosPart[] {
  const parts = new Set<LogosPart>();
  for (const token of supersets.split('\t')) {
    const m = /^bible(?:\+[a-z0-9]+)?\.(\d+)[^-]*(?:-(\d+).*)?$/.exec(token.trim());
    if (!m) continue;
    const from = Number(m[1]);
    const to = m[2] === undefined || Number(m[2]) < from ? from : Number(m[2]);
    if (from < FIRST_APOCRYPHA_BOOK) parts.add('ot');
    if (to >= FIRST_NT_BOOK) parts.add('nt');
    const spansTheGap = from < FIRST_APOCRYPHA_BOOK && to >= FIRST_NT_BOOK;
    if (!spansTheGap && from <= LAST_APOCRYPHA_BOOK && to >= FIRST_APOCRYPHA_BOOK) parts.add('apocrypha');
  }
  return PART_ORDER.filter((p) => parts.has(p));
}

/** The books of the New Testament alone that a ReferenceSupersets cell covers: what a Greek book (an interlinear, a lexicon) needs to be of use. */
export function coversNewTestament(supersets: string): string[] {
  return coversOfSupersets(supersets).filter((code) => ntBookOf(code) !== undefined);
}
