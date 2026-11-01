// scripts/lxx/known.ts — npm run lxx:known -- --chapter Jhn.1 [--chapter <other>] [--choices <file>] [--choices-dir <dir>] [--keep-demoted]
// The known-answer run (docs/lxx-derivation.md, 'The known-answer run'; the probe's 'The known-answer run: John 1'; story mw-u2w5klk.4). A New Testament
// chapter is put through layers 1, 2 and 2a with its whole book hidden from the form index and the parser, and each word is scored against TAGNT's own
// row: the lemma exactly (NFC, so accents count), and 'full' the lemma and the whole parsing, a noun's semantic tags (-T, -P, -L) dropped. The chapter's
// words are TAGNT's NA28 words, one after another, read as a book of Swete's would be, so the references are the derivation's own (Jhn.1:33#23).
// The words that stay pending are chosen from a choices file (choices.ts) when there is one, so a model session's choices are scored the same way;
// a pending word with no choice is counted wrong, unless --keep-demoted asks for the probe's reading (below). Network only to fetch the pinned
// sources into data/raw (skipped when present); no paid API is called.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAW_DIR, type Fetcher } from './sources';
import { applyChoices, isGuess, readChoices, type Choice } from './choices';
import { deriveBook, loadInput, train, type BookResult, type DeriveInput, type Trained } from './derive';
import { inNa28, readTagnt, type TagntRow } from './tagnt';

/** Where a chapter's choices are kept: data/lxx/known/<book>-<chapter>.tsv (jhn-1.tsv), apart from the choices for Swete's books (data/lxx/choices). */
export const KNOWN_DIR = join('data', 'lxx', 'known');

/** The file name of a chapter's choices: 'Jhn.1' -> 'jhn-1.tsv'. */
export const knownFileOf = (chapter: string): string => `${chapter.toLowerCase().replace('.', '-')}.tsv`;

export interface ChapterRef {
  /** TAGNT's book code as written ('Jhn', '1Co') */
  book: string;
  chapter: number;
}

export function parseChapter(text: string): ChapterRef {
  const m = /^([1-3A-Za-z]{3})\.(\d+)$/.exec(text);
  if (!m) throw new Error(`'${text}' is not a chapter like Jhn.1`);
  return { book: m[1], chapter: Number(m[2]) };
}

/** TAGNT's NA28 words of a chapter, in verse and word order (a word given by two files is taken once): the words scored. */
export function chapterRows(tagnt: readonly string[], ref: ChapterRef): TagntRow[] {
  const book = ref.book.toLowerCase();
  const seen = new Set<string>();
  const rows = readTagnt(tagnt)
    .filter((r) => r.book.toLowerCase() === book && r.chapter === ref.chapter && inNa28(r))
    .filter((r) => !seen.has(`${r.verse}#${r.word}`) && !!seen.add(`${r.verse}#${r.word}`))
    .sort((a, b) => a.verse - b.verse || a.word - b.word);
  if (rows.length === 0) throw new Error(`TAGNT has no NA28 words for ${ref.book}.${ref.chapter}`);
  return rows;
}

/** The chapter's words in the shape of Swete's two files, so deriveBook reads them as a book: each verse's first line, then one word a line. */
export function chapterInput(rows: readonly TagntRow[], from: Pick<DeriveInput, 'tagnt' | 'tbesg'>): DeriveInput {
  const starts: string[] = [];
  let last = '';
  rows.forEach((r, i) => {
    const verse = `${r.book}.${r.chapter}:${r.verse}`;
    if (verse !== last) starts.push(`${i + 1}\t${verse}`);
    last = verse;
  });
  return { versification: starts.join('\n'), words: rows.map((r, i) => `${i + 1}\t${r.form}`).join('\n'), tagnt: from.tagnt, tbesg: from.tbesg };
}

export interface Tally {
  words: number;
  /** the lemma matches TAGNT's exactly */
  lemma: number;
  /** the lemma and the whole parsing match */
  full: number;
}

const tally = (): Tally => ({ words: 0, lemma: 0, full: 0 });
const add = (t: Tally, lemmaRight: boolean, fullRight: boolean): void => {
  t.words++;
  if (lemmaRight) t.lemma++;
  if (fullRight) t.full++;
};

