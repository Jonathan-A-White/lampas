// scripts/lxx/release.ts — npm run lxx:release -- --book <code> [--build <n>]
// The annotation file of a book (docs/lxx-derivation.md, 'The annotation file'; story mw-u2w5klk.4). The book's derived rows (layers 1, 2 and 2a) are joined
// with every choices file of the book (data/lxx/choices/<book>-*.tsv, layer 3); the book is held against the bar (bar.ts) with this build's known-answer runs;
// only when it passes is data/lxx/annotations/<book>.tsv written, and otherwise nothing is, and each failing line is named. The file is the MIT release:
// ref, lemma, parsing, layer, confidence, notes, one row a word in the text's order, never Swete's own words. Two runs on the same inputs write the same bytes.
// Network only to fetch the pinned sources into data/raw (skipped when present); no paid API is called.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BAR, buildNumber, chaptersOf, verdict, type BookFigures, type Verdict } from './bar';
import { applyChoices, isGuess, readChoiceDir, type Choice, type Chosen } from './choices';
import { OUT_DIR, deriveBook, loadInput, type BookResult, type DeriveInput, type DerivedWord, type PendingWord } from './derive';
import { KNOWN_DIR, knownScores, type KnownScore } from './known';
import { RAW_DIR, type Fetcher } from './sources';

/** Where the choices for Swete's books are kept: data/lxx/choices/<book>-<batch>.tsv (B4's batches: gen-01.tsv). */
export const CHOICES_DIR = join(OUT_DIR, 'choices');
/** Where the second pass's choices on a sample of a book are kept: the same shape, data/lxx/recheck/<book>-<batch>.tsv (B4 writes them). */
export const RECHECK_DIR = join(OUT_DIR, 'recheck');
/** Where the committed, MIT annotation files are written. */
export const ANNOTATIONS_DIR = join(OUT_DIR, 'annotations');

export const ANNOTATION_HEADER = ['ref', 'lemma', 'parsing', 'layer', 'confidence', 'notes'];

/** A book's derived rows and its choices, joined. */
export interface Joined {
  /** every word that has an answer: derived (layers 1, 2, 2a) or chosen (layer 3), in the text's order */
  rows: DerivedWord[];
  /** the words with no answer: no choice, or a choice refused */
  left: PendingWord[];
  chosen: Chosen;
}

export function joinChoices(result: BookResult, choices: ReadonlyMap<string, Choice>): Joined {
  const chosen = applyChoices(result.pending, choices);
  const byRef = new Map<string, DerivedWord>([...result.derived, ...chosen.chosen].map((w) => [w.ref, w]));
  return { rows: result.words.flatMap((w) => byRef.get(w.ref) ?? []), left: chosen.left, chosen };
}

/** What a book is held to besides the known-answer runs, from its joined rows and the agreement check's breaks. */
export const figuresOf = (result: BookResult, joined: Joined): BookFigures => ({
  words: result.words.length,
  pending: joined.left.length,
  guesses: joined.rows.filter(isGuess).length,
  breaks: result.agreement.breaks,
});

/** The annotation file's text: tab-separated, a header row, one row a word in the text's order, a newline at the end. */
export function annotationsTsv(rows: readonly DerivedWord[]): string {
  return [ANNOTATION_HEADER, ...rows.map((w) => [w.ref, w.lemma, w.morph, String(w.layer), w.confidence.toFixed(2), w.notes.join('; ')])].map((r) => r.join('\t')).join('\n') + '\n';
}

/** The build number of this checkout: the patch of package.json's version. */
export function currentBuild(packageJson = 'package.json'): number {
  return buildNumber((JSON.parse(readFileSync(packageJson, 'utf8')) as { version: string }).version);
}

export interface ReleaseArgs {
  book: string;
  build?: number;
}

const USAGE = 'usage: npm run lxx:release -- --book <code> [--build <n>]';

export function parseArgs(argv: readonly string[]): ReleaseArgs {
  const value = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    const v = at >= 0 ? argv[at + 1] : undefined;
    return v && !v.startsWith('--') ? v : undefined;
  };
  const book = value('--book');
  const build = value('--build');
  if (!book || (argv.includes('--build') && (!build || !/^\d+$/.test(build)))) throw new Error(USAGE);
  return { book: book.toLowerCase(), build: build ? Number(build) : undefined };
}

export class ReleaseRefused extends Error {
  book: string;
  verdict: Verdict;
  constructor(book: string, verdict: Verdict) {
    super([`lxx:release --book ${book}: refused, nothing written. The bar is not met:`, ...verdict.failures.map((f) => `  ${f.line}`)].join('\n'));
    this.book = book;
    this.verdict = verdict;
  }
}

export interface ReleaseOptions {
  rawDir?: string;
  /** under which annotations/<book>.tsv is written; default data/lxx */
  outDir?: string;
  /** where the book's choices files are; default data/lxx/choices */
  choicesDir?: string;
  /** where the known-answer chapters' choices files are; default data/lxx/known */
  knownDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them */
  input?: DeriveInput;
  /** the known-answer scores of the chapters it is asked for, when a test gives them; otherwise the chapters of the build (bar.ts, chaptersOf) are run */
  known?: (chapters: readonly string[]) => KnownScore[];
}

export interface Released {
  book: string;
  words: number;
  verdict: Verdict;
  /** where the file was written */
  path: string;
}

export async function runRelease(argv: readonly string[], options: ReleaseOptions = {}): Promise<Released> {
  const { rawDir = RAW_DIR, outDir = OUT_DIR, choicesDir = CHOICES_DIR, knownDir = KNOWN_DIR, log = () => {}, fetcher } = options;
  const args = parseArgs(argv);
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const result = deriveBook(input, args.book);
  const { files, choices } = readChoiceDir(choicesDir, `${args.book}-`);
  const joined = joinChoices(result, choices);
  for (const r of joined.chosen.refused) log(`refused choice ${r.ref}: ${r.why}`);
  const build = args.build ?? currentBuild();
  const known = (options.known ?? ((chapters) => knownScores(input, chapters, knownDir)))(chaptersOf(build));
  const figures = figuresOf(result, joined);
  const verdict_ = verdict(figures, known);
  log(`${result.book}: ${figures.words} words; ${joined.rows.length} answered, ${figures.pending} pending, ${figures.guesses} guesses, ${figures.breaks} breaks; ${files.length} choices files; build ${build}`);
  if (!verdict_.shippable) throw new ReleaseRefused(result.book, verdict_);
  const path = join(outDir, 'annotations', `${result.book}.tsv`);
  mkdirSync(join(outDir, 'annotations'), { recursive: true });
  writeFileSync(path, annotationsTsv(joined.rows));
  log(`wrote ${path}: the bar is met (known answer at least ${BAR.knownLemma}% lemma and ${BAR.knownParsing}% full parsing, no word pending, guesses at most ${BAR.guesses}%, breaks at most ${BAR.breaks} per 1,000)`);
  return { book: result.book, words: figures.words, verdict: verdict_, path };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runRelease(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
