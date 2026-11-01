// scripts/lxx/derive.ts — npm run lxx:derive -- --book <code> [--hide <book>] [--word <ref>]
// The Septuagint derivation (docs/lxx-derivation.md): a lemma and a parsing for each word of a book of Swete's Greek, in layers. Layer 1: the word's
// form as STEPBible's TAGNT has it anywhere in the New Testament, taken when TAGNT gives it one analysis or one with at least 95% of 20 or more words.
// Layer 2, for a form the New Testament lacks: the paradigm parser (parser.ts), then Swete's other spellings, then analogy; taken when it leaves one
// candidate or one with 90% of the support. Every other word is pending, with its candidates, for the model's choice (layer 3, to come).
// It writes data/lxx/derived/<book>.tsv (the words settled) and data/lxx/pending/<book>.tsv (the rest), both git-ignored. They are Lampas's own
// data (MIT, data/lxx/LICENSE): a word is named by its reference in the pinned Swete file and no column holds Swete's Greek. A second run writes
// the same bytes. `--hide jhn` leaves John's rows out of the form index and the parser's training, for a known-answer run. `--word Gen.1:20#13`
// prints one word's candidates, their support and what produced each, and writes nothing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAW_DIR, STEP, SWETE, SWETE_VERSIFICATION, SWETE_WORDS, TAGNT_FILES, fetchPinned, readPinned, type Fetcher } from './sources';
import { bareOf, bookOf, hasAccent, hasLower, keyOf, spellings, sweteTokens, type EditorSign, type SweteWord } from './swete';
import { analysesOf, formIndex, readTagnt, settle, type Analysis, type FormIndex } from './tagnt';
import { byAnalogy, parse, settleParsed, trainParser, type Candidate, type Parser } from './parser';
import { TBESG_FILE, lemmaCount, readTbesg } from './tbesg';

export const OUT_DIR = join('data', 'lxx');

/** The spelling fallbacks' notes, in words without Greek letters (no column but the lemma and the candidates holds Greek). */
const SPELLING_NOTE: Readonly<Record<string, string>> = {
  'ει read as ι': 'spelling: i written ei',
  'ι read as ει': 'spelling: ei written i',
  'movable ν added': 'spelling: movable nu added',
  'movable ν dropped': 'spelling: movable nu dropped',
};
export const NOTE_UNACCENTED = 'unaccented: matched without accents';
export const NOTE_CAPITALS = 'capitals';
export const NOTE_BRACKETS = 'brackets: letters Swete supplied';
export const NOTE_SEVERAL = 'several analyses: for the model';
export const NOTE_NOT_IN_NT = 'not in the New Testament: for the parser';
export const NOTE_ANALOGY = 'analogy: a sibling form in the New Testament';
export const NOTE_CANDIDATES = 'several candidates: for the model';
export const NOTE_NO_CANDIDATE = 'no candidate: for the model to guess';

/** A candidate of layer 1 (an analysis TAGNT gives the form) or of layer 2 (the parser's, with what produced it). */
export type WordCandidate = Analysis & { via?: string[] };

export interface DerivedWord {
  ref: string;
  lemma: string;
  morph: string;
  layer: number;
  confidence: number;
  candidates: WordCandidate[];
  notes: string[];
}

export interface PendingWord {
  ref: string;
  candidates: WordCandidate[];
  notes: string[];
}

/** The parser's candidates for each form, by its bare letters: a form met twice is parsed once. */
type ParseCache = Map<string, Candidate[]>;

/**
 * One word through layers 1 and 2. Layer 1 looks the form up as TAGNT has it (without accents when Swete gives it none) and settles it by the
 * 95%-of-20 rule. A form the New Testament lacks goes to the parser; when the parser finds nothing, Swete's other spellings are tried in turn (an
 * alternative the New Testament has is a layer-1 answer, otherwise it is parsed), and last analogy. Layer 2 settles by the 90% rule.
 */
