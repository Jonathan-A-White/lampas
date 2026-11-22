// Every shipped Septuagint book is either paired or pending with its pass story named (story mw-u2w5klk.349.60; his ask of 2026-11-20:
// "as books are added to the Septuagint that this matching piece also is listed to do that"). The English-to-Greek pairing pass of the epic
// mw-u2w5klk.349 is one story a book, filed by hand; Judges shipped with none and was found only by his tap. data/lxx/pairing-status.json names
// each shipped book `paired` or `pending: <bead id>[, <bead id>]`; this test fails, naming the book, when a shipped book is in neither state.
// A book is shipped the way the ship reads it (scripts/lxx/ship.ts): it has a choices file, data/lxx/choices/<book>-*.tsv; the books of
// the books of docs/lxx-align/ (one file a book, the ship's own record, mw-u2w5klk.349.73) are read too.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALIGN_REPORT_DIR } from '../../scripts/lxx/align';
import { CHOICES_DIR } from '../../scripts/lxx/release';
import { OLD_TESTAMENT } from '../../scripts/lxx/report';

const STATUS_FILE = 'data/lxx/pairing-status.json';
const PENDING = /^pending: mw-[a-z0-9]+(\.[0-9]+)*(, mw-[a-z0-9]+(\.[0-9]+)*)*$/;

/** The code of each shipped book, as Swete's lower-case code (`gen`, `1sa`). */
export function shippedBooks(): string[] {
  const codes = new Set<string>();
  for (const f of readdirSync(CHOICES_DIR)) {
    const m = /^([a-z0-9]+)-.*\.tsv$/.exec(f);
    if (m) codes.add(m[1]);
  }
  for (const f of readdirSync(ALIGN_REPORT_DIR)) {
    const m = /^([a-z0-9]+)\.txt$/.exec(f);
    if (m) codes.add(m[1]);
  }
  return [...codes].sort();
}

/** The manifest's verdict on each book: the problem as a sentence, or '' when the book is in a state. */
export function statusProblem(books: string[], status: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const book of books) {
    const s = status[book];
    if (s === undefined) problems.push(`${book}: shipped but not in ${STATUS_FILE}; add it as "paired" or "pending: <bead id of its pairing pass>" and file the pass`);
    else if (s !== 'paired' && !(typeof s === 'string' && PENDING.test(s))) problems.push(`${book}: ${JSON.stringify(s)} is neither "paired" nor "pending: <bead id>"`);
  }
  return problems;
}

describe('the Septuagint pairing pass of every shipped book (mw-u2w5klk.349.60)', () => {
  const status = JSON.parse(readFileSync(STATUS_FILE, 'utf8')) as Record<string, unknown>;

  it('finds the shipped books', () => {
    const books = shippedBooks();
    expect(books).toContain('gen');
    expect(books).toContain('jdg');
  });

  it('has every shipped book paired or pending with its pass story named', () => {
    expect(statusProblem(shippedBooks(), status)).toEqual([]);
  });

  it('names a book that is in neither state', () => {
    expect(statusProblem(['gen', 'zzz'], { gen: 'paired' })).toEqual([expect.stringContaining('zzz: shipped but not in')]);
    expect(statusProblem(['gen'], { gen: 'pending' })).toEqual([expect.stringContaining('gen: "pending" is neither')]);
    expect(statusProblem(['gen', 'exo'], { gen: 'paired', exo: 'pending: mw-u2w5klk.349.8' })).toEqual([]);
  });

  it('holds only books of the Old Testament', () => {
    const codes = new Set(OLD_TESTAMENT.map(([code]) => code.toLowerCase()));
    for (const book of Object.keys(status)) expect(codes.has(book), `${book} is not a book of Swete's Old Testament`).toBe(true);
  });
});
