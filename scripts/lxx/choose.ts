// scripts/lxx/choose.ts — npm run lxx:choose -- --book <code> --batch <n> --from <file>   |   --recheck --book <code> --from <file>
// Takes a model session's choices back (docs/lxx-derivation.md, 'A model session'; story mw-u2w5klk.5). The session's file has one line a word:
// `ref parsing [lemma] [?] [guess]`, the probe's format: `?` marks a choice the model is unsure of, `guess` a choice outside the candidates (or for a word with
// none). It is checked against the batch's pending words and written as data/lxx/choices/<book>-<batch>.tsv (the choices file choices.ts reads, with the
// confidence and a note added): 0.8 chosen, 0.5 unsure, 0.4 guess. A line whose lemma and parsing are not among the word's candidates and that does not say
// `guess`, a reference not in the batch, a reference twice and a batch with a word missing are each refused with their reference, and nothing is written on
// any refusal. `--recheck` takes the second pass over the blind sample of `lxx:pending --recheck` the same way into data/lxx/recheck/<book>.tsv.
// One file a batch, so the stories of one book never touch the same file. No paid API is called.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { batchName, batchesOf, derivedBook, parseBookArgs, type RunOptions } from './batches';
import {
  CHOICES_HEADER,
  CONFIDENCE_CHOSEN,
  CONFIDENCE_GUESS,
  CONFIDENCE_UNSURE,
  NOTE_GUESS_MARKED,
  NOTE_GUESS_NO_CANDIDATE,
  NOTE_GUESS_OUTSIDE,
  NOTE_UNSURE,
  type ChoiceMark,
} from './choices';
import { OUT_DIR, type PendingWord } from './derive';
import { recheckWords } from './pending';

/** One line of a model session's file. */
export interface ModelLine {
  ref: string;
  parsing: string;
  /** NFC; empty when the line names none */
  lemma: string;
  mark: ChoiceMark;
  /** the line's number in the file, from 1 */
  line: number;
}

/** A line of the choices file written: the reader's four columns, then the confidence and a note. */
export interface ChoiceRow {
  ref: string;
  parsing: string;
  lemma: string;
  mark: ChoiceMark;
  confidence: number;
  note: string;
}

export const ROW_HEADER = [...CHOICES_HEADER, 'confidence', 'note'];

const REF = /^[1-3A-Za-z]{3}\.\d+:\d+#\d+$/;

/** The lines of a model session's file; `#` starts a comment line. A line that is not a reference and a parsing is an offence naming its number. */
export function parseModelLines(text: string): { lines: ModelLine[]; offences: string[] } {
  const lines: ModelLine[] = [];
  const offences: string[] = [];
  text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((raw, i) => {
      const t = raw.trim().split(/\s+/);
      if (!t[0] || t[0].startsWith('#')) return;
      const line = i + 1;
      if (!REF.test(t[0])) return void offences.push(`line ${line}: '${raw.trim()}' does not start with a reference like Gen.1:20#13`);
      if (t.length < 2) return void offences.push(`line ${line}: ${t[0]} has no parsing`);
      let rest = t.slice(2);
      let mark: ChoiceMark = '';
      // `?` and `guess` end the line, in either order; guess is the weaker word
      for (;;) {
        const last = rest.at(-1);
        if (last === '?') mark = mark || 'unsure';
        else if (last === 'guess') mark = 'guess';
        else break;
        rest = rest.slice(0, -1);
      }
      lines.push({ ref: t[0], parsing: t[1], lemma: rest.join(' ').normalize('NFC'), mark, line });
    });
  return { lines, offences };
}

/**
 * The lines held against the words they are for. Each offence begins with its reference (or its line). A choice must be a candidate (that parsing, and that
 * lemma when the line names one) or say `guess`; a word with no candidate takes a guess only; a lemma is named when the candidates hold more than one for
 * the parsing; a guess outside the candidates names its lemma (or the candidates have just one). The rows come in the words' order.
 */
