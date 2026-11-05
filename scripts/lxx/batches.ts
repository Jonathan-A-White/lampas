// scripts/lxx/batches.ts — npm run lxx:batches -- --book <code> [--size <n>]
// A book's pending words cut into the batches a model session works (docs/lxx-derivation.md, 'A model session'; story mw-u2w5klk.5): about 700 words a batch,
// cut at a chapter boundary, so the stories of one book never share a choices file. Prints the table the Mayor files the model stories from: the batch, its
// chapters, its pending words and how many of them have no candidate. A pure reading of the derivation (derive.ts); no paid API, and the network only to
// fetch the pinned sources into data/raw (skipped when present).
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_DIR, deriveBook, loadInput, opensClause, splitBooks, train, type BookResult, type DeriveInput, type PendingWord } from './derive';
import { isCapital } from './parser';
import type { SweteWord } from './swete';
import { morpheusBuildCommand, noMorpheusWarning, readMorpheusCache } from './morpheus';
import { existsSync } from 'node:fs';
import { OLD_TESTAMENT } from './report';
import { RAW_DIR, type Fetcher } from './sources';

/** About how many pending words a batch holds; the cut falls at the chapter boundary nearest to it. */
export const BATCH_SIZE = 700;

/** The chapter of a reference ('Gen.1:20#13' -> 1). */
export const chapterOf = (ref: string): number => Number(/^[^.]+\.(\d+):/.exec(ref)?.[1] ?? NaN);

/** 'gen-01': the name of a book's nth batch, which names its choices file (data/lxx/choices/gen-01.tsv) and its listing. */
export const batchName = (book: string, n: number): string => `${book.toLowerCase()}-${String(n).padStart(2, '0')}`;

export interface Batch {
  /** 1, 2, ... */
  n: number;
  /** 'gen-01' */
  name: string;
  firstChapter: number;
  lastChapter: number;
  /** the pending words of those chapters, in the text's order */
  words: PendingWord[];
  /** how many of them have no candidate */
  noCandidate: number;
}

/**
 * The pending words (in the text's order) cut into runs of whole chapters. A chapter that would take a batch past `size` is taken in when it
 * overshoots by less than the batch falls short without it, and starts the next batch otherwise; a chapter as large as a batch or larger is a batch of its own.
 */
