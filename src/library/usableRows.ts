// src/library/usableRows.ts — the rows of his Logos list that Lampas could use and does not open yet (docs/design/library-at-scale.md 6.2): what 'Ask the makers about these' attaches as library.csv. They
// are commentaries on the New Testament, lexicons and grammars of Greek, Greek texts, interlinears of the New Testament and devotionals; never a manuscript, a Bible in English, a book of the Old Testament
// or a tool. The Mayor judges each against the vision (npm run logos:fit prints the same reading); this is only what is worth sending. Pure.
import type { Kind } from '../resources/catalogue';
import { coversOfSupersets } from './parseExport';

/** A row as the phone keeps it (src/data/db.ts ExportedRow): the list's columns, named as Lampas reads them; `refs` is the ReferenceSupersets cell. */
export interface ListedRow {
  resource: string;
  type: string;
  title: string;
  series: string;
  languages: string;
  refs: string;
}

/** The most the attached file may weigh: bsv-kit's cap on a text file of a grist. */
export const MAX_LIBRARY_CSV_BYTES = 200 * 1024;

/** The languages of a book that are not Greek's and that a lexicon or grammar of them is no use to a reader of Greek for. */
const OTHER_LANGUAGES = new Set(['he', 'hbo', 'heb', 'arc', 'syr', 'la', 'lat', 'ar', 'ara', 'cop', 'akk', 'sa', 'fa']);
const isGreek = (languages: string): boolean => languages.split(/[\s,;|]+/).some((l) => l === 'el' || l === 'grc' || l === 'gr');
/** A lexicon or grammar whose Languages name a language that is not Greek and not Greek as well is not for Greek. A list that names none is given the benefit of the doubt. */
const forGreek = (languages: string): boolean => isGreek(languages) || !languages.split(/[\s,;|]+/).some((l) => OTHER_LANGUAGES.has(l));

const isType = (row: ListedRow, prefix: string): boolean => row.type === prefix || row.type.startsWith(`${prefix}.`);

/** The kind of book a row would be if Lampas opened it, or undefined when it is not one Lampas could use. */
export function usableKind(row: ListedRow): Kind | undefined {
  const nt = coversOfSupersets(row.refs).length > 0;
  if (isType(row, 'text.monograph.ancient-manuscript')) return undefined;
  if (isType(row, 'text.monograph.commentary')) return nt ? 'commentary' : undefined;
  if (isType(row, 'text.monograph.lexicon')) return forGreek(row.languages) ? 'lexicon' : undefined;
  if (isType(row, 'text.monograph.grammar')) return forGreek(row.languages) ? 'grammar' : undefined;
  if (isType(row, 'text.monograph.critical-apparatus')) return 'greek-text';
  if (isType(row, 'text.monograph.bible')) return isGreek(row.languages) ? 'greek-text' : undefined;
  if (isType(row, 'lbx.reverse-interlinear') || isType(row, 'lbx.interlinear')) return nt ? 'interlinear' : undefined;
  if (isType(row, 'lbx.calendar-devotional')) return 'devotional';
  return undefined;
}

/** The rows worth sending, in the order of the list. */
export const usableRows = (rows: readonly ListedRow[]): ListedRow[] => rows.filter((r) => usableKind(r) !== undefined);

/** How many rows there are of each Logos type, the most first, at most `most` types. */
export function countsByType(rows: readonly ListedRow[], most = 40): Record<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, most));
}

const HEADER = ['ResourceId', 'Type', 'Title', 'Series', 'ReferenceSupersets'];
const cell = (text: string): string => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
const csvOf = (rows: readonly ListedRow[], refs: (r: ListedRow) => string): string =>
  [HEADER.join(','), ...rows.map((r) => [r.resource, r.type, r.title, r.series, refs(r)].map(cell).join(','))].join('\r\n') + '\r\n';
const sizeOf = (text: string): number => new TextEncoder().encode(text).length;

/** The file 'Ask the makers about these' attaches: ResourceId, Type, Title, Series, ReferenceSupersets, one line for each row, in Logos's own quoting (a ReferenceSupersets cell keeps its tabs). Under
 * MAX_LIBRARY_CSV_BYTES whatever the list: while it is over, the references are cut to their first token, and then the last rows are left out. */
export function libraryCsv(rows: readonly ListedRow[]): string {
  const whole = csvOf(rows, (r) => r.refs);
  if (sizeOf(whole) <= MAX_LIBRARY_CSV_BYTES) return whole;
  const short = (r: ListedRow): string => r.refs.split('\t')[0] ?? '';
  const brief = csvOf(rows, short);
  if (sizeOf(brief) <= MAX_LIBRARY_CSV_BYTES) return brief;
  // halve what is kept until it fits, then grow back toward the most that fits
  let [low, high] = [0, rows.length];
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (sizeOf(csvOf(rows.slice(0, mid), short)) <= MAX_LIBRARY_CSV_BYTES) low = mid;
    else high = mid - 1;
  }
  return csvOf(rows.slice(0, low), short);
}
