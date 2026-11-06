// scripts/data/tvtms.ts — the Greek-to-Lampas verse map (mw-u2w5klk.9, the Septuagint epic R1), read from STEPBible's TVTMS (Translators
// Versification Traditions with Methodology for Standardisation, CC BY 4.0, Tyndale House Cambridge). Lampas numbers the Old Testament the English
// way (the Berean tables'); the Septuagint's Greek (the Swete tradition, TVTMS's `Greek` column) does not: the Psalms are one number lower from
// Ps 10, Jeremiah 25-51 is in another order, Exodus 35-40 moves whole blocks, Daniel 3 carries the Song of the Three, Malachi's last three
// verses change places (docs/sources/septuagint-and-webster.md 'Versification' lists each with its rows).
// The pure parts (parseTvtms, buildMaps) take the file's text and are tested on a slice (tests/fixtures/lxx/tvtms-slice.txt); ensureTvtms fetches the
// pinned file into data/raw/lxx/ once. Only the condensed data is read (#DataStart(Condensed) .. #DataEnd(Condensed)); its rows hold one verse or
// range per tradition in a column named in the section's header, and the expanded data repeats them with tests that tell which tradition a Bible follows.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fetchTo } from './chapterWriter';

export const TVTMS_COMMIT = 'be4191f0082aeedddb0eff0c02c966292b2bd641';
export const TVTMS_FILE_NAME = 'TVTMS - Translators Versification Traditions with Methodology for Standardisation for Eng+Heb+Lat+Grk+Others - STEPBible.org CC BY.txt';
export const TVTMS_URL = `https://raw.githubusercontent.com/STEPBible/STEPBible-Data/${TVTMS_COMMIT}/Versification/${encodeURIComponent(TVTMS_FILE_NAME)}`;
/** Where the file is kept (data/raw is git-ignored). */
export const TVTMS_RAW = join('lxx', 'tvtms.txt');

/** Fetches the pinned TVTMS into <raw>/lxx/tvtms.txt unless it is there; returns its path. */
export async function ensureTvtms(rawDir: string): Promise<string> {
  const path = join(rawDir, TVTMS_RAW);
  if (!existsSync(path)) await fetchTo(TVTMS_URL, path);
  return path;
}

/** The 39 books of Lampas's Old Testament (public/data/index.json codes), the only books a Lampas reference can name. */
export const OT_BOOKS: readonly string[] = [
  'gen', 'exo', 'lev', 'num', 'deu', 'jos', 'jdg', 'rut', '1sa', '2sa', '1ki', '2ki', '1ch', '2ch', 'ezr', 'neh', 'est', 'job', 'psa', 'pro', 'ecc', 'sng',
  'isa', 'jer', 'lam', 'ezk', 'dan', 'hos', 'jol', 'amo', 'oba', 'jon', 'mic', 'nam', 'hab', 'zep', 'hag', 'zec', 'mal',
];

// ---------------------------------------------------------------- the rows

/** One row of the condensed data: the section it stands in, its alignment type (OneToOne, MergedPrevVerse, ...) and its cells by the section's column names. */
export interface TvtmsRow {
  section: string;
  type: string;
  cells: Record<string, string>;
}

const cleanName = (name: string | undefined): string => (name ?? '').replace(/\*/g, '').trim();
const BOOK = '\\d?[A-Za-z][A-Za-z0-9]{1,2}';
const PLAUSIBLE_CELL = new RegExp(`^\\s*(?:${BOOK}\\.|Absent|NoVerse)`);

/**
 * The condensed rows of the file. A section opens with `$Ref` and its column names on the same line, or alone (the Psalms), with its tests and a
 * `BIBLES` line of column names after it; a row is an alignment type and one cell per column, and a line that is a test, a comment or a note is skipped.
 */
