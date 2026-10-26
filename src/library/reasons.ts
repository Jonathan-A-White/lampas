// src/library/reasons.ts — why Lampas cannot use a book of his Logos list yet (docs/library-at-scale.md 5.4): a table from a row's Logos type (and, for a few, what its ReferenceSupersets say) to one
// plain sentence. matchExport gives each row it leaves the key of the first reason that fits; the page 'What they are' groups the rows by key, at most 12 lines, and never lists the titles.
import { ntBookOf } from '../data/books';
import type { ExportRow } from './parseExport';

export interface Reason {
  key: string;
  /** what the books are, plural: 'Ancient manuscripts and translations of them' */
  label: string;
  /** the sentence after it: why, and what would change it */
  why: string;
  /** whether a row (with the books of the Bible its ReferenceSupersets cover) is one of these */
  fits(row: ExportRow, covers: readonly string[]): boolean;
}

const isType = (row: ExportRow, ...prefixes: string[]): boolean => prefixes.some((p) => row.type === p || row.type.startsWith(`${p}.`));
const hasVerses = (row: ExportRow): boolean => row.supersets.split('\t').some((t) => /^bible/.test(t.trim()));

/** The reasons in the order they are tried: the first that fits is the row's. */
export const REASONS: readonly Reason[] = [
  {
    key: 'manuscripts',
    label: 'Ancient manuscripts and translations of them',
    why: 'Lampas reads the printed Greek text of the New Testament, not the manuscripts.',
    fits: (row) => isType(row, 'text.monograph.ancient-manuscript'),
  },
  {
    key: 'old-testament',
    label: 'Books on the Old Testament',
    why: 'Lampas opens a commentary on the Old Testament, but not yet any other kind of book on it.',
    fits: (row, covers) => !covers.some((code) => ntBookOf(code)) && hasVerses(row),
  },
  {
    key: 'lexicons',
    label: 'Lexicons Lampas has no entry for',
    why: 'Lampas opens a lexicon only where it knows how the entry is found (Ask for a book).',
    fits: (row) => isType(row, 'text.monograph.lexicon'),
  },
  {
    key: 'grammars',
    label: 'Grammars Lampas has no sections for',
    why: 'Lampas opens a grammar only at a section it has read (Ask for a book).',
    fits: (row) => isType(row, 'text.monograph.grammar'),
  },
  {
    key: 'bibles',
    label: 'Bibles in another language',
    why: 'Lampas opens English Bibles and the Greek texts it lists.',
    fits: (row) => isType(row, 'text.monograph.bible'),
  },
  {
    key: 'tools',
    label: 'Interactive and pronunciation tools',
    why: 'Lampas has its own.',
    fits: (row) => isType(row, 'lbx.interactive', 'lbx.pronunciations'),
  },
  {
    key: 'data',
    label: 'Datasets, media and cross-references',
    why: 'they open only inside Logos.',
    fits: (row) => row.type.startsWith('lbx.'),
  },
  {
    key: 'books',
    label: 'Other books, collected works, sermons and journals',
    why: 'Lampas links a book only where it opens at the word, the verse or the day.',
    fits: (row) => row.type.startsWith('text.'),
  },
];

/** What is said of a book of a kind the table lacks. */
export const UNKNOWN: Pick<Reason, 'key' | 'label' | 'why'> = { key: 'unknown', label: 'Books of a kind Lampas does not know', why: 'it cannot open them yet.' };

/** The key of the first reason that fits the row, 'unknown' when none does. */
export function reasonOf(row: ExportRow, covers: readonly string[]): string {
  return REASONS.find((r) => r.fits(row, covers))?.key ?? UNKNOWN.key;
}

export interface ReasonLine {
  key: string;
  label: string;
  why: string;
  count: number;
}

/** The lines of the page 'What they are': one for each reason that has rows, the most books first, at most 12. */
export function reasonLines(keys: readonly string[]): ReasonLine[] {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  const known = [...REASONS, UNKNOWN];
  return [...counts]
    .map(([key, count]): ReasonLine => {
      const r = known.find((x) => x.key === key) ?? UNKNOWN;
      return { key, label: r.label, why: r.why, count };
    })
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : 1))
    .slice(0, 12);
}

/** One line as the page prints it. */
export const lineText = (l: ReasonLine): string => `${l.label} (${l.count.toLocaleString('en')}): ${l.why}`;