export function cutBatches(pending: readonly PendingWord[], size: number = BATCH_SIZE): PendingWord[][] {
  const chapters: PendingWord[][] = [];
  for (const word of pending) {
    const last = chapters.at(-1);
    if (last && chapterOf(last[0].ref) === chapterOf(word.ref)) last.push(word);
    else chapters.push([word]);
  }
  const batches: PendingWord[][] = [];
  let current: PendingWord[] = [];
  for (const chapter of chapters) {
    if (current.length > 0 && (chapter.length >= size || current.length + chapter.length - size > size - current.length)) {
      batches.push(current);
      current = [];
    }
    current = current.concat(chapter);
    if (current.length >= size) {
      batches.push(current);
      current = [];
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** A book's batches, numbered from 1. */
export function batchesOf(book: string, pending: readonly PendingWord[], size: number = BATCH_SIZE): Batch[] {
  return cutBatches(pending, size).map((words, i) => ({
    n: i + 1,
    name: batchName(book, i + 1),
    firstChapter: chapterOf(words[0].ref),
    lastChapter: chapterOf(words[words.length - 1].ref),
    words,
    noCandidate: words.filter((w) => w.candidates.length === 0).length,
  }));
}

export const BATCHES_HEADER = ['batch', 'chapters', 'pending', 'no candidate'];

/** The table the Mayor files stories from: tab-separated, a header row, a row a batch, a total row. */
export function batchesTable(batches: readonly Batch[]): string[] {
  const row = (cells: ReadonlyArray<string | number>): string => cells.join('\t');
  return [
    row(BATCHES_HEADER),
    ...batches.map((b) => row([b.n, b.firstChapter === b.lastChapter ? b.firstChapter : `${b.firstChapter}-${b.lastChapter}`, b.words.length, b.noCandidate])),
    row(['total', '', batches.reduce((n, b) => n + b.words.length, 0), batches.reduce((n, b) => n + b.noCandidate, 0)]),
  ];
}

export interface BookArgs {
  book: string;
  batch?: number;
  size: number;
  recheck: boolean;
  from?: string;
  /** `--no-morpheus`: the Builder says the host cannot run Morpheus and the listing may do without its cache (lxx:pending) */
  noMorpheus: boolean;
}

/** The flags every command of the runner shares. `--size` is for a test or an unusual book; the stories use the default. */
export function parseBookArgs(argv: readonly string[], usage: string, flags: { batch?: boolean; from?: boolean } = {}): BookArgs {
  const value = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    const v = at >= 0 ? argv[at + 1] : undefined;
    return v && !v.startsWith('--') ? v : undefined;
  };
  const whole = (flag: string): number | undefined => {
    const v = value(flag);
    if (argv.includes(flag) && (!v || !/^\d+$/.test(v) || Number(v) < 1)) throw new Error(usage);
    return v ? Number(v) : undefined;
  };
  const book = value('--book');
  if (!book) throw new Error(usage);
  const recheck = argv.includes('--recheck');
  const batch = whole('--batch');
  if (flags.batch && !recheck && batch === undefined) throw new Error(usage);
  const from = value('--from');
  if (flags.from && !from) throw new Error(usage);
  return { book: book.toLowerCase(), batch, size: whole('--size') ?? BATCH_SIZE, recheck, from, noMorpheus: argv.includes('--no-morpheus') };
}

export interface RunOptions {
  rawDir?: string;
  /** under which pending/, choices/ and recheck/ are written; default data/lxx */
  outDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them; otherwise the pinned files under rawDir, fetched if absent */
  input?: DeriveInput;
}

/** A book derived, as every command of the runner starts. */
export async function derivedBook(book: string, options: RunOptions): Promise<BookResult> {
  const { rawDir = RAW_DIR, log = () => {}, fetcher } = options;
  return deriveBook(options.input ?? (await loadInput(rawDir, fetcher, log)), book, undefined, undefined, undefined, readMorpheusCache(join(options.outDir ?? OUT_DIR, 'morpheus'), book));
}

/** Where a book's Morpheus cache is under `outDir` (data/lxx/morpheus/<book>.tsv). */
export const morpheusFile = (outDir: string, book: string): string => join(outDir, 'morpheus', `${book.toLowerCase()}.tsv`);

export { morpheusBuildCommand };

/**
 * A listing for a model session is read for its candidates, and without the book's Morpheus cache a form Morpheus knows has 'no candidate' and the guess share
 * is overstated (story mw-u2w5klk.268: 42 words with no candidate against 15 with the cache). So a batch or a recheck listing is refused here, naming the command that builds it,
 * unless `--no-morpheus` says the host truly cannot run it. Docker is never run by the listing: a listing that silently ran it would hide the failure this fixes.
 */
export function requireMorpheusCache(book: string, outDir: string, noMorpheus: boolean): void {
  const file = morpheusFile(outDir, book);
  if (noMorpheus || existsSync(file)) return;
  throw new Error(
    [
      `lxx:pending: no Morpheus cache for ${book} (${file}): without it a form Morpheus knows lists with no candidate, and the guess share is too high.`,
      `Build it first: ${morpheusBuildCommand(book)}`,
      'On a host that cannot run Docker, add --no-morpheus to list without it (and say so on the story).',
    ].join('\n'),
  );
}

/** One line for a command that goes on without the cache (lxx:batches, lxx:choose): its counts differ from a host that has it. */
export function warnNoMorpheus(book: string, outDir: string, log: (line: string) => void): void {
  const line = noMorpheusWarning(join(outDir, 'morpheus'), book);
  if (line) log(line);
}

export const BATCHES_USAGE = 'usage: npm run lxx:batches -- --book <code> | --all';

export const ALL_BOOKS_HEADER = ['book', 'words', 'pending', 'no candidate', 'no candidate % of words', 'of those, a name', 'a name from its form alone', 'both % of words'];

/**
 * The words that are names, by a rule of the print and not of any lexicon: written with a capital, and not the first word of a verse or of a clause (Swete
 * capitalises the word after a full stop or high point). A name that opens a verse or a clause is not counted, and the first word of what someone says, which
 * follows no mark (`εἶπεν ὁ θεός Γενηθήτωσαν`, Gen 1:14), is: an estimate, near the truth for a book of names (Gen 1: 1 of 2 is not one).
 */
export function nameRefs(words: ReadonlyArray<Pick<SweteWord, 'ref' | 'verse' | 'form' | 'display'>>): Set<string> {
  const out = new Set<string>();
  words.forEach((w, i) => {
    if (isCapital(w.form) && !opensClause(words, i)) out.add(w.ref);
  });
  return out;
}

/**
 * What `--all` counts for a book: its words, its pending words, those with no candidate, the no-candidate words that are names (nameRefs), and the words whose only
 * candidates are a name read from its own form (derive.ts withFormNames, support `form`). Those are not forced guesses any more, but no lexicon vouches for them, so the
 * last column of the row adds them back: it is the share the table gave before the form was read as a lemma (docs/lxx-derivation.md, 'Names no lexicon has').
 */
export function bookCounts(result: Pick<BookResult, 'book' | 'words' | 'pending'>): { words: number; pending: number; none: number; names: number; form: number } {
  const names = nameRefs(result.words);
  const none = result.pending.filter((w) => w.candidates.length === 0);
  const form = result.pending.filter((w) => w.candidates.length > 0 && w.candidates.every((c) => c.source === 'form'));
  return { words: result.words.length, pending: result.pending.length, none: none.length, names: none.filter((w) => names.has(w.ref)).length, form: form.length };
}

type Counts = ReturnType<typeof bookCounts>;
const rowOf = (name: string, c: Counts): string =>
  [name, c.words, c.pending, c.none, `${((100 * c.none) / c.words).toFixed(2)}%`, c.names, c.form, `${((100 * (c.none + c.form)) / c.words).toFixed(2)}%`].join('\t');

/** One book's row of `--all`. */
export const bookRow = (result: Pick<BookResult, 'book' | 'words' | 'pending'>): string => rowOf(result.book, bookCounts(result));

/**
 * `--all`: a row for each of the 39 books of the Old Testament (report.ts OLD_TESTAMENT; the model stories are filed from it: how many words each book forces to be a guess, because no candidate
 * can be right), trained once, then a total row. Nothing is written.
 */
export async function runAllBooks(options: RunOptions = {}): Promise<BookResult[]> {
  const { rawDir = RAW_DIR, log = () => {}, fetcher } = options;
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const trained = train(input);
  log(ALL_BOOKS_HEADER.join('\t'));
  const results: BookResult[] = [];
  const wanted = new Set(OLD_TESTAMENT.map(([code]) => code));
  for (const [code, tokens] of splitBooks(input)) {
    if (tokens.words.length === 0 || !wanted.has(code)) continue;
    const result = deriveBook(input, code, undefined, trained, tokens, readMorpheusCache(join(options.outDir ?? OUT_DIR, 'morpheus'), code));
    log(bookRow(result));
    results.push(result);
  }
  const sum = results.map(bookCounts).reduce<Counts>((t, c) => ({ words: t.words + c.words, pending: t.pending + c.pending, none: t.none + c.none, names: t.names + c.names, form: t.form + c.form }), { words: 0, pending: 0, none: 0, names: 0, form: 0 });
  log(rowOf('total', sum));
  const bare = results.filter((r) => !existsSync(morpheusFile(options.outDir ?? OUT_DIR, r.book))).map((r) => r.book);
  if (bare.length > 0) log(`warning: no Morpheus cache for ${bare.length} of ${results.length} books (${bare.join(', ')}): their no-candidate counts are those of a host without it. Build a book's: ${morpheusBuildCommand('<code>')}`);
  return results;
}

export async function runBatches(argv: readonly string[], options: RunOptions = {}): Promise<Batch[]> {
  const { log = () => {} } = options;
  if (argv.includes('--all')) {
    if (argv.includes('--book')) throw new Error(BATCHES_USAGE);
    await runAllBooks(options);
    return [];
  }
  const args = parseBookArgs(argv, BATCHES_USAGE);
  warnNoMorpheus(args.book, options.outDir ?? OUT_DIR, log);
  const result = await derivedBook(args.book, options);
  const batches = batchesOf(result.book, result.pending, args.size);
  for (const line of batchesTable(batches)) log(line);
  return batches;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBatches(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
