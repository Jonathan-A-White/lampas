// scripts/lxx/report.ts — npm run lxx:report [-- --build <n>]
// Writes docs/lxx-report.md between its markers (docs/lxx-derivation.md, 'The report'; story mw-u2w5klk.4): this build's known-answer scores, then one row for
// each of the 39 books of Swete's Old Testament: its words, the share each layer settled, the words still pending, guesses, agreement breaks per 1,000
// words, the second pass's disagreement rate (from B4's recheck files, when there are any), and SHIPPABLE or NOT with the failing bar lines named
// (bar.ts). It is the build's one place to see a book fall short. A second run on the same inputs writes the same bytes.
// Network only to fetch the pinned sources into data/raw (skipped when present); no paid API is called.
// A book with a Morpheus cache (data/lxx/morpheus/<book>.tsv, morpheus.ts) also shows how many of its guesses Morpheus agreed with, differed from and did not
// know (release.ts, morpheusCounts); a book with none shows a dash.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BAR, chaptersOf, verdict, type Failure } from './bar';
import { readChoiceDir, readRecheckDir, type Choice } from './choices';
import { deriveBook, loadInput, splitBooks, train, type DeriveInput } from './derive';
import { KNOWN_DIR, knownScores, type KnownScore } from './known';
import { readMorpheusCache } from './morpheus';
import { RECHECK_DIR, CHOICES_DIR, currentBuild, figuresOf, joinChoices, morpheusOf, type MorpheusCounts } from './release';
import { RAW_DIR, type Fetcher } from './sources';
import { OUT_DIR } from './derive';

export const REPORT_DOC = join('docs', 'lxx-report.md');
export const REPORT_START = '<!-- lxx-report:start -->';
export const REPORT_END = '<!-- lxx-report:end -->';

/** The 39 books of the Old Testament as Swete numbers them, by his book codes (the file has 60: the rest are the Apocrypha, the Psalms of Solomon, the Odes and 1 Enoch). */
export const OLD_TESTAMENT: ReadonlyArray<readonly [code: string, name: string]> = [
  ['Gen', 'Genesis'],
  ['Exo', 'Exodus'],
  ['Lev', 'Leviticus'],
  ['Num', 'Numbers'],
  ['Deu', 'Deuteronomy'],
  ['Jos', 'Joshua'],
  ['Jdg', 'Judges'],
  ['Rut', 'Ruth'],
  ['1Sa', '1 Samuel'],
  ['2Sa', '2 Samuel'],
  ['1Ki', '1 Kings'],
  ['2Ki', '2 Kings'],
  ['1Ch', '1 Chronicles'],
  ['2Ch', '2 Chronicles'],
  ['Ezr', 'Ezra'],
  ['Neh', 'Nehemiah'],
  ['Est', 'Esther'],
  ['Job', 'Job'],
  ['Psa', 'Psalms'],
  ['Pro', 'Proverbs'],
  ['Ecc', 'Ecclesiastes'],
  ['Sol', 'Song of Solomon'],
  ['Isa', 'Isaiah'],
  ['Jer', 'Jeremiah'],
  ['Lam', 'Lamentations'],
  ['Eze', 'Ezekiel'],
  ['Dan', 'Daniel'],
  ['Hos', 'Hosea'],
  ['Joe', 'Joel'],
  ['Amo', 'Amos'],
  ['Oba', 'Obadiah'],
  ['Jon', 'Jonah'],
  ['Mic', 'Micah'],
  ['Nah', 'Nahum'],
  ['Hab', 'Habakkuk'],
  ['Zep', 'Zephaniah'],
  ['Hag', 'Haggai'],
  ['Zec', 'Zechariah'],
  ['Mal', 'Malachi'],
];

/** The share of a second pass's choices that differ from the first pass's on the same word (another parsing, or another lemma when both name one). */
export function disagreement(first: ReadonlyMap<string, Choice>, second: ReadonlyMap<string, Choice>): { sample: number; differ: number } {
  let sample = 0;
  let differ = 0;
  for (const [ref, two] of second) {
    const one = first.get(ref);
    if (!one) continue;
    sample++;
    if (one.parsing !== two.parsing || (one.lemma && two.lemma && one.lemma !== two.lemma)) differ++;
  }
  return { sample, differ };
}