export function checkChoices(words: readonly PendingWord[], lines: readonly ModelLine[], scope = 'this batch'): { rows: ChoiceRow[]; offences: string[] } {
  const offences: string[] = [];
  const byRef = new Map(words.map((w) => [w.ref, w]));
  const first = new Map<string, ModelLine>();
  for (const line of lines) {
    const earlier = first.get(line.ref);
    if (earlier) offences.push(`${line.ref}: given twice (lines ${earlier.line} and ${line.line})`);
    else if (!byRef.has(line.ref)) offences.push(`${line.ref}: not in ${scope} (line ${line.line})`);
    else first.set(line.ref, line);
  }
  const rows: ChoiceRow[] = [];
  for (const word of words) {
    const line = first.get(word.ref);
    if (!line) {
      offences.push(`${word.ref}: no choice for this word of ${scope}`);
      continue;
    }
    const said = `${line.parsing}${line.lemma ? ` ${line.lemma}` : ''}`;
    const hits = word.candidates.filter((c) => c.morph === line.parsing && (!line.lemma || c.lemma.normalize('NFC') === line.lemma));
    const guess = line.mark === 'guess';
    if (hits.length === 0 && !guess) {
      offences.push(
        word.candidates.length === 0
          ? `${word.ref}: has no candidate, so ${said} must say guess and name its lemma`
          : `${word.ref}: ${said} is not among the candidates (${[...new Set(word.candidates.map((c) => c.morph))].slice(0, 8).join(', ')}${word.candidates.length > 8 ? ', ...' : ''}) and the line does not say guess`,
      );
      continue;
    }
    const lemmas = [...new Set((hits.length ? hits : word.candidates).map((c) => c.lemma))];
    if (hits.length > 0 && lemmas.length > 1) {
      offences.push(`${word.ref}: ${line.parsing} has more than one lemma among the candidates (${lemmas.join(', ')}): name one`);
      continue;
    }
    const lemma = hits.length ? hits[0].lemma : line.lemma || (lemmas.length === 1 ? lemmas[0] : '');
    if (!lemma) {
      offences.push(`${word.ref}: a guess names its lemma`);
      continue;
    }
    const mark: ChoiceMark = guess ? 'guess' : line.mark;
    rows.push({
      ref: word.ref,
      parsing: line.parsing,
      lemma,
      mark,
      confidence: guess ? CONFIDENCE_GUESS : mark === 'unsure' ? CONFIDENCE_UNSURE : CONFIDENCE_CHOSEN,
      note: guess ? (hits.length ? NOTE_GUESS_MARKED : word.candidates.length === 0 ? NOTE_GUESS_NO_CANDIDATE : NOTE_GUESS_OUTSIDE) : mark === 'unsure' ? NOTE_UNSURE : '',
    });
  }
  return { rows, offences };
}

/** The choices file's text: tab-separated, a header row, one row a word in the text's order, a newline at the end. */
export const rowsTsv = (rows: readonly ChoiceRow[]): string =>
  [ROW_HEADER, ...rows.map((r) => [r.ref, r.parsing, r.lemma, r.mark, r.confidence.toFixed(2), r.note])].map((r) => r.join('\t')).join('\n') + '\n';

export class ChooseRefused extends Error {
  offences: string[];
  constructor(what: string, offences: string[]) {
    super([`lxx:choose ${what}: refused, nothing written:`, ...offences.map((o) => `  ${o}`)].join('\n'));
    this.offences = offences;
  }
}

export interface Written {
  /** where the file was written */
  path: string;
  rows: ChoiceRow[];
}

export const CHOOSE_USAGE = 'usage: npm run lxx:choose -- --book <code> --batch <n> --from <file>   |   npm run lxx:choose -- --recheck --book <code> --from <file>';

export async function runChoose(argv: readonly string[], options: RunOptions = {}): Promise<Written> {
  const { outDir = OUT_DIR, log = () => {} } = options;
  const args = parseBookArgs(argv, CHOOSE_USAGE, { batch: true, from: true });
  let text: string;
  try {
    text = readFileSync(args.from!, 'utf8');
  } catch (error) {
    throw new Error(`lxx:choose: cannot read ${args.from}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const result = await derivedBook(args.book, options);
  let words: PendingWord[];
  let path: string;
  let scope: string;
  let what: string;
  if (args.recheck) {
    words = recheckWords(result, outDir);
    path = join(outDir, 'recheck', `${result.book}.tsv`);
    scope = 'the recheck sample';
    what = `--recheck --book ${result.book}`;
  } else {
    const batches = batchesOf(result.book, result.pending, args.size);
    const batch = batches[(args.batch ?? 1) - 1];
    if (!batch) throw new Error(`${result.book} has ${batches.length} batches, not ${args.batch}`);
    words = batch.words;
    path = join(outDir, 'choices', `${batchName(result.book, batch.n)}.tsv`);
    scope = 'this batch';
    what = `--book ${result.book} --batch ${batch.n}`;
  }
  const parsed = parseModelLines(text);
  const checked = checkChoices(words, parsed.lines, scope);
  const offences = [...parsed.offences, ...checked.offences];
  if (offences.length > 0) throw new ChooseRefused(what, offences);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rowsTsv(checked.rows));
  const count = (mark: ChoiceMark): number => checked.rows.filter((r) => r.mark === mark).length;
  log(`wrote ${path}: ${checked.rows.length} words; ${count('')} chosen (0.8), ${count('unsure')} unsure (0.5), ${count('guess')} guesses (0.4)`);
  return { path, rows: checked.rows };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runChoose(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