/** Which answer scored a word: layer 1, 2, 2a or 3, 'kept' the answer layer 1 or 2 gave before the check demoted it (--keep-demoted), 'none' no answer at all. */
export type Source = '1' | '2' | '2a' | '3' | 'kept' | 'none';
export const SOURCES: readonly Source[] = ['1', '2', '2a', '3', 'kept', 'none'];

export interface KnownScore {
  /** 'Jhn.1' */
  chapter: string;
  /** the book hidden, in lower case */
  hidden: string;
  words: number;
  /** layers 1 and 2 alone, before the agreement check: the probe's table */
  before: { 1: Tally; 2: Tally };
  /** after the check and the choices, by the source of each word's final answer */
  by: Record<Source, Tally>;
  /** every word of the chapter; a word with no answer is wrong */
  all: Tally;
  /** words of layer 3 that are guesses */
  guesses: number;
  /** words left with no answer: pending, no choice (and not kept) */
  unanswered: number;
  choices: { file?: string; given: number; refused: number; notPending: number };
}

export interface ScoreOptions {
  /** score a pending word with no choice by the answer it had before the agreement check (the probe's reading, which had no check); default: it has no answer */
  keepDemoted?: boolean;
  /** where the choices came from, for the printout */
  file?: string;
}

/** A chapter run as a book (deriveBook, its book hidden), scored against TAGNT's rows for the same words, in order. */
export function scoreChapter(chapter: string, result: BookResult, gold: readonly TagntRow[], choices: ReadonlyMap<string, Choice> = new Map(), options: ScoreOptions = {}): KnownScore {
  if (result.words.length !== gold.length) throw new Error(`${chapter}: ${result.words.length} words read, ${gold.length} in TAGNT`);
  const answer = new Map(result.words.map((w, i) => [w.ref, gold[i]]));
  const right = (ref: string, lemma: string, morph: string): [boolean, boolean] => {
    const g = answer.get(ref)!;
    return [lemma === g.lemma, lemma === g.lemma && morph === g.morph];
  };
  const score: KnownScore = {
    chapter,
    hidden: result.book,
    words: result.words.length,
    before: { 1: tally(), 2: tally() },
    by: { '1': tally(), '2': tally(), '2a': tally(), '3': tally(), kept: tally(), none: tally() },
    all: tally(),
    guesses: 0,
    unanswered: 0,
    choices: { file: options.file, given: choices.size, refused: 0, notPending: 0 },
  };
  for (const w of result.beforeCheck.derived) {
    const [l, f] = right(w.ref, w.lemma, w.morph);
    add(score.before[w.layer as 1 | 2], l, f);
  }
  const chosen = applyChoices(result.pending, choices);
  score.choices.refused = chosen.refused.length;
  score.choices.notPending = chosen.unused.length;
  const settled = new Map<string, { source: Source; lemma: string; morph: string }>();
  for (const w of result.derived) settled.set(w.ref, { source: String(w.layer) as Source, lemma: w.lemma, morph: w.morph });
  for (const w of chosen.chosen) {
    settled.set(w.ref, { source: '3', lemma: w.lemma, morph: w.morph });
    if (isGuess(w)) score.guesses++;
  }
  const before = new Map(result.beforeCheck.derived.map((w) => [w.ref, w]));
  for (const w of result.words) {
    let got = settled.get(w.ref);
    const old = before.get(w.ref);
    if (!got && options.keepDemoted && old) got = { source: 'kept', lemma: old.lemma, morph: old.morph };
    if (!got) {
      add(score.by.none, false, false);
      add(score.all, false, false);
      score.unanswered++;
      continue;
    }
    const [l, f] = right(w.ref, got.lemma, got.morph);
    add(score.by[got.source], l, f);
    add(score.all, l, f);
  }
  return score;
}

/** One chapter through layers 1, 2 and 2a with its book hidden, then scored; `trained` is the book-hidden form index and parser when the caller has them. */
export function knownRun(
  chapter: string,
  input: Pick<DeriveInput, 'tagnt' | 'tbesg'>,
  choices?: ReadonlyMap<string, Choice>,
  options: ScoreOptions = {},
  trained?: Trained,
): KnownScore {
  const ref = parseChapter(chapter);
  const rows = chapterRows(input.tagnt, ref);
  const asBook = chapterInput(rows, input);
  const hide = ref.book.toLowerCase();
  const result = deriveBook(asBook, hide, hide, trained ?? train(asBook, hide));
  return scoreChapter(`${ref.book}.${ref.chapter}`, result, rows, choices, options);
}

