// scripts/lxx/release.ts — npm run lxx:release -- --book <code> [--build <n>]
// The annotation file of a book (docs/lxx-derivation.md, 'The annotation file'; story mw-u2w5klk.4). The book's derived rows (layers 1, 2 and 2a) are joined
// with every choices file of the book (data/lxx/choices/<book>-*.tsv, layer 3). The chapter is the unit that ships (mw-u2w5klk.265, 'The chapter bar'): each Greek chapter is held
// against the chapter bar (bar.ts chapterVerdict) and the build's known-answer runs and the book's guess line are held once (a failing one refuses the whole run), and
// data/lxx/annotations/<book>.tsv is written with the rows of the shippable chapters only, a first line naming them (`# shipped chapters: 1-6 of 50`, or `all 50`); with none
// shippable nothing is written and each failing line is named. The file is the MIT release:
// ref, lemma, parsing, layer, confidence, notes, one row a word in the text's order, never Swete's own words. Two runs on the same inputs write the same bytes.
// Network only to fetch the pinned sources into data/raw (skipped when present); no paid API is called.
// When the book has a Morpheus cache (data/lxx/morpheus/<book>.tsv, morpheus.ts) its analyses are candidates, and the run counts the book's guesses Morpheus
// agreed with, disagreed with and did not know (`morpheusCounts`), a line of the run and a column of `lxx:report`. Docker is never needed here: the cache is read.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BAR, buildNumber, chapterVerdict, knownChaptersFor, verdict, type BookFigures, type ChapterFigures, type ChapterVerdict, type Failure, type Verdict } from './bar';
import { applyChoices, isGuess, readChoiceDir, type Choice, type Chosen } from './choices';
import { OUT_DIR, deriveBook, loadInput, type BookResult, type DeriveInput, type DerivedWord, type PendingWord } from './derive';
import { chapterRanges } from '../data/lxxChapter';
import { decodeParse } from '../../src/data/parseCode';
import { morpheusKey, noMorpheusWarning, readMorpheusCache, type MorpheusCache } from './morpheus';
import { KNOWN_DIR, knownFileOf, knownScores, type KnownScore } from './known';
import { RAW_DIR, type Fetcher } from './sources';
import { bareOf } from './swete';
import { morphsAgree } from './agreement';

/** Where the choices for Swete's books are kept: data/lxx/choices/<book>-<batch>.tsv (B4's batches: gen-01.tsv). */
export const CHOICES_DIR = join(OUT_DIR, 'choices');
/** Where the second pass's choices on a sample of a book are kept: the same shape, data/lxx/recheck/<book>.tsv (lxx:choose --recheck writes it). */
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

/** The guesses of a book against Morpheus: how many it agreed with, disagreed with, and did not know. */
export interface MorpheusCounts {
  agreed: number;
  disagreed: number;
  unknown: number;
}

/**
 * Each guess (a word's form, and the lemma and parsing the model gave it) against the cache. Agreed: a reading of Morpheus's has the guess's parsing and the
 * lemma's letters (accents and breathings aside). Disagreed: Morpheus has mapped readings and none is the guess. Unknown: the form is not in the cache, or
 * Morpheus gave it no reading the mapping covers.
 */
export function morpheusCounts(guesses: ReadonlyArray<{ form: string; lemma: string; morph: string }>, cache: MorpheusCache): MorpheusCounts {
  const counts: MorpheusCounts = { agreed: 0, disagreed: 0, unknown: 0 };
  for (const g of guesses) {
    const known = cache.get(morpheusKey(g.form))?.analyses ?? [];
    if (known.length === 0) counts.unknown++;
    else if (known.some((m) => m.code === g.morph && bareOf(m.lemma) === bareOf(g.lemma))) counts.agreed++;
    else counts.disagreed++;
  }
  return counts;
}

/** A book's guesses (the joined rows of layer 3 marked `guess:`) against its cache; undefined when the book has no cache. */
export function morpheusOf(result: BookResult, joined: Joined, cache: MorpheusCache | undefined): MorpheusCounts | undefined {
  if (!cache) return undefined;
  const forms = new Map(result.words.map((w) => [w.ref, w.form]));
  return morpheusCounts(
    joined.rows.filter(isGuess).map((w) => ({ form: forms.get(w.ref) ?? '', lemma: w.lemma, morph: w.morph })),
    cache,
  );
}

export const morpheusLine = (c: MorpheusCounts): string => `Morpheus: ${c.agreed} agreed, ${c.disagreed} disagreed, ${c.unknown} unknown (the guesses)`;

/** The annotation file's text: tab-separated, the line naming the shipped chapters when one is given, a header row, one row a word in the text's order, a newline at the end. */
export function annotationsTsv(rows: readonly DerivedWord[], shipped?: string): string {
  const table = [ANNOTATION_HEADER, ...rows.map((w) => [w.ref, w.lemma, w.morph, String(w.layer), w.confidence.toFixed(2), w.notes.join('; ')])].map((r) => r.join('\t')).join('\n') + '\n';
  return shipped ? `${shipped}\n${table}` : table;
}

