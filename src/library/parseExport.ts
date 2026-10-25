// src/library/parseExport.ts — reads a Logos library export (Library > Save as Spreadsheet; docs/design/library-at-scale.md 5.1 and 5.2), pure and on the phone: `parseCsv` is RFC 4180
// (CRLF or LF line ends, quoted cells with commas, doubled quotes and newlines inside, a BOM dropped) and takes a raw tab as cell text, because the export's last cell,
// ReferenceSupersets, holds tabs unquoted; `readExport` turns the rows into `ExportRow`s by the header. scripts/logos-catalogue.ts reads exports with these same functions.
import { NT_BOOKS as BOOKS } from '../data/books.ts';

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

/** Logos numbers the New Testament's books 61 (Matthew) to 87 (Revelation); our codes follow that order (src/data/books.ts). */
const FIRST_NT_BOOK = 61;

/** The books of the New Testament a ReferenceSupersets cell covers, as our codes in canonical order: each `bible` token (`bible.64.1-64.21.25`, `bible+esv.61-87`) is a range from its first book number
 *  to its last; a token of any other type (`dayofyear`, `cicr`), and the Old Testament, cover none. */
export function coversOfSupersets(supersets: string): string[] {
  const covered = new Set<string>();
  for (const token of supersets.split('\t')) {
    const m = /^bible(?:\+[a-z0-9]+)?\.(\d+)(?:[.\d]*)(?:-(\d+)[.\d]*)?$/.exec(token.trim());
    if (!m) continue;
    const [from, to] = [Number(m[1]), Number(m[2] ?? m[1])];
    for (let n = Math.max(from, FIRST_NT_BOOK); n <= Math.min(to, FIRST_NT_BOOK + BOOKS.length - 1); n++) covered.add(BOOKS[n - FIRST_NT_BOOK].code);
  }
  return BOOKS.filter((b) => covered.has(b.code)).map((b) => b.code);
}
