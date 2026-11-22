// scripts/lxx/align-expect.ts — npm run lxx:align-expect [-- --book <code>] [--no-morpheus] [--force] (story mw-u2w5klk.349.73; docs/lxx-align.md, 'A pairing pass')
// What a pairing pass used to add by hand to three test files and one table is per-book DATA now, written by this one command from one ship:
//   data/lxx/align/<code>.expect.json   per chapter (those with a file data/lxx/align/<code>-NN.tsv): the counts of `lxx:unpaired` (gaps, 'No Greek by the model'), the English content words that have no Greek
//                                       word (leftovers, each with why: HAND-KEPT, the command writes the word and keeps the why it has) and, where a chapter has them, the aligner's pairs by place that were read
//   docs/lxx-align/<code>.txt           the book's chapters' aligned share (align.ts renderBookReport)
// Two passes on two books write no file in common. tests/unit/lxx-unpaired.test.ts, lxx-align-choose.test.ts and lxx-align-low-confidence.test.ts read the sidecar and fail, in one line that names this
// command, when it is stale (checkCounts, checkLeftovers, checkPlacePairs, checkFiles).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { septuagintChunkLinked } from '../../src/reader/septuagint';
import { LEXICON_FILE } from '../data-build-lxx';
import { ALIGN_REPORT_DIR, lettersOf, stemOf, SUPPLIED_FOR_VERB, SURE, writeBookReport } from './align';
import { ALIGN_CHOICES_DIR } from './align-choose';
import { OLD_TESTAMENT } from './report';
import type { ShipOptions, Shipped } from './ship';
import { countChapter, FUNCTION_WORDS } from './unpaired';

export const EXPECT_DIR = ALIGN_CHOICES_DIR;
export const expectFile = (code: string, dir: string = EXPECT_DIR): string => join(dir, `${code.toLowerCase()}.expect.json`);
/** The command a stale sidecar names. */
export const expectCommand = (code: string): string => `npm run lxx:align-expect -- --book ${code}`;

/** A key and the reason it stands: for a leftover word, why it has no Greek; for a pair by place, 'read' once a Builder has read it against the verse. '' is not yet. */
export type Why = [key: string, why: string];

export interface ChapterExpect {
  /** English content words in a remainder or a chunk with no Greek that is not the model's (lxx:unpaired 'Unpaired') */
  gaps: number;
  /** English content words the model settled as rendering no Greek (lxx:unpaired 'No Greek by the model') */
  model: number;
  /** function words counted as leftovers in this chapter all the same (a 'yes' that is no Greek word's), lower case letters */
  also?: string[];
  /** every English content word of a chunk that opens no Greek word, `chapter:verse:word`, with why; present for a chapter whose words were named */
  leftovers?: Why[];
  /** the aligner's pairs by place (placePairs), `chapter:verse English @position`, 'read'; present for a chapter whose pairs were read */
  placePairs?: Why[];
}

export interface BookExpect {
  /** the reasons the leftovers name by key; a leftover's why is a key of this, or a sentence of its own */
  reasons: Record<string, string>;
  chapters: Record<string, ChapterExpect>;
}

// ---------------------------------------------------------------- the file

const q = (x: unknown): string => JSON.stringify(x);

/** The sidecar as text: one chapter a line where it has no list, one entry a line where it has. Stable: the same data gives the same bytes. */
export function renderExpect(expect: BookExpect): string {
  const reasons = Object.entries(expect.reasons).map(([k, v]) => `    ${q(k)}: ${q(v)}`);
  const chapters = Object.keys(expect.chapters)
    .sort((a, b) => Number(a) - Number(b))
    .map((n) => {
      const c = expect.chapters[n];
      const fields: string[] = [`"gaps": ${c.gaps}`, `"model": ${c.model}`];
      if (c.also && c.also.length > 0) fields.push(`"also": ${q(c.also)}`);
      const lists: string[] = [];
      for (const [name, list] of [['leftovers', c.leftovers], ['placePairs', c.placePairs]] as const) {
        if (list) lists.push(list.length === 0 ? `      "${name}": []` : [`      "${name}": [`, list.map(([k, w]) => `        [${q(k)}, ${q(w)}]`).join(',\n'), '      ]'].join('\n'));
      }
      if (lists.length === 0) return `    ${q(n)}: { ${fields.join(', ')} }`;
      return [`    ${q(n)}: {`, ...fields.map((f) => `      ${f},`), lists.join(',\n'), '    }'].join('\n');
    });
  return `{\n  "reasons": {\n${reasons.join(',\n')}\n  },\n  "chapters": {\n${chapters.join(',\n')}\n  }\n}\n`;
}

