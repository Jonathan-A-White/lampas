// scripts/data/variantWords.ts — the words of each variant reading, tagged with their lemma, Strong's number and parsing (mw-9ji6ek0.21, docs/data.md 'Variants').
// An apparatus reading is a string of Greek the verse need not have (καὶ ζῇς, ἐμέλλον ἀποθάνειν). Once every chapter is built, each of its words is looked
// up by its letters in an index of every form the whole New Testament text uses (the inverse of scripts/build-lemma-forms.mjs: a form -> the (lemma, Strong's,
// parsing) it is used as); the commonest use wins, a tie going to the book nearest the chapter's. A form the text never has is looked for next in STEPBible's TAGNT
// (scripts/data/tagnt.ts: it keeps the NA's and the other editions' spellings), then among the lexicon's lemmas, and only where neither has it is the nearest lemma
// guessed and marked so (mw-9ji6ek0.44); a form no lemma is near stays with `t` alone, and the build lists it (data/variant-untagged.txt).
import { CANON } from '../../src/data/canon';
import type { Chapter, GreekWord, StrongsSource, VariantReading } from '../../src/data/chapter';
import { decodeParse } from '../../src/data/parseCode';
import { numeric } from './chapterWriter';
import type { TagntWord } from './tagnt';
import type { Lexicon } from './tbes';
import { letterKey, wordsOf } from './variants';

