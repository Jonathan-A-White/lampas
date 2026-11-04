// scripts/lxx/derive.ts — npm run lxx:derive -- --book <code> [--hide <book>] [--word <ref>]
// The Septuagint derivation (docs/lxx-derivation.md): a lemma and a parsing for each word of a book of Swete's Greek, in layers. Layer 1: the word's
// form as STEPBible's TAGNT has it anywhere in the New Testament, taken when TAGNT gives it one analysis or one with at least 95% of 20 or more words.
// Layer 2, for a form the New Testament lacks: the paradigm parser (parser.ts), then Swete's other spellings, then analogy; taken when it leaves one
// candidate or one with 90% of the support. Then the agreement check (agreement.ts): a settled answer whose ending two cases or genders share is demoted,
// a name the New Testament has written here in lower case goes to the model, settled words that break agreement go to the model, and a word left with
// exactly one candidate that agrees with its settled neighbours takes it (layer 2a). Every other word is pending, with its candidates, for the model's
// choice (layer 3, to come). `--all` runs every book of the file, one line each.
// It writes data/lxx/derived/<book>.tsv (the words settled) and data/lxx/pending/<book>.tsv (the rest), both git-ignored. They are Lampas's own
// data (MIT, data/lxx/LICENSE): a word is named by its reference in the pinned Swete file and no column holds Swete's Greek. A second run writes
// the same bytes. `--hide jhn` leaves John's rows out of the form index and the parser's training, for a known-answer run. `--word Gen.1:20#13`
// prints one word's candidates, their support and what produced each, and writes nothing. `--all` runs every book and prints one line a book.
// The second method (morpheus.ts, 'Morpheus' in docs/lxx-derivation.md): from the command line, when Docker and the Morpheus image are there, the forms with no
// candidate and the guesses in data/lxx/choices are run through Morpheus, its analyses (mapped to TAGNT's codes) are kept in data/lxx/morpheus/<book>.tsv, and
// a word with no candidate takes them as candidates (support 'morpheus'); with the cache absent nothing changes. `--no-morpheus` leaves the step off.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readChoiceDir } from './choices';
import { NOTE_MORPHEUS, dockerEngine, ensureCache, morpheusKey, type MorpheusCache, type MorpheusEngine, type MorpheusState } from './morpheus';
import { RAW_DIR, STEP, SWETE, SWETE_VERSIFICATION, SWETE_WORDS, TAGNT_FILES, fetchPinned, readPinned, type Fetcher } from './sources';
import { AGREEMENT_LAYER, checkAgreement, type AgreementStats } from './agreement';
import { bareOf, bookOf, hasAccent, hasLower, hasTwoAccents, keyOf, spellings, sweteTokens, type EditorSign, type SweteWord } from './swete';
import { analysesOf, formIndex, readTagnt, settle, type Analysis, type FormIndex } from './tagnt';
import { byAnalogy, formNameCandidates, formNameLemma, indeclinableNames, isCapital, isThinLone, nameCandidates, parse, settleParsed, trainParser, type Candidate, type Parser } from './parser';
import { TBESG_FILE, lemmaCount, readTbesg, readTbesgNames } from './tbesg';

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
export const NOTE_THIN = 'one candidate on thin support: for the agreement check or the model';
export const NOTE_NO_CANDIDATE = 'no candidate: for the model to guess';
export const NOTE_FORM_NAME = 'a name no lexicon has: its form read as its own lemma, every case of every gender: for the agreement check or the model';
export const NOTE_INDECLINABLE = 'an indeclinable name: every case of its gender: for the agreement check or the model';
export const NOTE_CAPITAL_NAME = 'a capital mid-clause: a name beside the common word its letters spell: for the agreement check or the model';

/** A candidate of layer 1 (an analysis TAGNT gives the form) or of layer 2 (the parser's, with what produced it). */
/** `stemSupport`: an ending rule's candidate only, and `analogy`: analogy's only (parser.ts Candidate), kept in memory for the agreement check (isThinLone), never written to the files. */
export type WordCandidate = Analysis & { via?: string[]; source?: 'morpheus' | 'name' | 'form'; stemSupport?: number; analogy?: true };