export function parseExpect(text: string, where = 'the sidecar'): BookExpect {
  const raw = JSON.parse(text) as Partial<BookExpect>;
  if (!raw || typeof raw !== 'object' || typeof raw.chapters !== 'object' || raw.chapters === null) throw new Error(`${where} has no "chapters"`);
  return { reasons: raw.reasons ?? {}, chapters: raw.chapters };
}

/** The book's sidecar, or undefined where it has none. */
export function readExpect(code: string, dir: string = EXPECT_DIR): BookExpect | undefined {
  const file = expectFile(code, dir);
  return existsSync(file) ? parseExpect(readFileSync(file, 'utf8'), file) : undefined;
}

/** The chapters of a book that have a model file, data/lxx/align/<code>-NN.tsv, ascending. */
export function alignFileChapters(code: string, dir: string = EXPECT_DIR): number[] {
  if (!existsSync(dir)) return [];
  const out: number[] = [];
  for (const f of readdirSync(dir)) {
    const m = new RegExp(`^${code.toLowerCase()}-(\\d+)\\.tsv$`).exec(f);
    if (m) out.push(Number(m[1]));
  }
  return out.sort((a, b) => a - b);
}

/** The codes of the books that have a sidecar in `dir`. */
export function expectBooks(dir: string = EXPECT_DIR): string[] {
  return existsSync(dir) ? readdirSync(dir).flatMap((f) => /^([1-3a-z]{3})\.expect\.json$/.exec(f)?.[1] ?? []).sort() : [];
}

// ---------------------------------------------------------------- measuring a shipped chapter

type Lexicon = Record<string, { g: string; d: string }>;

const isContent = (w: GreekWord): boolean => /^(N|A|V)-/.test(w.p) || w.p === 'ADV';
const stemsOf = (text: string): Set<string> => new Set(text.split(/[^\p{L}]+/u).map(lettersOf).filter((x) => x.length > 1).map(stemOf));

/**
 * The aligner's own chunks (y 'align') with a confidence below SURE (0.6) whose Greek word is a noun, adjective, verb or adverb and whose English no gloss or definition of the Greek word's lemma in the shipped
 * lexicon (the gloss `g` and the definition `d`) says: the pairs made by place, where an English word has been given the Greek word that sits at the same place, and no more. Each is `chapter:verse English @position`.
 * A chunk of the words Brenton supplies for a verb ('I will', 'you shall') is a lead chunk that points at the verb's Greek word by design (joinSupplied), and is left out.
 */
export function placePairs(chapter: Pick<Chapter, 'chapter' | 'verses'>, lexicon: Lexicon): string[] {
  const out: string[] = [];
  for (const verse of chapter.verses) {
    for (const chunk of verse.e) {
      if (chunk.y !== 'align' || !(chunk.c !== undefined && chunk.c < SURE) || chunk.g.length !== 1) continue;
      if (chunk.t.split(/\s+/).every((w) => SUPPLIED_FOR_VERB.has(lettersOf(w)))) continue;
      const word = verse.g[chunk.g[0]];
      if (!word || !isContent(word)) continue;
      const entry = lexicon[word.l];
      const said = stemsOf(`${entry?.g ?? ''} ${entry?.d ?? ''}`);
      const english = stemOf(lettersOf(chunk.t));
      if (said.has(english) || (english.length > 3 && [...said].some((s) => s.startsWith(english.slice(0, 4))))) continue;
      out.push(`${chapter.chapter}:${verse.n} ${chunk.t} @${chunk.g[0]}`);
    }
  }
  return out;
}

/**
 * The English content words (lxx:unpaired's FUNCTION_WORDS left out, but for `also`) of every chunk that opens no Greek word (septuagintChunkLinked is false), each `chapter:verse:word`: a tap on one opens
 * the Verse view, never a wrong word. A remainder or a chunk with no kind is one, and so is a model chunk with no Greek.
 */
