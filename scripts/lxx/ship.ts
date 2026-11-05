// scripts/lxx/ship.ts — npm run lxx:ship -- --out <dir> [--no-morpheus] [--build <n>]
// Ships the Septuagint as it is built (story mw-u2w5klk.265; docs/lxx-derivation.md, 'The commands'): for every book of Swete's 39 that has a choices file (data/lxx/choices/<book>-*.tsv) it derives the
// book (the Morpheus cache read when there is one, `--no-morpheus` leaves it off; Docker is never needed), releases the book's shippable Greek chapters (release.ts planBook: the chapter bar, the
// build's known-answer lines and the book's guess line) to a temporary annotation set, and builds the chapter files, index.json, the lexicon and the notice files (LICENSE-swete.txt, README-swete.md, README.md)
// into <dir>. It is the Laptop's deploy step, after `npm run build`: `npm run lxx:ship -- --out dist/data-lxx`. It writes nothing under data/, public/ or docs/ (a repo with no choices file has `books: []`
// in public/data-lxx/index.json and keeps it). One line a book (`gen: shipped 1-6 of 50`); a derive or build error fails the run, and nothing shippable does not.
// Network only to fetch the pinned sources into data/raw (skipped when present); no paid API is called.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLxxInput, writeLxx, type LxxInput, type Written } from '../data-build-lxx';
import { writeIfChanged } from '../data/chapterWriter';
import { readChoiceDir } from './choices';
import { OUT_DIR, deriveBook, loadInput, splitBooks, train, type DeriveInput } from './derive';
import { KNOWN_DIR, knownScores, type KnownScore } from './known';
import { readMorpheusCache } from './morpheus';
import { CHOICES_DIR, chapterOfRef, currentBuild, joinChoices, knownChaptersOf, planBook, shippedWords } from './release';
import { OLD_TESTAMENT } from './report';
import { RAW_DIR, type Fetcher } from './sources';

/** The hand-written notice beside the Septuagint's files, copied to <dir>/README.md. */
export const NOTICE = join('public', 'data-lxx', 'README.md');

export interface ShipArgs {
  out: string;
  /** read the Morpheus caches (default); `--no-morpheus` leaves them off */
  morpheus: boolean;
  build?: number;
}

const USAGE = 'usage: npm run lxx:ship -- --out <dir> [--no-morpheus] [--build <n>]';

export function parseArgs(argv: readonly string[]): ShipArgs {
  const args: ShipArgs = { out: '', morpheus: true };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--no-morpheus') args.morpheus = false;
    else if (flag === '--out' || flag === '--build') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(USAGE);
      if (flag === '--out') args.out = value;
      else if (/^\d+$/.test(value)) args.build = Number(value);
      else throw new Error(USAGE);
    } else throw new Error(USAGE);
  }
  if (!args.out) throw new Error(USAGE);
  return args;
}

export interface ShipOptions {
  rawDir?: string;
  /** where the books' choices files are; default data/lxx/choices */
  choicesDir?: string;
  /** where the known-answer chapters' choices files are; default data/lxx/known */
  knownDir?: string;
  /** where the Morpheus caches are; default data/lxx/morpheus */
  morpheusDir?: string;
  /** the notice copied to <dir>/README.md; default public/data-lxx/README.md */
  notice?: string;
  /** where the temporary annotation set is made; default the system's temporary directory */
  scratch?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text for the derivation, when a test gives them */
  input?: DeriveInput;
  /** the build's sources, read from the annotation directory the run made; default the pinned files (data-build-lxx.ts loadLxxInput) */
  load?: (annotationsDir: string) => Promise<LxxInput>;
  /** the known-answer scores of the chapters it is asked for, when a test gives them */
  known?: (chapters: readonly string[]) => KnownScore[];
  /** the books to consider, as [Swete's code, name]; default the 39 of the Old Testament */
  books?: ReadonlyArray<readonly [string, string]>;
}