/** What a candidate's support column says: the New Testament's count, or the name of what gave it where it has no count (`morpheus`, the second method; `name`, an indeclinable name's other cases; `form`, a name no lexicon has, read as its own lemma). */
export const supportOf = (c: WordCandidate): string => c.source ?? String(c.support);

/** 1 the New Testament's form, 2 the parser, '2a' the agreement check, 3 the model's choice (choices.ts joins it to the pending words; derive.ts never makes one) */
export type Layer = 1 | 2 | typeof AGREEMENT_LAYER | 3;

export interface DerivedWord {
  ref: string;
  lemma: string;
  morph: string;
  layer: Layer;
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

/** The parser's candidates for a form, from the cache when the form's letters were parsed before. */
function parsedOnce(form: string, parser: Parser, cache: ParseCache): Candidate[] {
  const k = bareOf(form);
  let cs = cache.get(k);
  if (!cs) cache.set(k, (cs = parse(form, parser)));
  return cs;
}

/**
 * One word through layers 1 and 2. Layer 1 looks the form up as TAGNT has it (without accents when Swete gives it none) and settles it by the
 * 95%-of-20 rule. A form the New Testament lacks goes to the parser; when the parser finds nothing, Swete's other spellings are tried in turn (an
 * alternative the New Testament has is a layer-1 answer, otherwise it is parsed), and last analogy. Layer 2 settles by the 90% rule.
 */
export function deriveWord(
  word: Pick<SweteWord, 'ref' | 'form' | 'display'>,
  index: FormIndex,
  parser: Parser,
  cache: ParseCache = new Map(),
  morpheus?: MorpheusCache,
): DerivedWord | PendingWord {
  const out = layersOneAndTwo(word, index, parser, cache, morpheus);
  const owed = nameCandidates(word.form, out.candidates, parser.names);
  if (owed.length === 0) return out;
  // An indeclinable name has one form for every case: what the New Testament or the parser settled it on is one case of several, so it waits for the agreement check or the model
  const via = ['an indeclinable name: every case of its gender (TAGNT shows one spelling in several cases, or TBESG says indecl.)'];
  const more = owed.map((c) => ({ ...c, support: 0, share: 0, via, source: 'name' as const }));
  return { ref: word.ref, candidates: [...out.candidates, ...more], notes: [...out.notes.filter((n) => n !== NOTE_NO_CANDIDATE), NOTE_INDECLINABLE] };
}

function layersOneAndTwo(
  word: Pick<SweteWord, 'ref' | 'form' | 'display'>,
  index: FormIndex,
  parser: Parser,
  cache: ParseCache,
  morpheus: MorpheusCache | undefined,
): DerivedWord | PendingWord {
  const notes: string[] = [];
  const parsed = (form: string): Candidate[] => parsedOnce(form, parser, cache);
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
  // one ending rule's candidate on thin support (story mw-u2w5klk.28): not settled, but left alone for the agreement check or the model. Analogy's readings
  // are not put beside it: they blur a pending imperative the address rule reads, and offer the agreement links readings the form cannot be (ἄφρονος as A-NSF)
  if (isThinLone(fromParser)) return { ref: word.ref, candidates: fromParser, notes: [...notes, NOTE_THIN] };
  const settled = settleParsed(fromParser);
  if (!settled) {
    const given = fromParser.length === 0 ? morpheusCandidates(word.form, morpheus) : [];
    if (given.length) return { ref: word.ref, candidates: given, notes: [...notes, NOTE_MORPHEUS] };
    return { ref: word.ref, candidates: fromParser, notes: [...notes, fromParser.length ? NOTE_CANDIDATES : NOTE_NO_CANDIDATE] };
  }
  return { ref: word.ref, lemma: settled.analysis.lemma, morph: settled.analysis.morph, layer: 2, confidence: settled.confidence, candidates: fromParser, notes };
}

/** Morpheus's analyses of a form, as candidates with no count: a second method's, for the model to choose among. */
function morpheusCandidates(form: string, morpheus: MorpheusCache | undefined): WordCandidate[] {
  const known = morpheus?.get(morpheusKey(form));
  return (known?.analyses ?? []).map((m) => ({ lemma: m.lemma, morph: m.code, support: 0, share: 0, via: ['Morpheus: the second method, a build tool'], source: 'morpheus' as const }));
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
  /** the words settled after the agreement check: what derived/<book>.tsv holds */
  derived: DerivedWord[];
  /** the words still waiting after the check: what pending/<book>.tsv holds */
  pending: PendingWord[];
  /** what layers 1 and 2 alone made of the words, before the check */
  beforeCheck: { derived: DerivedWord[]; pending: PendingWord[] };
  agreement: AgreementStats;
  /** the parser as trained for this run (a hidden book left out), for a second look at a word */
  parser: Parser;
  /** how many words took Morpheus's analyses as candidates; set only when a cache was given */
  morpheusWords?: number;
}

/** The form index and the parser, trained once for a run (a hidden book left out of both), and what Swete's own print says of its forms. */
export interface Trained {
  index: FormIndex;
  parser: Parser;
  /** every form the whole file writes in lower case somewhere, as keyOf writes it (lowerCaseForms): a capital on any other form is a name's, not a sentence's */
  lowerCase: ReadonlySet<string>;
}

export function train(input: DeriveInput, hide?: string): Trained {
  const rows = readTagnt(input.tagnt, hide);
  return { index: formIndex(rows), parser: trainParser(rows, readTbesg(input.tbesg), indeclinableNames(rows, readTbesgNames(input.tbesg))), lowerCase: lowerCaseForms(input) };
}

/** The forms Swete writes in lower case anywhere in the file (all 60 books), as keyOf writes them, for the capital rule (withCapitalNames). */
export function lowerCaseForms(input: Pick<DeriveInput, 'versification' | 'words'>): Set<string> {
  const out = new Set<string>();
  for (const w of sweteTokens(input.versification, input.words).words) if (!isCapital(w.form)) out.add(keyOf(w.form));
  return out;
}

const split = (outs: ReadonlyArray<DerivedWord | PendingWord>): { derived: DerivedWord[]; pending: PendingWord[] } => ({
  derived: outs.filter(isDerived),
  pending: outs.filter((w): w is PendingWord => !isDerived(w)),
});

/** A mark that ends a sentence or a clause in Swete's print: a full stop, a colon, the high point, the Greek question mark. */
const ENDS_CLAUSE = /[.:;\u00B7\u0387\u037E][\])]*$/;