export function leftoversOf(chapter: Pick<Chapter, 'chapter' | 'verses'>, also: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const verse of chapter.verses) {
    for (const chunk of verse.e) {
      if (septuagintChunkLinked(chunk)) continue;
      for (const w of chunk.t.split(/\s+/).map(lettersOf)) if (w.length > 0 && (!FUNCTION_WORDS.has(w) || also.includes(w))) out.push(`${chapter.chapter}:${verse.n}:${w}`);
    }
  }
  return out;
}

export interface Measure {
  gaps: number;
  model: number;
  leftovers: string[];
  placePairs: string[];
}

export function measureChapter(chapter: Chapter, lexicon: Lexicon, also: readonly string[] = []): Measure {
  const { gaps, model } = countChapter(chapter);
  return { gaps, model, leftovers: leftoversOf(chapter, also), placePairs: placePairs(chapter, lexicon) };
}

/** Reads the chapters of a shipped directory (`<out>/<code>/<n>.json`) and the lexicon, and measures each chapter named; `alsoOf` gives a chapter's `also`. */
export function measureShipped(out: string, code: string, chapters: readonly number[], alsoOf: (chapter: number) => readonly string[] = () => []): Map<number, Measure> {
  const lexicon = JSON.parse(readFileSync(join(out, LEXICON_FILE), 'utf8')) as Lexicon;
  const measured = new Map<number, Measure>();
  for (const n of chapters) {
    const file = join(out, code, `${n}.json`);
    if (existsSync(file)) measured.set(n, measureChapter(JSON.parse(readFileSync(file, 'utf8')) as Chapter, lexicon, alsoOf(n)));
  }
  return measured;
}

// ---------------------------------------------------------------- writing it

const keyOrder = (a: string, b: string): number => {
  const [ac, av, ...aw] = a.split(/[: ]/);
  const [bc, bv, ...bw] = b.split(/[: ]/);
  return Number(ac) - Number(bc) || Number(av) - Number(bv) || (aw.join(' ') < bw.join(' ') ? -1 : aw.join(' ') > bw.join(' ') ? 1 : 0);
};

/** The measured keys with the why the list had for each (a key found twice takes the whys in order); a key the list did not have gets ''. Sorted by chapter, verse, word. */
export function mergeWhy(measured: readonly string[], previous: readonly Why[] | undefined): Why[] {
  const had = new Map<string, string[]>();
  for (const [k, w] of previous ?? []) had.set(k, [...(had.get(k) ?? []), w]);
  return [...measured]
    .sort(keyOrder)
    .map((k): Why => [k, had.get(k)?.shift() ?? '']);
}

/**
 * The sidecar after a run: for each chapter with a model file, the counts as measured; its leftovers and its pairs by place kept with the why each had, a word new to it with '', and a word gone dropped. A chapter
 * the sidecar had no entry for gets its leftovers (all unreasoned: a Builder writes why) and no pairs by place; a chapter with no model file any more is dropped. `reasons` is hand-kept and stays.
 */
export function updateExpect(previous: BookExpect | undefined, files: readonly number[], measured: ReadonlyMap<number, Measure>): BookExpect {
  const chapters: Record<string, ChapterExpect> = {};
  for (const n of files) {
    const m = measured.get(n);
    if (!m) throw new Error(`chapter ${n} has a model file but was not shipped on this host (is its Morpheus cache here? npm run lxx:link), so the sidecar is left as it was`);
    const was = previous?.chapters[String(n)];
    const c: ChapterExpect = { gaps: m.gaps, model: m.model };
    if (was?.also && was.also.length > 0) c.also = was.also;
    if (was === undefined || was.leftovers !== undefined) c.leftovers = mergeWhy(m.leftovers, was?.leftovers);
    if (was?.placePairs !== undefined) c.placePairs = mergeWhy(m.placePairs, was.placePairs);
    chapters[String(n)] = c;
  }
  return { reasons: previous?.reasons ?? {}, chapters };
}

// ---------------------------------------------------------------- checking it (the tests)

const where = (code: string, dir: string): string => expectFile(code, dir);

