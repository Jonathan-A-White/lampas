// scripts/timeline-import.ts — npm run timeline:build
// Reads Theographic Bible Metadata (https://github.com/robertrouse/theographic-bible-metadata, Robert Rouse, CC BY-SA 4.0) at a pinned commit, lays
// data/timeline/corrections.json over it and writes one compact file per book of its events, people and places into src/timeline/data/ (docs/timeline.md).
// The downloads go to data/raw/theographic (git-ignored, skipped when present, checked against a sha256) and are never edited; the JSON is committed.
// A second run on unchanged inputs writes nothing.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CANON } from '../src/data/canon';
import { OSIS, OT_OSIS } from '../src/data/osis';
import { TIMELINE_CREDIT, type BookTimeline, type TimelineEvent, type TimelinePerson, type VerseRange } from '../src/timeline/types';
import { writeIfChanged } from './data/chapterWriter';
import { loadPinned } from './data/pins';

export const THEOGRAPHIC_COMMIT = 'a22047fe54aa5621f573d99222a82efb62741193';
const RAW_URL = `https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/${THEOGRAPHIC_COMMIT}/CSV/`;

/** The tables read, by the prefix a correction's id names them with ('event:129'): the CSV's name, the column that identifies a row and the sha256 of the bytes at the commit. */
export const THEOGRAPHIC_FILES = [
  { table: 'event', name: 'Events.csv', key: 'eventID', sha256: '12d8f07ae6d15b562298c52910d78f3b675bdea30228ca6ffb6685641b7709f9' },
  { table: 'person', name: 'People.csv', key: 'personLookup', sha256: '09fdcd21f63db0e9f7b8618bad45f83e33d0c72ffdfbc1f42a8ce8f46ebced59' },
  { table: 'place', name: 'Places.csv', key: 'placeLookup', sha256: 'b99f36384c2bbfb392b8f9ee808f0f74c2f8c7fdf85e548d202b0fced680ea7d' },
] as const;

type Table = (typeof THEOGRAPHIC_FILES)[number]['table'];
type Row = Record<string, string>;

/** One fix of data/timeline/corrections.json: the record (`event:<eventID>`, `person:<personLookup>`, `place:<placeLookup>`), the CSV column, the value the file has and the value it should have, why, and who says so. */
export interface Correction {
  id: string;
  field: string;
  from: string;
  to: string;
  reason: string;
  source: string;
}

/** The rows of a CSV file, each by the header's names (RFC 4180: quoted cells hold commas, line breaks and doubled quotes). */
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (body[i + 1] === '"') cell += body[++i];
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || (c === '\r' && body[i + 1] === '\n')) {
      if (c === '\r') i++;
      rows.push([...row, cell]);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) rows.push([...row, cell]);
  const [header = [], ...rest] = rows;
  return rest.map((cells, i) => {
    if (cells.length !== header.length) throw new Error(`CSV row ${i + 2} has ${cells.length} cells, the header ${header.length}`);
    return Object.fromEntries(header.map((name, n) => [name, cells[n]]));
  });
}

/** Lays each correction over the tables' rows. A fix that does not fit (no such record or column, `from` not what the row says, a part left out) stops the build. */
export function applyCorrections(tables: Record<Table, Map<string, Row>>, corrections: readonly Correction[]): void {
  for (const fix of corrections) {
    const name = `${fix.id} ${fix.field}`;
    for (const part of ['id', 'field', 'from', 'to', 'reason', 'source'] as const) {
      // `from` may be empty: a value Theographic does not give
      if (typeof fix[part] !== 'string' || (part !== 'from' && part !== 'to' && !fix[part].trim())) throw new Error(`correction ${name}: it has no ${part}`);
    }
    if (fix.from === fix.to) throw new Error(`correction ${name}: "to" is the same as "from"`);
    const [table, ...rest] = fix.id.split(':');
    const rows = tables[table as Table] as Map<string, Row> | undefined;
    if (!rows || rest.length === 0) throw new Error(`correction ${name}: the id is event:<eventID>, person:<personLookup> or place:<placeLookup>`);
    const row = rows.get(rest.join(':'));
    if (!row) throw new Error(`correction ${name}: the files have no ${fix.id}`);
    if (!(fix.field in row)) throw new Error(`correction ${name}: ${fix.id} has no column ${fix.field}`);
    if (row[fix.field] !== fix.from) {
      throw new Error(`correction ${name}: the file says ${JSON.stringify(row[fix.field])}, not the fix's "from". If upstream has made the fix, delete it from the corrections file`);
    }
    row[fix.field] = fix.to;
  }
}