// ---------------------------------------------------------------- the chapter bar

/** The Greek chapter a reference or a verse is in: 'Gen.1:20#13' and 'Gen.1:20' are 1. */
export const chapterOfRef = (ref: string): number => {
  const m = /^[^.]+\.(\d+):/.exec(ref);
  if (!m) throw new Error(`'${ref}' is not a reference like Gen.1:20#13`);
  return Number(m[1]);
};

/** The words holding a Greek chapter back, by reference: those with no answer, the two words of each break the model's answers leave standing, and those with a parsing Lampas cannot put in words. */
export interface Holding {
  pending: string[];
  breaks: Array<[string, string]>;
  unsayable: string[];
}

/** One Greek chapter of a book: its own figures held against the chapter bar. */
export interface ChapterRow extends ChapterFigures {
  chapter: number;
  verdict: ChapterVerdict;
  holding: Holding;
}

/** Whether Lampas can put a parsing in words (decodeParse): the build of a chapter stops at a row it cannot, so the bar holds the chapter back before (mw-u2w5klk.270). */
export function sayable(parsing: string): boolean {
  try {
    decodeParse(parsing);
    return true;
  } catch {
    return false;
  }
}

/** The joined rows whose parsing Lampas cannot put in words, in the text's order. */
export const unsayableRows = (joined: Joined): DerivedWord[] => joined.rows.filter((w) => !sayable(w.morph));

/**
 * The breaks of a book that still stand (mw-u2w5klk.298): the agreement check marks a break where two settled words do not agree and sends both to the model; a break is answered once the two
 * words have answers that agree (`τὴν ἵππον`, Gen 14:11: the model's feminine for a noun the New Testament has as a masculine). One whose words have no answer, or answers that still disagree, stands.
 * A result with no pairs (a hand-made one) counts every break by its verse.
 */
export function standingBreaks(result: BookResult, joined: Joined): Array<{ verse: string; pair?: [string, string] }> {
  const { breakVerses, breakPairs } = result.agreement;
  const morphs = new Map(joined.rows.map((w) => [w.ref, w.morph]));
  return breakVerses.flatMap((verse, i) => {
    const pair = breakPairs?.[i];
    if (!pair) return [{ verse }];
    const [x, y] = [morphs.get(pair[0]), morphs.get(pair[1])];
    return x !== undefined && y !== undefined && morphsAgree(x, y) ? [] : [{ verse, pair }];
  });
}

/** Each Greek chapter of a book (in order) with its words, pending words, guesses, agreement breaks that stand and words with a parsing it cannot put in words, and the chapter bar's verdict on them. */
export function chapterRows(result: BookResult, joined: Joined): ChapterRow[] {
  const by = new Map<number, { figures: ChapterFigures; holding: Holding }>();
  const at = (ref: string) => {
    const n = chapterOfRef(ref);
    let f = by.get(n);
    if (!f) by.set(n, (f = { figures: { words: 0, pending: 0, guesses: 0, breaks: 0, unsayable: 0 }, holding: { pending: [], breaks: [], unsayable: [] } }));
    return f;
  };
  for (const w of result.words) at(w.ref).figures.words++;
  for (const w of joined.left) {
    const c = at(w.ref);
    c.figures.pending++;
    c.holding.pending.push(w.ref);
  }
  for (const w of joined.rows) if (isGuess(w)) at(w.ref).figures.guesses++;
  for (const b of standingBreaks(result, joined)) {
    const c = at(b.verse);
    c.figures.breaks++;
    if (b.pair) c.holding.breaks.push(b.pair);
  }
  for (const w of unsayableRows(joined)) {
    const c = at(w.ref);
    c.figures.unsayable!++;
    c.holding.unsayable.push(w.ref);
  }
  return [...by].sort(([a], [b]) => a - b).map(([chapter, { figures, holding }]) => ({ chapter, ...figures, verdict: chapterVerdict(figures), holding }));
}

/** How many words a held chapter's line names before it says "and N more". */
const NAMED_WORDS = 4;

/**
 * One line a Greek chapter the bar holds back (mw-u2w5klk.298): `gen: chapter 14 is not shipped: breaks: 5.7 per 1,000 words, 3 in 522 (the bar: at most 5): Gen.14:11#3 τὴν + Gen.14:11#4 ἵππον, ...`.
 * It names each failing clause and the first few words that hold the chapter (a word with no answer; the two words of a break; a word with a parsing it cannot put in words), `forms` giving a word's printed form by its reference.
 */