export function parseTvtms(text: string): TvtmsRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('#DataStart(Condensed)'));
  const end = lines.findIndex((l) => l.startsWith('#DataEnd(Condensed)'));
  if (start < 0 || end < start) throw new Error('TVTMS: no #DataStart(Condensed) .. #DataEnd(Condensed) in the file');
  const rows: TvtmsRow[] = [];
  let section = '';
  let header: string[] = [];
  for (const line of lines.slice(start + 1, end)) {
    const cells = line.split('\t');
    const first = cells[0].replace(/^\uFEFF/, '').trim();
    if (first.startsWith('$')) {
      section = first.slice(1).trim();
      header = cells.slice(1).map(cleanName);
      if (header.every((h) => h === '')) header = [];
      continue;
    }
    if (first === 'BIBLES') {
      header = cells.slice(1).map(cleanName);
      continue;
    }
    if (header.length === 0 || !/^[A-Za-z][A-Za-z/]*$/.test(first) || !PLAUSIBLE_CELL.test(cells[1] ?? '')) continue;
    const row: Record<string, string> = {};
    header.forEach((name, i) => {
      if (name && !(name in row)) row[name] = (cells[i + 1] ?? '').trim();
    });
    rows.push({ section, type: first, cells: row });
  }
  return rows;
}

// ---------------------------------------------------------------- references

/**
 * A reference is `<book> <chapter>:<verse>`, the book lower case as Lampas codes it (`psa 23:1`); a Psalm's title is verse `T` (`psa 22:T`), and a verse of a
 * Greek addition that stands inside a verse is `<verse>.<n>` (`est 1:1.3`; `.0` is the verse itself and is written without it).
 */
export const refOf = (book: string, chapter: number, verse: number | string): string => `${book} ${chapter}:${verse}`;

interface Side {
  refs: string[];
  /** the verse is empty here and its text stands in `refs` (TVTMS `Absent [=Ref]`) */
  merged: boolean;
  /** there is no verse here (`Absent`, `NoVerse`) */
  absent: boolean;
  /** a piece of the cell could not be read */
  bad: boolean;
}

const PIECE = new RegExp(`^(?:(${BOOK})\\.)?(?:(\\d+):)?(Title|\\d+)(?:\\.(\\d+)(?:-(\\d+))?|-(\\d+))?$`);

/** Reads `Gen.1:2-5`, `Est.4:17.1-2`, `Exo.37:1, 2.1`, `Est.11:2-12; 12:1-6` into reference keys; undefined when a piece is not of these forms. */
function expand(raw: string): string[] | undefined {
  const refs: string[] = [];
  let book = '';
  let chapter = 0;
  for (const piece of raw.split(/[;,]/).map((p) => p.trim()).filter(Boolean)) {
    const m = PIECE.exec(piece);
    if (!m) return undefined;
    if (m[1]) book = m[1].toLowerCase();
    if (m[2]) chapter = Number(m[2]);
    if (!book || !chapter) return undefined;
    if (m[3] === 'Title') {
      refs.push(refOf(book, chapter, 'T'));
      continue;
    }
    const verse = Number(m[3]);
    if (m[4] !== undefined) {
      const lo = Number(m[4]);
      const hi = m[5] !== undefined ? Number(m[5]) : lo;
      for (let s = lo; s <= hi; s++) refs.push(s === 0 ? refOf(book, chapter, verse) : refOf(book, chapter, `${verse}.${s}`));
    } else {
      const hi = m[6] !== undefined ? Number(m[6]) : verse;
      for (let v = verse; v <= hi; v++) refs.push(refOf(book, chapter, v));
    }
  }
  return refs;
}

const isLampasRef = (ref: string): boolean => OT_BOOKS.includes(ref.slice(0, ref.indexOf(' '))) && !ref.includes('.');

/** One cell as a side of a pair. On the English side only Lampas verses count: a verse of an Addition (`Est.1:1.3`) or of a book Lampas lacks (`S3Y.1:5`) is `absent`. */
function sideOf(raw: string, english: boolean): Side {
  const text = raw.trim();
  if (text === '' || /^NoVerse/.test(text)) return { refs: [], merged: false, absent: true, bad: false };
  const into = /^Absent\s*\[=\s*([^\]]+)\]/.exec(text);
  if (into) {
    const refs = expand(into[1].replace(/\(.*?\)/g, '').replace(/^\+/, ''));
    return refs ? { refs, merged: true, absent: false, bad: false } : { refs: [], merged: false, absent: true, bad: true };
  }
  if (/^Absent/.test(text)) return { refs: [], merged: false, absent: true, bad: false };
  const cleaned = text.replace(/\[[^\]]*\]/g, '').replace(/\(.*?\)/g, '').trim();
  const refs = expand(cleaned);
  if (!refs) return { refs: [], merged: false, absent: true, bad: true };
  const kept = english ? refs.filter(isLampasRef) : refs;
  return { refs: kept, merged: false, absent: kept.length === 0, bad: false };
}

