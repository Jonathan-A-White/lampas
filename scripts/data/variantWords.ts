// scripts/data/variantWords.ts — the words of each variant reading, tagged with their lemma, Strong's number and parsing (mw-9ji6ek0.21, docs/data.md 'Variants').
// An apparatus reading is a string of Greek the verse need not have (καὶ ζῇς, ἐμέλλον ἀποθάνειν). Once every chapter is built, each of its words is looked
// up by its letters in an index of every form the whole New Testament text uses (the inverse of scripts/build-lemma-forms.mjs: a form -> the (lemma, Strong's,
// parsing) it is used as); the commonest use wins, a tie going to the book nearest the chapter's. A form the text never has stays with `t` alone, and the build
// lists it (data/variant-untagged.txt) rather than invent a lemma for it.
import { CANON } from '../../src/data/canon';
import type { Chapter, GreekWord, VariantReading } from '../../src/data/chapter';
import { decodeParse } from '../../src/data/parseCode';
import { numeric } from './chapterWriter';
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

function add(into: Map<string, Map<string, Use>>, key: string, word: GreekWord, book: number): void {
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

/** The use a form has in the text: its own form's; failing that its letters', but only where every use of those letters is one Strong's number (ἢ and ἡ are two words). */
function useOf(index: FormIndex, form: string, book: number): Use | undefined {
  const exact = index.byForm.get(formKey(form));
  if (exact) return commonest(exact, book);
  const letters = index.byLetters.get(letterKey(form));
  if (!letters || new Set([...letters.values()].map((u) => u.s)).size > 1) return undefined;
  return commonest(letters, book);
}

/** The words of an apparatus reading, each tagged where the text has the form; `apart` when the reading is in pieces. A reading that leaves the base out has no words. */
export function tagReading(text: string, index: FormIndex, book: string): { g: GreekWord[]; apart: boolean } {
  const position = bookPosition(book);
  const g = wordsOf(text).map((t): GreekWord => {
    const use = useOf(index, t, position);
    return { t, tr: '', s: use?.s ?? '', l: use?.l ?? '', p: use?.p ?? '' };
  });
  return { g, apart: ELLIPSIS.test(text) };
}

/** What tagging counted: the words of the readings, those tagged, and each form left alone with how often and where first. */
export interface TagTally {
  tagged: number;
  total: number;
  untagged: Map<string, { count: number; ref: string }>;
}

/**
 * Tags the readings of every chapter's variants in place: each reading gets `g` (and `apart` when it has an ellipsis), and the chapter's `lex` and `parse`
 * gain the Strong's numbers and parsing codes its readings use (keys in the order the build writes them: numeric, and alphabetical).
 */
export function tagVariants(chapters: readonly Chapter[], index: FormIndex, lexicon: Lexicon): TagTally {
  const tally: TagTally = { tagged: 0, total: 0, untagged: new Map() };
  for (const chapter of chapters) {
    if (!chapter.variants?.length) continue;
    const strongs = new Set(Object.keys(chapter.lex));
    const codes = new Set(Object.keys(chapter.parse));
    for (const unit of chapter.variants) {
      for (const alt of unit.alts as VariantReading[]) {
        const { g, apart } = tagReading(alt.text, index, chapter.code);
        alt.g = g;
        if (apart) alt.apart = true;
        for (const w of g) {
          tally.total++;
          if (w.s) {
            tally.tagged++;
            strongs.add(w.s);
            codes.add(w.p);
          } else {
            const known = tally.untagged.get(w.t);
            if (known) known.count++;
            else tally.untagged.set(w.t, { count: 1, ref: `${chapter.book} ${chapter.chapter}:${unit.v}` });
          }
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

/** The line the build prints. */
export const taggedLine = (tally: TagTally): string => `variant words tagged: ${tally.tagged} of ${tally.total}`;

/** data/variant-untagged.txt: the forms left untagged, commonest first (then by letters), one a line: form, count, where it is first read. */
export function untaggedText(tally: TagTally): string {
  const rows = [...tally.untagged].sort(([a, x], [b, y]) => y.count - x.count || (a < b ? -1 : a > b ? 1 : 0));
  return [
    `# Forms of the variant readings that the New Testament text never has, so their words carry no lemma (npm run data:build; scripts/data/variantWords.ts).`,
    `# form<TAB>times read<TAB>first read at`,
    ...rows.map(([form, { count, ref }]) => `${form}\t${count}\t${ref}`),
  ].join('\n') + '\n';
}