/**
 * Whether word `i` opens a verse or a clause: the first of its verse, or after a word whose print ends in a full stop, a colon, the high point or the question
 * mark. Swete capitalises such a word whatever it is, so a capital there says nothing of a name; the first word of what someone says, which follows no mark, is not seen.
 */
export function opensClause(words: ReadonlyArray<Pick<SweteWord, 'verse' | 'display'>>, i: number): boolean {
  const before = words[i - 1];
  return !before || before.verse !== words[i].verse || ENDS_CLAUSE.test(before.display.normalize('NFC').trim());
}

/**
 * Whether word `i` is a whole clause of its own: it opens a verse or a clause (opensClause) and its own print ends one (a full stop, a colon, the high point). Swete
 * capitalises the first word of a clause whatever it is, but a word that is all of its sentence is not a Greek clause's opening: in Lamentations it is a letter name of the
 * acrostic (`Βήθ. Κλαίουσα ἔκλαυσεν`, Lam 1:2; 62 of Lamentations' words, 49 of them with an ending a Hebrew name has) and elsewhere a name set apart (story mw-u2w5klk.20).
 */
export function isWholeClause(words: ReadonlyArray<Pick<SweteWord, 'verse' | 'display'>>, i: number): boolean {
  return opensClause(words, i) && ENDS_CLAUSE.test(words[i].display.normalize('NFC').trim());
}