const bagDiff = (a: readonly string[], b: readonly string[]): { only: string[]; other: string[] } => {
  const left = new Map<string, number>();
  for (const x of b) left.set(x, (left.get(x) ?? 0) + 1);
  const only: string[] = [];
  for (const x of a) {
    const n = left.get(x) ?? 0;
    if (n > 0) left.set(x, n - 1);
    else only.push(x);
  }
  const other = [...left].flatMap(([k, n]) => Array<string>(n).fill(k));
  return { only, other };
};
const some = (list: readonly string[]): string => (list.length > 6 ? `${list.slice(0, 6).join(', ')} and ${list.length - 6} more` : list.join(', '));

/** The sidecar's chapters are the chapters that have a model file. One line for each that does not hold. */
export function checkFiles(code: string, expect: BookExpect, files: readonly number[], dir: string = EXPECT_DIR): string[] {
  const named = Object.keys(expect.chapters).map(Number).sort((a, b) => a - b);
  const problems: string[] = [];
  const missing = files.filter((n) => !named.includes(n));
  const gone = named.filter((n) => !files.includes(n));
  if (missing.length > 0) problems.push(`${code}: chapter ${some(missing.map(String))} has a model file but is not in ${where(code, dir)}: run \`${expectCommand(code)}\``);
  if (gone.length > 0) problems.push(`${code}: ${where(code, dir)} names chapter ${some(gone.map(String))}, which has no model file: run \`${expectCommand(code)}\``);
  return problems;
}

/** The counts of each chapter the sidecar names, against the chapters as shipped. */
export function checkCounts(code: string, expect: BookExpect, measured: ReadonlyMap<number, Pick<Measure, 'gaps' | 'model'>>, dir: string = EXPECT_DIR): string[] {
  const problems: string[] = [];
  for (const [key, want] of Object.entries(expect.chapters)) {
    const m = measured.get(Number(key));
    if (!m) {
      problems.push(`${code} ${key}: ${where(code, dir)} names it, but it was not shipped: run \`${expectCommand(code)}\``);
      continue;
    }
    for (const field of ['gaps', 'model'] as const) {
      if (m[field] !== want[field]) problems.push(`${code} ${key}: lxx:unpaired reads ${field} ${m[field]}, ${where(code, dir)} says ${want[field]}: run \`${expectCommand(code)}\``);
    }
  }
  return problems;
}

/** The leftover words of each chapter that names them: the same words as shipped, each with a reason. */
export function checkLeftovers(code: string, expect: BookExpect, measured: ReadonlyMap<number, Pick<Measure, 'leftovers'>>, dir: string = EXPECT_DIR): string[] {
  const problems: string[] = [];
  for (const [key, want] of Object.entries(expect.chapters)) {
    const m = measured.get(Number(key));
    if (!m || want.leftovers === undefined) continue;
    const named = want.leftovers.map(([k]) => k);
    const { only, other } = bagDiff(m.leftovers, named);
    if (only.length > 0) problems.push(`${code} ${key}: ${only.length} English content word(s) have no Greek word and ${where(code, dir)} does not name them (${some(only)}): run \`${expectCommand(code)}\`, then write each one's reason`);
    if (other.length > 0) problems.push(`${code} ${key}: ${where(code, dir)} names ${other.length} word(s) that no chunk has without Greek any more (${some(other)}): run \`${expectCommand(code)}\``);
    const bare = want.leftovers.filter(([, why]) => why.trim() === '').map(([k]) => k);
    if (bare.length > 0) problems.push(`${code} ${key}: ${bare.length} leftover word(s) have no reason in ${where(code, dir)} (${some(bare)}): read each against the verse (npm run lxx:align-choose -- --list) and write why it has no Greek word (a key of "reasons" or a sentence), then run \`${expectCommand(code)}\`, which keeps it`);
    for (const [k, why] of want.leftovers) {
      if (why.trim() !== '' && expect.reasons[why] === undefined && /^[a-z0-9]+(-[a-z0-9]+)+$/.test(why)) problems.push(`${code} ${key}: ${k} names the reason '${why}', which ${where(code, dir)} has no "reasons" entry for`);
    }
  }
  return problems;
}

