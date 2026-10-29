// src/reader/variantWords.ts — what a tap on a word of a variant reading asks the word popup for (mw-9ji6ek0.15, finished by mw-9ji6ek0.22). A reading's words are the apparatus's, not the
// verse's, and a reading is drawn in two places that share this: the brace in the text (src/reader/VariantBrace.tsx) and the lines of the unit's sheet (src/reader/VariantSheet.tsx). A form the
// verse's own text carries (the same letters, accents and breathings; case and punctuation aside) opens that word as the verse has it; else the word the build tagged for the reading
// (VariantReading.g: lemma, Strong's, parsing); else a card of just the form (no lemma, parsing, meaning or number: nothing invented) that still knows the verse, so Ask the tutor is there.
import type { GreekWord, Verse } from '../data/chapter';
import type { Lookup } from '../WordSheet';

const plain = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}]+/gu, '');

/** A reading as a tap asks about it: its Greek and English, and the Greek words the build tagged (absent when it did not). */
export interface WordReading {
  greek: string;
  english: string;
  g?: readonly GreekWord[];
}

/** The siglum chips a quiet line names: 'in variant B', 'in variant NA, ECM'. */
export const variantLabel = (chips: readonly string[]): string => `in variant ${chips.join(', ')}`;

/** The word for `form`, a form of a reading whose words the build tagged as `g`: the word of `verse` that has that form, else the tagged word, else the form alone (every other field empty). */
export function variantWord(verse: Verse, form: string, g: readonly GreekWord[] = []): GreekWord {
  const key = plain(form);
  return (
    verse.g.find((w) => plain(w.t) === key) ??
    g.find((w) => plain(w.t) === key) ?? { t: form.replace(/[^\p{L}\p{M}]+$/gu, ''), tr: '', s: '', l: '', p: '' }
  );
}

/** The words of `text`, one by one as a tap sees them: split at white space, a mark with no letter ('…') left out. */
export const readingTokens = (text: string): string[] => text.split(/\s+/).filter((t) => plain(t) !== '');

/** The Greek words of `reading`: the tagged ones when the build has them (a word of the verse itself as the verse has it), else its Greek read form by form. */
function greekWords(verse: Verse, reading: WordReading): GreekWord[] {
  if (reading.g?.length) return reading.g.filter((w) => plain(w.t) !== '').map((w) => (verse.g.includes(w) ? w : variantWord(verse, w.t, reading.g)));
  return readingTokens(reading.greek).map((f) => variantWord(verse, f));
}

/** The lookup for `word`, tapped in `reading`'s text, which is drawn in `language`: a Greek word opens its own card; an English word opens the cards of the Greek the reading has, under
 * the English tapped. `variant` is the quiet line the card draws first (none for the text's own reading). Null when there is nothing to open (an English reading that leaves the words out). */
export function variantLookup(verse: Verse, word: string, reading: WordReading, language: 'greek' | 'english', variant?: string): Lookup | null {
  if (language === 'greek') {
    const w = variantWord(verse, word, reading.g);
    return { words: [w], english: w.e === undefined ? undefined : verse.e[w.e]?.t, fromEnglish: false, verse: verse.n, ...(variant ? { variant } : {}) };
  }
  const words = greekWords(verse, reading);
  return words.length ? { words, english: reading.english, fromEnglish: true, tapped: word, verse: verse.n, ...(variant ? { variant } : {}) } : null;
}