export interface Shipped {
  /** the books that had a choices file: their lower-case code, the Greek chapters shipped, and the book's chapter count */
  books: Array<{ code: string; shipped: number[]; chapters: number }>;
  written: Written;
}

/** Whether the choices directory holds a file for the book: `<book>-<anything>.tsv`. */
const hasChoices = (dir: string, code: string): boolean => existsSync(dir) && readdirSync(dir).some((f) => f.startsWith(`${code.toLowerCase()}-`) && f.endsWith('.tsv'));

export async function runShip(argv: readonly string[], options: ShipOptions = {}): Promise<Shipped> {
  const { rawDir = RAW_DIR, choicesDir = CHOICES_DIR, knownDir = KNOWN_DIR, morpheusDir = join(OUT_DIR, 'morpheus'), notice = NOTICE, scratch = tmpdir(), log = () => {}, fetcher, books = OLD_TESTAMENT } = options;
  const args = parseArgs(argv);
  const started = Date.now();
  const named = books.filter(([code]) => hasChoices(choicesDir, code));
  const out: Shipped['books'] = [];
  const work = mkdtempSync(join(scratch, 'lampas-lxx-ship-'));
  const annotations = join(work, 'annotations');
  try {
    mkdirSync(annotations, { recursive: true });
    if (named.length === 0) log('no book has a choices file: nothing is derived, and the index is empty');
    else {
      const input = options.input ?? (await loadInput(rawDir, fetcher, log));
      const build = args.build ?? currentBuild();
      const asked = knownChaptersOf(build, knownDir);
      if (asked.note) log(asked.note);
      const known = (options.known ?? ((chapters) => knownScores(input, chapters, knownDir)))(asked.chapters);
      const trained = train(input);
      const tokens = splitBooks(input);
      for (const [code] of named) {
        const book = tokens.get(code);
        if (!book || book.words.length === 0) throw new Error(`no book '${code.toLowerCase()}' in Swete's file`);
        const cache = args.morpheus ? readMorpheusCache(morpheusDir, code) : undefined;
        const result = deriveBook(input, code, undefined, trained, book, cache);
        const joined = joinChoices(result, readChoiceDir(choicesDir, `${result.book}-`).choices);
        const plan = planBook(result, joined, known);
        const chapters = Math.max(...plan.all);
        if (plan.text !== undefined) writeFileSync(join(annotations, `${result.book}.tsv`), plan.text);
        // a line held once for the whole run (the known-answer lines, the guess line) is named; a chapter's own failures are in `lxx:report`
        const why = plan.holds.length > 0 ? ` (held: ${plan.holds.map((f) => f.short).join('; ')})` : '';
        log(`${result.book}: shipped ${shippedWords(plan.shipped, plan.all)}${why}`);
        // a word with a parsing Lampas cannot put in words holds its chapter back and does not stop the run (mw-u2w5klk.270): the word is named, so it can be fixed
        for (const w of plan.unsayable) log(`${result.book}: ${w.ref} has the parsing ${JSON.stringify(w.morph)}, which Lampas cannot put in words: chapter ${chapterOfRef(w.ref)} is not shipped`);
        out.push({ code: result.book, shipped: plan.shipped, chapters });
      }
    }
    const lxx = await (options.load ?? ((dir) => loadLxxInput({ rawDir, annotationsDir: dir, log })))(annotations);
    const written = writeLxx(lxx, args.out, log);
    if (!existsSync(notice)) throw new Error(`the notice ${notice} is not there`);
    if (writeIfChanged(join(args.out, 'README.md'), readFileSync(notice, 'utf8'))) written.written++;
    log(`lxx:ship: ${out.length} book${out.length === 1 ? '' : 's'} with a choices file, ${((Date.now() - started) / 1000).toFixed(1)} s, into ${args.out}`);
    return { books: out, written };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runShip(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