export function heldLines(book: string, chapters: readonly ChapterRow[], forms: ReadonlyMap<string, string> = new Map()): string[] {
  const word = (ref: string): string => (forms.has(ref) ? `${ref} ${forms.get(ref)}` : ref);
  return chapters
    .filter((c) => !c.verdict.shippable)
    .map((c) => {
      // a break under the line holds nothing back: only the chapter whose breaks line fails names them
      const breaks = c.verdict.failures.some((f) => f.key === 'breaks') ? c.holding.breaks : [];
      const named = [...c.holding.pending.map(word), ...breaks.map(([x, y]) => `${word(x)} + ${word(y)}`), ...c.holding.unsayable.map(word)];
      const more = named.length > NAMED_WORDS ? `, and ${named.length - NAMED_WORDS} more` : '';
      return `${book}: chapter ${c.chapter} is not shipped: ${c.verdict.failures.map((f) => f.line).join('; ')}: ${named.slice(0, NAMED_WORDS).join(', ')}${more}`;
    });
}

/** The first line of a partly or wholly shipped book's annotation file: `# shipped chapters: 1-6 of 50`, `1-2, 4-6 of 50`, or `all 50` when every chapter of the book is in it. */
export function shippedLine(shipped: readonly number[], all: readonly number[]): string {
  const total = Math.max(0, ...all);
  if (shipped.length === all.length && shipped.length > 0) return `# shipped chapters: all ${total}`;
  return `# shipped chapters: ${chapterRanges(shipped)} of ${total}`;
}

/** How a book stands for a reader of the report or the run: `1-6 of 50`, `all 50` or `none of 50` (the same words the file's first line has). */
export const shippedWords = (shipped: readonly number[], all: readonly number[]): string =>
  shipped.length === 0 ? `none of ${Math.max(0, ...all)}` : shippedLine(shipped, all).replace('# shipped chapters: ', '');

/** A book's chapters held against the bar: what ships, and what stops the run. */
export interface BookPlan {
  chapters: ChapterRow[];
  /** the Greek chapters that ship, in order */
  shipped: number[];
  /** every Greek chapter of the book */
  all: number[];
  /** the lines held once for the whole run: the known-answer lines of this build, and the book's guess line */
  holds: Failure[];
  /** what refuses the run (a hold, or no shippable chapter); undefined when something ships */
  refusal?: Verdict;
  /** the words whose parsing Lampas cannot put in words (their chapters are not shippable) */
  unsayable: DerivedWord[];
  /** the annotation file: the rows of the shipped chapters under their line; undefined when the run is refused */
  text?: string;
}

/**
 * The book held against the bar as the chapter is the unit: the known-answer lines and the book's guess line (over all its words) are held once and refuse the run when one fails;
 * then each chapter is held against the chapter bar, and the shippable ones make the file. No shippable chapter refuses the run, naming each chapter's failing lines.
 */