const GRAVE = /̀/g;
const ACUTE = '́';
const APOSTROPHES = /['ʼ᾽’]/g;
/** A reading in pieces ('ὁ μὲν... ὁ δὲ') cannot be laid word for word over the verse. */
const ELLIPSIS = /\.\.\.|…/;

/** A form as the index knows it: lower case, a grave accent the acute (καὶ and καί are one form), the elision apostrophe as one character. */
const formKey = (form: string): string => form.normalize('NFD').replace(GRAVE, ACUTE).replace(APOSTROPHES, '’').toLowerCase().normalize('NFC');

interface Use {
  s: string;
  l: string;
  p: string;
  count: number;
  /** the books (by canon position) the text uses it in */
  books: Set<number>;
}

/** Every form of the text -> its uses, once by the form and once by its letters alone (no accents, breathings or case). */
export interface FormIndex {
  byForm: Map<string, Map<string, Use>>;
  byLetters: Map<string, Map<string, Use>>;
}

const bookPosition = (code: string): number => CANON.findIndex((b) => b.code === code);

function add(into: Map<string, Map<string, Use>>, key: string, word: Pick<GreekWord, 's' | 'l' | 'p'>, book: number): void {
  const uses = into.get(key) ?? new Map<string, Use>();
  into.set(key, uses);
  const id = `${word.s}\u0000${word.l}\u0000${word.p}`;
  const use = uses.get(id) ?? { s: word.s, l: word.l, p: word.p, count: 0, books: new Set<number>() };
  uses.set(id, use);
  use.count++;
  use.books.add(book);
}

/** The index of every form of `chapters`' Greek text (the New Testament; a word with no Strong's number is left out). */
export function formIndex(chapters: readonly Chapter[]): FormIndex {
  const index: FormIndex = { byForm: new Map(), byLetters: new Map() };
  for (const chapter of chapters) {
    const book = bookPosition(chapter.code);
    for (const verse of chapter.verses) {
      for (const word of verse.g) {
        if (!word.s) continue;
        add(index.byForm, formKey(word.t), word, book);
        add(index.byLetters, letterKey(word.t), word, book);
      }
    }
  }
  return index;
}

/** The commonest use among `uses`; a tie goes to the one found in the book nearest `book`, then to the one the text met first. */
function commonest(uses: Map<string, Use>, book: number): Use {
  const distance = (u: Use): number => Math.min(...[...u.books].map((b) => Math.abs(b - book)));
  return [...uses.values()].reduce((best, u) => (u.count > best.count || (u.count === best.count && distance(u) < distance(best)) ? u : best));
}

/** The use `form` has in `index`: its own form's; failing that its letters', but only where every use of those letters is one Strong's number (ἢ and ἡ are two words). */
function usedAs(index: FormIndex, form: string, book: number): Use | undefined {
  const exact = index.byForm.get(formKey(form));
  if (exact) return commonest(exact, book);
  const letters = index.byLetters.get(letterKey(form));
  if (!letters || new Set([...letters.values()].map((u) => u.s)).size > 1) return undefined;
  return commonest(letters, book);
}

/**
 * The parsing code TAGNT gives, as the app can decode it. TAGNT adds its own last part to a name or a title (N-ASF-L a place, -LG a group of places, -PG a people, -T a
 * title, -HEB, -ARAM): the code without it is the parsing. A code that is still no code is left out (the word keeps its number and lemma, and no parsing).
 */
function decodable(code: string): string {
  for (const tried of [code, code.replace(/-[A-Z]+$/, '')]) {
    try {
      decodeParse(tried);
      return tried;
    } catch {
      // the next
    }
  }
  return '';
}

/**
 * STEPBible's TAGNT as an index of forms: each word it has, with the lemma the lexicon gives its number and the parsing TAGNT gives. A number the lexicon lacks is
 * left out (the chapter's lex could not describe it).
 */
export function tagntIndex(words: readonly TagntWord[], lexicon: Lexicon): FormIndex {
  const index: FormIndex = { byForm: new Map(), byLetters: new Map() };
  for (const w of words) {
    const lemma = lexicon.get(w.s)?.lemma;
    if (!lemma) continue;
    const use = { s: w.s, l: lemma, p: decodable(w.p) };
    const book = bookPosition(w.book);
    add(index.byForm, formKey(w.form), use, book);
    add(index.byLetters, letterKey(w.form), use, book);
  }
  return index;
}

/** The lexicon's lemmas: by form and by letters to their Strong's numbers (the third source), and in a list with how often the text uses each (the guess). */
export interface LemmaIndex {
  byForm: Map<string, Set<string>>;
  byLetters: Map<string, Set<string>>;
  lemmas: Array<{ key: string; s: string; l: string; uses: number }>;
  lexicon: Lexicon;
}

/** The index of the lexicon's lemmas; undefined for a lexicon made without `entries` (a test's), which then has no lemma match and no guess. `text` counts the uses. */
export function lemmaIndex(lexicon: Lexicon, text: FormIndex): LemmaIndex | undefined {
  if (!lexicon.entries) return undefined;
  const uses = new Map<string, number>();
  for (const forms of text.byForm.values()) for (const u of forms.values()) uses.set(u.s, (uses.get(u.s) ?? 0) + u.count);
  const index: LemmaIndex = { byForm: new Map(), byLetters: new Map(), lemmas: [], lexicon };
  const put = (into: Map<string, Set<string>>, key: string, s: string): void => void into.set(key, (into.get(key) ?? new Set<string>()).add(s));
  for (const [s, entry] of lexicon.entries()) {
    put(index.byForm, formKey(entry.lemma), s);
    put(index.byLetters, letterKey(entry.lemma), s);
    index.lemmas.push({ key: letterKey(entry.lemma), s, l: entry.lemma, uses: uses.get(s) ?? 0 });
  }
  return index;
}

/** The lexicon entry a form is the lemma of: by its form, then by its letters where they are one number's only. */
function lemmaOf(index: LemmaIndex, form: string): { s: string; l: string } | undefined {
  const own = (set: Set<string> | undefined): { s: string; l: string } | undefined => (set?.size === 1 ? { s: [...set][0], l: index.lexicon.get([...set][0])!.lemma } : undefined);
  const exact = index.byForm.get(formKey(form));
  return exact ? own(exact) : own(index.byLetters.get(letterKey(form)));
}

/** A lemma is its stem and an ending of a letter or two; the stem is the lemma's letters but its last two, and four or more (a lemma of under six letters has none). */
const STEM_DROP = 2;
const STEM_MIN = 4;
/** The letters a form may have beyond the stem of its lemma: the endings and suffixes of the paradigm. A longer form is another word. */
const STEM_EXTRA = 5;
/** A verb's augment, which a form may begin with and the lemma does not (ἐπείραζεν, ἠμελλες). */
const AUGMENT = /^[εη]/;
/** Only a stem of five letters or more is matched past an augment: ἐπίστασις is not πίστις with an ε in front. */
const AUGMENT_STEM_MIN = 5;

const isCapital = (word: string): boolean => /^\p{Lu}/u.test(word.normalize('NFD'));

/**
 * The best guess for a form neither the text, TAGNT nor the lexicon's lemmas has: the lemma whose stem the form begins with, among the lemmas the text uses (the lexicon also
 * holds lemmas of the Septuagint and of Greek outside the Bible, which a New Testament variant is not likely to be). Letters only (no accents, breathings or
 * case); a stem is the lemma without its last two letters and has four or more; the form has at most five letters more, and may have an augment (ε, η) in front when the stem has five or more. A name
 * (a capital) is guessed from a name and a word from a word. The longest stem is the nearest lemma; among equal stems the lemma the text uses most, then the lower
 * Strong's number. A form no lemma's stem begins (a numeral letter, a foreign name, a verb whose forms share no stem: εἶδαν for ὁράω) has no guess.
 */
export function guessLemma(index: LemmaIndex, form: string): { s: string; l: string } | undefined {
  const key = letterKey(form);
  const augmentless = AUGMENT.test(key) ? key.slice(1) : undefined;
  const capital = isCapital(form);
  let best: LemmaIndex['lemmas'][number] | undefined;
  let bestStem = 0;
  for (const c of index.lemmas) {
    const stem = c.key.length - STEM_DROP;
    if (c.uses === 0 || stem < STEM_MIN || isCapital(c.l) !== capital) continue;
    const start = c.key.slice(0, stem);
    const from = key.startsWith(start) ? key : stem >= AUGMENT_STEM_MIN && augmentless?.startsWith(start) ? augmentless : undefined;
    if (!from || from.length > stem + STEM_EXTRA) continue;
    if (!best || stem > bestStem || (stem === bestStem && (c.uses > best.uses || (c.uses === best.uses && numeric(c.s, best.s) < 0)))) {
      best = c;
      bestStem = stem;
    }
  }
  return best ? { s: best.s, l: best.l } : undefined;
}

/** The sources of a number beyond the text's own forms: TAGNT's forms, and the lexicon's lemmas (for the third source and the guess). */
export interface Sources {
  tagnt?: FormIndex;
  lemmas?: LemmaIndex;
}

type Tag = Pick<GreekWord, 's' | 'l' | 'p'> & { src?: StrongsSource };
const NONE: Tag = { s: '', l: '', p: '' };

/** A form's number by the four sources in turn, the first to have it winning: the text's forms (exact), TAGNT's (exact), the text's by letters, TAGNT's by letters, the lexicon's lemmas, then the guess. */
function tagOf(form: string, index: FormIndex, position: number, sources: Sources): Tag {
  const key = formKey(form);
  const exact = (from: FormIndex | undefined): Use | undefined => {
    const uses = from?.byForm.get(key);
    return uses ? commonest(uses, position) : undefined;
  };
  const letters = (from: FormIndex | undefined): Use | undefined => (from ? usedAs(from, form, position) : undefined);
  const as = (use: Use | undefined, src: StrongsSource): Tag | undefined => (use ? { s: use.s, l: use.l, p: use.p, src } : undefined);
  const found = as(exact(index), 'lexicon') ?? as(exact(sources.tagnt), 'tagnt') ?? as(letters(index), 'lexicon') ?? as(letters(sources.tagnt), 'tagnt');
  if (found) return found;
  if (!sources.lemmas) return NONE;
  const lemma = lemmaOf(sources.lemmas, form);
  if (lemma) return { ...lemma, p: '', src: 'lexicon' };
  const guess = guessLemma(sources.lemmas, form);
  return guess ? { ...guess, p: '', src: 'guess' } : NONE;
}

/** The words of an apparatus reading, each tagged where a source has the form; `apart` when the reading is in pieces. A reading that leaves the base out has no words. */
export function tagReading(text: string, index: FormIndex, book: string, sources: Sources = {}): { g: GreekWord[]; apart: boolean } {
  const position = bookPosition(book);
  const g = wordsOf(text).map((t): GreekWord => {
    const tag = tagOf(t, index, position, sources);
    return { t, tr: '', s: tag.s, l: tag.l, p: tag.p, ...(tag.src ? { src: tag.src } : {}) };
  });
  return { g, apart: ELLIPSIS.test(text) };
}

/** A form tagged by a guess or left alone: how often the readings read it, where first, and (for a guess) what it was read as. */
interface Counted {
  count: number;
  ref: string;
  s?: string;
  l?: string;
}

/** What tagging counted: the words of the readings, those tagged and by which source, the forms guessed, and each form left alone with how often and where first. */
export interface TagTally {
  tagged: number;
  total: number;
  by: Record<StrongsSource, number>;
  guessed: Map<string, Counted>;
  untagged: Map<string, Counted>;
}

/**
 * Tags the readings of every chapter's variants in place: each reading gets `g` (and `apart` when it has an ellipsis), and the chapter's `lex` and `parse`
 * gain the Strong's numbers and parsing codes its readings use (keys in the order the build writes them: numeric, and alphabetical).
 */
export function tagVariants(chapters: readonly Chapter[], index: FormIndex, lexicon: Lexicon, tagnt?: FormIndex): TagTally {
  const tally: TagTally = { tagged: 0, total: 0, by: { lexicon: 0, tagnt: 0, guess: 0 }, guessed: new Map(), untagged: new Map() };
  const sources: Sources = { tagnt, lemmas: lemmaIndex(lexicon, index) };
  const count = (into: Map<string, Counted>, w: GreekWord, ref: string): void => {
    const known = into.get(w.t);
    if (known) known.count++;
    else into.set(w.t, { count: 1, ref, ...(w.s ? { s: w.s, l: w.l } : {}) });
  };
  for (const chapter of chapters) {
    if (!chapter.variants?.length) continue;
    const strongs = new Set(Object.keys(chapter.lex));
    const codes = new Set(Object.keys(chapter.parse));
    for (const unit of chapter.variants) {
      for (const alt of unit.alts as VariantReading[]) {
        const { g, apart } = tagReading(alt.text, index, chapter.code, sources);
        alt.g = g;
        if (apart) alt.apart = true;
        for (const w of g) {
          tally.total++;
          const ref = `${chapter.book} ${chapter.chapter}:${unit.v}`;
          if (w.s) {
            tally.tagged++;
            tally.by[w.src!]++;
            strongs.add(w.s);
            if (w.p) codes.add(w.p);
            if (w.src === 'guess') count(tally.guessed, w, ref);
          } else count(tally.untagged, w, ref);
        }
      }
    }
    chapter.lex = Object.fromEntries(
      [...strongs].sort(numeric).map((s) => [s, chapter.lex[s] ?? { g: lexicon.get(s)!.gloss, d: lexicon.get(s)!.definition }]),
    );
    chapter.parse = Object.fromEntries([...codes].sort().map((c) => [c, chapter.parse[c] ?? decodeParse(c)]));
  }
  return tally;
}

/** The line the build prints: the words tagged, and how many by each source. */
export const taggedLine = (tally: TagTally): string =>
  `variant words tagged: ${tally.tagged} of ${tally.total} (lexicon ${tally.by.lexicon}, tagnt ${tally.by.tagnt}, guess ${tally.by.guess})`;

const byCountThenLetters = ([a, x]: [string, Counted], [b, y]: [string, Counted]): number => y.count - x.count || (a < b ? -1 : a > b ? 1 : 0);

/** data/variant-untagged.txt: the forms left untagged, commonest first (then by letters), one a line: form, count, where it is first read. */
export function untaggedText(tally: TagTally): string {
  return [
    `# Forms of the variant readings that no source gives a number (the text, TAGNT, the lexicon's lemmas, or a lemma near enough to guess), so their words carry none (npm run data:build; scripts/data/variantWords.ts).`,
    `# form<TAB>times read<TAB>first read at`,
    ...[...tally.untagged].sort(byCountThenLetters).map(([form, { count, ref }]) => `${form}\t${count}\t${ref}`),
  ].join('\n') + '\n';
}

/** data/variant-guessed.txt: the forms given a guessed number, commonest first: form, count, the number and lemma it was read as, where it is first read. */
export function guessedText(tally: TagTally): string {
  return [
    `# Forms of the variant readings whose Strong's number is a guess (the nearest lemma: guessLemma in scripts/data/variantWords.ts), marked as one on the word sheet (npm run data:build).`,
    `# form<TAB>times read<TAB>read as<TAB>first read at`,
    ...[...tally.guessed].sort(byCountThenLetters).map(([form, { count, ref, s, l }]) => `${form}\t${count}\t${s} ${l}\t${ref}`),
  ].join('\n') + '\n';
}