/** A year of the files (ISO astronomical, 0 is 1 BC) as the app counts it: negative for BC, no year 0. */
function appYear(text: string, what: string): number {
  const m = /^(-?\d{1,4})(-\d\d-\d\d)?$/.exec(text);
  if (!m) throw new Error(`${what}: ${JSON.stringify(text)} is not a year`);
  const year = Number(m[1]);
  return year <= 0 ? year - 1 : year;
}

const CODE_OF = new Map(Object.entries({ ...OT_OSIS, ...OSIS }).map(([code, osis]) => [osis, code]));
const CANON_PLACE = new Map(CANON.map((book, i) => [book.code, i]));

interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
}

const list = (cell: string): string[] => cell.split(',').map((s) => s.trim()).filter(Boolean);

const inCanonOrder = (a: VerseRef, b: VerseRef): number => (CANON_PLACE.get(a.book) ?? 0) - (CANON_PLACE.get(b.book) ?? 0) || a.chapter - b.chapter || a.verse - b.verse;

/** The verses of a cell ('Gen.1.1,Gen.1.2'), once each, in canon order. */
function versesOf(cell: string, what: string): VerseRef[] {
  const refs = [...new Set(list(cell))].map((ref) => {
    const m = /^(\w+)\.(\d+)\.(\d+)$/.exec(ref);
    const book = m && CODE_OF.get(m[1]);
    if (!m || !book) throw new Error(`${what}: ${JSON.stringify(ref)} is not a verse of the 66 books`);
    return { book, chapter: Number(m[2]), verse: Number(m[3]) };
  });
  return refs.sort(inCanonOrder);
}

/** Verses of one book, in order, as ranges. */
function ranges(refs: readonly VerseRef[]): VerseRange[] {
  const out: VerseRange[] = [];
  for (const { chapter, verse } of refs) {
    const last = out[out.length - 1];
    if (last && last[0] === chapter && last[2] === verse - 1) last[2] = verse;
    else out.push([chapter, verse, verse]);
  }
  return out;
}

function personOf(row: Row): TimelinePerson {
  const person: TimelinePerson = { name: row.displayTitle || row.name };
  if (row.birthYear) person.born = appYear(row.birthYear, `${row.personLookup} birthYear`);
  if (row.deathYear) person.died = appYear(row.deathYear, `${row.personLookup} deathYear`);
  return person;
}