/**
 * A word still without a candidate that is written with a capital, does not open a verse or a clause (unless it is all of its clause: isWholeClause) and ends as a Hebrew name does (formNameLemma) takes its form as
 * its lemma, in every case of every gender, support `form`, and is pending with the note NOTE_FORM_NAME: a reading from the form alone, no lexicon's, for the agreement
 * check or the model. Every other word is as layers 1 and 2 left it.
 */
function withFormNames(words: readonly SweteWord[], outs: ReadonlyArray<DerivedWord | PendingWord>): Array<DerivedWord | PendingWord> {
  return outs.map((out, i) => {
    if (isDerived(out) || out.candidates.length > 0 || (opensClause(words, i) && !isWholeClause(words, i))) return out;
    const lemma = formNameLemma(words[i].form);
    if (!lemma) return out;
    const via = ['a name no lexicon has: the form itself as the lemma (an ending a Hebrew name has, no reading of the New Testament or of TBESG)'];
    const candidates = formNameCandidates(lemma).map((c) => ({ ...c, support: 0, share: 0, via, source: 'form' as const }));
    return { ref: out.ref, candidates, notes: [...out.notes.filter((n) => n !== NOTE_NO_CANDIDATE), NOTE_FORM_NAME] };
  });
}

const VIA_CAPITAL_LEXICON = 'a capital mid-clause: a lexicon has a name spelled so, the parser reading the form in it';
const VIA_CAPITAL_FORM = 'a capital mid-clause: the form itself as the lemma (Swete never writes it in lower case; an ending a Hebrew name has)';

/**
 * The capital rule (story mw-u2w5klk.25). Layers 1 and 2 read a form's letters with its capital lowered, so a name spelled as a common word settles as that word: Σηών
 * as σής, Ἀμμών as ἄμμος, Γάζης as the treasury of Acts 8:27. A word written with a capital that does not open a verse or a clause (opensClause, or all of its clause:
 * isWholeClause), which the layers settled on a lemma in lower case or left pending with only such candidates of their own, is not left so when either of two things
 * says the capital is a name's: (1) **a lexicon has a name spelled so**: the parser, run on the form whether the New Testament has it or not, reaches a lemma written
 * with a capital in TBESG or TAGNT (Γάζα for Γάζης, Σύρος for Σύρων), or such a lemma is already among the word's candidates; (2) **Swete's own print**: the file never
 * writes the form in lower case anywhere (trained.lowerCase; Ἰδοὺ, Μὴ, Ἐγὼ open what someone says and are written ἰδού, μή, ἐγώ elsewhere), the word carries one accent
 * (Κέχρικά σε carries an enclitic's), and its ending is one a Hebrew name has (formNameLemma, the rule of 'Names no lexicon has'), so the form is its own lemma in every
 * case of every gender (support `form`). The word is pending with the common candidates kept and the name's added, the note NOTE_CAPITAL_NAME, for the agreement check or
 * the model. A word that opens a verse or a clause is left as it was: Swete capitalises it whatever it is. A word settled on a name, pending with a name among its
 * candidates (an indeclinable name, a name from its form alone), with no candidate, or with Morpheus's alone, is not touched.
 */
function withCapitalNames(words: readonly SweteWord[], outs: ReadonlyArray<DerivedWord | PendingWord>, trained: Trained, parsed: (form: string) => Candidate[]): Array<DerivedWord | PendingWord> {
  return outs.map((out, i) => {
    const word = words[i];
    if (!isCapital(word.form) || (opensClause(words, i) && !isWholeClause(words, i))) return out;
    if (isDerived(out) ? isCapital(out.lemma) : out.candidates.some((c) => isCapital(c.lemma))) return out;
    if (!out.candidates.some((c) => !c.source)) return out;
    const owned = new Set(out.candidates.map((c) => `${c.lemma}|${c.morph}`));
    const own = out.candidates.filter((c) => isCapital(c.lemma));
    const named = own.length ? [] : parsed(word.form).filter((c) => isCapital(c.lemma) && !owned.has(`${c.lemma}|${c.morph}`));
    let more: WordCandidate[];
    if (own.length || named.length) {
      more = named.map((c) => ({ ...c, via: [VIA_CAPITAL_LEXICON, ...c.via] }));
    } else {
      if (trained.lowerCase.has(keyOf(word.form)) || hasTwoAccents(word.form)) return out;
      const lemma = formNameLemma(word.form);
      if (!lemma) return out;
      more = formNameCandidates(lemma).map((c) => ({ ...c, support: 0, share: 0, via: [VIA_CAPITAL_FORM], source: 'form' as const }));
    }
    return { ref: out.ref, candidates: [...out.candidates, ...more], notes: [...out.notes, NOTE_CAPITAL_NAME] };
  });
}

