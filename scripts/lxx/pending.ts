// scripts/lxx/pending.ts — npm run lxx:pending -- --book <code> --batch <n>   |   --recheck --book <code>
// What a model session reads (docs/lxx-derivation.md, 'A model session'; story mw-u2w5klk.5): the pending words of one batch, each under its verse (the whole
// verse's Greek with the word marked), with its candidates (lemma, parsing, support) or 'no candidate', in the text's order. Printed, and written to
// data/lxx/pending/<book>-<batch>.md, which is git-ignored because it holds Swete's Greek. `--recheck` lists instead a blind 5% of the words the book's
// choices files have chosen, seeded by the book so it is the same list each time, with nothing of the first choices; `lxx:choose --recheck` takes the
// second pass. No paid API is called; the network only fetches the pinned sources into data/raw (skipped when present).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { batchName, batchesOf, derivedBook, parseBookArgs, type RunOptions } from './batches';
import { applyChoices, readChoiceDir } from './choices';
import { OUT_DIR, type BookResult, type PendingWord } from './derive';
import type { SweteWord } from './swete';

/** The share of a book's chosen words the second pass reads again (at least one word). */
export const RECHECK_FRACTION = 0.05;

/** Marks a pending word in its verse (the Greek of Swete's file has no such brackets; his own are [ ]). */
export const MARK_OPEN = '⟦';
export const MARK_CLOSE = '⟧';

const candidatesText = (word: PendingWord): string =>
  word.candidates.length === 0 ? 'no candidate' : word.candidates.map((c) => `${c.lemma} ${c.morph} (${c.support})`).join(' | ');

/** The words under their verses: a line for the verse with the pending words marked, then a line for each pending word. */
export function listingLines(words: readonly SweteWord[], target: readonly PendingWord[]): string[] {
  const forms = new Map(words.map((w) => [w.ref, w]));
  const byVerse = new Map<string, PendingWord[]>();
  for (const word of target) {
    const verse = forms.get(word.ref)?.verse ?? word.ref.split('#')[0];
    byVerse.set(verse, [...(byVerse.get(verse) ?? []), word]);
  }
  const lines: string[] = [];
  for (const [verse, marked] of byVerse) {
    const pendingRefs = new Set(marked.map((w) => w.ref));
    lines.push('');
    lines.push(`${verse} ${words.filter((w) => w.verse === verse).map((w) => (pendingRefs.has(w.ref) ? `${MARK_OPEN}${w.display}${MARK_CLOSE}` : w.display)).join(' ')}`);
    for (const word of marked) {
      const notes = word.notes.length ? ` — ${word.notes.join('; ')}` : '';
      lines.push(`${word.ref} ${forms.get(word.ref)?.form ?? ''}: ${candidatesText(word)}${notes}`);
    }
  }
  return lines;
}

const LEGEND = [
  `# ${MARK_OPEN}word${MARK_CLOSE} marks the word to choose in its verse; the line under the verse is its reference, its form and its candidates: lemma, parsing (support), most frequent first.`,
  '# Answer with one line a word: reference, parsing, the lemma when two candidates share that parsing, then ? if you are not sure. Only from the candidates; a word with no candidate is `guess`.',
];

/** The refs of a sample: `RECHECK_FRACTION` of them, at least one, the same each time for the same book and the same refs; in the order they were given. */
export function recheckSample(book: string, refs: readonly string[]): string[] {
  if (refs.length === 0) return [];
  // FNV-1a of the book code seeds mulberry32
  let seed = 2166136261;
  for (const ch of book.toLowerCase()) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const next = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = refs.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const count = Math.max(1, Math.round(RECHECK_FRACTION * refs.length));
  return order
    .slice(0, count)
    .sort((a, b) => a - b)
    .map((i) => refs[i]);
}

/** The book's chosen words (layer 3, by the files under <outDir>/choices) that the second pass reads again, as pending words with their candidates. */
export function recheckWords(result: BookResult, outDir: string): PendingWord[] {
  const { files, choices } = readChoiceDir(join(outDir, 'choices'), `${result.book}-`);
  if (files.length === 0) throw new Error(`no choices for ${result.book} under ${join(outDir, 'choices')}: the first pass comes first`);
  const chosen = new Set(applyChoices(result.pending, choices).chosen.map((w) => w.ref));
  const sample = new Set(
    recheckSample(
      result.book,
      result.pending.filter((w) => chosen.has(w.ref)).map((w) => w.ref),
    ),
  );
  return result.pending.filter((w) => sample.has(w.ref));
}

export interface Listing {
  /** where the listing was written */
  path: string;
  text: string;
  /** the words listed, in the text's order */
  words: PendingWord[];
}

export const PENDING_USAGE = 'usage: npm run lxx:pending -- --book <code> --batch <n>   |   npm run lxx:pending -- --recheck --book <code>';

export async function runPending(argv: readonly string[], options: RunOptions = {}): Promise<Listing> {
  const { outDir = OUT_DIR, log = () => {} } = options;
  const args = parseBookArgs(argv, PENDING_USAGE, { batch: true });
  const result = await derivedBook(args.book, options);
  let name: string;
  let words: PendingWord[];
  let title: string;
  if (args.recheck) {
    words = recheckWords(result, outDir);
    name = `${result.book}-recheck`;
    title = `# ${result.book}: blind recheck, ${words.length} words; the first pass is hidden`;
  } else {
    const batches = batchesOf(result.book, result.pending, args.size);
    const batch = batches[(args.batch ?? 1) - 1];
    if (!batch) throw new Error(`${result.book} has ${batches.length} batches, not ${args.batch}`);
    words = batch.words;
    name = batchName(result.book, batch.n);
    const chapters = batch.firstChapter === batch.lastChapter ? `chapter ${batch.firstChapter}` : `chapters ${batch.firstChapter}-${batch.lastChapter}`;
    title = `# ${name}: ${chapters}, ${words.length} pending words, ${batch.noCandidate} with no candidate`;
  }
  const text = [title, ...LEGEND, ...listingLines(result.words, words)].join('\n') + '\n';
  const path = join(outDir, 'pending', `${name}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  for (const line of text.trimEnd().split('\n')) log(line);
  log(`wrote ${path}`);
  return { path, text, words };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runPending(process.argv.slice(2), { log: console.log }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