export function deriveWord(word: Pick<SweteWord, 'ref' | 'form' | 'display'>, index: FormIndex, parser: Parser, cache: ParseCache = new Map()): DerivedWord | PendingWord {
  const notes: string[] = [];
  const parsed = (form: string): Candidate[] => {
    const k = bareOf(form);
    let cs = cache.get(k);
    if (!cs) cache.set(k, (cs = parse(form, parser)));
    return cs;
  };
  let counts = index.byKey.get(keyOf(word.form));
  if (!counts && !hasAccent(word.form)) {
    counts = index.byBare.get(bareOf(word.form));
    if (counts) notes.push(NOTE_UNACCENTED);
  }
  if (!hasLower(word.form) && word.form.length > 1) notes.push(NOTE_CAPITALS);
  if (/[[\]]/.test(word.display)) notes.push(NOTE_BRACKETS);
  let fromParser: Candidate[] = [];
  if (!counts) {
    fromParser = parsed(word.form);
    if (fromParser.length === 0) {
      for (const [why, alt] of spellings(word.form)) {
        counts = index.byBare.get(bareOf(alt));
        if (!counts) fromParser = parsed(alt);
        if (counts || fromParser.length) {
          notes.push(SPELLING_NOTE[why]);
          break;
        }
      }
    }
  }
  if (counts) {
    const candidates = analysesOf(counts);
    const settled = settle(candidates);
    if (!settled) return { ref: word.ref, candidates, notes: [...notes, NOTE_SEVERAL] };
    return { ref: word.ref, lemma: settled.analysis.lemma, morph: settled.analysis.morph, layer: 1, confidence: settled.confidence, candidates, notes };
  }
  notes.push(NOTE_NOT_IN_NT);
  if (fromParser.length === 0) {
    fromParser = byAnalogy(word.form, parser);
    if (fromParser.length) notes.push(NOTE_ANALOGY);
  }
  const settled = settleParsed(fromParser);
  if (!settled) return { ref: word.ref, candidates: fromParser, notes: [...notes, fromParser.length ? NOTE_CANDIDATES : NOTE_NO_CANDIDATE] };
  return { ref: word.ref, lemma: settled.analysis.lemma, morph: settled.analysis.morph, layer: 2, confidence: settled.confidence, candidates: fromParser, notes };
}

export const isDerived = (w: DerivedWord | PendingWord): w is DerivedWord => 'layer' in w;

export interface DeriveInput {
  /** 00-Swete_versification.csv */
  versification: string;
  /** 01-Swete_word_with_punctuations.csv */
  words: string;
  /** the two TAGNT files */
  tagnt: readonly string[];
  /** the TBESG file */
  tbesg: string;
}

export interface BookResult {
  book: string;
  words: SweteWord[];
  signs: EditorSign[];
  derived: DerivedWord[];
  pending: PendingWord[];
  /** the parser as trained for this run (a hidden book left out), for a second look at a word */
  parser: Parser;
}

export function deriveBook(input: DeriveInput, book: string, hide?: string): BookResult {
  const { words, signs } = sweteTokens(input.versification, input.words, book);
  if (words.length === 0) throw new Error(`no book '${book}' in Swete's file`);
  const rows = readTagnt(input.tagnt, hide);
  const index = formIndex(rows);
  const parser = trainParser(rows, readTbesg(input.tbesg));
  const cache: ParseCache = new Map();
  const derived: DerivedWord[] = [];
  const pending: PendingWord[] = [];
  for (const word of words) {
    const out = deriveWord(word, index, parser, cache);
    if (isDerived(out)) derived.push(out);
    else pending.push(out);
  }
  return { book: book.toLowerCase(), words, signs, derived, pending, parser };
}

/** 'ἀρχή/N-NSF/8 | ἀρχή/N-DSF/5': a lemma may hold spaces and commas ('ὅς, ἥ') but never '/' or '|'. */
const candidatesOf = (cs: readonly Analysis[]): string => cs.map((c) => `${c.lemma}/${c.morph}/${c.support}`).join(' | ');

export const DERIVED_HEADER = ['ref', 'lemma', 'parsing', 'layer', 'confidence', 'candidates', 'notes'];
export const PENDING_HEADER = ['ref', 'candidates', 'notes'];

/** The two files' text: tab-separated, a header row, one row a word in the text's order, a newline at the end. */
export function tsvOf(result: BookResult): { derived: string; pending: string } {
  const table = (header: string[], rows: string[][]): string => [header, ...rows].map((r) => r.join('\t')).join('\n') + '\n';
  return {
    derived: table(
      DERIVED_HEADER,
      result.derived.map((w) => [w.ref, w.lemma, w.morph, String(w.layer), w.confidence.toFixed(2), candidatesOf(w.candidates), w.notes.join('; ')]),
    ),
    pending: table(
      PENDING_HEADER,
      result.pending.map((w) => [w.ref, candidatesOf(w.candidates), w.notes.join('; ')]),
    ),
  };
}

/** Writes <outDir>/derived/<book>.tsv and <outDir>/pending/<book>.tsv; returns their paths. */
export function writeBook(outDir: string, result: BookResult): { derived: string; pending: string } {
  const text = tsvOf(result);
  const paths = { derived: join(outDir, 'derived', `${result.book}.tsv`), pending: join(outDir, 'pending', `${result.book}.tsv`) };
  for (const kind of ['derived', 'pending'] as const) {
    mkdirSync(join(outDir, kind), { recursive: true });
    writeFileSync(paths[kind], text[kind]);
  }
  return paths;
}

