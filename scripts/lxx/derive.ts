// scripts/lxx/derive.ts — npm run lxx:derive -- --book <code> [--hide <book>]
// The Septuagint derivation (docs/lxx-derivation.md): a lemma and a parsing for each word of a book of Swete's Greek. So far layer 1 alone:
// the word's form as STEPBible's TAGNT has it anywhere in the New Testament, taken when TAGNT gives it one analysis or one with at least 95% of
// 20 or more words. Every other word is pending, for the parser (layer 2) and the model's choice (layer 3) to come.
// It writes data/lxx/derived/<book>.tsv (the words settled) and data/lxx/pending/<book>.tsv (the rest), both git-ignored. They are Lampas's own
// data (MIT, data/lxx/LICENSE): a word is named by its reference in the pinned Swete file and no column holds Swete's Greek. A second run writes
// the same bytes. `--hide jhn` leaves John's rows out of the form index, for a known-answer run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAW_DIR, STEP, SWETE, SWETE_VERSIFICATION, SWETE_WORDS, TAGNT_FILES, fetchPinned, readPinned, type Fetcher } from './sources';
import { bareOf, hasAccent, hasLower, keyOf, spellings, sweteTokens, type EditorSign, type SweteWord } from './swete';
import { analysesOf, formIndex, readTagnt, settle, type Analysis, type FormIndex } from './tagnt';

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
export const NOTE_SEVERAL = 'several analyses: for the parser or the model';
export const NOTE_NOT_IN_NT = 'not in the New Testament: for the parser';

export interface DerivedWord {
  ref: string;
  lemma: string;
  morph: string;
  layer: number;
  confidence: number;
  candidates: Analysis[];
  notes: string[];
}

export interface PendingWord {
  ref: string;
  candidates: Analysis[];
  notes: string[];
}

/** One word through layer 1: its candidates, and the analysis when layer 1 settles it. */
export function layer1(word: Pick<SweteWord, 'ref' | 'form' | 'display'>, index: FormIndex): DerivedWord | PendingWord {
  const notes: string[] = [];
  let counts = index.byKey.get(keyOf(word.form));
  if (!counts && !hasAccent(word.form)) {
    counts = index.byBare.get(bareOf(word.form));
    if (counts) notes.push(NOTE_UNACCENTED);
  }
  if (!hasLower(word.form) && word.form.length > 1) notes.push(NOTE_CAPITALS);
  if (/[[\]]/.test(word.display)) notes.push(NOTE_BRACKETS);
  if (!counts) {
    for (const [why, alt] of spellings(word.form)) {
      counts = index.byBare.get(bareOf(alt));
      if (counts) {
        notes.push(SPELLING_NOTE[why]);
        break;
      }
    }
  }
  const candidates = counts ? analysesOf(counts) : [];
  const settled = settle(candidates);
  if (!settled) return { ref: word.ref, candidates, notes: [...notes, candidates.length ? NOTE_SEVERAL : NOTE_NOT_IN_NT] };
  return { ref: word.ref, lemma: settled.analysis.lemma, morph: settled.analysis.morph, layer: 1, confidence: settled.confidence, candidates, notes };
}

const isDerived = (w: DerivedWord | PendingWord): w is DerivedWord => 'layer' in w;

export interface DeriveInput {
  /** 00-Swete_versification.csv */
  versification: string;
  /** 01-Swete_word_with_punctuations.csv */
  words: string;
  /** the two TAGNT files */
  tagnt: readonly string[];
}

export interface BookResult {
  book: string;
  words: SweteWord[];
  signs: EditorSign[];
  derived: DerivedWord[];
  pending: PendingWord[];
}

export function deriveBook(input: DeriveInput, book: string, hide?: string): BookResult {
  const { words, signs } = sweteTokens(input.versification, input.words, book);
  if (words.length === 0) throw new Error(`no book '${book}' in Swete's file`);
  const index = formIndex(readTagnt(input.tagnt, hide));
  const derived: DerivedWord[] = [];
  const pending: PendingWord[] = [];
  for (const word of words) {
    const out = layer1(word, index);
    if (isDerived(out)) derived.push(out);
    else pending.push(out);
  }
  return { book: book.toLowerCase(), words, signs, derived, pending };
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
  return [
    `${result.book}: ${n} words; ${result.signs.length} editor's signs left out`,
    `layer 1 (TAGNT form): ${result.derived.length} (${pct(result.derived.length)})`,
    `pending: ${result.pending.length} (${pct(result.pending.length)})`,
    ...[...notes].sort(([a], [b]) => (a < b ? -1 : 1)).map(([note, k]) => `note '${note}': ${k}`),
  ];
}

export interface DeriveArgs {
  book: string;
  hide?: string;
}

export function parseArgs(argv: readonly string[]): DeriveArgs {
  const value = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const book = value('--book');
  if (!book || book.startsWith('--')) throw new Error('usage: npm run lxx:derive -- --book <code> [--hide <book>]');
  const hide = value('--hide');
  return { book, hide: hide && !hide.startsWith('--') ? hide : undefined };
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
    };
  }
  const result = deriveBook(input, args.book, args.hide);
  const paths = writeBook(outDir, result);
  if (args.hide) log(`hidden from the form index: ${args.hide}`);
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
