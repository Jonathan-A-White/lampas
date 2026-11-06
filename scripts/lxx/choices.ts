// scripts/lxx/choices.ts — the model's choices (layer 3) read from a choices file and joined to the words still pending
// (docs/lxx-derivation.md, 'The choices file'; story mw-u2w5klk.4). A Builder's own session reads each pending word in its verse and writes one line;
// no script calls a paid API. The runner that lists the words and checks a file as it is written is B4's (mw-u2w5klk.5, choose.ts); this is the reader every
// consumer shares: `lxx:known` scores a file against TAGNT, `lxx:release` joins the files of a book to its derived rows, `lxx:report` counts them.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DerivedWord, PendingWord, WordCandidate } from './derive';

/** unsure: the model chose among the candidates but said so; guess: its own answer, which is a guess whatever the candidates were */
export type ChoiceMark = '' | 'unsure' | 'guess';

export interface Choice {
  ref: string;
  /** TAGNT's code, a noun's semantic tags dropped */
  parsing: string;
  /** NFC; may be left out when the candidates have one lemma for that parsing */
  lemma: string;
  mark: ChoiceMark;
}

/** Tab-separated, a header row, one row a choice, a newline at the end; `#` starts a comment line. */
export const CHOICES_HEADER = ['ref', 'parsing', 'lemma', 'mark'];

export const CONFIDENCE_CHOSEN = 0.8;
export const CONFIDENCE_UNSURE = 0.5;
/** Below the unsure choice: a word drawn in the app as a guess, never quizzed (docs/sources/lxx-derivation-probe.md, 'Error checks', 3) */
export const CONFIDENCE_GUESS = 0.4;

export const NOTE_GUESS_NO_CANDIDATE = 'guess: the model answered with no candidates';
export const NOTE_GUESS_OUTSIDE = 'guess: the model chose outside the candidates';
export const NOTE_GUESS_MARKED = 'guess: marked by the model';
export const NOTE_UNSURE = 'model: unsure';

const MARKS: readonly string[] = ['', 'unsure', 'guess'];

/**
 * Whether two lemmas are one name but for a diaeresis: TBESG's Καϊνάν and TAGNT's file's Καινάν (story mw-u2w5klk.19). A choice that names the one is the other's candidate;
 * the lemma written is the candidate's. Any other difference (an accent, a breathing, a letter) stays a different lemma.
 */
export const sameLemma = (a: string, b: string): boolean => a.normalize('NFD').replaceAll('\u0308', '') === b.normalize('NFD').replaceAll('\u0308', '');

/** The choices of one file, by reference. A malformed line or a reference twice is an error naming the line. */
export function readChoices(text: string, source = 'choices file'): Map<string, Choice> {
  const out = new Map<string, Choice>();
  let header = false;
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const c = line.split('\t').map((x) => x.trim());
    if (!header) {
      header = true;
      if (c[0] === 'ref') return;
    }
    const where = `${source}, line ${i + 1}`;
    const [ref, parsing, lemma = '', mark = ''] = c;
    if (!ref || !/^[1-3A-Za-z]{3}\.\d+:\d+#\d+$/.test(ref)) throw new Error(`${where}: '${ref}' is not a reference like Gen.1:20#13`);
    if (!parsing) throw new Error(`${where}: ${ref} has no parsing`);
    if (!MARKS.includes(mark)) throw new Error(`${where}: the mark '${mark}' is not unsure or guess`);
    if (out.has(ref)) throw new Error(`${where}: ${ref} is chosen twice`);
    out.set(ref, { ref, parsing, lemma: lemma.normalize('NFC'), mark: mark as ChoiceMark });
  });
  return out;
}

/** Several files' choices as one map; a word chosen in two files is an error. */
export function readChoiceFiles(files: ReadonlyArray<{ path: string; text: string }>): Map<string, Choice> {
  const out = new Map<string, Choice>();
  for (const { path, text } of files) {
    for (const [ref, choice] of readChoices(text, path)) {
      if (out.has(ref)) throw new Error(`${path}: ${ref} is already chosen in another file`);
      out.set(ref, choice);
    }
  }
  return out;
}

function readChoiceDirWhere(dir: string, keep: (file: string) => boolean): { files: string[]; choices: Map<string, Choice> } {
  if (!existsSync(dir)) return { files: [], choices: new Map() };
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.tsv') && keep(f))
    .sort();
  const choices = readChoiceFiles(files.map((f) => ({ path: join(dir, f), text: readFileSync(join(dir, f), 'utf8') })));
  return { files, choices };
}