/** What the run prints: the counts a reader checks against docs/lxx-derivation.md. */
export function summary(result: BookResult): string[] {
  const n = result.words.length;
  const pct = (a: number): string => `${((100 * a) / n).toFixed(1)}%`;
  const notes = new Map<string, number>();
  for (const w of [...result.derived, ...result.pending]) {
    for (const note of w.notes) notes.set(note.split(':')[0], (notes.get(note.split(':')[0]) ?? 0) + 1);
  }
  const inLayer = (layer: number): number => result.derived.filter((w) => w.layer === layer).length;
  const none = result.pending.filter((w) => w.candidates.length === 0).length;
  const { parser } = result;
  return [
    `${result.book}: ${n} words; ${result.signs.length} editor's signs left out`,
    `parser: ${parser.triples} distinct (form, lemma, parsing) triples, ${parser.rules.size} ending rules; ${lemmaCount(parser.lexicon)} TBESG lemmas`,
    `layer 1 (TAGNT form): ${inLayer(1)} (${pct(inLayer(1))})`,
    `layer 2 (parser): ${inLayer(2)} (${pct(inLayer(2))})`,
    `pending: ${result.pending.length} (${pct(result.pending.length)}), of which no candidate: ${none}`,
    ...[...notes].sort(([a], [b]) => (a < b ? -1 : 1)).map(([note, k]) => `note '${note}': ${k}`),
  ];
}

/** One word as `--word` prints it: its token, what the layers made of it, and each candidate with its support and what produced it. */
export function wordReport(result: BookResult, ref: string): string[] {
  const word = result.words.find((w) => w.ref === ref);
  if (!word) throw new Error(`no word ${ref} in Swete's ${result.book}`);
  const out = [...result.derived, ...result.pending].find((w) => w.ref === ref)!;
  const lines = [`${ref} ${word.display}`];
  lines.push(isDerived(out) ? `layer ${out.layer}: ${out.lemma} ${out.morph}, confidence ${out.confidence.toFixed(2)}` : 'pending');
  if (out.notes.length) lines.push(`notes: ${out.notes.join('; ')}`);
  if (out.candidates.length === 0) lines.push('no candidate');
  for (const c of out.candidates) {
    lines.push(`  ${c.lemma} ${c.morph}: support ${c.support} (${(100 * c.share).toFixed(1)}%)`);
    for (const why of c.via ?? ["layer 1: the New Testament's form"]) lines.push(`    ${why}`);
  }
  return lines;
}

export interface DeriveArgs {
  book: string;
  hide?: string;
  /** one word's reference, 'Gen.1:20#13': print its candidates, write nothing */
  word?: string;
}

const USAGE = 'usage: npm run lxx:derive -- --book <code> [--hide <book>] [--word <ref>]';

export function parseArgs(argv: readonly string[]): DeriveArgs {
  const value = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    const v = at >= 0 ? argv[at + 1] : undefined;
    return v && !v.startsWith('--') ? v : undefined;
  };
  const word = value('--word');
  if (argv.includes('--word') && !word) throw new Error(USAGE);
  const book = value('--book') ?? (word ? bookOf(word).toLowerCase() : undefined);
  if (!book) throw new Error(USAGE);
  return { book, hide: value('--hide'), word };
}

export interface RunOptions {
  rawDir?: string;
  outDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them; otherwise the pinned files under rawDir, fetched if absent */
  input?: DeriveInput;
}

export async function runDerive(argv: readonly string[], options: RunOptions = {}): Promise<BookResult> {
  const { rawDir = RAW_DIR, outDir = OUT_DIR, log = () => {}, fetcher } = options;
  const args = parseArgs(argv);
  let input = options.input;
  if (!input) {
    for (const src of [SWETE, STEP]) await fetchPinned(rawDir, src, fetcher, log);
    input = {
      versification: readPinned(rawDir, SWETE, SWETE_VERSIFICATION),
      words: readPinned(rawDir, SWETE, SWETE_WORDS),
      tagnt: TAGNT_FILES.map((f) => readPinned(rawDir, STEP, f)),
      tbesg: readPinned(rawDir, STEP, TBESG_FILE),
    };
  }
  const result = deriveBook(input, args.book, args.hide);
  if (args.hide) log(`hidden from the form index and the parser: ${args.hide}`);
  if (args.word) {
    for (const line of wordReport(result, args.word)) log(line);
    return result;
  }
  const paths = writeBook(outDir, result);
  for (const line of summary(result)) log(line);
  log(`wrote ${paths.derived} and ${paths.pending}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runDerive(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