export function planBook(result: BookResult, joined: Joined, known: readonly KnownScore[]): BookPlan {
  const chapters = chapterRows(result, joined);
  const all = chapters.map((c) => c.chapter);
  const shipped = chapters.filter((c) => c.verdict.shippable).map((c) => c.chapter);
  // the book's verdict with the lines that are not held once left at zero: the known-answer lines and the guess line
  const holds = verdict({ ...figuresOf(result, joined), pending: 0, breaks: 0 }, known).failures;
  const stuck = shipped.length === 0 ? chapters.flatMap((c) => c.verdict.failures.map((f) => ({ ...f, line: `chapter ${c.chapter}: ${f.line}` }))) : [];
  if (holds.length > 0 || shipped.length === 0) {
    return { chapters, shipped: [], all, holds, unsayable: unsayableRows(joined), refusal: { shippable: false, failures: [...holds, ...stuck] } };
  }
  const keep = new Set(shipped);
  return { chapters, shipped, all, holds, unsayable: unsayableRows(joined), text: annotationsTsv(joined.rows.filter((w) => keep.has(chapterOfRef(w.ref))), shippedLine(shipped, all)) };
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

/** The lines of a refusal a message shows: a book with every chapter failing has hundreds, and the first dozen name the trouble. */
const SHOWN_LINES = 12;

export class ReleaseRefused extends Error {
  book: string;
  verdict: Verdict;
  /** no chapter of the book is shippable (as against a line held for the whole run failing) */
  noChapter: boolean;
  constructor(book: string, verdict: Verdict, noChapter = false) {
    const lines = verdict.failures.map((f) => `  ${f.line}`);
    super(
      [
        `lxx:release --book ${book}: refused, nothing written. The bar is not met:`,
        ...(noChapter ? ['  no chapter is shippable'] : []),
        ...lines.slice(0, SHOWN_LINES),
        ...(lines.length > SHOWN_LINES ? [`  ... and ${lines.length - SHOWN_LINES} more lines`] : []),
      ].join('\n'),
    );
    this.book = book;
    this.verdict = verdict;
    this.noChapter = noChapter;
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
  /** where the Morpheus caches are; default <outDir>/morpheus */
  morpheusDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them */
  input?: DeriveInput;
  /** the known-answer scores of the chapters it is asked for, when a test gives them; otherwise the chapters of the build (knownChaptersOf) are run */
  known?: (chapters: readonly string[]) => KnownScore[];
}

export interface Released {
  book: string;
  words: number;
  /** the lines held once for the whole run (the known-answer lines and the book's guess line): met, or the run would have been refused */
  verdict: Verdict;
  /** where the file was written */
  path: string;
  /** the Greek chapters in the file, and how many chapters the book has */
  shipped: number[];
  chapters: number;
  /** the guesses against Morpheus, when the book has a cache */
  morpheus?: MorpheusCounts;
}

/** The known-answer chapters a build is held to, given the choices files data/lxx/known holds (bar.ts, knownChaptersFor). */
export const knownChaptersOf = (build: number, knownDir: string = KNOWN_DIR): { chapters: string[]; note?: string } =>
  knownChaptersFor(build, (chapter) => existsSync(join(knownDir, knownFileOf(chapter))));

/** The lines of a run that say what a plan shipped and held back: for lxx:release's log. */
export function planLines(plan: BookPlan): string[] {
  const held = plan.chapters.filter((c) => !c.verdict.shippable);
  const lines = [`shipped chapters: ${shippedWords(plan.shipped, plan.all)}`];
  if (held.length > 0) lines.push(`held back: ${held.length} chapter${held.length === 1 ? '' : 's'}, ${held.filter((c) => c.pending > 0).length} with a word pending, ${held.filter((c) => c.verdict.failures.some((f) => f.key === 'breaks')).length} over the breaks line`);
  const guessed = plan.chapters.filter((c) => c.guesses > 0 && plan.shipped.includes(c.chapter));
  if (guessed.length > 0) lines.push(`guesses in the shipped chapters (a figure, not a hold): ${guessed.map((c) => `${c.chapter}: ${c.guesses} of ${c.words} words, ${c.verdict.guessShare.toFixed(1)}%`).join('; ')}`);
  return lines;
}

export async function runRelease(argv: readonly string[], options: ReleaseOptions = {}): Promise<Released> {
  const { rawDir = RAW_DIR, outDir = OUT_DIR, choicesDir = CHOICES_DIR, knownDir = KNOWN_DIR, log = () => {}, fetcher } = options;
  const args = parseArgs(argv);
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const morpheusDir = options.morpheusDir ?? join(outDir, 'morpheus');
  const cache = readMorpheusCache(morpheusDir, args.book);
  // the guess line of the chapter bar reads high without the cache: warned, not refused (mw-u2w5klk.271)
  const missing = noMorpheusWarning(morpheusDir, args.book);
  if (missing) log(missing);
  const result = deriveBook(input, args.book, undefined, undefined, undefined, cache);
  const { files, choices } = readChoiceDir(choicesDir, `${args.book}-`);
  const joined = joinChoices(result, choices);
  for (const r of joined.chosen.refused) log(`refused choice ${r.ref}: ${r.why}`);
  const build = args.build ?? currentBuild();
  const asked = knownChaptersOf(build, knownDir);
  if (asked.note) log(asked.note);
  const known = (options.known ?? ((chapters) => knownScores(input, chapters, knownDir)))(asked.chapters);
  const figures = figuresOf(result, joined);
  log(`${result.book}: ${figures.words} words; ${joined.rows.length} answered, ${figures.pending} pending, ${figures.guesses} guesses, ${figures.breaks} breaks; ${files.length} choices files; build ${build}`);
  const morpheus = morpheusOf(result, joined, cache);
  if (morpheus) log(morpheusLine(morpheus));
  const plan = planBook(result, joined, known);
  for (const line of planLines(plan)) log(line);
  if (plan.refusal || plan.text === undefined) throw new ReleaseRefused(result.book, plan.refusal ?? { shippable: false, failures: [] }, plan.shipped.length === 0);
  const path = join(outDir, 'annotations', `${result.book}.tsv`);
  mkdirSync(join(outDir, 'annotations'), { recursive: true });
  writeFileSync(path, plan.text);
  log(`wrote ${path}: ${plan.shipped.length} of ${plan.all.length} chapters meet the chapter bar (no word pending, breaks at most ${BAR.breaks} per 1,000), under the known-answer lines (at least ${BAR.knownLemma}% lemma and ${BAR.knownParsing}% full parsing) and the book's guess line (at most ${BAR.guesses}%)`);
  return { book: result.book, words: figures.words, verdict: { shippable: true, failures: [] }, path, shipped: plan.shipped, chapters: Math.max(...plan.all), morpheus };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runRelease(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