export interface BookRow {
  code: string;
  name: string;
  words: number;
  /** the words each layer settled: layer 1, 2, 2a, and 3 the model's choices */
  layers: { '1': number; '2': number; '2a': number; '3': number };
  pending: number;
  guesses: number;
  breaks: number;
  secondPass: { sample: number; differ: number };
  /** the guesses against Morpheus; undefined when the book has no cache */
  morpheus?: MorpheusCounts;
  shippable: boolean;
  failures: Failure[];
}

const pct = (a: number, n: number): string => (n === 0 ? '—' : `${((100 * a) / n).toFixed(1)}%`);
const per1000 = (k: number, n: number): string => (n === 0 ? '—' : ((1000 * k) / n).toFixed(1));
/** The failing lines for a table cell: the known-answer lines are the build's, shown once and read in the table above. */
const shortLines = (failures: readonly Failure[]): string =>
  [...(failures.some((f) => f.key === 'known') ? ['known answer'] : []), ...failures.filter((f) => f.key !== 'known').map((f) => f.short)].join('; ');
const num = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** The block between the markers: the build's known-answer scores, the bar, and the table of books. */
export function reportBlock(build: number, known: readonly KnownScore[], rows: readonly BookRow[]): string {
  const out: string[] = [REPORT_START, ''];
  out.push(`Build ${build}. The bar (\`scripts/lxx/bar.ts\`): known-answer lemma at least ${BAR.knownLemma}% and full parsing at least ${BAR.knownParsing}% on each chapter below; no word pending; guesses at most ${BAR.guesses}% of the book's words; agreement breaks at most ${BAR.breaks} per 1,000 words.`);
  out.push('', '### The known-answer chapters of this build', '');
  out.push('| Chapter | Book hidden | Words | Lemma right | Full parsing right | Pending, no choice | Choices |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const s of known) {
    const choices = s.choices.file ? `\`${s.choices.file.split(/[\\/]/).slice(-3).join('/')}\`: ${s.choices.given}` : 'none';
    out.push(`| ${s.chapter} | ${s.hidden} | ${s.words} | ${pct(s.all.lemma, s.words)} | ${pct(s.all.full, s.words)} | ${s.unanswered} | ${choices} |`);
  }
  out.push('', '### The books', '');
  out.push(
    '| Book | Words | Layer 1 | Layer 2 | Layer 2a | Layer 3 | Pending | Guesses | Breaks per 1,000 | Second pass differs | Morpheus agreed / differed / unknown | Bar |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  );
  for (const r of rows) {
    const second = r.secondPass.sample ? `${pct(r.secondPass.differ, r.secondPass.sample)} of ${r.secondPass.sample}` : '—';
    const morpheus = r.morpheus ? `${r.morpheus.agreed} / ${r.morpheus.disagreed} / ${r.morpheus.unknown}` : '—';
    const ships = r.shippable ? 'SHIPPABLE' : `NOT: ${shortLines(r.failures)}`;
    out.push(
      `| ${r.name} (${r.code}) | ${num(r.words)} | ${pct(r.layers['1'], r.words)} | ${pct(r.layers['2'], r.words)} | ${pct(r.layers['2a'], r.words)} | ${pct(r.layers['3'], r.words)} | ${num(r.pending)} | ${pct(r.guesses, r.words)} | ${per1000(r.breaks, r.words)} | ${second} | ${morpheus} | ${ships} |`,
    );
  }
  const total = rows.reduce((s, r) => s + r.words, 0);
  const shippable = rows.filter((r) => r.shippable).length;
  out.push('', `${num(total)} words in ${rows.length} books; ${shippable} SHIPPABLE. A book is SHIPPABLE when it fails none of the bar's lines, and then \`npm run lxx:release -- --book <code>\` writes its annotation file.`, '', REPORT_END);
  return out.join('\n');
}

/** The doc with the text between the markers replaced by `block` (which carries the markers). */
export function withReport(doc: string, block: string): string {
  const from = doc.indexOf(REPORT_START);
  const to = doc.indexOf(REPORT_END);
  if (from < 0 || to < 0) throw new Error(`${REPORT_DOC} has no ${REPORT_START} ... ${REPORT_END} block`);
  return doc.slice(0, from) + block + doc.slice(to + REPORT_END.length);
}

export const REPORT_INTRO = `# The Septuagint derivation: where every book stands

Written by \`npm run lxx:report\` (scripts/lxx/report.ts) between the markers below; a second run on the same inputs changes nothing. Method, bar and files:
[lxx-derivation.md](lxx-derivation.md). A book falls short on one or more lines of the bar, and the last column names them. The other 21 books of Swete's file
(the Apocrypha, the Psalms of Solomon, the Odes, 1 Enoch) are not assessed.

`;

export interface ReportArgs {
  build?: number;
}

const USAGE = 'usage: npm run lxx:report [-- --build <n>]';

export function parseArgs(argv: readonly string[]): ReportArgs {
  if (argv.length === 0) return {};
  const build = argv[1];
  if (argv.length !== 2 || argv[0] !== '--build' || !/^\d+$/.test(build ?? '')) throw new Error(USAGE);
  return { build: Number(build) };
}

export interface ReportOptions {
  rawDir?: string;
  /** the doc to write; default docs/lxx-report.md */
  doc?: string;
  choicesDir?: string;
  recheckDir?: string;
  knownDir?: string;
  /** where the Morpheus caches are; default data/lxx/morpheus */
  morpheusDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  input?: DeriveInput;
  /** the books to report, as [Swete's code, name]; default the 39 of the Old Testament */
  books?: ReadonlyArray<readonly [string, string]>;
  /** the known-answer scores of the chapters it is asked for, when a test gives them; otherwise the chapters of the build (bar.ts, chaptersOf) are run */
  known?: (chapters: readonly string[]) => KnownScore[];
}

export async function runReport(argv: readonly string[], options: ReportOptions = {}): Promise<{ rows: BookRow[]; known: KnownScore[]; text: string }> {
  const { rawDir = RAW_DIR, doc = REPORT_DOC, choicesDir = CHOICES_DIR, recheckDir = RECHECK_DIR, knownDir = KNOWN_DIR, morpheusDir = join(OUT_DIR, 'morpheus'), log = () => {}, fetcher, books = OLD_TESTAMENT } = options;
  const args = parseArgs(argv);
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const build = args.build ?? currentBuild();
  const known = (options.known ?? ((chapters) => knownScores(input, chapters, knownDir)))(chaptersOf(build));
  const trained = train(input);
  const tokens = splitBooks(input);
  const rows: BookRow[] = [];
  for (const [code, name] of books) {
    const book = tokens.get(code);
    if (!book || book.words.length === 0) throw new Error(`no book '${code}' in Swete's file`);
    const cache = readMorpheusCache(morpheusDir, code);
    const result = deriveBook(input, code, undefined, trained, book, cache);
    const { choices } = readChoiceDir(choicesDir, `${result.book}-`);
    const joined = joinChoices(result, choices);
    const figures = figuresOf(result, joined);
    const v = verdict(figures, known);
    const count = (layer: string): number => joined.rows.filter((w) => String(w.layer) === layer).length;
    rows.push({
      code,
      name,
      words: figures.words,
      layers: { '1': count('1'), '2': count('2'), '2a': count('2a'), '3': count('3') },
      pending: figures.pending,
      guesses: figures.guesses,
      breaks: figures.breaks,
      secondPass: disagreement(choices, readRecheckDir(recheckDir, result.book).choices),
      morpheus: morpheusOf(result, joined, cache),
      shippable: v.shippable,
      failures: v.failures,
    });
    log(`${code}: ${figures.words} words, ${v.shippable ? 'SHIPPABLE' : `NOT: ${shortLines(v.failures)}`}`);
  }
  const block = reportBlock(build, known, rows);
  const text = withReport(existsSync(doc) ? readFileSync(doc, 'utf8') : `${REPORT_INTRO}${REPORT_START}\n${REPORT_END}\n`, block);
  writeFileSync(doc, text);
  log(`wrote ${doc}`);
  return { rows, known, text };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runReport(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