// ---------------------------------------------------------------- the maps

/** same: not in the table, or the same number; one: renumbered, one verse to one; range: this verse is several verses there; part: this verse is a part of one there; none: no verse there. */
export type VerseState = 'same' | 'one' | 'range' | 'part' | 'none';
export interface Mapped {
  state: VerseState;
  refs: string[];
}

export interface TvtmsMaps {
  /** a Greek (Swete tradition) reference to Lampas's English-numbered reference(s) */
  toLampas(ref: string): Mapped;
  /** a Lampas reference to the Greek reference(s) */
  toGreek(ref: string): Mapped;
  /** a reference as the LXX2012 USFM numbers it (Brenton, a Psalm's title separate) to the Greek's; the same when the table has no Brenton column for it */
  lxx2012ToGreek(ref: string): Mapped;
  /** the rows that could not be read or fitted: what the sweep reports */
  problems: string[];
}

/** Which two cells of a row a map reads: the one it maps from and the one it maps to, undefined when the row's section lacks either. */
type Pair = (row: TvtmsRow) => [from: string, to: string] | undefined;
const column = (row: TvtmsRow, pick: (name: string) => boolean): string | undefined => {
  const name = Object.keys(row.cells).find(pick);
  return name === undefined ? undefined : row.cells[name];
};
const greekOf = (row: TvtmsRow): string | undefined => column(row, (n) => n === 'Greek');
/** The English column; where the section has one with a Psalm's title merged into verse 1 (Lampas's way, docs/sources/septuagint-and-webster.md) that one. */
const englishOf = (row: TvtmsRow): string | undefined => column(row, (n) => n === 'EngTitleMerged') ?? column(row, (n) => /^English/.test(n));
/** Brenton's own column of a section (`Greek2 (eg Brenton)`, `Greek3 (Brenton)`, `BrentonSeparate`: the title out of verse 1), the one LXX2012 follows where it has one. */
const brentonOf = (row: TvtmsRow): string | undefined => {
  const own = column(row, (n) => /Brenton/i.test(n) && !/Merged/i.test(n) && !/\d$/.test(n));
  // Jeremiah 49 (Greek 30, 25) names Greek2 "NETS", yet its Jer.30:33=Last and 25:39=Last are the verse counts of Brenton's chapters, which LXX2012 has
  return own ?? (row.section === 'Jer.49:1-49:39' ? column(row, (n) => /^Greek2/.test(n)) : undefined);
};

/**
 * LXX2012 numbers a Psalm as Brenton does, its title out of verse 1 (`\d`), where the Greek counts the title as verse 1. A section with no Brenton column of its
 * own whose title row puts the title at Greek verse 1 (Psa.3: English `Psa.3:Title` = Greek `Psa.3:1`) gets the shift by one worked out here: Greek verse 1 is
 * the title (`T`) and Greek verse n is Brenton's n-1.
 */
function shiftedGreek(cell: string): string | undefined {
  const refs = expand(cell.replace(/\[[^\]]*\]/g, '').trim());
  if (!refs || refs.some((r) => r.includes('.') || !/^psa /.test(r))) return undefined;
  return refs.map((r) => r.replace(/^psa (\d+):(\d+)$/, (_all, c: string, v: string) => (v === '1' ? `Psa.${c}:Title` : `Psa.${c}:${Number(v) - 1}`))).join(', ');
}
function lxx2012Pair(rows: readonly TvtmsRow[]): Pair {
  const titleAtOne = new Set(
    rows.filter((r) => /:Title$/.test(column(r, (n) => /^English/.test(n)) ?? '') && /^Psa\.\d+:1$/.test(greekOf(r) ?? '')).map((r) => r.section),
  );
  return (row) => {
    const brenton = brentonOf(row);
    if (brenton !== undefined) return greekOf(row) === undefined ? undefined : [brenton, greekOf(row) as string];
    const greek = greekOf(row);
    if (greek === undefined || !titleAtOne.has(row.section)) return undefined;
    const shifted = shiftedGreek(greek);
    return shifted === undefined ? undefined : [shifted, greek];
  };
}

interface Contribution {
  refs: string[];
  state: VerseState;
}

const PRIORITY: Record<VerseState, number> = { none: 0, same: 1, part: 2, one: 3, range: 4 };

