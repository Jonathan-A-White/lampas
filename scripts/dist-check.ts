// scripts/dist-check.ts — npm run dist:check [-- --dist <dir>] [-- --choices <dir>]  (story mw-fnvjof.17.351)
// Looks at dist before a deploy replaces the live site. `npm run build` alone copies public/data-lxx, whose index.json has `books: []` by design (scripts/lxx/ship.ts), so a build with no
// `npm run lxx:ship -- --out dist/data-lxx` exits 0 and ships a Septuagint with no books (the incident of 2026-11-27, mw-fnvjof.17.350). `npm run build:live` runs the build, the ship and this check.
// One line a fault, each beginning `dist:check:`; exit 1 when there is any. Faults: (a) data-lxx/index.json lists no book while data/lxx/choices holds a <book>-*.tsv; (b) a book the index lists has no chapter
// file in dist/data-lxx; (c) dist/index.html is missing.
// Other things made only at deploy or by a separate script (sweep, mw-fnvjof.17.351): sermons, maps, timeline and sentences are committed under public/ and copied by the build, and lemma-forms and the
// audio index are made by `npm run build` itself, so none of them can come out empty from a missing step; the Septuagint is the only one a deploy makes apart from the build.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_DIST = 'dist';
export const DEFAULT_CHOICES = join('data', 'lxx', 'choices');

/** What the check reads of a dist folder and the repo, as plain values so a test gives its own. */
export interface DistState {
  /** dist/index.html is there */
  indexHtml: boolean;
  /** the text of dist/data-lxx/index.json; null when there is none */
  lxxIndex: string | null;
  /** every file under dist/data-lxx, relative, with `/` */
  lxxFiles: string[];
  /** the names in data/lxx/choices that are a book's choices file (<book>-*.tsv) */
  choices: string[];
}

const FAULT = 'dist:check:';
const INDEX_PATH = 'dist/data-lxx/index.json';

/** The faults of a dist, one line each; none when it is whole. */
export function checkDist(state: DistState): string[] {
  const faults: string[] = [];
  if (!state.indexHtml) faults.push(`${FAULT} dist/index.html is missing: the build did not run or did not finish`);

  const wanted = state.choices.some((name) => /^[a-z0-9]+-.+\.tsv$/.test(name));
  let books: { code?: unknown; shipped?: unknown }[] | null = null;
  if (state.lxxIndex !== null) {
    try {
      const parsed = JSON.parse(state.lxxIndex) as { books?: unknown };
      if (Array.isArray(parsed.books)) books = parsed.books as { code?: unknown; shipped?: unknown }[];
    } catch {
      books = null;
    }
  }
  if (books === null) {
    if (wanted) faults.push(`${FAULT} ${INDEX_PATH} is missing or is not an index: the Septuagint was not shipped (run npm run lxx:ship -- --out dist/data-lxx, or npm run build:live)`);
    return faults;
  }
  if (books.length === 0) {
    if (wanted) faults.push(`${FAULT} no book is shipped: ${INDEX_PATH} lists none, but data/lxx/choices has choices files (run npm run lxx:ship -- --out dist/data-lxx, or npm run build:live)`);
    return faults;
  }
  const files = new Set(state.lxxFiles);
  for (const book of books) {
    const code = String(book.code);
    const shipped = Array.isArray(book.shipped) ? book.shipped.map(Number) : [];
    if (!state.lxxFiles.some((file) => file.startsWith(`${code}/`))) {
      faults.push(`${FAULT} the index lists book ${code} but dist/data-lxx/${code} has no chapter file`);
      continue;
    }
    const missing = shipped.filter((n) => !files.has(`${code}/${n}.json`));
    if (missing.length) faults.push(`${FAULT} book ${code} lists chapters shipped that have no file in dist/data-lxx/${code}: ${missing.join(', ')}`);
  }
  return faults;
}

function filesUnder(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path, `${prefix}${name}/`));
    else out.push(`${prefix}${name}`);
  }
  return out;
}

/** Reads a dist folder and the choices folder into the state the check wants; a folder that is not there reads as nothing. */
export function readDist(dist: string, choices: string): DistState {
  const lxx = join(dist, 'data-lxx');
  const index = join(lxx, 'index.json');
  return {
    indexHtml: existsSync(join(dist, 'index.html')),
    lxxIndex: existsSync(index) ? readFileSync(index, 'utf8') : null,
    lxxFiles: existsSync(lxx) ? filesUnder(lxx) : [],
    choices: existsSync(choices) ? readdirSync(choices).filter((name) => /^[a-z0-9]+-.+\.tsv$/.test(name)) : [],
  };
}

function flag(argv: string[], name: string, fallback: string): string {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
}

export function main(argv: string[]): number {
  const dist = flag(argv, '--dist', DEFAULT_DIST);
  const faults = checkDist(readDist(dist, flag(argv, '--choices', DEFAULT_CHOICES)));
  for (const line of faults) console.error(line);
  if (!faults.length) console.log(`dist:check: ${dist} is whole`);
  return faults.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv.slice(2)));