/** The file of every book that has an event or a dated person, from the (corrected) tables. */
export function buildTimeline(tables: Record<Table, Map<string, Row>>): BookTimeline[] {
  const books = new Map<string, BookTimeline>();
  const bookFile = (code: string): BookTimeline => {
    let file = books.get(code);
    if (!file) books.set(code, (file = { book: code, credit: TIMELINE_CREDIT, events: [], people: {}, places: {} }));
    return file;
  };
  const person = (lookup: string, what: string): TimelinePerson => {
    const row = tables.person.get(lookup);
    if (!row) throw new Error(`${what}: no person ${lookup} in People.csv`);
    return personOf(row);
  };

  const events = [...tables.event.values()].map((row) => {
    const what = `event:${row.eventID} ${row.title}`;
    const verses = versesOf(row.verses, what);
    if (verses.length === 0) throw new Error(`${what}: it has no verse`);
    return { row, what, verses, id: Number(row.eventID), year: appYear(row.startDate, `${what} startDate`) };
  });
  events.sort((a, b) => a.year - b.year || inCanonOrder(a.verses[0], b.verses[0]) || a.id - b.id);

  for (const { row, what, verses, id, year } of events) {
    for (const code of new Set(verses.map((v) => v.book))) {
      const file = bookFile(code);
      const event: TimelineEvent = {
        id,
        title: row.title,
        year,
        ...(/^\d{4}-\d\d-\d\d$/.test(row.startDate) ? { date: row.startDate } : {}),
        duration: row.duration,
        verses: ranges(verses.filter((v) => v.book === code)),
        people: list(row.participants),
        places: list(row.locations),
      };
      file.events.push(event);
      for (const lookup of event.people) file.people[lookup] = person(lookup, what);
      for (const lookup of event.places) {
        const place = tables.place.get(lookup);
        if (!place) throw new Error(`${what}: no place ${lookup} in Places.csv`);
        file.places[lookup] = place.displayTitle;
      }
    }
  }

  for (const row of tables.person.values()) {
    if (!row.birthYear && !row.deathYear) continue;
    const what = `person:${row.personLookup}`;
    for (const code of new Set(versesOf(row.verses, what).map((v) => v.book))) bookFile(code).people[row.personLookup] = personOf(row);
  }

  // keys in order, so the bytes never depend on the order of the files' rows
  const sorted = <T>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : 1)));
  return [...books.values()]
    .map((file) => ({ ...file, people: sorted(file.people), places: sorted(file.places) }))
    .sort((a, b) => (CANON_PLACE.get(a.book) ?? 0) - (CANON_PLACE.get(b.book) ?? 0));
}

export interface TimelineImportOptions {
  rawDir: string;
  outDir: string;
  correctionsFile: string;
  /** fetches url into dest; the default uses fetch */
  download?: (url: string, dest: string) => Promise<void>;
  /** the sha256 of each file by its name; the default is the pinned bytes of THEOGRAPHIC_COMMIT (a test passes its own cuts') */
  pins?: Record<string, string>;
  log?: (line: string) => void;
}

export interface TimelineImportResult {
  /** the books whose file changed */
  written: string[];
  books: number;
  events: number;
  corrections: number;
  bytes: number;
}

async function downloadTo(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  writeFileSync(part, Buffer.from(await response.arrayBuffer()));
  renameSync(part, dest);
}

export async function runTimelineImport(options: TimelineImportOptions): Promise<TimelineImportResult> {
  const { rawDir, outDir, correctionsFile, download = downloadTo, pins, log = () => undefined } = options;
  const tables = {} as Record<Table, Map<string, Row>>;
  for (const file of THEOGRAPHIC_FILES) {
    const text = await loadPinned({ path: join(rawDir, file.name), url: `${RAW_URL}${file.name}`, sha256: pins?.[file.name] ?? file.sha256, download, log });
    tables[file.table] = new Map(parseCsv(text).map((row) => [row[file.key], row]));
  }
  const corrections = JSON.parse(readFileSync(correctionsFile, 'utf8')) as Correction[];
  applyCorrections(tables, corrections);
  const books = buildTimeline(tables);

  mkdirSync(outDir, { recursive: true });
  const written: string[] = [];
  let bytes = 0;
  for (const book of books) {
    const text = `${JSON.stringify(book)}\n`;
    bytes += Buffer.byteLength(text);
    if (writeIfChanged(join(outDir, `${book.book}.json`), text)) written.push(book.book);
  }
  const kept = new Set(books.map((b) => `${b.book}.json`));
  for (const name of existsSync(outDir) ? readdirSync(outDir) : []) if (name.endsWith('.json') && !kept.has(name)) rmSync(join(outDir, name));
  const events = tables.event.size;
  log(`${events} events in ${books.length} books, ${corrections.length} corrections applied, ${written.length} files written, ${(bytes / 1024).toFixed(1)} KB`);
  return { written, books: books.length, events, corrections: corrections.length, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runTimelineImport({ rawDir: 'data/raw/theographic', outDir: 'src/timeline/data', correctionsFile: 'data/timeline/corrections.json', log: console.log }).catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