function resolve(list: Contribution[]): Mapped {
  const live = list.filter((c) => c.state !== 'none');
  if (live.length === 0) return { state: 'none', refs: [] };
  const refs = [...new Set(live.flatMap((c) => c.refs))];
  if (refs.length > 1) return { state: 'range', refs };
  const state = live.map((c) => c.state).sort((a, b) => PRIORITY[b] - PRIORITY[a])[0];
  // one verse to one verse that shows as part and as one: it is one
  return { state: state === 'range' ? 'one' : state, refs };
}

function mapOf(rows: readonly TvtmsRow[], pair: Pair, englishSide: 'from' | 'to' | undefined, problems: string[]): (ref: string) => Mapped {
  const table = new Map<string, Contribution[]>();
  const add = (key: string, c: Contribution): void => {
    const list = table.get(key);
    if (list) list.push(c);
    else table.set(key, [c]);
  };
  const late: Array<{ a: string[]; b: string[] }> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const cells = pair(row);
    if (!cells) continue;
    const a = sideOf(cells[0], englishSide === 'from');
    const b = sideOf(cells[1], englishSide === 'to');
    if (a.bad || b.bad) {
      const note = `${row.section}: ${row.type} ${cells[0]} | ${cells[1]}`;
      if (!seen.has(note)) problems.push(`unreadable cell: ${note}`);
      seen.add(note);
      continue;
    }
    if (a.merged && b.merged) continue;
    if (a.merged) {
      // this side's verse is empty and its text stands in a.refs: the verse a.refs holds, in part, what b holds
      for (const x of a.refs) add(x, { refs: b.refs, state: b.absent ? 'none' : 'part' });
      continue;
    }
    if (b.merged) {
      for (const x of a.refs) add(x, { refs: b.refs, state: 'part' });
      continue;
    }
    if (a.refs.length === 0) continue;
    if (b.refs.length === 0) {
      for (const x of a.refs) add(x, { refs: [], state: 'none' });
    } else if (a.refs.length === b.refs.length) {
      a.refs.forEach((x, i) => add(x, { refs: [b.refs[i]], state: x === b.refs[i] ? 'same' : 'one' }));
    } else if (b.refs.length === 1) {
      for (const x of a.refs) add(x, { refs: b.refs, state: 'part' });
    } else if (a.refs.length === 1) {
      add(a.refs[0], { refs: b.refs, state: 'range' });
    } else {
      late.push({ a: a.refs, b: b.refs });
    }
  }
  // a row that sets several verses against a different number of verses (a typo in the table, or a merge it does not spell out) fills only what no other row says
  for (const { a, b } of late) {
    const tooUneven = Math.max(a.length, b.length) > 2 * Math.min(a.length, b.length);
    const note = `${a[0]}..${a[a.length - 1]} against ${b[0]}..${b[b.length - 1]}`;
    let used = false;
    for (const x of a) {
      if (!tooUneven && !table.has(x)) {
        add(x, { refs: b, state: 'range' });
        used = true;
      }
    }
    problems.push(`${used ? 'uneven row used for the verses no other row names' : 'uneven row ignored'}: ${note}`);
  }
  return (ref) => {
    const list = table.get(ref);
    if (list) return resolve(list);
    // a Psalm's title the table does not place is one the Greek added (Ps 92 "for the day before the Sabbath"): the Hebrew and Lampas have no verse for it
    return ref.endsWith(':T') ? { state: 'none', refs: [] } : { state: 'same', refs: [ref] };
  };
}

/**
 * Rows the sources probe adds to the table (docs/sources/septuagint-and-webster.md 'Dan 3'): TVTMS puts the Hebrew 3:31-33 (English 4:1-3) at Latin 3:98-100 and
 * gives the Greek column `Absent`, but Swete's Greek has them as 3:98-100 and LXX2012 has the text at its 3:31-33 (carriedAsGreek). A live reading wins over `Absent`.
 */
export const SUPPLEMENT_ROWS: readonly TvtmsRow[] = [
  { section: 'Dan.3:23--4:3 (Swete)', type: 'OneToOne', cells: { 'English KJV': 'Dan.4:1-3', Greek: 'Dan.3:98-100' } },
];