/** One book's words through layers 1 and 2, then the agreement check. `tokens` are the book's, when the caller has read them already. */
export function deriveBook(
  input: DeriveInput,
  book: string,
  hide?: string,
  trained: Trained = train(input, hide),
  tokens?: { words: SweteWord[]; signs: EditorSign[] },
  morpheus?: MorpheusCache,
): BookResult {
  const { words, signs } = tokens ?? sweteTokens(input.versification, input.words, book);
  if (words.length === 0) throw new Error(`no book '${book}' in Swete's file`);
  const { index, parser } = trained;
  const cache: ParseCache = new Map();
  const parsed = (form: string): Candidate[] => parsedOnce(form, parser, cache);
  const layers = withCapitalNames(words, withFormNames(words, words.map((word) => deriveWord(word, index, parser, cache, morpheus))), trained, parsed);
  const checked = checkAgreement(words, layers, { names: index.names, parse: parsed, governs: parser.governs });
  return { book: book.toLowerCase(), words, signs, ...split(checked.outs), beforeCheck: split(layers), agreement: checked.stats, parser, ...(morpheus ? { morpheusWords: layers.filter((w) => w.notes.includes(NOTE_MORPHEUS)).length } : {}) };
}

/** 'ἀρχή/N-NSF/8 | ἀρχή/N-DSF/5': a lemma may hold spaces and commas ('ὅς, ἥ') but never '/' or '|'. */
const candidatesOf = (cs: readonly WordCandidate[]): string => cs.map((c) => `${c.lemma}/${c.morph}/${supportOf(c)}`).join(' | ');

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

const perThousand = (k: number, n: number): string => ((1000 * k) / n).toFixed(1);

/** `--all`'s columns, one line a book, tab-separated. */
export const ALL_HEADER = ['book', 'words', 'layer 1', 'layer 2', 'layer 2a', 'pending', 'pending before the check', 'demoted', 'breaks per 1,000'];

/** One book's line of `--all`. */
export function bookLine(result: BookResult): string {
  const inLayer = (layer: Layer): number => result.derived.filter((w) => w.layer === layer).length;
  const n = result.words.length;
  const a = result.agreement;
  return [result.book, n, inLayer(1), inLayer(2), inLayer(AGREEMENT_LAYER), result.pending.length, a.pendingBefore, a.demoted, perThousand(a.breaks, n)].join('\t');
}