/** The files of a directory whose names are `<prefix>*.tsv`, in name order, read and joined; a missing directory holds none. */
export function readChoiceDir(dir: string, prefix: string): { files: string[]; choices: Map<string, Choice> } {
  return readChoiceDirWhere(dir, (f) => f.startsWith(prefix));
}

/** The second pass's files for a book: `<book>.tsv` (what lxx:choose --recheck writes) and any `<book>-*.tsv`. */
export function readRecheckDir(dir: string, book: string): { files: string[]; choices: Map<string, Choice> } {
  return readChoiceDirWhere(dir, (f) => f === `${book}.tsv` || f.startsWith(`${book}-`));
}

export interface Chosen {
  /** the pending words a choice settled, as layer 3 */
  chosen: DerivedWord[];
  /** the pending words no accepted choice settled */
  left: PendingWord[];
  /** the choices refused, each with why: a choice outside the candidates not marked a guess, a guess with no lemma, a lemma the candidates do not have for that parsing */
  refused: Array<{ ref: string; why: string }>;
  /** the references of choices for words that are not pending (settled before, or not in this book): ignored */
  unused: string[];
}

/**
 * Each pending word with a choice becomes a layer-3 word. The choice must be among the word's candidates (the candidate with that parsing, and that
 * lemma when the file names one; the first by support when the file names none and the candidates hold several lemmas for the parsing), else it must be
 * marked a guess; a word with no candidates takes any choice, which is a guess, and a guess names its lemma (or the candidates have one lemma between them). A guess is 0.4 sure, an unsure choice 0.5,
 * a choice 0.8. A refused choice leaves its word pending.
 */
export function applyChoices(pending: readonly PendingWord[], choices: ReadonlyMap<string, Choice>): Chosen {
  const chosen: DerivedWord[] = [];
  const left: PendingWord[] = [];
  const refused: Chosen['refused'] = [];
  const seen = new Set<string>();
  for (const word of pending) {
    const pick = choices.get(word.ref);
    if (!pick) {
      left.push(word);
      continue;
    }
    seen.add(word.ref);
    const hit: WordCandidate | undefined = word.candidates.find((c) => c.morph === pick.parsing && (!pick.lemma || sameLemma(c.lemma, pick.lemma)));
    if (hit && pick.mark !== 'guess') {
      chosen.push({
        ref: word.ref,
        lemma: hit.lemma,
        morph: hit.morph,
        layer: 3,
        confidence: pick.mark === 'unsure' ? CONFIDENCE_UNSURE : CONFIDENCE_CHOSEN,
        candidates: word.candidates,
        notes: [...word.notes, ...(pick.mark === 'unsure' ? [NOTE_UNSURE] : [])],
      });
      continue;
    }
    const noCandidates = word.candidates.length === 0;
    if (!hit && !noCandidates && pick.mark !== 'guess') {
      refused.push({ ref: word.ref, why: `${pick.parsing}${pick.lemma ? ` ${pick.lemma}` : ''} is outside the candidates and not marked a guess` });
      left.push(word);
      continue;
    }
    // the lemma a guess takes when it names none: the one lemma of the word's own candidates; readings added beside them (Morpheus's, the vocative's: complete.ts) are not counted, so a
    // guess written before they were offered keeps its row (story mw-u2w5klk.287)
    const own = word.candidates.filter((c) => !c.beside);
    const only = new Set((own.length ? own : word.candidates).map((c) => c.lemma));
    const lemma = pick.lemma || hit?.lemma || (only.size === 1 ? [...only][0] : undefined);
    if (!lemma) {
      refused.push({ ref: word.ref, why: 'a guess names its lemma' });
      left.push(word);
      continue;
    }
    chosen.push({
      ref: word.ref,
      lemma,
      morph: pick.parsing,
      layer: 3,
      confidence: CONFIDENCE_GUESS,
      candidates: word.candidates,
      notes: [...word.notes, hit ? NOTE_GUESS_MARKED : noCandidates ? NOTE_GUESS_NO_CANDIDATE : NOTE_GUESS_OUTSIDE],
    });
  }
  return { chosen, left, refused, unused: [...choices.keys()].filter((ref) => !seen.has(ref)) };
}

/** Whether a word of layer 3 is a guess (drawn with a mark in the app, never quizzed). */
export const isGuess = (w: Pick<DerivedWord, 'layer' | 'notes'>): boolean => w.layer === 3 && w.notes.some((n) => n.startsWith('guess:'));