/**
 * Rows for LXX2012's own numbering where no column of TVTMS follows it (mw-u2w5klk.283 the Psalms, mw-u2w5klk.286 Genesis and Psalm 149), read by `lxx2012ToGreek` only; their `Brenton (LXX2012)` cell is
 * LXX2012's verse, their `Greek` cell Swete's. Each stands in for the table's section named in LXX2012_REPLACED or for one the table has no Brenton column for.
 * - Ps 10: LXX2012 has 8 verses and the title out of verse 1; it splits the Greek verse 1 ("In the Lord I have put my trust ... Flee to the mountains as a sparrow?")
 *   in two, so its 1 and 2 are the Greek's 1 and its 3-8 the Greek's 2-7 (TVTMS's BrentonSeparate has 7 verses, BrentonSeparate2 has 8 but counts the title as 1).
 * - Ps 113-115: LXX2012 numbers them in the Hebrew order. Its 113 (the Hebrew 114) is the Greek's 113:1-8, which the table's rows already give as the same; its 114
 *   (the Hebrew 115, 18 verses) is the Greek 113:9-26, its 115 (the Hebrew 116, 19 verses) the Greek 114:1-9 and 115:1-10 (LXX2012 115:10 is "I believed, therefore I have spoken").
 * mw-u2w5klk.286, from a sweep of every chapter the map answered 'same' for, read against Swete's verses (a Brenton verse that answers two Greek verses stands at the first):
 * - Gen 22: LXX2012 22:15 holds the Greek 15-16 ("... called Abraam the second time out of heaven, saying, I have sworn by myself"), so its 16-23 are the Greek 17-24.
 * - Gen 37: LXX2012 37:32 holds the Greek 32-33 ("... know if it be your son's coat ... It is my son's coat"), so its 33-35 are the Greek 34-36 (TVTMS's section for 36:43--37:2
 *   already carries Brenton's 36:44 = Greek 37:1 and 37:1 = Greek 37:2).
 * - Ps 149: LXX2012 has 8 verses; its 8 holds the Greek 8-9 ("... to execute on them the judgment written: this honor have all his saints").
 */
export const LXX2012_ROWS: readonly TvtmsRow[] = [
  ['Psa.10:Title', 'Absent [=Psa.10:1]'],
  ['Psa.10:1-2', 'Psa.10:1'],
  ['Psa.10:3-8', 'Psa.10:2-7'],
  ['Psa.114:1-18', 'Psa.113:9-26'],
  ['Psa.115:1-9', 'Psa.114:1-9'],
  ['Psa.115:10-19', 'Psa.115:1-10'],
  ['Gen.22:15', 'Gen.22:15-16'],
  ['Gen.22:16-23', 'Gen.22:17-24'],
  ['Gen.37:32', 'Gen.37:32-33'],
  ['Gen.37:33-35', 'Gen.37:34-36'],
  ['Psa.149:8', 'Psa.149:8-9'],
].map(([lxx2012, greek]) => ({ section: 'LXX2012', type: 'OneToOne', cells: { 'Brenton (LXX2012)': lxx2012, Greek: greek } }));

/** The sections of the table whose Brenton column is not LXX2012's numbering, which LXX2012_ROWS replaces for `lxx2012ToGreek` (Psa.11:1-11:7 holds Ps 10's rows). */
const LXX2012_REPLACED: ReadonlySet<string> = new Set(['Psa.11:1-11:7']);

/** The three maps of the rows, each total: a reference the table lacks maps to itself with the state `same`. */
export function buildMaps(tableRows: readonly TvtmsRow[]): TvtmsMaps {
  const rows = [...tableRows, ...SUPPLEMENT_ROWS];
  const lxx2012Rows = [...rows.filter((r) => !LXX2012_REPLACED.has(r.section)), ...LXX2012_ROWS];
  const problems: string[] = [];
  const both = (a: (r: TvtmsRow) => string | undefined, b: (r: TvtmsRow) => string | undefined): Pair => (r) => {
    const x = a(r);
    const y = b(r);
    return x === undefined || y === undefined ? undefined : [x, y];
  };
  const toLampas = mapOf(rows, both(greekOf, englishOf), 'to', problems);
  const toGreek = mapOf(rows, both(englishOf, greekOf), 'from', []);
  const lxx2012ToGreek = mapOf(lxx2012Rows, lxx2012Pair(lxx2012Rows), undefined, []);
  return { toLampas, toGreek, lxx2012ToGreek, problems };
}