/** The choices file of a chapter under `dir`, when there is one. */
export function knownChoices(chapter: string, dir: string = KNOWN_DIR): { file?: string; choices: Map<string, Choice> } {
  const file = join(dir, knownFileOf(chapter));
  if (!existsSync(file)) return { choices: new Map() };
  return { file, choices: readChoices(readFileSync(file, 'utf8'), file) };
}

/** The chapters of a build, each run with the choices file the directory holds for it. */
export function knownScores(input: Pick<DeriveInput, 'tagnt' | 'tbesg'>, chapters: readonly string[], dir: string = KNOWN_DIR, options: ScoreOptions = {}): KnownScore[] {
  return chapters.map((chapter) => {
    const { file, choices } = knownChoices(chapter, dir);
    return knownRun(chapter, input, choices, { ...options, file });
  });
}

// ---------------------------------------------------------------- the printout

const pct = (a: number, n: number): string => (n === 0 ? '—' : `${((100 * a) / n).toFixed(1)}%`);
const rate = (t: Tally): string => `${t.words} words, lemma ${t.lemma} (${pct(t.lemma, t.words)}), lemma and full parsing ${t.full} (${pct(t.full, t.words)})`;

/** What the run prints for a chapter. */
export function knownLines(s: KnownScore): string[] {
  const lines = [`${s.chapter} (${s.hidden} hidden from layers 1 and 2): ${s.words} words`];
  lines.push(`  layers 1 and 2 alone, before the agreement check: layer 1 ${rate(s.before[1])}; layer 2 ${rate(s.before[2])}`);
  for (const source of SOURCES) {
    if (source === 'none' || s.by[source].words === 0) continue;
    const name = source === '3' ? `layer 3 (${s.choices.file ?? 'no choices file'}: ${s.choices.given} choices, ${s.choices.refused} refused, ${s.choices.notPending} for words not pending; ${s.guesses} guesses)` : source === 'kept' ? 'kept from before the check (--keep-demoted)' : `layer ${source}`;
    lines.push(`  ${name}: ${rate(s.by[source])}`);
  }
  if (s.unanswered > 0) lines.push(`  no answer, counted wrong: ${s.unanswered} words (pending, no choice${s.choices.file ? '' : '; no choices file'})`);
  lines.push(`  all: ${rate(s.all)}`);
  return lines;
}

export interface KnownArgs {
  chapters: string[];
  choices?: string;
  choicesDir?: string;
  keepDemoted: boolean;
}

const USAGE = 'usage: npm run lxx:known -- --chapter <Jhn.1> [--chapter <Rom.8> ...] [--choices <file> (one chapter)] [--choices-dir <dir>] [--keep-demoted]';

export function parseArgs(argv: readonly string[]): KnownArgs {
  const chapters: string[] = [];
  let choices: string | undefined;
  let choicesDir: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--keep-demoted') continue;
    if (flag !== '--chapter' && flag !== '--choices' && flag !== '--choices-dir') throw new Error(USAGE);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(USAGE);
    if (flag === '--chapter') chapters.push(parseChapter(value) && value);
    else if (flag === '--choices') choices = value;
    else choicesDir = value;
  }
  if (chapters.length === 0 || (choices && chapters.length !== 1)) throw new Error(USAGE);
  return { chapters, choices, choicesDir, keepDemoted: argv.includes('--keep-demoted') };
}

export interface KnownOptions {
  rawDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them (only tagnt and tbesg are read) */
  input?: Pick<DeriveInput, 'tagnt' | 'tbesg'>;
}

export async function runKnown(argv: readonly string[], options: KnownOptions = {}): Promise<KnownScore[]> {
  const { rawDir = RAW_DIR, log = () => {}, fetcher } = options;
  const args = parseArgs(argv);
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const scores = args.chapters.map((chapter) => {
    const given = args.choices ? { file: args.choices, choices: readChoices(readFileSync(args.choices, 'utf8'), args.choices) } : knownChoices(chapter, args.choicesDir);
    return knownRun(chapter, input, given.choices, { keepDemoted: args.keepDemoted, file: given.file });
  });
  for (const s of scores) for (const line of knownLines(s)) log(line);
  return scores;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runKnown(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