/** What the run prints: the counts a reader checks against docs/lxx-derivation.md. */
export function summary(result: BookResult): string[] {
  const n = result.words.length;
  const pct = (a: number): string => `${((100 * a) / n).toFixed(1)}%`;
  const notes = new Map<string, number>();
  for (const w of [...result.derived, ...result.pending]) {
    for (const note of w.notes) notes.set(note.split(':')[0], (notes.get(note.split(':')[0]) ?? 0) + 1);
  }
  const inLayer = (layer: Layer): number => result.derived.filter((w) => w.layer === layer).length;
  const none = result.pending.filter((w) => w.candidates.length === 0).length;
  const { parser, agreement: a } = result;
  return [
    `${result.book}: ${n} words; ${result.signs.length} editor's signs left out`,
    `parser: ${parser.triples} distinct (form, lemma, parsing) triples, ${parser.rules.size} ending rules; ${lemmaCount(parser.lexicon)} TBESG lemmas`,
    `layer 1 (TAGNT form): ${inLayer(1)} (${pct(inLayer(1))})`,
    `layer 2 (parser): ${inLayer(2)} (${pct(inLayer(2))})`,
    `settled by agreement (layer 2a): ${a.settled} (${pct(a.settled)})`,
    `demoted by the shared-ending rule: ${a.demoted}, of which settled again by agreement: ${a.demotedSettled}`,
    `a name in the New Testament, lower case here: ${a.names}`,
    `agreement breaks: ${a.breaks} in ${a.brokenWords} words, ${perThousand(a.breaks, n)} breaks per 1,000 words`,
    `pending before the agreement check: ${a.pendingBefore}; after it: ${result.pending.length}`,
    `pending: ${result.pending.length} (${pct(result.pending.length)}), of which no candidate: ${none}`,
    ...(result.morpheusWords === undefined ? [] : [`Morpheus gave ${result.morpheusWords} words candidates`]),
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
    lines.push(c.source ? `  ${c.lemma} ${c.morph}: support ${c.source}` : `  ${c.lemma} ${c.morph}: support ${c.support} (${(100 * c.share).toFixed(1)}%)`);
    for (const why of c.via ?? ["layer 1: the New Testament's form"]) lines.push(`    ${why}`);
  }
  return lines;
}

export interface DeriveArgs {
  /** a book's code, or 'all' with `all` */
  book: string;
  /** every book of the file, one line each */
  all?: boolean;
  hide?: string;
  /** one word's reference, 'Gen.1:20#13': print its candidates, write nothing */
  word?: string;
  /** leave the second method off */
  noMorpheus?: boolean;
}

const USAGE = 'usage: npm run lxx:derive -- --book <code> | --all [--hide <book>] [--word <ref>] [--no-morpheus]';

export function parseArgs(argv: readonly string[]): DeriveArgs {
  const value = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    const v = at >= 0 ? argv[at + 1] : undefined;
    return v && !v.startsWith('--') ? v : undefined;
  };
  const word = value('--word');
  if (argv.includes('--word') && !word) throw new Error(USAGE);
  if (argv.includes('--all')) {
    if (word || argv.includes('--book')) throw new Error(USAGE);
    return { book: 'all', all: true, hide: value('--hide'), noMorpheus: argv.includes('--no-morpheus') };
  }
  const book = value('--book') ?? (word ? bookOf(word).toLowerCase() : undefined);
  if (!book) throw new Error(USAGE);
  return { book, hide: value('--hide'), word, noMorpheus: argv.includes('--no-morpheus') };
}

export interface RunOptions {
  rawDir?: string;
  outDir?: string;
  log?: (line: string) => void;
  fetcher?: Fetcher;
  /** the sources' text, when a test gives them; otherwise the pinned files under rawDir, fetched if absent */
  input?: DeriveInput;
  /** the second method: Morpheus as the run reaches it (the command line gives dockerEngine()); none leaves the step off, and nothing about it is said */
  morpheus?: MorpheusEngine;
  /** where the choices files are, for the guesses Morpheus is asked about; default <outDir>/choices */
  choicesDir?: string;
}

/** Swete's tokens of every book of the file, by Swete's book code ('Gen'), in the file's order. */
export function splitBooks(input: Pick<DeriveInput, 'versification' | 'words'>): Map<string, { words: SweteWord[]; signs: EditorSign[] }> {
  const { words, signs } = sweteTokens(input.versification, input.words);
  const books = new Map<string, { words: SweteWord[]; signs: EditorSign[] }>();
  const bookIn = (code: string): { words: SweteWord[]; signs: EditorSign[] } => {
    let b = books.get(code);
    if (!b) books.set(code, (b = { words: [], signs: [] }));
    return b;
  };
  for (const w of words) bookIn(bookOf(w.verse)).words.push(w);
  for (const s of signs) bookIn(bookOf(s.verse)).signs.push(s);
  return books;
}

/** The second method as one run uses it: the engine, where the choices files are, and whether it has said it was skipped. */
interface MorpheusStep extends MorpheusState {
  engine: MorpheusEngine;
  choicesDir: string;
}