/** The pairs by place of each chapter that names them: the same pairs as shipped, each read. */
export function checkPlacePairs(code: string, expect: BookExpect, measured: ReadonlyMap<number, Pick<Measure, 'placePairs'>>, dir: string = EXPECT_DIR): string[] {
  const problems: string[] = [];
  for (const [key, want] of Object.entries(expect.chapters)) {
    const m = measured.get(Number(key));
    if (!m || want.placePairs === undefined) continue;
    const named = want.placePairs.map(([k]) => k);
    const { only, other } = bagDiff(m.placePairs, named);
    if (only.length > 0) problems.push(`${code} ${key}: ${only.length} pair(s) by place nobody has read (${some(only)}): read each against the verse and the lexicon's entry; fix it with a \`fix\` row or run \`${expectCommand(code)}\` and mark it "read" in ${where(code, dir)}`);
    if (other.length > 0) problems.push(`${code} ${key}: ${where(code, dir)} names ${other.length} pair(s) by place that no chunk has any more (${some(other)}): run \`${expectCommand(code)}\``);
    const unread = want.placePairs.filter(([, why]) => why !== 'read').map(([k]) => k);
    if (unread.length > 0) problems.push(`${code} ${key}: ${unread.length} pair(s) by place are not marked "read" in ${where(code, dir)} (${some(unread)}): read each, mark it, then run \`${expectCommand(code)}\`, which keeps it`);
  }
  return problems;
}

// ---------------------------------------------------------------- the command

const USAGE = 'usage: npm run lxx:align-expect [-- --book <code>] [--no-morpheus] [--force]';

export interface ExpectOptions extends ShipOptions {
  /** the directory of the sidecars; default data/lxx/align (the ship reads the model files from `alignDir`, which is the same unless a test gives another) */
  expectDir?: string;
  /** the directory of the books' files; default docs/lxx-align */
  reportDir?: string;
  /** the ship, when a test gives another; default ship.ts runShip */
  shipper?: (argv: readonly string[], options: ShipOptions) => Promise<Shipped>;
}

export interface Written {
  /** every file the run wrote, as a path */
  files: string[];
  /** the codes of the books it read */
  books: string[];
}

/** Ships into a temporary directory, then writes for each book asked (all that ship by default) its sidecar, where it has model files, and its file under docs/lxx-align. */
export async function runExpect(argv: readonly string[], options: ExpectOptions = {}): Promise<Written> {
  const { log = () => undefined, scratch = tmpdir(), shipper, expectDir = options.alignDir ?? EXPECT_DIR, reportDir = ALIGN_REPORT_DIR, ...ship } = options;
  let book: string | undefined;
  let morpheus = true;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--no-morpheus') morpheus = false;
    else if (argv[i] === '--force') force = true;
    else if (argv[i] === '--book') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(USAGE);
      book = value.toLowerCase();
    } else throw new Error(USAGE);
  }
  const books = (ship.books ?? OLD_TESTAMENT).filter(([code]) => book === undefined || code.toLowerCase() === book);
  if (books.length === 0) throw new Error(`no book '${book}' in the Old Testament's list; ${USAGE}`);
  const dir = mkdtempSync(join(scratch, 'lampas-lxx-expect-'));
  const written: Written = { files: [], books: [] };
  try {
    const runShip = shipper ?? (await import('./ship')).runShip;
    const shipped = await runShip(['--out', dir, ...(morpheus ? [] : ['--no-morpheus'])], { ...ship, alignDir: ship.alignDir ?? expectDir, books, scratch, log });
    if (shipped.books.length === 0) throw new Error(`no book '${book ?? ''}' has a choices file here, so nothing is shipped; ${USAGE}`);
    for (const { code } of shipped.books) {
      written.books.push(code);
      const files = alignFileChapters(code, expectDir);
      if (files.length > 0) {
        const previous = readExpect(code, expectDir);
        const measured = measureShipped(dir, code, files, (n) => previous?.chapters[String(n)]?.also ?? []);
        const next = renderExpect(updateExpect(previous, files, measured));
        const file = expectFile(code, expectDir);
        if (!existsSync(file) || readFileSync(file, 'utf8') !== next) {
          mkdirSync(expectDir, { recursive: true });
          writeFileSync(file, next);
          written.files.push(file);
        }
      }
      const shares = shipped.aligned.filter((s) => s.code === code);
      if (shares.length > 0) {
        const file = join(reportDir, `${code}.txt`);
        if (writeBookReport(file, shares, shipped.withoutMorpheus.includes(code), force)) written.files.push(file);
      }
    }
    log(`lxx:align-expect: ${written.books.join(', ')}; ${written.files.length === 0 ? 'every file is as it was' : `written: ${written.files.join(', ')}`}`);
    return written;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runExpect(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
