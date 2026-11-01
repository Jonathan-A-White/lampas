// scripts/lxx/batches.ts — npm run lxx:batches -- --book <code> [--size <n>]
// A book's pending words cut into the batches a model session works (docs/lxx-derivation.md, 'A model session'; story mw-u2w5klk.5): about 700 words a batch,
// cut at a chapter boundary, so the stories of one book never share a choices file. Prints the table the Mayor files the model stories from: the batch, its
// chapters, its pending words and how many of them have no candidate. A pure reading of the derivation (derive.ts); no paid API, and the network only to
// fetch the pinned sources into data/raw (skipped when present).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { deriveBook, loadInput, type BookResult, type DeriveInput, type PendingWord } from './derive';
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
  return { book: book.toLowerCase(), batch, size: whole('--size') ?? BATCH_SIZE, recheck, from };
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
  return deriveBook(options.input ?? (await loadInput(rawDir, fetcher, log)), book);
}

export const BATCHES_USAGE = 'usage: npm run lxx:batches -- --book <code>';

export async function runBatches(argv: readonly string[], options: RunOptions = {}): Promise<Batch[]> {
  const { log = () => {} } = options;
  const args = parseBookArgs(argv, BATCHES_USAGE);
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