/**
 * A book with Morpheus's analyses: its forms with no candidate and its guessed words (the choices files' `guess` marks) are asked of Morpheus unless the cache
 * under <outDir>/morpheus has them, and the book is derived again with the cache. A step that is skipped, or a cache with nothing in it, leaves `result` as it was.
 */
function withMorpheus(result: BookResult, again: (cache: MorpheusCache) => BookResult, outDir: string, step: MorpheusStep | undefined, log: (line: string) => void): BookResult {
  if (!step) return result;
  const formOf = new Map(result.words.map((w) => [w.ref, w.form]));
  // a word given a name from its form alone is asked of Morpheus too: a reading from a lexicon outranks it
  const noCandidate = result.pending.filter((w) => w.candidates.every((c) => c.source === 'form')).map((w) => w.ref);
  const guessed = [...readChoiceDir(step.choicesDir, `${result.book}-`).choices.values()].filter((c) => c.mark === 'guess').map((c) => c.ref);
  const forms = [...noCandidate, ...guessed].flatMap((ref) => (formOf.has(ref) ? [morpheusKey(formOf.get(ref)!)] : []));
  const cache = ensureCache(step.engine, join(outDir, 'morpheus', `${result.book}.tsv`), forms, log, step);
  return cache.size === 0 ? result : again(cache);
}

/** Every book of the file in its order, trained once: each book's files written, and one line a book (ALL_HEADER). */
export function deriveAll(input: DeriveInput, outDir: string, log: (line: string) => void, hide?: string, step?: MorpheusStep): BookResult[] {
  const trained = train(input, hide);
  const books = splitBooks(input);
  log(ALL_HEADER.join('\t'));
  const results: BookResult[] = [];
  for (const [code, tokens] of books) {
    if (tokens.words.length === 0) continue;
    const first = deriveBook(input, code, hide, trained, tokens);
    const result = withMorpheus(first, (cache) => deriveBook(input, code, hide, trained, tokens, cache), outDir, step, log);
    writeBook(outDir, result);
    log(bookLine(result));
    results.push(result);
  }
  return results;
}

/** The pinned sources as a run reads them: fetched into rawDir unless they are there already (nothing else touches the network). */
export async function loadInput(rawDir: string = RAW_DIR, fetcher?: Fetcher, log: (line: string) => void = () => {}): Promise<DeriveInput> {
  for (const src of [SWETE, STEP]) await fetchPinned(rawDir, src, fetcher, log);
  return {
    versification: readPinned(rawDir, SWETE, SWETE_VERSIFICATION),
    words: readPinned(rawDir, SWETE, SWETE_WORDS),
    tagnt: TAGNT_FILES.map((f) => readPinned(rawDir, STEP, f)),
    tbesg: readPinned(rawDir, STEP, TBESG_FILE),
  };
}

export async function runDerive(argv: readonly string[], options: RunOptions = {}): Promise<BookResult> {
  const { rawDir = RAW_DIR, outDir = OUT_DIR, log = () => {}, fetcher } = options;
  const args = parseArgs(argv);
  const input = options.input ?? (await loadInput(rawDir, fetcher, log));
  const step: MorpheusStep | undefined = options.morpheus && !args.noMorpheus ? { engine: options.morpheus, choicesDir: options.choicesDir ?? join(outDir, 'choices'), said: false } : undefined;
  if (args.all) {
    if (args.hide) log(`hidden from the form index and the parser: ${args.hide}`);
    const results = deriveAll(input, outDir, log, args.hide, step);
    const last = results.at(-1);
    if (!last) throw new Error("no book in Swete's file");
    log(`wrote ${results.length} books under ${outDir}`);
    return last;
  }
  const trained = train(input, args.hide);
  const first = deriveBook(input, args.book, args.hide, trained);
  const result = withMorpheus(first, (cache) => deriveBook(input, args.book, args.hide, trained, undefined, cache), outDir, step, log);
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
  runDerive(process.argv.slice(2), { log: console.log, morpheus: dockerEngine() }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
